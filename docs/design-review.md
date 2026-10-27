# 디자인 개선 변경 리뷰 (2026-10-27, 3차 패스)

대상: 워킹트리 미커밋 변경 — `styles.css`, `index.html`, `jibang.html`, `CLAUDE.md`, `docs/HISTORY.md`.
기준: `docs/design-audit.md`(계획), `CLAUDE.md`(Apple HIG). 손대지 말 영역: `app.js`/`rituals.js`/저장 키/기능 로직/가족 PIN/예스러운 한국어 어투.

판정: **APPROVED**

## 이전 패스 findings 재확인

- **F1 (검증 증거·HISTORY 부재) — 해소 유지.** `docs/HISTORY.md` 최상단 "2026-10-27 · 보라빛 회색 6단계 팔레트 적용 + HIG 정렬 다듬기" 항목이 변경 내용·이유·검증·남은 사항을 기록한다. 검증란에 `python tests/browser_test.py` 50개 전체 통과(86.226초), 라이트/다크 1440px 게이트·가족 화면 실렌더 스폿체크, 계산된 `.btn.solid` 배경(라이트 `rgb(106,92,160)`=`#6A5CA0`, 다크 `rgb(116,102,153)`=`#746699`)과 흰 글자 대비, 양 모드 JS 오류 없음, 합성 임시 자산 삭제가 적힌다.
- **F2 (다크 `--solid` 흰 글자 4.33:1) — 해소 유지.** 현 `styles.css` 다크 블록 `--solid:#746699`. 흰 글자 대비 **5.118:1**(≥4.5:1) 직접 재측정 확인. 라이트 `--solid`/`--brass` `#6A5CA0`는 흰 글자 **5.751:1**.
- **F3 (`jibang.html` 다크 `--accent` `#7E6FB8` 주 CTA 흰 글자 4.33:1) — 해소됨.** 현 `jibang.html` 인라인 다크 블록이 `--accent:#746699`로 교정되어 있다. `#fullscreen{background:var(--accent);color:#fff}`의 다크 흰 글자 대비 = **5.118:1**(≥4.5:1, 직접 재측정). 라이트 `--accent:#6A5CA0`는 흰 글자 **5.751:1**. 앱 다크 채움 교정값과 동일해 일관성도 충족. 수정 후 측정값은 HISTORY 리뷰 반영란(F3)에 기록됨.

## 관점별 확인 결과

### (1) 계획 HIG 문제 해소 — 특히 A1 '은호당/어머니' 쏠림
- **A1:** `.who button{display:flex;align-items:center;justify-content:center;gap:8px;min-height:47px}`. `space-between` → `center`로 바뀌어 레이블+화살표가 한 덩어리로 중앙 배치. 사용자 지적한 왼쪽 쏠림 해소. 높이 47px(≥44px) 충족.
- **A2:** `.gate .btn.solid{display:flex;align-items:center;justify-content:center;gap:10px}`. 양끝 벌어짐 해소, CTA 중앙 정렬.
- **D1/D4:** 넓은 파란 면이던 `.jungyang-prayer`(배경 `--brass-veil`→`--hanji`), `.jungyang-count`(배경 `--brass-veil`→`--fill`, 글자 `--brass-deep`→`--ink-2`)를 중립 표면으로 낮춤. 강조색 하나 원칙 보강.
- **A4/B4/B5/D2/D3:** `.etcline` 760px 이하 세로 스택, `#donecard .btn{max-width:360px;display:block;margin:0 auto}` 중앙 정렬, `#jungyang-cups-card h3` 14→17px 위계 보강, `.jungyang-jibang-layout{align-items:flex-start}` 반영.

