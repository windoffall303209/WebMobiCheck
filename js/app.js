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
    this.renderReportScreen();
  }

  // Gắn sự kiện chuyển tab cho thanh điều hướng dưới đáy và thanh tab trên Desktop.
  bindNavigation() {
    const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
    const headerNavTabs = document.querySelectorAll('.header-nav-tabs .header-tab-btn');

    const handleTabClick = (btn) => {
      const targetScreen = btn.getAttribute('data-screen');
      if (targetScreen) {
        this.switchScreen(targetScreen);
      }
    };

    bottomNavItems.forEach((btn) => btn.addEventListener('click', () => handleTabClick(btn)));
    headerNavTabs.forEach((btn) => btn.addEventListener('click', () => handleTabClick(btn)));

    // Gắn sự kiện chuyển đổi chế độ xem Desktop / Giả lập điện thoại
    const btnToggleView = document.getElementById('btnToggleViewMode');
    const frame = document.querySelector('.device-frame');
    const iconView = document.getElementById('iconViewMode');
    const textView = document.getElementById('textViewMode');

    if (btnToggleView && frame) {
      btnToggleView.addEventListener('click', () => {
        const isSim = frame.classList.toggle('mode-phone-sim');
        if (isSim) {
          if (iconView) iconView.innerHTML = '<use href="assets/icons.svg#icon-desktop"></use>';
          if (textView) textView.innerText = 'Mở rộng Desktop';
        } else {
          if (iconView) iconView.innerHTML = '<use href="assets/icons.svg#icon-phone"></use>';
          if (textView) textView.innerText = 'Xem dạng điện thoại';
        }
        // Gọi lại resize cho các canvas kiểm tra đang mở
        window.dispatchEvent(new Event('resize'));
      });
    }
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

    // Đồng bộ trạng thái active trên Desktop Header Tabs
    document.querySelectorAll('.header-nav-tabs .header-tab-btn').forEach((item) => {
      item.classList.toggle('active', item.getAttribute('data-screen') === screenId);
    });

    if (screenId === 'screenReport') {
      this.renderReportScreen();
    }
  }

  // Gắn sự kiện cho các nút hành động chính (Bắt đầu kiểm tra tự động, xuất báo cáo).
  bindGlobalActions() {
    const btnStartAuto = document.getElementById('btnStartAutoCheck');
    const btnStartSingle = document.getElementById('btnStartSingleCheck');
    const btnRetest = document.getElementById('btnRetestAll');
    const btnExportText = document.getElementById('btnExportReportText');
    const btnPrintPdf = document.getElementById('btnPrintReport');
    const btnDownloadApp = document.getElementById('btnBannerDownloadApp');

    if (btnStartAuto) {
      btnStartAuto.addEventListener('click', () => this.startAutomatedSequence());
    }
    if (btnStartSingle) {
      btnStartSingle.addEventListener('click', () => {
        this.switchScreen('screenTests');
        document.querySelectorAll('.bottom-nav .nav-item').forEach((i) => {
          i.classList.toggle('active', i.getAttribute('data-screen') === 'screenTests');
        });
      });
    }
    if (btnRetest) {
      btnRetest.addEventListener('click', () => {
        this.reportManager.resetSession();
        this.startAutomatedSequence();
      });
    }
    if (btnExportText) {
      btnExportText.addEventListener('click', () => this.copyReportToClipboard());
    }
    if (btnPrintPdf) {
      btnPrintPdf.addEventListener('click', () => window.print());
    }
    if (btnDownloadApp) {
      btnDownloadApp.addEventListener('click', () => {
        this.switchScreen('screenAbout');
        document.querySelectorAll('.bottom-nav .nav-item').forEach((i) => {
          i.classList.toggle('active', i.getAttribute('data-screen') === 'screenAbout');
        });
      });
    }
  }

  // Điền dữ liệu cấu hình phần cứng vào thẻ thông tin Hero Card ở màn hình chính.
  bindDeviceHeroUI(info) {
    const titleEl = document.getElementById('heroDeviceTitle');
    const subEl = document.getElementById('heroDeviceSub');
    const badgeEl = document.getElementById('heroDeviceBadge');

    const cpuEl = document.getElementById('statValCpu');
    const ramEl = document.getElementById('statValRam');
    const storageEl = document.getElementById('statValStorage');
    const batteryEl = document.getElementById('statValBattery');

    const specRes = document.getElementById('specDisplayResolution');
    const specHz = document.getElementById('specDisplayHz');
    const specDpr = document.getElementById('specDisplayDpr');
    const specNet = document.getElementById('specNetworkType');
    const specPing = document.getElementById('specNetworkPing');

    if (titleEl) titleEl.innerText = info.deviceModel;
    if (subEl) subEl.innerText = `${info.browserName} • ${info.osName}`;
    if (badgeEl) badgeEl.innerText = `Quick Check • ${info.osName}`;

    if (cpuEl) cpuEl.innerText = `${info.cpuCores} Cores`;
    if (ramEl) ramEl.innerText = info.ramEstimated;
    if (storageEl) storageEl.innerText = info.storageInfo.supported ? `${info.storageInfo.quotaGB} GB` : 'Khả dụng';
    if (batteryEl) batteryEl.innerText = info.batteryInfo.supported ? `${info.batteryInfo.level}%` : 'Chuẩn Web';

    if (specRes) specRes.innerText = `${info.screenWidth} x ${info.screenHeight}`;
    if (specHz) specHz.innerText = `${info.refreshRate} Hz`;
    if (specDpr) specDpr.innerText = `${info.dpr}x DPR`;
    if (specNet) specNet.innerText = info.networkInfo.effectiveType;
    if (specPing) specPing.innerText = info.networkInfo.rtt;
  }

  // Tạo danh sách thẻ bài kiểm tra trên lưới giao diện (Trang chủ & Màn hình Kiểm tra).
  renderTestGrid() {
    const homeGrid = document.getElementById('homeTestCardsGrid');
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
    if (homeGrid) homeGrid.innerHTML = allCardsHtml;
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

    if (['battery', 'storage', 'connectivity', 'vibrate'].includes(stage.id)) {
      await this.runner.runStage(stage);
      this.updateCardStatusDots();
      alert(`Đã kiểm tra xong "${stage.name}". Kết quả đã được cập nhật vào Báo cáo.`);
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
    this.switchScreen('screenReport');
    document.querySelectorAll('.bottom-nav .nav-item').forEach((i) => {
      i.classList.toggle('active', i.getAttribute('data-screen') === 'screenReport');
    });
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

  // Hiển thị dữ liệu tổng hợp trên màn hình Báo cáo.
  renderReportScreen() {
    const stats = this.reportManager.getSummaryStats();
    const scoreNum = document.getElementById('reportScoreNum');
    const verifiedCount = document.getElementById('reportCountVerified');
    const notConfirmedCount = document.getElementById('reportCountNotConfirmed');
    const notSupportedCount = document.getElementById('reportCountNotSupported');
    const listContainer = document.getElementById('reportItemsList');

    if (scoreNum) scoreNum.innerText = `${stats.scorePercent}%`;
    if (verifiedCount) verifiedCount.innerText = stats.verifiedCount + stats.userConfirmedCount;
    if (notConfirmedCount) notConfirmedCount.innerText = stats.notConfirmedCount;
    if (notSupportedCount) notSupportedCount.innerText = stats.notSupportedCount;

    if (!listContainer) return;

    const items = this.reportManager.getAllItems();
    if (items.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--mc-dim);">
          Chưa có bài kiểm tra nào được thực hiện.<br>Bấm "Kiểm tra tự động" để bắt đầu.
        </div>
      `;
      return;
    }

    listContainer.innerHTML = items
      .map(
        (it) => `
      <div class="report-item-card">
        <div class="report-item-top">
          <span class="report-item-title">${it.title}</span>
          <span class="badge-pill ${it.status.badgeClass}">${it.status.code} • ${it.status.title}</span>
        </div>
        <div class="report-item-val">${it.summaryValue || 'Hoàn tất'}</div>
        <div class="report-item-note">${it.evidenceNote || it.status.description}</div>
      </div>
    `
      )
      .join('');
  }

  // Sao chép báo cáo kết quả kiểm tra vào bộ nhớ đệm thiết bị.
  async copyReportToClipboard() {
    const text = this.reportManager.exportTextSummary(this.deviceInfo || {});
    try {
      await navigator.clipboard.writeText(text);
      alert('Đã sao chép báo cáo kiểm tra vào bộ nhớ tạm thành công!');
    } catch (_) {
      alert('Không thể sao chép tự động. Vui lòng cho phép quyền truy cập Clipboard.');
    }
  }
}

// Khởi chạy ứng dụng khi DOM hoàn tất nạp
document.addEventListener('DOMContentLoaded', () => {
  const app = new MobiCheckApp();
  app.init();
});
