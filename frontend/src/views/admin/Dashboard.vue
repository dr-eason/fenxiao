<template>
  <div class="admin-dashboard">
    <van-nav-bar title="管理后台">
      <template #right>
        <span style="color: #ee0a24; font-size: 14px;" @click="handleLogout">退出</span>
      </template>
    </van-nav-bar>

    <van-grid :column-num="3" :gutter="10" style="padding: 16px;">
      <van-grid-item icon="shop-o" text="产品管理" to="/admin/code-types" />
      <van-grid-item icon="qr" text="授权码" to="/admin/auth-codes" />
      <van-grid-item icon="orders-o" text="订单管理" to="/admin/orders" />
      <van-grid-item icon="friends-o" text="用户管理" to="/admin/users" />
      <van-grid-item icon="gold-coin-o" text="佣金管理" to="/admin/commissions" />
    </van-grid>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const userStore = useUserStore()

function handleLogout() {
  userStore.logout()
  router.push('/admin/login')
}
</script>
