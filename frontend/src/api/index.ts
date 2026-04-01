import axios from 'axios'
import { showToast } from 'vant'
import router from '../router'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      router.push('/login')
    }
    const msg = err.response?.data?.error || '请求失败'
    showToast(msg)
    return Promise.reject(err)
  }
)

// Auth
export const register = (data: { phone: string; password: string; nickname?: string; referrer_id?: number }) =>
  api.post('/auth/register', data)
export const login = (data: { phone: string; password: string }) =>
  api.post('/auth/login', data)
export const adminLogin = (data: { username: string; password: string }) =>
  api.post('/admin/login', data)
export const getMe = () => api.get('/user/me')

// Products
export const getProducts = () => api.get('/products')
export const getProduct = (id: number) => api.get(`/products/${id}`)

// Orders
export const createOrder = (data: { code_type_id: number; quantity: number }) =>
  api.post('/orders', data)
export const payOrder = (id: number) => api.post(`/orders/${id}/pay`)
export const getMyOrders = () => api.get('/orders')
export const getOrderDetail = (id: number) => api.get(`/orders/${id}`)

// Distribution
export const getDistributionSummary = () => api.get('/distribution/summary')
export const getMyCommissions = () => api.get('/distribution/commissions')
export const getMyTeam = () => api.get('/distribution/team')
export const getReferralLink = () => api.get('/distribution/referral-link')

// Admin
export const adminGetCodeTypes = () => api.get('/admin/code-types')
export const adminCreateCodeType = (data: any) => api.post('/admin/code-types', data)
export const adminUpdateCodeType = (id: number, data: any) => api.put(`/admin/code-types/${id}`, data)
export const adminDeleteCodeType = (id: number) => api.delete(`/admin/code-types/${id}`)
export const adminGenerateAuthCodes = (data: { code_type_id: number; count: number }) =>
  api.post('/admin/auth-codes/generate', data)
export const adminGetAuthCodes = (params?: any) => api.get('/admin/auth-codes', { params })
export const adminGetOrders = () => api.get('/admin/orders')
export const adminPayOrder = (id: number) => api.post(`/admin/orders/${id}/pay`)
export const adminGetUsers = () => api.get('/admin/users')
export const adminGetCommissions = () => api.get('/admin/commissions')
export const adminSettleCommissions = () => api.post('/admin/commissions/settle')

export default api
