// 설정: 테마 / 완료 항목 동작 / 종료음
const Settings = {
  data: { theme: 'cream', completedBehavior: 'moveDown', sound: true, autoDelete: false },

  async load() {
    this.data = await window.api.loadData('settings');
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
  },
};
