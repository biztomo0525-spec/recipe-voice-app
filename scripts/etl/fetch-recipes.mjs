// ETL ①-2: 全カテゴリのランキングを巡回し、生JSONのまま保存する
//   - 1 QPS 厳守（楽天への申告値。ADR-001 参照）
//   - 再開可能：保存済みのカテゴリはスキップする
//   - パース・加工は一切しない（設計書 M-01）
// 実行: node --env-file=.env scripts/etl/fetch-recipes.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const ID = process.env.RAKUTEN_APP_ID;
const KEY = process.env.RAKUTEN_ACCESS_KEY;
if (!ID || !KEY) { console.error('認証情報が未設定です'); process.exit(1); }
const redact = (s) => String(s).replaceAll(ID, '<ID>').replaceAll(KEY, '<KEY>');

const INTERVAL_MS = 1100;          // 1 QPS を下回るように
const OUT_DIR = 'data/raw/ranking';
mkdirSync(OUT_DIR, { recursive: true });

// categoryUrl に含まれる結合済みID（例 .../category/10-66-50/）を取り出す
const compositeId = (c) => {
  const m = /\/category\/([^/?]+)/.exec(c.categoryUrl ?? '');
  return m ? m[1] : String(c.categoryId);
};

const { result } = JSON.parse(readFileSync('data/raw/categories.json', 'utf-8'));
const targets = [];
for (const type of ['large', 'medium', 'small']) {
  for (const c of result[type]) {
    targets.push({ type, id: compositeId(c), name: c.categoryName });
  }
}
console.log(`対象カテゴリ: ${targets.length}件`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let done = 0, skipped = 0, failed = 0, recipes = 0;
const t0 = Date.now();

for (const [i, t] of targets.entries()) {
  const out = `${OUT_DIR}/${t.id}.json`;
  if (existsSync(out)) { skipped++; continue; }

  const url = 'https://openapi.rakuten.co.jp/recipems/api/Recipe/CategoryRanking/20170426?'
    + new URLSearchParams({ applicationId: ID, accessKey: KEY, format: 'json', categoryId: t.id });

  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {                       // レート制限：待って再試行
        console.warn(`  429 レート制限 → ${attempt * 10}秒待機 (${t.id})`);
        await sleep(attempt * 10_000);
        continue;
      }
      const text = await res.text();
      if (!res.ok) {
        console.warn(`  ${res.status} ${t.id} ${t.name}: ${redact(text).slice(0, 100)}`);
        break;                                        // 恒久エラーは再試行しない
      }
      const json = JSON.parse(text);
      writeFileSync(out, JSON.stringify(json));
      recipes += json.result?.length ?? 0;
      ok = true; done++;
    } catch (e) {
      console.warn(`  例外 ${t.id} (${attempt}/3): ${redact(e.message)}`);
      await sleep(3000);
    }
  }
  if (!ok) failed++;

  if ((i + 1) % 100 === 0) {
    const elapsed = (Date.now() - t0) / 1000;
    const remain = Math.round((targets.length - i - 1) * INTERVAL_MS / 1000 / 60);
    console.log(`[${i + 1}/${targets.length}] 取得${done} スキップ${skipped} 失敗${failed} レシピ${recipes}件 / 経過${Math.round(elapsed / 60)}分 残り約${remain}分`);
  }
  await sleep(INTERVAL_MS);
}

console.log('\n=== 完了 ===');
console.log(`取得: ${done} / スキップ: ${skipped} / 失敗: ${failed}`);
console.log(`レシピ総数(重複含む): ${recipes}件`);
console.log(`所要: ${Math.round((Date.now() - t0) / 1000 / 60)}分`);
