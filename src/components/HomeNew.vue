<template> 
  <div class="home-new"> 
    <div class="home-new-title"> 
      <h3>每周上新</h3> 
    </div> 
    <ul> 
      <li v-for="item in newList" :key="item.id" @click="goDetail(item.id)"> 
        <van-image :src="item.pic_url" alt="" /> 
        <p>{{ item.name }}</p> 
        <p><span>￥</span>{{ item.price }}</p> 
      </li> 
    </ul> 
  </div> 
</template> 
 
<script setup> 
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getGoodsList } from '../api'

const router = useRouter()
const newList = ref([])

const goDetail = id => {
  router.push({ name: 'goodsDetail', params: { id } })
}

onMounted(async () => {
  // 获取最新 4 个商品（按 id 倒序，模拟"上新"）
  const res = await getGoodsList({ page: 1, pageSize: 4 })
  if (res && res.list) {
    newList.value = res.list
  }
})
</script> 
 
<style lang="less" scoped> 
.home-new { 
  .home-new-title { 
    text-align: center; 
    font-size: 16px; 
    margin-top: 1.6rem; 
    height: 50px; 
    h3 { 
      width: 50%; 
      border-top: 2px solid #ccc; 
      padding-top: 8px; 
      margin: 0 auto; 
    } 
  } 
  ul { 
    display: flex; 
    justify-content: space-between; 
    flex-wrap: wrap; 
    padding: 1rem 0 0; 
    background-color: #f9f9f9; 
    li { 
      width: 49.5%; 
      img { 
        width: 100%; 
      } 
      p { 
        text-align: center; 
        margin: 0.5rem 0; 
      } 
      span { 
        color: #FF8000; 
        font-size: 12px; 
      } 
    } 
  } 
} 
</style>