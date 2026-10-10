# 은호당 상차림 — Claude 지침

이 프로젝트의 사실 문서는 `.kiro/steering/`과 `docs/`에 있다. 작업 전에 읽고, 고친 뒤에는 `.kiro/steering/maintenance.md`의 규칙대로 문서를 갱신한다.

@.kiro/steering/product.md
@.kiro/steering/tech.md
@.kiro/steering/structure.md
@.kiro/steering/maintenance.md

## 이 프로젝트의 디자인 기준

@DESIGN.md

- 먼저 따를 것은 `index.html`의 `:root` 토큰(다섯 빛깔, 지면, 글자 색, `--shadow`, `--r`)과 이미 있는 컴포넌트다. 색, 글꼴(Pretendard + Gowun Batang), 모서리 둥글기, 그림자는 이미 정해져 있으니 DESIGN.md로 덮어쓰지 않는다.
- DESIGN.md(Mastercard 분석본)에서 가져오는 것은 아직 정하지 않은 부분뿐이다. 지금 쓰는 것은 8장 Touch Targets(누르는 곳은 40px 아래로 줄이지 않음)와 7장의 "희미한 크림-회색 글자는 덜 중요한 내용에만" 원칙이다.
- DESIGN.md의 "한 글꼴만 쓴다", "세리프 금지", 주황 계열 색, 원형 사진 같은 항목은 이 앱과 맞지 않으니 따르지 않는다.
- 정보를 담은 글자에는 `--stone`(한지 위 대비 1.7:1)을 쓰지 않는다. 안내문은 `--ink-2`, 덜 중요한 힌트는 `--ink-3`.

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
