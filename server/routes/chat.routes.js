// routes/chat.routes.js — AI 客服路由
const router = require('express').Router()
const ctrl = require('../controllers/chat.controller')
const { prodLimiter } = require('../middleware/rateLimit')

router.post('/home/chat', prodLimiter(10 * 60 * 1000, 100, 'chat'), ctrl.chat)
router.get('/home/chat/history', ctrl.chatHistory)

module.exports = router
