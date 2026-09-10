// controllers/goods.controller.js — 商品列表 / 详情 / 相册
const pool = require('../db')
const { ok, fail } = require('../utils/response')

async function getGoodsList(req, res) {
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
}

async function getGoodsDetail(req, res) {
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
}

async function getGoodsAlbum(req, res) {
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
}

module.exports = { getGoodsList, getGoodsDetail, getGoodsAlbum }
