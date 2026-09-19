<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>양자 아이디어를 실행으로.</strong><br /><sub>오픈 소스 양자 Agent 및 애플리케이션 플랫폼</sub></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum은 양자 도구, 전문 연구 방법, 애플리케이션을 하나의 플랫폼에 모읍니다. AI Agent에 계산을 요청하고, 통합 앱을 사용하거나, 자신의 알고리즘과 서비스를 추가할 수 있습니다. 모델 서비스와 계산 백엔드는 서로 독립적으로 설정합니다.

**질문을 던지고, 계산을 실행하고, 새로운 기능을 함께 만듭니다.**

![OpenQuantum Desktop](../images/openquantum-desktop-20260919.jpg)

## 주요 기능

Qiskit과 TyxonQ를 이용한 회로 시뮬레이션, PyZX 회로 최적화, Graphix 측정 기반 양자 계산, Symmer 대칭성 기반 큐비트 축소, PauLie Lie 대수 분석을 지원합니다. TeNPy·SQD·Flow-VQE는 바닥상태와 화학 계산, Mitiq은 오류 완화, Stim·PyMatching·Deltakit·BP+LSD는 오류 정정을 다룹니다. Dynamiqs·OQuPy·TJM·Clifft로 동역학과 잡음을 분석하고, FatQat으로 초전도 및 원자계 실험을 수행할 수 있습니다. FieldQKit 백엔드 탐색과 Quantum Learning 학습·수업 기능도 통합되어 있습니다.

각 기능의 의존성과 과학적 적용 범위는 개별적으로 정해집니다. 로컬 계산의 성공은 실제 하드웨어 성능을 입증하지 않으며, 도구 실행 완료가 곧 과학적 검증 통과를 의미하지도 않습니다.

## OpenQuantum을 선택하는 이유

**질문에서 계산으로.** 지원되는 작업을 자연어로 요청하면 Agent가 전문 도구를 호출합니다. 입력, 물리적 가정, 결과에 대한 판단은 사용자가 맡습니다.

**한 번의 연구를 다음 연구의 출발점으로.** 작업 공간에 도구 입력과 결과를 남기고 조건을 바꾸며 탐구를 이어갈 수 있습니다. 과학적 검증은 각 기능의 지원 범위에 따릅니다.

**내 방법을 다른 사람도 쓰는 기능으로.** Skill, 계산 도구, 교육 자료와 앱을 추가할 수 있습니다. 모델과 계산 백엔드는 따로 설정하며, 원본 프로젝트의 저자와 라이선스를 존중합니다.

## 빠른 시작

현재 소스 코드로 실행하는 로컬 단일 사용자용 배포입니다. Git, Node.js 24 이상, Python 도구를 위한 uv를 준비하세요.

[uv](https://docs.astral.sh/uv/getting-started/installation/)

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
npm run dev
```

실행 로그에 표시된 로그인 URL을 여세요. 인증 후 브라우저에 작업대가 표시됩니다.

### 모델 설정

설정 → 모델에서 OpenAI-compatible Chat Completions 제공자의 URL, 모델 이름, API 키를 입력하고 OpenQuantum Agent Preset을 선택하세요. 양자 도구를 실행하려면 Tool Calling을 지원하는 모델이 필요합니다. 기본 경로의 .invalid 주소는 예시용이므로 실제 서비스 주소로 바꿔야 합니다. 모델 인증 정보와 양자 클라우드 인증 정보는 별개입니다.

모델 키 없이도 고정된 두 큐비트 Hamiltonian의 로컬 참조 예제를 실행할 수 있습니다.

```bash
npm run demo:quantum-ground-state
```

모델 설정 후 다음과 같이 요청해 보세요. “FatQat으로 두 큐비트의 영 상태에서 Bell 상태를 준비하세요. q0에 H를 적용한 뒤 q0를 제어, q1을 표적으로 CX를 적용하고, 정확한 확률을 seed=7, 1024 shots의 측정 빈도와 비교하세요.” 이상적인 확률은 00과 11이 각각 50%입니다. 실제 도구 입력과 계산 결과를 확인하세요. 최초 사용 시 의존성을 다운로드할 수 있습니다.

### 데스크톱

```bash
npm run desktop:setup
npm run desktop
```

Web과 Desktop은 같은 Harness 구성을 사용합니다. 동일한 홈을 사용하는 다른 호스트는 먼저 종료하세요.

## Quantum Learning

OpenQuantum을 실행하는 저장소와 같은 체크아웃에서 학습 앱을 준비하세요.

```bash
npm run learning:ui:setup
```

사이드바에서 Quantum Learning을 여세요. 새 Git worktree에는 별도 설치가 필요합니다. 설치가 불완전하다는 메시지가 나오면 해당 worktree에서 위 명령을 실행한 뒤 다시 여세요. OpenMAIC의 강의 자료·수업·편집 기능을 유지하고 모델은 Harness를 통해 사용합니다. 수업 데이터는 작업대 세션 로그와 분리되어 저장됩니다.

## 언어

설정 → 일반 → 언어에서 중국어 간체, 영어, 일본어, 한국어, 스페인어, 프랑스어, 독일어, 포르투갈어, 러시아어, 아랍어를 선택할 수 있습니다. 선택은 저장되며 내장 Quantum Learning에도 반영됩니다. 아랍어는 오른쪽에서 왼쪽으로 표시합니다. 기존 대화, 강의 자료, 사용자 Skill, 도구 출력은 번역하지 않습니다. 일부 기본 시스템 대화상자는 중국어·영어 이외의 언어에서 영어로 표시됩니다.

## 문서와 기여

Skill은 지식과 절차를 제공하고 Tool Provider는 실행 가능한 도구를 등록합니다. 과학적 검증이 필요한 기능은 독립 Validator와 증거에 기반한 Acceptance를 사용합니다. OpenQuantum은 DeepSeek Harness의 실행 기반을 재사용합니다. 자세한 사용법과 확장 안내는 영어판과 중국어판을 참고하세요.

[English](./README.en.md) · [中文](../../README.md) · [Documentation](../README.md) · [Contributing](../../CONTRIBUTING.md) · [Issues](https://github.com/xi-zhao/openQuantum/issues)

```bash
npm run harness:config
npm run desktop:check
npm run check
```

## 장기 계획과 RSI

장기적으로 양자 계산·HPC·AI의 연계, 앱과 교육 콘텐츠의 확장, 연구 방법의 지속적인 개선을 탐구합니다. 재귀적 자기 개선(RSI)은 연구 구상이며 현재 이러한 폐쇄 루프는 구현되지 않았습니다. 독립 검증, 새로운 작업에서의 비교, 전체 비용, 사용자 승인과 버전 롤백을 개선 수용의 조건으로 삼습니다.

[자세한 로드맵](../../README.md#rsi).

## 라이선스

OpenQuantum 자체 코드는 MIT 라이선스를 따릅니다. DeepSeek Harness, OpenMAIC, 양자 생태계 프로젝트의 저작권과 개별 라이선스는 유지됩니다. 재배포하거나 선택 기능을 사용하기 전에 Third-party notices를 확인하세요.

[MIT](../../LICENSE) · [Third-party notices](../../THIRD_PARTY_NOTICES.md)
