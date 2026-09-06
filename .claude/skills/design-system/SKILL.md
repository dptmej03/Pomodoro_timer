---
name: design-system
description: 뽀모도로 위젯의 디자인 시스템 — 테마 색상, 노트(공책) 스타일, 원형 타이머 SVG 부채꼴 공식, 빨간 깜빡임 애니메이션. UI(HTML/CSS/렌더러 JS)를 만들거나 수정하기 전에 반드시 읽을 것.
---

# 디자인 시스템

이 위젯의 모든 UI 작업은 아래 스펙을 따른다. 벗어나는 변경은 사용자에게 먼저 확인.

## 크기와 창

- 기본 크기 **280×380px**. 높이는 380px 고정, **너비만 280(최소)~560px에서 조절 가능**. 미니 사이즈 유지가 최우선 원칙 — 요소를 추가할 때 창을 키우지 말고 레이아웃을 줄일 것.
- **가로 리사이즈**: 투명 frameless 창은 OS 가장자리 리사이즈가 불안정 → 양쪽에 `position: fixed` 5px 투명 핸들(`.resize-handle`, `cursor: ew-resize`, `no-drag`)을 두고 pointer 드래그 → IPC(`resize-start/move/end`) → main의 `setBounds`. 왼쪽 핸들은 오른쪽 가장자리 고정(x 보정). `html, body`는 고정 px가 아니라 `width/height: 100%`.
- 모서리 둥글게(`border-radius: 12px`) + `transparent: true` 창으로 위젯 느낌을 낸다.

## 상단바 (브라우저 스타일 탭)

- 높이 36px, 배경 `var(--paper-line)`, 바 전체가 드래그 영역(`-webkit-app-region: drag`), 안의 탭·최소화 버튼은 `no-drag`.
- 구성: 🍅 로고 → 탭 4개 → (오른쪽 끝) 최소화(─)·닫기(✕) 버튼. 닫기 버튼 호버는 빨간 배경 + 흰 글자.
- 탭은 브라우저 탭처럼 **바 하단에 붙어** 위쪽만 둥근 모양(**44×27px**, `border-radius: 9px 9px 0 0`), 활성 탭은 높이 30px로 살짝 크고 원색, 비활성 탭은 `opacity 0.55 + saturate(0.6)`.
  - 폭 44px은 280px 최소 너비에서 역산한 값이다: `280 − padding 10 − 로고 약 18 − gap 3×6 − 창버튼 48 = 176`, 즉 탭당 44px. 바에는 로고·최소화·닫기·gap도 함께 들어가므로 **탭 폭만 계산하면 넘친다.**
  - `.tab`은 `flex: 0 0 44px`로 **축소를 막는다**(shrink되면 라벨이 잘림). **탭을 더 늘리려면 창을 키우지 말고 이 폭을 더 줄일 것.**
- 탭별 고정 파스텔색(테마 무관): 타이머 `#E9B7B7` / 할 일 `#B7CDE9` / 메모 `#C9E4C5` / 설정 `#CCC3E6`.

## 테마 (CSS 변수)

`:root`가 아니라 `body[data-theme="..."]`에 변수 세트를 두고 settings.js가 `data-theme` 속성만 바꾼다.

테마는 7종. 변수: `--bg`(배경) / `--paper-line`(공책 가로줄·테두리) / `--text` / `--text-faded` / `--accent`(타이머 부채꼴·강조) / `--margin-line`(노트 왼쪽 세로선).

| 테마 | --bg | --paper-line | --text | --text-faded | --accent | --margin-line |
|---|---|---|---|---|---|---|
| cream (기본) | `#FBF6EC` | `#E6DCC8` | `#3E3A33` | `#B8B0A0` | `#E5484D` | `#E8A0A0` |
| white | `#FFFFFF` | `#EAEAEA` | `#333333` | `#BBBBBB` | `#E5484D` | `#F0B5B5` |
| gray | `#EDEDEF` | `#D8D8DC` | `#38383C` | `#A2A2A8` | `#E5484D` | `#C48A8A` |
| blue | `#E3EBF4` | `#C9D8E8` | `#2E3D4D` | `#93A8BD` | `#E5484D` | `#9DB8D4` |
| purple | `#E9E4F4` | `#D5CCEA` | `#3C3552` | `#A79BC6` | `#E5484D` | `#B7A8D6` |
| pink | `#FFF0F3` | `#F5D5DD` | `#4A3A40` | `#C9A8B2` | `#E5698A` | `#E5698A` |
| dark | `#2B2B31` | `#3C3C45` | `#EDEDED` | `#6E6E78` | `#FF6B6B` | `#7A5560` |

