<template>
  <div class="goods-page">
    <!-- 工具栏 -->
    <div class="toolbar">
      <van-field
        v-model="keyword"
        placeholder="搜索商品名称 / 描述"
        clearable
        class="search-input"
        @keyup.enter="onSearch"
      >
        <template #button>
          <van-button size="small" type="primary" @click="onSearch">搜索</van-button>
        </template>
      </van-field>
      <div class="toolbar-right">
        <span class="total-text">共 {{ total }} 个商品</span>
      </div>
    </div>

    <!-- 商品表格 -->
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 60px">ID</th>
            <th style="width: 70px">图片</th>
            <th>名称</th>
            <th style="width: 110px">分类</th>
            <th style="width: 100px">价格(元)</th>
            <th style="width: 90px">库存</th>
            <th style="width: 90px">销量</th>
            <th style="width: 90px">状态</th>
            <th style="width: 170px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in list" :key="g.id">
            <td>{{ g.id }}</td>
            <td>
              <img :src="g.pic_url" class="thumb" alt="" />
            </td>
            <td class="name-cell">{{ g.name }}</td>
            <td>{{ g.category_name || '-' }}</td>
            <td class="price-cell">{{ Number(g.price).toFixed(2) }}</td>
            <td>{{ g.stock }}</td>
            <td>{{ g.sales }}</td>
            <td>
              <span class="tag" :class="g.status === 1 ? 'tag-on' : 'tag-off'">
                {{ g.status === 1 ? '上架中' : '已下架' }}
              </span>
            </td>
            <td>
              <van-button size="mini" type="primary" plain @click="openEdit(g)">编辑</van-button>
              <van-button
                size="mini"
                :type="g.status === 1 ? 'warning' : 'success'"
                plain
                @click="toggleStatus(g)"
              >
                {{ g.status === 1 ? '下架' : '上架' }}
              </van-button>
            </td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="9" class="empty-cell">暂无商品</td>
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

    <!-- 编辑弹窗 -->
    <van-dialog
      v-model:show="showEdit"
      title="编辑商品"
      show-cancel-button
      confirm-button-text="保存"
      @confirm="saveEdit"
    >
      <div class="edit-form">
        <van-field v-model="editForm.name" label="名称" placeholder="商品名称" />
        <van-field v-model="editForm.price" label="价格(元)" type="number" placeholder="0.00" />
        <van-field v-model="editForm.stock" label="库存" type="number" placeholder="0" />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { adminGoodsList, adminUpdateGoods } from '../../api/admin'

const keyword = ref('')
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 10

const showEdit = ref(false)
const editForm = ref({ id: null, name: '', price: '', stock: '' })

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const load = async () => {
  const res = await adminGoodsList({ page: page.value, pageSize, keyword: keyword.value })
  if (res) {
    list.value = res.list
    total.value = res.total
  }
}

const onSearch = () => {
  page.value = 1
  load()
}

const goPage = p => {
  page.value = p
  load()
}

const openEdit = g => {
  editForm.value = { id: g.id, name: g.name, price: String(g.price), stock: String(g.stock) }
  showEdit.value = true
}

const saveEdit = async () => {
  const name = (editForm.value.name || '').trim()
  const price = Number(editForm.value.price)
  const stock = Number(editForm.value.stock)
  if (!name) return showToast({ message: '名称不能为空', type: 'fail' })
  if (!(price > 0)) return showToast({ message: '价格不合法', type: 'fail' })
  if (!Number.isInteger(stock) || stock < 0) return showToast({ message: '库存不合法', type: 'fail' })
  const res = await adminUpdateGoods(editForm.value.id, { name, price, stock })
  if (res) {
    showToast({ message: '保存成功', type: 'success' })
    load()
  }
}

const toggleStatus = async g => {
  const target = g.status === 1 ? 0 : 1
  try {
    await showConfirmDialog({
      title: '提示',
      message: `确定${target === 1 ? '上架' : '下架'}「${g.name}」吗？`
    })
    const res = await adminUpdateGoods(g.id, { status: target })
    if (res) {
      showToast({ message: target === 1 ? '已上架' : '已下架', type: 'success' })
      load()
    }
  } catch (e) {
    // 取消
  }
}

onMounted(load)
</script>

<style scoped>
.goods-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.search-input {
  max-width: 420px;
  background: #fff;
  border-radius: 8px;
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
.thumb {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}
.name-cell {
  color: #1f2937;
}
.price-cell {
  color: #ff8000;
  font-weight: 600;
}
.tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
}
.tag-on {
  background: #ecfdf5;
  color: #10b981;
}
.tag-off {
  background: #f3f4f6;
  color: #6b7280;
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
.edit-form {
  padding: 6px 12px 12px;
}
</style>
