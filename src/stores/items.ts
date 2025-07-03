import { ref } from 'vue'
// import * as mockData from '@/data/mockData.json'
import { currentUser, logout } from './user'

// 后端API配置
const API_BASE_URL = ''

// 物品类型接口
export interface Item {
  id: number
  title: string
  description: string
  type: 'found' | 'lost'
  status?: 'active' | 'resolved'
  location?: {
    lat: number
    lng: number
  }
  site: string
  contact: string
  date: string
  image: string
  userId?: number
  userName?: string
  userAvatar?: string
  createdAt?: string
}

// 物品创建请求接口
export interface CreateItemRequest {
  name: string
  description: string
  eventTime: string
  location: string
  type: 'FOUND' | 'LOST'
  site: string
  status?: 'ACTIVE' | 'RESOLVED'
  image?: File | null
}

// 后端物品响应接口
export interface ItemResponse {
  id: number
  name: string
  description: string
  eventTime: string
  location: string
  site: string
  type: 'FOUND' | 'LOST'
  imageUrl: string
  status: 'ACTIVE' | 'RESOLVED'
  userId: number
  username: string
  createdAt: string
  updatedAt: string | null
  [property: string]: any
}

// 相似物品推荐接口类型
export interface SimilarItemSuggestion {
  id: number;
  sourceItemId: number;
  sourceItemName: string;
  suggestedItemId: number;
  suggestedItemName: string;
  suggestedItemDescription: string;
  suggestedItemImageUrl: string;
  similarityScore: number;
  textSimilarity: number;
  imageSimilarity: number;
  viewed: boolean;
  [property: string]: any;
}

// 标记已读响应类型
export interface MarkViewedResponse {
  message: string;
  [property: string]: any;
}

// 全局物品状态
// export const items = ref<Item[]>((mockData as any).items || [])
export const items = ref<Item[]>([])

// 创建物品的API调用
export const createItem = async (itemData: CreateItemRequest): Promise<{ success: boolean; data?: ItemResponse; message: string }> => {
  console.log('开始创建物品...')
  console.log('请求参数:', itemData)
  
  try {
    // 准备FormData，仅用于图片上传
    const formData = new FormData()
    
    // 如果有图片，添加到FormData作为body参数
    if (itemData.image) {
      formData.append('image', itemData.image)
    }
    
    // 构建查询参数 - name、description、eventTime、location、type、site、status作为query参数
    const queryParams = new URLSearchParams({
      name: itemData.name,
      description: itemData.description,
      eventTime: itemData.eventTime,
      location: itemData.location,
      type: itemData.type,
      site: itemData.site
    })
    
    // 准备请求头
    const headers: Record<string, string> = {}
    
    // 添加Authorization头 - 确保使用token进行身份验证
    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    } else {
      console.error('未找到token，无法进行身份验证')
      return {
        success: false,
        message: '未登录，请先登录后再发布信息'
      }
    }
    
    console.log('准备发送请求:', {
      url: `${API_BASE_URL}/items?${queryParams.toString()}`,
      headers,
      hasImage: !!itemData.image,
      queryParams: Object.fromEntries(queryParams.entries())
    })
    
    const response = await fetch(`${API_BASE_URL}/items?${queryParams.toString()}`, {
      method: 'POST',
      headers,
      body: itemData.image ? formData : undefined // 只有在有图片时才发送FormData
    })

    console.log('HTTP 响应状态:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
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
      const text = await response.text()
      console.log('文本响应内容:', text)
      result = { message: text || '服务器响应异常' }
    }
    
    if (response.ok) {
      console.log('createItem - 处理API响应数据:', result)
      
      // 解析location字符串为坐标对象
      let locationObj = undefined
      if (result.location && typeof result.location === 'string') {
        const coords = result.location.split(',')
        if (coords.length === 2) {
          const lat = parseFloat(coords[0].trim())
          const lng = parseFloat(coords[1].trim())
          if (!isNaN(lat) && !isNaN(lng)) {
            locationObj = { lat, lng }
            console.log('createItem - 成功解析location:', { lat, lng })
          } else {
            console.warn('createItem - location坐标解析失败 - 非数字:', coords)
          }
        } else {
          console.warn('createItem - location格式错误 - 不是lat,lng格式:', result.location)
        }
      } else {
        console.log('createItem - 没有location字段或类型不是字符串:', result.location)
      }
      
      // 将后端响应转换为前端Item格式并添加到本地列表
      const newItem: Item = {
        id: result.id,
        title: result.name,
        description: result.description,
        type: result.type.toLowerCase() as 'found' | 'lost',
        status: result.status ? result.status.toLowerCase() as 'active' | 'resolved' : 'active',
        location: locationObj,
        site: result.site,
        contact: '', // 后端没有返回联系方式，可能需要从用户信息获取
        date: result.eventTime.split('T')[0], // 提取日期部分
        image: result.imageUrl ? `${API_BASE_URL}/uploads/${result.imageUrl}` : '',
        userId: result.userId,
        userName: result.username,
        userAvatar: currentUser.value?.avatar || '',
        createdAt: result.createdAt
      }
      
      console.log('createItem - 转换后的newItem:', newItem)
      
      // 添加到本地物品列表的开头
      items.value.unshift(newItem)
      
      const successResult = {
        success: true,
        message: '发布成功',
        data: result
      }
      console.log('创建物品成功:', successResult)
      return successResult
    } else {
      let errorMessage = result.message || result.error || '发布失败'
      
      switch (response.status) {
        case 401:
          errorMessage = '未授权访问，请重新登录'
          logout()
          break
        case 403:
          errorMessage = '访问被拒绝，请检查权限设置'
          break
        case 400:
          errorMessage = '请求参数错误，请检查填写信息'
          break
        case 500:
          errorMessage = '服务器内部错误'
          break
        default:
          errorMessage = `发布失败 (${response.status}): ${errorMessage}`
      }
      
      const errorResult = {
        success: false,
        message: errorMessage,
        data: result
      }
      console.log('创建物品失败:', errorResult)
      return errorResult
    }
  } catch (error) {
    console.error('创建物品异常:', error)
    return {
      success: false,
      message: '网络连接失败，请检查后端服务是否启动'
    }
  }
}

