// 캘린더 — 월 달력 + 선택한 날짜의 할일 목록.
// 별도 저장소 없이 할일(Todos.items)의 due(YYYY-MM-DD)를 그대로 쓴다:
// 여기서 추가한 할일은 할 일 탭에도 D-n 배지와 함께 나타나고, 그 날이 오면 D-Day로 보인다.
const Calendar = {
  sel: null,   // 선택한 날짜 'YYYY-MM-DD'
  tag: '',     // 추가줄에서 고른 태그 id ('' = 없음)
  year: 0,
  month: 0,    // 0~11

  ymd(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },

  label(s) {
    const [y, m, d] = s.split('-').map(Number);
    const wd = '일월화수목금토'[new Date(y, m - 1, d).getDay()];
    return `${m}월 ${d}일 (${wd})` + (s === this.ymd(new Date()) ? ' · 오늘' : '');
  },

  shift(delta) {
    const d = new Date(this.year, this.month + delta, 1);
    this.year = d.getFullYear();
    this.month = d.getMonth();
    this.render();
  },

  render() {
    const today = this.ymd(new Date());
    document.getElementById('cal-title').textContent = `${this.year}년 ${this.month + 1}월`;

    // 날짜별 미완료 할일 유무 → 점 표시
    const pending = new Set(Todos.items.filter((t) => t.due && !t.done).map((t) => t.due));

    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';
    '일월화수목금토'.split('').forEach((w, i) => {
      const el = document.createElement('div');
      el.className = 'cal-wd' + (i === 0 ? ' sun' : '');
      el.textContent = w;
      grid.appendChild(el);
    });
    const first = new Date(this.year, this.month, 1).getDay();
    const days = new Date(this.year, this.month + 1, 0).getDate();
    for (let i = 0; i < first; i++) grid.appendChild(document.createElement('div'));
    for (let d = 1; d <= days; d++) {
      const s = this.ymd(new Date(this.year, this.month, d));
      const cell = document.createElement('button');
      cell.className = 'cal-day' + (s === today ? ' today' : '') + (s === this.sel ? ' sel' : '') + (pending.has(s) ? ' has' : '');
      cell.textContent = d;
      cell.addEventListener('click', () => { this.sel = s; this.render(); });
      grid.appendChild(cell);
    }

    // 선택한 날짜의 할일 + 그 날짜 전용 추가줄
    const list = document.getElementById('cal-list');
    list.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'tag-header';
    head.textContent = this.label(this.sel);
    list.appendChild(head);
    for (const item of Todos.items.filter((t) => t.due === this.sel)) {
      const li = document.createElement('div');
      li.className = 'todo-item' + (item.done ? ' done' : '');
      const circle = document.createElement('span');
      circle.className = 'circle';
      circle.addEventListener('click', () => Todos.toggle(item.id));
      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = item.text;
      const del = document.createElement('button');
      del.className = 'todo-del';
      del.textContent = '×';
      del.title = '삭제';
      del.addEventListener('click', () => Todos.remove(item.id));
      li.append(circle, text, del);
      list.appendChild(li);
    }
    // 항목들 바로 아래의 추가줄: 입력 → Enter → 같은 자리에 새 추가줄이 생겨 계속 추가 가능
    const ghost = document.createElement('div');
    ghost.className = 'todo-ghost';
    const gc = document.createElement('span');
    gc.className = 'circle ghost-circle';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-input';
    input.placeholder = '할 일 추가...';
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      Todos.add(input.value, this.tag || null, this.sel); // 저장 → render()가 목록을 다시 그림
      document.querySelector('#cal-list .todo-input').focus();
    });
    ghost.append(gc, input);
    // 태그를 쓰는 중일 때만 태그 선택
    if (Settings.data.tagsEnabled) {
      const sel = document.createElement('select');
      sel.className = 'cal-tag';
      sel.add(new Option('태그 없음', ''));
      for (const t of Settings.data.tags) sel.add(new Option(t.name, t.id));
      sel.value = Settings.data.tags.some((t) => t.id === this.tag) ? this.tag : '';
      sel.addEventListener('change', () => { this.tag = sel.value; });
      ghost.append(sel);
    }
    ghost.addEventListener('click', (e) => { if (e.target === ghost) input.focus(); });
    list.appendChild(ghost);
  },

  init() {
    const now = new Date();
    this.sel = this.ymd(now);
    this.year = now.getFullYear();
    this.month = now.getMonth();
    document.getElementById('cal-prev').addEventListener('click', () => this.shift(-1));
    document.getElementById('cal-next').addEventListener('click', () => this.shift(1));
    // 제목을 누르면 오늘로
    document.getElementById('cal-title').addEventListener('click', () => {
      const t = new Date();
      this.sel = this.ymd(t);
      this.year = t.getFullYear();
      this.month = t.getMonth();
      this.render();
    });
    this.render();
  },
};
