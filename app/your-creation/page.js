"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooth } from "../../context/BoothContext";

const BG_URL = "/assets/Your%20Creation/BG.png";
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

  const onPrint = () => {
    if (finalImg) printImage(finalImg);
    goDone();
  };

  const onEmail = async () => {
    await fakeEmailSend();
    goDone();
  };

  const onBoth = async () => {
    if (finalImg) printImage(finalImg);
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
