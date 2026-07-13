# 미니 뽀모도로 타이머 + 할일 노트 위젯

항상 화면 맨 위에 떠 있는 미니 사이즈(약 280×380px) 데스크톱 위젯. 뽀모도로 타이머와 노트 형식의 할일 목록을 하나의 작은 창에서 제공한다. **UI 언어는 한국어.**

## 왜 Electron인가

- "다른 창을 클릭해도 타이머가 항상 보여야 한다"는 핵심 요구사항은 OS 수준의 always-on-top 창 속성이 필요하다. 웹 브라우저로는 불가능.
- 프레임 없는(frameless) 미니 창을 드래그로 자유롭게 옮기는 것도 데스크톱 앱에서만 가능.
- 프레임워크(React 등)는 쓰지 않는다. 순수 HTML/CSS/JS로 충분한 규모.

## 기능 명세 (확정 스펙 — 임의로 바꾸지 말 것)

1. **타이머 페이지 (첫 화면)**
   - 원형 다이얼, 시계방향으로 0 / 15 / 30 / 45 눈금 표시
   - 남은 시간이 원 안의 **빨간 부채꼴**로 표시되고, 시간이 흐르면 부채꼴이 시계방향으로 줄어든다
   - 중앙에 남은 시간 숫자(MM:SS) 표시
   - 다이얼 아래에 프리셋 버튼 5개 — 기본값 **5분 / 15분 / 30분 / 45분 / 50분**, 각 값은 설정 페이지에서 1~60분으로 변경 가능
   - **다이얼을 드래그해서도 시간 설정 가능** (드래그 중 부채꼴 미리보기, 놓으면 바로 시작, 1분 단위 스냅). 단, **타이머 진행/일시정지 중에는 드래그 잠금**
   - **일시정지/재개는 시계 중앙에서**: 실행 중 중앙에 커서를 올리면 ⏸ 버튼이 나타나고, 일시정지 중에는 ▶ 버튼이 상시 표시됨. 하단에는 초기화 버튼만 둔다
   - 타이머 종료 시: **창 전체가 빨간색으로 깜빡이는 애니메이션** + 작업표시줄 flashFrame + (설정이 켜져 있으면) 알림음
2. **할일 페이지 (두번째 화면)** — 공책(노트) 형식 디자인
   - 각 항목 왼쪽에 **동그라미 체크박스**, 오른쪽에 할일 텍스트
   - 추가 버튼 없음: 목록 맨 아래에 항상 **반투명 placeholder 줄**이 있고, 클릭해서 타이핑 후 Enter로 추가
   - **드래그로 순서 변경**: 항목을 잡고 끌면 빨간 삽입선 표시, 놓은 위치로 이동 (반투명 줄에 놓으면 맨 끝으로)
   - **인라인 수정**: 할일 텍스트를 클릭하면 그 자리에서 바로 편집. Enter/포커스 이탈로 저장, Esc로 취소, 빈 값이면 원래 텍스트 유지
3. **완료 처리**: 체크하면 동그라미에 체크 표시 + 텍스트에 취소선 + 연한 색. 설정에 따라 목록 맨 아래로 이동하거나 제자리 유지
4. **영속성**: 할일과 설정은 로컬 JSON 파일에 저장. 컴퓨터를 껐다 켜도 유지
5. **설정 페이지**: ① 테마(디자인) 선택 — 크림/화이트/그레이/블루/퍼플/핑크/다크 7종 ② **타이머 프리셋 편집** — 프리셋 5칸의 분 값을 숫자 입력으로 변경(1~60분, 유효하지 않은 입력은 원래 값 복원) ③ 완료 항목 동작(밑으로 이동 vs 제자리 취소선) + **완료 시 자동 삭제 토글**(켜면 체크 1.5초 뒤 삭제, 그 사이 체크 해제하면 취소) ④ 종료음 켜기/끄기 — 이것들만. 세션 수 설정은 넣지 않는다(사용자가 명시적으로 제외함)
6. **Always on top**: 어떤 창을 클릭해도 위젯이 항상 위에 표시 (`alwaysOnTop: true`)
7. **이동/최소화/닫기**: 프레임 없는 창을 드래그로 이동 (`-webkit-app-region: drag`), 오른쪽 위에 최소화(─)·닫기(✕) 버튼 제공
8. **창 가로 크기 조절**: 양쪽 가장자리(5px 핸들)를 드래그해 너비 조절. **280px이 기본이자 최소**(더 작아지지 않음), 최대 560px, 높이는 380px 고정. 투명 frameless 창은 OS 리사이즈가 불안정하므로 렌더러 핸들 → IPC(`resize-start/move/end`) → `setBounds`로 처리. 조절된 너비는 `settings.json`의 `windowWidth`에 저장돼 재시작 후에도 유지

