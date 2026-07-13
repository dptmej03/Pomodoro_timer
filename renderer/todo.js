// 할일 노트 — 변경 즉시 저장, 완료 동작은 설정(completedBehavior)에 따름
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
      .querySelectorAll('.todo-item.drop-above, .todo-item.drop-below')
      .forEach((el) => el.classList.remove('drop-above', 'drop-below'));
  },

  render() {
    const ul = document.getElementById('todo-list');
    ul.innerHTML = '';
    const list =
      Settings.data.completedBehavior === 'moveDown'
        ? [...this.items.filter((t) => !t.done), ...this.items.filter((t) => t.done)]
        : this.items;

    for (const item of list) {
      const li = document.createElement('li');
      li.className = 'todo-item' + (item.done ? ' done' : '');
      li.draggable = true;

      const circle = document.createElement('span');
      circle.className = 'circle';
      circle.addEventListener('click', () => this.toggle(item.id));

      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = item.text;
      // 텍스트를 클릭하면 그 자리에서 바로 수정
      text.addEventListener('click', () => this.startEdit(item, text, li));

      const del = document.createElement('button');
      del.className = 'todo-del';
      del.textContent = '×';
      del.title = '삭제';
      del.addEventListener('click', () => this.remove(item.id));

      li.append(circle, text, del);

      // 드래그로 순서 변경
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
        e.preventDefault();
        const rect = li.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        this.move(this.dragId, item.id, before);
      });

      ul.appendChild(li);
    }
  },

  // dragId 항목을 targetId 항목의 앞(before=true) 또는 뒤로 이동
  move(dragId, targetId, before) {
    const from = this.items.findIndex((t) => t.id === dragId);
    if (from < 0 || dragId === targetId) return;
    const [moved] = this.items.splice(from, 1);
    let to = this.items.findIndex((t) => t.id === targetId);
    if (to < 0) to = this.items.length;
    else if (!before) to += 1;
    this.items.splice(to, 0, moved);
    this.save();
    this.render();
  },

  // 인라인 수정: 텍스트를 input으로 바꿔치기, Enter/포커스 이탈로 저장, Esc로 취소
  startEdit(item, textEl, li) {
    li.draggable = false; // 수정 중 글자 선택이 드래그로 먹히지 않게
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
      this.render(); // 빈 값이나 취소면 원래 텍스트로 복귀
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  },

  add(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.items.push({ id: String(Date.now()), text: trimmed, done: false });
    this.save();
    this.render();
  },

  toggle(id) {
    const item = this.items.find((t) => t.id === id);
    if (!item) return;
    item.done = !item.done;
    this.save();
    this.render();
    // 자동 삭제 설정 시: 취소선 애니메이션을 볼 시간을 주고 삭제 (그 사이 체크 해제하면 취소)
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
    const input = document.getElementById('todo-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.add(input.value);
        input.value = '';
        input.focus(); // 연속 입력
      }
    });
    // 반투명 줄 어디를 클릭해도 입력 시작
    const ghost = document.getElementById('todo-ghost');
    ghost.addEventListener('click', () => input.focus());
    // 반투명 줄에 떨어뜨리면 맨 끝으로 이동
    ghost.addEventListener('dragover', (e) => {
      if (!this.dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    ghost.addEventListener('drop', (e) => {
      if (!this.dragId) return;
      e.preventDefault();
      const from = this.items.findIndex((t) => t.id === this.dragId);
      if (from < 0) return;
      const [moved] = this.items.splice(from, 1);
      this.items.push(moved);
      this.save();
      this.render();
    });
  },
};
