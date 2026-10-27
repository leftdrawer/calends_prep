# 디자인 전수 점검 + 새 팔레트 적용 계획 (2026-10-27)

이 문서는 **진단과 계획**만 담는다. 코드는 아직 고치지 않았다. 구현 단계가 이 계획을 따라 `styles.css`(와 꼭 필요한 경우 `index.html`/동적 클래스 정렬)만 손댄다.

- 기준: Apple HIG(https://developer.apple.com/kr/design/)와 `CLAUDE.md`의 "이 프로젝트의 디자인 기준".
- 검수 방법: 워크스페이스 루트에서 로컬 정적 서버 + Python Playwright/Chromium으로 다섯 화면을 **라이트·다크 × 데스크톱(1440) · 모바일(390)** 총 20장 캡처해 눈으로 확인. 합성 Supabase 라우팅(기존 `tests/browser_test.py`의 Fixture 방식)만 사용했고 실데이터는 읽지 않았다. 캡처용 임시 하네스(`tests/_audit_shots.py`)와 출력물은 점검 후 삭제했다.
- 손대지 말 것(재확인): `app.js`/`rituals.js`의 `REMOTE`·`store`·저장 키(`sangbogi:cycle:*`, `sangbogi:event:*`)·기능 로직(명절/초하루 대체·택일·완료·폴링·PIN 로그인)·가족 PIN 방식(이메일 OTP로 되돌리지 않음)·예스러운 한국어 문구·축문/한문 글꼴(`Gowun Batang`, `Eunhodang Hanja`)·붓글씨 로고/지방 PNG 자산. 변경은 **순수 디자인(CSS 위주)**.

---

## 검수에서 실제로 확인한 것 / 못 한 것

확인함(눈으로): 1) 입구(가족 선택) 2) 가족 준비(목록·진설·절차·완료) 3) 손님 4) 중양 안내·기록판 5) `jibang.html` — 라이트/다크, 1440/390 모두.

확인 못 함: 실제 기기(S25 등)·iOS Safari의 유리 재질(`backdrop-filter`) 실렌더, 실데이터 화면, 합동지방 PNG의 실제 그림(합성 테스트라 미리보기는 빈 상자로 보임 — 레이아웃만 확인). 중양 택일/대체 승인 패널(은호당 전용 흐름)의 승인 후 상태는 일부만 확인.

---

## (A) 화면별 HIG 문제 목록

표기: **문제 → 근거(선택자/요소/값) → 수정 방안 → 고칠 파일·선택자**. 심각도 P1(눈에 띄는 균형/정렬 결함), P2(일관성·대비), P3(다듬기).

### 1. 입구 / 가족 선택 (`#gate`)

- **A1 [P1] 사용자가 짚은 그 문제 — '은호당/어머니' 글자 왼쪽 쏠림.**
  근거: `.who button{justify-content:space-between}` (styles.css 상단 `.who button` 규칙). 버튼 폭이 넓어 레이블(`<span>은호당</span>`)은 왼쪽 끝, 화살표(`<i>→</i>`)는 오른쪽 끝에 고정되고 가운데가 크게 빈다. 캡처 1-gate-light/dark-desktop에서 글자가 좌측에 바짝 붙어 균형이 깨진다.
  수정: 이 두 버튼은 "역할 고르기"라 레이블이 주인공이다. 가운데 정렬로 바꾼다 — `justify-content:center`로 글자를 가운데 두고 화살표는 제거하거나(`.who button i{display:none}`) 레이블 바로 뒤 작은 간격(`gap`)으로 붙인다. 화살표를 유지하려면 `display:inline-flex;justify-content:center;gap:8px`로 레이블+화살표를 한 덩어리로 가운데 모은다. 최소 높이 44px는 유지.
  파일·선택자: `styles.css` `.who button`(상단 정의 + HIG 구간 `.who button`), 필요 시 `.who button i`. 마크업은 그대로 둬도 됨.