## 타이머 페이지

- SVG `viewBox="0 0 200 200"`, 중심 `(100,100)`, 다이얼 반지름 `r=80`.
- 눈금 숫자 `0, 15, 30, 45`를 12시·3시·6시·9시 위치에 배치(시계방향). 5분 간격 짧은 눈금선.
- **부채꼴(남은 시간)**: 60분 = 360° 고정 스케일. 12시(0°)에서 시작해 시계방향으로 `남은분 × 6°`만큼 채운다. 시간이 흐르면 끝각이 12시 쪽으로 줄어든다.

```js
// 남은 시간 부채꼴 path (12시 기준 시계방향 sweep)
function sectorPath(cx, cy, r, minutesLeft) {
  const angle = Math.min(minutesLeft * 6, 359.999); // 도 단위
  const rad = (angle - 90) * Math.PI / 180;          // SVG 좌표계 보정(-90° = 12시)
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);
  const largeArc = angle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y} Z`;
}
```
- 부채꼴 `fill: var(--accent)`, `opacity: 0.85`. 갱신은 250ms 간격이면 충분(부드럽게 줄어드는 느낌).
- 중앙 `MM:SS` 텍스트는 부채꼴 위에 오도록 SVG 마지막에 두고, 흰 배경 원(반지름 ~34)을 깔아 가독성 확보.
- 프리셋 버튼 5개는 알약 모양, 선택된 버튼만 `--accent` 배경. 버튼은 HTML에 하드코딩하지 않고 **`Timer.renderPresets()`가 `Settings.data.presets`(기본 5/15/30/45/50분)로 그린다** — 설정에서 값이 바뀌면 다시 호출.
- **다이얼 드래그로 시간 설정**: 다이얼 위 pointerdown/move 시 중심 기준 각도 → `Math.atan2(dx, -dy)`로 12시 기준 시계방향 각도를 구해 1분 단위 스냅, 드래그 중 부채꼴·시간 실시간 미리보기, pointerup에 타이머 시작(1분 미만이면 초기화). `#dial`에 `touch-action: none` 필수. **타이머 진행/일시정지 중(running)에는 드래그 잠금.**
- **중앙 일시정지/재개 버튼**: 다이얼을 `#dial-wrap`(position: relative)으로 감싸고 중앙에 62px 원형 버튼 오버레이. 실행 중에는 다이얼 호버 시에만 ⏸ 표시 — 막대 두 개는 각각 7×22px, `border-radius 3.5px`, 사이 간격 6px(::before/::after로 그림, 붙어 보이면 안 됨). 일시정지 중에는 ▶(CSS 삼각형) 상시 표시. 하단 컨트롤은 초기화 버튼 하나만.

## 타이머 종료 깜빡임

창 전체(`body`)에 클래스를 토글:
```css
body.alarm { animation: flash 0.6s ease-in-out infinite alternate; }
@keyframes flash {
  from { background: var(--bg); }
  to   { background: var(--accent); }
}
```
- 내부 요소가 배경을 가리지 않도록 페이지 컨테이너는 투명 배경 유지.
- 깜빡임은 사용자가 창을 클릭하거나 아무 버튼이나 누르면 해제. 동시에 `window.api.flashFrame(false)`.

## 할일 페이지 (노트 형식)

