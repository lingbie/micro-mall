// mock.js — 后端就绪前的模拟数据层（useMock=true 时由 api/index.js 调用）
// 返回值结构与真实后端经 request 拦截器处理后一致：成功返回 data 本体，失败返回 null 并 toast
import { showToast } from 'vant'

const delay = (data, ms = 300) =>
  new Promise(resolve => setTimeout(() => resolve(data), ms))

const toastError = msg => {
  showToast({ message: msg, type: 'error' })
  return delay(null, 300)
}

// ---------- 商品与分类数据 ----------
// 每个一级分类使用一张对应的分类商品图（mock 阶段统一展示，阶段2 由后端真实数据替换）
const catPics = {
  1: '/images/mock/food.jpg',
  2: '/images/mock/clothing.jpg',
  3: '/images/mock/digital.jpg',
  4: '/images/mock/home.jpg',
  5: '/images/mock/baby.jpg',
  6: '/images/mock/beauty.jpg'
}

export const categoryData = [
  {
    id: 1,
    name: '食品',
    children: [
      { id: 11, name: '休闲零食', pic_url: catPics[1] },
      { id: 12, name: '生鲜水果', pic_url: catPics[1] },
      { id: 13, name: '米面粮油', pic_url: catPics[1] },
      { id: 14, name: '酒水饮料', pic_url: catPics[1] },
      { id: 15, name: '调味品', pic_url: catPics[1] },
      { id: 16, name: '速食方便', pic_url: catPics[1] }
    ]
  },
  {
    id: 2,
    name: '服装',
    children: [
      { id: 21, name: '男装', pic_url: catPics[2] },
      { id: 22, name: '女装', pic_url: catPics[2] },
      { id: 23, name: '童装', pic_url: catPics[2] },
      { id: 24, name: '内衣', pic_url: catPics[2] },
      { id: 25, name: '鞋靴', pic_url: catPics[2] },
      { id: 26, name: '配饰', pic_url: catPics[2] }
    ]
  },
  {
    id: 3,
    name: '数码',
    children: [
      { id: 31, name: '手机', pic_url: catPics[3] },
      { id: 32, name: '电脑', pic_url: catPics[3] },
      { id: 33, name: '配件', pic_url: catPics[3] },
      { id: 34, name: '智能家居', pic_url: catPics[3] },
      { id: 35, name: '数码外设', pic_url: catPics[3] },
      { id: 36, name: '游戏机', pic_url: catPics[3] }
    ]
  },
  {
    id: 4,
    name: '家居',
    children: [
      { id: 41, name: '家具', pic_url: catPics[4] },
      { id: 42, name: '家纺', pic_url: catPics[4] },
      { id: 43, name: '厨具', pic_url: catPics[4] },
      { id: 44, name: '收纳', pic_url: catPics[4] },
      { id: 45, name: '装饰', pic_url: catPics[4] },
      { id: 46, name: '灯具', pic_url: catPics[4] }
    ]
  },
  {
    id: 5,
    name: '母婴',
    children: [
      { id: 51, name: '奶粉', pic_url: catPics[5] },
      { id: 52, name: '纸尿裤', pic_url: catPics[5] },
      { id: 53, name: '童装', pic_url: catPics[5] },
      { id: 54, name: '玩具', pic_url: catPics[5] },
      { id: 55, name: '用品', pic_url: catPics[5] },
      { id: 56, name: '辅食', pic_url: catPics[5] }
    ]
  },
  {
    id: 6,
    name: '美妆',
    children: [
      { id: 61, name: '护肤', pic_url: catPics[6] },
      { id: 62, name: '彩妆', pic_url: catPics[6] },
      { id: 63, name: '香水', pic_url: catPics[6] },
      { id: 64, name: '洗护', pic_url: catPics[6] },
      { id: 65, name: '面膜', pic_url: catPics[6] },
      { id: 66, name: '工具', pic_url: catPics[6] }
    ]
  }
]

