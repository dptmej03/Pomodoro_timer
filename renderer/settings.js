// 설정: 테마 / 타이머 프리셋 / 완료 항목 동작 / 종료음
const DEFAULT_PRESETS = [5, 15, 30, 45, 50];

const Settings = {
  data: { theme: 'cream', completedBehavior: 'moveDown', sound: true, autoDelete: false, presets: [...DEFAULT_PRESETS] },

  async load() {
    this.data = await window.api.loadData('settings');
    // 저장 파일이 손상됐어도 프리셋은 항상 유효한 5칸(1~60분)으로 복원
    const raw = Array.isArray(this.data.presets) ? this.data.presets : [];
    this.data.presets = DEFAULT_PRESETS.map((def, i) => {
      const v = Math.round(Number(raw[i]));
      return Number.isFinite(v) && v >= 1 && v <= 60 ? v : def;
    });
    this.apply();
    this.syncUI();
  },

  save() {
    window.api.saveData('settings', this.data);
  },

  apply() {
    document.body.dataset.theme = this.data.theme;
  },

  syncUI() {
    document.querySelectorAll('.swatch').forEach((s) => {
      s.classList.toggle('active', s.dataset.swatchTheme === this.data.theme);
    });
    const radio = document.querySelector(
      `input[name="completedBehavior"][value="${this.data.completedBehavior}"]`
    );
    if (radio) radio.checked = true;
    const toggle = document.getElementById('sound-toggle');
    toggle.checked = this.data.sound;
    document.getElementById('sound-label').textContent = this.data.sound ? '켜짐' : '꺼짐';
    document.getElementById('autodelete-toggle').checked = this.data.autoDelete;
    document.querySelectorAll('.preset-input').forEach((input, i) => {
      input.value = this.data.presets[i];
    });
  },

  init() {
    document.querySelectorAll('.swatch').forEach((s) => {
      s.addEventListener('click', () => {
        this.data.theme = s.dataset.swatchTheme;
        this.apply();
        this.syncUI();
        this.save();
      });
    });

    document.querySelectorAll('input[name="completedBehavior"]').forEach((r) => {
      r.addEventListener('change', () => {
        this.data.completedBehavior = r.value;
        this.save();
        Todos.render();
      });
    });

    document.getElementById('sound-toggle').addEventListener('change', (e) => {
      this.data.sound = e.target.checked;
      this.syncUI();
      this.save();
    });

    document.getElementById('autodelete-toggle').addEventListener('change', (e) => {
      this.data.autoDelete = e.target.checked;
      this.save();
    });

    // 타이머 프리셋 편집: 1~60분만 허용, 유효하지 않으면 원래 값으로 복원
    document.querySelectorAll('.preset-input').forEach((input, i) => {
      input.addEventListener('change', () => {
        const v = Math.round(Number(input.value));
        if (Number.isFinite(v) && v >= 1 && v <= 60) {
          this.data.presets[i] = v;
          this.save();
          Timer.renderPresets();
        }
        this.syncUI();
      });
    });
  },
};
