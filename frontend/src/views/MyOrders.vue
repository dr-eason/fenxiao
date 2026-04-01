<template>
  <div class="my-orders">
    <van-nav-bar title="我的订单" left-arrow @click-left="$router.push('/')" />
    <van-pull-refresh v-model="refreshing" @refresh="loadOrders">
      <van-empty v-if="!loading && orders.length === 0" description="暂无订单" />
      <van-cell-group v-for="order in orders" :key="order.id" inset style="margin: 12px 16px;">
        <van-cell
          :title="order.code_type_name || '产品'"
          :value="statusText(order.status)"
          :label="`订单号: ${order.order_no}`"
          is-link
          @click="$router.push(`/orders/${order.id}`)"
        >
          <template #right-icon>
            <van-tag :type="statusType(order.status)">{{ statusText(order.status) }}</van-tag>
          </template>
        </van-cell>
        <van-cell title="金额" :value="`¥${(order.total_price / 100).toFixed(2)}`" />
        <van-cell title="数量" :value="order.quantity" />
      </van-cell-group>
    </van-pull-refresh>

    <van-tabbar v-model="activeTab" @change="onTabChange">
      <van-tabbar-item icon="shop-o" name="home">商城</van-tabbar-item>
      <van-tabbar-item icon="orders-o" name="orders">订单</van-tabbar-item>
      <van-tabbar-item icon="chart-trending-o" name="distribution">分销</van-tabbar-item>
      <van-tabbar-item icon="contact" name="me">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyOrders } from '../api'

const router = useRouter()
const orders = ref<any[]>([])
const loading = ref(true)
const refreshing = ref(false)
const activeTab = ref('orders')

function statusText(s: number) {
  return s === 0 ? '待支付' : s === 1 ? '已支付' : '已取消'
}
function statusType(s: number) {
  return s === 0 ? 'warning' : s === 1 ? 'success' : 'default'
}

async function loadOrders() {
  try {
    const res = await getMyOrders()
    orders.value = res.data
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function onTabChange(name: string) {
  if (name === 'home') router.push('/')
  else if (name === 'distribution') router.push('/distribution')
  else if (name === 'me') router.push('/me')
}

onMounted(loadOrders)
</script>

<style scoped>
.my-orders {
  padding-bottom: 60px;
  min-height: 100vh;
}
</style>
