<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>量子技術のためのオープンソース Agent・アプリケーションプラットフォーム</strong></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum は、量子計算ツール、専門的な手法、アプリケーションを一つのプラットフォームに集約します。AI Agent に計算を依頼したり、統合アプリケーションを使ったり、自分のアルゴリズムやサービスを追加したりできます。モデルサービスと計算バックエンドは独立して設定します。

![OpenQuantum Desktop](../images/openquantum-desktop-20260919.jpg)

## できること

Qiskit・TyxonQ による回路シミュレーション、PyZX による回路最適化、Graphix による測定型量子計算、Symmer による対称性を用いた量子ビット削減、PauLie による Lie 代数解析を利用できます。TeNPy・SQD・Flow-VQE は基底状態や化学計算、Mitiq は誤り緩和、Stim・PyMatching・Deltakit・BP+LSD は誤り訂正を扱います。Dynamiqs・OQuPy・TJM・Clifft はダイナミクスやノイズの解析、FatQat は超伝導・原子系の実験に対応します。FieldQKit によるバックエンド探索と、Quantum Learning による学習・授業も利用できます。

各機能には個別の依存関係と適用範囲があります。ローカル計算の成功は実機性能の証明ではなく、Tool の実行完了だけで科学的妥当性が保証されるわけでもありません。

## クイックスタート

現在はソースコードから起動する、本機での単一ユーザー利用向けの配布形態です。Git、Node.js 24 以降、Python 用ツールを管理する uv を用意してください。

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

モデルの設定後は、例えば「FatQat で二量子ビットのゼロ状態から Bell 状態を作成してください。q0 に H、続いて q0 を制御、q1 を標的とする CX を適用し、厳密な確率と seed=7、1024 shots の測定頻度を比較してください」と依頼できます。理想確率は 00 と 11 がそれぞれ 50% です。実際の Tool 入力と計算結果を確認してください。初回は依存関係のダウンロードが発生する場合があります。

### デスクトップ

```bash
npm run desktop:setup
npm run desktop
```

Web と Desktop は同じ Harness 構成を使います。同じホームを使うもう一方のホストは、起動前に終了してください。

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

## ライセンス

OpenQuantum 独自コードは MIT ライセンスです。DeepSeek Harness、OpenMAIC、各量子ソフトウェアの著作権表示と個別ライセンスを保持しています。再配布や追加機能の利用前に Third-party notices を確認してください。

[MIT](../../LICENSE) · [Third-party notices](../../THIRD_PARTY_NOTICES.md)
