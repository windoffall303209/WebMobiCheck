/**
 * MobiCheck Web - Microphone & Audio Waveform Test
 * Thu âm giọng nói, hiển thị phổ sóng thời gian thực và đo cường độ âm thanh (dB).
 */

export class MicTest {
  // Khởi tạo trạng thái bộ thu âm thanh và vẽ sóng âm.
  constructor(canvasElement, dbMeterFillElement, onAudioLevelUpdate) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.dbMeterFill = dbMeterFillElement;
    this.onAudioLevelUpdate = onAudioLevelUpdate;

    this.stream = null;
    this.audioCtx = null;
    this.analyser = null;
    this.dataArray = null;
    this.animationId = null;

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordedAudioUrl = null;
    this.isRecording = false;
    this.maxDbDetected = -100;
  }

  // Yêu cầu quyền microphone, khởi động analyser và bắt đầu vòng lặp vẽ sóng âm.
  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;

      source.connect(this.analyser);
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.resizeCanvas();
      this.drawWaveform();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.name === 'NotAllowedError' ? 'Quyền truy cập Microphone bị từ chối' : err.message
      };
    }
  }

  // Điều chỉnh tỷ lệ kích thước canvas vẽ sóng âm phù hợp với mật độ điểm ảnh.
  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  // Vẽ biểu đồ sóng âm thời gian thực 60fps và tính toán cường độ dB.
  drawWaveform() {
    if (!this.analyser) return;

    this.animationId = requestAnimationFrame(this.drawWaveform.bind(this));
    this.analyser.getByteTimeDomainData(this.dataArray);

    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.ctx.fillStyle = '#12161B';
    this.ctx.fillRect(0, 0, width, height);

    // Vẽ đường sóng âm màu xanh lá chuẩn MobiCheck
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeStyle = '#5DA653';
    this.ctx.beginPath();

    const sliceWidth = width / this.dataArray.length;
    let x = 0;
    let sumSquares = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      const v = this.dataArray[i] / 128.0;
      const y = (v * height) / 2;

      // Tính năng lượng sóng âm để quy đổi ra Decibel
      const normalized = v - 1.0;
      sumSquares += normalized * normalized;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();

    // Tính toán cường độ Decibel xấp xỉ
    const rms = Math.sqrt(sumSquares / this.dataArray.length);
    const db = rms > 0 ? Math.round(20 * Math.log10(rms)) : -100;
    if (db > this.maxDbDetected) {
      this.maxDbDetected = db;
    }

    // Cập nhật thanh đo dB (từ -60dB đến 0dB)
    const meterPercent = Math.min(100, Math.max(0, Math.round(((db + 60) / 60) * 100)));
    if (this.dbMeterFill) {
      this.dbMeterFill.style.width = `${meterPercent}%`;
    }

    if (this.onAudioLevelUpdate) {
      this.onAudioLevelUpdate({ db, maxDb: this.maxDbDetected });
    }
  }

  // Bắt đầu ghi âm một đoạn âm thanh ngắn (3 giây) để người dùng tự nghe lại.
  startRecording(durationMs = 3000) {
    if (!this.stream) return Promise.reject(new Error('Chưa có nguồn âm thanh'));

    return new Promise((resolve) => {
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.recordedAudioUrl = URL.createObjectURL(audioBlob);
        this.isRecording = false;
        resolve(this.recordedAudioUrl);
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        }
      }, durationMs);
    });
  }

  // Phát lại đoạn âm thanh vừa thu được qua loa ngoài của thiết bị.
  playRecordedAudio() {
    if (!this.recordedAudioUrl) return;
    const audio = new Audio(this.recordedAudioUrl);
    return audio.play();
  }

  // Giải phóng toàn bộ track microphone và AudioContext (tuân thủ nghiêm ngặt NFR-002).
  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }

    if (this.recordedAudioUrl) {
      URL.revokeObjectURL(this.recordedAudioUrl);
      this.recordedAudioUrl = null;
    }
  }
}
