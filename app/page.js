"use client";

import { useRouter } from "next/navigation";
import { useBooth } from "../context/BoothContext";

const BG_URL = "/assets/Main%20Screen/BG.jpg";
const IMG = {
  logo: "/assets/Main%20Screen/Logo.png",
  base: "/assets/Main%20Screen/Base-Circle.png",
  button: "/assets/Main%20Screen/Button.png",
  migu: "/assets/Main%20Screen/MIGU.png",
  liya: "/assets/Main%20Screen/LIYA.png",
  teddy: "/assets/Main%20Screen/Teddy.png",
  piper: "/assets/Main%20Screen/pied-piper-chibi.png",
  arrowLeft: "/assets/Main%20Screen/Arrow.png",
  arrowRight: "/assets/Main%20Screen/Arrow-2.png",
  heart: "/assets/Main%20Screen/Heart.png",
  stars: "/assets/Main%20Screen/Stars.png",
  sun: "/assets/Main%20Screen/Sun.png"
};

export default function MainScreen() {
  const router = useRouter();
  const { resetAll } = useBooth();

  const onBegin = () => {
    resetAll();
    router.push("/start");
  };

  return (
    <div className="min-h-screen w-full bg-[#2a0b4f] flex items-center justify-center px-4 py-6 kids-font">
      <div className="relative w-full max-w-[520px] aspect-[9/16] overflow-hidden rounded-[32px] shadow-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BG_URL})` }}
        />

        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-[-3%] -translate-x-1/2 w-[65%]">
            <img
              src={IMG.logo}
              alt="Little Pipers"
              className="w-full h-auto"
              draggable="false"
            />
          </div>

          {/* <svg
            className="absolute left-[4%] top-[26%] w-[92%] h-[20%] pointer-events-none"
            viewBox="0 0 100 40"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 30 C 18 5, 40 2, 60 16 S 90 46, 98 10"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="10 12"
            />
          </svg> */}

          <img
            src={IMG.arrowLeft}
            alt=""
            className="absolute left-[-19%] top-[34%] w-[50%] ms-arrow-left"
            draggable="false"
          />
          <img
            src={IMG.arrowRight}
            alt=""
            className="absolute right-[0%] top-[19%] w-[50%] ms-arrow-right"
            draggable="false"
          />
          <img
            src={IMG.heart}
            alt=""
            className="absolute left-[10%] top-[24%] w-[12%] ms-float-slow"
            draggable="false"
          />
          <img
            src={IMG.sun}
            alt=""
            className="absolute right-[12%] top-[22%] w-[8%] ms-float"
            draggable="false"
          />
          <img
            src={IMG.stars}
            alt=""
            className="absolute right-[24%] top-[28%] w-[12%] ms-float-slow ms-delay-2 z-10"
            draggable="false"
          />

          <img
            src={IMG.base}
            alt=""
            className="absolute left-1/2 bottom-[23%] -translate-x-1/2 w-[90%]"
            draggable="false"
          />
          <img
            src={IMG.piper}
            alt=""
            className="absolute left-1/2 bottom-[28%] -translate-x-1/2 w-[58%]"
            draggable="false"
          />
          <img
            src={IMG.liya}
            alt=""
            className="absolute left-[1%] bottom-[24%] w-[48%]"
            draggable="false"
          />
          <img
            src={IMG.migu}
            alt=""
            className="absolute left-1/2 bottom-[22%] -translate-x-1/2 w-[45%]"
            draggable="false"
          />
          <img
            src={IMG.teddy}
            alt=""
            className="absolute right-[-18%] bottom-[24%] w-[80%]"
            draggable="false"
          />

          <div className="absolute left-1/2 bottom-[6%] -translate-x-1/2 w-[62%]">
            <button
              type="button"
              onClick={onBegin}
              className="w-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
              aria-label="Let&apos;s begin"
            >
              <span className="sr-only">Let&apos;s begin</span>
              <img src={IMG.button} alt="" className="w-full h-auto" draggable="false" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
