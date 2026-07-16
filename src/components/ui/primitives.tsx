import { useEffect, useRef, useState, memo } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { ChevronLeft, Server, Wifi, Battery, Cloud } from "lucide-react";

export const THEME = { glass: "backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl" };

export const useTimeFormat = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export const SpotlightCard = memo(
  ({ children, className = "", onClick, noPadding = false }: any) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: any) {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }

    return (
      <div
        className={`group relative border border-white/10 bg-[#0a0a0b] overflow-hidden will-change-transform rounded-3xl ${className}`}
        onMouseMove={handleMouseMove}
        onClick={onClick}
      >
        <motion.div
          className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-0"
          style={{
            background: useMotionTemplate`radial-gradient(650px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.06), transparent 80%)`,
          }}
        />
        <div className={`relative z-10 h-full ${noPadding ? "" : "p-5 md:p-6"}`}>{children}</div>
      </div>
    );
  }
);

export const HeaderBack = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <div className="sticky top-0 z-40 flex items-center gap-4 p-4 md:p-6 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 mb-6">
    <button
      onClick={onBack}
      className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-95 border border-white/5 hover:border-white/10"
    >
      <ChevronLeft size={20} />
    </button>
    <h1 className="text-xs md:text-sm font-bold uppercase tracking-widest text-white truncate">{title}</h1>
  </div>
);

export const StatusBar = ({ isBackendOnline }: { isBackendOnline: boolean }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-3 md:gap-4">
        <span className="text-xs font-bold text-white tracking-widest">
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <div className="h-3 w-px bg-white/20" />
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-gray-400 font-medium uppercase">
          <Cloud size={12} className="text-blue-400" /> Sistema Online
        </div>
      </div>
      <div className="flex items-center gap-3 md:gap-4">
        <div
          className={`flex items-center gap-2 px-2 py-1 rounded-full border transition-colors ${
            isBackendOnline ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
          }`}
        >
          <Server size={10} className={isBackendOnline ? "text-green-400" : "text-red-400"} />
          <span
            className={`text-[9px] font-bold uppercase tracking-wider ${
              isBackendOnline ? "text-green-400" : "text-red-400"
            }`}
          >
            {isBackendOnline ? "Online" : "Offline"}
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-3 text-gray-400">
          <Wifi size={14} />
          <Battery size={14} className="hidden sm:block" />
          <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 border border-white/30" />
        </div>
      </div>
    </div>
  );
};

export const useBackendStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${(import.meta as any).env?.VITE_API_BASE_URL || "http://127.0.0.1:8000"}/`, {
          method: "GET",
        });
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);
  return isOnline;
};
