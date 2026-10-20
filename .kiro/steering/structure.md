# 코드 구조

## 파일

- `index.html`: 로그인과 가족 암호 입력, 달·행사 탭, 가족 준비/공개 예물 영역, 기록판
- `styles.css`: 로그인, PC 두 열·모바일 한 열, 행사 승인, 준비 항목과 기록판 스타일
- `app.js`: 아래 데이터·일정·저장·화면 로직
- `jibang.html`: 합동지방의 세로 이미지 보기, 전체 화면과 설정 숨기기·PNG 저장
- `assets/`: PNG 로고·기존 홈 아이콘·`jungyang-jibang-s25-ultra.png` 합동지방
- `tests/browser_test.py`: 실제 외부 요청을 차단한 브라우저 회귀 검사
- `docs/HISTORY.md`: 변경 이력
- `docs/domain-sangbogi.md`: 명절·대체·자료 호환 규칙
- `CLAUDE.md`, `DESIGN.md`: 기존 디자인 기준과 외부 참고 자료

## 데이터와 일정

- `HOLIDAYS`: 달별 명절, 고정일/택일/절기와 안정적인 저장 id
- `LUNAR`, `DONGJI`: 기존 음력월 시작일·길이 및 동지 날짜표
- `FIXED`, `VARI`, `GIFTS`, `STEPS`, `TIERS`: 초하루 준비 템플릿
- `eventsFor` / `getSelectedEvent`: 초하루와 그 달 명절 목록·선택
- `cycleKey` / `keyNow`: 기존 초하루 키와 새 명절 키
- `MONTH_PLANS`, `loadMonthPlan`, `saveMonthPlan`: 월별 대체 승인. 저장 성공 후에만 화면 적용
- `savePickedDate`: 해당 음력월 범위의 택일, 기존 `sangbogi:picked` 항목 보존
- `completionRecord`: 구형 명절 이름 완료 표시를 기존 초하루에서 읽기 호환

## 저장

- `store`: Supabase / 호스트 스토리지 / localStorage get·set·list
- `LOCAL`, `pending`, `LOCAL_REVISION`, `flush`: 즉시 표시, 원격 항목별 병합, 실패 재시도, 저장 도중 추가된 수정 보존
- `bindCycleWriter`: 체크·출처 등 수정이 작성 당시 상의 키에 저장되도록 연결
- `bindCycleInput`, `CYCLE_INPUTS`, `isEditingList`: 글자를 즉시 로컬 기록에 반영하고, 입력 중인 목록의 DOM·포커스·선택 범위·한글 조합을 저장 완료와 자동 갱신 중에도 유지. 월/행사/손님 전환은 새 화면으로 갱신
- 목록 내부의 포인터 동작이 끝날 때까지 눌린 버튼을 유지하고, Tab으로 이동한 출처 버튼은 같은 상·역할·품목·칸의 버튼으로 포커스를 복원
- `TEXT_HISTORY`, `bufferTextHistory`, `finishTextHistory`: 연속 입력 이력을 항목별로 모아 저장·포커스 이동·다른 수정 전에 확정하여 글자마다 이력이 생기는 것을 방지

## 로그인과 화면

- `initWordmarks`: 가로·세로 PNG 두 파일의 로드와 방향을 확인한 뒤 `<picture>`에 모바일 원본을 연결. 파일 미확보 시 기존 로고 유지

- `FAMILY_CODES`, `showLock`, `verifyFamilyCode`: 가족 PIN 확인
- `isFamily`, `canWrite`: 은호당과 어머니의 준비 권한
- `isAdmin`: 은호당 전용 대체 승인·택일·초기화 권한
- `renderHead`, `renderEventNav`, `renderEventPlan`: 날짜와 행사·대체 상태
- `applyRole`, `render`: 역할/상차림 확정 여부에 따른 노출 및 사적 DOM 정리
- `renderGuestGifts`: 구입처·메모 없이 예물과 보내신 분만 텍스트로 표시
- `loadLog`: 이전 초하루/명절에서 실제 기여자와 예물을 모음
- `renderList`, `renderSang`, `renderSteps`, `renderDone`: 가족 준비 화면
- `RICE_OFFERINGS`, `isFamilyFirstDay`, `renderOfferings`, `offeringPill`: 매달 초하루의 소당·중당·육당·건립 밥공양 체크와 진설 표시
- `preparationCard`: 월별 밥공양·상달 쌀 교체에 사용하는 가족 준비 카드와 접근성 체크 버튼
- `isSangdalFirstDay`, `renderSeasonalPrep`: 정규 음력10월 초하루의 가족 전용 불사단지 쌀 교체 카드. 그 외 화면은 슬롯을 비움
- `BULSA_RICE_ID`: 기존 `cycle.part`에 별도 저장하는 `bulsa-rice` 키. 기존 구매 수량과 차례 단계에는 포함하지 않음
- `renderSheet`: 담당과 변경 이력. 동적 이름·메모는 textContent로 표시
- `askName`: 접속 바꾸기·왼쪽 위 서명에서 이름 입력 첫 화면으로 복귀. 기록과 저장 대기 입력을 보존하고 이름 입력에 포커스

새 명절 품목을 구현할 때 먼저 사용자 규칙을 문서화하고, 그 명절의 별도 저장 키를 사용하세요.

## 중양 전용 준비 (2026-10-20)

- `isJungyang`, `JUNGYANG_ANCESTOR`, `JUNGYANG_OFFERINGS`, `JUNGYANG_PRAYERS`, `renderJungyang`, `renderJungyangGuide`: 가족 전용 기본 7항목·진행안 3개와 국화 음식 선택 안내. `index.html`의 `jungyang-prep`·`jungyang-guide` 슬롯을 사용하고 `renderOfferings`가 중양 전용 네 공양 체크를 표시합니다.
- `JUNGYANG_LEGACY_LABELS`: 제거한 정화수·향과 촛불·과일 권장 체크의 과거 이력 이름을 `partLabelOf`에서 유지합니다. 새 체크 UI는 생성하지 않습니다.
- `JUNGYANG_CHUKMUN`, `jungyangChukmunText`: 두 집안을 함께 모시는 새 축문과 선택 음력 연도의 간지 치환. `jungyang-chukmun`에 텍스트로 표시하고 Blob으로 현재 본문의 TXT 다운로드를 만듭니다.
- `renderJungyangGuide`의 `jungyang-jibang-card`: 합동지방 PNG 미리보기·저장과 `jibang.html` 링크. `jungyang-chukmun-card`는 축문과 저장 버튼입니다. 다른 행사·손님 화면에서는 안내 슬롯을 비웁니다.
- `jibang.html`은 원본 이미지의 비율을 유지하는 `object-fit:contain`으로 표시합니다. Fullscreen API 호출 후 설정을 숨기고 이미지 터치로 다시 열며, 미지원·실패 시 PNG 저장 대안을 안내합니다.
- 중양은 configured 상태지만 초하루 장보기·진설·6단계·18개 진척은 숨기고 DOM을 비웁니다. 완료·예물 기능은 유지합니다.
