// controllers/auth.controller.js — 注册 / 登录 / 当前用户
const pool = require('../db')
const { ok, fail } = require('../utils/response')
const { hashPassword, verifyPassword } = require('../utils/password')
const { signToken } = require('../utils/token')

const publicUser = u => ({ username: u.username, avatar: u.avatar })

async function register(req, res) {
  const { username, password } = req.body || {}
  if (!username || !password) return res.json(fail('用户名和密码不能为空'))
  if (!/^\w{3,16}$/.test(username)) return res.json(fail('用户名长度为3-16个字符'))
  if (!/^\w{6,24}$/.test(password)) return res.json(fail('密码必须为6-24位英文字母或数字'))
  try {
    const [exists] = await pool.query('SELECT id FROM users WHERE username = ?', [username])
    if (exists.length) return res.json(fail('该用户名已被注册'))
    await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [
      username,
      hashPassword(password)
    ])
    res.json(ok({ username }))
  } catch (e) {
    console.error('[register]', e)
    res.json(fail('注册失败，请稍后重试'))
  }
}

async function login(req, res) {
  const { username, password } = req.body || {}
  if (!username || !password) return res.json(fail('用户名和密码不能为空'))
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username])
    const user = rows[0]
    if (!user || !verifyPassword(password, user.password)) {
      return res.json(fail('用户名或密码错误'))
    }
    res.json(ok({ token: signToken(user), user: publicUser(user) }))
  } catch (e) {
    console.error('[login]', e)
    res.json(fail('登录失败，请稍后重试'))
  }
}

async function getUser(req, res) {
  try {
    const [rows] = await pool.query('SELECT username, avatar FROM users WHERE id = ?', [req.user.id])
    if (!rows.length) return res.json(fail('用户不存在', 2))
    res.json(ok(publicUser(rows[0])))
  } catch (e) {
    console.error('[user]', e)
    res.json(fail('获取用户信息失败'))
  }
}

module.exports = { register, login, getUser }
