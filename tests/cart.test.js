// @vitest-environment jsdom
// tests/cart.test.js — 重构后 stores/cart.js 的 setCart/clear/cartCount（按 quantity 求和）
// 说明：cart store 的 persist 选项在模块加载时引用 localStorage，故本文件使用 jsdom 环境
import { describe, test, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import useCart from '../src/stores/cart'

// 每个用例使用全新 pinia 实例隔离状态；未安装 persist 插件，persist 选项被忽略
beforeEach(() => {
  setActivePinia(createPinia())
})

describe('stores/cart — setCart', () => {
  test('用服务端列表覆盖本地购物车', () => {
    const store = useCart()
    store.setCart([
      { id: 11, goods_id: 1, quantity: 2, name: 'A', price: '10.00' },
      { id: 12, goods_id: 2, quantity: 1, name: 'B', price: '20.00' },
    ])
    expect(store.cart).toHaveLength(2)
    expect(store.cart[0].id).toBe(11)
  })

  test('再次 setCart 完全覆盖旧列表（而非追加）', () => {
    const store = useCart()
    store.setCart([{ id: 1, quantity: 1 }, { id: 2, quantity: 1 }])
    store.setCart([{ id: 3, quantity: 1 }])
    expect(store.cart).toHaveLength(1)
    expect(store.cart[0].id).toBe(3)
  })

  test('传入非数组（null/false/undefined）时安全置空', () => {
    const store = useCart()
    store.setCart([{ id: 1, quantity: 3 }])
    store.setCart(null)
    expect(store.cart).toEqual([])
    store.setCart([{ id: 1, quantity: 3 }])
    store.setCart(false)
    expect(store.cart).toEqual([])
  })

  test('拷贝数组，避免与外部引用别名', () => {
    const store = useCart()
    const src = [{ id: 1, quantity: 1 }]
    store.setCart(src)
    src.push({ id: 2, quantity: 1 })
    expect(store.cart).toHaveLength(1) // 不受外部后续修改影响
  })
})

describe('stores/cart — cartCount（按 quantity 求和）', () => {
  test('多项按 quantity 求和', () => {
    const store = useCart()
    store.setCart([
      { id: 1, quantity: 2 },
      { id: 2, quantity: 3 },
      { id: 3, quantity: 5 },
    ])
    expect(store.cartCount()).toBe(10)
  })

  test('quantity 为字符串（后端可能返回）也能正确求和', () => {
    const store = useCart()
    store.setCart([
      { id: 1, quantity: '2' },
      { id: 2, quantity: '3' },
    ])
    expect(store.cartCount()).toBe(5)
  })

  test('空购物车返回 undefined（Vant badge 隐藏）', () => {
    const store = useCart()
    expect(store.cartCount()).toBeUndefined()
    store.setCart([])
    expect(store.cartCount()).toBeUndefined()
  })

  test('非法/缺失 quantity 按 0 计，不产生 NaN', () => {
    const store = useCart()
    store.setCart([
      { id: 1, quantity: 2 },
      { id: 2 },                // 缺失
      { id: 3, quantity: 'x' }, // 非法
    ])
    expect(store.cartCount()).toBe(2)
  })
})

describe('stores/cart — clear', () => {
  test('清空购物车并使角标归零', () => {
    const store = useCart()
    store.setCart([{ id: 1, quantity: 4 }])
    expect(store.cartCount()).toBe(4)
    store.clear()
    expect(store.cart).toEqual([])
    expect(store.cartCount()).toBeUndefined()
  })
})
