<template> 
  <van-search 
    shape="round" 
    v-model="value" 
    placeholder="请输入搜索关键词" 
    @search="onSearch" 
    @cancel="onCancel" 
  > 
  </van-search> 
    <!-- 轮播图 --> 
  <home-swiper></home-swiper> 
    <!-- 功能按钮区 --> 
  <home-grid></home-grid> 
   <!-- 商品信息展示区 --> 
  <home-product></home-product> 
    <!-- 每周上新 --> 
  <home-new></home-new> 
   <!-- 人气推荐 --> 
  <home-top></home-top>
</template> 
 
<script setup> 
import HomeSwiper from '../components/HomeSwiper.vue'
import HomeGrid from '../components/HomeGrid.vue'
import HomeProduct from '../components/HomeProduct.vue'
import HomeNew from '../components/HomeNew.vue'
import HomeTop from '../components/HomeTop.vue'
import { ref } from 'vue' 
import { useRouter } from 'vue-router' 

const router = useRouter()
const value = ref('') 
const onSearch = val => {
  const kw = (val || value.value || '').trim()
  if (kw) router.push({ path: '/search', query: { kw } })
}
const onCancel = () => router.push({ path: '/search' })
</script>