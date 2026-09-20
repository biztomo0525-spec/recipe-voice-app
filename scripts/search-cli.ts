/**
 * 動作確認用 CLI：所持食材からレシピを提案する
 *   UI を作る前に、検索ロジックが実用になるかを実データで確認するためのもの
 *
 * 実行: node scripts/search-cli.ts 玉ねぎ 豚こま 卵
 */
import { DatabaseSync } from 'node:sqlite';
import { normalizeIngredient, getIngredient } from '../src/ingredients/normalizer.ts';
import { searchRecipes, type Recipe } from '../src/search/score.ts';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('使い方: node scripts/search-cli.ts <食材> [食材...]');
  process.exit(1);
}

// ───────── 入力食材の正規化 ─────────
const ownedIds: number[] = [];
const unknown: string[] = [];
for (const a of args) {
  const id = normalizeIngredient(a);
  if (id === null) unknown.push(a);
  else ownedIds.push(id);
}

console.log('■ 認識した食材');
console.log('  ' + (ownedIds.map((i) => getIngredient(i)!.name).join(' / ') || '(なし)'));
if (unknown.length) console.log('■ 辞書にない食材\n  ' + unknown.join(' / '));

// ───────── DB 読み込み ─────────
const db = new DatabaseSync('assets/recipes.db', { readOnly: true });
const rows = db
  .prepare(
    `SELECT r.recipe_id, r.title, r.url, r.indication, r.cost,
            m.seq, m.raw, m.ingredient_id
       FROM recipes r JOIN recipe_materials m ON m.recipe_id = r.recipe_id
      ORDER BY r.recipe_id, m.seq`,
  )
  .all() as any[];

const recipes = new Map<number, Recipe>();
for (const row of rows) {
  let r = recipes.get(row.recipe_id as number);
  if (!r) {
    r = {
      id: row.recipe_id as number,
      title: row.title as string,
      url: row.url as string,
      indication: (row.indication as string) ?? null,
      cost: (row.cost as string) ?? null,
      materials: [],
    };
    recipes.set(r.id, r);
  }
  r.materials.push({
    raw: row.raw as string,
    ingredientId: (row.ingredient_id as number | null) ?? null,
  });
}
db.close();

// ───────── 検索 ─────────
const t0 = performance.now();
const groups = searchRecipes([...recipes.values()], ownedIds);
const ms = (performance.now() - t0).toFixed(0);

console.log(`\n■ 検索結果（対象 ${recipes.size} レシピ / ${ms} ms）`);
if (groups.length === 0) {
  console.log('  該当なし');
} else {
  for (const g of groups) {
    console.log(`\n── ${g.label}（${g.total}件${g.total > g.items.length ? `／上位${g.items.length}件を表示` : ''}）`);
    for (const s of g.items.slice(0, 5)) {
      const miss = s.missingIds.map((i) => getIngredient(i)!.name).join('・');
      const info = [s.recipe.indication, s.recipe.cost].filter(Boolean).join(' / ');
      console.log(`  ${s.recipe.title}`);
      console.log(
        `    手持ち${s.matched}品使用` +
          (miss ? ` / 不足: ${miss}` : '') +
          (s.unknownRaws.length ? ` / 要確認${s.unknownRaws.length}件` : '') +
          (info ? ` / ${info}` : ''),
      );
    }
  }
}
