/**
 * スコアリングのテスト（詳細設計 N-02 / 基本設計 第7章）
 * 境界値：主要材料0件、全部不明、不足数が同数のときの並び
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIngredient } from '../ingredients/normalizer.ts';
import {
  scoreRecipe,
  searchRecipes,
  buildOwnedSet,
  compareScored,
  MAX_PER_GROUP,
  type Recipe,
  type ScoredRecipe,
} from './score.ts';

const id = (s: string) => {
  const v = normalizeIngredient(s);
  assert.notEqual(v, null, `辞書に存在しない: ${s}`);
  return v!;
};

/** 食材名の配列からレシピを組み立てる。null は正規化できなかった材料を表す */
function recipe(recipeId: number, title: string, names: (string | null)[]): Recipe {
  return {
    id: recipeId,
    title,
    url: `https://example.invalid/${recipeId}`,
    materials: names.map((n) => ({
      raw: n ?? '謎の材料',
      ingredientId: n === null ? null : id(n),
    })),
  };
}

// ───────── 常備品の扱い（UC-03 / FR-09） ─────────

test('[常備品] 調味料だけのレシピは主要材料0件なので対象外', () => {
  const r = recipe(1, '合わせ調味料', ['醤油', '砂糖', 'みりん', '酒']);
  assert.equal(scoreRecipe(r, buildOwnedSet([])), null);
});

test('[常備品] 調味料は所持していなくても不足に数えない', () => {
  const r = recipe(2, '玉ねぎ炒め', ['玉ねぎ', '醤油', '砂糖', 'サラダ油']);
  const s = scoreRecipe(r, buildOwnedSet([id('玉ねぎ')]))!;
  assert.equal(s.missing, 0, '調味料は常備扱いなので不足0');
  assert.equal(s.matched, 1);
  assert.equal(s.coverage, 1);
});

test('[常備品] バターは常備品でないので不足に数える', () => {
  const r = recipe(3, 'バター炒め', ['玉ねぎ', 'バター']);
  const s = scoreRecipe(r, buildOwnedSet([id('玉ねぎ')]))!;
  assert.equal(s.missing, 1);
  assert.deepEqual(s.missingIds, [id('バター')]);
});

// ───────── D-04：不明材料の扱い ─────────

test('[D-04] 不明材料は分母から外し、元表記は保持する', () => {
  const r = recipe(4, 'ノイズ入り', ['玉ねぎ', null, null]);
  const s = scoreRecipe(r, buildOwnedSet([id('玉ねぎ')]))!;
  assert.equal(s.missing, 0, '不明材料は不足に数えない');
  assert.equal(s.coverage, 1, '不明材料は分母に入れない');
  assert.equal(s.unknownRaws.length, 2, '元表記はV3で提示するため保持する');
});

test('[D-04] 全部が不明材料なら主要材料0件で対象外', () => {
  const r = recipe(5, '全部不明', [null, null]);
  assert.equal(scoreRecipe(r, buildOwnedSet([])), null);
});

// ───────── D-03：階層を考慮した一致 ─────────

test('[D-03] 「ねぎ」を持っていれば長ねぎのレシピは作れる', () => {
  const r = recipe(6, 'ねぎ焼き', ['長ねぎ', '豚こま肉']);
  const s = scoreRecipe(r, buildOwnedSet([id('ねぎ'), id('豚肉')]))!;
  assert.equal(s.missing, 0);
});

test('[D-03] 「小ねぎ」しか無ければ長ねぎのレシピは作れない（兄弟は不一致）', () => {
  const r = recipe(7, 'ねぎ焼き', ['長ねぎ']);
  const s = scoreRecipe(r, buildOwnedSet([id('小ねぎ')]))!;
  assert.equal(s.missing, 1, '長ねぎと小ねぎは別物');
});

// ───────── 重複の畳み込み ─────────

