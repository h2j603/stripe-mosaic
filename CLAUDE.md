# CLAUDE.md — stripe-mosaic

> 클라우드/로컬 세션 공통 컨텍스트.

## 프로젝트

SVG → 보라/갈색 셀 그리드 모자이크 변환 도구. 바닐라 HTML/JS/CSS, 빌드 없음.

- `index.html` + `script.js` + `style.css`
- 단색 SVG 업로드 → 셀 단위 모양 근사, 가장자리 stair-step
- export HTML에는 기본 transition 넣지 않음 (의도된 결정)

## 전역 규칙 (모든 세션 공통)

- 대화·커밋 메시지·코드 주석 모두 **한국어**. 커밋은 명령형.
- 작업은 feature 브랜치 → `main` PR 생성 → 머지까지 완료.
- 디자인: 그림자·글로우·글래스모피즘 금지. 상세 → `.claude/rules/design.md`
- 작동하는 코드를 "개선" 명목으로 구조 바꾸지 않기.
