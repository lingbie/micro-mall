<template>
  <div class="order-list">
    <van-tabs v-model:active="activeStatus" @change="onTabChange" sticky>
      <van-tab v-for="t in tabs" :key="t.value" :title="t.label" :name="t.value" />
    </van-tabs>

    <div v-if="!loading && orders.length === 0" class="empty">
      <van-empty :description="emptyText" />
      <van-button type="primary" round @click="goHome">去逛逛</van-button>
    </div>

    <div v-for="order in orders" :key="order.id" class="order-card">
      <div class="order-head">
        <span class="order-no">订单号 {{ order.order_no }}</span>
        <span class="status" :class="'s' + order.status">{{ order.status_text }}</span>
      </div>
      <div class="order-goods">
        <div class="goods-row" v-for="item in order.items" :key="item.id">
          <img :src="item.pic_url" alt="" />
          <div class="info">
            <h4>{{ item.goods_name }}</h4>
            <div class="row">
              <span class="price">¥{{ item.price }}</span>
              <span class="qty">×{{ item.quantity }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="order-foot">
        <span class="time">{{ formatTime(order.created_at) }}</span>
        <span class="amount">共 {{ order.items.reduce((s, i) => s + i.quantity, 0) }} 件 合计 ¥{{ order.total_amount }}</span>
      </div>
      <div class="order-actions">
        <template v-if="order.status === 0">
          <van-button size="small" round plain @click="onCancel(order)">取消订单</van-button>
          <van-button size="small" round type="primary" @click="onPay(order)">去支付</van-button>
        </template>
        <van-button v-else-if="order.status === 1" size="small" round type="primary" @click="onConfirm(order)">确认收货</van-button>
      </div>
    </div>

    <div v-if="loading" class="loading-tip">加载中...</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { getOrderList, payOrder, cancelOrder, confirmOrder } from '../api'

const route = useRoute()
const router = useRouter()

const tabs = [
  { label: '全部', value: 'all' },
  { label: '待付款', value: '0' },
  { label: '待发货', value: '1' },
  { label: '已完成', value: '2' },
  { label: '已取消', value: '3' }
]

const activeStatus = ref('all')
const orders = ref([])
const allOrders = ref([])
const loading = ref(false)

const formatTime = t => {
  if (!t) return ''
  const d = new Date(t)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const emptyText = computed(() => {
  const t = tabs.find(i => i.value === activeStatus.value)
  return t && t.label !== '全部' ? `暂无${t.label}订单` : '暂无订单'
})

const load = async () => {
  loading.value = true
  const res = await getOrderList()
  allOrders.value = res || []
  applyFilter()
  loading.value = false
}

const applyFilter = () => {
  orders.value =
    activeStatus.value === 'all'
      ? allOrders.value
      : allOrders.value.filter(o => String(o.status) === activeStatus.value)
}

const onTabChange = () => applyFilter()

const onPay = async order => {
  const res = await payOrder(order.id)
  if (res) {
    showToast({ message: '支付成功', type: 'success' })
    load()
  }
}

const onCancel = async order => {
  await showConfirmDialog({ title: '提示', message: '确定取消该订单吗？取消后库存将释放。' })
  const res = await cancelOrder(order.id)
  if (res) {
    showToast({ message: '订单已取消', type: 'success' })
    load()
  }
}

const onConfirm = async order => {
  await showConfirmDialog({ title: '提示', message: '确认已收到货？' })
  const res = await confirmOrder(order.id)
  if (res) {
    showToast({ message: '确认收货成功', type: 'success' })
    load()
  }
}

const goHome = () => router.push({ name: 'home' })

onMounted(() => {
  const s = route.query.status
  if (s && ['0', '1', '2', '3'].includes(String(s))) activeStatus.value = String(s)
  load()
})
</script>

<style lang="less" scoped>
.order-list {
  min-height: calc(100vh - 46px);
  background: #f5f5f5;
  .empty {
    padding: 60px 20px;
  }
  .order-card {
    background: #fff;
    margin: 10px;
    border-radius: 8px;
    overflow: hidden;
    .order-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      border-bottom: 1px solid #f5f5f5;
      .order-no {
        font-size: 12px;
        color: #999;
      }
      .status {
        font-size: 13px;
        font-weight: 600;
        &.s0 { color: #ff8000; }
        &.s1 { color: #1677ff; }
        &.s2 { color: #07c160; }
        &.s3 { color: #999; }
      }
    }
    .order-goods {
      .goods-row {
        display: flex;
        padding: 10px 14px;
        img {
          width: 64px;
          height: 64px;
          border-radius: 6px;
          margin-right: 10px;
        }
        .info {
          flex: 1;
          h4 {
            font-size: 14px;
            color: #333;
            margin: 0 0 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .row {
            display: flex;
            justify-content: space-between;
            .price { color: #ff8000; font-weight: bold; }
            .qty { color: #999; font-size: 13px; }
          }
        }
      }
    }
    .order-foot {
      display: flex;
      justify-content: space-between;
      padding: 8px 14px;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #f5f5f5;
    }
    .order-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 0 14px 12px;
    }
  }
  .loading-tip {
    text-align: center;
    color: #999;
    font-size: 13px;
    padding: 16px;
  }
}
</style>
