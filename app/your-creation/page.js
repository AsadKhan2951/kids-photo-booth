"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooth } from "../../context/BoothContext";

const BG_URL = "/assets/Your%20Creation/BG.png";
const PRINT_TEMPLATE_URLS = [
  "/assets/Print%20Screen/Print-Screen.png",
  "/assets/Print%20Screen/Print-Screen.jpg",
  "/assets/Print%20Screen/Print-Screen.jpeg"
];
const CHARACTER_ASSETS = {
  migu: {
    bg: "/assets/Migu/BG.png",
    shape: "/assets/Migu/shape.png",
    label: "/assets/Migu/MIGU.png"
  },
  teddy: {
    bg: "/assets/Teddy/BG.png",
    shape: "/assets/Teddy/shape.png",
    label: "/assets/Teddy/TEDDY.png"
  },
  pipper: {
    bg: "/assets/Pipper/BG.png",
    shape: "/assets/Pipper/shape.png",
    label: "/assets/Pipper/PIPER.png"
  },
  liya: {
    bg: "/assets/Liya/BG.jpg",
    shape: "/assets/Liya/shape.png",
    label: "/assets/Liya/Name.png"
  }
};
const CARD_CONFIG = {
  migu: { top: 30, width: 70 },
  teddy: { top: 32, width: 62 },
  pipper: { top: 34, width: 56 },
  liya: { top: 34, width: 56 },
  default: { top: 30, width: 70 }
};
const IMG = {
  header: "/assets/Your%20Creation/Header.png",
  title: "/assets/Your%20Creation/Share-Your-Creation!.png",
  character: "/assets/Your%20Creation/Character.png",
  print: "/assets/Your%20Creation/Print-New.png",
  email: "/assets/Your%20Creation/Email-New.png",
  both: "/assets/Your%20Creation/Do-Both-New.png"
};

