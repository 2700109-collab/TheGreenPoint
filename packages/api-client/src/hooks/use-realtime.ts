import { useEffect, useRef, useCallback, useState } from 'react';

export interface RealtimeEvent {
  type: 'transfer.received' | 'compliance.alert' | 'plant.stage_changed' | 'permit.status_changed';
  entityId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface UseRealtimeOptions {
  /** Filter to specific event types */
  entityTypes?: RealtimeEvent['type'][];
  /** Callback for each event */
  onEvent: (event: RealtimeEvent) => void;
  /** Enable the connection (default true) */
  enabled?: boolean;
}

type ConnectionMode = 'websocket' | 'polling' | 'disconnected';

const WS_URL = '/api/v1/ws';
const POLL_URL = '/api/v1/events';
const MAX_RECONNECT_ATTEMPTS = 3;
const POLL_INTERVAL_MS = 30_000;

function backoffDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 8000);
}

/**
 * Connect to the NCTS WebSocket endpoint for real-time updates.
 * Falls back to long-polling after 3 failed reconnection attempts.
 */
export function useRealtimeUpdates(options: UseRealtimeOptions) {
  const { entityTypes, onEvent, enabled = true } = options;

  const [mode, setMode] = useState<ConnectionMode>('disconnected');
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Keep latest callback in ref to avoid reconnecting when callback identity changes
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const entityTypesRef = useRef(entityTypes);
  entityTypesRef.current = entityTypes;

  const handleEvent = useCallback((event: RealtimeEvent) => {
    const types = entityTypesRef.current;
    if (types && types.length > 0 && !types.includes(event.type)) {
      return;
    }
    onEventRef.current(event);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    setMode('polling');
    setIsConnected(true);

    const poll = async () => {
      try {
        const res = await fetch(POLL_URL);
        if (!res.ok) return;
        const events: RealtimeEvent[] = await res.json() as RealtimeEvent[];
        for (const event of events) {
          handleEvent(event);
        }
      } catch {
        // Silently ignore poll failures; next interval will retry
      }
    };

    // Fire immediately, then on interval
    void poll();
    pollRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);
  }, [handleEvent, stopPolling]);

  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    closeWebSocket();

    if (!mountedRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = WS_URL.startsWith('ws')
      ? WS_URL
      : `${protocol}//${window.location.host}${WS_URL}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      reconnectAttemptRef.current = 0;
      setMode('websocket');
      setIsConnected(true);
    };

    ws.onmessage = (msgEvent: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const event = JSON.parse(msgEvent.data as string) as RealtimeEvent;
        handleEvent(event);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);

      const attempt = reconnectAttemptRef.current;
      if (attempt < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptRef.current = attempt + 1;
        const delay = backoffDelay(attempt);
        reconnectTimerRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      } else {
        // Exceeded max reconnect attempts — fall back to polling
        startPolling();
      }
    };
  }, [closeWebSocket, handleEvent, startPolling]);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      closeWebSocket();
      stopPolling();
      setMode('disconnected');
      setIsConnected(false);
      return;
    }

    reconnectAttemptRef.current = 0;
    connectWebSocket();

    return () => {
      mountedRef.current = false;
      closeWebSocket();
      stopPolling();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [enabled, connectWebSocket, closeWebSocket, stopPolling]);

  return { isConnected, mode } as const;
}