- **A2 [P2] 솔리드 버튼의 텍스트·화살표 양끝 벌어짐('기록 보기', '들어가기').**
  근거: `.gate .btn.solid{display:flex;align-items:center;justify-content:space-between}`. 넓은 폼에서 "기록 보기"와 `→`가 양 끝으로 벌어져 A1과 같은 종류의 빈 중앙이 생긴다.
  수정: `justify-content:center;gap:10px`로 레이블+화살표를 가운데 모은다. CTA는 가운데 정렬이 HIG에 더 맞다.
  파일·선택자: `styles.css` `.gate .btn.solid`.

- **A3 [P2] 구분선 라벨 '준비하시는 분'의 과한 좌우 선.**
  근거: `.gate-or:before/:after{flex:1}` 양쪽 선이 길어 두 버튼 묶음과 위계가 모호. (라이트/다크 모두.)
  수정: 유지 가능하나, A1 수정 후 라벨·버튼 정렬 축을 가운데로 통일하면 자연스러워진다. 추가 변경은 선택.
  파일·선택자: `styles.css` `.gate-or`.

- **A4 [P3] 데스크톱에서 좌(브랜드)·우(폼) 2열의 세로 중심이 안 맞음.**
  근거: `.gate .gate-layout{align-items:center}`이지만 좌측은 서명+캡션이 짧고 우측 폼이 길어 시각 무게가 우측으로 쏠린다(1-gate-*-desktop).
  수정: 필수 아님. 좌측 캡션 여백(`.gate-caption{margin-top}`) 미세 조정으로 두 열의 광학 중심을 맞추는 정도. 과하게 건드리지 않는다.
  파일·선택자: `styles.css` `.gate-brand`, `.gate-caption`.

### 2. 가족 준비 (`#family-prep`: 목록·진설·절차·완료)

- **B1 [P1] 두 열(`.shopping-grid`, `.public-grid`)의 열 높이 불균형.**
  근거: `.shopping-grid{display:grid;grid-template-columns:1fr 1fr}` + `.card{...}` 각 열이 독립 카드라 "매번 사는 것"(짧음)과 "재고 보고 사는 것"(매우 김)이 top-align되어 왼쪽 아래에 큰 빈 공간(2-family-prep-*-desktop에서 좌열이 ~45% 지점에서 끝남). 손님/중양 상단 그리드도 동일(C1 참고).
  수정: 두 열을 `align-items:start`로 둔 현 구조는 HIG에서도 허용되지만, 균형을 위해 (a) 좌열 카드 하단에 자연스러운 마무리 여백을 주거나 (b) 데스크톱에서 두 카드를 `align-items:stretch`로 같은 높이로 늘리는 선택. 내용이 다른 카드라 stretch는 빈 카드 바닥을 만들 수 있으니, **권장: 구조 유지 + 좌열이 짧을 때의 허전함을 줄이도록 카드 간 세로 간격(`margin-bottom`)과 섹션 리듬을 재점검**. 레이아웃을 크게 바꾸지 않는다.
  파일·선택자: `styles.css` `.shopping-grid`, `.public-grid`, `.card`(여백).

- **B2 [P2] 장보기 목록 행의 정렬 축 — 체크 동그라미와 텍스트의 베이스라인.**
  근거: `.row{align-items:flex-start}` + `.tick{margin-top:2px}` / `.ritual-prep-card button.tick{margin-top:-8px}`. 리추얼 준비 카드의 44px 큰 틱은 음수 마진으로 끌어올려 텍스트 첫 줄과 광학 정렬을 맞추지만, 일반 `.row`의 24px 틱과 리추얼 44px 틱이 서로 다른 보정값이라 항목별로 체크 위치가 미세하게 다르다.
  수정: 틱 상단 정렬값을 항목 타입 간 일관되게 재조정(일반/리추얼/부분준비 틱의 `margin-top`을 글자 첫 줄 중앙에 맞춰 통일).
  파일·선택자: `styles.css` `.tick`, `.ritual-prep-card button.tick`, `.ptick`.

