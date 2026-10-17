/**
 * MobiCheck Web - Speaker & Audio Frequency Test
 * Phát âm thanh chuẩn tần số qua Web Audio API để kiểm tra loa ngoài và kênh stereo.
 */

export class AudioTest {
  // Khởi tạo audio context và các biến trạng thái phát âm thanh.
  constructor() {
    this.audioCtx = null;
    this.oscillator = null;
    this.gainNode = null;
    this.panNode = null;
    this.isPlaying = false;
  }

  // Khởi động AudioContext an toàn theo chuẩn tương tác người dùng của trình duyệt.
  initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      return this.audioCtx.resume();
    }
    return Promise.resolve();
  }

  // Phát chuỗi âm báo tần số chuẩn (440Hz -> 880Hz -> 1000Hz) qua cả hai kênh loa.
  async playTestTone(frequency = 440, duration = 1.2, pan = 0) {
    await this.initContext();
    this.stopTone();

    this.oscillator = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();

    this.oscillator.type = 'sine';
    this.oscillator.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

    // Fade in và Fade out mượt mà để tránh tiếng bụp loa
    const now = this.audioCtx.currentTime;
    this.gainNode.gain.setValueAtTime(0.01, now);
    this.gainNode.gain.exponentialRampToValueAtTime(0.4, now + 0.1);
    this.gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Thiết lập kênh Stereo Pan nếu trình duyệt hỗ trợ StereoPannerNode
    if (this.audioCtx.createStereoPanner) {
      this.panNode = this.audioCtx.createStereoPanner();
      this.panNode.pan.setValueAtTime(pan, now);
      this.oscillator.connect(this.panNode);
      this.panNode.connect(this.gainNode);
    } else {
      this.oscillator.connect(this.gainNode);
    }

    this.gainNode.connect(this.audioCtx.destination);
    this.oscillator.start(now);
    this.oscillator.stop(now + duration);
    this.isPlaying = true;

    this.oscillator.onended = () => {
      this.isPlaying = false;
    };
  }

  // Dừng phát âm thanh ngay lập tức và ngắt kết nối node âm thanh.
  stopTone() {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (_) {}
      this.oscillator = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (_) {}
      this.gainNode = null;
    }
    this.isPlaying = false;
  }

  // Giải phóng AudioContext hoàn toàn khi thoát khỏi màn hình kiểm tra (tuân thủ NFR-002).
  cleanup() {
    this.stopTone();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}
