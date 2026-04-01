<template>
  <div class="product-detail">
    <van-nav-bar title="产品详情" left-arrow @click-left="$router.back()" />
    <van-loading v-if="loading" class="loading" />
    <template v-else-if="product">
      <van-image
        :src="product.image_url || 'https://via.placeholder.com/400x300?text=授权码'"
        width="100%"
        height="250"
        fit="cover"
      />
      <div class="info-section">
        <div class="product-name">{{ product.name }}</div>
        <div class="product-price">¥{{ (product.price / 100).toFixed(2) }}</div>
        <van-divider />
        <van-cell-group inset>
          <van-stepper v-model="quantity" :min="1" :max="10" theme="round" />
        </van-cell-group>
        <div class="commission-info">
          <van-tag type="success">一级推荐奖励 ¥{{ (product.commission_l1 / 100).toFixed(2) }}</van-tag>
          <van-tag type="warning" style="margin-left: 8px;">二级推荐奖励 ¥{{ (product.commission_l2 / 100).toFixed(2) }}</van-tag>
        </div>
      </div>
      <div class="bottom-bar">
        <div class="total">合计: <span class="total-price">¥{{ ((product.price * quantity) / 100).toFixed(2) }}</span></div>
        <van-button type="primary" round @click="handleBuy" :loading="buying">立即购买</van-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { getProduct, createOrder, payOrder } from '../api'
import { useUserStore } from '../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const product = ref<any>(null)
const loading = ref(true)
const quantity = ref(1)
const buying = ref(false)

onMounted(async () => {
  try {
    const res = await getProduct(Number(route.params.id))
    product.value = res.data
  } finally {
    loading.value = false
  }
})

async function handleBuy() {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  buying.value = true
  try {
    const orderRes = await createOrder({
      code_type_id: product.value.id,
      quantity: quantity.value,
    })
    await showConfirmDialog({
      title: '确认支付',
      message: `订单金额: ¥${((product.value.price * quantity.value) / 100).toFixed(2)}`,
    })
    await payOrder(orderRes.data.id)
    showToast('购买成功！')
    router.push(`/orders/${orderRes.data.id}`)
  } catch (e: any) {
    if (e !== 'cancel' && e?.message !== 'cancel') {
      // Error already handled by interceptor
    }
  } finally {
    buying.value = false
  }
}
</script>

<style scoped>
.loading {
  display: flex;
  justify-content: center;
  padding: 60px;
}
.info-section {
  padding: 16px;
}
.product-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}
.product-price {
  font-size: 24px;
  font-weight: 700;
  color: #ee0a24;
  margin-top: 8px;
}
.commission-info {
  margin-top: 16px;
}
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 750px;
  margin: 0 auto;
  background: #fff;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}
.total-price {
  font-size: 20px;
  font-weight: 600;
  color: #ee0a24;
}
</style>
