<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <div class="cards">
      <div class="card">
        <div class="card-label">商品总数</div>
        <div class="card-value">{{ stats.goodsTotal ?? '-' }}</div>
        <div class="card-sub">上架中 {{ stats.goodsOn ?? '-' }} 件</div>
      </div>
      <div class="card">
        <div class="card-label">订单总数</div>
        <div class="card-value">{{ stats.orderTotal ?? '-' }}</div>
        <div class="card-sub">累计 {{ orderAllText }}</div>
      </div>
      <div class="card">
        <div class="card-label">注册用户</div>
        <div class="card-value">{{ stats.userTotal ?? '-' }}</div>
        <div class="card-sub">平台累计用户</div>
      </div>
      <div class="card">
        <div class="card-label">销售总额（元）</div>
        <div class="card-value money">{{ fmtMoney(stats.salesTotal) }}</div>
        <div class="card-sub">不含已取消订单</div>
      </div>
    </div>

    <!-- 订单状态分布 -->
    <div class="panel">
      <h4>订单状态分布</h4>
      <div class="status-row">
        <div
          v-for="s in statusList"
          :key="s.key"
          class="status-item"
          :style="{ borderColor: s.color }"
        >
          <div class="status-name">{{ s.name }}</div>
          <div class="status-count" :style="{ color: s.color }">
            {{ orderCount(s.key) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminStats } from '../../api/admin'

const stats = ref({})

const statusList = [
  { key: 0, name: '待付款', color: '#f59e0b' },
  { key: 1, name: '待发货', color: '#3b82f6' },
  { key: 2, name: '已完成', color: '#10b981' },
  { key: 3, name: '已取消', color: '#9ca3af' }
]

const orderAllText = computed(() => {
  const os = stats.value.orderStatus || {}
  return `待付款 ${os[0] || 0} · 待发货 ${os[1] || 0} · 已完成 ${os[2] || 0}`
})

const orderCount = key => (stats.value.orderStatus || {})[key] || 0

const fmtMoney = v => {
  if (v === undefined || v === null) return '-'
  return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

onMounted(async () => {
  const res = await adminStats()
  if (res) stats.value = res
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.card-label {
  font-size: 13px;
  color: #9ca3af;
}
.card-value {
  font-size: 30px;
  font-weight: bold;
  color: #1f2937;
  margin: 8px 0 6px;
}
.card-value.money {
  color: #ff8000;
}
.card-sub {
  font-size: 12px;
  color: #9ca3af;
}
.panel {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.panel h4 {
  margin: 0 0 16px;
  font-size: 15px;
  color: #1f2937;
}
.status-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.status-item {
  flex: 1;
  min-width: 140px;
  border: 1px solid #e5e7eb;
  border-top: 3px solid;
  border-radius: 8px;
  padding: 14px;
  text-align: center;
}
.status-name {
  font-size: 13px;
  color: #6b7280;
}
.status-count {
  font-size: 26px;
  font-weight: bold;
  margin-top: 6px;
}
</style>
