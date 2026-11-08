<template> 
<div class="home-top"> 
<h3>人气推荐</h3> 
<div class="content"> 
<van-card 
v-for="(item, index) in goodsList" 
:key="item.id" 
:tag="'TOP' + (index + 1)" 
:price="item.price" 
:desc="item.desc" 
:title="item.name" 
:thumb="item.pic_url" 
@click="goDetail(item.id)" 
> 
</van-card> 
</div> 

  </div> 
</template> 
 
<script setup> 
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getGoodsList } from '../api'

const router = useRouter()
const goodsList = ref([])

const goDetail = id => {
  router.push({ name: 'goodsDetail', params: { id } })
}

onMounted(async () => {
  // 获取热销商品（后端按 sales 排序）
  const res = await getGoodsList({ page: 1, pageSize: 5 })
  if (res && res.list) {
    goodsList.value = res.list
  }
})
</script> 
 
<style lang="less" scoped> 
.home-top { 
  h3 { 
    font-size: 22px; 
    line-height: 30px; 
    text-align: center; 
    margin: 0.5rem 0; 
  } 
  .content { 
    --van-tag-primary-color: #FF8000; 
    --van-card-font-size: 16px; 
    --van-card-background: #f9f9f9; 
    background: var(--van-card-background); 
    :deep(.van-card) { 
      margin-top: 0; 
      .van-card__title { 
        padding: 10px 0 5px; 
      } 
      .van-card__price-currency { 
        font-size: var(--van-card-font-size); 
      } 
    } 
    &::after { 
      content: ''; 
      display: block; 
      height: 3rem; 
    } 
  } 
} 
</style> 