import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readSubmission} from '../../lib/request-body.ts';
test('submission byte limit rejects oversized and malformed bodies without trusting headers', async () => {
  const request = body => new Request('http://localhost/api/orders',{method:'POST',body});
  assert.deepEqual(await readSubmission(request('{"name":"Test"}')),{name:'Test'});
  for (const body of ['null','[]','{']) await assert.rejects(readSubmission(request(body)));
  await assert.rejects(readSubmission(request(JSON.stringify({text:'x'.repeat(33_000)}))),RangeError);
});
