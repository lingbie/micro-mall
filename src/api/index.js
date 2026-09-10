import request from '../utils/request'
import config from '../config'
import {
  mockRegister,
  mockLogin,
  mockGetUser,
  mockGetCategoryList,
  mockGetGoodsList,
  mockGetGoodsDetail,
  mockGetGoodsAlbum,
  mockGetCartList,
  mockAddCart,
  mockRemoveCart,
  mockChat
} from './mock'

const useMock = config.useMock

// 认证
export function register(data) {
  return useMock ? mockRegister(data) : request.post('/home/register', data)
}
export function login(data) {
  return useMock ? mockLogin(data) : request.post('/home/login', data)
}
export function getUser() {
  return useMock ? mockGetUser() : request.get('/home/user')
}

// 分类
export function getCategoryList() {
  return useMock ? mockGetCategoryList() : request.get('/home/category/list')
}

// 商品
export function getGoodsList(params) {
  return useMock ? mockGetGoodsList(params) : request.get('/home/goods/list', { params })
}
export function getGoodsDetail(id) {
  return useMock ? mockGetGoodsDetail(id) : request.get('/home/goods', { params: { id } })
}
export function getGoodsAlbum(id) {
  return useMock ? mockGetGoodsAlbum(id) : request.get('/home/goods/album', { params: { id } })
}

// 购物车
export function getCartList() {
  return useMock ? mockGetCartList() : request.get('/home/goods/cart')
}
export function addCart(goods) {
  return useMock ? mockAddCart(goods) : request.post('/home/goods/cart', goods)
}
export function removeCart(id) {
  return useMock ? mockRemoveCart(id) : request.post('/home/goods/cart/delete', { id })
}
export function updateCart(id, quantity) {
  return request.post('/home/goods/cart/update', { id, quantity })
}

// 订单
export function createOrder(data) {
  return request.post('/home/order/create', data)
}
export function getOrderList() {
  return request.get('/home/order/list')
}
export function payOrder(id) {
  return request.post('/home/order/pay', { id })
}
export function cancelOrder(id) {
  return request.post('/home/order/cancel', { id })
}
export function confirmOrder(id) {
  return request.post('/home/order/confirm', { id })
}

// AI 客服
export function chat(data) {
  return useMock ? mockChat(data) : request.post('/home/chat', data)
}
export function getChatHistory(sessionId) {
  return request.get('/home/chat/history', { params: { session_id: sessionId } })
}
