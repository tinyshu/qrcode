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

  // Add Text
  customTextEnabled: boolean;
  customText: string;
  customTextColor: string;
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

  quietZone: "2 blocks",
  errorCorrection: "30%",
  qrVersion: "2 (25*25)",
  encodedContent: "",

  customTextEnabled: false,
  customText: "QR",
  customTextColor: "#111418",
};

export function isQrDotShape(value: unknown): value is QrDotShape {
  return typeof value === "string" && (QR_DOT_SHAPES as readonly string[]).includes(value);
}

export function isQrEyeShape(value: unknown): value is QrEyeShape {
  return typeof value === "string" && (QR_EYE_SHAPES as readonly string[]).includes(value);
}

/** Migrate persisted state from older `Standard` / `Square` or invalid values. */
export function migrateQrStyleState(state: QrStyleState): QrStyleState {
  let next = state;
  if (!isQrDotShape(next.dotShape)) {
    next = { ...next, dotShape: "square" };
  }
  if (!isQrEyeShape(next.eyeShape)) {
    next = { ...next, eyeShape: "square" };
  }
  return next;
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
  customText?: string;
  customTextColor?: string;
  width?: number;
  height?: number;
};

export const overlayTextExtension: ExtensionFunction = (svg, options) => {
  const overlayOptions = options as OverlayOptions;
  const text = String(overlayOptions.customText ?? "").trim();

  // Always remove previous overlay to avoid duplicates on update.
  const existing = svg.querySelector('[data-qr-overlay-text="1"]');
  if (existing) existing.remove();

  if (!text) return;

  const width = Number(overlayOptions.width ?? 320);
  const height = Number(overlayOptions.height ?? width);

  const color = String(overlayOptions.customTextColor ?? "#111418");
  const fontSize = Math.max(12, Math.round(width * 0.12));

  const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
  textEl.setAttribute("data-qr-overlay-text", "1");
  textEl.setAttribute("x", String(width / 2));
  textEl.setAttribute("y", String(height / 2));
  textEl.setAttribute("text-anchor", "middle");
  textEl.setAttribute("dominant-baseline", "middle");
  textEl.setAttribute("fill", color);
  textEl.setAttribute("font-size", String(fontSize));
  textEl.setAttribute("font-family", "Space Grotesk, Arial, Helvetica, sans-serif");
  textEl.textContent = text;

  svg.appendChild(textEl);
};

export type QrBuildOptions = Options & {
  type: "svg";
  width: number;
  height: number;
  data: string;
  customText?: string;
  customTextColor?: string;
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
    // Custom overlay text for the "Add Text" button (implemented via overlayTextExtension).
    customText: state.customTextEnabled ? state.customText : "",
    customTextColor: state.customTextColor,
  };

  // Always pass image/imageOptions to ensure updates can clear previous logos.
  options.image = state.logoImageSrc ?? "";
  options.imageOptions = {
    crossOrigin: "anonymous",
    saveAsBlob: true,
    margin: 4,
    imageSize: Math.min(0.9, 200 / width),
    hideBackgroundDots: true,
  };

  return options;
}

export function buildDownloadFilename(content: string) {
  const safe = content.trim().slice(0, 40).replace(/[^a-zA-Z0-9]+/g, "_");
  return safe ? `qr_${safe}` : "qr";
}

