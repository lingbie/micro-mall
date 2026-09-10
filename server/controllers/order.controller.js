// controllers/order.controller.js — 下单 / 列表 / 支付 / 取消 / 确认收货
const pool = require('../db')
const { ok, fail } = require('../utils/response')

// 订单状态文案
const ORDER_STATUS = ['待付款', '待发货', '已完成', '已取消']

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

// 订单归属校验
async function getOwnOrder(userId, orderId) {
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId])
  return rows[0] || null
}

// 创建订单（事务：校验库存 → 扣库存 → 写订单+明细 → 返回订单）
async function createOrder(req, res) {
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
}

// 订单列表（含明细与状态文案）
async function getOrderList(req, res) {
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
}

// 支付（模拟）：待付款 → 待发货
async function payOrder(req, res) {
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
}

// 取消订单：待付款可取消，恢复库存
async function cancelOrder(req, res) {
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
}

// 确认收货：待发货 → 已完成
async function confirmOrder(req, res) {
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
}

module.exports = { createOrder, getOrderList, payOrder, cancelOrder, confirmOrder, ORDER_STATUS }
