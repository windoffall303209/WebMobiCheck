/**
 * MobiCheck Web - Camera & Flashlight Test
 * Kiểm tra luồng video camera trước/sau, độ phân giải thực và đèn flash (torch).
 */

export class CameraTest {
  // Khởi tạo đối tượng kiểm tra camera với video element và canvas chụp ảnh.
  constructor(videoElement, snapshotImgElement) {
    this.video = videoElement;
    this.snapshotImg = snapshotImgElement;
    this.stream = null;
    this.currentFacingMode = 'environment'; // Mặc định mở camera sau
    this.torchEnabled = false;
    this.torchSupported = false;
  }

  // Khởi động luồng camera theo chiều ống kính được chỉ định.
  async start(facingMode = 'environment') {
    this.cleanup();
    this.currentFacingMode = facingMode;

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await this.video.play();

      const track = this.stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      const settings = track.getSettings ? track.getSettings() : {};

      this.torchSupported = Boolean(capabilities.torch);

      return {
        success: true,
        width: settings.width || this.video.videoWidth,
        height: settings.height || this.video.videoHeight,
        torchSupported: this.torchSupported,
        facingMode: settings.facingMode || facingMode
      };
    } catch (err) {
      return {
        success: false,
        error: err.name === 'NotAllowedError' ? 'Quyền truy cập Camera bị từ chối' : err.message
      };
    }
  }

  // Đổi giữa camera trước và camera sau của thiết bị.
  async toggleFacingMode() {
    const nextMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    return this.start(nextMode);
  }

  // Bật hoặc tắt đèn Flash (Torch) nếu phần cứng và trình duyệt hỗ trợ.
  async toggleTorch() {
    if (!this.stream || !this.torchSupported) return false;

    const track = this.stream.getVideoTracks()[0];
    try {
      this.torchEnabled = !this.torchEnabled;
      await track.applyConstraints({
        advanced: [{ torch: this.torchEnabled }]
      });
      return this.torchEnabled;
    } catch (_) {
      this.torchEnabled = false;
      return false;
    }
  }

  // Chụp một bức ảnh từ luồng video để người dùng kiểm tra độ nét và màu sắc.
  captureSnapshot() {
    if (!this.video || !this.stream) return null;

    const canvas = document.createElement('canvas');
    canvas.width = this.video.videoWidth || 640;
    canvas.height = this.video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    if (this.snapshotImg) {
      this.snapshotImg.src = dataUrl;
      this.snapshotImg.style.display = 'block';
    }
    return dataUrl;
  }

  // Đóng luồng chụp ảnh và quay lại chế độ xem trực tiếp.
  resumePreview() {
    if (this.snapshotImg) {
      this.snapshotImg.style.display = 'none';
      this.snapshotImg.src = '';
    }
  }

  // Giải phóng toàn bộ tài nguyên camera (tuân thủ nghiêm ngặt NFR-002).
  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    if (this.snapshotImg) {
      this.snapshotImg.style.display = 'none';
      this.snapshotImg.src = '';
    }
    this.torchEnabled = false;
  }
}
