"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooth } from "../../context/BoothContext";

const BG_URL = "/assets/Your%20Character/BG.png";
const IMG = {
  header: "/assets/Your%20Character/Header.png",
  title: "/assets/Your%20Character/Your-Super-Character!.png",
  tryAnother: "/assets/Your%20Character/Try-Another-New.png",
  perfect: "/assets/Your%20Character/This-is-Perfect-New.png"
};

const FILTER_STYLE = "contrast(1.18) saturate(1.22) brightness(1.06)";

const CHARACTER_IMG = {
  migu: "/assets/Character/Miru.png",
  liya: "/assets/Character/pied.png",
  teddy: "/assets/Character/Teddy.png",
  pipper: "/assets/Character/pied.png"
};

const FIT_SCALE = {
  migu: 1.0,
  liya: 0.62,
  teddy: 0.7,
  pipper: 0.62,
  default: 1.0
};

const FACE_LAYOUT = {
  migu: { cx: 49, cy: 25, size: 40 },
  liya: { cx: 50, cy: 24, size: 30 },
  teddy: { cx: 50, cy: 26, size: 44 },
  pipper: { cx: 50, cy: 24, size: 30 },
  default: { cx: 50, cy: 22, size: 32 }
};

const DISPLAY_LAYOUT = {
  migu: { top: 35, width: 82 },
  liya: { top: 36, width: 66 },
  teddy: { top: 36, width: 72 },
  pipper: { top: 36, width: 66 },
  default: { top: 35, width: 82 }
};

let faceApiPromise = null;
let bgRemovePromise = null;

const BG_REMOVE_TIMEOUT_MS = 2500;
const MAX_CUTOUT_SIZE = 320;

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const CHARACTER_FACE_CONFIG = {
  migu: {
    cx: 40,
    cy: 40,
    size: 42
  },
  liya: {
    cx: 50,
    cy: 26,
    size: 36
  },
  teddy: {
    cx: 45,
    cy: 35,
    size: 75
  },
  pipper: {
    cx: 50,
    cy: 22,
    size: 66
  },
  default: {
    cx: 50,
    cy: 22,
    size: 32
  }
};
function enhanceFace(ctx) {
  ctx.filter = `
    brightness(1.12)
    contrast(1.15)
    saturate(1.25)
  `;
}
function drawInnerShadow(ctx, x, y, w, h) {
  const g = ctx.createRadialGradient(
    x + w / 2,
    y + h * 0.55,
    w * 0.2,
    x + w / 2,
    y + h * 0.55,
    w * 0.75
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.35)");

  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

async function loadFaceApi() {
  if (!faceApiPromise) {
    faceApiPromise = import("face-api.js").then(async (faceapi) => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      return faceapi;
    });
  }
  return faceApiPromise;
}

async function detectFaceBox(img) {
  if (typeof window !== "undefined" && "FaceDetector" in window) {
    try {
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(img);
      if (faces && faces.length) {
        const best = faces.sort((a, b) => (b.boundingBox.width * b.boundingBox.height) - (a.boundingBox.width * a.boundingBox.height))[0];
        return best.boundingBox;
      }
    } catch {}
  }

  try {
    const faceapi = await loadFaceApi();
    const detection = await faceapi.detectSingleFace(
      img,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.4 })
    );
    return detection?.box || null;
  } catch {
    return null;
  }
}

function getCropFromBox(img, box) {
  const minSize = Math.min(img.width, img.height);
  if (!box) {
    const fallback = minSize * 0.7;
    return {
      sx: (img.width - fallback) / 2,
      sy: img.height * 0.08,
      size: fallback
    };
  }

  const scale = 1.2;
  const size = Math.max(box.width, box.height) * scale;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height * 0.54;
  return {
    sx: Math.max(0, Math.min(img.width - size, cx - size / 2)),
    sy: Math.max(0, Math.min(img.height - size, cy - size / 2)),
    size
  };
}

async function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function blobToImage(blob) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(blob);
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

async function removeBackgroundFromBlob(blob) {
  if (!bgRemovePromise) {
    bgRemovePromise = import("@imgly/background-removal").then((mod) => mod.removeBackground);
  }
  const removeBackground = await bgRemovePromise;
  return removeBackground(blob);
}

function findAlphaBounds(ctx, width, height, yLimitRatio = 0.7) {
  const data = ctx.getImageData(0, 0, width, height).data;
  const yMax = Math.floor(height * yLimitRatio);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < yMax; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 12) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function cropCanvasToBounds(canvas, bounds, padRatio = 0.12) {
  const sizeRaw = Math.max(bounds.width, bounds.height) * (1 + padRatio);
  const size = Math.max(1, Math.round(sizeRaw));
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const sx = Math.max(0, Math.min(canvas.width - size, Math.round(cx - size / 2)));
  const sy = Math.max(0, Math.min(canvas.height - size, Math.round(cy - size / 2)));

  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const octx = out.getContext("2d");
  octx.drawImage(canvas, sx, sy, size, size, 0, 0, size, size);
  return out;
}

