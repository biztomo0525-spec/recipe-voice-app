/**
 * 食材正規化のテスト（基本設計 第6章 / D-03）
 * 実行: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMaterial } from './parser.ts';
import {
  normalizeIngredient,
  getIngredient,
  ingredientMatches,
  isSatisfiedBy,
  INGREDIENTS,
} from './normalizer.ts';

/** 食材名候補 → 正規形の名前（照合できなければ null） */
function nameOf(candidate: string | null): string | null {
  const id = normalizeIngredient(candidate);
  return id === null ? null : (getIngredient(id)?.name ?? null);
}

// ───────── 照合①②：完全一致 ─────────
const EXACT: [string, string][] = [
  ['玉ねぎ', '玉ねぎ'],
  ['たまねぎ', '玉ねぎ'],
  ['タマネギ', '玉ねぎ'],
  ['玉葱', '玉ねぎ'],
  ['人参', '人参'],
  ['にんじん', '人参'],
  ['ニンジン', '人参'],
  ['醤油', '醤油'],
  ['しょうゆ', '醤油'],
  ['しょう油', '醤油'],
  ['塩コショウ', '塩こしょう'],
  ['塩・胡椒', '塩こしょう'],
  ['なす', 'なす'],
  ['茄子', 'なす'],
  ['ナス', 'なす'],
];
for (const [input, expected] of EXACT) {
  test(`[完全一致] ${input} → ${expected}`, () => assert.equal(nameOf(input), expected));
}

// ───────── 照合③：かなを揃えた一致 ─────────
test('[かな一致] カタカナ表記が辞書のひらがな表記に当たる', () => {
  assert.equal(nameOf('キャベツ'), 'キャベツ');
  assert.equal(nameOf('ホウレンソウ'), 'ほうれん草');
});

// ───────── 照合④：最長部分一致 ─────────
test('[部分一致] 修飾語つきでも食材名を拾う', () => {
  assert.equal(nameOf('新玉ねぎ'), '玉ねぎ');
  assert.equal(nameOf('冷凍ブロッコリー'), 'ブロッコリー');
});

test('[部分一致] 「油」が「醤油」に誤マッチしない', () => {
  // 醤油は完全一致で確定するため、1文字の「油」に引っ張られない
  assert.equal(nameOf('醤油'), '醤油');
  assert.equal(nameOf('ごま油'), 'ごま油');
  assert.equal(nameOf('オリーブオイル'), 'オリーブオイル');
});

test('[部分一致] 辞書にない食材は null（D-04が吸収する）', () => {
  assert.equal(nameOf('ドラゴンフルーツ'), null);
  assert.equal(nameOf('調味料'), null);
  assert.equal(nameOf('A'), null);
  assert.equal(nameOf(null), null);
});

// ───────── D-03：階層のマッチング ─────────
const id = (s: string) => {
  const v = normalizeIngredient(s);
  assert.notEqual(v, null, `辞書に存在しない: ${s}`);
  return v!;
};

test('[D-03] 親で言われたら子も一致する', () => {
  assert.ok(ingredientMatches(id('ねぎ'), id('長ねぎ')), 'ねぎ ⇔ 長ねぎ');
  assert.ok(ingredientMatches(id('豆腐'), id('絹ごし豆腐')), '豆腐 ⇔ 絹ごし豆腐');
  assert.ok(ingredientMatches(id('鶏肉'), id('鶏もも肉')), '鶏肉 ⇔ 鶏もも肉');
});

test('[D-03] 子で言われたら親のレシピにも一致する', () => {
  assert.ok(ingredientMatches(id('長ねぎ'), id('ねぎ')), '長ねぎ ⇔ ねぎ');
  assert.ok(ingredientMatches(id('木綿豆腐'), id('豆腐')), '木綿豆腐 ⇔ 豆腐');
});

test('[D-03] 兄弟間は一致しない（設計上の最重要ケース）', () => {
  assert.ok(!ingredientMatches(id('長ねぎ'), id('小ねぎ')), '長ねぎ と 小ねぎ は別物');
  assert.ok(!ingredientMatches(id('鶏もも肉'), id('鶏むね肉')), '鶏もも肉 と 鶏むね肉 は別物');
  assert.ok(!ingredientMatches(id('薄力粉'), id('強力粉')), '薄力粉 と 強力粉 は別物');
  assert.ok(!ingredientMatches(id('ごま油'), id('サラダ油')), 'ごま油 と サラダ油 は別物');
});

test('[D-03] 無関係な食材は一致しない', () => {
  assert.ok(!ingredientMatches(id('玉ねぎ'), id('人参')));
});

test('[D-03] 所持食材集合との判定', () => {
  const owned = [id('ねぎ'), id('豚肉')];
  assert.ok(isSatisfiedBy(id('長ねぎ'), owned), '「ねぎがある」なら長ねぎのレシピは作れる');
  assert.ok(!isSatisfiedBy(id('人参'), owned));
});

// ───────── パーサとの結合 ─────────
test('[結合] 実データの表記からそのまま正規形に到達する', () => {
  const cases: [string, string | null][] = [
    ['★醤油 大さじ2', '醤油'],
    ['☆砂糖', '砂糖'],
    ['●しょうが（薄切り）', '生姜'],
    ['にんにく(チューブ)', 'にんにく'],
    ['玉ねぎ（小）', '玉ねぎ'],
    ['⚫︎製菓・料理用米粉（１番ミドルタイプ）', '米粉'],
    ['※お好みで量を調整してください', null],
  ];
  for (const [raw, expected] of cases) {
    assert.equal(nameOf(parseMaterial(raw)), expected, `入力: ${raw}`);
  }
});

// ───────── 辞書の健全性 ─────────
test('[辞書] stapleは祖先から継承される', () => {
  // 「酒」が常備品なら「日本酒」も常備品。これが無いと常備品の子が主要材料に数えられる
  assert.ok(getIngredient(id('日本酒'))!.staple, '日本酒は酒の子なので常備品');
  assert.ok(getIngredient(id('料理酒'))!.staple);
  assert.ok(getIngredient(id('米酢'))!.staple, '米酢は酢の子なので常備品');
  // 強力粉は小麦粉の子にしていないため常備品にならない
  assert.ok(!getIngredient(id('強力粉'))!.staple, '強力粉は代用できないため独立・非常備');
  assert.equal(id('薄力粉'), id('小麦粉'), '薄力粉は小麦粉の別名');
});

test('[辞書] 常備品が UC-03 の想定どおり登録されている', () => {
  for (const n of ['水', '塩', '砂糖', '醤油', '味噌', '酢', '酒', 'みりん', 'サラダ油', '片栗粉']) {
    const ing = getIngredient(id(n))!;
    assert.ok(ing.staple, `${n} は常備品であるべき`);
  }
});

test('[辞書] バター・にんにく・生姜・卵・牛乳は常備品にしない', () => {
  for (const n of ['バター', 'にんにく', '生姜', '卵', '牛乳']) {
    const ing = getIngredient(id(n))!;
    assert.ok(!ing.staple, `${n} は常備品にしない（料理の成否を左右するため）`);
  }
});

test('[辞書] 正規形の名前が重複していない', () => {
  const names = INGREDIENTS.map((i) => i.name);
  assert.equal(new Set(names).size, names.length);
});
