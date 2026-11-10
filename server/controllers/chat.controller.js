// controllers/chat.controller.js — AI 客服对话与历史
const config = require('../config')
const { ok, fail } = require('../utils/response')
const {
  callRagSession,
  callRagSessionStream,
  getRagHistory,
  buildShopKnowledge,
  callSiliconFlow
} = require('../services/ai.service')

// 统一取回复：RAG 知识库优先（多轮记忆），不可用时回退纯 LLM + 热销商品知识
async function resolveReply(sessionId, message) {
  const ragReply = await callRagSession(sessionId, message)
  if (ragReply) return ragReply
  const knowledge = await buildShopKnowledge()
  const systemPrompt = [
    '你是"微商城"电商平台的智能客服小助手，名字叫"小徽"。',
    '你的职责：解答商品咨询、推荐商品、介绍分类、解答订单/物流/售后等常见问题。',
    '回答规则：',
    '1. 语气亲切友好，回答简洁，一般不超过60字；',
    '2. 推荐商品时优先从【商城概览】中挑选，价格以列表为准，并在商品名称后附上概览中给出的详情页链接；',
    '3. 不编造列表中不存在的商品、价格或促销信息；',
    '4. 涉及订单、物流、退款等需要人工处理的问题，引导用户描述订单号或建议转人工；',
    '5. 与商城无关的问题，礼貌说明只能提供商城购物相关帮助。',
    knowledge
  ].join('\n')
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ]
  return callSiliconFlow(messages)
}

// 把上游错误映射为用户可读提示
function mapChatError(e) {
  if (e && e.status === 401) return 'AI 服务 API Key 无效，请联系管理员'
  if (e && e.status === 403) return 'AI 服务需要实名认证，请前往硅基流动完成'
  if (e && e.status === 402) return 'AI 服务账户余额不足'
  if (e && e.status === 429) return 'AI 服务请求过于频繁，请稍后再试'
  if (e && (e.status === 500 || e.status === 503 || e.status === 504)) return 'AI 服务暂时繁忙，请稍后再试'
  return 'AI 客服开小差了，请稍后再试'
}

async function chat(req, res) {
  const { message, history = [], session_id = '' } = req.body || {}
  if (!message || !String(message).trim()) return res.json(fail('消息不能为空'))
  if (!config.siliconflow.apiKey) {
    return res.json(fail('AI 客服尚未配置 API Key，请联系管理员'))
  }
  try {
    const reply = await resolveReply(
      String(session_id || '').trim() || 'legacy-' + Date.now().toString(36),
      String(message).trim().slice(0, 2000)
    )
    res.json(ok({ reply }))
  } catch (e) {
    console.error('[chat]', e)
    res.json(fail(mapChatError(e)))
  }
}

// SSE 流式对话：RAG 流式透传，逐字下发；失败回退一次性完整回答（保持 done 事件协议）
async function chatStream(req, res) {
  const { message, session_id = '' } = req.body || {}
  if (!message || !String(message).trim()) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify(fail('消息不能为空')))
  }
  if (!config.siliconflow.apiKey) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify(fail('AI 客服尚未配置 API Key，请联系管理员')))
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  })
  const send = d => res.write(`data: ${JSON.stringify(d)}\n\n`)
  const msg = String(message).trim().slice(0, 2000)
  const sid = String(session_id || '').trim() || 'legacy-' + Date.now().toString(36)
  let emitted = false
  try {
    const reply = await callRagSessionStream(sid, msg, c => {
      emitted = true
      send({ type: 'delta', content: c })
    })
    if (reply) {
      send({ type: 'done', reply })
      return res.end()
    }
    if (!emitted) {
      // 流式链路不可用：回退非流式取完整回答，一次性下发
      try {
        const fallback = await resolveReply(sid, msg)
        send({ type: 'done', reply: fallback || '抱歉，我暂时无法回答，请稍后再试。' })
      } catch (e) {
        console.error('[chat stream fallback]', e)
        send({ type: 'error', message: mapChatError(e) })
      }
    } else {
      // 已流出部分内容但未收到完整结果：通知前端回退重试
      send({ type: 'error', message: '回复中断，请重试' })
    }
  } catch (e) {
    console.error('[chat stream]', e)
    if (!emitted) send({ type: 'error', message: mapChatError(e) })
    else send({ type: 'done', reply: '' })
  }
  res.end()
}

// 读取客服会话历史（Redis，经 RAG 服务）
async function chatHistory(req, res) {
  const { session_id } = req.query || {}
  if (!session_id || !String(session_id).trim()) return res.json(ok({ items: [] }))
  const items = await getRagHistory(String(session_id).trim())
  res.json(ok({ items }))
}

module.exports = { chat, chatStream, chatHistory }
