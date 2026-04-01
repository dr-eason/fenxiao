<template>
  <div class="distribution">
    <van-nav-bar title="分销中心" left-arrow @click-left="$router.push('/')" />

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="card">
        <div class="card-value">¥{{ (summary.total / 100).toFixed(2) }}</div>
        <div class="card-label">总佣金</div>
      </div>
      <div class="card">
        <div class="card-value">¥{{ (summary.pending / 100).toFixed(2) }}</div>
        <div class="card-label">待结算</div>
      </div>
      <div class="card">
        <div class="card-value">¥{{ (summary.settled / 100).toFixed(2) }}</div>
        <div class="card-label">已结算</div>
      </div>
    </div>

    <!-- Referral Link -->
    <van-cell-group inset style="margin: 12px 16px;">
      <van-cell title="我的推荐链接" is-link @click="showLink">
        <template #right-icon>
          <van-icon name="share-o" color="#1989fa" />
        </template>
      </van-cell>
      <van-cell title="我的团队" is-link @click="$router.push('/team')">
        <template #right-icon>
          <van-icon name="friends-o" color="#07c160" />
        </template>
      </van-cell>
    </van-cell-group>

    <!-- Commission Records -->
    <div class="section-title">佣金记录</div>
    <van-empty v-if="commissions.length === 0" description="暂无佣金记录" />
    <van-cell-group v-else inset>
      <van-cell v-for="c in commissions" :key="c.id">
        <template #title>
          <span>{{ c.from_user_nickname || c.from_user_phone }}</span>
          <van-tag :type="c.level === 1 ? 'primary' : 'warning'" style="margin-left: 6px;">
            {{ c.level === 1 ? '一级' : '二级' }}
          </van-tag>
        </template>
        <template #value>
          <span class="comm-amount">+¥{{ (c.amount / 100).toFixed(2) }}</span>
        </template>
        <template #label>
          {{ new Date(c.created_at).toLocaleString() }}
          <van-tag :type="c.status === 0 ? 'warning' : 'success'" plain size="medium" style="margin-left: 4px;">
            {{ c.status === 0 ? '待结算' : '已结算' }}
          </van-tag>
        </template>
      </van-cell>
    </van-cell-group>

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
import { showToast } from 'vant'
import { getDistributionSummary, getMyCommissions, getReferralLink } from '../api'

const router = useRouter()
const activeTab = ref('distribution')
const summary = ref({ total: 0, pending: 0, settled: 0 })
const commissions = ref<any[]>([])

async function loadData() {
  const [summaryRes, commissionsRes] = await Promise.all([
    getDistributionSummary(),
    getMyCommissions(),
  ])
  summary.value = summaryRes.data
  commissions.value = commissionsRes.data
}

async function showLink() {
  try {
    const res = await getReferralLink()
    const link = window.location.origin + res.data.link
    await navigator.clipboard?.writeText(link)
    showToast('推荐链接已复制')
  } catch {
    showToast('需要先购买产品成为分销商')
  }
}

function onTabChange(name: string) {
  if (name === 'home') router.push('/')
  else if (name === 'orders') router.push('/orders')
  else if (name === 'me') router.push('/me')
}

onMounted(loadData)
</script>

<style scoped>
.distribution {
  padding-bottom: 60px;
}
.summary-cards {
  display: flex;
  padding: 16px;
  gap: 12px;
}
.card {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
  color: #fff;
}
.card-value {
  font-size: 18px;
  font-weight: 700;
}
.card-label {
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.85;
}
.section-title {
  padding: 16px 16px 8px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
.comm-amount {
  color: #ee0a24;
  font-weight: 600;
}
</style>
