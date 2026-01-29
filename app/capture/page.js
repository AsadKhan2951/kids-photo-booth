"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooth } from "../../context/BoothContext";

const BG_URL = "/assets/Capture%20Screen/Capture.png";
const BTN_URL = "/assets/Capture%20Screen/Button.png";
const FILTER_STYLE = "";
const BANUBA_TOKEN = process.env.NEXT_PUBLIC_BANUBA_TOKEN;
const BANUBA_EFFECT_URL = process.env.NEXT_PUBLIC_BANUBA_EFFECT_URL || "";
const USE_BANUBA = process.env.NEXT_PUBLIC_USE_BANUBA === "true";
const MIN_FACE_RATIO = 0.18;
const MAX_FACE_TILT_DEG = 8;
const CAMERA_PREF_KEY = "kids_photo_booth_camera";
const PREFERRED_CAMERA_MATCH = [/logitech/i, /c920e/i, /c920/i, /insta360/i, /insta 360/i, /link/i, /virtual/i, /controller/i];
let faceApiPromise = null;

async function loadFaceApi() {
  if (!faceApiPromise) {
    faceApiPromise = import("face-api.js").then(async (faceapi) => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models");
      return faceapi;
    });
  }
  return faceApiPromise;
}
const BANUBA_MODULES = [
  "/banuba/modules/face_tracker.zip",
  "/banuba/modules/makeup.zip",
  "/banuba/modules/skin.zip",
  "/banuba/modules/eyes.zip",
  "/banuba/modules/lips.zip",
  "/banuba/modules/hair.zip"
];

