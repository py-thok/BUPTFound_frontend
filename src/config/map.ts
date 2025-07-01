// 腾讯地图配置
export const MAP_CONFIG = {
  // 你的腾讯地图API Key
  API_KEY: 'GIVBZ-RFC6T-RCJXJ-VYV2X-WY37S-FVBCU',
  
  // 地图中心点（北京）
  CENTER: {
    lat: 40.157389,
    lng: 116.289229
  },
  
  // 默认缩放级别
  DEFAULT_ZOOM: 16,
  
  // 地图API URL
  API_URL: 'https://map.qq.com/api/gljs?v=1.exp'
};

// 位置数据接口
export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
}

// 动态加载腾讯地图API
export const loadTMapAPI = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载过
    if (window.TMap) {
      resolve(window.TMap);
      return;
    }

    // 创建script标签
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `${MAP_CONFIG.API_URL}&key=${MAP_CONFIG.API_KEY}`;
    script.charset = 'utf-8';
    
    // 监听加载完成
    script.onload = () => {
      if (window.TMap) {
        resolve(window.TMap);
      } else {
        reject(new Error('腾讯地图API加载失败'));
      }
    };
    
    // 监听加载失败
    script.onerror = () => {
      reject(new Error('腾讯地图API加载失败'));
    };
    
    // 添加到页面
    document.head.appendChild(script);
  });
};

// 声明全局TMap类型
declare global {
  interface Window {
    TMap: any;
  }
} 