<template>
  <div class="login">
    <div class="login-header">
      <h1>微商城</h1>
      <p>欢迎登录</p>
    </div>
    <van-form @submit="submitForm" @failed="onFailed" ref="ruleFormRef" :model="form">
      <van-cell-group>
        <van-field
          v-model="form.username"
          label="账号："
          placeholder="请输入账号"
          clearable
          name="username"
          :rules="usernameRules"
        ></van-field>
      </van-cell-group>
      <van-cell-group>
        <van-field
          v-model="form.password"
          label="密码："
          placeholder="请输入密码"
          name="password"
          clearable
          type="password"
          :rules="passwordRules"
        ></van-field>
      </van-cell-group>
      <div class="login-options">
        <van-checkbox v-model="isRemember">记住密码</van-checkbox>
        <van-button text type="primary" @click="goRegister">注册</van-button>
      </div>
      <van-cell-group>
        <van-button block round type="primary" native-type="submit" class="login-btn">登录</van-button>
      </van-cell-group>
      <div class="demo-info">
        <p>演示账号：demo1</p>
        <p>演示密码：123456</p>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import useToken from '../stores/tokens'
import useUser from '../stores/user'
import { login } from '../api'

const router = useRouter()
const { updateToken } = useToken()
const { updateUser } = useUser()

const form = reactive({
  username: '',
  password: ''
})

const isRemember = ref(false)
const ruleFormRef = ref()

const usernameRules = ref([
  { required: true, message: '用户名不能为空' },
  { pattern: /^\w{3,16}$/, message: '用户名长度为3-16个字符' }
])

const passwordRules = ref([
  { required: true, message: '密码不能为空' },
  { pattern: /^\w{6,24}$/, message: '密码必须为6-24位英文字母或数字' }
])

const submitForm = async values => {
  try {
    const res = await login({
      username: values.username,
      password: values.password
    })
    if (res) {
      const { token, user } = res
      updateToken(token)
      updateUser({
        isLogin: true,
        username: user.username,
        avatar: user.avatar
      })
      showToast({
        message: '登录成功',
        type: 'success'
      })
      setTimeout(() => {
        router.push({ name: 'user' })
      }, 1500)
    }
  } catch (error) {
    showToast({
      message: '登录失败',
      type: 'error'
    })
  }
}

const onFailed = errorInfo => {
  console.log('failed', errorInfo)
}

const goRegister = () => {
  router.push({ name: 'register' })
}
</script>

<style lang="less" scoped>
.login {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 30px 20px;
  .login-header {
    text-align: center;
    padding: 60px 0 40px;
    h1 {
      font-size: 32px;
      font-weight: bold;
      color: #FF8000;
      margin-bottom: 10px;
    }
    p {
      font-size: 14px;
      color: #999;
    }
  }
  .login-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    margin-bottom: 20px;
  }
  .login-btn {
    background: linear-gradient(135deg, #FF8000 0%, #FFA500 100%);
    border: none;
    height: 44px;
    line-height: 44px;
    font-size: 16px;
  }
  .demo-info {
    text-align: center;
    margin-top: 30px;
    p {
      font-size: 12px;
      color: #999;
      margin-bottom: 5px;
    }
  }
}
</style>
