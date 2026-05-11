const http = require("http");
const https = require("https");
const dotenv = require("dotenv");

// 加载环境变量
dotenv.config();

const API_KEY = process.env.XUNFEI_API_KEY;
const PORT = process.env.PORT || 3000;

// EventSource 会话存储
const sessions = new Map();
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5分钟超期

// 清理过期会话
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT) {
      sessions.delete(sessionId);
    }
  }
}, 60 * 1000); // 每1分钟检查一次

// 创建与简化版服务器完全相同的HTTP服务器
const server = http.createServer((req, res) => {
  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 处理OPTIONS请求
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/chat/init") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const requestData = JSON.parse(body);
        const { messages } = requestData;

        // 生成会话ID
        const sessionId = Date.now().toString();
        sessions.set(sessionId, {
          messages: messages,
          createdAt: Date.now(),
        });

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ sessionId, status: "ready" }));
      } catch (error) {
        console.error("解析请求体错误:", error);
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "请求格式错误" }));
      }
    });
    return;
  }

  // 第2阶段 获取流式响应
  if (req.method === "GET" && req.url.startsWith("/api/chat/stream?")) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const sessionId = url.searchParams.get("sessionId");

      if (!sessions.has(sessionId)) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "会话不存在或已过期" }));
        return;
      }

      const session = sessions.get(sessionId);

      // 设置 EventSource 响应头
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      // 使用会话消息调用流式处理，响应结束后清理会话
      handleStreamRequest(session.messages, res, () => {
        sessions.delete(sessionId);
      });
    } catch (error) {
      console.error("EventSource 请求错误:", error);
      res.statusCode = 400;
      res.end();
    }
    return;
  }

  // 只处理POST请求到/api/chat
  if (req.method === "POST" && req.url === "/api/chat") {
    let body = "";

    // 接收请求体
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const requestData = JSON.parse(body);
        const { messages } = requestData;

        // 所有请求都使用流式处理
        handleStreamRequest(messages, res);
      } catch (error) {
        console.error("解析请求体错误:", error);
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "请求格式错误" }));
      }
    });
  } else if (req.method === "GET" && req.url === "/health") {
    // 健康检查端点
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({ status: "ok", message: "AI Chat API is running" }),
    );
  } else {
    res.statusCode = 404;
    res.end();
  }
});

// 处理流式请求
function handleStreamRequest(messages, res, onEnd = null) {
  // 创建与简化版服务器完全相同的请求体
  const requestBody = {
    model: "xop3qwen1b7",
    messages: messages,
    max_tokens: 4000,
    temperature: 0.7,
    stream: true,
  };

  // 创建与简化版服务器完全相同的请求选项
  const options = {
    hostname: "maas-api.cn-huabei-1.xf-yun.com",
    port: 443,
    path: "/v1/chat/completions",
    method: "POST",
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "User-Agent": "Node.js-Client",
      Accept: "*/*",
    },
  };

  // 创建请求（与简化版服务器完全相同的方式）
  const maasReq = https.request(options, (maasRes) => {
    // 设置SSE响应头
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // 直接将MaaS响应的数据发送给客户端
    maasRes.pipe(res);

    // 响应结束时调用回调函数
    maasRes.on("end", () => {
      if (onEnd) onEnd();
      // 不再手动发送[DONE]，因为pipe()已经关闭了连接
    });
  });

  // 错误处理
  maasReq.on("error", (error) => {
    console.error("\n=== 请求错误 ===");
    console.error("错误:", error);

    res.write(`data: {"error": "流式请求失败：${error.message}"} \n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
    if (onEnd) onEnd();
  });

  // 超时处理
  maasReq.on("timeout", () => {
    console.error("\n=== 请求超时 ===");
    maasReq.destroy();

    res.write(`data: {"error": "请求超时"} \n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
    if (onEnd) onEnd();
  });

  // 发送请求体
  maasReq.write(JSON.stringify(requestBody));
  maasReq.end();
}

// 启动服务器
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
