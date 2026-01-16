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
const FAST_FACE = process.env.NEXT_PUBLIC_FAST_FACE === "true";

const CHARACTER_IMG = {
  migu: "/assets/Character/Miru.png",
  liya: "/assets/Character/pied.png",
  teddy: "/assets/Character/Teddy.png",
  pipper: "/assets/Character/pied.png"
};

const FIT_SCALE = {
  migu: 1.0,
  liya: 0.56,
  teddy: 0.7,
  pipper: 0.52,
  default: 1.0
};

const DISPLAY_LAYOUT = {
  migu: { top: 35, width: 82 },
  liya: { top: 36, width: 60 },
  teddy: { top: 36, width: 72 },
  pipper: { top: 36, width: 58 },
  default: { top: 35, width: 82 }
};

const FACE_FOREHEAD_RATIO = 0.18;

const faceCutoutCache = new Map();
const faceCutoutInflight = new Map();
const compositeCache = new Map();
let faceApiPromise = null;
let faceMeshPromise = null;

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.decoding = "async";
    img.src = src;
  });
}

async function loadImageSafe(src, ms = 4000) {
  try {
    return await Promise.race([
      loadImage(src),
      new Promise((resolve) => setTimeout(() => resolve(null), ms))
    ]);
  } catch {
    return null;
  }
}

const CHARACTER_FACE_CONFIG = {
  migu: { cx: 40, cy: 40, size: 42 },
  liya: { cx: 50, cy: 30, size: 44 },
  teddy: { cx: 50, cy: 30, size: 55 },
  pipper: { cx: 50, cy: 30, size: 38 },
  default: { cx: 50, cy: 22, size: 32 }
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
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models");
      return faceapi;
    });
  }
  return faceApiPromise;
}

async function loadFaceMesh() {
  if (!faceMeshPromise) {
    faceMeshPromise = import("@mediapipe/face_mesh").then((module) => {
      const faceMesh = new module.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      return faceMesh;
    });
  }
  return faceMeshPromise;
}

async function detectFaceMeshLandmarks(img) {
  try {
    const faceMesh = await Promise.race([
      loadFaceMesh(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("FaceMesh timeout")), 4000))
    ]).catch(() => {
      faceMeshPromise = null;
      return null;
    });
    if (!faceMesh) return null;
    return await new Promise((resolve) => {
      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        resolve(null);
      }, 3500);
      faceMesh.onResults((results) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        resolve(results?.multiFaceLandmarks?.[0] || null);
      });
      faceMesh.send({ image: img }).catch(() => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        resolve(null);
      });
    });
  } catch {
    return null;
  }
}

function withTimeout(promise, ms, fallback = null) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
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

async function detectLandmarks(img) {
  try {
    const faceapi = await loadFaceApi();
    const detection = await faceapi
      .detectSingleFace(
        img,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.4 })
      )
      .withFaceLandmarks(true);
    return detection || null;
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

  const scale = 0.9;
  const size = Math.max(box.width, box.height) * scale;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height * 0.54;
  return {
    sx: Math.max(0, Math.min(img.width - size, cx - size / 2)),
    sy: Math.max(0, Math.min(img.height - size, cy - size / 2)),
    size
  };
}

function downscaleImage(img, maxSize = 512) {
  const maxDim = Math.max(img.width, img.height);
  const scale = Math.min(1, maxSize / maxDim);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function createFallbackCutout(img) {
  const size = Math.min(img.width, img.height);
  const sx = (img.width - size) / 2;
  const sy = (img.height - size) / 2;
  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const ctx = out.getContext("2d");
  ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);

  const mask = document.createElement("canvas");
  mask.width = size;
  mask.height = size;
  const mctx = mask.getContext("2d");
  mctx.fillStyle = "#fff";
  mctx.beginPath();
  mctx.ellipse(size / 2, size / 2, size * 0.45, size * 0.55, 0, 0, Math.PI * 2);
  mctx.fill();

  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);
  return { image: out, size };
}

function cropCanvasToBounds(canvas, bounds, padRatio = 0.1) {
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

function buildFacePolygon(landmarks) {
  const jaw = landmarks.getJawOutline();
  const leftBrow = landmarks.getLeftEyeBrow();
  const rightBrow = landmarks.getRightEyeBrow();
  const browPoints = [...rightBrow].reverse().concat([...leftBrow].reverse());
  const minBrowY = Math.min(...browPoints.map((p) => p.y));
  const maxJawY = Math.max(...jaw.map((p) => p.y));
  const faceHeight = Math.max(1, maxJawY - minBrowY);
  const topY = Math.max(0, minBrowY - faceHeight * FACE_FOREHEAD_RATIO);
  const delta = minBrowY - topY;

  const topPoints = browPoints.map((p) => ({ x: p.x, y: p.y - delta }));
  const polygon = jaw.map((p) => ({ x: p.x, y: p.y })).concat(topPoints);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  polygon.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });

  return { polygon, bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY } };
}

const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
  378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
  162, 21, 54, 103, 67, 109
];

function buildFacePolygonFromMesh(landmarks, width, height) {
  if (!landmarks || landmarks.length < 200) return null;
  const polygon = FACE_OVAL.map((idx) => {
    const p = landmarks[idx];
    return { x: p.x * width, y: p.y * height };
  });

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  polygon.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });

  const faceHeight = Math.max(1, maxY - minY);
  const cutoff = minY + faceHeight * 0.3;
  const adjust = faceHeight * 0.07;
  const adjusted = polygon.map((p) => (
    p.y < cutoff ? { x: p.x, y: p.y + adjust } : p
  ));

  let adjMinX = Infinity;
  let adjMinY = Infinity;
  let adjMaxX = -Infinity;
  let adjMaxY = -Infinity;
  adjusted.forEach((p) => {
    if (p.x < adjMinX) adjMinX = p.x;
    if (p.y < adjMinY) adjMinY = p.y;
    if (p.x > adjMaxX) adjMaxX = p.x;
    if (p.y > adjMaxY) adjMaxY = p.y;
  });

  return {
    polygon: adjusted,
    bounds: { x: adjMinX, y: adjMinY, width: adjMaxX - adjMinX, height: adjMaxY - adjMinY }
  };
}

