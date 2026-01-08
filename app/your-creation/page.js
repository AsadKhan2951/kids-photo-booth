"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBooth } from "../../context/BoothContext";

const BG_URL = "/assets/Your%20Creation/BG.png";
const IMG = {
  header: "/assets/Your%20Creation/Header.png",
  title: "/assets/Your%20Creation/Share-Your-Creation!.png",
  character: "/assets/Your%20Creation/Character.png",
  print: "/assets/Your%20Creation/Print.png",
  email: "/assets/Your%20Creation/Email.png",
  both: "/assets/Your%20Creation/Do-Both.png"
};

export default function YourCreationScreen() {
  const router = useRouter();
  const { state } = useBooth();

  useEffect(() => {
    if (!state.shots?.length) router.replace("/camera");
  }, [state.shots, router]);

  const goDone = () => router.push("/all-done");

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
          className="absolute left-1/2 top-[24%] w-[82%] -translate-x-1/2"
          draggable="false"
        />

        <img
          src={IMG.character}
          alt="Character"
          className="absolute left-1/2 top-[33%] w-[76%] -translate-x-1/2"
          draggable="false"
        />

        <div className="absolute left-1/2 bottom-[16%] w-[90%] -translate-x-1/2 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={goDone}
            className="w-[48%] transition-transform active:scale-[0.98] hover:scale-[1.03]"
            aria-label="Print"
          >
            <img src={IMG.print} alt="Print" className="w-full h-auto" draggable="false" />
          </button>
          <button
            type="button"
            onClick={goDone}
            className="w-[48%] transition-transform active:scale-[0.98] hover:scale-[1.03]"
            aria-label="Email"
          >
            <img src={IMG.email} alt="Email" className="w-full h-auto" draggable="false" />
          </button>
        </div>

        <div className="absolute left-1/2 bottom-[6%] w-[52%] -translate-x-1/2">
          <button
            type="button"
            onClick={goDone}
            className="w-full transition-transform active:scale-[0.98] hover:scale-[1.03]"
            aria-label="Do both"
          >
            <img src={IMG.both} alt="Do both" className="w-full h-auto" draggable="false" />
          </button>
        </div>
      </div>
    </div>
  );
}
