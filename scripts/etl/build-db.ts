/**
 * ETL ②-2: 生JSON から アプリにバンドルする SQLite を生成する
 *   スキーマは基本設計 第4章に対応
 * 実行: node scripts/etl/build-db.ts
 * 出力: assets/recipes.db（git管理外 / D-06）
 */
import { readdirSync, readFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { parseMaterial } from '../../src/ingredients/parser.ts';
import { normalizeIngredient, INGREDIENTS } from '../../src/ingredients/normalizer.ts';
import { DICTIONARY } from '../../src/ingredients/dictionary.ts';

const RAW = 'data/raw/ranking';
const OUT = 'assets/recipes.db';

/** 「指定なし」は値として持たない（D-09） */
const clean = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return !s || s === '指定なし' ? null : s;
};

mkdirSync('assets', { recursive: true });
if (existsSync(OUT)) rmSync(OUT);
const db = new DatabaseSync(OUT);

db.exec(`
  PRAGMA journal_mode = OFF;
  CREATE TABLE recipes (
    recipe_id    INTEGER PRIMARY KEY,
    title        TEXT NOT NULL,
    url          TEXT NOT NULL,
    image_url    TEXT,
    indication   TEXT,
    cost         TEXT,
    description  TEXT,
    category_id  TEXT NOT NULL
  );
  CREATE TABLE ingredients (
    ingredient_id INTEGER PRIMARY KEY,
    name          TEXT NOT NULL UNIQUE,
    kind          TEXT,
    is_staple     INTEGER NOT NULL DEFAULT 0,
    parent_id     INTEGER REFERENCES ingredients(ingredient_id)
  );
  CREATE TABLE ingredient_synonyms (
    synonym       TEXT PRIMARY KEY,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(ingredient_id)
  );
  CREATE TABLE recipe_materials (
    recipe_id     INTEGER NOT NULL REFERENCES recipes(recipe_id),
    seq           INTEGER NOT NULL,
    raw           TEXT NOT NULL,
    ingredient_id INTEGER REFERENCES ingredients(ingredient_id),
    PRIMARY KEY (recipe_id, seq)
  );
`);

// ───────── 食材マスタ ─────────
const insIng = db.prepare(
  'INSERT INTO ingredients (ingredient_id, name, kind, is_staple, parent_id) VALUES (?, ?, ?, ?, ?)',
);
const insSyn = db.prepare('INSERT OR IGNORE INTO ingredient_synonyms VALUES (?, ?)');

db.exec('BEGIN');
for (const ing of INGREDIENTS) {
  insIng.run(ing.id, ing.name, ing.kind ?? null, ing.staple ? 1 : 0, ing.parentId);
}
const idOfName = new Map(INGREDIENTS.map((i) => [i.name, i.id]));
let synCount = 0;
for (const d of DICTIONARY) {
  for (const s of d.synonyms ?? []) {
    insSyn.run(s, idOfName.get(d.name)!);
    synCount++;
  }
}
db.exec('COMMIT');

// ───────── レシピ ─────────
const seen = new Map<number, { rec: any; categoryId: string }>();
for (const f of readdirSync(RAW).filter((x) => x.endsWith('.json'))) {
  const categoryId = f.replace(/\.json$/, '');
  for (const r of JSON.parse(readFileSync(`${RAW}/${f}`, 'utf8')).result ?? []) {
    if (!seen.has(r.recipeId)) seen.set(r.recipeId, { rec: r, categoryId });
  }
}

const insRec = db.prepare(
  'INSERT INTO recipes (recipe_id, title, url, image_url, indication, cost, description, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
);
const insMat = db.prepare('INSERT INTO recipe_materials VALUES (?, ?, ?, ?)');

let materialCount = 0;
let resolvedCount = 0;
db.exec('BEGIN');
for (const { rec, categoryId } of seen.values()) {
  insRec.run(
    rec.recipeId,
    rec.recipeTitle,
    rec.recipeUrl,
    clean(rec.foodImageUrl),
    clean(rec.recipeIndication),
    clean(rec.recipeCost),
    clean(rec.recipeDescription),
    categoryId,
  );
  const raws: string[] = rec.recipeMaterial ?? [];
  raws.forEach((raw, seq) => {
    const ingredientId = normalizeIngredient(parseMaterial(raw));
    insMat.run(rec.recipeId, seq, raw, ingredientId);
    materialCount++;
    if (ingredientId !== null) resolvedCount++;
  });
}
db.exec('COMMIT');

db.exec(`
  CREATE INDEX idx_materials_ingredient ON recipe_materials(ingredient_id);
  CREATE INDEX idx_materials_recipe     ON recipe_materials(recipe_id);
  VACUUM;
`);
db.close();

const mb = (statSync(OUT).size / 1024 / 1024).toFixed(1);
console.log('| 項目 | 値 |');
console.log('|---|---|');
console.log(`| レシピ | ${seen.size} 件 |`);
console.log(`| 材料 | ${materialCount} 件（うち正規化済み ${resolvedCount} = ${((resolvedCount / materialCount) * 100).toFixed(1)}%） |`);
console.log(`| 食材マスタ | ${INGREDIENTS.length} 件 |`);
console.log(`| 別名 | ${synCount} 件 |`);
console.log(`| 出力 | ${OUT}（${mb} MB） |`);
