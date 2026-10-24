<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>OpenQuantum — 함께 만드는 신뢰할 수 있는 양자 연구 AI.</strong><br /><sub>양자 연구의 전문 지식을 하나의 OpenQuantum에</sub></p>

**Desktop 0.8.5 안내:** macOS Apple Silicon용 독립 OpenQuantum 앱은 DSH Desktop 2.0.0 / Harness 0.1.0-rc.6의 간결한 사용 환경으로 돌아갑니다. 화면 언어는 우선 중국어와 영어만 지원하며, 기존 번역과 README는 보존합니다. 아래의 0.8.4 설명은 이전 릴리스에 관한 기록입니다. 최신 설치 방법과 서명 관련 제약은 [설치 안내](../DESKTOP_INSTALLERS.md)를 확인하세요. 공개된 Codex 플러그인 버전은 0.8.4입니다.

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

<p align="center">
  <a href="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml"><img src="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml/badge.svg" alt="CI 상태" /></a>
  <a href="../../THIRD_PARTY_NOTICES.md"><img src="https://img.shields.io/badge/licenses-MIT%20%2B%20component%20licenses-111111.svg" alt="MIT 및 구성 요소별 라이선스" /></a>
  <img src="https://img.shields.io/badge/Node.js-24%2B-3c873a.svg" alt="Node.js 24 이상" />
</p>

OpenQuantum은 오픈 소스로 공개되고 공동 개발에 열려 있는 양자 연구 AI 플랫폼입니다. 오픈 소스 커뮤니티의 소프트웨어, 알고리즘과 공개 연구 성과를 연결하여 AI가 연구 문제를 분석하고, 방법을 선택하고, 계산을 실행하고, 결과를 확인하도록 돕습니다. 함께 쌓아 온 전문 지식이 실제로 쓸 수 있는 연구 역량이 됩니다.

연구 질문, 논문 또는 기존 프로그램에서 출발해 AI와 함께 탐구하세요. 프로그램, 매개변수와 검증 내용이 보존되므로 한 번의 탐구가 다음 탐구의 출발점이 됩니다.

자신에게 맞는 사용 방법을 고르세요. 두 방법은 같은 도메인 기능을 공유합니다. **[Codex 플러그인](../integrations/CODEX_PLUGIN.md)** 은 양자 Skill과 과학 Tool을 Codex 기본 대화로 가져오며, 기능 스위치·MCP 연결·토큰을 관리하는 설정 페이지를 제공합니다. **Desktop**에는 연구 워크벤치와 별도의 Quantum Learning 앱이 포함되며, 모델 서비스는 직접 설정합니다.

