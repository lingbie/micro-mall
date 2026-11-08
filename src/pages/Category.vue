<template>
  <div class="category">
    <!-- 左侧一级分类 -->
    <div class="left" ref="leftRef">
      <ul class="left-list">
        <li
          v-for="(item, index) in categoryList"
          :key="item.id"
          :class="{ active: index === activeKey }"
          @click="selectLeft(index)"
        >{{ item.name }}</li>
      </ul>
    </div>
    <!-- 右侧二级分类：只显示当前选中一级分类的内容（京东式交互，避免连续长列表滚动错位感） -->
    <div class="right">
      <div class="right-content" v-if="currentCat">
        <div class="title">{{ currentCat.name }}</div>
        <div class="grid">
          <div class="grid-item" v-for="g in currentCat.children" :key="g.id" :data-id="g.id">
            <img :src="g.pic_url" alt="" />
            <span>{{ g.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import BScroll from '@better-scroll/core'
import { getCategoryList } from '../api'

const router = useRouter()
const categoryList = ref([])
const activeKey = ref(0)
const leftRef = ref()

let leftScroll = null

// 当前选中的一级分类（右侧只渲染这一个）
const currentCat = computed(() => categoryList.value[activeKey.value] || null)

const selectLeft = index => {
  activeKey.value = index
}

const goGoodsList = categoryId => {
  router.push({ name: 'goodslist', params: { categoryId } })
}

// 右侧区域用原生滚动渲染，点击 grid-item 直接跳转（不再依赖 BetterScroll 的 click 转发）
const onGridClick = e => {
  const item = e.target && e.target.closest ? e.target.closest('.grid-item') : null
  if (item && item.dataset.id) {
    goGoodsList(item.dataset.id)
  }
}

onMounted(async () => {
  document.addEventListener('click', onGridClick, true)
  const res = await getCategoryList()
  categoryList.value = res || []
  await nextTick()
  leftScroll = new BScroll(leftRef.value, { click: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onGridClick, true)
  if (leftScroll) { leftScroll.destroy(); leftScroll = null }
})
</script>

<style lang="less" scoped>
.category {
  display: flex;
  height: calc(100vh - 96px);
  background-color: #fff;
  .left {
    width: 25%;
    height: 100%;
    overflow: hidden;
    background-color: #f5f5f5;
    .left-list {
      padding: 0;
      margin: 0;
      li {
        padding: 15px 8px;
        text-align: center;
        font-size: 13px;
        color: #666;
        list-style: none;
        &.active {
          background-color: #fff;
          color: #FF8000;
          font-weight: bold;
          border-left: 3px solid #FF8000;
        }
      }
    }
  }
  .right {
    flex: 1;
    height: 100%;
    overflow-y: auto;
    .right-content {
      padding: 10px;
      .title {
        font-size: 14px;
        font-weight: bold;
        color: #333;
        padding: 8px 0;
      }
      .grid {
        display: flex;
        flex-wrap: wrap;
        .grid-item {
          width: 33.33%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 4px;
          cursor: pointer;
          img {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            margin-bottom: 5px;
          }
          span {
            font-size: 12px;
            color: #333;
          }
        }
      }
    }
  }
}
</style>
