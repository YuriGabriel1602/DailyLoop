import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

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

export const useBackendStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${api.baseUrl}/`, { method: "GET" });
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
