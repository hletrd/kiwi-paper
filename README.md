<div align="center">

# 🥝 kiwi-paper

**논문이랑 전공책, 나무위키처럼 읽자.**

학술 PDF나 URL을 넣으면 ~~취소선 드립~~과 여담이 가득한
나무위키 스타일 문서가 나옵니다. HTML로도 뽑아줍니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill-blueviolet)](https://claude.com/claude-code)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933)](https://nodejs.org/)

</div>

---

## 이게 뭔데

30페이지짜리 논문 앞에서 졸음과 싸우고 있다면, kiwi-paper가 그 논문을 나무위키 스타일로 바꿔줍니다.
학술적 정확성은 그대로, 읽는 재미는 두 배.

> Transformer는 기존의 순환 신경망(RNN)이나 합성곱 신경망(CNN) 없이 오직 **어텐션 메커니즘**만으로 시퀀스 변환 작업을 수행하는 모델이다. 당시 기계 번역 분야의 최강자였던 LSTM 기반 seq2seq 모델들을 ~~박살내고~~ 압도적인 성능으로 제쳤으며... [^1]
>
> [^1]: 논문 저자들은 지금쯤 인용 알림 끄는 법을 배웠을 것이다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| **4단계 파이프라인** | 초안 → 다듬기 → 휴머나이즈 → HTML 렌더링 |
| **~~취소선~~ 유머** | 학술적 사실 옆에 솔직한 한마디 |
| **HTML 렌더링** | 다크/라이트 모드, 목차, KaTeX, Shiki 코드 하이라이팅 |
| **다양한 입력** | PDF, URL (arXiv, 뉴스, 블로그), 텍스트 파일 |
| **대화형 UX** | 입력 소스 → 출력 형식 → 저장 경로를 단계별로 선택 |
| **휴머나이즈** | 번역체·AI체 제거, 자연스러운 한국어로 다듬기 |
| **각주 & 여담** | 출처도 챙기고, 드립도 숨기고, 뒷이야기도 풀고 |

## 설치

AI 에이전트(Claude Code 등)에게 이렇게 말하면 됩니다:

```
kiwi-paper를 설치해줘.
저장소: https://github.com/hletrd/kiwi-paper
```

에이전트가 저장소 클론 → `install.sh` 실행 → 스킬 등록 + 렌더러 설치를 자동으로 처리합니다.

> **참고**: HTML 렌더링에는 Node.js >= 20이 필요합니다. 없으면 마크다운만 생성됩니다.

<details>
<summary>수동 설치 (CLI)</summary>

```bash
git clone https://github.com/hletrd/kiwi-paper.git
cd kiwi-paper
./install.sh
```

`install.sh`는 두 가지를 합니다:
1. `SKILL.md`를 `~/.claude/skills/kiwi-paper/`에 복사
2. `renderer/` 디렉토리에서 `npm install` (Node.js >= 20일 때)

스킬만 필요하다면:
```bash
mkdir -p ~/.claude/skills/kiwi-paper
cp SKILL.md ~/.claude/skills/kiwi-paper/
```

</details>

## 사용법

```bash
# 논문 PDF
/kiwi-paper path/to/paper.pdf

# URL — arXiv, 뉴스, 블로그, 웹페이지 등
/kiwi-paper https://arxiv.org/abs/2406.12345

# 여러 입력 혼합
/kiwi-paper paper.pdf https://example.com/article

# 출력 파일명 지정
/kiwi-paper paper.pdf --output my_doc.md

# 대화형 모드 — 인자 없이 호출
/kiwi-paper
```

대화형 모드에서는 입력 소스, 출력 형식(HTML / HTML + 마크다운 / 마크다운만), 저장 경로를 단계별로 선택합니다. 기본 출력은 HTML입니다.

## 4단계 파이프라인

| 단계 | 이름 | 하는 일 |
|:---:|------|--------|
| 1 | **초안** (Draft) | PDF/URL을 읽고 나무위키 스타일 마크다운 초안 작성 |
| 2 | **다듬기** (Refine) | 구조 점검, 유머 밸런스, 외부 링크 보강, 빠진 내용 추가 |
| 3 | **휴머나이즈** (Humanize) | 번역체·AI체 제거, 자연스러운 한국어로 최종 다듬기 |
| 4 | **렌더링** (Render) | 마크다운 → HTML 변환 (선택) |

3단계가 핵심입니다. 번역체 문장, 기계적 나열, 과잉 수식어, 동어반복을 잡아내고 사람이 쓴 것 같은 자연스러운 한국어로 바꿉니다.

## HTML 렌더링

4단계에서 생성되는 HTML의 기능:

- **테마**: 라이트 / 다크 / 시스템 자동 (Tokyo Night 계열 다크)
- **목차**: 스크롤 추적 사이드바, 모바일에서는 햄버거 메뉴
- **수식**: KaTeX 서버사이드 렌더링 (클라이언트 JS 불필요)
- **코드**: Shiki 듀얼 테마 하이라이팅 (VS Code 수준)
- **네비게이션**: 여러 문서 렌더링 시 prev/next + 인덱스 페이지
- **타이포그래피**: Pretendard 폰트, `word-break: keep-all`, 인쇄 최적화

<details>
<summary>렌더러 직접 사용 (CLI)</summary>

```bash
cd renderer

# 단일 파일
node src/render.mjs -i ../examples/attention-is-all-you-need.md -o ../dist

# 디렉토리 → index.html + 개별 문서
node src/render.mjs -i ../examples/ -o ../dist

# URL 입력
node src/render.mjs -i https://example.com/doc.md -o ../dist

# 옵션
#   -t, --title <str>   문서 제목
#   --no-toc             목차 비활성화
#   --single             인덱스 페이지 생략
```

</details>

## 예제

[`examples/`](examples/) 디렉토리에서 변환 예시를 확인할 수 있습니다:

- [`attention-is-all-you-need.md`](examples/attention-is-all-you-need.md) — Transformer 논문

변환 결과물에 포함되는 것: 계층적 섹션 구조, ~~취소선~~ 유머, 각주(출처 + 드립), 마크다운 표, LaTeX 수식, 외부 링크 5개 이상, 여담 섹션.

## 호환성

| 도구 | 방식 |
|------|------|
| [Claude Code](https://claude.com/claude-code) | `/kiwi-paper` 스킬로 직접 실행 |
| [OpenCode](https://github.com/nicepkg/OpenCode) | `AGENTS.md` 참고 |
| [Codex](https://github.com/openai/codex) | `AGENTS.md` 참고 |

## 기여

버그 리포트, 새 예제, 스킬 개선 — 뭐든 환영합니다.

1. Fork → 2. Branch (`feat/my-feature`) → 3. Commit → 4. PR

## 라이선스

[MIT](LICENSE)
