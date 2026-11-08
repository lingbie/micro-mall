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
    // 用户端只展示上架商品；后台商品管理走独立接口
    where += ' AND g.status = 1'
    if (categoryId) {
      // 支持一级分类（自动包含其全部二级分类的商品）与二级分类（精确匹配）
      where += ' AND g.category_id IN (SELECT id FROM category WHERE id = ? OR parent_id = ?)'
      params.push(categoryId, categoryId)
    }
    if (keyword) {
      // 匹配商品名/描述，或商品所属分类名及其父分类名（如搜"男装"能找到男装分类下所有商品）
      where +=
        ' AND (g.name LIKE ? OR g.`desc` LIKE ? OR g.category_id IN (' +
        'SELECT c.id FROM category c LEFT JOIN category p ON c.parent_id = p.id ' +
        'WHERE c.name LIKE ? OR p.name LIKE ?))'
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
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
       WHERE g.id = ? AND g.status = 1`,
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
      'SELECT pic_url FROM goods WHERE id = ?',
      [id]
    )
    if (!rows.length) return res.json(fail('商品不存在'))
    res.json(ok([rows[0].pic_url]))
  } catch (e) {
    console.error('[goods album]', e)
    res.json(fail('获取商品相册失败'))
  }
}

module.exports = { getGoodsList, getGoodsDetail, getGoodsAlbum }
