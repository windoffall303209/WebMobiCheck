/**
 * MobiCheck Web - System Information Collector
 * Thu thập thông tin phần cứng và hệ thống thông qua Web APIs chuẩn.
 */

// Thu thập thông tin cấu hình tổng thể của thiết bị và trình duyệt.
export async function getDeviceSummary() {
  const ua = navigator.userAgent;
  let deviceModel = 'Thiết bị Web';
  let osName = 'Không xác định';

  // Nhận diện hệ điều hành và mẫu thiết bị
  if (/Android/i.test(ua)) {
    osName = 'Android';
    const match = ua.match(/Android\s([0-9.]+);?\s?([^;)]*)/);
    if (match) {
      const androidVersion = match[1] || '';
      const rawModel = match[2] || '';
      osName = `Android ${androidVersion}`;
      if (rawModel && !rawModel.includes('Build/')) {
        deviceModel = rawModel.replace(/Build\/.*/, '').trim();
      }
    }
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    osName = 'iOS';
    deviceModel = /iPad/i.test(ua) ? 'Apple iPad' : 'Apple iPhone';
  } else if (/Windows NT/i.test(ua)) {
    osName = 'Windows';
    deviceModel = 'Máy tính cá nhân (PC)';
  } else if (/Macintosh/i.test(ua)) {
    osName = 'macOS';
    deviceModel = 'Apple Mac';
  } else if (/Linux/i.test(ua)) {
    osName = 'Linux';
    deviceModel = 'Thiết bị Linux';
  }

  // Fallback nhận diện hệ điều hành qua navigator.platform / userAgentData
  if (osName === 'Không xác định') {
    if (navigator.userAgentData && navigator.userAgentData.platform) {
      osName = navigator.userAgentData.platform;
      if (/Windows/i.test(osName)) deviceModel = 'Máy tính cá nhân (PC)';
    } else if (navigator.platform) {
      if (/Win/i.test(navigator.platform)) {
        osName = 'Windows';
        deviceModel = 'Máy tính cá nhân (PC)';
      } else if (/Mac/i.test(navigator.platform)) {
        osName = 'macOS';
        deviceModel = 'Apple Mac';
      } else if (/Linux/i.test(navigator.platform)) {
        osName = 'Linux';
        deviceModel = 'Thiết bị Linux';
      }
    }
  }

  // Thử đọc Client Hints nếu trình duyệt hỗ trợ
  if (navigator.userAgentData) {
    try {
      const highEntropy = await navigator.userAgentData.getHighEntropyValues(['model', 'platformVersion', 'architecture']);
      if (highEntropy.model) {
        deviceModel = highEntropy.model;
      }
    } catch (_) {
      // Bỏ qua lỗi nếu không được cấp quyền đọc high-entropy
    }
  }

  // Thông số màn hình
  const screenWidth = window.screen.width * (window.devicePixelRatio || 1);
  const screenHeight = window.screen.height * (window.devicePixelRatio || 1);
  const dpr = (window.devicePixelRatio || 1).toFixed(1);
  const refreshRate = await detectRefreshRate();

  // Thông số CPU & RAM
  const cpuCores = navigator.hardwareConcurrency || 8;
  const ramEstimated = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : '>= 4 GB';

  // Thông số Pin
  let batteryInfo = {
    supported: false,
    level: 100,
    charging: false,
    text: 'Không hỗ trợ trên trình duyệt'
  };

  if ('getBattery' in navigator) {
    try {
      const battery = await navigator.getBattery();
      batteryInfo = {
        supported: true,
        level: Math.round(battery.level * 100),
        charging: battery.charging,
        text: `${Math.round(battery.level * 100)}% (${battery.charging ? 'Đang sạc' : 'Dùng pin'})`
      };
    } catch (_) {
      // Trình duyệt từ chối cung cấp API pin
    }
  }

  // Thông số Bộ nhớ lưu trữ
  let storageInfo = {
    supported: false,
    quotaGB: '0',
    usedGB: '0',
    text: 'Không xác định'
  };

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      const quota = ((est.quota || 0) / (1024 * 1024 * 1024)).toFixed(1);
      const usage = ((est.usage || 0) / (1024 * 1024 * 1024)).toFixed(1);
      storageInfo = {
        supported: true,
        quotaGB: quota,
        usedGB: usage,
        text: `${usage} GB / ${quota} GB khả dụng`
      };
    } catch (_) {
      // Storage estimation không khả dụng
    }
  }

  // Thông số Mạng
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const networkInfo = {
    online: navigator.onLine,
    effectiveType: conn && conn.effectiveType ? conn.effectiveType.toUpperCase() : (navigator.onLine ? 'Wi-Fi / Ethernet' : 'Ngoại tuyến'),
    downlink: conn && conn.downlink ? `${conn.downlink} Mbps` : 'Băng thông rộng',
    rtt: conn && conn.rtt ? `${conn.rtt} ms` : '< 50 ms'
  };

  // Thông số GPU & Cảm biến & Màn hình
  const gpuRenderer = detectGpuRenderer();
  const sensorCount = countSupportedSensors();
  const dpi = Math.round((window.devicePixelRatio || 1) * 96);
  const aspectStr = screenWidth >= screenHeight ? '16:9 • Desktop' : '19.5:9 • Mobile';

  return {
    deviceModel,
    osName,
    browserName: detectBrowserName(),
    screenWidth: Math.round(screenWidth),
    screenHeight: Math.round(screenHeight),
    dpr,
    dpi,
    aspectStr,
    refreshRate,
    cpuCores,
    ramEstimated,
    batteryInfo,
    storageInfo,
    networkInfo,
    gpuRenderer,
    sensorCount,
    isMobile: /Mobi|Android|iPhone/i.test(ua)
  };
}

