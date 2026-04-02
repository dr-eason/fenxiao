<template>
  <div class="home">
    <van-nav-bar title="订阅服务" />
    <van-pull-refresh v-model="refreshing" @refresh="loadProducts">
      <div class="page-content">
        <van-empty v-if="!loading && products.length === 0" description="暂无服务" />

        <!-- Service Cards -->
        <div
          v-for="item in products"
          :key="item.id"
          class="service-card"
          @click="$router.push(`/product/${item.id}`)"
        >
          <div class="card-header">
            <div class="card-icon">
              <van-image
                v-if="item.image_url"
                :src="item.image_url"
                width="48"
                height="48"
                round
                fit="cover"
              />
              <div v-else class="icon-placeholder">
                <van-icon name="gem-o" size="28" color="#fff" />
              </div>
            </div>
            <div class="card-title-area">
              <div class="card-name">{{ item.name }}</div>
              <div class="card-desc">授权订阅服务</div>
            </div>
            <div class="card-price-area">
              <span class="price-symbol">¥</span>
              <span class="price-value">{{ (item.price / 100).toFixed(0) }}</span>
              <span v-if="item.price % 100 !== 0" class="price-decimal">.{{ String(item.price % 100).padStart(2, '0') }}</span>
            </div>
          </div>

          <div class="card-body">
            <div class="card-features">
              <div class="feature-item">
                <van-icon name="passed" color="#07c160" size="14" />
                <span>购买即获授权码</span>
              </div>
              <div class="feature-item">
                <van-icon name="passed" color="#07c160" size="14" />
                <span>自动成为分销商</span>
              </div>
              <div class="feature-item">
                <van-icon name="passed" color="#07c160" size="14" />
                <span>推荐奖励 ¥{{ (item.commission_l1 / 100).toFixed(2) }}/单</span>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <van-button type="primary" round size="small" class="buy-btn">
              立即订阅
            </van-button>
          </div>
        </div>
      </div>
    </van-pull-refresh>

    <van-tabbar v-model="activeTab" @change="onTabChange">
      <van-tabbar-item icon="wap-home-o" name="home">首页</van-tabbar-item>
      <van-tabbar-item icon="orders-o" name="orders">订单</van-tabbar-item>
      <van-tabbar-item icon="chart-trending-o" name="distribution">分销</van-tabbar-item>
      <van-tabbar-item icon="contact" name="me">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProducts } from '../api'

const router = useRouter()
const products = ref<any[]>([])
const loading = ref(true)
const refreshing = ref(false)
const activeTab = ref('home')

async function loadProducts() {
  try {
    const res = await getProducts()
    products.value = res.data
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function onTabChange(name: string) {
  if (name === 'orders') router.push('/orders')
  else if (name === 'distribution') router.push('/distribution')
  else if (name === 'me') router.push('/me')
}

onMounted(loadProducts)
</script>

<style scoped>
.home {
  padding-bottom: 60px;
}
.page-content {
  padding: 16px;
  min-height: 60vh;
}
.service-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s;
}
.service-card:active {
  transform: scale(0.98);
}
.card-header {
  display: flex;
  align-items: center;
}
.card-icon {
  flex-shrink: 0;
  margin-right: 12px;
}
.icon-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-title-area {
  flex: 1;
  min-width: 0;
}
.card-name {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.3;
}
.card-desc {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.card-price-area {
  flex-shrink: 0;
  margin-left: 12px;
  color: #ee0a24;
}
.price-symbol {
  font-size: 14px;
  font-weight: 500;
}
.price-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}
.price-decimal {
  font-size: 14px;
  font-weight: 500;
}
.card-body {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f5f5f5;
}
.card-features {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}
.card-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.buy-btn {
  min-width: 100px;
}
</style>
