// middleware/error.js — 404 与全局错误处理，统一返回 { errno, data, errmsg }
// 修复：此前 body-parser 解析畸形 JSON 抛出的异常未被捕获，会返回 HTML 错误页并刷 stderr 日志
const { fail } = require('../utils/response')

// 未匹配任何路由
function notFound(req, res) {
  res.status(404).json(fail('接口不存在'))
}

// 全局错误处理（必须置于所有路由之后，签名含 4 个参数 Express 才识别为错误中间件）
function errorHandler(err, req, res, next) {
  // body-parser：请求体不是合法 JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(fail('请求体格式错误'))
  }
  // body-parser：请求体超过大小限制
  if (err.type === 'entity.too.large') {
    return res.status(413).json(fail('请求体过大'))
  }
  console.error('[error]', err)
  res.status(500).json(fail('服务器内部错误'))
}

module.exports = { notFound, errorHandler }
