"use client";

import { useRouter } from "next/navigation";
import CameraView from "../../components/CameraView";
import { useBooth } from "../../context/BoothContext";

export default function Screen3() {
  const router = useRouter();
  const { setShots } = useBooth();

  return (
    <div className="min-h-screen w-full bg-[#2a0b4f] flex items-center justify-center px-4 py-6 kids-font">
      <CameraView
        burstCount={5}
        onCaptured={(shots) => {
          setShots(shots);
          router.push("/your-character");
        }}
      />
    </div>
  );
}
