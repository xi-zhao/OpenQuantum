<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>量子のアイデアを、動くかたちに。</strong><br /><sub>量子技術のためのオープンソース Agent・アプリケーションプラットフォーム</sub></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum は、量子計算ツール、専門的な手法、アプリケーションを一つのプラットフォームに集約します。AI Agent に計算を依頼したり、統合アプリケーションを使ったり、自分のアルゴリズムやサービスを追加したりできます。モデルサービスと計算バックエンドは独立して設定します。

**問いを立て、計算を動かし、新たな能力を共につくる。**

![OpenQuantum Desktop](../images/openquantum-desktop-20260919.jpg)

## できること

Qiskit・TyxonQ による回路シミュレーション、PyZX による回路最適化、Graphix による測定型量子計算、Symmer による対称性を用いた量子ビット削減、PauLie による Lie 代数解析を利用できます。TeNPy・SQD・Flow-VQE は基底状態や化学計算、Mitiq は誤り緩和、Stim・PyMatching・Deltakit・BP+LSD は誤り訂正を扱います。Dynamiqs・OQuPy・TJM・Clifft はダイナミクスやノイズの解析、FatQat は超伝導・原子系の実験に対応します。FieldQKit によるバックエンド探索と、Quantum Learning による学習・授業も利用できます。

ソースの `main` には、QCut のゲート切断と期待値再構成、Compact の回路最適化、OpenQARP の VQD 励起状態計算も含まれます。これらの接続は標準で有効ですが、依存関係の準備が必要です。cqlib-qml の角度カーネル QSVM と FlagQuantum 回路ワークベンチは標準では無効で、必要に応じて有効化します。[適用範囲と検証](../integrations/CANDIDATE_LIBRARIES.md)をご覧ください。

現在のソースには **101 個の Skill**（自動選択 88、手動の分類索引 13）、**37 個の MCP 接続**、**220 個の設定可能な Tool 名**があります。これらは構成上の一覧であり、同時に利用可能な数ではありません。既存の名前を維持し、類似する入口の選び方を整理しました。[能力の選択](../integrations/CAPABILITY_SELECTION.md)を参照してください。

UnitaryLab の **quantum-skills の全 66 件のガイド**をネイティブ Skill に移植し、**49 個の実行可能な例**で上流の **39 個のアルゴリズムモジュール**とガイド固有の手法をカバーしています。Qiskit、PennyLane、quimb、PySCF、NumPy/SciPy を使用し、非公開の UnitaryLab ランタイムには依存しません。API 全体の互換性を意味するものではなく、置換による違いは[対応表](../integrations/UNITARYLAB_OPEN_COVERAGE.md)に記載しています。

Pauli Hamiltonian の Trotter / qDrift シミュレーションに加え、[qBraid による Qiskit/Cirq 変換、Clifft の測定・生のパリティ記録、QDMI の設定済み C ドライバー照会](../integrations/QUANTUM_INTEROP.md)を利用できます。QDMI のサンプルドライバーはオンライン QPU の状態を示すものではありません。

各機能には個別の依存関係と適用範囲があります。ローカル計算の成功は実機性能の証明ではなく、Tool の実行完了だけで科学的妥当性が保証されるわけでもありません。

## OpenQuantum を選ぶ理由

**問いから計算へ。** 対応するタスクを自然言語で伝え、Agent が専門ツールを呼び出します。入力、物理的な仮定、結果の判断は利用者が担います。

**一度の研究を、次の出発点に。** ワークベンチにはツールの入力と結果が残り、条件を変えて検討を続けられます。科学的な検証は各機能の対応範囲に従います。

**自分の方法を、他の人も使える能力に。** Skill、計算ツール、教材、アプリケーションを追加できます。モデルと計算バックエンドは独立して設定し、上流プロジェクトの著者とライセンスを尊重します。

## クイックスタート

本機での単一ユーザー利用向けに、デスクトップインストーラーとソースからの起動を選べます。

### デスクトップ版のインストール

[GitHub Releases](https://github.com/xi-zhao/OpenQuantum/releases/latest) から Mac（Apple Silicon / Intel）または Windows 用インストーラーをダウンロードできます。Node.js と uv を同梱した未署名のテストビルドで、ソースのビルドは不要です。[インストール手順](../DESKTOP_INSTALLERS.md)に従って起動し、モデルを設定してください。計算コンポーネントと Quantum Learning の依存関係は、利用するバージョンの準備手順を確認してください。

[v0.5.1 インストーラー](../releases/v0.5.1.md)には、その後 `main` に追加された上記の機能や [9 月 22 日の量子ライブラリ更新](../releases/2026-09-22-quantum-upstream-update.md)は含まれません。ソースの更新だけでインストール済みアプリが自動更新されることはありません。 9 月 24 日のアルゴリズム・相互運用機能と[拡張整理](../architecture/EXTENSION_GOVERNANCE.md)もソース版の更新で、v0.5.1 には含まれません。

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

「設定 → モデル」で OpenAI-compatible Chat Completions 対応プロバイダーの URL、モデル名、API キーを入力し、OpenQuantum の Agent Preset を選択します。量子ツールの実行には Tool Calling 対応モデルが必要です。標準ルートの .invalid アドレスはプレースホルダーなので、実際のサービスに変更してください。モデルの認証情報と量子クラウドの認証情報は別です。

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
npm run desktop
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