- 배경에 공책 가로줄: `repeating-linear-gradient(transparent 0 27px, var(--paper-line) 27px 28px)` — 항목 행 높이 28px과 정확히 일치시켜 글씨가 줄 위에 앉게 한다.
- 왼쪽에서 28px 위치에 세로 마진 라인 1px `var(--margin-line)`.
- 체크박스는 `<input type="checkbox">`를 숨기고 지름 16px 동그라미(`border: 1.5px solid var(--text-faded)`, `border-radius: 50%`)로 커스텀. 체크 시 `--accent` 배경 + 흰 체크 표시(✓).
- 완료 항목: `text-decoration: line-through; color: var(--text-faded);` — 취소선이 "찌익 긋는" 느낌이 나도록 가능하면 width 트랜지션 적용.
- **반투명 추가줄**: 목록 맨 아래 항상 존재. 빈 동그라미(점선 테두리, opacity 0.4) + `contenteditable` 또는 투명 input, placeholder "할 일 추가...", `opacity: 0.45`. 포커스되면 opacity 1. Enter로 확정, 빈 값이면 무시. 확정 후에도 포커스를 유지해 연속 입력 가능하게.
- **드래그 순서 변경**: `li.draggable = true` + HTML5 drag 이벤트. 드래그 중인 항목은 `opacity 0.35`, 삽입 위치는 행 위/아래 `box-shadow: inset 0 ±2px 0 var(--accent)` 선으로 표시. 행 중간점 기준으로 위/아래 판정, 반투명 추가줄에 드롭하면 맨 끝으로. 항목 커서는 `grab`, 텍스트는 `text`.
- **인라인 수정**: `.todo-text` 클릭 → 같은 자리의 `.todo-edit` input으로 교체(font/13px/28px 행 높이 동일, 배경 투명, `border-bottom: 1px dashed var(--text-faded)`로만 편집 중임을 표시). Enter/blur 저장, Esc 취소, 빈 값이면 원래 텍스트 유지. 편집 중에는 해당 `li`의 `draggable`을 꺼서 글자 선택이 드래그로 먹히지 않게.
- **태그 그룹**(`Settings.data.tagsEnabled`): 목록을 태그별 `.tag-section`으로 나눠 한 화면에 쭉 쌓는다. 섹션 = `.tag-header`(라벨 텍스트 + `::after`로 오른쪽에 `var(--accent)` 구분선을 flex로 쭉 긋기, 색은 accent·opacity 0.5) + `.todo-list` + 그룹 전용 `.todo-ghost`. `#note`가 `<ul>` 하나가 아니라 섹션들을 담으므로 렌더는 todo.js가 `#note`를 통째로 그린다. 태그 OFF면 단일 목록 + 추가줄 하나(예전 구조). 태그는 `{id, name}` 배열이고 **항목의 `tag`는 태그 id**(순서·이름이 바뀌어도 연결 유지). 섹션 순서 = `Settings.data.tags` 배열 순서. 무태그·삭제된 태그를 단 항목은 "기타" 섹션으로.
- **설정 태그 관리**(`#tag-list`, `Settings.renderTagList()`): 태그마다 `.tag-row`(`[.tag-handle ≡][.tag-name-input][.tag-del ×]`) + 맨 아래 `.tag-add`("+ 태그 추가"). 행을 드래그해 순서 변경(`.dragging`/`.drop-above`/`.drop-below`), 이름칸에서 시작한 드래그는 `pointerdown`에서 `row.draggable=false`로 막아 텍스트 선택이 되게. 삭제하면 그 태그의 할일은 `Todos.untag(id)`로 무태그. 토글 꺼지면 입력/버튼 `disabled` 회색.
- **중요도 네모칸**(`Settings.data.priorityEnabled`): 동그라미와 텍스트 사이에 `.prio-box`(12px, `border-radius: 3px`, `margin-right: -2px`로 텍스트에 붙임). 보통=빈 네모(`var(--text-faded)` 테두리), 중간=`.prio-1` 노랑 `#F5B301`, 높음=`.prio-2` `var(--accent)`. 클릭하면 보통→중간→높음 순환. 자동 정렬(`prioritySort`)은 그룹 안에서 높은 중요도 먼저 표시하며, 이때 드래그는 같은 중요도끼리만(`canDropOn`).
- 설정에서 상위 토글이 꺼졌을 때 하위 토글 행은 `.toggle.disabled`(opacity 0.4 + pointer-events 없음)로 회색 처리. 태그 이름 입력칸은 `disabled` 속성으로 회색.

