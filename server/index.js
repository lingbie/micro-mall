// index.js — 微商城后端服务（Express + MySQL）
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const rateLimit = require('express-rate-limit')
const pool = require('./db')
const config = require('./config')

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

// 限流：仅生产环境启用（NODE_ENV=production），本地开发不拦截调试请求
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

// ---------- 工具 ----------
const ok = data => ({ errno: 0, data, errmsg: '' })
const fail = (msg, errno = 1) => ({ errno, data: null, errmsg: msg })

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

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, {
    expiresIn: config.jwtExpires
  })
}

// 认证中间件：请求头 jwt 字段
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

const publicUser = u => ({ username: u.username, avatar: u.avatar })

// ---------- 认证 ----------
app.post('/home/register', prodLimiter(15 * 60 * 1000, 30, 'register'), async (req, res) => {
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
})

app.post('/home/login', prodLimiter(15 * 60 * 1000, 30, 'login'), async (req, res) => {
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
})

app.get('/home/user', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT username, avatar FROM users WHERE id = ?', [req.user.id])
    if (!rows.length) return res.json(fail('用户不存在', 2))
    res.json(ok(publicUser(rows[0])))
  } catch (e) {
    console.error('[user]', e)
    res.json(fail('获取用户信息失败'))
  }
})

// ---------- 分类 ----------
app.get('/home/category/list', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM category ORDER BY sort, id')
    const tree = []
    const map = {}
    rows.forEach(c => {
      if (c.parent_id === 0) {
        map[c.id] = { id: c.id, name: c.name, children: [] }
        tree.push(map[c.id])
      }
    })
    rows.forEach(c => {
      if (c.parent_id !== 0 && map[c.parent_id]) {
        map[c.parent_id].children.push({ id: c.id, name: c.name, pic_url: c.pic_url })
      }
    })
    res.json(ok(tree))
  } catch (e) {
    console.error('[category]', e)
    res.json(fail('获取分类失败'))
  }
})

// ---------- 商品 ----------
app.get('/home/goods/list', async (req, res) => {
  const categoryId = req.query.categoryId
  const keyword = String(req.query.keyword || '').trim().slice(0, 50)
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 8)) // 上限 50，防止全表拉取
  try {
    let where = 'WHERE 1=1'
    const params = []
    if (categoryId) {
      where += ' AND g.category_id = ?'
      params.push(categoryId)
    }
    if (keyword) {
      where += ' AND (g.name LIKE ? OR g.`desc` LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM goods g ${where}`, params)
    const [list] = await pool.query(
      `SELECT g.id, g.name, g.\`desc\`, g.price, g.sales, g.stock, g.category_id,
              COALESCE(g.pic_url, c.pic_url) AS pic_url
       FROM goods g
       LEFT JOIN (SELECT id AS cat_id, pic_url FROM category) c ON c.cat_id = g.category_id
       ${where}
       ORDER BY id
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    )
    res.json(ok({ list, total, page, pageSize }))
  } catch (e) {
    console.error('[goods list]', e)
    res.json(fail('获取商品列表失败'))
  }
})

app.get('/home/goods', async (req, res) => {
  const id = req.query.id
  if (!id) return res.json(fail('缺少商品 id'))
  try {
    const [rows] = await pool.query(
      `SELECT g.id, g.name, g.\`desc\`, g.price, g.sales, g.stock, g.category_id,
              COALESCE(g.pic_url, c.pic_url) AS pic_url
       FROM goods g
       LEFT JOIN (SELECT id AS cat_id, pic_url FROM category) c ON c.cat_id = g.category_id
       WHERE g.id = ?`,
      [id]
    )
    if (!rows.length) return res.json(fail('商品不存在'))
    res.json(ok(rows[0]))
  } catch (e) {
    console.error('[goods detail]', e)
    res.json(fail('获取商品详情失败'))
  }
})

app.get('/home/goods/album', async (req, res) => {
  const id = req.query.id
  if (!id) return res.json(fail('缺少商品 id'))
  try {
    const [rows] = await pool.query(
      'SELECT pic_url FROM goods_album WHERE goods_id = ? ORDER BY sort, id',
      [id]
    )
    res.json(ok(rows.map(r => r.pic_url)))
  } catch (e) {
    console.error('[goods album]', e)
    res.json(fail('获取商品相册失败'))
  }
})

// ---------- 购物车 ----------
async function getCart(userId) {
  const [rows] = await pool.query(
    `SELECT cart.id, cart.goods_id, cart.quantity, goods.name, goods.price, goods.\`desc\`,
            COALESCE(goods.pic_url, c.pic_url) AS pic_url
     FROM cart
     JOIN goods ON goods.id = cart.goods_id
     LEFT JOIN (SELECT id AS cat_id, pic_url FROM category) c ON c.cat_id = goods.category_id
     WHERE cart.user_id = ?
     ORDER BY cart.created_at DESC, cart.id DESC`,
    [userId]
  )
  return rows
}

