<template>
  <div class="goods-detail">
    <van-swipe class="swipe" :autoplay="3000" indicator-color="white">
      <van-swipe-item v-for="(img, i) in album" :key="i">
        <img :src="img" alt="" />
      </van-swipe-item>
    </van-swipe>

    <div class="info-card" v-if="goods">
      <h3>{{ goods.name }}</h3>
      <p class="desc">{{ goods.desc }}</p>
      <div class="price-row">
        <span class="price">¥{{ goods.price }}</span>
        <span class="sales">已售 {{ goods.sales }} 件 · 库存 {{ goods.stock }} 件</span>
      </div>
    </div>

    <van-cell-group class="service-card">
      <van-cell title="服务" value="正品保障 · 七天无理由退换 · 极速发货" />
    </van-cell-group>

    <div class="detail-block">
      <div class="block-title">商品详情</div>
      <van-image v-for="(img, i) in album" :key="i" :src="img" fit="contain" class="detail-img" />
    </div>

    <!-- 底部操作栏 -->
    <van-action-bar>
      <van-action-bar-icon icon="cart-o" text="购物车" @click="goCart" />
      <van-action-bar-icon icon="star-o" text="收藏" disabled />
      <van-action-bar-button type="warning" text="加入购物车" @click="addToCart" />
      <van-action-bar-button type="danger" text="立即购买" @click="buyNow" />
    </van-action-bar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getGoodsDetail, getGoodsAlbum, addCart } from '../api'
import useCart from '../stores/cart'

const route = useRoute()
const router = useRouter()
const cartStore = useCart()

const goods = ref(null)
const album = ref([])

const loadDetail = async () => {
  const res = await getGoodsDetail(route.params.id)
  goods.value = res || null
  const albumRes = await getGoodsAlbum(route.params.id)
  album.value = albumRes || []
}

const addToCart = async () => {
  if (!goods.value) return
  // 仅发送后端需要的字段：id=商品id、quantity
  const res = await addCart({ id: goods.value.id, quantity: 1 })
  // 仅在接口成功时，用服务端返回的完整购物车列表覆盖本地角标
  // （修复：未登录/接口失败时不再虚增角标）
  if (res) {
    cartStore.setCart(res)
    showToast({
      message: '已加入购物车',
      type: 'success'
    })
  }
  return res
}

const buyNow = async () => {
  await addToCart()
  setTimeout(() => {
    router.push({ name: 'cart' })
  }, 1000)
}

const collect = () => {
  showToast('收藏功能开发中')
}

const goCart = () => {
  router.push({ name: 'cart' })
}

onMounted(() => {
  loadDetail()
})
</script>

<style lang="less" scoped>
.goods-detail {
  min-height: calc(100vh - 46px);
  background-color: #f5f5f5;
  padding-bottom: 60px;
  .swipe {
    height: 320px;
    background-color: #fff;
    img {
      width: 100%;
      height: 320px;
      object-fit: cover;
    }
  }
  .info-card {
    background-color: #fff;
    padding: 12px 14px;
    h3 {
      font-size: 16px;
      color: #333;
      margin: 0 0 6px;
    }
    .desc {
      font-size: 13px;
      color: #999;
      margin: 0 0 10px;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .price {
        color: #FF8000;
        font-size: 22px;
        font-weight: bold;
      }
      .sales {
        font-size: 12px;
        color: #999;
      }
    }
  }
  .service-card {
    margin-top: 10px;
  }
  .detail-block {
    background-color: #fff;
    margin-top: 10px;
    padding: 12px 14px;
    .block-title {
      font-size: 14px;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }
    .detail-img {
      width: 100%;
      margin-bottom: 8px;
      border-radius: 4px;
    }
  }
}
</style>
