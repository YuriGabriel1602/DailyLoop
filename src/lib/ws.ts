import { useEffect, useRef } from "react";
import { api, getStoredToken } from "@/lib/api";

export function useRealtimeSocket(path: string, onEvent: (event: any) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByEffect = false;

    const wsBaseUrl = api.baseUrl.replace(/^http/, "ws");

    const connect = () => {
      socket = new WebSocket(`${wsBaseUrl}${path}?token=${encodeURIComponent(token)}`);
      socket.onmessage = (event) => {
        try {
          onEventRef.current(JSON.parse(event.data));
        } catch {
          // evento não-JSON, ignora
        }
      };
      socket.onclose = () => {
        if (!closedByEffect) reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [path]);
}
