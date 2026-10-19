const $=s=>document.querySelector(s), cop=n=>'$'+n.toLocaleString('es-CO')+' COP';
const CINES={cc:'Cine Colombia',cm:'Cinemark',rf:'Royal Films'};
const SEDE={cc:'Alamedas del Sinú',cm:'Buenavista',rf:'Nuestro Montería'};
const COMBOS={
 cc:[
  {name:'Personal',items:'Crispetas pequeñas + bebida',serves:1,min:25000,max:35000},
  {name:'Para dos',items:'Crispetas grandes + 2 bebidas',serves:2,min:45000,max:65000},
  {name:'Con comida',items:'Crispetas + bebida + perro caliente',serves:1,min:35000,max:50000}
 ],
 cm:[
  {name:'Combo Kids',items:'Crispetas pequeñas + bebida pequeña + chocolatina',serves:1,min:27800,max:27800},
  {name:'Combo Para Mí',items:'Crispetas pequeñas + bebida mediana + perro caliente',serves:1,min:33800,max:33800},
  {name:'Combo Mío',items:'Crispetas grandes + bebida grande',serves:1,min:45300,max:45300},
  {name:'Combo Tú y Yo',items:'Crispetas grandes + 2 bebidas grandes',serves:2,min:62800,max:62800},
  {name:'Combo Amigos',items:'Crispetas grandes + 2 bebidas grandes + 2 perros calientes',serves:2,min:93700,max:93700}
 ],
 rf:[
  {name:'Personal',items:'Crispetas + bebida',serves:1,min:25000,max:35000},
  {name:'Para dos',items:'Crispetas grandes + 2 bebidas',serves:2,min:45000,max:65000},
  {name:'Con comida',items:'Crispetas + bebida + perro caliente o nachos',serves:1,min:35000,max:50000},
  {name:'Familiar',items:'Crispetas grandes + 2 bebidas + 2 comidas',serves:2,min:70000,max:95000}
 ]
};

function mejorPlanCombos(cinema,people){
 const options=COMBOS[cinema],plans=Array(people+1).fill(null);
 plans[0]={cost:0,counts:Array(options.length).fill(0)};
 for(let covered=0;covered<people;covered++){
  if(!plans[covered])continue;
  options.forEach((combo,index)=>{
   const next=Math.min(people,covered+combo.serves);
   const cost=plans[covered].cost+(combo.min+combo.max)/2;
   if(!plans[next]||cost<plans[next].cost){
    const counts=[...plans[covered].counts];
    counts[index]++;
    plans[next]={cost,counts};
   }
  });
 }
 const counts=plans[people].counts;
 return {
  items:counts.flatMap((count,index)=>count?[{combo:options[index],count}]:[]),
  min:counts.reduce((sum,count,index)=>sum+count*options[index].min,0),
  max:counts.reduce((sum,count,index)=>sum+count*options[index].max,0)
 };
}

/* Afluencia por día (lunes=0) */
const DIAS=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const AF=['baja','alta','alta','baja','media','alta','alta'].map(n=>({n}));
const COL={baja:'text-emerald-300',media:'text-orange-300',alta:'text-red-300'};

/* Calculadora: la hora es el único dato de horario, el precio sale de ella */
$('#cDia').innerHTML=DIAS.map((d,i)=>`<option value="${i}">${d}</option>`).join('');
function precio(k,dia,fr){
 if(dia<4&&fr==='m')return {p:7000,matine:true};
 const fin=dia>=4; let p;
 if(k==='cc')p=fr==='n'?16400:fr==='t'?18800:16000;
 if(k==='cm')p=fin?17400:17000;
 if(k==='rf')p=14000+1500;
 return {p,matine:false};}
