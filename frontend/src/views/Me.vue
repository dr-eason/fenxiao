<template>
  <div class="me-page">
    <van-nav-bar title="我的" />

    <div class="user-header" v-if="userStore.user">
      <van-image round width="60" height="60"
        :src="userStore.user.avatar_url || 'https://via.placeholder.com/60x60?text=U'" />
      <div class="user-info">
        <div class="nickname">{{ userStore.user.nickname }}</div>
        <div class="phone">{{ userStore.user.phone }}</div>
        <van-tag v-if="userStore.user.is_distributor" type="success">分销商</van-tag>
      </div>
    </div>

    <van-cell-group inset style="margin: 12px 16px;">
      <van-cell title="我的订单" icon="orders-o" is-link to="/orders" />
      <van-cell title="分销中心" icon="chart-trending-o" is-link to="/distribution" />
      <van-cell title="我的团队" icon="friends-o" is-link to="/team" />
    </van-cell-group>

    <div style="padding: 24px 16px;">
      <van-button block round type="danger" @click="handleLogout">退出登录</van-button>
    </div>

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
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref('me')

function handleLogout() {
  userStore.logout()
  router.push('/login')
}

function onTabChange(name: string) {
  if (name === 'home') router.push('/')
  else if (name === 'orders') router.push('/orders')
  else if (name === 'distribution') router.push('/distribution')
}

onMounted(() => userStore.fetchUser())
</script>

<style scoped>
.me-page {
  padding-bottom: 60px;
}
.user-header {
  display: flex;
  align-items: center;
  padding: 24px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}
.user-info {
  margin-left: 16px;
}
.nickname {
  font-size: 18px;
  font-weight: 600;
}
.phone {
  font-size: 14px;
  opacity: 0.85;
  margin-top: 2px;
}
</style>
