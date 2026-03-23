import type { ExtensionFunction, Options, TypeNumber } from "qr-code-styling";

export type QrDotShape = "Standard";
export type QrEyeShape = "Square";
export type QrBackgroundMode = "Solid";
export type QrDotColorMode = "Black";
export type QrEyeColorMode = "Custom";
export type QrQuietZoneMode = "2 blocks";
export type QrErrorCorrectionMode = "15%";
export type QrVersionMode = "3 (29*29)";
export type QrLabelSizeMode = "30*30mm";

export type QrStyleState = {
  // Logo
  logoImageSrc?: string; // URL or data URL

  // Dots & Eyes
  dotColorMode: QrDotColorMode;
  backgroundMode: QrBackgroundMode;
  dotShape: QrDotShape;
  eyeShape: QrEyeShape;
  eyeColorMode: QrEyeColorMode;
  eyeColor: string; // used when eyeColorMode === "Custom"

  // More
  quietZone: QrQuietZoneMode;
  errorCorrection: QrErrorCorrectionMode;
  qrVersion: QrVersionMode;
  labelSize: QrLabelSizeMode;
  encodedContent: string;

  // Add Text
  customTextEnabled: boolean;
  customText: string;
  customTextColor: string;
};

export const DEFAULT_QR_STYLE: QrStyleState = {
  logoImageSrc: undefined,

  dotColorMode: "Black",
  backgroundMode: "Solid",
  dotShape: "Standard",
  eyeShape: "Square",
  eyeColorMode: "Custom",
  eyeColor: "#000000",

  quietZone: "2 blocks",
  errorCorrection: "15%",
  qrVersion: "3 (29*29)",
  labelSize: "30*30mm",
  encodedContent: "",

  customTextEnabled: false,
  customText: "QR",
  customTextColor: "#111418",
};

export function parseQrVersion(version: QrVersionMode): TypeNumber {
  // "3 (29*29)" -> 3
  const match = version.match(/^(\d+)\s*\(/);
  return (match ? Number(match[1]) : 3) as TypeNumber;
}

export function parseErrorCorrection(ec: QrErrorCorrectionMode): "L" | "M" | "Q" | "H" {
  // 7%/15%/25%/30% correspond to L/M/Q/H.
  switch (ec) {
    case "15%":
    default:
      return "M";
  }
}

export function parseQuietZone(qz: QrQuietZoneMode): number {
  // "2 blocks" -> 2
  const match = qz.match(/^(\d+)\s+/);
  return match ? Number(match[1]) : 2;
}

export function parseLabelSizeMm(labelSize: QrLabelSizeMode): number {
  // "30*30mm" -> 30
  const match = labelSize.match(/^(\d+)\s*\*/);
  return match ? Number(match[1]) : 30;
}

function parseBackgroundColor(state: QrStyleState): string {
  // Only "Solid" exists in the design.
  switch (state.backgroundMode) {
    case "Solid":
    default:
      return "#ffffff";
  }
}

function parseDotColor(state: QrStyleState): string {
  switch (state.dotColorMode) {
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

  const mm = parseLabelSizeMm(state.labelSize);
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

  const dotsType = state.dotShape === "Standard" ? "square" : "square";
  const cornersType = state.eyeShape === "Square" ? "square" : "square";

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
      type: cornersType,
    },
    cornersDotOptions: {
      color: eyeColor,
      type: cornersType,
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

