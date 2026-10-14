
const nodes=document.getElementById('nodes'),details=document.getElementById('details'),search=document.getElementById('search');
let people=[],families=[],byId=new Map(),parents=new Map(),children=new Map(),selected=null,mode='ancestors',generations=4,scale=1,expanded=new Set();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uniq=a=>[...new Set(a)].filter(id=>byId.has(id));
const date=p=>[p.birth?.date,p.death?.date].filter(Boolean).join(' – ')||(p.deceased?'Deceased':'Dates not recorded');
const related=id=>({parents:uniq(parents.get(id)||[]),children:uniq(children.get(id)||[]),partners:uniq(families.filter(f=>(f.parents||[]).includes(id)).flatMap(f=>(f.parents||[]).filter(x=>x!==id)))});

const css=document.createElement('style');
css.textContent=`
.workspace{grid-template-columns:minmax(0,1fr) 290px}
.nodes{display:block!important;padding:0!important;overflow:hidden!important;min-height:570px;position:relative}
.tree-toolbar{display:flex;gap:7px;align-items:center;flex-wrap:wrap;padding:12px;background:#15271f;border-bottom:1px solid #435444}
.tree-toolbar button,.tree-toolbar select,.tree-zoom button{background:#273e32;color:#f5f0e4;border:1px solid #67735a;border-radius:6px;padding:9px 11px;cursor:pointer}
.tree-toolbar button.active{background:#c4a66e;color:#12251c}
.tree-toolbar label{display:flex;gap:7px;align-items:center}
.tree-toolbar select{padding:8px}
.tree-viewport{height:530px;overflow:auto;position:relative;touch-action:pan-x pan-y;background:radial-gradient(ellipse at center,#234032 0%,#13251d 78%)}
.tree-stage{position:relative;transform-origin:top left;margin:35px auto}
.tree-links{position:absolute;inset:0;overflow:visible;pointer-events:none}
.tree-links path{stroke:#bda16c;stroke-width:2;fill:none;opacity:.85}
.tree-card{position:absolute;width:188px;min-height:76px;border:1px solid #748066;border-radius:9px;background:#203b2e;color:#f5f0e7;box-shadow:0 5px 16px #0005;text-align:left;padding:12px 12px 10px;cursor:pointer}
.tree-card.selected{border:2px solid #e4bd74;background:#345541;box-shadow:0 0 0 3px #c3a66d22}
.tree-card .name{display:block;font-size:13px;font-weight:700;line-height:1.3}
.tree-card .dates{display:block;color:#c3b88f;font-size:11px;margin-top:7px}
.tree-card .expand{position:absolute;right:-11px;top:25px;background:#c4a66e;color:#10241b;border:1px solid #e4cc93;border-radius:50%;width:23px;height:23px;display:grid;place-items:center;font-weight:700}
.tree-zoom{position:absolute;bottom:14px;left:14px;display:flex;gap:5px;background:#10241bde;padding:6px;border-radius:8px}
.tree-note{padding:10px 14px;color:#b9c4b8;font-size:12px}
.relative{display:inline-block;background:#294537;color:#f3ead7;border:1px solid #6c785e;border-radius:5px;padding:7px;margin:3px;cursor:pointer;font-size:12px}
aside dl{grid-template-columns:76px 1fr}
aside dd{overflow-wrap:anywhere}
@media(max-width:850px){
.workspace{grid-template-columns:1fr}
.tree-viewport{height:510px}
.tree-toolbar{gap:5px}
.tree-toolbar button{padding:8px}
.nodes{min-height:0}
}
`;
document.head.append(css);

function profile(id){
const p=byId.get(id);
if(!p)return;
selected=id;
const r=related(id);
const links=ids=>ids.length?ids.map(x=>`<button class="relative" data-relative="${esc(x)}">${esc(byId.get(x).name)}</button>`).join(''):'<span class="muted">Not recorded</span>';
details.innerHTML=`<span class="status">${p.deceased?'Deceased':'Death not recorded'}</span><h3>${esc(p.name)}</h3><p>${esc(date(p))}</p><dl><dt>Born</dt><dd>${esc(p.birth?.place||'Not recorded')}</dd><dt>Died</dt><dd>${esc(p.death?.place||'Not recorded')}</dd><dt>Parents</dt><dd>${links(r.parents)}</dd><dt>Partners</dt><dd>${links(r.partners)}</dd><dt>Children</dt><dd>${links(r.children)}</dd></dl><p class="muted">Information reflects imported family records and may require verification.</p>`;
details.querySelectorAll('[data-relative]').forEach(b=>b.onclick=()=>focus(b.dataset.relative));
}

function focus(id){
selected=id;
expanded=new Set([id]);
search.value='';
profile(id);
render();
}

function build(){
if(!selected)return {levels:[],edges:[]};
const levels=[[selected]],edges=[],seen=new Set([selected]);
for(let i=1;i<generations;i++){
const next=[];
for(const id of levels[i-1]){
if(!expanded.has(id))continue;
const rel=related(id)[mode];
for(const x of rel){
if(seen.has(x))continue;
seen.add(x);
next.push(x);
edges.push([id,x]);
}
}
if(!next.length)break;
levels.push(next);
}
return {levels,edges};
}

