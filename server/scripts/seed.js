// seed.js — 初始化演示用户（幂等：已存在则跳过）
// 用法: node scripts/seed.js
const crypto = require('crypto')
const pool = require('../db')

function hashPassword(pwd) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(pwd, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

const users = [
  { username: 'demo1', password: '123456', avatar: '/images/avatar1.jpg' },
  { username: 'admin', password: 'admin123', avatar: '/images/avatar2.jpg' }
]

async function main() {
  for (const u of users) {
    const [exists] = await pool.query('SELECT id FROM users WHERE username = ?', [u.username])
    if (exists.length) {
      console.log(`[seed] 用户 ${u.username} 已存在，跳过`)
      continue
    }
    await pool.query('INSERT INTO users (username, password, avatar) VALUES (?, ?, ?)', [
      u.username,
      hashPassword(u.password),
      u.avatar
    ])
    console.log(`[seed] 已创建用户 ${u.username} / ${u.password}`)
  }
  const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM category')
  const [[{ g }]] = await pool.query('SELECT COUNT(*) AS g FROM goods')
  console.log(`[seed] 数据检查: 分类 ${c} 条，商品 ${g} 条`)
  await pool.end()
}

main().catch(e => {
  console.error('[seed] 失败:', e.message)
  process.exit(1)
})
