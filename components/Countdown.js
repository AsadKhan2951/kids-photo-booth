"use client";

import { useEffect, useMemo, useState } from "react";

const ASSET = {
  bg: "/assets/Countdown/BG.png",
  rainbow: "/assets/Countdown/Rainbow.png",
  smile: "/assets/Countdown/Smile-In.png",
  hearts: {
    left: "/assets/Countdown/Heart-Left.png",
    right: "/assets/Countdown/Heart-Right.png"
  },
  star: "/assets/Countdown/Star.png",
  piper: {
    left: "/assets/Countdown/Piper-Left.png",
    right: "/assets/Countdown/Piper-Right.png"
  },
  music: "/assets/Countdown/Music-Beats.png",
  numbers: {
    1: "/assets/Countdown/1.png",
    2: "/assets/Countdown/2.png",
    3: "/assets/Countdown/3.png"
  }
};

export default function Countdown({ seconds = 3, onDone, freezeAt = null }) {
  const [n, setN] = useState(seconds);

  useEffect(() => {
    if (freezeAt != null) {
      setN(freezeAt);
      return undefined;
    }

    setN(seconds);
    const t = setInterval(() => {
      setN((v) => v - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [seconds, freezeAt]);

  useEffect(() => {
    if (freezeAt != null) return;
    if (n <= 0) onDone?.();
  }, [n, onDone, freezeAt]);

  const numberSrc = useMemo(() => ASSET.numbers[n] || ASSET.numbers[1], [n]);

  if (n <= 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ASSET.bg})` }}
      />

      <img
        src={ASSET.rainbow}
        alt=""
        className="absolute left-1/2 top-[18%] -translate-x-1/2"
        draggable="false"
        style={{width: "700px", maxWidth: "700px" }}
      />
      <img
        src={ASSET.hearts.left}
        alt=""
        className="absolute left-[18%] top-[21%] w-[12%] ms-float"
        draggable="false"
      />
      <img
        src={ASSET.star}
        alt=""
        className="absolute right-[45%] top-[19%] w-[10%] -translate-x-1/2 ms-float"
        draggable="false"
      />
      <img
        src={ASSET.hearts.right}
        alt=""
        className="absolute right-[18%] top-[21%] w-[12%] ms-float"
        draggable="false"
      />

      <img
        src={ASSET.music}
        alt=""
        className="absolute left-1/2 top-[36%] w-[150%] -translate-x-1/2 opacity-30"
        draggable="false"
      />

      <img
        src={ASSET.smile}
        alt="Smile in"
        className="absolute left-1/2 top-[34%] w-[75%] -translate-x-1/2"
        draggable="false"
      />
      <img
        src={numberSrc}
        alt={`Countdown ${n}`}
        className="absolute left-1/2 top-[59%] w-[14%] -translate-x-1/2"
        draggable="false"
      />

      <img
        src={ASSET.piper.left}
        alt=""
        className="absolute left-[-29%] bottom-[0%] w-[57%] ms-float-slow"
        draggable="false"
      />
      <img
        src={ASSET.piper.right}
        alt=""
        className="absolute right-[-29%] bottom-[0%] w-[57%] ms-float-slow"
        draggable="false"
      />
    </div>
  );
}
