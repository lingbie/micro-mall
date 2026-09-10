// utils/response.js — 统一响应格式 { errno, data, errmsg }
const ok = data => ({ errno: 0, data, errmsg: '' })
const fail = (msg, errno = 1) => ({ errno, data: null, errmsg: msg })

module.exports = { ok, fail }
