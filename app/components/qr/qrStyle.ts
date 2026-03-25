import type {
  CornerDotType,
  CornerSquareType,
  DotType,
  ExtensionFunction,
  Options,
  TypeNumber,
} from "qr-code-styling";

/** Matches `qr-code-styling` `dotsOptions.type` and filenames under `public/codepoing/*.png`. */
export const QR_DOT_SHAPES = [
  "square",
  "dots",
  "rounded",
  "classy",
  "classy-rounded",
  "extra-rounded",
] as const satisfies readonly DotType[];

export type QrDotShape = (typeof QR_DOT_SHAPES)[number];

/** Preset id matches `public/corners/{id}.png` and drives `cornersSquareOptions` + `cornersDotOptions`. */
export const QR_EYE_SHAPES = [
  "square",
  "rounded",
  "extra-rounded",
  "classy-rounded",
  "classy",
  "dots",
  "dot",
] as const satisfies readonly (CornerSquareType & CornerDotType)[];

export type QrEyeShape = (typeof QR_EYE_SHAPES)[number];
export type QrBackgroundMode = "Solid" | "Custom";
export type QrDotColorMode = "Black" | "Custom";
export type QrEyeColorMode = "Custom";
export type QrQuietZoneMode = "1 blocks" | "2 blocks" | "3 blocks" | "4 blocks";
export type QrErrorCorrectionMode = "7%" | "15%" | "25%" | "30%";
export type QrVersionMode = string;

/** 码上方文字字体（映射到 SVG font-family） */
export type QrLabelTopFontId = "noto_sc" | "arial" | "georgia" | "system";

/** 默认码上方字号（与美化弹窗下拉一致） */
export const DEFAULT_LABEL_TOP_FONT_SIZE = 24;

/** 总宽度单位：60 ≙ 60 个英文/数字或约 20 个汉字（汉字按 3 单位计） */
export const LABEL_TOP_MAX_WIDTH_UNITS = 60;
/** 单行最大单位：21 ≙ 21 英文或 7 个汉字（汉字按 3 单位计） */
export const LABEL_TOP_MAX_LINE_UNITS = 21;

const LABEL_TOP_SCRIPT_HAN = /\p{Script=Han}/u;

function labelTopCharWidthUnit(char: string): number {
  return LABEL_TOP_SCRIPT_HAN.test(char) ? 3 : 1;
}

/** 按显示宽度规则统计单位（不含换行符） */
export function labelTopTextWidthUnits(s: string): number {
  let n = 0;
  for (const ch of s) {
    if (ch === "\n" || ch === "\r") continue;
    n += labelTopCharWidthUnit(ch);
  }
  return n;
}

export function truncateLabelTopTextToMaxUnits(s: string, maxUnits = LABEL_TOP_MAX_WIDTH_UNITS): string {
  const flat = s.replace(/\r\n?|\n/g, " ");
  let units = 0;
  let out = "";
  for (const ch of flat) {
    const u = labelTopCharWidthUnit(ch);
    if (units + u > maxUnits) break;
    units += u;
    out += ch;
  }
  return out;
}

export function clampLabelTopDisplayString(s: string): string {
  return truncateLabelTopTextToMaxUnits(s.trim(), LABEL_TOP_MAX_WIDTH_UNITS);
}

/** 按行宽单位折行（用于 SVG 多行绘制） */
export function wrapLabelTopTextToLines(s: string, lineMaxUnits = LABEL_TOP_MAX_LINE_UNITS): string[] {
  const trimmed = s.trim();
  if (!trimmed) return [];
  const lines: string[] = [];
  let current = "";
  let currentUnits = 0;
  for (const ch of trimmed) {
    const u = labelTopCharWidthUnit(ch);
    if (currentUnits + u > lineMaxUnits && current.length > 0) {
      lines.push(current);
      current = ch;
      currentUnits = u;
    } else {
      current += ch;
      currentUnits += u;
    }
  }
  if (current.length) lines.push(current);
  return lines;
}

/** 用户输入：换行转空格并截断到总单位上限 */
export function sanitizeLabelTopUserInput(s: string): string {
  return truncateLabelTopTextToMaxUnits(s.replace(/\r\n?|\n/g, " "), LABEL_TOP_MAX_WIDTH_UNITS);
}

