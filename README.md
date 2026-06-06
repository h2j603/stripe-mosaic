# stripe-mosaic

SVG → 보라/갈색 셀 그리드 모자이크.

단색 SVG를 업로드하면 셀 단위로 모양을 근사합니다. 가장자리는 stair-step.
결과는 HTML(`<div>` grid)로 export하면 어디든 박을 수 있고 `:hover` / `transition`으로
애니메이션 자유.

🛠 https://h2j603.github.io/stripe-mosaic/

## 사용

1. SVG 업로드 (단색 + 투명 권장 — alpha 0이 빈 영역)
2. 셀 크기 슬라이더 (3–40px)
3. 알파 임계값 — 어디까지를 "안"으로 칠 건지
4. HTML 복사 또는 파일 다운로드

색은 보라 `#a966ff` / 갈색 `#775d4f` (hyuk.xyz 띠 컬러).
