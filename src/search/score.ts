/**
 * 検索スコアリング（基本設計 第7章）★本アプリの中核
 *
 * 所持食材からレシピを並べ替える。外部依存を持たない純粋関数として実装し、
 * ETL（Node）・アプリ（React Native）・CLI のどこからでも使えるようにする。
 *
 * 設計上の要点:
 *   - 第1キーは「不足数」であり、カバー率ではない（第7章の根拠を参照）
 *   - 常備品（staple）は所持扱いし、主要材料から除外する（UC-03 / FR-09）
 *   - 正規化できなかった材料はスコアの分母から外す（D-04）
 *   - 食材の一致は階層を考慮する。親子は一致、兄弟は不一致（D-03）
 */
import { getIngredient, ingredientMatches, INGREDIENTS } from '../ingredients/normalizer.ts';

export type RecipeMaterial = {
  /** 元の自由記述。V3 で「確認が必要な材料」を出すために保持する（M-01） */
  raw: string;
  /** 正規化できなかった場合は null（D-04） */
  ingredientId: number | null;
};

export type Recipe = {
  id: number;
  title: string;
  url: string;
  imageUrl?: string | null;
  /** 「指定なし」は null にしておく（D-09） */
  indication?: string | null;
  cost?: string | null;
  materials: RecipeMaterial[];
};

export type ScoredRecipe = {
  recipe: Recipe;
  /** 所持していた主要材料の数 */
  matched: number;
  /** 不足している主要材料の数。並び順の第1キー */
  missing: number;
  /** matched / 主要材料数 */
  coverage: number;
  /** 不足している食材の id */
  missingIds: number[];
  /** 正規化できなかった材料の元表記（V3 で「要確認」として出す） */
  unknownRaws: string[];
};

/** 常備品の id 一覧（UC-03） */
export const STAPLE_IDS: number[] = INGREDIENTS.filter((i) => i.staple).map((i) => i.id);

/** ユーザーが入力した食材に常備品を足した「所持食材集合」を作る */
export function buildOwnedSet(userIngredientIds: Iterable<number>): number[] {
  return [...new Set([...userIngredientIds, ...STAPLE_IDS])];
}

/**
 * レシピ1件をスコアリングする。
 * 主要材料が0件のレシピ（全部が常備品／全部が不明）は提案対象にならないため null を返す。
 */
export function scoreRecipe(recipe: Recipe, owned: readonly number[]): ScoredRecipe | null {
  // 主要材料：正規化済み かつ 常備品でない。同じ食材の重複は1つに畳む
  const required = new Set<number>();
  const unknownRaws: string[] = [];

  for (const m of recipe.materials) {
    if (m.ingredientId === null) {
      unknownRaws.push(m.raw); // D-04：分母から外すが、捨てずに提示する
      continue;
    }
    if (getIngredient(m.ingredientId)?.staple) continue; // 常備品は所持扱い
    required.add(m.ingredientId);
  }

  if (required.size === 0) return null;

  const missingIds: number[] = [];
  let matched = 0;
  for (const id of required) {
    // D-03：同一または祖先-子孫なら一致。兄弟は一致しない
    if (owned.some((o) => ingredientMatches(id, o))) matched++;
    else missingIds.push(id);
  }

  return {
    recipe,
    matched,
    missing: missingIds.length,
    coverage: matched / required.size,
    missingIds,
    unknownRaws,
  };
}

/**
 * 並び順（基本設計 第7章）
 *   1. missing  昇順  ← あと何個買えばよいか
 *   2. matched  降順  ← 手持ちを多く使えるもの
 *   3. coverage 降順
 *   4. 不明材料数 昇順 ← 情報が確かなものを優先
 */
export function compareScored(a: ScoredRecipe, b: ScoredRecipe): number {
  return (
    a.missing - b.missing ||
    b.matched - a.matched ||
    b.coverage - a.coverage ||
    a.unknownRaws.length - b.unknownRaws.length
  );
}

export type RecipeGroup = {
  /** 不足数。0 = いま作れる */
  missing: number;
  label: string;
  items: ScoredRecipe[];
  /** 上限で切る前の総数 */
  total: number;
};

/** 表示グルーピングの上限（D-05） */
export const MAX_PER_GROUP = 20;
/** 不足がこの数以上のレシピは既定で表示しない（基本設計 第7章） */
export const MAX_MISSING = 2;

const LABELS = ['いま作れる', 'あと1つで作れる', 'あと2つで作れる'];

/**
 * 所持食材からレシピを検索し、不足数でグルーピングして返す。
 */
export function searchRecipes(
  recipes: readonly Recipe[],
  userIngredientIds: Iterable<number>,
): RecipeGroup[] {
  const owned = buildOwnedSet(userIngredientIds);

  const scored: ScoredRecipe[] = [];
  for (const r of recipes) {
    const s = scoreRecipe(r, owned);
    if (s && s.missing <= MAX_MISSING) scored.push(s);
  }
  scored.sort(compareScored);

  const groups: RecipeGroup[] = [];
  for (let missing = 0; missing <= MAX_MISSING; missing++) {
    const items = scored.filter((s) => s.missing === missing);
    if (items.length === 0) continue;
    groups.push({
      missing,
      label: LABELS[missing] ?? `あと${missing}つで作れる`,
      items: items.slice(0, MAX_PER_GROUP),
      total: items.length,
    });
  }
  return groups;
}
