"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Countdown from "./Countdown";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const CAPTURE_FILTER = "brightness(1.08) contrast(1) saturate(1.3)";
const BANUBA_TOKEN = process.env.NEXT_PUBLIC_BANUBA_TOKEN;
const BANUBA_EFFECT_URL = process.env.NEXT_PUBLIC_BANUBA_EFFECT_URL || "";
const USE_BANUBA = process.env.NEXT_PUBLIC_USE_BANUBA === "true";
const CAMERA_PREF_KEY = "kids_photo_booth_camera";
const PREFERRED_CAMERA_MATCH = [/insta360/i, /insta 360/i, /link/i, /virtual/i, /controller/i];
const BANUBA_MODULES = [
  "/banuba/modules/face_tracker.zip",
  "/banuba/modules/makeup.zip",
  "/banuba/modules/skin.zip",
  "/banuba/modules/eyes.zip",
  "/banuba/modules/lips.zip",
  "/banuba/modules/hair.zip"
];

export default function CameraView({
  onCaptured,
  burstCount = 5,
  burstIntervalMs = 450
}) {
  const bgUrl = "/assets/Countdown/BG.png";
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const banubaContainerRef = useRef(null);
  const banubaPlayerRef = useRef(null);
  const banubaWebcamRef = useRef(null);
  const banubaCaptureRef = useRef(null);
  const useBanuba = USE_BANUBA && Boolean(BANUBA_TOKEN);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [counting, setCounting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const startedRef = useRef(false);
  const [retryTick, setRetryTick] = useState(0);

  const resetState = () => {
    setReady(false);
    setError("");
    setCounting(false);
    setCapturing(false);
    startedRef.current = false;
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const pickPreferredCameraId = (cams, prev) => {
    if (!cams.length) return "";
    const hasLabels = cams.some((c) => c.label);
    if (hasLabels) {
      const preferred = cams.find((c) => PREFERRED_CAMERA_MATCH.some((rx) => rx.test(c.label)));
      if (preferred) return preferred.deviceId;
    }
    let saved = "";
    if (typeof window !== "undefined") {
      saved = localStorage.getItem(CAMERA_PREF_KEY) || "";
    }
    if (saved && cams.some((c) => c.deviceId === saved)) {
      return saved;
    }
    if (prev && cams.some((c) => c.deviceId === prev)) return prev;
    return cams[0].deviceId;
  };

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cams = list.filter((d) => d.kind === "videoinput");
      setSelectedDeviceId((prev) => {
        const next = pickPreferredCameraId(cams, prev);
        if (next && next !== prev && typeof window !== "undefined") {
          localStorage.setItem(CAMERA_PREF_KEY, next);
        }
        return next;
      });
    } catch (err) {
      console.warn("Failed to enumerate camera devices", err);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return undefined;
    const handler = () => refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handler);
  }, [refreshDevices]);

  useEffect(() => {
    if (useBanuba) return undefined;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browser camera API not supported.");
      return undefined;
    }

    let cancelled = false;

    async function init() {
      resetState();
      stopStream();
      await sleep(150);

      const baseConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      };

      const buildConstraints = (useDeviceId) => {
        const videoConstraints = { ...baseConstraints };
        if (useDeviceId && selectedDeviceId) {
          videoConstraints.deviceId = { exact: selectedDeviceId };
        } else {
          videoConstraints.facingMode = "user";
        }
        return videoConstraints;
      };

      const getStream = async (useDeviceId) => {
        return navigator.mediaDevices.getUserMedia({
          video: buildConstraints(useDeviceId),
          audio: false
        });
      };

      try {
        let stream;
        try {
          stream = await getStream(true);
        } catch (err) {
          const name = err?.name || "";
          const shouldFallback = selectedDeviceId && name !== "NotAllowedError";
          if (!shouldFallback) throw err;
          stream = await getStream(false);
          setSelectedDeviceId("");
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          const markReady = () => {
            if (cancelled) return;
            setReady(true);
            video.removeEventListener("loadedmetadata", markReady);
            video.removeEventListener("canplay", markReady);
          };
          video.addEventListener("loadedmetadata", markReady);
          video.addEventListener("canplay", markReady);
          const playPromise = video.play();
          if (playPromise?.then) playPromise.then(markReady).catch(() => {});
        }
        refreshDevices();
      } catch (e) {
        console.error(e);
        const name = e?.name || "";
        if (name === "NotAllowedError") {
          setError("Camera permission denied. Chrome me site camera allow karo.");
        } else if (selectedDeviceId) {
          setError("Selected camera available nahi hai. Insta360 connect karein ya list se dusra camera choose karein.");
        } else {
          setError("Camera access nahi ho raha. WebCam busy hai to close karke retry karo.");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [selectedDeviceId, refreshDevices, retryTick, useBanuba]);

  useEffect(() => {
    if (!useBanuba) return undefined;
    let active = true;
    resetState();

    async function initBanuba() {
      try {
        const { Player, Webcam, Dom, Effect, ImageCapture, Module } = await import("@banuba/webar");
        if (!active || !banubaContainerRef.current) return;
        const player = await Player.create({
          clientToken: BANUBA_TOKEN,
          locateFile: (file) => `/banuba/${file}`
        });
        for (const moduleUrl of BANUBA_MODULES) {
          try {
            await player.addModule(new Module(moduleUrl));
          } catch (moduleErr) {
            console.warn(`Banuba module failed: ${moduleUrl}`, moduleErr);
          }
        }
        const webcam = new Webcam({
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        });
        await player.use(webcam);
        Dom.render(player, banubaContainerRef.current);
        if (BANUBA_EFFECT_URL) {
          await player.applyEffect(new Effect(BANUBA_EFFECT_URL));
        }
        player.play();
        banubaPlayerRef.current = player;
        banubaWebcamRef.current = webcam;
        banubaCaptureRef.current = new ImageCapture(player);
        setReady(true);
      } catch (e) {
        console.error(e);
        setError("Banuba camera start nahi ho raha. Token/Effect check karo.");
      }
    }

    initBanuba();

    return () => {
      active = false;
      try {
        if (banubaContainerRef.current) {
          import("@banuba/webar").then(({ Dom }) => Dom.unmount(banubaContainerRef.current)).catch(() => {});
        }
      } catch {}
      if (banubaWebcamRef.current?.stop) {
        banubaWebcamRef.current.stop();
      }
      if (banubaPlayerRef.current?.destroy) {
        banubaPlayerRef.current.destroy().catch(() => {});
      }
      banubaCaptureRef.current = null;
      banubaPlayerRef.current = null;
      banubaWebcamRef.current = null;
    };
  }, [useBanuba, retryTick]);

  useEffect(() => {
    if (ready && !error && !counting && !capturing && !startedRef.current) {
      startedRef.current = true;
      setCounting(true);
    }
  }, [ready, error, counting, capturing]);

  const blobToDataUrl = (blob) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  const takeFrame = async () => {
    if (banubaCaptureRef.current) {
      try {
        const blob = await banubaCaptureRef.current.takePhoto({
          format: "image/jpeg",
          quality: 0.92
        });
        return await blobToDataUrl(blob);
      } catch (e) {
        console.error(e);
      }
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.filter = CAPTURE_FILTER;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const onCountdownDone = async () => {
    setCounting(false);
    setCapturing(true);

    const shots = [];
    for (let i = 0; i < burstCount; i++) {
      const dataUrl = await takeFrame();
      if (dataUrl) shots.push(dataUrl);
      await sleep(burstIntervalMs);
    }

    setCapturing(false);
    onCaptured?.(shots);
  };

  return (
    <div className="relative w-full max-w-[520px] aspect-[9/16] overflow-hidden rounded-[32px] shadow-2xl">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />
      {useBanuba ? (
        <div
          ref={banubaContainerRef}
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover opacity-0"
          playsInline
          muted
          autoPlay
        />
      )}
      <canvas ref={canvasRef} className="hidden" />

      {counting ? <Countdown seconds={3} onDone={onCountdownDone} /> : null}

      {capturing ? (
        <div className="absolute inset-0 grid place-items-center bg-black/30">
          <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm font-semibold">
            Capturing...
          </div>
        </div>
      ) : null}

      {!ready && !error ? (
        <div className="absolute inset-0 grid place-items-center bg-white/60">
          <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold">Starting camera...</div>
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-white/80">
          <div className="max-w-xs text-center">
            <div className="text-lg font-extrabold">Camera Error</div>
            <div className="mt-2 text-sm text-slate-700">{error}</div>
            <div className="mt-3 text-xs text-slate-500">
              Tip: Chrome -&gt; Site settings -&gt; Camera -&gt; Allow.
            </div>
            <button
              type="button"
              onClick={() => setRetryTick((t) => t + 1)}
              className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
