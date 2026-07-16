import { useEffect, useRef } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "framer-motion";
import { useState } from "react";

export function AnimatedNumber({ value, formatter }: { value: number; formatter: (n: number) => string }) {
  const motionValue = useMotionValue(value);
  const [display, setDisplay] = useState(formatter(value));
  const isFirstRender = useRef(true);

  useMotionValueEvent(motionValue, "change", (latest) => setDisplay(formatter(latest)));

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, { duration: 0.6, ease: "easeOut" });
    return () => controls.stop();
  }, [value, motionValue]);

  return <span>{display}</span>;
}
