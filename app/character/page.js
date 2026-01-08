"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooth } from "../../context/BoothContext";

const BASE_LAYOUT = {
  textTop: 12,
  textWidth: 68,
  charTop: 36,
  charWidth: 62,
  shapeBottom: 4,
  shapeWidth: 62,
  nameTop: 18,
  nameWidth: 54,
  selectBottom: -73,
  selectWidth: 52,
  arrowTop: 5,
  arrowSize: 75,
  arrowOffset: 54,
  arrowOffsetRight: 54
};

const CHARACTERS = [
  {
    id: "migu",
    name: "MIGU",
    bg: "/assets/Migu/BG.png",
    heading: "/assets/Migu/Heading.png",
    text: "/assets/Migu/Text.png",
    character: "/assets/Main%20Screen/MIGU.png",
    shape: "/assets/Migu/shape.png",
    nameImage: "/assets/Migu/MIGU.png",
    select: "/assets/Migu/Select.png",
    leftArrow: "/assets/Migu/Left.png",
    rightArrow: "/assets/Migu/Right.png",
    layout: { charLeft: 15, charWidth: 68, charTop: 36, nameWidth: 90, shapeWidth: 45, selectWidth: 193 }
  },
  {
    id: "liya",
    name: "LIYA",
    bg: "/assets/Liya/BG.jpg",
    heading: "/assets/Liya/Heading.png",
    text: "/assets/Liya/Text.png",
    character: "/assets/Liya/Liya.png",
    shape: "/assets/Liya/shape.png",
    nameImage: "/assets/Liya/Name.png",
    select: "/assets/Liya/Button.png",
    leftArrow: "/assets/Liya/Arrow.png",
    rightArrow: "/assets/Liya/Arrow-2.png",
    layout: { charLeft: 15, charWidth: 68, charTop: 37, nameWidth: 70, shapeWidth: 45, selectWidth: 193 }
  },
  {
    id: "teddy",
    name: "GLUCO TEDDY",
    bg: "/assets/Teddy/BG.png",
    heading: "/assets/Teddy/Heading.png",
    text: "/assets/Teddy/Text.png",
    character: "/assets/Teddy/Character.png",
    shape: "/assets/Teddy/shape.png",
    nameImage: "/assets/Teddy/TEDDY.png",
    select: "/assets/Teddy/Select.png",
    leftArrow: "/assets/Teddy/Arrow.png",
    rightArrow: "/assets/Teddy/Arrow-2.png",
    layout: { charLeft: 2, charWidth: 100, charTop: 37, nameWidth: 62, shapeWidth: 45, selectWidth: 193 }
  },
  {
    id: "pipper",
    name: "PIED PIPER",
    bg: "/assets/Pipper/BG.png",
    heading: "/assets/Pipper/Heading.png",
    text: "/assets/Pipper/Text.png",
    character: "/assets/Pipper/Character.png",
    shape: "/assets/Pipper/shape.png",
    nameImage: "/assets/Pipper/PIPER.png",
    select: "/assets/Pipper/Select.png",
    leftArrow: "/assets/Pipper/Arrow.png",
    rightArrow: "/assets/Pipper/Arrow-2.png",
    layout: { charLeft: 12, charWidth: 80, charTop: 32, nameWidth: 50, shapeWidth: 45, selectWidth: 193 }
  }
];