// Lấy thông tin card đồ họa GPU qua WebGL extension unmasked renderer.
function detectGpuRenderer() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (renderer) {
          const clean = renderer.replace(/ANGLE \((.*)\)/, '$1').replace(/, Direct3D.*/, '').replace(/Direct3D.*/, '').trim();
          return clean || renderer;
        }
      }
    }
  } catch (_) {}
  return 'WebGL Tăng tốc phần cứng';
}

// Đếm số lượng API cảm biến và thiết bị ngoại vi được trình duyệt hỗ trợ.
function countSupportedSensors() {
  let count = 0;
  if ('DeviceOrientationEvent' in window) count++;
  if ('DeviceMotionEvent' in window) count++;
  if ('Accelerometer' in window) count++;
  if ('Gyroscope' in window) count++;
  if ('AmbientLightSensor' in window) count++;
  if ('geolocation' in navigator) count++;
  if ('getBattery' in navigator) count++;
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) count++;
  return count;
}

// Đo lường tần số quét tươi màn hình (Refresh Rate) qua requestAnimationFrame.
function detectRefreshRate() {
  return new Promise((resolve) => {
    let frameCount = 0;
    const startTime = performance.now();

    function checkFrame() {
      frameCount++;
      const elapsed = performance.now() - startTime;
      if (elapsed >= 500) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        // Làm tròn đến các chuẩn tần số quét phổ biến: 60Hz, 90Hz, 120Hz, 144Hz
        if (fps >= 135) resolve(144);
        else if (fps >= 110) resolve(120);
        else if (fps >= 80) resolve(90);
        else resolve(60);
      } else {
        requestAnimationFrame(checkFrame);
      }
    }
    requestAnimationFrame(checkFrame);
  });
}

// Xác định tên trình duyệt web đang sử dụng.
function detectBrowserName() {
  const ua = navigator.userAgent;
  if (/Edg/i.test(ua)) return 'Microsoft Edge';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Google Chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Apple Safari';
  if (/Firefox/i.test(ua)) return 'Mozilla Firefox';
  if (/Opera|OPR/i.test(ua)) return 'Opera';
  return 'Web Browser';
}
