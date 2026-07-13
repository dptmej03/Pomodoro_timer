// 초기화: 탭 전환, 최소화, 알람 해제
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`view-${tab.dataset.view}`).classList.add('active');
  });
});

document.getElementById('btn-minimize').addEventListener('click', () => window.api.minimize());
document.getElementById('btn-close').addEventListener('click', () => window.api.close());

// 알람(빨간 깜빡임)은 아무 곳이나 클릭하거나 키를 누르면 해제
window.addEventListener('click', () => Timer.stopAlarm(), true);
window.addEventListener('keydown', () => Timer.stopAlarm(), true);

// 창 가로 크기 조절: 가장자리 핸들을 잡고 드래그 → main 프로세스가 setBounds로 처리
document.querySelectorAll('.resize-handle').forEach((handle) => {
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    window.api.resizeStart();
    const startX = e.screenX; // 창이 움직여도 어긋나지 않도록 화면 절대좌표 사용
    const side = handle.dataset.side;
    const onMove = (ev) => window.api.resizeMove(side, ev.screenX - startX);
    let ended = false;
    const onUp = () => {
      if (ended) return;
      ended = true;
      handle.removeEventListener('pointermove', onMove);
      window.api.resizeEnd(); // pointercancel(시스템 취소)에도 너비가 저장되도록
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp, { once: true });
    handle.addEventListener('pointercancel', onUp, { once: true });
  });
});

(async () => {
  await Settings.load();
  Settings.init();
  Timer.init();
  Todos.init();
  await Todos.load();
})();
