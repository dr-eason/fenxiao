<template>
  <div class="product-detail">
    <van-nav-bar title="服务详情" left-arrow @click-left="$router.back()" />
    <van-loading v-if="loading" class="loading" />
    <template v-else-if="product">
      <!-- Header -->
      <div class="detail-header">
        <div class="header-icon">
          <van-image
            v-if="product.image_url"
            :src="product.image_url"
            width="64"
            height="64"
            round
            fit="cover"
          />
          <div v-else class="icon-placeholder">
            <van-icon name="gem-o" size="36" color="#fff" />
          </div>
        </div>
        <div class="header-name">{{ product.name }}</div>
        <div class="header-price">
          <span class="price-symbol">¥</span>
          <span class="price-value">{{ (product.price / 100).toFixed(2) }}</span>
        </div>
      </div>

      <!-- Service Info -->
      <van-cell-group inset style="margin: 16px;">
        <van-cell title="服务类型" value="授权订阅" icon="label-o" />
        <van-cell title="购买数量">
          <template #value>
            <van-stepper v-model="quantity" :min="1" :max="10" theme="round" />
          </template>
        </van-cell>
      </van-cell-group>

      <!-- Benefits -->
      <div class="section">
        <div class="section-title">购买权益</div>
        <van-cell-group inset>
          <van-cell icon="certificate" title="获得授权码" label="购买后立即获得对应数量的授权码" />
          <van-cell icon="friends-o" title="成为分销商" label="首次购买后自动获得分销资格，拥有专属推荐链接" />
          <van-cell icon="gold-coin-o" title="推荐奖励">
            <template #label>
              <div>一级推荐: <span class="highlight">¥{{ (product.commission_l1 / 100).toFixed(2) }}</span> / 单</div>
              <div>二级推荐: <span class="highlight">¥{{ (product.commission_l2 / 100).toFixed(2) }}</span> / 单</div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- Bottom Bar -->
      <div class="bottom-bar">
        <div class="total">
          合计:
          <span class="total-price">¥{{ ((product.price * quantity) / 100).toFixed(2) }}</span>
        </div>
        <van-button type="primary" round @click="handleBuy" :loading="buying">立即订阅</van-button>
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
      // Error handled by interceptor
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
.detail-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32px 16px;
  text-align: center;
  color: #fff;
}
.header-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}
.icon-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-name {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}
.header-price {
  margin-top: 4px;
}
.price-symbol {
  font-size: 16px;
}
.price-value {
  font-size: 36px;
  font-weight: 700;
}
.section {
  margin-top: 8px;
}
.section-title {
  padding: 12px 16px 4px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
.highlight {
  color: #ee0a24;
  font-weight: 600;
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