app.get('/home/goods/cart', auth, async (req, res) => {
  try {
    res.json(ok(await getCart(req.user.id)))
  } catch (e) {
    console.error('[cart list]', e)
    res.json(fail('获取购物车失败'))
  }
})

app.post('/home/goods/cart', auth, async (req, res) => {
  const { id: goodsId, quantity = 1 } = req.body || {}
  if (!goodsId) return res.json(fail('缺少商品 id'))
  try {
    const [goods] = await pool.query('SELECT id FROM goods WHERE id = ?', [goodsId])
    if (!goods.length) return res.json(fail('商品不存在'))
    const qty = Math.min(99, Math.max(1, Number(quantity) || 1))
    await pool.query(
      `INSERT INTO cart (user_id, goods_id, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [req.user.id, goodsId, qty]
    )
    res.json(ok(await getCart(req.user.id)))
  } catch (e) {
    console.error('[cart add]', e)
    res.json(fail('加入购物车失败'))
  }
})

// 修改购物车项数量（数量落库，刷新不丢失）
app.post('/home/goods/cart/update', auth, async (req, res) => {
  const { id, quantity } = req.body || {}
  if (!id) return res.json(fail('缺少购物车项 id'))
  try {
    const qty = Math.min(99, Math.max(1, Number(quantity) || 1))
    const [result] = await pool.query(
      'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?',
      [qty, id, req.user.id]
    )
    if (!result.affectedRows) return res.json(fail('购物车项不存在'))
    res.json(ok(await getCart(req.user.id)))
  } catch (e) {
    console.error('[cart update]', e)
    res.json(fail('修改数量失败'))
  }
})

app.post('/home/goods/cart/delete', auth, async (req, res) => {
  const { id } = req.body || {}
  if (!id) return res.json(fail('缺少购物车项 id'))
  try {
    await pool.query('DELETE FROM cart WHERE id = ? AND user_id = ?', [id, req.user.id])
    res.json(ok(await getCart(req.user.id)))
  } catch (e) {
    console.error('[cart delete]', e)
    res.json(fail('删除购物车项失败'))
  }
})

// ---------- 订单 ----------
function genOrderNo() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return (
    'M' +
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds()) +
    Math.floor(Math.random() * 900 + 100)
  )
}

// 订单状态文案
const ORDER_STATUS = ['待付款', '待发货', '已完成', '已取消']

// 创建订单（事务：校验库存 → 扣库存 → 写订单+明细 → 返回订单）
app.post('/home/order/create', auth, async (req, res) => {
  const { items, receiver, remark = '' } = req.body || {}
  if (!Array.isArray(items) || !items.length) return res.json(fail('订单商品不能为空'))
  const rec = receiver || {}
  if (!rec.name || !rec.phone || !rec.address) return res.json(fail('请填写收货人信息'))
  if (!/^[\u4e00-\u9fa5A-Za-z·]{2,20}$/.test(String(rec.name))) return res.json(fail('收货人姓名格式不正确'))
  if (!/^1\d{10}$/.test(String(rec.phone))) return res.json(fail('手机号格式不正确'))
  if (String(rec.address).length < 5 || String(rec.address).length > 120) {
    return res.json(fail('收货地址长度需为5-120字'))
  }
  if (items.length > 20) return res.json(fail('单笔订单商品种类过多'))
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    let total = 0
    const orderItems = []
    for (const it of items) {
      const goodsId = Number(it.goods_id)
      const qty = Math.min(99, Math.max(1, Number(it.quantity) || 1))
      const [rows] = await conn.query(
        'SELECT id, name, price, stock, pic_url FROM goods WHERE id = ? FOR UPDATE',
        [goodsId]
      )
      if (!rows.length) throw new Error(`商品 ${goodsId} 不存在`)
      const g = rows[0]
      if (g.stock < qty) throw new Error(`「${g.name}」库存不足，仅剩 ${g.stock} 件`)
      total += parseFloat(g.price) * qty
      orderItems.push({ goods_id: g.id, name: g.name, price: g.price, qty, pic_url: g.pic_url })
      await conn.query('UPDATE goods SET stock = stock - ?, sales = sales + ? WHERE id = ?', [qty, qty, g.id])
    }
    const orderNo = genOrderNo()
    const [orderRes] = await conn.query(
      `INSERT INTO orders (order_no, user_id, total_amount, status, receiver_name, receiver_phone, receiver_address, remark)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
      [orderNo, req.user.id, total.toFixed(2), rec.name, rec.phone, rec.address, String(remark).slice(0, 255)]
    )
    for (const oi of orderItems) {
      await conn.query(
        'INSERT INTO order_items (order_id, goods_id, goods_name, price, quantity, pic_url) VALUES (?, ?, ?, ?, ?, ?)',
        [orderRes.insertId, oi.goods_id, oi.name, oi.price, oi.qty, oi.pic_url]
      )
    }
    await conn.commit()
    res.json(ok({ order_id: orderRes.insertId, order_no: orderNo, total_amount: total.toFixed(2) }))
  } catch (e) {
    await conn.rollback()
    console.error('[order create]', e)
    res.json(fail(e.message || '下单失败'))
  } finally {
    conn.release()
  }
})

