// services/ai.service.js — AI 客服：RAG 知识服务 + SiliconFlow（OpenAI 兼容）LLM 调用
const pool = require('../db')
const config = require('../config')

// RAG 知识服务（LlamaIndex + Redis 会话，端口 8361），失败时回退纯 LLM
async function callRagSession(sessionId, message) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)
    const resp = await fetch(`${config.ragUrl}/rag/session/query`, {
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
      `${config.ragUrl}/rag/session/history?session_id=${encodeURIComponent(sessionId)}`,
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

// 组装商品知识：分类 + 热销商品（含详情页链接），注入系统提示词（RAG 不可用时的兜底知识）
async function buildShopKnowledge() {
  const [cats] = await pool.query('SELECT name FROM category WHERE parent_id = 0 ORDER BY sort, id')
  const [hots] = await pool.query(
    'SELECT id, name, price, pic_url FROM goods WHERE status = 1 ORDER BY sales DESC, id LIMIT 8'
  )
  const catText = cats.map(c => c.name).join('、')
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  const hotText = hots
    .map(g => `${g.name}（¥${g.price}，详情页 ${base}/goodsDetail/${g.id}，款式图 ${g.pic_url}）`)
    .join('、')
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

module.exports = {
  callRagSession,
  getRagHistory,
  buildShopKnowledge,
  callSiliconFlow,
  cleanHistory
}
