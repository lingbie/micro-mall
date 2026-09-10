// app.js — 组装 Express 应用（中间件 + 路由 + 错误处理），导出供 index.js 与测试注入
const express = require('express')
const cors = require('cors')
const config = require('./config')
const { notFound, errorHandler } = require('./middleware/error')

const app = express()

// CORS 白名单：仅允许配置的来源，禁止通配符
app.use(
  cors({
    origin(origin, cb) {
      // 非浏览器请求（curl/同源）无 origin 头，放行
      if (!origin) return cb(null, true)
      if (config.corsOrigins.includes(origin)) return cb(null, true)
      return cb(null, false)
    }
  })
)
app.use(express.json({ limit: '100kb' }))

// 请求日志（开发排查用）
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const cost = Date.now() - start
    console.log(`[req] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${cost}ms)`)
  })
  next()
})

// 健康检查（容器编排/监控用）
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'myshop-server' }))

// 业务路由
app.use(require('./routes/auth.routes'))
app.use(require('./routes/category.routes'))
app.use(require('./routes/goods.routes'))
app.use(require('./routes/cart.routes'))
app.use(require('./routes/order.routes'))
app.use(require('./routes/chat.routes'))

// 404 与全局错误处理（置于所有路由之后）
app.use(notFound)
app.use(errorHandler)

module.exports = app
