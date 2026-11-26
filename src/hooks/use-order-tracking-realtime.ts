"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useOrderTrackingRealtime(orderId: string | null, onRefresh: () => void) {
  const callback = useRef(onRefresh);
  useEffect(() => { callback.current = onRefresh; });
  useEffect(() => {
    if (!orderId) return;
    const client = createSupabaseBrowserClient();
    let channel: RealtimeChannel | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let generation = 0;
    let attempt = 0;
    const retry = () => {
      if (disposed || timer) return;
      timer = setTimeout(() => { timer = null; void connect(); }, Math.min(30_000, 1000 * 2 ** attempt++));
    };
    const connect = async () => {
      const gen = ++generation;
      try {
        if (channel) { const old = channel; channel = null; await client.removeChannel(old); }
        if (disposed || gen !== generation) return;
        const { data, error } = await client.auth.getSession();
        if (error) { retry(); return; }
        if (!data.session) return;
        await client.realtime.setAuth(data.session.access_token);
        if (disposed || gen !== generation) return;
        const next = client.channel(`order-tracking:${orderId}:${crypto.randomUUID()}`)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, () => callback.current())
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "courier_positions", filter: `order_id=eq.${orderId}` }, () => callback.current())
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "courier_positions", filter: `order_id=eq.${orderId}` }, () => callback.current());
        channel = next;
        next.subscribe((status) => {
          if (disposed || channel !== next) return;
          if (status === "SUBSCRIBED") { attempt = 0; callback.current(); }
          else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) retry();
        });
      } catch { if (!disposed && gen === generation) retry(); }
    };
    const reconnect = () => {
      if (timer) clearTimeout(timer);
      timer = null; attempt = 0; callback.current(); void connect();
    };
    const wake = () => { if (document.visibilityState === "visible") reconnect(); };
    const { data: auth } = client.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "SIGNED_OUT") {
        // Leave the auth callback before asking the client for its refreshed session.
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { timer = null; reconnect(); }, 0);
      }
    });
    void connect();
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", wake);
    return () => {
      disposed = true; generation++;
      if (timer) clearTimeout(timer);
      auth.subscription.unsubscribe();
      window.removeEventListener("online", reconnect);
      document.removeEventListener("visibilitychange", wake);
      if (channel) void client.removeChannel(channel);
    };
  }, [orderId]);
}