- **B3 [P2] 진설(`.tier`) 라벨 열 폭과 알약 줄바꿈.**
  근거: `.tier{grid-template-columns:155px 1fr}`(모바일 95px, 360px에서 block). 알약(`.pill`)이 많은 당(소당·중당)에서 우측 알약 묶음이 여러 줄로 접히는데 라벨 열은 고정폭이라 좌측에 빈 공간이 생긴다(2-family-prep-*-desktop 진설 카드).
  수정: 현 구조 유지하되 `.pills{gap}`·`.pill{padding}`을 조정해 한 줄에 들어가는 밀도를 높이고, 라벨 열 폭을 내용에 맞춰 약간 줄인다. 큰 변경 아님.
  파일·선택자: `styles.css` `.tier`, `.pills`, `.pill`.

- **B4 [P2] '기타' 직접 입력 줄(`.etcline`)의 두 입력 폭 비대칭.**
  근거: `.etcline .etcwho{flex:0 0 34%}` 좌측 이름칸 34% 고정 + 우측 가변. 좁은 폭에서 품목칸이 과도하게 좁아질 수 있음.
  수정: 모바일에서 `.etcline`을 세로 스택으로 바꾸거나 최소폭 보장. 760px 이하 미디어쿼리에 규칙 추가.
  파일·선택자: `styles.css` `.etcline`(+ `@media(max-width:760px)`).

- **B5 [P2] 완료 버튼(`#donecard .btn`, `.foot>.btn`)만 `max-width:360px`로 가운데 — 다른 카드 버튼은 전폭.**
  근거: `#donecard .btn{max-width:360px}`, `.foot>.btn{max-width:360px;margin:0 auto}` vs 일반 `.btn{width:100%}`. 버튼 폭 규칙이 두 종류라 일관성 약함(2-family-prep-*-desktop 하단).
  수정: 넓은 화면에서 버튼이 과하게 길지 않도록 CTA 최대폭을 한 가지 규칙으로 통일(예: 주요 CTA 공통 `max-width`). 의도적 차이면 문서화.
  파일·선택자: `styles.css` `.btn`, `#donecard .btn`, `.foot>.btn`.

### 3. 손님 (`#app` 손님 모드)

- **C1 [P1] 선물 카드 vs 지난 기록 카드 높이 불균형.**
  근거: `.public-grid{grid-template-columns:1fr 1fr}`. 빈 예물 상태(`아직 보내주신 예물이 없습니다`)일 때 좌측 카드가 매우 짧고 우측 기록 카드가 길어 좌측 아래가 크게 빔(3-guest-light-desktop).
  수정: B1과 같은 접근. 손님 화면은 카드가 둘뿐이라, 예물이 비었을 때 좌측 카드 안쪽 여백을 늘려 두 카드의 시각 무게를 맞추거나, 빈 상태 메시지를 세로 가운데로 두는 선택.
  파일·선택자: `styles.css` `.public-grid`, `.gift-empty`.

- **C2 [P2] 지난 기록 월 구분(`.thankmon`)의 간격 리듬.**
  근거: `.thankrow{padding:18px 0;border-top}`, `.thankmon{margin-bottom:10px}`. 월별 묶음 사이 구분이 약해 '병오 구월 중양 / 병오 구월 초하루'가 붙어 보임(3-guest-light-desktop 우측).
  수정: 월 묶음 사이 `padding`·구분선 대비를 살짝 키워 그룹 경계를 명확히.
  파일·선택자: `styles.css` `.thankrow`, `.thankmon`.

- **C3 [P2] 손님 화면 상단 월 네비(`.monthnav`)·탭(`.event-tab`)은 가족과 공유 — 손님에겐 조작 의미가 약함.** (디자인 문제라기보다 정보위계.)
  근거: 손님도 월 이동/탭 노출(3-guest-*). 기능은 유지(요구사항). 디자인상 탭 비활성 색 대비만 점검.
  수정: 색만 점검, 구조 변경 없음.

### 4. 명절(중양) 안내 + 기록판 (`#jungyang-prep`, `#jungyang-guide`, `#donecard`)

