# 环境变量说明

## `NEXT_PUBLIC_SITE_URL`

### 作用

站点对外的 **完整根 URL**（含协议），用于：

- `metadataBase`（Next.js Metadata）
- 首页 / 联系页的 **canonical**、**Open Graph**、**Twitter Card** 等绝对地址

读取逻辑见项目根目录下的 [`lib/site-url.ts`](../lib/site-url.ts)。

### 格式要求

- 必须带协议：`https://` 或 `http://`（生产环境请用 HTTPS）
- **不要**在末尾加斜杠，例如：
  - ✅ `https://www.example.com`
  - ❌ `https://www.example.com/`

未配置或解析失败时，会回退为 `http://localhost:3000`（仅适合本地开发）。

### 在哪里配置

| 场景 | 做法 |
|------|------|
| 本地开发 | 在仓库根目录（与 `package.json` 同级）新建 **`.env.local`**，写入变量（该文件通常已加入 `.gitignore`，勿提交） |
| 腾讯云 / Vercel 等 | 在控制台 **环境变量** 中为构建/运行环境添加同名变量 |

示例（在 **`.env.local`** 中按需填写；`.env.local` 与 `.env.example` 均已加入 `.gitignore`，勿提交）：

```env
NEXT_PUBLIC_SITE_URL=https://你的域名
```

### 为何带 `NEXT_PUBLIC_` 前缀

Next.js 规定：只有以 `NEXT_PUBLIC_` 开头的变量才会在**浏览器端**打包进前端代码。本项目同时在服务端生成 Metadata 时读取该变量，用于 SEO 与分享链接。

### 修改后

改完环境变量需 **重新执行 `npm run build` / 重启 dev 服务**，构建产物才会带上新的站点地址。
