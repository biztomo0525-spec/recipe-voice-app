/**
 * 材料テキストのパーサ（基本設計 第5章 / P-07）
 *
 * 楽天レシピ API の `recipeMaterial` は投稿者の自由記述であり、
 * 装飾記号・括弧・分量・コメント・材料以外のノイズが混在する。
 * ここでは「食材名らしき文字列」を取り出すところまでを担う。
 * 辞書への照合（正規化）は normalizer.ts の責務。
 *
 * 外部依存を持たない純粋関数として実装する。
 * ETL（Node）とアプリ（React Native）の両方から使うため（基本設計 A-02）。
 */

/** 文字でも数字でもない文字の並び（装飾記号・空白・異体字セレクタを含む） */
const LEAD_SYMBOLS = /^[^\p{L}\p{N}]+/u;
const TRAIL_SYMBOLS = /[^\p{L}\p{N}]+$/u;

/** 開き括弧から末尾まで */
const BRACKET_TO_END = /[(（【\[〈《｛{].*$/su;

/** 先頭が括弧の見出し（例:「(ソース)一人前…」）。対応する閉じ括弧までを除去する */
const LEADING_BRACKET_GROUP = /^[(（【\[〈《｛{][^)）】\]〉》｝}]*[)）】\]〉》｝}]\s*/u;

/** 選択肢の区切り。`or` は前後が非ASCII（＝日本語）のときだけ区切りとみなす */
const ALTERNATIVES = /(?:または|もしくは|[/／]|(?<=[^\x00-\x7F])or(?=[^\x00-\x7F]))/iu;

/** 複数食材の列挙（D-08：先頭のみ採用） */
const ENUMERATION = /[、,]/u;

/** 分量の単位 */
const UNIT =
  '(?:g|kg|mg|ml|cc|l|個|本|枚|束|片|玉|缶|袋|パック|人分|合|cm|センチ|号|杯|株|房|尾|切れ|かけ|つまみ|さじ)';

/** 末尾の分量（例:「大さじ2」「小さじ2杯」「200cc」「1/2個」「2」） */
const TRAILING_QUANTITY = new RegExp(
  `(?:大さじ|小さじ|カップ)?\\s*\\d+(?:[/.]\\d+)?\\s*${UNIT}?\\s*$`,
  'u',
);

/** 先頭の分量（例:「200g 豚こま」） */
const LEADING_QUANTITY = new RegExp(`^\\d+(?:[/.]\\d+)?\\s*${UNIT}\\s*`, 'u');

/** 分量を表す語（数値を伴わないもの） */
const VAGUE_QUANTITY = /(?:適量|少々|適宜|ひとつまみ|お好み(?:で)?)\s*$/u;

/** 先頭の修飾語 */
const MODIFIERS = /^(?:お好みで|お好みの|好みの|あれば|なければ|今回は|新鮮な)\s*/u;

/**
 * 材料の自由記述から食材名を取り出す。
 * 食材名として扱えないもの（コメント・数字のみ等）は null を返す。
 */
export function parseMaterial(raw: string): string | null {
  if (!raw) return null;

  // 1. 正規化（全角英数→半角、互換文字の統一）
  let s = raw.normalize('NFKC').trim();
  if (!s) return null;

  // 2. 「※」で始まるものは投稿者のコメント
  if (/^※/u.test(s)) return null;

  // 3. 先頭が括弧の見出しなら、その括弧ごと除去
  //    「括弧以降を削除」より先に処理しないと、全体が消えてしまう
  s = s.replace(LEADING_BRACKET_GROUP, '');

  // 4. 先頭の装飾記号を除去（★☆●◎⚫︎ 等。異体字セレクタも文字種で落ちる）
  s = s.replace(LEAD_SYMBOLS, '');

  // 5. 括弧以降を除去（中身は補足・状態・代替案であることを実データで確認済み）
  s = s.replace(BRACKET_TO_END, '');

  // 6. 選択肢は前半を採用
  s = s.split(ALTERNATIVES)[0] ?? '';

  // 7. 列挙は先頭を採用（D-08）
  s = s.split(ENUMERATION)[0] ?? '';

  // 8. 分量を除去
  s = s.replace(VAGUE_QUANTITY, '');
  s = s.replace(TRAILING_QUANTITY, '');
  s = s.replace(LEADING_QUANTITY, '');

  // 9. 修飾語を除去
  s = s.replace(MODIFIERS, '');

  // 10. 前後に残った記号・空白を除去
  s = s.replace(LEAD_SYMBOLS, '').replace(TRAIL_SYMBOLS, '').trim();

  if (!s) return null;

  // 数字だけになったものは食材名ではない
  if (/^\d+$/u.test(s)) return null;

  return s;
}
