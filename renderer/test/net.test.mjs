import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateAddress, isSafeUrl, readBody } from '../src/net.mjs';

test('isPrivateAddress flags loopback, private, link-local and CGNAT ranges', () => {
  for (const addr of [
    '127.0.0.1', '127.1.2.3', '0.0.0.0', '10.1.2.3', '172.16.0.1', '172.31.255.255',
    '192.168.1.1', '169.254.169.254', '100.64.0.1', '224.0.0.1',
    '::1', '::', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1', 'not-an-ip',
  ]) {
    assert.equal(isPrivateAddress(addr), true, addr);
  }
});

test('isPrivateAddress allows public addresses', () => {
  for (const addr of ['8.8.8.8', '172.32.0.1', '100.128.0.1', '2606:4700::1111']) {
    assert.equal(isPrivateAddress(addr), false, addr);
  }
});

test('isSafeUrl rejects non-http schemes and private hosts', async () => {
  for (const url of [
    'file:///etc/passwd', 'ftp://example.com/x', 'http://localhost/', 'http://127.0.0.2/',
    'http://2130706433/', 'http://0x7f.1/', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/',
    'http://169.254.169.254/latest/meta-data/', 'not a url',
  ]) {
    assert.equal(await isSafeUrl(url), false, url);
  }
});

test('isSafeUrl accepts public IP literals without DNS', async () => {
  assert.equal(await isSafeUrl('https://8.8.8.8/x.png'), true);
});

test('readBody stops at the size limit without crashing', async () => {
  const res = new Response(new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(1 << 20)); } }));
  await assert.rejects(readBody(res, 3 << 20), /exceeds/);
  const small = new Response('hello');
  assert.equal((await readBody(small, 100)).toString(), 'hello');
});
