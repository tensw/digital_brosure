/* 69 레시피 × 엔진 → 결론·요점·KPI·그림 크기 점검 */
const fs = require('fs'), W = require('./widget.js');
const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const rec = J('recipes.json').recipes, ans = J('answers.json').answers, wd = J('widgets.json');
const mets = J('metrics.json').metrics, M = {}; mets.forEach(m => M[m.id] = { n: m.name, u: m.unit, d: m.direction || 'high', y: m.yearcmp, s: m.size, pc: m.pc });
const AX = {}; Object.entries(J('metrics.json').axes || {}).forEach(([k, a]) => AX[k] = a.name);
const cx = { me: '성균관대', focus: [], period: '2020-2025', M: id => M[id] || { n: id, u: '', d: 'high' }, AX, W: wd.widgets, I: wd.intents,
             R: id => ({ rec: rec.find(x => x.id === id), ans: ans[id] }) };
let bad = 0, out = [];
for (const r of rec) {
  if (r.blocked || r.needs) continue;
  const a = ans[r.id]; if (!a) { console.log('no answer', r.id); bad++; continue; }
  const o = W.build(r, a, cx);
  const flags = [];
  if (o.err) flags.push('ERR ' + o.err.slice(0, 80));
  if (!o.headline) flags.push('no-headline');
  if (o.points.length < 2 && (o.rows || []).length > 3) flags.push('points<2');   /* 행이 셋 이하면 결론·KPI·요점 한 줄로 족하다 */
  if (o.kpi.length < 2) flags.push('kpi<2');
  if (o.fig.length < 200) flags.push('fig-small');
  if (/undefined|NaN|null/.test(o.headline + o.points.join('') + JSON.stringify(o.kpi))) flags.push('undefined/NaN');
  if (flags.length) bad++;
  out.push({ id: r.id, q: r.q, intent: o.intent, widget: o.widget, headline: o.headline, points: o.points, kpi: o.kpi, lims: o.lims, caveats: o.caveats, flags, fig: o.fig.length });
  console.log(`${flags.length ? '✗' : '○'} ${r.id.padEnd(16)} ${o.widget.padEnd(10)} ${o.intent.padEnd(8)} ${o.headline}${flags.length ? '   ← ' + flags.join(', ') : ''}`);
}
fs.writeFileSync(process.env.OUT || '/dev/null', JSON.stringify(out, null, 1));
console.log(`\n문제 ${bad} / ${out.length}`);
