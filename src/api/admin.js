// src/api/admin.js — 管理后台 API（独立 token，与用户端隔离）
import axios from 'axios'
import config from '../config'
import router from '../router'
import { showToast } from 'vant'

const service = axios.create({ baseURL: config.baseURL })

// 管理员 token 存取（localStorage 隔离，不污染用户端 token）
export function getAdminToken() {
  return localStorage.getItem('myshop_admin_token') || ''
}
export function setAdminToken(t) {
  localStorage.setItem('myshop_admin_token', t)
}
export function clearAdminToken() {
  localStorage.removeItem('myshop_admin_token')
}

service.interceptors.request.use(cfg => {
  const t = getAdminToken()
  if (t) cfg.headers.jwt = t
  return cfg
})

service.interceptors.response.use(
  res => {
    const { errno, data, errmsg } = res.data
    if (errno === 0) return data || true
    showToast({ message: errmsg || '请求失败', type: 'fail' })
    if (errno === 2) {
      clearAdminToken()
      router.push({ path: '/admin/login' })
    }
    return false
  },
  () => {
    showToast({ message: '网络请求失败', type: 'fail' })
    return false
  }
)

// 认证
export function adminLogin(data) {
  return service.post('/admin/api/login', data)
}

// 概览
export function adminStats() {
  return service.get('/admin/api/stats')
}

// 商品
export function adminGoodsList(params) {
  return service.get('/admin/api/goods', { params })
}
export function adminUpdateGoods(id, data) {
  return service.put(`/admin/api/goods/${id}`, data)
}

// 订单
export function adminOrderList(params) {
  return service.get('/admin/api/orders', { params })
}
export function adminUpdateOrderStatus(id, status) {
  return service.put(`/admin/api/orders/${id}/status`, { status })
}

// 用户
export function adminUserList(params) {
  return service.get('/admin/api/users', { params })
}
