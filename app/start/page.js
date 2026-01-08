"use client";

import { useRouter } from "next/navigation";
import { useBooth } from "../../context/BoothContext";
import { useMemo, useState } from "react";

const BG_URL = "/assets/Start%20Screen/BG.png";
const IMG = {
  logo: "/assets/Main%20Screen/Logo.png",
  button: "/assets/Start%20Screen/Button.png",
  name: "/assets/Start%20Screen/Name.png",
  age: "/assets/Start%20Screen/Age.png",
  email: "/assets/Start%20Screen/Email.png",
  number: "/assets/Start%20Screen/Number.png",
  arrowLeft: "/assets/Start%20Screen/Arrow-2.png",
  arrowRight: "/assets/Start%20Screen/Arrow.png",
  heart: "/assets/Start%20Screen/Heart.png",
  star: "/assets/Start%20Screen/Star.png"
};

export default function StartScreen() {
  const router = useRouter();
  const { state, setUser, resetAll } = useBooth();
  const [form, setForm] = useState(state.user);
  const [error, setError] = useState("");

  const valid = useMemo(() => {
    if (!form.name.trim()) return false;
    if (!String(form.age).trim()) return false;
    const ageNum = Number(form.age);
    if (!Number.isFinite(ageNum) || ageNum <= 0) return false;
    if (!form.email.trim()) return false;
    // simple email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return false;
    return true;
  }, [form]);

  const onNext = () => {
    if (!valid) {
      setError("Please complete all fields to continue.");
      return;
    }
    setError("");
    setUser(form);
    router.push("/character");
  };

  return (
    <div className="min-h-screen w-full bg-[#f5b500] flex items-center justify-center px-4 py-6 kids-font">
      <div className="relative w-full max-w-[520px] aspect-[9/16] overflow-hidden rounded-[32px] shadow-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BG_URL})` }}
        />

        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-[-3%] -translate-x-1/2 w-[70%]">
            <img src={IMG.logo} alt="Little Pipers" className="w-full h-auto ms-float" draggable="false" />
          </div>

          <div className="absolute left-[-6%] top-[22%] w-[60%] h-[18%] pointer-events-none z-10">
            <svg className="absolute inset-0" viewBox="0 0 100 60" fill="none" aria-hidden="true">
              <path
                d="M0 45 C 20 10, 55 0, 92 20"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="10 10"
                className="ms-dash"
              />
            </svg>
            <img
              src={IMG.arrowRight}
              alt=""
              className="absolute right-[36%] top-[10%] w-[70%] ms-float"
              draggable="false"
            />
          </div>

          <img
            src={IMG.star}
            alt=""
            className="absolute right-[8%] top-[25%] w-[14%] ms-float"
            draggable="false"
          />

          <img
            src={IMG.heart}
            alt=""
            className="absolute left-[-4%] top-[64%] w-[12%] ms-float"
            draggable="false"
          />

          <div className="absolute right-[-6%] bottom-[-1%] w-[60%] h-[20%] pointer-events-none z-10">
            <svg className="absolute inset-0" viewBox="0 0 100 60" fill="none" aria-hidden="true">
              <path
                d="M100 8 C 70 18, 40 48, 2 55"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="10 10"
                className="ms-dash"
              />
            </svg>
            <img
              src={IMG.arrowLeft}
              alt=""
              className="absolute left-[6%] top-[-1%] w-[100%] ms-float"
              draggable="false"
            />
          </div>

          <div className="absolute left-1/2 top-[28%] -translate-x-1/2 w-[86%] space-y-6">
            <div className="space-y-2">
              <div className="text-white text-lg font-bold drop-shadow-sm ml-[20px]">Name</div>
              <div className="relative">
                <img src={IMG.name} alt="" className="w-full h-auto" draggable="false" />
                <input
                  className="absolute left-[6%] top-1/2 -translate-y-1/2 w-[88%] h-[54%] bg-transparent text-base font-semibold text-slate-600 placeholder:text-slate-400 outline-none"
                  placeholder="Enter your name"
                  value={form.name}
                  onChange={(e) => { setError(""); setForm((s) => ({ ...s, name: e.target.value })); }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-white text-lg font-bold drop-shadow-sm ml-[20px]">Age</div>
              <div className="relative">
                <img src={IMG.age} alt="" className="w-full h-auto" draggable="false" />
                <input
                  className="absolute left-[6%] top-1/2 -translate-y-1/2 w-[88%] h-[54%] bg-transparent text-base font-semibold text-slate-600 placeholder:text-slate-400 outline-none"
                  placeholder="How old are you?"
                  inputMode="numeric"
                  value={form.age}
                  onChange={(e) => { setError(""); setForm((s) => ({ ...s, age: e.target.value })); }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-white text-lg font-bold drop-shadow-sm ml-[20px]">Email</div>
              <div className="relative">
                <img src={IMG.email} alt="" className="w-full h-auto" draggable="false" />
                <input
                  className="absolute left-[6%] top-1/2 -translate-y-1/2 w-[88%] h-[54%] bg-transparent text-base font-semibold text-slate-600 placeholder:text-slate-400 outline-none"
                  placeholder="parents@example.com"
                  value={form.email}
                  onChange={(e) => { setError(""); setForm((s) => ({ ...s, email: e.target.value })); }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-white text-lg font-bold drop-shadow-sm ml-[20px]">Contact Number</div>
              <div className="relative">
                <img src={IMG.number} alt="" className="w-full h-auto" draggable="false" />
                <input
                  className="absolute left-[6%] top-1/2 -translate-y-1/2 w-[88%] h-[54%] bg-transparent text-base font-semibold text-slate-600 placeholder:text-slate-400 outline-none"
                  placeholder="123-456-7890"
                  value={form.phone}
                  onChange={(e) => { setError(""); setForm((s) => ({ ...s, phone: e.target.value })); }}
                />
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 bottom-[12%] -translate-x-1/2 w-[75%] bottom-[3%]">
            <button
              type="button"
              onClick={onNext}
              className="w-full transition-transform active:scale-[0.98] hover:scale-[1.02]"
              aria-label="Next"
            >
              <img src={IMG.button} alt="" className="w-full h-auto ms-float-slow" draggable="false" />
            </button>
            {error ? (
              <div className="mt-2 text-center text-sm font-semibold text-white drop-shadow-sm">
                {error}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={resetAll}
            className="absolute right-[4%] top-[4%] text-[0px]"
            aria-label="Reset session"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
