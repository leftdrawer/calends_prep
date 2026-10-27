# 은호당 상차림 — Claude 지침

이 프로젝트의 사실 문서는 `.kiro/steering/`과 `docs/`에 있다. 작업 전에 읽고, 고친 뒤에는 `.kiro/steering/maintenance.md`의 규칙대로 문서를 갱신한다.

@.kiro/steering/product.md
@.kiro/steering/tech.md
@.kiro/steering/structure.md
@.kiro/steering/maintenance.md

## 이 프로젝트의 디자인 기준

기준은 **Apple 휴먼 인터페이스 가이드라인(HIG)** 이다 (2026-10-27 사용자 지시, `C:\AI Projects\AGENTS.md`의 "Web page design"). 이전 Mastercard 계열 `DESIGN.md`는 더 이상 불러오지 않으며 참고용으로만 남아 있다.

- 색: `styles.css`의 `:root` 토큰 이름(`--ink`, `--page`, `--card`, `--brass-*`, `--cinnabar-*` 등)은 그대로 두고 값을 HIG 시스템 색으로 바꿨다. 강조색은 파랑 하나(`--brass-deep`은 글자·링크, `--solid`는 채운 버튼·선택 상태), 경고·구매 표시는 빨강 계열(`--cinnabar-*`). 라이트/다크는 `prefers-color-scheme`으로 자동 전환한다.
- 모양: 회색 바탕 위의 흰 묶음 카드(반경 26, 모바일 22), 알약 버튼·칩, 동그란 체크, 시트 위 모서리 34, 위 막대만 유리 재질(`.top`).
- 글자: 시스템 글꼴 우선(`-apple-system`, `Apple SD Gothic Neo`, Pretendard는 대체). 큰 제목 34, 제목 22, 본문 17, 각주 13, 12px 아래는 쓰지 않는다. 한글이 어절 중간에서 끊기지 않도록 `word-break: keep-all`을 유지한다.
- 누르는 곳은 44px 이상, 포커스 링은 3px 파랑, `prefers-reduced-motion`·`prefers-reduced-transparency`를 따른다.
- 이 변경은 `styles.css` 끝의 "Apple HIG 기반" 구간이 앞선 규칙을 덮어쓰는 방식이다. 새 컴포넌트는 그 구간의 규칙과 맞춘다.
- 정보를 담은 글자에는 `--stone`을 쓰지 않는다. 안내문은 `--ink-2`, 덜 중요한 힌트는 `--ink-3`.
- 축문·기도문의 Gowun Batang(세리프)과 한문 전용 글꼴 `Eunhodang Hanja`는 내용 글꼴이라 그대로 둔다. 붓글씨 서명 PNG는 다크 모드에서만 색을 뒤집어 보여준다.

## 프론트엔드 참고

아래 자료는 세 경우에만 꺼낸다. 새 페이지를 만들 때, 내가 디자인이 별로라고 할 때, 내가 아래 사이트 이름을 직접 말할 때. 작은 수정은 참고하지 말고 그냥 한다.

### 1. 스타일
- styles.refero.design (실제 서비스 2천 곳의 색, 글꼴, 간격을 AI용 DESIGN 파일로 정리한 곳)이나 github.com/VoltAgent/awesome-design-md (브랜드 74곳 모음)에서 제품 성격에 맞는 DESIGN 파일(.md)을 고른다.
- 고른 파일은 프로젝트 루트에 넣고, 프로젝트 CLAUDE.md에서 @로 불러온다.
- 그다음부터 색, 글꼴, 간격은 그 파일을 따른다.

### 2. 컴포넌트
- 21st.dev부터 본다. 21st.dev MCP가 연결돼 있으면 바로 불러 쓴다.
- 코드 복사는 무료 한도가 하루 2개다. MCP를 부르기 전에 무엇을 찾는지 먼저 말한다.
- 그다음 component.gallery에서 같은 컴포넌트를 다른 디자인 시스템은 어떻게 만들었는지 보고 기준을 잡는다.

### 3. 모션
- kinetics.colorion.co에서 효과에 맞는 프롬프트나 React 코드를 가져온다. 튕기는 정도는 조절 가능하다.

### 4. 마무리
- 다 만들었는데 어색하면 impeccable.style의 polish로 다듬고, 과하면 distill로 덜어낸다. 설치는 /plugin marketplace add pbakaus/impeccable.

### 지킬 것
- 프로젝트에 이미 있는 디자인 시스템과 컴포넌트가 먼저다. 바깥 자료는 아직 정해지지 않은 부분만 채운다.
- 필요한 MCP, 스킬, CLI가 없으면 설치할지 먼저 묻는다. 있는 척 흉내 내지 않는다.
- 페이지 내용을 읽지 못하면 멈추고 붙여넣어 달라고 한다. 기억으로 채우지 않는다.
- 바깥 자료를 쓸 때마다 어디서 무엇을 가져와 무엇을 바꿨는지 알린다.
