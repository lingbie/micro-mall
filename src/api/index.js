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
// AI 客服流式对话（SSE）：onDelta 逐段回调
// 返回 { reply } 成功 / { error } 服务端错误 / null 接口不可用（调用方回退非流式）
export async function chatStream(data, { onDelta } = {}) {
  if (useMock) {
    const res = await mockChat(data)
    if (res && res.reply && typeof onDelta === 'function') onDelta(res.reply)
    return res ? { reply: res.reply } : { error: 'mock 服务不可用' }
  }
  try {
    const resp = await fetch(`${config.baseURL}/home/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!resp.ok || !resp.body) return null
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    let result = null
    const handle = evt => {
      if (evt.type === 'delta' && evt.content) {
        if (typeof onDelta === 'function') onDelta(String(evt.content))
      } else if (evt.type === 'done') {
        result = { reply: String(evt.reply || '') }
      } else if (evt.type === 'error') {
        result = { error: String(evt.message || '回复失败') }
      }
    }
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const block = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        for (const line of block.split('\n')) {
          if (!line.startsWith('data:')) continue
          try {
            handle(JSON.parse(line.slice(5).trim()))
          } catch (_) {
            /* 忽略无法解析的行 */
          }
        }
      }
    }
    return result
  } catch (e) {
    return null
  }
}
export function getChatHistory(sessionId) {
  return request.get('/home/chat/history', { params: { session_id: sessionId } })
}