function applyEllipseMask(canvas, box, crop) {
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext("2d");
  ctx.drawImage(canvas, 0, 0);

  let cx = out.width / 2;
  let cy = out.height / 2;
  let rx = out.width * 0.38;
  let ry = out.height * 0.48;

  if (box) {
    cx = (box.x - crop.sx) + box.width / 2;
    cy = (box.y - crop.sy) + box.height / 2 + box.height * 0.06;
    rx = box.width * 0.8;
    ry = box.height * 1.05;
  }

  const mask = document.createElement("canvas");
  mask.width = out.width;
  mask.height = out.height;
  const mctx = mask.getContext("2d");
  mctx.filter = "blur(6px)";
  mctx.fillStyle = "#fff";
  mctx.beginPath();
  mctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  mctx.fill();

  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);
  return out;
}

async function createFaceCutout(img, mode = "full") {
  const box = await detectFaceBox(img);
  const crop = getCropFromBox(img, box);
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = crop.size;
  cropCanvas.height = crop.size;
  const cctx = cropCanvas.getContext("2d");
  cctx.drawImage(
    img,
    crop.sx,
    crop.sy,
    crop.size,
    crop.size,
    0,
    0,
    crop.size,
    crop.size
  );

  const fastCanvas = applyEllipseMask(cropCanvas, box, crop);
  if (mode === "fast") {
    return { image: fastCanvas, size: fastCanvas.width };
  }

  let inputCanvas = cropCanvas;
  if (cropCanvas.width > MAX_CUTOUT_SIZE) {
    const scale = MAX_CUTOUT_SIZE / cropCanvas.width;
    const scaled = document.createElement("canvas");
    scaled.width = Math.round(cropCanvas.width * scale);
    scaled.height = Math.round(cropCanvas.height * scale);
    const sctx = scaled.getContext("2d");
    sctx.drawImage(cropCanvas, 0, 0, scaled.width, scaled.height);
    inputCanvas = scaled;
  }

  const baseBlob = await canvasToBlob(inputCanvas);
  if (!baseBlob) return { image: fastCanvas, size: fastCanvas.width };

  const removePromise = (async () => {
    const cutoutBlob = await removeBackgroundFromBlob(baseBlob);
    const cutoutImage = await blobToImage(cutoutBlob);
    const cutoutCanvas = document.createElement("canvas");
    cutoutCanvas.width = cutoutImage.width;
    cutoutCanvas.height = cutoutImage.height;
    const cutoutCtx = cutoutCanvas.getContext("2d");
    cutoutCtx.drawImage(cutoutImage, 0, 0);

    const alphaBounds = findAlphaBounds(cutoutCtx, cutoutCanvas.width, cutoutCanvas.height, 0.7)
      || findAlphaBounds(cutoutCtx, cutoutCanvas.width, cutoutCanvas.height, 1);
    const tightened = alphaBounds ? cropCanvasToBounds(cutoutCanvas, alphaBounds, 0.12) : cutoutCanvas;
    return { image: tightened, size: tightened.width };
  })();

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve(null), BG_REMOVE_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([removePromise, timeoutPromise]);
    if (result) return result;
    return { image: fastCanvas, size: fastCanvas.width };
  } catch {
    return { image: fastCanvas, size: fastCanvas.width };
  }
}

