import React, { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";

export const HoloTile = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [0, 400], [5, -5]), { stiffness: 100, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [0, 800], [-5, 5]), { stiffness: 100, damping: 20 });

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      onMouseMove={onMouseMove}
      onMouseLeave={() => { mouseX.set(0); rotateX.set(0); rotateY.set(0); }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`group relative rounded-[40px] border border-white/5 bg-white/[0.02] transition-colors hover:bg-white/[0.04] ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[40px] opacity-0 transition duration-500 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, rgba(59, 130, 246, 0.1), transparent 80%)`,
        }}
      />
      <div className="relative z-10 h-full p-8" style={{ transform: "translateZ(20px)" }}>
        {children}
      </div>
    </motion.div>
  );
};