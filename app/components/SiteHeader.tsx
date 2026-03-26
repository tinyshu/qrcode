"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

export type SiteHeaderProps = {
  beforeLocaleSwitch?: (nextLocale: "zh" | "en") => void;
};

export default function SiteHeader({ beforeLocaleSwitch }: SiteHeaderProps) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

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

  return (
    <header className="sticky top-0 z-50 flex min-h-[3.25rem] items-center justify-between gap-2 border-b border-solid border-gray-200/80 bg-background-light/80 px-3 py-2.5 backdrop-blur-sm sm:gap-3 sm:px-6 lg:px-8">
      <div className="flex min-w-0 shrink-0 items-center">
        <Link href={home} className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="material-symbols-outlined shrink-0 text-2xl text-primary sm:text-3xl">qr_code_2</span>
          <h2 className="truncate text-lg font-bold leading-tight tracking-tighter sm:text-xl">{t("header.brand")}</h2>
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 md:gap-5">
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

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 md:border-l md:border-gray-200/80 md:pl-5">
          <span className="shrink-0 text-xs leading-tight text-gray-600 md:text-sm">{t("nav.friendlyLinks")}</span>
          <span className="shrink-0 text-xs text-gray-400 md:text-sm" aria-hidden>
            ·
          </span>
          <a
            className="shrink-0 text-xs font-medium leading-tight text-primary underline decoration-primary/60 underline-offset-2 hover:opacity-90 md:text-sm"
            href="https://aidh.site"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("nav.linkAidh")}
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-1 border-l border-gray-200/80 pl-2 sm:gap-2 sm:pl-3 md:pl-4">
          <button
            type="button"
            className={`text-xs font-medium sm:text-sm ${locale === "zh" ? "text-primary" : "text-gray-700 hover:text-primary"}`}
            onClick={() => switchLocale("zh")}
          >
            {t("language.zh")}
          </button>
          <button
            type="button"
            className={`text-xs font-medium sm:text-sm ${locale === "en" ? "text-primary" : "text-gray-700 hover:text-primary"}`}
            onClick={() => switchLocale("en")}
          >
            {t("language.en")}
          </button>
        </div>
      </div>
    </header>
  );
}