$('#cBtn').onclick=()=>{
 const personas=$('#cPers');
 if(!personas.reportValidity())return;
 const n=+personas.value,dia=+$('#cDia').value,fr=$('#cFranja').value;
 const r=Object.keys(CINES).map(k=>{const x=precio(k,dia,fr);return {k,...x,tot:x.p*n};});
 const combos=Object.keys(CINES).map(k=>{
  const plan=mejorPlanCombos(k,n);
  const entrada=r.find(x=>x.k===k).tot;
  return {k,plan,min:entrada+plan.min,max:entrada+plan.max,estimate:entrada+(plan.min+plan.max)/2};
 });
 const mejor=[...combos].sort((x,y)=>x.estimate-y.estimate)[0];
 const barato=[...r].sort((a,b)=>a.tot-b.tot)[0],a=AF[dia];
 $('#cOut').innerHTML=`<div class="w-full text-left fade">
  <p class="text-sm text-zinc-300">Te recomendamos</p>
  <p class="text-2xl font-black text-emerald-300">${CINES[barato.k]} · ${SEDE[barato.k]}</p>
  <p class="text-3xl font-black mt-2">${cop(barato.tot)}</p>
  <p class="text-sm text-zinc-300">${n} ${n===1?'persona':'personas'} · ${cop(barato.p)} c/u${barato.matine?' (matiné)':''}</p>
  <p class="mt-3 text-sm ${COL[a.n]}">Afluencia ${DIAS[dia].toLowerCase()}: ${a.n}</p>
  <h3 class="font-bold mt-5 mb-2">Total con entrada y combos</h3>
  <div class="space-y-2 text-sm">${combos.map(x=>`<div class="flex justify-between gap-3 border-t border-zinc-700 pt-2">
   <span>${CINES[x.k]}${x.k===mejor.k?' <b class="text-emerald-300">· menor</b>':''}</span><b>${cop(x.min)}–${cop(x.max)}</b></div>`).join('')}</div>
  <p class="text-xs text-zinc-400 mt-3">Combos de referencia. Confirma precios y porciones en la sede.</p></div>`;
};

/* Cartelera: sale de data/cartelera-monteria.json, que actualiza el robot cada día */
const RUTA_DATOS='../data/cartelera-monteria.json';
const CINE_A_CLAVE={'cm-buenavista':'cm','rf-nuestro-monteria':'rf'};
let DATOS=null,PEL=[],sel='Todas',diaSel=null;
const filtroPelicula=$('#filtroPelicula'),filtroDia=$('#filtroDia');

