import { ref, computed } from 'vue'

// 后端API配置
const API_BASE_URL = ''

// 测试账户配置 - 方便删除的独立函数
const TEST_ACCOUNTS = {
  name: '测试用户',
  username: 'testuser',
  password: '123456'
}

// 检查是否为测试账户
const isTestAccount = (username: string, password: string): boolean => {
  return username === TEST_ACCOUNTS.username && password === TEST_ACCOUNTS.password
}

// 用户类型接口
export interface User {
  id: number
  name: string
  username: string
  avatar?: string
  // API profile 扩展字段
  userId?: number
  studentId?: string
  gender?: string
  email?: string
  phoneNumber?: string
  avatarUrl?: string
}

// API响应接口
interface ApiResponse {
  success: boolean
  message: string
  data?: any
}

// 全局状态
export const isLoggedIn = ref(false)
export const currentUser = ref<User | null>(null)

// 计算属性 - 获取用户发布的物品数量
export const userItemsCount = computed(() => {
  // 这里可以根据需要从items store中获取用户物品数量
  return 0
})

// API调用函数
const apiCall = async (endpoint: string, method: string, data?: any): Promise<ApiResponse> => {
  try {
    // console.log('API 请求开始:', {
    //   endpoint,
    //   method,
    //   data,
    //   baseUrl: API_BASE_URL,
    //   fullUrl: `${API_BASE_URL}${endpoint}`
    // })
    
    // 准备请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // 如果存在token，添加到请求头
    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      // console.log('添加 Authorization 头:', `Bearer ${token}`)
    }
    
    console.log('请求头:', headers)
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    console.log('HTTP 响应状态:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    })

    // 检查响应是否为JSON
    const contentType = response.headers.get('content-type')
    const isJson = contentType && contentType.includes('application/json')
    
    let result: any = {}
    
    if (isJson) {
      try {
        result = await response.json()
        // console.log('解析的 JSON 响应:', result)
      } catch (jsonError) {
        console.error('JSON解析失败:', jsonError)
        result = { message: '服务器响应格式错误' }
      }
    } else {
      // 非JSON响应，获取文本内容
      const text = await response.text()
      console.log('文本响应内容:', text)
      result = { message: text || '服务器响应异常' }
    }
    
    // 根据HTTP状态码判断是否成功
    if (response.ok) {
      const successResult = {
        success: true,
        message: result.message || '操作成功',
        data: result.data || result
      }
      // console.log('API 调用成功:', successResult)
      return successResult
    } else {
      // 处理不同的错误状态码
      let errorMessage = result.message || result.error || '操作失败'
      
      switch (response.status) {
        case 401:
          errorMessage = '未授权访问，请重新登录'
          // 如果是401错误，可能token过期，清除本地状态
          if (endpoint !== '/auth/login' && endpoint !== '/auth/register') {
            logout()
          }
          break
        case 403:
          errorMessage = '访问被拒绝，请检查权限设置'
          break
        case 404:
          errorMessage = '请求的资源不存在'
          break
        case 500:
          errorMessage = '服务器内部错误'
          break
        default:
          errorMessage = `请求失败 (${response.status}): ${errorMessage}`
      }
      
      const errorResult = {
        success: false,
        message: errorMessage,
        data: result
      }
      console.log('API 调用失败:', errorResult)
      return errorResult
    }
  } catch (error) {
    console.error('API调用异常:', error)
    return {
      success: false,
      message: '网络连接失败，请检查后端服务是否启动'
    }
  }
}

