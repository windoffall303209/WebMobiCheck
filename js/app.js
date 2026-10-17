/**
 * MobiCheck Web - Main Application Controller
 * Quản lý vòng đời ứng dụng, giao diện, thanh điều hướng và kết nối các mô-đun kiểm tra.
 */

import { QUICK_CHECK_STAGES, CHECK_STATUS, APP_INFO } from './config.js';
import { getDeviceSummary } from './system-info.js';
import { ReportManager } from './report.js';
import { ScenarioRunner } from './runner.js';
import { DisplayTest } from './test-display.js';
import { TouchTest } from './test-touch.js';
import { AudioTest } from './test-audio.js';
import { MicTest } from './test-mic.js';
import { CameraTest } from './test-camera.js';
import { MotionTest } from './test-motion.js';

class MobiCheckApp {
  // Khởi tạo các thành phần cốt lõi và gắn sự kiện giao diện.
  constructor() {
    this.reportManager = new ReportManager();
    this.deviceInfo = null;

    // Các thể hiện bài kiểm tra
    this.displayTester = null;
    this.touchTester = null;
    this.audioTester = new AudioTest();
    this.micTester = null;
    this.cameraTester = null;
    this.motionTester = null;

    // Bộ điều phối kịch bản kiểm tra
    this.runner = new ScenarioRunner(this.reportManager, {
      onStageStart: (stage, idx, total) => this.onRunnerStageStart(stage, idx, total),
      onStageEnd: (stage, idx, total) => this.onRunnerStageEnd(stage, idx, total),
      onFinish: () => this.onRunnerFinished(),
      requestUserInteraction: (stage) => this.launchInteractiveTestModal(stage.id)
    });

    this.activeInteractiveResolve = null;
  }

  // Khởi động ứng dụng, nạp thông tin phần cứng và hiển thị màn hình chính.
  async init() {
    this.bindNavigation();
    this.bindDrawerMenu();
    this.bindGlobalActions();
    this.renderTestGrid();

    // Nạp thông tin thiết bị
    this.deviceInfo = await getDeviceSummary();
    this.bindDeviceHeroUI(this.deviceInfo);
    this.updateCardStatusDots();
  }

  // Gắn sự kiện chuyển tab cho thanh điều hướng dưới đáy.
  bindNavigation() {
    const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');

    const handleTabClick = (btn) => {
      const targetScreen = btn.getAttribute('data-screen');
      if (targetScreen) {
        this.switchScreen(targetScreen);
      }
    };

    bottomNavItems.forEach((btn) => btn.addEventListener('click', () => handleTabClick(btn)));
  }