### (2) 팔레트 6색 매핑 + 라이트/다크 대비·강조색 하나
- 라이트 `:root`: `--page #E2DDE7`, `--card #F7F5FA`(#6 흰쪽 파생), `--ink #17151C`, `--ink-2 #45404F`, `--ink-3 #716879`, `--line #AAA2B3`, `--stone #AAA2B3`, 강조 `--brass/--solid #6A5CA0`, `--brass-deep/--brass-ink #564A82`. 계획 (B)표와 일치(값 교체, 이름 유지).
- 다크: `--page #17151C`, `--card/--sunk #292531`, `--ink #E2DDE7`, `--ink-2 #AAA2B3`, `--line #45404F`, 강조 `--brass #B5A9D1`/`--solid #746699`. 계획과 일치.
- 대비 측정: 라이트 `--ink-2`(#45404F) on `--card`(#F7F5FA) 9.24:1, 다크 `--ink-2`(#AAA2B3) on `--card`(#292531) 6.08:1 — 안내문 텍스트 충분. 채움 버튼 흰 글자 라이트 5.75:1·다크 5.12:1.
- 강조색 하나: 보라 hue 단일 파생만 강조로 사용, 빨강(`--cinnabar-*`)은 경고/구매로만.

### (3) 금지 영역 불변
- `git diff --name-only`: 변경 파일은 `CLAUDE.md`·`docs/HISTORY.md`·`index.html`·`jibang.html`·`styles.css`뿐. **`app.js`/`rituals.js` 무변경** — REMOTE/store/저장 키(`sangbogi:cycle:*`·`sangbogi:event:*`)/기능 로직(명절·초하루 대체·택일·완료·12초 폴링·PIN 검증)/가족 PIN 로그인(이메일 OTP 복원 없음)에 영향 없음.
- 클래스 이름·DOM 구조 변경 없음(CSS 값·정렬·미디어쿼리 규칙만). 한국어 문구·예스러운 어투 변경 없음.
- 내용 글꼴(`Gowun Batang`, `Eunhodang Hanja`)·`unicode-range`·붓글씨/지방 PNG 자산 불변.

### (4) 터치 타겟·포커스 링·타이포·줄바꿈
- 터치 타겟: `.who button` 47px, `.gate .btn` 48px, `jibang.html` 버튼 `min-height:44px` — 모두 ≥44px.
- 포커스 링: HIG 구간 공통 `outline:3px solid var(--brass);outline-offset:2px`. `jibang.html`도 `outline:3px solid var(--accent);outline-offset:2px`로 통일(E2). 링 비텍스트 대비: 라이트 `#6A5CA0` on `#E2DDE7` 4.31:1, 다크 `#B5A9D1` on `#17151C` 8.24:1 — 모두 ≥3:1.
- 타이포: 12px 미만 없음(grep `font-size:1[01]px` 0건). 34/28/22/17/15/13/12 단계 유지.
- `word-break:keep-all` 전역 유지(body), 한문 블록만 의도적 `normal`.

## 범위 밖(비차단) 메모
- B5(`.foot>.btn`·`#donecard .btn`의 `max-width:360px` 공존)는 계획상 P2·선택 항목. 두 규칙 모두 중앙 정렬로 동작, 파손 아님.
- B1/C1 열 높이 균형은 계획이 "여백 조정/구조 유지"를 권장한 선택 항목. 레이아웃 파손 아님.
- 실기기(S25)·iOS Safari 유리 재질 실렌더, 합동지방 PNG 실제 그림 위 톤은 합성 테스트 특성상 미확인(HISTORY에 명시). 본 변경의 차단 사유 아님.

## 결론
이전 패스의 유일한 차단 사유 F3가 현 워킹트리에서 다크 `--accent:#746699`로 교정되어 흰 글자 대비 5.118:1을 직접 측정으로 확인했다. F1·F2도 해소 유지. 계획의 HIG 정렬 수정·6색 팔레트 매핑·강조색 하나 원칙이 반영되었고, 금지 영역(`app.js`/저장 키/PIN/문구)은 불변이며, 터치 타겟·포커스 링·타이포·줄바꿈 기준을 충족한다. 남은 차단 사유 없음.
