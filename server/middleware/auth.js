// middleware/auth.js — JWT 认证中间件（请求头 jwt 字段）
const jwt = require('jsonwebtoken')
const config = require('../config')
const { fail } = require('../utils/response')

function auth(req, res, next) {
  const token = req.headers['jwt']
  if (!token) return res.json(fail('未登录', 2))
  try {
    req.user = jwt.verify(token, config.jwtSecret)
    next()
  } catch (e) {
    return res.json(fail('登录已过期，请重新登录', 2))
  }
}

module.exports = { auth }