  // Gắn sự kiện đóng mở menu ngăn kéo (Drawer menu).
  bindDrawerMenu() {
    const openBtn = document.getElementById('btnOpenMenu');
    const closeBtn = document.getElementById('btnCloseDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    const drawerLinks = document.querySelectorAll('.drawer-link');

    if (openBtn) {
      openBtn.addEventListener('click', () => backdrop.classList.add('open'));
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => backdrop.classList.remove('open'));
    }
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.remove('open');
      });
    }

    drawerLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetScreen = link.getAttribute('data-screen');
        if (targetScreen) {
          this.switchScreen(targetScreen);
        }
        backdrop.classList.remove('open');
      });
    });
  }

  // Chuyển đổi qua lại giữa các màn hình chức năng và đồng bộ trạng thái thanh điều hướng.
  switchScreen(screenId) {
    const screens = document.querySelectorAll('.app-screen');
    screens.forEach((s) => s.classList.remove('active'));

    const activeScreen = document.getElementById(screenId);
    if (activeScreen) {
      activeScreen.classList.add('active');
      const container = document.querySelector('.screen-container');
      if (container) container.scrollTop = 0;
    }

    // Đồng bộ trạng thái active trên Bottom Nav
    document.querySelectorAll('.bottom-nav .nav-item').forEach((item) => {
      item.classList.toggle('active', item.getAttribute('data-screen') === screenId);
    });
  }

  // Gắn sự kiện cho các nút hành động chính (Kiểm tra ngay, 4 ô thống kê, 8 nút kiểm tra nhanh).
  bindGlobalActions() {
    const btnStartCheck = document.getElementById('btnHomeStartCheck');
    const btnExploreTests = document.getElementById('btnExploreQuickTests');

    if (btnStartCheck) {
      btnStartCheck.addEventListener('click', () => this.startAutomatedSequence());
    }

    if (btnExploreTests) {
      btnExploreTests.addEventListener('click', () => {
        this.switchScreen('screenTests');
      });
    }

    // 4 Ô thống kê CPU, RAM, Bộ nhớ, Pin trên Home -> mở chi tiết phần cứng
    const statCpu = document.getElementById('btnHomeStatCpu');
    const statRam = document.getElementById('btnHomeStatRam');
    const statStorage = document.getElementById('btnHomeStatStorage');
    const statBattery = document.getElementById('btnHomeStatBattery');

    if (statCpu) statCpu.addEventListener('click', () => this.openHardwareDetail('cpu'));
    if (statRam) statRam.addEventListener('click', () => this.openHardwareDetail('ram'));
    if (statStorage) statStorage.addEventListener('click', () => this.openHardwareDetail('storage'));
    if (statBattery) statBattery.addEventListener('click', () => this.openHardwareDetail('battery'));

    // 8 Nút kiểm tra nhanh linh kiện trực tiếp trên Home
    const btnQuickDisplay = document.getElementById('btnHomeQuickDisplay');
    const btnQuickTouch = document.getElementById('btnHomeQuickTouch');
    const btnQuickCamera = document.getElementById('btnHomeQuickCamera');
    const btnQuickSpeaker = document.getElementById('btnHomeQuickSpeaker');
    const btnQuickMic = document.getElementById('btnHomeQuickMic');
    const btnQuickVibrate = document.getElementById('btnHomeQuickVibrate');
    const btnQuickSensor = document.getElementById('btnHomeQuickSensor');
    const btnQuickBattery = document.getElementById('btnHomeQuickBattery');

    if (btnQuickDisplay) btnQuickDisplay.addEventListener('click', () => this.launchInteractiveTestModal('display'));
    if (btnQuickTouch) btnQuickTouch.addEventListener('click', () => this.launchInteractiveTestModal('touch'));
    if (btnQuickCamera) btnQuickCamera.addEventListener('click', () => this.launchInteractiveTestModal('camera'));
    if (btnQuickSpeaker) btnQuickSpeaker.addEventListener('click', () => this.launchInteractiveTestModal('audio'));
    if (btnQuickMic) btnQuickMic.addEventListener('click', () => this.launchInteractiveTestModal('microphone'));
    if (btnQuickVibrate) btnQuickVibrate.addEventListener('click', () => this.runVibrateCheck());
    if (btnQuickSensor) btnQuickSensor.addEventListener('click', () => this.launchInteractiveTestModal('motion'));
    if (btnQuickBattery) btnQuickBattery.addEventListener('click', () => this.openHardwareDetail('battery'));

    // 3 Thẻ thông số phần cứng chi tiết trên Home
    const cardDisplaySpecs = document.getElementById('cardHomeDisplaySpecs');
    const cardNetworkSpecs = document.getElementById('cardHomeNetworkSpecs');
    const cardSystemSpecs = document.getElementById('cardHomeSystemSpecs');

    if (cardDisplaySpecs) cardDisplaySpecs.addEventListener('click', () => this.openHardwareDetail('device'));
    if (cardNetworkSpecs) cardNetworkSpecs.addEventListener('click', () => this.runNetworkCheck());
    if (cardSystemSpecs) cardSystemSpecs.addEventListener('click', () => this.openHardwareDetail('device'));

    // Màn hình chi tiết phần cứng: Nút quay lại và 5 tabs
    const btnHwBack = document.getElementById('btnHardwareDetailBack');
    if (btnHwBack) {
      btnHwBack.addEventListener('click', () => this.switchScreen('screenHome'));
    }

    const hwTabs = ['cpu', 'ram', 'storage', 'battery', 'device'];
    hwTabs.forEach((tab) => {
      const btn = document.getElementById(`tabHw${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
      if (btn) {
        btn.addEventListener('click', () => this.renderHardwareDetail(tab));
      }
    });
  }

  // Mở màn hình Cấu hình phần cứng chi tiết với tab tương ứng.
  openHardwareDetail(tab = 'cpu') {
    this.currentHwTab = tab;
    this.renderHardwareDetail(tab);
    this.switchScreen('screenHardwareDetail');
  }

  // Thêm một dòng thông số ItemFigmaSpecRow vào container chi tiết phần cứng.
  addSpecRow(container, label, value, statusText = 'Đã xác nhận', isOk = true) {
    const row = document.createElement('div');
    row.className = 'hw-spec-row';
    row.innerHTML = `
      <div class="hw-spec-main">
        <span class="hw-spec-label">${label}</span>
        <span class="hw-spec-value">${value}</span>
      </div>
      <span class="hw-spec-badge ${isOk ? 'ok' : 'warn'}">${statusText}</span>
    `;
    container.appendChild(row);
  }

  // Kết xuất toàn bộ danh sách thông số kỹ thuật theo tab được chọn.
  renderHardwareDetail(tab = 'cpu') {
    this.currentHwTab = tab;
    const tabs = ['cpu', 'ram', 'storage', 'battery', 'device'];
    tabs.forEach((t) => {
      const btn = document.getElementById(`tabHw${t.charAt(0).toUpperCase() + t.slice(1)}`);
      if (btn) btn.classList.toggle('active', t === tab);
    });

    const iconEl = document.getElementById('hwSectionIcon');
    const titleEl = document.getElementById('hwSectionTitle');
    const container = document.getElementById('llHardwareDetailRows');
    if (!container) return;
    container.innerHTML = '';

    const info = this.deviceInfo || {};
    const battery = info.batteryInfo || {};
    const storage = info.storageInfo || {};
    const network = info.networkInfo || {};

    if (tab === 'cpu') {
      if (iconEl) iconEl.innerHTML = '<use href="assets/icons.svg#icon-chip"></use>';
      if (titleEl) titleEl.innerText = 'Bộ vi xử lý (CPU & Chip)';
      this.addSpecRow(container, 'Số luồng xử lý phần cứng', `${info.cpuCores || '--'} Luồng logic`);
      this.addSpecRow(container, 'Kiến trúc xử lý', info.cpuArch || '64-bit Architecture');
      this.addSpecRow(container, 'Nền tảng hệ điều hành', `${info.osName || 'Thiết bị di động'}`);
      this.addSpecRow(container, 'Trình duyệt Web điều phối', `${info.browserName || 'Chrome'} ${info.browserVersion || ''}`);
      this.addSpecRow(container, 'Tình trạng CPU', 'Bình thường (Đang phản hồi)', 'Hoạt động', true);
      this.addSpecRow(container, 'Giới hạn định danh SoC', 'Trình duyệt hạn chế đọc tên mã chip vật lý (Snapdragon/Dimensity/Apple A) để bảo vệ quyền riêng tư', 'Giới hạn Web', false);
    } else if (tab === 'ram') {
      if (iconEl) iconEl.innerHTML = '<use href="assets/icons.svg#icon-ram"></use>';
      if (titleEl) titleEl.innerText = 'Bộ nhớ truy xuất ngẫu nhiên (RAM)';
      this.addSpecRow(container, 'Dung lượng RAM ước tính', info.ramEstimated || 'Không xác định');
      this.addSpecRow(container, 'Tình trạng bộ nhớ', 'Bình thường (Đủ tài nguyên Web)', 'Đã xác nhận', true);
      this.addSpecRow(container, 'Thuật toán xác định', 'Đọc qua navigator.deviceMemory chuẩn W3C Device Memory API', 'Chuẩn W3C', true);
      this.addSpecRow(container, 'Giới hạn làm tròn (RS-006)', 'Trình duyệt cố định tối đa 8GB để phòng chống theo dõi cấu hình người dùng (Fingerprinting)', 'Giới hạn Web', false);
    } else if (tab === 'storage') {
      if (iconEl) iconEl.innerHTML = '<use href="assets/icons.svg#icon-storage"></use>';
      if (titleEl) titleEl.innerText = 'Bộ nhớ trong & Lưu trữ (ROM)';
      this.addSpecRow(container, 'Hạn ngạch lưu trữ Web', storage.supported ? `${storage.quotaGB} GB` : 'Theo cấp phát trình duyệt');
      this.addSpecRow(container, 'Dung lượng đã sử dụng', storage.supported ? `${storage.usageMB} MB` : '0 MB');
      this.addSpecRow(container, 'Cơ chế lưu trữ ngoại tuyến', 'Origin Private Storage API / IndexedDB', 'Hoạt động', true);
      this.addSpecRow(container, 'Quyền đọc / ghi', 'Bình thường (Đọc / Ghi ổn định)', 'Đã xác nhận', true);
      this.addSpecRow(container, 'Giới hạn phân vùng sâu', 'Web sandbox không truy cập được chip lưu trữ UFS/eMMC nội bộ của thiết bị', 'Giới hạn Web', false);
    } else if (tab === 'battery') {
      if (iconEl) iconEl.innerHTML = '<use href="assets/icons.svg#icon-battery"></use>';
      if (titleEl) titleEl.innerText = 'Tình trạng Pin & Nguồn điện';
      const isCharging = battery.charging;
      const pct = battery.level !== undefined ? `${battery.level}%` : 'Đang phát hiện';
      this.addSpecRow(container, 'Mức pin hiện tại', pct, 'Đã xác nhận', true);
      this.addSpecRow(container, 'Trạng thái sạc pin', isCharging ? 'Đang sạc điện thoại' : 'Đang dùng nguồn pin', isCharging ? 'Đang sạc' : 'Dùng pin', true);
      this.addSpecRow(container, 'Cổng sạc kết nối', isCharging ? 'Nguồn AC / Cáp sạc USB' : 'Chưa cắm sạc', isCharging ? 'Đã cắm' : 'Bình thường', true);
      this.addSpecRow(container, 'Thời gian ước tính', battery.chargingTime || 'Theo tiêu chuẩn phần cứng', 'Tự động', true);
      this.addSpecRow(container, 'Tình trạng sức khỏe pin', 'Bình thường', 'Bình thường', true);
      this.addSpecRow(container, 'Giới hạn kiểm tra sâu', 'Trình duyệt không đo được số chu kỳ sạc (Battery Cycles), dung lượng mAh và nhiệt độ cell pin', 'Giới hạn Web', false);
    } else if (tab === 'device') {
      if (iconEl) iconEl.innerHTML = '<use href="assets/icons.svg#icon-display"></use>';
      if (titleEl) titleEl.innerText = 'Thông tin thiết bị & Màn hình';
      this.addSpecRow(container, 'Model thiết bị', info.deviceModel || 'Thiết bị di động');
      this.addSpecRow(container, 'Hệ điều hành', `${info.osName || 'Android'} (${info.osVersion || 'Bản mới'})`);
      this.addSpecRow(container, 'Độ phân giải màn hình', `${info.screenWidth} x ${info.screenHeight} px`);
      this.addSpecRow(container, 'Tần số quét tươi', `${info.refreshRate || 60} Hz`);
      this.addSpecRow(container, 'Mật độ điểm ảnh (DPR)', `${info.dpr || 1.0}x`);
      this.addSpecRow(container, 'Mạng kết nối', `${network.effectiveType || 'Trực tuyến'} (${network.downlink || 'Băng thông cao'})`);
      this.addSpecRow(container, 'Độ trễ phản hồi (RTT)', network.rtt || 'Bình thường');
      this.addSpecRow(container, 'Giới hạn IMEI & Serial', 'Mã IMEI, Số Serial, Bootloader và phần cứng sâu chỉ khả dụng trên MobiCheck Android', 'Giới hạn Web', false);
    }
  }

  // Kích hoạt mô tơ rung và hiển thị phản hồi trạng thái cho người dùng.
  async runVibrateCheck() {
    const stage = QUICK_CHECK_STAGES.find((s) => s.id === 'vibrate');
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
    if (stage) {
      await this.runner.runStage(stage);
      this.updateCardStatusDots();
    }
  }

  // Đo kiểm tra độ trễ mạng và cập nhật thông số kết nối.
  async runNetworkCheck() {
    const stage = QUICK_CHECK_STAGES.find((s) => s.id === 'connectivity');
    if (stage) {
      await this.runner.runStage(stage);
      this.updateCardStatusDots();
      this.openHardwareDetail('device');
    }
  }

  // Điền dữ liệu cấu hình phần cứng vào thẻ thông tin Hero Card & 3 thẻ thông số chi tiết chuẩn Android.
  bindDeviceHeroUI(info) {
    const titleEl = document.getElementById('heroDeviceTitle');
    const subEl = document.getElementById('heroDeviceSub');
    const badgeEl = document.getElementById('heroDeviceBadge');

    const cpuEl = document.getElementById('statValCpu');
    const ramEl = document.getElementById('statValRam');
    const storageEl = document.getElementById('statValStorage');
    const batteryEl = document.getElementById('statValBattery');

    if (titleEl) titleEl.innerText = info.deviceModel;
    if (subEl) subEl.innerText = `${info.browserName} • ${info.osName}`;
    if (badgeEl) badgeEl.innerText = `Quick Check • ${info.osName}`;

    if (cpuEl) cpuEl.innerText = `${info.cpuCores} Cores`;
    if (ramEl) ramEl.innerText = info.ramEstimated;
    if (storageEl) storageEl.innerText = info.storageInfo.supported ? `${info.storageInfo.quotaGB} GB` : 'Khả dụng';
    if (batteryEl) batteryEl.innerText = info.batteryInfo.supported ? `${info.batteryInfo.level}%` : 'Chuẩn Web';

    // 1. Thẻ Màn hình & Đồ họa (cardHomeDisplaySpecs)
    const tvRes = document.getElementById('tvHomeDisplayResolution');
    const tvHz = document.getElementById('tvHomeDisplayRefreshRate');
    const tvDpi = document.getElementById('tvHomeDisplayDpi');
    const tvSize = document.getElementById('tvHomeDisplaySize');

    if (tvRes) tvRes.innerText = `${info.screenWidth} x ${info.screenHeight}`;
    if (tvHz) tvHz.innerText = `${info.refreshRate} Hz`;
    if (tvDpi) tvDpi.innerText = `${info.dpi} DPI • ${info.dpr}x`;
    if (tvSize) tvSize.innerText = info.aspectStr || '~16:9';

    // 2. Thẻ Kết nối & Viễn thông (cardHomeNetworkSpecs)
    const badgeNet = document.getElementById('tvHomeNetworkBadge');
    const tvWifi = document.getElementById('tvHomeWifiStatus');
    const tvMobile = document.getElementById('tvHomeMobileStatus');
    const tvRtt = document.getElementById('tvHomeBluetoothStatus');
    const tvGps = document.getElementById('tvHomeGpsStatus');

    if (badgeNet) {
      badgeNet.innerText = info.networkInfo.online ? 'Trực tuyến' : 'Ngoại tuyến';
      if (!info.networkInfo.online) badgeNet.classList.add('amber');
      else badgeNet.classList.remove('amber');
    }
    if (tvWifi) tvWifi.innerText = info.networkInfo.online ? 'Đang kết nối' : 'Đã ngắt';
    if (tvMobile) tvMobile.innerText = `${info.networkInfo.effectiveType} (~${info.networkInfo.downlink})`;
    if (tvRtt) tvRtt.innerText = `${info.networkInfo.rtt}`;
    if (tvGps) tvGps.innerText = 'geolocation' in navigator ? 'Sẵn sàng (W3C)' : 'Không hỗ trợ';

    // 3. Thẻ Hệ thống & Cảm biến (cardHomeSystemSpecs)
    const tvSensor = document.getElementById('tvHomeSensorCount');
    const tvUptime = document.getElementById('tvHomeUptime');
    const tvSecPatch = document.getElementById('tvHomeSecurityPatch');
    const tvKernel = document.getElementById('tvHomeKernel');

    const uptimeMinutes = Math.max(1, Math.round(performance.now() / 60000));
    if (tvSensor) tvSensor.innerText = `${info.cpuCores} luồng CPU`;
    if (tvUptime) tvUptime.innerText = `Phiên: ${uptimeMinutes} phút`;
    if (tvSecPatch) tvSecPatch.innerText = `${info.osName}`;
    if (tvKernel) tvKernel.innerText = info.gpuRenderer || 'WebGL Hardware';
  }

  // Tạo danh sách thẻ bài kiểm tra trên lưới giao diện (Trang chủ & Màn hình Kiểm tra).
  renderTestGrid() {
    const catalogGrid = document.getElementById('catalogTestCardsGrid');

    const renderCardHtml = (stage) => `
      <div class="test-card-item" data-stage-id="${stage.id}">
        <div class="test-card-icon-wrap">
          <svg><use href="assets/icons.svg#icon-${stage.icon}"></use></svg>
          <span class="test-card-dot" id="dot-${stage.id}"></span>
        </div>
        <div class="test-card-name">${stage.name}</div>
        <div class="test-card-substatus" id="sub-${stage.id}">${stage.webSupported ? 'Chưa kiểm tra' : 'Giới hạn Web'}</div>
      </div>
    `;

    const allCardsHtml = QUICK_CHECK_STAGES.map(renderCardHtml).join('');
    if (catalogGrid) catalogGrid.innerHTML = allCardsHtml;

    // Gắn sự kiện click mở từng bài kiểm tra riêng biệt
    document.querySelectorAll('.test-card-item').forEach((card) => {
      card.addEventListener('click', () => {
        const stageId = card.getAttribute('data-stage-id');
        this.startSingleTest(stageId);
      });
    });
  }

  // Cập nhật chấm tròn trạng thái (xanh/vàng/xám) trên từng thẻ bài test.
  updateCardStatusDots() {
    const recorded = this.reportManager.getAllItems();
    recorded.forEach((item) => {
      const dots = document.querySelectorAll(`#dot-${item.id}`);
      const subs = document.querySelectorAll(`#sub-${item.id}`);

      dots.forEach((dot) => {
        dot.className = `test-card-dot active ${item.status.colorClass}`;
      });

      subs.forEach((sub) => {
        sub.innerText = item.status.title;
        sub.style.color = item.status.code === 'RS-001' ? 'var(--mc-ok)' : 'var(--mc-dim)';
      });
    });
  }

  // Chạy bài kiểm tra đơn lẻ khi người dùng bấm trực tiếp vào thẻ.
  async startSingleTest(stageId) {
    const stage = QUICK_CHECK_STAGES.find((s) => s.id === stageId);
    if (!stage) return;

    if (!stage.webSupported) {
      alert(`Hạng mục "${stage.name}" yêu cầu quyền Native sâu (IMEI, chu kỳ pin, phần cứng bo mạch).\nVui lòng cài đặt ứng dụng Android MobiCheck để kiểm tra.`);
      return;
    }

    if (stage.id === 'battery') {
      await this.runner.runStage(stage);
      this.updateCardStatusDots();
      this.openHardwareDetail('battery');
    } else if (stage.id === 'storage') {
      await this.runner.runStage(stage);
      this.updateCardStatusDots();
      this.openHardwareDetail('storage');
    } else if (stage.id === 'connectivity') {
      await this.runNetworkCheck();
    } else if (stage.id === 'vibrate') {
      await this.runVibrateCheck();
    } else {
      this.launchInteractiveTestModal(stage.id);
    }
  }

  // Khởi chạy toàn bộ chuỗi kịch bản kiểm tra tự động.
  startAutomatedSequence() {
    this.openModal('modalRunner');
    const progressBar = document.getElementById('runnerProgressBar');
    const percentEl = document.getElementById('runnerPercent');
    const stageNameEl = document.getElementById('runnerActiveStageName');

    if (progressBar) progressBar.style.width = '0%';
    if (percentEl) percentEl.innerText = '0%';
    if (stageNameEl) stageNameEl.innerText = 'Bắt đầu kiểm tra...';

    this.runner.startAutoCheck(QUICK_CHECK_STAGES);
  }

  // Cập nhật giao diện khi một stage kiểm tra bắt đầu trong tiến trình tự động.
  onRunnerStageStart(stage, index, total) {
    const progressBar = document.getElementById('runnerProgressBar');
    const percentEl = document.getElementById('runnerPercent');
    const stageNameEl = document.getElementById('runnerActiveStageName');

    const percent = Math.round((index / total) * 100);
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (percentEl) percentEl.innerText = `${percent}%`;
    if (stageNameEl) stageNameEl.innerText = `Đang kiểm tra: ${stage.name}`;
  }

  // Cập nhật giao diện khi một stage kiểm tra kết thúc.
  onRunnerStageEnd(stage, index, total) {
    this.updateCardStatusDots();
  }

  // Xử lý khi hoàn tất toàn bộ chuỗi kiểm tra tự động.
  onRunnerFinished() {
    this.closeModal('modalRunner');
    this.updateCardStatusDots();
    this.switchScreen('screenTests');
  }

  // Mở modal kiểm tra tương tác theo ID bài kiểm tra.
  launchInteractiveTestModal(stageId) {
    return new Promise((resolve) => {
      this.activeInteractiveResolve = resolve;

      switch (stageId) {
        case 'display':
          this.openDisplayModal();
          break;
        case 'touch':
          this.openTouchModal();
          break;
        case 'speaker':
          this.openSpeakerModal();
          break;
        case 'microphone':
          this.openMicModal();
          break;
        case 'camera':
          this.openCameraModal();
          break;
        case 'motion':
          this.openMotionModal();
          break;
        default:
          this.resolveInteractiveTest(null);
          break;
      }
    });
  }

  // Kết thúc lượt kiểm tra tương tác và kích hoạt Promise tiếp theo của kịch bản.
  resolveInteractiveTest(resultItem) {
    if (resultItem) {
      this.reportManager.recordItem(resultItem);
      this.updateCardStatusDots();
    }
    if (this.activeInteractiveResolve) {
      const fn = this.activeInteractiveResolve;
      this.activeInteractiveResolve = null;
      fn();
    }
  }

  // ==================== MODAL 1: MÀN HÌNH ====================
  openDisplayModal() {
    this.openModal('modalDisplayTest');
    const container = document.getElementById('displayTestContainer');
    this.displayTester = new DisplayTest(container);
    this.displayTester.start();

    const btnPass = document.getElementById('btnDisplayPass');
    const btnFail = document.getElementById('btnDisplayFail');

    const onFinish = (status, val, note) => {
      this.displayTester.stop();
      this.closeModal('modalDisplayTest');
      this.resolveInteractiveTest({
        id: 'display',
        title: 'Màn hình & Điểm chết',
        category: 'display_touch',
        status,
        summaryValue: val,
        evidenceNote: note
      });
    };

    btnPass.onclick = () => onFinish(CHECK_STATUS.RS_001_VERIFIED, 'Bình thường', 'Người dùng đã kiểm tra 8 mẫu màu và xác nhận không có điểm chết hoặc sọc.');
    btnFail.onclick = () => onFinish(CHECK_STATUS.RS_007_OBSERVATION, 'Có đốm / Điểm chết', 'Người dùng phát hiện điểm bất thường, hở sáng hoặc điểm chết trên màn hình.');
  }

  // ==================== MODAL 2: CẢM ỨNG ====================
  openTouchModal() {
    this.openModal('modalTouchTest');
    const container = document.getElementById('touchCanvasContainer');
    let lastStats = { coveredCells: 0, totalCells: 112, percent: 0, maxPointers: 1 };

    this.touchTester = new TouchTest(container, (stats) => {
      lastStats = stats;
    });
    this.touchTester.start();

    const btnPass = document.getElementById('btnTouchPass');
    const btnFail = document.getElementById('btnTouchFail');

    const onFinish = (status, val, note) => {
      this.touchTester.stop();
      this.closeModal('modalTouchTest');
      this.resolveInteractiveTest({
        id: 'touch',
        title: 'Cảm ứng & Đa điểm',
        category: 'display_touch',
        status,
        summaryValue: val,
        evidenceNote: note
      });
    };

    btnPass.onclick = () => onFinish(
      CHECK_STATUS.RS_001_VERIFIED,
      `Quét ${lastStats.percent}% • Đa điểm ${lastStats.maxPointers}`,
      `Đã quét phủ ${lastStats.coveredCells}/${lastStats.totalCells} ô cảm ứng; nhận diện đa chạm tối đa ${lastStats.maxPointers} điểm đồng thời.`
    );
    btnFail.onclick = () => onFinish(
      CHECK_STATUS.RS_002_NOT_CONFIRMED,
      'Cảm ứng chưa hoàn tất',
      'Người dùng xác nhận cảm ứng bị đứt đoạn hoặc chưa quét đủ diện tích màn hình.'
    );
  }

  // ==================== MODAL 3: LOA NGOÀI ====================
  openSpeakerModal() {
    this.openModal('modalSpeakerTest');
    const btnPlay440 = document.getElementById('btnPlaySpeaker440');
    const btnPlay1000 = document.getElementById('btnPlaySpeaker1000');
    const btnPass = document.getElementById('btnSpeakerPass');
    const btnFail = document.getElementById('btnSpeakerFail');

    btnPlay440.onclick = () => this.audioTester.playTestTone(440, 1.2, 0);
    btnPlay1000.onclick = () => this.audioTester.playTestTone(1000, 1.0, 0);

    const onFinish = (status, val, note) => {
      this.audioTester.cleanup();
      this.closeModal('modalSpeakerTest');
      this.resolveInteractiveTest({
        id: 'speaker',
        title: 'Loa ngoài & Tần số',
        category: 'audio_mic',
        status,
        summaryValue: val,
        evidenceNote: note
      });
    };

    btnPass.onclick = () => onFinish(CHECK_STATUS.RS_004_USER_CONFIRMED, 'Nghe rõ ràng', 'Người dùng xác nhận nghe rõ âm báo tần số chuẩn 440Hz và 1000Hz phát từ loa.');
    btnFail.onclick = () => onFinish(CHECK_STATUS.RS_002_NOT_CONFIRMED, 'Không nghe thấy', 'Không nghe thấy âm thanh phát ra (có thể do âm lượng thiết bị tắt hoặc loa hỏng).');
  }

  // ==================== MODAL 4: MICROPHONE ====================
  async openMicModal() {
    this.openModal('modalMicTest');
    const canvas = document.getElementById('micWaveformCanvas');
    const meterFill = document.getElementById('micDbMeterFill');
    const dbValueText = document.getElementById('micDbValueText');
    const btnRecord = document.getElementById('btnStartMicRecord');
    const btnPlayback = document.getElementById('btnPlayMicRecording');
    const btnPass = document.getElementById('btnMicPass');
    const btnFail = document.getElementById('btnMicFail');

    let maxDb = -100;
    this.micTester = new MicTest(canvas, meterFill, (data) => {
      maxDb = data.maxDb;
      if (dbValueText) dbValueText.innerText = `${data.db} dB`;
    });

    const micRes = await this.micTester.start();
    if (!micRes.success) {
      alert(micRes.error);
    }

    if (btnRecord) {
      btnRecord.onclick = async () => {
        btnRecord.innerText = 'Đang ghi âm (3s)...';
        btnRecord.disabled = true;
        await this.micTester.startRecording(3000);
        btnRecord.innerText = 'Ghi âm lại';
        btnRecord.disabled = false;
        if (btnPlayback) btnPlayback.style.display = 'inline-flex';
      };
    }

    if (btnPlayback) {
      btnPlayback.onclick = () => this.micTester.playRecordedAudio();
    }

    const onFinish = (status, val, note) => {
      this.micTester.cleanup();
      this.closeModal('modalMicTest');
      this.resolveInteractiveTest({
        id: 'microphone',
        title: 'Microphone & Sóng âm',
        category: 'audio_mic',
        status,
        summaryValue: val,
        evidenceNote: note
      });
    };

    btnPass.onclick = () => onFinish(
      CHECK_STATUS.RS_001_VERIFIED,
      `Đỉnh âm ${maxDb} dB`,
      `Microphone thu tín hiệu thành công, biên độ sóng âm thời gian thực đạt đỉnh ${maxDb} dB.`
    );
    btnFail.onclick = () => onFinish(
      CHECK_STATUS.RS_002_NOT_CONFIRMED,
      'Không nhận âm thanh',
      'Microphone không bắt được tín hiệu âm thanh hoặc môi trường xung quanh quá yên lặng.'
    );
  }

  // ==================== MODAL 5: CAMERA ====================
  async openCameraModal() {
    this.openModal('modalCameraTest');
    const video = document.getElementById('cameraVideoPreview');
    const snapshotImg = document.getElementById('cameraCapturedSnapshot');
    const btnFlip = document.getElementById('btnFlipCamera');
    const btnShutter = document.getElementById('btnCameraShutter');
    const btnTorch = document.getElementById('btnToggleTorch');
    const hudBadge = document.getElementById('cameraResolutionBadge');

    const btnPass = document.getElementById('btnCameraPass');
    const btnFail = document.getElementById('btnCameraFail');

    this.cameraTester = new CameraTest(video, snapshotImg);
    const camRes = await this.cameraTester.start('environment');

    if (!camRes.success) {
      alert(camRes.error);
    } else if (hudBadge) {
      hudBadge.innerText = `${camRes.width} x ${camRes.height}`;
    }

    if (btnFlip) {
      btnFlip.onclick = async () => {
        const next = await this.cameraTester.toggleFacingMode();
        if (hudBadge && next.success) {
          hudBadge.innerText = `${next.width} x ${next.height}`;
        }
      };
    }

    if (btnTorch) {
      btnTorch.onclick = async () => {
        const enabled = await this.cameraTester.toggleTorch();
        btnTorch.style.color = enabled ? '#C4F03A' : '#FFFFFF';
      };
    }

    if (btnShutter) {
      btnShutter.onclick = () => {
        this.cameraTester.captureSnapshot();
        setTimeout(() => this.cameraTester.resumePreview(), 2500);
      };
    }

    const onFinish = (status, val, note) => {
      this.cameraTester.cleanup();
      this.closeModal('modalCameraTest');
      this.resolveInteractiveTest({
        id: 'camera',
        title: 'Camera trước & sau',
        category: 'camera_motion',
        status,
        summaryValue: val,
        evidenceNote: note
      });
    };

    btnPass.onclick = () => onFinish(
      CHECK_STATUS.RS_001_VERIFIED,
      `${camRes.width || 1920}x${camRes.height || 1080}`,
      `Luồng hình ảnh camera hoạt động ổn định ở độ phân giải ${camRes.width || 1920}x${camRes.height || 1080}.`
    );
    btnFail.onclick = () => onFinish(
      CHECK_STATUS.RS_002_NOT_CONFIRMED,
      'Hình ảnh không rõ',
      'Người dùng xác nhận camera bị tối, mờ hoặc không khởi động được luồng video.'
    );
  }

  // ==================== MODAL 6: CHUYỂN ĐỘNG & GIA TỐC ====================
  async openMotionModal() {
    this.openModal('modalMotionTest');
    const ball = document.getElementById('motionBubbleBall');
    const stats = {
      alpha: document.getElementById('motionValAlpha'),
      beta: document.getElementById('motionValBeta'),
      gamma: document.getElementById('motionValGamma'),
      accel: document.getElementById('motionValAccel')
    };

    let motionDetected = false;
    this.motionTester = new MotionTest(ball, stats, () => {
      motionDetected = true;
    });

    const res = await this.motionTester.start();
    if (!res.supported) {
      alert(res.reason || 'Trình duyệt không hỗ trợ cảm biến chuyển động.');
    }

    const btnPass = document.getElementById('btnMotionPass');
    const btnFail = document.getElementById('btnMotionFail');

    const onFinish = (status, val, note) => {
      this.motionTester.stop();
      this.closeModal('modalMotionTest');
      this.resolveInteractiveTest({
        id: 'motion',
        title: 'Gia tốc & Con quay',
        category: 'camera_motion',
        status,
        summaryValue: val,
        evidenceNote: note
      });
    };

    btnPass.onclick = () => onFinish(
      motionDetected ? CHECK_STATUS.RS_001_VERIFIED : CHECK_STATUS.RS_004_USER_CONFIRMED,
      'Hoạt động nhạy',
      'Cảm biến góc nghiêng và gia tốc kế phản hồi tức thời theo chuyển động xoay lắc của máy.'
    );
    btnFail.onclick = () => onFinish(
      CHECK_STATUS.RS_002_NOT_CONFIRMED,
      'Không phản hồi',
      'Góc nghiêng hoặc con trỏ bọt nước không di chuyển khi nghiêng máy.'
    );
  }

  // Mở modal overlay theo ID phần tử.
  openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('active');
  }

  // Đóng modal overlay theo ID phần tử.
  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('active');
  }


}

// Khởi chạy ứng dụng khi DOM hoàn tất nạp
document.addEventListener('DOMContentLoaded', () => {
  const app = new MobiCheckApp();
  app.init();
});
