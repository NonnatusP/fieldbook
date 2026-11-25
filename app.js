/* Survey Field Kit - UI. Everything is local; no network calls. */
(function () {
  'use strict';
  const C = window.SurveyCore;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- storage (localStorage with in-memory fallback) ---------- */
  const mem = {}; let storeOK = true;
  function load(k, def) { try { const v = localStorage.getItem('sfk_' + k); if (v) return JSON.parse(v); } catch (e) { storeOK = false; if (k in mem) return mem[k]; } return def; }
  function save(k, v) { mem[k] = v; try { localStorage.setItem('sfk_' + k, JSON.stringify(v)); } catch (e) { storeOK = false; } }

  let S = Object.assign({}, C.DEFAULTS, load('settings', {}));
  let D = load('data', []);
  let T = Object.assign({ type: 'loop', angType: 'right', E0: '', N0: '', B0: '', E1: '', N1: '', B1: '', seq: '', ro0: '', ro1: '',
    rows: ['A', 'B', 'C', 'D'].map(n => ({ n, a: '', d: '' })), opts: { bear: true, ang: true, raw: true } }, load('trav', {}));
  let editIdx = -1, triPick = 0, freshIdx = -1;

  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2400); }
  function download(name, text, type) {
    const b = new Blob([text], { type: type || 'text/plain' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const f1 = x => isFinite(x) ? (Math.abs(x) < 0.05 ? '0.0' : x.toFixed(1)) : '-';
  const f3 = x => isFinite(x) ? x.toFixed(3) : '-';
  const chip = (cls, t) => '<span class="chip ' + cls + '">' + t + '</span>';

  /* ---------- tabs ---------- */
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + name));
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    save('tab', name); window.scrollTo(0, 0);
    if (name === 'analysis') renderAnalysis(); if (name === 'trav') renderTrav(); if (name === 'face') { renderLive(); renderList(); }
  }
  document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  /* ================= TWO-FACE ================= */
  const FIELDS = ['stn', 'pt', 'zL', 'hL', 'sL', 'dL', 'zR', 'hR', 'sR', 'dR', 'mode'];
  const formObj = () => { const o = {}; FIELDS.forEach(f => o[f] = $(f).value.trim()); return o; };
  function flagChips(c) {
    const out = [];
    const add = (k, label, val, unit) => { if (c.f[k] === null) return; out.push(chip(c.f[k] ? 'bad' : 'ok', label + ' ' + val + unit)); };
    add('sd', 'ΔSD', f1(c.sdDiff), ' mm'); add('hd', 'ΔHD', f1(c.hdDiff), ' mm');
    add('idx', 'Index', f1(c.idx), '″'); add('c2', '2C', f1(c.c2), '″');
    if (isFinite(c.hdChk)) out.push(chip('warn', 'HD differs from SD·sin Z by ' + f1(c.hdChk) + ' mm'));
    return out.join('') || chip('na', 'not enough data');
  }
  function setDelta(id, val, unit, flag) {
    const el = $(id); el.textContent = isFinite(val) ? (val > 0.05 ? '+' : '') + f1(val) + unit : '\u2013';
    el.className = 'delta' + (flag === true ? ' bad' : flag === false ? ' ok' : '');
  }
  function renderLive() {
    const o = formObj(), c = C.calc(o, S);
    setDelta('dIdx', c.idx, '\u2033', c.f.idx); setDelta('dC2', c.c2, '\u2033', c.f.c2);
    setDelta('dSD', c.sdDiff, ' mm', c.f.sd); setDelta('dHD', c.hdDiff, ' mm', c.f.hd);
    $('fmtHint').textContent = S.fmt === 'dms' ? 'Angles as DD.MMSS, e.g. 90.0030 means 90°00\'30". Face-right zenith is about 360 minus face-left.' : 'Angles in decimal degrees.';
    const any = ['zL', 'hL', 'sL', 'dL', 'zR', 'hR', 'sR', 'dR'].some(f => o[f]);
    if (!any) { $('live').innerHTML = '<span class="small">Enter both faces to see index error, 2C and face differences.</span>'; return; }
    let h = '';
    if (isFinite(c.hdChk)) h += chip('warn', 'HD differs from SD\u00b7sin Z by ' + f1(c.hdChk) + ' mm') + ' ';
    if (isFinite(c.tol)) h += '<span class="small">Face difference allowed \u00b1' + c.tol.toFixed(1) + ' mm at ' + c.D.toFixed(1) + ' m (' + (c.mode === 'R' ? 'reflectorless' : 'prism') + '). Red means over a limit.</span>';
    $('live').innerHTML = h;
  }
  function renderList() {
    $('count').textContent = D.length;
    if (!D.length) { $('list').innerHTML = '<div class="card small">No readings yet. Add one above, or import a file in Settings.</div>'; return; }
    const fi = freshIdx; freshIdx = -1;
    $('list').innerHTML = D.map((o, i) => {
      const c = C.calc(o, S);
      return '<div class="item ' + c.status + (i === fi ? ' fresh' : '') + '"><div class="top"><div data-edit="' + i + '" style="flex:1"><b>' + esc(o.stn) + ' → ' + esc(o.pt) + '</b> <span class="meta">' +
        (isFinite(c.D) ? c.D.toFixed(3) + ' m' : '') + (o.mode === 'R' ? ' · RL' : '') + '</span><div>' + flagChips(c) + '</div></div><button class="x" data-del="' + i + '" aria-label="Delete">✕</button></div></div>';
    }).reverse().join('');
  }
  function clearForm() { FIELDS.forEach(f => { if (f !== 'mode') $(f).value = ''; }); editIdx = -1; $('add').textContent = 'Add reading'; renderLive(); }
  $('add').addEventListener('click', () => {
    const o = formObj();
    if (!o.stn || !o.pt) { toast('Enter station and point'); return; }
    if (editIdx >= 0) { D[editIdx] = o; freshIdx = editIdx; } else { D.push(o); freshIdx = D.length - 1; }
    save('data', D); const keepStn = o.stn;
    clearForm(); $('stn').value = keepStn; renderList(); toast(editIdx >= 0 ? 'Updated' : 'Added');
    $('pt').focus();
  });
  $('clear').addEventListener('click', clearForm);
  FIELDS.forEach(f => $(f).addEventListener('input', renderLive));
  $('list').addEventListener('click', e => {
    const del = e.target.closest('[data-del]'), ed = e.target.closest('[data-edit]');
    if (del) { const i = +del.dataset.del; if (confirm('Delete reading ' + D[i].stn + ' → ' + D[i].pt + '?')) { D.splice(i, 1); save('data', D); renderList(); } }
    else if (ed) { const i = +ed.dataset.edit; FIELDS.forEach(f => $(f).value = D[i][f] || (f === 'mode' ? 'P' : '')); editIdx = i; $('add').textContent = 'Save changes'; renderLive(); window.scrollTo(0, 0); }
  });

  /* ================= ANALYSIS ================= */
  function renderAnalysis() {
    const rows = D.map(o => C.calc(o, S));
    $('verdict').innerHTML = C.verdict(rows, S).map(v => '<div class="vline"><span class="dot ' + v[0] + '"></span><span>' + esc(v[1]) + '</span></div>').join('');
    // triangles
    const tris = C.findTriangles(D);
    if (!tris.length) $('tri').innerHTML = '<p class="small">No closed triangle found. It needs three points, each observed from the other two.</p>';
    else {
      if (triPick >= tris.length) triPick = 0;
      const t = C.triangle(D, S, tris[triPick]);
      let h = tris.length > 1 ? '<select id="triSel">' + tris.map((x, i) => '<option value="' + i + '"' + (i === triPick ? ' selected' : '') + '>' + x.join(', ') + '</option>').join('') + '</select>' : '';
      const cls = t.status === 'ok' ? 'ok' : t.status === 'bad' ? 'bad' : 'na';
      h += '<p>' + chip(cls, t.status === 'ok' ? 'Closes' : t.status === 'bad' ? 'Does not close' : 'Incomplete data') + (t.fails.length ? ' <span class="small">Check: ' + esc(t.fails.join(', ')) + '</span>' : '') + '</p>';
      h += '<div class="scroll"><table><tr><th>Angle at</th><th>Value</th></tr>' + t.angles.map(a => '<tr><td>' + esc(a.at) + '</td><td>' + C.fmtDMS(a.v, 0) + '</td></tr>').join('') +
        '<tr><td>Sum</td><td>' + C.fmtDMS(t.sum, 0) + '</td></tr></table></div>';
      h += '<div class="kv"><span>Angle misclosure</span><span>' + f1(t.mis) + '″ (limit ±' + t.allow.toFixed(0) + '″)</span></div>';
      h += '<div class="scroll"><table><tr><th>Side</th><th>Mean</th><th>Recip. diff</th><th>Tol</th></tr>' + t.sides.map(s => '<tr><td>' + esc(s.p + '-' + s.q) + '</td><td>' + f3(s.v) + '</td><td>' + f1(s.recip) + ' mm</td><td>±' + f1(s.tol) + '</td></tr>').join('') + '</table></div>';
      h += '<div class="scroll"><table><tr><th>Side from other two</th><th>Measured</th><th>Computed</th><th>Diff</th></tr>' + t.cos.map(c => '<tr><td>' + esc(c.side) + '</td><td>' + f3(c.measured) + '</td><td>' + f3(c.computed) + '</td><td>' + f1(c.diff) + ' mm</td></tr>').join('') + '</table></div>';
      if (t.pyth) h += '<div class="kv"><span>Pythagoras at ' + esc(t.pyth.at) + '</span><span>' + f1(t.pyth.diff) + ' mm (±' + f1(t.pyth.tol) + ')</span></div>';
      h += '<p class="small">Limits are approximate 2σ values from the settings, not a standard.</p>';
      $('tri').innerHTML = h;
      const sel = $('triSel'); if (sel) sel.addEventListener('change', () => { triPick = +sel.value; renderAnalysis(); });
    }
    drawScatter(rows);
  }
  function fillVarSelects() {
    const opts = Object.keys(C.VARS).map(k => '<option value="' + k + '">' + C.VARS[k].label + '</option>').join('');
    $('vx').innerHTML = opts; $('vy').innerHTML = opts; $('vx').value = 'hd'; $('vy').value = 'hdd';
    $('vx').addEventListener('change', () => drawScatter()); $('vy').addEventListener('change', () => drawScatter());
  }
  function drawScatter(rows) {
    rows = rows || D.map(o => C.calc(o, S));
    const cv = $('plot'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
    const cs = getComputedStyle(document.documentElement);
    const ink = cs.getPropertyValue('--ink').trim() || '#000', mute = cs.getPropertyValue('--mute').trim() || '#666', pri = cs.getPropertyValue('--pri').trim() || '#06c', line = cs.getPropertyValue('--line').trim() || '#ccc';
    g.clearRect(0, 0, W, H);
    const X = C.VARS[$('vx').value], Y = C.VARS[$('vy').value];
    const pts = rows.map(c => [X.get(c), Y.get(c)]).filter(p => isFinite(p[0]) && isFinite(p[1]));
    g.font = '20px system-ui,sans-serif'; g.fillStyle = mute; g.strokeStyle = line;
    if (pts.length < 2) { g.fillText('Need at least 2 readings with both values.', 20, 40); $('plotInfo').textContent = ''; return; }
    const ext = a => { let lo = Math.min(...a), hi = Math.max(...a); if (lo === hi) { lo -= 1; hi += 1; } const p = (hi - lo) * 0.08; return [lo - p, hi + p]; };
    const [x0, x1] = ext(pts.map(p => p[0])), [y0, y1] = ext(pts.map(p => p[1]));
    const L = 78, R = 16, Tp = 14, B = 52, pw = W - L - R, ph = H - Tp - B;
    const px = v => L + (v - x0) / (x1 - x0) * pw, py = v => Tp + ph - (v - y0) / (y1 - y0) * ph;
    for (let i = 0; i <= 4; i++) {
      const xv = x0 + (x1 - x0) * i / 4, yv = y0 + (y1 - y0) * i / 4;
      g.beginPath(); g.moveTo(px(xv), Tp); g.lineTo(px(xv), Tp + ph); g.moveTo(L, py(yv)); g.lineTo(L + pw, py(yv)); g.stroke();
      g.fillStyle = mute; g.textAlign = 'center'; g.fillText(+xv.toPrecision(3), px(xv), H - 28);
      g.textAlign = 'right'; g.fillText(+yv.toPrecision(3), L - 8, py(yv) + 6);
    }
    if (y0 < 0 && y1 > 0) { g.strokeStyle = mute; g.beginPath(); g.moveTo(L, py(0)); g.lineTo(L + pw, py(0)); g.stroke(); }
    g.textAlign = 'center'; g.fillStyle = ink; g.fillText(X.label, L + pw / 2, H - 6);
    g.save(); g.translate(18, Tp + ph / 2); g.rotate(-Math.PI / 2); g.fillText(Y.label, 0, 0); g.restore();
    g.fillStyle = pri; pts.forEach(p => { g.beginPath(); g.arc(px(p[0]), py(p[1]), 6, 0, 7); g.fill(); });
    const r = C.corr(pts.map(p => p[0]), pts.map(p => p[1]));
    $('plotInfo').textContent = pts.length + ' points' + (isFinite(r.r) ? ', r = ' + r.r.toFixed(2) : '') + '.';
  }

  /* ================= TRAVERSE ================= */
  let lastResult = null;
  const saveT = () => save('trav', T);
  function renderTravInputs() {
    $('tType').value = T.type; $('tAng').value = T.angType;
    ['E0', 'N0', 'E1', 'N1'].forEach(k => $('t' + k).value = T[k]); $('tB0').value = T.B0; $('tB1').value = T.B1;
    $('tSeq').value = T.seq; $('tRO0').value = T.ro0; $('tRO1').value = T.ro1;
    const link = T.type === 'link';
    $('linkBox').classList.toggle('hide', !link); $('roBox').classList.toggle('hide', !link);
    $('lB0').textContent = link ? 'Bearing in to first stn' : 'First line bearing';
    $('tRows').innerHTML = T.rows.map((r, i) => '<div class="tgrid"><input data-r="' + i + '" data-f="n" value="' + esc(r.n) + '" autocapitalize="characters" autocomplete="off">' +
      '<input data-r="' + i + '" data-f="a" value="' + esc(r.a) + '" inputmode="decimal" autocomplete="off">' +
      '<input data-r="' + i + '" data-f="d" value="' + esc(r.d) + '" inputmode="decimal" autocomplete="off"' + (link && i === T.rows.length - 1 ? ' disabled placeholder="end"' : '') + '></div>').join('');
    $('hDist').textContent = link ? 'HD to next (m)' : 'HD to next (m, last returns to first)';
  }
  function renderTrav() {
    renderTravInputs(); computeTrav();
  }
  function computeTrav() {
    const r = C.traverse({ type: T.type, angType: T.angType, fmt: S.fmt, k: S.k, sf: S.sf, E0: T.E0, N0: T.N0, brg0: T.B0, E1: T.E1, N1: T.N1, brgOut: T.B1, rows: T.rows });
    lastResult = r.error ? null : r;
    if (r.error) { $('tOut').innerHTML = '<div class="err">' + esc(r.error) + '</div>'; return; }
    let h = '<div class="card"><h3>Closure</h3>';
    h += '<div class="kv"><span>Angular misclosure</span><span>' + f1(r.angMisSec) + '″ ' + chip(r.angOK ? 'ok' : 'bad', r.angOK ? 'within' : 'over') + ' limit ±' + r.allow.toFixed(1) + '″</span></div>';
    if (!r.link) h += '<div class="kv"><span>Loop direction detected</span><span>' + r.dir + '</span></div>';
    h += '<div class="kv"><span>Misclosure ΔN / ΔE</span><span>' + f3(r.eN) + ' / ' + f3(r.eE) + ' m</span></div>';
    h += '<div class="kv"><span>Linear misclosure</span><span>' + f3(r.e) + ' m</span></div>';
    h += '<div class="kv"><span>Total length</span><span>' + r.sumD.toFixed(3) + ' m</span></div>';
    h += '<div class="kv"><span>Precision</span><span><b>' + (isFinite(r.precision) ? '1 : ' + Math.round(r.precision).toLocaleString('en') : 'exact') + '</b></span></div>';
    if (!r.angOK) h += '<p class="small">Angular misclosure is over the limit. Re-observe before relying on the adjustment.</p>';
    h += '</div>';
    h += '<div class="card"><h3>Sketch</h3><div class="btns" style="margin-top:0">' +
      ['bear:Bearings', 'ang:Angles', 'raw:Unadjusted'].map(s => { const [k, l] = s.split(':'); return '<label style="display:flex;gap:6px;align-items:center;margin:0 10px 0 0;font-size:14px;color:var(--ink)"><input type="checkbox" style="width:22px;min-height:22px" data-opt="' + k + '"' + (T.opts[k] ? ' checked' : '') + '>' + l + '</label>'; }).join('') +
      '</div><div id="sketch" class="scroll" style="margin-top:8px">' + sketchSVG(r, T.opts) + '</div>' +
      '<div class="btns"><button id="svgPng" class="sec">Save PNG</button><button id="svgSvg" class="sec">Save SVG</button></div></div>';
    h += '<div class="card"><h3>Adjusted coordinates</h3><div class="scroll"><table><tr><th>Stn</th><th>Easting</th><th>Northing</th></tr>' +
      r.coords.map((c, i) => '<tr><td>' + esc(c.n) + (!r.link && i === r.coords.length - 1 ? ' (closing)' : '') + '</td><td>' + c.E.toFixed(3) + '</td><td>' + c.N.toFixed(3) + '</td></tr>').join('') + '</table></div></div>';
    h += '<div class="card"><h3>Legs</h3><div class="scroll"><table><tr><th>Leg</th><th>Bearing</th><th>HD</th><th>ΔN</th><th>ΔE</th><th>corr N</th><th>corr E</th><th>adj ΔN</th><th>adj ΔE</th></tr>' +
      r.legs.map(l => '<tr><td>' + esc(l.from + '-' + l.to) + '</td><td>' + C.fmtDMS(l.bearing, 0) + '</td><td>' + l.hd.toFixed(3) + '</td><td>' + f3(l.dN) + '</td><td>' + f3(l.dE) + '</td><td>' + f3(l.cN) + '</td><td>' + f3(l.cE) + '</td><td>' + f3(l.aN) + '</td><td>' + f3(l.aE) + '</td></tr>').join('') + '</table></div></div>';
    h += '<div class="card"><h3>Angles</h3><div class="scroll"><table><tr><th>Stn</th><th>Observed</th><th>Corr</th><th>Adjusted</th></tr>' +
      r.angles.map(a => '<tr><td>' + esc(a.n) + '</td><td>' + C.fmtDMS(a.obs, 1) + '</td><td>' + f1(a.corr) + '″</td><td>' + C.fmtDMS(a.adj, 1) + '</td></tr>').join('') + '</table></div>' +
      '<div class="btns"><button id="tCsv" class="sec">Export results CSV</button></div></div>';
    $('tOut').innerHTML = h;
  }

  /* ---------- sketch ---------- */
  function sketchSVG(r, o) {
    const Wd = 720, Ht = 720, M = 100, link = r.link;
    const all = r.coords.concat(o.raw ? r.coordsU : []);
    const minE = Math.min(...all.map(p => p.E)), maxE = Math.max(...all.map(p => p.E)), minN = Math.min(...all.map(p => p.N)), maxN = Math.max(...all.map(p => p.N));
    const span = Math.max(maxE - minE, maxN - minN, 1e-6), sc = (Wd - 2 * M) / span;
    const offX = (Wd - 2 * M - (maxE - minE) * sc) / 2, offY = (Ht - 2 * M - (maxN - minN) * sc) / 2;
    const X = e => M + offX + (e - minE) * sc, Y = n => Ht - M - offY - (n - minN) * sc;
    const P = r.coords.map(p => [X(p.E), Y(p.N)]), Q = r.coordsU.map(p => [X(p.E), Y(p.N)]);
    const uniq = link ? P : P.slice(0, -1);
    const cx = uniq.reduce((s, p) => s + p[0], 0) / uniq.length, cy = uniq.reduce((s, p) => s + p[1], 0) / uniq.length;
    let s = '<svg xmlns="http://www.w3.org/2000/svg" id="svg" viewBox="0 0 ' + Wd + ' ' + Ht + '" width="' + Wd + '" height="' + Ht + '" style="max-width:100%;height:auto;background:#fff;border:1px solid #ccd;border-radius:8px" font-family="Arial,Helvetica,sans-serif">';
    s += '<rect width="100%" height="100%" fill="#fff"/>';
    s += '<text x="16" y="32" font-size="24" font-weight="bold" fill="#0f3d5e">Traverse sketch' + (S.inst ? ' - ' + esc(S.inst) : '') + '</text>';
    s += '<text x="16" y="60" font-size="19" fill="#333">Precision ' + (isFinite(r.precision) ? '1:' + Math.round(r.precision).toLocaleString('en') : 'exact') + ' | closing error ' + r.e.toFixed(3) + ' m</text>';
    s += '<text x="16" y="84" font-size="19" fill="#333">Angular misclosure ' + f1(r.angMisSec) + '\u2033 | ' + (link ? 'closed link' : 'closed loop') + ', Bowditch</text>';
    // unadjusted
    if (o.raw) {
      s += '<polyline points="' + Q.map(p => p.join(',')).join(' ') + '" fill="none" stroke="#c0392b" stroke-width="2.5" stroke-dasharray="9 6"/>';
      const e = Q[Q.length - 1]; s += '<path d="M' + (e[0] - 9) + ',' + (e[1] - 9) + 'L' + (e[0] + 9) + ',' + (e[1] + 9) + 'M' + (e[0] + 9) + ',' + (e[1] - 9) + 'L' + (e[0] - 9) + ',' + (e[1] + 9) + '" stroke="#c0392b" stroke-width="3"/>';
    }
    // adjusted legs + labels
    s += '<polyline points="' + P.map(p => p.join(',')).join(' ') + '" fill="none" stroke="#0f3d5e" stroke-width="4" stroke-linejoin="round"/>';
    r.legs.forEach((l, i) => {
      const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      if (len < 1) return;
      let ang = Math.atan2(dy, dx) * 180 / Math.PI; if (ang > 90 || ang < -90) ang += 180;
      let nx = -dy / len, ny = dx / len; const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
      const off = 22;
      s += '<text transform="translate(' + (mx + nx * off) + ',' + (my + ny * off) + ') rotate(' + ang.toFixed(1) + ')" text-anchor="middle" font-size="20" fill="#111">' + l.hd.toFixed(3) + ' m</text>';
      if (o.bear) s += '<text transform="translate(' + (mx + nx * (off + 22)) + ',' + (my + ny * (off + 22)) + ') rotate(' + ang.toFixed(1) + ')" text-anchor="middle" font-size="17" fill="#555">' + C.fmtDMS(l.bearing, 0) + '</text>';
    });
    // stations + angles
    const n = r.n;
    r.coords.forEach((c, i) => {
      if (!link && i === r.coords.length - 1) return;
      const p = P[i]; let ux = p[0] - cx, uy = p[1] - cy; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
      const known = link && (i === 0 || i === n - 1);
      s += known ? '<path d="M' + p[0] + ',' + (p[1] - 14) + 'L' + (p[0] + 12) + ',' + (p[1] + 9) + 'L' + (p[0] - 12) + ',' + (p[1] + 9) + 'Z" fill="#e67e22" stroke="#fff" stroke-width="1.5"/>' :
        '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (!link && i === 0 ? 11 : 9) + '" fill="' + (!link && i === 0 ? '#e67e22' : '#0f3d5e') + '" stroke="#fff" stroke-width="1.5"/>';
      const lx = p[0] + ux * 40, ly = p[1] + uy * 40;
      s += '<text x="' + lx + '" y="' + (ly + 9) + '" text-anchor="middle" font-size="28" font-weight="bold" fill="#0f3d5e">' + esc(c.n) + '</text>';
      if (o.ang && r.angles[i] && !(link && (i === 0 || i === n - 1))) s += '<text x="' + (p[0] - ux * 12 + (ux < -0.3 ? 12 : ux > 0.3 ? -12 : 0)) + '" y="' + (p[1] - uy * 44 + 6) + '" text-anchor="' + (ux < -0.3 ? 'start' : ux > 0.3 ? 'end' : 'middle') + '" font-size="17" fill="#1b7f3b">∠' + C.fmtDMS(r.angles[i].adj, 0) + '</text>';
    });
    // north arrow
    s += '<g transform="translate(' + (Wd - 44) + ',60)"><path d="M0,-34L12,10L0,0L-12,10Z" fill="#222"/><text y="36" text-anchor="middle" font-size="22" font-weight="bold">N</text></g>';
    // scale bar
    const target = (Wd - 2 * M) * 0.25 / sc, pow = Math.pow(10, Math.floor(Math.log10(target)));
    const nice = [1, 2, 5, 10].map(m => m * pow).filter(v => v <= target).pop() || pow, bw = nice * sc;
    s += '<g transform="translate(' + M + ',' + (Ht - 34) + ')"><path d="M0,0H' + bw + 'M0,-5V5M' + bw + ',-5V5" stroke="#222" stroke-width="3"/><text x="' + bw / 2 + '" y="-12" text-anchor="middle" font-size="19">' + nice + ' m</text></g>';
    // legend
    s += '<g font-size="17" fill="#444" transform="translate(' + (Wd - 270) + ',' + (Ht - 70) + ')"><line x1="0" y1="0" x2="34" y2="0" stroke="#0f3d5e" stroke-width="4"/><text x="42" y="6">adjusted</text>' +
      (o.raw ? '<line x1="0" y1="18" x2="26" y2="18" stroke="#c0392b" stroke-width="2.5" stroke-dasharray="9 6"/><text x="32" y="22">unadjusted (x = end)</text>' : '') + '</g>';
    return s + '</svg>';
  }
  function svgText() { const el = $('svg'); return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(el); }
  function savePng() {
    const txt = svgText(), img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = 1440; cv.height = 1440; const g = cv.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, 1440, 1440); g.drawImage(img, 0, 0, 1440, 1440);
      cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'traverse_sketch.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }, 'image/png');
    };
    img.onerror = () => toast('Could not make PNG. Use Save SVG.');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt);
  }
  function resultsCsv(r) {
    const q = v => '"' + String(v).replace(/"/g, '""') + '"', L = [];
    L.push('Traverse results' + (S.inst ? ',' + q(S.inst) : ''));
    L.push('Type,' + (r.link ? 'closed link' : 'closed loop') + ',Angular misclosure (sec),' + r.angMisSec.toFixed(1) + ',Linear misclosure (m),' + r.e.toFixed(4) + ',Precision,1:' + Math.round(r.precision));
    L.push(''); L.push('Station,Easting,Northing'); r.coords.forEach(c => L.push([q(c.n), c.E.toFixed(3), c.N.toFixed(3)].join(',')));
    L.push(''); L.push('Leg,Bearing,HD,dN,dE,corrN,corrE,adjdN,adjdE');
    r.legs.forEach(l => L.push([q(l.from + '-' + l.to), q(C.fmtDMS(l.bearing, 0)), l.hd.toFixed(3), l.dN.toFixed(4), l.dE.toFixed(4), l.cN.toFixed(4), l.cE.toFixed(4), l.aN.toFixed(4), l.aE.toFixed(4)].join(',')));
    L.push(''); L.push('Station,Observed,Correction (sec),Adjusted'); r.angles.forEach(a => L.push([q(a.n), q(C.fmtDMS(a.obs, 1)), a.corr.toFixed(1), q(C.fmtDMS(a.adj, 1))].join(',')));
    return L.join('\r\n') + '\r\n';
  }
  // traverse events
  const bind = (id, key) => $(id).addEventListener('input', () => { T[key] = $(id).value; saveT(); computeTrav(); });
  [['tE0', 'E0'], ['tN0', 'N0'], ['tB0', 'B0'], ['tE1', 'E1'], ['tN1', 'N1'], ['tB1', 'B1'], ['tSeq', 'seq'], ['tRO0', 'ro0'], ['tRO1', 'ro1']].forEach(a => bind(a[0], a[1]));
  $('tType').addEventListener('change', () => { T.type = $('tType').value; saveT(); renderTrav(); });
  $('tAng').addEventListener('change', () => { T.angType = $('tAng').value; saveT(); computeTrav(); });
  $('tRows').addEventListener('input', e => { const t = e.target; if (t.dataset.r == null) return; T.rows[+t.dataset.r][t.dataset.f] = t.value; saveT(); computeTrav(); });
  $('tAddRow').addEventListener('click', () => { T.rows.push({ n: String.fromCharCode(65 + T.rows.length % 26), a: '', d: '' }); saveT(); renderTrav(); });
  $('tDelRow').addEventListener('click', () => { if (T.rows.length > 2) { T.rows.pop(); saveT(); renderTrav(); } });
  $('tFill').addEventListener('click', () => {
    const seq = T.seq.split(/[\s,]+/).map(x => x.trim()).filter(Boolean);
    if (seq.length < 2) { $('tFillMsg').textContent = 'Enter the station names in order, e.g. A, B, C, D.'; return; }
    if (T.type === 'link' && (!T.ro0 || !T.ro1)) { $('tFillMsg').textContent = 'Enter the backsight and foresight RO names.'; return; }
    const res = C.buildFromTwoFace(D, S, seq, T.type, T.ro0.trim(), T.ro1.trim());
    T.rows = res.rows; if (T.angType === 'intcw' || T.angType === 'intacw') T.angType = 'right';
    $('tFillMsg').textContent = res.msgs.length ? res.msgs.join(' ') : 'Filled ' + res.rows.length + ' stations from the two-face readings. Angles are clockwise from backsight to foresight. Enter the start coordinates and bearing.';
    saveT(); renderTravInputs(); computeTrav();
  });
  $('tOut').addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.opt; if (k) { T.opts[k] = e.target.checked; saveT(); if (lastResult) $('sketch').innerHTML = sketchSVG(lastResult, T.opts); } });
  $('tOut').addEventListener('click', e => {
    if (e.target.id === 'svgPng') savePng();
    else if (e.target.id === 'svgSvg') download('traverse_sketch.svg', svgText(), 'image/svg+xml');
    else if (e.target.id === 'tCsv' && lastResult) download('traverse_results.csv', resultsCsv(lastResult), 'text/csv');
  });

  /* ================= SETTINGS / DATA ================= */
  function setHdr() { $('hdrInst').textContent = S.inst || 'Total station tools'; }
  function renderSettings() {
    setHdr();
    document.querySelectorAll('[data-k]').forEach(el => { el.value = S[el.dataset.k]; });
    $('storeNote').textContent = storeOK ? 'Stored on this device.' : 'Browser storage is blocked here. Data lasts only until you close the page. Export often.';
  }
  document.querySelectorAll('[data-k]').forEach(el => el.addEventListener('input', () => {
    const k = el.dataset.k; const v = (k === 'inst' || k === 'fmt') ? el.value : parseFloat(el.value);
    if (k === 'inst' || k === 'fmt' || isFinite(v)) S[k] = v; save('settings', S); setHdr(); renderLive(); renderList(); if (k === 'fmt') $('fmtHint').textContent = '';
  }));
  $('preset').addEventListener('click', () => {
    Object.assign(S, { a: 2, b: 2, ar: 3, br: 2, idx: 2, c2: 8, ang: 2 }); if (!S.inst) S.inst = 'South NTS-571R15';
    save('settings', S); renderSettings(); toast('NTS-500 series values applied');
  });
  const HEAD = ['Station', 'Point', 'Zenith L', 'HA L', 'SD L', 'HD L', 'Zenith R', 'HA R', 'SD R', 'HD R', 'Target', 'SD diff L-R (mm)', 'HD diff L-R (mm)', 'Index (sec)', '2C (sec)'];
  $('expCsv').addEventListener('click', () => {
    if (!D.length) { toast('No readings to export'); return; }
    const q = v => /[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : v;
    const lines = [HEAD.join(',')].concat(D.map(o => { const c = C.calc(o, S);
      return FIELDS.slice(0, 10).map(f => q(o[f] || '')).concat([o.mode === 'R' ? 'Reflectorless' : 'Prism', f1(c.sdDiff), f1(c.hdDiff), f1(c.idx), f1(c.c2)].map(x => x === '-' ? '' : x)).join(','); }));
    download('two_face_readings.csv', lines.join('\r\n') + '\r\n', 'text/csv');
  });
  $('expJson').addEventListener('click', () => download('survey_field_kit_backup.json', JSON.stringify({ app: 'survey-field-kit', settings: S, readings: D, traverse: T }, null, 1), 'application/json'));
  $('impBtn').addEventListener('click', () => $('impFile').click());
  $('impFile').addEventListener('change', () => {
    const f = $('impFile').files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const txt = String(rd.result); let added = 0;
        if (/\.json$/i.test(f.name) || txt.trim()[0] === '{') {
          const j = JSON.parse(txt);
          if (j.readings) { D = D.concat(j.readings); added = j.readings.length; }
          if (j.settings) S = Object.assign({}, S, j.settings);
          if (j.traverse && confirm('Replace the traverse inputs with the ones in this backup?')) T = Object.assign(T, j.traverse);
          save('settings', S); save('trav', T);
        } else {
          txt.split(/\r?\n/).forEach((line, i) => {
            if (!line.trim()) return;
            const p = line.split(/,|\t/).map(x => x.trim().replace(/^"|"$/g, ''));
            if (i === 0 && (/station/i.test(p[0]) || /point/i.test(p[1] || ''))) return;
            if (p.length < 4) return;
            const o = {}; FIELDS.slice(0, 10).forEach((k, j) => o[k] = p[j] || ''); o.mode = /^r/i.test(p[10] || '') ? 'R' : 'P'; D.push(o); added++;
          });
        }
        save('data', D); renderSettings(); renderList(); toast('Imported ' + added + ' readings');
      } catch (e) { toast('Could not read that file'); }
      $('impFile').value = '';
    };
    rd.readAsText(f);
  });
  $('clrAll').addEventListener('click', () => { if (D.length && confirm('Delete all ' + D.length + ' readings? Export first if you need them.')) { D = []; save('data', D); renderList(); toast('Cleared'); } });

  /* ================= install to home screen ================= */
  let deferred = null;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function installUI() {
    const btn = $('installBtn'), hint = $('installHint');
    if (standalone()) { btn.classList.add('hide'); hint.textContent = 'Installed. You are using the home-screen app.'; return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (deferred) { btn.classList.remove('hide'); hint.textContent = 'Install it once, then it opens like an app and works with no signal.'; }
    else { btn.classList.add('hide'); hint.textContent = ios ? 'On iPhone, open this page in Safari, tap Share, then Add to Home Screen.' : 'Open this page in Chrome, tap the three-dot menu, then choose Install app (or Add to Home screen). If you do not see it, wait for "Works offline" at the top and try again.'; }
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; installUI(); });
  window.addEventListener('appinstalled', () => { deferred = null; installUI(); toast('Installed'); });
  $('installBtn').addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch (e) {} deferred = null; installUI(); });

  /* ================= start-up ================= */
  installUI();
  fillVarSelects(); renderSettings(); clearForm(); renderList();
  showTab(load('tab', 'face'));
  const off = $('offline');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => { off.textContent = 'Works offline'; off.classList.add('on'); }).catch(() => { off.textContent = 'Online only'; });
  } else off.textContent = 'Online only';
  window.addEventListener('online', () => toast('Back online')); window.addEventListener('offline', () => toast('Offline. Everything still works.'));
})();
