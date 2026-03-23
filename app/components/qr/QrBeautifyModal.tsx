"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {useTranslations} from "next-intl";
import QRCodeStyling from "qr-code-styling";

import {
  buildQrStylingOptions,
  overlayTextExtension,
  QrStyleState,
} from "./qrStyle";

type LogoItem = { name: string; src: string };

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

function QRPreview({ draft, containerRef }: { draft: QrStyleState; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Clear old content for consistent re-render.
    el.innerHTML = "";

    const options = buildQrStylingOptions(draft, "preview");
    const qr = new QRCodeStyling(options);

    // Allow "Add Text" overlay.
    qr.applyExtension(overlayTextExtension);

    qr.append(el);
    qrRef.current = qr;

    return () => {
      qrRef.current = null;
    };
  }, [containerRef, draft]);

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
  const modalPreviewRef = useRef<HTMLDivElement | null>(null);

  const [showLogoLibrary, setShowLogoLibrary] = useState(false);
  const [logoLibraryItems, setLogoLibraryItems] = useState<LogoItem[]>([]);
  const [logoLibraryLoading, setLogoLibraryLoading] = useState(false);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [showEyeColorPicker, setShowEyeColorPicker] = useState(false);
  const [confirmUnsavedOpen, setConfirmUnsavedOpen] = useState(false);

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
      a.labelSize !== b.labelSize ||
      a.encodedContent !== b.encodedContent ||
      a.customTextEnabled !== b.customTextEnabled ||
      a.customText !== b.customText ||
      a.customTextColor !== b.customTextColor
    );
  }, [draft, initialStyle]);

  const shouldRender = useMemo(() => open, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("modal.ariaLabel")}
    >
      <div className="w-full max-w-6xl rounded-xl bg-background-light shadow-2xl flex overflow-hidden">
        <div className="w-2/3 p-8 space-y-8 border-r border-gray-200 overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">{t("modal.ariaLabel")}</h3>
            <button
              type="button"
              className="text-gray-500 hover:text-gray-800"
              onClick={handleCloseAttempt}
              aria-label={t("modal.closeAriaLabel")}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-800">{t("modal.logo.title")}</h4>
            <div className="flex gap-4">
              <button
                type="button"
                className="flex-1 rounded-md border border-gray-300 bg-white py-2 px-4 text-sm text-center justify-center items-center gap-2 hover:bg-gray-50"
                onClick={() => logoInputRef.current?.click()}
              >
                <span>{t("modal.logo.upload")}</span>
              </button>
              <button
                type="button"
                className="flex-1 rounded-md border border-gray-300 bg-white py-2 px-4 text-sm text-center justify-center items-center gap-2 hover:bg-gray-50"
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

            {showLogoLibrary && (
              <div className="pt-2">
                <div className="text-xs text-gray-600 mb-2">{t("modal.logo.chooseBuiltIn")}</div>
                <div className="grid grid-cols-4 gap-3">
                  {logoLibraryItems.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className="rounded-md border border-gray-200 bg-white p-2 hover:bg-gray-50"
                      onClick={() => setDraft((prev) => ({ ...prev, logoImageSrc: item.src }))}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.src} alt={item.name} className="w-8 h-8 object-contain mx-auto" />
                    </button>
                  ))}
                </div>
                {logoLibraryLoading && <div className="text-xs text-gray-500 mt-2">Loading...</div>}
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-gray-200 pt-6">
            <h4 className="text-sm font-semibold text-gray-800">{t("modal.dots.title")}</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex items-center">
                <label className="text-sm text-gray-600 w-24 shrink-0">{t("modal.dots.dotColor")}</label>
                <select
                  className="w-full rounded-md border-gray-300 bg-white text-sm"
                  value={draft.dotColorMode}
                  onChange={(e) => setDraft((prev) => ({ ...prev, dotColorMode: e.target.value as QrStyleState["dotColorMode"] }))}
                >
                  <option value="Black">{t("modal.dots.options.dotColor.black")}</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="text-sm text-gray-600 w-24 shrink-0">{t("modal.dots.backgroundColor")}</label>
                <select
                  className="w-full rounded-md border-gray-300 bg-white text-sm"
                  value={draft.backgroundMode}
                  onChange={(e) => setDraft((prev) => ({ ...prev, backgroundMode: e.target.value as QrStyleState["backgroundMode"] }))}
                >
                  <option value="Solid">{t("modal.dots.options.backgroundColor.solid")}</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="text-sm text-gray-600 w-24 shrink-0">{t("modal.dots.dotShape")}</label>
                <select
                  className="w-full rounded-md border-gray-300 bg-white text-sm"
                  value={draft.dotShape}
                  onChange={(e) => setDraft((prev) => ({ ...prev, dotShape: e.target.value as QrStyleState["dotShape"] }))}
                >
                  <option value="Standard">{t("modal.dots.options.dotShape.standard")}</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="text-sm text-gray-600 w-24 shrink-0">{t("modal.dots.eyeShape")}</label>
                <select
                  className="w-full rounded-md border-gray-300 bg-white text-sm"
                  value={draft.eyeShape}
                  onChange={(e) => setDraft((prev) => ({ ...prev, eyeShape: e.target.value as QrStyleState["eyeShape"] }))}
                >
                  <option value="Square">{t("modal.dots.options.eyeShape.square")}</option>
                </select>
              </div>

              <div className="flex items-center col-span-2">
                <label className="text-sm text-gray-600 w-24 shrink-0">{t("modal.dots.eyeColor")}</label>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setShowEyeColorPicker(true)}
                >
                  {t("modal.dots.custom")}
                </button>
                {showEyeColorPicker && (
                  <div className="ml-4 flex items-center gap-3">
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
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex items-center">
                <label className="text-sm text-gray-600 w-24 shrink-0 flex items-center gap-1">
                  {t("modal.more.quietZone")} <span className="material-symbols-outlined text-xs">info</span>
                </label>
                <select
                  className="w-full rounded-md border-gray-300 bg-white text-sm"
                  value={draft.quietZone}
                  onChange={(e) => setDraft((prev) => ({ ...prev, quietZone: e.target.value as QrStyleState["quietZone"] }))}
                >
                  <option value="2 blocks">{t("modal.more.options.quietZone.twoBlocks")}</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="text-sm text-gray-600 w-24 shrink-0 flex items-center gap-1">
                  {t("modal.more.errorCorrection")} <span className="material-symbols-outlined text-xs">info</span>
                </label>
                <select
                  className="w-full rounded-md border-gray-300 bg-white text-sm"
                  value={draft.errorCorrection}
                  onChange={(e) => setDraft((prev) => ({ ...prev, errorCorrection: e.target.value as QrStyleState["errorCorrection"] }))}
                >
                  <option value="15%">{t("modal.more.options.errorCorrection.fifteenPercent")}</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="text-sm text-gray-600 w-24 shrink-0 flex items-center gap-1">
                  {t("modal.more.qrVersion")} <span className="material-symbols-outlined text-xs">info</span>
                </label>
                <select
                  className="w-full rounded-md border-gray-300 bg-white text-sm"
                  value={draft.qrVersion}
                  onChange={(e) => setDraft((prev) => ({ ...prev, qrVersion: e.target.value as QrStyleState["qrVersion"] }))}
                >
                  <option value="3 (29*29)">{t("modal.more.options.qrVersion.v3")}</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="text-sm text-gray-600 w-24 shrink-0">{t("modal.more.labelSize")}</label>
                <select
                  className="w-full rounded-md border-gray-300 bg-white text-sm"
                  value={draft.labelSize}
                  onChange={(e) => setDraft((prev) => ({ ...prev, labelSize: e.target.value as QrStyleState["labelSize"] }))}
                >
                  <option value="30*30mm">{t("modal.more.options.labelSize.mm30")}</option>
                </select>
              </div>

              <div className="flex items-start col-span-2">
                <label className="text-sm text-gray-600 w-24 shrink-0 pt-2.5">{t("modal.more.encodedContent")}</label>
                <input
                  className="w-full rounded-md border-gray-300 bg-gray-100 text-sm px-3 py-2"
                  type="text"
                  value={draft.encodedContent}
                  onChange={(e) => setDraft((prev) => ({ ...prev, encodedContent: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <button
              type="button"
              className="flex items-center gap-2 text-primary hover:underline text-sm font-medium"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  customTextEnabled: true,
                  customText: prev.customText || t("modal.text.default"),
                }))
              }
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>{t("modal.addText")}</span>
            </button>

            {draft.customTextEnabled && (
              <div className="mt-4 rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 w-16 shrink-0">{t("modal.text.label")}</label>
                  <input
                    className="flex-1 rounded-md border-gray-300 bg-white text-sm px-3 py-2"
                    type="text"
                    value={draft.customText}
                    onChange={(e) => setDraft((prev) => ({ ...prev, customText: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <label className="text-sm text-gray-600 w-16 shrink-0">{t("modal.text.colorLabel")}</label>
                  <input
                    type="color"
                    value={draft.customTextColor}
                    onChange={(e) => setDraft((prev) => ({ ...prev, customTextColor: e.target.value }))}
                    className="w-10 h-10"
                    aria-label={t("modal.text.colorAriaLabel")}
                  />
                  <span className="text-xs text-gray-600">{draft.customTextColor}</span>
                </div>
                <button
                  type="button"
                  className="mt-3 text-sm text-gray-600 hover:text-primary"
                  onClick={() => setDraft((prev) => ({ ...prev, customTextEnabled: false }))}
                >
                  {t("modal.text.disableOverlay")}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-1/3 p-8 flex flex-col items-center justify-center bg-gray-100">
          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {t("modal.preview.currentStyle")}{" "}
                <a className="text-primary hover:underline" href="#">
                  {t("modal.preview.basicStyle")}
                </a>
              </p>
            </div>

            <div className="w-64 h-64 p-4 bg-white rounded-lg shadow-md flex items-center justify-center">
              <div ref={modalPreviewRef} className="w-full h-full flex items-center justify-center" />
            </div>

            <QRPreview draft={draft} containerRef={modalPreviewRef} />

            <div className="w-full space-y-3 mt-4">
              <button
                type="button"
                className="w-full flex justify-center items-center gap-2 h-12 px-5 bg-primary text-white rounded-md text-base font-medium hover:opacity-90"
                  onClick={() => {
                    onSave();
                    onClose();
                  }}
              >
                  {t("modal.preview.saveStyleReturn")}
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm text-gray-600 hover:text-primary"
                  onClick={() => {
                    onClear();
                  }}
                >
                  {t("modal.preview.clearStyle")}
                </button>
                <button
                  type="button"
                  className="text-sm text-gray-600 hover:text-primary"
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
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          role="alertdialog"
          aria-modal="true"
          aria-label={t("confirm.unsavedTitle")}
        >
          <div className="w-full max-w-lg rounded-xl bg-background-light border border-gray-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="text-base font-semibold text-[#111418]">{t("confirm.unsavedTitle")}</div>
            </div>
            <div className="p-6 flex gap-3 justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
                onClick={() => {
                  setConfirmUnsavedOpen(false);
                  onClose();
                }}
              >
                {t("confirm.discard")}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90"
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
  );
}

