import type {ReactNode} from "react";
import {headers} from "next/headers";

import messagesEn from "../../messages/en.json";
import messagesZh from "../../messages/zh.json";

import IntlProviderClient from "./IntlProviderClient";

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  // Some Next.js versions treat `params` as a Promise in server components.
  params: Promise<{locale: string}> | {locale: string};
}>) {
  const resolvedParams = await params;
  const h = await headers();
  const headerLocale = h.get("x-next-intl-locale");
  const locale =
    headerLocale === "en" || headerLocale === "zh"
      ? headerLocale
      : resolvedParams.locale === "en" || resolvedParams.locale === "zh"
        ? resolvedParams.locale
        : "zh";

  const messages = locale === "en" ? messagesEn : messagesZh;

  return (
    <IntlProviderClient messages={messages} locale={locale}>
      {children}
    </IntlProviderClient>
  );
}

