/**
 * MobiCheck Web - Test Scenario Runner
 * Điều phối luồng kiểm tra tự động và đơn lẻ, giải phóng tài nguyên tuần tự.
 */

import { CHECK_STATUS } from './config.js';
import { testNetworkPing, testGeolocation, testVibration, checkBluetoothSupport } from './test-connectivity.js';

export class ScenarioRunner {
  // Khởi tạo bộ điều phối kịch bản với ReportManager và các callback giao diện.
  constructor(reportManager, callbacks) {
    this.report = reportManager;
    this.callbacks = callbacks; // { onStageStart, onStageProgress, onStageEnd, onFinish, requestUserInteraction }
    this.isRunning = false;
    this.currentStageIndex = 0;
    this.queue = [];
  }

  // Khởi động chạy toàn bộ quy trình kiểm tra Quick Check theo hàng đợi chuẩn.
  async startAutoCheck(stagesList) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.queue = stagesList.filter((s) => s.webSupported);
    this.currentStageIndex = 0;

    for (let i = 0; i < this.queue.length; i++) {
      if (!this.isRunning) break;
      this.currentStageIndex = i;
      const stage = this.queue[i];

      if (this.callbacks.onStageStart) {
        this.callbacks.onStageStart(stage, i, this.queue.length);
      }

      await this.runStage(stage);

      if (this.callbacks.onStageEnd) {
        this.callbacks.onStageEnd(stage, i, this.queue.length);
      }
    }

    this.isRunning = false;
    if (this.callbacks.onFinish) {
      this.callbacks.onFinish();
    }
  }

  // Dừng tiến trình kiểm tra tự động đang chạy.
  stop() {
    this.isRunning = false;
  }

  // Thực thi một bài kiểm tra độc lập và cập nhật kết quả vào báo cáo.
  async runStage(stage) {
    switch (stage.id) {
      case 'battery':
        await this.checkBattery();
        break;
      case 'storage':
        await this.checkStorage();
        break;
      case 'connectivity':
        await this.checkConnectivity();
        break;
      case 'vibrate':
        this.checkVibration();
        break;
      case 'display':
      case 'touch':
      case 'speaker':
      case 'microphone':
      case 'camera':
      case 'motion':
      case 'sensor':
        // Các bài kiểm tra cần tương tác người dùng
        if (this.callbacks.requestUserInteraction) {
          await this.callbacks.requestUserInteraction(stage);
        }
        break;
      default:
        break;
    }
  }

  // Kiểm tra tình trạng pin và nguồn sạc thiết bị.
  async checkBattery() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        const levelPercent = Math.round(battery.level * 100);
        const isCharging = battery.charging;
        this.report.recordItem({
          id: 'battery',
          title: 'Pin & Trạng thái sạc',
          category: 'system',
          status: CHECK_STATUS.RS_001_VERIFIED,
          summaryValue: `${levelPercent}% (${isCharging ? 'Đang sạc' : 'Dùng pin'})`,
          evidenceNote: `API trả về mức nạp ${battery.level.toFixed(2)}, trạng thái sạc: ${isCharging ? 'Có kết nối nguồn' : 'Không sạc'}.`
        });
        return;
      } catch (_) {}
    }
    this.report.recordItem({
      id: 'battery',
      title: 'Pin & Trạng thái sạc',
      category: 'system',
      status: CHECK_STATUS.RS_003_NOT_SUPPORTED,
      summaryValue: 'Không hỗ trợ trên trình duyệt này',
      evidenceNote: 'Web Battery API bị hạn chế quyền riêng tư trên phiên bản trình duyệt hiện hành.'
    });
  }

  // Kiểm tra hạn mức bộ nhớ lưu trữ khả dụng cho Web app.
  async checkStorage() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const quotaGB = ((est.quota || 0) / (1024 * 1024 * 1024)).toFixed(1);
        const usedMB = ((est.usage || 0) / (1024 * 1024)).toFixed(1);
        this.report.recordItem({
          id: 'storage',
          title: 'Bộ nhớ lưu trữ Web',
          category: 'system',
          status: CHECK_STATUS.RS_001_VERIFIED,
          summaryValue: `${usedMB} MB dùng / ${quotaGB} GB cấp phát`,
          evidenceNote: `Hạn mức Storage Quota được cấp phát: ${quotaGB} GB; đã sử dụng: ${usedMB} MB.`
        });
        return;
      } catch (_) {}
    }
    this.report.recordItem({
      id: 'storage',
      title: 'Bộ nhớ lưu trữ Web',
      category: 'system',
      status: CHECK_STATUS.RS_002_NOT_CONFIRMED,
      summaryValue: 'Không thể ước tính',
      evidenceNote: 'Trình duyệt không cung cấp StorageManager estimate.'
    });
  }

  // Kiểm tra kết nối mạng và độ trễ ping thực tế.
  async checkConnectivity() {
    const conn = navigator.connection;
    const netType = conn ? conn.effectiveType?.toUpperCase() : 'Wi-Fi / Di động';
    const pingResult = await testNetworkPing();

    this.report.recordItem({
      id: 'connectivity',
      title: 'Mạng & Băng thông',
      category: 'connectivity',
      status: CHECK_STATUS.RS_001_VERIFIED,
      summaryValue: `${netType} • Ping ${pingResult.pingMs}ms`,
      evidenceNote: `Kết nối trực tuyến: ${navigator.onLine ? 'Online' : 'Offline'}, Downlink: ${conn?.downlink || 'N/A'} Mbps, RTT Ping: ${pingResult.pingMs}ms.`
    });
  }

  // Kiểm tra motor rung phản hồi xúc giác.
  checkVibration() {
    const vib = testVibration([120, 60, 120]);
    if (vib.supported && vib.success) {
      this.report.recordItem({
        id: 'vibrate',
        title: 'Motor rung',
        category: 'environment',
        status: CHECK_STATUS.RS_001_VERIFIED,
        summaryValue: 'Đã kích hoạt rung',
        evidenceNote: 'HTML5 Vibration API đã kích hoạt xung nhịp rung 120ms thành công.'
      });
    } else {
      this.report.recordItem({
        id: 'vibrate',
        title: 'Motor rung',
        category: 'environment',
        status: CHECK_STATUS.RS_003_NOT_SUPPORTED,
        summaryValue: 'Không hỗ trợ rung',
        evidenceNote: 'Trình duyệt trên thiết bị này không hỗ trợ lệnh rung hoặc đã tắt phản hồi xúc giác.'
      });
    }
  }
}
