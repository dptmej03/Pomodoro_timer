// 할일 노트 — 변경 즉시 저장, 완료 동작은 설정(completedBehavior)에 따름
const Todos = {
  items: [],

  async load() {
    const data = await window.api.loadData('todos');
    this.items = Array.isArray(data.todos) ? data.todos : [];
    this.render();
  },

  save() {
    window.api.saveData('todos', { todos: this.items });
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

      const circle = document.createElement('span');
      circle.className = 'circle';
      circle.addEventListener('click', () => this.toggle(item.id));

      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = item.text;

      const del = document.createElement('button');
      del.className = 'todo-del';
      del.textContent = '×';
      del.title = '삭제';
      del.addEventListener('click', () => this.remove(item.id));

      li.append(circle, text, del);
      ul.appendChild(li);
    }
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
    document.getElementById('todo-ghost').addEventListener('click', () => input.focus());
  },
};
