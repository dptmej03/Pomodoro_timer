// 설정: 테마 / 타이머 프리셋 / 완료 항목 동작 / 종료음 / 할 일 태그
const DEFAULT_PRESETS = [5, 15, 30, 45, 50];
const DEFAULT_TAGS = [
  { id: 't1', name: '개인' },
  { id: 't2', name: '랩실' },
  { id: 't3', name: '학교' },
];

const Settings = {
  data: {
    theme: 'cream', completedBehavior: 'moveDown', sound: true, autoDelete: false,
    presets: [...DEFAULT_PRESETS],
    tagsEnabled: false, tags: DEFAULT_TAGS.map((t) => ({ ...t })),
    priorityEnabled: false, prioritySort: false,
  },
  // 예전(숫자 인덱스) 태그로 저장된 할일을 새 id 방식으로 옮기기 위해,
  // load 시점의 "인덱스 → 태그id" 대응표를 잠깐 보관한다.
  legacyTagMap: null,

  async load() {
    this.data = await window.api.loadData('settings');
    // 저장 파일이 손상됐어도 프리셋은 항상 유효한 5칸(1~60분)으로 복원
    const raw = Array.isArray(this.data.presets) ? this.data.presets : [];
    this.data.presets = DEFAULT_PRESETS.map((def, i) => {
      const v = Math.round(Number(raw[i]));
      return Number.isFinite(v) && v >= 1 && v <= 60 ? v : def;
    });
    this.normalizeTags();
    // 켜짐/꺼짐 토글은 손상값이 들어와도 항상 진짜 boolean으로
    this.data.tagsEnabled = this.data.tagsEnabled === true;
    this.data.priorityEnabled = this.data.priorityEnabled === true;
    this.data.prioritySort = this.data.prioritySort === true;
    const c = this.data.customColor || {};
    const ok = (v, max) => Number.isFinite(v) && v >= 0 && v <= max;
    this.data.customColor = ok(c.h, 360) && ok(c.s, 100) && ok(c.l, 100) ? c : { h: 210, s: 40, l: 90 };
    this.data.savedColors = (Array.isArray(this.data.savedColors) ? this.data.savedColors : [])
      .filter((x) => x && ok(x.h, 360) && ok(x.s, 100) && ok(x.l, 100));
    this.apply();
    this.syncUI();
  },

  sameColor(a, b) {
    return a.h === b.h && a.s === b.s && a.l === b.l;
  },

  // 저장해 둔 색을 테마 줄 끝에 동그라미로 그린다
  renderSaved() {
    const wrap = document.getElementById('theme-swatches');
    wrap.querySelectorAll('.saved').forEach((el) => el.remove());
    for (const c of this.data.savedColors) {
      const b = document.createElement('button');
      b.className = 'swatch saved' + (this.data.theme === 'custom' && this.sameColor(c, this.data.customColor) ? ' active' : '');
      b.style.background = `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
      b.title = '저장한 색';
      b.addEventListener('click', () => {
        this.data.theme = 'custom';
        this.data.customColor = { ...c };
        this.apply();
        this.syncUI();
        this.save();
      });
      wrap.appendChild(b);
    }
    const saved = this.data.savedColors.some((c) => this.sameColor(c, this.data.customColor));
    document.getElementById('c-save').textContent = saved ? '−' : '+';
    document.getElementById('c-save').title = saved ? '저장한 색 삭제' : '이 색 저장';
  },

  // 직접 만든 색(HSL) → 테마 변수들. 밝은 바탕이면 어두운 글자, 어두운 바탕이면 밝은 글자.
  applyCustom() {
    const { h, s, l } = this.data.customColor;
    const light = l > 55;
    const hsl = (hh, ss, ll) => `hsl(${hh}, ${ss}%, ${Math.max(0, Math.min(100, ll))}%)`;
    const dir = l > 50 ? -1 : 1; // 탭·줄은 바탕에서 조금씩 멀어지게
    const v = {
      '--bg': hsl(h, s, l),
      '--paper-line': hsl(h, s, l + dir * 9),
      '--text': light ? hsl(h, Math.min(s, 30), 20) : hsl(h, Math.min(s, 30), 92),
      '--text-faded': light ? hsl(h, s * 0.5, 60) : hsl(h, s * 0.4, 50),
      '--accent': light ? '#E5484D' : '#FF6B6B',
      '--margin-line': hsl(h, s, light ? 68 : 42),
      '--tab-text': light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.75)',
    };
    ['timer', 'todo', 'memo', 'settings'].forEach((k, i) => {
      v['--tab-' + k] = hsl(h, s, l + dir * (6 + i * 5));
    });
    for (const [k, val] of Object.entries(v)) document.body.style.setProperty(k, val);
  },

  hslToRgb({ h, s, l }) {
    s /= 100; l /= 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      return Math.round(255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    return [f(0), f(8), f(4)];
  },

  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    const l = (max + min) / 2;
    let h = 0;
    if (d) {
      h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  },

  // 태그 배열을 항상 [{id, name}] 형태로 정규화.
  // 예전 형식(["개인","랩실",...] 문자열 배열)이면 id를 붙이고,
  // 인덱스→id 대응표(legacyTagMap)를 만들어 Todos가 할일 tag를 마이그레이션하게 한다.
  normalizeTags() {
    const rawTags = Array.isArray(this.data.tags) ? this.data.tags : [];
    const isLegacy = rawTags.length > 0 && typeof rawTags[0] === 'string';

    if (isLegacy) {
      this.legacyTagMap = {};
      this.data.tags = rawTags.map((name, i) => {
        const id = 't' + (i + 1);
        this.legacyTagMap[i] = id; // 예전 항목의 tag(숫자 i)를 이 id로 바꿔줄 것
        const n = typeof name === 'string' ? name.trim() : '';
        return { id, name: n || `태그 ${i + 1}` };
      });
    } else {
      // 이미 새 형식 — id/name 유효성만 보정
      this.legacyTagMap = null;
      this.data.tags = rawTags
        .filter((t) => t && typeof t === 'object')
        .map((t, i) => ({
          id: typeof t.id === 'string' && t.id ? t.id : 't' + (i + 1),
          name: typeof t.name === 'string' && t.name.trim() ? t.name.trim() : `태그 ${i + 1}`,
        }));
    }
    // 태그가 하나도 없으면 기본 3개 복원
    if (this.data.tags.length === 0) {
      this.data.tags = DEFAULT_TAGS.map((t) => ({ ...t }));
    }
  },

  newTagId() {
    // 기존 id와 겹치지 않는 새 id 생성
    let n = this.data.tags.length + 1;
    const used = new Set(this.data.tags.map((t) => t.id));
    let id;
    do { id = 't' + n++; } while (used.has(id));
    return id;
  },

  save() {
    window.api.saveData('settings', this.data);
  },

  apply() {
    document.body.dataset.theme = this.data.theme;
    if (this.data.theme === 'custom') this.applyCustom();
    else document.body.removeAttribute('style'); // 직접 만든 색 변수 제거
  },

  syncUI() {
    this.renderSaved();
    const panel = document.getElementById('custom-panel');
    panel.hidden = this.data.theme !== 'custom';
    const { h, s, l } = this.data.customColor;
    const set = (id, val) => { const el = document.getElementById(id); if (document.activeElement !== el) el.value = val; };
    set('c-h', h); set('c-s', s); set('c-l', l);
    this.hslToRgb(this.data.customColor).forEach((val, i) => set('c-' + 'rgb'[i], val));
    document.getElementById('c-s').style.background = `linear-gradient(to right, hsl(${h},0%,${l}%), hsl(${h},100%,${l}%))`;
    document.getElementById('c-l').style.background = `linear-gradient(to right, #000, hsl(${h},${s}%,50%), #fff)`;
    document.querySelectorAll('.swatch:not(.saved)').forEach((s) => {
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
    this.renderTagList();

    document.getElementById('priority-toggle').checked = this.data.priorityEnabled;
    document.getElementById('priority-label').textContent = this.data.priorityEnabled ? '켜짐' : '꺼짐';
    // 자동 정렬 토글은 중요도 표시가 켜졌을 때만 활성
    const psToggle = document.getElementById('prioritysort-toggle');
    psToggle.checked = this.data.prioritySort;
    psToggle.disabled = !this.data.priorityEnabled;
    document.getElementById('prioritysort-row').classList.toggle('disabled', !this.data.priorityEnabled);
  },

  tagDragId: null,

  // 설정 태그 목록을 통째로 그린다: 태그마다 [핸들][이름 입력][삭제] + 맨 아래 "태그 추가"
  renderTagList() {
    const wrap = document.getElementById('tag-list');
    wrap.innerHTML = '';
    const enabled = this.data.tagsEnabled;

    for (const tag of this.data.tags) {
      const row = document.createElement('div');
      row.className = 'tag-row';
      row.draggable = enabled;

      const handle = document.createElement('span');
      handle.className = 'tag-handle';
      handle.textContent = '≡';
      handle.title = '드래그로 순서 변경';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'tag-name-input';
      input.maxLength = 8;
      input.value = tag.name;
      input.disabled = !enabled;
      // 이름칸에서 시작한 드래그는 행 이동이 아니라 텍스트 선택이어야 함
      input.addEventListener('pointerdown', () => { row.draggable = false; });
      input.addEventListener('blur', () => { row.draggable = enabled; });
      input.addEventListener('change', () => {
        const v = input.value.trim();
        tag.name = v || tag.name; // 빈 값이면 원래 이름 유지
        this.save();
        this.syncUI();
        Todos.render();
      });

      const del = document.createElement('button');
      del.className = 'tag-del';
      del.textContent = '×';
      del.title = '태그 삭제';
      del.disabled = !enabled;
      del.addEventListener('click', () => this.removeTag(tag.id));

      row.append(handle, input, del);

      // 드래그로 순서 변경
      row.addEventListener('dragstart', (e) => {
        if (!enabled) return;
        this.tagDragId = tag.id;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', () => {
        this.tagDragId = null;
        row.classList.remove('dragging');
        wrap.querySelectorAll('.drop-above, .drop-below')
          .forEach((el) => el.classList.remove('drop-above', 'drop-below'));
      });
      row.addEventListener('dragover', (e) => {
        if (!this.tagDragId || this.tagDragId === tag.id) return;
        e.preventDefault();
        const rect = row.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        wrap.querySelectorAll('.drop-above, .drop-below')
          .forEach((el) => el.classList.remove('drop-above', 'drop-below'));
        row.classList.add(before ? 'drop-above' : 'drop-below');
      });
      row.addEventListener('drop', (e) => {
        if (!this.tagDragId || this.tagDragId === tag.id) return;
        e.preventDefault();
        const rect = row.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        this.moveTag(this.tagDragId, tag.id, before);
      });

      wrap.appendChild(row);
    }

    // "태그 추가" 버튼
    const addBtn = document.createElement('button');
    addBtn.className = 'tag-add';
    addBtn.textContent = '+ 태그 추가';
    addBtn.disabled = !enabled;
    addBtn.addEventListener('click', () => this.addTag());
    wrap.appendChild(addBtn);
  },

  addTag() {
    this.data.tags.push({ id: this.newTagId(), name: `태그 ${this.data.tags.length + 1}` });
    this.save();
    this.syncUI();
    Todos.render();
  },

  // 태그 삭제 — 그 태그의 할일은 지우지 않고 무태그(기타)로 옮긴다
  removeTag(id) {
    this.data.tags = this.data.tags.filter((t) => t.id !== id);
    Todos.untag(id); // 그 태그 달린 할일들을 tag=null로
    this.save();
    this.syncUI();
    Todos.render();
  },

  // dragId 태그를 targetId 앞/뒤로 이동 (할일 그룹 순서도 이 순서를 따름)
  moveTag(dragId, targetId, before) {
    const from = this.data.tags.findIndex((t) => t.id === dragId);
    if (from < 0 || dragId === targetId) return;
    const [moved] = this.data.tags.splice(from, 1);
    let to = this.data.tags.findIndex((t) => t.id === targetId);
    if (!before) to += 1;
    this.data.tags.splice(to, 0, moved);
    this.save();
    this.syncUI();
    Todos.render();
  },

  init() {
    const custom = (hsl) => {
      this.data.customColor = hsl;
      this.apply();
      this.syncUI();
      this.save();
    };
    document.getElementById('c-save').addEventListener('click', () => {
      const cur = this.data.customColor;
      const has = this.data.savedColors.some((c) => this.sameColor(c, cur));
      this.data.savedColors = has
        ? this.data.savedColors.filter((c) => !this.sameColor(c, cur))
        : [...this.data.savedColors, { ...cur }];
      this.syncUI();
      this.save();
    });
    ['h', 's', 'l'].forEach((k) => {
      document.getElementById('c-' + k).addEventListener('input', () => {
        const get = (x) => Number(document.getElementById('c-' + x).value);
        custom({ h: get('h'), s: get('s'), l: get('l') });
      });
    });
    // RGB는 0~255 정수만 받고, 잘못된 값은 clamp
    ['r', 'g', 'b'].forEach((k) => {
      document.getElementById('c-' + k).addEventListener('change', () => {
        const get = (x) => Math.max(0, Math.min(255, Math.round(Number(document.getElementById('c-' + x).value) || 0)));
        const hsl = this.rgbToHsl(get('r'), get('g'), get('b'));
        document.activeElement.blur(); // 먼저 포커스를 풀어야 정규화된 값이 칸에 다시 채워진다
        custom(hsl);
      });
    });
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

    // 태그 사용 토글: 꺼지면 태그 관리 UI가 회색 비활성 + 할일 페이지 그룹 해제
    document.getElementById('tags-toggle').addEventListener('change', (e) => {
      this.data.tagsEnabled = e.target.checked;
      this.syncUI();
      this.save();
      Todos.render();
    });
    // 개별 태그 줄(이름/삭제/드래그)은 renderTagList()가 매번 다시 그리며 이벤트를 붙인다

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
