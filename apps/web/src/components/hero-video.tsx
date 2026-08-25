"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const poster = "/media/pulse-hiit-editorial.png";

export function HeroVideo() {
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [preferenceKnown, setPreferenceKnown] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => {
      setMotionAllowed(!media.matches);
      setPreferenceKnown(true);
    };
    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  if (!preferenceKnown || !motionAllowed) {
    return <Image src={poster} alt="" fill priority sizes="100vw" className="object-cover object-center opacity-90" aria-hidden="true" />;
  }

  return (
    <video className="absolute inset-0 h-full w-full max-w-none object-cover object-center opacity-90" autoPlay muted loop playsInline preload="metadata" poster={poster} aria-hidden="true">
      <source src="/media/pulse-hiit-neutral-burpees.mp4" type="video/mp4" />
    </video>
  );
}