const clave=t=>t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim().replace(/^(el|la|los|las) /,'');
const bonito=t=>t===t.toUpperCase()?t.toLowerCase().replace(/(^|[\s:(])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase()).replace(/ (De|La|El|Los|Las|Y|Del|En|Vs) /g,m=>m.toLowerCase()):t;
function hora12(h){const [H,M]=h.split(':').map(Number),suf=H>=12?'p. m.':'a. m.';return `${H%12||12}:${String(M).padStart(2,'0')} ${suf}`;}
const hoyBogota=()=>new Date(Date.now()-5*3600e3).toISOString().slice(0,10);
const ahoraBogota=()=>new Date(Date.now()-5*3600e3).toISOString().slice(11,16);
const nombreFecha=f=>{const d=new Date(f+'T12:00:00Z'),i=(d.getUTCDay()+6)%7;return `${DIAS[i]} ${d.getUTCDate()}/${d.getUTCMonth()+1}`;};

function armarPeliculas(d){
 const grupos=new Map();
 const porId=new Map(d.peliculas.map(p=>[p.id,p]));
 d.funciones.forEach(f=>{
  const p=porId.get(f.pelicula);if(!p)return;
  const k=clave(p.titulo);
  if(!grupos.has(k))grupos.set(k,{titulos:[],dur:p.duracion_min,funciones:[]});
  const g=grupos.get(k);
  if(!g.titulos.includes(p.titulo))g.titulos.push(p.titulo);
  g.dur=g.dur||p.duracion_min;
  g.imagen=g.imagen||p.imagen||null;
  g.funciones.push(f);
 });
 // La imagen se busca entre todos los títulos que coinciden: así la de Cinemark sirve también para Royal
 return [...grupos.values()].map(g=>({n:bonito(g.titulos.find(t=>t!==t.toUpperCase())||g.titulos[0]),dur:g.dur,funciones:g.funciones,imagen:g.imagen||null}))
  .sort((a,b)=>a.n.localeCompare(b.n,'es'));
}
function funcionesDe(p,k,dia){
 const lim=dia===hoyBogota()?ahoraBogota():'00:00';
 return p.funciones.filter(f=>CINE_A_CLAVE[f.cine]===k&&f.fecha===dia).sort((a,b)=>a.hora.localeCompare(b.hora)).map(f=>({...f,pasada:f.hora<lim}));
}
function chipFuncion(f){
 const precio=f.precio?cop(f.precio).replace(' COP',''):'precio por confirmar';
 return `<span class="func ${f.pasada?'func-pasada':''}"><b>${hora12(f.hora)}</b><small>${precio}</small></span>`;
}
function drawPel(){
 if(!DATOS)return;
 const lista=PEL.filter(p=>(sel==='Todas'||p.n===sel)&&p.funciones.some(f=>f.fecha===diaSel));
 $('#peliculasLista').innerHTML=lista.length?lista.map(p=>`<article class="card p-4 fade poster-card">
  ${p.imagen?`<img src="${p.imagen}" alt="Póster de ${p.n}" loading="lazy" referrerpolicy="no-referrer" class="poster-img">`:''}
  <div class="poster-info">
  <h3 class="text-xl font-black text-amber-300">${p.n}</h3>
  <p class="text-xs text-zinc-400 mt-1">${p.dur?p.dur+' min':''}</p>
  <div class="grid md:grid-cols-3 gap-4 mt-3">${['cc','cm','rf'].map(k=>{const fs=funcionesDe(p,k,diaSel);return `<div><p class="text-sm font-bold text-emerald-300">${CINES[k]}</p>
   <div class="flex flex-wrap gap-1.5 mt-2">${fs.length?fs.map(chipFuncion).join(''):'<span class="text-sm text-zinc-500">Sin función</span>'}</div></div>`;}).join('')}</div>
  <button type="button" class="btn mt-4 w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-lg" data-elegir="${PEL.indexOf(p)}">Calcular para esta película</button></div></article>`).join(''):'<p class="text-zinc-400">No hay funciones para ese día.</p>';
 document.querySelectorAll('#peliculasLista [data-elegir]').forEach(b=>b.onclick=()=>{
  const p=PEL[+b.dataset.elegir];
  filtroPelicula.value=p.n;sel=p.n;drawPel();
  $('#calculadora').scrollIntoView({behavior:'smooth',block:'start'});
 });
}
function llenarPeliculas(){
 const delDia=PEL.filter(p=>p.funciones.some(f=>f.fecha===diaSel));
 filtroPelicula.innerHTML=['Todas',...delDia.map(p=>p.n)].map(n=>`<option value="${n}">${n==='Todas'?'Todas las películas':n}</option>`).join('');
 if(!delDia.some(p=>p.n===sel))sel='Todas';
 filtroPelicula.value=sel;
}
filtroDia.onchange=()=>{diaSel=filtroDia.value;llenarPeliculas();drawPel();};
filtroPelicula.onchange=()=>{sel=filtroPelicula.value;drawPel();};
function estadoDatos(d){
 const f=new Date(d.actualizado),fecha=f.toLocaleString('es-CO',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit',timeZone:'America/Bogota'});
 const malas=Object.entries(d.fuentes).filter(([n,s])=>!s.ok&&n!=='cine_colombia').map(([n])=>n);
 const dias=(Date.now()-f.getTime())/864e5;
 $('#estadoDatos').textContent=`Cartelera de Cinemark y Royal Films, actualizada el ${fecha}.`+(malas.length?` Una fuente falló (${malas.join(', ')}).`:'')+(dias>2?' Tiene más de dos días: confirma en el cine.':'')+' Cine Colombia no está conectado.';
}
fetch(RUTA_DATOS).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();}).then(d=>{
 DATOS=d;PEL=armarPeliculas(d);
 const hoy=hoyBogota(),dias=[...new Set(d.funciones.map(f=>f.fecha))].filter(x=>x>=hoy).sort();
 if(!dias.length)throw new Error('sin fechas vigentes');
 diaSel=dias[0];
 filtroDia.innerHTML=dias.map(x=>`<option value="${x}">${x===hoy?'Hoy · ':''}${nombreFecha(x)}</option>`).join('');
 llenarPeliculas();estadoDatos(d);drawPel();
}).catch(()=>{
 $('#estadoDatos').textContent='No se pudo cargar la cartelera. Sirve la carpeta con un servidor local (python -m http.server).';
 $('#peliculasLista').innerHTML='';
});
