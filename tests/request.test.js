// tests/request.test.js — src/utils/request.js 响应拦截器 errno 分支 + 并发 loading 计数
import { describe, test, expect, vi, beforeEach } from 'vitest'

// vi.mock 会被提升到文件顶部，工厂内引用的共享状态需用 vi.hoisted 定义
const h = vi.hoisted(() => ({
  token: null,
  push: vi.fn(),
  showLoadingToast: vi.fn(),
  showToast: vi.fn(),
  closeToast: vi.fn(),
  // 捕获注册到 axios 实例上的拦截器处理函数，便于直接调用测试
  handlers: { req: null, resOk: null, resErr: null },
}))

// 隔离网络：axios.create 返回假实例，把拦截器 handler 捕获到 h.handlers
vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: {
        request: { use: fn => { h.handlers.req = fn } },
        response: {
          use: (ok, err) => { h.handlers.resOk = ok; h.handlers.resErr = err },
        },
      },
    }),
  },
}))

// 隔离 UI 提示与路由跳转、token store（避免加载真实 router/pinia 触发 DOM 依赖）
vi.mock('vant', () => ({
  showLoadingToast: h.showLoadingToast,
  showToast: h.showToast,
  closeToast: h.closeToast,
}))
vi.mock('../src/router', () => ({ default: { push: h.push } }))
vi.mock('../src/stores/tokens', () => ({ default: () => ({ token: h.token }) }))

// 每个用例重新导入 request.js：重置模块级 pending 计数并重新捕获拦截器
beforeEach(async () => {
  vi.clearAllMocks()
  h.token = null
  h.handlers.req = null
  h.handlers.resOk = null
  h.handlers.resErr = null
  vi.resetModules()
  await import('../src/utils/request.js')
})

describe('请求拦截器', () => {
  test('存在 token 时注入 jwt 请求头并触发全局 loading', () => {
    h.token = 'abc.token.value'
    const out = h.handlers.req({ headers: {} })
    expect(out.headers.jwt).toBe('abc.token.value')
    expect(h.showLoadingToast).toHaveBeenCalledTimes(1)
  })

  test('无 token 时不注入 jwt 头', () => {
    h.token = null
    const out = h.handlers.req({ headers: {} })
    expect(out.headers.jwt).toBeUndefined()
  })
})

describe('响应拦截器 — errno 0（成功）', () => {
  test('返回 data，errmsg 非空时弹成功提示', () => {
    const out = h.handlers.resOk({ data: { errno: 0, data: { id: 1 }, errmsg: '操作成功' } })
    expect(out).toEqual({ id: 1 })
    expect(h.showToast).toHaveBeenCalledWith({ message: '操作成功', type: 'success' })
  })

  test('errmsg 为空串时不弹提示，直接返回 data', () => {
    const out = h.handlers.resOk({ data: { errno: 0, data: [1, 2], errmsg: '' } })
    expect(out).toEqual([1, 2])
    expect(h.showToast).not.toHaveBeenCalled()
  })

  test('data 为假值时返回 true', () => {
    const out = h.handlers.resOk({ data: { errno: 0, data: null, errmsg: '' } })
    expect(out).toBe(true)
  })
})

describe('响应拦截器 — errno 2（未登录/登录过期）', () => {
  test('返回 false，弹错误提示并跳转登录页', () => {
    const out = h.handlers.resOk({ data: { errno: 2, data: null, errmsg: '登录已过期' } })
    expect(out).toBe(false)
    expect(h.showToast).toHaveBeenCalledWith({ message: '登录已过期', type: 'error' })
    expect(h.push).toHaveBeenCalledWith({ name: 'login' })
  })
})

describe('响应拦截器 — errno 1（业务错误）', () => {
  test('返回 false 并弹错误提示，但不跳转登录', () => {
    const out = h.handlers.resOk({ data: { errno: 1, data: null, errmsg: '库存不足' } })
    expect(out).toBe(false)
    expect(h.showToast).toHaveBeenCalledWith({ message: '库存不足', type: 'error' })
    expect(h.push).not.toHaveBeenCalled()
  })
})

describe('响应拦截器 — 网络/HTTP 错误分支', () => {
  test('返回 false 并弹失败提示', () => {
    const out = h.handlers.resErr(new Error('Network Error'))
    expect(out).toBe(false)
    expect(h.showToast).toHaveBeenCalledWith({ message: '请求失败', type: 'fail' })
  })
})

describe('全局 loading 并发计数', () => {
  test('多个并发请求仅首个显示 loading、全部完成后仅关闭一次', () => {
    h.handlers.req({ headers: {} })
    h.handlers.req({ headers: {} })
    h.handlers.req({ headers: {} })
    expect(h.showLoadingToast).toHaveBeenCalledTimes(1)

    // 前两个完成，pending 仍 > 0，不关闭
    h.handlers.resOk({ data: { errno: 0, data: null, errmsg: '' } })
    h.handlers.resOk({ data: { errno: 0, data: null, errmsg: '' } })
    expect(h.closeToast).not.toHaveBeenCalled()

    // 最后一个完成，pending 归零，关闭 loading
    h.handlers.resOk({ data: { errno: 0, data: null, errmsg: '' } })
    expect(h.closeToast).toHaveBeenCalledTimes(1)
  })

  test('成功与失败混合完成也会正确释放计数', () => {
    h.handlers.req({ headers: {} })
    h.handlers.req({ headers: {} })
    expect(h.showLoadingToast).toHaveBeenCalledTimes(1)
    h.handlers.resOk({ data: { errno: 0, data: null, errmsg: '' } })
    h.handlers.resErr(new Error('boom'))
    expect(h.closeToast).toHaveBeenCalledTimes(1)
  })
})
