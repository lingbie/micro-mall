// index.js — 服务入口：加载 app 并监听端口（应用组装见 app.js）
const app = require('./app')
const config = require('./config')

app.listen(config.port, () => {
  console.log(`[myshop-server] 微商城后端已启动: http://127.0.0.1:${config.port}`)
})