**[Codex 플러그인 설치](#codex)** · [Desktop 설치](#desktop-installer) · [계산과 결과 보기](#use-and-inspect-results) · [웹사이트 방문](https://xi-zhao.github.io/OpenQuantum/)

**실측 사례부터 살펴보세요.** [PennyLane Pauli 교환자](#pennylane-rust-case) 계산은 전체 호출 기준 **5.09배**, [QuTiP Wigner 함수 계산](#qutip-rust-case)은 **5.69배** 빨라졌습니다. 두 사례 모두 성능 비교, 결과 검증과 재현 기록을 보관합니다.

**현재 버전 0.8.4:** [Desktop 다운로드와 릴리스 노트](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) · [Codex 플러그인 다운로드와 릴리스 노트](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4). 두 배포판은 같은 제품 버전을 사용합니다.

- **더 쉬워진 기능 찾기:** Tools, MCP, Skills를 용도별 8개 범주로 분류하고 검색과 상태 필터를 추가했습니다.
- **하나의 브랜드 실행 아이콘:** Mac의 `OpenQuantum.app`과 Windows의 `OpenQuantum.lnk`는 OpenQuantum 아이콘을 사용하며, 공식 DSH Desktop 인터페이스, Quantum Learning과 업데이트 메뉴는 그대로 유지합니다.

<p align="center">
  <a href="#why-openquantum">OpenQuantum을 선택하는 이유</a> ·
  <a href="#optimization-cases">실측 최적화</a> ·
  <a href="#what-you-can-do">기능</a> ·
  <a href="#codex">Codex 플러그인</a> ·
  <a href="#quick-start">빠른 시작</a> ·
  <a href="#use-and-inspect-results">결과</a> ·
  <a href="#extend-the-platform">확장</a> ·
  <a href="#roadmap-and-rsi">로드맵과 RSI</a> ·
  <a href="#documentation-and-support">참여하기</a> ·
  <a href="#license-and-acknowledgments">오픈 소스</a>
</p>

<p align="center">
  <img src="../images/openquantum-desktop-20261013.jpg" width="100%" alt="공식 DSH Desktop에서 실행한 OpenQuantum 워크벤치: 브랜드, 새 세션, Quantum Learning과 직접 모델을 추가하라는 안내" /><br />
  <sub>익숙한 공식 Desktop 인터페이스입니다. 설정에서 사용할 모델 서비스를 추가하면 새 세션을 시작할 수 있습니다.</sub>
</p>

<details>
<summary><strong>범주별 Tools, MCP, Skills 설정 보기</strong></summary>

필요한 그룹을 펼친 뒤 검색이나 활성 상태 필터로 범위를 좁히세요. Tools에는 호출 가능한 동작이, MCP에는 서비스 연결이, Skills에는 작업 방법과 가이드가 있습니다.

![Desktop에서 용도별로 분류되고 검색·상태 필터가 적용된 MCP 연결](../images/openquantum-settings-categories-20261013.jpg)

이 스크린숏은 2026-10-13 공식 클라이언트에서 범주를 검증하며 촬영했습니다. [이미지 설명](../images/README.md)을 참고하세요. 설정이 활성화되어 있다고 해서 서비스가 온라인이라는 뜻은 아닙니다.

</details>

<a id="why-openquantum"></a>

## OpenQuantum을 선택하는 이유

### 폭넓은 전문 분야가 연구 아이디어를 펼칠 공간을 줍니다

양자 알고리즘과 회로 시뮬레이션부터 양자 화학, 다체 계산, 오류 정정까지 OpenQuantum은 전문 분야를 꾸준히 넓히며 도구와 방법을 연결합니다. 연구자는 도구를 준비하는 시간을 줄이고 질문을 탐구하는 데 더 많은 시간을 쓸 수 있습니다. 이 분야들을 뒷받침하는 전문성은 Qiskit, PennyLane, QuTiP, PyZX, TeNPy, Stim / PyMatching 같은 커뮤니티 프로젝트에서 나옵니다.

### 빨라진 계산으로 더 많은 아이디어를 시험할 수 있습니다

핵심 계산 단계를 지속적으로 최적화하여 대기 시간을 줄이고 더 많은 비교를 할 여유를 만듭니다. 대상을 정한 최적화 사례에서 [PennyLane Pauli 교환자](#pennylane-rust-case)와 [QuTiP Wigner 함수](#qutip-rust-case)의 전체 호출이 각각 **5.09배**, **5.69배** 빨라졌습니다. 두 결과 모두 원래 라이브러리 및 독립적인 참조 계산과 대조했습니다.

### 열린 협업으로 연구 역량이 계속 성장합니다

가치 있는 오픈 소스 프로젝트와 공개된 방법을 계속 도입하고, 호환성 조정, 최적화와 실제 사용을 통해 개선합니다. OpenQuantum은 이 작업을 중심으로 에이전트 워크플로, 계산 인터페이스와 검증 기록을 구축하므로 새로운 도구, 방법과 경험이 쌓일수록 플랫폼도 함께 성장합니다. 커뮤니티의 전문 지식을 연구자가 사용하고, 확인하고, 신뢰할 수 있는 양자 연구 AI로 만드는 일에 누구나 [참여](#documentation-and-support)할 수 있습니다.

### 지금 하는 일에서 시작하세요

| 하는 일 | 어려운 점 | OpenQuantum이 더하는 것 |
| --- | --- | --- |
| **연구와 알고리즘 개발** | 새 아이디어를 시험하려면 방법을 다시 구현하고, 기준선을 찾고, 결과를 반복해서 확인해야 하는 경우가 많습니다. | 알고리즘 예제와 전문 SDK에서 출발해 입력을 바꾸고 비교를 구성하며, 지원되는 독립 검증을 사용하고 재사용 가능한 프로그램과 결과를 보관합니다. [결과](#use-and-inspect-results)를 참고하세요. |
| **애플리케이션과 에이전트 개발** | 기존 애플리케이션에 양자 계산을 넣고 싶지만 전문적인 방법과 사용할 수 있는 호출 경로가 없습니다. | 기존 Skill, Tool과 네이티브 SDK를 연결해, 애플리케이션이 자체 인터페이스와 워크플로를 유지하면서 전문 소프트웨어를 사용하게 합니다. [플랫폼 확장](#extend-the-platform)을 참고하세요. |
| **산업 R&D와 기술 평가** | 응용 방향은 있지만 방법 선택, 자원 추정, 로드맵 수립에 필요한 근거가 필요합니다. | 지원되는 과제에서 첫 비교를 실행하고 방법의 조건, 자원 가정과 결과 출처를 확인합니다. [참고 자료와 선택](#reference-material-and-selection)을 참고하세요. |
| **교육과 강의 설계** | 자료, 실험, 슬라이드가 흩어져 있으면 추상적인 개념을 실습 강의로 만들기 어렵습니다. | 공개 예제로 실험을 설계하고 Quantum Learning으로 자료와 강의 자료를 정리합니다. 기능과 강의 진행 상황은 [Quantum Learning](#quantum-learning)을 참고하세요. |
| **직접 해 보며 배우기** | 개념은 알지만 알고리즘을 실행하고, 입력을 바꾸고, 결과를 해석하는 방법은 아직 익숙하지 않습니다. | 예제를 실행하고 매개변수를 바꾸며, 가이드와 사용 가능한 참조 결과로 방법이 왜 적용되고 어디서 한계에 이르는지 확인합니다. [알고리즘 예제](#algorithm-learning-and-method-comparison)를 참고하세요. |
| **연구 소프트웨어와 생태계** | 공개된 방법, 연구 코드 또는 SDK가 있지만 다른 사람이 쓸 수 있도록 워크플로, 인터페이스와 예제가 필요합니다. | 방법을 Skill로 작성하거나 실행 가능한 동작을 Tool로 연결하거나 완전한 애플리케이션을 통합하며, 출처와 기여 표시를 보관합니다. [플랫폼 확장](#extend-the-platform)을 참고하세요. |

### 오픈 소스: 역량을 직접 손에 쥐세요

플랫폼과 통합 코드를 읽고, 각 방법의 출처를 확인하며, 적용되는 라이선스에 따라 자신만의 조합을 수정·배포·유지할 수 있습니다. 모델 서비스와 계산 백엔드는 따로 선택하며, 연구 데이터를 공유할지는 사용자가 결정합니다. 저자, 라이선스와 기여 표시가 드러나 있어 기존 작업이 프로젝트와 함께 이어집니다.

### 포괄성: 하나의 질문에 더 많은 방법을

OpenQuantum은 알고리즘, 컴파일, 시뮬레이션, 양자 정보, 화학과 다체 물리, 최적화, 오류 정정, 동역학, 제어와 네트워크를 위한 소프트웨어와 연구 방법을 한데 모읍니다. 가이드와 공개 예제부터 네이티브 SDK와 계산 Tool까지, 과제에 필요한 것을 고르거나 여러 도구를 조합해 새로운 비교를 만들 수 있습니다. 입력, 준비 사항과 지원 범위는 [기능 카탈로그](#what-you-can-do)에 정리되어 있습니다.

예를 들어 PyZX로 회로를 최적화하고, QCEC로 등가성을 확인하고, 잡음 시뮬레이터로 잡음 하의 동작을 살펴보며 더 단순한 회로가 실제로도 더 나은지 따져 볼 수 있습니다. 도구를 조합할 때는 여전히 모델, 단위, 비트 순서와 예산을 맞춰야 합니다. 현재 범위는 [계산 가이드](../integrations/SCALABLE_BRIDGES.md)를 참고하세요.

<a id="give-ai-access-to-specialist-research-capabilities"></a>

### AI가 전문 연구 역량을 사용하게 하세요

에이전트는 자료를 읽고, 프로그램을 작성하고, 도구를 호출할 수 있습니다. OpenQuantum을 설치한 뒤 지원되는 과제에 필요한 의존성과 서비스 설정을 준비하면 AI가 양자 방법과 계산 기능을 사용할 수 있습니다. Skill은 방법과 절차를 설명하고, Tool은 구체적인 동작을 수행하며, 네이티브 SDK는 호스트의 코드 도구를 통해서도 사용할 수 있습니다.

프로그램, 결과와 적용 가능한 검증이 기록되므로 이후 작업이 그 위에 쌓일 수 있습니다. 근거가 충분한 부정적 결과도 보존할 가치가 있습니다. 어떤 방법이 언제 적용되고 언제 다른 경로를 택해야 하는지 보여 주기 때문입니다. 프로그램 실패와 과학적 결과는 서로 다른 결과이며, 기록은 [검토와 재사용](#execution-records-and-scientific-acceptance)을 돕지만 과학적 판단은 사용자의 몫입니다.

**오픈 소스 라이브러리와 공개된 방법을 에이전트가 쓸 수 있는 기능으로 바꾸는 일이 이 플랫폼을 떠받치는 지속적인 작업입니다.** 방법을 정리하고, 워크플로를 작성하고, 소프트웨어를 연결하며, 출처와 사용 조건을 보관합니다. 자신의 방법, 프로그램 또는 완전한 애플리케이션을 가져올 수도 있어, 한 번의 개발이 많은 사람의 출발점이 됩니다.

이렇게 쌓인 작업은 장기 로드맵에서 설명하는 [다음 단계 연구 역량의 개선](#research-that-improves-how-research-is-done)을 위한 토대이기도 합니다.

**[첫 과제 실행하기](#quick-start)** · [나의 역량 가져오기](#extend-the-platform)

<a id="optimization-cases"></a>
<a id="pennylane-rust-case"></a>

## 실측 사례: 5.09배 빨라진 PennyLane 계산

**연구 과제를 맡기면 실행하고 확인할 수 있는 결과를 받습니다.** OpenQuantum에 PennyLane 연구 계산을 대상으로 최적화하고, 실제 속도 향상을 측정하고, 결과를 검증하라는 과제를 주었습니다. 2026-10-20 Codex에서 OpenQuantum 0.8.4으로 실험을 완료했으며, 최적화된 프로그램, 성능 비교, 정확성 검증과 재현 기록을 제공했습니다.

| 계산 | 전체 호출 |
| --- | ---: |
| 기본 PennyLane | 30.62 ms |
| OpenQuantum 최적화 후 | **6.02 ms** |

**전체 호출 기준 5.09배 속도 향상.** 측정한 과제는 32큐비트 국소 모델에서의 Pauli 교환자 계산 1회입니다. 시간은 Apple M4, PennyLane 0.45.1에서 예열 후 9회 측정의 중앙값입니다. 입출력 변환을 포함하며 환경 준비와 컴파일은 제외했습니다.

**결과도 함께 검증했습니다.** 벤치마크 입력 9개 모두에서 출력이 PennyLane 참조 출력과 항 단위로 정확히 일치합니다. 독립적인 전수 행렬 계산으로 **Pauli 문자열 쌍 4,368개**와 무작위 복소 계수 연산자 합 40개를 확인했으며, 최대 행렬 절대 오차는 **1.42×10⁻¹⁴**입니다. 계산과 시간 측정은 독립적으로 검토했고, **원시 시간 표본 405개** 전체와 완전한 입출력을 보존했습니다.

5.09배는 이 계산에서 측정한 향상치입니다. 사례 보고서에 전체 결과, 방법과 지원 범위가 있습니다.

[전체 사례와 재현 절차](../../experiments/pennylane-rust-commutator/README.md) · [원시 시간 데이터](../../experiments/pennylane-rust-commutator/results/raw-timings.csv) · [결과 검증](../../experiments/pennylane-rust-commutator/results/validation.json) · [독립 검토](../../experiments/pennylane-rust-commutator/results/review.md)

<a id="qutip-rust-case"></a>

## 실측 사례: 5.69배 빨라진 QuTiP 계산

**전문적인 방법을 확인 가능한 더 빠른 계산으로 바꿉니다.** Codex에서 OpenQuantum 0.8.4으로 QuTiP의 Wigner 함수 계산을 대상으로 최적화하고, 실행 가능한 프로그램, 완전한 위상 공간 출력, 성능 비교와 독립 검증을 제공했습니다.

| 계산 | 전체 호출 |
| --- | ---: |
| 기본 QuTiP 방법 | 171.77 ms |
| OpenQuantum 최적화 후 | **30.18 ms** |

**전체 호출 기준 5.69배 속도 향상.** 이 과제는 **64차원 단일 모드 Fock 공간, 201×201 위상 공간 격자**에서 밀도 행렬의 Wigner 함수를 계산합니다. 시간은 Apple M4, QuTiP 5.3.1, 단일 스레드 설정에서 교차 배치한 예열 후 9회 측정의 중앙값입니다. 입력 읽기, 변환, 검사와 완전한 배정밀도 출력을 포함하며, 환경 준비, 컴파일과 결과 검증은 측정 구간 밖에 있습니다.

**272개 결과 검증을 모두 통과했습니다.** 네 가지 크기에서 기본 QuTiP 출력과의 최대 절대 차이는 **6.52×10⁻¹⁶**, 독립적인 Laguerre 다항식 합과 해석적 공식과의 최대 차이는 **6.33×10⁻¹⁵**입니다. 검증은 무작위 복소 밀도 행렬, 진공 상태와 Fock 상태, 복소 결맞음을 가진 중첩 상태, 그리고 거부되어야 하는 입력을 포함합니다. **원시 시간 표본 144개** 전체와 완전한 입출력을 보존했으며 독립적으로 검토했습니다.

[전체 사례와 재현 절차](../../experiments/qutip-rust-wigner/README.md) · [원시 시간 데이터](../../experiments/qutip-rust-wigner/results/raw-timings.csv) · [결과 검증](../../experiments/qutip-rust-wigner/results/validation.json) · [독립 검토](../../experiments/qutip-rust-wigner/results/review.md)

<a id="what-you-can-do"></a>

## 할 수 있는 일

분야를 고르고 워크벤치에 질문, 입력, 그리고 확인하고 싶은 결과를 알려 주세요. OpenQuantum 에이전트는 해당 Skill의 방법을 따르고 알맞은 Tool을 호출해 계산합니다. Quantum Learning은 별도의 교육용 인터페이스를 제공합니다.

[알고리즘](#algorithm-learning-and-method-comparison) · [회로와 양자 정보](#circuits-and-quantum-information) · [바닥상태, 화학과 최적화](#ground-states-chemistry-and-optimization) · [오류 완화와 정정](#error-mitigation-and-error-correction) · [Hamiltonian 시뮬레이션과 열린 계](#hamiltonian-simulation-and-open-systems) · [실험과 하드웨어](#experiment-simulation-and-hardware) · [광자와 네트워크](#photonics-and-quantum-networks) · [참고 자료](#reference-material-and-selection) · [Quantum Learning](#quantum-learning)

로컬 계산은 양자 클라우드 계정 없이 시작할 수 있습니다. 실제 하드웨어와 유료 서비스는 필요할 때 설정하며, 각 방법의 입력 범위, 준비 사항과 검증 상태는 상세 카탈로그에 보존됩니다.

현재 소스는 **111개 SDK/소스 환경**에 대해 네이티브 API 전체 경로를 제공하며, 그중 26개는 0.8.4과 함께 배포된 최신 [생태계 확장](../integrations/SDK_ECOSYSTEM_2026-10-14.md)에서 왔습니다. 에이전트는 사용자 정의 프로그램을 작성하고, 공개 API를 조합하며, 완전한 결과를 저장할 수 있어 편의 Tool의 사전 설정 사례를 넘어설 수 있습니다.

각 환경은 과제별로 명시적으로 준비하며, 플랫폼, 계정, 라이선스와 선택적 백엔드 제한은 그대로 적용됩니다. 라이브러리별 공학 검증은 [전체 SDK 접근 기록](../integrations/FULL_SDK_ACCESS.md)에 있습니다. 이 환경들은 실제 연구 과제에서 과학적 승인(독립 검증과 완전한 출처 추적을 근거로 결과가 과학적으로 신뢰할 만하다고 판정하는 것)을 받지 않았으며, 과학적 상태는 여전히 `not_evaluated`입니다.

v0.6.0에서 통합한 기업과 연구기관의 SDK는 미분 가능한 회로, 결함 허용 자원 추정, 광자 계산, 펄스 컴파일과 양자 네트워크를 다룹니다. 세 차례 통합은 [기업 SDK 17개](../integrations/VENDOR_SDKS.md), [기업·연구기관 기능 20개](../integrations/SDK_EXPANSION.md), [네트워크·제어·클라우드 인터페이스 15개](../integrations/SDK_GAPS.md)이며, [QuEra Bloqade Analog](../integrations/BLOQADE_ANALOG.md)가 더해집니다. 각 어댑터는 문서에 명시된 동작만 노출하며, 계정, 인증 정보, 서비스 권한과 적용되는 라이선스는 사용자가 설정합니다.

<a id="algorithm-learning-and-method-comparison"></a>

### 알고리즘 학습과 방법 비교

실행 가능한 알고리즘 예제에서 출발해 입력을 바꾸고 수치 결과를 확인한 뒤, 그 방법을 자신의 문제로 옮기세요. UnitaryLab의 **quantum-skills 가이드 66개**를 네이티브 Skill로 옮겼습니다. 그중 **49개는 실행 가능한 예제**를 제공하여 원본 알고리즘 라이브러리의 **39개 모듈** 전체와 가이드에만 있는 방법을 다루며, 나머지는 알고리즘 분류, 백엔드 선택과 이전을 돕습니다.

| 방향 | 실행 가능한 방법과 예제 |
| --- | --- |
| 기초와 탐색 | QFT, QPE, Hadamard test, 진폭 증폭과 진폭 추정, Grover, Shor, Simon, 이산 로그와 그래프 워크 |
| 선형 시스템과 행렬 방법 | HHL, VQLS, QSVT 선형 풀이, 단열 풀이, LCU와 QSP, 그리고 고전 고유값 풀이 참조 |
| Hamiltonian 시뮬레이션 | Trotter–Suzuki, qDrift, QSP, Taylor LCU, 대체 구현을 공개한 Cartan 예제 |
| 변분 계산과 기계 학습 | VQE, VQD, QAOA, VQC, QCBM, CVQNN, 기울기와 양자 Fisher 정보 |
| 상태 준비와 다체 계 | Möttönen, MPS, isometry와 변분 상태 준비; 분자 DMRG, Fermi–Hubbard VQE와 Ising 시간 전개 |
| 부호 구성과 미분 방정식 | qLDPC 부호 구성과 신드롬; 1차원·2차원 열 방정식과 주기적 이류에 대한 Schrödingerization 예제 |

예제는 Qiskit, PennyLane, quimb, PySCF, NumPy/SciPy 같은 공개 백엔드를 사용합니다. 직접 실행하거나 에이전트가 기존 코드 도구로 호출하게 할 수 있습니다. 기본 매개변수는 교육용 사례이므로 과제마다 실제 입력, 참조 오차와 수렴을 확인하세요.

이번 이식은 원본의 출처와 라이선스를 유지하며 비공개 UnitaryLab 런타임에 의존하지 않습니다. 워크플로를 다룬다는 것이 원본 Python API, 최적화기 또는 백엔드와 완전히 호환된다는 뜻은 아닙니다. Cartan, CVQNN, DMRG 등의 차이는 [방법별 대응표](../integrations/UNITARYLAB_OPEN_COVERAGE.md)와 [예제 가이드](../../examples/quantum-algorithms/README.md)에 정리되어 있습니다.

[알고리즘 예제 실행](#run-an-algorithm-example-directly) · [비슷한 방법 중에서 고르기](../integrations/CAPABILITY_SELECTION.md)

<a id="circuits-and-quantum-information"></a>

### 회로와 양자 정보

| 방향 | 시작할 수 있는 과제 | 확인할 수 있는 결과 |
| --- | --- | --- |
| 양자 회로 | OpenQASM / QPY 회로 분석·변환, 트랜스파일 비교, 등가성 검사, 회로 시뮬레이션 | 회로 구조, 트랜스파일 결과, 등가성 판정, 상태 벡터 또는 표본 분포 |
| 로컬 컴파일과 시뮬레이션 | TKET, QSteed 또는 MQT QMAP으로 회로 컴파일·매핑; Braket LocalSimulator, QCompute, Qibo 등으로 로컬 시뮬레이션 | 게이트 집합과 매핑, 상태 벡터 또는 확률, 각 SDK의 비트 순서 규약 |
| 미분 가능 프로그램과 하이브리드 프로그램 | PennyLane, DeepQuantum, TensorCircuit, MindQuantum 또는 VQNet으로 기댓값과 기울기 계산; Guppy / Selene으로 측정, 리셋과 고전 피드백 | 매개변수 기울기, 확률과 프로그램 결과 |
| 결함 허용 자원 | Microsoft QDK로 물리 자원 추정, Qualtran으로 주어진 Bloq의 게이트 자원 계산 | 하드웨어·분해 가정과 함께 제시되는 큐비트 수, 실행 시간 또는 게이트 수 |
| Qiskit / Cirq 상호 운용 | qBraid의 고정된 OpenQASM 2 경로로 지원되는 유니터리 회로 변환 | 큐비트 번호와 유휴 큐비트를 보존한 변환 회로; 선택적 전체 유니터리 비교 |
| 회로 최적화와 측정 기반 계산 | PyZX로 ZX 재작성과 추출; Graphix로 MBQC 패턴 변환과 시뮬레이션 | 최적화 전후의 회로와 게이트 수, 자원 그래프와 측정 패턴; 선택적 독립 비교 |
| 회로 최적화와 분할 | Compact로 게이트 시퀀스 최적화; QCut으로 회로를 분할하고 기댓값 재구성 | 독립 등가성 검사를 거친 전후 회로; 분할 오버헤드, 실제 표본 수와 선택적 비분할 참조 |
| Clifford+T 잡음 샘플링 | Clifft로 T 게이트 간섭과 잡음 연구, 또는 지원되는 Stim 형식 회로 샘플링 | 최종 비트열 빈도와 선택적 밀도 행렬 참조; 회로 중간 측정과 원시 detector / observable 패리티 |
| 상태와 측정 | 밀도 행렬과 얽힘 척도 감사; 알려진 곱 상태 / GHZ 상태에서 국소 무작위 측정 시뮬레이션 | 독립 검증을 거친 상태 척도; 유한 표본 오차를 포함한 부분계 순도 추정 |

<a id="ground-states-chemistry-and-optimization"></a>

### 바닥상태, 화학과 최적화

| 방향 | 시작할 수 있는 과제 | 확인할 수 있는 결과 |
| --- | --- | --- |
| 바닥상태 풀이와 검증 | 고정된 입자수 섹터에서 두 큐비트 실수 Pauli Hamiltonian에 VQE를 실행하고 정확한 참조값과 대조 | 에너지, 수렴 궤적, 독립 검증, 그리고 전체 흐름에서는 과학적 승인 보고서 |
| 양자 화학과 다체 바닥상태 | SQD로 분자와 활성 공간 연구, TeNPy로 XYZ 스핀 사슬 바닥상태 계산 | SQD 에너지와 오비탈 점유; DMRG 에너지, 자화, 얽힘 엔트로피와 수렴; 선택적 정확 참조 |
| 변분 매개변수 학습 | Pauli Hamiltonian에서 Flow-VQE를 학습시켜 저에너지 회로 매개변수 학습 | 같은 평가 예산에서 Flow 학습과 무작위 탐색의 비교 |
| 들뜬상태와 커널 분류 | OpenQARP VQD로 여러 저에너지 상태 탐색, 또는 cqlib 각도 커널로 QSVM 학습 | 에너지, 잔차, 직교성과 선택적 정확 스펙트럼; 보류 데이터 분류, 해석적 커널과 고전 기준선 |
| 대칭성과 제어 대수 | Symmer로 선택한 대칭 섹터에서 큐비트 축소; PauLie로 Pauli 생성자 분석 | 축소된 Hamiltonian, Lie 대수 분류와 차원; 선택적 스펙트럼 비교 또는 폐포 |
| 조합 최적화 | QPanda, Ocean 또는 Kaiwu로 로컬 최적화 문제 구성·풀이; Qcover로 주어진 QAOA 매개변수 평가 | 해, 제약 검사, 에너지와 상관, 인터페이스가 제공하는 경우 고전 비교 |
| 화학 연산자와 기존 데이터 | OpenFermion / pyChemiQ로 페르미온 연산자 매핑; 필요할 때 QCPortal로 기존 QCArchive 단일점 기록 조회 | Pauli 항; 단위와 누락 필드를 보존한 분자, 에너지, 방법과 출처 |

<a id="error-mitigation-and-error-correction"></a>

### 오류 완화와 오류 정정

| 방향 | 시작할 수 있는 과제 | 확인할 수 있는 결과 |
| --- | --- | --- |
| 오류 완화 | Mitiq으로 ZNE, REM, PEC 또는 CDR을 실행하고 같은 샘플링 예산에서 원시 결과와 완화 결과 비교 | 이상적 참조값, 경험적 편향, 분산과 RMSE, 그리고 보정·학습·샘플링 비용 |
| 양자 오류 정정 | Stim / PyMatching으로 표면 부호 메모리 실험, Deltakit으로 직사각형 패치 구성, 또는 BP+LSD로 복호 | 실제 잡음 회로, 고정 샷 수에서의 논리 오류율과 구간; LSD의 신드롬 일관성 검사 |

<a id="hamiltonian-simulation-and-open-systems"></a>

### Hamiltonian 시뮬레이션과 열린 계

| 방향 | 시작할 수 있는 과제 | 확인할 수 있는 결과 |
| --- | --- | --- |
| Hamiltonian 시뮬레이션 | Trotter–Suzuki 또는 qDrift로 실수 Pauli Hamiltonian의 시간 전개 회로나 최종 상태 구성 | 회로, 자원 지표, 상태 벡터와 선택적 독립 행렬 참조; 단계 수, 차수, 시간과 seed 설정 가능 |
| 열린 계 동역학 | TJM으로 열린 Ising 사슬, Dynamiqs로 단일 큐비트 구동 스캔과 기울기, OQuPy로 환경 기억 효과 | 관측량 궤적, 독립 참조, 기울기, 시간 간격과 기억 절단 |

<a id="experiment-simulation-and-hardware"></a>

### 실험 시뮬레이션과 하드웨어

| 방향 | 시작할 수 있는 과제 | 확인할 수 있는 결과 |
| --- | --- | --- |
| 초전도와 원자 실험 | 보정 워크플로, 네이티브 게이트 제약과 transmon 누설 시뮬레이션; Bloqade Analog / Pulser로 지원되는 원자 배열과 펄스 연구 | 합성 데이터, 동역학 궤적, 원자별 점유와 최종 확률 |
| 펄스 프로그램과 제어 | QUA, LabOne Q, Qblox Scheduler, Qililab 또는 OQC QAT로 오프라인에서 프로그램 구성·스케줄링·컴파일 | 프로그램, 타이밍, 대상 명령 또는 파형; 이 어댑터들은 실험실 장비를 구동하지 않음 |
| 양자 하드웨어 접근 | 백엔드 탐색과 토폴로지·인증 정보 확인; 필요할 때 클라우드 작업 조회, 제출과 취소 활성화 | 장치 후보와 사용 조건; 활성화된 작업 인터페이스의 결과와 상태 |
| 로컬 장치 인터페이스 | QDMI로 구성된 C 드라이버 조회 | 드라이버가 보고하는 장치, 큐비트, 게이트와 결합; 공식 예제 드라이버는 인터페이스 검증용이며 온라인 QPU가 아님 |

<a id="photonics-and-quantum-networks"></a>

### 광자와 양자 네트워크

| 방향 | 시작할 수 있는 과제 | 확인할 수 있는 결과 |
| --- | --- | --- |
| 광자 회로와 학습 | Perceval과 Lightworks로 선형 광학 출력 계산; MerLin으로 배치 추론과 위상 이동 기울기; 선택적 MrMustard Gaussian 모델 | 모드 순서와 절단을 명시한 Fock 확률, 기울기 또는 광학 모멘트 |
| 네트워크 모델링과 프로그램 | SimQN으로 단일 링크 손실과 결어긋남 시뮬레이션; NetQASM으로 두 노드 프로그램 생성 | 링크 통계와 컴파일된 프로그램; SquidASM 시뮬레이션에는 별도 라이선스의 NetSquid 환경 필요 |

<a id="reference-material-and-selection"></a>

### 참고 자료와 선택

| 방향 | 시작할 수 있는 과제 | 확인할 수 있는 결과 |
| --- | --- | --- |
| 알고리즘 참고 자료와 도구 선택 | Quantum-Practices 알고리즘 가이드 66개 검색, 양자 SDK 비교, 연구 절차 재사용 | 버전이 고정된 참고 자료, 가정과 선택 조언 |
| 공개 장치 벤치마크 | 고정된 Metriq 과거 기록 410건을 업체, 장치 또는 벤치마크 유형별로 조회 | 원래 매개변수, 지표, 날짜, 출처와 라이선스, 시뮬레이터 표시 보존 |

### Quantum Learning

자료, 강의 자료와 교실을 한곳에서 다룹니다. 학습자는 직접 실습하고, 교사는 자신의 교육 콘텐츠를 구성합니다.

| 학습과 교육 | 사용할 수 있는 기능 |
| --- | --- |
| 자료 준비 | 홈 화면, 강의 라이브러리, 첨부 파일, 강의 가져오기와 PPTX 가져오기 |
| 강의 구성 | 강의 미리보기, 강의 자료 편집기와 Pro 워크벤치 |
| 수업에서 배우기 | 슬라이드, 퀴즈, 대화형 질의응답과 프로젝트 기반 학습 |
| 계속 배우기 | 로컬 강의, 과제, 자료와 서버 측 학습 기록, 이전 교실에서의 이전 지원 |

목표는 중등 수준의 기초부터 최전선 연구까지 다루는 것으로, 입문·중급·고급 단계로 구성하고 단계를 넘나드는 학습을 지원합니다. 공개 자료는 아직 정리 중이며 전체 교육과정은 아직 제작·공개되지 않았습니다. 앱 조립, 실행과 로컬 저장은 검증했지만, 실제 온라인 AI 강의 구성, 질의응답과 편집은 아직 전체 승인 검증을 기다리고 있습니다.

Pro 교육 과제는 원본 애플리케이션 자체의 도구와 기록을 사용하며 아직 워크벤치의 양자 도구와 연결되어 있지 않습니다. 선택적인 미디어, 음성과 검색 기능은 각각 별도의 서비스가 필요합니다. 설치, 백업, 이전과 검증은 [Quantum Learning 통합 가이드](../integrations/OPENMAIC.md)에 설명되어 있습니다.

<p align="center">
  <img src="../images/openquantum-learning-20260912.jpg" width="100%" alt="Quantum Learning: 강의 자료, 교실과 강의 자료 편집" />
</p>

[Quantum Learning 설정과 교실 열기](#set-up-quantum-learning).

### Desktop, 메신저와 언어

**Desktop.** OpenQuantum 데스크톱은 네이티브 창, 시스템 트레이, 터미널과 알림을 제공하며, 워크벤치의 모델, 양자 Skill, 계산 도구와 실행 기록을 재사용합니다. 서드파티 공식 DSH Desktop과 별도로 제공되는 OpenQuantum 기능 패키지를 사용하며, Mac(Apple Silicon / Intel), Windows와 소스 실행을 지원합니다. [Desktop 설치](#desktop-installer) · [소스에서 Desktop 빌드](#desktop-from-source).

**메신저.** CC Connect를 통해 WeChat, Feishu, DingTalk, Slack, Telegram, Discord 등의 채널에서 과제를 시작할 수 있으며, 워크벤치의 Skill, Tool과 실행 기록을 재사용합니다. [메신저 채널 설정](#messaging-channels).

<p align="center">
  <img src="../images/openquantum-wechat-chat.jpg" width="380" alt="WeChat ClawBot으로 OpenQuantum과 대화하는 기존 데모" /><br />
  <sub>WeChat 채널에서 주고받은 과제와 답변.</sub>
</p>

**인터페이스 언어.** **설정 → 일반 → 언어**에서 중국어 간체, 영어, 일본어, 한국어, 스페인어, 프랑스어, 독일어, 포르투갈어, 러시아어 또는 아랍어를 선택하세요. 선택은 저장되고 Quantum Learning에도 반영되며, 아랍어는 오른쪽에서 왼쪽으로 표시합니다.

![실행 중인 OpenQuantum Desktop 애플리케이션의 언어 선택](../images/openquantum-languages-20260919.jpg)

인터페이스 언어를 바꿔도 기존 대화, 강의 자료, 사용자 Skill이나 도구 출력은 다시 쓰지 않습니다. 일부 기본 시스템 대화상자는 중국어·영어 이외의 언어에서 영어로 표시됩니다.

<a id="quick-start"></a>

## 빠른 시작

사용 방법을 하나 고르세요. Codex에 플러그인을 설치하거나, 기능 패키지와 함께 Desktop 클라이언트를 사용하거나, 소스에서 워크벤치를 실행할 수 있습니다. Desktop과 소스 워크벤치는 로컬 단일 사용자용입니다. 개발하거나 `main`의 기능을 사용하려면 소스를 선택하세요.

<a id="codex"></a>

### Codex 플러그인: 설치와 사용

OpenQuantum 플러그인을 한 번 설치하면 **Skill, 로컬 MCP 서비스, 과학 Tool과 OpenQuantum 설정 페이지**가 함께 등록됩니다. 질문, 프로젝트 관리, 결과 확인은 계속 Codex 기본 대화에서 하고, 설정 페이지에서는 OpenQuantum의 기능을 구성합니다.

**Codex에 설치를 맡기기:** Codex를 열고 새 대화를 시작한 뒤 아래 요청을 붙여 넣으세요.

```text
Please install the OpenQuantum Codex plugin 0.8.4. First read the installation guide:
https://github.com/xi-zhao/OpenQuantum/blob/codex-v0.8.4/docs/integrations/CODEX_AGENT_INSTALL.md
Download the complete installer and SHA256SUMS from https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4,
verify the checksum, check Codex, Node.js 24+ and npm, and install with the bundled installer.
Keep existing plugins and user settings, and check the Skills, MCP tools and the global "OpenQuantum settings" entry.
Tell me exactly what to do if the app needs reloading. Finally, report what was actually verified and which scientific dependencies still need preparation.
```

Desktop 기능 패키지, Codex 플러그인과 설치 패키지는 모두 **OpenQuantum 0.8.4**을 사용합니다. 이 플러그인에는 168개 Skill과 87개 과학 Tool이 포함되며, 네이티브 SDK Skill 26개를 추가하고 Status, MCP, Skills, Service keys 탭을 통일했습니다. 인증 정보가 필요한 새 서비스 Tool 16개는 기본으로 꺼져 있습니다. 릴리스 태그는 `codex-v0.8.4`이며, 첨부 파일과 검증 범위는 Release에 명시된 대로입니다.

**[Codex 플러그인 0.8.4 전체 설치 패키지 다운로드](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.8.4/openquantum-0.8.4-codex-install.zip)** ([릴리스 노트와 SHA256SUMS](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4)).

설치 패키지에는 플러그인 ZIP, 설치 스크립트와 의존성 잠금 파일이 들어 있어 소스 체크아웃이 필요하지 않습니다. Node.js 24 이상, npm, 그리고 플러그인과 전역 설정 페이지를 지원하는 Codex 버전이 필요하며, 에이전트가 [설치 안내](../integrations/CODEX_AGENT_INSTALL.md)에 따라 이를 확인하고 처리할 수 있습니다. 로컬 설치는 macOS에서 검증했습니다. 다른 플랫폼과 호스트 버전에서는 호환성을 확인하세요.

**설치 후:**

1. 안내가 나오면 Codex를 다시 불러온 뒤 새 대화를 열어 새 Skill과 도구가 로드되게 하세요.
2. 대화에서 바로 요청하세요. 예: "OpenQuantum으로 양자 오류 정정 방법을 찾아보고 첫 실험을 추천해 줘."
3. **"…" → "OpenQuantum settings"** 를 열고 **Status / MCP / Skills / Service keys** 탭에서 기능을 관리하세요. Tool 스위치는 **Status → Tools**에 있습니다. 내장 서비스는 플러그인과 함께 구성되어 있습니다. 자신의 MCP 서버를 추가하려면 연결 정보를 입력하고 전용 인증 정보 대화상자로 토큰을 저장하세요.

플러그인은 기능 코드와 설정 페이지를 설치합니다. 일부 계산은 여전히 Python, 양자 SDK 또는 서드파티 계정을 필요할 때 준비해야 합니다. [플러그인 가이드](../integrations/CODEX_PLUGIN.md)를 참고하세요.

<details>
<summary><strong>수동 설치(선택)</strong></summary>

전체 설치 패키지를 다운로드해 검증하고 압축을 푼 뒤, 해당 디렉터리에서 다음을 실행하세요(Node.js 24 이상, npm, 플러그인을 지원하는 Codex CLI 필요).

```sh
npm ci --ignore-scripts
npm run plugin:install
```

설치 프로그램이 현재 Codex 앱의 CLI를 찾지 못하면 `OPENQUANTUM_CODEX_CLI`에 그 경로를 지정하세요. 이미 플러그인 ZIP이 있다면 `npm run plugin:install -- /full/path/plugin.zip`을 사용하세요. 설치, 실패 처리와 단계별 확인은 [에이전트 설치 안내](../integrations/CODEX_AGENT_INSTALL.md)에 있습니다.

</details>

<a id="desktop-installer"></a>

### Desktop 설치 파일

현재 데스크톱 릴리스는 [공식 DSH Desktop 2.0.7 클라이언트](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.7)와 별도의 OpenQuantum 기능 패키지를 결합합니다. 공식 클라이언트는 원래 이름과 버전을 유지하며, 기능 패키지는 Node / uv를 포함하고 전체 SDK 접근, 양자 Skill, Tool과 구성을 제공합니다. 설치 프로그램은 OpenQuantum 아이콘을 사용하는 실행 아이콘(Mac은 `OpenQuantum.app`, Windows는 `OpenQuantum.lnk`)을 만듭니다.

먼저 공식 DSH Desktop을 설치한 뒤 플랫폼에 맞는 기능 패키지를 선택하세요.

| 플랫폼 | OpenQuantum 0.8.4 다운로드 | 압축을 푼 뒤 실행 |
| --- | --- | --- |
| Mac Apple Silicon | [darwin-arm64 패키지](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-darwin-arm64.tar.gz) | `install.command` |
| Mac Intel | [darwin-x64 패키지](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-darwin-x64.tar.gz) | `install.command` |
| Windows x64 | [win32-x64 패키지](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-win32-x64.tar.gz) | `install.cmd` |

압축을 풀기 전에 [Release의 SHA256SUMS](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4)로 다운로드를 검증하세요. 업그레이드 시 기존 설정은 유지됩니다. [설치와 이전 안내](../DESKTOP_INSTALLERS.md)를 참고하세요. 기능 패키지와 Codex 플러그인은 모두 `0.8.4`이며 Harness는 `0.1.5-rc.1`로 유지됩니다. 계산 환경, 계정과 라이선스는 여전히 기능별로 준비해야 합니다.

### 소스에서 설치

Git과 Node.js 24를 준비하세요. Python 양자 도구에는 [uv / uvx](https://docs.astral.sh/uv/getting-started/installation/)도 필요합니다. 그 밖의 의존성은 기능에 따라 다릅니다. 예를 들어 RandomMeas에는 Julia 1.12.7이 필요합니다.

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
```

모델 키가 없어도 [고정된 로컬 예제](#no-model-key-needed-recompute-a-fixed-case)를 바로 실행할 수 있습니다. 에이전트로 과제를 시작하려면 워크벤치 실행 방식을 고르고 모델을 설정하세요.

### 워크벤치 실행 방식 선택

같은 소스 체크아웃에서 실행한 Web과 Desktop은 `.openquantum/dsh`에 있는 모델 설정, 양자 기능과 실행 기록을 공유합니다. 전환하기 전에 실행 중인 워크벤치를 종료하세요.

**Web 워크벤치**

```bash
npm run dev
```

실행기가 출력한 로그인 토큰이 포함된 주소를 여세요. 인증 후 워크벤치는 <http://127.0.0.1:3000>에서 열립니다.

<a id="desktop"></a>
<a id="desktop-from-source"></a>

<details>
<summary><strong>소스에서 Desktop 빌드와 실행</strong></summary>

소스 의존성을 설치하고 Corepack과 시스템 C++ 빌드 도구를 준비한 뒤 실행하세요.

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop -- --source
```

`desktop:setup`은 버전이 고정된 원본 소스를 빌드하고, Electron을 다운로드하며, 서드파티 인터페이스나 자산을 수정하지 않고 네이티브 모듈을 컴파일합니다. 모델과 양자 기능 설정이 로드되도록 저장소의 실행 명령을 사용하세요. 플랫폼 요구 사항은 [배포](../DEPLOYMENT.md)에 있습니다.

</details>

<a id="configure-a-model"></a>

### 모델 설정

Desktop을 새로 설치하면 모델 목록은 비어 있습니다. **설정 → 모델**에서 OpenAI-compatible Chat Completions 엔드포인트, 모델 이름과 API 키로 제공자를 추가하고, 기본 Agent Preset은 OpenQuantum으로 유지하세요. **양자 계산 도구를 호출하려면 모델이 Tool Calling을 지원해야 합니다.** 여기서는 모델 서비스만 설정합니다. 양자 클라우드 인증 정보는 각 백엔드와 함께 설정합니다.

<details>
<summary><strong>고급 모델 설정과 명령줄 진단</strong></summary>

소스에는 선택적인 `openquantum-public` / `openquantum-private` 디버깅 예제가 있으며, 주소는 `.invalid` 자리표시자입니다. 새 Desktop 모델 목록에는 미리 채워지지 않으며, 아래 진단을 할 때만 실제 주소와 인증 정보가 필요합니다.

인터페이스에서 저장한 경로 재정의는 Git이 무시하는 `$DSH_HOME/settings.yaml`에 기록됩니다. 키는 로컬 환경이나 Harness 인증 정보 저장소에 두며, 프로젝트 구성에는 인증 정보 참조만 기록됩니다. `.env`를 사용하려면 macOS에서는 `cp .env.example .env`, Windows PowerShell에서는 `Copy-Item .env.example .env`를 실행하고 주석에 따라 채우세요. `.env`는 모델 이름을 재정의하지 않습니다. 다른 모델 이름은 **설정 → 모델**에서 구성하세요.

아래 명령은 `.env` 또는 환경 변수의 public 경로를 스크립트에 고정된 `kimi-k2.7-code`와 `glm5.2` 모델 이름으로 확인하며, 텍스트 생성과 Tool Calling을 테스트합니다. 인터페이스에서 저장한 경로 재정의는 읽지 않으므로 다른 모델은 아래의 워크벤치 과제로 검증하세요.

```bash
npm run models:probe -- --provider openquantum-public
```

</details>

### 과제별 계산 환경 준비

로컬 Python 계산 도구는 명시적으로 준비한, 버전이 고정된 의존성을 사용합니다. `npm ci` 후 저장소 루트에서 필요한 기능의 준비 명령을 실행하세요. 준비 단계에서는 다운로드와 빌드가 일어날 수 있으며, 계산 호출은 더 이상 의존성을 자동으로 설치하지 않습니다.

| 준비할 대상 | 명령 또는 위치 |
| --- | --- |
| 첫 Bell 상태 실험 | `node scripts/setup-paper-tools.mjs fatqat-workbench` |
| Rb 원자 쌍의 정적 상호작용 | `npm run capability:pairinteraction:setup`; [모델과 버전 관리](../integrations/PAIRINTERACTION.md) |
| Trotter / qDrift Hamiltonian 시뮬레이션 | `npm run capability:hamiltonian:setup` |
| Clifft 샘플링과 qBraid 회로 변환 | `npm run capability:interop:setup` |
| 그 밖의 Python 기능 | `node scripts/setup-paper-tools.mjs <capability-id>`, 예: `qec-memory-experiment`; 각 Skill에 자체 명령이 적혀 있음 |
| 알고리즘 예제 | [최소 환경](#run-an-algorithm-example-directly)에서 시작해 필요에 따라 기울기, PennyLane, 텐서 또는 화학 그룹 추가 |

환경 준비, 연결 활성화와 모델 설정은 서로 독립된 단계입니다. 기본으로 켜져 있는 연결이라도 처음 사용하기 전에 의존성을 준비해야 합니다. 환경이 없거나 잠금 파일이 바뀌었으면 Tool이 정확한 준비 명령을 반환합니다. Julia, QDMI 드라이버와 원본 MCP 서비스는 각자의 안내를 따르세요. [로컬 환경](../integrations/LOCAL_ENVIRONMENTS.md)을 참고하세요.

### 첫 과제 실행

<a id="no-model-key-needed-recompute-a-fixed-case"></a>

#### 모델 키 없이: 고정 사례 다시 계산하기

저장소에 고정된 [두 큐비트 Pauli Hamiltonian](../../.agents/skills/quantum-ground-state/evals/fixtures/requests/protocol-fixture.json)을 입력으로, 네이티브 `solve_and_validate_ground_state` Tool이 지정된 입자수 섹터에서 잡음 없는 VQE를 실행하고 독립적인 닫힌 형식 계산으로 결과를 확인합니다. `git clone`과 `npm ci` 후 저장소에서 실행하세요. 모델 키나 양자 클라우드 인증 정보는 필요하지 않습니다.

```bash
npm run demo:quantum-ground-state
```

<table>
  <tr>
    <td align="center"><strong>-1.85727503 Ha</strong><br /><sub>VQE 에너지</sub></td>
    <td align="center"><strong>-1.85727503 Ha</strong><br /><sub>독립 정확 참조값</sub></td>
    <td align="center"><strong>4.44 × 10⁻¹⁶ Ha</strong><br /><sub>에너지 차이</sub></td>
    <td align="center"><strong>15개 통과</strong><br /><sub>로컬 계산 검사</sub></td>
  </tr>
</table>

이 값들은 **2026-09-12 로컬 재실행** 결과입니다. [원시 출력과 실행 기록](../examples/quantum-ground-state-local-demo-2026-09-12.json)에는 전체 값, 검사 상태, 시간, 소스 커밋, 입력 다이제스트와 Node.js 버전이 들어 있습니다.

<details>
<summary><strong>이번 실행에서 확인한 것과 아직 빠진 것</strong></summary>

이 기록에서는 로컬 계산 검사 15개가 통과했고 세션 출처 검사 1개는 실행되지 않았으므로, 완전한 과학적 승인 결론은 없습니다. 에너지 차이는 이 수치 사례에서 정확 참조값과 일치함을 보여 주며, 과학적 범위는 주어진 Hamiltonian과 입자수 섹터로 한정됩니다.

완전한 과학적 승인을 위해서는 Harness를 통해 과제를 실행하고, 결과 파일과 세션 출처를 저장하며, 다시 읽을 수 있는 승인 보고서를 만들어야 합니다. 모델 설정 후의 검증 방법은 [개발과 검증](#development-and-verification)에 있습니다.

</details>

<a id="let-the-agent-run-a-task-prepare-and-sample-a-bell-state"></a>

#### 에이전트에게 과제 맡기기: Bell 상태 준비와 샘플링

모델을 설정하고 `node scripts/setup-paper-tools.mjs fatqat-workbench`로 FatQat을 준비한 뒤, 새 세션을 열고 다음을 보내세요.

> FatQat으로 두 큐비트의 영 상태에서 시작해 q0에 H를 적용한 다음, q0를 제어, q1을 표적으로 CX를 적용하세요. 잡음 없는 정확한 확률을 반환하고 seed=7로 1024회 샘플링한 결과와 비교하세요.

에이전트는 FatQat의 회로 도구를 호출할 수 있고, 워크벤치는 도구 입력과 반환 결과를 보관합니다. 정확한 확률과 표본 빈도를 확인한 뒤 이어서 요청하세요.

> 회로와 seed는 그대로 두고 샘플 수를 8192로 바꾼 뒤, 두 실행의 빈도가 정확한 확률에서 얼마나 떨어져 있는지 비교하세요.

이상적인 확률은 `00`과 `11`이 각각 50%이며, 유한 표본의 빈도는 요동합니다. 두 실행을 비교하면 그 요동이 드러납니다. 샘플 수를 한 번 늘린다고 해서 모든 빈도가 이상값에 더 가까워진다는 보장은 없습니다. Tool Calling을 지원하는 모델이 없으면 에이전트는 계산 Tool을 호출할 수 없습니다. 인터페이스 세부 사항과 로컬 검증은 [FatQat 가이드](../integrations/FATQAT.md)에 있습니다.

<a id="run-an-algorithm-example-directly"></a>

#### 알고리즘 예제 직접 실행

모델 키나 양자 클라우드 계정은 필요하지 않습니다. NumPy, SciPy와 Qiskit으로 시작하세요.

```bash
npm run capability:algorithms:setup -- --minimal
```

macOS / Linux에서 방법 목록을 보고, 입력 계약을 읽고, 기본 HHL 예제를 실행하세요.

```bash
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --list
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --describe hhl
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --algorithm hhl
```

Windows PowerShell에서는 다음과 같습니다.

```powershell
& examples/quantum-algorithms/.venv/Scripts/python.exe examples/quantum-algorithms/run.py --algorithm hhl
```

QSP/QSVT 같은 방법에는 `npm run capability:algorithms:setup -- --group pennylane`을 실행하세요. 다른 그룹은 `gradients`, `tensor`, `chemistry`이며, 그룹을 추가해도 기존 그룹은 유지됩니다. 인자 없이 `npm run capability:algorithms:setup`을 실행하면 전체를 준비합니다. 전체 환경에는 PySCF가 포함되므로 Windows에서는 WSL을 권장하며, 수치 검증은 macOS CPU에서 수행했습니다.

자신의 매개변수는 JSON 파일로 `--input`에 넘기고 결과는 `--output`으로 저장하세요. 또는 모델을 설정한 뒤 에이전트가 `quantum-algorithms`나 특정 방법의 Skill을 사용하게 할 수 있습니다. 매개변수, 비트 순서, 방법별 차이와 의존성 그룹은 [알고리즘 예제 가이드](../../examples/quantum-algorithms/README.md)에 있습니다.

<a id="upgrade-an-existing-source-installation"></a>

### 기존 소스 설치 업그레이드

[업데이트 안내](../UPDATES.md)에 따라 소스와 프로젝트 의존성을 업데이트한 뒤, 사용하는 기능마다 준비 명령을 한 번씩 다시 실행하세요. Python 브리지는 기존 환경 디렉터리에서 고정된 의존성을 확인하고 동기화하므로 아무것도 삭제할 필요가 없습니다. 알고리즘 예제는 계속 그룹을 추가할 수 있습니다.

워크벤치를 재시작하고 새 세션을 시작하세요. 기존 Skill과 Tool의 이름과 매개변수는 그대로 유효합니다. 13개 범주 색인은 여전히 수동으로 호출할 수 있고, 자동 과제는 `quantum-algorithms` 또는 특정 방법을 선택합니다. 선택적 서비스의 전체 도구 범위를 되돌리려면 기본 `full` 프로필을 사용하세요. [기능 선택과 호환성](../integrations/CAPABILITY_SELECTION.md)을 참고하세요.

### 선택 기능

<a id="set-up-quantum-learning"></a>

<details>
<summary><strong>Quantum Learning 설정</strong></summary>

소스 의존성을 설치한 뒤 같은 체크아웃에서 실행하세요.

```bash
npm run learning:ui:setup
```

그다음 Web 또는 Desktop을 시작하고 사이드바에서 **Quantum Learning**을 여세요. 처음 실행하면 로컬 데이터베이스와 강의 서비스가 시작되며 전역 PostgreSQL은 필요하지 않습니다. 모델 요청에는 OpenQuantum에서 현재 선택한 모델을 사용합니다.

설치와 실행은 macOS에서 검증했습니다. 설치 프로그램은 `/bin/sh`에 의존하므로 일반 Windows에는 아직 맞춰져 있지 않으며, Linux는 아직 검증하지 않았습니다. 새 Git worktree에는 별도 설치가 필요합니다. 백업, 이전과 플랫폼별 상태는 [통합 가이드](../integrations/OPENMAIC.md#使用)에 있습니다.

</details>

<a id="messaging-channels"></a>

<details>
<summary><strong>WeChat, Feishu 등 메신저 채널 설정</strong></summary>

```bash
npm run cc-connect:setup
npm run cc-connect:feishu
npm run cc-connect:start
```

첫 플랫폼은 원본 안내에 따라 설정하세요. 다른 플랫폼과 인증 정보를 관리하려면 다른 터미널에서 `npm run cc-connect:web`을 실행하세요. 토큰은 Git이 무시하는 로컬 구성에 저장됩니다. [메신저 가이드](../integrations/CC_CONNECT.md)를 참고하세요.

</details>

배포와 실행 문제는 [배포](../DEPLOYMENT.md)와 [문제 해결](../TROUBLESHOOTING.md)에서 다룹니다.

<a id="use-and-inspect-results"></a>

## 결과 활용과 확인

과제가 실행되면 다른 백엔드를 고르고, 문제 크기를 바꾸고, 결과를 이후 연구로 이어 갈 수 있습니다.

<a id="choose-the-right-entry-point"></a>

### 알맞은 도구 고르기

알고리즘을 배우거나 수정할 때는 [실행 가능한 예제](#algorithm-learning-and-method-comparison)를, 입출력 계약이 정해진 작업이 필요할 때는 전문 도구를 사용하세요. Trotter / qDrift, VQD, Qiskit과 고유값 풀이처럼 기능이 겹치는 경우에는 [공통 선택 가이드](../integrations/CAPABILITY_SELECTION.md)가 있습니다. 원래 이름은 유지하며, 물리적 가정이나 수치 방법이 다른 구현은 별도로 둡니다.

Qiskit Gym, Quantum Hardware와 FlagQuantum은 기본으로 꺼져 있습니다. 필요할 때 학습, 장치 조회, 컴파일 또는 시뮬레이션용의 더 작은 도구 프로필을 설정하세요. 선택하지 않으면 하위 호환되는 `full` 프로필이 적용됩니다. 세션에서 호출할 수 있는 Tool은 활성화된 연결, 실제 등록 상태와 선택한 프로필에 따라 달라집니다.

<a id="local-computing-and-quantum-clouds"></a>

### 로컬 계산과 양자 클라우드

로컬 수치 계산에는 양자 클라우드 계정이 필요하지 않습니다. 다른 도구를 사용하려면 **설정 → 양자 구성 요소 → MCP Server 연결**에서 연결을 설정하고, 워크벤치를 재시작한 뒤 과제에서 백엔드를 지정하세요. 기본 스위치는 [MCP 서비스 카탈로그](../../README.md#mcp-服务目录)에 정리되어 있습니다.

실제 하드웨어를 사용하려면 대상 서비스의 인증 정보, 권한과 할당량을 준비하세요. **장치 탐색, 실제 작업 제출과 로컬 시뮬레이션은 각각 범위가 다릅니다.** 구성이 있다고 해서 서비스가 온라인이라는 뜻은 아니므로, 작업 성공 여부는 실제 실행 기록으로 확인하세요.

| 백엔드 | 현재 기능 | 인증 정보 또는 조건 |
| --- | --- | --- |
| 로컬 계산 | 회로와 잡음 시뮬레이션, 바닥상태 참조, 상태 감사, 오류 정정 샘플링, 최적화와 실험 시뮬레이션(각각 고유한 입력 범위) | 클라우드 인증 정보 불필요; 계산 전에 고정된 의존성 준비 |
| IBM Quantum | Runtime, AI Transpiler, 하드웨어 조회; 선택적 실제 작업 제출과 취소 | `QISKIT_IBM_TOKEN`; 작업용 MCP Server 연결은 opt-in |
| IonQ | 하드웨어 조회; 선택적 실제 작업 제출, 취소와 비용 추정 | `IONQ_API_KEY`; 작업용 MCP Server 연결은 opt-in |
| Origin Quantum 클라우드 | 읽기 전용 백엔드 탐색(FieldQKit); QPanda3 Runtime MCP Server를 통한 Wukong QPU 조회와 선택적 샘플링, 기댓값, 배치 작업 | 탐색에는 `ORIGIN_API_TOKEN`; 선택적 하드웨어 작업에는 `QPANDA3_API_KEY` |
| Quafu, Tianyan, Guodun, Tencent, LogicalQubit 클라우드 | 인증 정보 확인, 백엔드 탐색, 큐비트 필터링, 토폴로지와 보정 요약 | 각 서비스의 API 토큰; 읽기 전용 |
| FieldQuantum | 클라우드 시뮬레이터 백엔드 탐색 | `FIELDQUANTUM_API_TOKEN`; 읽기 전용 |

하드웨어 작업과 유료 서비스는 필요할 때 활성화합니다. 읽기 전용 탐색으로 장치, 토폴로지와 보정 정보를 먼저 파악한 뒤 실제 작업을 실행할지 결정할 수 있습니다. "읽기 전용"은 원격 클라우드나 QPU의 상태를 바꾸지 않는다는 뜻입니다. SDK 캐시와 결과 파일이 로컬 작업 디렉터리에 기록될 수 있으므로 로컬 Python 브리지는 여전히 `workspace-write` 계약을 유지합니다.

### 계산 매개변수

각 도구가 지원하는 모델과 입력 범위 안에서 큐비트 수, 회로 깊이, Hamiltonian 항, 샘플 수와 반복 예산을 선택합니다. 사용할 수 있는 매개변수와 규모는 각 도구 인터페이스를 따르며 알고리즘, 백엔드와 계산 자원에 따라 달라집니다. 범위가 정해진 참조 사례가 모든 도구의 범위를 규정하지는 않습니다.

주 계산과 정확한 비교는 분리되어 있습니다. 회로 최적화, MBQC 패턴 생성, 대칭성 축소, Lie 대수 분석이나 텐서 알고리즘을 바로 실행할 수 있으며, `referenceMode`로 독립 참조를 자동, 강제 또는 생략 중에서 선택할 수 있습니다. 매개변수, 반환 값과 자원 설정은 [로컬 계산 가이드](../integrations/SCALABLE_BRIDGES.md)에 있습니다. 로컬 검증의 입력, 버전과 결과는 재현을 위해 각 통합의 기록에 보존됩니다.

회로, 바닥상태, 잡음, 동역학과 벤치마크 조회에 관한 더 많은 복사용 과제는 [중국어 README](../../README.md#更多可复制的计算任务)에 있습니다.

<a id="execution-records-and-scientific-acceptance"></a>

### 계속 활용할 수 있는 방법과 결과

워크벤치는 과제마다 요청, 도구 호출과 반환 결과를 저장하므로 과정을 되짚어 보고 이어서 질문할 수 있습니다. 매개변수를 조정하거나, 연결된 다른 백엔드를 고르거나, 자주 쓰는 연구 절차를 Skill로 만들어 이후 과제에 활용하세요.

지원되는 기능에서는 결과에 정확한 참조값, 독립 검증 또는 통계적 오차 정보가 함께 제공됩니다. 바닥상태 풀이와 양자 정보 감사는 입력, 결과 파일과 세션 출처를 연결해 검토할 수 있는 완전한 과학적 승인 흐름도 제공합니다.

<details>
<summary><strong>실행 기록과 과학적 승인 자세히 보기</strong></summary>

연구 워크벤치는 과제 요청, Skill 로딩, 도구 호출, 권한 상태와 반환 결과를 기록합니다. 설정에서의 "활성화"는 구성 정책일 뿐이며, 도구를 실제로 호출할 수 있는지와 서비스에 연결되는지는 실행 증거로 드러납니다.

실행 완료와 과학적 승인은 별개의 상태로 표시됩니다. 완전한 승인 흐름을 갖춘 기능은 입력, 결과 파일, 독립 검증과 세션 기록을 연결해 통과, 실패, 미검사 항목을 나열한 승인 보고서를 만듭니다. 그 밖의 도구는 자체 범위 안에서 수치 결과와 검사 상태를 보고합니다.

![결과, 증거 생성 및 저장와 독립 검증에서 규칙과 출처를 결합한 과학적 승인으로 이어지는 흐름](../images/openquantum-evidence-flow.png)

이 그림은 완전한 승인 흐름을 갖춘 기능이 증거를 형성하는 방식을 보여 줍니다. [편집 가능한 원본 보기](../architecture/openquantum-evidence-flow.html). 범위가 정해진 바닥상태 풀이와 양자 정보 감사는 완전한 흐름을 제공하며, QUBO, 회로 등가성과 오류 정정 메모리 실험은 각자의 규칙에 따라 결과와 검사를 보고합니다. 근거는 [기능 선언](../../.agents/capability-packages.yml), [아키텍처 감사](../architecture/ARCHITECTURE_AUDIT.md)와 [고정 양자 기능 벤치마크](../../benchmarks/quantum-capabilities/README.md)에 있습니다.

</details>

### 자주 묻는 질문

- 양자 컴퓨터 계정이나 모델 키가 필요한가요? [로컬 예제](#no-model-key-needed-recompute-a-fixed-case), [모델 설정](#configure-a-model)과 [양자 클라우드](#local-computing-and-quantum-clouds)를 참고하세요.
- [모든 SDK를 먼저 배워야 하나요?](#give-ai-access-to-specialist-research-capabilities)
- [텍스트로만 답했다면 계산이 실행된 건가요?](#let-the-agent-run-a-task-prepare-and-sample-a-bell-state)
- [업그레이드 후 환경을 준비하라는 메시지가 나옵니다. 어떻게 하나요?](#upgrade-an-existing-source-installation)
- [알고리즘 예제와 전문 계산 도구 중 무엇을 써야 하나요?](#choose-the-right-entry-point)
- [Quantum Learning에 이미 완성된 강의가 있나요?](#quantum-learning)

<a id="extend-the-platform"></a>

## 플랫폼 확장

**여러분의 양자 소프트웨어를 에이전트가 쓸 수 있는 기능으로 만들고, 완전한 애플리케이션을 열린 플랫폼으로 가져오세요.** OpenQuantum에서 에이전트용으로 확장하는 경로는 다음과 같습니다. 작업 방법은 Skill로 설명하고, 계산 프로그램은 네이티브 Tool이나 MCP Server로 연결하며, 독립적인 과학 검사가 필요하면 Validator와 그 증거 흐름을 추가합니다. 완전한 애플리케이션은 단일 Tool로 쪼개지 않고 자체 업무와 데이터 경계를 따라 통합합니다.

OpenQuantum의 도메인 기능은 DeepSeek Harness 위에서 실행되며, Harness가 일반적인 에이전트 실행, 도구 스케줄링, 모델 연결과 실행 기록을 담당합니다. 두 번째 에이전트 런타임을 도입하지 않습니다. 사용자가 해결해야 할 과제에서 출발해 확장 방식을 고르세요.

| 추가하려는 것 | 위치 |
| --- | --- |
| 도메인 지식, 절차, 도구 선택과 결과 해석 | Skill; 기존 범용 Tool이나 양자 Tool을 재사용 가능 |
| 안정적인 계산, 조회 또는 작업 | Tool; 네이티브 Tool Provider 또는 Harness MCP Client가 등록 |
| 자체 인터페이스와 워크플로를 가진 양자 애플리케이션이나 교육 제품 | 애플리케이션 경계를 따라 통합하며 업무, 데이터, 권한과 백엔드 책임을 유지; Quantum Learning이 기존 사례 |
| 독립적인 과학 검사와 승인 | Validator; 최종 승인이 필요하면 Acceptance Profile, 증거 생성 및 저장와 central Acceptance Builder 추가 |

기존 Skill, 브리지와 네이티브 Tool을 참고 예시로 활용하세요. 먼저 [문서와 아키텍처 안내](../README.md)를 읽고, 필요에 따라 [기여 가이드](../../CONTRIBUTING.md), [확장 모델](../architecture/EXTENSION_MODEL.md)과 [모듈 지도](../architecture/MODULES.md)를 참고하세요.

<a id="quantum-applications-for-practical-problems"></a>

### 실제 문제를 위한 양자 애플리케이션

OpenQuantum은 SDK, 알고리즘과 계산 서비스뿐 아니라 정해진 사용자와 문제를 위한 완전한 애플리케이션도 통합합니다. 애플리케이션은 자체 인터페이스, 워크플로, 데이터 관리와 결과 표시를 유지하면서, 협업이 유용할 때 명시적인 실행 인터페이스로 에이전트와 연결할 수 있습니다.

앞으로의 애플리케이션은 일정 최적화나 분자·재료 계산 등을 다룰 수 있으며, 사용자는 단일 알고리즘으로 워크플로를 조립하는 대신 실제 문제를 제출하고, 입력 조건을 확인하고, 범위가 명시된 결과를 읽게 됩니다. 이는 방향일 뿐 이미 제공되는 애플리케이션 목록이 아닙니다. [Quantum Learning](#quantum-learning)이 기존의 완전한 애플리케이션 통합 사례이며, 다른 애플리케이션은 데이터 권한, 백엔드, 비용과 검증 범위를 사례별로 정해야 합니다. 애플리케이션이 실제 QPU를 사용하는지, 고전 방법보다 나은지는 해당 애플리케이션의 실행 기록과 비교로 판단합니다.

<details>
<summary><strong>아키텍처와 책임</strong></summary>

![OpenQuantum 아키텍처: 연구 요청이 Harness에 도달하고, 에이전트가 Skill을 읽고, 네이티브 Tool Provider 또는 Harness MCP Client를 통해 도구를 사용하며, 모델 서비스와 실행 로그에 연결됨](../images/openquantum-platform-overview.png)

이 그림은 워크벤치의 핵심 호출 관계를 보여 줍니다. [편집 가능한 원본 보기](../architecture/openquantum-platform-overview.html).

- **Skill**은 지식과 워크플로 지침을 제공하며, 코드를 실행하거나 인증 정보를 보유하지 않습니다.
- **Tool Provider**는 실행 가능한 도구를 등록합니다. 프로세스 내 네이티브 방식이거나, MCP Server의 경우 Harness MCP Client를 통합니다.
- **Scientific Validator**는 observations를 생성합니다. Acceptance Profile은 규칙을 정의하며, observations와 출처로부터 최종 승인을 도출하는 것은 central Acceptance Builder뿐입니다. 개발 문서에서 `L3`는 재생 가능한 완전한 승인 흐름을 뜻하며, 모든 호출이 승인되었다는 뜻이 아닙니다.
- **Agent Preset**은 필요한 Skill Provider, Tool Provider와 에이전트 정책을 조합합니다.

격리가 필요 없는 프로세스 내·동일 언어 동작에는 네이티브 Tool Provider를 우선 사용하고, 언어가 다르거나 별도 프로세스 또는 원격 배포가 필요하면 MCP Server를 사용하세요. Harness는 Cordis Plugin으로 확장을 조립하며, UI, 모델 연결, 양자 계산과 과학적 판단은 각자의 책임을 유지합니다.

</details>

전체 Skill, MCP 서비스와 네이티브 Tool 카탈로그는 [중국어 README](../../README.md#能力接口目录)에서 관리합니다. 현재 소스에는 **내장 Skill 183개**(자동 선택 170개, 수동 범주 색인 13개), **MCP 서비스 연결 91개**(기본 활성 66개, opt-in 25개)와 **네이티브 양자 Tool 5개**가 있습니다.

<a id="development-and-verification"></a>

### 개발과 검증

<details>
<summary><strong>구성 검사, 수치 회귀와 종단 간 테스트</strong></summary>

```bash
# Check the Harness composition
npm run harness:config

# Run the complete offline quality check
npm run check

# macOS/Linux: local numerical regressions and Harness wiring with pinned dependencies
npm run capability:mitiq:live
npm run capability:unitary:live
npm run capability:hamiltonian:live
npm run capability:algorithms:live

# Real agent end-to-end test after configuring a model
npm run e2e:quantum-harness -- --provider openquantum-public
```

변경 사항에 관련된 검사를 고르세요. 전체 목록은 [중국어 README](../../README.md#开发与验证)에 있습니다. 테스트와 로컬 증거는 공개 릴리스나 과학적 승인과 구별됩니다. 릴리스 변경 사항은 [v0.8.4 릴리스 노트](../releases/v0.8.4.md)에 있습니다.

</details>

[OriginQ 공식 `pyqpanda3` Skill](https://github.com/OriginQ/pyqpanda3-skill)은 선택적인 원본 Skill입니다. 내장 Skill 183개에 포함되지 않으며 자동으로 설치되지 않습니다. `npm run skill:qpanda:setup`은 검토된 버전을 설치하지만 `qpanda_runtime`을 활성화하거나 클라우드 작업 권한을 부여하지는 않습니다.

<a id="roadmap-and-rsi"></a>

## 로드맵과 RSI

**기존 역량을 사용하는 데서 새로운 역량을 함께 만드는 데로.** 전문적인 방법, 계산 자원, 완전한 애플리케이션, 실험실 장비와 학습 자원이 각자의 연결 방식을 갖고 정해진 범위 안에서 함께 작동하는 열린 양자 에이전트·애플리케이션 플랫폼을 계속 만들어 가겠습니다. 이는 장기적인 방향이지 제공 목록이 아니며, 각 기능은 개별 통합과 검증을 거쳐 도입됩니다.

### 플랫폼 기반

| 장기 트랙 | 계속 만들어 갈 것 |
| --- | --- |
| **0 · 더 유용한 양자 에이전트** | 요청에서 실제 계산까지 과제 이해, 방법 선택, 도구 호출, 결과 해석과 실패 복구를 개선합니다. 진척은 실제 과제를 완수하는 품질, 시간과 비용으로 측정합니다. |
| **1 · 에이전트용 양자 소프트웨어 생태계** | 전문 소프트웨어를 계속 연결하고 실행 인터페이스, 도메인 Skill과 의존성 준비를 개선하여, 적용 조건과 검증 기록을 보존한 채 도구를 호출하고 방법을 재사용할 수 있게 합니다. |
| **2 · 양자·HPC·AI 워크플로** | 로컬 CPU, 원격 GPU, HPC, 양자 시뮬레이터와 QPU를 연결하고, 에이전트가 조직하는 양자–고전 계산을 탐구합니다. 규모, 정밀도, 시간과 예산에 따라 자원을 선택하며, 백엔드, 오케스트레이션과 협조 실행을 단계적으로 검증합니다. |
| **3 · 지능형 실험실 장비 인터페이스** | 표준화된 장치 인터페이스를 준비하고 프로그래밍 가능한 장비를 단계적으로 연결하며, 장치 탐색, 실험 제어, 측정 분석과 피드백을 탐구하여 계산을 실제 실험과 잇습니다. |

### 응용과 교육

| 장기 트랙 | 계속 만들어 갈 것 |
| --- | --- |
| **4 · 더 많은 양질의 강의** | 기초부터 최전선까지의 지식 지도를 만들고, 입문·중급·고급 강의를 마련하며, 배경과 관심에 따라 단계를 넘나드는 학습과 설명·실습 실험·평가가 연결된 구성을 갖춥니다. |
| **5 · 실제 문제를 위한 양자 애플리케이션** | 정해진 문제를 중심으로 문제 입력, 계산 워크플로와 결과 표시를 갖춘 완전한 애플리케이션을 통합하거나 함께 만들어, 사용자가 하위 도구를 직접 조립하지 않아도 되게 합니다. 각 애플리케이션의 백엔드, 비용, 범위와 검증 결과를 문서화합니다. |

### 개인화와 개선

| 장기 트랙 | 계속 만들어 갈 것 |
| --- | --- |
| **6 · 능동적이고 개인화된 지원** | 학습과 연구에서 각자의 배경, 관심과 목표를 이해하고, 다음에 배울 내용이나 사용할 방법을 제안하며, 빠진 선수 지식을 채워 강의와 도구가 사람에게 맞춰지게 합니다. 어떤 기록을 사용할지, 어디에 저장할지, 어떻게 끌지는 사용자가 결정합니다. |
| **7 · 계속 개선되는 연구 역량** | 과제 경험에서 방법과 도구의 개선으로, 나아가 연구 과정 자체의 개선으로 가는 경로를 탐구합니다. 아래 RSI 방향처럼 새 과제에서의 비교, 독립 검증, 전체 비용과 롤백 가능한 버전으로 개선을 검증합니다. |

장비 인터페이스는 Anthropic의 [Model Hardware Standard (MHS)](https://www.anthropic.com/news/model-hardware-standard-research-preview) 같은 탐색을 참고하여 시뮬레이션 장치와 협업 실험부터 시작합니다. 실시간 제어와 장치 제약은 해당 드라이버와 제어 시스템이 담당합니다.

<a id="rsi"></a>
<a id="research-that-improves-how-research-is-done"></a>

### 연구 방식을 개선하는 연구

**현재 상태: 플랫폼에는 방법, 실행과 일부 과학 검사 인프라가 있지만 RSI 루프는 구현되지 않았습니다.** 개선 제안, 독립 평가, 버전 승인과 여러 회차에 걸친 이득은 아직 구축하고 검증해야 합니다. 현재 존재하는 것의 근거는 여전히 [아키텍처와 증거 경계](../README.md)입니다.

**연구는 답뿐 아니라 다음 탐구를 개선하는 방법과 도구도 남겨야 합니다.** 양자 과학을 위한 재귀적 자기 개선(RSI)을 탐구하고자 합니다. 시스템이 스스로의 한계를 찾고, 후보 개선안을 제안하며, 검증을 거친 뒤 이후 과제에 사용합니다. 그리고 개선된 시스템이 다음 회차의 개선을 더 효과적으로 만들고 검증합니다.

| 단계 | 축적하고자 하는 변화 |
| --- | --- |
| 과제 간 | 승인된 과제 경험을 단순한 대화 기록이 아니라 재사용 가능한 방법, 사례와 실패 경계로 바꿉니다. |
| 역량 개선 | 방법 선택, 도구 구현이나 워크플로의 변경을 제안하고, 새 과제에서 품질, 신뢰성 또는 비용이 개선되는지 검증합니다. |
| 재귀적 자기 개선 | 실험 설계, 후보 탐색, 독립 검증처럼 개선을 만들어 내는 방법 자체를 개선하고, 다음 회차가 더 효율적이 되는지 검증합니다. |

구상하는 루프는 **실제 과제 → 후보 개선 → 독립 검증과 새 과제 비교 → 승인된 버전 업데이트 → 다음 회차 연구**입니다.

예를 들어 회로 과제에서 최적화된 회로뿐 아니라 최적화 전략을 고르는 더 나은 방법도 얻을 수 있습니다. 후보 전략은 독립적인 등가성 검사를 거치고, 개발에 쓰지 않은 회로에서 이전 버전과 비교해야 합니다. 그런 전략을 찾는 실험 자체를 개선하는 데까지 이르러야 재귀의 핵심에 닿습니다. 중요한 것은 이후 과제가 실제로 이득을 보는지이지, Skill을 몇 개 추가했는지, 코드를 얼마나 바꿨는지, 더 강한 모델로 교체했는지가 아닙니다.

개선은 그것을 물려받지 않은 버전과 비교해야 하며, 비교 가능한 조건에서 기반 모델, 사람의 개입, 그리고 개선과 사용에 든 전체 비용을 보고하고 회귀 여부를 확인해야 합니다. 후보 시스템은 자신의 승인 규칙을 완화하거나, 실패 증거를 삭제하거나, 권한을 확장해서는 안 됩니다. 독립 평가, 사용자 승인, 데이터 경계와 롤백이 변경을 받아들이는 조건입니다. 커뮤니티 기여와 사람의 지도도 함께 작용하므로, 모든 성과를 자율적인 AI의 진보로 돌려서는 안 됩니다.

OpenQuantum은 이 탐구를 위한 양자 작업 환경, 즉 실행 가능한 도구, 재사용 가능한 방법, 확인 가능한 결과와 다른 연구 에이전트를 위한 열린 인터페이스를 제공하는 것을 목표로 합니다. 새로운 범용 에이전트 런타임을 만들거나 새로운 기반 모델을 학습시키지는 않습니다. CyberEinstein, PRAgent, RunThePaper와의 협업은 이후의 가능성이며, 프로젝트를 가로지르는 자동 루프가 이미 존재하는 것은 아닙니다. AI와 양자 역량이 서로를 강화하는지는 준비, 측정, 오류 정정과 데이터 전송 비용을 포함해 구체적인 과제에서 검증해야 합니다. 양자 계산이 기반 모델 학습을 가속하거나 무한한 자기 개선을 가능하게 한다고 가정하지 않습니다.

**궁극적으로 원하는 것: 한 번의 탐구가 새로운 결과를 만들고, 다음 탐구의 성공을 돕는 역량을 남기는 것.**

<a id="documentation-and-support"></a>

## 문서와 지원

**신뢰할 수 있는 양자 연구 AI를 함께 만들어 갈 분을 환영합니다.** 문제를 제보하고, 코드를 기여하고, 도구를 연결하고, 방법과 재현 사례를 공유하여 커뮤니티의 전문 지식이 더 많은 연구자에게 닿도록 도와주세요. 재현 가능한 사례, 검증된 부정적 결과, 반복되는 준비 작업을 없애는 수정, 학습자가 직접 손을 움직이게 하는 실험 모두 다음 작업의 출발점이 될 수 있습니다.

| 하고 싶은 일 | 시작할 곳 |
| --- | --- |
| 플랫폼을 사용하고 기능 이해하기 | [문서 색인](../README.md), [배포](../DEPLOYMENT.md), [문제 해결](../TROUBLESHOOTING.md) |
| Skill, 도구와 과학 검사 기여하기 | [플랫폼 확장](#extend-the-platform), [기여 가이드](../../CONTRIBUTING.md) |
| 애플리케이션 통합, 강의와 실험 만들기 | [실제 응용](#quantum-applications-for-practical-problems), [Quantum Learning](#quantum-learning) |
| 이슈 제보 또는 프로젝트 배경 알아보기 | [GitHub Issues](https://github.com/xi-zhao/OpenQuantum/issues), [프로젝트 이야기(중국어)](../communications/openquantum-wechat-launch.md) |

기여할 때는 출처, 저자, 라이선스, 조건과 검증 범위를 밝히고, 허가된 자료만 공유하세요. 비공개 세션과 미공개 데이터는 기본적으로 공개되지 않으며, 인증 정보는 절대 기여물에 포함해서는 안 됩니다. 보안 문제는 [보안 정책](../../SECURITY.md)에 따라 비공개로 제보하세요.

자세한 기술 문서는 주로 중국어로 작성되어 있으며, 영어판도 함께 참고할 수 있습니다. 이 번역에 대한 수정 제안을 환영합니다.

**[양자 탐구 시작하기](#quick-start)** · [자신의 방법과 애플리케이션 가져오기](#extend-the-platform)

**OpenQuantum · 손끝에서 만나는 양자 계산.**

<a id="license-and-acknowledgments"></a>

## 라이선스와 감사의 말

OpenQuantum의 양자 기능은 열린 과학과 오픈 소스 소프트웨어 위에 세워져 있습니다. 우리는 도메인 Skill, MCP 브리지, 네이티브 Tool과 적용 가능한 과학 검사를 관리하며, 기반이 되는 알고리즘 라이브러리, 외부 서비스와 애플리케이션 기반은 각자의 저자, 프로젝트 이름과 라이선스를 유지합니다.

| 사용하거나 이식한 프로젝트 | OpenQuantum에서의 역할 |
| --- | --- |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | 연구 워크벤치의 에이전트 런타임과 네이티브 Web UI: 세션, 모델 호출, 도구 스케줄링과 실행 기록 |
| [DSH Desktop](https://github.com/anywhere-labs/dsh-desktop) | 데스크톱 클라이언트 기반; OpenQuantum은 브랜드와 실행 구성을 조정하고 워크벤치를 재사용 |
| [CC Connect](../integrations/CC_CONNECT.md) | WeChat, Feishu 등 채널의 요청을 워크벤치로 가져오는 메신저 브리지 |
| [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) | Quantum Learning의 교육 기반; 전체 인터페이스, 서버와 교육 워크플로를 유지하고 OpenQuantum 이름, 테마와 모델 연결을 적용 |

각 기능을 뒷받침하는 계산, 장치와 참고 자료 프로젝트, 그리고 각각의 이식 방식은 [중국어 README](../../README.md#开源生态与致谢)에 정리되어 있습니다.

OpenQuantum 자체 코드는 별도 라이선스 디렉터리를 제외하고 [MIT License](../../LICENSE)를 따릅니다. [Mitiq 오류 완화 기능 디렉터리](../../.agents/skills/mitiq-error-mitigation/)는 GPL-3.0-only, [Metriq 공개 데이터 스냅숏](../../src/metriq-data/upstream/)은 CC-BY-4.0이며, 각각 자체 LICENSE와 NOTICE가 있습니다. DeepSeek Harness, DSH Desktop, OpenMAIC, FatQat, Qiskit MCP Servers, FieldQKit, Quantum Hardware MCP 등 서드파티 구성 요소는 각자의 라이선스를 유지합니다. 재배포하거나 선택적 통합을 활성화하기 전에 [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)를 확인하세요. 스크린숏과 다이어그램의 원본은 [이미지 설명](../images/README.md)에 있습니다.