// 订单列表（含明细与状态文案）
app.get('/home/order/list', auth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC',
      [req.user.id]
    )
    if (!orders.length) return res.json(ok([]))
    const ids = orders.map(o => o.id)
    const [items] = await pool.query(
      `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`,
      ids
    )
    const itemMap = {}
    items.forEach(i => {
      ;(itemMap[i.order_id] = itemMap[i.order_id] || []).push(i)
    })
    res.json(
      ok(
        orders.map(o => ({
          ...o,
          status_text: ORDER_STATUS[o.status] || '未知',
          items: itemMap[o.id] || []
        }))
      )
    )
  } catch (e) {
    console.error('[order list]', e)
    res.json(fail('获取订单列表失败'))
  }
})

// 订单操作通用校验
async function getOwnOrder(userId, orderId) {
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId])
  return rows[0] || null
}

// 支付（模拟）：待付款 → 待发货
app.post('/home/order/pay', auth, async (req, res) => {
  const { id } = req.body || {}
  if (!id) return res.json(fail('缺少订单 id'))
  try {
    const order = await getOwnOrder(req.user.id, id)
    if (!order) return res.json(fail('订单不存在'))
    if (order.status !== 0) return res.json(fail('当前订单状态不可支付'))
    await pool.query('UPDATE orders SET status = 1 WHERE id = ?', [id])
    res.json(ok({ id: Number(id), status: 1, status_text: '待发货' }))
  } catch (e) {
    console.error('[order pay]', e)
    res.json(fail('支付失败'))
  }
})

// 取消订单：待付款可取消，恢复库存
app.post('/home/order/cancel', auth, async (req, res) => {
  const { id } = req.body || {}
  if (!id) return res.json(fail('缺少订单 id'))
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query('SELECT * FROM orders WHERE id = ? AND user_id = ? FOR UPDATE', [id, req.user.id])
    const order = rows[0]
    if (!order) throw new Error('订单不存在')
    if (order.status !== 0) throw new Error('仅待付款订单可取消')
    const [items] = await conn.query('SELECT goods_id, quantity FROM order_items WHERE order_id = ?', [id])
    for (const it of items) {
      await conn.query('UPDATE goods SET stock = stock + ? WHERE id = ?', [it.quantity, it.goods_id])
    }
    await conn.query('UPDATE orders SET status = 3 WHERE id = ?', [id])
    await conn.commit()
    res.json(ok({ id: Number(id), status: 3, status_text: '已取消' }))
  } catch (e) {
    await conn.rollback()
    console.error('[order cancel]', e)
    res.json(fail(e.message || '取消失败'))
  } finally {
    conn.release()
  }
})

// 确认收货：待发货 → 已完成
app.post('/home/order/confirm', auth, async (req, res) => {
  const { id } = req.body || {}
  if (!id) return res.json(fail('缺少订单 id'))
  try {
    const order = await getOwnOrder(req.user.id, id)
    if (!order) return res.json(fail('订单不存在'))
    if (order.status !== 1) return res.json(fail('当前订单状态不可确认收货'))
    await pool.query('UPDATE orders SET status = 2 WHERE id = ?', [id])
    res.json(ok({ id: Number(id), status: 2, status_text: '已完成' }))
  } catch (e) {
    console.error('[order confirm]', e)
    res.json(fail('确认收货失败'))
  }
})

// ---------- AI 客服（硅基流动 SiliconFlow + RAG 知识库） ----------
// RAG 知识服务（LlamaIndex + Redis 会话，端口 8361），失败时回退纯 LLM
async function callRagSession(sessionId, message) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)
    const resp = await fetch('http://127.0.0.1:8361/rag/session/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message }),
      signal: controller.signal
    })
    clearTimeout(timer)
    if (!resp.ok) return null
    const data = await resp.json()
    if (data.reply && String(data.reply).trim()) return String(data.reply)
  } catch (e) {
    console.error('[rag fallback]', e.message || e)
  }
  return null
}

