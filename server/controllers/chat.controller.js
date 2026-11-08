// controllers/chat.controller.js — AI 客服对话与历史
const config = require('../config')
const { ok, fail } = require('../utils/response')
const {
  callRagSession,
  getRagHistory,
  buildShopKnowledge,
  callSiliconFlow,
  cleanHistory
} = require('../services/ai.service')

async function chat(req, res) {
  const { message, history = [], session_id = '' } = req.body || {}
  if (!message || !String(message).trim()) return res.json(fail('消息不能为空'))
  if (!config.siliconflow.apiKey) {
    return res.json(fail('AI 客服尚未配置 API Key，请联系管理员'))
  }
  try {
    // 优先走 RAG 知识库 + Redis 会话（商品/法规/FAQ 全量知识，多轮记忆）
    if (session_id && String(session_id).trim()) {
      const ragReply = await callRagSession(String(session_id).trim(), String(message).trim())
      if (ragReply) return res.json(ok({ reply: ragReply }))
    } else {
      // 无 session_id 时兼容旧接口（单轮）
      const ragReply = await callRagSession('legacy-' + Date.now().toString(36), String(message).trim())
      if (ragReply) return res.json(ok({ reply: ragReply }))
    }

    // RAG 不可用时回退：纯 LLM + 热销商品知识
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
      ...cleanHistory(history),
      { role: 'user', content: String(message).trim().slice(0, 2000) }
    ]
    const reply = await callSiliconFlow(messages)
    res.json(ok({ reply }))
  } catch (e) {
    console.error('[chat]', e)
    if (e.status === 401) return res.json(fail('AI 服务 API Key 无效，请联系管理员'))
    if (e.status === 403) return res.json(fail('AI 服务需要实名认证，请前往硅基流动完成'))
    if (e.status === 402) return res.json(fail('AI 服务账户余额不足'))
    if (e.status === 429) return res.json(fail('AI 服务请求过于频繁，请稍后再试'))
    if (e.status === 500 || e.status === 503 || e.status === 504) {
      return res.json(fail('AI 服务暂时繁忙，请稍后再试'))
    }
    res.json(fail('AI 客服开小差了，请稍后再试'))
  }
}

// 读取客服会话历史（Redis，经 RAG 服务）
async function chatHistory(req, res) {
  const { session_id } = req.query || {}
  if (!session_id || !String(session_id).trim()) return res.json(ok({ items: [] }))
  const items = await getRagHistory(String(session_id).trim())
  res.json(ok({ items }))
}

module.exports = { chat, chatHistory }
