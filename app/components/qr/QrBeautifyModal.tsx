"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {useTranslations} from "next-intl";
import QRCodeStyling from "qr-code-styling";

import {
  buildQrStylingOptions,
  isQrDotShape,
  isQrEyeShape,
  overlayTextExtension,
  QR_DOT_SHAPES,
  QR_EYE_SHAPES,
  sanitizeLabelTopUserInput,
  type QrBuildOptions,
  type QrDotShape,
  type QrEyeShape,
  type QrLabelTopFontId,
  QrStyleState,
} from "./qrStyle";

type LogoItem = { name: string; src: string };

function codepoingDotShapeSrc(shape: QrDotShape): string {
  return `/codepoing/${shape}.png`;
}

function dotShapeOptionLabel(t: (key: string) => string, shape: QrDotShape): string {
  switch (shape) {
    case "square":
      return t("modal.dots.options.dotShape.square");
    case "dots":
      return t("modal.dots.options.dotShape.dots");
    case "rounded":
      return t("modal.dots.options.dotShape.rounded");
    case "classy":
      return t("modal.dots.options.dotShape.classy");
    case "classy-rounded":
      return t("modal.dots.options.dotShape.classyRounded");
    case "extra-rounded":
      return t("modal.dots.options.dotShape.extraRounded");
    default:
      return shape;
  }
}

function cornersEyeShapeSrc(shape: QrEyeShape): string {
  return `/corners/${shape}.png`;
}

function eyeShapeOptionLabel(t: (key: string) => string, shape: QrEyeShape): string {
  switch (shape) {
    case "square":
      return t("modal.dots.options.eyeShape.square");
    case "rounded":
      return t("modal.dots.options.eyeShape.rounded");
    case "extra-rounded":
      return t("modal.dots.options.eyeShape.extraRounded");
    case "classy-rounded":
      return t("modal.dots.options.eyeShape.classyRounded");
    case "classy":
      return t("modal.dots.options.eyeShape.classy");
    case "dots":
      return t("modal.dots.options.eyeShape.dots");
    case "dot":
      return t("modal.dots.options.eyeShape.dot");
    default:
      return shape;
  }
}

function withAutoVersionFallback(options: QrBuildOptions): QrBuildOptions {
  return {
    ...options,
    qrOptions: {
      ...options.qrOptions,
      typeNumber: 0,
    },
  };
}

const PRESET_COLORS = [
  "#000000",
  "#22315d",
  "#2a4ca0",
  "#3b3a95",
  "#0f6cb0",
  "#3f79ad",
  "#536286",
  "#7892a8",
  "#1f5b3d",
  "#0d7a76",
  "#467f70",
  "#526c70",
  "#8f2731",
  "#df8548",
  "#6a3d24",
  "#7a796e",
  "#9a9a8a",
  "#b1b2b9",
  "#b7c1b6",
  "#b8bdc6",
  "#b4aeae",
  "#d8d8d8",
];

type Props = {
  open: boolean;
  draft: QrStyleState;
  initialStyle: QrStyleState;
  setDraft: React.Dispatch<React.SetStateAction<QrStyleState>>;
  onClose: () => void;
  onSave: () => void;
  onClear: () => void;
  onDownloadAndPrint: () => void;
};

const QR_PREVIEW_DEBOUNCE_MS = 280;

/** 与 Tailwind `md` 对齐：小屏使用全屏布局与底部吸附的选色/选形面板 */
function useNarrowModalUi() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return narrow;
}

