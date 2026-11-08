// controllers/admin.controller.js — 管理后台：登录 / 概览 / 商品 / 订单 / 用户
const pool = require('../db')
const { ok, fail } = require('../utils/response')
const { verifyPassword } = require('../utils/password')
const { signToken } = require('../utils/token')
const config = require('../config')

// 订单状态文案（与 order.controller 一致）
const ORDER_STATUS = ['待付款', '待发货', '已完成', '已取消']

// 管理员登录（仅允许 ADMIN_USERNAME 配置的管理员账号）
async function login(req, res) {
  const { username, password } = req.body || {}
  if (!username || !password) return res.json(fail('用户名和密码不能为空'))
  if (username !== config.adminUsername) return res.json(fail('非管理员账号'))
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username])
    const user = rows[0]
    if (!user || !verifyPassword(password, user.password)) {
      return res.json(fail('用户名或密码错误'))
    }
    res.json(ok({ token: signToken(user), username: user.username }))
  } catch (e) {
    console.error('[admin login]', e)
    res.json(fail('登录失败，请稍后重试'))
  }
}

// 数据概览：商品 / 订单 / 用户 / 销售额 统计卡片
async function stats(req, res) {
  try {
    const [[g]] = await pool.query('SELECT COUNT(*) AS c FROM goods')
    const [[gu]] = await pool.query('SELECT COUNT(*) AS c FROM goods WHERE status = 1')
    const [[o]] = await pool.query('SELECT COUNT(*) AS c FROM orders')
    const [[u]] = await pool.query('SELECT COUNT(*) AS c FROM users')
    const [[sales]] = await pool.query(
      'SELECT COALESCE(SUM(total_amount), 0) AS s FROM orders WHERE status <> 3'
    )
    const [st] = await pool.query('SELECT status, COUNT(*) AS c FROM orders GROUP BY status')
    const orderStatus = { 0: 0, 1: 0, 2: 0, 3: 0 }
    st.forEach(r => {
      orderStatus[r.status] = r.c
    })
    res.json(
      ok({
        goodsTotal: g.c,
        goodsOn: gu.c,
        orderTotal: o.c,
        userTotal: u.c,
        salesTotal: Number(sales.s),
        orderStatus
      })
    )
  } catch (e) {
    console.error('[admin stats]', e)
    res.json(fail('获取统计数据失败'))
  }
}

