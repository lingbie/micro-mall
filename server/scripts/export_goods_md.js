// export_goods_md.js — 从数据库导出在售商品知识库到 server/rag/data/goods.md
// 产物供 RAG 构建索引（build_index.py）使用；编号 = goods.id，可直接拼详情页链接
// 用法: node scripts/export_goods_md.js
const fs = require('fs')
const path = require('path')
const pool = require('../db')

const ROOT = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(ROOT, '.env') })
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
const OUT = path.join(__dirname, '..', 'rag', 'data', 'goods.md')

async function main() {
  const [cats] = await pool.query(
    `SELECT c.id, c.name, c.parent_id, p.name AS parent_name
     FROM category c LEFT JOIN category p ON c.parent_id = p.id
     ORDER BY COALESCE(p.sort, c.sort), COALESCE(p.id, c.id), c.sort, c.id`
  )
  const [goods] = await pool.query(
    `SELECT id, name, price, stock, sales, category_id, pic_url
     FROM goods WHERE status = 1 ORDER BY category_id, id`
  )

  // 按二级分类分组（goods.category_id 均为二级分类 id）
  const byCat = new Map()
  for (const g of goods) {
    if (!byCat.has(g.category_id)) byCat.set(g.category_id, [])
    byCat.get(g.category_id).push(g)
  }

  const lines = []
  lines.push('# 微商城商品知识库')
  lines.push('')
  lines.push(
    '本文件由数据库自动导出（scripts/export_goods_md.js），收录微商城全部在售商品的' +
      '编号、名称、价格、库存与销量。客服回答商品咨询时必须以本文件为准，不得编造。'
  )
  lines.push('')
  lines.push(
    `商品详情页链接规则：每个商品的详情页为 ${FRONTEND_URL}/goodsDetail/{编号}，` +
      '例如编号 49 的商品详情页是 ' + FRONTEND_URL + '/goodsDetail/49。' +
      '推荐或谈及具体商品时，应在商品名称后附上该链接，方便用户点击查看。'
  )
  lines.push('')
  lines.push(
    '款式图规则：每件商品都标注了款式图地址（/images/ 开头的图片路径，在聊天中可直接显示）。' +
      '用户询问款式、外观、长什么样时，应把该商品的款式图地址原样写在回答里。'
  )
  lines.push('')

  for (const c of cats) {
    if (c.parent_id === 0) continue // 只输出二级分类（一级作为标题前缀）
    const items = byCat.get(c.id) || []
    const title = c.parent_name ? `${c.parent_name} - ${c.name}` : c.name
    lines.push(`## ${title}`)
    lines.push('')
    if (!items.length) {
      lines.push('该分类下暂无在售商品。')
      lines.push('')
      continue
    }
    lines.push('在售商品列表：')
    lines.push('')
    for (const g of items) {
      lines.push(
        `- 【编号${g.id}】${g.name}，售价${Number(g.price).toFixed(2)}元，` +
          `库存${g.stock}件，已售${g.sales}件，详情页 ${FRONTEND_URL}/goodsDetail/${g.id}，` +
          `款式图 ${g.pic_url || ''}。`
      )
    }
    lines.push('')
  }

  fs.writeFileSync(OUT, lines.join('\n'), 'utf8')
  console.log(
    `[export] 已导出 ${goods.length} 件在售商品、${cats.filter(c => c.parent_id !== 0).length} 个二级分类 -> ${OUT}`
  )
  await pool.end()
}

main().catch(e => {
  console.error('[export] 失败:', e.message)
  process.exit(1)
})