export type QrStyleState = {
  // Logo
  logoImageSrc?: string; // URL or data URL

  // Dots & Eyes
  dotColorMode: QrDotColorMode;
  dotColor: string;
  backgroundMode: QrBackgroundMode;
  backgroundColor: string;
  dotShape: QrDotShape;
  eyeShape: QrEyeShape;
  eyeColorMode: QrEyeColorMode;
  eyeColor: string; // used when eyeColorMode === "Custom"

  // More
  quietZone: QrQuietZoneMode;
  errorCorrection: QrErrorCorrectionMode;
  qrVersion: QrVersionMode;
  encodedContent: string;

  // 码上方文字（标签画布）
  labelTopEnabled: boolean;
  labelTopText: string;
  labelTopFontId: QrLabelTopFontId;
  labelTopFontWeight: "400" | "500" | "700";
  labelTopFontSize: number;
  labelTopColor: string;
};

export const DEFAULT_QR_STYLE: QrStyleState = {
  logoImageSrc: undefined,

  dotColorMode: "Black",
  dotColor: "#000000",
  backgroundMode: "Solid",
  backgroundColor: "#ffffff",
  dotShape: "square",
  eyeShape: "square",
  eyeColorMode: "Custom",
  eyeColor: "#000000",

  quietZone: "1 blocks",
  errorCorrection: "30%",
  qrVersion: "2 (25*25)",
  encodedContent: "",

  labelTopEnabled: false,
  labelTopText: "",
  labelTopFontId: "noto_sc",
  labelTopFontWeight: "700",
  labelTopFontSize: DEFAULT_LABEL_TOP_FONT_SIZE,
  labelTopColor: "#111418",
};

export function isQrDotShape(value: unknown): value is QrDotShape {
  return typeof value === "string" && (QR_DOT_SHAPES as readonly string[]).includes(value);
}

export function isQrEyeShape(value: unknown): value is QrEyeShape {
  return typeof value === "string" && (QR_EYE_SHAPES as readonly string[]).includes(value);
}

const LABEL_TOP_FONT_IDS: readonly QrLabelTopFontId[] = ["noto_sc", "arial", "georgia", "system"];

function isQrLabelTopFontId(v: unknown): v is QrLabelTopFontId {
  return typeof v === "string" && (LABEL_TOP_FONT_IDS as readonly string[]).includes(v);
}

/** Migrate persisted state from older `Standard` / `Square` or invalid values. */
export function migrateQrStyleState(state: Partial<QrStyleState>): QrStyleState {
  let next: QrStyleState = { ...DEFAULT_QR_STYLE, ...state } as QrStyleState;
  if (!isQrDotShape(next.dotShape)) {
    next = { ...next, dotShape: "square" };
  }
  if (!isQrEyeShape(next.eyeShape)) {
    next = { ...next, eyeShape: "square" };
  }
  if (typeof next.labelTopEnabled !== "boolean") next = { ...next, labelTopEnabled: false };
  if (typeof next.labelTopText !== "string") next = { ...next, labelTopText: "" };
  else next = { ...next, labelTopText: clampLabelTopDisplayString(next.labelTopText) };
  if (!isQrLabelTopFontId(next.labelTopFontId)) next = { ...next, labelTopFontId: "noto_sc" };
  if (next.labelTopFontWeight !== "400" && next.labelTopFontWeight !== "500" && next.labelTopFontWeight !== "700") {
    next = { ...next, labelTopFontWeight: "700" };
  }
  if (!Number.isFinite(next.labelTopFontSize) || next.labelTopFontSize < 10) {
    next = { ...next, labelTopFontSize: DEFAULT_LABEL_TOP_FONT_SIZE };
  }
  if (typeof next.labelTopColor !== "string") next = { ...next, labelTopColor: "#111418" };
  return next;
}

function labelTopFontStack(id: QrLabelTopFontId | undefined): string {
  switch (id) {
    case "arial":
      return "Arial, Helvetica, sans-serif";
    case "georgia":
      return "Georgia, 'Times New Roman', serif";
    case "system":
      return "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    case "noto_sc":
    default:
      return '"Noto Sans SC","Source Han Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
  }
}

