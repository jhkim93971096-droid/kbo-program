# ⚾ KBO MATCHDAY

[k-skill의 KBO 결과 가이드](https://github.com/NomaDamas/k-skill/blob/main/docs/features/kbo-results.md)를 기반으로 만든 **React + TypeScript + Vite** 웹 앱입니다. KBO 날짜별 경기 일정, 점수, 경기 상태, 팀 필터를 제공합니다.

## 실행하기 (Windows / macOS / Linux)

**Node.js 20 이상**을 설치하고 프로젝트 폴더에서 아래 순서대로 입력합니다.

```bash
npm install
npm run dev
```

- 브라우저 주소: **http://127.0.0.1:5173**
- API 서버: **http://127.0.0.1:8787**
- `Ctrl + C`: 종료
- 실제 경기 데이터는 인터넷 연결이 있어야 조회됩니다.

`npm install`은 `kbo-game@0.0.2`를 **프로젝트 의존성으로** 설치합니다. 원본 스킬은 전역 설치(`npm install -g kbo-game`)를 가정하지만, 앱은 프로젝트마다 버전을 고정하기 위해 로컬 설치를 사용합니다.

## Render에 배포하기

1. `package.json`, `package-lock.json`, `render.yaml`이 있는 이 폴더의 내용을 GitHub 저장소 루트에 올립니다. `node_modules`, `dist`, `.env`는 Git에서 제외됩니다.
2. Render 대시보드에서 **New → Blueprint**를 선택하고 저장소를 연결합니다.
3. `kbo-matchday` 웹 서비스의 생성을 적용합니다. 배포가 완료되면 서비스 화면에 표시되는 `onrender.com` 주소를 열어 확인합니다.

Blueprint는 Node.js 24와 무료 웹 서비스를 사용합니다. 빌드 단계에서 `npm ci --include=dev`와 `npm run build`를 실행하고, `npm start`로 화면과 API를 같은 주소에서 제공합니다. 서버는 Render가 제공하는 `PORT`에 연결하며 `/api/health`로 상태를 확인합니다.

무료 서비스는 일정 시간 동안 요청이 없으면 중지되어 다음 접속이 느릴 수 있습니다. 배포 후 달력에서 **2026년 4월 4일**을 선택하고 **한화–두산** 경기의 타자·투수 기록을 확인할 수 있습니다.

## 기능

1. 선택한 날짜의 모든 경기와 홈/원정팀, 경기장, 시작 시각 조회
2. 실시간/종료/예정/취소 상태 및 스코어 표시(패키지에서 응답한 정보 기준)
3. 10개 구단별 팀 필터, 전체 경기 보기
4. 이전/다음 날짜, 날짜 직접 선택, 오늘로 이동
5. 강제 새로고침, 로딩/오류/경기 없음 UI
6. 모바일에 맞춘 반응형 디자인

## 폴더 구조

```text
kbo-matchday/
├── src/
│   ├── App.tsx           # 날짜/팀 선택, 경기 UI
│   ├── styles.css        # 반응형 스타일
│   └── main.tsx          # React 진입점
├── server/
│   ├── index.mjs         # Node API + 정적 파일 서버
│   ├── normalize.mjs     # kbo-game 응답 정규화
│   └── normalize.test.mjs# 서버 유닛 테스트
├── scripts/dev.mjs       # 프런트 + 백엔드 동시 실행
├── vite.config.ts        # /api 프록시 설정
└── package.json
```

## 데이터 조회 구조

```text
React (localhost:5173)
   ↓  GET /api/games?date=2026-04-01
Vite 개발 프록시 → Node API (localhost:8787)
   ↓  getGame(new Date('2026-04-01T00:00:00+09:00'))
kbo-game@0.0.2 → KBO 경기 데이터
   ↓
서버 응답 정규화(JSON) → React 경기 카드 표시
```

**주의:** 이 프로젝트는 사용자가 제공한 가이드에 맞춰 `getGame`을 사용합니다. `getGameInfo`는 해당 버전의 export가 아닙니다. 날짜 문자열은 반드시 `Date` 객체로 변환합니다.

### API 예시

`http://127.0.0.1:8787/api/games?date=2026-04-01`

응답 형식:

```json
{
  "date": "2026-04-01",
  "games": [],
  "count": 0,
  "updatedAt": "2026-04-01T00:00:00.000Z",
  "source": "kbo-game@0.0.2"
}
```

위 응답은 **형식을 설명하기 위한 예시**이며 실제 해당 날짜 결과가 아닙니다.

- `/api/games?date=YYYY-MM-DD&refresh=1` : 서버 메모리 캐시를 건너뛰고 재조회
- `/api/health` : 서버 실행 확인
- 날짜별 조회 응답은 메모리 캐시(당일·미래 약 45초, 과거 약 30분)를 사용합니다.

## 테스트 / 빌드

```bash
npm test
npm run build
npm start
```

빌드 후에는 **http://127.0.0.1:8787**에서 프런트엔드도 함께 제공합니다. 기본적으로 로컬 컴퓨터(`127.0.0.1`)에서만 접속하도록 설정했습니다. 다른 기기에서 접근하려면 운영·보안을 고려해 `HOST` 환경 변수를 지정해야 합니다.

## 알아둘 점

- `kbo-game`은 KBO 사이트 정보에 의존하므로 사이트 변경이나 조회 실패가 발생할 수 있습니다. 실패 시 임의의 점수를 생성하지 않고 에러를 표시합니다.
- 비시즌/휴식일에는 경기 정보가 없을 수 있습니다.
- 실시간 자동 업데이트 폴링은 구현하지 않았으며 새로고침 버튼으로 데이터를 새로 불러옵니다.
- KBO 공식 앱이나 공식 서비스가 아닌 개인 프로젝트입니다.
- 의존성 다운로드나 실제 KBO 조회는 네트워크 접속이 가능해야 합니다.
