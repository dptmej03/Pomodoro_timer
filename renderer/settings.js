// 설정: 테마 / 타이머 프리셋 / 완료 항목 동작 / 종료음 / 할 일 태그
const DEFAULT_PRESETS = [5, 15, 30, 45, 50];
const DEFAULT_TAGS = ['개인', '랩실', '학교'];

const Settings = {
  data: {
    theme: 'cream', completedBehavior: 'moveDown', sound: true, autoDelete: false,
    presets: [...DEFAULT_PRESETS], tagsEnabled: false, tags: [...DEFAULT_TAGS],
    priorityEnabled: false, prioritySort: false,
  },

  async load() {
    this.data = await window.api.loadData('settings');
    // 저장 파일이 손상됐어도 프리셋은 항상 유효한 5칸(1~60분)으로 복원
    const raw = Array.isArray(this.data.presets) ? this.data.presets : [];
    this.data.presets = DEFAULT_PRESETS.map((def, i) => {
      const v = Math.round(Number(raw[i]));
      return Number.isFinite(v) && v >= 1 && v <= 60 ? v : def;
    });
    // 태그 이름도 항상 유효한 3칸(빈 값이면 기본 이름)으로 복원
    const rawTags = Array.isArray(this.data.tags) ? this.data.tags : [];
    this.data.tags = DEFAULT_TAGS.map((def, i) => {
      const v = typeof rawTags[i] === 'string' ? rawTags[i].trim() : '';
      return v || def;
    });
    // 켜짐/꺼짐 토글은 손상값이 들어와도 항상 진짜 boolean으로
    this.data.tagsEnabled = this.data.tagsEnabled === true;
    this.data.priorityEnabled = this.data.priorityEnabled === true;
    this.data.prioritySort = this.data.prioritySort === true;
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

    const tagsToggle = document.getElementById('tags-toggle');
    tagsToggle.checked = this.data.tagsEnabled;
    document.getElementById('tags-label').textContent = this.data.tagsEnabled ? '켜짐' : '꺼짐';
    document.querySelectorAll('.tag-name-input').forEach((input, i) => {
      input.value = this.data.tags[i];
      input.disabled = !this.data.tagsEnabled; // 토글 꺼지면 회색 비활성
    });

    document.getElementById('priority-toggle').checked = this.data.priorityEnabled;
    document.getElementById('priority-label').textContent = this.data.priorityEnabled ? '켜짐' : '꺼짐';
    // 자동 정렬 토글은 중요도 표시가 켜졌을 때만 활성
    const psToggle = document.getElementById('prioritysort-toggle');
    psToggle.checked = this.data.prioritySort;
    psToggle.disabled = !this.data.priorityEnabled;
    document.getElementById('prioritysort-row').classList.toggle('disabled', !this.data.priorityEnabled);
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

    // 태그 사용 토글: 꺼지면 이름 입력칸이 회색 비활성 + 할일 페이지 필터 숨김
    document.getElementById('tags-toggle').addEventListener('change', (e) => {
      this.data.tagsEnabled = e.target.checked;
      this.syncUI();
      this.save();
      Todos.render();
    });

    document.querySelectorAll('.tag-name-input').forEach((input, i) => {
      input.addEventListener('change', () => {
        const v = input.value.trim();
        this.data.tags[i] = v || DEFAULT_TAGS[i];
        this.syncUI();
        this.save();
        Todos.render();
      });
    });

    // 중요도 표시 토글: 끄면 자동 정렬도 함께 꺼진 것처럼 회색 비활성
    document.getElementById('priority-toggle').addEventListener('change', (e) => {
      this.data.priorityEnabled = e.target.checked;
      this.syncUI();
      this.save();
      Todos.render();
    });

    document.getElementById('prioritysort-toggle').addEventListener('change', (e) => {
      this.data.prioritySort = e.target.checked;
      this.save();
      Todos.render();
    });
  },
};
