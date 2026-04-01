import { NextResponse } from "next/server";

/**
 * EdgeOne Pages「日志分析」中文本过滤请搜此固定串（与日志行首一致便于检索）
 */
export const QR_GENERATE_LOG_KEYWORD = "EDGEONE_QR_GENERATE_INPUT";

const MAX_INPUT_LENGTH = 8192;

type Body = {
  inputUrl?: unknown;
};

/**
 * 将用户生成二维码时的完整输入写入服务端 stdout，供 EdgeOne Pages Cloud Functions 日志采集。
 * @see docs/edge_log.md
 */
export async function POST(request: Request) {
  let parsed: Body;
  try {
    parsed = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const inputUrl = typeof parsed.inputUrl === "string" ? parsed.inputUrl : "";
  if (inputUrl.length === 0) {
    return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  }
  if (inputUrl.length > MAX_INPUT_LENGTH) {
    return NextResponse.json({ ok: false, error: "too_long" }, { status: 400 });
  }

  const payload = {
    keyword: QR_GENERATE_LOG_KEYWORD,
    inputUrl,
    length: inputUrl.length,
    ts: new Date().toISOString(),
  };

  // 单行 JSON：关键字在字段中，且行首含固定串便于控制台文本搜索
  console.log(`${QR_GENERATE_LOG_KEYWORD} ${JSON.stringify(payload)}`);

  return NextResponse.json({ ok: true }, { status: 200 });
}
