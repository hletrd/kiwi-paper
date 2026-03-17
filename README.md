<div align="center">

# 🥝 kiwi-paper

**논문이랑 전공책, 나무위키처럼 읽자.**

학술 PDF를 넣으면 ~~취소선 드립~~과 여담이 가득한<br>
나무위키 스타일 마크다운 문서가 나옵니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill-blueviolet)](https://claude.com/claude-code)

</div>

---

## 이게 뭔데

대학원생이라면 공감할 겁니다. 30페이지짜리 논문 앞에 앉아서 졸음과 싸우는 그 기분.

kiwi-paper는 그 논문을 나무위키 스타일로 바꿔줍니다. 학술적 정확성은 그대로 유지하면서, 읽는 재미를 더합니다. ~~취소선~~으로 본심을 드러내고, 각주에 드립을 숨기고, 여담 섹션에서 저자의 뒷이야기를 풀어놓는 — 그런 문서를 만들어줍니다.

"Attention Is All You Need"가 이렇게 됩니다:

> Transformer는 기존의 순환 신경망(RNN)이나 합성곱 신경망(CNN) 없이 오직 **어텐션 메커니즘**만으로 시퀀스 변환 작업을 수행하는 모델이다. 당시 기계 번역 분야의 최강자였던 LSTM 기반 seq2seq 모델들을 ~~박살내고~~ 압도적인 성능으로 제쳤으며... [^1]
>
> [^1]: 논문 저자들은 지금쯤 인용 알림 끄는 법을 배웠을 것이다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| **~~취소선~~ 유머** | 학술적 사실 옆에 솔직한 한마디를 취소선으로 |
| **3단계 파이프라인** | 초안 → 다듬기 → 휴머나이즈. AI 티 없는 자연스러운 결과물 |
| **계층적 구조** | 논문/교과서 구조에 맞춘 체계적 섹션 분류 |
| **각주 드립** | 출처도 챙기고, 숨은 유머도 챙기고 |
| **여담 섹션** | 논문 뒤에 숨겨진 뒷이야기, 트리비아, 밈 |
| **외부 링크** | 관련 자료, 영상, 위키 링크를 자동으로 보강 |
| **휴머나이즈** | 번역체·AI체를 잡아내고 자연스러운 한국어로 다듬기 |

## 설치

```bash
# 방법 1: install 스크립트
git clone https://github.com/your-username/kiwi-paper.git
cd kiwi-paper
./install.sh

# 방법 2: 직접 복사
mkdir -p ~/.claude/skills/kiwi-paper
cp SKILL.md ~/.claude/skills/kiwi-paper/
```

## 사용법

```bash
# 논문 하나
/kiwi-paper path/to/paper.pdf

# 여러 파일
/kiwi-paper paper1.pdf paper2.pdf

# 출력 파일명 지정
/kiwi-paper paper.pdf --output output.md
```

## 변환 결과물은 어떤 모습?

`examples/` 디렉토리에서 실제 변환 예시를 확인할 수 있습니다:

- [`attention-is-all-you-need.md`](examples/attention-is-all-you-need.md) — Transformer 논문 변환 예시

변환된 문서에는 다음이 포함됩니다:

- 계층적 섹션 구조 (개요 → 상세 → 의의 → 여담)
- ~~취소선~~을 활용한 유머 (섹션당 2-4개)
- `[^각주]`로 출처와 드립을 동시에
- 마크다운 표로 정리된 비교 데이터
- LaTeX 수식 + 직관적 설명
- 실제 동작하는 외부 링크 5개 이상

## 3단계 파이프라인

kiwi-paper의 핵심은 단순 변환이 아니라 **3단계 정제 과정**에 있습니다.

### 1단계: 초안 (Draft)
PDF를 읽고 나무위키 스타일로 첫 번째 초안을 작성합니다. 구조를 잡고, 유머를 배치하고, 내용을 풀어씁니다.

### 2단계: 다듬기 (Refine)
초안을 다시 읽으며 구조 점검, 유머 밸런스 조정, 외부 링크 보강, 빠진 내용 추가.

### 3단계: 휴머나이즈 (Humanize)
가장 중요한 단계. AI가 쓴 티를 완전히 지웁니다:
- 번역체 문장 → 자연스러운 한국어
- 기계적 나열 → 유기적 흐름
- 과잉 수식어 → 구체적 서술
- 동어반복 → 군더더기 제거

## 호환성

이 프로젝트는 다음 AI 코딩 도구에서 바로 사용할 수 있도록 설계되었습니다:

| 도구 | 지원 |
|------|------|
| [Claude Code](https://claude.com/claude-code) | `/kiwi-paper` 스킬로 직접 실행 |
| [OpenCode](https://github.com/nicepkg/OpenCode) | `AGENTS.md` 참고하여 작업 |
| [Codex](https://github.com/openai/codex) | `AGENTS.md` 참고하여 작업 |

## 기여

버그 리포트, 새 예제 추가, 스킬 개선 — 뭐든 환영합니다.

1. 이 저장소를 포크합니다
2. 새 브랜치를 만듭니다 (`feat/my-feature`)
3. 변경사항을 커밋합니다
4. PR을 올립니다

## 라이선스

[MIT](LICENSE)
