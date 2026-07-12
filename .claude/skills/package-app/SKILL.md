---
name: package-app
description: 뽀모도로 위젯을 Windows용 실행 파일(portable .exe)로 빌드하고 부팅 시 자동 실행을 등록하는 방법. 사용자가 "exe로 만들어줘", "배포", "설치 파일", "자동 실행" 등을 요청할 때 사용.
---

# 앱 패키징 (Windows)

## electron-builder 설정

`package.json`에 다음이 있어야 한다:

```jsonc
{
  "scripts": { "dist": "electron-builder --win portable" },
  "devDependencies": { "electron": "...", "electron-builder": "..." },
  "build": {
    "appId": "com.esthr.pomodoro-widget",
    "productName": "PomodoroWidget",
    "win": { "target": "portable", "icon": "build/icon.ico" },
    "files": ["main.js", "preload.js", "renderer/**/*"]
  }
}
```

- 아이콘(`build/icon.ico`)이 없으면 `win.icon` 줄을 빼고 빌드한다(기본 Electron 아이콘 사용). ico는 256×256 포함 멀티사이즈여야 함.
- portable 타겟은 설치 과정 없이 exe 하나로 실행되므로 개인용 위젯에 가장 적합.

## 빌드

```powershell
npm run dist
```

- 결과물: `dist/PomodoroWidget <버전>.exe`
- 첫 빌드는 Electron 바이너리를 내려받아 오래 걸릴 수 있다(수 분).
- **관리자 권한/코드 서명 없음** → 실행 시 SmartScreen 경고가 뜰 수 있음. 개인 사용이므로 "추가 정보 → 실행"으로 통과하면 된다고 사용자에게 안내.
- 빌드 실패 시 흔한 원인: `dist/` 폴더가 잠겨 있음(이전 exe 실행 중) → exe 종료 후 재시도.
- **`Cannot create symbolic link` (winCodeSign 압축 해제 실패)**: Windows에서 관리자/개발자 모드가 아니면 symlink를 못 만들어 나는 오류. 실패하는 건 macOS용 dylib 2개뿐이라 무시하고 수동으로 캐시에 풀면 해결:
  ```powershell
  $cache = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
  Invoke-WebRequest "https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z" -OutFile "$env:TEMP\winCodeSign.7z"
  & "node_modules\7zip-bin\win\x64\7za.exe" x -y "$env:TEMP\winCodeSign.7z" "-o$cache\winCodeSign-2.6.0"
  # exit code 2가 나와도 rcedit-x64.exe가 풀렸으면 OK → npm run dist 재시도
  ```

## 부팅 시 자동 실행 (선택)

설치형이 아니므로 코드에서 등록하는 방식을 쓴다. `main.js`:

```js
app.setLoginItemSettings({ openAtLogin: true, path: process.execPath });
```

- 개발 모드(`npm start`)에서는 등록하지 말 것 — `process.execPath`가 electron.exe를 가리켜 엉뚱한 게 등록된다. `app.isPackaged`로 감싼다.
- 또는 사용자가 직접: `Win+R` → `shell:startup` → 폴더에 exe 바로가기 넣기 (가장 단순, 이 방법을 우선 안내).

## 배포 후 데이터 위치

portable exe도 데이터는 `%APPDATA%\PomodoroWidget\`(userData)에 저장되므로, exe 파일을 옮겨도 할일/설정은 유지된다.
