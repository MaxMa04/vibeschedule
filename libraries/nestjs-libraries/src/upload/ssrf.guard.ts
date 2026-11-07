import { Agent, fetch } from 'undici';
import dns from 'node:dns';
import net from 'node:net';

const blockedIPv4Ranges: [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['100.64.0.0', 10],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
];

// BlockList matches an IPv4 rule in any notation, including IPv4-mapped IPv6
// like ::ffff:7f00:1, so addresses are never compared as strings
const blockedIps = new net.BlockList();

for (const [address, prefix] of blockedIPv4Ranges) {
  blockedIps.addSubnet(address, prefix, 'ipv4');

  // the same IPv4 range embedded in NAT64 (64:ff9b::/96) and 6to4 (2002::/16)
  const [a, b, c, d] = address.split('.').map(Number);
  const high = ((a << 8) | b).toString(16);
  const low = ((c << 8) | d).toString(16);
  blockedIps.addSubnet(`64:ff9b::${high}:${low}`, 96 + prefix, 'ipv6');
  blockedIps.addSubnet(`2002:${high}:${low}::`, 16 + prefix, 'ipv6');
}

blockedIps.addSubnet('::', 96, 'ipv6');
blockedIps.addSubnet('fe80::', 10, 'ipv6');
blockedIps.addSubnet('fec0::', 10, 'ipv6');
blockedIps.addSubnet('fc00::', 7, 'ipv6');
blockedIps.addSubnet('ff00::', 8, 'ipv6');

const isBlockedIp = (ip: string) => {
  const version = net.isIP(ip);
  return version ? blockedIps.check(ip, version === 4 ? 'ipv4' : 'ipv6') : true;
};

// Checks every resolved IP and connects to that same set, so a URL cannot
// pass a check and then resolve to an internal address on connect
function ssrfSafeLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: Error | null, address: any, family?: number) => void
) {
  if (net.isIP(hostname)) {
    const family = net.isIP(hostname);
    if (isBlockedIp(hostname)) {
      return callback(new Error('Blocked IP'), '', 0);
    }
    return options?.all
      ? callback(null, [{ address: hostname, family }], family)
      : callback(null, hostname, family);
  }

  dns.lookup(hostname, options, (err, address: any, family) => {
    if (err) {
      return callback(err, '', 0);
    }
    const all: { address: string }[] = Array.isArray(address)
      ? address
      : [{ address }];
    if (all.some((entry) => isBlockedIp(entry.address))) {
      return callback(new Error('Blocked IP'), '', 0);
    }
    callback(null, address, family);
  });
}

const ssrfSafeDispatcher = new Agent({
  connect: { lookup: ssrfSafeLookup as any },
});

// undici's own fetch: the global one of newer Node versions rejects an Agent
// from the undici package. Redirects are followed by hand so every hop is
// checked, and a literal IP never reaches the lookup, so it is checked here.
export async function ssrfSafeFetch(url: string) {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const parsed = new URL(current);
    const host = parsed.hostname.replace(/^\[|\]$/g, '');
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      (net.isIP(host) && isBlockedIp(host))
    ) {
      throw new Error('Blocked URL');
    }

    const response = await fetch(current, {
      dispatcher: ssrfSafeDispatcher,
      redirect: 'manual',
    });
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) {
      return response;
    }
    await response.body?.cancel();
    current = new URL(location, current).toString();
  }
  throw new Error('Too many redirects');
}
