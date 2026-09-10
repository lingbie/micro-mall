// routes/auth.routes.js — 认证路由
const router = require('express').Router()
const ctrl = require('../controllers/auth.controller')
const { auth } = require('../middleware/auth')
const { prodLimiter } = require('../middleware/rateLimit')

router.post('/home/register', prodLimiter(15 * 60 * 1000, 30, 'register'), ctrl.register)
router.post('/home/login', prodLimiter(15 * 60 * 1000, 30, 'login'), ctrl.login)
router.get('/home/user', auth, ctrl.getUser)

module.exports = router