// API调用函数 - 物品相关的通用API调用
const itemsApiCall = async (endpoint: string, method: string, data?: any): Promise<any> => {
  try {
    // console.log('物品API 请求开始:', {
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
    //   console.log('添加 Authorization 头:', `Bearer ${token}`)
    }
    
    // console.log('请求头:', headers)
    
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
    //   console.log('物品API 调用成功:', successResult)
      return successResult
    } else {
      // 处理不同的错误状态码
      let errorMessage = result.message || result.error || '操作失败'
      
      switch (response.status) {
        case 401:
          errorMessage = '未授权访问，请重新登录'
          logout()
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
      console.log('物品API 调用失败:', errorResult)
      return errorResult
    }
  } catch (error) {
    console.error('物品API调用异常:', error)
    return {
      success: false,
      message: '网络连接失败，请检查后端服务是否启动'
    }
  }
}

// 获取用户发布的物品列表的API调用
export const getUserItems = async (): Promise<{ success: boolean; data?: ItemResponse[]; message: string }> => {
  console.log('开始获取用户发布的物品列表...')
  
  try {
    const result = await itemsApiCall('/items/user', 'GET')
    console.log('获取用户物品列表 API 调用结果:', result)
    
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data, // 返回原始API数据
        message: '获取用户物品列表成功'
      }
    } else {
      return {
        success: false,
        data: [],
        message: result.message || '获取用户物品列表失败'
      }
    }
  } catch (error) {
    console.error('获取用户物品列表异常:', error)
    return {
      success: false,
      data: [],
      message: '网络连接失败，请检查后端服务是否启动'
    }
  }
}

