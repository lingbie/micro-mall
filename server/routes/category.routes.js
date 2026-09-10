// routes/category.routes.js — 分类路由
const router = require('express').Router()
const ctrl = require('../controllers/category.controller')

router.get('/home/category/list', ctrl.getCategoryList)

module.exports = router
