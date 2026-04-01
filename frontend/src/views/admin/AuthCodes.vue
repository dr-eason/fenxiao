<template>
  <div class="admin-auth-codes">
    <van-nav-bar title="授权码管理" left-arrow @click-left="$router.push('/admin')" />

    <van-cell-group inset style="margin: 12px 16px;">
      <van-field v-model="genForm.code_type_id" label="产品ID" type="number" placeholder="产品类型ID" />
      <van-field v-model="genForm.count" label="生成数量" type="number" placeholder="数量" />
      <van-cell>
        <van-button type="primary" size="small" @click="generate" :loading="generating">批量生成</van-button>
      </van-cell>
    </van-cell-group>

    <div class="section-title">授权码列表</div>
    <van-cell-group inset>
      <van-cell v-for="code in codes" :key="code.id"
        :title="code.code"
        :label="`类型ID: ${code.code_type_id}`">
        <template #value>
          <van-tag :type="code.status === 0 ? 'success' : code.status === 1 ? 'primary' : 'default'">
            {{ code.status === 0 ? '可用' : code.status === 1 ? '已售' : '已用' }}
          </van-tag>
        </template>
      </van-cell>
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { adminGetAuthCodes, adminGenerateAuthCodes } from '../../api'

const codes = ref<any[]>([])
const generating = ref(false)
const genForm = ref({ code_type_id: '', count: '10' })

async function loadCodes() {
  const res = await adminGetAuthCodes({ limit: 100, offset: 0 })
  codes.value = res.data
}

async function generate() {
  generating.value = true
  try {
    const res = await adminGenerateAuthCodes({
      code_type_id: Number(genForm.value.code_type_id),
      count: Number(genForm.value.count),
    })
    showToast(`已生成 ${res.data.generated} 个授权码`)
    await loadCodes()
  } finally {
    generating.value = false
  }
}

onMounted(loadCodes)
</script>

<style scoped>
.section-title {
  padding: 16px 16px 8px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
</style>
