"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import QRCodeStyling from "qr-code-styling";

import {
  buildDownloadFilename,
  buildPlainQrStylingOptionsFromWidth,
  buildQrStylingOptionsFromWidth,
  overlayTextExtension,
  qrInstanceToPngBlob,
  withPlainQrAutoVersion,
  type QrBuildOptions,
  type QrStyleState,
} from "./qrStyle";
import { svgMarkupToEps } from "./svgToEps";

const PLAIN_RENDER_PX = 512;
const PNG_SIZES = [400, 600, 800, 1000] as const;

type ExportFormat = "png" | "pdf" | "svg" | "eps";

function withAutoVersionFallback(options: QrBuildOptions): QrBuildOptions {
  return {
    ...options,
    qrOptions: { ...options.qrOptions, typeNumber: 0 },
  };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 按需加载 jspdf，避免首页主 chunk 依赖其独立分包（Turbopack 下偶发 chunk 加载失败） */
async function loadJsPDF() {
  const mod = await import("jspdf");
  return mod.jsPDF ?? mod.default;
}

/** PDF 导出时再加载 svg2pdf，减小「其他格式」弹窗首包 */
async function loadSvg2pdf() {
  const { svg2pdf } = await import("svg2pdf.js");
  return svg2pdf;
}

async function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}

async function getPlainSvgMarkup(data: string): Promise<string> {
  const options = buildPlainQrStylingOptionsFromWidth(data, PLAIN_RENDER_PX);
  const tempWrap = document.createElement("div");
  tempWrap.style.position = "fixed";
  tempWrap.style.left = "-99999px";
  tempWrap.style.top = "0";
  document.body.appendChild(tempWrap);
  try {
    let qr: QRCodeStyling;
    try {
      qr = new QRCodeStyling(options);
      qr.append(tempWrap);
    } catch {
      qr = new QRCodeStyling(withPlainQrAutoVersion(options));
      qr.append(tempWrap);
    }
    const raw = await qr.getRawData("svg");
    if (!raw) throw new Error("svg empty");
    const blob =
      raw instanceof Blob ? raw : new Blob([raw as unknown as BlobPart], { type: "image/svg+xml" });
    return await blob.text();
  } finally {
    tempWrap.remove();
  }
}

async function exportStyledPng(state: QrStyleState, pixelSize: number) {
  const options = buildQrStylingOptionsFromWidth(state, pixelSize);
  const tempWrap = document.createElement("div");
  tempWrap.style.position = "fixed";
  tempWrap.style.left = "-99999px";
  tempWrap.style.top = "0";
  document.body.appendChild(tempWrap);
  try {
    let qr: QRCodeStyling;
    try {
      qr = new QRCodeStyling(options);
      qr.applyExtension(overlayTextExtension);
      qr.append(tempWrap);
    } catch {
      qr = new QRCodeStyling(withAutoVersionFallback(options));
      qr.applyExtension(overlayTextExtension);
      qr.append(tempWrap);
    }
    const blob = await qrInstanceToPngBlob(qr);
    if (!blob) return;
    const name = `${buildDownloadFilename(state.encodedContent)}.png`;
    await triggerDownload(blob, name);
  } finally {
    tempWrap.remove();
  }
}

type Props = {
  open: boolean;
  activeStyle: QrStyleState;
  onClose: () => void;
};

