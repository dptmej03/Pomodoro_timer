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
    const active = bar.querySelector('.memo-chip.active');
    if (active) active.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  },

  // textarea가 내용만큼 자라야 줄무늬(textarea 배경)가 글자를 따라 이어진다.
  // 내용이 짧아도 종이가 비어 보이지 않게 최소한 보이는 영역만큼은 채운다.
  // 뷰가 숨겨져 있으면(display:none) scrollHeight가 0이라 계산이 무의미하므로 건너뛴다.
  // 편집 영역은 contenteditable div라 내용만큼 저절로 자란다. 최소 높이만 보이는 영역(28px 배수)으로 맞춰
  // 짧은 메모에서도 줄무늬가 종이 끝까지 이어지게 한다.
  autoGrow() {
    const ta = document.getElementById('memo-text');
    const paper = document.getElementById('memo-paper');
    if (!ta.offsetParent) return; // 메모 탭이 보이지 않는 상태
    ta.style.minHeight = Math.ceil(paper.clientHeight / 28) * 28 + 'px';
  },

  // 본문의 http(s):// 주소를 <a>로 감싼다(이미 링크인 곳은 건너뜀). 바뀐 게 있으면 true.
  // 타이핑 중에 바꾸면 커서가 튀므로 포커스를 잃을 때·메모를 열 때만 호출한다.
  linkify(root) {
    const re = /https?:\/\/[^\s<>"']+/g;
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.parentElement.closest('a') && re.test(walker.currentNode.nodeValue)) nodes.push(walker.currentNode);
      re.lastIndex = 0;
    }
    for (const node of nodes) {
      const frag = document.createDocumentFragment();
      let last = 0;
      for (const m of node.nodeValue.matchAll(re)) {
        frag.append(node.nodeValue.slice(last, m.index));
        const a = document.createElement('a');
        a.href = m[0];
        a.textContent = m[0];
        frag.append(a);
        last = m.index + m[0].length;
      }
      frag.append(node.nodeValue.slice(last));
      node.replaceWith(frag);
    }
    return nodes.length > 0;
  },

  // html이 없는 예전 메모(텍스트만 저장)는 textContent로 넣어 태그가 해석되지 않게 한다
  render() {
    this.renderChips();
    const ta = document.getElementById('memo-text');
    const memo = this.active();
    if (memo.html) ta.innerHTML = memo.html;
    else ta.textContent = memo.text;
    this.linkify(ta);
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
      this.items[0].html = '';
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

    // 입력·서식 변경 공통: text(칩 제목용 순수 글자)와 html(서식 포함)을 함께 기록
    const onEdit = () => {
      const memo = this.active();
      // 다 지우면 남는 <br> 등을 치워야 :empty 플레이스홀더가 다시 보인다
      if (!ta.innerText.trim()) ta.innerHTML = '';
      memo.text = ta.innerText;
      memo.html = ta.innerHTML;
      // 전체를 다시 그리면 커서가 튀므로 해당 칩 라벨만 갱신
      const chip = document.querySelector(`.memo-chip[data-memo-id="${memo.id}"]`);
      if (chip) {
        chip.textContent = this.title(memo);
        chip.title = chip.textContent;
      }
      this.saveSoon();
    };
    ta.addEventListener('input', onEdit);

    // 붙여넣기는 서식 없는 글자로만 (외부 HTML이 섞여 들어오지 않게)
    ta.addEventListener('paste', (e) => {
      e.preventDefault();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });

    // 서식 툴바: mousedown을 막아 선택 영역·포커스를 유지한 채 명령 실행
    const fmt = document.getElementById('memo-fmt');
    fmt.addEventListener('mousedown', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      e.preventDefault();
      ta.focus();
      document.execCommand(btn.dataset.cmd);
      onEdit();
      syncFmt();
    });
    // 커서 위치의 서식에 맞춰 버튼 켜짐 표시
    const syncFmt = () => {
      fmt.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('on', document.activeElement === ta && document.queryCommandState(b.dataset.cmd));
      });
    };
    document.addEventListener('selectionchange', syncFmt);

    // 마우스 휠로도 칩 줄을 가로로 넘길 수 있게
    const bar = document.getElementById('memo-chips');
    bar.addEventListener('wheel', (e) => {
      bar.scrollLeft += e.deltaY;
      e.preventDefault();
    }, { passive: false });

    // 링크: 클릭하면 바로 기본 브라우저로 연다
    ta.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      window.api.openExternal(a.href);
    });
    ta.addEventListener('blur', () => {
      if (this.linkify(ta)) onEdit();
      this.flush();
    });
    // 종이 여백을 클릭해도 바로 쓸 수 있게
    document.getElementById('memo-paper').addEventListener('click', (e) => {
      if (e.target.id === 'memo-paper') ta.focus();
    });
    // Alt+F4·작업표시줄 닫기·OS 종료 등 버튼을 거치지 않는 경로까지 커버.
    // 이 시점엔 비동기 저장이 유실될 수 있으므로 동기로 기록한다.
    window.addEventListener('beforeunload', () => this.flush(true));
  },
};
