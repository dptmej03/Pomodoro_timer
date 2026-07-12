---
name: run-app
description: 뽀모도로 위젯 앱을 개발 모드로 실행하고 변경 사항을 확인하는 방법. 앱을 실행/재시작하거나 동작을 확인해야 할 때 사용.
---

# 앱 실행하기

## 기본 실행

```powershell
npm install   # 최초 1회 또는 package.json 변경 시
npm start     # Electron 앱 실행
```

- `npm start`는 창이 떠 있는 동안 터미널을 점유하므로 **백그라운드로 실행**하고, 확인이 끝나면 프로세스를 종료한다.
- 코드 수정 후에는 앱을 껐다가 다시 `npm start` (핫리로드 없음). 렌더러(HTML/CSS/JS)만 바꿨다면 실행 중인 창에서 `Ctrl+R` 새로고침으로도 반영된다.

## DevTools

개발 중 렌더러 디버깅이 필요하면 `main.js`에서 임시로:
```js
win.webContents.openDevTools({ mode: 'detach' }); // 미니 창이라 반드시 detach 모드
```
확인 후 반드시 제거한다.

## Windows에서 흔한 문제

- **`TypeError: Cannot read properties of undefined (reading 'getPath')`**: Claude Code/VSCode 환경은 `ELECTRON_RUN_AS_NODE=1`이 설정되어 있어 Electron이 일반 Node로 실행된다. 실행 전에 반드시 제거할 것:
  ```powershell
  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue; npm start
  ```

- **electron 설치 실패/느림**: 회사망·프록시 환경이면 `npm config set registry https://registry.npmjs.org/` 확인. 설치가 꼬였으면 `Remove-Item -Recurse -Force node_modules; npm install`.
- **경로에 공백** (`UNI Esthr`): 명령 실행 시 경로를 항상 큰따옴표로 감싼다.
- **창이 안 보임**: always-on-top 미니 창이라 작업표시줄 아이콘이 없을 수 있음(`skipTaskbar` 설정 시). 화면 구석과 다른 모니터를 확인.
- **이전 프로세스가 살아있음**: `Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force` 후 재실행.

## 변경 확인 절차

1. 앱을 실행해 미니 창이 뜨는지 확인
2. 수정한 기능을 실제로 조작해본다 (버튼 클릭, 할일 입력 등)
3. 타이머 종료 동작을 확인할 때는 `timer.js`의 프리셋에 임시로 짧은 값(예: 0.1분 = 6초)을 추가해 테스트하고, 확인 후 제거
4. 영속성 확인: 앱을 완전히 종료 → 재실행 → 할일/설정 유지 확인. 저장 파일은 `%APPDATA%\PomodoroWidget\`에 있다 (todos.json, settings.json)
