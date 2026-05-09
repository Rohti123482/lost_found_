import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const POLL_MS = 30000;

export function useNotifications(user) {
  const [unread, setUnread] = useState(0);
  const lastSeenIdsRef = useRef(new Set());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let timer;

    async function tick() {
      try {
        const { data } = await api.get("/notifications");
        if (cancelled) return;
        const unreadCount = data.filter((n) => !n.is_read).length;
        setUnread(unreadCount);

        // Fire browser notifications for new unseen items
        const known = lastSeenIdsRef.current;
        const fresh = data.filter((n) => !known.has(n.id));
        if (known.size > 0 && fresh.length > 0 && "Notification" in window) {
          if (Notification.permission === "granted") {
            fresh.slice(0, 3).forEach((n) => {
              try {
                new Notification(n.title || "Findr alert", {
                  body: n.body || "",
                  icon: "/favicon.ico",
                  tag: n.id,
                });
              } catch (_) {}
            });
          }
        }
        data.forEach((n) => known.add(n.id));
      } catch (_) {}
    }

    tick();
    timer = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user]);

  function requestPermission() {
    if (!("Notification" in window)) return Promise.resolve("unsupported");
    return Notification.requestPermission();
  }

  return { unread, requestPermission };
}
