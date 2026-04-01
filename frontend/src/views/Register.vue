<template>
  <div class="register-page">
    <van-nav-bar title="注册" left-arrow @click-left="$router.back()" />
    <div class="form-wrapper">
      <h2 class="title">注册账号</h2>
      <van-form @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="form.phone"
            label="手机号"
            placeholder="请输入手机号"
            type="tel"
            maxlength="11"
            :rules="[{ required: true, message: '请输入手机号' }]"
          />
          <van-field
            v-model="form.password"
            label="密码"
            placeholder="请输入密码"
            type="password"
            :rules="[{ required: true, message: '请输入密码' }]"
          />
          <van-field
            v-model="form.nickname"
            label="昵称"
            placeholder="请输入昵称（选填）"
          />
        </van-cell-group>
        <div v-if="referrerId" class="referrer-info">
          <van-icon name="friends-o" /> 来自好友推荐
        </div>
        <div style="margin: 24px 16px;">
          <van-button round block type="primary" native-type="submit" :loading="submitting">
            注册
          </van-button>
        </div>
      </van-form>
      <div class="login-link" @click="$router.push('/login')">
        已有账号？立即登录
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { register } from '../api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const submitting = ref(false)
const referrerId = ref<number | null>(null)
const form = ref({ phone: '', password: '', nickname: '' })

onMounted(() => {
  const ref_param = route.query.ref as string
  if (ref_param) {
    referrerId.value = parseInt(ref_param)
    localStorage.setItem('referrer_id', ref_param)
  } else {
    const stored = localStorage.getItem('referrer_id')
    if (stored) referrerId.value = parseInt(stored)
  }
})

async function onSubmit() {
  submitting.value = true
  try {
    const data: any = { ...form.value }
    if (referrerId.value) data.referrer_id = referrerId.value
    const res = await register(data)
    userStore.setToken(res.data.token, 'user')
    localStorage.removeItem('referrer_id')
    showToast('注册成功')
    router.push('/')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.form-wrapper {
  padding: 40px 0 20px;
}
.title {
  text-align: center;
  font-size: 22px;
  margin-bottom: 30px;
  color: #333;
}
.referrer-info {
  text-align: center;
  color: #07c160;
  font-size: 14px;
  margin-top: 12px;
}
.login-link {
  text-align: center;
  color: #1989fa;
  font-size: 14px;
  margin-top: 16px;
}
</style>
