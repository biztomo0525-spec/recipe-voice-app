/**
 * ETL ②-1: 辞書のカバー率を測定し、未登録食材を頻度順に出力する
 *   基本設計 第6章「正規化できなかった材料を頻度順で出力し、上位から辞書へ追加する」
 * 実行: node scripts/etl/report-coverage.ts [--list N]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { parseMaterial } from '../../src/ingredients/parser.ts';
import { normalizeIngredient, getIngredient } from '../../src/ingredients/normalizer.ts';

const D = 'data/raw/ranking';
const recipes = new Map<number, any>();
for (const f of readdirSync(D).filter((x) => x.endsWith('.json')))
  for (const r of JSON.parse(readFileSync(`${D}/${f}`, 'utf8')).result ?? []) recipes.set(r.recipeId, r);

let total = 0, resolved = 0, parsedNull = 0;
const unresolved = new Map<string, number>();
const staples = new Set<number>();

for (const r of recipes.values()) {
  for (const raw of r.recipeMaterial ?? []) {
    total++;
    const cand = parseMaterial(raw);
    if (cand === null) { parsedNull++; continue; }
    const id = normalizeIngredient(cand);
    if (id !== null) {
      resolved++;
      if (getIngredient(id)?.staple) staples.add(id);
    } else {
      unresolved.set(cand, (unresolved.get(cand) ?? 0) + 1);
    }
  }
}

const pct = (n: number) => ((n / total) * 100).toFixed(1) + '%';
console.log('| 指標 | 値 |');
console.log('|---|---|');
console.log(`| レシピ数 | ${recipes.size} |`);
console.log(`| 材料エントリ総数 | ${total} |`);
console.log(`| **辞書に当たった** | **${resolved} (${pct(resolved)})** |`);
console.log(`| 食材でないと判定(パーサ) | ${parsedNull} (${pct(parsedNull)}) |`);
console.log(`| 辞書未登録 | ${total - resolved - parsedNull} (${pct(total - resolved - parsedNull)}) |`);
console.log(`| 未登録のユニーク表記 | ${unresolved.size} |`);

// レシピ単位のカバー率（主要材料がどれだけ解決できているか）
let full = 0, half = 0;
for (const r of recipes.values()) {
  const mats = (r.recipeMaterial ?? []).map(parseMaterial).filter((x: string | null) => x !== null);
  if (!mats.length) continue;
  const ok = mats.filter((m: string) => normalizeIngredient(m) !== null).length;
  if (ok === mats.length) full++;
  if (ok / mats.length >= 0.5) half++;
}
console.log(`\n| レシピ単位 | 件数 | 割合 |`);
console.log('|---|---|---|');
console.log(`| 材料を100%解決できた | ${full} | ${((full / recipes.size) * 100).toFixed(1)}% |`);
console.log(`| 材料を50%以上解決できた | ${half} | ${((half / recipes.size) * 100).toFixed(1)}% |`);

const n = Number(process.argv[process.argv.indexOf('--list') + 1]) || 0;
if (n > 0) {
  console.log(`\n## 未登録の食材名（頻度上位${n}件・辞書追加の優先順位）\n`);
  const top = [...unresolved].sort((a, b) => b[1] - a[1]).slice(0, n);
  console.log(top.map(([k, v]) => `${v}\t${k}`).join('\n'));
}
