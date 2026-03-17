# kiwi-paper — OpenCode Instructions

이 저장소는 기술 문서를 나무위키 스타일로 변환하는 도구입니다.

## 사용법

사용자가 kiwi-paper 변환을 요청하면 `SKILL.md` 파일의 지시사항을 따르세요.

핵심 지시사항은 `SKILL.md`에 있습니다. 반드시 읽고 4단계 파이프라인을 따르세요.

### 4단계 파이프라인

1. **초안 작성** — 입력 문서를 나무위키 스타일 마크다운으로 변환
2. **다듬기** — 구조, 유머, 링크 보강
3. **휴머나이즈** — AI 티 제거, 자연스러운 한국어
4. **HTML 렌더링** — `node renderer/src/render.mjs -i <file> -o <dir>`

### 문서 유형 자동 감지

입력 내용에서 문서 유형을 감지하세요:
- arXiv, DOI, Abstract, Related Work → 학술 논문
- RFC, MUST, SHALL, specification → 기술 명세서
- HTTP 메서드, 엔드포인트, 요청/응답 → API 문서
- Getting Started, Installation, Quick Start → 사용설명서

### 파일 구조

- `SKILL.md` — 핵심 변환 규칙 (반드시 읽을 것)
- `AGENTS.md` — 에이전트 가이드
- `renderer/` — HTML 렌더러 (Node.js >= 20)
- `examples/` — 변환 예제
