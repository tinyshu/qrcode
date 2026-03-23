"use client";

import type {ReactNode} from "react";
import {IntlProvider} from "use-intl";

export default function IntlProviderClient({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: Record<string, unknown>;
  children: ReactNode;
}) {
  return (
    <IntlProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </IntlProvider>
  );
}

