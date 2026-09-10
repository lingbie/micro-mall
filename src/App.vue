<template>
  <van-nav-bar
    :title="$route.meta.title"
    v-show="$route.meta.isShowNav"
    @click-left="onClickLeft"
    :left-arrow="$route.meta.isShowBack"
    fixed
    placeholder
    style="height: 46px"
  />
  <router-view></router-view>
  <tab-bar v-if="isShowTabbar"></tab-bar>
  <customer-service v-if="showFloatService"></customer-service>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TabBar from './components/TabBar.vue'
import CustomerService from './components/CustomerService.vue'
import useUser from './stores/user'
import useToken from './stores/tokens'
import { getUser } from './api'

const route = useRoute()
const router = useRouter()
const isShowTabbar = ref(true)
const showFloatService = ref(true)

const onClickLeft = () => {
  if (history.length > 1) {
    router.back()
  } else {
    router.push({ name: 'home' })
  }
}

watch(
  () => route.meta,
  val => {
    isShowTabbar.value = val.isTab
    // 登录/注册等无导航页面不显示悬浮客服
    showFloatService.value = val.isShowNav !== false
  }
)

// 检查登录状态：本地有 token 时自动恢复用户信息
onMounted(async () => {
  const { token } = useToken()
  if (token) {
    const res = await getUser()
    if (res) {
      useUser().updateUser({
        isLogin: true,
        username: res.username,
        avatar: res.avatar
      })
    }
  }
})
</script>

<style>
#app {
  color: #2c3e50;
  line-height: 24px;
  --van-nav-bar-background: #ff8000;
  --van-nav-bar-title-text-color: #fff;
  --van-nav-bar-icon-color: #fff;
}
</style>
