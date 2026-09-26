"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/fetcher";
import type { RoomState } from "@/lib/rooms";
import { browserClient } from "@/lib/supabase/browser";

export function useRoomState(code: string | null) {
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offset = useRef(0);

  const load = useCallback(async () => {
    if (!code) return;
    try {
      const t0 = Date.now();
      const s = await api<RoomState>(`/api/rooms/${code}`);
      offset.current = new Date(s.server_now).getTime() - (t0 + Date.now()) / 2;
      setState(s);
      setError(null);
    } catch (e) {
      const err = e as Error & { status?: number };
      setError({ status: err.status ?? 500, message: err.message });
    }
  }, [code]);

  const refresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, 250);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const roomId = state?.room.id;
  const status = state?.room.status;

  useEffect(() => {
    if (!roomId || status === "ended" || status === "cancelled") return;
    const supabase = browserClient();
    const channel = supabase
      .channel(`room:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` }, refresh)
      .subscribe();
    const poll = setInterval(() => document.visibilityState === "visible" && load(), 5000);
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [roomId, status, refresh, load]);

  return { state, error, reload: load, serverOffset: offset };
}
