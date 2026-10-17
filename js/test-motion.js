/**
 * MobiCheck Web - Motion & Orientation Test
 * Kiểm tra cảm biến con quay hồi chuyển (Gyroscope) và gia tốc kế (Accelerometer).
 */

export class MotionTest {
  // Khởi tạo bài kiểm tra cảm biến chuyển động và các phần tử hiển thị bọt nước.
  constructor(bubbleBallElement, statsElements, onMotionDetected) {
    this.bubbleBall = bubbleBallElement;
    this.stats = statsElements; // { alpha, beta, gamma, accel }
    this.onMotionDetected = onMotionDetected;

    this.hasOrientationData = false;
    this.hasMotionData = false;
    this.orientationSamples = 0;
    this.lastBeta = 0;
    this.lastGamma = 0;

    this.handleOrientation = this.onOrientation.bind(this);
    this.handleMotion = this.onMotion.bind(this);
  }

  // Yêu cầu quyền cảm biến nếu cần và bắt đầu lắng nghe sự kiện chuyển động.
  async start() {
    this.hasOrientationData = false;
    this.hasMotionData = false;
    this.orientationSamples = 0;

    // Hỗ trợ xin quyền trên iOS 13+
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted') {
          return { supported: false, reason: 'Quyền cảm biến chuyển động bị từ chối' };
        }
      } catch (err) {
        return { supported: false, reason: err.message };
      }
    }

    window.addEventListener('deviceorientation', this.handleOrientation, true);
    window.addEventListener('devicemotion', this.handleMotion, true);

    return { supported: true };
  }

  // Dừng lắng nghe sự kiện cảm biến và dọn dẹp bộ nhớ.
  stop() {
    window.removeEventListener('deviceorientation', this.handleOrientation, true);
    window.removeEventListener('devicemotion', this.handleMotion, true);
  }

  // Xử lý góc nghiêng điện thoại và cập nhật vị trí bọt nước thủy chuẩn.
  onOrientation(e) {
    if (e.beta === null && e.gamma === null) return;
    this.hasOrientationData = true;
    this.orientationSamples++;

    const alpha = Math.round(e.alpha || 0); // La bàn (Yaw)
    const beta = Math.round(e.beta || 0);   // Trước - sau (Pitch: -180 đến 180)
    const gamma = Math.round(e.gamma || 0); // Trái - phải (Roll: -90 đến 90)

    if (this.stats.alpha) this.stats.alpha.innerText = `${alpha}°`;
    if (this.stats.beta) this.stats.beta.innerText = `${beta}°`;
    if (this.stats.gamma) this.stats.gamma.innerText = `${gamma}°`;

    // Di chuyển quả cầu bọt nước trong khung tròn 180px (bán kính tối đa 65px)
    if (this.bubbleBall) {
      const maxRadius = 65;
      const x = Math.min(maxRadius, Math.max(-maxRadius, (gamma / 45) * maxRadius));
      const y = Math.min(maxRadius, Math.max(-maxRadius, (beta / 45) * maxRadius));
      this.bubbleBall.style.transform = `translate(${x}px, ${y}px)`;
    }

    // Nhận diện chuyển động cơ học thực tế (thay đổi góc nghiêng)
    const delta = Math.abs(beta - this.lastBeta) + Math.abs(gamma - this.lastGamma);
    if (delta > 3 && this.onMotionDetected) {
      this.onMotionDetected({ active: true, beta, gamma, alpha });
    }
    this.lastBeta = beta;
    this.lastGamma = gamma;
  }

  // Xử lý gia tốc chuyển động thực tế (m/s²).
  onMotion(e) {
    const accel = e.accelerationIncludingGravity || e.acceleration;
    if (!accel) return;
    this.hasMotionData = true;

    const x = accel.x || 0;
    const y = accel.y || 0;
    const z = accel.z || 0;
    const totalG = Math.sqrt(x * x + y * y + z * z).toFixed(1);

    if (this.stats.accel) {
      this.stats.accel.innerText = `${totalG} m/s²`;
    }
  }
}
