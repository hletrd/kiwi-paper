# 그림과 표 수집

SKILL.md "리소스 및 첨부파일 처리"의 세부 절차입니다. 초안을 쓰기 전에 읽고, 초안을 쓰면서 Step 1~5를 따릅니다.

## PDF/arXiv 이미지 적극 추출 (가장 중요!)

**PDF에서 그림이 보이면 반드시 아래 절차를 따른다. 건너뛰지 않는다.**

### Step 1: PDF 읽으면서 모든 Figure/Table 목록 만들기

`Read` 도구로 PDF를 읽을 때, 보이는 모든 그림/표를 기록한다:
```
Figure 1: 시스템 아키텍처 다이어그램
Figure 2: 실험 결과 그래프
Table 1: 모델 비교표
...
```

### Step 2: arXiv 논문이면 ar5iv HTML 버전에서 이미지 URL 추출

arXiv 논문(arxiv.org/abs/XXXX.XXXXX)이면:

1. **ar5iv HTML 버전 확인**: `WebFetch`로 `https://ar5iv.labs.arxiv.org/html/XXXX.XXXXX` 접속
2. HTML에서 `<img>` 태그의 `src` 속성을 추출 — 보통 `extracted/` 경로에 PNG/SVG 파일이 있음
3. 각 이미지 URL을 마크다운에 삽입: `![Figure 1](https://ar5iv.labs.arxiv.org/html/XXXX.XXXXX/extracted/xxx/fig1.png)`

ar5iv가 아직 처리 안 된 논문이면 Step 3으로.

### Step 3: WebSearch로 그림 찾기

각 Figure마다 **반드시** `WebSearch`를 실행한다:

```
WebSearch: "논문제목" figure 1
WebSearch: "논문제목" architecture diagram
WebSearch: "논문제목" arxiv figure
WebSearch: arxiv XXXX.XXXXX figure
WebSearch: "논문제목" blog explanation  (해설 블로그에 그림 있는 경우 많음)
WebSearch: "논문제목" site:medium.com OR site:towardsdatascience.com
WebSearch: "논문제목" site:github.com  (GitHub README에 그림 있는 경우)
```

검색 결과에서 이미지 URL을 찾으면 `WebFetch`로 해당 페이지를 확인하고, `<img>` 태그에서 실제 이미지 URL을 추출해서 마크다운에 삽입한다.

### Step 4: 그래도 없으면 — 대체 전략

1. **논문의 GitHub 저장소**: 많은 논문이 GitHub에 코드+그림을 공개함. `WebSearch: "논문제목" github`
2. **발표 슬라이드**: `WebSearch: "논문제목" slides OR presentation`
3. **트위터/X 스레드**: 저자가 논문 소개하면서 그림 공유하는 경우 많음
4. **최후의 수단**: 그림을 텍스트로 상세히 묘사 + ASCII 아트 + 원문 참조 안내

```markdown
> **[그림 1]** 시스템 아키텍처 (원문 Figure 1 참조)
>
> 시스템은 크게 3개 모듈로 구성된다:
> - 입력 모듈: 센서 데이터를 받아 전처리
> - 처리 모듈: 경로 계획 및 장애물 회피
> - 출력 모듈: 모터 제어 신호 생성
>
> ~~직접 그리고 싶지만 ASCII 아트의 한계가 있다~~
```

**절대 하면 안 되는 것**: 그림이 있었는데 "그림은 원문을 참조하세요"로 넘어가기. 최소한 상세 묘사는 해야 한다.

### Step 5: 표(Table) 재현

원본의 모든 표를 마크다운 표로 **정확히** 재현한다. 숫자, 단위, 볼드 하나 틀리지 않게.

## URL 입력 이미지 수집

- 렌더러가 `<img>`, `<figure>`, `<picture>` 태그를 자동 다운로드
- 렌더러가 못 잡는 이미지가 있으면 직접 `WebFetch`로 페이지를 확인하고 누락된 이미지 URL을 마크다운에 추가
- JavaScript로 로딩되는 이미지(lazy load 등)는 직접 URL을 찾아서 삽입

## 이미지가 없는 문서에도 그림 추가

원본에 그림이 아예 없더라도, 내용 이해에 도움이 되는 그림을 **적극적으로 찾아서 추가**:

- **학술 논문**: 해설 블로그(Illustrated Transformer 등), 발표 슬라이드, 리뷰 글에서 다이어그램 검색
- **기술 스펙**: 프로토콜 흐름도, 시퀀스 다이어그램을 공개 자료에서 검색
- **API 문서**: 아키텍처 다이어그램, 인증 플로우 그림 검색
- **제품 매뉴얼**: 공식 사이트 스크린샷, 제품 이미지 검색
- **뉴스/기사**: 관련 인물 사진, 제품 이미지, 로고 등 검색

검색 패턴:
```
WebSearch: "논문/제품명" + diagram / architecture / figure / screenshot / infographic
WebSearch: "논문/제품명" + site:github.com / site:medium.com / site:towardsdatascience.com
```

## 이미지 캡션 규칙

```markdown
![Transformer 아키텍처](https://example.com/transformer.png)
> **[그림 1]** Transformer의 전체 아키텍처. ~~이 그림 한 장이 1000편의 논문을 낳았다~~ (출처: [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/))
```

캡션 필수 요소:
- `> **[그림 N]**` 번호 매기기
- 그림 설명 한 줄
- ~~취소선~~ 유머 (적절한 경우)
- 출처 링크 (외부에서 가져온 경우 **반드시**)

## 이미지 삽입 위치

- 관련 섹션의 **첫 문단 바로 아래**에 배치
- 본문에서 "아래 [그림 N] 참조" 식으로 반드시 언급
- 한 섹션에 그림이 여러 개면 설명 흐름에 맞게 분산 배치

## 최소 이미지 기준

| 문서 유형 | 최소 이미지 수 |
|----------|-------------|
| 학술 논문 | 원본 Figure 수 이상 |
| 기술 스펙 | 3개 이상 (흐름도, 구조도 등) |
| API 문서 | 2개 이상 (아키텍처, 인증 플로우 등) |
| 사용설명서 | 5개 이상 (스크린샷, UI 등) |
| 블로그 포스트 | 원본 이미지 수 이상 |
| 기타 | 최소 1개 |

## 기타 리소스

- **표/차트**: 마크다운 표로 정확히 재구성, 복잡한 경우 이미지로 보완
- **수식 이미지**: LaTeX로 재작성 (`$$...$$`)
- **코드 스크린샷**: 텍스트 코드 블록으로 재작성
- **동영상/GIF**: 썸네일 이미지 + 원본 링크 제공