export default function OtherFormatsModal({ open, activeStyle, onClose }: Props) {
  const t = useTranslations("otherFormats");
  const [format, setFormat] = useState<ExportFormat>("png");
  const [pngSize, setPngSize] = useState<(typeof PNG_SIZES)[number]>(400);
  const [busy, setBusy] = useState(false);

  const isVector = format !== "png";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const baseName = useMemo(
    () => buildDownloadFilename(activeStyle.encodedContent),
    [activeStyle.encodedContent],
  );

  const data = activeStyle.encodedContent?.trim() ?? "";

  const runSingleDownload = useCallback(async () => {
    if (!data || busy) return;
    setBusy(true);
    try {
      if (format === "png") {
        await exportStyledPng(activeStyle, pngSize);
        onClose();
        return;
      }

      const svgMarkup = await getPlainSvgMarkup(data);

      if (format === "svg") {
        const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
        await triggerDownload(blob, `${baseName}.svg`);
        onClose();
        return;
      }

      if (format === "pdf") {
        const parsed = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
        const svgEl = parsed.documentElement;
        let W = PLAIN_RENDER_PX;
        let H = PLAIN_RENDER_PX;
        const vb = svgEl.getAttribute("viewBox");
        if (vb) {
          const p = vb.trim().split(/[\s,]+/).map(Number);
          if (p.length === 4 && p.every((n) => Number.isFinite(n))) {
            W = p[2];
            H = p[3];
          }
        }

        const holder = document.createElement("div");
        holder.style.cssText = "position:fixed;left:-99999px;top:0;width:0;height:0;overflow:hidden";
        document.body.appendChild(holder);
        const clone = svgEl.cloneNode(true) as SVGSVGElement;
        holder.appendChild(clone);

        try {
          const JsPDF = await loadJsPDF();
          const svg2pdf = await loadSvg2pdf();
          const pdf = new JsPDF({
            unit: "pt",
            format: [W, H],
            orientation: "portrait",
            compress: true,
          });
          await svg2pdf(clone, pdf, { x: 0, y: 0, width: W, height: H });
          pdf.save(`${baseName}.pdf`);
        } finally {
          holder.remove();
        }
        onClose();
        return;
      }

      if (format === "eps") {
        const eps = svgMarkupToEps(svgMarkup);
        if (!eps) {
          window.alert(t("epsFailed"));
          return;
        }
        const blob = new Blob([eps], { type: "application/postscript" });
        await triggerDownload(blob, `${baseName}.eps`);
        onClose();
      }
    } catch (e) {
      console.error(e);
      window.alert(t("downloadError"));
    } finally {
      setBusy(false);
    }
  }, [activeStyle, baseName, busy, data, format, onClose, pngSize, t]);

  const runDownloadAll = useCallback(async () => {
    if (!data || busy) return;
    setBusy(true);
    try {
      await exportStyledPng(activeStyle, 400);
      await delay(450);
      const svgMarkup = await getPlainSvgMarkup(data);
      await triggerDownload(
        new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }),
        `${baseName}.svg`,
      );
      await delay(450);

      const parsed = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
      const svgEl = parsed.documentElement;
      let W = PLAIN_RENDER_PX;
      let H = PLAIN_RENDER_PX;
      const vb = svgEl.getAttribute("viewBox");
      if (vb) {
        const p = vb.trim().split(/[\s,]+/).map(Number);
        if (p.length === 4 && p.every((n) => Number.isFinite(n))) {
          W = p[2];
          H = p[3];
        }
      }
      const holder = document.createElement("div");
      holder.style.cssText = "position:fixed;left:-99999px;top:0;width:0;height:0;overflow:hidden";
      document.body.appendChild(holder);
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      holder.appendChild(clone);
      try {
        const JsPDF = await loadJsPDF();
        const svg2pdf = await loadSvg2pdf();
        const pdf = new JsPDF({
          unit: "pt",
          format: [W, H],
          orientation: "portrait",
          compress: true,
        });
        await svg2pdf(clone, pdf, { x: 0, y: 0, width: W, height: H });
        pdf.save(`${baseName}.pdf`);
      } finally {
        holder.remove();
      }
      await delay(450);

      const eps = svgMarkupToEps(svgMarkup);
      if (eps) {
        await triggerDownload(new Blob([eps], { type: "application/postscript" }), `${baseName}.eps`);
      }
      onClose();
    } catch (e) {
      console.error(e);
      window.alert(t("downloadError"));
    } finally {
      setBusy(false);
    }
  }, [activeStyle, baseName, busy, data, onClose, t]);

  if (!open) return null;

  const formatRows: { id: ExportFormat; label: string }[] = [
    { id: "png", label: t("formatPng") },
    { id: "pdf", label: t("formatPdf") },
    { id: "svg", label: t("formatSvg") },
    { id: "eps", label: t("formatEps") },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      style={{
        paddingTop: "max(0px, var(--sat))",
        paddingBottom: "max(0px, var(--sab))",
        paddingLeft: "max(0px, var(--sal))",
        paddingRight: "max(0px, var(--sar))",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="other-formats-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-none flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(90dvh,90svh)] sm:max-w-md sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-5 sm:py-4">
          <h2 id="other-formats-title" className="text-lg font-semibold text-gray-900">
            {t("title")}
          </h2>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            onClick={onClose}
            aria-label={t("closeAria")}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-900">{t("formatLabel")}</p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {formatRows.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                    format === opt.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="export-format"
                    className="sr-only"
                    checked={format === opt.id}
                    onChange={() => setFormat(opt.id)}
                  />
                  <span
                    className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                      format === opt.id ? "border-primary bg-primary" : "border-gray-300"
                    }`}
                    aria-hidden
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-900">{t("sizeLabel")}</p>
            <select
              className={`h-12 min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm ${
                isVector ? "cursor-not-allowed bg-gray-100 text-gray-500" : ""
              }`}
              value={pngSize}
              disabled={isVector}
              onChange={(e) => setPngSize(Number(e.target.value) as (typeof PNG_SIZES)[number])}
            >
              {PNG_SIZES.map((s) => (
                <option key={s} value={s}>
                  {t("sizeOption", { w: s, h: s })}
                </option>
              ))}
            </select>
            {isVector && (
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">{t("vectorNoSize")}</p>
            )}
            {format === "svg" && (
              <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-2 leading-relaxed">
                {t("svgHint")}
              </p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 z-[1] flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 pb-[max(12px,var(--sab))] pt-3 sm:px-5">
          <button
            type="button"
            className="min-h-12 rounded-lg px-2 text-sm text-primary hover:underline disabled:opacity-50"
            disabled={busy}
            onClick={() => void runDownloadAll()}
          >
            {t("downloadAll")}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="h-12 min-h-12 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              disabled={busy}
              onClick={onClose}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="h-12 min-h-12 rounded-lg bg-primary px-4 text-sm font-semibold text-[#111418] hover:opacity-90 disabled:opacity-50"
              disabled={busy || !data}
              onClick={() => void runSingleDownload()}
            >
              {busy ? t("downloading") : t("download")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
