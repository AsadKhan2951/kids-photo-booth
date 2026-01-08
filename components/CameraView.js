"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Countdown from "./Countdown";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function CameraView({
  onCaptured,
  burstCount = 5,
  burstIntervalMs = 450
}) {
  const bgUrl = "/assets/Countdown/BG.png";
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [counting, setCounting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const startedRef = useRef(false);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
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
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browser camera API not supported.");
      return undefined;
    }

    let cancelled = false;

    async function init() {
      setReady(false);
      setError("");
      setCounting(false);
      setCapturing(false);
      startedRef.current = false;
      stopStream();

      const videoConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      };

      if (selectedDeviceId) {
        videoConstraints.deviceId = { exact: selectedDeviceId };
      } else {
        videoConstraints.facingMode = "user";
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });

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
      } catch (e) {
        console.error(e);
        const baseMsg = selectedDeviceId
          ? "Selected camera available nahi hai. Insta360 connect karein ya list se dusra camera choose karein."
          : "Camera permission denied ya webcam detect nahi hui. Chrome me site camera allow karo.";
        setError(baseMsg);
      }
    }

    init();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [selectedDeviceId, refreshDevices]);

  useEffect(() => {
    if (ready && !error && !counting && !capturing && !startedRef.current) {
      startedRef.current = true;
      setCounting(true);
    }
  }, [ready, error, counting, capturing]);

  const takeFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const onCountdownDone = async () => {
    setCounting(false);
    setCapturing(true);

    const shots = [];
    for (let i = 0; i < burstCount; i++) {
      const dataUrl = takeFrame();
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
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover opacity-0"
        playsInline
        muted
        autoPlay
      />
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
