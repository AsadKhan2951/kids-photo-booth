"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooth } from "../../context/BoothContext";

const BG_URL = "/assets/Capture%20Screen/Capture.png";
const BTN_URL = "/assets/Capture%20Screen/Button.png";
const FILTER_STYLE = "brightness(1.08) contrast(1.2) saturate(1.3)";
const BANUBA_TOKEN = process.env.NEXT_PUBLIC_BANUBA_TOKEN;
const BANUBA_EFFECT_URL = process.env.NEXT_PUBLIC_BANUBA_EFFECT_URL || "";
const USE_BANUBA = process.env.NEXT_PUBLIC_USE_BANUBA === "true";
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
  const { state } = useBooth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const banubaContainerRef = useRef(null);
  const banubaPlayerRef = useRef(null);
  const banubaWebcamRef = useRef(null);
  const useBanuba = USE_BANUBA && Boolean(BANUBA_TOKEN);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
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
  };

  const handleCapture = () => {
    if (useBanuba) {
      stopBanuba();
    }
    stopStream();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setReady(false);
    setError("");
    setTimeout(() => router.push("/camera"), 180);
  };

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cams = list.filter((d) => d.kind === "videoinput");
      setSelectedDeviceId((prev) => {
        if (prev && cams.some((c) => c.deviceId === prev)) {
          return prev;
        }
        return cams[0]?.deviceId || "";
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
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
        refreshDevices();
      } catch (err) {
        console.error(err);
        const name = err?.name || "";
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
    setReady(false);
    setError("");
    stopStream();

    async function initBanuba() {
      try {
        const { Player, Webcam, Dom, Effect, Module } = await import("@banuba/webar");
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
      </div>
    </div>
  );
}
