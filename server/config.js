// config.js — 后端配置（敏感信息一律从环境变量读取，本地由 .env 提供）
// 模板见 .env.example；.env 已被 .gitignore 排除，不会进入版本库
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

module.exports = {
  port: Number(process.env.PORT || 8360),
  // 上线前必须更换：JWT 签名密钥应使用随机长字符串
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpires: '7d',
  db: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'myshop123456',
    database: process.env.MYSQL_DATABASE || 'myshop'
  },
  // CORS 白名单（逗号分隔），生产环境必须显式配置，禁止使用通配符
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  // RAG 客服知识服务地址（Docker 内为 http://rag:8361，本地默认 127.0.0.1:8361）
  ragUrl: process.env.RAG_SERVER_URL || 'http://127.0.0.1:8361',
  // 硅基流动（SiliconFlow）AI 客服配置
  // API Key 获取: https://cloud.siliconflow.cn -> API 密钥 -> 新建
  siliconflow: {
    apiKey: process.env.SILICONFLOW_API_KEY || '', // 从 .env 读取；为空时客服接口返回未配置
    model: process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
    baseUrl: 'https://api.siliconflow.cn/v1'
  }
}
