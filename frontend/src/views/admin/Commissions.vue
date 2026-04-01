<template>
  <div class="admin-commissions">
    <van-nav-bar title="佣金管理" left-arrow @click-left="$router.push('/admin')" />

    <div style="padding: 12px 16px;">
      <van-button type="primary" size="small" block @click="settleAll" :loading="settling">
        一键结算所有待结算佣金
      </van-button>
    </div>

    <van-empty v-if="commissions.length === 0" description="暂无佣金记录" />
    <van-cell-group v-for="c in commissions" :key="c.id" inset style="margin: 8px 16px;">
      <van-cell
        :title="`用户ID: ${c.user_id}`"
        :label="`来源: ${c.from_user_nickname || c.from_user_phone} | 订单ID: ${c.order_id}`"
      >
        <template #value>
          <span style="color: #ee0a24; font-weight: 600;">+¥{{ (c.amount / 100).toFixed(2) }}</span>
        </template>
      </van-cell>
      <van-cell>
        <van-tag :type="c.level === 1 ? 'primary' : 'warning'">{{ c.level === 1 ? '一级' : '二级' }}</van-tag>
        <van-tag :type="c.status === 0 ? 'warning' : 'success'" style="margin-left: 4px;">
          {{ c.status === 0 ? '待结算' : '已结算' }}
        </van-tag>
      </van-cell>
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { adminGetCommissions, adminSettleCommissions } from '../../api'

const commissions = ref<any[]>([])
const settling = ref(false)

async function loadCommissions() {
  const res = await adminGetCommissions()
  commissions.value = res.data
}

async function settleAll() {
  await showConfirmDialog({ title: '确认结算所有待结算佣金？' })
  settling.value = true
  try {
    const res = await adminSettleCommissions()
    showToast(`已结算 ${res.data.settled} 条`)
    await loadCommissions()
  } finally {
    settling.value = false
  }
}

onMounted(loadCommissions)
</script>