export default function Screen2() {
  const router = useRouter();
  const { state, setCharacter } = useBooth();
  const initialIndex = useMemo(() => {
    const idx = CHARACTERS.findIndex((c) => c.id === state.character?.id);
    return idx >= 0 ? idx : 0;
  }, [state.character?.id]);
  const [index, setIndex] = useState(initialIndex);
  const [phase, setPhase] = useState("in");
  const transitionRef = useRef(null);

  useEffect(() => {
    if (transitionRef.current) {
      clearTimeout(transitionRef.current);
      transitionRef.current = null;
    }
    setIndex(initialIndex);
    setPhase("in");
  }, [initialIndex]);

  useEffect(() => {
    const urls = CHARACTERS.flatMap((c) => ([
      c.bg,
      c.heading,
      c.text,
      c.character,
      c.shape,
      c.nameImage,
      c.select,
      c.leftArrow,
      c.rightArrow
    ]));
    urls.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const current = CHARACTERS[index];
  const layout = { ...BASE_LAYOUT, ...current.layout };

  const requestIndex = (nextIndex) => {
    if (phase === "out" || nextIndex === index) return;
    setPhase("out");
    if (transitionRef.current) clearTimeout(transitionRef.current);
    transitionRef.current = setTimeout(() => {
      setIndex(nextIndex);
      setPhase("in");
    }, 180);
  };

  const onPrev = () => {
    const nextIndex = (index - 1 + CHARACTERS.length) % CHARACTERS.length;
    requestIndex(nextIndex);
  };

  const onNext = () => {
    const nextIndex = (index + 1) % CHARACTERS.length;
    requestIndex(nextIndex);
  };

  const onSelect = () => {
    setCharacter({ id: current.id, name: current.name });
    router.push("/camera");
  };

  return (
    <div className="min-h-screen w-full bg-[#2a0b4f] flex items-center justify-center px-4 py-6 kids-font">
      <div className="relative w-full max-w-[520px] aspect-[9/16] overflow-hidden rounded-[32px] shadow-2xl">
        <div className={["absolute inset-0 slide-wrap", phase === "out" ? "slide-out" : "slide-in"].join(" ")}>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${current.bg})` }}
          />

          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-[4%] -translate-x-1/2 w-[72%]">
              <img src={current.heading} alt="Choose your character" className="w-full h-auto" draggable="false" />
            </div>

            <div
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-0"
              style={{ top: `${layout.textTop}%`, width: `${layout.textWidth}%` }}
            >
              <img src={current.text} alt="" className="w-full h-auto" draggable="false" />
            </div>

            <img
              src={current.character}
              alt={current.name}
              className="absolute left-1/2 -translate-x-1/2 ms-float z-10"
              style={{ top: `${layout.charTop}%`, width: `${layout.charWidth}%`, left: `${layout.charLeft}%` }}
              draggable="false"
            />

            <div
              className="absolute left-1/2 -translate-x-1/2 z-20"
              style={{ bottom: `${layout.shapeBottom}%`, width: `${layout.shapeWidth}%` }}
            >
              <div className="relative">
                <img src={current.shape} alt="" className="w-full h-auto" draggable="false" />
                <img
                  src={current.nameImage}
                  alt=""
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{ top: `${layout.nameTop}%`, width: `${layout.nameWidth}%` }}
                  draggable="false"
                />
                <button
                  type="button"
                  onClick={onSelect}
                  className="absolute left-1/2 -translate-x-1/2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{ bottom: `${layout.selectBottom}%`, width: `${layout.selectWidth}%` }}
                  aria-label={`Select ${current.name}`}
                >
                  <img src={current.select} alt="" className="w-full h-auto" draggable="false" />
                </button>
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={phase === "out"}
                  className="absolute transition-transform hover:scale-[1.05] active:scale-[0.97]"
                  style={{ top: `${layout.arrowTop}%`, width: `${layout.arrowSize}%`, left: `-${layout.arrowOffset}%` }}
                  aria-label="Previous character"
                >
                  <img src={current.leftArrow} alt="" className="w-full h-auto" draggable="false" />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={phase === "out"}
                  className="absolute transition-transform hover:scale-[1.05] active:scale-[0.97]"
                  style={{ top: `${layout.arrowTop}%`, width: `${layout.arrowSize}%`, right: `-${layout.arrowOffsetRight}%` }}
                  aria-label="Next character"
                >
                  <img src={current.rightArrow} alt="" className="w-full h-auto" draggable="false" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
