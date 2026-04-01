<template>
  <div class="admin-users">
    <van-nav-bar title="用户管理" left-arrow @click-left="$router.push('/admin')" />
    <van-empty v-if="users.length === 0" description="暂无用户" />
    <van-cell-group v-for="u in users" :key="u.id" inset style="margin: 8px 16px;">
      <van-cell :title="u.nickname || u.phone" :label="`手机: ${u.phone}`">
        <template #value>
          <van-tag v-if="u.is_distributor" type="success">分销商</van-tag>
          <van-tag v-else type="default">普通用户</van-tag>
        </template>
      </van-cell>
      <van-cell title="上级ID" :value="u.referrer_id || '无'" />
      <van-cell title="一级下线数" :value="u.l1_count" />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminGetUsers } from '../../api'

const users = ref<any[]>([])

onMounted(async () => {
  const res = await adminGetUsers()
  users.value = res.data
})
</script>
