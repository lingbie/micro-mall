<template>
  <div class="goods-list">
    <van-list
      v-model:loading="loading"
      :finished="finished"
      finished-text="没有更多了"
      @load="onLoad"
    >
      <div class="goods-item" v-for="g in list" :key="g.id" @click="goDetail(g.id)">
        <van-image :src="g.pic_url" alt="" />
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
    <van-empty v-if="!loading && finished && list.length === 0" description="该分类暂无商品" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getGoodsList } from '../api'

const route = useRoute()
const router = useRouter()

const list = ref([])
const page = ref(1)
const pageSize = 8
const loading = ref(false)
const finished = ref(false)

const loadGoods = async () => {
  const res = await getGoodsList({
    categoryId: route.params.categoryId,
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
  loadGoods()
}

// 切换分类时重置列表
watch(
  () => route.params.categoryId,
  () => {
    list.value = []
    page.value = 1
    finished.value = false
    loading.value = false
    loadGoods()
  }
)

const goDetail = id => {
  router.push({ name: 'goodsDetail', params: { id } })
}
</script>

<style lang="less" scoped>
.goods-list {
  min-height: calc(100vh - 96px);
  background-color: #f5f5f5;
  padding: 10px;
  .goods-item {
    display: flex;
    background-color: #fff;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 10px;
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
        align-items: center;
        .price {
          color: #FF8000;
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
