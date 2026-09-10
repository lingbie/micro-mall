<template>
  <div class="not-found">
    <van-empty image="error" description="页面不存在或已被移除" />
    <van-button type="primary" round @click="goHome">返回首页</van-button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const goHome = () => router.replace({ name: 'home' })
</script>

<style scoped>
.not-found {
  padding: 80px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
</style>
