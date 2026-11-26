"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";

export type RealtimeState = "connecting" | "live" | "reconnecting";

export interface RealtimeOrderHandlers {
  onInsert: (row: Order) => void;
  onUpdate: (row: Order) => void;
  /** Called after the channel comes back from a drop (or the tab wakes up): refetch to catch up. */
  onResync: () => void;
}

const MAX_BACKOFF_MS = 30_000;
/** Several subscribers (board + sidebar badge) can start in the same millisecond: names must differ. */
let channelSeq = 0;

/**
 * Subscribes to `postgres_changes` on `orders` for one restaurant (RLS still applies, so staff only
 * receive their own restaurant's rows). Reconnects with exponential backoff on CHANNEL_ERROR /
 * TIMED_OUT / CLOSED and asks the caller to resync after every reconnect, when the browser comes
 * back online and when the tab becomes visible again.
 */
export function useRealtimeOrders(restaurantId: string, handlers: RealtimeOrderHandlers): RealtimeState {
  const [state, setState] = useState<RealtimeState>("connecting");
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: RealtimeChannel | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let everLive = false;
    let disposed = false;
    // Every connect() takes a new generation; a call that was overtaken while awaiting stops before
    // creating a channel, so overlapping reconnects can never leave an orphan subscription behind.
    let generation = 0;

    const scheduleReconnect = () => {
      if (disposed || retryTimer) return;
      setState("reconnecting");
      const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt);
      attempt++;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void connect();
      }, delay);
    };

    const connect = async () => {
      const gen = ++generation;
      const stale = () => disposed || gen !== generation;
      if (channel) {
        const old = channel;
        channel = null;
        await supabase.removeChannel(old);
      }
      if (stale()) return;
      // Realtime authorises postgres_changes with the user's JWT (RLS on orders).
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (stale()) return;

      const ch = supabase
        .channel(`orders:${restaurantId}:${Date.now()}:${(channelSeq += 1)}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
          (payload) => handlersRef.current.onInsert(payload.new as Order),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
          (payload) => handlersRef.current.onUpdate(payload.new as Order),
        );
      channel = ch;
      ch.subscribe((status) => {
          // Ignore late callbacks from a channel we already replaced or removed.
          if (disposed || channel !== ch) return;
          if (status === "SUBSCRIBED") {
            attempt = 0;
            setState("live");
            if (everLive) handlersRef.current.onResync();
            everLive = true;
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            scheduleReconnect();
          }
        });
    };

    const onWake = () => {
      if (document.visibilityState === "visible") handlersRef.current.onResync();
    };
    const onOnline = () => {
      handlersRef.current.onResync();
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      attempt = 0;
      void connect();
    };

    void connect();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      generation++;
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("online", onOnline);
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) void supabase.removeChannel(channel);
      channel = null;
    };
  }, [restaurantId]);

  return state;
}

/** Short two-tone "new order" chime (WebAudio). Silently does nothing when audio is blocked. */
export function createOrderChime() {
  let ctx: AudioContext | null = null;

  const ensure = () => {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  };

  return {
    /** Call from a user gesture so the browser lets the context start. */
    unlock: () => {
      ensure();
    },
    play: () => {
      try {
        const ac = ensure();
        if (!ac || ac.state !== "running") return;
        const t = ac.currentTime;
        [880, 1320].forEach((freq, i) => {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          const start = t + i * 0.16;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
          osc.connect(gain).connect(ac.destination);
          osc.start(start);
          osc.stop(start + 0.16);
        });
      } catch {
        // Audio is a nicety; never break the board over it.
      }
    },
  };
}
