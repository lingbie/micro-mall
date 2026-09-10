// routes/goods.routes.js — 商品路由
const router = require('express').Router()
const ctrl = require('../controllers/goods.controller')

router.get('/home/goods/list', ctrl.getGoodsList)
router.get('/home/goods', ctrl.getGoodsDetail)
router.get('/home/goods/album', ctrl.getGoodsAlbum)

module.exports = router
