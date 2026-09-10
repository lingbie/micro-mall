// routes/order.routes.js — 订单路由（均需登录）
const router = require('express').Router()
const ctrl = require('../controllers/order.controller')
const { auth } = require('../middleware/auth')

router.post('/home/order/create', auth, ctrl.createOrder)
router.get('/home/order/list', auth, ctrl.getOrderList)
router.post('/home/order/pay', auth, ctrl.payOrder)
router.post('/home/order/cancel', auth, ctrl.cancelOrder)
router.post('/home/order/confirm', auth, ctrl.confirmOrder)

module.exports = router
