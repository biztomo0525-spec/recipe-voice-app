/**
 * 画面共通のスタイル定数
 *
 * NFR-06：本文は 50cm 離れて読める大きさを下限とする（まな板の横に置いて見るため）
 * S2    ：手が濡れている・汚れている前提。タップ領域は 44pt 以上を確保する
 */
export const MIN_TAP = 44;

export const colors = {
  bg: '#FFFDF8',
  surface: '#FFFFFF',
  border: '#E6E0D4',
  text: '#241F1A',
  subtext: '#6B6257',
  accent: '#C2410C', // 「作れる」「録音中」など主要動作
  accentSoft: '#FFF1E7',
  missing: '#B91C1C', // 不足食材
  ok: '#15803D',
  disabled: '#C9C2B6',
};

export const font = {
  /** 画面タイトル */
  title: 28,
  /** レシピ名・食材チップ。離れて読む対象 */
  body: 20,
  /** 補助情報 */
  small: 16,
  /** グループ見出し */
  section: 22,
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
