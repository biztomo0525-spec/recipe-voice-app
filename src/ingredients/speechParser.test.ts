/**
 * 音声テキストからの食材抽出のテスト（FR-02 / FR-10）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpeech } from './speechParser.ts';
import { normalizeIngredient, getIngredient } from './normalizer.ts';

/** 抽出結果を正規形の名前で受け取る */
function names(text: string): string[] {
  return parseSpeech(text).ids.map((i) => getIngredient(i)!.name);
}
const id = (s: string) => normalizeIngredient(s)!;

// ───────── 基本 ─────────

test('[基本] 助詞でつないだ発話から食材を抽出する', () => {
  assert.deepEqual(names('玉ねぎと豚こまと卵があります'), ['玉ねぎ', '豚こま肉', '卵']);
});

test('[基本] 読点区切りにも対応する', () => {
  assert.deepEqual(names('キャベツ、人参、ピーマン'), ['キャベツ', '人参', 'ピーマン']);
});

test('[基本] 文末表現を読み飛ばす', () => {
  assert.deepEqual(names('玉ねぎだけです'), ['玉ねぎ']);
  assert.deepEqual(names('冷蔵庫に牛乳とバターが残ってます'), ['牛乳', 'バター']);
});

// ───────── ★助詞分割の罠（この方式を採った理由） ─────────

test('[罠] 「と」で始まる食材名を壊さない', () => {
  // 助詞「と」で分割する実装だと「とうふ」が「うふ」になって失われる
  assert.deepEqual(names('とうふとなすがあります'), ['豆腐', 'なす']);
  assert.deepEqual(names('とうもろこしとトマト'), ['コーン', 'トマト']);
});

test('[罠] 「や」で始まる食材名を壊さない', () => {
  assert.deepEqual(names('やまいもときゅうり'), ['長芋', 'きゅうり']);
});

test('[罠] 部分文字列に引っ張られない（最長一致）', () => {
  // 「玉ねぎ」が「ねぎ」に、「水菜」が「水」に落ちないこと
  assert.deepEqual(names('玉ねぎ'), ['玉ねぎ']);
  assert.deepEqual(names('水菜'), ['水菜']);
  assert.deepEqual(names('長ねぎ'), ['長ねぎ']);
});

// ───────── 表記ゆれ・重複 ─────────

test('[表記ゆれ] 辞書の別名がそのまま効く', () => {
  assert.deepEqual(names('たまねぎとにんじん'), ['玉ねぎ', '人参']);
  assert.deepEqual(names('タマネギとニンジン'), ['玉ねぎ', '人参']);
});

test('[重複] 同じ食材を2回言っても1つにまとめる', () => {
  assert.deepEqual(names('玉ねぎと玉ねぎと人参'), ['玉ねぎ', '人参']);
});

test('[順序] 言った順番を保つ', () => {
  assert.deepEqual(names('人参と玉ねぎ'), ['人参', '玉ねぎ']);
});

// ───────── FR-10：認識できなかった食材 ─────────

test('[FR-10] 辞書に無い食材は unknown として返す', () => {
  const r = parseSpeech('玉ねぎとドラゴンフルーツがあります');
  assert.deepEqual(r.ids.map((i) => getIngredient(i)!.name), ['玉ねぎ']);
  assert.ok(r.unknown.includes('ドラゴンフルーツ'), `unknown=${JSON.stringify(r.unknown)}`);
});

test('[FR-10] 助詞や文末表現は unknown に含めない', () => {
  const r = parseSpeech('玉ねぎと人参があります');
  assert.deepEqual(r.unknown, [], `助詞が混じっている: ${JSON.stringify(r.unknown)}`);
});

test('[FR-10] 同じ断片は重複して報告しない', () => {
  const r = parseSpeech('ドラゴンフルーツとドラゴンフルーツ');
  assert.equal(r.unknown.length, 1);
});

// ───────── 境界 ─────────

test('[境界] 空文字・食材なしでも壊れない', () => {
  assert.deepEqual(parseSpeech(''), { ids: [], unknown: [] });
  assert.deepEqual(parseSpeech('えーっと'), { ids: [], unknown: [] });
});

test('[境界] 追加で話した内容を既存の食材リストに足せる（FR-05の土台）', () => {
  const first = parseSpeech('玉ねぎと人参');
  const second = parseSpeech('あと卵');
  const merged = [...new Set([...first.ids, ...second.ids])];
  assert.deepEqual(merged.map((i) => getIngredient(i)!.name), ['玉ねぎ', '人参', '卵']);
  assert.ok(merged.includes(id('卵')));
});