// 获取所有物品列表的API调用
export const getAllItems = async (): Promise<{ success: boolean; data?: ItemResponse[]; message: string }> => {
  console.log('开始获取所有物品列表...')
  
  try {
    const result = await itemsApiCall('/items', 'GET')
    console.log('获取所有物品列表 API 调用结果:', result)
    
    if (result.success && result.data) {
      // 将后端返回的数据转换为前端Item格式并更新本地状态
      const allItems: Item[] = Array.isArray(result.data) ? result.data.map((apiItem: any) => {
        console.log('处理API物品数据:', apiItem)
        
        // 解析location字符串为坐标对象
        let locationObj = undefined
        if (apiItem.location && typeof apiItem.location === 'string') {
          const coords = apiItem.location.split(',')
          if (coords.length === 2) {
            const lat = parseFloat(coords[0].trim())
            const lng = parseFloat(coords[1].trim())
            if (!isNaN(lat) && !isNaN(lng)) {
              locationObj = { lat, lng }
              console.log('成功解析location:', { lat, lng })
            } else {
              console.warn('location坐标解析失败 - 非数字:', coords)
            }
          } else {
            console.warn('location格式错误 - 不是lat,lng格式:', apiItem.location)
          }
        } else {
          console.log('没有location字段或类型不是字符串:', apiItem.location)
        }
        
        const transformedItem = {
          id: apiItem.id,
          title: apiItem.name,
          description: apiItem.description,
          type: apiItem.type.toLowerCase() as 'found' | 'lost',
          status: apiItem.status ? apiItem.status.toLowerCase() as 'active' | 'resolved' : 'active',
          location: locationObj,
          site: apiItem.site,
          contact: '', // 后端没有返回联系方式字段
          date: apiItem.eventTime ? apiItem.eventTime.split('T')[0] : '',
          image: apiItem.imageUrl ? `${API_BASE_URL}/uploads/${apiItem.imageUrl}` : '',
          userId: apiItem.userId,
          userName: apiItem.username,
          userAvatar: '',
          createdAt: apiItem.createdAt
        }
        
        console.log('转换后的Item:', transformedItem)
        return transformedItem
      }) : []
      
      // 更新本地物品列表
      items.value = allItems
      
      return {
        success: true,
        data: result.data,
        message: '获取物品列表成功'
      }
    } else {
      return {
        success: false,
        data: [],
        message: result.message || '获取物品列表失败'
      }
    }
  } catch (error) {
    console.error('获取物品列表异常:', error)
    return {
      success: false,
      data: [],
      message: '网络连接失败，请检查后端服务是否启动'
    }
  }
}

// 获取单个物品信息
export const getItemById = async (id: number): Promise<{ success: boolean; data?: Item; message: string }> => {
  try {
    console.log('获取物品信息，ID:', id)
    
    // 先从本地mock数据中查找
    // const mockItem = mockData.items.find(item => item.id === id)
    // if (mockItem) {
    //   console.log('从mock数据中找到物品:', mockItem)
    //   
    //   // 确保返回的数据符合Item接口
    //   const formattedItem: Item = {
    //     id: mockItem.id,
    //     title: mockItem.title,
    //     description: mockItem.description,
    //     type: mockItem.type as 'found' | 'lost',
    //     status: (mockItem.status as 'active' | 'resolved') || 'active',
    //     location: mockItem.location,
    //     site: mockItem.site,
    //     contact: mockItem.contact,
    //     date: mockItem.date,
    //     image: mockItem.image,
    //     userId: mockItem.userId,
    //     userName: mockItem.userName,
    //     userAvatar: mockItem.userAvatar,
    //     createdAt: mockItem.createdAt
    //   }
    //   
    //   return {
    //     success: true,
    //     data: formattedItem,
    //     message: '获取成功'
    //   }
    // }
    
    // 如果mock数据中没有，尝试从API获取
    const token = localStorage.getItem('token')
    if (!token) {
      return {
        success: false,
        message: '请先登录'
      }
    }
    
    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          message: '物品不存在'
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    console.log('API返回的物品数据:', result)
    
    // API直接返回物品数据对象，不是包装在data字段中
    if (result && result.id) {
      // 转换API数据格式
      const transformedItem: Item = {
        id: result.id,
        title: result.name,
        description: result.description,
        type: result.type.toLowerCase() as 'found' | 'lost',
        status: result.status ? result.status.toLowerCase() as 'active' | 'resolved' : 'active',
        location: result.location ? {
          lat: parseFloat(result.location.split(',')[0]),
          lng: parseFloat(result.location.split(',')[1])
        } : undefined,
        site: result.site || '',
        contact: '',
        date: result.eventTime.split('T')[0],
        image: result.imageUrl ? `${API_BASE_URL}/uploads/${result.imageUrl}` : '',
        userId: result.userId,
        userName: result.username,
        userAvatar: '',
        createdAt: result.createdAt || result.eventTime
      }
      
      return {
        success: true,
        data: transformedItem,
        message: '获取成功'
      }
    } else {
      return {
        success: false,
        message: result.message || result.error || '获取失败'
      }
    }
  } catch (error) {
    console.error('获取物品信息异常:', error)
    return {
      success: false,
      message: '网络错误，请稍后重试'
    }
  }
}