- **D1 [P2] 축문 카드 한문 블록의 강조 과다.**
  근거: `.jungyang-prayer{background:var(--brass-veil);border-left:3px solid var(--brass)}` + `.jungyang-chukmun-hanmun{font-size:19px}`. 한문 14구절 전체가 파란 틸트 배경 + 좌측 파란 막대라 "강조색 하나" 원칙에서 파랑이 넓은 면으로 쓰임(4-jungyang-*). 독음(13px, `--ink-2`)·뜻풀이(작은 글씨)와 위계는 좋음.
  수정: 한문 블록 배경을 더 중립적인 표면(`--hanji`/`--sunk`)으로 낮추고 파랑은 좌측 얇은 막대 등 포인트로만. 새 팔레트 적용 시 (B)표의 표면색으로 자연스럽게 흡수.
  파일·선택자: `styles.css` `.jungyang-prayer`, `.jungyang-chukmun-hanmun`.

- **D2 [P2] 잔 기록 카드(`#jungyang-cups-card`)·기본 차림 카드의 소제목 위계.**
  근거: `#jungyang-cups-card h3{font-size:14px;font-weight:600}`. 카드 제목 `.card h2`(22px)와 내부 `h3`(14px)의 간극이 커 중간 위계(소제목)가 약함.
  수정: 내부 소제목을 17px 전후(머리말 단계)로 올려 위계 단계를 메움. 12px 미만 금지 원칙은 이미 지킴.
  파일·선택자: `styles.css` `#jungyang-cups-card h3`, `.jungyang-guide-card` 내부 제목.

- **D3 [P2] 합동지방 미리보기 카드(`.jungyang-jibang-layout`)의 이미지 상자·설명 정렬.**
  근거: `.jungyang-jibang-preview{flex:0 0 144px}` + `.jungyang-jibang-copy{flex:1 1 180px}`. 세로로 긴 지방 비율(약 6:13) 상자와 우측 텍스트의 상단 정렬이 어긋나 보일 수 있음(합성 캡처라 그림은 비었지만 상자 비율은 확인).
  수정: 상자·텍스트를 `align-items:flex-start`로 명확히 하고, 상자 모서리·배경(`--hanji`)이 새 팔레트에서 지방 닥종이 톤과 충돌하지 않게 (B)표에 따라 조정.
  파일·선택자: `styles.css` `.jungyang-jibang-layout`, `.jungyang-jibang-preview`.

- **D4 [P3] 중양 기본 차림 카운트 칩(`.jungyang-count`)이 파란 알약 — 강조색 소비.**
  근거: `.jungyang-count{background:var(--brass-veil);color:var(--brass-deep)}`.
  수정: 정보 칩이므로 중립 표면 + `--ink-2` 텍스트로 낮추고, 진행 상태(완료 수)만 파랑 유지 검토.
  파일·선택자: `styles.css` `.jungyang-count`.

### 5. `jibang.html` 지방 뷰어

- **E1 [P1 · 팔레트 일관성] 독립된 녹색·베이지 테마 — 앱 토큰 체계·HIG 강조색과 분리됨.**
  근거: `jibang.html`의 인라인 `<style>`에 하드코딩: `body{background:#eee5d1}`, 버튼 테두리 `#74816b`, 주 버튼 `#fullscreen{background:#40513e;color:#fff}`, 포커스 링 `outline:2px solid #40513e`. 앱 전체는 파랑 강조 + 회색 토큰인데 이 페이지만 녹색 강조라 두 세계가 따로 논다(5-jibang-*).
  수정: 두 갈래 중 택1 — **(권장) ①** 닥종이 바탕(`#eee5d1`)은 지방 그림과 어울리므로 **배경·이미지 톤은 유지**하되, 버튼·포커스 링·테두리를 앱의 새 팔레트 강조색/표면으로 교체해 "같은 앱"처럼 보이게 한다. **②** 전체를 앱 토큰으로 통일(배경까지 회보라). ①이 지방 PNG의 종이 질감을 해치지 않아 더 낫다. 어느 쪽이든 색만 바꾸고 전체화면/PNG 저장 동작·`object-fit:contain`은 그대로.
  파일·선택자: `jibang.html` 인라인 `<style>`의 `body`, `button,a`, `#fullscreen`, `button:focus-visible`, `#controls`, `#status`, `#show-controls`.

