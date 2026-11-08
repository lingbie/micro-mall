<template> 
  <div class="home-product"> 
    <ul> 
      <li v-for="item in categoryList" :key="item.id" @click="goCategory(item.id)"> 
        <van-image :src="item.pic_url" alt="" /> 
        <h4>{{ item.name }}</h4> 
      </li> 
    </ul> 
  </div> 
</template> 
 
<script setup> 
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCategoryList } from '../api'

const router = useRouter()
const categoryList = ref([])

const goCategory = categoryId => {
  router.push({ name: 'goodslist', params: { categoryId } })
}

onMounted(async () => {
  // 获取一级分类（前 4 个）
  const res = await getCategoryList()
  if (res && res.length) {
    categoryList.value = res.slice(0, 4).map(c => ({
      id: c.id,
      name: c.name,
      pic_url: c.children?.[0]?.pic_url || '/images/product1.png'
    }))
  }
})
</script> 
 
<style lang="less" scoped> 
.home-product > ul { 
  display: flex; 
  justify-content: space-between; 
  flex-wrap: wrap; 
  li { 
    width: 49.5%; 
    position: relative; 
    img { 
      width: 100%; 
    } 
    h4 { 
      font-size: 14px; 
      position: absolute; 
      left: 2px; 
      top: -13px; 
      background-color: red; 
      color: #fff; 
      border-radius: 10%; 
      padding: 1px 3px; 
    } 
  } 
} 
</style>