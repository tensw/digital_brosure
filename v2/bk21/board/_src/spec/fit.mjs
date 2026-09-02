import fs from 'fs';
const D='/Users/karis/dev/bibloai-homepage/v2/bk21/board/_src/spec/';
const PU=JSON.parse(fs.readFileSync(D+'punched.json','utf8'));
const AN=JSON.parse(fs.readFileSync(D+'answers.json','utf8')).answers;
const MAP=JSON.parse(fs.readFileSync(D+'skinmap.json','utf8')).map;
const REC=Object.fromEntries(JSON.parse(fs.readFileSync(D+'recipes.json','utf8')).recipes.map(r=>[r.id,r]));
const rows=[];
for(const [rid,v] of Object.entries(MAP)){
  const t=PU.tpl[v.skin], a=AN[rid]; if(!t||!a) continue;
  const need=(Array.isArray(a.rows[0]?.[0])?a.rows[0][0].length:1)+a.measures.length;
  rows.push({rid, skin:v.skin, mode:t.mode, slots:t.slots||0, need,
    fit: t.mode!=='rows'?null:Math.round(Math.min(need,t.slots)/Math.max(need,t.slots||1)*100),
    q:(REC[rid]?.q[0]||'').slice(0,30)});
}
const R=rows.filter(r=>r.mode==='rows');
R.sort((a,b)=>a.fit-b.fit);
console.log(`매핑 ${rows.length} · 행 치환 ${R.length} · SVG ${rows.filter(r=>r.mode==='svg').length} · 손질 ${rows.filter(r=>r.mode==='manual').length}`);
console.log(`적합도 100% ${R.filter(r=>r.fit===100).length} · 70%↑ ${R.filter(r=>r.fit>=70).length} · 50%↓ ${R.filter(r=>r.fit<50).length}`);
console.log('\n안 맞는 것 — 스킨이 요구하는 값보다 레시피가 적게 낸다');
R.filter(r=>r.fit<50).slice(0,10).forEach(r=>
 console.log(`  ${String(r.fit).padStart(3)}%  ${r.skin.padEnd(10)} 슬롯${String(r.slots).padEnd(3)} 필요${r.need}  ${r.rid.padEnd(17)} ${r.q}`));
fs.writeFileSync(D+'fit.json',JSON.stringify(rows,null,1));
