<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>OpenQuantum — 信頼できる量子研究 AI を、ともに育てる。</strong><br /><sub>量子研究の専門知を、一つの OpenQuantum に</sub></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum は、オープンソースで共同開発に開かれた量子研究 AI プラットフォームです。コミュニティの優れたソフトウェア、アルゴリズム、公開研究成果をつなぎ、AI による問題の分析、手法の選択、計算の実行、結果の確認を支援します。専門知を、実際の研究に使える力へとつなげます。

**まず一つのタスクを完了し、その手法を自分の問いへ。** 例を実行し、入力を変え、結果を確認します。プログラム、パラメーター、出力を残して、次の研究に活用できます。

**[Codex プラグインをインストール](../integrations/CODEX_AGENT_INSTALL.md)** · [Desktop をインストール](../DESKTOP_INSTALLERS.md)

**OpenQuantum 0.8.3 公開：**[Desktop](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.3) · [Codex プラグイン](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.3)。両者の製品バージョンを統一しました。Tools・MCP・Skills を用途別の 8 分類で整理し、検索と状態フィルターを追加しました。Desktop の起動アイコンも OpenQuantum に統一しました。

![OpenQuantum Desktop](../images/openquantum-desktop-20261013.jpg)

## できること

Qiskit・TyxonQ による回路シミュレーション、PyZX による回路最適化、Graphix による測定型量子計算、Symmer による対称性を用いた量子ビット削減、PauLie による Lie 代数解析を利用できます。TeNPy・SQD・Flow-VQE は基底状態や化学計算、Mitiq は誤り緩和、Stim・PyMatching・Deltakit・BP+LSD は誤り訂正を扱います。Dynamiqs・OQuPy・TJM・Clifft はダイナミクスやノイズの解析、FatQat は超伝導・原子系の実験に対応します。FieldQKit によるバックエンド探索と、Quantum Learning による学習・授業も利用できます。

ソースの `main` には、QCut のゲート切断と期待値再構成、Compact の回路最適化、OpenQARP の VQD 励起状態計算も含まれます。これらの接続は標準で有効ですが、依存関係の準備が必要です。cqlib-qml の角度カーネル QSVM と FlagQuantum 回路ワークベンチは標準では無効で、必要に応じて有効化します。[適用範囲と検証](../integrations/CANDIDATE_LIBRARIES.md)をご覧ください。

現在のソースには **157 個の Skill**（自動選択 144、手動の分類索引 13）、**91 個の MCP 接続**、**5 個のネイティブ量子 Tool**があります。セッションで利用できる機能は、有効な接続と準備済み環境に依存します。[能力の選択](../integrations/CAPABILITY_SELECTION.md)を参照してください。

v0.8.1 は **85 の SDK・ソース環境**でネイティブ公開 API を利用する経路を提供します。エージェントは独自のプログラムを作成し、API を組み合わせ、完全な成果物を保存できます。便宜的な Tool の既定例に用途を限定しません。依存関係はタスクごとに明示的に準備します。プラットフォーム、アカウント、ライセンス、任意バックエンドの制約は残ります。[SDK 統合記録](../integrations/FULL_SDK_ACCESS.md)に工程検証の範囲を示します。実際の研究課題による受入れは未実施で、`scientificValidation=not_evaluated` です。

v0.6.0 は、[各社 SDK 17 件](../integrations/VENDOR_SDKS.md)、[企業・研究機関の能力 20 件](../integrations/SDK_EXPANSION.md)、[ネットワーク・制御・光学・クラウドの 15 件](../integrations/SDK_GAPS.md)という 3 回の統合で追加した **52 個の SDK 能力パッケージ**をまとめます。微分可能回路、資源見積もり、化学演算子、光子計算、パルスコンパイル、量子ネットワークを扱い、[Bloqade Analog](../integrations/BLOQADE_ANALOG.md) による原子配列のローカル計算も加わります。公開する操作は各説明の範囲に限られ、アカウント、認証、権限、ライセンスは利用者が設定します。ローカル検証はクラウド接続、QPU、科学的受入れの検証を意味しません。

UnitaryLab の **quantum-skills の全 66 件のガイド**をネイティブ Skill に移植し、**49 個の実行可能な例**で上流の **39 個のアルゴリズムモジュール**とガイド固有の手法をカバーしています。Qiskit、PennyLane、quimb、PySCF、NumPy/SciPy を使用し、非公開の UnitaryLab ランタイムには依存しません。API 全体の互換性を意味するものではなく、置換による違いは[対応表](../integrations/UNITARYLAB_OPEN_COVERAGE.md)に記載しています。

