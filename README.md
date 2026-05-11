# 明心智能对话系统使用教程

这是一个基于 Vue 3 + Node.js 构建的AI聊天应用项目，实现了与讯飞MaaS平台的集成，支持流式对话功能。

## 技术栈

### 前端

- Vue 3 (Composition API)
- Vite
- Element Plus
- CSS3

### 后端

- Node.js
- 原生HTTP模块
- HTTPS模块
- dotenv

### AI服务

- 讯飞MaaS平台 (xop3qwen1b7模型)

## 项目架构

```
├── backend/          # 后端服务
│   ├── index.js     # 主服务器文件
│   ├── package.json # 后端依赖
│   └── .env         # 环境变量配置
├── src/             # 前端代码
│   ├── views/       # 页面组件
│   │   └── AIVIew.vue # AI聊天页面
│   ├── components/  # 通用组件
│   ├── main.js      # 前端入口
│   └── App.vue      # 根组件
├── index.html       # HTML模板
├── package.json     # 前端依赖
└── vite.config.js   # Vite配置
```

## 核心功能

1. **实时流式对话**：与AI模型进行实时的流式交互，逐字显示回复内容
2. **消息历史管理**：自动维护对话历史，支持上下文理解
3. **响应式UI设计**：适配不同屏幕尺寸的现代化界面
4. **优雅的错误处理**：完善的错误提示和边界情况处理

## 前置条件

- Node.js 16+ 环境
- 讯飞开放平台账号 (获取API密钥)
- Git (可选)

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：

- GitHub Issues: <repository-issues-url>
- 电子邮件: <your-email>

---
