import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, Noto_Sans_SC, Space_Grotesk } from "next/font/google";
import "./globals.css";

import { getSiteUrl } from "@/lib/site-url";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

/** 首页主标题拉丁字重：Inter Medium / SemiBold */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  adjustFontFallback: true,
});

/** 思源黑体同源（Google Noto Sans SC），用于首页主标题中文回退 */
const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

/** `viewport-fit=cover` 使 `env(safe-area-inset-*)` 在刘海屏设备上可用 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const headerLocale = h.get("x-next-intl-locale");
  const htmlLang = headerLocale === "en" ? "en" : "zh-Hans";

  return (
    <html lang={htmlLang}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
        <script
          // Enable Tailwind `dark:` styles based on system preference.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');var u=function(){document.documentElement.classList.toggle('dark',m.matches);};u();if(m.addEventListener){m.addEventListener('change',u);}else{m.addListener(u);} }catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${notoSansSC.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
