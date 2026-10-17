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
    effectiveType: conn ? conn.effectiveType?.toUpperCase() : 'Wi-Fi / Di động',
    downlink: conn && conn.downlink ? `${conn.downlink} Mbps` : 'Không xác định',
    rtt: conn && conn.rtt ? `${conn.rtt} ms` : 'Tốt'
  };

  return {
    deviceModel,
    osName,
    browserName: detectBrowserName(),
    screenWidth: Math.round(screenWidth),
    screenHeight: Math.round(screenHeight),
    dpr,
    refreshRate,
    cpuCores,
    ramEstimated,
    batteryInfo,
    storageInfo,
    networkInfo,
    isMobile: /Mobi|Android|iPhone/i.test(ua)
  };
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
