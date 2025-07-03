// @ts-nocheck
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Loader2 } from 'lucide-vue-next'
import { login, register, initializeAuth, isLoggedIn, getTestAccountInfo } from '@/stores/user'

const router = useRouter()

const loginForm = ref({
  username: '',
  password: ''
})

const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: ''
})

const activeTab = ref('login')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// 获取测试账户信息
const testAccount = getTestAccountInfo()

onMounted(() => {
  initializeAuth()
  // 如果已经登录，直接跳转
  if (isLoggedIn.value) {
    handleRedirect()
  }
})

const clearMessages = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

const handleLogin = async () => {
  clearMessages()
  if (!loginForm.value.username || !loginForm.value.password) {
    errorMessage.value = '请输入用户名和密码'
    return
  }

  isLoading.value = true
  try {
    const result = await login(loginForm.value.username, loginForm.value.password)
    if (result.success) {
      successMessage.value = result.message
      loginForm.value = { username: '', password: '' }
      setTimeout(() => {
        handleRedirect()
      }, 1000)
    } else {
      errorMessage.value = result.message
    }
  } catch (error) {
    errorMessage.value = '登录失败，请重试'
  } finally {
    isLoading.value = false
  }
}

const handleRegister = async () => {
  clearMessages()
  if (!registerForm.value.username || !registerForm.value.password) {
    errorMessage.value = '请填写所有必填信息'
    return
  }

  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  if (registerForm.value.password.length < 6) {
    errorMessage.value = '密码长度至少6位'
    return
  }

  isLoading.value = true
  try {
    const result = await register(
      registerForm.value.username,
      registerForm.value.password
    )
    
    if (result.success) {
      successMessage.value = result.message
      registerForm.value = { username: '', password: '', confirmPassword: '' }
      setTimeout(() => {
        handleRedirect()
      }, 1000)
    } else {
      errorMessage.value = result.message
    }
  } catch (error) {
    errorMessage.value = '注册失败，请重试'
  } finally {
    isLoading.value = false
  }
}

const handleRedirect = () => {
  const redirectPath = localStorage.getItem('redirectPath') || '/'
  localStorage.removeItem('redirectPath')
  router.push(redirectPath)
}

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
    <Card class="w-full max-w-md">
      <CardHeader class="text-center space-y-4">
        <div class="flex items-center justify-center">
          <Button @click="goBack" variant="ghost" size="sm" class="absolute left-4 top-4">
            <ArrowLeft :size="48" />
          </Button>
        </div>
        <div>
          <CardTitle class="text-2xl font-bold">登录BUPTFound</CardTitle>
          <CardDescription class="text-gray-600 dark:text-gray-300 mt-2">
            登录或注册账户来发布和管理您的招领信息
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent class="space-y-6">
        <!-- 错误和成功消息 -->
        <div v-if="errorMessage" class="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          {{ successMessage }}
        </div>

        <Tabs v-model="activeTab" class="w-full">
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form @submit.prevent="handleLogin" class="space-y-4">
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">用户名</label>
                <Input 
                  v-model="loginForm.username" 
                  type="text" 
                  placeholder="请输入用户名"
                  :disabled="isLoading"
                  required 
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">密码</label>
                <Input 
                  v-model="loginForm.password" 
                  type="password" 
                  placeholder="请输入密码"
                  :disabled="isLoading"
                  required 
                />
              </div>
              <Button type="submit" class="w-full" :disabled="isLoading">
                <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                {{ isLoading ? '登录中...' : '立即登录' }}
              </Button>
              <div class="text-center">
                
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="register" class="space-y-4">
            <form @submit.prevent="handleRegister" class="space-y-4">
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">用户名</label>
                <Input 
                  v-model="registerForm.username" 
                  type="text" 
                  placeholder="请输入用户名"
                  :disabled="isLoading"
                  required 
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">密码</label>
                <Input 
                  v-model="registerForm.password" 
                  type="password" 
                  placeholder="请设置密码（至少6位）"
                  :disabled="isLoading"
                  required 
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">确认密码</label>
                <Input 
                  v-model="registerForm.confirmPassword" 
                  type="password" 
                  placeholder="请再次输入密码"
                  :disabled="isLoading"
                  required 
                />
              </div>
              <Button type="submit" class="w-full" :disabled="isLoading">
                <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                {{ isLoading ? '注册中...' : '立即注册' }}
              </Button>
              <div class="text-center">
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </div>
</template> 