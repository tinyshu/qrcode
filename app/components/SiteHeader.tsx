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
    <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200/80 bg-background-light/80 backdrop-blur-sm px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <Link href={home} className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-3xl">qr_code_2</span>
          <h2 className="text-xl font-bold leading-tight tracking-tighter">{t("header.brand")}</h2>
        </Link>
      </div>
      <nav className="hidden items-center gap-9 md:flex">
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
  );
}
