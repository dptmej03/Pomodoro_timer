// 원형 뽀모도로 타이머 — 60분 = 360° 고정 스케일, endTime 기준 계산
const Timer = {
  CX: 100, CY: 100, R: 80,
  endTime: null,      // 실행 중일 때 종료 시각(ms)
  remainingMs: 0,     // 일시정지 시 남은 시간
  running: false,
  paused: false,
  tickId: null,
  alarmId: null,
  audioCtx: null,

  init() {
    this.drawTicks();
    this.updateDisplay(0);

    this.renderPresets();

    document.getElementById('btn-reset').addEventListener('click', () => this.reset());
    document.getElementById('btn-center').addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePause();
    });

    this.initDrag();
  },

  // 프리셋 버튼은 설정(Settings.data.presets)에서 그린다 — 설정에서 값을 바꾸면 다시 호출됨
  renderPresets() {
    const wrap = document.getElementById('presets');
    wrap.innerHTML = '';
    for (const min of Settings.data.presets) {
      const btn = document.createElement('button');
      btn.className = 'preset';
      btn.textContent = `${min}분`;
      btn.addEventListener('click', () => {
        this.start(min);
        document.querySelectorAll('.preset').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
      wrap.appendChild(btn);
    }
  },

  // 다이얼을 드래그해서 시간 설정 — 놓으면 바로 시작
  initDrag() {
    const dial = document.getElementById('dial');
    let dragging = false;

    const minutesFromEvent = (e) => {
      const rect = dial.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      let deg = (Math.atan2(dx, -dy) * 180) / Math.PI; // 12시 기준 시계방향 각도
      if (deg < 0) deg += 360;
      return Math.min(60, Math.round(deg / 6));
    };

    dial.addEventListener('pointerdown', (e) => {
      if (this.running) return; // 타이머 진행/일시정지 중에는 드래그 설정 잠금
      dragging = true;
      dial.setPointerCapture(e.pointerId);
      this.dragMin = minutesFromEvent(e);
      this.updateDisplay(this.dragMin * 60000);
    });

    dial.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.dragMin = minutesFromEvent(e);
      this.updateDisplay(this.dragMin * 60000);
    });

    dial.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      document.querySelectorAll('.preset').forEach((b) => b.classList.remove('active'));
      if (this.dragMin >= 1) this.start(this.dragMin);
      else this.reset();
    });
  },

  // 눈금: 0/15/30/45 숫자(12/3/6/9시) + 5분 간격 눈금선
  drawTicks() {
    const g = document.getElementById('dial-ticks');
    const NS = 'http://www.w3.org/2000/svg';
    for (let min = 0; min < 60; min += 5) {
      const rad = ((min * 6 - 90) * Math.PI) / 180;
      const isMajor = min % 15 === 0;
      const r1 = isMajor ? this.R - 8 : this.R - 5;
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', this.CX + r1 * Math.cos(rad));
      line.setAttribute('y1', this.CY + r1 * Math.sin(rad));
      line.setAttribute('x2', this.CX + this.R * Math.cos(rad));
      line.setAttribute('y2', this.CY + this.R * Math.sin(rad));
      line.setAttribute('class', 'tick-line');
      g.appendChild(line);
      if (isMajor) {
        const lr = this.R + 12;
        const label = document.createElementNS(NS, 'text');
        label.setAttribute('x', this.CX + lr * Math.cos(rad));
        label.setAttribute('y', this.CY + lr * Math.sin(rad));
        label.setAttribute('class', 'tick-label');
        label.textContent = String(min);
        g.appendChild(label);
      }
    }
  },

  // 남은 시간 부채꼴: 12시에서 시작, 시계방향으로 남은분 × 6°
  sectorPath(minutesLeft) {
    const angle = Math.min(minutesLeft * 6, 359.999);
    if (angle <= 0) return '';
    const rad = ((angle - 90) * Math.PI) / 180;
    const x = this.CX + this.R * Math.cos(rad);
    const y = this.CY + this.R * Math.sin(rad);
    const largeArc = angle > 180 ? 1 : 0;
    return `M ${this.CX} ${this.CY} L ${this.CX} ${this.CY - this.R} A ${this.R} ${this.R} 0 ${largeArc} 1 ${x} ${y} Z`;
  },

  updateDisplay(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    document.getElementById('dial-time').textContent = `${m}:${s}`;
    document.getElementById('dial-sector').setAttribute('d', this.sectorPath(ms / 60000));
  },

  start(minutes) {
    this.stopAlarm();
    clearInterval(this.tickId);
    this.endTime = Date.now() + minutes * 60000;
    this.running = true;
    this.paused = false;
    this.updateDisplay(minutes * 60000);
    this.setControls();
    this.tickId = setInterval(() => this.tick(), 250);
  },

  tick() {
    const remaining = this.endTime - Date.now();
    if (remaining <= 0) {
      this.updateDisplay(0);
      this.finish();
      return;
    }
    this.updateDisplay(remaining);
  },

  togglePause() {
    if (!this.running) return;
    if (this.paused) {
      this.endTime = Date.now() + this.remainingMs;
      this.paused = false;
      this.tickId = setInterval(() => this.tick(), 250);
    } else {
      this.remainingMs = Math.max(0, this.endTime - Date.now());
      this.paused = true;
      clearInterval(this.tickId);
    }
    this.setControls();
  },

  reset() {
    clearInterval(this.tickId);
    this.running = false;
    this.paused = false;
    this.stopAlarm();
    this.updateDisplay(0);
    document.querySelectorAll('.preset').forEach((b) => b.classList.remove('active'));
    this.setControls();
  },

  setControls() {
    document.getElementById('btn-reset').disabled = !this.running;
    const wrap = document.getElementById('dial-wrap');
    wrap.classList.toggle('running', this.running && !this.paused);
    wrap.classList.toggle('paused', this.paused);
    wrap.classList.toggle('locked', this.running);
  },

  finish() {
    clearInterval(this.tickId);
    this.running = false;
    this.paused = false;
    this.setControls();
    document.querySelectorAll('.preset').forEach((b) => b.classList.remove('active'));

    // 창 전체 빨간 깜빡임 + 작업표시줄 flash + (설정 시) 알림음
    document.body.classList.add('alarm');
    window.api.flashFrame(true);
    if (Settings.data.sound) {
      this.beep();
      this.alarmId = setInterval(() => this.beep(), 1200);
    }
  },

  stopAlarm() {
    if (!document.body.classList.contains('alarm')) return;
    document.body.classList.remove('alarm');
    window.api.flashFrame(false);
    clearInterval(this.alarmId);
  },

  beep() {
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    const ctx = this.audioCtx;
    [0, 0.2].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  },
};
