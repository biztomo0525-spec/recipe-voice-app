// ETL ①-1: カテゴリ一覧を取得して生JSONのまま保存する
// 実行: node --env-file=.env scripts/etl/fetch-categories.mjs
import { writeFileSync } from 'node:fs';

const ID = process.env.RAKUTEN_APP_ID;
const KEY = process.env.RAKUTEN_ACCESS_KEY;
if (!ID || !KEY) { console.error('RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY が未設定です'); process.exit(1); }
const redact = (s) => String(s).replaceAll(ID, '<ID>').replaceAll(KEY, '<KEY>');

const url = 'https://openapi.rakuten.co.jp/recipems/api/Recipe/CategoryList/20170426?'
  + new URLSearchParams({ applicationId: ID, accessKey: KEY, format: 'json' });

try {
  const res = await fetch(url);
  if (!res.ok) { console.error('失敗', res.status, redact(await res.text())); process.exit(1); }
  const json = await res.json();
  writeFileSync('data/raw/categories.json', JSON.stringify(json, null, 2));
  console.log('保存: data/raw/categories.json');

  const r = json.result;
  for (const t of ['large', 'medium', 'small']) {
    console.log(`\n--- ${t} (${r[t].length}件) 先頭1件のキーと値 ---`);
    console.log(JSON.stringify(r[t][0], null, 2));
  }
} catch (e) { console.error('例外:', redact(e.message)); process.exit(1); }
