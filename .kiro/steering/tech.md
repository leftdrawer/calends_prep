# 기술 / 배포

## 스택
- **단일 정적 HTML 파일** (`index.html`). 빌드 과정 없음. 프레임워크 없음.
- 인라인 CSS + 바닐라 JavaScript. 외부 의존성은 웹폰트(Pretendard, Gowun Batang) 정도.
- 파일 하나로 완결되므로 정적 호스팅이면 어디서든 동작한다.

## 데이터 저장 (Supabase)
- `index.html` 안의 `REMOTE` 객체가 데이터베이스를 가리킨다:
  - `url`: Supabase 프로젝트 URL
  - `key`: Supabase **anon(공개) 키** — 원래 브라우저에 노출되도록 설계된 공개용 키다.
  - `table`: `sangbogi`
- 저장 우선순위 (`store` 객체):
  1. `REMOTE`가 채워져 있으면 Supabase REST API 사용
  2. 없으면 호스트 제공 `window.storage`
  3. 그것도 없으면 브라우저 `localStorage`
- 현재 `REMOTE`가 채워져 있으므로 **모든 기록은 Supabase `sangbogi` 테이블**에 저장된다.
- `sangbogi` 테이블은 key-value 구조: `key`(문자열), `value`(JSON 문자열), `updated_at`.

### 데이터 주의사항 (중요)
- **실데이터가 들어 있다.** 스키마·키 형식·기존 키를 함부로 바꾸지 말 것.
- 데이터 모델을 바꾸는 변경(예: 한 달에 상 두 개 저장)은 기존 키(`sangbogi:cycle:<연-월>`)와
  충돌하지 않도록 신중히 설계하고, 반드시 문서화한다.
- Supabase 키는 공개용 anon 키라 저장소가 Public이어도 추가 위험은 크지 않다.

## 배포 (GitHub Pages)
- 저장소: `leftdrawer/calends_prep` (Public)
- 배포 주소: https://leftdrawer.github.io/calends_prep/
- 배포 소스: `main` 브랜치 루트(`/`)
- `.nojekyll` 파일로 Jekyll 처리를 건너뛴다.
- **배포 방법**: `index.html` 수정 → 커밋 → `git push` 하면 GitHub Pages가 자동 재배포.
- 이전에 Netlify(`eunhodang.netlify.app`)를 썼으나 GitHub Pages로 완전히 이전 후 삭제했다.

## 로컬 확인
```powershell
python -m http.server 8000   # http://localhost:8000
```

## 개발 시 주의
- 단일 HTML이라 변경이 즉시 전체에 영향을 준다. 수정 후 로컬에서 열어 확인할 것.
- 대용량 base64 아이콘이 파일 상단에 인라인돼 있어 파일이 크다(약 200KB+). grep/부분 읽기를 활용.
