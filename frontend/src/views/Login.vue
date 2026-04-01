<template>
  <div class="login-page">
    <van-nav-bar title="登录" left-arrow @click-left="$router.back()" />
    <div class="form-wrapper">
      <h2 class="title">欢迎登录</h2>
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
        </van-cell-group>
        <div style="margin: 24px 16px;">
          <van-button round block type="primary" native-type="submit" :loading="submitting">
            登录
          </van-button>
        </div>
      </van-form>
      <div class="register-link" @click="$router.push('/register')">
        没有账号？立即注册
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { login } from '../api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const submitting = ref(false)
const form = ref({ phone: '', password: '' })

async function onSubmit() {
  submitting.value = true
  try {
    const res = await login(form.value)
    userStore.setToken(res.data.token, 'user')
    showToast('登录成功')
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
.register-link {
  text-align: center;
  color: #1989fa;
  font-size: 14px;
  margin-top: 16px;
}
</style>