- **E2 [P2] 포커스 링 두께·색이 앱(3px 파랑)과 다름(2px 녹색).**
  근거: `jibang.html` `button:focus-visible{outline:2px solid #40513e;outline-offset:4px}` vs 앱 HIG 구간 `outline:3px solid var(--brass);outline-offset:2px`.
  수정: 앱과 동일하게 3px·새 강조색·offset 2px로 통일(단, 이 페이지는 토큰이 없으므로 새 강조 HEX를 직접 쓰거나 `:root` 토큰을 이 파일에도 선언).
  파일·선택자: `jibang.html` `button:focus-visible,a:focus-visible`.

### 전역(모든 화면 공통)

- **G1 [P2] `--stone`의 용도 혼용 점검.**
  근거: `CLAUDE.md`는 "정보를 담은 글자에 `--stone` 금지"라 했는데, 체크 미완료 취소선 색(`.row.done .nm{text-decoration-color:var(--stone)}`), 시트 grab(`.grab{background:var(--line)}`은 ok), 점선 버튼(`.isrc{border:1px dashed var(--stone)}`, `.addname`)에서 `--stone`이 테두리/장식으로 쓰임 — 텍스트 색으로는 안 쓰이는지 전수 확인 필요.
  수정: `--stone`이 **본문 정보 텍스트 색**으로 쓰인 곳이 있으면 `--ink-2`/`--ink-3`로 교체. 장식(취소선 색·점선 테두리)은 허용.
  파일·선택자: `styles.css` 전역 grep `var(--stone)`.

- **G2 [P2] 포커스 링 가시성 — 새 팔레트에서 재검증.**
  근거: HIG 구간 `outline:3px solid var(--brass)`. 새 팔레트의 강조색이 회보라 계열이면 라이트 바탕(`#E2DDE7`)·다크 바탕(`#17151C`) 양쪽에서 3px 링이 충분히 보이는지 대비 확인 필요.
  수정: (B)표의 강조·링 색이 양 모드에서 WCAG 비텍스트 대비(≥3:1)를 넘는지 확인, 부족하면 링 전용 파생값 사용.
  파일·선택자: `styles.css` `:focus-visible`.

- **G3 [P3] 유리 막대(`.top`)와 시트 배경 — `prefers-reduced-transparency` 폴백은 이미 있음(확인).** 변경 불필요. iOS 실기기 유리 표현은 미확인(위 "확인 못 함").

- **G4 [P3] 한국어 줄바꿈(`word-break:keep-all`)은 전역 적용 확인됨.** 한문 블록만 `word-break:normal`(의도적). 유지.

---

## (B) 팔레트 → 토큰 매핑 표

사용자 팔레트(어두움→밝음): `#17151C` · `#292531` · `#45404F` · `#716879` · `#AAA2B3` · `#E2DDE7`. **모두 보라빛 회색 중립색이라 강조색이 없다.** Apple HIG의 "강조색 하나" 원칙을 지키려면 강조는 이 6색과 어울리는 **회보라 계열 단일 파생색**을 만들고, 경고·구매 표시는 기존 빨강 계열(`--cinnabar-*`)을 소폭 톤만 맞춰 유지한다. 토큰 **이름은 그대로**, 값만 바꾼다(기존 `--brass-*`/`--cinnabar-*` 이름 유지는 `CLAUDE.md` 지시).

### 역할 배분 원칙
- 라이트: 밝은 두 색(`#E2DDE7` 바탕, `#FFF`에 가까운 카드)·어두운 두 색(본문/제목 텍스트) 중심, 중간색은 보조 텍스트·구분선.
- 다크: 어두운 세 색(바탕·카드·표면)·밝은 두 색(텍스트) 중심.
- 강조(`--brass*`/`--solid`): 6색 밖의 회보라-블루 파생. 넓은 면이 아니라 선택·링크·채운 버튼에만.

### 라이트 모드 (`:root`)

