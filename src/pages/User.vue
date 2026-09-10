<template>
  <div class="user">
    <div class="user-header" v-if="userStore.user.isLogin">
      <van-image :src="userStore.user.avatar || defaultAvatar" class="avatar" />
      <div class="user-info">
        <h3>{{ userStore.user.username }}</h3>
        <p>普通会员</p>
      </div>
      <van-button type="primary" size="small" round @click="goEditProfile">编辑资料</van-button>
    </div>
    <div class="user-header" v-else>
      <van-image :src="defaultAvatar" class="avatar" />
      <div class="user-info">
        <h3>登录享更多权益</h3>
        <p>立即登录</p>
      </div>
      <van-button type="primary" size="small" round @click="goLogin">登录</van-button>
    </div>
    <van-cell-group class="order-group">
      <van-cell title="我的订单" value="查看全部" is-link @click="goOrder">
        <template #icon>
          <van-icon name="list-o" />
        </template>
      </van-cell>
      <div class="order-icons">
        <div class="order-item" @click="goOrderByStatus(0)">
          <van-icon name="paid" />
          <span>待付款</span>
        </div>
        <div class="order-item" @click="goOrderByStatus(1)">
          <van-icon name="package" />
          <span>待发货</span>
        </div>
        <div class="order-item" @click="goOrderByStatus(2)">
          <van-icon name="truck" />
          <span>已完成</span>
        </div>
        <div class="order-item" @click="goOrderByStatus(3)">
          <van-icon name="refresh" />
          <span>已取消</span>
        </div>
      </div>
    </van-cell-group>
    <van-cell-group class="menu-group">
      <van-cell icon="gift-o" title="优惠券" value="敬请期待" is-link @click="devTip" />
      <van-cell icon="ticket-o" title="积分商城" value="敬请期待" is-link @click="devTip" />
      <van-cell icon="heart-o" title="我的收藏" is-link @click="devTip" />
      <van-cell icon="map-marker-o" title="收货地址" is-link @click="devTip" />
      <van-cell icon="settings-o" title="设置" is-link @click="devTip" />
    </van-cell-group>
    <van-cell-group class="menu-group">
      <van-cell icon="headphones-o" title="客服中心" is-link @click="openService" />
      <van-cell icon="info-o" title="关于我们" is-link @click="about" />
    </van-cell-group>
    <van-button v-if="userStore.user.isLogin" block type="danger" round @click="logout">退出登录</van-button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import useUser from '../stores/user'
import useToken from '../stores/tokens'
import defaultAvatar from '../assets/images/avatar_default.png'

const router = useRouter()
const userStore = useUser()
const tokenStore = useToken()

const goLogin = () => {
  router.push({ name: 'login' })
}

const goEditProfile = () => {
  showToast('编辑资料功能开发中')
}

const goOrder = () => {
  router.push({ name: 'orderList' })
}

const goOrderByStatus = status => {
  router.push({ name: 'orderList', query: { status } })
}

const devTip = () => {
  showToast('功能开发中，敬请期待')
}

const openService = () => {
  window.dispatchEvent(new Event('open-customer-service'))
}

const about = () => {
  showToast('微商城 v1.0 · 基于 Vue3 + Express + MySQL')
}

const logout = () => {
  userStore.removeUser()
  tokenStore.removeToken()
  showToast({
    message: '退出成功',
    type: 'success'
  })
  router.push({ name: 'user' })
}
</script>

<style lang="less" scoped>
.user {
  min-height: calc(100vh - 130px);
  background-color: #f5f5f5;
  padding-bottom: 20px;
  .user-header {
    display: flex;
    align-items: center;
    padding: 30px 20px;
    background: linear-gradient(135deg, #FF8000 0%, #FFA500 100%);
    color: #fff;
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.5);
      margin-right: 15px;
    }
    .user-info {
      flex: 1;
      h3 {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      p {
        font-size: 12px;
        opacity: 0.8;
      }
    }
    .van-button {
      background-color: #fff;
      color: #FF8000;
      border: none;
    }
  }
  .order-group {
    margin: 15px;
    background-color: #fff;
    border-radius: 8px;
    overflow: hidden;
    .order-icons {
      display: flex;
      justify-content: space-around;
      padding: 15px 0;
      border-top: 1px solid #f0f0f0;
      .order-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        .van-icon {
          font-size: 24px;
          color: #666;
          margin-bottom: 5px;
        }
        span {
          font-size: 12px;
          color: #666;
        }
      }
    }
  }
  .menu-group {
    margin: 15px;
    background-color: #fff;
    border-radius: 8px;
    overflow: hidden;
    .van-cell {
      &::after {
        border-bottom: 1px solid #f0f0f0;
      }
      &:last-child::after {
        border-bottom: none;
      }
    }
  }
}
</style>