import { useEffect, useRef, useState, useCallback } from "react";
import { SourceCitation } from "../types";

interface UseWebSocketOptions {
  onToken: (token: string) => void;
  onDone: (sources: SourceCitation[]) => void;
  onError: (error: string) => void;
}

export function useWebSocket({ onToken, onDone, onError }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(1000); // Start with 1s reconnect delay

  const onTokenRef = useRef(onToken);
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTokenRef.current = onToken;
    onDoneRef.current = onDone;
    onErrorRef.current = onError;
  }, [onToken, onDone, onError]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}/ws/chat`;

    console.log(`Connecting to AURA Offline WebSocket Engine at: ${socketUrl}`);
    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connection established with AURA Core.");
      setIsConnected(true);
      reconnectDelayRef.current = 1000; // Reset exponential delay
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "token") {
          onTokenRef.current(payload.data);
        } else if (payload.type === "done") {
          onDoneRef.current(payload.sources || []);
        } else if (payload.type === "error") {
          onErrorRef.current(payload.message || "An error occurred during streaming.");
        }
      } catch (err) {
        console.error("Error parsing WebSocket packet:", err);
      }
    };

    ws.onclose = () => {
      console.warn("WebSocket connection terminated. Reconnecting...");
      setIsConnected(false);
      
      // Exponential backoff reconnect
      const nextDelay = Math.min(reconnectDelayRef.current * 1.5, 30000);
      reconnectDelayRef.current = nextDelay;

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, nextDelay);
    };

    ws.onerror = (err) => {
      console.error("WebSocket transport error:", err);
      onErrorRef.current("Connection lost. Reconnecting to local intelligence...");
    };
  }, []);

  const sendMessage = useCallback((message: string, sessionId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message, sessionId }));
    } else {
      console.error("WebSocket is not active.");
      onErrorRef.current("Local intelligence engine is offline. Reconnecting...");
      connect();
    }
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on explicit teardown
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { sendMessage, isConnected };
}