// 商品列表（后台：含分类名、含下架商品、关键字搜索）
async function goodsList(req, res) {
  const keyword = String(req.query.keyword || '').trim().slice(0, 50)
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10))
  try {
    let where = 'WHERE 1=1'
    const params = []
    if (keyword) {
      where += ' AND (g.name LIKE ? OR g.`desc` LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM goods g ${where}`, params)
    const [list] = await pool.query(
      `SELECT g.id, g.name, g.\`desc\`, g.pic_url, g.price, g.sales, g.stock, g.status, g.category_id,
              c.name AS category_name
       FROM goods g
       LEFT JOIN category c ON c.id = g.category_id
       ${where}
       ORDER BY g.id
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    )
    res.json(ok({ list, total, page, pageSize }))
  } catch (e) {
    console.error('[admin goods list]', e)
    res.json(fail('获取商品列表失败'))
  }
}

// 更新商品（名称/价格/库存/上下架，至少一项）
async function updateGoods(req, res) {
  const id = Number(req.params.id)
  const body = req.body || {}
  if (!id) return res.json(fail('缺少商品 id'))
  try {
    const fields = []
    const params = []
    if (body.name !== undefined) {
      const n = String(body.name).trim().slice(0, 64)
      if (!n) return res.json(fail('商品名称不能为空'))
      fields.push('name = ?')
      params.push(n)
    }
    if (body.price !== undefined) {
      const p = Number(body.price)
      if (!(p > 0 && p < 10000000)) return res.json(fail('价格不合法'))
      fields.push('price = ?')
      params.push(p.toFixed(2))
    }
    if (body.stock !== undefined) {
      const s = Number(body.stock)
      if (!Number.isInteger(s) || s < 0 || s > 999999) return res.json(fail('库存不合法'))
      fields.push('stock = ?')
      params.push(s)
    }
    if (body.status !== undefined) {
      const st = Number(body.status)
      if (st !== 0 && st !== 1) return res.json(fail('上下架状态不合法'))
      fields.push('status = ?')
      params.push(st)
    }
    if (!fields.length) return res.json(fail('没有需要更新的字段'))
    const [r] = await pool.query(`UPDATE goods SET ${fields.join(', ')} WHERE id = ?`, [...params, id])
    if (!r.affectedRows) return res.json(fail('商品不存在'))
    res.json(ok({ id }))
  } catch (e) {
    console.error('[admin update goods]', e)
    res.json(fail('更新商品失败'))
  }
}

// 订单列表（后台：全部订单 + 用户名 + 明细 + 状态过滤）
async function orderList(req, res) {
  const rawStatus = req.query.status
  const status = rawStatus === undefined || rawStatus === '' ? null : Number(rawStatus)
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10))
  try {
    let where = 'WHERE 1=1'
    const params = []
    if (status !== null && [0, 1, 2, 3].includes(status)) {
      where += ' AND o.status = ?'
      params.push(status)
    }
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM orders o ${where}`, params)
    const [list] = await pool.query(
      `SELECT o.*, u.username
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       ${where}
       ORDER BY o.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    )
    if (!list.length) return res.json(ok({ list: [], total, page, pageSize }))
    const ids = list.map(o => o.id)
    const [items] = await pool.query(
      `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`,
      ids
    )
    const itemMap = {}
    items.forEach(i => {
      ;(itemMap[i.order_id] = itemMap[i.order_id] || []).push(i)
    })
    res.json(
      ok({
        list: list.map(o => ({
          ...o,
          status_text: ORDER_STATUS[o.status] || '未知',
          items: itemMap[o.id] || []
        })),
        total,
        page,
        pageSize
      })
    )
  } catch (e) {
    console.error('[admin order list]', e)
    res.json(fail('获取订单列表失败'))
  }
}

// 订单状态流转：待付款(0)->待发货(1)->已完成(2)；待付款可取消(3)并恢复库存
async function updateOrderStatus(req, res) {
  const id = Number(req.params.id)
  const status = Number((req.body || {}).status)
  if (!id || ![0, 1, 2, 3].includes(status)) return res.json(fail('参数不合法'))
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id])
    const order = rows[0]
    if (!order) throw new Error('订单不存在')
    const cur = order.status
    const allowed = { 0: [1, 3], 1: [2] }
    if (!allowed[cur] || !allowed[cur].includes(status)) {
      throw new Error('当前订单状态不可流转到目标状态')
    }
    if (status === 3) {
      // 取消订单：恢复库存
      const [items] = await conn.query(
        'SELECT goods_id, quantity FROM order_items WHERE order_id = ?',
        [id]
      )
      for (const it of items) {
        await conn.query('UPDATE goods SET stock = stock + ? WHERE id = ?', [it.quantity, it.goods_id])
      }
    }
    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, id])
    await conn.commit()
    res.json(ok({ id, status, status_text: ORDER_STATUS[status] }))
  } catch (e) {
    await conn.rollback()
    console.error('[admin order status]', e)
    res.json(fail(e.message || '更新订单状态失败'))
  } finally {
    conn.release()
  }
}

// 用户列表（后台：分页查看注册用户）
async function userList(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10))
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users')
    const [list] = await pool.query(
      'SELECT id, username, avatar, created_at FROM users ORDER BY id LIMIT ? OFFSET ?',
      [pageSize, (page - 1) * pageSize]
    )
    res.json(ok({ list, total, page, pageSize }))
  } catch (e) {
    console.error('[admin user list]', e)
    res.json(fail('获取用户列表失败'))
  }
}

module.exports = { login, stats, goodsList, updateGoods, orderList, updateOrderStatus, userList }
