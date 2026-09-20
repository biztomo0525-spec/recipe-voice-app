# 音声レシピ提案アプリ

手持ちの食材を音声で伝えると、作れるレシピを提案する iPhone アプリ（個人利用）。

```
「冷蔵庫に豚こまとキャベツと人参が残ってます」
        ↓
── いま作れる
   電子レンジで簡単☆豚肉とキャベツの重ねコンソメ蒸し
── あと1つで作れる
   お弁当に★豚こま肉で作る簡単酢豚   不足: 玉ねぎ
```

## 現在の状態

| 層 | 状態 |
|---|---|
| ETL（レシピ収集・DB生成） | ✅ 完成 |
| 材料パーサ / 食材辞書 / 正規化 | ✅ 完成 |
| 検索スコアリング | ✅ 完成 |
| 音声テキストからの食材抽出 | ✅ 完成 |
| **UI（V1〜V3）** | ⬜ **未着手** |

検索ロジックは CLI で通し確認できる状態。UI だけが残っている。

## セットアップ

### 1. 依存の導入

```bash
npm install
```

Node.js 25 系が必要（TypeScript を変換なしで直接実行するため）。

### 2. 楽天ウェブサービスの認証情報

[Rakuten Developers](https://webservice.rakuten.co.jp/) でアプリを登録し、
`Application ID` と `Access Key` を取得する。登録時の申告内容は
[ADR-001](docs/ADR-001_レシピデータ供給元の選定.md) を参照。

```bash
cp .env.example .env
```

`.env` に値を記入する（`.gitignore` 済み。**絶対にコミットしないこと**）。

> ⚠️ `EXPO_PUBLIC_` 接頭辞を付けてはならない。Expo はその接頭辞の変数を
> アプリバイナリに埋め込むため、NFR-05 違反になる（D-11）。

### 3. 疎通確認

```bash
node --env-file=.env scripts/check-api.mjs
```

失敗する場合、**コードより先に送信元 IP を疑うこと**。
楽天側の `Allowed IP addresses` に現在のグローバル IP が登録されている必要がある（C-07）。

## レシピ DB の構築

```bash
# ① カテゴリ一覧を取得
node --env-file=.env scripts/etl/fetch-categories.mjs

# ② 全カテゴリを巡回してレシピを収集（約43分 / 1 QPS厳守・再開可能）
node --env-file=.env scripts/etl/fetch-recipes.mjs

# ③ SQLite を生成（assets/recipes.db）
node scripts/etl/build-db.ts
```

②は申告した 1 QPS を守るため意図的に低速。中断しても再実行で続きから再開する。
生 JSON は `data/raw/` に無加工で保存されるため、**パーサを作り直しても API の再取得は不要**（M-01）。

`data/` と `assets/recipes.db` は git 管理外（D-06：再配布の回避）。

## 動作確認

```bash
# 食材を直接指定
node scripts/search-cli.ts 豚こま キャベツ 人参

# 音声入力を想定した発話から
node scripts/search-cli.ts --speech "冷蔵庫に豚こまとキャベツと人参が残ってます"
```

## 開発

```bash
npm test              # テスト（node:test。101件）
npm run typecheck     # 型チェック
npx expo-doctor       # プロジェクト健全性

# 辞書のカバー率測定と、未登録食材の頻度順出力
node scripts/etl/report-coverage.ts --list 50
```

辞書を育てるときは `--list` の上位から `src/ingredients/dictionary.ts` に追加する（D-10）。

## ドキュメント

| 文書 | 内容 |
|---|---|
| [01_要件定義](docs/01_要件定義.md) | 利用シーン・機能要件・非機能要件・スコープ外 |
| [02_基本設計](docs/02_基本設計.md) | 画面・データモデル・**検索スコアリング仕様**・決定事項 |
| [03_詳細設計](docs/03_詳細設計.md) | テスト方針・辞書戦略・実測値 |
| [ADR-001](docs/ADR-001_レシピデータ供給元の選定.md) | データ供給元の比較検討と採用根拠 |
| [材料表記の実態調査](docs/材料表記の実態調査.md) | 実データ33,006件の集計 |

設計上の判断は `D-xx`、受け入れた制約は `C-xx` として文書に記録している。

## 次にやること

UI（V1 食材入力 / V2 レシピ一覧 / V3 レシピ詳細）の実装。

`expo-speech-recognition` はネイティブモジュールのため **Expo Go では動作しない**（P-02）。
Xcode でローカルの Development Build を作る必要がある。
Apple Developer Program（年 $99）は不要だが、**無料 Apple ID の署名は7日で失効する**ため
定期的な再ビルドが必要（P-12）。
