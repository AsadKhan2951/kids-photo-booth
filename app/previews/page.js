"use client";

import { useRouter } from "next/navigation";
import ScreenCard from "../../components/ScreenCard";
import { GhostButton, PrimaryButton } from "../../components/Button";
import { useBooth } from "../../context/BoothContext";
import { useEffect } from "react";

export default function Screen4() {
  const router = useRouter();
  const { state, selectShot } = useBooth();

  useEffect(() => {
    if (!state.shots?.length) router.replace("/camera");
  }, [state.shots, router]);

  const canNext = state.selectedIndex !== null && state.selectedIndex !== undefined;

  return (
    <ScreenCard
      screen={5}
      heading="PHOTO PREVIEWS"
      subheading="Select your favorite"
      footer={
        <div className="space-y-3">
          <PrimaryButton
            onClick={() => router.push("/enhance")}
            disabled={!canNext}
            className={!canNext ? "opacity-50 cursor-not-allowed" : ""}
          >
            NEXT
          </PrimaryButton>
          <GhostButton onClick={() => router.push("/camera")}>BACK TO CAMERA</GhostButton>
        </div>
      }
    >
      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-4">
          {state.shots.map((src, idx) => {
            const active = idx === state.selectedIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => selectShot(idx)}
                className={[
                  "relative rounded-2xl border-2 p-2 transition",
                  active ? "border-sky-500 bg-sky-50" : "border-slate-300 bg-white hover:bg-slate-50"
                ].join(" ")}
              >
                <div className="absolute right-3 top-3 h-6 w-6 rounded-full border-2 border-slate-500 bg-white" />
                <img
                  src={src}
                  alt={`Photo ${idx + 1}`}
                  className="w-full aspect-[3/4] object-cover rounded-xl"
                />
                <div className="mt-2 text-xs font-extrabold tracking-wide text-slate-700">
                  PHOTO {idx + 1}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-center text-xs text-slate-500">
          Tap to select a photo
        </div>
      </div>
    </ScreenCard>
  );
}
