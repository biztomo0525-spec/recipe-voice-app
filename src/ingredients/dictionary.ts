/**
 * 食材辞書（基本設計 第6章 / D-03 / D-10）
 *
 * 出現頻度の上位から整備する（D-10）。全5,195件を網羅しようとはしない。
 * 未登録の食材は ingredient_id = NULL となり、D-04 によりスコアの分母から外れるため、
 * 辞書が不完全でも検索は破綻しない。
 *
 * - name     正規形。これがアプリに表示される
 * - synonyms 表記ゆれ。同じものを指す別表記
 * - parent   上位食材（D-03）。親子は一致、兄弟は不一致
 * - staple   常備品。所持していなくても所持扱いする（UC-03 / FR-09）
 *
 * 本ファイルは食材名という一般的な日本語語彙の集合であり、
 * レシピ提供元のデータそのものではない。出現頻度の数値は含めない。
 */

export type IngredientDef = {
  name: string;
  synonyms?: string[];
  parent?: string;
  staple?: boolean;
  kind?: string;
};

export const DICTIONARY: IngredientDef[] = [
  // ───────── 常備調味料（staple: 所持扱い） ─────────
  // 基本設計 第7章。これが無いとほぼ全レシピが missing > 0 になり提案が成立しない
  { name: '水', synonyms: ['お湯', '湯', '熱湯', 'ぬるま湯', '氷', '冷水', 'お水', '水又はお湯'], staple: true, kind: '調味料' },
  { name: '塩', synonyms: ['食塩', '粗塩', 'あら塩', '岩塩', '天然塩', '自然塩'], staple: true, kind: '調味料' },
  { name: 'こしょう', synonyms: ['胡椒', 'コショウ', 'ブラックペッパー', '黒こしょう', '黒胡椒', '粗挽き胡椒', 'ペッパー', '白こしょう'], staple: true, kind: '調味料' },
  { name: '塩こしょう', synonyms: ['塩コショウ', '塩胡椒', '塩・こしょう', '塩・胡椒', '塩・コショウ', '塩、こしょう'], staple: true, kind: '調味料' },
  { name: '砂糖', synonyms: ['さとう', '上白糖'], staple: true, kind: '調味料' },
  { name: 'グラニュー糖', parent: '砂糖', kind: '調味料' },
  { name: 'きび砂糖', parent: '砂糖', kind: '調味料' },
  { name: '三温糖', parent: '砂糖', kind: '調味料' },
  { name: '氷砂糖', parent: '砂糖', kind: '調味料' },
  { name: '醤油', synonyms: ['しょうゆ', 'しょう油', '濃口醤油', 'こいくち醤油'], staple: true, kind: '調味料' },
  { name: '薄口醤油', synonyms: ['うすくち醤油'], parent: '醤油', kind: '調味料' },
  { name: '味噌', synonyms: ['みそ', 'ミソ'], staple: true, kind: '調味料' },
  { name: '酢', synonyms: ['お酢', '穀物酢'], staple: true, kind: '調味料' },
  { name: '米酢', parent: '酢', kind: '調味料' },
  { name: '酒', synonyms: ['お酒'], staple: true, kind: '調味料' },
  { name: '料理酒', parent: '酒', kind: '調味料' },
  { name: '日本酒', parent: '酒', kind: '調味料' },
  { name: 'みりん', synonyms: ['本みりん', 'ミリン', '味醂'], staple: true, kind: '調味料' },
  { name: '油', synonyms: ['揚げ油', '炒め油'], staple: true, kind: '調味料' },
  { name: 'サラダ油', synonyms: ['サラダオイル'], parent: '油', staple: true, kind: '調味料' },
  { name: '米油', parent: '油', kind: '調味料' },
  // ごま油・オリーブオイルは風味が料理を決めるため「油」の子にしない（兄弟扱いでも不一致）
  { name: 'ごま油', synonyms: ['ゴマ油', '胡麻油'], staple: true, kind: '調味料' },
  { name: 'オリーブオイル', synonyms: ['オリーブ油', 'エクストラバージンオリーブオイル'], staple: true, kind: '調味料' },
  { name: '片栗粉', synonyms: ['かたくり粉', '水溶き片栗粉'], staple: true, kind: '調味料' },
  { name: '小麦粉', synonyms: ['メリケン粉'], staple: true, kind: '穀類' },
  { name: '薄力粉', parent: '小麦粉', kind: '穀類' },
  { name: '強力粉', parent: '小麦粉', kind: '穀類' },
  { name: 'だしの素', synonyms: ['ほんだし', '顆粒だし', '和風だしの素', '和風顆粒だし', 'だし', 'だし汁', '出汁', '和風だし'], staple: true, kind: '調味料' },
  { name: 'コンソメ', synonyms: ['コンソメ顆粒', '顆粒コンソメ', 'コンソメキューブ', '固形コンソメ', 'ブイヨン', 'チキンブイヨン'], staple: true, kind: '調味料' },
  { name: '鶏ガラスープの素', synonyms: ['鶏がらスープの素', '鶏ガラスープ', 'がらスープ', '鶏がらスープ', 'ウェイパー', '創味シャンタン'], staple: true, kind: '調味料' },
  { name: 'マヨネーズ', synonyms: ['マヨ'], staple: true, kind: '調味料' },
  { name: 'ケチャップ', synonyms: ['トマトケチャップ'], staple: true, kind: '調味料' },

  // ───────── 調味料（常備扱いにしないもの） ─────────
  { name: 'めんつゆ', synonyms: ['麺つゆ', '麵つゆ'], kind: '調味料' },
  { name: '白だし', kind: '調味料' },
  { name: 'ポン酢', synonyms: ['ぽん酢'], kind: '調味料' },
  { name: 'オイスターソース', kind: '調味料' },
  { name: 'ウスターソース', kind: '調味料' },
  { name: '中濃ソース', kind: '調味料' },
  { name: 'ソース', kind: '調味料' },
  { name: '豆板醤', synonyms: ['トウバンジャン'], kind: '調味料' },
  { name: 'コチュジャン', kind: '調味料' },
  { name: 'ナンプラー', kind: '調味料' },
  { name: 'ラー油', synonyms: ['食べるラー油'], kind: '調味料' },
  { name: 'はちみつ', synonyms: ['蜂蜜', 'ハチミツ'], kind: '調味料' },
  { name: 'カレー粉', synonyms: ['カレーパウダー'], kind: '調味料' },
  { name: '塩麹', synonyms: ['塩こうじ'], kind: '調味料' },
  { name: '塩昆布', kind: '調味料' },
  { name: '味の素', kind: '調味料' },
  { name: 'ダシダ', kind: '調味料' },
  { name: '粒マスタード', synonyms: ['マスタード', '粒マスタード'], kind: '調味料' },
  { name: '七味唐辛子', synonyms: ['七味'], kind: '調味料' },
  { name: '鷹の爪', synonyms: ['赤唐辛子', '唐辛子', 'たかのつめ'], kind: '調味料' },
  { name: 'レモン汁', synonyms: ['レモン果汁'], kind: '調味料' },
  { name: '白ワイン', kind: '調味料' },
  { name: '赤ワイン', kind: '調味料' },
  { name: 'ローリエ', synonyms: ['ベイリーフ', '月桂樹の葉'], kind: '調味料' },
  { name: 'バジル', synonyms: ['乾燥バジル', 'ドライバジル'], kind: '調味料' },
  { name: 'ナツメグ', kind: '調味料' },
  { name: 'シナモン', synonyms: ['シナモンパウダー'], kind: '調味料' },
  { name: 'クミン', synonyms: ['クミンパウダー', 'クミンシード'], kind: '調味料' },
  { name: 'チリパウダー', kind: '調味料' },
  { name: 'パプリカパウダー', kind: '調味料' },
  { name: '青のり', synonyms: ['青海苔'], kind: '調味料' },
  { name: 'きな粉', synonyms: ['きなこ'], kind: '調味料' },
  { name: 'ごま', synonyms: ['ゴマ', '胡麻'], kind: '調味料' },
  { name: '白ごま', synonyms: ['白いりごま', '白ゴマ'], parent: 'ごま', kind: '調味料' },
  { name: 'すりごま', synonyms: ['すりゴマ'], parent: 'ごま', kind: '調味料' },
  { name: 'いりごま', synonyms: ['炒りごま', 'いりゴマ'], parent: 'ごま', kind: '調味料' },

  // ───────── 野菜 ─────────
  { name: '玉ねぎ', synonyms: ['たまねぎ', 'タマネギ', '玉葱', '玉ネギ', 'オニオン'], kind: '野菜' },
  { name: '人参', synonyms: ['にんじん', 'ニンジン', '人蔘'], kind: '野菜' },
  { name: 'じゃがいも', synonyms: ['ジャガイモ', 'じゃが芋', '馬鈴薯'], kind: '野菜' },
  { name: 'さつまいも', synonyms: ['サツマイモ', 'さつま芋', '薩摩芋'], kind: '野菜' },
  { name: '里芋', synonyms: ['さといも', 'サトイモ'], kind: '野菜' },
  { name: 'キャベツ', synonyms: ['きゃべつ'], kind: '野菜' },
  { name: '白菜', synonyms: ['はくさい', 'ハクサイ'], kind: '野菜' },
  { name: 'レタス', kind: '野菜' },
  { name: '大根', synonyms: ['だいこん', 'ダイコン'], kind: '野菜' },
  { name: 'きゅうり', synonyms: ['キュウリ', '胡瓜'], kind: '野菜' },
  { name: 'トマト', synonyms: ['とまと'], kind: '野菜' },
  { name: 'ミニトマト', synonyms: ['プチトマト'], parent: 'トマト', kind: '野菜' },
  { name: 'トマト缶', synonyms: ['カットトマト缶', 'ホールトマト'], kind: '野菜' },
  { name: 'なす', synonyms: ['ナス', '茄子', 'なすび'], kind: '野菜' },
  { name: 'ピーマン', kind: '野菜' },
  { name: 'パプリカ', kind: '野菜' },
  { name: 'ほうれん草', synonyms: ['ホウレン草', 'ほうれんそう'], kind: '野菜' },
  { name: '小松菜', synonyms: ['こまつな', 'コマツナ'], kind: '野菜' },
  { name: '水菜', synonyms: ['みずな'], kind: '野菜' },
  { name: 'ブロッコリー', kind: '野菜' },
  { name: 'もやし', synonyms: ['モヤシ'], kind: '野菜' },
  { name: 'ニラ', synonyms: ['にら', '韮'], kind: '野菜' },
  { name: 'ごぼう', synonyms: ['ゴボウ', '牛蒡'], kind: '野菜' },
  { name: 'れんこん', synonyms: ['レンコン', '蓮根'], kind: '野菜' },
  { name: 'かぼちゃ', synonyms: ['カボチャ', '南瓜'], kind: '野菜' },
  { name: 'セロリ', kind: '野菜' },
  { name: 'ゴーヤ', synonyms: ['ごーや', 'にがうり'], kind: '野菜' },
  { name: 'オクラ', synonyms: ['おくら'], kind: '野菜' },
  { name: 'アボカド', synonyms: ['アボガド'], kind: '野菜' },
  { name: 'コーン', synonyms: ['とうもろこし', 'スイートコーン', 'コーン缶'], kind: '野菜' },
  { name: '大葉', synonyms: ['青じそ', '青シソ', 'しそ', '紫蘇'], kind: '野菜' },
  { name: 'パセリ', synonyms: ['乾燥パセリ', 'ドライパセリ'], kind: '野菜' },
  { name: 'パクチー', synonyms: ['コリアンダー', '香菜'], kind: '野菜' },
  { name: 'こんにゃく', synonyms: ['コンニャク', '蒟蒻'], kind: '野菜' },

  // ねぎ（D-03 階層の代表例。親で言われたら子も許容、兄弟間は不一致）
  { name: 'ねぎ', synonyms: ['ネギ', '葱'], kind: '野菜' },
  { name: '長ねぎ', synonyms: ['長ネギ', '白ネギ', '白ねぎ'], parent: 'ねぎ', kind: '野菜' },
  { name: '小ねぎ', synonyms: ['小ネギ', '青ねぎ', '青ネギ', '万能ねぎ', '万能ネギ', '刻みネギ', '刻みねぎ', '細ねぎ'], parent: 'ねぎ', kind: '野菜' },

  // にんにく・しょうが（常備扱いにしない。家庭によって分かれ、料理の成否を左右するため）
  { name: 'にんにく', synonyms: ['ニンニク', '大蒜', 'にんにくチューブ', 'おろしにんにく', 'おろしニンニク', 'すりおろしにんにく', 'ガーリック'], kind: '野菜' },
  { name: '生姜', synonyms: ['しょうが', 'ショウガ', '生姜チューブ', 'しょうがチューブ', 'おろし生姜', 'おろししょうが', 'すりおろし生姜', 'ジンジャー'], kind: '野菜' },

  // ───────── きのこ ─────────
  { name: 'しめじ', synonyms: ['シメジ', 'ぶなしめじ'], kind: 'きのこ' },
  { name: 'しいたけ', synonyms: ['椎茸', 'シイタケ', '干し椎茸'], kind: 'きのこ' },
  { name: 'えのき', synonyms: ['エノキ', 'えのきだけ', 'えのき茸'], kind: 'きのこ' },
  { name: 'エリンギ', kind: 'きのこ' },
  { name: 'マッシュルーム', kind: 'きのこ' },
  { name: '舞茸', synonyms: ['まいたけ', 'マイタケ'], kind: 'きのこ' },

  // ───────── 肉 ─────────
  { name: '鶏肉', synonyms: ['とり肉', 'トリ肉', '鳥肉'], kind: '肉' },
  { name: '鶏もも肉', synonyms: ['鶏モモ肉', 'とりもも肉', '鶏もも'], parent: '鶏肉', kind: '肉' },
  { name: '鶏むね肉', synonyms: ['鶏胸肉', '鶏ムネ肉', 'とりむね肉'], parent: '鶏肉', kind: '肉' },
  { name: '鶏ひき肉', synonyms: ['鶏挽き肉', '鶏ミンチ'], parent: '鶏肉', kind: '肉' },
  { name: '手羽先', parent: '鶏肉', kind: '肉' },
  { name: '手羽元', parent: '鶏肉', kind: '肉' },
  { name: '豚肉', synonyms: ['ぶた肉', 'ブタ肉'], kind: '肉' },
  { name: '豚バラ肉', synonyms: ['豚ばら肉', '豚バラ'], parent: '豚肉', kind: '肉' },
  { name: '豚こま肉', synonyms: ['豚こま', '豚こま切れ肉', '豚小間切れ肉', '豚切り落とし'], parent: '豚肉', kind: '肉' },
  { name: '豚ひき肉', synonyms: ['豚挽き肉', '豚ミンチ'], parent: '豚肉', kind: '肉' },
  { name: '牛肉', synonyms: ['ぎゅう肉'], kind: '肉' },
  { name: '牛こま肉', synonyms: ['牛こま', '牛切り落とし', '牛小間切れ肉'], parent: '牛肉', kind: '肉' },
  { name: '合挽き肉', synonyms: ['合いびき肉', '合挽肉', 'ひき肉', '挽き肉', 'ミンチ'], kind: '肉' },
  { name: 'ベーコン', kind: '肉' },
  { name: 'ハム', kind: '肉' },
  { name: 'ウインナー', synonyms: ['ウィンナー', 'ソーセージ', 'ウインナーソーセージ'], kind: '肉' },

  // ───────── 魚介 ─────────
  { name: 'ツナ缶', synonyms: ['ツナ', 'シーチキン'], kind: '魚介' },
  { name: 'かつお節', synonyms: ['鰹節', 'かつおぶし', 'かつおパック', '削り節'], kind: '魚介' },
  { name: '昆布', synonyms: ['こんぶ'], kind: '魚介' },
  { name: '海苔', synonyms: ['のり', '焼き海苔', '焼きのり'], kind: '魚介' },
  { name: 'ちくわ', synonyms: ['竹輪', 'チクワ'], kind: '魚介' },
  { name: 'カニカマ', synonyms: ['かに風味かまぼこ', 'かにかま'], kind: '魚介' },
  { name: 'あさり', synonyms: ['アサリ', '浅利'], kind: '魚介' },
  { name: 'えび', synonyms: ['エビ', '海老'], kind: '魚介' },
  { name: '鮭', synonyms: ['さけ', 'サケ', 'サーモン', '生鮭'], kind: '魚介' },

  // ───────── 卵・乳製品 ─────────
  { name: '卵', synonyms: ['たまご', 'タマゴ', '玉子', '鶏卵', '溶き卵', 'とき卵'], kind: '卵乳' },
  { name: 'ゆで卵', synonyms: ['茹で卵', 'ゆでたまご', '茹でたまご'], parent: '卵', kind: '卵乳' },
  { name: '卵黄', synonyms: ['たまごの黄身', '黄身'], parent: '卵', kind: '卵乳' },
  { name: '卵白', synonyms: ['白身'], parent: '卵', kind: '卵乳' },
  { name: '牛乳', synonyms: ['ぎゅうにゅう', 'ミルク'], kind: '卵乳' },
  { name: '豆乳', synonyms: ['無調整豆乳'], kind: '卵乳' },
  { name: 'バター', synonyms: ['無塩バター', '有塩バター'], kind: '卵乳' },
  { name: 'マーガリン', kind: '卵乳' },
  { name: '生クリーム', synonyms: ['ホイップクリーム'], kind: '卵乳' },
  { name: 'ヨーグルト', synonyms: ['プレーンヨーグルト'], kind: '卵乳' },
  { name: 'チーズ', kind: '卵乳' },
  { name: 'とろけるチーズ', synonyms: ['ピザ用チーズ', 'シュレッドチーズ'], parent: 'チーズ', kind: '卵乳' },
  { name: '粉チーズ', synonyms: ['パルメザンチーズ'], parent: 'チーズ', kind: '卵乳' },
  { name: 'スライスチーズ', parent: 'チーズ', kind: '卵乳' },
  { name: 'クリームチーズ', parent: 'チーズ', kind: '卵乳' },

  // ───────── 豆製品 ─────────
  { name: '豆腐', synonyms: ['とうふ', 'トウフ'], kind: '豆' },
  { name: '木綿豆腐', synonyms: ['もめん豆腐'], parent: '豆腐', kind: '豆' },
  { name: '絹ごし豆腐', synonyms: ['絹豆腐', 'きぬごし豆腐'], parent: '豆腐', kind: '豆' },
  { name: '油揚げ', synonyms: ['あぶらあげ', 'あげ'], kind: '豆' },
  { name: '厚揚げ', synonyms: ['あつあげ', '生揚げ'], kind: '豆' },
  { name: '納豆', synonyms: ['なっとう'], kind: '豆' },

  // ───────── 穀類・主食 ─────────
  { name: '米', synonyms: ['お米', '白米', '生米'], kind: '穀類' },
  { name: 'もち米', synonyms: ['もちごめ', '餅米'], parent: '米', kind: '穀類' },
  { name: 'ご飯', synonyms: ['ごはん', '白ごはん', '温かいご飯', 'ライス'], kind: '穀類' },
  { name: '食パン', synonyms: ['パン'], kind: '穀類' },
  { name: 'パン粉', kind: '穀類' },
  { name: 'パスタ', synonyms: ['スパゲッティ', 'スパゲティ', 'マカロニ'], kind: '穀類' },
  { name: 'うどん', synonyms: ['ゆでうどん', '冷凍うどん'], kind: '穀類' },
  { name: '中華麺', synonyms: ['中華めん', 'ラーメン'], kind: '穀類' },
  { name: '春雨', synonyms: ['はるさめ'], kind: '穀類' },
  { name: '米粉', kind: '穀類' },
  { name: 'ホットケーキミックス', synonyms: ['ホットケーキミックス粉', 'HM'], kind: '穀類' },

  // ───────── 製菓・その他 ─────────
  { name: 'ベーキングパウダー', kind: 'その他' },
  { name: 'ドライイースト', synonyms: ['イースト'], kind: 'その他' },
  { name: 'バニラエッセンス', synonyms: ['バニラオイル'], kind: 'その他' },
  { name: '粉ゼラチン', synonyms: ['ゼラチン'], kind: 'その他' },
  { name: 'ココアパウダー', synonyms: ['ココア', '純ココア'], kind: 'その他' },
  { name: 'インスタントコーヒー', kind: 'その他' },
  { name: 'ラム酒', kind: 'その他' },
  { name: 'キムチ', kind: 'その他' },
  { name: 'バナナ', kind: '果物' },
  { name: 'レモン', kind: '果物' },
  { name: 'りんご', synonyms: ['リンゴ', '林檎'], kind: '果物' },

  // ───────── 追加ラウンド1（未登録の頻出食材。D-10に従い頻度順で整備） ─────────
  { name: '黒糖', synonyms: ['黒砂糖'], parent: '砂糖', kind: '調味料' },
  { name: '粉糖', synonyms: ['粉砂糖'], parent: '砂糖', kind: '調味料' },
  { name: 'オリゴ糖', kind: '調味料' },
  { name: 'わさび', synonyms: ['ワサビ', '山葵', 'わさびチューブ'], kind: '調味料' },
  { name: 'カレールー', synonyms: ['カレールウ'], kind: '調味料' },
  { name: '焼肉のタレ', synonyms: ['焼肉のたれ', '焼き肉のタレ'], kind: '調味料' },
  { name: '甜麺醤', synonyms: ['テンメンジャン'], kind: '調味料' },
  { name: 'タバスコ', kind: '調味料' },
  { name: 'ターメリック', synonyms: ['ターメリックパウダー', 'ウコン'], kind: '調味料' },
  { name: 'ハーブソルト', synonyms: ['クレイジーソルト'], kind: '調味料' },
  { name: '天ぷら粉', kind: '穀類' },
  { name: '梅干し', synonyms: ['梅干', 'うめぼし'], kind: 'その他' },

  { name: '長芋', synonyms: ['長いも', 'ながいも', '山芋', 'やまいも'], kind: '野菜' },
  { name: 'ズッキーニ', kind: '野菜' },
  { name: '豆苗', synonyms: ['とうみょう'], kind: '野菜' },
  { name: '冬瓜', synonyms: ['とうがん'], kind: '野菜' },
  { name: 'みょうが', synonyms: ['ミョウガ', '茗荷'], kind: '野菜' },
  { name: '三つ葉', synonyms: ['みつば', 'ミツバ'], kind: '野菜' },
  { name: 'かぶ', synonyms: ['カブ', '蕪'], kind: '野菜' },
  { name: 'たけのこ', synonyms: ['タケノコ', '筍', '水煮たけのこ'], kind: '野菜' },

  { name: 'イカ', synonyms: ['いか', '烏賊'], kind: '魚介' },
  { name: 'わかめ', synonyms: ['ワカメ', '乾燥わかめ', '若布'], kind: '魚介' },
  { name: 'かまぼこ', synonyms: ['カマボコ', '蒲鉾'], kind: '魚介' },
  { name: 'さつま揚げ', synonyms: ['薩摩揚げ'], kind: '魚介' },
  { name: 'しらす', synonyms: ['シラス', 'ちりめんじゃこ'], kind: '魚介' },
  { name: 'ひじき', synonyms: ['ヒジキ', '乾燥ひじき'], kind: '魚介' },
  { name: 'シーフードミックス', kind: '魚介' },

  { name: '栗', synonyms: ['くり', 'クリ'], kind: '果物' },
  { name: '桃', synonyms: ['もも', 'モモ'], kind: '果物' },
  { name: 'いちじく', synonyms: ['イチジク', '無花果'], kind: '果物' },
  { name: 'いちご', synonyms: ['イチゴ', '苺'], kind: '果物' },
  { name: 'すだち', synonyms: ['スダチ'], kind: '果物' },
  { name: 'レーズン', synonyms: ['干しぶどう', 'ほしぶどう'], kind: '果物' },
  { name: 'くるみ', synonyms: ['クルミ', '胡桃'], kind: 'その他' },

  { name: '餃子の皮', synonyms: ['ぎょうざの皮'], kind: '穀類' },
  { name: 'そうめん', synonyms: ['素麺', 'ソーメン'], kind: '穀類' },
  { name: '板チョコ', synonyms: ['チョコレート', 'ミルクチョコレート'], kind: 'その他' },
];
