import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion";
import { Home, Activity, CheckSquare, Cpu } from "lucide-react";
import { useStore } from "../store/useStore";

export const Dock = () => {
  const mouseX = useMotionValue(Infinity);
  const { setActiveSession, togglePrometheus } = useStore();

  const items = [
    { icon: Home, label: "Home", action: () => setActiveSession('Home') },
    { icon: Activity, label: "Bio-Sync", action: () => setActiveSession('Bio-Sync') },
    { icon: CheckSquare, label: "Tasks", action: () => setActiveSession('Tasks') },
    { icon: Cpu, label: "Prometheus", action: () => togglePrometheus(true) },
  ];

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 flex h-20 items-end gap-4 rounded-3xl border border-white/10 bg-black/40 px-6 pb-4 backdrop-blur-3xl z-[100]"
    >
      {items.map((item, i) => (
        <IconContainer mouseX={mouseX} key={i} onClick={item.action}>
          <item.icon className="w-full h-full text-gray-400 group-hover:text-blue-400 transition-colors" />
        </IconContainer>
      ))}
    </motion.div>
  );
};

function IconContainer({ mouseX, children, onClick }: { mouseX: MotionValue; children: React.ReactNode; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const size = useSpring(useTransform(distance, [-150, 0, 150], [45, 85, 45]), { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onClick={onClick}
      className="group relative flex aspect-square items-center justify-center rounded-full bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer"
    >
      <div className="w-6 h-6">{children}</div>
    </motion.div>
  );
}