function render(){
const q=search.value.trim().toLowerCase();
if(q){
const matches=people.filter(p=>[p.name,p.birth?.date,p.birth?.place,p.death?.date].join(' ').toLowerCase().includes(q)).slice(0,60);
nodes.innerHTML=`<div class="tree-toolbar"><button id="clearSearch">Back to tree</button><span class="muted">${matches.length} matching records (up to 60)</span></div><div style="padding:15px;max-height:520px;overflow:auto">${matches.map(p=>`<button class="relative" data-result="${esc(p.id)}">${esc(p.name)} · ${esc(date(p))}</button>`).join('')||'<p class="muted">No matches found</p>'}</div>`;
nodes.querySelector('#clearSearch').onclick=()=>{search.value='';render()};
nodes.querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>focus(b.dataset.result));
return;
}

const {levels,edges}=build(),cardW=188,gapX=38,gapY=65,stepX=cardW+gapX,stepY=76+gapY,maxCount=Math.max(1,...levels.map(l=>l.length)),width=Math.max(660,maxCount*stepX+90),height=Math.max(440,levels.length*stepY+80),coords=new Map();
levels.forEach((level,i)=>{
const rowWidth=level.length*stepX-gapX;
const start=(width-rowWidth)/2;
level.forEach((id,j)=>coords.set(id,{x:start+j*stepX,y:35+i*stepY}));
});

const lines=edges.map(([a,b])=>{
const A=coords.get(a),B=coords.get(b);
if(!A||!B)return '';
const x1=A.x+cardW/2,y1=A.y+76,x2=B.x+cardW/2,y2=B.y,mid=(y1+y2)/2;
return `<path d="M${x1} ${y1} V${mid} H${x2} V${y2}"/>`
}).join('');

const cards=[...coords].map(([id,p])=>{
const person=byId.get(id),has=related(id)[mode].length>0;
return `<button class="tree-card ${id===selected?'selected':''}" data-person="${esc(id)}" style="left:${p.x}px;top:${p.y}px"><span class="name">${esc(person.name)}</span><span class="dates">${esc(date(person))}</span>${has?`<span class="expand" aria-hidden="true">${expanded.has(id)?'−':'+'}</span>`:''}</button>`
}).join('');

nodes.innerHTML=`<div class="tree-toolbar"><button data-mode="ancestors" class="${mode==='ancestors'?'active':''}">Ancestors ↑</button><button data-mode="children" class="${mode==='children'?'active':''}">Descendants ↓</button><label>Generations <select id="genCount">${[3,4,5,6].map(n=>`<option value="${n}" ${generations===n?'selected':''}>${n}</option>`).join('')}</select></label><button id="expandAll">Expand visible</button></div><div class="tree-viewport" id="treeViewport"><div class="tree-stage" id="treeStage" style="width:${width}px;height:${height}px;transform:scale(${scale})"><svg class="tree-links" width="${width}" height="${height}">${lines}</svg>${cards}</div></div><div class="tree-zoom"><button id="zoomOut" aria-label="Zoom out">−</button><button id="zoomIn" aria-label="Zoom in">+</button><button id="zoomReset">Fit</button></div><div class="tree-note">Tap a card to expand or collapse its branch. Select a relative in the profile to start a new tree.</div>`;

nodes.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
mode=b.dataset.mode;
expanded=new Set([selected]);
render()
});
nodes.querySelector('#genCount').onchange=e=>{
generations=Number(e.target.value);
render()
};
nodes.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>{
const id=b.dataset.person;
profile(id);
if(expanded.has(id))expanded.delete(id);
else expanded.add(id);
render()
});
nodes.querySelector('#expandAll').onclick=()=>{
const visited=new Set([selected]);
let frontier=[selected];
for(let i=1;i<generations;i++){
const next=[];
for(const id of frontier){
expanded.add(id);
for(const x of related(id)[mode])
if(!visited.has(x)){
visited.add(x);
next.push(x)
}
}
frontier=next;
}
render()
};
nodes.querySelector('#zoomIn').onclick=()=>{
scale=Math.min(1.6,+(scale+.15).toFixed(2));
render()
};
nodes.querySelector('#zoomOut').onclick=()=>{
scale=Math.max(.45,+(scale-.15).toFixed(2));
render()
};
nodes.querySelector('#zoomReset').onclick=()=>{
scale=1;
render()
};
}

fetch('challenger-family-public.json').then(r=>{
if(!r.ok)throw Error('Data unavailable');
return r.json()
}).then(d=>{
people=Array.isArray(d.people)?d.people:[];
families=Array.isArray(d.families)?d.families:[];
byId=new Map(people.map(p=>[p.id,p]));
for(const f of families){
for(const c of f.children||[])
parents.set(c,uniq([...(parents.get(c)||[]),...(f.parents||[])]));
for(const p of f.parents||[])
children.set(p,uniq([...(children.get(p)||[]),...(f.children||[])]));
}
const start=people.find(p=>p.name.toLowerCase()==='robert james challenger')||people[0];
if(start)focus(start.id);
else nodes.textContent='No family records found.'
}).catch(e=>{
console.error(e);
nodes.textContent='Unable to load family data. Please refresh.'
});
search.addEventListener('input',render);