// 读取 RAG 会话历史（Redis）
async function getRagHistory(sessionId) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const resp = await fetch(
      `http://127.0.0.1:8361/rag/session/history?session_id=${encodeURIComponent(sessionId)}`,
      { signal: controller.signal }
    )
    clearTimeout(timer)
    if (!resp.ok) return []
    const data = await resp.json()
    return Array.isArray(data.items) ? data.items : []
  } catch (e) {
    console.error('[rag history fallback]', e.message || e)
    return []
  }
}

// 组装商品知识：分类 + 热销商品，注入系统提示词（RAG 不可用时的兜底知识）
async function buildShopKnowledge() {
  const [cats] = await pool.query('SELECT name FROM category WHERE parent_id = 0 ORDER BY sort, id')
  const [hots] = await pool.query('SELECT name, price FROM goods ORDER BY sales DESC, id LIMIT 8')
  const catText = cats.map(c => c.name).join('、')
  const hotText = hots.map(g => `${g.name}（¥${g.price}）`).join('、')
  return `【商城概览】分类：${catText}。热销商品：${hotText}。`
}

// 调用硅基流动 Chat Completions（OpenAI 兼容）
async function callSiliconFlow(messages) {
  const { apiKey, model, baseUrl } = config.siliconflow
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 512,
      temperature: 0.7,
      stream: false
    })
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const err = new Error(`siliconflow ${resp.status}: ${data.message || 'unknown error'}`)
    err.status = resp.status
    throw err
  }
  return data.choices?.[0]?.message?.content || ''
}

// 清洗对话历史：只允许 user/assistant 角色、字符串内容、长度受限，防止 prompt 注入
function cleanHistory(h) {
  if (!Array.isArray(h)) return []
  return h
    .slice(-6)
    .filter(
      m =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim()
    )
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
}

app.post('/home/chat', prodLimiter(10 * 60 * 1000, 30, 'chat'), async (req, res) => {
  const { message, history = [], session_id = '' } = req.body || {}
  if (!message || !String(message).trim()) return res.json(fail('消息不能为空'))
  if (!config.siliconflow.apiKey) {
    return res.json(fail('AI 客服尚未配置 API Key，请联系管理员'))
  }
  try {
    // 优先走 RAG 知识库 + Redis 会话（商品/法规/FAQ 全量知识，多轮记忆）
    if (session_id && String(session_id).trim()) {
      const ragReply = await callRagSession(String(session_id).trim(), String(message).trim())
      if (ragReply) return res.json(ok({ reply: ragReply }))
    } else {
      // 无 session_id 时兼容旧接口（单轮）
      const ragReply = await callRagSession('legacy-' + Date.now().toString(36), String(message).trim())
      if (ragReply) return res.json(ok({ reply: ragReply }))
    }

    // RAG 不可用时回退：纯 LLM + 热销商品知识
    const knowledge = await buildShopKnowledge()
    const systemPrompt = [
      '你是"微商城"电商平台的智能客服小助手，名字叫"小徽"。',
      '你的职责：解答商品咨询、推荐商品、介绍分类、解答订单/物流/售后等常见问题。',
      '回答规则：',
      '1. 语气亲切友好，回答简洁，一般不超过60字；',
      '2. 推荐商品时优先从【商城概览】中挑选，价格以列表为准；',
      '3. 不编造列表中不存在的商品、价格或促销信息；',
      '4. 涉及订单、物流、退款等需要人工处理的问题，引导用户描述订单号或建议转人工；',
      '5. 与商城无关的问题，礼貌说明只能提供商城购物相关帮助。',
      knowledge
    ].join('\n')
    const messages = [
      { role: 'system', content: systemPrompt },
      ...cleanHistory(history),
      { role: 'user', content: String(message).trim().slice(0, 2000) }
    ]
    const reply = await callSiliconFlow(messages)
    res.json(ok({ reply }))
  } catch (e) {
    console.error('[chat]', e)
    if (e.status === 401) return res.json(fail('AI 服务 API Key 无效，请联系管理员'))
    if (e.status === 403) return res.json(fail('AI 服务需要实名认证，请前往硅基流动完成'))
    if (e.status === 402) return res.json(fail('AI 服务账户余额不足'))
    if (e.status === 429) return res.json(fail('AI 服务请求过于频繁，请稍后再试'))
    if (e.status === 500 || e.status === 503 || e.status === 504) {
      return res.json(fail('AI 服务暂时繁忙，请稍后再试'))
    }
    res.json(fail('AI 客服开小差了，请稍后再试'))
  }
})

// 读取客服会话历史（Redis，经 RAG 服务）
app.get('/home/chat/history', async (req, res) => {
  const { session_id } = req.query || {}
  if (!session_id || !String(session_id).trim()) return res.json(ok({ items: [] }))
  const items = await getRagHistory(String(session_id).trim())
  res.json(ok({ items }))
})

app.listen(config.port, () => {
  console.log(`[myshop-server] 微商城后端已启动: http://127.0.0.1:${config.port}`)
})
