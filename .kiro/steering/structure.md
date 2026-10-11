# 코드 구조

## 파일

- `index.html`: 로그인과 가족 암호 입력, 달·행사 탭, 가족 준비/공개 예물 영역, 기록판
- `styles.css`: 로그인, PC 두 열·모바일 한 열, 행사 승인, 준비 항목과 기록판 스타일
- `app.js`: 아래 데이터·일정·저장·화면 로직
- `assets/`: PNG 로고와 기존 홈 아이콘
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
- `bindCycleWriter`: 메모·목록 등 지연 입력을 원래 상의 키에 저장

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
- `isSangdalFirstDay`, `renderSeasonalPrep`: 정규 음력10월 초하루의 가족 전용 불사단지 쌀 교체 카드. 그 외 화면은 슬롯을 비움
- `BULSA_RICE_ID`: 기존 `cycle.part`에 별도 저장하는 `bulsa-rice` 키. 기존 구매 수량과 차례 단계에는 포함하지 않음
- `renderSheet`: 담당과 변경 이력. 동적 이름·메모는 textContent로 표시

새 명절 품목을 구현할 때 먼저 사용자 규칙을 문서화하고, 그 명절의 별도 저장 키를 사용하세요.
