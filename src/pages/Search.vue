<template>
  <div class="search-page">
    <div class="search-bar">
      <van-search
        v-model="keyword"
        shape="round"
        placeholder="搜索商品名称/描述"
        autofocus
        @search="onSearch"
        @cancel="goBack"
      />
    </div>

    <van-list
      v-model:loading="loading"
      :finished="finished"
      finished-text="没有更多了"
      @load="onLoad"
    >
      <div class="goods-item" v-for="g in list" :key="g.id" @click="goDetail(g.id)">
        <img :src="g.pic_url" alt="" />
        <div class="info">
          <h4>{{ g.name }}</h4>
          <p class="desc">{{ g.desc }}</p>
          <div class="bottom">
            <span class="price">¥{{ g.price }}</span>
            <span class="sales">已售 {{ g.sales }}</span>
          </div>
        </div>
      </div>
    </van-list>
    <van-empty v-if="!loading && finished && list.length === 0" description="未找到相关商品" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getGoodsList } from '../api'

const route = useRoute()
const router = useRouter()
const keyword = ref('')
const list = ref([])
const page = ref(1)
const pageSize = 8
const loading = ref(false)
const finished = ref(false)
const searched = ref(false)

const loadGoods = async () => {
  if (!keyword.value.trim()) {
    finished.value = true
    loading.value = false
    return
  }
  const res = await getGoodsList({
    keyword: keyword.value.trim(),
    page: page.value,
    pageSize
  })
  if (res && res.list) {
    list.value = list.value.concat(res.list)
    finished.value = list.value.length >= res.total
    page.value++
  } else {
    finished.value = true
  }
  loading.value = false
}

const onLoad = () => {
  if (!searched.value) return
  loadGoods()
}

const onSearch = val => {
  const kw = (val || keyword.value || '').trim()
  if (!kw) return
  keyword.value = kw
  list.value = []
  page.value = 1
  finished.value = false
  searched.value = true
  loading.value = false
  loadGoods()
}

const goDetail = id => router.push({ name: 'goodsDetail', params: { id } })
const goBack = () => router.back()

onMounted(() => {
  const kw = String(route.query.kw || '').trim()
  if (kw) onSearch(kw)
})
</script>

<style lang="less" scoped>
.search-page {
  min-height: calc(100vh - 46px);
  background: #f5f5f5;
  .search-bar {
    background: #fff;
  }
  .goods-item {
    display: flex;
    background: #fff;
    border-radius: 8px;
    padding: 10px;
    margin: 10px;
    img {
      width: 90px;
      height: 90px;
      border-radius: 8px;
      margin-right: 10px;
      flex-shrink: 0;
    }
    .info {
      flex: 1;
      min-width: 0;
      h4 {
        font-size: 14px;
        color: #333;
        margin: 0 0 6px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .desc {
        font-size: 12px;
        color: #999;
        margin: 0 0 8px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .bottom {
        display: flex;
        justify-content: space-between;
        .price {
          color: #ff8000;
          font-weight: bold;
          font-size: 16px;
        }
        .sales {
          font-size: 12px;
          color: #999;
        }
      }
    }
  }
}
</style>