| 토큰 | 값(제안) | 출처 | 역할 |
|---|---|---|---|
| `--page` | `#E2DDE7` | 팔레트 #6(최명) | 페이지 바탕(회색 대신 밝은 회보라) |
| `--card` | `#F4F2F6` (｢#E2DDE7｣를 흰쪽으로 밝힌 파생) | #6 변주 | 흰 묶음 카드(바탕 위로 떠 보이게 더 밝게) |
| `--sunk` / `--fill` | `#E2DDE7` | #6 | 가라앉은 면·입력 배경 |
| `--fill-2` | `#D3CDDA` (#6↔#5 사이 파생) | 파생 | 보조 버튼·막대 트랙 |
| `--line` | `#AAA2B3` | #5 | 구분선·테두리 |
| `--line-soft` | `#C9C3D1` (#5 밝은 파생) | 파생 | 연한 구분선(행 사이) |
| `--stone` | `#AAA2B3` | #5 | 장식(점선 테두리·취소선 색)만 |
| `--ink` | `#17151C` | #1(최암) | 제목·본문 주요 텍스트 |
| `--ink-2` | `#45404F` | #3 | 안내문·보조 텍스트(대비 충분) |
| `--ink-3` | `#716879` | #4 | 덜 중요한 힌트·플레이스홀더 |
| `--hanji` | `#F4F2F6` | #6 변주 | 닥종이 느낌 표면(체크 표시 안쪽 대비용 밝은 색 유지) |
| `--brass` / `--brass-deep` / `--brass-ink` / `--solid` | `#5C5470`계 파생(아래 주) | 파생 | 강조: 링크·선택·채운 버튼·포커스 링 |
| `--brass-veil` | `#D7D0E0` (강조의 연한 틸트) | 파생 | 선택 알약·강조 배경 틸트 |
| `--cinnabar` / `--cinnabar-deep` | 기존 유지(`#C9170C` 등) | 기존 | 구매·경고(빨강, 소비 최소) |
| `--cinnabar-veil` | `#F6E6E6`(회보라 바탕과 충돌 적은 연빨강) | 파생 | 구매 표시 배경 |

### 다크 모드 (`@media(prefers-color-scheme:dark)`)

| 토큰 | 값(제안) | 출처 | 역할 |
|---|---|---|---|
| `--page` | `#17151C` | #1(최암) | 페이지 바탕 |
| `--card` | `#292531` | #2 | 카드(바탕보다 한 단 밝게) |
| `--sunk` / `--fill` | `#292531` | #2 | 가라앉은 면 |
| `--fill-2` | `#45404F` | #3 | 보조 버튼·막대 트랙 |
| `--line` | `#45404F` | #3 | 구분선·테두리 |
| `--line-soft` | `#332E3C` (#2↔#3 파생) | 파생 | 연한 구분선 |
| `--stone` | `#716879` | #4 | 장식만 |
| `--ink` | `#E2DDE7` | #6(최명) | 제목·본문 주요 텍스트 |
| `--ink-2` | `#AAA2B3` | #5 | 안내문·보조 텍스트 |
| `--ink-3` | `#716879`↔`#AAA2B3` 사이 `#8E8699` 파생 | 파생 | 힌트(다크에서 대비 보강) |
| `--hanji` | `#292531` | #2 | 표면(체크 안쪽은 흰 체크로 대비) |
| `--brass*` / `--solid` | `#B5A9D1`계 밝은 파생 | 파생 | 강조(다크에선 밝게) |
| `--brass-veil` | `#2E2740` (강조의 어두운 틸트) | 파생 | 선택 배경 |
| `--cinnabar*` | 기존 다크값 유지 | 기존 | 구매·경고 |

주) **강조색 파생 근거.** 6색 중 어느 것도 강조로 쓰면 텍스트/표면과 명도가 겹쳐 "선택됨"이 안 보인다(예: `#716879`를 버튼에 쓰면 라이트의 `--ink-2 #45404F` 텍스트와 구분 약함). 그래서 팔레트의 색상(hue, 보라빛 ~270°)을 지키되 채도를 살짝 올린 **플럼-블루 파생**을 단일 강조로 둔다. 라이트는 `#5C5470`보다 약간 더 또렷한 톤(예 `#6E5FA6`대), 다크는 `#B5A9D1`대처럼 밝게. 구현 단계에서 라이트 강조↔`#E2DDE7` 바탕, 다크 강조↔`#17151C` 바탕의 **대비를 측정(텍스트 ≥4.5:1, 비텍스트/링 ≥3:1)** 해 수치를 맞춘다. 미달 시 명도만 재조정(G2 참고). **빨강은 강조가 아니라 경고/구매 신호로만** 유지하므로 "강조색 하나" 원칙과 충돌하지 않는다.

이미지 조화: 붓글씨 로고/서명 PNG는 라이트에서 검정 그대로, 다크에서 `invert(1)`(기존 규칙) 유지. 새 회보라 바탕(`#E2DDE7`)·다크 바탕(`#17151C`) 위에서 검정/흰 붓글씨 대비는 충분. 지방 PNG의 닥종이색(`#eee5d1`, 따뜻한 베이지)은 회보라 팔레트와 **색 온도가 다르다** — `jibang.html`은 그림 종이 질감을 위해 베이지 배경을 유지하고 버튼/링만 새 강조로 맞추는 (A)E1-①을 권장.

---

## (C) 변경 범위 / 손대지 말 영역 재확인

### 바꾸는 것 (디자인만)
- `styles.css`:
  - `:root`와 다크 미디어쿼리의 토큰 **값**만 (B)표대로 교체. 토큰 이름·개수 유지.
  - (A)의 레이아웃/정렬 수정: `.who button`·`.gate .btn.solid` 정렬(A1·A2), 두 열 균형 여백(B1·C1), 틱 정렬 통일(B2), 진설 밀도(B3), `.etcline` 모바일 스택(B4), CTA 폭 통일(B5), 축문/칩 강조 완화(D1·D4), 소제목 위계(D2), 지방 카드 정렬(D3), `--stone` 텍스트 오용 제거(G1), 포커스 링 재검증(G2).
- `index.html`: 원칙상 CSS로 해결. 꼭 필요하면 `.who`/gate 버튼의 클래스 정렬만(마크업 구조·문구·`data-*`·접근성 속성은 유지). `theme-color` 메타는 새 `--page` 값에 맞춰 라이트/다크 2개 갱신 가능.
- `jibang.html`: 인라인 `<style>`의 색만 새 팔레트로(E1·E2). 스크립트·동작·`object-fit`·접근성 유지.
- 문서: 변경 구현 시 `docs/HISTORY.md`에 날짜·내용·이유·검증·남은 것 기록, 디자인 기준이 바뀌므로 `CLAUDE.md`의 색 설명과 `styles.css` "Apple HIG 기반" 구간 주석을 새 팔레트로 갱신(토큰 이름은 유지).

### 절대 건드리지 않는 것
- `app.js`·`rituals.js`의 `REMOTE`/`store`/저장 키(`sangbogi:cycle:*`, `sangbogi:event:*`), 기능 로직(명절·초하루 대체·택일·완료·12초 폴링·PIN 검증), 가족 PIN 로그인 방식(이메일 OTP 복원 금지), 클래스 이름·DOM 구조(렌더러가 의존), 예스러운 한국어 문구.
- 내용 글꼴: 축문·기도문 `Gowun Batang`, 한문 `Eunhodang Hanja`와 그 `@font-face`/`unicode-range`. 붓글씨 로고/서명/지방 PNG 자산 파일.
- 저장·권한·역할 노출 규칙(손님 사적 DOM 비생성 등)은 디자인 변경과 무관하게 유지.

### 검증 방법(구현 단계가 따를 것)
- `python3 tests/browser_test.py`(합성 응답, 외부 요청 차단) 전체 통과 유지 — 색/정렬 변경이 셀렉터·역할·오버플로 검사를 깨지 않는지.
- 다섯 화면 × 라이트/다크 × 320/390/1440px 재캡처로 (A) 항목 해소 확인(특히 A1 은호당/어머니 균형).
- 새 강조·포커스 링의 대비 수치 측정(G2). 실데이터 미사용.

### 남은 결정(미정 → 구현 단계에서 확정)
- 강조 파생 HEX의 **정확한 값**(대비 측정 후 확정). B1/C1 열 균형을 "여백 조정"으로 갈지 "stretch"로 갈지. E1의 ①(베이지 유지)/②(완전 통일) 최종 선택 — 본 계획은 ①을 권장.
