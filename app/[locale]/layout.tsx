import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";

import { getSiteUrl } from "@/lib/site-url";
import messagesEn from "../../messages/en.json";
import messagesZh from "../../messages/zh.json";

import IntlProviderClient from "./IntlProviderClient";

type LocaleParams = Promise<{ locale: string }> | { locale: string };

function resolveLocale(
  resolvedParams: { locale: string },
  headerLocale: string | null,
): "en" | "zh" {
  if (headerLocale === "en" || headerLocale === "zh") {
    return headerLocale;
  }
  return resolvedParams.locale === "en" ? "en" : "zh";
}

export async function generateMetadata({
  params,
}: {
  params: LocaleParams;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const h = await headers();
  const locale = resolveLocale(resolvedParams, h.get("x-next-intl-locale"));
  const messages = locale === "en" ? messagesEn : messagesZh;
  const meta = messages.meta;
  const base = getSiteUrl();

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      type: "website",
      locale: locale === "zh" ? "zh_CN" : "en_US",
      alternateLocale: locale === "zh" ? ["en_US"] : ["zh_CN"],
      siteName: meta.siteName,
      title: meta.title,
      description: meta.description,
      images: [
        {
          url: new URL("/favicon.svg", base).toString(),
          type: "image/svg+xml",
          alt: meta.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: meta.title,
      description: meta.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: LocaleParams;
}>) {
  const resolvedParams = await params;
  const h = await headers();
  const headerLocale = h.get("x-next-intl-locale");
  const locale = resolveLocale(resolvedParams, headerLocale);

  const messages = locale === "en" ? messagesEn : messagesZh;

  return (
    <IntlProviderClient messages={messages} locale={locale}>
      {children}
    </IntlProviderClient>
  );
}