function findHoleBounds(characterImg) {
  const maxW = 320;
  const scale = Math.min(1, maxW / characterImg.width);
  const w = Math.max(1, Math.round(characterImg.width * scale));
  const h = Math.max(1, Math.round(characterImg.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(characterImg, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const isTransparent = (idx) => data[idx * 4 + 3] < 5;
  const visited = new Uint8Array(w * h);
  const stack = [];

  const pushIf = (x, y) => {
    const idx = y * w + x;
    if (!visited[idx] && isTransparent(idx)) {
      visited[idx] = 1;
      stack.push(idx);
    }
  };

  for (let x = 0; x < w; x += 1) {
    pushIf(x, 0);
    pushIf(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    pushIf(0, y);
    pushIf(w - 1, y);
  }

  while (stack.length) {
    const idx = stack.pop();
    const x = idx % w;
    const y = Math.floor(idx / w);
    if (x > 0) pushIf(x - 1, y);
    if (x < w - 1) pushIf(x + 1, y);
    if (y > 0) pushIf(x, y - 1);
    if (y < h - 1) pushIf(x, y + 1);
  }

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (isTransparent(idx) && !visited[idx]) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;
  const scaleUp = 1 / scale;
  const x = minX * scaleUp;
  const y = minY * scaleUp;
  const width = (maxX - minX + 1) * scaleUp;
  const height = (maxY - minY + 1) * scaleUp;
  const pad = 0.06;
  return {
    x: x + width * pad,
    y: y + height * pad,
    width: width * (1 - pad * 2),
    height: height * (1 - pad * 2)
  };
}

async function composeCharacter(characterSrc, faceSrc, characterId, mode = "full") {
  const [characterImg, faceImg] = await Promise.all([
    loadImage(characterSrc),
    loadImage(faceSrc)
  ]);

  const cfg = CHARACTER_FACE_CONFIG[characterId] || CHARACTER_FACE_CONFIG.default;
  const { image: faceCutout } = await createFaceCutout(faceImg, mode);

  const canvas = document.createElement("canvas");
  canvas.width = characterImg.width;
  canvas.height = characterImg.height;
  const ctx = canvas.getContext("2d");

  // --- FACE POSITION ---
  const size = (cfg.size / 100) * canvas.width;
  const cx = (cfg.cx / 100) * canvas.width;
  const cy = (cfg.cy / 100) * canvas.height;
  const x = cx - size / 2;
  const y = cy - size / 2;

  // --- DRAW FACE ---
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, size / 2, size / 2, 0, 0, Math.PI * 2);
  ctx.clip();

  enhanceFace(ctx);
  ctx.drawImage(faceCutout, x, y, size, size);

  ctx.globalCompositeOperation = "multiply";
  drawInnerShadow(ctx, x, y, size, size);
  ctx.globalCompositeOperation = "source-over";

  ctx.restore();

  // --- DRAW CHARACTER ON TOP ---
  ctx.drawImage(characterImg, 0, 0);

  return canvas.toDataURL("image/png");
}


export default function YourCharacterScreen() {
  const router = useRouter();
  const { state, setComposite } = useBooth();
  const faceSrc = state.shots?.[0];
  const characterId = state.character?.id;
  const [compositeSrc, setCompositeSrc] = useState("");
  const [loadingComposite, setLoadingComposite] = useState(false);

  const characterImg = useMemo(() => {
    if (!characterId) return null;
    return CHARACTER_IMG[characterId] || null;
  }, [characterId]);

  const faceLayout = FACE_LAYOUT[characterId] || FACE_LAYOUT.default;
  const displayLayout = DISPLAY_LAYOUT[characterId] || DISPLAY_LAYOUT.default;
  const fitScale = FIT_SCALE[characterId] || FIT_SCALE.default;

  useEffect(() => {
    if (!state.shots?.length) router.replace("/capture");
  }, [state.shots, router]);

  useEffect(() => {
    let active = true;
    if (!faceSrc || !characterImg) return undefined;
    setLoadingComposite(true);
    composeCharacter(characterImg, faceSrc, characterId, "fast")

      .then((out) => {
        if (!active) return;
        setCompositeSrc(out);
        setLoadingComposite(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadingComposite(false);
      });
    composeCharacter(characterImg, faceSrc, characterId, "full")

      .then((out) => {
        if (!active) return;
        setCompositeSrc(out);
        setComposite(out);
      })
      .catch(() => {
        if (!active) return;
        setCompositeSrc("");
      });
    return () => { active = false; };
  }, [faceSrc, characterImg, faceLayout, setComposite]);

  return (
    <div className="min-h-screen w-full bg-[#0b2d64] flex items-center justify-center px-4 py-6 kids-font">
      <div className="relative w-full max-w-[520px] aspect-[9/16] overflow-hidden rounded-[32px] shadow-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BG_URL})` }}
        />

        <img
          src={IMG.header}
          alt=""
          className="absolute left-0 top-0 w-full h-auto"
          draggable="false"
        />

        <img
          src={IMG.title}
          alt="Your Super Character!"
          className="absolute left-1/2 top-[27%] w-[95%] -translate-x-1/2"
          draggable="false"
        />

        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: `${displayLayout.top}%`, width: `${displayLayout.width}%` }}
        >
          <div className="relative w-full">
            <div
              className="w-full"
              style={{ transform: `scale(${fitScale})`, transformOrigin: "top center" }}
            >
              <img
                src={compositeSrc || characterImg || "/assets/Your%20Character/Character.png"}
                alt="Character"
                className="w-full h-auto"
                draggable="false"
              />
            </div>
            {loadingComposite && !compositeSrc ? (
              <div className="absolute inset-0 grid place-items-center text-xs font-semibold text-white/90">
                Processing photo...
              </div>
            ) : null}
          </div>
        </div>

        <div className="absolute left-1/2 bottom-[7%] w-[90%] -translate-x-1/2 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.push("/capture")}
            className="w-[47%] transition-transform active:scale-[0.98] hover:scale-[1.03]"
            aria-label="Try another photo"
          >
            <img src={IMG.tryAnother} alt="Try another photo" className="w-full h-auto" draggable="false" />
          </button>
          <button
            type="button"
            onClick={() => router.push("/your-creation")}
            className="w-[43%] transition-transform active:scale-[0.98] hover:scale-[1.03]"
            aria-label="This is perfect"
          >
            <img src={IMG.perfect} alt="This is perfect" className="w-full h-auto" draggable="false" />
          </button>
        </div>
      </div>
    </div>
  );
}