test('[重複] 同じ食材が複数回出ても1つとして数える', () => {
  // 実データでは「★醤油」と「醤油」のように同じ食材が複数行に現れる
  const r = recipe(8, '重複あり', ['玉ねぎ', '玉ねぎ', '人参']);
  const s = scoreRecipe(r, buildOwnedSet([id('玉ねぎ')]))!;
  assert.equal(s.missing, 1, '人参だけが不足');
  assert.equal(s.matched, 1);
});

// ───────── 並び順（第7章） ─────────

test('[並び順] 第1キーは不足数。カバー率が低くても不足が少ない方が上', () => {
  const owned = buildOwnedSet([id('玉ねぎ'), id('人参')]);
  // X: 主要材料3個中2個所持 → カバー率67% / 不足1
  const x = scoreRecipe(recipe(10, 'X', ['玉ねぎ', '人参', 'キャベツ']), owned)!;
  // Y: 主要材料2個中0個所持 → カバー率0% / 不足2
  const y = scoreRecipe(recipe(11, 'Y', ['大根', 'ごぼう']), owned)!;
  assert.ok(compareScored(x, y) < 0, '不足が少ないXが上');
});

test('[並び順] 不足数が同じなら、手持ちを多く使える方が上', () => {
  const owned = buildOwnedSet([id('玉ねぎ'), id('人参'), id('キャベツ')]);
  const many = scoreRecipe(recipe(12, '多く使う', ['玉ねぎ', '人参', 'キャベツ', '大根']), owned)!;
  const few = scoreRecipe(recipe(13, '少し使う', ['玉ねぎ', '大根']), owned)!;
  assert.equal(many.missing, few.missing, '前提：不足はどちらも1');
  assert.ok(compareScored(many, few) < 0, '手持ちを多く使える方が上');
});

// ───────── グルーピング（D-05） ─────────

test('[グルーピング] 不足数ごとに分かれ、3つ以上不足は出さない', () => {
  const owned = [id('玉ねぎ')];
  const recipes: Recipe[] = [
    recipe(20, 'いま作れる', ['玉ねぎ']),
    recipe(21, 'あと1つ', ['玉ねぎ', '人参']),
    recipe(22, 'あと2つ', ['玉ねぎ', '人参', '大根']),
    recipe(23, 'あと3つ', ['玉ねぎ', '人参', '大根', 'ごぼう']),
  ];
  const groups = searchRecipes(recipes, owned);
  assert.deepEqual(
    groups.map((g) => [g.missing, g.items.map((i) => i.recipe.title)]),
    [
      [0, ['いま作れる']],
      [1, ['あと1つ']],
      [2, ['あと2つ']],
    ],
    '不足3つのレシピは含まれない',
  );
  assert.equal(groups[0]!.label, 'いま作れる');
});

test(`[D-05] 各グループは${MAX_PER_GROUP}件までだが、総数は保持する`, () => {
  const owned = [id('玉ねぎ')];
  const recipes = Array.from({ length: 30 }, (_, i) => recipe(100 + i, `R${i}`, ['玉ねぎ']));
  const groups = searchRecipes(recipes, owned);
  assert.equal(groups[0]!.items.length, MAX_PER_GROUP);
  assert.equal(groups[0]!.total, 30, '上限で切る前の件数を保持する');
});

test('[グルーピング] 該当なしのグループは作らない', () => {
  const groups = searchRecipes([recipe(30, 'A', ['玉ねぎ'])], [id('玉ねぎ')]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.missing, 0);
});

// ───────── 何も持っていない場合 ─────────

test('[境界] 食材を何も入力していなくても常備品だけで作れるものは出る', () => {
  const r = recipe(40, '卵かけご飯', ['卵', 'ご飯']);
  const groups = searchRecipes([r], []);
  const all: ScoredRecipe[] = groups.flatMap((g) => g.items);
  assert.equal(all.length, 1, '不足2なので表示対象');
  assert.equal(all[0]!.missing, 2);
});