export default function YourCreationScreen() {
  const router = useRouter();
  const { state } = useBooth();
  const [toast, setToast] = useState("");
  const [printing, setPrinting] = useState(false);
  const characterId = state.character?.id;

  const finalImg = useMemo(() => {
    if (state.composite) return state.composite;
    if (state.enhanced) return state.enhanced;
    return state.shots?.[0] || null;
  }, [state.composite, state.enhanced, state.shots]);

  useEffect(() => {
    if (!state.shots?.length) router.replace("/capture");
  }, [state.shots, router]);

  const goDone = () => router.push("/all-done");

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const loadFirstImage = async (urls) => {
    for (const url of urls) {
      try {
        return await loadImage(url);
      } catch {
        // try next candidate
      }
    }
    throw new Error("No print template found.");
  };

  const drawCover = (ctx, img, x, y, w, h) => {
    const scale = Math.max(w / img.width, h / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const dx = x + (w - drawW) / 2;
    const dy = y + (h - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
  };

  const detectFrame = (ctx, width, height) => {
    const search = {
      x: Math.round(width * 0.06),
      y: Math.round(height * 0.2),
      w: Math.round(width * 0.55),
      h: Math.round(height * 0.55)
    };
    const data = ctx.getImageData(search.x, search.y, search.w, search.h).data;
    let minX = search.w;
    let minY = search.h;
    let maxX = 0;
    let maxY = 0;
    let found = false;
    for (let y = 0; y < search.h; y++) {
      for (let x = 0; x < search.w; x++) {
        const idx = (y * search.w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (r > 240 && g > 240 && b > 240 && a > 200) {
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) {
      return {
        x: Math.round(width * 0.07),
        y: Math.round(height * 0.24),
        w: Math.round(width * 0.5),
        h: Math.round(height * 0.34)
      };
    }
    return {
      x: search.x + minX,
      y: search.y + minY,
      w: Math.max(1, maxX - minX + 1),
      h: Math.max(1, maxY - minY + 1)
    };
  };

  const getPrintLayout = (width, height) => {
    const ratio = width / height;
    if (Math.abs(ratio - 2 / 3) > 0.02) return null;
    return {
      frame: { x: 0.06, y: 0.215, w: 0.52, h: 0.41 },
      inner: { x: 0.11, y: 0.14, w: 0.78, h: 0.66 },
      angle: (8 * Math.PI) / 180,
      scale: 0.9
    };
  };

  const detectInner = (ctx, frame) => {
    const data = ctx.getImageData(frame.x, frame.y, frame.w, frame.h).data;
    let minX = frame.w;
    let minY = frame.h;
    let maxX = 0;
    let maxY = 0;
    let found = false;
    for (let y = 0; y < frame.h; y++) {
      for (let x = 0; x < frame.w; x++) {
        const idx = (y * frame.w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (r > 200 && g > 150 && b < 120 && a > 200) {
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) {
      const inset = {
        left: 0.08,
        right: 0.08,
        top: 0.13,
        bottom: 0.24
      };
      return {
        x: frame.x + frame.w * inset.left,
        y: frame.y + frame.h * inset.top,
        w: frame.w * (1 - inset.left - inset.right),
        h: frame.h * (1 - inset.top - inset.bottom)
      };
    }
    return {
      x: frame.x + minX,
      y: frame.y + minY,
      w: Math.max(1, maxX - minX + 1),
      h: Math.max(1, maxY - minY + 1)
    };
  };

  const composePrintImage = async (dataUrl, selectedId) => {
    const template = await loadFirstImage(PRINT_TEMPLATE_URLS);
    const canvas = document.createElement("canvas");
    canvas.width = template.width;
    canvas.height = template.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

    const layout = getPrintLayout(canvas.width, canvas.height);
    const frame = layout
      ? {
          x: canvas.width * layout.frame.x,
          y: canvas.height * layout.frame.y,
          w: canvas.width * layout.frame.w,
          h: canvas.height * layout.frame.h
        }
      : detectFrame(ctx, canvas.width, canvas.height);
    const inner = layout
      ? {
          x: frame.x + frame.w * layout.inner.x,
          y: frame.y + frame.h * layout.inner.y,
          w: frame.w * layout.inner.w,
          h: frame.h * layout.inner.h
        }
      : detectInner(ctx, frame);
    const offsetX = inner.x + inner.w / 2 - (frame.x + frame.w / 2);
    const offsetY = inner.y + inner.h / 2 - (frame.y + frame.h / 2);

    const assets = CHARACTER_ASSETS[selectedId] || CHARACTER_ASSETS.migu;
    const [bgImg, shapeImg, labelImg, charImg] = await Promise.all([
      loadImage(assets.bg),
      loadImage(assets.shape),
      loadImage(assets.label),
      loadImage(dataUrl || IMG.character)
    ]);

    const card = document.createElement("canvas");
    card.width = Math.round(inner.w);
    card.height = Math.round(inner.h);
    const cctx = card.getContext("2d");

    drawCover(cctx, bgImg, 0, 0, card.width, card.height);

    const border = Math.max(4, Math.round(card.width * 0.02));
    cctx.lineWidth = border;
    cctx.strokeStyle = "#7b33ff";
    cctx.strokeRect(border / 2, border / 2, card.width - border, card.height - border);

    const shapeW = card.width * 0.82;
    const shapeH = (shapeImg.height / shapeImg.width) * shapeW;
    const shapeX = (card.width - shapeW) / 2;
    const shapeY = card.height * 0.05;
    cctx.drawImage(shapeImg, shapeX, shapeY, shapeW, shapeH);

    const labelW = shapeW * 0.76;
    const labelH = (labelImg.height / labelImg.width) * labelW;
    const labelX = (card.width - labelW) / 2;
    const labelY = shapeY + shapeH * 0.18;
    cctx.drawImage(labelImg, labelX, labelY, labelW, labelH);

    const cfg = CARD_CONFIG[selectedId] || CARD_CONFIG.default;
    const charW = card.width * (cfg.width / 100);
    const charH = (charImg.height / charImg.width) * charW;
    const charX = (card.width - charW) / 2;
    const charY = card.height * (cfg.top / 100);
    cctx.drawImage(charImg, charX, charY, charW, charH);

    const angle = layout?.angle ?? (8 * Math.PI) / 180;
    const scale = layout?.scale ?? 0.9;
    ctx.save();
    ctx.translate(frame.x + frame.w / 2, frame.y + frame.h / 2);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.rect(-frame.w / 2, -frame.h / 2, frame.w, frame.h);
    ctx.clip();
    ctx.drawImage(
      card,
      -inner.w * scale / 2 + offsetX,
      -inner.h * scale / 2 + offsetY,
      inner.w * scale,
      inner.h * scale
    );
    ctx.restore();

    return canvas.toDataURL("image/png");
  };

  const printImage = (dataUrl) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Print Photo</title>
          <style>
            body { margin: 0; display: grid; place-items: center; height: 100vh; background: #0b2d64; }
            img { max-width: 100%; max-height: 100vh; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" />
          <script>
            setTimeout(() => { window.print(); window.close(); }, 350);
          </script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const fakeEmailSend = async () => {
    setToast("Email queued (demo). Backend add karo to real email jayegi.");
    setTimeout(() => setToast(""), 2200);
  };

  const onPrint = async () => {
    if (!finalImg || printing) return;
    setPrinting(true);
    try {
      const composed = await composePrintImage(finalImg, characterId);
      printImage(composed);
    } catch {
      setToast("Print template missing. Character-only print ho raha ha.");
      printImage(finalImg);
    } finally {
      setPrinting(false);
    }
    goDone();
  };

  const onEmail = async () => {
    if (!finalImg || printing) return;
    setPrinting(true);
    try {
      await composePrintImage(finalImg, characterId);
    } catch {
      setToast("Print template missing. Character-only email hoga.");
    } finally {
      setPrinting(false);
    }
    await fakeEmailSend();
    goDone();
  };

  const onBoth = async () => {
    if (!finalImg || printing) return;
    setPrinting(true);
    try {
      const composed = await composePrintImage(finalImg, characterId);
      printImage(composed);
    } catch {
      setToast("Print template missing. Character-only print hoga.");
      printImage(finalImg);
    } finally {
      setPrinting(false);
    }
    await fakeEmailSend();
    goDone();
  };

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
          alt="Share Your Creation!"
          className="absolute left-1/2 top-[24%] w-[90%] -translate-x-1/2"
          draggable="false"
        />

        <img
          src={finalImg || IMG.character}
          alt="Character"
          className="absolute left-1/2 top-[30%] -translate-x-1/2"
          style={{ width: characterId === "teddy" ? "50%" : "80%" }}
          draggable="false"
        />

        <div className="absolute left-1/2 bottom-[14%] w-[90%] -translate-x-1/2 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onPrint}
            className="w-[48%] transition-transform active:scale-[0.98] hover:scale-[1.03]"
            aria-label="Print"
          >
            <img src={IMG.print} alt="Print" className="w-full h-auto" draggable="false" />
          </button>
          <button
            type="button"
            onClick={onEmail}
            className="w-[48%] transition-transform active:scale-[0.98] hover:scale-[1.03]"
            aria-label="Email"
          >
            <img src={IMG.email} alt="Email" className="w-full h-auto" draggable="false" />
          </button>
        </div>

        <div className="absolute left-1/2 bottom-[2%] w-[43%] -translate-x-1/2">
          <button
            type="button"
            onClick={onBoth}
            className="w-full transition-transform active:scale-[0.98] hover:scale-[1.03]"
            aria-label="Do both"
          >
            <img src={IMG.both} alt="Do both" className="w-full h-auto" draggable="false" />
          </button>
        </div>

        {toast ? (
          <div className="absolute left-1/2 bottom-[8%] -translate-x-1/2 rounded-xl bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700">
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  );
}
