<template>
  <div class="admin-login-wrap">
    <div class="login-card">
      <div class="login-title">
        <h2>微商城管理后台</h2>
        <p>请使用管理员账号登录</p>
      </div>
      <van-field
        v-model="username"
        label="账号"
        placeholder="管理员用户名"
        clearable
      />
      <van-field
        v-model="password"
        type="password"
        label="密码"
        placeholder="登录密码"
        clearable
        @keyup.enter="onLogin"
      />
      <van-button
        type="primary"
        block
        :loading="loading"
        :disabled="!username || !password"
        @click="onLogin"
        style="margin-top: 18px"
      >
        登 录
      </van-button>
      <div class="back-link" @click="goHome">← 返回商城首页</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { adminLogin, setAdminToken } from '../../api/admin'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)

const goHome = () => router.push({ path: '/' })

const onLogin = async () => {
  if (!username.value || !password.value) return
  loading.value = true
  const res = await adminLogin({ username: username.value, password: password.value })
  loading.value = false
  if (res && res.token) {
    setAdminToken(res.token)
    showToast({ message: '登录成功', type: 'success' })
    router.push({ path: '/admin/dashboard' })
  }
}
</script>

<style scoped>
.admin-login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2f3e50 0%, #1f2937 100%);
  padding: 20px;
}
.login-card {
  width: 380px;
  max-width: 100%;
  background: #fff;
  border-radius: 12px;
  padding: 32px 28px 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}
.login-title {
  text-align: center;
  margin-bottom: 24px;
}
.login-title h2 {
  margin: 0 0 8px;
  font-size: 22px;
  color: #1f2937;
}
.login-title p {
  margin: 0;
  font-size: 13px;
  color: #9ca3af;
}
.back-link {
  margin-top: 18px;
  text-align: center;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
}
.back-link:hover {
  color: #1989fa;
}
</style>
