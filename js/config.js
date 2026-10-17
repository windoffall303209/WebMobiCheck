/**
 * MobiCheck Web - Configuration & Standard Result Codes
 * Khai báo mã kết quả nghiệp vụ chuẩn RS-001 -> RS-008 và danh mục bài kiểm tra.
 */

// Mã trạng thái nghiệp vụ chuẩn theo đặc tả MobiCheck
export const CHECK_STATUS = {
  RS_001_VERIFIED: {
    code: 'RS-001',
    title: 'Đã xác nhận',
    colorClass: 'ok',
    badgeClass: 'green',
    description: 'Có bằng chứng dữ liệu đáp ứng điều kiện kiểm tra quan sát được.'
  },
  RS_002_NOT_CONFIRMED: {
    code: 'RS-002',
    title: 'Chưa xác nhận',
    colorClass: 'warn',
    badgeClass: 'amber',
    description: 'Chưa đủ dữ liệu hoặc chưa đáp ứng điều kiện kết luận; không đồng nghĩa với lỗi phần cứng.'
  },
  RS_003_NOT_SUPPORTED: {
    code: 'RS-003',
    title: 'Không hỗ trợ',
    colorClass: 'na',
    badgeClass: 'gray',
    description: 'Trình duyệt web hoặc quyền hạn không cho phép kiểm tra; cần dùng app Android.'
  },
  RS_004_USER_CONFIRMED: {
    code: 'RS-004',
    title: 'Người dùng xác nhận',
    colorClass: 'user',
    badgeClass: 'blue',
    description: 'Kết quả dựa trên phản hồi xác nhận trực tiếp của người dùng.'
  },
  RS_005_SYSTEM_INFO: {
    code: 'RS-005',
    title: 'Thông tin hệ thống',
    colorClass: 'na',
    badgeClass: 'gray',
    description: 'Dữ liệu cấu hình thu thập từ API trình duyệt.'
  },
  RS_006_ESTIMATED: {
    code: 'RS-006',
    title: 'Ước tính',
    colorClass: 'warn',
    badgeClass: 'amber',
    description: 'Giá trị được suy đoán trong giới hạn kỹ thuật của Web API (ví dụ: RAM web).'
  },
  RS_007_OBSERVATION: {
    code: 'RS-007',
    title: 'Bất thường quan sát',
    colorClass: 'bad',
    badgeClass: 'red',
    description: 'Có hiện tượng bất thường với dữ liệu hỗ trợ; không khẳng định nguyên nhân linh kiện.'
  },
  RS_008_NOT_TESTED: {
    code: 'RS-008',
    title: 'Chưa kiểm tra',
    colorClass: 'na',
    badgeClass: 'gray',
    description: 'Hạng mục chưa thực hiện trong phiên hiện tại.'
  }
};

// Nhóm bài kiểm tra chính trong Quick Check
export const CHECK_CATEGORIES = {
  SYSTEM: { id: 'system', title: 'Cấu hình & Phần cứng' },
  DISPLAY_TOUCH: { id: 'display_touch', title: 'Màn hình & Cảm ứng' },
  AUDIO_MIC: { id: 'audio_mic', title: 'Âm thanh & Micro' },
  CAMERA_MOTION: { id: 'camera_motion', title: 'Camera & Chuyển động' },
  ENVIRONMENT: { id: 'environment', title: 'Cảm biến môi trường' },
  CONNECTIVITY: { id: 'connectivity', title: 'Mạng & Kết nối' }
};

// Danh sách các bài kiểm tra khả dụng trong Web Quick Check
export const QUICK_CHECK_STAGES = [
  {
    id: 'display',
    name: 'Màn hình & Điểm chết',
    category: 'display_touch',
    icon: 'display',
    webSupported: true,
    description: 'Kiểm tra điểm chết, đốm sáng, dải màu và tính đồng đều màn hình.'
  },
  {
    id: 'touch',
    name: 'Cảm ứng & Đa điểm',
    category: 'display_touch',
    icon: 'touch',
    webSupported: true,
    description: 'Ma trận lưới quét cảm ứng và nhận diện đa điểm (Multitouch pointer).'
  },
  {
    id: 'speaker',
    name: 'Loa ngoài & Tần số',
    category: 'audio_mic',
    icon: 'speaker',
    webSupported: true,
    description: 'Phát âm thanh chuẩn 440Hz / 1000Hz và phân kênh loa trái/phải.'
  },
  {
    id: 'microphone',
    name: 'Microphone & Sóng âm',
    category: 'audio_mic',
    icon: 'mic',
    webSupported: true,
    description: 'Ghi âm, đo cường độ decibel (dB) và hiển thị phổ sóng thời gian thực.'
  },
  {
    id: 'camera',
    name: 'Camera trước & sau',
    category: 'camera_motion',
    icon: 'camera',
    webSupported: true,
    description: 'Khởi động camera trước/sau, kiểm tra độ phân giải và chụp thử.'
  },
  {
    id: 'motion',
    name: 'Gia tốc & Con quay',
    category: 'camera_motion',
    icon: 'motion',
    webSupported: true,
    description: 'Bộ cảm biến góc nghiêng 3D, thước bọt nước thủy chuẩn và đo gia tốc rơi.'
  },
  {
    id: 'sensor',
    name: 'Cảm biến & Môi trường',
    category: 'environment',
    icon: 'sensor',
    webSupported: true,
    description: 'Cảm biến ánh sáng (Ambient Light API) và tiệm cận màn hình.'
  },
  {
    id: 'battery',
    name: 'Pin & Trạng thái sạc',
    category: 'system',
    icon: 'battery',
    webSupported: true,
    description: 'Mức pin hiện tại, nguồn sạc và thời gian nạp ước tính qua Web Battery API.'
  },
  {
    id: 'connectivity',
    name: 'Mạng & Băng thông',
    category: 'connectivity',
    icon: 'network',
    webSupported: true,
    description: 'Loại kết nối (4G/5G/Wi-Fi), đo độ trễ Ping thực tế và GPS GNSS.'
  },
  {
    id: 'storage',
    name: 'Bộ nhớ lưu trữ Web',
    category: 'system',
    icon: 'storage',
    webSupported: true,
    description: 'Dung lượng bộ nhớ khả dụng và hạn mức cấp phát cho trình duyệt.'
  },
  {
    id: 'vibrate',
    name: 'Motor rung',
    category: 'environment',
    icon: 'vibrate',
    webSupported: true,
    description: 'Kiểm tra motor rung phản hồi xúc giác qua HTML5 Vibration API.'
  },
  {
    id: 'native_deep',
    name: 'Kiểm tra Native chuyên sâu',
    category: 'system',
    icon: 'chip',
    webSupported: false,
    description: 'Đọc IMEI, mã bo mạch, chu kỳ sạc pin, phần cứng chi tiết. Yêu cầu App MobiCheck.'
  }
];

// Đường dẫn và thông tin app MobiCheck trên Play Store
export const APP_INFO = {
  name: 'MobiCheck',
  version: 'Quick Check Web 1.0',
  developer: 'Thanhvanluu',
  playStoreUri: 'market://search?q=pub:Thanhvanluu',
  playStoreWebUrl: 'https://play.google.com/store/apps/developer?id=Thanhvanluu',
  disclaimer: 'Một số thông tin thiết bị và kiểm tra phần cứng chuyên sâu không thể thực hiện trong Quick Check do giới hạn bảo mật trình duyệt. Cài đặt MobiCheck để kiểm tra chi tiết hơn.'
};