// 登录函数
export const login = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('登录开始:', { username })
    
    if (isTestAccount(username, password)) {
      // 测试账户登录
      currentUser.value = {
        id: 999,
        name: TEST_ACCOUNTS.name,
        username: TEST_ACCOUNTS.username,
        avatar: '/src/assets/yangtuo.jpg'
      }
      isLoggedIn.value = true
      localStorage.setItem('token', 'test-token')
      localStorage.setItem('user', JSON.stringify(currentUser.value))
      console.log('测试账户登录成功:', currentUser.value)
      return { success: true, message: '登录成功' }
    }

    // 使用后端API登录
    const result = await apiCall('/auth/login', 'POST', { username, password })
    console.log('登录 API 调用结果:', result)
    
    if (result.success) {
      const data = result.data
      console.log('登录响应数据:', data)
      
      // 先设置基本用户信息和token
      const basicUser = {
        id: parseInt(data.id || data.userId) || 0,
        name: data.name || data.username || username,
        username: data.username || username,
        avatar: data.avatar || ''
      }
      
      currentUser.value = basicUser
      isLoggedIn.value = true
      const token = data.token || 'api-token'
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(basicUser))
      
      console.log('基本用户信息设置完成:', basicUser)
      console.log('Token 已保存:', token)
      
      // 登录成功后，调用 getUserProfile 获取完整的用户信息
      try {
        console.log('开始获取完整用户信息...')
        const profileResult = await getUserProfile()
        console.log('获取用户 profile 结果:', profileResult)
        
        if (profileResult.success && profileResult.data) {
          console.log('更新用户信息为完整信息:', profileResult.data)
          currentUser.value = profileResult.data
          localStorage.setItem('user', JSON.stringify(profileResult.data))
        } else {
          console.log('获取完整用户信息失败，使用基本信息')
        }
      } catch (profileError) {
        console.error('获取用户profile异常:', profileError)
        // 即使获取profile失败，也不影响登录状态
      }
      
      console.log('最终用户信息:', currentUser.value)
      return { success: true, message: result.message || '登录成功' }
    } else {
      console.log('登录失败:', result.message)
      return { success: false, message: result.message || '用户名或密码错误' }
    }
  } catch (error) {
    console.error('登录错误:', error)
    return { success: false, message: '登录失败，请检查网络连接' }
  }
}

// 注册函数
export const register = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
  // 检查是否尝试注册测试账户用户名
  if (username === TEST_ACCOUNTS.username) {
    return {
      success: false,
      message: '该用户名已被占用，请使用其他用户名'
    }
  }

  try {
    // 使用后端API注册（只传递username和password）
    const result = await apiCall('/auth/register', 'POST', { username, password })
    
    if (result.success) {
      const data = result.data
      currentUser.value = {
        id: parseInt(data.id || data.userId) || 0,
        name: data.name || data.username || username,  // 使用后端返回的数据或用户名作为显示名称
        username: data.username || username,
        avatar: data.avatar || ''
      }
      isLoggedIn.value = true
      localStorage.setItem('token', data.token || 'api-token')
      localStorage.setItem('user', JSON.stringify(currentUser.value))
      return { success: true, message: result.message || '注册成功' }
    } else {
      return { success: false, message: result.message || '注册失败' }
    }
  } catch (error) {
    console.error('注册错误:', error)
    return { success: false, message: '注册失败，请检查网络连接' }
  }
}

