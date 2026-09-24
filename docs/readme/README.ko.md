<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>양자 아이디어를 실행으로.</strong><br /><sub>오픈 소스 양자 Agent 및 애플리케이션 플랫폼</sub></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum은 양자 도구, 전문 연구 방법, 애플리케이션을 하나의 플랫폼에 모읍니다. AI Agent에 계산을 요청하고, 통합 앱을 사용하거나, 자신의 알고리즘과 서비스를 추가할 수 있습니다. 모델 서비스와 계산 백엔드는 서로 독립적으로 설정합니다.

**질문을 던지고, 계산을 실행하고, 새로운 기능을 함께 만듭니다.**

![OpenQuantum Desktop](../images/openquantum-desktop-20260919.jpg)

## 주요 기능

Qiskit과 TyxonQ를 이용한 회로 시뮬레이션, PyZX 회로 최적화, Graphix 측정 기반 양자 계산, Symmer 대칭성 기반 큐비트 축소, PauLie Lie 대수 분석을 지원합니다. TeNPy·SQD·Flow-VQE는 바닥상태와 화학 계산, Mitiq은 오류 완화, Stim·PyMatching·Deltakit·BP+LSD는 오류 정정을 다룹니다. Dynamiqs·OQuPy·TJM·Clifft로 동역학과 잡음을 분석하고, FatQat으로 초전도 및 원자계 실험을 수행할 수 있습니다. FieldQKit 백엔드 탐색과 Quantum Learning 학습·수업 기능도 통합되어 있습니다.

소스 `main`에는 QCut 게이트 분할과 기댓값 재구성, Compact 회로 최적화, OpenQARP VQD 들뜬상태 계산도 포함됩니다. 이 연결들은 기본으로 활성화되지만 의존성을 준비해야 합니다. cqlib-qml 각도 커널 QSVM과 FlagQuantum 회로 작업대는 기본으로 비활성화되어 필요할 때 켭니다. [적용 범위와 검증](../integrations/CANDIDATE_LIBRARIES.md)을 참고하세요.

현재 소스에는 **Skill 101개**(자동 선택 88개, 수동 분류 색인 13개), **MCP 연결 37개**, **설정 가능한 Tool 이름 220개**가 있습니다. 이는 구성 목록이며 동시에 사용할 수 있는 도구 수는 아닙니다. 기존 이름은 유지하고 비슷한 기능의 선택 기준을 정리했습니다. [기능 선택 안내](../integrations/CAPABILITY_SELECTION.md)를 참고하세요.

UnitaryLab의 **quantum-skills 가이드 66개**를 네이티브 Skill로 옮겼으며, **실행 가능한 예제 49개**가 원본 알고리즘 모듈 **39개**와 가이드의 추가 방법을 다룹니다. Qiskit, PennyLane, quimb, PySCF, NumPy/SciPy를 사용하며 비공개 UnitaryLab 런타임에 의존하지 않습니다. 전체 API 호환성을 뜻하지 않으며 구현 차이는 [대응표](../integrations/UNITARYLAB_OPEN_COVERAGE.md)에 공개되어 있습니다.

Pauli Hamiltonian의 Trotter / qDrift 시뮬레이션과 함께 [qBraid Qiskit/Cirq 변환, Clifft 측정 및 원시 패리티 기록, QDMI의 구성된 C 드라이버 조회](../integrations/QUANTUM_INTEROP.md)를 지원합니다. QDMI 예제 드라이버의 데이터는 실제 온라인 QPU 상태가 아닙니다.

각 기능의 의존성과 과학적 적용 범위는 개별적으로 정해집니다. 로컬 계산의 성공은 실제 하드웨어 성능을 입증하지 않으며, 도구 실행 완료가 곧 과학적 검증 통과를 의미하지도 않습니다.

## OpenQuantum을 선택하는 이유

**질문에서 계산으로.** 지원되는 작업을 자연어로 요청하면 Agent가 전문 도구를 호출합니다. 입력, 물리적 가정, 결과에 대한 판단은 사용자가 맡습니다.