function maskImageWithPolygon(img, polygon) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const mask = document.createElement("canvas");
  mask.width = img.width;
  mask.height = img.height;
  const mctx = mask.getContext("2d");
  mctx.fillStyle = "#fff";
  mctx.beginPath();
  polygon.forEach((p, i) => {
    if (i === 0) mctx.moveTo(p.x, p.y);
    else mctx.lineTo(p.x, p.y);
  });
  mctx.closePath();
  mctx.fill();

  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);
  return canvas;
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
    rx = box.width * 0.65;
    ry = box.height * 0.9;
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

async function createFaceCutout(img, faceSrc) {
  if (faceSrc) {
    if (faceCutoutCache.has(faceSrc)) {
      return faceCutoutCache.get(faceSrc);
    }
    if (faceCutoutInflight.has(faceSrc)) {
      return faceCutoutInflight.get(faceSrc);
    }
  }

  const job = (async () => {
    const sample = downscaleImage(img, 512);
    const fallback = createFallbackCutout(sample);
    if (FAST_FACE) {
      return fallback;
    }

    const meshLandmarks = await withTimeout(detectFaceMeshLandmarks(sample), 1800, null);
    if (meshLandmarks) {
      const polyData = buildFacePolygonFromMesh(meshLandmarks, sample.width, sample.height);
      if (polyData) {
        const masked = maskImageWithPolygon(sample, polyData.polygon);
        const tightened = cropCanvasToBounds(masked, polyData.bounds, 0.08);
        return { image: tightened, size: tightened.width };
      }
    }

    const detection = await withTimeout(detectLandmarks(sample), 1800, null);
    if (detection?.landmarks) {
      const { polygon, bounds } = buildFacePolygon(detection.landmarks);
      const masked = maskImageWithPolygon(sample, polygon);
      const tightened = cropCanvasToBounds(masked, bounds, 0.08);
      return { image: tightened, size: tightened.width };
    }

    const box = await withTimeout(detectFaceBox(sample), 1200, null);
    if (!box) return fallback;

    const crop = getCropFromBox(sample, box);
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = crop.size;
    cropCanvas.height = crop.size;
    const cctx = cropCanvas.getContext("2d");
    cctx.drawImage(
      sample,
      crop.sx,
      crop.sy,
      crop.size,
      crop.size,
      0,
      0,
      crop.size,
      crop.size
    );

    const masked = applyEllipseMask(cropCanvas, box, crop);
    return { image: masked, size: masked.width };
  })();

  if (faceSrc) {
    faceCutoutInflight.set(faceSrc, job);
  }
  const result = await job;
  if (faceSrc) {
    faceCutoutInflight.delete(faceSrc);
    faceCutoutCache.set(faceSrc, result);
  }

  return result;
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

function renderComposite(characterImg, faceCutout, characterId) {
  const cfg = CHARACTER_FACE_CONFIG[characterId] || CHARACTER_FACE_CONFIG.default;

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

async function composeCharacterFast(characterImg, faceImg, characterId) {
  const sample = downscaleImage(faceImg, 512);
  const { image: faceCutout } = createFallbackCutout(sample);
  return renderComposite(characterImg, faceCutout, characterId);
}

async function composeCharacter(characterImg, faceImg, faceSrc, characterId) {
  const { image: faceCutout } = await createFaceCutout(faceImg, faceSrc);
  return renderComposite(characterImg, faceCutout, characterId);
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

  const displayLayout = DISPLAY_LAYOUT[characterId] || DISPLAY_LAYOUT.default;
  const fitScale = FIT_SCALE[characterId] || FIT_SCALE.default;

  useEffect(() => {
    if (!state.shots?.length) router.replace("/capture");
  }, [state.shots, router]);

  useEffect(() => {
    let active = true;
    if (!faceSrc || !characterImg) return undefined;
    const key = `${characterId || "none"}:${faceSrc}`;

    setCompositeSrc("");
    setLoadingComposite(true);

    if (compositeCache.has(key)) {
      const cached = compositeCache.get(key);
      setCompositeSrc(cached);
      setComposite(cached);
      setLoadingComposite(false);
      return undefined;
    }

    const job = (async () => {
      const [characterImgObj, faceImgObj] = await Promise.all([
        loadImageSafe(characterImg, 4000),
        loadImageSafe(faceSrc, 4000)
      ]);
      if (!active) return null;
      if (!characterImgObj || !faceImgObj) {
        setLoadingComposite(false);
        return null;
      }

      const fastComposite = await composeCharacterFast(characterImgObj, faceImgObj, characterId);
      if (active) {
        setCompositeSrc(fastComposite);
        setComposite(fastComposite);
        setLoadingComposite(false);
      }

      if (FAST_FACE) return fastComposite;

      const refined = await composeCharacter(characterImgObj, faceImgObj, faceSrc, characterId);
      if (active) {
        setCompositeSrc(refined);
        setComposite(refined);
      }
      return refined;
    })();

    job
      .then((out) => {
        if (!out) return;
        compositeCache.set(key, out);
      })
      .catch((err) => {
        console.error("Composite failed", err);
        if (!active) return;
        setCompositeSrc("");
        setLoadingComposite(false);
      });
    return () => {
      active = false;
    };
  }, [faceSrc, characterImg, characterId]);

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
