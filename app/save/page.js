"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ScreenCard from "../../components/ScreenCard";
import { GhostButton, PrimaryButton } from "../../components/Button";
import { useBooth } from "../../context/BoothContext";

function printImage(dataUrl) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`
    <html>
      <head>
        <title>Print Photo</title>
        <style>
          body { margin: 0; display: grid; place-items: center; height: 100vh; }
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
}

export default function Screen6() {
  const router = useRouter();
  const { state, resetAll } = useBooth();
  const [toast, setToast] = useState("");

  const finalImg = useMemo(() => state.enhanced || (state.selectedIndex != null ? state.shots?.[state.selectedIndex] : null), [state]);

  useEffect(() => {
    if (!finalImg) router.replace("/previews");
  }, [finalImg, router]);

  const fakeEmailSend = async () => {
    // Placeholder: yahan backend API laga ke real email send karoge.
    setToast("Email queued (demo). Backend add karo to real email jayegi.");
    setTimeout(() => setToast(""), 2500);
  };

  const onPrint = () => finalImg && printImage(finalImg);
  const onEmail = () => fakeEmailSend();
  const onBoth = async () => {
    onPrint();
    await fakeEmailSend();
  };

  return (
    <ScreenCard
      screen={7}
      heading="SAVE PHOTO"
      subheading="Choose output method"
      footer={
        <div className="space-y-3">
          <GhostButton onClick={() => router.push("/enhance")}>BACK</GhostButton>
          <button
            type="button"
            onClick={() => { resetAll(); router.push("/"); }}
            className="w-full text-xs text-slate-500 hover:text-slate-700"
          >
            Start new session
          </button>
        </div>
      }
    >
      <div className="px-6 pb-6">
        <div className="rounded-3xl border-2 border-slate-300 bg-white p-3">
          {finalImg ? (
            <img src={finalImg} alt="Final" className="w-full aspect-[3/4] object-cover rounded-2xl" />
          ) : null}
        </div>

        <div className="mt-5 space-y-3">
          <button type="button" onClick={onPrint} className="k-btn k-btn-ghost">
            🖨️ PRINT PHOTO
          </button>
          <button type="button" onClick={onEmail} className="k-btn k-btn-ghost">
            📧 EMAIL PHOTO
          </button>
          <PrimaryButton onClick={onBoth}>
            🖨️ + 📧 PRINT & EMAIL
          </PrimaryButton>
        </div>

        {toast ? (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            {toast}
          </div>
        ) : null}
      </div>
    </ScreenCard>
  );
}
