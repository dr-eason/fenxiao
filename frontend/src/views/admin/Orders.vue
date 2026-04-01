<template>
  <div class="admin-orders">
    <van-nav-bar title="订单管理" left-arrow @click-left="$router.push('/admin')" />
    <van-empty v-if="orders.length === 0" description="暂无订单" />
    <van-cell-group v-for="o in orders" :key="o.id" inset style="margin: 8px 16px;">
      <van-cell :title="o.order_no" :label="`用户ID: ${o.user_id} | ${o.code_type_name || ''}`">
        <template #value>
          <van-tag :type="o.status === 0 ? 'warning' : o.status === 1 ? 'success' : 'default'">
            {{ o.status === 0 ? '待支付' : o.status === 1 ? '已支付' : '已取消' }}
          </van-tag>
        </template>
      </van-cell>
      <van-cell title="金额" :value="`¥${(o.total_price / 100).toFixed(2)} × ${o.quantity}`" />
      <van-cell v-if="o.status === 0">
        <van-button size="mini" type="primary" @click="confirmPay(o.id)">确认支付</van-button>
      </van-cell>
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { adminGetOrders, adminPayOrder } from '../../api'

const orders = ref<any[]>([])

async function loadOrders() {
  const res = await adminGetOrders()
  orders.value = res.data
}

async function confirmPay(id: number) {
  await showConfirmDialog({ title: '确认该订单已支付？' })
  await adminPayOrder(id)
  showToast('已确认支付')
  await loadOrders()
}

onMounted(loadOrders)
</script>
