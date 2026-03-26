import type { Metadata } from "next";

import messagesEn from "@/messages/en.json";
import messagesZh from "@/messages/zh.json";

import ContactPageClient from "./ContactPageClient";

type LocaleParams = Promise<{ locale: string }> | { locale: string };

export async function generateMetadata({
  params,
}: {
  params: LocaleParams;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = raw === "en" ? "en" : "zh";
  const messages = locale === "en" ? messagesEn : messagesZh;
  const cp = messages.contactPage;
  const path = `/${locale}/contact`;

  return {
    title: cp.seoTitle,
    description: cp.seoDescription,
    alternates: {
      canonical: path,
      languages: {
        "zh-Hans": "/zh/contact",
        en: "/en/contact",
        "x-default": "/zh/contact",
      },
    },
    openGraph: {
      url: path,
      title: cp.seoTitle,
      description: cp.seoDescription,
    },
    twitter: {
      title: cp.seoTitle,
      description: cp.seoDescription,
    },
  };
}

export default function ContactPage() {
  return <ContactPageClient />;
}
