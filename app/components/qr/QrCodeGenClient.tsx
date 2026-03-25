"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import React, { useEffect, useRef, useState } from "react";
import {useTranslations} from "next-intl";
import {useLocale} from "next-intl";
import {usePathname, useRouter} from "next/navigation";
import QRCodeStyling from "qr-code-styling";

import {
  buildDownloadFilename,
  buildQrStylingOptions,
  buildQrStylingOptionsFromWidth,
  DEFAULT_QR_STYLE,
  migrateQrStyleState,
  overlayTextExtension,
  qrInstanceToPngBlob,
  type QrBuildOptions,
  QrStyleState,
} from "./qrStyle";
import QrBeautifyModal from "./QrBeautifyModal";

const OtherFormatsModal = dynamic(() => import("./OtherFormatsModal"), { ssr: false });

function withAutoVersionFallback(options: QrBuildOptions): QrBuildOptions {
  return {
    ...options,
    qrOptions: {
      ...options.qrOptions,
      typeNumber: 0,
    },
  };
}

export default function QrCodeGenClient() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const heroTitle = t("hero.title");
  const [inputUrl, setInputUrl] = useState("");

  const [hasGenerated, setHasGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStyle, setActiveStyle] = useState<QrStyleState>(() => ({
    ...DEFAULT_QR_STYLE,
    encodedContent: "",
  }));

  const [modalOpen, setModalOpen] = useState(false);
  const [otherFormatsOpen, setOtherFormatsOpen] = useState(false);
  const [draft, setDraft] = useState<QrStyleState>(() => ({ ...DEFAULT_QR_STYLE }));

  const mainQrContainerRef = useRef<HTMLDivElement | null>(null);
  const qrInstanceRef = useRef<QRCodeStyling | null>(null);

  const snapshotKey = "qrgen-i18n-snapshot";

  const canDownload = hasGenerated && Boolean(activeStyle.encodedContent.trim());
  const canBeautify = canDownload;

  useEffect(() => {
    // Restore UI state when switching locales to keep the page interaction as smooth as possible.
    try {
      const raw = localStorage.getItem(snapshotKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        inputUrl: string;
        hasGenerated: boolean;
        activeStyle: QrStyleState;
        draft: QrStyleState;
        modalOpen: boolean;
      }>;

      if (typeof parsed.inputUrl === "string") setInputUrl(parsed.inputUrl);
      if (typeof parsed.hasGenerated === "boolean") setHasGenerated(parsed.hasGenerated);
      if (parsed.activeStyle) setActiveStyle(migrateQrStyleState(parsed.activeStyle as QrStyleState));
      if (parsed.draft) setDraft(migrateQrStyleState(parsed.draft as QrStyleState));
      if (typeof parsed.modalOpen === "boolean") setModalOpen(parsed.modalOpen);

      localStorage.removeItem(snapshotKey);
    } catch {
      // Ignore restore errors.
    }
  }, []);

  const switchLocale = (nextLocale: "zh" | "en") => {
    try {
      localStorage.setItem(
        snapshotKey,
        JSON.stringify({
          inputUrl,
          hasGenerated,
          activeStyle,
          draft,
          modalOpen,
        }),
      );
    } catch {
      // Ignore snapshot errors.
    }

    const parts = pathname.split("/");
    // pathname like: /zh or /zh/something
    if (parts.length >= 2 && (parts[1] === "zh" || parts[1] === "en")) {
      parts[1] = nextLocale;
      router.push(parts.join("/"));
      return;
    }

    router.push(`/${nextLocale}`);
  };

  const features = [
    {
      title: t("features.items.dynamic.title"),
      desc: t("features.items.dynamic.desc"),
      icon: "check_circle",
    },
    {
      title: t("features.items.branding.title"),
      desc: t("features.items.branding.desc"),
      icon: "check_circle",
    },
    {
      title: t("features.items.vector.title"),
      desc: t("features.items.vector.desc"),
      icon: "check_circle",
    },
    {
      title: t("features.items.analytics.title"),
      desc: t("features.items.analytics.desc"),
      icon: "check_circle",
    },
  ];

  useEffect(() => {
    if (!hasGenerated) return;
    const el = mainQrContainerRef.current;
    if (!el) return;

    const options = buildQrStylingOptions(activeStyle, "preview");

    if (!qrInstanceRef.current) {
      el.innerHTML = "";
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
      qrInstanceRef.current = qr;
      setIsGenerating(false);
      return;
    }

    try {
      qrInstanceRef.current.update(options);
    } catch {
      el.innerHTML = "";
      const qr = new QRCodeStyling(withAutoVersionFallback(options));
      qr.applyExtension(overlayTextExtension);
      qr.append(el);
      qrInstanceRef.current = qr;
    }
    setIsGenerating(false);
  }, [activeStyle, hasGenerated]);

  const handleGenerate = () => {
    // When currently showing "Generate Again", click should restore the initial UI state.
    if (hasGenerated) {
      setIsGenerating(false);
      setModalOpen(false);
      setDraft({ ...DEFAULT_QR_STYLE });
      setActiveStyle({ ...DEFAULT_QR_STYLE, encodedContent: "" });
      setHasGenerated(false);
      setInputUrl("");

      const el = mainQrContainerRef.current;
      if (el) el.innerHTML = "";
      qrInstanceRef.current = null;
      return;
    }

    // If generation is in progress, a second click should restore the default UI.
    if (isGenerating) {
      setIsGenerating(false);
      return;
    }

    const content = inputUrl.replace(/\r?\n/g, "").trim();
    if (!content) return;

    setIsGenerating(true);
    setHasGenerated(true);
    setActiveStyle((prev) => ({
      ...prev,
      encodedContent: content,
    }));
  };

  const handleOpenBeautify = () => {
    if (!canBeautify) return;
    setDraft({ ...activeStyle });
    setModalOpen(true);
  };

  const handleModalSave = () => {
    if (!canBeautify) return;
    setActiveStyle({ ...draft });
  };

  const handleModalClear = () => {
    setDraft((prev) => ({
      ...DEFAULT_QR_STYLE,
      encodedContent: prev.encodedContent,
    }));
  };

  const downloadPng = async (state: QrStyleState) => {
    // The main page "Download" should have a stable output size.
    const fixedSize = 400;
    const options = buildQrStylingOptionsFromWidth(state, fixedSize);

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

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${buildDownloadFilename(state.encodedContent)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 8000);
    } finally {
      tempWrap.remove();
    }
  };

  const downloadAndPrintExport = async (state: QrStyleState) => {
    const options = buildQrStylingOptions(state, "export");

    // Create a temporary SVG output for export.
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

      const url = URL.createObjectURL(blob);

      const win = window.open("", "_blank");
      if (!win) {
        URL.revokeObjectURL(url);
        return;
      }

      win.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>${t("print.title")}</title>
            <style>
              body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; }
              img { max-width: 95vw; max-height: 95vh; }
            </style>
          </head>
          <body>
            <img src="${url}" alt="${t("print.qrCodeAlt")}"/>
          </body>
        </html>
      `);
      win.document.close();
      win.focus();

      win.onload = () => {
        win.print();
        setTimeout(() => URL.revokeObjectURL(url), 8000);
      };
    } finally {
      tempWrap.remove();
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light text-[#111418] font-display">
      <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200/80 bg-background-light/80 backdrop-blur-sm px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-3xl">qr_code_2</span>
          <h2 className="text-xl font-bold leading-tight tracking-tighter">{t("header.brand")}</h2>
        </div>
        <nav className="hidden items-center gap-9 md:flex">
          <a className="text-sm font-medium leading-normal text-gray-700 hover:text-primary" href="#features">
            {t("nav.features")}
          </a>
          <a className="text-sm font-medium leading-normal text-gray-700 hover:text-primary" href="#about">
            {t("nav.about")}
          </a>
          <a className="text-sm font-medium leading-normal text-gray-700 hover:text-primary" href="#contact">
            {t("nav.contact")}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`text-sm font-medium ${locale === "zh" ? "text-primary" : "text-gray-700 hover:text-primary"}`}
            onClick={() => switchLocale("zh")}
          >
            {t("language.zh")}
          </button>
          <button
            type="button"
            className={`text-sm font-medium ${locale === "en" ? "text-primary" : "text-gray-700 hover:text-primary"}`}
            onClick={() => switchLocale("en")}
          >
            {t("language.en")}
          </button>
        </div>
      </header>

      <main className="flex-grow">
        <section className="w-full py-20 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="flex flex-col justify-center gap-6">
                <div className="flex flex-col gap-3 text-left max-w-lg">
                  <h1
                    className={`font-hero-title text-3xl leading-tight [letter-spacing:1.5px] sm:text-4xl xl:text-5xl ${
                      locale === "zh" ? "font-medium" : "font-semibold"
                    }`}
                  >
                    <span className="text-[#111418] [text-shadow:0_2px_4px_rgba(0,0,0,0.08)]">
                      {heroTitle}
                    </span>
                  </h1>
                  <div className="flex flex-col gap-2.5 text-sm text-gray-500 md:text-[15px] md:leading-relaxed">
                    {([1, 2] as const).map((n) => (
                      <div key={n} className="flex items-start gap-2.5">
                        <span className="mt-0.5 shrink-0 text-base leading-none md:text-lg" aria-hidden>
                          {t(`hero.subtitle${n}.icon`)}
                        </span>
                        <p className="min-w-0 leading-snug">
                          <span className="font-medium text-gray-700">{t(`hero.subtitle${n}.lead`)}</span>
                          <span className="mx-2 text-gray-300 select-none" aria-hidden>
                            |
                          </span>
                          <span className="text-gray-500">{t(`hero.subtitle${n}.detail`)}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex w-full max-w-lg flex-col gap-3">
                  <label className="flex flex-col w-full">
                    <div
                      className={`flex h-24 w-full flex-none items-stretch overflow-hidden resize-none rounded-xl border border-gray-200 shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background-light ${
                        hasGenerated ? "bg-gray-100" : "bg-white"
                      }`}
                    >
                      <div className="text-gray-500 flex h-full shrink-0 items-center justify-center pl-4 pr-1">
                        <span className="material-symbols-outlined text-xl">link</span>
                      </div>
                      {hasGenerated ? (
                        <textarea
                          className="box-border h-full min-h-0 min-w-0 flex-1 resize-none overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-r-xl border-none bg-gray-100 py-2.5 pl-2 pr-3 text-base font-normal leading-snug text-gray-500 placeholder:text-gray-400 focus:outline-none focus:ring-0 cursor-not-allowed"
                          placeholder={t("hero.inputPlaceholder")}
                          value={inputUrl}
                          readOnly
                          rows={3}
                          wrap="soft"
                          aria-label={t("hero.inputPlaceholder")}
                        />
                      ) : (
                        <textarea
                          inputMode="url"
                          autoComplete="url"
                          className="box-border h-full min-h-0 min-w-0 flex-1 resize-none overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-r-xl border-none bg-transparent py-2.5 pl-2 pr-3 text-base font-normal leading-snug text-[#111418] placeholder:text-gray-500 focus:outline-none focus:ring-0"
                          placeholder={t("hero.inputPlaceholder")}
                          value={inputUrl}
                          rows={3}
                          wrap="soft"
                          spellCheck={false}
                          onChange={(e) => setInputUrl(e.target.value)}
                          aria-label={t("hero.inputPlaceholder")}
                        />
                      )}
                    </div>
                  </label>

                  <button
                    type="button"
                    className="flex w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-wide hover:opacity-90"
                    onClick={handleGenerate}
                  >
                    <span className="truncate">
                      {isGenerating
                        ? t("hero.generatingButton")
                        : hasGenerated
                          ? t("hero.generateAgainButton")
                          : t("hero.generateButton")}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-6 rounded-xl bg-white p-8 shadow-lg border border-gray-200">
                <div className="flex w-64 max-w-full min-h-[192px] items-start justify-center overflow-visible rounded-lg bg-gray-100 py-3 px-2">
                  <div className="flex w-full min-w-0 items-start justify-center">
                    <div
                      ref={mainQrContainerRef}
                      className={
                        hasGenerated
                          ? "w-full flex items-start justify-center [&_svg]:max-w-full [&_svg]:max-h-[min(60vh,400px)] [&_svg]:h-auto"
                          : "hidden"
                      }
                    />
                    {!hasGenerated && (
                      <div className="flex min-h-[168px] w-full items-center justify-center" aria-hidden>
                        <Image
                          src="/qr-placeholder.png"
                          alt=""
                          width={192}
                          height={192}
                          className="h-44 w-44 object-contain opacity-[0.55]"
                          priority
                        />
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-500">{t("qr.placeholderText")}</p>

                <div className="flex w-full max-w-sm flex-col gap-3">
                  <div className="flex w-full gap-4">
                    <button
                      type="button"
                      className="flex flex-1 min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canDownload}
                      onClick={() => downloadPng(activeStyle)}
                    >
                      <span className="material-symbols-outlined">download</span>
                      <span className="truncate">{t("buttons.download")}</span>
                    </button>
                    <button
                      type="button"
                      className="flex flex-1 min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-gray-200 text-[#111418] text-sm font-bold leading-normal tracking-wide hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canBeautify}
                      onClick={handleOpenBeautify}
                    >
                      <span className="material-symbols-outlined">palette</span>
                      <span className="truncate">{t("buttons.beautify")}</span>
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                      disabled={!canDownload}
                      onClick={() => setOtherFormatsOpen(true)}
                    >
                      {t("buttons.downloadOtherFormats")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full bg-white py-20 lg:py-24" id="features">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <span className="text-primary font-semibold">{t("features.title")}</span>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-[#111418]">
                  {t("features.heading")}
                </h2>
                <p className="max-w-2xl text-gray-600 md:text-lg">{t("features.desc")}</p>
              </div>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f.title} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary mt-1">{f.icon}</span>
                    <div className="flex flex-col">
                      <p className="font-semibold">{f.title}</p>
                      <p className="text-sm text-gray-600">{f.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="w-full bg-white py-20 lg:py-24" id="faq">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <div className="flex flex-col gap-12">
                <div className="flex flex-col gap-4 text-center">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">{t("faq.title")}</h2>
                  <p className="text-gray-600 md:text-lg">{t("faq.desc")}</p>
                </div>
                <div className="flex flex-col gap-4">
                  <details className="group rounded-lg border border-gray-200 p-4" open>
                    <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                      <span>{t("faq.q1")}</span>
                      <span className="transition-transform duration-300 group-open:rotate-180">
                        <span className="material-symbols-outlined">expand_more</span>
                      </span>
                    </summary>
                    <div className="mt-4 text-gray-600">
                      {t("faq.a1")}
                    </div>
                  </details>
                  <details className="group rounded-lg border border-gray-200 p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                      <span>{t("faq.q2")}</span>
                      <span className="transition-transform duration-300 group-open:rotate-180">
                        <span className="material-symbols-outlined">expand_more</span>
                      </span>
                    </summary>
                    <div className="mt-4 text-gray-600">
                      {t("faq.a2")}
                    </div>
                  </details>
                  <details className="group rounded-lg border border-gray-200 p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                      <span>{t("faq.q3")}</span>
                      <span className="transition-transform duration-300 group-open:rotate-180">
                        <span className="material-symbols-outlined">expand_more</span>
                      </span>
                    </summary>
                    <div className="mt-4 text-gray-600">
                      {t("faq.a3")}
                    </div>
                  </details>
                  <details className="group rounded-lg border border-gray-200 p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                      <span>{t("faq.q4")}</span>
                      <span className="transition-transform duration-300 group-open:rotate-180">
                        <span className="material-symbols-outlined">expand_more</span>
                      </span>
                    </summary>
                    <div className="mt-4 text-gray-600">
                      {t("faq.a4")}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full bg-background-light border-t border-gray-200" id="about">
        <div className="container mx-auto flex flex-col items-center gap-6 px-4 py-10 text-center sm:flex-row sm:justify-between">
          <p className="text-sm text-gray-600">{t("footer.copyright")}</p>
          <div className="flex flex-wrap items-center justify-center gap-6" id="contact">
            <a className="text-sm font-medium text-gray-600 hover:text-primary" href="#">
              {t("footer.about")}
            </a>
            <a className="text-sm font-medium text-gray-600 hover:text-primary" href="#">
              {t("footer.contact")}
            </a>
            <a className="text-sm font-medium text-gray-600 hover:text-primary" href="#">
              {t("footer.privacy")}
            </a>
            <a className="text-sm font-medium text-gray-600 hover:text-primary" href="#">
              {t("footer.terms")}
            </a>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <button
              type="button"
              className={`text-sm font-medium ${locale === "zh" ? "text-primary" : "text-gray-600 hover:text-primary"}`}
              onClick={() => switchLocale("zh")}
            >
              {t("language.zh")}
            </button>
            <button
              type="button"
              className={`text-sm font-medium ${locale === "en" ? "text-primary" : "text-gray-600 hover:text-primary"}`}
              onClick={() => switchLocale("en")}
            >
              {t("language.en")}
            </button>
          </div>
        </div>
      </footer>

      {otherFormatsOpen ? (
        <OtherFormatsModal
          open={otherFormatsOpen}
          activeStyle={activeStyle}
          onClose={() => setOtherFormatsOpen(false)}
        />
      ) : null}

      <QrBeautifyModal
        open={modalOpen}
        draft={draft}
        initialStyle={activeStyle}
        setDraft={setDraft}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        onClear={handleModalClear}
        onDownloadAndPrint={() => downloadAndPrintExport(draft)}
      />
    </div>
  );
}

