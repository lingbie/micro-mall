<template>
  <div class="users-page">
    <div class="toolbar">
      <span class="total-text">共 {{ total }} 个注册用户</span>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 80px">ID</th>
            <th style="width: 90px">头像</th>
            <th>用户名</th>
            <th>注册时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in list" :key="u.id">
            <td>{{ u.id }}</td>
            <td>
              <img :src="u.avatar || '/images/avatar1.jpg'" class="avatar" alt="" />
            </td>
            <td class="name-cell">{{ u.username }}</td>
            <td>{{ fmtTime(u.created_at) }}</td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="4" class="empty-cell">暂无用户</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pager">
      <van-button size="small" :disabled="page <= 1" @click="goPage(page - 1)">上一页</van-button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <van-button size="small" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminUserList } from '../../api/admin'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 10

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const load = async () => {
  const res = await adminUserList({ page: page.value, pageSize })
  if (res) {
    list.value = res.list
    total.value = res.total
  }
}

const goPage = p => {
  page.value = p
  load()
}

const fmtTime = t => {
  if (!t) return '-'
  return String(t).replace('T', ' ').slice(0, 19)
}

onMounted(load)
</script>

<style scoped>
.users-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.toolbar {
  display: flex;
  justify-content: flex-end;
}
.total-text {
  font-size: 13px;
  color: #6b7280;
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
}
.data-table th {
  color: #6b7280;
  font-weight: 500;
  background: #fafafa;
}
.data-table tr:last-child td {
  border-bottom: none;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}
.name-cell {
  color: #1f2937;
  font-weight: 500;
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
