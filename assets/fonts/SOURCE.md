# Eunhodang Hanja

`eunhodang-hanja.woff`는 은호당 축문의 희귀 한자 `熩`와 봉행자 이름을
기기 기본 글꼴에 의존하지 않고 표시하기 위한 6글자 서브셋입니다.

- 원본: Noto Serif CJK KR Regular 2.003
- 업스트림: <https://github.com/notofonts/noto-cjk>
- 이 작업에서 사용한 원본: 환경에 이미 설치된
  `/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc`의 한국어 글꼴(index 1)
- 원본 SHA-256:
  `5d9c31a059600193c9d7968a998bde886ccdc77e934006ad243b41794c496a7d`
- 원본 저작권: © 2017–2024 Adobe, 원본 패키지의 추가 고지 © 2010–2012 Google Corporation
- 라이선스: SIL Open Font License 1.1. 전문은 [OFL.txt](./OFL.txt)
- 파생 글꼴 이름: **Eunhodang Hanja Regular** (`EunhodangHanja-Regular`)
- 포함 글자: `恩` U+6069, `熩` U+71A9, `堂` U+5802, `金` U+91D1,
  `炯` U+70AF, `錫` U+932B
- 형식·크기: WOFF, 5,932 bytes
- 서브셋 SHA-256:
  `955e5087410acbdea62bf0725352fad8f30f42c921db8cd1f3bb263e67d44b03`

2026-10-20에 설치된 fontTools로 필요한 문자만 추출하고 파생 글꼴의 이름을
변경했습니다. 새 프로그램 설치나 폰트 다운로드 없이 제작했습니다. 저장 후
WOFF를 다시 열어 6개 코드포인트가 모두 `.notdef`가 아닌 실제 글리프에 연결되는지
확인했습니다. Google Fonts가 제공하는 작은 웹폰트 서브셋의 문자 범위와 전체
Noto CJK 글꼴의 문자 범위는 다릅니다.

원본 글꼴과 검증 메타데이터는 체크아웃 밖의
`/workspace/scratch/eunhodang-hanja-font-2026-10-20/`에 보관했습니다.
서브셋도 원본과 같은 OFL 1.1로 배포하며 저작권 고지와 라이선스를 함께 유지합니다.
