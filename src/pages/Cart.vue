<template>
  <div class="cart">
    <div v-if="cartList.length === 0" class="empty-cart">
      <van-empty image="shopping-cart" description="购物车是空的" />
      <van-button type="primary" round class="go-shopping" @click="goShopping">去购物</van-button>
    </div>
    <van-checkbox-group v-model="checkedGoods" v-else>
      <van-cell-group>
        <van-swipe-cell v-for="item in cartList" :key="item.id">
          <van-cell :border="false" class="cart-item">
            <van-checkbox :name="item.id" />
            <van-image :src="item.pic_url" class="item-image" />
            <div class="item-info">
              <h4>{{ item.name }}</h4>
              <p class="item-desc">{{ item.desc }}</p>
              <div class="item-bottom">
                <span class="item-price">¥{{ item.price }}</span>
                <van-stepper v-model="item.quantity" :min="1" @change="onQuantityChange(item)" />
              </div>
            </div>
          </van-cell>
          <template #right>
            <van-button square text="删除" type="danger" class="delete-btn" @click="deleteItem(item.id)" />
          </template>
        </van-swipe-cell>
      </van-cell-group>
      <div class="cart-footer">
        <van-checkbox v-model="isAllChecked" @change="onCheckAll">全选</van-checkbox>
        <div class="footer-right">
          <span class="total-text">合计:</span>
          <span class="total-price">¥{{ totalPrice }}</span>
          <van-button type="primary" round class="submit-btn" @click="submitOrder">结算({{ totalCount }})</van-button>
        </div>
      </div>
    </van-checkbox-group>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getCartList, removeCart, updateCart } from '../api'
import useCart from '../stores/cart'

const router = useRouter()
const cartStore = useCart()
const cartList = ref([])
const checkedGoods = ref([])

const loadCart = async () => {
  const res = await getCartList()
  cartList.value = res || []
  // 同步购物车角标（服务端结构，含 quantity）
  cartStore.setCart(cartList.value)
}

const isAllChecked = ref(false)

// 全选：勾选状态变化时同步选中列表
const onCheckAll = val => {
  checkedGoods.value = val ? cartList.value.map(item => item.id) : []
}

// 选中列表变化时反向同步全选状态
watch(
  checkedGoods,
  val => {
    isAllChecked.value =
      val.length === cartList.value.length && cartList.value.length > 0
  },
  { immediate: true }
)

const totalPrice = computed(() => {
  return cartList.value
    .filter(item => checkedGoods.value.includes(item.id))
    .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
    .toFixed(2)
})

const totalCount = computed(() => {
  return cartList.value
    .filter(item => checkedGoods.value.includes(item.id))
    .reduce((sum, item) => sum + item.quantity, 0)
})

let qtyTimer = null
const onQuantityChange = item => {
  // 乐观同步角标（cartList 已通过 v-model 反映最新数量）
  cartStore.setCart(cartList.value)
  // 防抖 400ms 后同步到后端，刷新不丢失
  clearTimeout(qtyTimer)
  qtyTimer = setTimeout(async () => {
    const res = await updateCart(item.id, item.quantity)
    if (res) {
      cartList.value = res
      cartStore.setCart(res)
    } else {
      showToast('数量更新失败')
    }
  }, 400)
}

const deleteItem = async id => {
  const res = await removeCart(id)
  if (res) {
    cartList.value = res
    cartStore.setCart(res)
    checkedGoods.value = checkedGoods.value.filter(gid => gid !== id)
  }
}

const submitOrder = () => {
  if (!checkedGoods.value.length) return showToast('请先勾选要结算的商品')
  router.push({ name: 'orderConfirm', query: { ids: checkedGoods.value.join(',') } })
}

const goShopping = () => {
  router.push({ name: 'home' })
}

onMounted(() => {
  loadCart()
})
</script>

<style lang="less" scoped>
.cart {
  min-height: calc(100vh - 130px);
  background-color: #f5f5f5;
  .empty-cart {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    .go-shopping {
      margin-top: 20px;
      width: 160px;
    }
  }
  .cart-item {
    display: flex;
    align-items: center;
    padding: 10px;
    background-color: #fff;
    margin-bottom: 0;
    .van-checkbox {
      margin-right: 10px;
    }
    .item-image {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      margin-right: 10px;
    }
    .item-info {
      flex: 1;
      h4 {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 5px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .item-desc {
        font-size: 12px;
        color: #999;
        margin-bottom: 10px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .item-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        .item-price {
          color: #FF8000;
          font-weight: bold;
          font-size: 16px;
        }
      }
    }
  }
  .delete-btn {
    height: 100%;
  }
  .cart-footer {
    position: fixed;
    bottom: 50px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background-color: #fff;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    .footer-right {
      display: flex;
      align-items: center;
      .total-text {
        font-size: 14px;
        color: #666;
      }
      .total-price {
        color: #FF8000;
        font-weight: bold;
        font-size: 18px;
        margin: 0 10px;
      }
      .submit-btn {
        width: 100px;
      }
    }
  }
}
</style>
