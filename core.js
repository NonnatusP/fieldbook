/* Survey Field Kit - pure calculation core (no DOM). Works in browser and Node. */
(function (root) {
  'use strict';
  const RAD = Math.PI / 180;
  const DEFAULTS = { a: 2, b: 2, ar: 3, br: 2, idx: 5, c2: 20, ang: 5, fmt: 'dms', inst: '', k: 10, sf: 1 };

  /* ---------- angles ---------- */
  const norm360 = x => { x %= 360; return x < 0 ? x + 360 : x; };
  const norm180 = x => { x = norm360(x); return x > 180 ? x - 360 : x; };
  const pad2 = n => (n < 10 ? '0' : '') + n;
  const num = v => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : NaN; };

  // 'dms' = DD.MMSS (e.g. 90.0030 = 90 deg 00 min 30 sec; digits after SS are decimal seconds). 'dd' = decimal degrees.
  function parseAng(s, fmt) {
    s = String(s == null ? '' : s).trim().replace(',', '.');
    if (!s) return NaN;
    if (fmt === 'dd') return num(s);
    const m = /^([+-]?)(\d+)(?:\.(\d*))?$/.exec(s);
    if (!m) return NaN;
    const frac = (m[3] || '').padEnd(4, '0');
    const mm = +frac.slice(0, 2);
    const ss = +(frac.slice(2, 4) + (frac.length > 4 ? '.' + frac.slice(4) : ''));
    if (mm >= 60 || ss >= 60) return NaN;
    const v = +m[2] + mm / 60 + ss / 3600;
    return m[1] === '-' ? -v : v;
  }
  function fmtDMS(deg, dp) {
    if (!isFinite(deg)) return '-';
    dp = dp == null ? 0 : dp;
    const f = Math.pow(10, dp), neg = deg < 0;
    const t = Math.round(Math.abs(deg) * 3600 * f);
    const D = Math.floor(t / (3600 * f));
    let r = t - D * 3600 * f;
    const M = Math.floor(r / (60 * f)); r -= M * 60 * f;
    const S = r / f;
    return (neg ? '-' : '') + D + '°' + pad2(M) + "'" + (dp ? (S < 10 ? '0' : '') + S.toFixed(dp) : pad2(S)) + '"';
  }
  // text that parseAng(...,'dms') reads back (tenth-of-second resolution)
  function fmtDot(deg) {
    if (!isFinite(deg)) return '';
    const neg = deg < 0;
    const T = Math.round(Math.abs(deg) * 36000);
    const D = Math.floor(T / 36000), M = Math.floor((T % 36000) / 600), s10 = T % 600;
    const si = Math.floor(s10 / 10), dec = s10 % 10;
    return (neg ? '-' : '') + D + '.' + pad2(M) + pad2(si) + (dec ? dec : '');
  }
  const fmtAngleField = (deg, fmt) => fmt === 'dd' ? (isFinite(deg) ? String(+deg.toFixed(6)) : '') : fmtDot(deg);

  /* ---------- helpers ---------- */
  const fin = a => a.filter(isFinite);
  const mean = a => { const f = fin(a); return f.length ? f.reduce((s, x) => s + x, 0) / f.length : NaN; };
  function corr(x, y) {
    const p = []; for (let i = 0; i < x.length; i++) if (isFinite(x[i]) && isFinite(y[i])) p.push([x[i], y[i]]);
    const n = p.length; if (n < 3) return { r: NaN, n };
    const mx = mean(p.map(q => q[0])), my = mean(p.map(q => q[1]));
    let sxy = 0, sxx = 0, syy = 0;
    p.forEach(q => { sxy += (q[0] - mx) * (q[1] - my); sxx += (q[0] - mx) ** 2; syy += (q[1] - my) ** 2; });
    return { r: sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN, n };
  }
  const edmTol = (D, mode, S) => (mode === 'R' ? S.ar : S.a) + (mode === 'R' ? S.br : S.b) * (D / 1000); // mm, D in m

  /* ---------- two-face reading ---------- */
  function calc(o, S) {
    const zL = parseAng(o.zL, S.fmt), hL = parseAng(o.hL, S.fmt), zR = parseAng(o.zR, S.fmt), hR = parseAng(o.hR, S.fmt);
    const sL = num(o.sL), sR = num(o.sR);
    let dL = num(o.dL), dR = num(o.dR);
    const zRn = isFinite(zR) ? (zR > 180 ? 360 - zR : zR) : NaN; // face-right zenith reduced to face-left sense
    const dLc = isFinite(sL) && isFinite(zL) ? sL * Math.sin(zL * RAD) : NaN;
    const dRc = isFinite(sR) && isFinite(zRn) ? sR * Math.sin(zRn * RAD) : NaN;
    const hdL = isFinite(dL) ? dL : dLc, hdR = isFinite(dR) ? dR : dRc;
    const idx = isFinite(zL) && isFinite(zR) ? ((zL + zR - 360) / 2) * 3600 : NaN;
    const c2 = isFinite(hL) && isFinite(hR) ? norm180(hL - hR + 180) * 3600 : NaN;
    const z = isFinite(zL) && isFinite(zR) ? (zL + 360 - zR) / 2 : (isFinite(zL) ? zL : zRn);
    const sdMean = mean([sL, sR]), hdMean = mean([hdL, hdR]);
    const sdDiff = isFinite(sL) && isFinite(sR) ? (sL - sR) * 1000 : NaN;
    const hdDiff = isFinite(hdL) && isFinite(hdR) ? (hdL - hdR) * 1000 : NaN;
    const mode = o.mode === 'R' ? 'R' : 'P';
    const D = isFinite(hdMean) ? hdMean : sdMean;
    const tol = isFinite(D) ? Math.SQRT2 * edmTol(D, mode, S) : NaN;
    const f = {
      sd: isFinite(sdDiff) && isFinite(tol) ? Math.abs(sdDiff) > tol : null,
      hd: isFinite(hdDiff) && isFinite(tol) ? Math.abs(hdDiff) > tol : null,
      idx: isFinite(idx) ? Math.abs(idx) > S.idx : null,
      c2: isFinite(c2) ? Math.abs(c2) > S.c2 : null
    };
    const vals = Object.values(f).filter(v => v !== null);
    const status = !vals.length ? 'na' : vals.some(v => v) ? 'bad' : 'ok';
    const hdDev = (a, b) => isFinite(a) && isFinite(b) ? Math.abs(a - b) * 1000 : NaN; // typed HD vs SD*sin(z)
    const hdChk = Math.max(isFinite(dL) ? hdDev(dL, dLc) : 0, isFinite(dR) ? hdDev(dR, dRc) : 0);
    return { zL, hL, zR, hR, sL, sR, hdL, hdR, idx, c2, z, slope: isFinite(z) ? Math.abs(90 - z) : NaN,
      sdMean, hdMean, sdDiff, hdDiff, tol, mode, f, status, D, hdChk: hdChk > 0 && isFinite(tol) && hdChk > 2 * tol ? hdChk : NaN };
  }

  /* ---------- analysis ---------- */
  const VARS = {
    hd: { label: 'HD (m)', get: c => c.D },
    slope: { label: 'Slope angle (°)', get: c => c.slope },
    sdd: { label: 'ΔSD L-R (mm)', get: c => c.sdDiff },
    hdd: { label: 'ΔHD L-R (mm)', get: c => c.hdDiff },
    idx: { label: 'Index error (″)', get: c => c.idx },
    c2: { label: '2C (″)', get: c => c.c2 }
  };
  const PAIRS = [['hd', 'sdd', 'Distance vs ΔSD'], ['hd', 'hdd', 'Distance vs ΔHD'], ['slope', 'hdd', 'Slope vs ΔHD'],
    ['slope', 'idx', 'Slope vs index error'], ['hd', 'c2', 'Distance vs 2C']];

  function verdict(rows, S) {
    const out = [], n = rows.length;
    if (!n) return [['na', 'No readings yet.']];
    const bad = rows.filter(c => c.status === 'bad').length;
    out.push([bad ? 'bad' : 'ok', bad ? bad + ' of ' + n + ' readings have a flagged value.' : 'All ' + n + ' readings are within limits.']);
    ['sd', 'hd'].forEach(k => {
      const fl = rows.filter(c => c.f[k] === true).length, tot = rows.filter(c => c.f[k] !== null).length;
      if (tot) out.push([fl ? 'warn' : 'ok', (k === 'sd' ? 'ΔSD' : 'ΔHD') + ' face difference: ' + fl + ' of ' + tot + ' over tolerance.']);
    });
    const ix = fin(rows.map(c => c.idx));
    if (ix.length) {
      const m = mean(ix), mx = Math.max(...ix.map(Math.abs));
      out.push([mx > S.idx ? 'bad' : 'ok', 'Index error: mean ' + m.toFixed(1) + '″, worst ' + mx.toFixed(1) + '″ (limit ' + S.idx + '″).' + (mx > S.idx ? ' Calibrate the vertical index.' : '')]);
    }
    const c2 = fin(rows.map(c => c.c2));
    if (c2.length) {
      const m = mean(c2), mx = Math.max(...c2.map(Math.abs));
      if (mx > S.c2) out.push(['bad', '2C: worst ' + mx.toFixed(1) + '″ is over the ' + S.c2 + '″ limit. Check collimation.']);
      else if (c2.length >= 3 && Math.abs(m) > 0.7 * S.c2) out.push(['warn', '2C is consistently ' + (m > 0 ? 'positive' : 'negative') + ' (mean ' + m.toFixed(1) + '″). Within limit, worth adjusting.']);
      else out.push(['ok', '2C collimation is within limit (mean ' + m.toFixed(1) + '″).']);
    }
    const maxSlope = Math.max(0, ...fin(rows.map(c => c.slope)));
    if (n >= 5) PAIRS.forEach(([x, y, name]) => {
      if (x === 'slope' && maxSlope < 1) return; // flat ground: slope is just noise
      const r = corr(rows.map(VARS[x].get), rows.map(VARS[y].get));
      if (isFinite(r.r) && Math.abs(r.r) >= 0.7) out.push(['warn', name + ' move together (r = ' + r.r.toFixed(2) + ', n = ' + r.n + ').']);
    });
    return out;
  }

  /* ---------- triangles ---------- */
  const sid = v => String(v == null ? '' : v).trim();
  function findTriangles(D) {
    const seen = {}, ids = [], obs = {};
    D.forEach(o => { const s = sid(o.stn), t = sid(o.pt); [s, t].forEach(x => { if (x && !seen[x]) { seen[x] = 1; ids.push(x); } }); if (s && t) obs[s + '>' + t] = 1; });
    const out = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = j + 1; k < ids.length; k++) {
      const T = [ids[i], ids[j], ids[k]];
      if (T.every((s, x) => T.every((u, y) => x === y || obs[s + '>' + u]))) out.push(T);
    }
    return out;
  }
  function triangle(D, S, T) {
    const L = {};
    D.forEach(o => { const s = sid(o.stn), t = sid(o.pt); if (s && t) (L[s + '>' + t] = L[s + '>' + t] || []).push(calc(o, S)); });
    const avg = (s, t, f) => mean((L[s + '>' + t] || []).map(f));
    const interior = x => { x = norm360(x); return x > 180 ? 360 - x : x; };
    const angles = T.map((s, i) => {
      const [t1, t2] = T.filter((_, j) => j !== i);
      const aL = interior(avg(s, t2, c => c.hL) - avg(s, t1, c => c.hL));
      const aR = interior(avg(s, t2, c => c.hR) - avg(s, t1, c => c.hR));
      return { at: s, t1, t2, v: mean([aL, aR]) };
    });
    const side = (p, q) => {
      const f = avg(p, q, c => c.D), r = avg(q, p, c => c.D), v = mean([f, r]);
      const tol = isFinite(v) ? Math.SQRT2 * edmTol(v, 'P', S) : NaN;
      return { p, q, f, r, v, recip: isFinite(f) && isFinite(r) ? (f - r) * 1000 : NaN, tol };
    };
    const sides = [side(T[0], T[1]), side(T[0], T[2]), side(T[1], T[2])];
    const sum = angles.reduce((s, a) => s + a.v, 0);
    const mis = isFinite(sum) ? (sum - 180) * 3600 : NaN;
    const allow = 2 * Math.sqrt(6) * S.ang;
    // each side from the other two and the included angle (cosine rule)
    const cos = [];
    const stAt = n => angles.find(a => a.at === n);
    const sd = (a, b) => sides.find(s => (s.p === a && s.q === b) || (s.p === b && s.q === a));
    T.forEach((P, i) => {
      const [Q, R] = T.filter((_, j) => j !== i);
      const s1 = sd(P, Q).v, s2 = sd(P, R).v, opp = sd(Q, R).v, ang = stAt(P).v;
      const calcd = Math.sqrt(s1 * s1 + s2 * s2 - 2 * s1 * s2 * Math.cos(ang * RAD));
      cos.push({ side: Q + '-' + R, measured: opp, computed: calcd, diff: (calcd - opp) * 1000, tol: 2 * (isFinite(opp) ? Math.SQRT2 * edmTol(opp, 'P', S) : NaN) });
    });
    let pyth = null;
    const rt = angles.find(a => Math.abs(a.v - 90) < 0.1);
    if (rt) {
      const legs = sides.filter(s => s.p === rt.at || s.q === rt.at), hyp = sides.find(s => s.p !== rt.at && s.q !== rt.at);
      pyth = { at: rt.at, diff: (Math.hypot(legs[0].v, legs[1].v) - hyp.v) * 1000, tol: 2 * Math.SQRT2 * edmTol(hyp.v, 'P', S) };
    }
    const complete = isFinite(mis) && sides.every(s => isFinite(s.v)) && angles.every(a => isFinite(a.v));
    const fails = [];
    if (complete) {
      if (Math.abs(mis) > allow) fails.push('angle sum');
      sides.forEach(s => { if (isFinite(s.recip) && Math.abs(s.recip) > s.tol) fails.push('reciprocal ' + s.p + '-' + s.q); });
      cos.forEach(c => { if (isFinite(c.diff) && Math.abs(c.diff) > c.tol) fails.push('side ' + c.side); });
      if (pyth && Math.abs(pyth.diff) > pyth.tol) fails.push('Pythagoras');
    }
    return { T, angles, sides, sum, mis, allow, cos, pyth, status: !complete ? 'incomplete' : fails.length ? 'bad' : 'ok', fails };
  }

  /* ---------- traverse ---------- */
  // rows: [{n:name, a:'angle text', d:'HD text'}]. Angle = clockwise from backsight to foresight ("angle right")
  // unless angType is 'intcw' (interior angle of a loop run clockwise) or 'intacw' (interior, loop run anticlockwise).
  function traverse(c) {
    const fmt = c.fmt, link = c.type === 'link', n = c.rows.length, sf = isFinite(c.sf) && c.sf > 0 ? c.sf : 1;
    if (n < (link ? 2 : 3)) return { error: 'Need at least ' + (link ? 2 : 3) + ' stations.' };
    const brg0 = parseAng(c.brg0, fmt), E0 = num(c.E0), N0 = num(c.N0);
    if (!isFinite(brg0)) return { error: link ? 'Enter the bearing into the first station (from the backsight RO).' : 'Enter the bearing of the first line.' };
    if (!isFinite(E0) || !isFinite(N0)) return { error: 'Enter the start coordinates.' };
    let E1, N1, brgOut;
    if (link) {
      E1 = num(c.E1); N1 = num(c.N1); brgOut = parseAng(c.brgOut, fmt);
      if (!isFinite(E1) || !isFinite(N1)) return { error: 'Enter the end coordinates.' };
      if (!isFinite(brgOut)) return { error: 'Enter the closing bearing (last station to the foresight RO).' };
    }
    const AR = [], AE = [];
    for (let i = 0; i < n; i++) {
      const a = parseAng(c.rows[i].a, fmt);
      if (!isFinite(a)) return { error: 'Angle missing or invalid at station ' + (c.rows[i].n || i + 1) + '.' };
      AE.push(a);
      AR.push(c.angType === 'intcw' ? norm360(360 - a) : a);
    }
    const legs = link ? n - 1 : n, HD = [];
    for (let i = 0; i < legs; i++) {
      const d = num(c.rows[i].d);
      if (!isFinite(d) || d <= 0) return { error: 'Distance missing or invalid for leg ' + (c.rows[i].n || i + 1) + ' to ' + (c.rows[(i + 1) % n].n || (i + 2)) + '.' };
      HD.push(d * sf);
    }
    const name = i => c.rows[i % n].n || String(i % n + 1);
    const gen = A => {
      const b = [];
      if (link) {
        let prev = brg0;
        for (let i = 0; i < n; i++) { prev = norm360(prev + 180 + A[i]); b.push(prev); }
        return b; // b[0..n-2] = leg bearings, b[n-1] = closing bearing
      }
      b.push(brg0);
      for (let i = 1; i < n; i++) b.push(norm360(b[i - 1] + 180 + A[i]));
      return b;
    };
    let angMisSec, theo = null, dir = null;
    if (link) {
      const b = gen(AR);
      angMisSec = norm180(b[n - 1] - brgOut) * 3600;
    } else {
      const sum = AR.reduce((s, x) => s + x, 0);
      const cw = (n + 2) * 180, acw = (n - 2) * 180;
      dir = Math.abs(sum - cw) <= Math.abs(sum - acw) ? 'clockwise' : 'anticlockwise';
      theo = dir === 'clockwise' ? cw : acw;
      angMisSec = (sum - theo) * 3600;
    }
    const allow = (isFinite(c.k) ? c.k : 10) * Math.sqrt(n);
    const corrA = -angMisSec / 3600 / n;
    const ARc = AR.map(x => x + corrA);
    const bAll = gen(ARc), bear = bAll.slice(0, legs);
    const dN = [], dE = [];
    for (let i = 0; i < legs; i++) { dN.push(HD[i] * Math.cos(bear[i] * RAD)); dE.push(HD[i] * Math.sin(bear[i] * RAD)); }
    const sumD = HD.reduce((s, x) => s + x, 0);
    const sN = dN.reduce((s, x) => s + x, 0), sE = dE.reduce((s, x) => s + x, 0);
    const eN = link ? N0 + sN - N1 : sN, eE = link ? E0 + sE - E1 : sE;
    const e = Math.hypot(eN, eE);
    const cN = HD.map(d => -eN * d / sumD), cE = HD.map(d => -eE * d / sumD);
    const aN = dN.map((v, i) => v + cN[i]), aE = dE.map((v, i) => v + cE[i]);
    const coords = [{ n: name(0), E: E0, N: N0 }];
    for (let i = 0; i < legs; i++) { const p = coords[i]; coords.push({ n: name(i + 1), E: p.E + aE[i], N: p.N + aN[i] }); }
    const coordsU = [{ n: name(0), E: E0, N: N0 }];   // after angle adjustment, before Bowditch
    for (let i = 0; i < legs; i++) { const p = coordsU[i]; coordsU.push({ n: name(i + 1), E: p.E + dE[i], N: p.N + dN[i] }); }
    const legsOut = HD.map((d, i) => ({ from: name(i), to: name(i + 1), bearing: bear[i], hd: d, dN: dN[i], dE: dE[i], cN: cN[i], cE: cE[i], aN: aN[i], aE: aE[i] }));
    const sg = c.angType === 'intcw' ? -1 : 1;           // report in the sense the angles were entered
    const misEntered = sg * angMisSec, corrEntered = -misEntered / n;
    const angles = AE.map((x, i) => ({ n: name(i), obs: x, corr: corrEntered, adj: x + corrEntered / 3600 }));
    return { link, n, legs: legsOut, angles, coords, coordsU, angMisSec: misEntered, allow, angOK: Math.abs(angMisSec) <= allow, dir, theo,
      eN, eE, e, sumD, precision: e > 0 ? sumD / e : Infinity, sN, sE, closingBearing: link ? bAll[n - 1] : null };
  }

  // Build traverse rows (angle right + HD) from two-face observations.
  function buildFromTwoFace(D, S, seq, type, roStart, roEnd) {
    const L = {};
    D.forEach(o => { const s = sid(o.stn), t = sid(o.pt); if (s && t) (L[s + '>' + t] = L[s + '>' + t] || []).push(calc(o, S)); });
    const avg = (s, t, f) => mean((L[s + '>' + t] || []).map(f));
    const link = type === 'link', n = seq.length, rows = [], msgs = [];
    for (let i = 0; i < n; i++) {
      const s = seq[i];
      const back = link ? (i === 0 ? roStart : seq[i - 1]) : seq[(i + n - 1) % n];
      const fore = link ? (i === n - 1 ? roEnd : seq[i + 1]) : seq[(i + 1) % n];
      const aL = norm360(avg(s, fore, c => c.hL) - avg(s, back, c => c.hL));
      let aR = norm360(avg(s, fore, c => c.hR) - avg(s, back, c => c.hR));
      let a = aL;
      if (isFinite(aL) && isFinite(aR)) { if (aR - aL > 180) aR -= 360; if (aL - aR > 180) aR += 360; a = norm360((aL + aR) / 2); } else if (isFinite(aR)) a = aR;
      if (!isFinite(a)) msgs.push('No angle at ' + s + ' (needs ' + back + ' and ' + fore + ' observed from it).');
      let d = NaN;
      if (!(link && i === n - 1)) {
        const nxt = seq[(i + 1) % n];
        d = mean([avg(s, nxt, c => c.D), avg(nxt, s, c => c.D)]);
        if (!isFinite(d)) msgs.push('No distance ' + s + ' to ' + nxt + '.');
      }
      rows.push({ n: s, a: isFinite(a) ? fmtAngleField(a, S.fmt) : '', d: isFinite(d) ? d.toFixed(3) : '' });
    }
    return { rows, msgs };
  }

  const api = { DEFAULTS, norm360, norm180, num, parseAng, fmtDMS, fmtDot, fmtAngleField, mean, corr, edmTol, calc, VARS, PAIRS, verdict,
    findTriangles, triangle, traverse, buildFromTwoFace };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SurveyCore = api;
})(typeof self !== 'undefined' ? self : this);
