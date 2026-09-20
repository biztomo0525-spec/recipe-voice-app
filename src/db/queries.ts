/**
 * バンドルした SQLite の読み出し（基本設計 第4章 / A-01）
 *
 * D-15：起動時に全レシピをメモリへ読み込み、検索は src/search/score.ts で行う。
 *
 * スコアリングを SQL で書き直せば読み込みは不要になるが、
 * すでに101件のテストで固めた score.ts と実装が二重化し、必ず乖離する。
 * レシピ4,463件・材料33,006件であればメモリに載る規模であり、
 * 検索自体は約75ms（Node実測）で終わる。単一の実装を保つ方を優先する。
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Recipe, RecipeMaterial } from '../search/score.ts';

type RecipeRow = {
  recipe_id: number;
  title: string;
  url: string;
  image_url: string | null;
  indication: string | null;
  cost: string | null;
};

type MaterialRow = {
  recipe_id: number;
  raw: string;
  ingredient_id: number | null;
};

/**
 * 全レシピを材料つきで読み出す。起動時に一度だけ呼ぶ。
 * レシピと材料を別クエリで取り、JS 側で組み立てる
 * （JOIN するとレシピ側の列が材料の数だけ重複して転送量が増えるため）
 */
export async function loadAllRecipes(db: SQLiteDatabase): Promise<Recipe[]> {
  const recipeRows = await db.getAllAsync<RecipeRow>(
    'SELECT recipe_id, title, url, image_url, indication, cost FROM recipes',
  );
  const materialRows = await db.getAllAsync<MaterialRow>(
    'SELECT recipe_id, raw, ingredient_id FROM recipe_materials ORDER BY recipe_id, seq',
  );

  const byId = new Map<number, Recipe>();
  for (const r of recipeRows) {
    byId.set(r.recipe_id, {
      id: r.recipe_id,
      title: r.title,
      url: r.url,
      imageUrl: r.image_url,
      indication: r.indication, // 「指定なし」は ETL で null 済み（D-09）
      cost: r.cost,
      materials: [],
    });
  }

  for (const m of materialRows) {
    const recipe = byId.get(m.recipe_id);
    if (!recipe) continue;
    const material: RecipeMaterial = { raw: m.raw, ingredientId: m.ingredient_id };
    recipe.materials.push(material);
  }

  return [...byId.values()];
}
