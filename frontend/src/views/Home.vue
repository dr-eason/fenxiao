<template>
  <div class="home">
    <van-nav-bar title="分销商城" />
    <van-pull-refresh v-model="refreshing" @refresh="loadProducts">
      <div class="product-list">
        <van-empty v-if="!loading && products.length === 0" description="暂无产品" />
        <div
          v-for="item in products"
          :key="item.id"
          class="product-card"
          @click="$router.push(`/product/${item.id}`)"
        >
          <van-image
            :src="item.image_url || 'https://via.placeholder.com/200x200?text=授权码'"
            width="100%"
            height="160"
            fit="cover"
            radius="8"
          />
          <div class="product-info">
            <div class="product-name">{{ item.name }}</div>
            <div class="product-price">¥{{ (item.price / 100).toFixed(2) }}</div>
          </div>
        </div>
      </div>
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
.product-list {
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-height: 60vh;
}
.product-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.product-info {
  padding: 8px 12px 12px;
}
.product-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.product-price {
  font-size: 16px;
  font-weight: 600;
  color: #ee0a24;
}
</style>
