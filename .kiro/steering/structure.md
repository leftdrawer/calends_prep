# 코드 구조 (index.html)

모든 로직이 `index.html` 하나에 들어 있다. 주요 영역을 개념별로 정리한다.
(라인 번호는 변할 수 있으니 심볼 이름으로 찾을 것.)

## 파일 구성
- `index.html` — 앱 본체 (HTML + 인라인 CSS + 인라인 JS)
- `.nojekyll` — GitHub Pages 정적 서빙용 빈 파일
- `README.md` — 저장소 소개
- `CLAUDE.md` — Claude Code가 읽는 프로젝트 지침 (디자인 기준·프론트엔드 참고 자료)
- `DESIGN.md` — 아직 정하지 않은 디자인 부분을 채울 때 보는 외부 디자인 파일 (원문 그대로, 따르는 범위는 `CLAUDE.md`)
- `.kiro/steering/` — Kiro가 매 대화에서 읽는 프로젝트 지침 (이 폴더)
- `docs/` — 사람이 읽는 상세 기록 (작업 이력, 도메인 로직)

## 데이터 상수
- `FIXED` — 초하루마다 반드시 올리는 고정 품목 (백시루/콩시루/팥시루/식혜/막걸리/소주)
- `VARI` — 그 외 품목 (양주/배/사과/제철과일/밤/대추/나물/전/산적/두부/묵/생쌀)
- `GIFTS` — 신도가 보내는 물품 (진척 셈에서 제외)
- `BUY = FIXED + VARI` — 진척률 계산 대상
- `ALL = FIXED + VARI + GIFTS` — 자리별 렌더링 대상
- `STEPS` — 상을 올린 뒤의 절차(차례) 6단계
- `TIERS` — 신당 자리: 소당/중당/육당 (건립은 별도 렌더링)
- `SUBSTITUTES` — 초하루를 대신할 수 있는 명절 정의 (월/이름/날짜방식)
- `LUNAR` — 음력 달력 테이블 `[양력 초하루, 음력연, 음력월, 윤달여부, 달 길이]`
- `DONGJI` — 동지 양력 날짜표(절기라 양력)

## 핵심 함수 (명절/대체 로직)
- `substitutesFor(e)` — 그 달에 드는 대체일 목록 계산 (윤달이면 없음)
- `substituteFor(e)` — 그 달의 대체일 하나 선택 (있으면 초하루를 덮어씀 ← 개선 대상)
- `sangDate(e)` — 상 올리는 날. 대체일 있으면 그 날짜, 없으면 초하루 날짜
- `cycleKey(e)` — 저장 키 접미사 `<연>-<월>` (한 달에 하나 ← 개선 대상)
- `doneKey(e)` — 완료 표시 키 `done:추석` 또는 `done:초하루` 중 하나
- `pickIndex()` / `pickIndexRespectingDone()` — 오늘 기준 어느 달을 열지 결정

## 렌더링 함수
- `renderHead()` — 상단 간지/제목/날짜칩/대체일 안내(notice)
- `renderSang()` — 자리별 품목 pill (명절 구분 없이 항상 동일 ← 개선 대상)
- `renderSteps()` — 절차 체크
- `renderDone()` — "상을 올렸습니다" 완료 버튼

## 저장소 계층
- `REMOTE` — Supabase 접속 설정
- `store` — get/set/list (Supabase → window.storage → localStorage 순)
- `LOCAL` / `pending` / `writeCycle()` — 화면 사본을 즉시 고치고 모아서 서버에 반영

## 개선 대상으로 표시된 것 (docs/domain-sangbogi.md 참고)
1. `substituteFor`가 명절을 초하루에 **무조건 덮어씀** → 대체 가능/불가 구분 필요
2. `cycleKey`가 한 달에 저장 키 **하나** → 초하루 상 + 명절 상 분리 저장 필요
3. `renderSang`/`STEPS`가 명절·초하루 **동일** → 명절별 다른 품목·절차 필요
