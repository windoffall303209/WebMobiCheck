/**
 * MobiCheck Web - Touch & Multi-Touch Test
 * Kiểm tra cảm ứng lưới ma trận và nhận diện đa điểm chạm đồng thời.
 */

export class TouchTest {
  // Khởi tạo bài kiểm tra cảm ứng với số hàng và cột tương ứng kích thước màn hình.
  constructor(canvasContainer, onProgressUpdate) {
    this.container = canvasContainer;
    this.onProgressUpdate = onProgressUpdate;
    this.cols = 8;
    this.rows = 14;
    this.totalCells = this.cols * this.rows;
    this.touchedCells = new Set();
    this.activePointers = new Map();
    this.maxPointersDetected = 1;

    this.gridCanvas = null;
    this.gridCtx = null;
    this.pointerCanvas = null;
    this.pointerCtx = null;

    this.handlePointerDown = this.onPointerDown.bind(this);
    this.handlePointerMove = this.onPointerMove.bind(this);
    this.handlePointerUp = this.onPointerUp.bind(this);
  }

  // Thiết lập canvas và bắt đầu lắng nghe sự kiện chạm con trỏ.
  start() {
    this.container.innerHTML = `
      <div class="touch-hud-overlay">
        <div class="touch-stat-pill" id="touchProgressStat">Tiến độ: 0/${this.totalCells} (0%)</div>
        <div class="touch-stat-pill" id="touchPointerStat">Đa điểm: 1 điểm</div>
      </div>
      <canvas id="touchGridCanvas"></canvas>
      <canvas id="touchPointerCanvas"></canvas>
    `;

    this.gridCanvas = this.container.querySelector('#touchGridCanvas');
    this.gridCtx = this.gridCanvas.getContext('2d');
    this.pointerCanvas = this.container.querySelector('#touchPointerCanvas');
    this.pointerCtx = this.pointerCanvas.getContext('2d');

    this.resizeCanvases();
    window.addEventListener('resize', () => this.resizeCanvases());

    this.container.addEventListener('pointerdown', this.handlePointerDown);
    this.container.addEventListener('pointermove', this.handlePointerMove);
    this.container.addEventListener('pointerup', this.handlePointerUp);
    this.container.addEventListener('pointercancel', this.handlePointerUp);

    this.drawGrid();
  }

  // Dọn dẹp tài nguyên và huỷ đăng ký lắng nghe sự kiện khi kết thúc.
  stop() {
    this.container.removeEventListener('pointerdown', this.handlePointerDown);
    this.container.removeEventListener('pointermove', this.handlePointerMove);
    this.container.removeEventListener('pointerup', this.handlePointerUp);
    this.container.removeEventListener('pointercancel', this.handlePointerUp);
    this.container.innerHTML = '';
  }

  // Cập nhật lại kích thước canvas và điều chỉnh số hàng/cột theo tỷ lệ khung nhìn (ngang/dọc).
  resizeCanvases() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Tự động điều chỉnh số hàng và cột theo chiều ngang hoặc dọc
    if (rect.width > rect.height) {
      this.cols = 14;
      this.rows = 8;
    } else {
      this.cols = 8;
      this.rows = 14;
    }
    this.totalCells = this.cols * this.rows;

    this.gridCanvas.width = rect.width * dpr;
    this.gridCanvas.height = rect.height * dpr;
    this.gridCtx.scale(dpr, dpr);

    this.pointerCanvas.width = rect.width * dpr;
    this.pointerCanvas.height = rect.height * dpr;
    this.pointerCtx.scale(dpr, dpr);