**한 번의 연구를 다음 연구의 출발점으로.** 작업 공간에 도구 입력과 결과를 남기고 조건을 바꾸며 탐구를 이어갈 수 있습니다. 과학적 검증은 각 기능의 지원 범위에 따릅니다.

**내 방법을 다른 사람도 쓰는 기능으로.** Skill, 계산 도구, 교육 자료와 앱을 추가할 수 있습니다. 모델과 계산 백엔드는 따로 설정하며, 원본 프로젝트의 저자와 라이선스를 존중합니다.

## 빠른 시작

로컬 단일 사용자용으로 데스크톱 설치 파일 또는 소스 실행을 선택할 수 있습니다.

### 데스크톱 설치 파일

[GitHub Releases](https://github.com/xi-zhao/OpenQuantum/releases/latest)에서 Mac(Apple Silicon / Intel) 또는 Windows 설치 파일을 받으세요. Node.js와 uv가 포함된 서명되지 않은 테스트 빌드이며 소스 빌드가 필요하지 않습니다. [설치 안내](../DESKTOP_INSTALLERS.md)에 따라 앱을 실행한 뒤 모델을 설정하세요. 계산 구성 요소와 Quantum Learning의 의존성은 해당 버전의 준비 안내를 따르세요.

[v0.5.1 설치 파일](../releases/v0.5.1.md)에는 이후 `main`에 추가된 위 기능과 [9월 22일 양자 라이브러리 업데이트](../releases/2026-09-22-quantum-upstream-update.md)가 포함되지 않습니다. 소스가 변경되어도 설치된 앱이 자동으로 업데이트되지는 않습니다. 9월 24일 알고리즘·상호 운용 기능과 [확장 구성 정리](../architecture/EXTENSION_GOVERNANCE.md)도 소스 업데이트이며 v0.5.1에는 포함되지 않습니다.

### 소스로 실행

개발하거나 소스 `main`의 기능을 사용하려면 Git, Node.js 24 이상, Python 도구용 uv를 준비하고 아래 절차로 실행하세요.

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

소스 버전에서 아래 FatQat 작업을 실행하기 전에 저장소 루트에서 환경을 명시적으로 준비하세요. 다운로드는 준비 단계에서 수행하며 계산 호출이 의존성을 자동 설치하지 않습니다.

```bash
node scripts/setup-paper-tools.mjs fatqat-workbench
```

알고리즘 예제는 `npm run capability:algorithms:setup -- --minimal`로 시작할 수 있습니다. 필요에 따라 `--group gradients`, `--group pennylane`, `--group tensor`, `--group chemistry`로 추가하며 기존 그룹은 유지합니다. 인자 없는 준비는 전체 의존성을 설치합니다. 전체 환경은 PySCF를 포함하므로 Windows에서는 WSL을 권장하며 수치 검증은 macOS CPU에서 수행했습니다. [실행 안내](../../examples/quantum-algorithms/README.md)를 참고하세요.

소스 업데이트 후에는 사용하는 기능의 준비 명령을 다시 실행하고 워크벤치를 재시작한 뒤 새 세션을 여세요. 기존 Python 환경은 같은 위치에서 확인하고 동기화합니다. [환경 준비와 업그레이드](../integrations/LOCAL_ENVIRONMENTS.md).

모델 설정 후 다음과 같이 요청해 보세요. “FatQat으로 두 큐비트의 영 상태에서 Bell 상태를 준비하세요. q0에 H를 적용한 뒤 q0를 제어, q1을 표적으로 CX를 적용하고, 정확한 확률을 seed=7, 1024 shots의 측정 빈도와 비교하세요.” 이상적인 확률은 00과 11이 각각 50%입니다. 실제 도구 입력과 계산 결과를 확인하세요.

### 데스크톱

같은 소스에서 Desktop을 빌드하려면 위 소스 설치를 완료하고 Corepack과 시스템 C++ 빌드 도구를 준비하세요.

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop
```

동일한 소스 디렉터리에서 실행하는 Web과 Desktop은 Harness 데이터와 설정을 공유합니다. 같은 데이터 디렉터리를 사용하는 다른 호스트는 먼저 종료하세요.

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
