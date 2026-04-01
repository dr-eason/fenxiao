<template>
  <div class="order-detail">
    <van-nav-bar title="订单详情" left-arrow @click-left="$router.back()" />
    <van-loading v-if="loading" class="loading" />
    <template v-else-if="detail">
      <van-cell-group inset style="margin: 12px 16px;">
        <van-cell title="订单号" :value="detail.order.order_no" />
        <van-cell title="产品" :value="detail.order.code_type_name" />
        <van-cell title="数量" :value="detail.order.quantity" />
        <van-cell title="金额" :value="`¥${(detail.order.total_price / 100).toFixed(2)}`" />
        <van-cell title="状态">
          <template #value>
            <van-tag :type="detail.order.status === 1 ? 'success' : 'warning'">
              {{ detail.order.status === 0 ? '待支付' : detail.order.status === 1 ? '已支付' : '已取消' }}
            </van-tag>
          </template>
        </van-cell>
      </van-cell-group>

      <div v-if="detail.codes.length > 0" class="codes-section">
        <h3 class="section-title">授权码</h3>
        <van-cell-group inset>
          <van-cell
            v-for="code in detail.codes"
            :key="code.id"
            :title="code.code"
            clickable
            @click="copyCode(code.code)"
          >
            <template #right-icon>
              <van-icon name="description" />
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <div v-if="detail.order.status === 0" style="padding: 24px 16px;">
        <van-button type="primary" block round @click="handlePay" :loading="paying">
          立即支付 ¥{{ (detail.order.total_price / 100).toFixed(2) }}
        </van-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getOrderDetail, payOrder } from '../api'

const route = useRoute()
const router = useRouter()
const detail = ref<any>(null)
const loading = ref(true)
const paying = ref(false)

async function loadDetail() {
  try {
    const res = await getOrderDetail(Number(route.params.id))
    detail.value = res.data
  } finally {
    loading.value = false
  }
}

async function handlePay() {
  paying.value = true
  try {
    await payOrder(detail.value.order.id)
    showToast('支付成功！')
    await loadDetail()
  } finally {
    paying.value = false
  }
}

function copyCode(code: string) {
  navigator.clipboard?.writeText(code)
  showToast('已复制')
}

onMounted(loadDetail)
</script>

<style scoped>
.loading {
  display: flex;
  justify-content: center;
  padding: 60px;
}
.section-title {
  padding: 16px 16px 8px;
  font-size: 15px;
  color: #666;
}
</style>