// 删除物品的API调用
export const deleteItem = async (itemId: number): Promise<{ success: boolean; message: string }> => {
  console.log('开始删除物品:', itemId)
  
  try {
    const result = await itemsApiCall(`/items/${itemId}`, 'DELETE')
    console.log('删除物品 API 调用结果:', result)
    
    if (result.success) {
      // 删除成功后，从本地items列表中移除该物品
      const index = items.value.findIndex(item => item.id === itemId)
      if (index !== -1) {
        items.value.splice(index, 1)
        console.log('已从本地列表中移除物品:', itemId)
      }
      
      return {
        success: true,
        message: result.message || '删除成功'
      }
    } else {
      return {
        success: false,
        message: result.message || '删除失败'
      }
    }
  } catch (error) {
    console.error('删除物品异常:', error)
    return {
      success: false,
      message: '网络连接失败，请检查后端服务是否启动'
    }
  }
}

// 更新物品信息
export const updateItem = async (id: number, itemData: CreateItemRequest): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('更新物品信息，ID:', id, '数据:', itemData)
    
    const token = localStorage.getItem('token')
    if (!token) {
      return {
        success: false,
        message: '请先登录'
      }
    }
    
    // 构建查询参数 - name、description、eventTime、location、type、site、status作为query参数
    const queryParams = new URLSearchParams({
      name: itemData.name,
      description: itemData.description,
      eventTime: itemData.eventTime,
      location: itemData.location,
      type: itemData.type,
      site: itemData.site,
      status: itemData.status || 'ACTIVE'
    })
    
    // 准备FormData，仅用于图片上传
    const formData = new FormData()
    
    // 如果有新图片，添加到FormData作为body参数
    if (itemData.image) {
      formData.append('image', itemData.image)
    }
    
    console.log('准备发送的更新数据:', {
      url: `${API_BASE_URL}/items/${id}?${queryParams.toString()}`,
      hasImage: !!itemData.image,
      queryParams: Object.fromEntries(queryParams.entries())
    })
    
    const response = await fetch(`${API_BASE_URL}/items/${id}?${queryParams.toString()}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
        // 注意：不要设置Content-Type，让浏览器自动设置multipart/form-data
      },
      body: itemData.image ? formData : undefined // 只有在有图片时才发送FormData
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    console.log('更新物品API响应:', result)
    console.log('更新物品API响应码:', response.status)
    
    // 以HTTP响应码为准判断成功或失败
    if (response.ok && response.status === 200) {
      return {
        success: true,
        message: '更新成功'
      }
    } else {
      return {
        success: false,
        message: result.message || result.error || '更新失败'
      }
    }
  } catch (error) {
    console.error('更新物品异常:', error)
    return {
      success: false,
      message: '网络错误，请稍后重试'
    }
  }
}

// 搜索物品的API调用
export const searchItems = async (params?: {
  keyword?: string
  type?: 'FOUND' | 'LOST'
  startDate?: string
  endDate?: string
  location?: string
}): Promise<{ success: boolean; data?: Item[]; message: string }> => {
  console.log('开始搜索物品...')
  console.log('搜索参数:', params)
  
  try {
    // 构建查询参数
    const queryParams = new URLSearchParams()
    
    if (params?.keyword && params.keyword.trim()) {
      queryParams.set('keyword', params.keyword.trim())
    }
    if (params?.type) {
      queryParams.set('type', params.type)
    }
    if (params?.startDate) {
      queryParams.set('startDate', params.startDate)
    }
    if (params?.endDate) {
      queryParams.set('endDate', params.endDate)
    }
    if (params?.location && params.location.trim()) {
      queryParams.set('location', params.location.trim())
    }

    // 准备请求头
    const headers: Record<string, string> = {}
    
    // 添加Authorization头
    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const searchUrl = `${API_BASE_URL}/items/search${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    console.log('搜索请求URL:', searchUrl)
    console.log('请求头:', headers)

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers
    })

    console.log('搜索HTTP响应状态:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    // 检查响应是否为JSON
    const contentType = response.headers.get('content-type')
    const isJson = contentType && contentType.includes('application/json')
    
    let result: any = []
    
    if (isJson) {
      try {
        result = await response.json()
        console.log('解析的搜索结果:', result)
      } catch (jsonError) {
        console.error('搜索结果JSON解析失败:', jsonError)
        return {
          success: false,
          data: [],
          message: '服务器响应格式错误'
        }
      }
    } else {
      const text = await response.text()
      console.log('搜索返回文本响应:', text)
      return {
        success: false,
        data: [],
        message: text || '服务器响应异常'
      }
    }
    
    if (response.ok) {
      // API直接返回物品数组，不是包装在data字段中
      const searchResults: Item[] = Array.isArray(result) ? result.map((apiItem: any) => {
        console.log('处理搜索API物品数据:', apiItem)
        
        // 解析location字符串为坐标对象（搜索时不显示location字段，但仍需解析）
        let locationObj = undefined
        if (apiItem.location && typeof apiItem.location === 'string' && apiItem.location.trim()) {
          const coords = apiItem.location.split(',')
          if (coords.length === 2) {
            const lat = parseFloat(coords[0].trim())
            const lng = parseFloat(coords[1].trim())
            if (!isNaN(lat) && !isNaN(lng)) {
              locationObj = { lat, lng }
              console.log('搜索结果解析location:', { lat, lng })
            }
          }
        }
        
        const transformedItem: Item = {
          id: apiItem.id,
          title: apiItem.name,
          description: apiItem.description,
          type: apiItem.type.toLowerCase() as 'found' | 'lost',
          status: apiItem.status ? apiItem.status.toLowerCase() as 'active' | 'resolved' : 'active',
          location: locationObj, // 注意：前端展示时不使用location字段
          site: apiItem.site,
          contact: '', // 后端没有返回联系方式字段
          date: apiItem.eventTime ? apiItem.eventTime.split('T')[0] : '',
          image: apiItem.imageUrl ? `${API_BASE_URL}/uploads/${apiItem.imageUrl}` : '',
          userId: apiItem.userId,
          userName: apiItem.username,
          userAvatar: '', // 将由 UserAvatar 组件自动获取
          createdAt: apiItem.createdAt
        }
        
        console.log('转换后的搜索Item:', transformedItem)
        return transformedItem
      }) : []
      
      console.log('搜索成功，结果数量:', searchResults.length)
      
      return {
        success: true,
        data: searchResults, // 返回转换后的Item[]数据
        message: `搜索成功，找到 ${searchResults.length} 条结果`
      }
    } else {
      let errorMessage = '搜索失败'
      
      if (result && (result.message || result.error)) {
        errorMessage = result.message || result.error
      }
      
      switch (response.status) {
        case 401:
          errorMessage = '未授权访问，请重新登录'
          // 401错误时清除登录状态
          logout()
          break
        case 403:
          errorMessage = '访问被拒绝，请检查权限设置'
          break
        case 400:
          errorMessage = '搜索参数错误'
          break
        case 500:
          errorMessage = '服务器内部错误'
          break
        default:
          errorMessage = `搜索失败 (${response.status}): ${errorMessage}`
      }
      
      console.log('搜索失败:', errorMessage)
      return {
        success: false,
        data: [],
        message: errorMessage
      }
    }
  } catch (error) {
    console.error('搜索物品异常:', error)
    return {
      success: false,
      data: [],
      message: '网络连接失败，请检查后端服务是否启动'
    }
  }
}

