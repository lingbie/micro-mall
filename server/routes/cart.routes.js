// routes/cart.routes.js — 购物车路由（均需登录）
const router = require('express').Router()
const ctrl = require('../controllers/cart.controller')
const { auth } = require('../middleware/auth')

router.get('/home/goods/cart', auth, ctrl.getCartList)
router.post('/home/goods/cart', auth, ctrl.addCart)
router.post('/home/goods/cart/update', auth, ctrl.updateCart)
router.post('/home/goods/cart/delete', auth, ctrl.deleteCart)

module.exports = router
