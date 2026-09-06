// 메모장 — 메모 여러 개를 칩으로 전환하며 쓰고, 내용은 memos.json에 저장.
// 제목은 따로 두지 않고 본문 첫 줄에서 만든다(빈 메모는 "새 메모").
// 타이핑마다 파일을 쓰면 main의 동기 writeFileSync를 계속 때리므로 짧게 디바운스하고,
// 메모 전환·탭 이동·포커스 이탈·창 닫기 직전에는 flush()로 즉시 저장한다.
const Memos = {
  items: [],
  activeId: null,
  saveTimer: null,

  async load() {
    const data = await window.api.loadData('memos');
    this.items = Array.isArray(data.memos) ? data.memos : [];
    // 빈 화면을 따로 만들지 않도록 항상 최소 한 장은 유지
    if (!this.items.length) this.items.push(this.blank());
    this.activeId = this.items[0].id;
    this.render();
  },

  // Date.now()만 쓰면 연달아 만들 때 겹칠 수 있어 무작위 꼬리를 붙인다
  blank() {
    return { id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6), text: '' };
  },

  // sync=true면 동기 IPC로 저장한다. 창이 닫히는 중(beforeunload)에는
  // 비동기 invoke가 main에 닿기 전에 렌더러가 죽을 수 있기 때문.
  save(sync) {
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    const payload = { memos: this.items };
    if (sync) window.api.saveDataSync('memos', payload);
    else window.api.saveData('memos', payload);
  },

  saveSoon() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 400);
  },

  // 대기 중인 저장이 있으면 지금 바로 기록
  flush(sync) {
    if (this.saveTimer) this.save(sync);
  },

  active() {
    return this.items.find((m) => m.id === this.activeId) || this.items[0];
  },

  title(memo) {
    const first = (memo.text.split('\n')[0] || '').trim();
    if (!first) return '새 메모';
    return first.length > 8 ? first.slice(0, 8) + '…' : first;
  },

  // 칩 줄: 메모마다 칩 하나, 활성 메모 뒤에만 삭제 ×, 오른쪽 끝에 + 버튼
  renderChips() {
    const bar = document.getElementById('memo-chips');
    bar.innerHTML = '';
    for (const memo of this.items) {
      const chip = document.createElement('button');
      chip.className = 'memo-chip' + (memo.id === this.activeId ? ' active' : '');
      chip.textContent = this.title(memo);
      chip.title = this.title(memo);
      chip.dataset.memoId = memo.id;
      chip.addEventListener('click', () => this.select(memo.id));
      bar.appendChild(chip);

      if (memo.id === this.activeId) {
        const del = document.createElement('button');
        del.className = 'memo-del';
        del.textContent = '✕';
        del.title = '메모 삭제';
        del.addEventListener('click', () => this.remove(memo.id));
        bar.appendChild(del);
      }
    }
    const add = document.createElement('button');
    add.className = 'memo-add';
    add.textContent = '+';
    add.title = '메모 추가';
    add.addEventListener('click', () => this.add());
    bar.appendChild(add);
  },

  // textarea가 내용만큼 자라야 줄무늬(textarea 배경)가 글자를 따라 이어진다.
  // 내용이 짧아도 종이가 비어 보이지 않게 최소한 보이는 영역만큼은 채운다.
  // 뷰가 숨겨져 있으면(display:none) scrollHeight가 0이라 계산이 무의미하므로 건너뛴다.
  autoGrow() {
    const ta = document.getElementById('memo-text');
    const paper = document.getElementById('memo-paper');
    if (!ta.offsetParent) return; // 메모 탭이 보이지 않는 상태
    ta.style.height = 'auto';
    // 28px(줄 높이) 배수로 올려 마지막 줄이 줄무늬와 어긋나지 않게
    const fill = Math.ceil(paper.clientHeight / 28) * 28;
    ta.style.height = Math.max(ta.scrollHeight, fill) + 'px';
  },

  render() {
    this.renderChips();
    const ta = document.getElementById('memo-text');
    ta.value = this.active().text;
    this.autoGrow();
  },

  select(id) {
    if (id === this.activeId) return;
    this.flush();
    this.activeId = id;
    this.render();
    document.getElementById('memo-paper').scrollTop = 0;
  },

  add() {
    this.flush();
    const memo = this.blank();
    this.items.push(memo);
    this.activeId = memo.id;
    this.save();
    this.render();
    document.getElementById('memo-text').focus();
  },

  // 마지막 한 장은 지우는 대신 비워서 항상 메모가 하나는 남게 한다
  remove(id) {
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    if (this.items.length === 1) {
      this.items[0].text = '';
    } else {
      const idx = this.items.findIndex((m) => m.id === id);
      this.items.splice(idx, 1);
      this.activeId = this.items[Math.max(0, idx - 1)].id;
    }
    this.save();
    this.render();
  },

  init() {
    const ta = document.getElementById('memo-text');

    ta.addEventListener('input', () => {
      const memo = this.active();
      memo.text = ta.value;
      this.autoGrow();
      // 전체를 다시 그리면 커서가 튀므로 해당 칩 라벨만 갱신
      const chip = document.querySelector(`.memo-chip[data-memo-id="${memo.id}"]`);
      if (chip) {
        chip.textContent = this.title(memo);
        chip.title = chip.textContent;
      }
      this.saveSoon();
    });

    ta.addEventListener('blur', () => this.flush());
    // 종이 여백을 클릭해도 바로 쓸 수 있게
    document.getElementById('memo-paper').addEventListener('click', (e) => {
      if (e.target.id === 'memo-paper') ta.focus();
    });
    // Alt+F4·작업표시줄 닫기·OS 종료 등 버튼을 거치지 않는 경로까지 커버.
    // 이 시점엔 비동기 저장이 유실될 수 있으므로 동기로 기록한다.
    window.addEventListener('beforeunload', () => this.flush(true));
  },
};