// 获取用户相似物品推荐
export const getUserSimilarItemSuggestions = async (): Promise<{
  success: boolean;
  data?: SimilarItemSuggestion[];
  message: string;
}> => {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/api/similar-items`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    
    console.log('🔍 相似物品推荐API响应状态:', response.status);
    
    if (response.status === 401) {
      return {
        success: false,
        message: 'Missing token'
      };
    }
    
    if (!response.ok) {
      return {
        success: false,
        message: `获取推荐失败: ${response.status}`
      };
    }
    
    const data = await response.json();
    console.log('📊 相似物品推荐数据:', data);
    
    return {
      success: true,
      data: data,
      message: '获取推荐成功'
    };
  } catch (error) {
    console.error('获取相似物品推荐异常:', error);
    return {
      success: false,
      message: '网络错误，请稍后重试'
    };
  }
};

// 标记推荐为已读
export const markSuggestionAsViewed = async (suggestionId: number): Promise<{
  success: boolean;
  data?: MarkViewedResponse;
  message: string;
}> => {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/api/similar-items/${suggestionId}/view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    
    console.log(`📖 标记推荐${suggestionId}为已读API响应状态:`, response.status);
    
    if (response.status === 401) {
      return {
        success: false,
        message: 'Missing token'
      };
    }
    
    if (!response.ok) {
      return {
        success: false,
        message: `标记已读失败: ${response.status}`
      };
    }
    
    const data = await response.json();
    console.log('✅ 标记已读响应:', data);
    
    return {
      success: true,
      data: data,
      message: '标记已读成功'
    };
  } catch (error) {
    console.error('标记推荐已读异常:', error);
    return {
      success: false,
      message: '网络错误，请稍后重试'
    };
  }
}; 