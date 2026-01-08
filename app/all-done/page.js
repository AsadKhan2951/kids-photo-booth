"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBooth } from "../../context/BoothContext";

const BG_URL = "/assets/All%20Done/BG.png";
const IMG = {
  header: "/assets/All%20Done/Header.png",
  title: "/assets/All%20Done/All-Done.png",
  subtitle: "/assets/All%20Done/Your-photo-is-ready!.png",
  character: "/assets/All%20Done/Character.png"
};

export default function AllDoneScreen() {
  const router = useRouter();
  const { state } = useBooth();

  useEffect(() => {
    if (!state.shots?.length) router.replace("/camera");
  }, [state.shots, router]);

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
          alt="All Done"
          className="absolute left-1/2 top-[24%] w-[44%] -translate-x-1/2"
          draggable="false"
        />
        <img
          src={IMG.subtitle}
          alt="Your photo is ready!"
          className="absolute left-1/2 top-[29%] w-[58%] -translate-x-1/2"
          draggable="false"
        />

        <img
          src={IMG.character}
          alt="Character"
          className="absolute left-1/2 top-[36%] w-[76%] -translate-x-1/2"
          draggable="false"
        />
      </div>
    </div>
  );
}
