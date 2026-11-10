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

// RAG 流式会话（SSE 透传）：onDelta 收到每段文本；返回最终全文（done 事件），失败返回 null
async function callRagSessionStream(sessionId, message, onDelta) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 120000)
    const resp = await fetch(`${config.ragUrl}/rag/session/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message }),
      signal: controller.signal
    })
    if (!resp.ok || !resp.body) {
      clearTimeout(timer)
      return null
    }
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    let final = null
    let errored = false
    const handleEvent = evt => {
      if (evt.type === 'delta' && evt.content) {
        if (typeof onDelta === 'function') onDelta(String(evt.content))
      } else if (evt.type === 'done' && evt.reply) {
        final = String(evt.reply)
      } else if (evt.type === 'error') {
        errored = true
      }
    }
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const block = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        for (const line of block.split('\n')) {
          if (!line.startsWith('data:')) continue
          try {
            handleEvent(JSON.parse(line.slice(5).trim()))
          } catch (_) {
            /* 忽略无法解析的行 */
          }
        }
      }
    }
    clearTimeout(timer)
    if (errored) return null
    return final && final.trim() ? final : null
  } catch (e) {
    console.error('[rag stream fallback]', e.message || e)
    return null
  }
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

module.exports = {
  callRagSession,
  callRagSessionStream,
  getRagHistory,
  buildShopKnowledge,
  callSiliconFlow
}
