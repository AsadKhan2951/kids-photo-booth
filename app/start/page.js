"use client";

import { useRouter } from "next/navigation";
import { useBooth } from "../../context/BoothContext";
import { useMemo, useState } from "react";

const IMG = {
  button: "/assets/Start%20Screen/Select.png",
  layerTop: "/assets/Start%20Screen/Layer-Top.jpg",
  layerBottom: "/assets/Start%20Screen/Layer-Bottom.jpg"
};

export default function StartScreen() {
  const router = useRouter();
  const { state, setUser, resetAll } = useBooth();
  const [form, setForm] = useState(state.user);
  const [error, setError] = useState("");
  const [activeField, setActiveField] = useState(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const valid = useMemo(() => {
    if (!form.email.trim()) return false;
    // only gmail allowed
    if (!/^[^\s@]+@gmail\.com$/i.test(form.email.trim())) return false;
    if (!/^\d{11}$/.test(String(form.phone).trim())) return false;
    return true;
  }, [form]);

  const onNext = () => {
    if (!valid) {
      setError("Only Gmail addresses are allowed, and phone must be 11 digits.");
      return;
    }
    setError("");
    setUser(form);
    router.push("/character");
  };

  const openKeyboard = (field) => {
    setActiveField(field);
    setKeyboardOpen(true);
    setError("");
  };

  const closeKeyboard = () => {
    setKeyboardOpen(false);
    setActiveField(null);
  };

  const applyKey = (key) => {
    if (!activeField) return;
    setForm((prev) => {
      const current = String(prev[activeField] ?? "");
      let next = current;
      if (key === "Backspace") {
        next = current.slice(0, -1);
      } else if (key === "Clear") {
        next = "";
      } else if (key === "Space") {
        next = `${current} `;
      } else if (key === "Done") {
        return prev;
      } else {
        next = current + key;
      }
      if (activeField === "email") {
        const raw = next.replace(/\s/g, "");
        const local = raw.split("@")[0];
        return { ...prev, email: local ? `${local}@gmail.com` : "" };
      }
      if (activeField === "phone") {
        const digits = next.replace(/\D/g, "").slice(0, 11);
        return { ...prev, phone: digits };
      }
      return { ...prev, [activeField]: next };
    });
    if (key === "Done") closeKeyboard();
  };

  const isNumeric = activeField === "age" || activeField === "phone";
  const isEmail = activeField === "email";
  const alphaRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"]
  ];
  const emailRow = ["@", ".", "-", "_"];
  const numericRows = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
  ];

  return (
    <div className="min-h-screen w-full bg-[#f6c11e] flex items-center justify-center px-4 py-6 kids-font">
      <div className="relative w-full max-w-[735px] aspect-[9/16] overflow-hidden rounded-[32px] shadow-2xl">
        <div className="absolute inset-0 bg-[#f6c11e]" />

        <div className="absolute inset-0">
          <img
            src={IMG.layerTop}
            alt=""
            className="absolute left-0 top-0 w-full h-auto"
            draggable="false"
          />
          <img
            src={IMG.layerBottom}
            alt=""
            className="absolute left-0 bottom-0 w-full h-auto"
            draggable="false"
          />
          <div className="absolute left-1/2 top-[25%] bottom-[18%] -translate-x-1/2 w-[90%] flex flex-col items-center">
            <div className="text-center">
              <div className="text-[#a424c7] font-extrabold tracking-wide text-[clamp(16px,2.7vw,28px)]">
                ENTER DETAILS
              </div>
              <div className="text-[#a424c7] font-semibold text-[clamp(10px,1.9vw,17px)]">
                Fill in your information
              </div>
            </div>

            <div
              className="w-full flex flex-col"
              style={{ gap: "clamp(5px, 1.2vw, 10px)" }}
            >
              <label className="text-[#a424c7] font-bold tracking-wide text-[clamp(10px,1.5vw,14px)]">
                NAME
                <input
                  className="mt-1 w-full rounded-[12px] border-[2.5px] border-white bg-[#ffe38c] px-4 text-[#a424c7] placeholder:text-[#2d2bb8]/70 outline-none"
                  style={{ height: "clamp(26px, 4.3vw, 38px)" }}
                  value={form.name}
                  placeholder="Enter your name"
                  onChange={(e) => { setError(""); setForm((s) => ({ ...s, name: e.target.value })); }}
                  onFocus={() => openKeyboard("name")}
                />
              </label>

              <label className="text-[#a424c7] font-bold tracking-wide text-[clamp(10px,1.5vw,14px)]">
                AGE
                <input
                  className="mt-1 w-full rounded-[12px] border-[2.5px] border-white bg-[#ffe38c] px-4 text-[#a424c7] placeholder:text-[#2d2bb8]/70 outline-none"
                  style={{ height: "clamp(26px, 4.3vw, 38px)" }}
                  inputMode="numeric"
                  value={form.age}
                  placeholder="Enter your age"
                  onChange={(e) => { setError(""); setForm((s) => ({ ...s, age: e.target.value })); }}
                  onFocus={() => openKeyboard("age")}
                />
              </label>

              <label className="text-[#a424c7] font-bold tracking-wide text-[clamp(10px,1.5vw,14px)]">
                EMAIL ADDRESS
                <input
                  className="mt-1 w-full rounded-[12px] border-[2.5px] border-white bg-[#ffe38c] px-4 text-[#a424c7] placeholder:text-[#2d2bb8]/70 outline-none"
                  style={{ height: "clamp(26px, 4.3vw, 38px)" }}
                  value={form.email}
                  placeholder="yourname"
                  onChange={(e) => {
                    setError("");
                    const raw = e.target.value.replace(/\s/g, "");
                    const local = raw.split("@")[0];
                    setForm((s) => ({ ...s, email: local ? `${local}@gmail.com` : "" }));
                  }}
                  onFocus={() => openKeyboard("email")}
                />
              </label>

              <label className="text-[#a424c7] font-bold tracking-wide text-[clamp(10px,1.5vw,14px)]">
                CONTACT NUMBER
                <input
                  className="mt-1 w-full rounded-[12px] border-[2.5px] border-white bg-[#ffe38c] px-4 text-[#a424c7] placeholder:text-[#2d2bb8]/70 outline-none"
                  style={{ height: "clamp(26px, 4.3vw, 38px)" }}
                  value={form.phone}
                  placeholder="11-digit number"
                  inputMode="numeric"
                  pattern="\d*"
                  onChange={(e) => {
                    setError("");
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setForm((s) => ({ ...s, phone: digits }));
                  }}
                  onFocus={() => openKeyboard("phone")}
                />
              </label>
            </div>

            <div
              className={`mt-2 w-[26%] transition-opacity ${keyboardOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
              <button
                type="button"
                onClick={onNext}
                className="w-full transition-transform active:scale-[0.98] hover:scale-[1.02]"
                aria-label="Next"
              >
                <img src={IMG.button} alt="" className="w-full h-auto" draggable="false" />
              </button>
            
            </div>
            {error ? (
              <div className="mt-2 rounded-lg bg-white/70 px-3 py-1 text-center text-xs font-semibold text-[#a424c7]">
                {error}
              </div>
            ) : null}
          </div>

          {keyboardOpen ? (
            <div className="absolute left-1/2 bottom-[6%] w-[92%] -translate-x-1/2 rounded-[18px] border-[2px] border-white/40 bg-[#0a3e9e]/95 p-3 text-white shadow-[0_18px_30px_rgba(0,0,0,0.35)]">
              <div className="mb-2 flex items-center justify-between text-[12px] font-semibold tracking-wide">
                <div className="uppercase">
                  {activeField ? `${activeField} input` : "Keyboard"}
                </div>
                <button
                  type="button"
                  onClick={() => applyKey("Done")}
                  className="rounded-lg bg-white/90 px-3 py-1 text-[#0b4bc0]"
                >
                  Done
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {(isNumeric ? numericRows : alphaRows).map((row) => (
                  <div key={row.join("")} className="flex justify-center gap-2">
                    {row.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyKey(key)}
                        className="min-w-[32px] flex-1 rounded-xl bg-white/10 px-2 py-2 text-sm font-bold"
                      >
                        {key}
                      </button>
                    ))}
                    {row === alphaRows[alphaRows.length - 1] && (
                      <button
                        type="button"
                        onClick={() => applyKey("Backspace")}
                        className="min-w-[52px] rounded-xl bg-white/10 px-3 py-2 text-sm font-bold"
                      >
                        ⌫
                      </button>
                    )}
                    {isNumeric && row === numericRows[0] && (
                      <button
                        type="button"
                        onClick={() => applyKey("Backspace")}
                        className="min-w-[52px] rounded-xl bg-white/10 px-3 py-2 text-sm font-bold"
                      >
                        ⌫
                      </button>
                    )}
                  </div>
                ))}

                {!isNumeric && (
                  <div className="flex justify-center gap-2">
                    {(isEmail ? emailRow : ["Space"]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyKey(key === "Space" ? "Space" : key)}
                        className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold"
                        style={{ minWidth: key === "Space" ? "160px" : "48px" }}
                      >
                        {key === "Space" ? "Space" : key}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => applyKey("Clear")}
                      className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {isNumeric && (
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyKey("Clear")}
                      className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => applyKey("Done")}
                      className="rounded-xl bg-white/90 px-4 py-2 text-sm font-bold text-[#0b4bc0]"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}

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
