/**
 * MobiCheck Web - Display Test
 * Kiểm tra điểm chết, đốm sáng và tính đồng đều màu sắc màn hình.
 */

export class DisplayTest {
  // Khởi tạo bài kiểm tra hiển thị với danh sách mẫu màu.
  constructor(containerElement, onComplete) {
    this.container = containerElement;
    this.onComplete = onComplete;
    this.currentIndex = 0;
    this.patterns = [
      { name: 'Đỏ thuần (Red)', type: 'color', value: '#FF0000', textLight: true },
      { name: 'Xanh lục (Green)', type: 'color', value: '#00FF00', textLight: false },
      { name: 'Xanh lam (Blue)', type: 'color', value: '#0000FF', textLight: true },
      { name: 'Trắng thuần (White)', type: 'color', value: '#FFFFFF', textLight: false },
      { name: 'Đen sâu (Black)', type: 'color', value: '#000000', textLight: true },
      { name: 'Dải màu chuẩn (Color Bars)', type: 'bars' },
      { name: 'Dải tương phản xám (Gradient)', type: 'gradient' },
      { name: 'Lưới ô cờ (Checkerboard)', type: 'checkerboard' }
    ];
    this.handleClick = this.nextPattern.bind(this);
  }

  // Bắt đầu hiển thị bài kiểm tra và yêu cầu toàn màn hình nếu được phép.
  start() {
    this.currentIndex = 0;
    this.renderPattern();
    this.container.addEventListener('click', this.handleClick);

    // Thử chuyển sang chế độ toàn màn hình để kiểm tra viền màn hình
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
  }

  // Kết thúc bài kiểm tra, thoát toàn màn hình và dọn dẹp sự kiện.
  stop() {
    this.container.removeEventListener('click', this.handleClick);
    this.container.innerHTML = '';
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Chuyển sang mẫu kiểm tra kế tiếp hoặc hoàn thành vòng kiểm tra.
  nextPattern(e) {
    if (e) e.stopPropagation();
    this.currentIndex++;
    if (this.currentIndex >= this.patterns.length) {
      this.currentIndex = 0;
    }
    this.renderPattern();
  }

  // Vẽ mẫu kiểm tra tương ứng lên giao diện.
  renderPattern() {
    const pattern = this.patterns[this.currentIndex];
    this.container.innerHTML = '';
    this.container.className = 'display-test-viewport';

    const hud = document.createElement('div');
    hud.className = 'display-helper-hud';
    hud.innerText = 'Chạm màn hình để đổi màu kiểm tra';
    this.container.appendChild(hud);

    const info = document.createElement('div');
    info.className = 'display-pattern-info';
    info.innerText = `Mẫu ${this.currentIndex + 1}/${this.patterns.length}: ${pattern.name}`;
    this.container.appendChild(info);

    if (pattern.type === 'color') {
      this.container.style.background = pattern.value;
    } else if (pattern.type === 'bars') {
      this.container.style.background = 'transparent';
      const bars = document.createElement('div');
      bars.className = 'color-bars-wrapper';
      const colors = ['#FFFFFF', '#FFFF00', '#00FFFF', '#00FF00', '#FF00FF', '#FF0000', '#0000FF', '#000000'];
      colors.forEach(c => {
        const col = document.createElement('div');
        col.className = 'color-bar-col';
        col.style.background = c;
        bars.appendChild(col);
      });
      this.container.appendChild(bars);
    } else if (pattern.type === 'gradient') {
      this.container.style.background = 'linear-gradient(to right, #000000, #333333, #666666, #999999, #CCCCCC, #FFFFFF)';
    } else if (pattern.type === 'checkerboard') {
      this.container.style.background = '';
      const grid = document.createElement('div');
      grid.className = 'grid-checkerboard';
      this.container.appendChild(grid);
    }
  }
}
