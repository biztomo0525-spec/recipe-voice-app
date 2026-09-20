// 楽天レシピAPI 疎通確認スクリプト
// 実行: node --env-file=.env scripts/check-api.mjs
//
// 確認事項:
//   1. アプリIDが有効か
//   2. Allowed IP addresses（IPv6 /64 登録）が効いているか
//   3. カテゴリ総数 = ETL の規模

const APP_ID = process.env.RAKUTEN_APP_ID;
const ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY;
if (!APP_ID) {
  console.error('RAKUTEN_APP_ID が未設定です。--env-file=.env を付けて実行してください。');
  process.exit(1);
}
if (!ACCESS_KEY) {
  console.error('RAKUTEN_ACCESS_KEY が未設定です。');
  process.exit(1);
}

// 認証情報は絶対に出力しない。URL を含む文字列は必ずこれを通す
const redact = (s) =>
  String(s).replaceAll(APP_ID, '<APP_ID>').replaceAll(ACCESS_KEY, '<ACCESS_KEY>');

const params = new URLSearchParams({
  applicationId: APP_ID,
  accessKey: ACCESS_KEY,
  format: 'json',
});
// 2026年の仕様変更で app.rakuten.co.jp は廃止。openapi.rakuten.co.jp が新エンドポイント
const url =
  'https://openapi.rakuten.co.jp/recipems/api/Recipe/CategoryList/20170426?' + params;

try {
  const res = await fetch(url, { headers: { 'User-Agent': 'recipe-voice-app/0.1 (personal use)' } });
  console.log('HTTP ステータス:', res.status, res.statusText);

  const text = await res.text();

  if (!res.ok) {
    console.log('\n❌ 失敗');
    console.log('レスポンス:', redact(text).slice(0, 500));
    console.log('\n--- 切り分け ---');
    if (res.status === 400) console.log('400: applicationId / accessKey が不正、またはパラメータ誤り');
    if (res.status === 401) console.log('401: 認証失敗 → accessKey を確認');
    if (res.status === 403) console.log('403: 送信元IPが許可リストに無い可能性が高い → Allowed IP addresses を確認');
    if (res.status === 429) console.log('429: レート制限');
    process.exit(1);
  }

  const json = JSON.parse(text);
  const c = json.result ?? {};
  const large = c.large?.length ?? 0;
  const medium = c.medium?.length ?? 0;
  const small = c.small?.length ?? 0;
  const total = large + medium + small;

  console.log('\n✅ 疎通成功');
  console.log('\n--- カテゴリ数 ---');
  console.log('大カテゴリ:', large);
  console.log('中カテゴリ:', medium);
  console.log('小カテゴリ:', small);
  console.log('合計      :', total);

  console.log('\n--- ETL 規模の試算（1 QPS 厳守） ---');
  console.log('必要リクエスト数:', total, '件');
  const sec = total;
  console.log('所要時間        : 約', Math.floor(sec / 60), '分', sec % 60, '秒');
  console.log('取得レシピ数(上限):', total * 4, '件（1カテゴリ最大4件、重複含む）');

  console.log('\n--- サンプル（大カテゴリ先頭3件） ---');
  for (const x of (c.large ?? []).slice(0, 3)) {
    console.log(` categoryId=${x.categoryId}  ${x.categoryName}`);
  }
} catch (e) {
  console.log('\n❌ 例外:', redact(e.message));
  process.exit(1);
}
