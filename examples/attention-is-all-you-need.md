# Attention Is All You Need

**Attention Is All You Need**는 2017년 Google Brain 및 Google Research 소속 연구자 8명이 발표한 논문으로[^1], 현대 자연어 처리(NLP)의 판도를 완전히 뒤바꾼 Transformer 아키텍처를 제안한다. 제목부터가 심상치 않은데, 직역하면 "어텐션이 전부다"이며 ~~실제로도 전부가 되어버렸다~~. 이 논문 하나로 RNN 계열 모델들은 역사의 뒤안길로 사라지기 시작했고, GPT, BERT, T5 등 현재 우리가 아는 거의 모든 대형 언어 모델의 조상이 탄생했다.

- **원제**: Attention Is All You Need
- **저자**: Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin
- **발표**: NeurIPS 2017
- **링크**: [arXiv:1706.03762](https://arxiv.org/abs/1706.03762)

---

## 개요

Transformer는 기존의 순환 신경망(RNN)이나 합성곱 신경망(CNN) 없이 오직 **어텐션 메커니즘**만으로 시퀀스 변환 작업을 수행하는 모델이다. 당시 기계 번역 분야의 최강자였던 LSTM 기반 seq2seq 모델들을 ~~박살내고~~ 압도적인 성능으로 제쳤으며, 학습 속도 또한 비교할 수 없을 만큼 빨랐다.

논문 발표 당시에는 "어텐션만으로 된다고?" 하는 반응이 많았으나, 결과적으로 이 논문은 NLP 역사상 가장 많이 인용된 논문 중 하나가 되었다(2025년 기준 인용 수 10만 건 초과).[^2] ~~논문 저자들은 지금쯤 인용 알림 끄는 법을 배웠을 것이다~~.

---

## 등장 배경

### 기존 모델의 한계

2017년 이전 NLP의 주류는 LSTM(Long Short-Term Memory)과 GRU(Gated Recurrent Unit) 기반의 순환 신경망이었다. 이들은 시퀀스를 순서대로 처리하는 구조라 본질적으로 **병렬화가 불가능**했고, 문장이 길어질수록 앞부분의 정보가 점점 희미해지는 **장기 의존성(long-range dependency) 문제**를 안고 있었다.

쉽게 말하면, "나는 어제 집에서 밥을 먹고 숙제를 하고 책을 읽고 잠들었는데 ~~그래서 피곤한~~ 오늘도 힘들다"는 문장에서 '나는'과 '힘들다'의 관계를 파악하기가 점점 어려워지는 것이다.[^3]

어텐션 메커니즘은 seq2seq 모델의 보조 장치로 이미 사용되고 있었지만, 이 논문은 그것을 아예 **메인 요리**로 격상시켰다.

### 병렬화의 필요성

GPU는 병렬 계산에 특화된 하드웨어인데, RNN은 타임스텝을 순서대로 처리해야 하니 GPU의 진짜 능력을 쓰지 못했다. ~~GPU 입장에서는 억울한 노릇이다~~. Transformer는 시퀀스의 모든 위치를 동시에 처리할 수 있어 GPU를 제대로 활용하고, 덕분에 훨씬 빠른 학습이 가능해졌다.

---

## 모델 구조

Transformer는 **인코더-디코더(Encoder-Decoder)** 구조를 채택한다. 인코더는 입력 시퀀스를 이해하고, 디코더는 그 이해를 바탕으로 출력 시퀀스를 생성한다. 각각 6개의 동일한 레이어를 쌓아 구성된다.

```
입력 → [인코더 ×6] → [디코더 ×6] → 출력
```

### Scaled Dot-Product Attention

어텐션의 핵심은 세 가지 행렬 Query(Q), Key(K), Value(V)다.[^4] 직관적으로 설명하면:

- **Query**: "나는 지금 무엇을 찾고 있나?"
- **Key**: "나는 어떤 정보를 갖고 있나?"
- **Value**: "실제 정보의 내용은?"

수식으로는 다음과 같다:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

$\sqrt{d_k}$로 나누는 이유는 차원이 커질수록 내적값이 커져 softmax 기울기가 소실되기 때문이다. ~~요컨대 스케일링을 안 하면 gradient가 죽는다~~.

### Multi-Head Attention

단일 어텐션으로는 표현력이 부족하다. 그래서 어텐션을 **h개(기본값: 8)** 병렬로 수행하고 결과를 합치는 Multi-Head Attention을 도입한다. 각 헤드는 서로 다른 관점에서 관계를 포착한다.

| 헤드 번호 | 포착하는 것 (이론상) | 포착하는 것 (현실) |
|-----------|----------------------|---------------------|
| Head 1 | 구문적 의존 관계 | 모름, 블랙박스 |
| Head 2 | 장거리 의존성 | 모름, 블랙박스 |
| Head 3 | 의미적 유사성 | 모름, 블랙박스 |
| Head 8 | 위치 정보 | 모름, 블랙박스 |

~~어텐션 헤드가 실제로 뭘 보는지는 해석 가능성(Interpretability) 연구의 영원한 숙제다~~.[^5]

### Positional Encoding

Transformer는 순서를 모른다. RNN은 순서대로 처리하니 위치 정보가 내재되지만, Transformer는 모든 토큰을 동시에 보므로 "이게 첫 번째 단어인지 마지막 단어인지" 알 방법이 없다. 해결책으로 **사인/코사인 함수 기반 위치 인코딩**을 임베딩에 더한다.

$$PE_{(pos, 2i)} = \sin(pos / 10000^{2i/d_{model}})$$
$$PE_{(pos, 2i+1)} = \cos(pos / 10000^{2i/d_{model}})$$

왜 하필 사인/코사인이냐고? ~~저자들이 좋아해서~~[^6] 상대 위치를 선형 변환으로 표현할 수 있고, 학습 때보다 긴 시퀀스에도 일반화가 잘 되기 때문이다.

### Feed-Forward Network와 기타 구성 요소

각 어텐션 레이어 뒤에는 위치별(position-wise) **Feed-Forward Network**가 붙는다. Add & Norm(잔차 연결 + 레이어 정규화)으로 학습 안정성을 높인다. ~~이쯤 되면 건물을 짓는 게 아니라 벽돌을 계속 쌓는 느낌이다~~.

---

## 성능 및 영향

### 기계 번역 성능

| 모델 | EN→DE BLEU | EN→FR BLEU | 학습 비용 |
|------|-----------|-----------|----------|
| LSTM + Attention (당시 최강) | 26.0 | 41.0 | 매우 높음 |
| **Transformer (Base)** | **27.3** | **38.1** | 낮음 |
| **Transformer (Big)** | **28.4** | **41.8** | 중간 |

Transformer Big은 WMT 2014 영-독 번역에서 당시 최고 성능을 경신했으며, 훈련 비용은 기존 앙상블 모델 대비 훨씬 저렴했다.[^7]

### 후속 연구에 미친 영향

이 논문 이후 NLP는 그야말로 폭발적으로 성장했다:

- **BERT** (2018): 인코더만 사용, 양방향 사전 학습
- **GPT 시리즈** (2018~현재): 디코더만 사용, 언어 생성에 특화
- **T5** (2019): 모든 NLP 태스크를 텍스트-투-텍스트로 통일
- **Vision Transformer (ViT)** (2020): 이미지에도 Transformer 적용

~~결국 "Attention is All You Need"는 예언서였다~~. 컴퓨터 비전, 음성 인식, 단백질 구조 예측(AlphaFold 2)까지 Transformer가 침투하지 않은 분야를 찾기가 더 어렵다.[^8]

---

## 여담

- 논문 저자 8명 중 상당수가 이후 Google을 떠나 OpenAI, Cohere, Adept 등 AI 스타트업을 창업하거나 합류했다. 이 논문 하나로 AI 업계의 지형이 바뀐 셈. ~~저자들은 논문 쓰면서 본인들이 이렇게 될 줄 알았을까~~.

- "Attention is All You Need"라는 제목은 비틀즈의 노래 "All You Need Is Love"에서 영감을 받았다는 설이 있다. ~~그게 맞다면 비틀즈도 딥러닝에 기여한 셈이다~~.

- 논문의 Figure 1에 나오는 Transformer 아키텍처 그림은 NLP 논문 역사상 가장 많이 복사-붙여넣기된 그림 중 하나다. 슬라이드에서 이 그림을 본 적 없는 NLP 연구자는 없다고 해도 과언이 아니다.

- 이 논문이 나온 2017년에는 Transformer가 이렇게 범용적으로 쓰일 거라고 예상한 사람이 많지 않았다. 당시 제목도 "The Transformer"가 아니라 그냥 논문 제목이 아키텍처 이름처럼 굳어버린 케이스다.

- Self-Attention의 계산 복잡도는 시퀀스 길이 $n$에 대해 $O(n^2)$이다. 문서가 길어질수록 메모리와 연산량이 제곱으로 증가한다. 이 문제를 해결하려는 "Efficient Transformer" 연구가 수십 편 쏟아졌는데, ~~결국 그냥 GPU를 더 사는 게 답이라는 결론이 나오는 경우가 많다~~.

---

## 참고 문헌 및 외부 링크

- [arXiv:1706.03762 - Attention Is All You Need](https://arxiv.org/abs/1706.03762) - 원본 논문
- [Wikipedia: Transformer (deep learning architecture)](https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture))
- [The Illustrated Transformer - Jay Alammar](https://jalammar.github.io/illustrated-transformer/) - 시각화 설명의 정수
- [Annotated Transformer - Harvard NLP](https://nlp.seas.harvard.edu/2018/04/03/attention.html) - 코드와 함께 보는 논문
- [NeurIPS 2017 발표 영상](https://www.youtube.com/watch?v=rBCqOTEfxvg)

---

[^1]: Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., & Polosukhin, I. (2017). Attention is all you need. *Advances in Neural Information Processing Systems*, 30.

[^2]: Google Scholar 기준. 인용 수는 계속 증가 중이므로 이 문서를 읽는 시점에는 더 많을 것이다. 아마도.

[^3]: 언어학에서는 이를 "garden-path sentence" 문제와 연결짓기도 한다. 뇌도 마찬가지로 긴 문장에서 헷갈린다.

[^4]: Q, K, V는 입력 임베딩에 서로 다른 학습 가능한 가중치 행렬을 곱해서 얻는다. 즉 같은 입력에서 세 개의 서로 다른 표현을 만드는 것이다.

[^5]: Attention is not Explanation (Jain & Wallace, 2019), Attention is not not Explanation (Wiegreffe & Pinter, 2019)처럼 어텐션 해석 가능성을 두고 논문들이 싸우기도 했다. 제목부터 서로 반박하는 재미있는 케이스.

[^6]: 실제 이유는 주석에 설명되어 있다. 사인/코사인을 쓰면 임의의 고정된 오프셋 $k$에 대해 $PE_{pos+k}$를 $PE_{pos}$의 선형 함수로 표현할 수 있다.

[^7]: 논문 Table 2, 3 참조. FLOP 기준으로 당시 최고 모델 대비 약 1/8 수준의 학습 비용이었다.

[^8]: AlphaFold 2 (Jumper et al., 2021)는 단백질 구조 예측에 Transformer 기반 아키텍처를 사용해 노벨 화학상(2024)의 주인공이 되었다. 딥러닝이 노벨상을 받는 시대가 왔다.
