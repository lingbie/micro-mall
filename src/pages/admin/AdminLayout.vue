<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-logo">M</div>
        <div class="brand-text">
          <b>微商城</b>
          <span>管理后台</span>
        </div>
      </div>
      <nav class="menu">
        <div
          v-for="item in menus"
          :key="item.path"
          class="menu-item"
          :class="{ active: isActive(item.path) }"
          @click="router.push(item.path)"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span>{{ item.title }}</span>
        </div>
      </nav>
    </aside>

    <!-- 主区域 -->
    <div class="main">
      <header class="topbar">
        <h3>{{ route.meta.title }}</h3>
        <div class="topbar-right">
          <span class="admin-name">管理员：{{ username }}</span>
          <van-button size="small" plain type="primary" @click="goShop">返回商城</van-button>
          <van-button size="small" plain type="danger" @click="onLogout">退出登录</van-button>
        </div>
      </header>
      <main class="content">
        <router-view></router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog } from 'vant'
import { clearAdminToken } from '../../api/admin'

const route = useRoute()
const router = useRouter()
const username = ref('admin')

const menus = [
  { path: '/admin/dashboard', title: '数据概览', icon: '📊' },
  { path: '/admin/goods', title: '商品管理', icon: '📦' },
  { path: '/admin/orders', title: '订单管理', icon: '🧾' },
  { path: '/admin/users', title: '用户管理', icon: '👥' }
]

const isActive = p => route.path.startsWith(p)

const goShop = () => router.push({ path: '/' })

const onLogout = async () => {
  try {
    await showConfirmDialog({ title: '提示', message: '确定退出管理后台吗？' })
    clearAdminToken()
    router.push({ path: '/admin/login' })
  } catch (e) {
    // 取消
  }
}

onMounted(() => {
  username.value = localStorage.getItem('myshop_admin_name') || 'admin'
})
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f7fa;
}
.sidebar {
  width: 220px;
  background: #1f2937;
  color: #e5e7eb;
  flex-shrink: 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.brand-logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #ff8000;
  color: #fff;
  font-weight: bold;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-text b {
  display: block;
  font-size: 16px;
}
.brand-text span {
  font-size: 12px;
  color: #9ca3af;
}
.menu {
  padding: 12px 8px;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  cursor: pointer;
  color: #d1d5db;
  font-size: 14px;
  margin-bottom: 4px;
  transition: background 0.2s;
}
.menu-item:hover {
  background: rgba(255, 255, 255, 0.06);
}
.menu-item.active {
  background: #ff8000;
  color: #fff;
}
.menu-icon {
  font-size: 16px;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}
.topbar h3 {
  margin: 0;
  font-size: 17px;
  color: #1f2937;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.admin-name {
  font-size: 13px;
  color: #6b7280;
  margin-right: 6px;
}
.content {
  flex: 1;
  padding: 20px 24px;
  overflow: auto;
}
</style>
