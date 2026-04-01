import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMe } from '../api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const role = ref(localStorage.getItem('role') || '')
  const user = ref<any>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => role.value === 'admin')

  function setToken(t: string, r: string = 'user') {
    token.value = t
    role.value = r
    localStorage.setItem('token', t)
    localStorage.setItem('role', r)
  }

  function logout() {
    token.value = ''
    role.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('role')
  }

  async function fetchUser() {
    if (!token.value || role.value === 'admin') return
    try {
      const res = await getMe()
      user.value = res.data
    } catch {
      logout()
    }
  }

  return { token, role, user, isLoggedIn, isAdmin, setToken, logout, fetchUser }
})
