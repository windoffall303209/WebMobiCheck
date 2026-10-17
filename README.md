# MobiCheck Web — Quick Check

Phiên bản Web Quick Check chính thức của hệ thống kiểm định thiết bị MobiCheck, cho phép người dùng mở trình duyệt Chrome và kiểm tra các chức năng phần cứng điện thoại ngay lập tức mà không cần cài đặt ứng dụng.

---

## 1. Mục tiêu & Nguyên tắc nghiệp vụ

- **Không cần cài app**: Người dùng chỉ cần truy cập website chính thức trên trình duyệt di động hoặc máy tính.
- **Kiểm tra chức năng khả dụng trên Web**:
  - **Màn hình (Display)**: 8 mẫu kiểm tra điểm chết, đốm sáng, dải màu SMPTE, độ tương phản gradient và lưới ô cờ.
  - **Cảm ứng (Touch)**: Ma trận lưới quét cảm ứng và nhận diện đa điểm chạm (Multitouch pointers).
  - **Camera**: Luồng video trực tiếp camera trước & sau, đo độ phân giải thực, điều khiển đèn Flash/Torch (khi hỗ trợ) và chụp ảnh thử.
  - **Microphone**: Đo cường độ âm thanh Decibel (dB), biểu đồ sóng âm thời gian thực 60fps và tính năng thu âm - phát lại (Playback).
  - **Loa ngoài (Audio)**: Phát âm tần số chuẩn 440Hz / 1000Hz và phân kênh stereo.
  - **Chuyển động (Motion & Orientation)**: Thước thủy chuẩn bọt nước 3D, đo góc Pitch, Roll, Yaw và gia tốc kế ($m/s^2$).
  - **Cảm biến & Môi trường**: Cảm biến ánh sáng (Ambient Light API), tiệm cận và motor rung xúc giác (Vibration API).
  - **Mạng & Định vị**: Nhận diện chuẩn mạng (4G/5G/Wi-Fi), đo độ trễ Ping thực tế và định vị vệ tinh GPS/GNSS.
  - **Cấu hình cơ bản**: Số nhân CPU, ước tính RAM (RS-006), bộ nhớ lưu trữ Web Quota và trạng thái pin.
- **Giới hạn kỹ thuật & Thông báo minh bạch**:
  - Trình duyệt web không thể can thiệp sâu vào nhân hệ điều hành để đọc IMEI, số Serial, chu kỳ sạc pin sâu hoặc quét linh kiện bo mạch.
  - Thông báo cố định: *"Một số thông tin thiết bị và kiểm tra phần cứng không thể thực hiện trong Quick Check. Cài MobiCheck để kiểm tra chi tiết hơn."* kèm liên kết đến ứng dụng Android.
- **Chuẩn hoá kết quả RS-001 đến RS-008**:
  - `RS-001`: Đã xác nhận (Verified)
  - `RS-002`: Chưa xác nhận (Not confirmed)
  - `RS-003`: Không hỗ trợ (Not supported)
  - `RS-004`: Người dùng xác nhận (User confirmed)
  - `RS-005`: Thông tin hệ thống (System info)
  - `RS-006`: Ước tính (Estimated)
  - `RS-007`: Hiện tượng bất thường (Observation)
  - `RS-008`: Chưa kiểm tra (Not tested)

---

## 2. Công nghệ & Chi phí vận hành

- **Công nghệ cốt lõi**: HTML5 Semantic, Modern Vanilla CSS (Design system đồng bộ với Figma Android MobiCheck), ES6+ JavaScript mô-đun hoá.
- **Chi phí duy trì**: **0 VNĐ / tháng**.
  - Không yêu cầu máy chủ backend (100% Client-Side Web APIs).
  - Triển khai miễn phí và tức thì trên GitHub Pages, Cloudflare Pages, Vercel, Netlify hoặc Firebase Hosting.
  - Tốc độ tải trang tức thời (< 100ms), đạt 60fps khi chạy hoạt ảnh đồ hoạ và sóng âm.

---

## 3. Cấu trúc thư mục

```text
WebMobiCheck2/
├── index.html                # Cấu trúc giao diện ứng dụng và các modal kiểm tra
├── css/
│   ├── style.css             # Tokens màu sắc, typography và khung hiển thị
│   ├── components.css        # Thẻ thông tin, stat box, badges, nút bấm, drawer menu
│   └── tests.css             # Giao diện kiểm tra tương tác (màn hình, cảm ứng, camera, mic, bọt nước)
├── js/
│   ├── config.js             # Mã trạng thái RS-001 -> RS-008, cấu hình kịch bản
│   ├── system-info.js        # Thu thập cấu hình CPU, RAM, Storage, Pin, Mạng
│   ├── test-display.js       # Kiểm tra điểm chết và tính đồng đều màu sắc
│   ├── test-touch.js         # Lưới cảm ứng ma trận và bộ nhận diện đa điểm
│   ├── test-audio.js         # Phát âm báo tần số chuẩn 440Hz / 1000Hz
│   ├── test-mic.js           # Thu âm, hiển thị sóng âm 60fps và đo dB
│   ├── test-camera.js        # Khởi tạo camera trước/sau, chụp thử, điều khiển flash
│   ├── test-motion.js        # Thước bọt nước 3D, đo góc nghiêng và gia tốc kế
│   ├── test-connectivity.js  # Đo ping thực tế, GPS GNSS và motor rung
│   ├── report.js             # Quản lý phiên, tính điểm và xuất báo cáo
│   ├── runner.js             # Điều phối kịch bản tự động không gây xung đột tài nguyên
│   └── app.js                # Bộ điều khiển chính của giao diện ứng dụng
├── assets/
│   ├── favicon.svg           # Biểu tượng MobiCheck chính thức
│   └── icons.svg             # Bộ vector SVG sprite chuẩn Android
├── package.json              # Khai báo script phục vụ chạy kiểm thử cục bộ
└── README.md                 # Tài liệu hướng dẫn sử dụng và đặc tả kỹ thuật
```

---

## 4. Hướng dẫn chạy thử nghiệm cục bộ

Khởi động máy chủ tĩnh cục bộ bằng lệnh:

```bash
npm run dev
```

Hoặc sử dụng bất kỳ máy chủ HTTP tĩnh nào (như Live Server trên VS Code, Python HTTP Server hoặc Nginx). Truy cập đường dẫn:

```text
http://localhost:3000
```
