import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/Register.vue'),
    },
    {
      path: '/scene',
      name: 'scene-3d',
      component: () => import('../views/Scene3D.vue'),
    },
    {
      path: '/product/:id',
      name: 'product-detail',
      component: () => import('../views/ProductDetail.vue'),
    },
    {
      path: '/orders',
      name: 'my-orders',
      component: () => import('../views/MyOrders.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/orders/:id',
      name: 'order-detail',
      component: () => import('../views/OrderDetail.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/distribution',
      name: 'distribution',
      component: () => import('../views/Distribution.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/team',
      name: 'my-team',
      component: () => import('../views/MyTeam.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/me',
      name: 'me',
      component: () => import('../views/Me.vue'),
      meta: { requiresAuth: true },
    },
    // Admin routes
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('../views/admin/AdminLogin.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/admin/Dashboard.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/code-types',
      name: 'admin-code-types',
      component: () => import('../views/admin/CodeTypes.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/auth-codes',
      name: 'admin-auth-codes',
      component: () => import('../views/admin/AuthCodes.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/orders',
      name: 'admin-orders',
      component: () => import('../views/admin/Orders.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('../views/admin/Users.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/commissions',
      name: 'admin-commissions',
      component: () => import('../views/admin/Commissions.vue'),
      meta: { requiresAdmin: true },
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.meta.requiresAdmin && role !== 'admin') {
    next('/admin/login')
  } else {
    next()
  }
})

export default router
