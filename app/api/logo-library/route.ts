import * as fs from "fs/promises";
import path from "path";
import type { Dirent } from "fs";

import { NextResponse } from "next/server";

type LogoItem = {
  name: string;
  src: string;
};

const ALLOWED_EXT = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp"]);

export async function GET() {
  const dir = path.join(process.cwd(), "public", "logo-library");

  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    // Folder might not exist or be empty.
    return NextResponse.json({ items: [] as LogoItem[] });
  }

  const items: LogoItem[] = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ALLOWED_EXT.has(ext);
    })
    .map((file) => {
      const ext = path.extname(file);
      const name = file.slice(0, file.length - ext.length);
      return { name, src: `/logo-library/${file}` };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ items });
}

