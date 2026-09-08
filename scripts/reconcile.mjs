import { readFileSync } from 'node:fs';
import { catalogue } from '../lib/catalogue.ts';

export function reconcile() {
  return readFileSync(new URL('../docs/source-inventory/brand-name-historical.csv', import.meta.url), 'utf8').trim().split('\n').slice(1).map(line => {
    const [page, row, brand, pattern, size, rawQuantity] = line.split(',');
    const normalizedPattern = Number(row) === 19 ? 'G-PILOT X1' : pattern;
    const product = catalogue.find(p => p.brand === brand && p.pattern === normalizedPattern && p.size.toLowerCase() === size.toLowerCase());
    const group = product ? (Number(row) === 19 ? 'model-match' : 'exact-match') : [4,17,23].includes(Number(row)) ? 'withheld' : 'historical-only';
    return { page, row, brand, pattern, size, rawQuantity, quantity: Number(rawQuantity), sku: product?.id ?? '', currentQuantity: product?.stock ?? '', price: product?.price ?? '', publication: product ? 'published' : 'unpublished', identityConfidence: group === 'exact-match' ? 'record-match; physical identity unverified' : group === 'model-match' ? 'variant mapping; physical identity unverified' : 'unresolved', imageStatus: product?.image ? 'existing asset; rights pending' : 'supplier imagery pending', group, notes: product ? 'Static record match; historical source has no prices; current stock confirmation required.' : 'Current identity, stock, price and publication approval required.' };
  });
}

if (process.argv.includes('--csv')) {
  const rows = reconcile();
  console.log(Object.keys(rows[0]).join(','));
  for (const row of rows) console.log(Object.values(row).map(v => '"' + String(v).replaceAll('"', '""') + '"').join(','));
}
