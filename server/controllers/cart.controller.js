// controllers/cart.controller.js — 购物车增删改查（数量落库，刷新不丢失）
const pool = require('../db')
const { ok, fail } = require('../utils/response')

// 拉取用户购物车（联表商品与分类兜底图）
async function fetchCart(userId) {
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

async function getCartList(req, res) {
  try {
    res.json(ok(await fetchCart(req.user.id)))
  } catch (e) {
    console.error('[cart list]', e)
    res.json(fail('获取购物车失败'))
  }
}

async function addCart(req, res) {
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
    res.json(ok(await fetchCart(req.user.id)))
  } catch (e) {
    console.error('[cart add]', e)
    res.json(fail('加入购物车失败'))
  }
}

async function updateCart(req, res) {
  const { id, quantity } = req.body || {}
  if (!id) return res.json(fail('缺少购物车项 id'))
  try {
    const qty = Math.min(99, Math.max(1, Number(quantity) || 1))
    const [result] = await pool.query(
      'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?',
      [qty, id, req.user.id]
    )
    if (!result.affectedRows) return res.json(fail('购物车项不存在'))
    res.json(ok(await fetchCart(req.user.id)))
  } catch (e) {
    console.error('[cart update]', e)
    res.json(fail('修改数量失败'))
  }
}

async function deleteCart(req, res) {
  const { id } = req.body || {}
  if (!id) return res.json(fail('缺少购物车项 id'))
  try {
    await pool.query('DELETE FROM cart WHERE id = ? AND user_id = ?', [id, req.user.id])
    res.json(ok(await fetchCart(req.user.id)))
  } catch (e) {
    console.error('[cart delete]', e)
    res.json(fail('删除购物车项失败'))
  }
}

module.exports = { getCartList, addCart, updateCart, deleteCart, fetchCart }
