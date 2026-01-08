"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ScreenCard from "../../components/ScreenCard";
import { GhostButton, PrimaryButton } from "../../components/Button";
import { useBooth } from "../../context/BoothContext";

async function makeMockEnhanced(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  await new Promise((res, rej) => {
    img.onload = () => res(true);
    img.onerror = rej;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");

  // Simple “AI enhanced” look (no real AI): a bit more contrast/saturation + slight sharpen trick
  ctx.filter = "contrast(1.15) saturate(1.15) brightness(1.05)";
  ctx.drawImage(img, 0, 0);

  // Quick sharpen-ish pass (light)
  const w = canvas.width, h = canvas.height;
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const copy = new Uint8ClampedArray(d);

  const idx = (x, y) => (y * w + x) * 4;
  const amount = 0.18;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(x, y);
      for (let c = 0; c < 3; c++) {
        const center = copy[i + c];
        const up = copy[idx(x, y - 1) + c];
        const down = copy[idx(x, y + 1) + c];
        const left = copy[idx(x - 1, y) + c];
        const right = copy[idx(x + 1, y) + c];
        const edge = center * 5 - up - down - left - right;
        d[i + c] = Math.max(0, Math.min(255, center + edge * amount));
      }
    }
  }
  ctx.putImageData(id, 0, 0);

  return canvas.toDataURL("image/jpeg", 0.92);
}

export default function Screen5() {
  const router = useRouter();
  const { state, setEnhanced } = useBooth();
  const [loading, setLoading] = useState(false);

  const selected = useMemo(() => {
    if (state.selectedIndex === null || state.selectedIndex === undefined) return null;
    return state.shots?.[state.selectedIndex] || null;
  }, [state.selectedIndex, state.shots]);

  useEffect(() => {
    if (!selected) router.replace("/previews");
  }, [selected, router]);

  const onEnhance = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const out = await makeMockEnhanced(selected);
      setEnhanced(out);
    } finally {
      setLoading(false);
    }
  };

  const showImg = state.enhanced || selected;

  return (
    <ScreenCard
      screen={6}
      heading="PREVIEW"
      subheading="AI Enhanced Character (mock)"
      footer={
        <div className="space-y-3">
          <PrimaryButton onClick={() => router.push("/save")} disabled={!showImg}>
            CONFIRM SELECTION
          </PrimaryButton>
          <GhostButton onClick={() => router.push("/previews")}>← BACK TO PHOTOS</GhostButton>
        </div>
      }
    >
      <div className="px-6 pb-6">
        <div className="rounded-3xl border-4 border-slate-900 bg-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="k-pill">{state.enhanced ? "AI ENHANCED" : "ORIGINAL"}</span>
            <span className="k-pill">{state.character?.name || "CHARACTER"}</span>
          </div>

          <div className="relative p-4">
            <div className="rounded-2xl bg-white border-2 border-slate-300 overflow-hidden">
              {showImg ? (
                <img src={showImg} alt="Preview" className="w-full aspect-[3/4] object-cover" />
              ) : (
                <div className="w-full aspect-[3/4] grid place-items-center text-sm text-slate-500">No photo</div>
              )}
            </div>

            {/* Simple “character body” placeholder */}
            <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-400 bg-white/60 p-6 text-center text-xs text-slate-600">
              CHARACTER BODY PLACEHOLDER (template can be added later)
            </div>

            <button
              type="button"
              onClick={onEnhance}
              disabled={loading || !selected}
              className={[
                "mt-4 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50",
                (loading || !selected) ? "opacity-50 cursor-not-allowed" : ""
              ].join(" ")}
            >
              {loading ? "Enhancing..." : "AI ENHANCE (Mock)"}
            </button>
          </div>
        </div>
      </div>
    </ScreenCard>
  );
}
