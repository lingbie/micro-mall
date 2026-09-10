// controllers/category.controller.js — 分类树
const pool = require('../db')
const { ok, fail } = require('../utils/response')

async function getCategoryList(req, res) {
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
}

module.exports = { getCategoryList }
