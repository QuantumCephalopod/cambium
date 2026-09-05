/* exact finite vertex witnesses of the 1->4 tetrahedral carrier.
 * the string quotient is identity; floating-point coordinates are display only.
 * source: cambium-diamond, router quotient section (v1.1).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CambiumAddress = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const GENES = Object.freeze(['w', 'x', 'z', 'y']);
  const STUDY = Object.freeze({ w: 'a', x: 'b', z: 'c', y: 'd' });
  const ORDER = new Map(GENES.map((g, i) => [g, i]));

  function validate(word) {
    if (typeof word !== 'string' || !/^[wxzy]*$/.test(word)) {
      throw new TypeError('an address contains only w, x, z, y; the empty word is the overview');
    }
    return word;
  }
  function stripSelf(word) {
    validate(word);
    let n = word.length;
    while (n > 1 && word[n - 1] === word[n - 2]) n--;
    return word.slice(0, n);
  }
  function compare(a, b) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const delta = ORDER.get(a[i]) - ORDER.get(b[i]);
      if (delta) return delta;
    }
    return a.length - b.length;
  }
  function witnesses(word) {
    const p = stripSelf(word);
    if (p.length < 2) return [p];
    return [p, p.slice(0, -2) + p.at(-1) + p.at(-2)].sort(compare);
  }
  function key(word) {
    const p = witnesses(word)[0];
    return p === '' ? 'overview' : p.length === 1 ? 'vertex:' + p : 'junction:' + p;
  }
  function same(a, b) { return key(a) === key(b); }
  function prefixes(word) {
    validate(word);
    return Array.from(word, (_, i) => word.slice(0, i + 1));
  }
  function display(word, specimen = false) {
    validate(word);
    return Array.from(word, g => specimen ? STUDY[g] : g).join('.');
  }
  function fromDisplay(text, specimen = false) {
    if (typeof text !== 'string') throw new TypeError('address must be text');
    const clean = text.trim().toLowerCase();
    const allowed = specimen ? /^(?:[abcd](?:\.?[abcd])*)?$/ : /^(?:[wxzy](?:\.?[wxzy])*)?$/;
    if (!allowed.test(clean)) throw new TypeError('each address step needs one letter');
    const compact = clean.replaceAll('.', '');
    const p = specimen ? Array.from(compact, c => {
      const entry = Object.entries(STUDY).find(([, label]) => label === c);
      if (!entry) throw new TypeError('the address study uses a, b, c, d');
      return entry[0];
    }).join('') : compact;
    return validate(p);
  }
  function exact(word) {
    const p = validate(word);
    if (!p) throw new RangeError('the overview has no vertex coordinate');
    let numerator = [0n, 0n, 0n, 0n], denominator = 1n;
    numerator[ORDER.get(p.at(-1))] = 1n;
    for (let i = p.length - 2; i >= 0; i--) {
      numerator[ORDER.get(p[i])] += denominator;
      denominator *= 2n;
    }
    while (denominator > 1n && numerator.every(v => v % 2n === 0n)) {
      numerator = numerator.map(v => v / 2n); denominator /= 2n;
    }
    return { numerator, denominator };
  }
  function exactKey(word) {
    const p = exact(word);
    return p.numerator.join(',') + '/' + p.denominator.toString();
  }
  function ratio(n, d) {
    if (d <= 0n) throw new RangeError('positive denominator required');
    if (n === 0n) return 0;
    const sign = n < 0n ? -1 : 1, a = n < 0n ? -n : n;
    const sa = Math.max(0, a.toString(2).length - 52);
    const sd = Math.max(0, d.toString(2).length - 52);
    return sign * (Number(a >> BigInt(sa)) / Number(d >> BigInt(sd))) * 2 ** (sa - sd);
  }
  function relative(word, origin, scalePower = 0) {
    const p = exact(word), o = exact(origin);
    const d = p.denominator > o.denominator ? p.denominator : o.denominator;
    const scale = 1n << BigInt(scalePower);
    return p.numerator.map((n, i) => ratio((n * (d / p.denominator) - o.numerator[i] * (d / o.denominator)) * scale, d));
  }
  function barycentric(word) {
    const p = exact(word);
    return p.numerator.map(n => ratio(n, p.denominator));
  }
  return Object.freeze({ GENES, STUDY, validate, stripSelf, compare, witnesses, key, same, prefixes, display, fromDisplay, exact, exactKey, ratio, relative, barycentric });
});
