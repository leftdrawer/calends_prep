# 기술 / 배포

## 스택

- 정적 HTML + CSS + 바닐라 JavaScript. 별도 프레임워크나 빌드 과정 없음.
- `index.html`은 화면, `app.js`는 로직, `styles.css`는 반응형 스타일을 맡습니다.
- `assets/`의 PNG 로고와 아이콘은 정적 파일입니다. 외부 의존성은 웹폰트입니다.
- 붓글씨 가로·세로 원본은 `wordmark-horizontal.png`, `wordmark-vertical.png`이며 `<picture>`로 760px 이하에서 세로를 선택합니다. 두 파일이 모두 읽혀야 적용하며 미확보 상태는 기존 `wordmark.png`로 표시합니다.
- 테스트는 Python Playwright + Chromium을 사용합니다. 실행 명령은 `python3 tests/browser_test.py`입니다.

## 저장과 로그인

- `app.js`의 `REMOTE` 객체가 Supabase 프로젝트와 공개 anon 키, `sangbogi` 테이블을 가리킵니다.
- 우선순위: Supabase → 호스트 `window.storage` → 브라우저 `localStorage`.
- `sangbogi`는 key-value 형태이며 `value`는 JSON 문자열입니다.
- 기존 월 기록 `sangbogi:cycle:<월>`은 초하루 데이터입니다. 명절은 `sangbogi:event:<월>:<id>`, 대체 승인은 `sangbogi:calendar:<월>`로 나눕니다.
- 가족은 클라이언트 PIN으로 확인합니다. 이메일 OTP 및 세션 토큰 갱신 요청을 제거했고 기존 브라우저 이메일 세션은 정리합니다.
- 사용자 요청에 따른 화면 잠금 수준이며, PIN이 서버의 인증 토큰을 발급하지는 않습니다. 현재 anon으로 분리된 테스트 키 저장·삭제를 확인했습니다.
- 손님 화면은 사적 준비 내용을 DOM에 생성하지 않습니다. 공개 API 접근 정책까지 바꾸는 변경은 아닙니다.
- 지연 입력은 작성 당시 상의 저장 키를 기억하고, 저장 중에 추가된 수정은 다음 저장까지 유지합니다.
- 상달 초하루의 불사단지 쌀 교체는 기존 `cycle.part['bulsa-rice']`에 `stamp`와 `bindCycleWriter`로 저장합니다. 새 테이블·마이그레이션 없이 초하루 월/연도 키에 귀속됩니다.
- 12초 주기 및 화면 복귀 갱신은 택일과 월별 승인을 함께 읽습니다. 택일 저장 중 조회와 이전 조회 응답은 새 저장을 덮어쓰지 않습니다.

## 실데이터 주의

- 실데이터가 있습니다. 기존 키·값을 초기화하거나 명절 키로 복사하지 마세요.
- 구월 초하루의 기존 자료는 기존 키 그대로 표시합니다. 예전 명절 이름 완료 표시도 초하루에서 읽기 호환합니다.
- 명절 상 내용이 정해지지 않았으면 초하루의 품목과 차례를 자동으로 가져오지 않습니다.
- 테스트는 합성 응답을 사용합니다. 실제 저장 확인이 필요하면 기존 기록과 겹치지 않는 고유 테스트 키만 사용하고 검사 후 정확히 그 키만 삭제합니다.

## 로컬 및 배포

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

GitHub Pages 저장소는 `leftdrawer/calends_prep`, 배포 소스는 `main` 루트입니다.
앱 주소: https://leftdrawer.github.io/calends_prep/
`.nojekyll` 파일로 정적 파일을 그대로 제공합니다. 배포 시 HTML, JS, CSS, assets 모두 포함하세요.
클라우드 실제 브라우저 HTTPS 검사는 NSS 저장소 쓰기 접근을 확인하고 TLS 검증을 유지합니다.
