/**
 * 音声テキストからの食材抽出（基本設計 第6章後半 / FR-02 / FR-10）
 *
 * 入力例: 「玉ねぎと豚こまと卵があります」
 * 出力  : [玉ねぎ, 豚こま肉, 卵]
 *
 * ★設計上の要点：助詞で分割してはならない
 *
 * 「と」で区切る素朴な実装は、日本語の食材名を壊す。
 *   とうふ / とうもろこし / ところてん / とうがん …
 * 「玉ねぎとうふ」のような並びも、どこが区切りか助詞だけでは決まらない。
 *
 * そこで、**辞書の最長一致で左から走査する**方式を採る。
 * 形態素解析器を持ち込まずに済み、辞書（ETLと共用）がそのまま語彙になる。
 * 一致しなかった部分は助詞や文末表現として読み飛ばし、
 * 食材名らしき残りだけを「認識できなかった食材」として返す（FR-10）。
 */
import { lookupExact, MAX_SURFACE_LENGTH } from './normalizer.ts';

/** 走査で読み飛ばす語（助詞・文末表現・台所まわりの語） */
const STOPWORDS = new Set([
  'と', 'や', 'が', 'を', 'は', 'に', 'で', 'も', 'の', 'ね', 'よ', 'か',
  'あと', 'それから', 'あります', 'ある', 'あった', 'です', 'ます', 'いる',
  'ました', 'かな', 'だけ', 'など', 'とか', 'くらい', 'ぐらい', 'ちょっと',
  '以上', '残り', '残って', '冷蔵庫', '冷凍庫', '今日', '家', 'うち', 'それと',
]);

/** 区切りとして扱う記号 */
const SEPARATORS = /[、,。．\s　・／/]+/u;

export type SpeechParseResult = {
  /** 認識できた食材の id（重複は除去し、出現順を保つ） */
  ids: number[];
  /** 辞書に無く、食材名の可能性がある断片（FR-10 でユーザーに提示する） */
  unknown: string[];
};

/** 助詞・文末表現だけで構成された断片は報告しない */
function isNoise(fragment: string): boolean {
  if (fragment.length < 2) return true;
  if (STOPWORDS.has(fragment)) return true;
  // ひらがなのみ かつ 4文字以下は、助詞の連なりとみなして報告しない
  if (/^[\p{sc=Hiragana}ー]{1,4}$/u.test(fragment)) return true;
  return false;
}

/** 断片の前後から助詞・文末表現を削る */
function trimParticles(fragment: string): string {
  let s = fragment;
  let changed = true;
  while (changed) {
    changed = false;
    for (const w of STOPWORDS) {
      if (s.length > w.length && s.startsWith(w)) { s = s.slice(w.length); changed = true; }
      if (s.length > w.length && s.endsWith(w)) { s = s.slice(0, -w.length); changed = true; }
    }
  }
  return s;
}

/**
 * 音声認識のテキストから食材を抽出する。
 */
export function parseSpeech(text: string): SpeechParseResult {
  const ids: number[] = [];
  const seen = new Set<number>();
  const unknownFragments: string[] = [];

  for (const chunk of text.normalize('NFKC').split(SEPARATORS)) {
    if (!chunk) continue;

    let i = 0;
    let buffer = ''; // 辞書に当たらなかった文字の溜め場

    const flush = () => {
      const frag = trimParticles(buffer.trim());
      if (frag && !isNoise(frag)) unknownFragments.push(frag);
      buffer = '';
    };

    while (i < chunk.length) {
      // 長い表記から順に試す（最長一致）。
      // 「玉ねぎ」を「ねぎ」より先に、「とうふ」を「と」より先に当てるため
      let hit: { id: number; len: number } | null = null;
      const maxLen = Math.min(MAX_SURFACE_LENGTH, chunk.length - i);
      for (let len = maxLen; len >= 1; len--) {
        const id = lookupExact(chunk.slice(i, i + len));
        if (id !== null) { hit = { id, len }; break; }
      }

      if (hit) {
        flush();
        if (!seen.has(hit.id)) { seen.add(hit.id); ids.push(hit.id); }
        i += hit.len;
      } else {
        buffer += chunk[i];
        i++;
      }
    }
    flush();
  }

  // 同じ断片を重複して報告しない
  return { ids, unknown: [...new Set(unknownFragments)] };
}
