import type { Metadata } from "next";

import QrCodeGenClient from "@/app/components/qr/QrCodeGenClient";
import messagesEn from "@/messages/en.json";
import messagesZh from "@/messages/zh.json";

type LocaleParams = Promise<{ locale: string }> | { locale: string };

export async function generateMetadata({
  params,
}: {
  params: LocaleParams;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = raw === "en" ? "en" : "zh";
  const messages = locale === "en" ? messagesEn : messagesZh;
  const meta = messages.meta;
  const path = `/${locale}`;

  return {
    alternates: {
      canonical: path,
      languages: {
        "zh-Hans": "/zh",
        en: "/en",
        "x-default": "/zh",
      },
    },
    openGraph: {
      url: path,
      title: meta.title,
      description: meta.description,
    },
    twitter: {
      title: meta.title,
      description: meta.description,
    },
  };
}

export default function LocalePage() {
  return <QrCodeGenClient />;
}