    this.drawGrid();
  }

  // Vẽ lưới ô ma trận kiểm tra cảm ứng.
  drawGrid() {
    const rect = this.container.getBoundingClientRect();
    const cellW = rect.width / this.cols;
    const cellH = rect.height / this.rows;

    this.gridCtx.clearRect(0, 0, rect.width, rect.height);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const index = r * this.cols + c;
        const x = c * cellW;
        const y = r * cellH;

        if (this.touchedCells.has(index)) {
          this.gridCtx.fillStyle = '#059669'; // Màu xanh lá xác nhận
          this.gridCtx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
        } else {
          this.gridCtx.fillStyle = '#F5F6F1';
          this.gridCtx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
          this.gridCtx.strokeStyle = '#E1E4DB';
          this.gridCtx.lineWidth = 1;
          this.gridCtx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
        }
      }
    }
  }

  // Vẽ các vòng tròn nhận diện con trỏ ngón tay đang chạm trên màn hình.
  drawPointers() {
    const rect = this.container.getBoundingClientRect();
    this.pointerCtx.clearRect(0, 0, rect.width, rect.height);

    this.activePointers.forEach((p, id) => {
      // Vòng tròn hào quang
      this.pointerCtx.beginPath();
      this.pointerCtx.arc(p.x, p.y, 36, 0, Math.PI * 2);
      this.pointerCtx.fillStyle = 'rgba(21, 115, 53, 0.2)';
      this.pointerCtx.fill();

      // Điểm tâm tiếp xúc
      this.pointerCtx.beginPath();
      this.pointerCtx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      this.pointerCtx.fillStyle = '#157335';
      this.pointerCtx.fill();
      this.pointerCtx.strokeStyle = '#FFFFFF';
      this.pointerCtx.lineWidth = 2.5;
      this.pointerCtx.stroke();

      // Nhãn toạ độ
      this.pointerCtx.font = '10px monospace';
      this.pointerCtx.fillStyle = '#12161B';
      this.pointerCtx.fillText(`T${id}: (${Math.round(p.x)}, ${Math.round(p.y)})`, p.x + 18, p.y - 10);
    });
  }

  // Xử lý sự kiện khi ngón tay bắt đầu chạm vào màn hình.
  onPointerDown(e) {
    e.preventDefault();
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.activePointers.set(e.pointerId, { x, y });
    if (this.activePointers.size > this.maxPointersDetected) {
      this.maxPointersDetected = this.activePointers.size;
    }

    this.checkHitCell(x, y);
    this.drawPointers();
    this.updateStats();
  }

  // Xử lý sự kiện khi ngón tay lướt trên vùng màn hình cảm ứng.
  onPointerMove(e) {
    if (!this.activePointers.has(e.pointerId)) return;
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.activePointers.set(e.pointerId, { x, y });
    this.checkHitCell(x, y);
    this.drawPointers();
  }

  // Xử lý sự kiện khi ngón tay rời khỏi màn hình.
  onPointerUp(e) {
    this.activePointers.delete(e.pointerId);
    this.drawPointers();
    this.updateStats();
  }

  // Xác định ô lưới tương ứng với toạ độ chạm và đánh dấu ô đã được kiểm tra.
  checkHitCell(x, y) {
    const rect = this.container.getBoundingClientRect();
    const cellW = rect.width / this.cols;
    const cellH = rect.height / this.rows;

    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);

    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      const index = row * this.cols + col;
      if (!this.touchedCells.has(index)) {
        this.touchedCells.add(index);
        this.drawGrid();
        this.updateStats();
      }
    }
  }

  // Cập nhật các chỉ số hiển thị trên giao diện kiểm tra cảm ứng.
  updateStats() {
    const progressEl = document.getElementById('touchProgressStat');
    const pointerEl = document.getElementById('touchPointerStat');

    const percent = Math.round((this.touchedCells.size / this.totalCells) * 100);
    if (progressEl) {
      progressEl.innerText = `Tiến độ: ${this.touchedCells.size}/${this.totalCells} (${percent}%)`;
    }
    if (pointerEl) {
      pointerEl.innerText = `Đa điểm tối đa: ${this.maxPointersDetected} điểm`;
    }

    if (this.onProgressUpdate) {
      this.onProgressUpdate({
        coveredCells: this.touchedCells.size,
        totalCells: this.totalCells,
        percent,
        maxPointers: this.maxPointersDetected
      });
    }
  }
}
