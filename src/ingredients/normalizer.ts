/**
 * 食材名の正規化（基本設計 第6章 / D-03）
 *
 * パーサが取り出した食材名候補を、辞書上の正規形（ingredient id）に対応づける。
 * 当たらなければ null を返す。null は D-04 によりスコアの分母から外れる。
 *
 * 外部依存を持たない純粋なモジュールとして実装する（基本設計 A-02）。
 * ETL（Node）とアプリ（React Native）の両方から使う。
 */
import { DICTIONARY, type IngredientDef } from './dictionary.ts';

export type Ingredient = {
  id: number;
  name: string;
  parentId: number | null;
  staple: boolean;
  kind?: string;
};

/** カタカナ→ひらがな、記号・空白の除去。表記ゆれ吸収の最終手段（照合③） */
function toKana(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s・ー－\-]/g, '')
    .toLowerCase();
}

// ───────── 辞書の構築 ─────────

const byId = new Map<number, Ingredient>();
const byName = new Map<string, number>(); // 正規形の完全一致（照合②）
const bySynonym = new Map<string, number>(); // 別名の完全一致（照合①）
const byKana = new Map<string, number>(); // かな正規化後の一致（照合③）
/** 部分一致（照合④）用。長い順に並べる */
let partialKeys: { key: string; id: number }[] = [];

{
  const idOf = new Map<string, number>();
  DICTIONARY.forEach((d, i) => idOf.set(d.name, i + 1));

  for (const d of DICTIONARY as IngredientDef[]) {
    const id = idOf.get(d.name)!;
    byId.set(id, {
      id,
      name: d.name,
      parentId: d.parent ? (idOf.get(d.parent) ?? null) : null,
      staple: d.staple ?? false,
      kind: d.kind,
    });

    byName.set(d.name, id);
    for (const s of d.synonyms ?? []) bySynonym.set(s, id);

    for (const surface of [d.name, ...(d.synonyms ?? [])]) {
      const k = toKana(surface);
      if (!byKana.has(k)) byKana.set(k, id);
      partialKeys.push({ key: surface, id });
    }
  }

  // 親が辞書に無い定義は設計ミス。早期に気づけるようにする
  for (const d of DICTIONARY) {
    if (d.parent && !idOf.has(d.parent)) {
      throw new Error(`dictionary: 親が見つかりません name=${d.name} parent=${d.parent}`);
    }
  }

  // staple は祖先から継承する。
  // 「酒」が常備品なら「日本酒」も常備品として扱う。
  // これが無いと、常備品の子が「主要材料」として数えられ、
  // さらに所持している親と親子一致して matched に加算されてしまう。
  for (const ing of byId.values()) {
    let cur: number | null = ing.parentId;
    const seen = new Set<number>([ing.id]);
    while (cur !== null && !seen.has(cur)) {
      seen.add(cur);
      const parent = byId.get(cur);
      if (parent?.staple) { ing.staple = true; break; }
      cur = parent?.parentId ?? null;
    }
  }

  partialKeys.sort((a, b) => b.key.length - a.key.length);
}

export const INGREDIENTS: Ingredient[] = [...byId.values()];

export function getIngredient(id: number): Ingredient | undefined {
  return byId.get(id);
}

// ───────── 照合 ─────────

/**
 * 食材名候補を辞書の id に対応づける。
 * 基本設計 第6章の照合順序に従い、厳しい順に試して最初に当たったもので確定する。
 */
export function normalizeIngredient(candidate: string | null): number | null {
  if (!candidate) return null;
  const s = candidate.normalize('NFKC').trim();
  if (!s) return null;

  // ① 別名の完全一致
  const bySyn = bySynonym.get(s);
  if (bySyn !== undefined) return bySyn;

  // ② 正規形の完全一致
  const byNm = byName.get(s);
  if (byNm !== undefined) return byNm;

  // ③ かなを揃えた上での完全一致
  const byKn = byKana.get(toKana(s));
  if (byKn !== undefined) return byKn;

  // ④ 最長部分一致（2文字以上）
  //    無条件の部分一致は「油」が「醤油」に誤マッチするため、
  //    2文字以上かつ最長のものだけを採用し、同じ長さの候補が複数あれば採用しない
  let best: { len: number; ids: Set<number> } | null = null;
  for (const { key, id } of partialKeys) {
    if (key.length < 2) continue;
    if (best && key.length < best.len) break; // 長い順に並んでいるので打ち切れる
    if (!s.includes(key)) continue;
    if (!best) best = { len: key.length, ids: new Set([id]) };
    else best.ids.add(id);
  }
  if (best && best.ids.size === 1) return [...best.ids][0]!;

  // ⑤ 該当なし
  return null;
}

// ───────── D-03：階層のマッチング ─────────

/** 自分自身を含む祖先の id 列 */
export function ancestorChain(id: number): number[] {
  const chain: number[] = [];
  let cur: number | null = id;
  const seen = new Set<number>();
  while (cur !== null && !seen.has(cur)) {
    seen.add(cur);
    chain.push(cur);
    cur = byId.get(cur)?.parentId ?? null;
  }
  return chain;
}

/**
 * 2つの食材が「一致」するか（D-03）。
 * 同一、または一方が他方の祖先であれば一致。兄弟間は一致しない。
 *
 *   ねぎ（親） と 長ねぎ（子） → 一致
 *   長ねぎ     と 小ねぎ（兄弟） → 不一致
 */
export function ingredientMatches(a: number, b: number): boolean {
  if (a === b) return true;
  return ancestorChain(a).includes(b) || ancestorChain(b).includes(a);
}

/** 所持食材の集合に対し、対象の食材が満たされているか */
export function isSatisfiedBy(target: number, owned: Iterable<number>): boolean {
  for (const o of owned) if (ingredientMatches(target, o)) return true;
  return false;
}