## 메모 페이지 (공책 + 칩 목록)

- 구조: `#memo-chips`(고정 높이 칩 줄) + `#memo-paper`(스크롤 컨테이너) > `#memo-text`(textarea).
- **칩 줄**: `border-bottom: 1px var(--paper-line)`로 종이와 구분. 칩은 알약형(`border-radius: 999px`, 11px, `max-width: 84px` + ellipsis), 비활성은 `--paper-line` 테두리 + `--text-faded` 글자, 활성은 `--accent` 테두리·글자 + `font-weight: 600`. 활성 칩 **뒤에만** 18px 원형 삭제 ✕(호버 시 `--accent` 배경 + 흰 글자). 줄 오른쪽 끝(`margin-left: auto`)에 20px 원형 점선 `+` 추가 버튼. 칩이 많으면 가로 스크롤(스크롤바는 숨김).
- **종이**: 할일 `#note`와 같은 27/28px 가로줄 + 28px 마진선, `padding: 0 10px 0 36px`.
- **가로줄은 반드시 `#memo-text`(textarea)에 그린다.** 스크롤 컨테이너(`#memo-paper`)에 그리면 `background-attachment: scroll` 기본값 때문에 배경이 요소에 고정돼 **콘텐츠만 움직이고 줄무늬는 제자리에 남아 글자가 줄에서 뜬다.** 세로 마진선은 가로 위치가 고정이라 `#memo-paper`에 두어도 안전.
- **28px 정렬이 핵심**: textarea는 `line-height: 28px`, `padding: 0`, `border: none`, `overflow: hidden`, `resize: none`. 스크롤은 `#memo-paper`가 담당하고, memo.js의 `autoGrow()`가 `height = max(scrollHeight, 화면 높이를 28px 배수로 올림)`으로 늘려 준다.
- `autoGrow()`는 **뷰가 숨겨져 있으면(`display:none`) `scrollHeight`가 0**이라 높이가 무너진다. `if (!ta.offsetParent) return` 가드를 두고, 메모 탭으로 전환하는 시점에 app.js가 다시 호출한다.
- 제목은 본문 첫 줄에서 파생(8자 초과 시 `…`, 빈 값은 "새 메모"). 타이핑 중에는 전체 render를 돌리지 말고 **해당 칩의 textContent만** 갱신한다(커서가 튐).
- 저장은 입력 중 400ms 디바운스 + 메모 전환·탭 이동·blur·`beforeunload`에 `flush()`로 즉시 기록.
- 메모는 항상 최소 1장 유지 — 마지막 한 장의 ✕는 삭제 대신 내용 비우기.

## 설정 페이지

- 섹션 6개: 테마(7개 색 견본 원으로 선택) / **타이머 프리셋(분)** — 숫자 입력 5칸(`.preset-input` 40px, 스핀 버튼 숨김, 테두리 `--paper-line`→포커스 시 `--accent`), 1~60 범위 밖·비숫자는 원래 값으로 복원 / **할 일 태그**(사용 토글 + 이름 입력 3칸 `.tag-name-input`, 토글 꺼지면 `disabled`) / **중요도**(표시 토글 + 자동 정렬 토글, 표시 꺼지면 자동 정렬 행 `.toggle.disabled`) / 완료 항목 동작(라디오 2개: "밑으로 이동" / "제자리에 줄 긋기" + "자동 삭제" 토글) / 종료음(토글 스위치).
- 세션 수 설정은 **넣지 않는다** (사용자가 명시적으로 제외).


## 공통

- 폰트: `'Segoe UI', 'Malgun Gothic', sans-serif`. 할일 텍스트는 손글씨 느낌을 원하면 `'Gaegu'` 등 로컬 폰트가 있을 때만 fallback으로.
- 모든 UI 텍스트는 한국어.
- 스크롤바는 얇게(6px) 커스텀 — 미니 창에서 기본 스크롤바는 너무 크다.
