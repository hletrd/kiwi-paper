# kiwi-paper — Gemini CLI Instructions

이 저장소는 기술 문서를 나무위키 스타일로 변환하는 도구입니다.

## 사용법

사용자가 kiwi-paper 변환을 요청하면 `SKILL.md` 파일의 지시사항을 따르세요.

```
# 핵심 지시사항은 SKILL.md에 있습니다.
# 반드시 SKILL.md를 읽고 그 안의 4단계 파이프라인을 따르세요:
# 1단계: 초안 작성 → 2단계: 다듬기 → 3단계: 휴머나이즈 → 4단계: HTML 렌더링
```

## 워크플로우

1. 사용자 입력을 받습니다 (PDF 경로, URL, 텍스트 파일)
2. `SKILL.md`를 읽어 변환 규칙을 확인합니다
3. 4단계 파이프라인을 순서대로 실행합니다
4. HTML 렌더링이 필요하면: `node renderer/src/render.mjs -i <file> -o <dir>`

## 지원 문서 유형

- 학술 논문 (arXiv, IEEE, ACM 등)
- 기술 명세서/스펙 (RFC, W3C, 프로토콜)
- API 문서 (REST API, SDK, 라이브러리)
- 사용설명서/가이드 (매뉴얼, 튜토리얼)

## 파일 구조

- `SKILL.md` — 핵심 변환 규칙 및 파이프라인 (반드시 읽을 것)
- `AGENTS.md` — 에이전트 가이드
- `renderer/` — Markdown → HTML 렌더러 (Node.js >= 20)
- `examples/` — 변환 예제
