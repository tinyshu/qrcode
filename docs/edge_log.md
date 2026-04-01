日志分析
最近更新时间：2026-03-19 11:00:42

我的收藏
前置说明
Cloud Functions 日志
控制台检索日志
查找函数日志
日志结构说明
展开全部
前置说明
说明：
EdgeOne Pages 目前支持查看 Cloud Functions 的日志详情，后续将逐步支持如 Edge Functions 等其他服务的日志。
Cloud Functions 日志
Pages 日志分析为您自动收集、存储、过滤和分析 Cloud Functions 发出的日志数据。您可以在控制台中查询每个函数请求的数据，自定义查找日志的时间范围，目前支持查看全部日志、调用成功、调用失败、调用超时的日志。
控制台检索日志
登录到 Pages 控制台。
选择包含 Cloud Functions 的项目。
切换至“日志分析”。
通过状态，时间段，关键字来检索目标日志。
﻿
﻿﻿
查找函数日志
您可以查看函数调用的基本日志信息，通过日志快速发现并解决 API 调用中的异常或错误。
时间过滤
默认情况下，日志列表会显示最近 15 分钟相关请求的信息。您还可以筛选查看特定时间段的数据，包括过去 15 分钟、过去 1 小时、过去 6 小时、 过去 12 小时、过去 24 小时，或者选择自定义以输入 24 小时内特定的时间范围。
文本过滤
您可以使用简单的文本匹配来过滤日志内容，例如请求 ID、日志关键字。或者通过日志状态来筛选，目前可筛选的状态为：调用成功、调用失败、调用超时。
自定义日志
默认情况下，Cloud Functions 将发送包含有关请求、响应和相关元数据的详细信息的调用日志。您还可以在整个代码中添加自定义日志。console.log 中的所有内容都将显示在 Cloud Functions 日志中。
以下示例演示了 console.log 在请求处理程序中的自定义日志。
export const onRequestGet = async ({ request }) => {
  const info = {
    nodeVersion: process.version,
    pid: process.pid,
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus()?.length ?? 0,
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    uptimeSec: process.uptime(),
    randomUUID: randomUUID(),
    now: new Date().toISOString(),
    url: request.url,
  }
﻿
  console.log('=====info=====', info); // 自定义日志
﻿
  return new Response(JSON.stringify(info), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
  })
}
﻿
﻿﻿
日志结构说明
每一个函数请求的日志记录以平台日志标记请求开始、请求结束、请求错误信息、函数返回信息以及请求执行情况，用户日志封装在请求开始至请求结束之间。日志结构如下：
日志详情
日志类型
内容含义
START RequestId:09c346d3-8417-49c5-8569-xxxxxxxxxxxx
平台日志
标记请求开始。
init log
用户日志
用户在函数初始化阶段打印的日志内容，容器仅在冷启动场景下会执行初始化逻辑，非冷启动场景下无初始化日志输出。
Init Report RequestId: 09c346d3-8417-49c5-8569-xxxxxxxxxxxx Coldstart: 236ms (PullCode: 70ms InitRuntime: 8ms InitFunction: 158ms) Memory: 640MB MemUsage: 57.86MB
平台日志
初始化执行情况日志，Coldstart 为初始化阶段总耗时，其中 PullCode 为初始化阶段拉取用户函数和层代码耗时或拉取镜像耗时，InitRuntime 为初始化阶段平台耗时，InitFunction 为初始化阶段用户代码执行耗时，Memory 为函数配置内存，MemUsage 为初始化阶段运行内存。容器仅在冷启动场景下会执行初始化逻辑，非冷启动场景下无初始化日志输出。
invoke log
用户日志
用户在函数调用阶段打印的日志内容。
ERROR RequestId:09c346d3-8417-49c5-8569-xxxxxxxxxxxx Result:xxx
平台日志
函数错误原因，函数执行正常时无 ERROR 日志。
Response RequestId:09c346d3-8417-49c5-8569-xxxxxxxxxxxx RetMsg:"Hello World"
平台日志
函数返回信息记录在 RetMsg 中。
END RequestId:09c346d3-8417-49c5-8569-xxxxxxxxxxxx
平台日志
标记请求结束。
Report RequestId:09c346d3-8417-49c5-8569-c55033b17f51 Duration:1ms Memory:128MB MemUsage:29.734375MB
平台日志
函数调用执行情况日志，Duration 为函数执行耗时，Memory 为函数配置内存，MemUsage 为函数执行阶段运行内存。
日志保留与限制
平台默认仅保留 24 小时内的日志。
单个日志的最大限制为 5MB。超过该大小的日志将被截断，一般情况下为 message 字段被截断。

---

## 本站：生成二维码输入日志（自定义）

用户点击「生成二维码」且校验通过后，会 `POST /api/qr-generate-log`，服务端打印一行日志供 Pages 日志分析检索：

- **文本过滤关键字（必含）**：`EDGEONE_QR_GENERATE_INPUT`
- **内容**：同一行内为 JSON，字段含完整 `inputUrl`、`length`、`ts`（ISO 时间）

实现文件：`app/api/qr-generate-log/route.ts`；单条输入上限 8192 字符。