Pauli Hamiltonian の Trotter / qDrift シミュレーションに加え、[qBraid による Qiskit/Cirq 変換、Clifft の測定・生のパリティ記録、QDMI の設定済み C ドライバー照会](../integrations/QUANTUM_INTEROP.md)を利用できます。QDMI のサンプルドライバーはオンライン QPU の状態を示すものではありません。

各機能には個別の依存関係と適用範囲があります。ローカル計算の成功は実機性能の証明ではなく、Tool の実行完了だけで科学的妥当性が保証されるわけでもありません。

## OpenQuantum を選ぶ理由

**幅広い専門領域。** 量子アルゴリズム、回路シミュレーション、量子化学、多体系計算、量子誤り訂正をカバーし、ツールと手法をつなぎます。準備にかける時間を減らし、研究課題の探索に集中できます。

**実測で示す高速化。** [PennyLane の Pauli 交換子計算](../../README.md#pennylane-rust-case)と [QuTiP の Wigner 関数計算](../../README.md#qutip-rust-case)の最適化事例では、代表タスクの呼び出し全体がそれぞれ **5.09 倍**、**5.69 倍**高速化しました。入出力変換を含めて計測し、元のライブラリと独立した参照計算で結果を確認しています。

**共同開発で広がる研究能力。** 価値あるオープンソースプロジェクトと論文の手法を継続的に取り入れ、適合、統合、最適化、検証を進めます。質問、コード、ツール、研究手法、再現事例の共有を通じて、誰もが参加できます。

## クイックスタート

本機での単一ユーザー利用向けに、デスクトップインストーラーとソースからの起動を選べます。

### デスクトップ版のインストール

OpenQuantum 0.8.3 では、原版 [anywhere-labs DSH Desktop 2.0.7](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.7) と OpenQuantum 能力アーカイブを使用します。Harness は `0.1.5-rc.1` のままです。アーカイブは Node.js と uv を同梱し、Mac は `install.command`、Windows は `install.cmd` で導入します。ブランド、量子コンポーネント、Quantum Learning、更新入口を保ち、原版 UI の変更を最小限にします。[インストールと更新手順](../DESKTOP_INSTALLERS.md)を確認してください。

先に原版 DSH Desktop をインストールしてください。[0.8.3 Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.3) から Mac Apple Silicon、Mac Intel、Windows x64 用のアーカイブを選び、`SHA256SUMS` を確認してから展開してください。インストーラーは OpenQuantum アイコン付きの `OpenQuantum.app`（Mac）または `OpenQuantum.lnk`（Windows）を作成します。原版 Desktop の名前とバージョンは維持します。更新時は既存の Skill、モデル設定、MCP 設定を保持します。計算環境と Quantum Learning は所定の準備が必要です。

### Codex

[0.8.3 完全インストールパッケージ](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.8.3/openquantum-0.8.3-codex-install.zip)を取得し、[インストール手順](../integrations/CODEX_AGENT_INSTALL.md)に従ってください。134 個の Skill と 71 個の科学 Tool を Codex の会話で利用できます。対応する Codex、Node.js 24 以降、npm が必要です。科学計算の依存関係は必要に応じて準備します。

### ソースから起動

開発やソースの `main` にある機能を利用する場合は、Git、Node.js 24 以降、Python ツール用の uv を用意して、次の手順で起動してください。

[uv](https://docs.astral.sh/uv/getting-started/installation/)

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
npm run dev
```

起動ログに表示されるログイン URL を開いてください。認証後、ブラウザーにワークベンチが表示されます。

### モデルの設定

「設定 → モデル」で OpenAI-compatible Chat Completions 対応プロバイダーの URL、モデル名、API キーを入力し、OpenQuantum の Agent Preset を選択します。量子ツールの実行には Tool Calling 対応モデルが必要です。Desktop の新規インストール時はモデル一覧が空です。利用するサービスを自分で追加してください。モデルの認証情報と量子クラウドの認証情報は別です。

モデルキーがなくても、固定された二量子ビット Hamiltonian のローカル参照例を実行できます。

```bash
npm run demo:quantum-ground-state
```

ソース版で以下の FatQat タスクを実行する前に、リポジトリのルートで依存環境を明示的に準備してください。ダウンロードは準備時に行い、計算中に自動インストールはしません。

```bash
node scripts/setup-paper-tools.mjs fatqat-workbench
```

アルゴリズム例は `npm run capability:algorithms:setup -- --minimal` から始められます。必要に応じて `--group gradients`、`--group pennylane`、`--group tensor`、`--group chemistry` で追加でき、既存のグループは保持されます。引数なしの準備は全依存関係を対象とします。完全な環境には PySCF が含まれるため Windows では WSL を推奨し、数値検証の範囲は macOS CPU です。[実行手順](../../examples/quantum-algorithms/README.md)を参照してください。

ソース更新後は使用する能力の準備コマンドを再実行し、ワークベンチを再起動して新しいセッションを開いてください。既存の Python 環境は同じ場所で検証・同期されます。[環境の準備と更新](../integrations/LOCAL_ENVIRONMENTS.md)。

モデルの設定後は、例えば「FatQat で二量子ビットのゼロ状態から Bell 状態を作成してください。q0 に H、続いて q0 を制御、q1 を標的とする CX を適用し、厳密な確率と seed=7、1024 shots の測定頻度を比較してください」と依頼できます。理想確率は 00 と 11 がそれぞれ 50% です。実際の Tool 入力と計算結果を確認してください。

### デスクトップ

同じソースから Desktop をビルドする場合は、上のソースインストールを完了し、Corepack とシステムの C++ ビルドツールを用意してください。

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop -- --source
```

同じソースディレクトリから起動する Web と Desktop は Harness のデータと設定を共有します。同じデータディレクトリを使うもう一方のホストは、起動前に終了してください。

## Quantum Learning

OpenQuantum を起動するリポジトリと同じ場所で、学習アプリケーションを準備します。

```bash
npm run learning:ui:setup
```

サイドバーから Quantum Learning を開きます。新しい Git worktree には個別のインストールが必要です。「インストールが不完全」と表示される場合は、その worktree で上のコマンドを実行して開き直してください。OpenMAIC の教材・授業・編集機能を保持し、モデルは Harness 経由で利用します。授業データはワークベンチのセッションログとは別に保存されます。

## 言語

「設定 → 一般 → 言語」で簡体字中国語、英語、日本語、韓国語、スペイン語、フランス語、ドイツ語、ポルトガル語、ロシア語、アラビア語を選べます。選択は保存され、埋め込みの Quantum Learning にも反映されます。アラビア語は右から左に表示します。既存の会話、教材、ユーザーの Skill、Tool 出力は翻訳しません。一部のネイティブシステムダイアログは、中国語・英語以外では英語を使用します。

## ドキュメントと貢献

Skill は知識と手順、Tool Provider は実行可能なツールを提供します。科学的検証が必要な機能は独立した Validator と証拠に基づく Acceptance を利用します。OpenQuantum は DeepSeek Harness の実行基盤を再利用します。詳細な利用・拡張手順は英語版と中国語版をご覧ください。

信頼できる量子研究 AI を、ともに育てましょう。問題の報告、コードやツールの追加、研究手法や再現事例の共有など、どなたでも参加できます。

[English](./README.en.md) · [中文](../../README.md) · [Documentation](../README.md) · [Contributing](../../CONTRIBUTING.md) · [Issues](https://github.com/xi-zhao/openQuantum/issues)

```bash
npm run harness:config
npm run desktop:check
npm run check
```

## 今後の展望と RSI

長期的には、量子計算・HPC・AI の連携、アプリケーションと教材の拡充、研究手法の継続的な改善を目指します。再帰的自己改善（RSI）は研究構想であり、現在のプラットフォームにその閉ループは実装されていません。独立した検証、新しいタスクでの比較、総コスト、利用者の承認、バージョンのロールバックを条件として検討します。

[詳しいロードマップ](../../README.md#rsi).

## ライセンス

OpenQuantum 独自コードは MIT ライセンスです。DeepSeek Harness、OpenMAIC、各量子ソフトウェアの著作権表示と個別ライセンスを保持しています。再配布や追加機能の利用前に Third-party notices を確認してください。

[MIT](../../LICENSE) · [Third-party notices](../../THIRD_PARTY_NOTICES.md)
