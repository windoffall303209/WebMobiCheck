/**
 * MobiCheck Web - Report & Results Manager
 * Quản lý kết quả phiên kiểm tra, chuẩn hoá trạng thái RS-001 -> RS-008 và xuất báo cáo.
 */

import { CHECK_STATUS } from './config.js';

export class ReportManager {
  // Khởi tạo trình quản lý báo cáo và nạp dữ liệu phiên lưu trữ trước đó nếu có.
  constructor() {
    this.items = new Map();
    this.sessionStartTime = Date.now();
    this.loadFromStorage();
  }

  // Ghi nhận một kết quả kiểm tra theo đúng cấu trúc CheckItem của MobiCheck.
  recordItem({ id, title, category, status, summaryValue, evidenceNote }) {
    const item = {
      id,
      title,
      category,
      status: status || CHECK_STATUS.RS_002_NOT_CONFIRMED,
      summaryValue: summaryValue || '',
      evidenceNote: evidenceNote || '',
      timestamp: Date.now()
    };
    this.items.set(id, item);
    this.saveToStorage();
    return item;
  }

  // Lấy danh sách tất cả các hạng mục kiểm tra trong phiên hiện tại.
  getAllItems() {
    return Array.from(this.items.values());
  }

  // Tính toán số liệu thống kê tổng hợp của phiên kiểm tra.
  getSummaryStats() {
    const items = this.getAllItems();
    let verifiedCount = 0;
    let notConfirmedCount = 0;
    let notSupportedCount = 0;
    let userConfirmedCount = 0;
    let observationCount = 0;

    items.forEach((it) => {
      if (it.status.code === 'RS-001') verifiedCount++;
      else if (it.status.code === 'RS-004') userConfirmedCount++;
      else if (it.status.code === 'RS-002') notConfirmedCount++;
      else if (it.status.code === 'RS-003') notSupportedCount++;
      else if (it.status.code === 'RS-007') observationCount++;
    });

    const passedTotal = verifiedCount + userConfirmedCount;
    const testableTotal = passedTotal + notConfirmedCount + observationCount;
    const scorePercent = testableTotal > 0 ? Math.round((passedTotal / testableTotal) * 100) : 100;

    return {
      total: items.length,
      verifiedCount,
      userConfirmedCount,
      notConfirmedCount,
      notSupportedCount,
      observationCount,
      scorePercent
    };
  }

  // Lưu trữ phiên kiểm tra vào LocalStorage trình duyệt để không bị mất khi tải lại trang.
  saveToStorage() {
    try {
      const data = {
        sessionStartTime: this.sessionStartTime,
        items: Array.from(this.items.entries())
      };
      localStorage.setItem('mobicheck_session_data', JSON.stringify(data));
    } catch (_) {}
  }

  // Nạp lại dữ liệu phiên kiểm tra từ LocalStorage.
  loadFromStorage() {
    try {
      const raw = localStorage.getItem('mobicheck_session_data');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.items && Array.isArray(parsed.items)) {
          this.items = new Map(parsed.items);
          this.sessionStartTime = parsed.sessionStartTime || Date.now();
        }
      }
    } catch (_) {}
  }

  // Xoá toàn bộ dữ liệu phiên cũ để bắt đầu phiên kiểm tra mới.
  resetSession() {
    this.items.clear();
    this.sessionStartTime = Date.now();
    try {
      localStorage.removeItem('mobicheck_session_data');
    } catch (_) {}
  }

  // Xuất báo cáo dạng văn bản thuần để sao chép vào bộ nhớ tạm.
  exportTextSummary(deviceInfo) {
    const stats = this.getSummaryStats();
    let text = `========================================\n`;
    text += ` MOBICHECK WEB - BÁO CÁO QUICK CHECK\n`;
    text += ` Thiết bị: ${deviceInfo.deviceModel || 'Web Client'} (${deviceInfo.osName})\n`;
    text += ` Thời gian: ${new Date(this.sessionStartTime).toLocaleString('vi-VN')}\n`;
    text += ` Kênh kiểm tra: Trình duyệt Web (Quick Check)\n`;
    text += ` Đánh giá chức năng: ${stats.scorePercent}%\n`;
    text += ` - Đã xác nhận: ${stats.verifiedCount + stats.userConfirmedCount}\n`;
    text += ` - Chưa xác nhận: ${stats.notConfirmedCount}\n`;
    text += ` - Giới hạn Web: ${stats.notSupportedCount}\n`;
    text += `========================================\n\n`;

    this.getAllItems().forEach((it, idx) => {
      text += `${idx + 1}. [${it.status.code} - ${it.status.title}] ${it.title}\n`;
      text += `   Kết quả: ${it.summaryValue}\n`;
      text += `   Ghi chú: ${it.evidenceNote}\n\n`;
    });

    text += `Lưu ý: Một số thông tin phần cứng sâu (IMEI, bo mạch, chu kỳ sạc pin) chỉ có thể kiểm tra trên ứng dụng MobiCheck Android.\n`;
    return text;
  }
}
