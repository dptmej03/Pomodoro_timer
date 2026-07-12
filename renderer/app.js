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

(async () => {
  await Settings.load();
  Settings.init();
  Timer.init();
  Todos.init();
  await Todos.load();
})();