function QRPreview({
  draft,
  containerRef,
  open,
}: {
  draft: QrStyleState;
  containerRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
}) {
  const qrRef = useRef<QRCodeStyling | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  /** 每次打开弹窗后第一次预览立即绘制，之后对 draft 变化防抖（避免码上方文字输入时整图闪烁） */
  const skipDebounceOnceRef = useRef(true);

  useEffect(() => {
    if (!open) {
      skipDebounceOnceRef.current = true;
      qrRef.current = null;
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const delayMs = skipDebounceOnceRef.current ? 0 : QR_PREVIEW_DEBOUNCE_MS;
    skipDebounceOnceRef.current = false;

    const timer = window.setTimeout(() => {
      const d = draftRef.current;
      el.innerHTML = "";

      const options = buildQrStylingOptions(d, "preview");
      let qr: QRCodeStyling;
      try {
        qr = new QRCodeStyling(options);
        qr.applyExtension(overlayTextExtension);
        qr.append(el);
      } catch {
        qr = new QRCodeStyling(withAutoVersionFallback(options));
        qr.applyExtension(overlayTextExtension);
        qr.append(el);
      }
      qrRef.current = qr;
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [containerRef, draft, open]);

  return null;
}

export default function QrBeautifyModal({
  open,
  draft,
  initialStyle,
  setDraft,
  onClose,
  onSave,
  onClear,
  onDownloadAndPrint,
}: Props) {
  const t = useTranslations();
  const narrowUi = useNarrowModalUi();
  const qrVersionOptions = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => {
        const v = i + 1;
        const size = 21 + 4 * i;
        return `${v} (${size}*${size})`;
      }),
    [],
  );
  const modalPreviewRef = useRef<HTMLDivElement | null>(null);
  const dotColorFieldRef = useRef<HTMLDivElement | null>(null);
  const bgColorFieldRef = useRef<HTMLDivElement | null>(null);
  const dotColorTriggerRef = useRef<HTMLDivElement | null>(null);
  const bgColorTriggerRef = useRef<HTMLDivElement | null>(null);
  const dotColorPopoverRef = useRef<HTMLDivElement | null>(null);
  const bgColorPopoverRef = useRef<HTMLDivElement | null>(null);
  const dotShapeFieldRef = useRef<HTMLDivElement | null>(null);
  const dotShapeTriggerRef = useRef<HTMLDivElement | null>(null);
  const dotShapePopoverRef = useRef<HTMLDivElement | null>(null);
  const eyeShapeFieldRef = useRef<HTMLDivElement | null>(null);
  const eyeShapeTriggerRef = useRef<HTMLDivElement | null>(null);
  const eyeShapePopoverRef = useRef<HTMLDivElement | null>(null);
  const qrVersionFieldRef = useRef<HTMLDivElement | null>(null);
  const qrVersionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const qrVersionPopoverRef = useRef<HTMLDivElement | null>(null);
  const currentDotColor = draft.dotColor || "#000000";
  const currentBackgroundColor = draft.backgroundColor || "#ffffff";

  const [showLogoLibrary, setShowLogoLibrary] = useState(false);
  const [logoLibraryItems, setLogoLibraryItems] = useState<LogoItem[]>([]);
  const [logoLibraryLoading, setLogoLibraryLoading] = useState(false);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [showEyeColorPicker, setShowEyeColorPicker] = useState(false);
  const [showDotColorPicker, setShowDotColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [dotPopoverPos, setDotPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [bgPopoverPos, setBgPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [recentDotColors, setRecentDotColors] = useState<string[]>(["#9ea2a7", "#f04e5e", "#0f3f86", "#1f5b3d"]);
  const [recentBgColors, setRecentBgColors] = useState<string[]>(["#ffffff", "#f7f7f7", "#f0f4ff", "#fff7e8"]);
  const [confirmUnsavedOpen, setConfirmUnsavedOpen] = useState(false);
  const [showDotShapeDialog, setShowDotShapeDialog] = useState(false);
  const [dotShapePopoverPos, setDotShapePopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [showEyeShapeDialog, setShowEyeShapeDialog] = useState(false);
  const [eyeShapePopoverPos, setEyeShapePopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [showQrVersionDialog, setShowQrVersionDialog] = useState(false);
  const [qrVersionPopoverPos, setQrVersionPopoverPos] = useState<{ top: number; left: number } | null>(null);

  const hasUnsavedChanges = useMemo(() => {
    const a = draft;
    const b = initialStyle;
    return (
      a.logoImageSrc !== b.logoImageSrc ||
      a.dotColorMode !== b.dotColorMode ||
      a.backgroundMode !== b.backgroundMode ||
      a.dotShape !== b.dotShape ||
      a.eyeShape !== b.eyeShape ||
      a.eyeColorMode !== b.eyeColorMode ||
      a.eyeColor !== b.eyeColor ||
      a.quietZone !== b.quietZone ||
      a.errorCorrection !== b.errorCorrection ||
      a.qrVersion !== b.qrVersion ||
      a.encodedContent !== b.encodedContent ||
      a.labelTopEnabled !== b.labelTopEnabled ||
      a.labelTopText !== b.labelTopText ||
      a.labelTopFontId !== b.labelTopFontId ||
      a.labelTopFontWeight !== b.labelTopFontWeight ||
      a.labelTopFontSize !== b.labelTopFontSize ||
      a.labelTopColor !== b.labelTopColor
    );
  }, [draft, initialStyle]);

  const shouldRender = useMemo(() => open, [open]);

  const pushRecentColor = (
    setRecent: React.Dispatch<React.SetStateAction<string[]>>,
    color: string,
  ) => {
    setRecent((prev) => {
      const normalized = color.toLowerCase();
      const filtered = prev.filter((c) => c.toLowerCase() !== normalized);
      return [normalized, ...filtered].slice(0, 6);
    });
  };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showLogoLibrary) {
        setShowLogoLibrary(false);
        e.preventDefault();
        return;
      }
      if (showQrVersionDialog) {
        setShowQrVersionDialog(false);
        e.preventDefault();
        return;
      }
      if (showEyeShapeDialog) {
        setShowEyeShapeDialog(false);
        e.preventDefault();
        return;
      }
      if (showDotShapeDialog) {
        setShowDotShapeDialog(false);
        e.preventDefault();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, showDotShapeDialog, showEyeShapeDialog, showLogoLibrary, showQrVersionDialog]);

  useEffect(() => {
    if (open) return;
    queueMicrotask(() => {
      setShowLogoLibrary(false);
      setShowDotShapeDialog(false);
      setShowEyeShapeDialog(false);
      setShowQrVersionDialog(false);
    });
  }, [open]);

  useEffect(() => {
    if (!open || !showLogoLibrary) return;
    let cancelled = false;

    // Avoid calling setState synchronously in effect body (eslint rule).
    Promise.resolve().then(() => {
      if (!cancelled) setLogoLibraryLoading(true);
    });
    fetch("/api/logo-library")
      .then(async (r) => {
        const data = (await r.json()) as { items?: LogoItem[] };
        if (cancelled) return;
        setLogoLibraryItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        if (cancelled) return;
        setLogoLibraryItems([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLogoLibraryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, showLogoLibrary]);

  useEffect(() => {
    if (!showDotColorPicker && !showBgColorPicker && !showDotShapeDialog && !showEyeShapeDialog && !showQrVersionDialog) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inDot =
        dotColorFieldRef.current?.contains(target) || dotColorPopoverRef.current?.contains(target);
      const inBg =
        bgColorFieldRef.current?.contains(target) || bgColorPopoverRef.current?.contains(target);
      const inDotShape =
        dotShapeFieldRef.current?.contains(target) || dotShapePopoverRef.current?.contains(target);
      const inEyeShape =
        eyeShapeFieldRef.current?.contains(target) || eyeShapePopoverRef.current?.contains(target);
      const inQrVersion =
        qrVersionFieldRef.current?.contains(target) || qrVersionPopoverRef.current?.contains(target);

      if (!inDot) setShowDotColorPicker(false);
      if (!inBg) setShowBgColorPicker(false);
      if (!inDotShape) setShowDotShapeDialog(false);
      if (!inEyeShape) setShowEyeShapeDialog(false);
      if (!inQrVersion) setShowQrVersionDialog(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [showDotColorPicker, showBgColorPicker, showDotShapeDialog, showEyeShapeDialog, showQrVersionDialog]);

  useLayoutEffect(() => {
    const updatePositions = () => {
      if (showDotColorPicker && dotColorTriggerRef.current) {
        const r = dotColorTriggerRef.current.getBoundingClientRect();
        setDotPopoverPos({ top: r.top + r.height / 2, left: r.right + 2 });
      } else {
        setDotPopoverPos(null);
      }
      if (showBgColorPicker && bgColorTriggerRef.current) {
        const r = bgColorTriggerRef.current.getBoundingClientRect();
        setBgPopoverPos({ top: r.top + r.height / 2, left: r.right + 2 });
      } else {
        setBgPopoverPos(null);
      }
      if (showDotShapeDialog && dotShapeTriggerRef.current) {
        const r = dotShapeTriggerRef.current.getBoundingClientRect();
        setDotShapePopoverPos({ top: r.top + r.height / 2, left: r.right + 2 });
      } else {
        setDotShapePopoverPos(null);
      }
      if (showEyeShapeDialog && eyeShapeTriggerRef.current) {
        const r = eyeShapeTriggerRef.current.getBoundingClientRect();
        setEyeShapePopoverPos({ top: r.top + r.height / 2, left: r.right + 2 });
      } else {
        setEyeShapePopoverPos(null);
      }
      if (showQrVersionDialog && qrVersionTriggerRef.current) {
        const r = qrVersionTriggerRef.current.getBoundingClientRect();
        setQrVersionPopoverPos({ top: r.top + r.height / 2, left: r.right + 2 });
      } else {
        setQrVersionPopoverPos(null);
      }
    };

    updatePositions();

    if (!showDotColorPicker && !showBgColorPicker && !showDotShapeDialog && !showEyeShapeDialog && !showQrVersionDialog) return;

    window.addEventListener("scroll", updatePositions, true);
    window.addEventListener("resize", updatePositions);
    return () => {
      window.removeEventListener("scroll", updatePositions, true);
      window.removeEventListener("resize", updatePositions);
    };
  }, [showDotColorPicker, showBgColorPicker, showDotShapeDialog, showEyeShapeDialog, showQrVersionDialog]);

  const onPickLogoFile = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read logo file"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    setDraft((prev) => ({ ...prev, logoImageSrc: dataUrl }));
  };

  if (!shouldRender) return null;

  const handleCloseAttempt = () => {
    // Only show the confirmation dialog when user explicitly clicks the "X" close button.
    if (hasUnsavedChanges) {
      setConfirmUnsavedOpen(true);
      return;
    }
    onClose();
  };

  const dotColorPickerPortal =
    typeof document !== "undefined" &&
    showDotColorPicker &&
    dotPopoverPos &&
    createPortal(
      <div
        ref={dotColorPopoverRef}
        className={`fixed z-[100] rounded-xl border border-gray-200 bg-white p-3 shadow-xl ${
          narrowUi
            ? "left-4 right-4 w-auto max-h-[min(50vh,24rem)] overflow-y-auto"
            : "w-[280px] -translate-y-1/2"
        }`}
        style={
          narrowUi
            ? {
                top: "auto",
                left: "max(1rem, env(safe-area-inset-left))",
                right: "max(1rem, env(safe-area-inset-right))",
                bottom: "max(1rem, env(safe-area-inset-bottom))",
              }
            : { top: dotPopoverPos.top, left: dotPopoverPos.left, transform: "translateY(-50%)" }
        }
        role="presentation"
      >
        <div className="text-sm font-medium mb-3">{t("modal.dots.colorPicker.solid")}</div>
        <div className="grid grid-cols-6 gap-1.5">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`h-7 rounded-md border ${currentDotColor.toLowerCase() === color.toLowerCase() ? "ring-2 ring-blue-400" : "border-gray-200"}`}
              style={{ background: color }}
              onClick={() => {
                setDraft((prev) => ({
                  ...prev,
                  dotColorMode: "Custom",
                  dotColor: color,
                  eyeColorMode: "Custom",
                  eyeColor: color,
                }));
                pushRecentColor(setRecentDotColors, color);
              }}
            />
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-500">{t("modal.dots.colorPicker.recent")}</div>
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {recentDotColors.slice(0, 6).map((color) => (
            <button
              key={color}
              type="button"
              className="h-7 rounded-md border border-gray-200"
              style={{ background: color }}
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  dotColorMode: "Custom",
                  dotColor: color,
                  eyeColorMode: "Custom",
                  eyeColor: color,
                }))
              }
            />
          ))}
        </div>
        <div className="mt-3 border-t border-gray-200 pt-2 flex items-center justify-between">
          <span className="text-sm text-gray-600">{t("modal.dots.colorPicker.customColor")}</span>
          <input
            type="color"
            value={currentDotColor}
            onChange={(e) => {
              const color = e.target.value;
              setDraft((prev) => ({
                ...prev,
                dotColorMode: "Custom",
                dotColor: color,
                eyeColorMode: "Custom",
                eyeColor: color,
              }));
              pushRecentColor(setRecentDotColors, color);
            }}
            className="w-10 h-10"
            aria-label={t("modal.dots.dotColor")}
          />
        </div>
      </div>,
      document.body,
    );

  const bgColorPickerPortal =
    typeof document !== "undefined" &&
    showBgColorPicker &&
    bgPopoverPos &&
    createPortal(
      <div
        ref={bgColorPopoverRef}
        className={`fixed z-[100] rounded-xl border border-gray-200 bg-white p-3 shadow-xl ${
          narrowUi
            ? "left-4 right-4 w-auto max-h-[min(50vh,24rem)] overflow-y-auto"
            : "w-[280px] -translate-y-1/2"
        }`}
        style={
          narrowUi
            ? {
                top: "auto",
                left: "max(1rem, env(safe-area-inset-left))",
                right: "max(1rem, env(safe-area-inset-right))",
                bottom: "max(1rem, env(safe-area-inset-bottom))",
              }
            : { top: bgPopoverPos.top, left: bgPopoverPos.left, transform: "translateY(-50%)" }
        }
        role="presentation"
      >
        <div className="text-sm font-medium mb-3">{t("modal.dots.colorPicker.solid")}</div>
        <div className="grid grid-cols-6 gap-1.5">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`h-7 rounded-md border ${currentBackgroundColor.toLowerCase() === color.toLowerCase() ? "ring-2 ring-blue-400" : "border-gray-200"}`}
              style={{ background: color }}
              onClick={() => {
                setDraft((prev) => ({ ...prev, backgroundMode: "Custom", backgroundColor: color }));
                pushRecentColor(setRecentBgColors, color);
              }}
            />
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-500">{t("modal.dots.colorPicker.recent")}</div>
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {recentBgColors.slice(0, 6).map((color) => (
            <button
              key={color}
              type="button"
              className="h-7 rounded-md border border-gray-200"
              style={{ background: color }}
              onClick={() => setDraft((prev) => ({ ...prev, backgroundMode: "Custom", backgroundColor: color }))}
            />
          ))}
        </div>
        <div className="mt-3 border-t border-gray-200 pt-2 flex items-center justify-between">
          <span className="text-sm text-gray-600">{t("modal.dots.colorPicker.customColor")}</span>
          <input
            type="color"
            value={currentBackgroundColor}
            onChange={(e) => {
              const color = e.target.value;
              setDraft((prev) => ({ ...prev, backgroundMode: "Custom", backgroundColor: color }));
              pushRecentColor(setRecentBgColors, color);
            }}
            className="w-10 h-10"
            aria-label={t("modal.dots.backgroundColor")}
          />
        </div>
      </div>,
      document.body,
    );

  const dotShapeDialogPortal =
    typeof document !== "undefined" &&
    showDotShapeDialog &&
    dotShapePopoverPos &&
    createPortal(
      <div
        ref={dotShapePopoverRef}
        className={`fixed z-[100] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden ${
          narrowUi ? "left-4 right-4 w-auto max-h-[min(70vh,28rem)]" : "w-[300px] -translate-y-1/2"
        }`}
        style={
          narrowUi
            ? {
                top: "auto",
                left: "max(1rem, env(safe-area-inset-left))",
                right: "max(1rem, env(safe-area-inset-right))",
                bottom: "max(1rem, env(safe-area-inset-bottom))",
              }
            : { top: dotShapePopoverPos.top, left: dotShapePopoverPos.left, transform: "translateY(-50%)" }
        }
        role="dialog"
        aria-modal="true"
        aria-label={t("modal.dots.shapePicker.title")}
      >
        <div className="p-3 max-h-[min(70vh,420px)] overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            {QR_DOT_SHAPES.map((shape) => (
              <button
                key={shape}
                type="button"
                className={`flex flex-col items-center gap-1.5 rounded-md border p-1.5 transition hover:bg-gray-50 ${
                  draft.dotShape === shape ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                }`}
                onClick={() => {
                  setDraft((prev) => ({ ...prev, dotShape: shape }));
                  setShowDotShapeDialog(false);
                }}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded border bg-white ${
                    draft.dotShape === shape ? "ring-2 ring-primary border-primary" : "border-gray-200"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={codepoingDotShapeSrc(shape)}
                    alt=""
                    className="h-9 w-9 object-contain"
                  />
                </div>
                <span className="text-[11px] leading-tight text-center text-gray-600 px-0.5 line-clamp-2">
                  {dotShapeOptionLabel(t, shape)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>,
      document.body,
    );

  const eyeShapeDialogPortal =
    typeof document !== "undefined" &&
    showEyeShapeDialog &&
    eyeShapePopoverPos &&
    createPortal(
      <div
        ref={eyeShapePopoverRef}
        className={`fixed z-[100] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden ${
          narrowUi ? "left-4 right-4 w-auto max-h-[min(70vh,28rem)]" : "w-[300px] -translate-y-1/2"
        }`}
        style={
          narrowUi
            ? {
                top: "auto",
                left: "max(1rem, env(safe-area-inset-left))",
                right: "max(1rem, env(safe-area-inset-right))",
                bottom: "max(1rem, env(safe-area-inset-bottom))",
              }
            : { top: eyeShapePopoverPos.top, left: eyeShapePopoverPos.left, transform: "translateY(-50%)" }
        }
        role="dialog"
        aria-modal="true"
        aria-label={t("modal.dots.eyeShapePicker.title")}
      >
        <div className="p-3 max-h-[min(70vh,420px)] overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            {QR_EYE_SHAPES.map((shape) => (
              <button
                key={shape}
                type="button"
                className={`flex flex-col items-center gap-1.5 rounded-md border p-1.5 transition hover:bg-gray-50 ${
                  draft.eyeShape === shape ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                }`}
                onClick={() => {
                  setDraft((prev) => ({ ...prev, eyeShape: shape }));
                  setShowEyeShapeDialog(false);
                }}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded border bg-white ${
                    draft.eyeShape === shape ? "ring-2 ring-primary border-primary" : "border-gray-200"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cornersEyeShapeSrc(shape)}
                    alt=""
                    className="h-9 w-9 object-contain"
                  />
                </div>
                <span className="text-[11px] leading-tight text-center text-gray-600 px-0.5 line-clamp-2">
                  {eyeShapeOptionLabel(t, shape)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>,
      document.body,
    );

  const logoLibraryDialogPortal =
    typeof document !== "undefined" &&
    showLogoLibrary &&
    createPortal(
      <div
        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
        style={{
          paddingTop: "max(0px, var(--sat))",
          paddingBottom: "max(0px, var(--sab))",
          paddingLeft: "max(0px, var(--sal))",
          paddingRight: "max(0px, var(--sar))",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={t("modal.logo.chooseBuiltIn")}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setShowLogoLibrary(false);
        }}
      >
        <div
          className="flex max-h-[min(92dvh,92svh)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:rounded-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4 sm:px-5">
            <div className="text-lg font-semibold text-gray-900">{t("modal.logo.chooseBuiltIn")}</div>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label={t("modal.closeAriaLabel")}
              onClick={() => setShowLogoLibrary(false)}
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
          <div className="grid min-h-[260px] max-h-[min(70dvh,70svh)] grid-cols-1 sm:min-h-[360px] sm:grid-cols-[132px_1fr] sm:max-h-[70vh]">
            <div className="border-b border-gray-200 bg-gray-50 p-3 sm:border-b-0 sm:border-r">
              <button
                type="button"
                className="w-full rounded-md bg-green-50 text-green-700 font-semibold px-3 py-2 text-left"
              >
                {t("modal.logo.generalCategory")}
                <span className="ml-1 text-sm text-green-700">({logoLibraryItems.length})</span>
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
              {logoLibraryLoading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : (
                <div className="flex flex-wrap justify-start gap-x-5 gap-y-4">
                  {logoLibraryItems.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className="flex w-[72px] shrink-0 flex-col items-center rounded-md p-1 transition-colors"
                      onClick={() => {
                        setDraft((prev) => ({ ...prev, logoImageSrc: item.src }));
                        setShowLogoLibrary(false);
                      }}
                    >
                      <div
                        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-md border bg-white ${
                          draft.logoImageSrc === item.src
                            ? "border-green-500 ring-1 ring-green-500"
                            : "border-gray-200 hover:border-green-500"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.src} alt={item.name} className="w-8 h-8 object-contain" />
                      </div>
                      <div className="mt-1 text-[11px] text-gray-600 truncate">{item.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );

  const qrVersionDialogPortal =
    typeof document !== "undefined" &&
    showQrVersionDialog &&
    qrVersionPopoverPos &&
    createPortal(
      <div
        ref={qrVersionPopoverRef}
        className={`fixed z-[100] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden ${
          narrowUi ? "left-4 right-4 w-auto max-h-[min(55vh,22rem)]" : "w-[220px] -translate-y-1/2"
        }`}
        style={
          narrowUi
            ? {
                top: "auto",
                left: "max(1rem, env(safe-area-inset-left))",
                right: "max(1rem, env(safe-area-inset-right))",
                bottom: "max(1rem, env(safe-area-inset-bottom))",
              }
            : { top: qrVersionPopoverPos.top, left: qrVersionPopoverPos.left, transform: "translateY(-50%)" }
        }
        role="listbox"
        aria-label={t("modal.more.qrVersion")}
      >
        <div className="max-h-[320px] overflow-y-auto py-1">
          {qrVersionOptions.map((option) => {
            const active = draft.qrVersion === option;
            return (
              <button
                key={option}
                type="button"
                className={`w-full px-3 py-2 text-left text-sm ${
                  active ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => {
                  setDraft((prev) => ({ ...prev, qrVersion: option }));
                  setShowQrVersionDialog(false);
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>,
      document.body,
    );

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex max-md:items-stretch max-md:justify-stretch items-center justify-center bg-black/60 p-0 backdrop-blur-sm md:p-4"
      style={{
        paddingTop: "max(0px, var(--sat))",
        paddingBottom: "max(0px, var(--sab))",
        paddingLeft: "max(0px, var(--sal))",
        paddingRight: "max(0px, var(--sar))",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t("modal.ariaLabel")}
    >
      <div className="flex h-full max-h-full min-h-0 w-full max-w-[1440px] flex-col overflow-hidden bg-background-light shadow-2xl max-md:rounded-none md:max-h-[min(90dvh,90svh)] md:flex-row md:rounded-xl">
        <div className="flex max-h-[min(52dvh,400px)] min-h-0 flex-none flex-col overflow-y-auto overscroll-contain max-md:flex-none md:contents md:max-h-none md:overflow-visible">
          <div className="min-w-0 space-y-6 border-b border-gray-200 px-4 py-5 max-md:pb-6 md:w-1/2 md:max-h-[min(90dvh,90svh)] md:space-y-8 md:border-b-0 md:border-r md:overflow-y-auto md:px-6 md:py-8 md:pr-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold md:text-2xl">{t("modal.ariaLabel")}</h3>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center text-gray-500 hover:text-gray-800"
              onClick={handleCloseAttempt}
              aria-label={t("modal.closeAriaLabel")}
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          <div className="max-w-[430px] space-y-3">
            <h4 className="text-sm font-semibold text-gray-800">{t("modal.logo.title")}</h4>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50 sm:w-[180px]"
                onClick={() => logoInputRef.current?.click()}
              >
                <span>{t("modal.logo.upload")}</span>
              </button>
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50 sm:w-[180px]"
                onClick={() => setShowLogoLibrary((v) => !v)}
              >
                <span>{t("modal.logo.library")}</span>
              </button>
            </div>

            <input
              key={logoInputKey}
              ref={logoInputRef}
              className="hidden"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                onPickLogoFile(file).catch(() => null);
                // allow picking the same file again
                setLogoInputKey((k) => k + 1);
              }}
            />

          </div>

          <div className="space-y-4 border-t border-gray-200 pt-6">
            <h4 className="text-sm font-semibold text-gray-800">{t("modal.dots.title")}</h4>
            <div className="grid grid-cols-1 gap-x-2 gap-y-4 justify-items-stretch sm:grid-cols-2 sm:justify-items-start">
              <div ref={dotColorFieldRef} className="relative flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                <label className="w-24 shrink-0 text-sm text-gray-600">{t("modal.dots.dotColor")}</label>
                <div ref={dotColorTriggerRef} className="relative w-full max-w-[180px] shrink-0 sm:w-[180px]">
                  <button
                    type="button"
                    className="w-full rounded-md border border-gray-300 bg-white text-sm px-3 py-2 flex items-center justify-between"
                    onClick={() => {
                      setShowBgColorPicker(false);
                      setShowDotShapeDialog(false);
                      setShowEyeShapeDialog(false);
                      setShowDotColorPicker((v) => !v);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-6 h-6 rounded-md border border-gray-200" style={{ background: currentDotColor }} />
                      <span>{t("modal.dots.options.backgroundColor.solid")}</span>
                    </span>
                    <span className="material-symbols-outlined text-base text-gray-500">expand_more</span>
                  </button>
                </div>
              </div>

              <div ref={bgColorFieldRef} className="relative flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                <label className="w-24 shrink-0 text-sm text-gray-600">{t("modal.dots.backgroundColor")}</label>
                <div ref={bgColorTriggerRef} className="relative w-full max-w-[180px] shrink-0 sm:w-[180px]">
                  <button
                    type="button"
                    className="w-full rounded-md border border-gray-300 bg-white text-sm px-3 py-2 flex items-center justify-between"
                    onClick={() => {
                      setShowDotColorPicker(false);
                      setShowDotShapeDialog(false);
                      setShowEyeShapeDialog(false);
                      setShowBgColorPicker((v) => !v);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-6 h-6 rounded-md border border-gray-200" style={{ background: currentBackgroundColor }} />
                      <span>{t("modal.dots.options.backgroundColor.solid")}</span>
                    </span>
                    <span className="material-symbols-outlined text-base text-gray-500">expand_more</span>
                  </button>
                </div>
              </div>

              <div ref={dotShapeFieldRef} className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                <label className="w-24 shrink-0 text-sm text-gray-600">{t("modal.dots.dotShape")}</label>
                <div ref={dotShapeTriggerRef} className="relative w-full max-w-[180px] shrink-0 sm:w-[180px]">
                  <button
                    type="button"
                    className="w-full rounded-md border border-gray-300 bg-white text-sm px-3 py-2 flex items-center justify-between hover:bg-gray-50"
                    onClick={() => {
                      setShowDotColorPicker(false);
                      setShowBgColorPicker(false);
                      setShowEyeShapeDialog(false);
                      setShowDotShapeDialog(true);
                    }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={codepoingDotShapeSrc(isQrDotShape(draft.dotShape) ? draft.dotShape : "square")}
                        alt=""
                        className="w-6 h-6 rounded border border-gray-200 object-contain shrink-0 bg-white"
                      />
                      <span className="truncate text-gray-800">
                        {dotShapeOptionLabel(t, isQrDotShape(draft.dotShape) ? draft.dotShape : "square")}
                      </span>
                    </span>
                    <span className="material-symbols-outlined text-base text-gray-500 shrink-0">expand_more</span>
                  </button>
                </div>
              </div>

              <div ref={eyeShapeFieldRef} className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                <label className="w-24 shrink-0 text-sm text-gray-600">{t("modal.dots.eyeShape")}</label>
                <div ref={eyeShapeTriggerRef} className="relative w-full max-w-[180px] shrink-0 sm:w-[180px]">
                  <button
                    type="button"
                    className="w-full rounded-md border border-gray-300 bg-white text-sm px-3 py-2 flex items-center justify-between hover:bg-gray-50"
                    onClick={() => {
                      setShowDotColorPicker(false);
                      setShowBgColorPicker(false);
                      setShowDotShapeDialog(false);
                      setShowEyeShapeDialog(true);
                    }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cornersEyeShapeSrc(isQrEyeShape(draft.eyeShape) ? draft.eyeShape : "square")}
                        alt=""
                        className="w-6 h-6 rounded border border-gray-200 object-contain shrink-0 bg-white"
                      />
                      <span className="truncate text-gray-800">
                        {eyeShapeOptionLabel(t, isQrEyeShape(draft.eyeShape) ? draft.eyeShape : "square")}
                      </span>
                    </span>
                    <span className="material-symbols-outlined text-base text-gray-500 shrink-0">expand_more</span>
                  </button>
                </div>
              </div>

              <div className="col-span-1 flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center">
                <label className="w-24 shrink-0 text-sm text-gray-600">{t("modal.dots.eyeColor")}</label>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setShowEyeColorPicker(true)}
                >
                  {t("modal.dots.custom")}
                </button>
                {showEyeColorPicker && (
                  <div className="flex items-center gap-3 pl-0 sm:pl-4">
                    <input
                      type="color"
                      value={draft.eyeColor}
                      onChange={(e) => setDraft((prev) => ({ ...prev, eyeColor: e.target.value }))}
                      className="w-10 h-10"
                      aria-label={t("modal.dots.eyeColor")}
                    />
                    <span className="text-xs text-gray-600">{draft.eyeColor}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-gray-200 pt-6">
            <h4 className="text-sm font-semibold text-gray-800">{t("modal.more.title")}</h4>
            <div className="grid grid-cols-1 gap-y-4">
              <div className="flex items-center">
                <label
                  className="text-sm text-gray-600 w-28 shrink-0 flex items-center gap-1"
                  title={t("modal.more.quietZoneHint")}
                >
                  {t("modal.more.quietZone")}{" "}
                  <span
                    className="material-symbols-outlined cursor-help text-xs"
                    title={t("modal.more.quietZoneHint")}
                    aria-label={t("modal.more.quietZoneHint")}
                  >
                    info
                  </span>
                </label>
                <div className="w-[140px] shrink-0">
                  <select
                    className="w-full h-12 rounded-lg border-gray-300 bg-white text-sm px-3"
                    value={draft.quietZone}
                    onChange={(e) => setDraft((prev) => ({ ...prev, quietZone: e.target.value as QrStyleState["quietZone"] }))}
                  >
                    <option value="1 blocks">{t("modal.more.options.quietZone.oneBlock")}</option>
                    <option value="2 blocks">{t("modal.more.options.quietZone.twoBlocks")}</option>
                    <option value="3 blocks">{t("modal.more.options.quietZone.threeBlocks")}</option>
                    <option value="4 blocks">{t("modal.more.options.quietZone.fourBlocks")}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <label
                  className="text-sm text-gray-600 w-28 shrink-0 flex items-center gap-1"
                  title={t("modal.more.errorCorrectionHint")}
                >
                  {t("modal.more.errorCorrection")}{" "}
                  <span
                    className="material-symbols-outlined cursor-help text-xs"
                    title={t("modal.more.errorCorrectionHint")}
                    aria-label={t("modal.more.errorCorrectionHint")}
                  >
                    info
                  </span>
                </label>
                <div className="w-[140px] shrink-0">
                  <select
                    className="w-full h-12 rounded-lg border-gray-300 bg-white text-sm px-3"
                    value={draft.errorCorrection}
                    onChange={(e) => setDraft((prev) => ({ ...prev, errorCorrection: e.target.value as QrStyleState["errorCorrection"] }))}
                  >
                    <option value="7%">{t("modal.more.options.errorCorrection.sevenPercent")}</option>
                    <option value="15%">{t("modal.more.options.errorCorrection.fifteenPercent")}</option>
                    <option value="25%">{t("modal.more.options.errorCorrection.twentyFivePercent")}</option>
                    <option value="30%">{t("modal.more.options.errorCorrection.thirtyPercent")}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <label
                  className="text-sm text-gray-600 w-28 shrink-0 flex items-center gap-1"
                  title={t("modal.more.qrVersionHint")}
                >
                  {t("modal.more.qrVersion")}{" "}
                  <span
                    className="material-symbols-outlined cursor-help text-xs"
                    title={t("modal.more.qrVersionHint")}
                    aria-label={t("modal.more.qrVersionHint")}
                  >
                    info
                  </span>
                </label>
                <div ref={qrVersionFieldRef} className="relative w-[140px] shrink-0">
                  <button
                    ref={qrVersionTriggerRef}
                    type="button"
                    className="w-full h-12 rounded-lg border border-gray-300 bg-white text-sm px-3 flex items-center justify-between hover:bg-gray-50"
                    onClick={() => {
                      setShowDotColorPicker(false);
                      setShowBgColorPicker(false);
                      setShowDotShapeDialog(false);
                      setShowEyeShapeDialog(false);
                      setShowQrVersionDialog((v) => !v);
                    }}
                  >
                    <span className="truncate text-gray-800">{draft.qrVersion}</span>
                    <span className="material-symbols-outlined text-base text-gray-500 shrink-0">expand_more</span>
                  </button>
                </div>
              </div>

              <div className="flex items-start">
                <label className="text-sm text-gray-600 w-24 shrink-0 pt-2.5">{t("modal.more.encodedContent")}</label>
                <textarea
                  className="h-20 w-full max-w-[300px] rounded-md border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 cursor-not-allowed resize-none overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words"
                  value={draft.encodedContent}
                  readOnly
                  wrap="soft"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 space-y-4">
            {!draft.labelTopEnabled ? (
              <button
                type="button"
                className="flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    labelTopEnabled: true,
                    labelTopText: "",
                  }))
                }
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span>{t("modal.labelTop.add")}</span>
              </button>
            ) : (
              <div className="rounded-lg border-2 border-orange-400 p-4 space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                  <div className="flex flex-col gap-1 min-w-0 lg:max-w-[220px]">
                    <span className="text-sm font-medium text-gray-800">{t("modal.labelTop.fieldLabel")}</span>
                    <input
                      className="w-full rounded-md border border-gray-300 bg-white text-sm px-3 py-2"
                      type="text"
                      value={draft.labelTopText}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, labelTopText: sanitizeLabelTopUserInput(e.target.value) }))
                      }
                      placeholder={t("modal.labelTop.placeholder")}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="h-9 rounded-md border border-gray-300 bg-white text-sm px-2 min-w-[7rem]"
                      value={draft.labelTopFontId}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          labelTopFontId: e.target.value as QrLabelTopFontId,
                        }))
                      }
                    >
                      <option value="noto_sc">{t("modal.labelTop.fontNoto")}</option>
                      <option value="arial">{t("modal.labelTop.fontArial")}</option>
                      <option value="georgia">{t("modal.labelTop.fontGeorgia")}</option>
                      <option value="system">{t("modal.labelTop.fontSystem")}</option>
                    </select>
                    <select
                      className="h-9 rounded-md border border-gray-300 bg-white text-sm px-2 w-[5.5rem]"
                      value={draft.labelTopFontWeight}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          labelTopFontWeight: e.target.value as QrStyleState["labelTopFontWeight"],
                        }))
                      }
                    >
                      <option value="400">{t("modal.labelTop.weightNormal")}</option>
                      <option value="500">{t("modal.labelTop.weightMedium")}</option>
                      <option value="700">{t("modal.labelTop.weightBold")}</option>
                    </select>
                    <select
                      className="h-9 rounded-md border border-gray-300 bg-white text-sm px-2 w-[4.5rem]"
                      value={draft.labelTopFontSize}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          labelTopFontSize: Number(e.target.value),
                        }))
                      }
                    >
                      {[16, 20, 24, 28, 32, 36, 40, 48].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1 border border-gray-300 rounded-md px-2 h-9 bg-white">
                      <span className="text-sm font-semibold text-gray-700 border-b-2 border-current leading-none pb-0.5">
                        A
                      </span>
                      <input
                        type="color"
                        value={draft.labelTopColor}
                        onChange={(e) => setDraft((prev) => ({ ...prev, labelTopColor: e.target.value }))}
                        className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0"
                        aria-label={t("modal.labelTop.colorAria")}
                      />
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      aria-label={t("modal.labelTop.removeAria")}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          labelTopEnabled: false,
                          labelTopText: "",
                        }))
                      }
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* 必须 flex-col：若误为默认 row，子项 w-full 的底栏会占满宽度，flex-1 预览区宽度塌为 0，二维码不显示 */}
        <div className="flex w-full min-w-0 flex-col max-md:min-h-0 max-md:flex-1 md:max-h-[min(90dvh,90svh)] md:w-1/2 md:shrink-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-gray-100 px-4 py-5 md:min-h-0 md:py-8 md:pl-5 md:pr-8">
            <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 md:gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {t("modal.preview.currentStyle")}{" "}
                  <a className="text-primary hover:underline" href="#">
                    {t("modal.preview.basicStyle")}
                  </a>
                </p>
              </div>

              <div className="flex min-h-[192px] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-lg bg-white p-4 shadow-md">
                <div
                  ref={modalPreviewRef}
                  className="flex min-h-[160px] w-full max-w-full items-center justify-center [&_svg]:h-auto [&_svg]:max-h-[min(48vh,320px)] [&_svg]:max-w-full [&_svg]:w-full"
                />
              </div>

              <QRPreview draft={draft} containerRef={modalPreviewRef} open={open} />
            </div>
          </div>

          <div className="sticky bottom-0 z-[2] w-full shrink-0 border-t border-gray-200/90 bg-gray-100 px-4 pb-[max(12px,var(--sab))] pt-3 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] md:static md:border-t-0 md:px-5 md:pb-6 md:pt-4 md:shadow-none">
            <div className="mx-auto w-full max-w-sm space-y-3">
              <button
                type="button"
                className="flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-base font-medium text-white hover:opacity-90"
                onClick={() => {
                  onSave();
                  onClose();
                }}
              >
                {t("modal.preview.saveStyleReturn")}
              </button>

              <div className="flex items-center justify-between gap-3 px-0.5 pb-1">
                <button
                  type="button"
                  className="min-h-12 flex-1 rounded-lg py-2 text-left text-sm text-gray-600 hover:text-primary"
                  onClick={() => {
                    onClear();
                  }}
                >
                  {t("modal.preview.clearStyle")}
                </button>
                <button
                  type="button"
                  className="min-h-12 flex-1 rounded-lg py-2 text-right text-sm text-gray-600 hover:text-primary"
                  onClick={onDownloadAndPrint}
                >
                  {t("modal.preview.downloadAndPrint")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmUnsavedOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          style={{
            paddingTop: "max(1rem, var(--sat))",
            paddingBottom: "max(1rem, var(--sab))",
            paddingLeft: "max(1rem, var(--sal))",
            paddingRight: "max(1rem, var(--sar))",
          }}
          role="alertdialog"
          aria-modal="true"
          aria-label={t("confirm.unsavedTitle")}
        >
          <div className="w-full max-w-lg rounded-xl bg-background-light border border-gray-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="text-base font-semibold text-[#111418]">{t("confirm.unsavedTitle")}</div>
            </div>
            <div className="flex flex-wrap justify-end gap-3 p-6">
              <button
                type="button"
                className="min-h-12 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setConfirmUnsavedOpen(false);
                  onClose();
                }}
              >
                {t("confirm.discard")}
              </button>
              <button
                type="button"
                className="min-h-12 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:opacity-90"
                onClick={() => {
                  setConfirmUnsavedOpen(false);
                  onSave();
                  onClose();
                }}
              >
                {t("confirm.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    {dotColorPickerPortal || null}
    {bgColorPickerPortal || null}
    {dotShapeDialogPortal || null}
    {eyeShapeDialogPortal || null}
    {logoLibraryDialogPortal || null}
    {qrVersionDialogPortal || null}
    </>
  );
}

