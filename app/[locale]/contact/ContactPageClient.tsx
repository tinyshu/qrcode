"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import SiteHeader from "../../components/SiteHeader";

const CONTACT_EMAIL = "2690540630@qq.com";

export default function ContactPageClient() {
  const t = useTranslations("contactPage");
  const locale = useLocale();
  const home = `/${locale}`;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light text-[#111418] font-display pb-[var(--sab)]">
      <SiteHeader />
      <main className="relative flex flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          aria-hidden
          style={{
            backgroundColor: "#fafaf8",
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(209 213 219 / 0.55) 1px, transparent 0)`,
            backgroundSize: "14px 14px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, black 20%, transparent 70%)",
          }}
        />
        <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-24">
          <div
            className="@container mx-auto w-full max-w-2xl text-center"
            style={{ containerType: "inline-size" }}
          >
            <h1
              className={`max-sm:whitespace-normal whitespace-nowrap font-bold leading-snug tracking-tight ${
                locale === "zh"
                  ? "text-[clamp(0.8125rem,calc(100cqw_/_15),3rem)]"
                  : "text-[clamp(0.75rem,calc(100cqw_/_30),3rem)]"
              }`}
            >
              <span className="text-[#111418]">{t("titleLead")}</span>
              <span className="text-primary">{t("titleRest")}</span>
            </h1>
            <p className="mt-5 text-lg text-gray-500 sm:text-xl md:text-2xl md:leading-relaxed">{t("subtitle")}</p>
            <p className="mt-10 text-left text-sm leading-relaxed text-gray-600 sm:text-base">
              {t("bodyPrefix")}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mx-0.5 font-medium text-primary underline decoration-primary/50 underline-offset-2 hover:opacity-90"
              >
                {CONTACT_EMAIL}
              </a>
              {t("bodySuffix")}
            </p>
            <p className="mt-10">
              <Link
                href={home}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("backHome")}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
