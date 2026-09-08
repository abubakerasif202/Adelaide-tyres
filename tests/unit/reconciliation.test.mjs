import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcile } from '../../scripts/reconcile.mjs';
import { catalogue } from '../../lib/catalogue.ts';
import { readFileSync } from 'node:fs';

test('historical records form a complete mutually exclusive partition', () => {
  const rows = reconcile();
  assert.equal(new Set(rows.map(r => r.row)).size, 53);
  const totals = {};
  for (const row of rows) {
    totals[row.group] ??= [0, 0];
    totals[row.group][0]++;
    totals[row.group][1] += row.quantity;
  }
  assert.deepEqual(totals, {'exact-match':[24,454], withheld:[3,152], 'model-match':[1,37], 'historical-only':[25,82]});
  assert.equal(rows.reduce((sum,r) => sum+r.quantity,0),725);
  assert.deepEqual(new Set(rows.filter(r=>r.sku).map(r=>r.sku)),new Set(catalogue.map(p=>p.id)));
  assert.equal(rows[19].rawQuantity,'09');
  assert.equal(rows[19].quantity,9);
  const expectedCsv = [Object.keys(rows[0]).join(','), ...rows.map(row => Object.values(row).map(value => '"' + String(value).replaceAll('"', '""') + '"').join(','))].join('\n');
  assert.equal(readFileSync('docs/source-inventory/reconciliation.csv', 'utf8').trim(), expectedCsv);
});
