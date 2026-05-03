"use client";

/**
 * 小屏（768px 以下）：顶栏仅品牌 + 汉堡；导航、友情链接、语言收入侧滑抽屉，避免顶栏单行挤爆。
 * 验收参考宽度：360 / 390 / 414 CSS px（iPhone SE / 12–15 常见逻辑宽）。
 */
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

export type SiteHeaderProps = {
  beforeLocaleSwitch?: (nextLocale: "zh" | "en") => void;
};

export default function SiteHeader({ beforeLocaleSwitch }: SiteHeaderProps) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const menuTitleId = useId();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const switchLocale = (nextLocale: "zh" | "en") => {
    beforeLocaleSwitch?.(nextLocale);
    const parts = pathname.split("/");
    if (parts.length >= 2 && (parts[1] === "zh" || parts[1] === "en")) {
      parts[1] = nextLocale;
      router.push(parts.join("/"));
      return;
    }
    router.push(`/${nextLocale}`);
  };

  const home = `/${locale}`;

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <header
      className="sticky top-0 z-50 flex min-h-[3.25rem] items-center justify-between gap-2 border-b border-solid border-gray-200/80 bg-background-light/80 px-3 py-2.5 pt-[max(0.625rem,var(--sat))] backdrop-blur-sm sm:gap-3 sm:px-6 lg:px-8"
    >
      <div className="flex min-w-0 shrink-0 items-center">
        <Link href={home} className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="material-symbols-outlined shrink-0 text-2xl text-primary sm:text-3xl">qr_code_2</span>
          <h2 className="truncate text-lg font-bold leading-tight tracking-tighter sm:text-xl">{t("header.brand")}</h2>
        </Link>
      </div>

      <div className="hidden min-w-0 flex-1 items-center justify-end gap-2 md:flex sm:gap-3 md:gap-5">
        <nav className="hidden items-center gap-6 lg:gap-9 xl:gap-10 md:flex">
          <a className="text-sm font-medium leading-normal text-gray-700 hover:text-primary" href={`${home}#features`}>
            {t("nav.features")}
          </a>
          <a className="text-sm font-medium leading-normal text-gray-700 hover:text-primary" href={`${home}#about`}>
            {t("nav.about")}
          </a>
          <Link
            className="text-sm font-medium leading-normal text-gray-700 hover:text-primary"
            href={`${home}/contact`}
          >
            {t("nav.contact")}
          </Link>
        </nav>

        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 sm:gap-x-2 md:border-l md:border-gray-200/80 md:pl-5">
          <span className="shrink-0 text-xs leading-tight text-gray-600 md:text-sm">{t("nav.friendlyLinks")}</span>
          <span className="shrink-0 text-xs text-gray-400 md:text-sm" aria-hidden>
            ·
          </span>
          <a
            className="shrink-0 text-xs font-medium leading-tight text-primary underline decoration-primary/60 underline-offset-2 hover:opacity-90 md:text-sm"
            href="https://aidh.site"
            target="_blank"
            rel="noopener"
            referrerPolicy="unsafe-url"
          >
            {t("nav.linkAidh")}
          </a>
          <span className="shrink-0 text-xs text-gray-400 md:text-sm" aria-hidden>
            ·
          </span>
          <a
            className="shrink-0 text-xs font-medium leading-tight text-primary underline decoration-primary/60 underline-offset-2 hover:opacity-90 md:text-sm"
            href="https://crazygames99.top/"
            target="_blank"
            rel="noopener"
            referrerPolicy="unsafe-url"
          >
            {t("nav.linkFreeGames")}
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-1 border-l border-gray-200/80 pl-2 sm:gap-2 sm:pl-3 md:pl-4">
          <button
            type="button"
            className={`min-h-11 min-w-11 rounded-md px-2 py-2 text-xs font-medium sm:min-h-0 sm:min-w-0 sm:text-sm ${locale === "zh" ? "text-primary" : "text-gray-700 hover:text-primary"}`}
            onClick={() => switchLocale("zh")}
          >
            {t("language.zh")}
          </button>
          <button
            type="button"
            className={`min-h-11 min-w-11 rounded-md px-2 py-2 text-xs font-medium sm:min-h-0 sm:min-w-0 sm:text-sm ${locale === "en" ? "text-primary" : "text-gray-700 hover:text-primary"}`}
            onClick={() => switchLocale("en")}
          >
            {t("language.en")}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 md:hidden">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100"
          aria-expanded={mobileNavOpen}
          aria-controls="site-header-mobile-panel"
          aria-label={mobileNavOpen ? t("header.closeMenu") : t("header.openMenu")}
          onClick={() => setMobileNavOpen((o) => !o)}
        >
          <span className="material-symbols-outlined text-2xl">{mobileNavOpen ? "close" : "menu"}</span>
        </button>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("header.closeMenu")}
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            id="site-header-mobile-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={menuTitleId}
            className="absolute right-0 top-0 flex h-[100dvh] w-[min(100vw,20rem)] flex-col border-l border-gray-200 bg-background-light shadow-xl"
            style={{
              paddingTop: "var(--sat)",
              paddingBottom: "var(--sab)",
              paddingRight: "var(--sar)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <span id={menuTitleId} className="text-sm font-semibold text-gray-900">
                {t("header.menuTitle")}
              </span>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                aria-label={t("header.closeMenu")}
                onClick={() => setMobileNavOpen(false)}
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-3">
              <a
                className="rounded-lg px-3 py-3 text-base font-medium text-gray-800 hover:bg-gray-100"
                href={`${home}#features`}
                onClick={() => setMobileNavOpen(false)}
              >
                {t("nav.features")}
              </a>
              <a
                className="rounded-lg px-3 py-3 text-base font-medium text-gray-800 hover:bg-gray-100"
                href={`${home}#about`}
                onClick={() => setMobileNavOpen(false)}
              >
                {t("nav.about")}
              </a>
              <Link
                className="rounded-lg px-3 py-3 text-base font-medium text-gray-800 hover:bg-gray-100"
                href={`${home}/contact`}
                onClick={() => setMobileNavOpen(false)}
              >
                {t("nav.contact")}
              </Link>
              <div className="my-2 border-t border-gray-200" />
              <p className="px-3 pt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                {t("nav.friendlyLinks")}
              </p>
              <a
                className="rounded-lg px-3 py-3 text-base font-medium text-primary underline decoration-primary/50 underline-offset-2"
                href="https://aidh.site"
                target="_blank"
                rel="noopener"
                referrerPolicy="unsafe-url"
                onClick={() => setMobileNavOpen(false)}
              >
                {t("nav.linkAidh")}
              </a>
              <a
                className="rounded-lg px-3 py-3 text-base font-medium text-primary underline decoration-primary/50 underline-offset-2"
                href="https://crazygames99.top/"
                target="_blank"
                rel="noopener"
                referrerPolicy="unsafe-url"
                onClick={() => setMobileNavOpen(false)}
              >
                {t("nav.linkFreeGames")}
              </a>
              <div className="my-2 border-t border-gray-200" />
              <p className="px-3 pt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                {t("language.zh")} / {t("language.en")}
              </p>
              <div className="flex gap-2 px-3 pb-[max(0.5rem,var(--sab))]">
                <button
                  type="button"
                  className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-semibold ${locale === "zh" ? "border-primary bg-primary/15 text-primary" : "border-gray-200 bg-white text-gray-800"}`}
                  onClick={() => {
                    switchLocale("zh");
                    setMobileNavOpen(false);
                  }}
                >
                  {t("language.zh")}
                </button>
                <button
                  type="button"
                  className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-semibold ${locale === "en" ? "border-primary bg-primary/15 text-primary" : "border-gray-200 bg-white text-gray-800"}`}
                  onClick={() => {
                    switchLocale("en");
                    setMobileNavOpen(false);
                  }}
                >
                  {t("language.en")}
                </button>
              </div>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
