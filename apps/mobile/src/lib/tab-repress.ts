import { useEffect } from "react";

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

/** Dock 上重复点按当前 tab 时触发（iOS 惯例：列表滚回顶部）。 */
export function emitTabRepress(tabName: string) {
  listeners.get(tabName)?.forEach((fn) => fn());
}

export function useTabRepress(tabName: string | undefined, fn: Listener) {
  useEffect(() => {
    if (!tabName) return;
    const set = listeners.get(tabName) ?? new Set();
    set.add(fn);
    listeners.set(tabName, set);
    return () => {
      set.delete(fn);
    };
  }, [tabName, fn]);
}
