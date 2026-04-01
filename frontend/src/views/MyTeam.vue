<template>
  <div class="my-team">
    <van-nav-bar title="我的团队" left-arrow @click-left="$router.back()" />
    <van-empty v-if="!loading && members.length === 0" description="暂无团队成员" />
    <van-cell-group v-else inset style="margin: 12px 16px;">
      <van-cell v-for="m in members" :key="m.id">
        <template #title>
          <span>{{ m.nickname || m.phone }}</span>
          <van-tag v-if="m.is_distributor" type="success" style="margin-left: 6px;">分销商</van-tag>
        </template>
        <template #value>
          <span class="l2-count">下级 {{ m.l2_count }} 人</span>
        </template>
        <template #label>
          加入时间: {{ new Date(m.created_at).toLocaleDateString() }}
        </template>
      </van-cell>
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getMyTeam } from '../api'

const members = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await getMyTeam()
    members.value = res.data
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.l2-count {
  color: #666;
  font-size: 13px;
}
</style>
