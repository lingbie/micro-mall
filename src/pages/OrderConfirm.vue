<template>
  <div class="order-confirm">
    <div v-if="items.length === 0" class="empty">
      <van-empty description="没有待结算的商品" />
      <van-button type="primary" round block @click="goCart">返回购物车</van-button>
    </div>
    <template v-else>
      <!-- 收货信息 -->
      <div class="block">
        <div class="block-title">收货信息</div>
        <van-field v-model="receiver.name" label="收货人" placeholder="请输入姓名" maxlength="20" />
        <van-field v-model="receiver.phone" label="手机号" type="tel" placeholder="请输入手机号" maxlength="11" />
        <van-field
          v-model="receiver.address"
          label="收货地址"
          type="textarea"
          rows="2"
          autosize
          placeholder="省市区 + 详细地址"
          maxlength="120"
          show-word-limit
        />
        <van-field v-model="remark" label="备注" placeholder="选填，给商家留言" maxlength="50" />
      </div>

      <!-- 商品清单 -->
      <div class="block">
        <div class="block-title">商品清单</div>
        <div class="goods-item" v-for="item in items" :key="item.id">
          <img :src="item.pic_url" alt="" />
          <div class="info">
            <h4>{{ item.name }}</h4>
            <div class="row">
              <span class="price">¥{{ item.price }}</span>
              <span class="qty">×{{ item.quantity }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="amount">合计：<span class="total">¥{{ totalPrice }}</span></div>

      <div class="footer">
        <van-button type="primary" round block :loading="submitting" @click="submit">提交订单</van-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getCartList, createOrder, removeCart } from '../api'
import useCart from '../stores/cart'

const route = useRoute()
const router = useRouter()
const cartStore = useCart()

const items = ref([])
const receiver = ref({ name: '', phone: '', address: '' })
const remark = ref('')
const submitting = ref(false)

const totalPrice = computed(() =>
  items.value
    .reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0)
    .toFixed(2)
)

onMounted(async () => {
  const ids = String(route.query.ids || '')
    .split(',')
    .map(Number)
    .filter(Boolean)
  if (!ids.length) return
  const res = await getCartList()
  items.value = (res || []).filter(i => ids.includes(i.id))
})

const submit = async () => {
  if (!receiver.value.name.trim()) return showToast('请填写收货人姓名')
  if (!/^1\d{10}$/.test(receiver.value.phone)) return showToast('请填写正确的手机号')
  if (receiver.value.address.trim().length < 5) return showToast('请填写详细收货地址')
  submitting.value = true
  const res = await createOrder({
    items: items.value.map(i => ({ goods_id: i.goods_id, quantity: i.quantity })),
    receiver: {
      name: receiver.value.name.trim(),
      phone: receiver.value.phone.trim(),
      address: receiver.value.address.trim()
    },
    remark: remark.value.trim()
  })
  submitting.value = false
  if (res) {
    // 下单成功，删除购物车中已结算的项，并用服务端返回的最新列表同步角标
    for (const item of items.value) {
      const delRes = await removeCart(item.id)
      if (delRes) cartStore.setCart(delRes)
    }
    showToast({ message: '下单成功', type: 'success' })
    setTimeout(() => router.replace({ name: 'orderList' }), 800)
  }
}

const goCart = () => router.push({ name: 'cart' })
</script>

<style lang="less" scoped>
.order-confirm {
  min-height: calc(100vh - 46px);
  background: #f5f5f5;
  padding-bottom: 80px;
  .empty {
    padding: 60px 20px;
  }
  .block {
    background: #fff;
    margin: 10px;
    border-radius: 8px;
    overflow: hidden;
    .block-title {
      font-size: 14px;
      font-weight: bold;
      color: #333;
      padding: 12px 14px 0;
    }
    .goods-item {
      display: flex;
      padding: 10px 14px;
      img {
        width: 72px;
        height: 72px;
        border-radius: 6px;
        margin-right: 10px;
      }
      .info {
        flex: 1;
        h4 {
          font-size: 14px;
          color: #333;
          margin: 2px 0 8px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          .price {
            color: #ff8000;
            font-weight: bold;
          }
          .qty {
            color: #999;
            font-size: 13px;
          }
        }
      }
    }
  }
  .amount {
    text-align: right;
    padding: 4px 14px;
    font-size: 14px;
    color: #333;
    .total {
      color: #ff8000;
      font-size: 20px;
      font-weight: bold;
    }
  }
  .footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
    background: #fff;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
  }
}
</style>
