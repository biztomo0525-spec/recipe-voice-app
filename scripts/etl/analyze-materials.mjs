// ETL ②-0: 収集した生データから材料表記の分布を集計する
//   目的: 材料パーサ仕様(N-01)を実データに基づいて決める
//
// 既定では統計値のみを出力する。原文サンプルは出さない。
//   → 公開リポジトリに楽天データを置かないという D-06 の方針に合わせるため
// パーサ開発用に原文サンプルが必要なときだけ --with-samples を付ける。
//   その出力は data/ 配下（.gitignore 済み）へ保存すること。
//
// 実行: node scripts/etl/analyze-materials.mjs > docs/材料表記の実態調査.md
//       node scripts/etl/analyze-materials.mjs --with-samples > data/materials-samples.md
import { readdirSync, readFileSync } from 'node:fs';

const WITH_SAMPLES = process.argv.includes('--with-samples');
const DIR = 'data/raw/ranking';
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));

const recipes = new Map();               // recipeId -> recipe（カテゴリ間の重複を排除）
for (const f of files) {
  const json = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8'));
  for (const r of json.result ?? []) recipes.set(r.recipeId, r);
}

const mats = [];
for (const r of recipes.values()) for (const m of r.recipeMaterial ?? []) mats.push(m);

const pct = (n) => `${((n / mats.length) * 100).toFixed(1)}%`;
const count = (re) => mats.filter((m) => re.test(m)).length;

const freq = new Map();
for (const m of mats) freq.set(m, (freq.get(m) ?? 0) + 1);
const top = [...freq].sort((a, b) => b[1] - a[1]);

// 実際に使われている先頭記号を収集
const heads = new Map();
for (const m of mats) {
  const c = m.trim()[0];
  if (c && /[^\p{L}\p{N}]/u.test(c)) heads.set(c, (heads.get(c) ?? 0) + 1);
}

console.log('# 材料表記の実態調査（実データ集計）\n');
console.log(`| 項目 | 値 |\n|---|---|`);
console.log(`| 集計元ファイル数 | ${files.length} |`);
console.log(`| ユニークレシピ数 | ${recipes.size} |`);
console.log(`| 材料エントリ総数 | ${mats.length} |`);
console.log(`| ユニーク材料表記 | ${freq.size} |`);
console.log(`| 1レシピあたり平均材料数 | ${(mats.length / recipes.size).toFixed(1)} |`);

console.log('\n## 表記パターンの出現率\n');
console.log(`| パターン | 件数 | 割合 |\n|---|---|---|`);
const pats = [
  ['数字を含む（分量つき）', /[0-9０-９]/],
  ['先頭が記号', /^\s*[^\p{L}\p{N}\s]/u],
  ['括弧を含む', /[（(【\[]/],
  ['スペースを含む', /[\s　]/],
  ['「適量」「少々」等', /(適量|少々|適宜|お好み|ひとつまみ)/],
  ['単位らしき語を含む', /(大さじ|小さじ|カップ|[0-9０-９]\s*(g|ｇ|kg|ml|cc|個|本|枚|束|片|玉|缶|袋|パック|人分))/],
  ['スラッシュ/波ダッシュ', /[\/／〜~]/],
];
for (const [name, re] of pats) { const n = count(re); console.log(`| ${name} | ${n} | ${pct(n)} |`); }

console.log('\n## 先頭に現れる記号（上位15）\n');
console.log(`| 記号 | 件数 |\n|---|---|`);
for (const [c, n] of [...heads].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`| \`${c}\` | ${n} |`);

if (!WITH_SAMPLES) {
  console.log('\n---\n');
  console.log('> 原文サンプル（最頻出表記・分量つき表記・長文表記）は、');
  console.log('> 楽天レシピのデータを公開リポジトリに置かないという **D-06** の方針により本書には含めない。');
  console.log('> パーサ開発時は `node scripts/etl/analyze-materials.mjs --with-samples > data/materials-samples.md` で');
  console.log('> ローカル（.gitignore 済み）に生成すること。');
} else {
  console.log('\n## 最頻出の材料表記（上位40）\n');
  console.log(`| # | 表記 | 件数 |\n|---|---|---|`);
  top.slice(0, 40).forEach(([m, n], i) => console.log(`| ${i + 1} | \`${m}\` | ${n} |`));

  console.log('\n## 分量つき表記のサンプル（ランダム30件）\n');
  const withNum = mats.filter((m) => /[0-9０-９]/.test(m));
  const pick = [...new Set(withNum)].sort(() => Math.random() - 0.5).slice(0, 30);
  for (const m of pick) console.log(`- \`${m}\``);

  console.log('\n## 長い表記のサンプル（パーサが苦戦しそうなもの・上位20）\n');
  for (const m of [...new Set(mats)].sort((a, b) => b.length - a.length).slice(0, 20)) console.log(`- \`${m}\``);
}
