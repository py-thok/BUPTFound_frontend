// @ts-nocheck
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/Home.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/Login.vue')
  },
  {
    path: '/user',
    name: 'User',
    component: () => import('../pages/User.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/add',
    name: 'Add',
    component: () => import('../pages/Add.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../pages/Search.vue')
  },
  {
    path: '/post/:id',
    name: 'Post',
    component: () => import('../pages/Post.vue')
  },
  {
    path: '/message',
    name: 'Message',
    component: () => import('../pages/Message.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/mymessages',
    name: 'MessageList',
    component: () => import('../pages/MessageList.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 导航守卫
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta?.requiresAuth
  const token = localStorage.getItem('token')
  const userData = localStorage.getItem('user')
  const isLoggedIn = !!(token && userData)
  
  if (requiresAuth && !isLoggedIn) {
    localStorage.setItem('redirectAfterLogin', to.path)
    next('/login')
  } else {
    next()
  }
})

export default router 