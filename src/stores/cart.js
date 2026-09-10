import { defineStore } from 'pinia'
import { ref } from 'vue'

// 购物车 store：统一保存服务端购物车结构
// 每项字段：id(购物车行id)、goods_id、quantity、name、price、desc、pic_url
const useCart = defineStore('cart', () => {
  const cart = ref([])

  // 唯一写入入口：用服务端返回的完整列表覆盖本地，
  // 消除 num/quantity 双字段与「接口未成功先加角标」的脏数据
  const setCart = list => {
    cart.value = Array.isArray(list) ? [...list] : []
  }

  // 清空（退出登录等场景）
  const clear = () => {
    cart.value = []
  }

  // 角标数量：按 quantity 求和；为 0 时返回 undefined 以隐藏 Vant badge
  const cartCount = () => {
    const sum = cart.value.reduce((s, item) => s + (Number(item.quantity) || 0), 0)
    return sum || undefined
  }

  return { cart, setCart, clear, cartCount }
}, {
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'cart',
        storage: localStorage
      }
    ]
  }
})

export default useCart
