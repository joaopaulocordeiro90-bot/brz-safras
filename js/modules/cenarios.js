
/* ═══════════ BRZ SAFRA s33 · Cenários & Estatísticas + Soja: Farelo, Óleo, Esmagamento ═══════════
   Três camadas lado a lado, nunca misturadas: Conab (oficial), USDA (oficial externo) e Agrinvest (número próprio).
   O número Agrinvest parte da Conab linha a linha; cada linha editada vira premissa da mesa e encadeia o estoque
   inicial da safra seguinte. Dados em window.__CEN_DATA__ (blob separado do motor); premissas em
   window.__CEN_STATE__ (script brz-cen-state, salvo no EXPORTAR HTML). Valores internos em MIL TONELADAS. */
(function(){
'use strict';
const D=window.__CEN_DATA__,C=window.C,B=window.__BAL_OFFICIAL__;
if(!D||!C||!B)return;
const STORE='brz_safra_cen_v1';
const en=()=>document.documentElement.lang==='en';
const T=(pt,e)=>en()?e:pt;
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const MINUS='\u2212';
const nf=(v,d)=>{if(v==null||!isFinite(v))return 'n/d';let s=Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});if(/^-0(,0+)?$/.test(s))s=s.slice(1);return s.replace(/^-/,MINUS);};
const nfL=(v,d)=>{if(v==null||!isFinite(v))return 'n/d';let s=Number(v).toLocaleString(en()?'en-US':'pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});if(/^-0([.,]0+)?$/.test(s))s=s.slice(1);return s.replace(/^-/,MINUS);};
const sg=(v,d)=>{if(v==null||!isFinite(v))return 'n/d';const r=Number(v.toFixed(d));return (r===0?'':r>0?'+':MINUS)+nf(Math.abs(r),d);};
const tone=(v,eps)=>v==null||!isFinite(v)?'ce-na':Math.abs(v)<(eps||0.005)?'ce-flat':v>0?'ce-up':'ce-down';
const sum=a=>a.reduce((x,y)=>x+(y||0),0);
const MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],MES_EN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const mL=i=>T(MES[i],MES_EN[i]);
const dBR=iso=>{const p=String(iso||'').split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0].slice(2):String(iso||'');};
const parseBR=s=>{const z=String(s==null?'':s).trim().replace(/\s/g,'');if(!z)return null;let q=z;if(q.includes(','))q=q.replace(/\./g,'').replace(',','.');const n=Number(q.replace(MINUS,'-'));return Number.isFinite(n)?n:NaN;};
const srcB=()=>String(B.source||'').replace(/\s+\u2014\s+/g,', ');
const COL={navy:'#1A3A5C',teal:'#0D9488',bege:'#B5963E',red:'#AF514D',gray:'#94A3B8',sky:'#6E8FAE'};

/* ── estado (premissas Agrinvest e simulador) ── */
function load(){
  let o=null;
  try{const e=window.__CEN_STATE__;if(e&&typeof e==='object'&&Object.keys(e).length)o=JSON.parse(JSON.stringify(e));}catch(e){}
  if(!o){try{const l=localStorage.getItem(STORE);if(l)o=JSON.parse(l);}catch(e){}}
  o=o||{};o.agr=o.agr||{};o.sim=o.sim||{};o.ui=o.ui||{};return o;
}
const ST=load();
function persist(){
  const sc=document.getElementById('brz-cen-state');
  const keep={agr:ST.agr,sim:ST.sim};
  if(sc)sc.textContent='window.__CEN_STATE__='+JSON.stringify(keep).replace(/<\/script/gi,'<\\/script')+';';
  window.__CEN_STATE__=JSON.parse(JSON.stringify(keep));
  try{localStorage.setItem(STORE,JSON.stringify(keep));}catch(e){}
}

/* ── produtos e safras ── */
const PRODS=[
  {k:'Soja em grão',pt:'Soja',en:'Soybeans',src:'bal',usda:'soja',hist:'Soja',dec:2},
  {k:'Milho',pt:'Milho',en:'Corn',src:'bal',usda:'milho',hist:'Milho Total',dec:2},
  {k:'Farelo de soja',pt:'Farelo de soja',en:'Soybean meal',src:'bal',usda:'farelo',dec:2},
  {k:'Óleo de soja',pt:'Óleo de soja',en:'Soybean oil',src:'bal',usda:'oleo',dec:3},
  {k:'Algodão em pluma',pt:'Algodão em pluma',en:'Cotton lint',src:'od',hist:'Algodão',dec:3},
  {k:'Arroz em casca',pt:'Arroz em casca',en:'Paddy rice',src:'od',dec:2},
  {k:'Feijão',pt:'Feijão',en:'Dry beans',src:'od',dec:3},
  {k:'Trigo',pt:'Trigo',en:'Wheat',src:'od',usda:'trigo',hist:'Trigo',dec:2}
];
const P=k=>PRODS.find(p=>p.k===k);
const pName=k=>{const p=P(k);return p?T(p.pt,p.en):k;};
const USE_DAYS=p=>p==='Soja em grão'||p==='Algodão em pluma';
const byYear=(a,b)=>parseInt(a,10)-parseInt(b,10);
function years(prod){const p=P(prod);if(!p)return [];if(p.src==='bal')return Object.keys((B.tables||{})[prod]||{}).sort(byYear);return Object.keys(((D.conabOD||{})[prod]||{}).rows||{}).sort(byYear);}
const prevYear=(prod,sf)=>{const ys=years(prod);const i=ys.indexOf(sf);return i>0?ys[i-1]:null;};
function keysOf(prod){
  if(prod==='Soja em grão')return ['begin','production','imports','seeds','process','exports'];
  if(prod==='Milho')return ['begin','verao','safrinha','terceira','imports','domestic','exports'];
  return ['begin','production','imports','domestic','exports'];
}
function histProd(cult,sf){const h=(C.hist||{})[cult];if(!h)return null;const i=h.safras.indexOf(sf);if(i<0)return null;const v=((h.prod||{}).BR||[])[i];return v==null?null:+v;}
function histAY(cult,sf){const h=(C.hist||{})[cult];if(!h)return null;const i=h.safras.indexOf(sf);if(i<0)return null;return {area:+(h.area.BR||[])[i],yld:+(h.produt.BR||[])[i],prod:+(h.prod.BR||[])[i]};}
function conabRec(prod,sf){
  const p=P(prod);if(!p)return null;let r;
  if(p.src==='bal'){const b=((B.tables||{})[prod]||{})[sf];if(!b)return null;r=Object.assign({},b);}
  else{const a=(((D.conabOD||{})[prod]||{}).rows||{})[sf];if(!a)return null;r={begin:a[0],production:a[1],imports:a[2],supply:a[3],domestic:a[4],exports:a[5],end:a[6]};}
  if(prod==='Milho'){
    const v=histProd('Milho 1ª',sf),s=histProd('Milho 2ª',sf),t=histProd('Milho 3ª',sf);
    if(v!=null&&s!=null){r.verao=v;r.safrinha=s;r.terceira=t||0;const gap=r.production-(v+s+(t||0));if(Math.abs(gap)>0.5)r.terceira=(t||0)+gap;}
    else{r.verao=null;r.safrinha=r.production;r.terceira=0;}
  }
  return finish(prod,r);
}
function finish(prod,r){
  if(prod==='Milho'&&r.verao!=null)r.production=(r.verao||0)+(r.safrinha||0)+(r.terceira||0);
  if(prod==='Soja em grão')r.domestic=(r.seeds||0)+(r.process||0);
  r.supply=(r.begin||0)+(r.production||0)+(r.imports||0);
  r.use=(r.domestic||0)+(r.exports||0);
  r.end=r.supply-r.use;
  r.su=r.use>0?r.end/r.use*100:null;
  r.days=r.domestic>0?r.end/(USE_DAYS(prod)?r.use:r.domestic)*365:null;
  return r;
}
const agrKey=(prod,sf)=>prod+'|'+sf;
const agrIn=(prod,sf)=>ST.agr[agrKey(prod,sf)]||{};
const hasAgr=(prod,sf)=>Object.keys(agrIn(prod,sf)).length>0;
function chainHas(prod,sf){let y=sf;for(let g=0;g<12&&y;g++){if(hasAgr(prod,y))return true;y=prevYear(prod,y);}return false;}
function agrRec(prod,sf,depth){
  depth=depth||0;const c=conabRec(prod,sf);if(!c)return null;
  const inp=agrIn(prod,sf),r={},org={};
  keysOf(prod).forEach(k=>{if(inp[k]!=null&&isFinite(inp[k])){r[k]=+inp[k];org[k]='agr';}else{r[k]=c[k];org[k]='conab';}});
  if(inp.begin==null&&depth<12){const py=prevYear(prod,sf);if(py&&chainHas(prod,py)){const pr=agrRec(prod,py,depth+1);if(pr){r.begin=pr.end;org.begin='chain';}}}
  if(prod!=='Milho'&&prod!=='Soja em grão'&&r.domestic==null)r.domestic=c.domestic;
  finish(prod,r);r.org=org;r.edited=Object.keys(org).some(k=>org[k]!=='conab');return r;
}
function setAgr(prod,sf,k,v){const key=agrKey(prod,sf);const o=Object.assign({},ST.agr[key]||{});if(v==null)delete o[k];else o[k]=v;if(Object.keys(o).length)ST.agr[key]=o;else delete ST.agr[key];persist();}

/* ── USDA e ABIOVE na mesma régua ── */
const WD=(D.wasde||{}).world||{};
function usdaYear(prod,sf){return String(sf).includes('/')?sf:(sf+'/'+String(+sf+1).slice(2));}
function usdaRow(key,yr,reg){const t=((WD[key]||{})[yr]||{})[reg];if(!t)return null;return t.Nov||t.Oct||t.Sep||t;}
function usdaRec(prod,sf){
  const p=P(prod);if(!p||!p.usda)return null;const u=usdaRow(p.usda,usdaYear(prod,sf),'Brazil');if(!u)return null;
  const r={begin:u.begin*1000,production:u.production*1000,imports:u.imports*1000,exports:u.exports*1000,end:u.end*1000,domestic:u.domestic*1000};
  if(prod==='Soja em grão'){r.process=u.crush*1000;r.seeds=(u.domestic-u.crush)*1000;}
  r.supply=r.begin+r.production+r.imports;r.use=r.domestic+r.exports;r.su=r.use>0?r.end/r.use*100:null;
  r.days=r.domestic>0?r.end/(USE_DAYS(prod)?r.use:r.domestic)*365:null;r.yr=usdaYear(prod,sf);return r;
}
const ABD=D.abiove||{},ABA=ABD.annual||{years:[]};
const SAMP=(ABD.sample2026||100)/100;
const abKey=p=>p==='Soja em grão'?'soja':p==='Farelo de soja'?'farelo':p==='Óleo de soja'?'oleo':null;
function abRow(key,y){const i=(ABA.years||[]).indexOf(String(y));const t=ABA[key];if(i<0||!t)return null;const r={};Object.keys(t).forEach(k=>r[k]=t[k][i]);r.yr=String(y);r.status=(ABA.proj||[]).includes(String(y))?T('projeção','projection'):T('realizado','actual');return r;}
const AB={};(ABA.years||[]).forEach(y=>{const s=abRow('soja',y)||{},f=abRow('farelo',y)||{},o=abRow('oleo',y)||{};AB[y]={process:s.process,soyExports:s.exports,soyImports:s.imports,mealProd:f.production,mealExports:f.exports,mealDom:f.domestic,mealEnd:f.end,oilProd:o.production,oilExports:o.exports,oilImports:o.imports,oilDom:o.domestic,oilEnd:o.end,status:s.status};});
function abioveRec(prod,sf){
  const key=abKey(prod);if(!key)return null;const y=String(parseInt(sf,10)+1);const r=abRow(key,y);if(!r)return null;
  if(key==='soja')r.domestic=r.seeds+r.process;
  r.supply=r.begin+r.production+r.imports;r.use=r.domestic+r.exports;r.su=r.use>0?r.end/r.use*100:null;
  r.days=r.domestic>0?r.end/(key==='soja'?r.use:r.domestic)*365:null;return r;
}
/* mensal ABIOVE: processamento, consumo aparente, importação, estoque da indústria */
const CM={};Object.entries(ABD.crushM||{}).forEach(([y,a])=>a.forEach((v,m)=>{if(v!=null)CM[y+'-'+String(m+1).padStart(2,'0')]={v,s:y==='2026'};}));
function abImp(key,y,m){const a=((ABD.imports||{})[key]||{})[String(y)];if(!a)return null;const v=a[m];return v==null?null:+v;}
const mavg=(obj,years,m)=>{const v=years.map(y=>(obj[y]||[])[m]).filter(x=>x!=null);return v.length?sum(v)/v.length:null;};

/* ── linhas do quadro ── */
function rowsFor(prod){
  const L=(k,pt,e,o)=>Object.assign({k,pt,en:e},o||{});
  const top=[L('g','Oferta','Supply',{g:1}),L('begin','Estoque inicial','Beginning stocks',{ed:1})];
  if(prod==='Milho')top.push(L('verao','Produção 1ª safra','1st crop',{ed:1,sub:1}),L('safrinha','Produção 2ª safra','2nd crop',{ed:1,sub:1}),L('terceira','Produção 3ª safra','3rd crop',{ed:1,sub:1}),L('production','Produção total','Total production',{tot:1}));
  else top.push(L('production','Produção','Production',{ed:1}));
  top.push(L('imports','Importação','Imports',{ed:1}),L('supply','Oferta total','Total supply',{tot:1}),L('g','Demanda','Use',{g:1}));
  if(prod==='Soja em grão')top.push(L('process','Processamento','Crush',{ed:1,sub:1}),L('seeds','Sementes e outros','Seeds and other',{ed:1,sub:1}),L('domestic','Consumo interno','Domestic use',{tot:0}));
  else top.push(L('domestic',prod==='Milho'?'Consumo interno':'Consumo interno','Domestic use',{ed:1}));
  top.push(L('exports','Exportação','Exports',{ed:1}),L('use','Demanda total','Total use',{tot:1}),L('g','Fechamento','Carryout',{g:1}),L('end','Estoque final','Ending stocks',{tot:1,key:1}),L('su','Estoque / demanda','Stocks / use',{pct:1}),L('days','Estoque em dias','Stocks in days',{dd:1}));
  return top;
}
const fmtV=(r,row,dec)=>{if(!r)return 'n/d';const v=r[row.k];if(row.pct)return v==null?'n/d':nf(v,1)+'%';if(row.dd)return v==null?'n/d':nf(v,0);return v==null?'n/d':nf(v/1000,dec);};

/* ── gráficos nativos ── */
let CH=[];
function dropCharts(){CH.forEach(o=>{try{o.ro.disconnect();o.ch.dispose();}catch(e){}});CH=[];}
function mount(id,opt){const el=document.getElementById(id);if(!el||!window.echarts)return;const ch=window.echarts.init(el);ch.setOption(opt,true);const ro=new ResizeObserver(()=>ch.resize());ro.observe(el);CH.push({ch,ro});}
const ax=(name)=>({type:'value',name,axisLabel:{fontSize:11}});