export default function CaptureScreen() {
  const router = useRouter();
  const { state, setShots } = useBooth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectCanvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const banubaContainerRef = useRef(null);
  const banubaPlayerRef = useRef(null);
  const banubaWebcamRef = useRef(null);
  const banubaCaptureRef = useRef(null);
  const useBanuba = USE_BANUBA && Boolean(BANUBA_TOKEN);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [distanceMsg, setDistanceMsg] = useState("");
  const [checkingDistance, setCheckingDistance] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!state.character) router.replace("/character");
  }, [state.character, router]);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const stopBanuba = async () => {
    try {
      if (banubaContainerRef.current) {
        const { Dom } = await import("@banuba/webar");
        Dom.unmount(banubaContainerRef.current);
      }
    } catch {}
    if (banubaWebcamRef.current?.stop) {
      banubaWebcamRef.current.stop();
    }
    if (banubaPlayerRef.current?.destroy) {
      banubaPlayerRef.current.destroy().catch(() => {});
    }
    banubaPlayerRef.current = null;
    banubaWebcamRef.current = null;
    banubaCaptureRef.current = null;
  };

  const checkFaceDistance = async () => {
    if (useBanuba) return true;
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return true;

    const canvas = detectCanvasRef.current || document.createElement("canvas");
    detectCanvasRef.current = canvas;
    const scale = Math.min(1, 480 / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const faceapi = await loadFaceApi();
      const detection = await faceapi
        .detectSingleFace(
          canvas,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })
        )
        .withFaceLandmarks(true);

      if (!detection?.detection?.box || !detection?.landmarks) {
        setDistanceMsg("Face was not detected. Please move into better lighting.");
        return false;
      }

      const box = detection.detection.box;
      const ratio = Math.max(box.width / canvas.width, box.height / canvas.height);
      if (ratio < MIN_FACE_RATIO) {
        setDistanceMsg("Kindly move slightly closer and then proceed with capturing the image.");
        return false;
      }

      const leftEye = detection.landmarks.getLeftEye();
      const rightEye = detection.landmarks.getRightEye();
      if (leftEye.length && rightEye.length) {
        const left = leftEye.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
        const right = rightEye.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
        const lx = left.x / leftEye.length;
        const ly = left.y / leftEye.length;
        const rx = right.x / rightEye.length;
        const ry = right.y / rightEye.length;
        const angleDeg = Math.atan2(ry - ly, rx - lx) * (180 / Math.PI);
        if (Math.abs(angleDeg) > MAX_FACE_TILT_DEG) {
          setDistanceMsg("Please keep your face straight.");
          return false;
        }
      }

      setDistanceMsg("");
      return true;
    } catch (err) {
      console.warn("Face distance check failed", err);
      return true;
    }
  };

  const handleCapture = async () => {
    if (checkingDistance) return;
    setCheckingDistance(true);
    const ok = await checkFaceDistance();
    setCheckingDistance(false);
    if (!ok) return;

    const dataUrl = await takeSnapshot();
    if (!dataUrl) {
      setError("Capture nahi ho saka. Camera frame nahi mila. Retry karo.");
      return;
    }

    if (useBanuba) {
      await stopBanuba();
    }
    stopStream();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setReady(false);
    setError("");
    setShots([dataUrl]);
    router.push("/your-character");
  };

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cams = list.filter((d) => d.kind === "videoinput");
      setSelectedDeviceId((prev) => {
        if (!cams.length) return "";
        const hasLabels = cams.some((c) => c.label);
        if (hasLabels) {
          const preferred = cams.find((c) => PREFERRED_CAMERA_MATCH.some((rx) => rx.test(c.label)));
          if (preferred) {
            if (typeof window !== "undefined") {
              localStorage.setItem(CAMERA_PREF_KEY, preferred.deviceId);
            }
            return preferred.deviceId;
          }
        }
        let saved = "";
        if (typeof window !== "undefined") {
          saved = localStorage.getItem(CAMERA_PREF_KEY) || "";
        }
        if (saved && cams.some((c) => c.deviceId === saved)) {
          return saved;
        }
        if (prev && cams.some((c) => c.deviceId === prev)) {
          return prev;
        }
        const next = cams[0]?.deviceId || "";
        if (next && typeof window !== "undefined") {
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
      setReady(false);
      setError("");
      stopStream();

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
      } catch (err) {
        console.error(err);
        const name = err?.name || "";
        if (name === "NotAllowedError") {
          setError("Camera permission denied. Please allow camera access for the site in Chrome.");
        } else if (selectedDeviceId) {
          setError("The selected camera is not available. Please connect your Insta360 camera or choose another camera from the list.");
        } else {
          setError("Camera access is not working. If the webcam is busy, please close other applications and try again.");
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
    setReady(false);
    setError("");
    stopStream();

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
      } catch (err) {
        console.error(err);
        setError("Banuba camera start nahi ho raha. Token/Effect check karo.");
      }
    }

    initBanuba();

    return () => {
      active = false;
      stopBanuba();
    };
  }, [useBanuba, retryTick]);

  const blobToDataUrl = (blob) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  const takeSnapshot = async () => {
    if (banubaCaptureRef.current) {
      try {
        const blob = await banubaCaptureRef.current.takePhoto({
          format: "image/jpeg",
          quality: 0.92
        });
        return await blobToDataUrl(blob);
      } catch (err) {
        console.error(err);
      }
      return null;
    }
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;

    const canvas = captureCanvasRef.current || document.createElement("canvas");
    captureCanvasRef.current = canvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.filter = FILTER_STYLE;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  return (
    <div className="min-h-screen w-full bg-[#0b2d64] flex items-center justify-center px-4 py-6 kids-font">
      <div className="relative w-full max-w-[520px] aspect-[9/16] overflow-hidden rounded-[32px] shadow-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BG_URL})` }}
        />

        <div className="absolute left-1/2 top-[31%] w-[66%] -translate-x-1/2">
          <div className="relative w-full aspect-square rounded-full overflow-hidden bg-[#0b2d64] shadow-[0_0_0_6px_rgba(255,255,255,0.08)]">
            {useBanuba ? (
              <div ref={banubaContainerRef} className="h-full w-full" />
            ) : (
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
                autoPlay
                style={{ filter: FILTER_STYLE }}
              />
            )}
            {!ready && !error ? (
              <div className="absolute inset-0 grid place-items-center text-xs font-semibold text-white/80">
                Starting camera...
              </div>
            ) : null}
            {error ? (
              <div className="absolute inset-0 grid place-items-center px-4 text-center text-[11px] font-semibold text-white/90">
                <div>
                  <div>{error}</div>
                  <button
                    type="button"
                    onClick={() => setRetryTick((t) => t + 1)}
                    className="mt-3 inline-flex items-center justify-center rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-[#0b2d64]"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="absolute left-1/2 bottom-[8%] -translate-x-1/2 w-[45%]">
          <button
            type="button"
            onClick={handleCapture}
            className="w-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
            aria-label="Capture"
          >
            <img src={BTN_URL} alt="" className="w-full h-auto" draggable="false" />
          </button>
        </div>

        {distanceMsg ? (
          <div className="absolute left-1/2 bottom-[20%] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#0b2d64]">
            {distanceMsg}
          </div>
        ) : null}
      </div>
    </div>
  );
}
