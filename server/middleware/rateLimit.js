// middleware/rateLimit.js — 限流：仅生产环境启用（NODE_ENV=production），本地开发不拦截调试请求
const rateLimit = require('express-rate-limit')

const isProd = process.env.NODE_ENV === 'production'

const prodLimiter = (windowMs, max, label) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !isProd,
    message: { errno: 1, data: null, errmsg: `操作过于频繁，请${Math.ceil(windowMs / 60000)}分钟后再试` }
  })

module.exports = { prodLimiter, isProd }
