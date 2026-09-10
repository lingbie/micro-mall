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
    <!-- 右侧二级分类 -->
    <div class="right" ref="rightRef">
      <div class="right-content">
        <div class="right-item" v-for="cat in categoryList" :key="cat.id">
          <div class="title">{{ cat.name }}</div>
          <div class="grid">
            <div class="grid-item" v-for="g in cat.children" :key="g.id" @click="goGoodsList(g.id)">
              <img :src="g.pic_url" alt="" />
              <span>{{ g.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import BScroll from '@better-scroll/core'
import { getCategoryList } from '../api'

const router = useRouter()
const categoryList = ref([])
const activeKey = ref(0)
const leftRef = ref()
const rightRef = ref()

let leftScroll = null
let rightScroll = null

const selectLeft = index => {
  activeKey.value = index
  // 右侧滚动到对应分类位置
  if (rightScroll) {
    const el = document.querySelectorAll('.right-item')[index]
    if (el) {
      rightScroll.scrollToElement(el, 300)
    }
  }
}

const goGoodsList = categoryId => {
  router.push({ name: 'goodslist', params: { categoryId } })
}

onMounted(async () => {
  const res = await getCategoryList()
  categoryList.value = res || []
  await nextTick()
  leftScroll = new BScroll(leftRef.value, { click: true })
  rightScroll = new BScroll(rightRef.value, { click: true, probeType: 3 })

onBeforeUnmount(() => {
  if (leftScroll) { leftScroll.destroy(); leftScroll = null }
  if (rightScroll) { rightScroll.destroy(); rightScroll = null }
})
  // 右侧滚动时联动左侧高亮
  rightScroll.on('scroll', () => {
    const list = document.querySelectorAll('.right-item')
    const y = -rightScroll.y
    let current = 0
    list.forEach((el, index) => {
      if (el.offsetTop <= y + 1) {
        current = index
      }
    })
    if (activeKey.value !== current) {
      activeKey.value = current
    }
  })
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
    overflow: hidden;
    .right-content {
      padding: 10px;
      position: relative;
      .right-item {
        margin-bottom: 10px;
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
}
</style>