/* ── utilidades de UI ── */
const card=(id,title,sub,body,acts)=>'<section class="ce-card" id="'+id+'"><div class="ce-ch"><div><h3>'+esc(title)+'</h3>'+(sub?'<div class="ce-sub">'+esc(sub)+'</div>':'')+'</div>'+(acts?'<div class="ce-acts" data-noexport>'+acts+'</div>':'')+'</div>'+body+'</section>';
const csvBtn=(tid,name)=>'<button type="button" class="ce-btn" data-ce-csv="'+tid+'" data-name="'+esc(name)+'">CSV</button>';
const sel=(id,opts,val,label)=>'<label>'+esc(label)+'<select data-ce-sel="'+id+'">'+opts.map(o=>'<option value="'+esc(o[0])+'"'+(o[0]===val?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>';
const seg=(id,opts,val)=>'<span class="ce-seg" role="tablist">'+opts.map(o=>'<button type="button" data-ce-seg="'+id+'" data-v="'+esc(o[0])+'" class="'+(o[0]===val?'on':'')+'">'+esc(o[1])+'</button>').join('')+'</span>';
const kpi=(lab,val,sub,cls)=>'<div class="ce-kpi '+(cls||'')+'"><span>'+esc(lab)+'</span><b>'+val+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</div>';
function tableCSV(tid,name){
  const t=document.getElementById(tid);if(!t)return;
  const lines=[...t.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>{const inp=td.querySelector('input');let x=(inp?(inp.value||inp.placeholder):td.textContent).replace(/\s+/g,' ').trim();return '"'+x.replace(/"/g,'""')+'"';}).join(';'));
  const u=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=u;a.download='BRZ_'+name+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);
}

/* ═════════════ estado da tela ═════════════ */
const S=Object.assign({tab:'painel',prod:'Soja em grão',sf:null,flowProd:'Soja em grão',flowSf:null,mode:'medida',simProd:'Soja em grão',simSf:null,wProd:'soja',odProd:'Algodão em pluma',trProd:'soja',trSf:'2025/26',abProd:'soja',abInd:'2026'},ST.ui||{});
function defSf(prod){const ys=years(prod);const cur=(B.tables['Soja em grão']&&years(prod).includes('2025/26'))?'2025/26':ys[ys.length-1];return cur;}
const TABS=[['painel','Confronto Conab × Agrinvest','Conab × Agrinvest'],['fluxo','Fluxo mensal','Monthly flow'],['sim','Simulador área × produtividade','Area × yield simulator'],['outras','Outras culturas','Other crops'],['mundo','Mundo e EUA · USDA','World and US · USDA'],['abiove','Complexo soja · ABIOVE','Soy complex · ABIOVE'],['traj','Trajetória das estimativas','Estimate trajectory']];

/* ═════════════ 1 · Confronto ═════════════ */
function painelHTML(){
  const prod=S.prod,ys=years(prod);if(!S.sf||!ys.includes(S.sf))S.sf=ys.includes('2025/26')?'2025/26':ys[ys.length-1];
  const sf=S.sf,c=conabRec(prod,sf),a=agrRec(prod,sf),u=usdaRec(prod,sf),ab=abioveRec(prod,sf),dec=(P(prod)||{}).dec||2;
  const rows=rowsFor(prod),ed=keysOf(prod);
  const ctl='<div class="ce-ctl">'+sel('prod',PRODS.map(p=>[p.k,T(p.pt,p.en)]),prod,T('Produto','Product'))+sel('sf',ys.map(y=>[y,y]),sf,T('Safra','Crop year'))+
    '<span class="ce-hint">'+esc(T('Digite na coluna Agrinvest em Mi t. Em branco = segue a Conab.','Type in the Agrinvest column in Mmt. Blank = follows Conab.'))+'</span></div>';
  const stale='';
  let h='<div class="ce-scroll"><table class="ce-t ce-od" id="ce-od-t"><thead><tr><th class="ce-l">'+esc(T('Mi t','Mmt'))+'</th><th>Conab<small>'+esc(T('oficial','official'))+'</small></th><th class="ce-agr">Agrinvest<small>'+esc(T('número próprio','house number'))+'</small></th><th>Δ Agr '+MINUS+' Conab</th><th>USDA<small>'+esc(u?('WASDE out/26 · '+u.yr):'n/d')+'</small></th><th>Δ USDA '+MINUS+' Conab</th>'+(ab?'<th>ABIOVE<small>'+esc(ab.yr+' · '+ab.status)+'</small></th><th>Δ ABIOVE '+MINUS+' Conab</th>':'')+'</tr></thead><tbody>';
  rows.forEach(row=>{
    if(row.g){h+='<tr class="ce-g"><td class="ce-l" colspan="'+(ab?8:6)+'">'+esc(T(row.pt,row.en))+'</td></tr>';return;}
    const cv=c?c[row.k]:null,av=a?a[row.k]:null,uv=u?u[row.k]:null,bv=ab?ab[row.k]:null;
    const isEd=row.ed&&ed.includes(row.k),org=a&&a.org?a.org[row.k]:null;
    const dA=(cv!=null&&av!=null)?(row.pct||row.dd?av-cv:(av-cv)/1000):null,dU=(cv!=null&&uv!=null)?(row.pct||row.dd?uv-cv:(uv-cv)/1000):null;
    const dd=row.pct?1:row.dd?0:dec;
    let agrCell;
    if(isEd){const ov=(agrIn(prod,sf)[row.k]);const ph=av!=null?nf(av/1000,dec):'';
      agrCell='<input class="ce-in'+(org==='agr'?' on':org==='chain'?' chain':'')+'" data-ce-agr="'+row.k+'" inputmode="decimal" value="'+(ov!=null?esc(nf(ov/1000,dec)):'')+'" placeholder="'+esc(ph)+'" aria-label="'+esc(T(row.pt,row.en))+' Agrinvest">'+(org==='chain'?'<i class="ce-tag">'+esc(T('encadeado','chained'))+'</i>':'');}
    else agrCell=fmtV(a,row,dec);
    h+='<tr class="'+(row.tot?'ce-tot ':'')+(row.sub?'ce-subr ':'')+(row.key?'ce-key':'')+'"><td class="ce-l">'+esc(T(row.pt,row.en))+'</td><td>'+fmtV(c,row,dec)+'</td><td class="ce-agr">'+agrCell+'</td><td class="'+tone(dA)+'">'+(dA==null?'n/d':sg(dA,dd)+(row.pct?' p.p.':''))+'</td><td>'+fmtV(u,row,dec)+'</td><td class="'+tone(dU)+'">'+(dU==null?'n/d':sg(dU,dd)+(row.pct?' p.p.':''))+'</td>'+(ab?'<td>'+(bv==null?'<span class="ce-na">'+MINUS+'</span>':fmtV(ab,row,dec))+'</td>'+(function(){const dB=(cv!=null&&bv!=null)?(row.pct||row.dd?bv-cv:(bv-cv)/1000):null;return '<td class="'+tone(dB)+'">'+(dB==null?'n/d':sg(dB,dd)+(row.pct?' p.p.':''))+'</td>';})():'')+'</tr>';
  });
  h+='</tbody></table></div>';
  const mt=T('Mi t','Mmt');
  const k='<div class="ce-kpis">'+
    kpi(T('Estoque final Conab','Conab ending stocks'),nf(c.end/1000,dec)+' '+mt,(c.su!=null?nf(c.su,1)+'% '+T('da demanda','of use'):'')+(c.days!=null?' · '+nf(c.days,0)+' '+T('dias','days'):''))+
    kpi(T('Estoque final Agrinvest','Agrinvest ending stocks'),nf(a.end/1000,dec)+' '+mt,a.edited?sg((a.end-c.end)/1000,dec)+' '+mt+' '+T('vs Conab','vs Conab'):T('sem premissa própria, igual à Conab','no house input, same as Conab'),a.edited?'ce-kagr':'')+
    (ab?kpi(T('Estoque final ABIOVE','ABIOVE ending stocks'),nf(ab.end/1000,dec)+' '+mt,sg((ab.end-c.end)/1000,dec)+' '+mt+' '+T('vs Conab','vs Conab')+' · '+ab.yr):u?kpi(T('Estoque final USDA','USDA ending stocks'),nf(u.end/1000,dec)+' '+mt,sg((u.end-c.end)/1000,dec)+' '+mt+' '+T('vs Conab','vs Conab')):'')+
    kpi(T('Demanda total Agrinvest','Agrinvest total use'),nf(a.use/1000,dec)+' '+mt,sg((a.use-c.use)/1000,dec)+' '+mt+' '+T('vs Conab','vs Conab'))+'</div>';
  const read=leitura(prod,sf,c,a,u,dec);
  const acts='<button type="button" class="ce-btn" data-ce-act="clr">'+esc(T('Limpar premissas desta safra','Clear inputs for this crop year'))+'</button>'+csvBtn('ce-od-t','Confronto_'+prod.replace(/\s/g,'_')+'_'+sf.replace('/','-'));
  const note='<p class="ce-note">'+esc((P(prod).src==='bal'?(srcB()+' ('+dBR(B.published)+')'):((D.conabOD[prod]||{}).source||''))+T('. USDA: WASDE 677 (10/11/26), linha Brasil, ano-safra USDA','. USDA: WASDE 677 (Nov 10, 2026), Brazil line, USDA marketing year')+(prod==='Soja em grão'?T(' ajustado a out–set; o estoque do USDA não é comparável ao da Conab na mesma régua de calendário.',' adjusted to Oct–Sep; USDA stocks are not on the same calendar as Conab.'):'.')+(ab?T(' ABIOVE: ano civil (ano '+ab.yr+' = safra Conab '+sf+'), balanço atualizado em 15/10/26.',' ABIOVE: calendar year (year '+ab.yr+' = Conab crop year '+sf+'), balance updated on Oct 15, 2026.'):'')+T(' Estoque em dias: estoque final ÷ consumo interno × 365 (soja e algodão: ÷ demanda total).',' Stocks in days: ending stocks ÷ domestic use × 365 (soybeans and cotton: ÷ total use).'))+'</p>';
  return '<div class="ce-ctlbar">'+ctl+'</div>'+stale+k+'<p class="ce-text">'+esc(read)+'</p>'+card('ce-od',T('Quadro de oferta e demanda','Supply and demand table')+' · '+pName(prod)+' '+sf,T('Conab, número Agrinvest e USDA lado a lado; a coluna Agrinvest é editável','Conab, Agrinvest number and USDA side by side; the Agrinvest column is editable'),h+note,acts)+chainCard(prod);
}
function leitura(prod,sf,c,a,u,dec){
  const mt=T(' Mi t',' Mmt');
  let s=pName(prod)+' '+sf+': '+T('estoque final Conab de ','Conab ending stocks at ')+nf(c.end/1000,dec)+mt+(c.su!=null?' ('+nf(c.su,1)+T('% da demanda','% of use')+')':'')+'. ';
  if(a.edited){
    const parts=[];keysOf(prod).forEach(k=>{if(a.org[k]!=='conab'){const d=(a[k]-c[k])/1000;if(Math.abs(d)>=0.0005)parts.push(lab(prod,k)+' '+sg(d,dec));}});
    s+=T('Número Agrinvest em ','Agrinvest number at ')+nf(a.end/1000,dec)+mt+', '+sg((a.end-c.end)/1000,dec)+mt+T(' contra a Conab',' versus Conab')+(parts.length?' ('+parts.join(', ')+')':'')+'. ';
  }else s+=T('Sem premissa Agrinvest nesta safra: o número da casa repete a Conab. ','No Agrinvest input for this crop year: the house number repeats Conab. ');
  const ab=abioveRec(prod,sf);if(ab)s+=T('ABIOVE ','ABIOVE ')+ab.yr+T(' em ',' at ')+nf(ab.end/1000,dec)+mt+' ('+sg((ab.end-c.end)/1000,dec)+mt+T(' contra a Conab). ',' versus Conab). ');
  if(u)s+=T('USDA em ','USDA at ')+nf(u.end/1000,dec)+mt+T(' de estoque final e ',' ending stocks and ')+nf(u.production/1000,dec)+mt+T(' de produção.',' production.');
  return s;
}
function lab(prod,k){const r=rowsFor(prod).find(x=>x.k===k);return r?T(r.pt,r.en).toLowerCase():k;}
function chainCard(prod){
  const ys=years(prod);const dec=(P(prod)||{}).dec||2;
  let h='<div class="ce-scroll"><table class="ce-t" id="ce-chain-t"><thead><tr><th class="ce-l">'+esc(T('Safra','Crop year'))+'</th><th>'+esc(T('Produção Conab','Conab output'))+'</th><th>'+esc(T('Produção Agrinvest','Agrinvest output'))+'</th><th>'+esc(T('Exportação Conab','Conab exports'))+'</th><th>'+esc(T('Exportação Agrinvest','Agrinvest exports'))+'</th><th>'+esc(T('EF Conab','Conab end'))+'</th><th>'+esc(T('EF Agrinvest','Agrinvest end'))+'</th><th>Δ EF</th><th>'+esc(T('E/D Agrinvest','Agrinvest S/U'))+'</th></tr></thead><tbody>';
  ys.forEach(y=>{const c=conabRec(prod,y),a=agrRec(prod,y);if(!c||!a)return;const d=(a.end-c.end)/1000;
    h+='<tr class="'+(y===S.sf?'on':'')+'"><td class="ce-l"><b>'+esc(y)+'</b>'+(a.edited?' <i class="ce-dot" title="'+esc(T('com premissa Agrinvest','with Agrinvest input'))+'"></i>':'')+'</td><td>'+nf(c.production/1000,dec)+'</td><td>'+nf(a.production/1000,dec)+'</td><td>'+nf(c.exports/1000,dec)+'</td><td>'+nf(a.exports/1000,dec)+'</td><td>'+nf(c.end/1000,dec)+'</td><td><b>'+nf(a.end/1000,dec)+'</b></td><td class="'+tone(d)+'">'+sg(d,dec)+'</td><td>'+(a.su==null?'n/d':nf(a.su,1)+'%')+'</td></tr>';});
  h+='</tbody></table></div><p class="ce-note">'+esc(T('O estoque inicial Agrinvest de cada safra herda o estoque final Agrinvest da anterior quando houver premissa na cadeia (marcado como encadeado).','Each Agrinvest beginning stock inherits the prior Agrinvest ending stock when the chain has inputs (marked as chained).'))+'</p>';
  return card('ce-chain',T('Série Agrinvest × Conab','Agrinvest × Conab series')+' · '+pName(prod),T('Todas as safras do quadro, com o encadeamento de estoques','All crop years in the table, with stock chaining'),h,csvBtn('ce-chain-t','Serie_Agrinvest_'+prod.replace(/\s/g,'_')));
}

/* ═════════════ 2 · Fluxo mensal ═════════════ */
const H=D.house||{};
const norm=a=>{const s=sum(a);return s>0?a.map(x=>(x||0)/s):a.map(()=>0);};
function cumAt(ser,t){
  if(!ser.length)return 0;const pts=ser.map(p=>[Date.parse(p[0]+'T00:00:00Z'),+p[1]]);
  if(t<pts[0][0]){const t0=pts[0][0]-7*864e5;return t<=t0?0:pts[0][1]*(t-t0)/(pts[0][0]-t0);}
  for(let i=1;i<pts.length;i++){if(t<=pts[i][0]){const a=pts[i-1],b=pts[i];return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0]);}}
  return pts[pts.length-1][1];
}
/* participação mensal da colheita medida pela Conab (BR), meses do template [{y,m}] */
function measured(cult,sf,tpl){
  const ser=((((C.prog||{})[cult]||{})[sf]||{}).Colheita||{}).BR||[];if(ser.length<4)return null;
  const last=+ser[ser.length-1][1];if(last<97)return null;
  const ends=tpl.map(x=>Date.UTC(x.y,x.m+1,1)-1);let prev=0;const out=[];
  ends.forEach((t,i)=>{const c=i===ends.length-1?last:cumAt(ser,t);out.push(Math.max(0,c-prev));prev=c;});
  return norm(out);
}
function seasonsCult(cult){return Object.keys((C.prog||{})[cult]||{}).sort(byYear);}
function harvestShares(cult,sf,tpl,fixed){
  const m=measured(cult,sf,tpl);if(m)return {w:m,how:'medida',sf};
  const ss=seasonsCult(cult).filter(s=>parseInt(s,10)<parseInt(sf,10)).slice(-5),acc=tpl.map(()=>0);let n=0;
  ss.forEach(s=>{const dy=parseInt(s,10)-parseInt(sf,10);const t2=tpl.map(x=>({y:x.y+dy,m:x.m}));const w=measured(cult,s,t2);if(w){w.forEach((v,i)=>acc[i]+=v);n++;}});
  if(n)return {w:norm(acc),how:'media',n};
  return {w:norm(fixed),how:'fixa'};
}
const MD=D.mdic||{},CUT=(D.meta||{}).mdicCutoff||'2026-09';
function mdicM(prod,y,m){const a=(MD[prod]||{})[String(y)];if(!a)return null;const k=y+'-'+String(m+1).padStart(2,'0');if(k>CUT)return null;const v=a[m];return v==null||v<=0?null:+v;}
function seas3(prod,tpl,refY){const acc=tpl.map(()=>0);let n=0;for(let d=1;d<=3;d++){let ok=true;const vals=tpl.map(x=>{const v=mdicM(prod,x.y-d,x.m);if(v==null)ok=false;return v||0;});if(ok){vals.forEach((v,i)=>acc[i]+=v);n++;}}return n?norm(acc):norm(tpl.map(()=>1));}
function spread(total,tpl,realFn,weights){
  const real=tpl.map(x=>realFn(x));const rs=sum(real.map(v=>v||0));const rem=total-rs;
  const idx=tpl.map((x,i)=>real[i]==null?i:-1).filter(i=>i>=0);const w=idx.map(i=>weights[i]);const ws=sum(w);
  const out=real.map(v=>v==null?0:v);idx.forEach((i,j)=>{out[i]=ws>0?Math.max(0,rem)*w[j]/ws:Math.max(0,rem)/idx.length;});
  return {v:out,real:real.map(v=>v!=null),over:rem<0?-rem:0};
}
function crushShape(tpl,total){
  const base=norm(H.soja.process),cm=CM;
  const rk=tpl.map(x=>cm[x.y+'-'+String(x.m+1).padStart(2,'0')]);const has=rk.map(v=>!!v);
  const bw=sum(base.filter((v,i)=>has[i])),aw=sum(rk.map(v=>v?v.v:0));
  const w=base.map((v,i)=>has[i]&&aw>0?bw*rk[i].v/aw:v);
  return {v:norm(w).map(x=>x*total),real:has};
}
function flowSoja(sf){
  const Y=parseInt(sf,10)+1,tpl=MES.map((_,m)=>({y:Y,m}));const a=agrRec('Soja em grão',sf);if(!a)return null;
  const hv=S.mode==='fixa'?{w:norm(H.soja.harvest),how:'fixa'}:harvestShares('Soja',sf,tpl,H.soja.harvest);
  const prod=hv.w.map(x=>x*a.production);const imS=spread(a.imports,tpl,x=>abImp('soja',x.y,x.m),norm(H.soja.imports));const imp=imS.v;
  const ex=spread(a.exports,tpl,x=>mdicM('Soja',x.y,x.m)!=null?mdicM('Soja',x.y,x.m)*1:null,seas3('Soja',tpl,Y));
  const cr=crushShape(tpl,a.process);const seeds=tpl.map((x,i)=>i===H.soja.seedsMonth?a.seeds:0);
  let st=a.begin;const rows=tpl.map((x,i)=>{const b=st;const sup=b+prod[i]+imp[i];const use=cr.v[i]+ex.v[i]+seeds[i];st=sup-use;return {b,p:prod[i],imp:imp[i],sup,cr:cr.v[i],ex:ex.v[i],sd:seeds[i],use,e:st,exR:ex.real[i],crR:cr.real[i],imR:imS.real[i],days:use>0?st/use*30:null};});
  return {kind:'soja',sf,Y,tpl,rows,a,hv,over:ex.over};
}
function flowMilho(sf){
  const Y=parseInt(sf,10)+1,tpl=[1,2,3,4,5,6,7,8,9,10,11,0].map(m=>({y:m===0?Y+1:Y,m}));const a=agrRec('Milho',sf);if(!a)return null;
  const fx=S.mode==='fixa';
  const v=fx?{w:norm(H.milho.verao),how:'fixa'}:harvestShares('Milho 1ª',sf,tpl.map((x,i)=>i===11?{y:Y+1,m:0}:x),H.milho.verao);
  if(!fx&&v.how!=='fixa'){/* colheita de jan/ano seguinte pertence à próxima safra: devolve ao 1º mês */v.w=norm(v.w.map((x,i)=>i===11?0:x));}
  const s2=fx?{w:norm(H.milho.safrinha),how:'fixa'}:harvestShares('Milho 2ª',sf,tpl,H.milho.safrinha);
  const t3={w:norm(H.milho.terceira),how:'fixa'};
  const pv=v.w.map(x=>x*(a.verao||0)),ps=s2.w.map(x=>x*(a.safrinha||0)),pt=t3.w.map(x=>x*(a.terceira||0));
  const imp=norm(H.milho.imports).map(x=>x*a.imports),dom=norm(H.milho.domestic).map(x=>x*a.domestic);
  const ex=spread(a.exports,tpl,x=>mdicM('Milho',x.y,x.m),seas3('Milho',tpl,Y));
  let st=a.begin;const rows=tpl.map((x,i)=>{const b=st;const p=pv[i]+ps[i]+pt[i];const sup=b+p+imp[i];const use=dom[i]+ex.v[i];st=sup-use;return {b,pv:pv[i],ps:ps[i],pt:pt[i],p,imp:imp[i],sup,dom:dom[i],ex:ex.v[i],use,e:st,exR:ex.real[i],days:dom[i]>0?st/dom[i]*30:null};});
  return {kind:'milho',sf,Y,tpl,rows,a,hv:v,hv2:s2,over:ex.over};
}
const howTxt=h=>!h?'':h.how==='medida'?T('colheita medida pela Conab (Brasil, semanal)','harvest measured by Conab (Brazil, weekly)'):h.how==='media'?T('média de '+h.n+' safras medidas pela Conab (safra em curso ainda sem colheita completa)','average of '+h.n+' Conab-measured seasons (current season not fully harvested)'):T('calendário fixo Agrinvest (Dados Úteis)','fixed Agrinvest calendar (Dados Úteis)');
function fluxoHTML(){
  const prod=S.flowProd,ys=years(prod).filter(y=>parseInt(y,10)>=2021);if(!S.flowSf||!ys.includes(S.flowSf))S.flowSf=ys.includes('2025/26')?'2025/26':ys[ys.length-1];
  const F=prod==='Milho'?flowMilho(S.flowSf):flowSoja(S.flowSf);if(!F)return '<p class="ce-empty">'+esc(T('Sem dados para a safra.','No data for this crop year.'))+'</p>';
  const ctl='<div class="ce-ctl">'+seg('flowProd',[['Soja em grão',T('Soja','Soybeans')],['Milho',T('Milho','Corn')]],prod)+sel('flowSf',ys.map(y=>[y,y]),S.flowSf,T('Safra','Crop year'))+seg('mode',[['medida',T('Colheita medida','Measured harvest')],['fixa',T('Calendário fixo','Fixed calendar')]],S.mode)+'</div>';
  const mt=T('Mi t','Mmt'),R=F.rows,soy=F.kind==='soja';
  const hdr=F.tpl.map(x=>mL(x.m)+'/'+String(x.y).slice(2));
  const line=(lab,arr,cls,fmt,flags)=>'<tr class="'+(cls||'')+'"><td class="ce-l">'+esc(lab)+'</td><td class="ce-y">'+(fmt?fmt(arr.tot):nf(arr.tot/1000,3))+'</td>'+arr.m.map((v,i)=>'<td'+(flags&&flags[i]?' class="ce-real" title="'+esc(T('realizado','actual'))+'"':'')+'>'+(fmt?fmt(v):nf(v/1000,3))+'</td>').join('')+'</tr>';
  const A=F.a;let rowsH='';
  rowsH+=line(T('Estoque inicial','Beginning stocks'),{tot:A.begin,m:R.map(r=>r.b)},'ce-tot');
  if(soy)rowsH+=line(T('Produção','Production'),{tot:A.production,m:R.map(r=>r.p)});
  else{rowsH+=line(T('1ª safra','1st crop'),{tot:A.verao||0,m:R.map(r=>r.pv)},'ce-subr');rowsH+=line(T('2ª safra','2nd crop'),{tot:A.safrinha||0,m:R.map(r=>r.ps)},'ce-subr');rowsH+=line(T('3ª safra','3rd crop'),{tot:A.terceira||0,m:R.map(r=>r.pt)},'ce-subr');rowsH+=line(T('Produção total','Total production'),{tot:A.production,m:R.map(r=>r.p)});}
  rowsH+=line(T('Importação','Imports'),{tot:A.imports,m:R.map(r=>r.imp)},'',null,soy?R.map(r=>r.imR):null);
  rowsH+=line(T('Oferta total','Total supply'),{tot:A.supply,m:R.map(r=>r.sup)},'ce-tot');
  if(soy){rowsH+=line(T('Processamento','Crush'),{tot:A.process,m:R.map(r=>r.cr)},'',null,R.map(r=>r.crR));rowsH+=line(T('Exportação','Exports'),{tot:A.exports,m:R.map(r=>r.ex)},'',null,R.map(r=>r.exR));rowsH+=line(T('Sementes e outros','Seeds and other'),{tot:A.seeds,m:R.map(r=>r.sd)});}
  else{rowsH+=line(T('Consumo interno','Domestic use'),{tot:A.domestic,m:R.map(r=>r.dom)});rowsH+=line(T('Exportação','Exports'),{tot:A.exports,m:R.map(r=>r.ex)},'',null,R.map(r=>r.exR));}
  rowsH+=line(T('Demanda total','Total use'),{tot:A.use,m:R.map(r=>r.use)},'ce-tot');
  rowsH+=line(T('Estoque final','Ending stocks'),{tot:A.end,m:R.map(r=>r.e)},'ce-tot ce-key');
  rowsH+=line(soy?T('Dias de uso total','Days of total use'):T('Dias de consumo','Days of consumption'),{tot:A.days,m:R.map(r=>r.days)},'ce-subr',v=>v==null?'n/d':nf(v,0));
  const tbl='<div class="ce-scroll"><table class="ce-t ce-flow" id="ce-flow-t"><thead><tr><th class="ce-l">'+esc(mt)+'</th><th class="ce-y">'+esc(F.sf)+'</th>'+hdr.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rowsH+'</tbody></table></div>';
  const minI=R.reduce((b,r,i)=>r.e<R[b].e?i:b,0);
  const read=pName(prod)+' '+F.sf+': '+T('estoque mais apertado em ','tightest stock in ')+hdr[minI]+T(', com ',', at ')+nf(R[minI].e/1000,2)+' '+mt+(R[minI].days!=null?' ('+nf(R[minI].days,0)+' '+T('dias','days')+')':'')+'. '+T('Pico em ','Peak in ')+hdr[R.reduce((b,r,i)=>r.e>R[b].e?i:b,0)]+'. '+T('Colheita: ','Harvest: ')+howTxt(F.hv)+(F.hv2?' · '+T('2ª safra: ','2nd crop: ')+howTxt(F.hv2):'')+'.';
  const warn=F.over>0?'<p class="ce-warn">'+esc(T('Exportação realizada (MDIC) já supera o número anual em ','Actual exports (MDIC) already exceed the annual number by ')+nf(F.over/1000,2)+' '+mt+T('. Revise a exportação no número Agrinvest.','. Review exports in the Agrinvest number.'))+'</p>':'';
  const note='<p class="ce-note">'+esc(T('Totais anuais: número Agrinvest (Conab onde não há premissa). Exportação: MDIC/Comex Stat realizado até ','Annual totals: Agrinvest number (Conab where no input). Exports: MDIC/Comex Stat actual through ')+CUT.split('-').reverse().join('/')+T(' (células marcadas); restante distribuído pela sazonalidade média de 3 anos. ',' (marked cells); remainder spread by 3-year average seasonality. ')+(soy?T('Processamento: formato mensal ABIOVE nos meses publicados, total do número anual; demais meses pelo perfil da casa. Importação: ABIOVE/Secex realizada mês a mês. Sementes em março, convenção da casa. ','Crush: ABIOVE monthly shape in published months, total from the annual number; other months by house profile. Imports: ABIOVE/Secex monthly actuals. Seeds in March, house convention. '):T('Consumo interno e importação pelo perfil mensal da casa (Dados Úteis fev/26). Colheita de janeiro do ano seguinte pertence à safra seguinte. ','Domestic use and imports by house monthly profile (Dados Úteis Feb/26). January harvest of the following year belongs to the next crop. '))+T('Calendário: ','Calendar: ')+(soy?T('jan a dez do ano de encerramento (fecha em 31/12, como a Conab).','Jan to Dec of the closing year (closes Dec 31, like Conab).'):T('fev a jan (fecha em 31/01, como a Conab).','Feb to Jan (closes Jan 31, like Conab).')))+'</p>';
  return '<div class="ce-ctlbar">'+ctl+'</div>'+warn+'<p class="ce-text">'+esc(read)+'</p>'+card('ce-flow',T('Balanço mensal','Monthly balance')+' · '+pName(prod)+' '+F.sf,T('Estoque mês a mês e dias de uso · número Agrinvest','Month-by-month stocks and days of use · Agrinvest number'),tbl+note,csvBtn('ce-flow-t','Fluxo_'+(soy?'Soja':'Milho')+'_'+F.sf.replace('/','-')))+
    card('ce-flowc',T('Estoque final mensal e dias','Monthly ending stocks and days'),T('Barras: estoque em Mi t · linha: dias','Bars: stocks in Mmt · line: days'),'<div class="ce-chart" id="ce-flow-ch"></div>')+harvestCard(F);
}
function harvestCard(F){
  const hdr=F.tpl.map(x=>mL(x.m));
  const soy=F.kind==='soja';
  const fixed=soy?norm(H.soja.harvest):norm(H.milho.safrinha);
  const meas=soy?harvestShares('Soja',F.sf,F.tpl,H.soja.harvest):harvestShares('Milho 2ª',F.sf,F.tpl,H.milho.safrinha);
  let h='<div class="ce-scroll"><table class="ce-t" id="ce-hv-t"><thead><tr><th class="ce-l">%</th>'+hdr.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+
    '<tr><td class="ce-l">'+esc(T('Calendário fixo da casa','House fixed calendar'))+'</td>'+fixed.map(v=>'<td>'+nf(v*100,1)+'</td>').join('')+'</tr>'+
    '<tr class="ce-tot"><td class="ce-l">'+esc(howTxt(meas))+'</td>'+meas.w.map(v=>'<td>'+nf(v*100,1)+'</td>').join('')+'</tr>'+
    '<tr><td class="ce-l">Δ p.p.</td>'+meas.w.map((v,i)=>{const d=(v-fixed[i])*100;return '<td class="'+tone(d,0.05)+'">'+sg(d,1)+'</td>';}).join('')+'</tr></tbody></table></div>';
  return card('ce-hv',T('Distribuição da colheita','Harvest distribution')+' · '+(soy?T('soja','soybeans'):T('milho 2ª safra','2nd-crop corn')),T('Quanto da produção entra em cada mês · calendário fixo contra o medido','Share of output entering each month · fixed calendar versus measured'),h,csvBtn('ce-hv-t','Colheita_mensal'));
}
function fluxoCharts(){
  const F=S.flowProd==='Milho'?flowMilho(S.flowSf):flowSoja(S.flowSf);if(!F)return;const hdr=F.tpl.map(x=>mL(x.m)+'/'+String(x.y).slice(2));
  mount('ce-flow-ch',{xAxis:{type:'category',data:hdr,axisLabel:{fontSize:11}},yAxis:[ax(T('Mi t','Mmt')),ax(T('dias','days'))],tooltip:{trigger:'axis'},toolbox:{feature:{saveAsImage:{name:'fluxo_mensal'},dataView:{},magicType:{}}},
    series:[{name:T('Estoque final','Ending stocks'),type:'bar',color:COL.navy,data:F.rows.map(r=>+(r.e/1000).toFixed(2))},{name:F.kind==='soja'?T('Dias de uso total','Days of total use'):T('Dias de consumo','Days of consumption'),type:'line',yAxisIndex:1,color:COL.bege,showSymbol:true,symbolSize:5,lineStyle:{width:2},data:F.rows.map(r=>r.days==null?null:Math.round(r.days))}]});
}

/* ═════════════ 3 · Simulador ═════════════ */
const SIMP=[['Soja em grão',[['Soja',T('Soja','Soybeans'),'production']]],['Milho',[['Milho 1ª',T('Milho 1ª safra','1st-crop corn'),'verao'],['Milho 2ª',T('Milho 2ª safra','2nd-crop corn'),'safrinha'],['Milho 3ª',T('Milho 3ª safra','3rd-crop corn'),'terceira']]],['Algodão em pluma',[['Algodão',T('Algodão em pluma','Cotton lint'),'production']]]];
const DEF_D=[-10,-5,-3,0,3,5,10],DEF_A=[-4,-2,0,2,4];
function simCfg(prod,sf){const k=prod+'|'+sf;const o=ST.sim[k]||{};return {d:Array.isArray(o.d)&&o.d.length===7?o.d:DEF_D.slice(),area:o.area||{},mx:Array.isArray(o.mx)&&o.mx.length===5?o.mx:DEF_A.slice()};}
function setSim(prod,sf,o){ST.sim[prod+'|'+sf]=o;persist();}
function simData(prod,sf){
  const parts=(SIMP.find(x=>x[0]===prod)||[])[1]||[];const a=agrRec(prod,sf);if(!a)return null;const cfg=simCfg(prod,sf);
  const comps=parts.map(([cult,lab,key])=>{const ay=histAY(cult,sf);if(!ay)return null;const prodBase=a[key]!=null?a[key]:ay.prod;const area0=ay.area;const area=cfg.area[cult]!=null?+cfg.area[cult]:area0;const yld=area0>0?prodBase/area0*1000:ay.yld;return {cult,lab,key,area0,area,yld};}).filter(Boolean);
  if(!comps.length)return null;
  const other=a.production-sum(comps.map(c=>a[c.key]!=null?a[c.key]:c.area0*c.yld/1000));
  const dd=USE_DAYS(prod)?a.use:a.domestic;const col=(dy,da)=>{const ps=comps.map(c=>c.area*(1+(da||0)/100)*c.yld*(1+dy/100)/1000);const prodT=sum(ps)+(comps.length===1?0:Math.max(0,other));const sup=a.begin+prodT+a.imports;const end=sup-a.use;return {ps,prodT,sup,end,su:a.use>0?end/a.use*100:null,days:dd>0?end/dd*365:null};};
  return {prod,sf,a,cfg,comps,col};
}
function simHTML(){
  const prod=S.simProd,ys=years(prod).filter(y=>histAY((SIMP.find(x=>x[0]===prod)[1][0][0]),y));if(!S.simSf||!ys.includes(S.simSf))S.simSf=ys[ys.length-1];
  const X=simData(prod,S.simSf);
  const ctl='<div class="ce-ctl">'+seg('simProd',SIMP.map(x=>[x[0],pName(x[0])]),prod)+sel('simSf',ys.map(y=>[y,y]),S.simSf,T('Safra','Crop year'))+'<span class="ce-hint">'+esc(T('Área e variações editáveis; demanda e estoque inicial vêm do número Agrinvest.','Area and changes are editable; use and beginning stocks come from the Agrinvest number.'))+'</span></div>';
  if(!X)return '<div class="ce-ctlbar">'+ctl+'</div><p class="ce-empty">'+esc(T('Sem área e produtividade na Série Histórica para esta safra.','No area and yield in the Historical Series for this crop year.'))+'</p>';
  const {a,cfg,comps}=X,mt=T('Mi t','Mmt'),dec=(P(prod)||{}).dec||2;const cols=cfg.d.map(d=>X.col(d,0));const base=cfg.d.indexOf(0);
  let h='<div class="ce-scroll"><table class="ce-t ce-sim" id="ce-sim-t"><thead><tr><th class="ce-l">'+esc(mt)+'</th>'+cfg.d.map((d,i)=>'<th class="'+(d===0?'on':'')+'"><input class="ce-din" data-ce-d="'+i+'" value="'+esc(nf(d,1))+'" inputmode="decimal" aria-label="'+esc(T('variação de produtividade %','yield change %'))+'"><small>% '+esc(T('produt.','yield'))+'</small></th>').join('')+'</tr></thead><tbody>';
  comps.forEach((c,ci)=>{
    h+='<tr class="ce-g"><td class="ce-l" colspan="'+(cfg.d.length+1)+'">'+esc(c.lab)+'</td></tr>';
    h+='<tr><td class="ce-l">'+esc(T('Área plantada','Planted area'))+' <small>'+esc(T('mil ha','kha'))+'</small><input class="ce-ain" data-ce-area="'+esc(c.cult)+'" value="'+esc(nf(c.area,1))+'" inputmode="decimal"></td>'+cfg.d.map(()=>'<td>'+nf(c.area/1000,3)+'<small> '+esc(T('Mi ha','Mha'))+'</small></td>').join('')+'</tr>';
    h+='<tr><td class="ce-l">'+esc(T('Produtividade','Yield'))+' <small>kg/ha · sc/ha</small></td>'+cfg.d.map(d=>{const y=c.yld*(1+d/100);return '<td>'+nf(y,0)+'<small> · '+nf(y/60,1)+'</small></td>';}).join('')+'</tr>';
    h+='<tr class="ce-subr"><td class="ce-l">'+esc(T('Produção','Production'))+'</td>'+cols.map(o=>'<td>'+nf(o.ps[ci]/1000,dec)+'</td>').join('')+'</tr>';
  });
  const R=(lab,fn,cls)=>'<tr class="'+(cls||'')+'"><td class="ce-l">'+esc(lab)+'</td>'+cols.map((o,i)=>'<td class="'+(i===base?'on':'')+'">'+fn(o)+'</td>').join('')+'</tr>';
  h+='<tr class="ce-g"><td class="ce-l" colspan="'+(cfg.d.length+1)+'">'+esc(T('Balanço','Balance'))+'</td></tr>';
  h+=R(T('Estoque inicial','Beginning stocks'),()=>nf(a.begin/1000,dec));
  h+=R(T('Produção total','Total production'),o=>nf(o.prodT/1000,dec),'ce-tot');
  h+=R(T('Importação','Imports'),()=>nf(a.imports/1000,dec));
  h+=R(T('Oferta total','Total supply'),o=>nf(o.sup/1000,dec),'ce-tot');
  h+=R(T('Consumo interno','Domestic use'),()=>nf(a.domestic/1000,dec));
  h+=R(T('Exportação','Exports'),()=>nf(a.exports/1000,dec));
  h+=R(T('Demanda total','Total use'),()=>nf(a.use/1000,dec),'ce-tot');
  h+=R(T('Estoque final','Ending stocks'),o=>'<b class="'+(o.end<0?'ce-down':'')+'">'+nf(o.end/1000,dec)+'</b>','ce-tot ce-key');
  h+=R(T('Estoque / demanda','Stocks / use'),o=>o.su==null?'n/d':nf(o.su,1)+'%');
  h+=R(T('Estoque em dias','Stocks in days'),o=>o.days==null?'n/d':nf(o.days,0));
  h+='<tr class="ce-noexp"><td class="ce-l"></td>'+cols.map((o,i)=>'<td><button type="button" class="ce-btn ce-mini" data-ce-push="'+i+'">'+esc(T('Usar no número','Use in number'))+'</button></td>').join('')+'</tr>';
  h+='</tbody></table></div><p class="ce-note">'+esc(T('Base: área e produtividade da Série Histórica Conab ('+S.simSf+'); se houver produção Agrinvest, a produtividade base é a implícita (produção ÷ área). "Usar no número" grava a produção da coluna como premissa Agrinvest.','Base: Conab Historical Series area and yield ('+S.simSf+'); when an Agrinvest output exists, base yield is implied (output ÷ area). "Use in number" saves the column output as an Agrinvest input.'))+'</p>';
  /* matriz área × produtividade */
  let m='<div class="ce-scroll"><table class="ce-mx" id="ce-mx-t"><thead><tr><th class="ce-mxc">'+esc(T('produt. ↓ · área →','yield ↓ · area →'))+'</th>'+cfg.mx.map((d,i)=>'<th><input class="ce-din" data-ce-mx="'+i+'" value="'+esc(nf(d,1))+'" inputmode="decimal"><small>% '+esc(T('área','area'))+'</small></th>').join('')+'</tr></thead><tbody>';
  const all=[];cfg.d.forEach(dy=>cfg.mx.forEach(da=>all.push(X.col(dy,da).su||0)));const lo=Math.min(...all),hi=Math.max(...all);
  cfg.d.forEach(dy=>{m+='<tr><th>'+sg(dy,1)+'%</th>'+cfg.mx.map(da=>{const o=X.col(dy,da);const t=hi>lo?((o.su||0)-lo)/(hi-lo):0.5;const bg=o.end<0?'#F6DCD8':'rgba(13,148,136,'+(0.08+0.42*t).toFixed(3)+')';return '<td class="'+(dy===0&&da===0?'on ':'')+(o.end<0?'neg':'')+'" style="background:'+bg+'"><b>'+nf(o.end/1000,dec)+'</b><small>'+(o.su==null?'':nf(o.su,1)+'%')+'</small></td>';}).join('')+'</tr>';});
  m+='</tbody></table></div><p class="ce-note">'+esc(T('Célula: estoque final em Mi t e estoque/demanda. Mesma variação aplicada a todas as safras do produto.','Cell: ending stocks in Mmt and stocks/use. Same change applied to every crop of the product.'))+'</p>';
  const c0=cols[base]||cols[3];
  const read=pName(prod)+' '+S.simSf+': '+T('cada 1% de produtividade move a produção em ','each 1% of yield moves output by ')+nf(sum(comps.map(c=>c.area*c.yld/1000))/100/1000,2)+' '+mt+'. '+T('Estoque final vai de ','Ending stocks range from ')+nf(cols[0].end/1000,dec)+' '+mt+' ('+sg(cfg.d[0],0)+'%) '+T('a ','to ')+nf(cols[cols.length-1].end/1000,dec)+' '+mt+' ('+sg(cfg.d[cfg.d.length-1],0)+'%), '+T('base em ','base at ')+nf(c0.end/1000,dec)+' '+mt+'.';
  return '<div class="ce-ctlbar">'+ctl+'</div><p class="ce-text">'+esc(read)+'</p>'+card('ce-sim',T('Cenários de produtividade','Yield scenarios')+' · '+pName(prod)+' '+S.simSf,T('Área fixa, produtividade variando nas colunas, balanço completo','Fixed area, yield changing across columns, full balance'),h,'<button type="button" class="ce-btn" data-ce-act="simreset">'+esc(T('Restaurar padrão','Reset defaults'))+'</button>'+csvBtn('ce-sim-t','Simulador_'+prod.replace(/\s/g,'_')))+
    card('ce-mx',T('Matriz área × produtividade','Area × yield matrix'),T('Estoque final para cada combinação','Ending stocks for each combination'),m,csvBtn('ce-mx-t','Matriz_area_produtividade'));
}

/* ═════════════ 4 · Outras culturas ═════════════ */
function odHTML(){
  const prods=['Algodão em pluma','Arroz em casca','Feijão','Trigo'];if(!prods.includes(S.odProd))S.odProd=prods[0];
  const prod=S.odProd,O=D.conabOD[prod],ys=years(prod),dec=(P(prod)||{}).dec||2,mt=T('Mi t','Mmt');
  const ctl='<div class="ce-ctl">'+seg('odProd',prods.map(p=>[p,pName(p)]),prod)+'</div>';
  const lines=[['begin','Estoque inicial','Beginning stocks'],['production','Produção','Production'],['imports','Importação','Imports'],['supply','Suprimento','Supply',1],['domestic','Consumo','Consumption'],['exports','Exportação','Exports'],['end','Estoque final','Ending stocks',1],['su','Estoque / consumo + exportação','Stocks / use'],['days',USE_DAYS(prod)?'Estoque em dias de demanda total':'Estoque em dias de consumo',USE_DAYS(prod)?'Stocks in days of total use':'Stocks in days of use'],['ay','Área · produtividade','Area · yield']];
  const recs=ys.map(y=>conabRec(prod,y));
  let h='<div class="ce-scroll"><table class="ce-t" id="ce-odx-t"><thead><tr><th class="ce-l">'+esc(mt)+'</th>'+ys.map(y=>'<th>'+esc(y)+'</th>').join('')+'</tr></thead><tbody>';
  lines.forEach(l=>{h+='<tr class="'+(l[3]?'ce-tot':'')+'"><td class="ce-l">'+esc(T(l[1],l[2]))+'</td>'+recs.map((r,i)=>{if(!r)return '<td>n/d</td>';
    if(l[0]==='su')return '<td>'+(r.su==null?'n/d':nf(r.su,1)+'%')+'</td>';if(l[0]==='days')return '<td>'+(r.days==null?'n/d':nf(r.days,0))+'</td>';
    if(l[0]==='ay'){const hc=(P(prod)||{}).hist;const ay=hc?histAY(hc,hc==='Trigo'?ys[i].slice(0,4):ys[i]):null;return '<td>'+(ay?nf(ay.area/1000,2)+' · '+nf(ay.yld,0):'<span class="ce-na">'+MINUS+'</span>')+'</td>';}
    return '<td>'+nf(r[l[0]]/1000,dec)+'</td>';}).join('')+'</tr>';});
  h+='</tbody></table></div><p class="ce-note">'+esc(T('Fonte: ','Source: ')+O.source+'. '+T('Estoque de passagem em ','Carryover on ')+O.closing+'. '+(prod==='Algodão em pluma'||prod==='Trigo'?T('Área em Mi ha e produtividade em kg/ha da Série Histórica Conab do arquivo.','Area in Mha and yield in kg/ha from the file Conab Historical Series.'):''))+'</p>';
  const warn=O.stale?'<p class="ce-warn">'+esc(T('Quadro anterior ao atual: ','Table predates the current one: ')+((O.update||{})['2026/27']||{}).note)+'</p>':'';
  const last=recs[recs.length-1],prev=recs[recs.length-2];
  const k='<div class="ce-kpis">'+kpi(T('Produção ','Output ')+ys[ys.length-1],nf(last.production/1000,dec)+' '+mt,sg((last.production-prev.production)/prev.production*100,1)+'% '+T('na safra','y/y'))+kpi(T('Exportação','Exports'),nf(last.exports/1000,dec)+' '+mt,sg((last.exports-prev.exports)/1000,dec)+' '+mt)+kpi(T('Estoque final','Ending stocks'),nf(last.end/1000,dec)+' '+mt,(last.su==null?'':nf(last.su,1)+'% '+T('da demanda','of use')))+kpi(USE_DAYS(prod)?T('Dias de demanda total','Days of total use'):T('Dias de consumo','Days of use'),nf(last.days,0),USE_DAYS(prod)?T('estoque ÷ (consumo + exportação) × 365','stocks ÷ (use + exports) × 365'):T('estoque ÷ consumo × 365','stocks ÷ use × 365'))+'</div>';
  return '<div class="ce-ctlbar">'+ctl+'</div>'+warn+k+card('ce-odx',T('Oferta e demanda','Supply and demand')+' · '+pName(prod),T('Série Conab com indicadores de aperto','Conab series with tightness indicators'),h,csvBtn('ce-odx-t','OD_'+prod.replace(/\s/g,'_')))+card('ce-odxc',T('Estoque final e estoque/demanda','Ending stocks and stocks/use'),'','<div class="ce-chart" id="ce-odx-ch"></div>');
}
function odCharts(){const prod=S.odProd,ys=years(prod),recs=ys.map(y=>conabRec(prod,y));
  mount('ce-odx-ch',{xAxis:{type:'category',data:ys,axisLabel:{fontSize:11}},yAxis:[ax(T('Mi t','Mmt')),ax('%')],tooltip:{trigger:'axis'},toolbox:{feature:{saveAsImage:{name:'od_'+prod},dataView:{}}},
    series:[{name:T('Estoque final','Ending stocks'),type:'bar',color:COL.navy,data:recs.map(r=>+(r.end/1000).toFixed(3))},{name:T('Estoque / demanda','Stocks / use'),type:'line',yAxisIndex:1,color:COL.bege,showSymbol:true,symbolSize:5,data:recs.map(r=>r.su==null?null:+r.su.toFixed(1))}]});}

/* ═════════════ 5 · Mundo e EUA ═════════════ */
const WP=[['soja',T('Soja','Soybeans')],['farelo',T('Farelo','Meal')],['oleo',T('Óleo','Oil')],['milho',T('Milho','Corn')],['trigo',T('Trigo','Wheat')]];
const REGN={'World':['Mundo','World'],'United States':['EUA','United States'],'Brazil':['Brasil','Brazil'],'Argentina':['Argentina','Argentina'],'China':['China','China'],'European Union':['União Europeia','European Union'],'Paraguay':['Paraguai','Paraguay'],'Ukraine':['Ucrânia','Ukraine'],'Russia':['Rússia','Russia'],'India':['Índia','India'],'Australia':['Austrália','Australia'],'Canada':['Canadá','Canada'],'Mexico':['México','Mexico']};
function mundoHTML(){
  const key=S.wProd,W=WD[key]||{},yrs=Object.keys(W).sort();
  const regs=Object.keys(W[yrs[yrs.length-1]]||{}).filter(r=>REGN[r]);
  const ctl='<div class="ce-ctl">'+seg('wProd',WP,key)+'<span class="ce-hint">'+esc(T('WASDE 677, 10/11/2026 · Mi t · 2026/27 com revisão contra outubro','WASDE 677, Nov 10, 2026 · Mmt · 2026/27 with revision versus October'))+'</span></div>';
  const fld=[['production',T('Produção','Production')],['exports',T('Exportação','Exports')],['end',T('Estoque final','Ending stocks')]];
  if(key==='soja')fld.splice(1,0,['crush',T('Esmagamento','Crush')]);
  let h='<div class="ce-scroll"><table class="ce-t" id="ce-w-t"><thead><tr><th class="ce-l" rowspan="2">'+esc(T('Região','Region'))+'</th>'+fld.map(f=>'<th colspan="4" class="ce-grp">'+esc(f[1])+'</th>').join('')+'</tr><tr>'+fld.map(()=>yrs.map(y=>'<th>'+esc(y.slice(2))+'</th>').join('')+'<th>Δ out</th>').join('')+'</tr></thead><tbody>';
  regs.forEach(r=>{h+='<tr class="'+(r==='World'||r==='Brazil'?'ce-tot':'')+'"><td class="ce-l">'+esc(T(REGN[r][0],REGN[r][1]))+'</td>'+fld.map(f=>{let cells='';yrs.forEach(y=>{const t=(W[y]||{})[r];const v=t?(t.Nov||t.Oct||t.Sep||t)[f[0]]:null;cells+='<td>'+(v==null?'n/d':nf(v,2))+'</td>';});const t=(W[yrs[yrs.length-1]]||{})[r];const d=t&&t.Nov&&t.Oct?t.Nov[f[0]]-t.Oct[f[0]]:null;cells+='<td class="'+tone(d)+'">'+(d==null?'n/d':sg(d,2))+'</td>';return cells;}).join('')+'</tr>';});
  h+='</tbody></table></div>';
  const wl=(W[yrs[yrs.length-1]]||{}).World,wn=wl?(wl.Nov||wl.Oct||wl.Sep||wl):null,wp=(W[yrs[yrs.length-2]]||{}).World;
  const su=wn?wn.end/(wn.domestic)*100:null,sup=wp?wp.end/wp.domestic*100:null;
  const k=wn?'<div class="ce-kpis">'+kpi(T('Produção mundial ','World output ')+yrs[yrs.length-1],nf(wn.production,1)+' Mi t',sg(wn.production-wp.production,1)+' '+T('vs safra anterior','vs prior year'))+kpi(T('Consumo mundial','World use'),nf(wn.domestic,1)+' Mi t',sg((wn.domestic/wp.domestic-1)*100,1)+'%')+kpi(T('Estoque final mundial','World ending stocks'),nf(wn.end,1)+' Mi t',T('E/C ','S/U ')+nf(su,1)+'% · '+T('antes ','prior ')+nf(sup,1)+'%')+'</div>':'';
  return '<div class="ce-ctlbar">'+ctl+'</div>'+k+card('ce-w',T('Quadro mundial','World table')+' · '+WP.find(x=>x[0]===key)[1],T('Principais países · produção, exportação e estoque final','Main countries · output, exports and ending stocks'),h,csvBtn('ce-w-t','USDA_mundo_'+key))+usCard();
}
function usCard(){
  const U=(D.wasde||{}).us||{};const BU={soja:0.0272155,milho:0.0254012},AC=0.404686;
  const one=(key,lab)=>{const t=U[key];if(!t)return '';const f=BU[key];const yl=['2024/25','2025/26','26/27 set','26/27 out','26/27 nov'];
    const r=(name,arr,fn)=>'<tr><td class="ce-l">'+esc(name)+'</td>'+arr.map((v,i)=>'<td'+(i===yl.length-1?' class="on"':'')+'>'+fn(v)+'</td>').join('')+'</tr>';
    let h='<div><h4>'+esc(lab)+'</h4><table class="ce-t"><thead><tr><th class="ce-l"></th>'+yl.map(y=>'<th>'+esc(y)+'</th>').join('')+'</tr></thead><tbody>';
    h+=r(T('Área plantada (Mi ha)','Planted area (Mha)'),t['Area Planted'],v=>nf(v*AC,2));
    h+=r(T('Produtividade (sc/ha)','Yield (bags/ha)'),t['Yield per Harvested Acre'],v=>nf(v*f*1000/AC/60,1));
    ['Beginning Stocks','Production','Crushings','Exports','Ending Stocks'].forEach(k=>{if(t[k])h+=r({'Beginning Stocks':T('Estoque inicial (Mi t)','Beginning stocks (Mmt)'),'Production':T('Produção (Mi t)','Production (Mmt)'),'Crushings':T('Esmagamento (Mi t)','Crush (Mmt)'),'Exports':T('Exportação (Mi t)','Exports (Mmt)'),'Ending Stocks':T('Estoque final (Mi t)','Ending stocks (Mmt)')}[k],t[k],v=>nf(v*f,2));});
    if(t['Ethanol & by-products'])h+=r(T('Etanol (Mi t)','Ethanol (Mmt)'),t['Ethanol & by-products'],v=>nf(v*f,2));
    h+=r(T('Estoque / uso','Stocks / use'),t['Ending Stocks'].map((e,i)=>e/t['Use, Total'][i]*100),v=>nf(v,1)+'%');
    h+=r(T('Preço ao produtor (US$/bu)','Farm price (US$/bu)'),t['Avg. Farm Price ($/bu)'],v=>nf(v,2));
    return h+'</tbody></table></div>';};
  return card('ce-us',T('Estados Unidos · soja e milho','United States · soybeans and corn'),T('WASDE em unidades métricas: bushel convertido em toneladas, acre em hectare, produtividade em sacas de 60 kg','WASDE in metric units: bushels to tonnes, acres to hectares, yield in 60 kg bags'),'<div class="ce-two">'+one('soja',T('Soja','Soybeans'))+one('milho',T('Milho','Corn'))+'</div>');
}

/* ═════════════ 6 · Trajetória ═════════════ */
function trajHTML(){
  const key=S.trProd,E=D.editions||[],sfs=['2024/25','2025/26'];if(!sfs.includes(S.trSf))S.trSf='2025/26';const sf=S.trSf;
  const prodK=key==='soja'?'Soja em grão':'Milho';
  const ctl='<div class="ce-ctl">'+seg('trProd',[['soja',T('Soja','Soybeans')],['milho',T('Milho','Corn')]],key)+seg('trSf',sfs.map(s=>[s,s]),sf)+'</div>';
  const f2=v=>v==null?'n/d':nf(v,2);
  const third=key==='soja'?['process',T('Processamento','Crush')]:['domestic',T('Uso doméstico','Domestic use')];
  let h='<div class="ce-scroll"><table class="ce-t" id="ce-tr-t"><thead><tr><th class="ce-l">'+esc(T('Edição','Edition'))+'</th><th>'+esc(T('Est. inicial','Beg. stocks'))+'</th><th>'+esc(T('Produção','Production'))+'</th><th>'+esc(third[1])+'</th><th>'+esc(T('Exportação','Exports'))+'</th><th class="ce-agr">'+esc(T('EF Agrinvest','Agrinvest end'))+'</th><th>'+esc(T('EF Conab na edição','Conab end in edition'))+'</th><th>Δ</th></tr></thead><tbody>';
  const pts=[];
  E.forEach(e=>{const t=(e[key]||{})[sf];if(!t)return;const cn=((e.conab||{})[key]||{})[sf];const ef=t.end[0],cf=cn?cn.end:null;pts.push({l:e.label,a:ef,c:cf});
    h+='<tr><td class="ce-l"><b>'+esc(e.label)+'</b></td><td>'+f2(t.begin[0])+'</td><td>'+f2(t.production[0])+'</td><td>'+f2((t[third[0]]||[])[0])+'</td><td>'+f2(t.exports[0])+'</td><td class="ce-agr"><b>'+f2(ef)+'</b></td><td>'+f2(cf)+'</td><td class="'+tone(cf==null?null:ef-cf)+'">'+(cf==null?'n/d':sg(ef-cf,2))+'</td></tr>';});
  const cnow=conabRec(prodK,sf),anow=agrRec(prodK,sf);
  if(cnow)h+='<tr class="ce-tot"><td class="ce-l">'+esc(T('Conab hoje','Conab today'))+' <small>'+esc(dBR(B.published))+'</small></td><td>'+f2(cnow.begin/1000)+'</td><td>'+f2(cnow.production/1000)+'</td><td>'+f2(cnow[third[0]]/1000)+'</td><td>'+f2(cnow.exports/1000)+'</td><td class="ce-agr">'+(anow&&anow.edited?'<b>'+f2(anow.end/1000)+'</b>':'<span class="ce-na">'+esc(T('sem premissa','no input'))+'</span>')+'</td><td><b>'+f2(cnow.end/1000)+'</b></td><td></td></tr>';
  h+='</tbody></table></div><p class="ce-note">'+esc(T('Agrinvest: Dados Úteis, quadro de oferta e demanda Agrinvest de cada edição. Conab na edição: quadro Conab reproduzido na mesma edição (quando já cobria a safra). Calendário Agrinvest: soja jan–dez, milho fev–jan.','Agrinvest: Dados Úteis, Agrinvest S&D table in each edition. Conab in edition: Conab table reproduced in the same edition (when it already covered the crop year). Agrinvest calendar: soybeans Jan–Dec, corn Feb–Jan.'))+'</p>';
  pts.push({l:T('hoje','today'),a:anow&&anow.edited?anow.end/1000:null,c:cnow?cnow.end/1000:null});
  const last=pts.filter(p=>p.a!=null).slice(-1)[0];
  const read=(key==='soja'?T('Soja ','Soybeans '):T('Milho ','Corn '))+sf+': '+T('a última edição Agrinvest (','the latest Agrinvest edition (')+(last?last.l:'n/d')+T(') projetava estoque final de ',') projected ending stocks of ')+(last?nf(last.a,2):'n/d')+' Mi t'+(cnow?T('; a Conab hoje está em ','; Conab today stands at ')+nf(cnow.end/1000,2)+' Mi t':'')+'.';
  const ab=(D.abiove||{}).traj2026||[];
  let t2='<div class="ce-scroll"><table class="ce-t" id="ce-ab-t"><thead><tr><th class="ce-l">'+esc(T('Divulgação','Release'))+'</th><th>'+esc(T('Processamento','Crush'))+'</th><th>'+esc(T('Exportação grão','Bean exports'))+'</th><th>'+esc(T('Produção farelo','Meal output'))+'</th><th>'+esc(T('Exportação farelo','Meal exports'))+'</th><th>'+esc(T('Produção óleo','Oil output'))+'</th><th>'+esc(T('Exportação óleo','Oil exports'))+'</th></tr></thead><tbody>';
  ab.forEach(r=>{const c=v=>v==null?'<span class="ce-na">'+MINUS+'</span>':nf(v/1000,2);t2+='<tr><td class="ce-l">'+esc(r.lbl||dBR(r.d))+'</td><td>'+c(r.process)+'</td><td>'+c(r.soyExports)+'</td><td>'+c(r.mealProd)+'</td><td>'+c(r.mealExports)+'</td><td>'+c(r.oilProd)+'</td><td>'+c(r.oilExports)+'</td></tr>';});
  t2+='</tbody></table></div><p class="ce-note">'+esc(T('Projeções ABIOVE para o ano civil de 2026, em Mi t, conforme divulgações à imprensa; traço = não informado na divulgação.','ABIOVE projections for calendar 2026, in Mmt, as released to the press; dash = not stated in the release.'))+'</p>';
  return '<div class="ce-ctlbar">'+ctl+'</div><p class="ce-text">'+esc(read)+'</p>'+card('ce-tr',T('Número Agrinvest por edição','Agrinvest number by edition')+' · '+(key==='soja'?T('soja','soybeans'):T('milho','corn'))+' '+sf,T('Mi t · como o número da casa se moveu contra a Conab','Mmt · how the house number moved against Conab'),h,csvBtn('ce-tr-t','Trajetoria_'+key+'_'+sf.replace('/','-')))+
    card('ce-trc',T('Estoque final por edição','Ending stocks by edition'),'','<div class="ce-chart" id="ce-tr-ch"></div>')+
    card('ce-ab',T('ABIOVE · trajetória das projeções 2026','ABIOVE · 2026 projection trajectory'),T('Complexo soja, ano civil','Soy complex, calendar year'),t2,csvBtn('ce-ab-t','ABIOVE_trajetoria_2026'));
}
function trajCharts(){const key=S.trProd,sf=S.trSf,E=D.editions||[];const prodK=key==='soja'?'Soja em grão':'Milho';const L=[],A=[],Cn=[];
  E.forEach(e=>{const t=(e[key]||{})[sf];if(!t)return;const cn=((e.conab||{})[key]||{})[sf];L.push(e.label);A.push(t.end[0]);Cn.push(cn?cn.end:null);});
  const cnow=conabRec(prodK,sf),anow=agrRec(prodK,sf);L.push(T('hoje','today'));A.push(anow&&anow.edited?+(anow.end/1000).toFixed(3):null);Cn.push(cnow?+(cnow.end/1000).toFixed(3):null);
  mount('ce-tr-ch',{xAxis:{type:'category',data:L,axisLabel:{fontSize:11}},yAxis:ax('Mi t'),tooltip:{trigger:'axis'},toolbox:{feature:{saveAsImage:{name:'trajetoria_'+key},dataView:{}}},
    series:[{name:'Agrinvest',type:'line',color:COL.teal,showSymbol:true,symbolSize:7,lineStyle:{width:2.5},data:A},{name:T('Conab','Conab'),type:'line',color:COL.navy,showSymbol:true,symbolSize:6,lineStyle:{width:2,type:'dashed'},data:Cn}]});}

/* ═════════════ 7 · Complexo soja · ABIOVE ═════════════ */
const ABP=[['soja',T('Soja em grão','Soybeans'),'Soja em grão'],['farelo',T('Farelo','Meal'),'Farelo de soja'],['oleo',T('Óleo','Oil'),'Óleo de soja']];
function abHTML(){
  const key=S.abProd,pk=(ABP.find(x=>x[0]===key)||ABP[0])[2],t=ABA[key],Y=ABA.years||[],mt=T('Mi t','Mmt'),dec=key==='oleo'?3:2;
  const ctl='<div class="ce-ctl">'+seg('abProd',ABP.map(x=>[x[0],x[1]]),key)+'<span class="ce-hint">'+esc(T('ABIOVE, ano civil · balanço atualizado em 15/10/26 · 2026 e 2027 são projeções','ABIOVE, calendar year · balance updated Oct 15, 2026 · 2026 and 2027 are projections'))+'</span></div>';
  const L=key==='soja'?[['begin','Estoque inicial','Beginning stocks'],['production','Produção','Production'],['imports','Importação','Imports'],['seeds','Sementes e outros','Seeds and other'],['process','Processamento','Crush'],['exports','Exportação','Exports'],['end','Estoque final','Ending stocks',1]]
    :[['begin','Estoque inicial','Beginning stocks'],['production','Produção','Production'],['imports','Importação','Imports'],['domestic','Consumo interno','Domestic use'],['exports','Exportação','Exports'],['end','Estoque final','Ending stocks',1]];
  const P=y=>(ABA.proj||[]).includes(y);
  let h='<div class="ce-scroll"><table class="ce-t" id="ce-abb-t"><thead><tr><th class="ce-l">'+esc(mt)+'</th>'+Y.map(y=>'<th class="'+(P(y)?'on':'')+'">'+esc(y)+(P(y)?'<small>'+esc(T('proj.','proj.'))+'</small>':'')+'</th>').join('')+'</tr></thead><tbody>';
  L.forEach(l=>{h+='<tr class="'+(l[3]?'ce-key':'')+'"><td class="ce-l">'+esc(T(l[1],l[2]))+'</td>'+t[l[0]].map((v,i)=>'<td class="'+(P(Y[i])?'on':'')+'">'+nf(v/1000,dec)+'</td>').join('')+'</tr>';});
  const recs=Y.map(y=>{const r=abRow(key,y);if(key==='soja')r.domestic=r.seeds+r.process;r.use=r.domestic+r.exports;return r;});
  h+='<tr class="ce-g"><td class="ce-l" colspan="'+(Y.length+1)+'">'+esc(T('Indicadores','Indicators'))+'</td></tr>';
  const ind=key==='soja'?[[T('Estoque / demanda','Stocks / use'),r=>nf(r.end/r.use*100,1)+'%'],[T('Esmagamento / produção','Crush / output'),r=>nf(r.process/r.production*100,1)+'%'],[T('Exportação / produção','Exports / output'),r=>nf(r.exports/r.production*100,1)+'%'],[T('Estoque em dias de uso total','Stocks in days of total use'),r=>nf(r.end/r.use*365,0)]]
    :[[T('Estoque / demanda','Stocks / use'),r=>nf(r.end/r.use*100,1)+'%'],[T('Exportação / produção','Exports / output'),r=>nf(r.exports/r.production*100,1)+'%'],[T('Consumo / produção','Domestic / output'),r=>nf(r.domestic/r.production*100,1)+'%'],[T('Estoque em dias de consumo','Stocks in days of use'),r=>nf(r.end/r.domestic*365,0)],[T('Rendimento sobre o processado','Yield on crush'),(r,i)=>nf(r.production/ABA.soja.process[i]*100,2)+'%']];
  ind.forEach(x=>{h+='<tr><td class="ce-l">'+esc(x[0])+'</td>'+recs.map((r,i)=>'<td class="'+(P(Y[i])?'on':'')+'">'+x[1](r,i)+'</td>').join('')+'</tr>';});
  h+='</tbody></table></div>';
  /* reconciliação Conab × ABIOVE × USDA */
  const ys=years(pk).filter(sf=>Y.includes(String(parseInt(sf,10)+1)));
  let r2='<div class="ce-scroll"><table class="ce-t" id="ce-abr-t"><thead><tr><th class="ce-l" rowspan="2">'+esc(T('Safra Conab · ano ABIOVE','Conab crop year · ABIOVE year'))+'</th><th colspan="3" class="ce-grp">'+esc(key==='soja'?T('Processamento','Crush'):T('Produção','Production'))+'</th><th colspan="3" class="ce-grp">'+esc(T('Exportação','Exports'))+'</th><th colspan="4" class="ce-grp">'+esc(T('Estoque final','Ending stocks'))+'</th></tr><tr><th>Conab</th><th>ABIOVE</th><th>Δ</th><th>Conab</th><th>ABIOVE</th><th>Δ</th><th>Conab</th><th>ABIOVE</th><th>USDA</th><th>Δ ABIOVE</th></tr></thead><tbody>';
  const fk=key==='soja'?'process':'production';
  ys.forEach(sf=>{const c=conabRec(pk,sf),a=abioveRec(pk,sf),u=usdaRec(pk,sf);if(!c||!a)return;const d1=(a[fk]-c[fk])/1000,d2=(a.exports-c.exports)/1000,d3=(a.end-c.end)/1000;
    r2+='<tr><td class="ce-l"><b>'+esc(sf)+'</b> <small>'+esc(a.yr)+'</small></td><td>'+nf(c[fk]/1000,dec)+'</td><td>'+nf(a[fk]/1000,dec)+'</td><td class="'+tone(d1)+'">'+sg(d1,dec)+'</td><td>'+nf(c.exports/1000,dec)+'</td><td>'+nf(a.exports/1000,dec)+'</td><td class="'+tone(d2)+'">'+sg(d2,dec)+'</td><td>'+nf(c.end/1000,dec)+'</td><td><b>'+nf(a.end/1000,dec)+'</b></td><td>'+(u?nf(u.end/1000,dec):'n/d')+'</td><td class="'+tone(d3)+'">'+sg(d3,dec)+'</td></tr>';});
  r2+='</tbody></table></div><p class="ce-note">'+esc(T('Conab: ano comercial jan–dez, mesmo calendário da ABIOVE (safra 2025/26 = ano 2026). USDA: ano-safra out–set, estoque não comparável no mesmo calendário.','Conab: Jan–Dec marketing year, same calendar as ABIOVE (2025/26 = year 2026). USDA: Oct–Sep marketing year, stocks not on the same calendar.'))+'</p>';
  /* balanço mensal da indústria */
  const IY=S.abInd==='2025'?'2025':'2026',I=(((ABD.industry||{})[IY])||{})[key]||{};const nm=(I.end||[]).length;
  const IL=key==='soja'?[['begin','Estoque inicial da indústria','Industry beginning stocks'],['acq','Aquisição de grãos (inclui importação)','Bean purchases (incl. imports)'],['process','Processamento','Crush'],['exports','Exportação da indústria','Industry exports'],['domestic','Consumo interno','Domestic use'],['end','Estoque final da indústria','Industry ending stocks',1]]
    :[['begin','Estoque inicial','Beginning stocks'],['production','Produção','Production'],['imports','Importação','Imports'],['exports','Exportação','Exports'],['domestic','Consumo interno','Domestic use'],['end','Estoque final','Ending stocks',1]];
  let h3='<div class="ce-ctl" style="margin-bottom:8px">'+seg('abInd',[['2025','2025'],['2026',T('2026 (amostra)','2026 (sample)')]],IY)+'</div><div class="ce-scroll"><table class="ce-t ce-flow" id="ce-abi-t"><thead><tr><th class="ce-l">'+esc(T('mil t','kt'))+'</th>'+MES.slice(0,nm).map((_,i)=>'<th>'+esc(mL(i))+'</th>').join('')+'<th class="ce-y">'+esc(T('Ano','Year'))+'</th></tr></thead><tbody>';
  IL.forEach(l=>{const a=I[l[0]]||[];const tot=l[0]==='begin'?a[0]:l[0]==='end'?a[a.length-1]:sum(a);h3+='<tr class="'+(l[3]?'ce-key':'')+'"><td class="ce-l">'+esc(T(l[1],l[2]))+'</td>'+a.map(v=>'<td>'+nf(v,0)+'</td>').join('')+'<td class="ce-y">'+nf(tot,0)+'</td></tr>';});
  h3+='</tbody></table></div><p class="ce-note">'+esc(T('Balanço do setor processador (ABIOVE, mil t). 2026: amostra de 90,83% do processamento, sem ajuste. Ano: soma no período publicado; estoques no início e no fim do período.','Crushing sector balance (ABIOVE, kt). 2026: sample of 90.83% of crush, unadjusted. Year: sum over the published period; stocks at start and end of period.'))+'</p>';
  /* leitura */
  const r26=recs[Y.indexOf('2026')],r25=recs[Y.indexOf('2025')],r27=recs[Y.indexOf('2027')];
  const read=(ABP.find(x=>x[0]===key)||[])[1]+': '+T('ABIOVE projeta estoque final de ','ABIOVE projects ending stocks of ')+nf(r26.end/1000,dec)+' '+mt+T(' em 2026 (',' in 2026 (')+sg((r26.end-r25.end)/1000,dec)+T(' sobre 2025) e ',' over 2025) and ')+nf(r27.end/1000,dec)+' '+mt+T(' em 2027. ',' in 2027. ')+(key==='soja'?T('O esmagamento sobe de ','Crush rises from ')+nf(r25.process/1000,1)+T(' para ',' to ')+nf(r26.process/1000,1)+T(' e ',' and ')+nf(r27.process/1000,1)+' '+mt+'.':T('Estoque em dias de consumo: ','Stocks in days of use: ')+nf(r25.end/r25.domestic*365,0)+' → '+nf(r26.end/r26.domestic*365,0)+' → '+nf(r27.end/r27.domestic*365,0)+'.');
  return '<div class="ce-ctlbar">'+ctl+'</div><p class="ce-text">'+esc(read)+'</p>'+card('ce-abb',T('Balanço anual ABIOVE','ABIOVE annual balance')+' · '+(ABP.find(x=>x[0]===key)||[])[1],T('2015 a 2027 · Mi t','2015 to 2027 · Mmt'),h,csvBtn('ce-abb-t','ABIOVE_balanco_'+key))+
    card('ce-abc',T('Estoque final por fonte','Ending stocks by source'),T('ABIOVE e Conab no mesmo calendário; USDA em out–set','ABIOVE and Conab on the same calendar; USDA on Oct–Sep'),'<div class="ce-chart" id="ce-ab-ch"></div>')+
    card('ce-abr',T('Conab × ABIOVE × USDA','Conab × ABIOVE × USDA'),T('Onde as fontes divergem, safra a safra · Mi t','Where sources diverge, year by year · Mmt'),r2,csvBtn('ce-abr-t','Conab_ABIOVE_'+key))+
    card('ce-abi',T('Balanço mensal da indústria','Monthly industry balance'),T('Setor processador · mil t','Crushing sector · kt'),h3,csvBtn('ce-abi-t','ABIOVE_industria_'+key+'_'+IY));
}
function abCharts(){
  const key=S.abProd,pk=(ABP.find(x=>x[0]===key)||ABP[0])[2],Y=ABA.years||[];
  const conab=Y.map(y=>{const sf=(parseInt(y,10)-1)+'/'+y.slice(2);const c=conabRec(pk,sf);return c?+(c.end/1000).toFixed(3):null;});
  const usda=Y.map(y=>{const sf=(parseInt(y,10)-1)+'/'+y.slice(2);const u=usdaRec(pk,sf);return u?+(u.end/1000).toFixed(3):null;});
  mount('ce-ab-ch',{legend:{selected:{USDA:false}},xAxis:{type:'category',data:Y,axisLabel:{fontSize:11}},yAxis:ax('Mi t'),tooltip:{trigger:'axis'},toolbox:{feature:{saveAsImage:{name:'estoque_fontes_'+key},dataView:{},magicType:{}}},
    series:[{name:'ABIOVE',type:'bar',color:COL.teal,data:ABA[key].end.map(v=>+(v/1000).toFixed(3))},{name:'Conab',type:'line',color:COL.navy,showSymbol:true,symbolSize:6,lineStyle:{width:2},data:conab},{name:'USDA',type:'line',color:COL.bege,showSymbol:true,symbolSize:5,lineStyle:{width:2,type:'dashed'},data:usda}]});
}

/* ═════════════ fontes ═════════════ */
function fontesHTML(){
  const src=(D.meta||{}).sources||[];
  return '<details class="ce-src"><summary>'+esc(T('Fontes e datas desta aba','Sources and dates for this tab'))+'</summary><ul>'+src.map(s=>'<li><b>'+esc(s[0])+'</b> · '+esc(s[1])+' · '+esc(dBR(s[2]))+'</li>').join('')+'</ul></details>';
}

/* ═════════════ render da tela ═════════════ */
function render(){
  const el=document.getElementById('cen-app');if(!el)return;const scr=document.getElementById('scr-cen');if(!scr||!scr.classList.contains('on'))return;
  dropCharts();
  const tabs='<div class="ce-tabs" role="tablist">'+TABS.map(t=>'<button type="button" role="tab" data-ce-tab="'+t[0]+'" class="'+(S.tab===t[0]?'on':'')+'" aria-selected="'+(S.tab===t[0])+'">'+esc(T(t[1],t[2]))+'</button>').join('')+'</div>';
  let body='';
  try{body=S.tab==='painel'?painelHTML():S.tab==='fluxo'?fluxoHTML():S.tab==='sim'?simHTML():S.tab==='outras'?odHTML():S.tab==='mundo'?mundoHTML():S.tab==='abiove'?abHTML():trajHTML();}
  catch(err){body='<p class="ce-warn">'+esc(T('Erro ao montar a aba: ','Error building the tab: ')+err.message)+'</p>';console.error(err);}
  el.innerHTML='<p class="ce-intro">'+esc(T('Balanços oficiais, número próprio Agrinvest e cenários de área e produtividade. A Conab nunca é alterada: o número da casa fica ao lado.','Official balances, Agrinvest house number and area and yield scenarios. Conab is never changed: the house number sits beside it.'))+'</p>'+tabs+body+fontesHTML();
  const h1=document.querySelector('#scr-cen .sect-h h1');if(h1)h1.textContent=T('Cenários & Estatísticas','Scenarios & Statistics');
  const nav=document.querySelector('.topmenu [data-go="scr-cen"]');if(nav)nav.textContent=T('Cenários & Estatísticas','Scenarios & Statistics');
  requestAnimationFrame(()=>{try{if(S.tab==='fluxo')fluxoCharts();else if(S.tab==='outras')odCharts();else if(S.tab==='traj')trajCharts();else if(S.tab==='abiove')abCharts();}catch(e){console.error(e);}});
  ST.ui={tab:S.tab,prod:S.prod,sf:S.sf,flowProd:S.flowProd,flowSf:S.flowSf,mode:S.mode,simProd:S.simProd,simSf:S.simSf,wProd:S.wProd,odProd:S.odProd,trProd:S.trProd,trSf:S.trSf,abProd:S.abProd,abInd:S.abInd};
}

/* ── eventos ── */
document.addEventListener('click',e=>{
  const root=e.target.closest('#cen-app');if(!root)return;
  const t=e.target.closest('[data-ce-tab]');if(t){S.tab=t.dataset.ceTab;render();return;}
  const g=e.target.closest('[data-ce-seg]');if(g){S[g.dataset.ceSeg]=g.dataset.v;render();return;}
  const c=e.target.closest('[data-ce-csv]');if(c){tableCSV(c.dataset.ceCsv,c.dataset.name);return;}
  const a=e.target.closest('[data-ce-act]');if(a){
    if(a.dataset.ceAct==='clr'){delete ST.agr[agrKey(S.prod,S.sf)];persist();render();}
    if(a.dataset.ceAct==='simreset'){delete ST.sim[S.simProd+'|'+S.simSf];persist();render();}
    return;}
  const p=e.target.closest('[data-ce-push]');if(p){const X=simData(S.simProd,S.simSf);if(!X)return;const o=X.col(X.cfg.d[+p.dataset.cePush],0);
    X.comps.forEach((cp,i)=>setAgr(S.simProd,S.simSf,cp.key,Math.round(o.ps[i]*10)/10));S.tab='painel';S.prod=S.simProd;S.sf=S.simSf;render();return;}
});
document.addEventListener('change',e=>{
  const root=e.target.closest('#cen-app');if(!root)return;const el=e.target;
  if(el.dataset.ceSel){S[el.dataset.ceSel]=el.value;if(el.dataset.ceSel==='prod')S.sf=null;render();return;}
  if(el.dataset.ceAgr){const n=parseBR(el.value);if(Number.isNaN(n)){el.classList.add('bad');el.title=T('Número inválido. Use vírgula decimal.','Invalid number. Use a decimal comma.');return;}setAgr(S.prod,S.sf,el.dataset.ceAgr,n==null?null:Math.round(n*1000*10)/10);render();return;}
  if(el.dataset.ceD!=null||el.dataset.ceMx!=null||el.dataset.ceArea){const n=parseBR(el.value);if(n==null||Number.isNaN(n)){el.classList.add('bad');return;}
    const cfg=simCfg(S.simProd,S.simSf);if(el.dataset.ceD!=null)cfg.d[+el.dataset.ceD]=n;else if(el.dataset.ceMx!=null)cfg.mx[+el.dataset.ceMx]=n;else cfg.area[el.dataset.ceArea]=n;setSim(S.simProd,S.simSf,cfg);render();}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.closest&&e.target.closest('#cen-app input')){e.target.blur();}});

/* ═════════════ Soja · Farelo, Óleo, Esmagamento ═════════════ */
const SD={tab:'prog'};let SCH=[];
function sDrop(){SCH.forEach(o=>{try{o.ro.disconnect();o.ch.dispose();}catch(e){}});SCH=[];}
function sMount(id,opt){const el=document.getElementById(id);if(!el||!window.echarts)return;const ch=window.echarts.init(el);ch.setOption(opt,true);const ro=new ResizeObserver(()=>ch.resize());ro.observe(el);SCH.push({ch,ro});}
function derivHTML(prod){
  const mdk=prod==='Farelo de soja'?'Farelo':'Óleo',dec=prod==='Óleo de soja'?3:2,mt=T('Mi t','Mmt');
  const ys=years(prod),recs=ys.map(y=>conabRec(prod,y)),cur='2026/27',ci=ys.indexOf(cur),r=recs[ci>=0?ci:recs.length-1],rp=recs[(ci>=0?ci:recs.length-1)-1];
  const k='<div class="ce-kpis">'+kpi(T('Produção ','Output ')+ys[ci],nf(r.production/1000,dec)+' '+mt,sg((r.production/rp.production-1)*100,1)+'% '+T('na safra','y/y'))+kpi(T('Exportação','Exports'),nf(r.exports/1000,dec)+' '+mt,nf(r.exports/r.production*100,1)+'% '+T('da produção','of output'))+kpi(T('Consumo interno','Domestic use'),nf(r.domestic/1000,dec)+' '+mt,nf(r.domestic/r.production*100,1)+'% '+T('da produção','of output'))+kpi(T('Estoque final','Ending stocks'),nf(r.end/1000,dec)+' '+mt,nf(r.end/r.domestic*365,0)+' '+T('dias de consumo','days of use'))+'</div>';
  const L=[['begin','Estoque inicial','Beginning stocks'],['production','Produção','Production'],['imports','Importação','Imports'],['supply','Oferta total','Total supply',1],['domestic','Consumo interno','Domestic use'],['exports','Exportação','Exports'],['use','Demanda total','Total use',1],['end','Estoque final','Ending stocks',1]];
  let h='<div class="ce-scroll"><table class="ce-t" id="sd-t-'+mdk+'"><thead><tr><th class="ce-l">'+esc(mt)+'</th>'+ys.map(y=>'<th class="'+(y===cur?'on':'')+'">'+esc(y)+'</th>').join('')+'</tr></thead><tbody>';
  L.forEach(l=>{h+='<tr class="'+(l[3]?'ce-tot':'')+'"><td class="ce-l">'+esc(T(l[1],l[2]))+'</td>'+recs.map((x,i)=>'<td class="'+(ys[i]===cur?'on':'')+'">'+nf(x[l[0]]/1000,dec)+'</td>').join('')+'</tr>';});
  const der=[[T('Exportação / produção','Exports / output'),x=>nf(x.exports/x.production*100,1)+'%'],[T('Consumo / produção','Domestic / output'),x=>nf(x.domestic/x.production*100,1)+'%'],[T('Estoque em dias de consumo','Stocks in days of use'),x=>nf(x.end/x.domestic*365,0)],[T('Rendimento sobre o grão processado','Yield on crushed beans'),(x,i)=>{const g=conabRec('Soja em grão',ys[i]);return g&&g.process?nf(x.production/g.process*100,2)+'%':'n/d';}]];
  h+='<tr class="ce-g"><td class="ce-l" colspan="'+(ys.length+1)+'">'+esc(T('Indicadores','Indicators'))+'</td></tr>';
  der.forEach(dl=>{h+='<tr><td class="ce-l">'+esc(dl[0])+'</td>'+recs.map((x,i)=>'<td class="'+(ys[i]===cur?'on':'')+'">'+dl[1](x,i)+'</td>').join('')+'</tr>';});
  h+='</tbody></table></div><p class="ce-note">'+esc(T('Fonte: ','Source: ')+srcB()+' ('+dBR(B.published)+'), planilha Suprimento - Soja; ano comercial jan–dez, estoque em 31/12.')+'</p>';
  /* comparativo de fontes */
  const uk=prod==='Farelo de soja'?'farelo':'oleo';
  const comp=[['2025/26','2026'],['2026/27','2027']].map(([sf,y])=>{const c=conabRec(prod,sf),u=usdaRow(uk,sf,'Brazil'),a=abioveRec(prod,sf);return {sf,y,c,u,a};});
  let t2='<div class="ce-scroll"><table class="ce-t" id="sd-c-'+mdk+'"><thead><tr><th class="ce-l">'+esc(mt)+'</th>'+comp.map(x=>'<th colspan="3" class="ce-grp">'+esc(x.sf)+' · '+esc(x.y)+'</th>').join('')+'</tr><tr><th class="ce-l"></th>'+comp.map(()=>'<th>Conab</th><th>USDA</th><th>ABIOVE</th>').join('')+'</tr></thead><tbody>';
  [['production',T('Produção','Production'),'p'],['exports',T('Exportação','Exports'),'e'],['domestic',T('Consumo interno','Domestic use')],['end',T('Estoque final','Ending stocks')]].forEach(l=>{
    t2+='<tr><td class="ce-l">'+esc(l[1])+'</td>'+comp.map(x=>{const uv=x.u?(x.u.Nov||x.u.Oct||x.u.Sep||x.u)[l[0]]:null;const av=x.a?x.a[l[0]]:null;return '<td>'+nf(x.c[l[0]]/1000,dec)+'</td><td>'+(uv==null?'n/d':nf(uv,dec))+'</td><td>'+(av==null?'<span class="ce-na">'+MINUS+'</span>':nf(av/1000,dec))+'</td>';}).join('')+'</tr>';});
  t2+='</tbody></table></div><p class="ce-note">'+esc(T('USDA: WASDE 677, linha Brasil, ano-safra USDA (out–set). ABIOVE: ano civil, balanço de 15/10/26 (2027 é a primeira projeção).','USDA: WASDE 677, Brazil line, USDA marketing year (Oct–Sep). ABIOVE: calendar year, balance of Oct 15, 2026 (2027 is the first projection).'))+'</p>';
  /* exportação mensal */
  const Y=2026,cutM=+CUT.split('-')[1];const cy=(MD[mdk]||{})[String(Y)]||[];const av3=MES.map((_,m)=>{const v=[1,2,3].map(d=>((MD[mdk]||{})[String(Y-d)]||[])[m]).filter(x=>x!=null);return v.length?sum(v)/v.length:null;});
  const ytd=sum(cy.slice(0,cutM)),ytd3=sum(av3.slice(0,cutM));const ann=conabRec(prod,'2025/26').exports;const pace=ann/1000;
  const read=pName(prod)+': '+T('exportação jan–','exports Jan–')+mL(cutM-1)+'/26 '+T('de ','at ')+nf(ytd/1000,2)+' '+mt+', '+sg((ytd/ytd3-1)*100,1)+T('% sobre a média de 3 anos no mesmo período. Para fechar 2026 no número Conab (',' % versus the 3-year average for the same period. To close 2026 at the Conab number (')+nf(pace,2)+' '+mt+T('), faltam ','), it still needs ')+nf((ann-ytd)/1000,2)+' '+mt+T(' em ',' over ')+(12-cutM)+T(' meses, média de ',' months, an average of ')+nf((ann-ytd)/1000/(12-cutM),2)+' '+mt+T('/mês contra ','/month versus ')+nf(sum(av3.slice(cutM))/1000/(12-cutM),2)+' '+mt+T('/mês na média de 3 anos.','/month in the 3-year average.');
  return k+'<p class="ce-text">'+esc(read)+'</p>'+card('sd-bal-'+mdk,T('Oferta e demanda','Supply and demand')+' · '+pName(prod),T('Série Conab com indicadores de destino da produção e de estoque','Conab series with output destination and stock indicators'),h,csvBtn('sd-t-'+mdk,'OD_'+mdk))+
    '<div class="ce-two">'+card('sd-ex-'+mdk,T('Exportação mensal','Monthly exports'),T('MDIC/Comex Stat · 2026 contra média de 3 anos · Mi t','MDIC/Comex Stat · 2026 versus 3-year average · Mmt'),'<div class="ce-chart" id="sd-exch-'+mdk+'"></div>')+card('sd-sh-'+mdk,T('Destino da produção','Output destination'),T('Exportação e consumo interno em % da produção · Conab','Exports and domestic use as % of output · Conab'),'<div class="ce-chart" id="sd-shch-'+mdk+'"></div>')+'</div>'+
    card('sd-cmp-'+mdk,T('Conab × USDA × ABIOVE','Conab × USDA × ABIOVE'),T('Mesma safra nas três fontes','Same crop year across the three sources'),t2,csvBtn('sd-c-'+mdk,'Fontes_'+mdk))+
    monthlyABHTML(prod,mdk)+
    card('sd-ann-'+mdk,T('Exportação anual e consumo doméstico ABIOVE','Annual exports and ABIOVE domestic use'),T('Exportação: MDIC jan–dez (2026 até ','Exports: MDIC Jan–Dec (2026 through ')+mL(cutM-1)+T(') · consumo: balanço ABIOVE, 2026 e 2027 projetados',') · use: ABIOVE balance, 2026 and 2027 projected'),'<div class="ce-chart" id="sd-annch-'+mdk+'"></div>');
}
function derivCharts(prod){
  const mdk=prod==='Farelo de soja'?'Farelo':'Óleo',Y=2026,cutM=+CUT.split('-')[1];const cy=(MD[mdk]||{})[String(Y)]||[];
  const av3=MES.map((_,m)=>{const v=[1,2,3].map(d=>((MD[mdk]||{})[String(Y-d)]||[])[m]).filter(x=>x!=null);return v.length?sum(v)/v.length:null;});
  sMount('sd-exch-'+mdk,{xAxis:{type:'category',data:MES.map((_,i)=>mL(i)),axisLabel:{fontSize:11}},yAxis:ax('Mi t'),tooltip:{trigger:'axis'},toolbox:{feature:{saveAsImage:{name:'exportacao_mensal_'+mdk},dataView:{}}},
    series:[{name:'2026',type:'bar',color:COL.navy,data:cy.map((v,i)=>i<cutM&&v>0?+(v/1000).toFixed(3):null)},{name:T('média 3 anos','3-year avg'),type:'line',color:COL.bege,showSymbol:true,symbolSize:5,lineStyle:{width:2,type:'dashed'},data:av3.map(v=>v==null?null:+(v/1000).toFixed(3))}]});
  const ys=years(prod),recs=ys.map(y=>conabRec(prod,y));
  sMount('sd-shch-'+mdk,{xAxis:{type:'category',data:ys.map(y=>y.slice(2)),axisLabel:{fontSize:11}},yAxis:ax('%'),tooltip:{trigger:'axis'},toolbox:{feature:{saveAsImage:{name:'destino_'+mdk},dataView:{}}},
    series:[{name:T('Exportação %','Exports %'),type:'line',color:COL.navy,showSymbol:true,symbolSize:6,lineStyle:{width:2},data:recs.map(r=>+(r.exports/r.production*100).toFixed(1))},{name:T('Consumo %','Domestic %'),type:'line',color:COL.bege,showSymbol:true,symbolSize:6,lineStyle:{width:2},data:recs.map(r=>+(r.domestic/r.production*100).toFixed(1))}]});
  const yrs=[];for(let y=2015;y<=2027;y++)yrs.push(String(y));const ak=prod==='Farelo de soja'?'farelo':'oleo';const cons={};(ABA.years||[]).forEach((y,i)=>cons[y]=ABA[ak].domestic[i]);
  sMount('sd-annch-'+mdk,{xAxis:{type:'category',data:yrs,axisLabel:{fontSize:11}},yAxis:ax('Mi t'),tooltip:{trigger:'axis'},toolbox:{feature:{saveAsImage:{name:'anual_'+mdk},dataView:{},magicType:{}}},
    series:[{name:T('Exportação','Exports'),type:'bar',color:COL.navy,data:yrs.map(y=>{const a=(MD[mdk]||{})[y];if(!a)return null;const s=sum(y==='2026'?a.slice(0,cutM):a);return +(s/1000).toFixed(2);})},{name:T('Consumo doméstico ABIOVE','ABIOVE domestic use'),type:'line',color:COL.teal,showSymbol:true,symbolSize:6,lineStyle:{width:2},data:yrs.map(y=>cons[y]!=null?+(cons[y]/1000).toFixed(2):null)}]});
  monthlyABCharts(prod,mdk);
}
/* consumo aparente e estoque da indústria, mês a mês (ABIOVE) */
function monthlyABHTML(prod,mdk){
  const ak=prod==='Farelo de soja'?'farelo':'oleo',C1=((ABD.consAp||{})[ak])||{},S1=((ABD.indStocks||{})[ak])||{};
  const c26=C1['2026']||[],n=c26.length,c25=(C1['2025']||[]).slice(0,n),a3=MES.slice(0,n).map((_,m)=>mavg(C1,['2023','2024','2025'],m));
  const y26=sum(c26),y25=sum(c25),y3=sum(a3),adj=y26/SAMP;
  const st=S1['2026']||[],sn=st.length,s25=(S1['2025']||[])[sn-1],s3=mavg(S1,['2022','2023','2024'],sn-1),sl=st[sn-1]/SAMP;
  const mt=T('Mi t','Mmt');
  const read=T('Consumo aparente ','Apparent use ')+(ak==='farelo'?T('de farelo','of meal'):T('de óleo','of oil'))+T(' jan–',' Jan–')+mL(n-1)+'/26: '+nf(y26/1000,2)+' '+mt+T(' na amostra (',' in the sample (')+sg((y26/y25-1)*100,1)+T('% contra 2025); ajustado pela amostra de ','% versus 2025); adjusted for the sample of ')+nf(SAMP*100,2)+'%, '+nf(adj/1000,2)+' '+mt+' ('+sg((adj/y25-1)*100,1)+'%). '+
    T('Estoque da indústria em ','Industry stocks in ')+mL(sn-1)+'/26, ajustado pela amostra: '+nf(sl/1000,2)+' '+mt+', '+sg((sl/s25-1)*100,1)+T('% contra ',' % versus ')+mL(sn-1)+'/25 '+T('e ','and ')+sg((sl/s3-1)*100,1)+T('% contra a média 2022–2024.',' % versus the 2022–2024 average.');
  return '<p class="ce-text">'+esc(read)+'</p><div class="ce-two">'+card('sd-ca-'+mdk,T('Consumo aparente mensal','Monthly apparent use'),T('ABIOVE · 2026 amostra contra 2025 e média 3 anos · mil t','ABIOVE · 2026 sample versus 2025 and 3-year average · kt'),'<div class="ce-chart" id="sd-cach-'+mdk+'"></div>')+
    card('sd-st-'+mdk,T('Estoque final da indústria','Industry ending stocks'),T('ABIOVE · fim de mês · mil t','ABIOVE · end of month · kt'),'<div class="ce-chart" id="sd-stch-'+mdk+'"></div>')+'</div>';
}
function monthlyABCharts(prod,mdk){
  const ak=prod==='Farelo de soja'?'farelo':'oleo',C1=((ABD.consAp||{})[ak])||{},S1=((ABD.indStocks||{})[ak])||{};const X=MES.map((_,i)=>mL(i));
  sMount('sd-cach-'+mdk,{xAxis:{type:'category',data:X,axisLabel:{fontSize:11}},yAxis:ax(T('mil t','kt')),tooltip:{trigger:'axis'},toolbox:{feature:{saveAsImage:{name:'consumo_aparente_'+ak},dataView:{}}},
    series:[{name:T('2026 amostra','2026 sample'),type:'bar',color:COL.navy,data:MES.map((_,m)=>(C1['2026']||[])[m]??null)},{name:'2025',type:'line',color:COL.teal,showSymbol:true,symbolSize:5,lineStyle:{width:2},data:MES.map((_,m)=>(C1['2025']||[])[m]??null)},{name:T('média 2023–2025','2023–2025 avg'),type:'line',color:COL.bege,showSymbol:false,lineStyle:{width:2,type:'dashed'},data:MES.map((_,m)=>{const v=mavg(C1,['2023','2024','2025'],m);return v==null?null:Math.round(v);})}]});
  sMount('sd-stch-'+mdk,{xAxis:{type:'category',data:X,axisLabel:{fontSize:11}},yAxis:ax(T('mil t','kt')),tooltip:{trigger:'axis'},toolbox:{feature:{saveAsImage:{name:'estoque_industria_'+ak},dataView:{}}},
    series:[{name:'2026',type:'line',color:COL.navy,showSymbol:true,symbolSize:6,lineStyle:{width:2.5},data:MES.map((_,m)=>(S1['2026']||[])[m]??null)},{name:'2025',type:'line',color:COL.teal,showSymbol:true,symbolSize:5,lineStyle:{width:2},data:MES.map((_,m)=>(S1['2025']||[])[m]??null)},{name:T('média 2022–2024','2022–2024 avg'),type:'line',color:COL.bege,showSymbol:false,lineStyle:{width:2,type:'dashed'},data:MES.map((_,m)=>{const v=mavg(S1,['2022','2023','2024'],m);return v==null?null:Math.round(v);})}]});
}
function crushHTML(){
  const cm=ABD.crushM||{},mt=T('Mi t','Mmt'),n=(cm['2026']||[]).length;
  const ytd=sum(cm['2026']||[]),adj=ytd/SAMP,y25=sum((cm['2025']||[]).slice(0,n)),proj=(AB['2026']||{}).process,p27=(AB['2027']||{}).process,a25=(AB['2025']||{}).process;
  const run=adj/n*12,rem=(proj-adj)/(12-n),rem25=sum((cm['2025']||[]).slice(n))/(12-n);
  const k='<div class="ce-kpis">'+kpi(T('ABIOVE 2026','ABIOVE 2026'),nf(proj/1000,2)+' '+mt,sg((proj/a25-1)*100,1)+'% '+T('sobre 2025','over 2025'))+kpi(T('Jan–','Jan–')+mL(n-1)+'/26 '+T('ajustado','adjusted'),nf(adj/1000,2)+' '+mt,T('amostra ','sample ')+nf(ytd/1000,2)+' ÷ '+nf(SAMP*100,2)+'% · '+sg((adj/y25-1)*100,1)+'% a/a')+kpi(T('Conab 2025/26','Conab 2025/26'),nf(conabRec('Soja em grão','2025/26').process/1000,2)+' '+mt,sg((conabRec('Soja em grão','2025/26').process-proj)/1000,2)+' '+mt+T(' contra ABIOVE',' versus ABIOVE'))+kpi(T('ABIOVE 2027','ABIOVE 2027'),nf(p27/1000,2)+' '+mt,sg((p27/proj-1)*100,1)+'% '+T('sobre 2026','over 2026'))+'</div>';
  const read=T('Esmagamento: a amostra ABIOVE soma ','Crush: the ABIOVE sample adds up to ')+nf(ytd/1000,2)+' '+mt+T(' de jan a ',' from Jan to ')+mL(n-1)+'/26; '+T('ajustada pela cobertura de ','adjusted for coverage of ')+nf(SAMP*100,2)+'%, '+nf(adj/1000,2)+' '+mt+' ('+sg((adj/y25-1)*100,1)+T('% sobre o mesmo período de 2025). No ritmo atual, o ano fecha em ','% over the same period of 2025). At the current pace the year closes at ')+nf(run/1000,1)+' '+mt+T(', contra projeção de ',', versus a projection of ')+nf(proj/1000,1)+'. '+T('Para bater a projeção, faltam ','To hit the projection, it still needs ')+nf(rem/1000,2)+' '+mt+T('/mês até dez, contra ','/month through Dec, versus ')+nf(rem25/1000,2)+T(' no mesmo período de 2025.',' in the same period of 2025.')+(function(){const s=((ABD.indStocks||{}).soja||{});const a=s['2026']||[],m=a.length-1;if(m<0)return '';const v=a[m]/SAMP,p=(s['2025']||[])[m];return ' '+T('Estoque de grão na indústria em ','Bean stocks at the industry in ')+mL(m)+'/26, '+T('ajustado: ','adjusted: ')+nf(v/1000,2)+' '+mt+' ('+sg((v/p-1)*100,1)+T('% contra ',' % versus ')+mL(m)+'/25).';})();
  const ys=years('Soja em grão');const yl=ys.map(y=>{const g=conabRec('Soja em grão',y),f=conabRec('Farelo de soja',y),o=conabRec('Óleo de soja',y);return {y,p:g.process,f:f?f.production:null,o:o?o.production:null};});
  let h='<div class="ce-scroll"><table class="ce-t" id="sd-cr-t"><thead><tr><th class="ce-l">'+esc(T('Safra Conab','Conab crop year'))+'</th><th>'+esc(T('Processamento','Crush'))+'<small>Mi t</small></th><th>'+esc(T('Farelo','Meal'))+'<small>Mi t</small></th><th>'+esc(T('Óleo','Oil'))+'<small>Mi t</small></th><th>'+esc(T('Rend. farelo','Meal yield'))+'</th><th>'+esc(T('Rend. óleo','Oil yield'))+'</th><th>'+esc(T('ABIOVE ano civil','ABIOVE calendar'))+'<small>Mi t</small></th><th>'+esc(T('Rend. ABIOVE','ABIOVE yield'))+'<small>'+esc(T('farelo · óleo','meal · oil'))+'</small></th><th>Δ Conab '+MINUS+' ABIOVE</th></tr></thead><tbody>';
  yl.forEach(r=>{const yy=String(parseInt(r.y,10)+1);const a=AB[yy]||{};const ab=a.process;h+='<tr><td class="ce-l"><b>'+esc(r.y)+'</b></td><td>'+nf(r.p/1000,2)+'</td><td>'+nf(r.f/1000,2)+'</td><td>'+nf(r.o/1000,3)+'</td><td>'+nf(r.f/r.p*100,2)+'%</td><td>'+nf(r.o/r.p*100,2)+'%</td><td>'+(ab==null?'n/d':nf(ab/1000,2)+((ABA.proj||[]).includes(yy)?'<small> '+esc(T('proj.','proj.'))+'</small>':''))+'</td><td>'+(ab?nf(a.mealProd/ab*100,1)+' · '+nf(a.oilProd/ab*100,1):'n/d')+'</td><td class="'+tone(ab==null?null:(r.p-ab)/1000)+'">'+(ab==null?'n/d':sg((r.p-ab)/1000,2))+'</td></tr>';});
  const u=['2024/25','2025/26','2026/27'].map(y=>usdaRow('soja',y,'Brazil')).filter(Boolean);
  h+='</tbody></table></div><p class="ce-note">'+esc(T('Conab: ano comercial jan–dez (safra 2025/26 = ano 2026). ABIOVE: ano civil, balanço de 15/10/26. USDA Brasil esmagamento: ','Conab: Jan–Dec marketing year (2025/26 = year 2026). ABIOVE: calendar year, balance of Oct 15, 2026. USDA Brazil crush: ')+u.map((x,i)=>['24/25','25/26','26/27'][i]+' '+nf((x.Nov||x.Oct||x.Sep||x).crush,1)).join(' · ')+' Mi t.')+'</p>';
  /* mapa de calor mensal 2012–2026 */
  const YS=Object.keys(cm).sort();const all=[];YS.forEach(y=>cm[y].forEach(v=>all.push(v)));const lo=Math.min(...all),hi=Math.max(...all);
  let hm='<div class="ce-scroll"><table class="ce-t ce-heat" id="sd-hm-t"><thead><tr><th class="ce-l">'+esc(T('mil t','kt'))+'</th>'+YS.map(y=>'<th>'+esc(y)+(y==='2026'?'<small>'+esc(T('amostra','sample'))+'</small>':'')+'</th>').join('')+'</tr></thead><tbody>';
  MES.forEach((_,m)=>{hm+='<tr><td class="ce-l">'+esc(mL(m))+'</td>'+YS.map(y=>{const v=cm[y][m];if(v==null)return '<td></td>';const t=(v-lo)/(hi-lo);return '<td style="background:rgba(13,148,136,'+(0.06+0.5*t).toFixed(3)+')">'+nf(v,0)+'</td>';}).join('')+'</tr>';});
  hm+='<tr class="ce-tot"><td class="ce-l">'+esc(T('Total','Total'))+'</td>'+YS.map(y=>'<td>'+nf(sum(cm[y]),0)+'</td>').join('')+'</tr></tbody></table></div><p class="ce-note">'+esc(T('ABIOVE, evolução do processamento de soja. 2026 mensal = amostra de ','ABIOVE, soybean crush evolution. 2026 monthly = sample of ')+nf(SAMP*100,2)+T('% do processamento no Brasil.','% of Brazil crush.'))+'</p>';
  return k+'<p class="ce-text">'+esc(read)+'</p><div class="ce-two">'+card('sd-cra',T('Processamento anual','Annual crush'),T('ABIOVE, ano civil · Mi t','ABIOVE, calendar year · Mmt'),'<div class="ce-chart" id="sd-crach"></div>')+card('sd-crm',T('Processamento mensal','Monthly crush'),T('2026 ajustado pela amostra contra 2025 e média 2023–2025 · mil t','2026 sample-adjusted versus 2025 and 2023–2025 average · kt'),'<div class="ce-chart" id="sd-crmch"></div>')+'</div>'+
    card('sd-hm',T('Processamento mensal 2012–2026','Monthly crush 2012–2026'),T('ABIOVE · mil t','ABIOVE · kt'),hm,csvBtn('sd-hm-t','ABIOVE_processamento_mensal'))+
    card('sd-cr',T('Rendimento e conferência entre fontes','Yield and cross-source check'),T('Conab Suprimento - Soja contra ABIOVE','Conab Suprimento - Soja versus ABIOVE'),h,csvBtn('sd-cr-t','Esmagamento'));
}
function crushCharts(){
  const cm=ABD.crushM||{},Y=[];for(let y=2012;y<=2027;y++)Y.push(String(y));
  const act=y=>{if(AB[y]&&!(ABA.proj||[]).includes(y))return AB[y].process;const a=cm[y];return a&&a.length===12?sum(a):null;};
  sMount('sd-crach',{xAxis:{type:'category',data:Y.map(y=>y.slice(2)),axisLabel:{fontSize:11}},yAxis:ax('Mi t'),tooltip:{trigger:'axis'},toolbox:{feature:{saveAsImage:{name:'esmagamento_anual'},dataView:{}}},
    series:[{name:T('Realizado','Actual'),type:'bar',stack:'a',color:COL.navy,data:Y.map(y=>{const v=act(y);return v==null?null:+(v/1000).toFixed(2);})},{name:T('Projeção ABIOVE','ABIOVE projection'),type:'bar',stack:'a',color:COL.bege,data:Y.map(y=>(ABA.proj||[]).includes(y)&&AB[y]?+(AB[y].process/1000).toFixed(2):null)}]});
  sMount('sd-crmch',{xAxis:{type:'category',data:MES.map((_,i)=>mL(i)),axisLabel:{fontSize:11}},yAxis:ax(T('mil t','kt')),tooltip:{trigger:'axis'},toolbox:{feature:{saveAsImage:{name:'esmagamento_mensal'},dataView:{}}},
    series:[{name:T('2026 ajustado','2026 adjusted'),type:'bar',color:COL.navy,data:MES.map((_,m)=>{const v=(cm['2026']||[])[m];return v==null?null:Math.round(v/SAMP);})},{name:'2025',type:'line',color:COL.teal,showSymbol:true,symbolSize:5,lineStyle:{width:2},data:cm['2025']||[]},{name:T('média 2023–2025','2023–2025 avg'),type:'line',color:COL.bege,showSymbol:false,lineStyle:{width:2,type:'dashed'},data:MES.map((_,m)=>Math.round(mavg(cm,['2023','2024','2025'],m)))}]});
}

function sojaRender(){
  const scr=document.getElementById('scr-soja');if(!scr)return;
  let bar=document.getElementById('soja-sub'),box=document.getElementById('soja-deriv'),grid=document.getElementById('grid-soja');
  if(!bar){const hd=scr.querySelector('.sect-h');bar=document.createElement('div');bar.id='soja-sub';bar.className='subtabs ce-soysub';hd.insertAdjacentElement('afterend',bar);}
  if(!box){box=document.createElement('div');box.id='soja-deriv';box.className='ce-deriv';scr.appendChild(box);}
  const tabs=[['prog',T('Progresso de safra','Crop progress')],['farelo',T('Farelo','Meal')],['oleo',T('Óleo','Oil')],['crush',T('Esmagamento','Crush')]];
  bar.innerHTML=tabs.map(t=>'<button type="button" data-sdtab="'+t[0]+'" class="'+(SD.tab===t[0]?'active':'')+'">'+esc(t[1])+'</button>').join('');
  sDrop();
  scr.classList.toggle('ce-dmode',SD.tab!=='prog');
  if(SD.tab==='prog'){box.style.display='none';box.innerHTML='';return;}
  box.style.display='';
  try{box.innerHTML=SD.tab==='crush'?crushHTML():derivHTML(SD.tab==='farelo'?'Farelo de soja':'Óleo de soja');}catch(err){box.innerHTML='<p class="ce-warn">'+esc(err.message)+'</p>';console.error(err);}
  requestAnimationFrame(()=>{try{if(SD.tab==='crush')crushCharts();else derivCharts(SD.tab==='farelo'?'Farelo de soja':'Óleo de soja');}catch(e){console.error(e);}});
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-sdtab]');if(b){SD.tab=b.dataset.sdtab;sojaRender();return;}const c=e.target.closest('#soja-deriv [data-ce-csv]');if(c)tableCSV(c.dataset.ceCsv,c.dataset.name);});

/* ── inicialização ── */
function startup(){
  const pane=document.getElementById('scr-cen');
  if(pane){new MutationObserver(()=>{if(pane.classList.contains('on'))render();else dropCharts();}).observe(pane,{attributes:true,attributeFilter:['class']});if(pane.classList.contains('on'))render();}
  const soy=document.getElementById('scr-soja');
  if(soy){sojaRender();new MutationObserver(()=>{if(soy.classList.contains('on')&&SD.tab!=='prog')sojaRender();}).observe(soy,{attributes:true,attributeFilter:['class']});}
  new MutationObserver(()=>{if(pane&&pane.classList.contains('on'))render();if(soy)sojaRender();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  persist();
}
window.BRZCEN={render,agrRec,conabRec,usdaRec,flowSoja,flowMilho,simData,state:ST};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startup,{once:true});else startup();
})();