export const goodsData = []
let gid = 100
categoryData.forEach(cat => {
  cat.children.forEach(sub => {
    for (let k = 1; k <= 4; k++) {
      goodsData.push({
        id: gid++,
        name: `${sub.name}精选商品${k}`,
        desc: '品质优选，正品保障，七天无理由退换',
        price: (19.9 + gid * 3.7).toFixed(2),
        sales: Math.floor(Math.random() * 900 + 100),
        category_id: sub.id,
        pic_url: sub.pic_url,
        album: [sub.pic_url, sub.pic_url, sub.pic_url]
      })
    }
  })
})

// ---------- 用户库（localStorage 模拟） ----------
const USERS_KEY = 'mock_users'
const defaultUsers = [
  { username: 'demo1', password: '123456', avatar: '/images/avatar1.jpg' },
  { username: 'admin', password: 'admin123', avatar: '/images/avatar2.jpg' }
]
const getUsers = () => {
  try {
    const s = localStorage.getItem(USERS_KEY)
    const list = s ? JSON.parse(s) : defaultUsers
    return list.length ? list : defaultUsers
  } catch (e) {
    return defaultUsers
  }
}
const saveUsers = list => localStorage.setItem(USERS_KEY, JSON.stringify(list))

// ---------- 接口模拟（成功返回 data 本体，失败返回 null） ----------
export function mockRegister(data) {
  const users = getUsers()
  if (users.some(u => u.username === data.username)) {
    return toastError('该用户名已被注册')
  }
  users.push({ username: data.username, password: data.password, avatar: '/images/avatar3.png' })
  saveUsers(users)
  return delay({ username: data.username }, 400)
}

export function mockLogin(data) {
  const user = getUsers().find(u => u.username === data.username && u.password === data.password)
  if (!user) {
    return toastError('用户名或密码错误')
  }
  return delay({
    token: 'mock-token-' + Date.now(),
    user: { username: user.username, avatar: user.avatar }
  }, 400)
}

export function mockGetUser() {
  return delay({ username: 'demo1', avatar: '/images/avatar1.jpg' })
}

export function mockGetCategoryList() {
  return delay(categoryData)
}

export function mockGetGoodsList({ categoryId, page = 1, pageSize = 8 } = {}) {
  let list = categoryId ? goodsData.filter(g => g.category_id == categoryId) : goodsData
  const total = list.length
  const start = (page - 1) * pageSize
  const pageList = list.slice(start, start + pageSize)
  return delay({ list: pageList, total, page, pageSize })
}

export function mockGetGoodsDetail(id) {
  const goods = goodsData.find(g => g.id == id)
  if (!goods) return toastError('商品不存在')
  return delay(goods)
}

export function mockGetGoodsAlbum(id) {
  const goods = goodsData.find(g => g.id == id)
  return delay(goods ? goods.album : [])
}

export function mockGetCartList() {
  const cart = JSON.parse(localStorage.getItem('mock_cart') || '[]')
  return delay(cart)
}

export function mockAddCart(goods) {
  const cart = JSON.parse(localStorage.getItem('mock_cart') || '[]')
  const item = cart.find(i => i.id == goods.id)
  if (item) {
    item.quantity += goods.quantity || 1
  } else {
    cart.push({ ...goods, quantity: goods.quantity || 1 })
  }
  localStorage.setItem('mock_cart', JSON.stringify(cart))
  return delay(cart)
}

export function mockRemoveCart(id) {
  let cart = JSON.parse(localStorage.getItem('mock_cart') || '[]')
  cart = cart.filter(i => i.id != id)
  localStorage.setItem('mock_cart', JSON.stringify(cart))
  return delay(cart)
}

export function mockChat({ message }) {
  return delay({ reply: '【模拟回复】我是微商城客服小徽：您说"' + message + '"。配置好硅基流动 API Key 后，这里会返回真实 AI 回答。' })
}
