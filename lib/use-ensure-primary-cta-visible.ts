"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

type RefLike = RefObject<HTMLElement | null>;

/**
 * 当虚拟键盘改变 `visualViewport` 时，将主 CTA 滚入可视区域底部内侧，减少长期被遮挡。
 * 无 Visual Viewport API 时退化为 `scrollIntoView({ block: "nearest" })`。
 */
export function useEnsurePrimaryCtaWhenKeyboard(primaryCtaRef: RefLike, enabled: boolean) {
  const rafRef = useRef<number | null>(null);

  const bump = useCallback(() => {
    const el = primaryCtaRef.current;
    if (!el || !enabled) return;
    const vv = window.visualViewport;
    if (!vv) {
      el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      return;
    }
    const rect = el.getBoundingClientRect();
    const visibleBottom = vv.offsetTop + vv.height;
    const margin = 12;
    if (rect.bottom > visibleBottom - margin) {
      const delta = rect.bottom - (visibleBottom - margin);
      window.scrollBy({ top: delta, behavior: "smooth" });
    }
  }, [enabled, primaryCtaRef]);

  const scheduleBump = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      bump();
      window.setTimeout(bump, 320);
    });
  }, [bump]);

  useEffect(() => {
    if (!enabled) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onChange = () => scheduleBump();
    vv.addEventListener("resize", onChange);
    vv.addEventListener("scroll", onChange);
    return () => {
      vv.removeEventListener("resize", onChange);
      vv.removeEventListener("scroll", onChange);
    };
  }, [enabled, scheduleBump]);

  return { schedulePrimaryCtaIntoView: scheduleBump };
}
