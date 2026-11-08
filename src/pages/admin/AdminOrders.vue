<template>
  <div class="orders-page">
    <!-- 状态筛选 -->
    <div class="filter-tabs">
      <span
        v-for="t in tabs"
        :key="t.value"
        class="filter-tab"
        :class="{ active: filterStatus === t.value }"
        @click="onFilter(t.value)"
      >
        {{ t.label }}
      </span>
    </div>

    <!-- 订单表格 -->
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 170px">订单号</th>
            <th style="width: 90px">用户</th>
            <th>收货人</th>
            <th style="width: 110px">金额(元)</th>
            <th style="width: 100px">状态</th>
            <th style="width: 150px">下单时间</th>
            <th style="width: 210px">操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="o in list" :key="o.id">
            <tr>
              <td>{{ o.order_no }}</td>
              <td>{{ o.username || '-' }}</td>
              <td>
                <div>{{ o.receiver_name }} {{ o.receiver_phone }}</div>
                <div class="addr">{{ o.receiver_address }}</div>
              </td>
              <td class="amount">{{ Number(o.total_amount).toFixed(2) }}</td>
              <td>
                <span class="tag" :class="'tag-' + o.status">{{ o.status_text }}</span>
              </td>
              <td>{{ fmtTime(o.created_at) }}</td>
              <td>
                <van-button size="mini" plain type="primary" @click="toggleItems(o.id)">明细</van-button>
                <van-button
                  v-if="o.status === 0"
                  size="mini"
                  plain
                  type="success"
                  @click="flow(o, 1)"
                >发货</van-button>
                <van-button
                  v-if="o.status === 1"
                  size="mini"
                  plain
                  type="success"
                  @click="flow(o, 2)"
                >完成</van-button>
                <van-button
                  v-if="o.status === 0"
                  size="mini"
                  plain
                  type="danger"
                  @click="flow(o, 3)"
                >取消</van-button>
              </td>
            </tr>
            <tr v-if="expanded === o.id" class="items-row">
              <td colspan="7">
                <div class="items-box">
                  <div v-for="it in o.items" :key="it.id" class="item-line">
                    <img :src="it.pic_url" alt="" class="item-thumb" />
                    <span class="item-name">{{ it.goods_name }}</span>
                    <span class="item-meta">¥{{ Number(it.price).toFixed(2) }} × {{ it.quantity }}</span>
                  </div>
                  <div v-if="!o.items || !o.items.length" class="items-empty">无商品明细</div>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!list.length">
            <td colspan="7" class="empty-cell">暂无订单</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pager">
      <van-button size="small" :disabled="page <= 1" @click="goPage(page - 1)">上一页</van-button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <van-button size="small" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { adminOrderList, adminUpdateOrderStatus } from '../../api/admin'

const tabs = [
  { value: '', label: '全部' },
  { value: 0, label: '待付款' },
  { value: 1, label: '待发货' },
  { value: 2, label: '已完成' },
  { value: 3, label: '已取消' }
]

const filterStatus = ref('')
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const expanded = ref(null)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const load = async () => {
  const params = { page: page.value, pageSize }
  if (filterStatus.value !== '') params.status = filterStatus.value
  const res = await adminOrderList(params)
  if (res) {
    list.value = res.list
    total.value = res.total
  }
}

const onFilter = v => {
  filterStatus.value = v
  page.value = 1
  load()
}

const goPage = p => {
  page.value = p
  load()
}

const toggleItems = id => {
  expanded.value = expanded.value === id ? null : id
}

const fmtTime = t => {
  if (!t) return '-'
  return String(t).replace('T', ' ').slice(0, 19)
}

const flow = async (o, target) => {
  const actionName = { 1: '发货', 2: '确认完成', 3: '取消订单' }[target]
  try {
    await showConfirmDialog({
      title: '提示',
      message: `确定对订单 ${o.order_no} 执行「${actionName}」吗？`
    })
    const res = await adminUpdateOrderStatus(o.id, target)
    if (res) {
      showToast({ message: `${actionName}成功`, type: 'success' })
      load()
    }
  } catch (e) {
    // 取消
  }
}

onMounted(load)
</script>

<style scoped>
.orders-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-tab {
  padding: 6px 18px;
  border-radius: 16px;
  background: #fff;
  color: #6b7280;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #e5e7eb;
}
.filter-tab.active {
  background: #ff8000;
  color: #fff;
  border-color: #ff8000;
}
.table-wrap {
  background: #fff;
  border-radius: 10px;
  padding: 4px 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th,
.data-table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
  white-space: nowrap;
  vertical-align: top;
}
.data-table th {
  color: #6b7280;
  font-weight: 500;
  background: #fafafa;
}
.data-table tr:last-child td {
  border-bottom: none;
}
.addr {
  font-size: 12px;
  color: #9ca3af;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.amount {
  color: #ff8000;
  font-weight: 600;
}
.tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
}
.tag-0 { background: #fef3c7; color: #b45309; }
.tag-1 { background: #dbeafe; color: #1d4ed8; }
.tag-2 { background: #ecfdf5; color: #10b981; }
.tag-3 { background: #f3f4f6; color: #6b7280; }
.items-row td {
  background: #fafafa;
  padding: 8px 14px;
}
.items-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item-line {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.item-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 6px;
}
.item-name {
  color: #1f2937;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-meta {
  color: #6b7280;
}
.items-empty {
  color: #9ca3af;
  font-size: 12px;
}
.empty-cell {
  text-align: center;
  color: #9ca3af;
  padding: 40px 0;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}
.page-info {
  font-size: 13px;
  color: #6b7280;
}
</style>
