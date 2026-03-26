/** 用于 metadataBase、canonical、Open Graph 等绝对 URL（部署时设置 NEXT_PUBLIC_SITE_URL） */
export function getSiteUrl(): URL {
  try {
    const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (raw) return new URL(raw.endsWith("/") ? raw.slice(0, -1) : raw);
  } catch {
    // ignore invalid env
  }
  return new URL("http://localhost:3000");
}