## 파일 구조

```
pomodoro_timer/
├── CLAUDE.md
├── package.json          # electron, electron-builder / npm start, npm run dist
├── main.js               # BrowserWindow 생성(frameless, alwaysOnTop), IPC 핸들러, JSON 저장/불러오기
├── preload.js            # contextBridge로 렌더러에 안전한 API 노출 (nodeIntegration 금지)
└── renderer/
    ├── index.html        # 상단바(브라우저처럼 탭 3개가 바 안에 붙음 + 최소화) + 타이머/할일/설정 뷰
    ├── styles.css        # 노트 디자인, 테마, 빨간 깜빡임 애니메이션
    ├── timer.js          # SVG 부채꼴 타이머 로직
    ├── todo.js           # 할일 CRUD, 반투명 추가줄, 완료 동작
    ├── settings.js       # 설정 UI와 저장
    └── app.js            # 초기화, 탭 전환, 최소화, 알람 해제
```

## 데이터 스키마

저장 위치: `app.getPath('userData')` = `%APPDATA%\PomodoroWidget\` (productName 기준). 외부 라이브러리 없이 `fs`로 읽고 쓴다. 렌더러는 preload가 노출한 `window.api.loadData()` / `window.api.saveData()`만 사용한다.

```jsonc
// todos.json
{ "todos": [ { "id": "1720000000000", "text": "과제 제출", "done": false } ] }

// settings.json
{
  "theme": "cream",              // "cream" | "white" | "gray" | "blue" | "purple" | "pink" | "dark"
  "completedBehavior": "moveDown", // "moveDown" | "strikeInPlace"
  "sound": true,
  "autoDelete": false,            // 완료 체크 1.5초 뒤 자동 삭제
  "windowWidth": 280,             // 창 너비 (280~560). main.js가 저장 시 실제 창 너비로 항상 덮어씀
  "presets": [5, 15, 30, 45, 50]  // 프리셋 버튼 5개의 분 값 (각 1~60). 손상 시 렌더러가 기본값으로 복원
}
```

## 아키텍처 규칙

- 타이머는 `setInterval` 카운트다운이 아니라 **종료 시각(endTime) 기준으로 매 tick마다 남은 시간을 계산**한다 (창이 백그라운드에서 스로틀돼도 시간이 어긋나지 않도록). `main.js`에서 `backgroundThrottling: false`도 함께 설정.
- 부채꼴은 SVG `<path>`로 그리고, 남은 비율에 따라 arc를 다시 계산한다. 다이얼은 60분 = 360°(1분 = 6°) 고정 스케일: 50분 타이머를 시작하면 부채꼴이 300°에서 0°로 줄어든다.
- 할일 저장은 변경(추가/체크/삭제)이 일어날 때마다 즉시 저장. 종료 시점 저장에 의존하지 않는다.
- `nodeIntegration: false`, `contextIsolation: true` 유지. 렌더러에서 `require` 금지.

## 명령어

```
npm install     # 최초 1회
npm start       # 개발 실행
npm run dist    # Windows portable exe 빌드 (electron-builder)
```

## 작업 규칙

- UI(HTML/CSS) 작업 전에는 `.claude/skills/design-system/SKILL.md`를 먼저 읽는다.
- UI를 변경한 뒤에는 `design-reviewer` 에이전트로 디자인 스펙 준수를 검토한다.
- 기능을 추가/수정한 뒤에는 `qa-checker` 에이전트로 7가지 요구사항 체크리스트를 점검한다.
- 스펙이 사용자 요청으로 바뀌면 이 파일의 "기능 명세" 섹션을 함께 갱신한다.
