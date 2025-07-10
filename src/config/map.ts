export const MAP_CONFIG = {
  API_KEY: '',
  
  CENTER: {
    lat: 40.157389,
    lng: 116.289229
  },
  
  DEFAULT_ZOOM: 16,
  
  API_URL: 'https://map.qq.com/api/gljs?v=1.exp'
};

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
}

export const loadTMapAPI = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (window.TMap) {
      resolve(window.TMap);
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `${MAP_CONFIG.API_URL}&key=${MAP_CONFIG.API_KEY}`;
    script.charset = 'utf-8';
    
    script.onload = () => {
      if (window.TMap) {
        resolve(window.TMap);
      } else {
        reject(new Error('腾讯地图API加载失败'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('腾讯地图API加载失败'));
    };
    
    document.head.appendChild(script);
  });
};

declare global {
  interface Window {
    TMap: any;
  }
} 