// 退出登录
export const logout = () => {
  currentUser.value = null
  isLoggedIn.value = false
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

// 初始化认证状态
export const initializeAuth = () => {
  const token = localStorage.getItem('token')
  const userData = localStorage.getItem('user')
  
  if (token && userData) {
    try {
      const parsedUser = JSON.parse(userData)
      // 确保ID是数字类型
      currentUser.value = {
        ...parsedUser,
        id: parseInt(parsedUser.id) || 0
      }
      // 确保旧数据兼容性
      if (currentUser.value && !currentUser.value.username && (currentUser.value as any).email) {
        currentUser.value.username = (currentUser.value as any).email
      }
      isLoggedIn.value = true
    } catch (error) {
      logout()
    }
  }
  
}

// 测试函数 - 方便删除
export const getTestAccountInfo = () => {
  return {
    name: TEST_ACCOUNTS.name,
    username: TEST_ACCOUNTS.username,
    password: TEST_ACCOUNTS.password
  }
}

// 获取用户profile信息的API调用
export const getUserProfile = async (userId?: number): Promise<{ success: boolean; data?: User; message: string }> => {
  console.log('=== getUserProfile 被调用 ===')
  console.log('参数 userId:', userId)
  console.log('当前登录状态:', isLoggedIn.value)
  console.log('当前用户:', currentUser.value)

  try {
    // 直接调用API获取用户信息
    // 构建API请求
    const endpoint = userId ? `/profile?id=${userId}` : '/profile'
    console.log('调用后端 API:', endpoint)
    
    const result = await apiCall(endpoint, 'GET')
    console.log('API 调用结果:', result)
    
    if (result.success && result.data) {
      const apiData = result.data
      console.log('API 返回数据:', apiData)
      
      // 将API返回的数据转换为标准User格式
      const user: User = {
        id: parseInt(apiData.userId || apiData.id) || (userId || 0),
        name: apiData.username || `用户${apiData.userId || apiData.id || userId || ''}`,
        username: apiData.username || `user${apiData.userId || apiData.id || userId || ''}`,
        avatar: apiData.avatarUrl ? `/uploads/${apiData.avatarUrl}` : '',
        // 保留API的额外字段
        userId: apiData.userId,
        studentId: apiData.studentId,
        gender: apiData.gender,
        email: apiData.email,
        phoneNumber: apiData.phoneNumber,
        avatarUrl: apiData.avatarUrl
      }
      
      console.log('转换后的用户数据:', user)
      
      return {
        success: true,
        data: user,
        message: '获取用户信息成功'
      }
    } else {
      console.log('API 调用失败或无数据:', result)
      return {
        success: false,
        message: result.message || '获取用户信息失败'
      }
    }
  } catch (error) {
    console.error('获取用户profile异常:', error)
    
    return {
      success: false,
      message: '网络连接失败，请检查后端服务是否启动'
    }
  }
}

// 更新用户资料的API调用
export const updateUserProfile = async (profileData: Partial<User>): Promise<User> => {
  console.log('开始更新用户资料...')
  console.log('请求参数:', profileData)
  
  try {
    // 使用FormData来匹配后端API的multipart/form-data格式
    const formData = new FormData()
    
    if (profileData.phoneNumber) {
      formData.append('phoneNumber', profileData.phoneNumber)
    }
    if (profileData.studentId) {
      formData.append('studentId', profileData.studentId)
    }
    if (profileData.gender) {
      formData.append('gender', profileData.gender)
    }
    if (profileData.email) {
      formData.append('email', profileData.email)
    }
    
    // 处理头像上传
    if (profileData.avatar) {
      if (profileData.avatar.startsWith('data:')) {
        // 如果是base64格式，转换为Blob
        const response = await fetch(profileData.avatar)
        const blob = await response.blob()
        formData.append('avatar', blob, 'avatar.jpg')
      } else {
        // 如果是文件URL或其他格式，直接添加
        formData.append('avatar', profileData.avatar)
      }
    }
    
    console.log('FormData 内容:')
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value)
    }
    
    // 准备请求头（不包含Content-Type，让浏览器自动设置multipart边界）
    const headers: Record<string, string> = {}
    
    // 添加认证头
    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'PUT',
      headers,
      body: formData
    })
    
    console.log('HTTP 响应状态:', response.status)
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`)
    }
    
    const responseData = await response.json()
    console.log('API响应数据:', responseData)
    
    // 转换响应数据为前端格式
    const user: User = {
      id: Number(responseData.id) || Number(responseData.userId),
      username: responseData.username,
      name: responseData.username, // 使用username作为显示名称
      email: responseData.email,
      phoneNumber: responseData.phoneNumber,
      studentId: responseData.studentId,
      gender: responseData.gender,
      // 处理头像URL，添加/uploads前缀
      avatar: responseData.avatarUrl ? `/uploads/${responseData.avatarUrl}` : undefined,
      // 保留API的额外字段
      userId: responseData.userId,
      avatarUrl: responseData.avatarUrl
    }
    
    console.log('转换后的用户数据:', user)
    
    // 更新本地用户信息
    if (currentUser.value && currentUser.value.id === user.id) {
      Object.assign(currentUser.value, user)
      localStorage.setItem('user', JSON.stringify(currentUser.value))
    }
    
    return user
  } catch (error) {
    console.error('更新用户资料失败:', error)
    throw error
  }
}

// 更新消息响应接口
export interface MessageResponse {
  id: number
  senderId: number
  senderName: string
  receiverId: number
  receiverName: string
  itemId: number
  itemName: string
  conversationId: number
  content: string
  sentTime: string
  read: boolean
  anonymous: boolean
  outgoing: boolean
}

// 发送消息的API调用
export const sendMessage = async (messageData: {
  receiverId: number
  itemId: number
  content: string
  anonymous?: boolean
}): Promise<{ success: boolean; data?: MessageResponse; message: string }> => {
  console.log('开始发送消息...')
  console.log('请求参数:', messageData)
  
  try {
    const result = await apiCall('/messages', 'POST', messageData)
    console.log('发送消息 API 调用结果:', result)
    
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data,
        message: '消息发送成功'
      }
    } else {
      return {
        success: false,
        message: result.message || '消息发送失败'
      }
    }
  } catch (error) {
    console.error('发送消息异常:', error)
    return {
      success: false,
      message: '网络连接失败，请检查后端服务是否启动'
    }
  }
}

// 获取消息列表的API调用
export const getMessages = async (conversationId?: number): Promise<{ success: boolean; data?: MessageResponse[]; message: string }> => {
  console.log('开始获取消息列表...')
  console.log('对话ID:', conversationId)
  
  try {
    const endpoint = conversationId ? `/messages?conversationId=${conversationId}` : '/messages'
    const result = await apiCall(endpoint, 'GET')
    console.log('获取消息列表 API 调用结果:', result)
    
    if (result.success && result.data) {
      return {
        success: true,
        data: Array.isArray(result.data) ? result.data : [result.data],
        message: '获取消息列表成功'
      }
    } else {
      return {
        success: false,
        data: [],
        message: result.message || '获取消息列表失败'
      }
    }
  } catch (error) {
    console.error('获取消息列表异常:', error)
    return {
      success: false,
      data: [],
      message: '网络连接失败，请检查后端服务是否启动'
    }
  }
}

// 对话摘要接口定义
export interface ConversationSummary {
  anonymous: boolean
  hasUnread: boolean
  id: number
  itemId: number
  itemName: string
  lastMessageContent: string
  lastMessageTime: string
  otherUserId: number
  otherUsername: string
  [property: string]: any
}

// 获取对话列表的API调用
export const getConversations = async (): Promise<{ success: boolean; data?: ConversationSummary[]; message: string }> => {
  console.log('开始获取对话列表...')
  
  try {
    const result = await apiCall('/messages/conversations', 'GET')
    console.log('获取对话列表 API 调用结果:', result)
    
    if (result.success && result.data) {
      return {
        success: true,
        data: Array.isArray(result.data) ? result.data : [result.data],
        message: '获取对话列表成功'
      }
    } else {
      return {
        success: false,
        data: [],
        message: result.message || '获取对话列表失败'
      }
    }
  } catch (error) {
    console.error('获取对话列表异常:', error)
    return {
      success: false,
      data: [],
      message: '网络连接失败，请检查后端服务是否启动'
    }
  }
}

// 获取特定对话的所有消息
export const getConversationMessages = async (conversationId: number): Promise<{ success: boolean; data?: MessageResponse[]; message: string }> => {
  try {
    console.log('获取对话消息:', conversationId)
    
    const response = await apiCall(`/messages/conversations/${conversationId}`, 'GET')
    
    if (response.success && response.data) {
      console.log('对话消息获取成功:', response.data)
      return {
        success: true,
        data: response.data as MessageResponse[],
        message: '获取成功'
      }
    } else {
      console.error('获取对话消息失败:', response.message)
      return {
        success: false,
        message: response.message || '获取对话消息失败'
      }
    }
  } catch (error) {
    console.error('获取对话消息异常:', error)
    return {
      success: false,
      message: '网络错误，请稍后重试'
    }
  }
}

// 获取其他用户公开信息的API调用
export const getPublicUserProfile = async (userId: number): Promise<{ success: boolean; data?: User; message: string }> => {
  console.log('开始获取用户公开信息，userId:', userId)
  
  try {
    const result = await apiCall(`/profile/user/${userId}`, 'GET')
    console.log('获取用户公开信息 API 调用结果:', result)
    
    if (result.success && result.data) {
      const apiData = result.data
      console.log('API 返回的公开用户数据:', apiData)
      
      // 将API返回的数据转换为标准User格式
      const user: User = {
        id: parseInt(apiData.userId || apiData.id) || userId,
        name: apiData.username || `用户${apiData.userId || apiData.id || userId}`,
        username: apiData.username || `user${apiData.userId || apiData.id || userId}`,
        avatar: apiData.avatarUrl ? `/uploads/${apiData.avatarUrl}` : '',
        // 保留API的额外字段
        userId: apiData.userId,
        gender: apiData.gender,
        avatarUrl: apiData.avatarUrl
      }
      
      console.log('转换后的公开用户数据:', user)
      
      return {
        success: true,
        data: user,
        message: '获取用户公开信息成功'
      }
    } else {
      console.log('API 调用失败或无数据:', result)
      return {
        success: false,
        message: result.message || '获取用户公开信息失败'
      }
    }
  } catch (error) {
    console.error('获取用户公开信息异常:', error)
    
    return {
      success: false,
      message: '网络连接失败，请检查后端服务是否启动'
    }
  }
}

// 获取未读消息数量的API调用
export const getUnreadMessageCount = async (): Promise<{ success: boolean; data?: { count: number }; message: string }> => {
  // console.log('开始获取未读消息数量...')
  
  const result = await apiCall('/messages/unread-count', 'GET')
  // console.log('获取未读消息数量 API 调用结果:', result)
  
  if (result.success && result.data) {
    const count = typeof result.data === 'number' ? result.data : result.data.count || 0
    
    return {
      success: true,
      data: { count },
      message: '获取未读消息数量成功'
    }
  } else {
    return {
      success: false,
      data: { count: 0 },
      message: result.message || '获取未读消息数量失败'
    }
  }
} 