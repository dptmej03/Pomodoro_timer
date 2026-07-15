// 할일 노트 — 변경 즉시 저장, 완료 동작은 설정(completedBehavior)에 따름.
// 태그 OFF: 평범한 목록 하나 + 추가줄.
// 태그 ON: 그룹별 섹션(헤더 + 항목 + 그룹 전용 추가줄), 드래그로 그룹 간 이동 가능.
const Todos = {
  items: [],
  dragId: null,

  async load() {
    const data = await window.api.loadData('todos');
    this.items = Array.isArray(data.todos) ? data.todos : [];
    this.render();
  },

  save() {
    window.api.saveData('todos', { todos: this.items });
  },

  clearDropMarks() {
    document
      .querySelectorAll('.drop-above, .drop-below')
      .forEach((el) => el.classList.remove('drop-above', 'drop-below'));
  },

  // 항목의 중요도(0=보통, 1=중간, 2=높음). 값 없으면 0.
  prio(item) {
    return item.priority || 0;
  },

  // 표시용 정렬: (1) 중요도 자동정렬이 켜졌으면 높은 중요도 먼저
  //             (2) moveDown이면 완료 항목을 맨 아래로
  // 안정 정렬이라 같은 그룹(중요도/완료 여부) 안에서는 원래 배열 순서(=드래그 순서) 유지.
  ordered(list) {
    let out = list;
    if (Settings.data.priorityEnabled && Settings.data.prioritySort) {
      out = [...out].sort((a, b) => this.prio(b) - this.prio(a));
    }
    if (Settings.data.completedBehavior === 'moveDown') {
      out = [...out.filter((t) => !t.done), ...out.filter((t) => t.done)];
    }
    return out;
  },

  render() {
    const note = document.getElementById('note');
    note.innerHTML = '';

    if (!Settings.data.tagsEnabled) {
      // 태그 OFF — 예전 그대로: 항목 하나의 목록 + 추가줄 하나
      note.classList.remove('grouped');
      const ul = document.createElement('ul');
      ul.className = 'todo-list';
      for (const item of this.ordered(this.items)) ul.appendChild(this.makeItem(item));
      note.appendChild(ul);
      note.appendChild(this.makeGhost(null));
      return;
    }

    // 태그 ON — 그룹별 섹션. 순서: 태그 0,1,2 → 무태그(태그 없는 항목이 있을 때만)
    note.classList.add('grouped');
    const tags = Settings.data.tags;
    tags.forEach((name, i) => note.appendChild(this.makeSection(name, i)));
    if (this.items.some((t) => t.tag === null || t.tag === undefined)) {
      note.appendChild(this.makeSection('기타', null));
    }
  },

  // 한 그룹 섹션: 헤더(구분선+이름) + 그 태그 항목들 + 그 태그 전용 추가줄
  makeSection(name, tag) {
    const section = document.createElement('div');
    section.className = 'tag-section';

    const header = document.createElement('div');
    header.className = 'tag-header';
    header.textContent = name;
    section.appendChild(header);

    const ul = document.createElement('ul');
    ul.className = 'todo-list';
    const inGroup = this.items.filter((t) =>
      tag === null ? t.tag === null || t.tag === undefined : t.tag === tag
    );
    for (const item of this.ordered(inGroup)) ul.appendChild(this.makeItem(item));
    section.appendChild(ul);

    section.appendChild(this.makeGhost(tag));
    return section;
  },

  // 할일 한 줄(li) 생성 — 항목 렌더 + 인라인수정 + 드래그
  makeItem(item) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (item.done ? ' done' : '');
    li.draggable = true;

    const circle = document.createElement('span');
    circle.className = 'circle';
    circle.addEventListener('click', () => this.toggle(item.id));

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = item.text;
    text.addEventListener('click', () => this.startEdit(item, text, li));

    const del = document.createElement('button');
    del.className = 'todo-del';
    del.textContent = '×';
    del.title = '삭제';
    del.addEventListener('click', () => this.remove(item.id));

    li.appendChild(circle);

    // 중요도 네모칸 — 동그라미와 텍스트 사이. 설정에서 켰을 때만.
    // 클릭하면 보통→중간(노랑)→높음(빨강)→보통 순환
    if (Settings.data.priorityEnabled) {
      const box = document.createElement('button');
      const p = this.prio(item);
      box.className = 'prio-box prio-' + p;
      box.title = ['보통', '중간', '높음'][p];
      box.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cyclePriority(item.id);
      });
      li.appendChild(box);
    }

    li.append(text, del);

    li.addEventListener('dragstart', (e) => {
      this.dragId = item.id;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.id);
    });
    li.addEventListener('dragend', () => {
      this.dragId = null;
      li.classList.remove('dragging');
      this.clearDropMarks();
    });
    li.addEventListener('dragover', (e) => {
      if (!this.dragId || this.dragId === item.id) return;
      if (!this.canDropOn(item)) return; // 자동정렬 ON이면 다른 중요도 칸엔 못 놓음
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = li.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      this.clearDropMarks();
      li.classList.add(before ? 'drop-above' : 'drop-below');
    });
    li.addEventListener('dragleave', () => {
      li.classList.remove('drop-above', 'drop-below');
    });
    li.addEventListener('drop', (e) => {
      if (!this.dragId || this.dragId === item.id) return;
      if (!this.canDropOn(item)) return;
      e.preventDefault();
      const rect = li.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      // 타깃 항목의 태그로 맞춰 이동 (다른 그룹으로 끌어놓으면 그룹 이동)
      this.move(this.dragId, item.id, before, item.tag ?? null);
    });

    return li;
  },

  // 반투명 추가줄 — tag는 이 줄로 추가한 항목이 들어갈 그룹(null이면 무태그)
  makeGhost(tag) {
    const ghost = document.createElement('div');
    ghost.className = 'todo-ghost';

    const circle = document.createElement('span');
    circle.className = 'circle ghost-circle';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-input';
    input.placeholder = '할 일 추가...';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.add(input.value, tag);
        input.value = '';
        input.focus(); // 연속 입력
      }
    });

    ghost.append(circle, input);
    ghost.addEventListener('click', () => input.focus());

    // 이 추가줄에 항목을 떨어뜨리면 이 그룹의 맨 끝으로 이동(+그룹 변경)
    ghost.addEventListener('dragover', (e) => {
      if (!this.dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    ghost.addEventListener('drop', (e) => {
      if (!this.dragId) return;
      e.preventDefault();
      this.moveToGroupEnd(this.dragId, tag);
    });

    return ghost;
  },

  // 자동정렬 ON일 때는 끌고 있는 항목과 같은 중요도 위에만 놓을 수 있다.
  // (자동정렬 OFF면 항상 자유롭게 이동)
  canDropOn(targetItem) {
    if (!(Settings.data.priorityEnabled && Settings.data.prioritySort)) return true;
    const dragged = this.items.find((t) => t.id === this.dragId);
    if (!dragged) return false;
    return this.prio(dragged) === this.prio(targetItem);
  },

  // 중요도 순환: 보통(0) → 중간(1) → 높음(2) → 보통
  cyclePriority(id) {
    const item = this.items.find((t) => t.id === id);
    if (!item) return;
    item.priority = (this.prio(item) + 1) % 3;
    this.save();
    this.render();
  },

  // dragId 항목을 targetId 앞/뒤로 이동. newTag가 주어지면 그 태그로 변경(그룹 이동).
  move(dragId, targetId, before, newTag) {
    const from = this.items.findIndex((t) => t.id === dragId);
    if (from < 0 || dragId === targetId) return;
    const [moved] = this.items.splice(from, 1);
    if (newTag !== undefined) moved.tag = newTag;
    let to = this.items.findIndex((t) => t.id === targetId);
    if (to < 0) to = this.items.length;
    else if (!before) to += 1;
    this.items.splice(to, 0, moved);
    this.save();
    this.render();
  },

  // dragId 항목을 특정 그룹(tag)의 맨 끝으로 이동하며 태그 변경
  moveToGroupEnd(dragId, tag) {
    const from = this.items.findIndex((t) => t.id === dragId);
    if (from < 0) return;
    const [moved] = this.items.splice(from, 1);
    moved.tag = tag;
    // 같은 태그 항목들 중 마지막 뒤에 삽입 (그룹 순서 유지)
    let lastIdx = -1;
    this.items.forEach((t, i) => {
      const tTag = t.tag ?? null;
      if (tTag === (tag ?? null)) lastIdx = i;
    });
    this.items.splice(lastIdx + 1, 0, moved);
    this.save();
    this.render();
  },

  // 인라인 수정: 텍스트를 input으로 바꿔치기, Enter/포커스 이탈로 저장, Esc로 취소
  startEdit(item, textEl, li) {
    li.draggable = false;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-edit';
    input.value = item.text;
    textEl.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    let finished = false;
    const finish = (commit) => {
      if (finished) return;
      finished = true;
      const value = input.value.trim();
      if (commit && value && value !== item.text) {
        item.text = value;
        this.save();
      }
      this.render();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  },

  add(text, tag) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const t = Settings.data.tagsEnabled ? tag ?? null : null;
    this.items.push({ id: String(Date.now()), text: trimmed, done: false, tag: t, priority: 0 });
    this.save();
    this.render();
  },

  toggle(id) {
    const item = this.items.find((t) => t.id === id);
    if (!item) return;
    item.done = !item.done;
    this.save();
    this.render();
    if (item.done && Settings.data.autoDelete) {
      setTimeout(() => {
        const cur = this.items.find((t) => t.id === id);
        if (cur && cur.done) this.remove(id);
      }, 1500);
    }
  },

  remove(id) {
    this.items = this.items.filter((t) => t.id !== id);
    this.save();
    this.render();
  },

  init() {
    // 목록은 render()가 통째로 그리므로 별도 초기화 없음
  },
};
