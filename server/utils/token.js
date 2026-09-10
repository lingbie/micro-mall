// utils/token.js — JWT 签发
const jwt = require('jsonwebtoken')
const config = require('../config')

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, {
    expiresIn: config.jwtExpires
  })
}

module.exports = { signToken }
