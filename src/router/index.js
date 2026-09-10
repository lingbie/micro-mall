import { createRouter, createWebHistory } from 'vue-router' 
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
    path: '/login',
    component: () => import('../pages/Login.vue'),
    name: 'login',
    meta: { title: '登录', isTab: false, isShowNav: false, isShowBack: false }
  }, 
{
    path: '/register',
    component: () => import('../pages/Register.vue'),
    name: 'register',
    meta: { title: '注册', isTab: false, isShowNav: false, isShowBack: false }
  }, 
{
    path: '/',
    redirect: '/home',
    meta: { title: '首页' }
  },
  {
    path: '/home',
    component: () => import('../pages/Home.vue'),
    name: 'home',
    meta: { title: '首页', isTab: true }
  },
  {
    path: '/category',
    component: () => import('../pages/Category.vue'),
    name: 'category',
    meta: { title: '分类', isTab: true, isShowNav: true }
  },
  {
    path: '/message',
    component: () => import('../pages/Message.vue'),
    name: 'message',
    meta: { title: '消息', isTab: true, isShowNav: true }
  },
  {
    path: '/cart',
    component: () => import('../pages/Cart.vue'),
    name: 'cart',
    meta: { title: '购物车', isTab: true, isShowNav: true }
  },
  {
    path: '/user',
    component: () => import('../pages/User.vue'),
    name: 'user',
    meta: { title: '我的', isTab: true }
  },
  {
    path: '/goodslist/:categoryId',
    component: () => import('../pages/GoodsList.vue'),
    name: 'goodslist',
    meta: { title: '商品列表', isTab: false, isShowNav: true, isShowBack: true }
  },
  {
    path: '/goodsDetail/:id',
    component: () => import('../pages/GoodsDetail.vue'),
    name: 'goodsDetail',
    meta: { title: '商品详情', isTab: false, isShowNav: true, isShowBack: true }
  },
  {
    path: '/chat',
    component: () => import('../pages/Chat.vue'),
    name: 'chat',
    meta: { title: '在线客服', isTab: false, isShowNav: true, isShowBack: true }
  },
  {
    path: '/search',
    component: () => import('../pages/Search.vue'),
    name: 'search',
    meta: { title: '搜索', isTab: false, isShowNav: true, isShowBack: true }
  },
  {
    path: '/order/confirm',
    component: () => import('../pages/OrderConfirm.vue'),
    name: 'orderConfirm',
    meta: { title: '确认订单', isTab: false, isShowNav: true, isShowBack: true }
  },
  {
    path: '/order/list',
    component: () => import('../pages/OrderList.vue'),
    name: 'orderList',
    meta: { title: '我的订单', isTab: false, isShowNav: true, isShowBack: true }
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('../pages/NotFound.vue'),
    name: 'notFound',
    meta: { title: '页面不存在', isTab: false, isShowNav: true, isShowBack: true }
  }
]
})

router.beforeEach((to, from, next) => {
  const title = to.meta && to.meta.title
  if (title) {
    document.title = title + ' - 微商城'
  }
  next()
}) 
export default router 
