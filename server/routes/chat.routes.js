// routes/chat.routes.js — AI 客服路由
const router = require('express').Router()
const ctrl = require('../controllers/chat.controller')
const { prodLimiter } = require('../middleware/rateLimit')

router.post('/home/chat', prodLimiter(10 * 60 * 1000, 100, 'chat'), ctrl.chat)
// SSE 流式对话（与 /home/chat 共用限流桶）
router.post('/home/chat/stream', prodLimiter(10 * 60 * 1000, 100, 'chat'), ctrl.chatStream)
router.get('/home/chat/history', ctrl.chatHistory)

module.exports = router
