// utils/password.js — 密码哈希（scrypt + 每用户随机盐，存储格式 salt:hash）
const crypto = require('crypto')

function hashPassword(pwd) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(pwd, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(pwd, stored) {
  try {
    const [salt, hash] = String(stored).split(':')
    const calc = crypto.scryptSync(pwd, salt, 32).toString('hex')
    return calc === hash
  } catch (e) {
    return false
  }
}

module.exports = { hashPassword, verifyPassword }
