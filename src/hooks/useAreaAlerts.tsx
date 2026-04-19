import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AlertOptions {
  enabled: boolean;
  state: string;
  area: string;
  label: string; // "Power" or "Fuel"
}

/**
 * Watches a list of incoming items and fires a browser notification + toast
 * when a new one matches the user's selected state/area filter.
 * Items must have { id, state, area, created_at } shape.
 */
export const useAreaAlerts = <T extends { id: string; state?: string | null; area?: string | null; created_at: string }>(
  items: T[],
  opts: AlertOptions,
  describe: (item: T) => string,
) => {
  const { toast } = useToast();
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    // Seed seen ids on first render so we don't spam alerts for existing reports.
    if (!initialized.current && items.length > 0) {
      items.forEach((i) => seenIds.current.add(i.id));
      initialized.current = true;
      return;
    }
    if (!opts.enabled) return;

    const matches = (i: T) => {
      const stateOk = !opts.state || i.state === opts.state;
      const areaOk = !opts.area || (i.area ?? "").toLowerCase().includes(opts.area.toLowerCase());
      return stateOk && areaOk;
    };

    for (const item of items) {
      if (seenIds.current.has(item.id)) continue;
      seenIds.current.add(item.id);
      if (!matches(item)) continue;

      const body = describe(item);
      toast({ title: `🔔 New ${opts.label} alert`, description: body });

      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(`NaijaPulse — ${opts.label} update`, {
            body,
            icon: "/favicon.ico",
            tag: `naijapulse-${item.id}`,
          });
        } catch {
          // ignore
        }
      }
    }
  }, [items, opts.enabled, opts.state, opts.area, opts.label, describe, toast]);
};

export const useNotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );

  const request = async () => {
    if (!("Notification" in window)) return "unsupported" as const;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  return { permission, request, supported: permission !== "unsupported" };
};
