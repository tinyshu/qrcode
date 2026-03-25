/**
 * 将 qr-code-styling 生成的 SVG（以 rect 为主的黑白码）转为简易 EPS 矢量文件内容。
 * 若未解析到有效矩形，返回 null。
 */
function isDarkFill(fill: string | null): boolean {
  if (!fill || fill === "none") return false;
  const f = fill.trim().toLowerCase();
  if (f === "#fff" || f === "#ffffff" || f === "white") return false;
  if (f === "#000" || f === "#000000" || f === "black") return true;
  const m = f.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    return r + g + b < 384;
  }
  return true;
}

export function svgMarkupToEps(svgText: string): string | null {
  const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = parsed.documentElement;
  if (!svg || svg.tagName.toLowerCase() !== "svg") return null;

  let W = 400;
  let H = 400;
  const vb = svg.getAttribute("viewBox");
  if (vb) {
    const p = vb.trim().split(/[\s,]+/).map(Number);
    if (p.length === 4 && p.every((n) => Number.isFinite(n))) {
      W = p[2];
      H = p[3];
    }
  } else {
    const w = parseFloat(String(svg.getAttribute("width") || "").replace(/px/i, "") || "400");
    const h = parseFloat(String(svg.getAttribute("height") || "").replace(/px/i, "") || String(w));
    if (Number.isFinite(w) && w > 0) W = w;
    if (Number.isFinite(h) && h > 0) H = h;
  }

  const lines: string[] = [
    "%!PS-Adobe-3.0 EPSF-3.0",
    `%%BoundingBox: 0 0 ${Math.ceil(W)} ${Math.ceil(H)}`,
    "%%Creator: QRCodeGen",
    "%%EndComments",
    "gsave",
    `0 ${H} translate`,
    "1 -1 scale",
    "0 0 0 setrgbcolor",
  ];

  let count = 0;
  svg.querySelectorAll("rect").forEach((r) => {
    const fill = r.getAttribute("fill");
    if (!isDarkFill(fill)) return;
    const x = parseFloat(r.getAttribute("x") || "0");
    const y = parseFloat(r.getAttribute("y") || "0");
    const rw = parseFloat(r.getAttribute("width") || "0");
    const rh = parseFloat(r.getAttribute("height") || "0");
    if (!Number.isFinite(x) || !Number.isFinite(y) || rw <= 0 || rh <= 0) return;
    lines.push("newpath");
    lines.push(`${x} ${y} moveto`);
    lines.push(`${rw} 0 rlineto`);
    lines.push(`0 ${rh} rlineto`);
    lines.push(`${-rw} 0 rlineto`);
    lines.push("closepath fill");
    count += 1;
  });

  lines.push("grestore");
  lines.push("%%EOF");

  if (count === 0) return null;
  return lines.join("\n");
}