export function parseQrVersion(version: QrVersionMode): TypeNumber {
  // "3 (29*29)" -> 3
  const match = version.match(/^(\d+)\s*\(/);
  const parsed = match ? Number(match[1]) : 2;
  const safe = Number.isFinite(parsed) ? Math.max(1, Math.min(40, parsed)) : 2;
  return safe as TypeNumber;
}

export function parseErrorCorrection(ec: QrErrorCorrectionMode): "L" | "M" | "Q" | "H" {
  // 7%/15%/25%/30% correspond to L/M/Q/H.
  switch (ec) {
    case "7%":
      return "L";
    case "25%":
      return "Q";
    case "30%":
      return "H";
    case "15%":
    default:
      return "M";
  }
}

const QR_BYTE_CAPACITY_BY_VERSION: Record<number, Record<QrErrorCorrectionMode, number>> = {
  1: { "7%": 17, "15%": 14, "25%": 11, "30%": 7 },
  2: { "7%": 32, "15%": 26, "25%": 20, "30%": 14 },
  3: { "7%": 53, "15%": 42, "25%": 32, "30%": 24 },
  4: { "7%": 78, "15%": 62, "25%": 46, "30%": 34 },
  5: { "7%": 106, "15%": 84, "25%": 60, "30%": 44 },
  6: { "7%": 134, "15%": 106, "25%": 74, "30%": 58 },
  7: { "7%": 154, "15%": 122, "25%": 86, "30%": 64 },
  8: { "7%": 192, "15%": 152, "25%": 108, "30%": 84 },
  9: { "7%": 230, "15%": 180, "25%": 130, "30%": 98 },
  10: { "7%": 271, "15%": 213, "25%": 151, "30%": 119 },
};

function estimateContentBytes(data: string): number {
  return new TextEncoder().encode(data).length;
}

function isComplexBackground(state: QrStyleState): boolean {
  // Current UI only has solid color background; treat non-white custom background as "complex".
  if (state.backgroundMode !== "Custom") return false;
  const normalized = (state.backgroundColor || "#ffffff").trim().toLowerCase();
  return normalized !== "#fff" && normalized !== "#ffffff";
}

/**
 * Auto error-correction strategy:
 * - No logo: prefer higher readability while keeping version small -> pick 25% when possible, else 15%.
 * - With logo/complex background: prefer robustness -> pick 30% when possible, then 25%, else 15%.
 */
export function resolveAutoErrorCorrection(state: QrStyleState): QrErrorCorrectionMode {
  const version = parseQrVersion(state.qrVersion);
  const capacity = QR_BYTE_CAPACITY_BY_VERSION[version];
  if (!capacity) return "15%";

  const bytes = estimateContentBytes(state.encodedContent || "");
  const hasLogo = Boolean((state.logoImageSrc || "").trim());
  const robustPreferred = hasLogo || isComplexBackground(state);

  if (robustPreferred) {
    if (bytes <= capacity["30%"]) return "30%";
    if (bytes <= capacity["25%"]) return "25%";
    return "15%";
  }

  if (bytes <= capacity["25%"]) return "25%";
  return "15%";
}

export function parseQuietZone(qz: QrQuietZoneMode): number {
  // "2 blocks" -> 2
  const match = qz.match(/^(\d+)\s+/);
  return match ? Number(match[1]) : 2;
}

function parseBackgroundColor(state: QrStyleState): string {
  switch (state.backgroundMode) {
    case "Custom":
      return state.backgroundColor || "#ffffff";
    case "Solid":
    default:
      return "#ffffff";
  }
}

function parseDotColor(state: QrStyleState): string {
  switch (state.dotColorMode) {
    case "Custom":
      return state.dotColor || "#000000";
    case "Black":
    default:
      return "#000000";
  }
}

function parseQrModuleCount(typeNumber: number): number {
  // QR module count by version: 21 + 4*(version-1)
  return 21 + 4 * (typeNumber - 1);
}

export type QrBuildSizeMode = "preview" | "export";

export function computeSizePx(state: QrStyleState, mode: QrBuildSizeMode): number {
  if (mode === "preview") return 224;

  // Label size option was removed; keep export size behavior stable.
  const mm = 30;
  // Use 300 DPI for a reasonable "print size" mapping.
  const dpi = 300;
  const px = (mm / 25.4) * dpi;
  // Avoid creating extremely huge SVGs on low-spec devices.
  return Math.max(256, Math.min(1200, Math.round(px)));
}

type OverlayOptions = Options & {
  width?: number;
  height?: number;
  data?: string;
  labelTopEnabled?: boolean;
  labelTopText?: string;
  labelTopFontId?: QrLabelTopFontId;
  labelTopFontWeight?: string;
  labelTopFontSize?: number;
  labelTopColor?: string;
};

function resolveLabelTopDisplayText(o: OverlayOptions): string {
  if (!o.labelTopEnabled) return "";
  return clampLabelTopDisplayString(String(o.labelTopText ?? ""));
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * 码上方标签区：扩展 SVG 画布并将二维码主体下移。
 */
export const overlayTextExtension: ExtensionFunction = (svg, options) => {
  const o = options as OverlayOptions;
  const width = Number(o.width ?? 320);
  const height = Number(o.height ?? width);

  svg.querySelector('[data-qr-label-top="1"]')?.remove();
  svg.querySelector('[data-qr-overlay-text="1"]')?.remove();
  const oldWrap = svg.querySelector('[data-qr-shift-wrap="1"]');
  if (oldWrap?.parentNode === svg) {
    while (oldWrap.firstChild) svg.insertBefore(oldWrap.firstChild, oldWrap);
    oldWrap.remove();
  }

  const topStr = resolveLabelTopDisplayText(o);
  const lines = wrapLabelTopTextToLines(topStr);
  const topOn = lines.length > 0;

  /** 上方留白：顶边距 + 多行行高 + 与二维码之间的空隙（保证字在码区之上、不被背景层遮挡） */
  const marginTop = 8;
  const gapBelowText = 12;

  if (topOn) {
    const fs = Math.max(12, Math.min(72, Number(o.labelTopFontSize ?? DEFAULT_LABEL_TOP_FONT_SIZE)));
    const lineHeight = Math.round(fs * 1.25);
    const ascentPad = Math.max(4, Math.ceil(fs * 0.18));
    const labelBlockHeight = lines.length * lineHeight;
    const topPad = Math.ceil(marginTop + ascentPad + labelBlockHeight + gapBelowText);

    const toMove = Array.from(svg.children);
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("data-qr-shift-wrap", "1");
    g.setAttribute("transform", `translate(0, ${topPad})`);
    toMove.forEach((el) => g.appendChild(el));
    svg.appendChild(g);

    const labelG = document.createElementNS(SVG_NS, "g");
    labelG.setAttribute("data-qr-label-top", "1");
    const textEl = document.createElementNS(SVG_NS, "text");
    textEl.setAttribute("x", String(width / 2));
    textEl.setAttribute("y", String(marginTop + ascentPad));
    textEl.setAttribute("text-anchor", "middle");
    textEl.setAttribute("dominant-baseline", "hanging");
    textEl.setAttribute("fill", String(o.labelTopColor ?? "#111418"));
    textEl.setAttribute("font-size", String(fs));
    textEl.setAttribute("font-weight", String(o.labelTopFontWeight ?? "700"));
    textEl.setAttribute("font-family", labelTopFontStack(o.labelTopFontId));
    lines.forEach((line, i) => {
      const tspan = document.createElementNS(SVG_NS, "tspan");
      tspan.setAttribute("x", String(width / 2));
      tspan.setAttribute("dy", i === 0 ? "0" : String(lineHeight));
      tspan.textContent = line;
      textEl.appendChild(tspan);
    });
    labelG.appendChild(textEl);
    // 后绘制：避免被二维码方形白底盖住（若发生轻微重叠仍能看见字）
    svg.appendChild(labelG);

    svg.setAttribute("viewBox", `0 0 ${width} ${height + topPad}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height + topPad));
  }
};

export type QrBuildOptions = Options & {
  type: "svg";
  width: number;
  height: number;
  data: string;
  labelTopEnabled?: boolean;
  labelTopText?: string;
  labelTopFontId?: QrLabelTopFontId;
  labelTopFontWeight?: string;
  labelTopFontSize?: number;
  labelTopColor?: string;
};

export function buildQrStylingOptions(state: QrStyleState, sizeMode: QrBuildSizeMode): QrBuildOptions {
  const width = computeSizePx(state, sizeMode);
  return buildQrStylingOptionsFromWidth(state, width);
}

export function buildQrStylingOptionsFromWidth(state: QrStyleState, width: number): QrBuildOptions {
  const typeNumber = parseQrVersion(state.qrVersion);
  // Honor the user's explicit selection in the "Error Tolerance" dropdown.
  const errorCorrectionLevel = parseErrorCorrection(state.errorCorrection);
  const moduleCount = parseQrModuleCount(typeNumber);
  const quietZoneBlocks = parseQuietZone(state.quietZone);

  const height = width;
  const moduleSizePx = width / moduleCount;
  const margin = Math.round(quietZoneBlocks * moduleSizePx);

  const dotColor = parseDotColor(state);
  const backgroundColor = parseBackgroundColor(state);

  const eyeColor = state.eyeColorMode === "Custom" ? state.eyeColor : dotColor;

  const qrOptions = {
    typeNumber,
    errorCorrectionLevel,
  };

  const dotsType: DotType = isQrDotShape(state.dotShape) ? state.dotShape : "square";
  const eyeCornerType: CornerSquareType & CornerDotType = isQrEyeShape(state.eyeShape)
    ? state.eyeShape
    : "square";

  const options: QrBuildOptions = {
    type: "svg",
    width,
    height,
    data: state.encodedContent,
    margin,
    qrOptions,

    dotsOptions: {
      color: dotColor,
      type: dotsType,
    },
    cornersSquareOptions: {
      color: eyeColor,
      type: eyeCornerType,
    },
    cornersDotOptions: {
      color: eyeColor,
      type: eyeCornerType,
    },
    backgroundOptions: {
      color: backgroundColor,
    },
    // 码上方文字（由 overlayTextExtension 处理画布增高与位移）
    labelTopEnabled: state.labelTopEnabled,
    labelTopText: state.labelTopText,
    labelTopFontId: state.labelTopFontId,
    labelTopFontWeight: state.labelTopFontWeight,
    labelTopFontSize: state.labelTopFontSize,
    labelTopColor: state.labelTopColor,
  };

  // Always pass image/imageOptions to ensure updates can clear previous logos.
  options.image = state.logoImageSrc ?? "";
  options.imageOptions = {
    crossOrigin: "anonymous",
    saveAsBlob: true,
    margin: 5,
    // 中间 Logo 占码区比例（qr-code-styling 为 0～1）；上限 0.4，大图时随 width 略降
    imageSize: Math.min(0.4, 100 / width),
    hideBackgroundDots: true,
  };

  return options;
}

const PLAIN_MARGIN_RATIO = 0.04;

/**
 * 纯黑白、方形点阵的基础二维码（无 Logo、无叠加文字、无自定义配色/码点样式），用于 SVG/PDF/EPS 等矢量导出。
 */
export function buildPlainQrStylingOptionsFromWidth(data: string, width: number): QrBuildOptions {
  const margin = Math.max(8, Math.round(width * PLAIN_MARGIN_RATIO));
  return {
    type: "svg",
    width,
    height: width,
    data,
    margin,
    qrOptions: {
      typeNumber: 0 as TypeNumber,
      errorCorrectionLevel: "M",
    },
    dotsOptions: {
      color: "#000000",
      type: "square",
    },
    cornersSquareOptions: {
      color: "#000000",
      type: "square",
    },
    cornersDotOptions: {
      color: "#000000",
      type: "square",
    },
    backgroundOptions: {
      color: "#ffffff",
    },
    image: "",
  };
}

export function withPlainQrAutoVersion(options: QrBuildOptions): QrBuildOptions {
  return {
    ...options,
    qrOptions: {
      ...options.qrOptions,
      typeNumber: 0 as TypeNumber,
    },
  };
}

/**
 * 将 SVG Blob 栅格化为 PNG（UTF-8 安全）。qr-code-styling 的 getRawData("png") 内部用 btoa，
 * 遇码上中文等字符会抛 InvalidCharacterError。
 */
export async function svgBlobToPngBlob(svgBlob: Blob): Promise<Blob | null> {
  if (typeof document === "undefined") return null;

  const text = await svgBlob.text();
  const utf8Blob = new Blob([text], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(utf8Blob);

  return new Promise((resolve) => {
    const img = new Image();
    const done = (blob: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };

    img.onload = () => {
      try {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (!w || !h) {
          const vb = text.match(/viewBox\s*=\s*["']([^"']+)["']/);
          if (vb) {
            const p = vb[1].trim().split(/[\s,]+/).map(Number);
            if (p.length === 4 && p.every((n) => Number.isFinite(n))) {
              w = p[2];
              h = p[3];
            }
          }
        }
        if (!w || !h) {
          done(null);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          done(null);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((b) => done(b), "image/png");
      } catch {
        done(null);
      }
    };
    img.onerror = () => done(null);
    img.src = url;
  });
}

/** 从已渲染的 QRCodeStyling 实例导出 PNG（含扩展层中文等 Unicode）。 */
export async function qrInstanceToPngBlob(qr: {
  // `QRCodeStyling#getRawData` 的 `extension` 实际是更窄的 `FileExtension` 联合类型；
  // 这里我们仅在内部传入 `"svg"`，因此将类型收窄到 `"svg"` 可避免 TS 不兼容。
  getRawData: (extension?: "svg") => Promise<Blob | Buffer | null>;
}): Promise<Blob | null> {
  const raw = await qr.getRawData("svg");
  if (!raw) return null;
  const blob =
    raw instanceof Blob ? raw : new Blob([raw as unknown as BlobPart], { type: "image/svg+xml" });
  return svgBlobToPngBlob(blob);
}

export function buildDownloadFilename(content: string) {
  const safe = content.trim().slice(0, 40).replace(/[^a-zA-Z0-9]+/g, "_");
  return safe ? `qr_${safe}` : "qr";
}

