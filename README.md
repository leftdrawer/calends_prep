# 은호당 상차림 (calends_prep)

초하루상 차림 준비를 기록하고 관리하는 단일 페이지 웹 앱입니다.

## 구조

- `index.html` — 화면과 로직이 모두 담긴 단일 정적 파일. 별도의 빌드 과정이 없습니다.
- 데이터는 화면과 분리되어 외부 데이터베이스(Supabase)에 저장됩니다.
  - `index.html` 안의 `REMOTE` 설정(`url` / `key` / `table`)이 데이터베이스를 가리킵니다.
  - 그래서 이 HTML을 어디에 배포하든(Netlify, GitHub Pages 등) 같은 데이터를 그대로 사용합니다.

## 로컬에서 보기

정적 파일이라 파일을 브라우저로 바로 열어도 되지만, 간단한 로컬 서버로 여는 것을 권장합니다.

```powershell
# Python이 있다면
python -m http.server 8000
# 이후 브라우저에서 http://localhost:8000 접속
```

## 배포 (GitHub Pages)

1. 이 저장소를 GitHub에 올립니다.
2. GitHub 저장소 → Settings → Pages 에서 배포 소스를 `main` 브랜치의 루트(`/`)로 지정합니다.
3. 잠시 후 발급되는 주소로 접속하면 됩니다.

- `.nojekyll` 파일은 GitHub Pages가 Jekyll 처리를 건너뛰고 정적 파일을 그대로 서빙하도록 합니다.

## 데이터 저장 방식

- 우선순위: Supabase(`REMOTE` 설정이 채워져 있을 때) → 호스트 제공 스토리지 → 브라우저 `localStorage`.
- 현재 `REMOTE`가 채워져 있으므로 모든 기록은 Supabase의 `sangbogi` 테이블에 저장됩니다.
