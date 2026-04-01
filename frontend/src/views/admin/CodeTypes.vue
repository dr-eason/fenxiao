<template>
  <div class="admin-code-types">
    <van-nav-bar title="产品管理" left-arrow @click-left="$router.push('/admin')" />

    <div style="padding: 12px 16px;">
      <van-button type="primary" size="small" block @click="showAdd = true">添加产品类型</van-button>
    </div>

    <van-cell-group v-for="t in types" :key="t.id" inset style="margin: 8px 16px;">
      <van-cell :title="t.name" :label="`价格: ¥${(t.price / 100).toFixed(2)}`">
        <template #value>
          <van-tag :type="t.is_active ? 'success' : 'default'">{{ t.is_active ? '上架' : '下架' }}</van-tag>
        </template>
      </van-cell>
      <van-cell title="一级佣金" :value="`¥${(t.commission_l1 / 100).toFixed(2)}`" />
      <van-cell title="二级佣金" :value="`¥${(t.commission_l2 / 100).toFixed(2)}`" />
      <van-cell>
        <van-button size="mini" type="primary" @click="editItem(t)">编辑</van-button>
        <van-button size="mini" type="danger" style="margin-left: 8px;" @click="deleteItem(t.id)">删除</van-button>
      </van-cell>
    </van-cell-group>

    <!-- Add/Edit Dialog -->
    <van-popup v-model:show="showAdd" position="bottom" round style="padding: 16px; max-height: 80vh;">
      <h3 style="margin-bottom: 16px;">{{ editingId ? '编辑' : '添加' }}产品类型</h3>
      <van-form @submit="onSubmit">
        <van-field v-model="form.name" label="名称" placeholder="产品名称" :rules="[{ required: true }]" />
        <van-field v-model="form.price" label="价格(分)" type="number" placeholder="以分为单位" :rules="[{ required: true }]" />
        <van-field v-model="form.commission_l1" label="一级佣金(分)" type="number" placeholder="以分为单位" />
        <van-field v-model="form.commission_l2" label="二级佣金(分)" type="number" placeholder="以分为单位" />
        <van-field v-model="form.image_url" label="图片URL" placeholder="产品图片地址" />
        <div style="margin-top: 16px;">
          <van-button type="primary" block native-type="submit" :loading="submitting">保存</van-button>
        </div>
      </van-form>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { adminGetCodeTypes, adminCreateCodeType, adminUpdateCodeType, adminDeleteCodeType } from '../../api'

const types = ref<any[]>([])
const showAdd = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ name: '', price: '', commission_l1: '0', commission_l2: '0', image_url: '' })

async function loadTypes() {
  const res = await adminGetCodeTypes()
  types.value = res.data
}

function editItem(t: any) {
  editingId.value = t.id
  form.value = {
    name: t.name,
    price: String(t.price),
    commission_l1: String(t.commission_l1),
    commission_l2: String(t.commission_l2),
    image_url: t.image_url,
  }
  showAdd.value = true
}

async function onSubmit() {
  submitting.value = true
  try {
    const data = {
      name: form.value.name,
      price: Number(form.value.price),
      commission_l1: Number(form.value.commission_l1),
      commission_l2: Number(form.value.commission_l2),
      image_url: form.value.image_url,
      is_active: true,
    }
    if (editingId.value) {
      await adminUpdateCodeType(editingId.value, data)
    } else {
      await adminCreateCodeType(data)
    }
    showToast('保存成功')
    showAdd.value = false
    editingId.value = null
    form.value = { name: '', price: '', commission_l1: '0', commission_l2: '0', image_url: '' }
    await loadTypes()
  } finally {
    submitting.value = false
  }
}

async function deleteItem(id: number) {
  await showConfirmDialog({ title: '确认删除？' })
  await adminDeleteCodeType(id)
  showToast('已删除')
  await loadTypes()
}

onMounted(loadTypes)
</script>
