/**
 * kiwi-paper network helpers — SSRF-guarded fetch with manual redirects
 * and size-limited body reads.
 */

import { BlockList, isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

const USER_AGENT = 'kiwi-paper-renderer/1.0';

// Loopback, private, link-local, CGNAT, multicast and reserved ranges
const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
]) blocked.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of [
  ['::', 127], ['64:ff9b::', 96], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
]) blocked.addSubnet(net, prefix, 'ipv6');

export function isPrivateAddress(address) {
  const family = isIP(address);
  if (family === 0) return true;
  // BlockList also matches IPv4-mapped IPv6 (::ffff:7f00:1) against the IPv4 rules
  return blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

/**
 * True when the URL is http(s) and every address its host resolves to is
 * public. The host is resolved again by fetch, so this does not stop DNS
 * rebinding, but it covers literal IPs, localhost aliases and private DNS.
 */
export async function isSafeUrl(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  let addresses;
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await lookup(host, { all: true })).map((a) => a.address);
    } catch {
      return false;
    }
  }
  return addresses.length > 0 && !addresses.some(isPrivateAddress);
}

/**
 * Fetch with every redirect hop checked by isSafeUrl. Relative Location
 * headers are resolved against the current URL. Returns the final URL too.
 */
export async function fetchSafe(url, { timeout = 30000, maxRedirects = 5 } = {}) {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!(await isSafeUrl(current))) throw new Error(`Blocked unsafe URL: ${current}`);
    const res = await fetch(current, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(timeout),
      redirect: 'manual',
    });
    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel();
      const location = res.headers.get('location');
      if (!location) throw new Error(`Redirect without Location from ${current}`);
      current = new URL(location, current).href;
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`Failed to fetch ${current}: ${res.status}`);
    }
    return { res, url: current };
  }
  throw new Error(`Too many redirects fetching ${url}`);
}

/** Read a response body, aborting once it exceeds maxBytes. */
export async function readBody(res, maxBytes) {
  if (!res.body) return Buffer.alloc(0);
  const chunks = [];
  let total = 0;
  // Throwing inside for-await cancels the stream; calling cancel() on the locked stream would not
  for await (const chunk of res.body) {
    total += chunk.length;
    if (total > maxBytes) throw new Error(`response exceeds ${Math.round(maxBytes / 1024 / 1024)}MB`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
