// routes/admin.routes.js — 管理后台路由（/admin/api/*）
const router = require('express').Router()
const ctrl = require('../controllers/admin.controller')
const { adminAuth } = require('../middleware/auth')
const { prodLimiter } = require('../middleware/rateLimit')

router.post('/admin/api/login', prodLimiter(15 * 60 * 1000, 20, 'admin-login'), ctrl.login)
router.get('/admin/api/stats', adminAuth, ctrl.stats)
router.get('/admin/api/goods', adminAuth, ctrl.goodsList)
router.put('/admin/api/goods/:id', adminAuth, ctrl.updateGoods)
router.get('/admin/api/orders', adminAuth, ctrl.orderList)
router.put('/admin/api/orders/:id/status', adminAuth, ctrl.updateOrderStatus)
router.get('/admin/api/users', adminAuth, ctrl.userList)

module.exports = router
