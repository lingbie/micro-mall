<template>
  <div class="register">
    <div class="register-header">
      <h1>微商城</h1>
      <p>注册新账号</p>
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
      <van-cell-group>
        <van-field
          v-model="form.repassword"
          label="确认密码："
          placeholder="请再次输入密码"
          name="repassword"
          clearable
          type="password"
          :rules="repasswordRules"
        ></van-field>
      </van-cell-group>
      <van-cell-group>
        <van-button block round type="primary" native-type="submit" class="register-btn">注册</van-button>
      </van-cell-group>
    </van-form>
    <div class="to-login" @click="goLogin">已有账号？去登录</div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { register } from '../api'

const router = useRouter()

const form = reactive({
  username: '',
  password: '',
  repassword: ''
})

const ruleFormRef = ref()

const usernameRules = ref([
  { required: true, message: '用户名不能为空' },
  { pattern: /^\w{3,16}$/, message: '用户名长度为3-16个字符' }
])

const passwordRules = ref([
  { required: true, message: '密码不能为空' },
  { pattern: /^\w{6,24}$/, message: '密码必须为6-24位英文字母或数字' }
])

const repasswordRules = ref([
  { required: true, message: '请再次输入密码' },
  {
    validator: value => value === form.password,
    message: '两次输入的密码不一致'
  }
])

const submitForm = async values => {
  try {
    const res = await register({
      username: values.username,
      password: values.password
    })
    if (res) {
      showToast({
        message: '注册成功，请登录',
        type: 'success'
      })
      setTimeout(() => {
        router.push({ name: 'login' })
      }, 1500)
    }
  } catch (error) {
    showToast({
      message: '注册失败',
      type: 'error'
    })
  }
}

const onFailed = errorInfo => {
  console.log('failed', errorInfo)
}

const goLogin = () => {
  router.push({ name: 'login' })
}
</script>

<style lang="less" scoped>
.register {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 30px 20px;
  .register-header {
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
  .register-btn {
    background: linear-gradient(135deg, #FF8000 0%, #FFA500 100%);
    border: none;
    height: 44px;
    line-height: 44px;
    font-size: 16px;
    margin-top: 20px;
  }
  .to-login {
    text-align: center;
    margin-top: 24px;
    font-size: 14px;
    color: #FF8000;
  }
}
</style>
