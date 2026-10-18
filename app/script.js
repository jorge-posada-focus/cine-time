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

/* Tarifas */
const tarifas=[
 {id:'cc',base:'~$15.000 – $17.000',rows:[['Franja pico (5:00–7:59 p.m.)','$18.800'],['Nocturna especial (desde 8:00 p.m.)','$16.400']]},
 {id:'cm',base:'~$16.000 – $18.000',rows:[['Fin de semana / festivos (2D)','$17.400']]},
 {id:'rf',base:'~$13.000 – $15.000',rows:[['Entrada base más barata','$11.000 – $15.000'],['Recargo digital web','+$1.500 por boleta']],best:true}];
$('#tarifas').innerHTML=tarifas.map(t=>`<div class="card p-5 ${t.best?'ring-1 ring-amber-400/60':''}">
 ${t.best?'<span class="text-xs bg-amber-400 text-black font-bold px-2 py-0.5 rounded-full">Precio base más bajo</span>':''}
 <h3 class="font-black text-lg mt-2">${CINES[t.id]}</h3><p class="text-xs text-zinc-400">${SEDE[t.id]}</p>
 <p class="mt-3 text-sm text-zinc-300">Entrada regular aproximada</p><p class="text-2xl font-black text-emerald-400">${t.base} <span class="text-xs text-zinc-400">COP</span></p>
 <ul class="mt-3 space-y-2 text-sm">${t.rows.map(r=>`<li class="flex justify-between gap-3 border-t border-zinc-800 pt-2"><span class="text-zinc-400">${r[0]}</span><b class="text-amber-300 text-right">${r[1]}</b></li>`).join('')}</ul></div>`).join('');

$('#listaCombos').innerHTML=Object.keys(COMBOS).map(k=>`<article class="card p-5">
 <div class="flex items-start justify-between gap-3">
  <div><h3 class="font-black text-lg text-emerald-300">${CINES[k]}</h3><p class="text-sm text-zinc-400">${SEDE[k]}</p></div>
  <span class="text-xs rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">${k==='cm'?'Referencia publicada':'Estimado'}</span>
 </div>
 <ul class="mt-4 space-y-3">${COMBOS[k].map(combo=>`<li class="rounded-lg bg-zinc-900 p-3">
  <div class="flex justify-between items-start gap-3"><b>${combo.name}</b><b class="text-amber-300 text-right whitespace-nowrap">${combo.min===combo.max?cop(combo.min):`${cop(combo.min)}–${cop(combo.max)}`}</b></div>
  <p class="text-sm text-zinc-300 mt-1">${combo.items}</p>
 </li>`).join('')}</ul>
</article>`).join('');

/* Aforo */
const DIAS=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const AF=[
 {n:'baja',t:'Baja afluencia – salas despejadas',d:'Retorno a la rutina. Horario ideal: 2:00 p.m. a 4:30 p.m.'},
 {n:'alta',t:'Alta afluencia – salas llenas / largas filas',d:'Día de promoción: espera filas y salas muy ocupadas.'},
 {n:'alta',t:'Alta afluencia – salas llenas / largas filas',d:'Día de promoción: espera filas y salas muy ocupadas.'},
 {n:'baja',t:'Baja afluencia – salas despejadas',d:'Víspera de estrenos. Horario ideal: 2:00 p.m. a 4:30 p.m.'},
 {n:'media',t:'Afluencia media-alta',d:'Arranca el fin de semana: la noche se llena. Prefiere la tarde temprano.'},
 {n:'alta',t:'Alta afluencia – salas llenas / largas filas',d:'Fin de semana completo: reserva con anticipación.'},
 {n:'alta',t:'Alta afluencia – salas llenas / largas filas',d:'Fin de semana completo: reserva con anticipación.'}];
const COL={baja:['bg-emerald-500','text-emerald-300',''],media:['bg-orange-500','text-orange-300',''],alta:['bg-red-500','text-red-300','']};
$('#dias').innerHTML=DIAS.map((d,i)=>`<button type="button" data-i="${i}" aria-label="${d}" aria-pressed="false" class="btn dia card py-3 text-center"><div class="text-xs md:text-sm font-bold">${d}</div><div class="h-2 w-2/3 mx-auto mt-2 rounded-full ${COL[AF[i].n][0]}"></div></button>`).join('');
function showDia(i){const a=AF[i],c=COL[a.n];
 $('#diaInfo').innerHTML=`<div class="flex items-center gap-2 flex-wrap"><b class="text-lg">${DIAS[i]}</b><span class="${c[0]} text-black text-xs font-bold px-2 py-1 rounded-full">${c[2]} ${a.n.toUpperCase()}</span></div><p class="mt-2 ${c[1]} font-semibold">${a.t}</p><p class="text-zinc-400 text-sm mt-1">${a.d}${i<4?' Matiné $7.000 COP antes de las 3:00 p.m.':''}</p>`;
 document.querySelectorAll('.dia').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.i===i)));
 $('#diaInfo').classList.remove('fade');void $('#diaInfo').offsetWidth;$('#diaInfo').classList.add('fade');}
document.querySelectorAll('.dia').forEach(b=>b.onclick=()=>showDia(+b.dataset.i));showDia(0);

/* Cartelera: sale de data/cartelera-monteria.json, que actualiza el robot cada día */
const RUTA_DATOS='../data/cartelera-monteria.json';
const CINE_A_CLAVE={'cm-buenavista':'cm','rf-nuestro-monteria':'rf'};
let DATOS=null,PEL=[],FUNC=[],sel='Todas',diaSel=null;
let peliculaSeleccionada=null;
const filtroPelicula=$('#filtroPelicula'),filtroDia=$('#filtroDia');

const clave=t=>t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim().replace(/^(el|la|los|las) /,'');
const bonito=t=>t===t.toUpperCase()?t.toLowerCase().replace(/(^|[\s:(])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase()).replace(/ (De|La|El|Los|Las|Y|Del|En|Vs) /g,m=>m.toLowerCase()):t;
function hora12(h){const [H,M]=h.split(':').map(Number),suf=H>=12?'p. m.':'a. m.';return `${H%12||12}:${String(M).padStart(2,'0')} ${suf}`;}
function horaFin(h,min){if(!min)return null;const t=(+h.slice(0,2))*60+(+h.slice(3))+min+12;const r=t%1440;return hora12(`${Math.floor(r/60)}:${String(r%60).padStart(2,'0')}`);}
const hoyBogota=()=>new Date(Date.now()-5*3600e3).toISOString().slice(0,10);
const ahoraBogota=()=>new Date(Date.now()-5*3600e3).toISOString().slice(11,16);
const nombreFecha=f=>{const d=new Date(f+'T12:00:00Z'),i=(d.getUTCDay()+6)%7;return `${DIAS[i]} ${d.getUTCDate()}/${d.getUTCMonth()+1}`;};

function armarPeliculas(d){
 const grupos=new Map();
 const porId=new Map(d.peliculas.map(p=>[p.id,p]));
 d.funciones.forEach(f=>{
  const p=porId.get(f.pelicula);if(!p)return;
  const k=clave(p.titulo);
  if(!grupos.has(k))grupos.set(k,{n:p.titulo,titulos:[],dur:p.duracion_min,funciones:[]});
  const g=grupos.get(k);
  if(!g.titulos.includes(p.titulo))g.titulos.push(p.titulo);
  g.dur=g.dur||p.duracion_min;
  g.funciones.push({...f,dur:p.duracion_min,clas:p.clasificacion});
 });
 return [...grupos.values()].map(g=>{
  g.n=bonito(g.titulos.find(t=>t!==t.toUpperCase())||g.titulos[0]);
  g.clas=(g.funciones.map(f=>f.clas).find(c=>c&&!/^(TBC|Pendiente)$/.test(c))||'')
   .replace('Para mayores de ','+').replace(' años','').replace('Para todo público','Todo público');
  return g;
 }).sort((a,b)=>a.n.localeCompare(b.n,'es'));
}
function funcionesDe(p,k,dia){
 const lim=dia===hoyBogota()?ahoraBogota():'00:00';
 return p.funciones.filter(f=>CINE_A_CLAVE[f.cine]===k&&f.fecha===dia).sort((a,b)=>a.hora.localeCompare(b.hora)).map(f=>({...f,pasada:f.hora<lim}));
}
function chipFuncion(f,p){
 const fin=horaFin(f.hora,f.dur||p.dur);
 const fmt=(f.formato||'2D')+(f.idioma?' · '+f.idioma:'');
 const precio=f.precio?cop(f.precio).replace(' COP',''):'precio por confirmar';
 return `<span class="func ${f.pasada?'func-pasada':''}"><b>${hora12(f.hora)}</b><small>${fmt}</small><small>${fin?'Termina ~'+fin+' · ':''}${precio}</small></span>`;
}
function sinFuncion(k){return k==='cc'?'<span class="text-sm text-zinc-500">Cartelera aún no disponible</span>':'<span class="text-sm text-zinc-500">Sin función este día</span>';}
function fichaPelicula(p,compacta=false){
 return `<div class="${compacta?'selected-movie-card':'movie-card card p-4'}" style="${compacta?'display:block':''}">
  <div class="movie-details"><p class="text-xs font-semibold text-emerald-300">Película elegida</p><h3 class="text-lg font-black text-amber-300 mt-1">${p.n}</h3>
  <p class="text-xs text-zinc-400">${[p.dur?p.dur+' min':'',p.clas].filter(Boolean).join(' · ')}</p>
  <div class="mt-3 space-y-2 text-left">${['cc','cm','rf'].map(k=>{const fs=diaSel?funcionesDe(p,k,diaSel):[];return `<div><p class="text-xs font-bold text-emerald-300">${CINES[k]} · ${SEDE[k]}</p><p class="text-xs text-zinc-300 mt-1">${fs.length?fs.map(f=>hora12(f.hora)).join(' · '):'Sin función este día'}</p></div>`;}).join('')}</div>
  <p class="text-xs text-zinc-400 mt-3">Publicidad y avances: 5–15 min aprox.</p></div></div>`;
}
function seleccionarPelicula(p){
 peliculaSeleccionada=p;
 const salida=$('#cOut');
 salida.innerHTML=`${fichaPelicula(p,true)}<p class="text-sm text-zinc-300 mt-4 text-center">Pulsa <strong>“Ver mi mejor opción”</strong> para calcular entradas y combos.</p>`;
 salida.classList.remove('text-center');
 salida.classList.add('flex-col','items-stretch');
 $('#calculadora').scrollIntoView({behavior:'smooth',block:'start'});
}
function drawPel(){
 if(!DATOS)return;
 const lista=PEL.filter(p=>(sel==='Todas'||p.n===sel)&&p.funciones.some(f=>f.fecha===diaSel));
 $('#peliculas').innerHTML=lista.length?lista.map(p=>`<article class="card movie-card p-4 fade">
  <h3 class="text-xl font-black text-amber-300">${p.n}</h3>
  <p class="text-xs text-zinc-400 mt-1">${[p.dur?p.dur+' min':'',p.clas].filter(Boolean).join(' · ')}${p.dur?' · ':''}Publicidad y avances: <strong class="text-zinc-200">5–15 min aprox.</strong></p>
  <div class="grid md:grid-cols-3 gap-4 mt-3">${['cc','cm','rf'].map(k=>{const fs=funcionesDe(p,k,diaSel);return `<div><p class="text-sm font-bold text-emerald-300">${CINES[k]} · ${SEDE[k]}</p>
   <div class="flex flex-wrap gap-1.5 mt-2">${fs.length?fs.map(f=>chipFuncion(f,p)).join(''):sinFuncion(k)}</div></div>`;}).join('')}</div>
  <button type="button" class="btn mt-4 w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-lg" data-elegir-pelicula="${PEL.indexOf(p)}">Elegir esta película y calcular</button></article>`).join(''):'<p class="text-zinc-400">No hay funciones para ese día.</p>';
 document.querySelectorAll('#peliculas [data-elegir-pelicula]').forEach(button=>button.onclick=()=>{
  const pelicula=PEL[+button.dataset.elegirPelicula];
  filtroPelicula.value=pelicula.n;sel=pelicula.n;
  drawPel();seleccionarPelicula(pelicula);
 });
}
function llenarPeliculas(){
 const delDia=PEL.filter(p=>p.funciones.some(f=>f.fecha===diaSel));
 filtroPelicula.innerHTML=['Todas',...delDia.map(p=>p.n)].map(n=>`<option value="${n}">${n==='Todas'?'Todas las películas':n}</option>`).join('');
 if(!delDia.some(p=>p.n===sel))sel='Todas';
 filtroPelicula.value=sel;
}
filtroDia.onchange=()=>{diaSel=filtroDia.value;llenarPeliculas();drawPel();};
filtroPelicula.onchange=()=>{
 sel=filtroPelicula.value;drawPel();
 const pelicula=PEL.find(p=>p.n===sel);
 if(pelicula)seleccionarPelicula(pelicula);
};
function estadoDatos(d){
 const f=new Date(d.actualizado),fecha=f.toLocaleString('es-CO',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit',timeZone:'America/Bogota'});
 const malas=Object.entries(d.fuentes).filter(([n,s])=>!s.ok&&n!=='cine_colombia').map(([n])=>n);
 const dias=(Date.now()-f.getTime())/864e5;
 $('#estadoDatos').textContent=`Cartelera real de Cinemark y Royal Films, actualizada el ${fecha}.`+(malas.length?` Una fuente falló (${malas.join(', ')}): se muestran los últimos datos guardados.`:'')+(dias>2?' Los datos tienen más de dos días: confirma en el cine.':'')+' Cine Colombia todavía no está conectado.';
}
fetch(RUTA_DATOS).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();}).then(d=>{
 DATOS=d;PEL=armarPeliculas(d);FUNC=d.funciones;
 const hoy=hoyBogota(),dias=[...new Set(d.funciones.map(f=>f.fecha))].filter(x=>x>=hoy).sort();
 if(!dias.length)throw new Error('sin fechas vigentes');
 diaSel=dias[0];
 filtroDia.innerHTML=dias.map(x=>`<option value="${x}">${x===hoy?'Hoy · ':''}${nombreFecha(x)}</option>`).join('');
 llenarPeliculas();estadoDatos(d);drawPel();
}).catch(()=>{
 $('#estadoDatos').textContent='No se pudo cargar la cartelera. Si abriste el archivo con doble clic, sírvelo con un servidor local (python -m http.server) o ábrelo desde la página publicada.';
 $('#peliculas').innerHTML='';
});

const panelEstrenos=$('#panelEstrenos');
const abrirEstrenos=$('#abrirEstrenos');
abrirEstrenos.onclick=()=>{
 panelEstrenos.open=!panelEstrenos.open;
 abrirEstrenos.setAttribute('aria-expanded',String(panelEstrenos.open));
 if(panelEstrenos.open)panelEstrenos.scrollIntoView({behavior:'smooth',block:'center'});
};
panelEstrenos.addEventListener('toggle',()=>abrirEstrenos.setAttribute('aria-expanded',String(panelEstrenos.open)));

/* Calculadora */
$('#cDia').innerHTML=DIAS.map((d,i)=>`<option value="${i}">${d}</option>`).join('');
const night=k=>FUNC.filter(f=>CINE_A_CLAVE[f.cine]===k&&f.fecha===diaSel&&f.hora>='20:00').length;
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
 const n=+personas.value,dia=+$('#cDia').value,fr=$('#cFranja').value,pr=$('#cPrio').value;
 const r=Object.keys(CINES).map(k=>({k,...precio(k,dia,fr),nf:night(k)}));
 r.forEach(x=>x.tot=x.p*n);
 const combos=Object.keys(CINES).map(k=>{
  const plan=mejorPlanCombos(k,n);
  const entrada=r.find(x=>x.k===k).tot;
  return {k,plan,entrada,min:entrada+plan.min,max:entrada+plan.max,estimate:entrada+(plan.min+plan.max)/2};
 });
 const mejorAhorro=[...combos].sort((x,y)=>x.estimate-y.estimate)[0];
 const barato=[...r].sort((a,b)=>a.tot-b.tot)[0],a=AF[dia];
 let rec=barato,why='es la opción más económica para tu plan.';
 if(pr==='sala'){const m=dia<4&&fr==='m';why=a.n==='baja'||m?'es el cine más barato en un día de baja afluencia: sala despejada.':`${DIAS[dia]} tiene ${a.n} afluencia; para salas despejadas prueba lunes o jueves entre 2:00 y 4:30 p.m. Mientras tanto, este es el más barato.`;}
 if(pr==='noche'){rec=[...r].sort((a,b)=>b.nf-a.nf||a.tot-b.tot)[0];why=`es el que más funciones nocturnas (8:00 p.m. o más) tiene en cartelera: ${rec.nf}.`;}
 const c=COL[a.n];
 $('#cOut').innerHTML=`${peliculaSeleccionada?fichaPelicula(peliculaSeleccionada,true):''}<div class="w-full text-left fade"><p class="text-sm text-zinc-300 mt-4">Te recomendamos</p>
  <p class="text-2xl font-black text-emerald-300">${CINES[rec.k]}</p><p class="text-sm text-zinc-400">${SEDE[rec.k]}</p>
  <p class="text-sm text-zinc-300 mt-4">Total estimado para ${n} ${n===1?'persona':'personas'}</p>
  <p class="text-3xl font-black mt-1">${cop(rec.tot)}</p><p class="text-sm text-zinc-300">${cop(rec.p)} por persona${rec.matine?' · Precio matiné':''}</p>
  <p class="mt-3 text-sm text-zinc-200">${CINES[rec.k]} ${why}</p>
  <p class="mt-2 text-sm ${c[1]}">${c[2]} Afluencia estimada el ${DIAS[dia].toLowerCase()}: ${a.n}</p>
  <h3 class="font-bold mt-5 mb-2">Entradas solamente</h3>
  <div class="space-y-1 text-sm">${r.map(x=>`<div class="flex justify-between border-t border-zinc-700 pt-2"><span>${CINES[x.k]}</span><b>${cop(x.tot)}</b></div>`).join('')}</div>
  <h3 class="font-bold mt-5 mb-2">Combos para ${n} ${n===1?'persona':'personas'}</h3>
  <p class="text-sm text-emerald-300 mb-3">Menor gasto estimado en entradas + confitería: ${CINES[mejorAhorro.k]} (${SEDE[mejorAhorro.k]}).</p>
  <div class="space-y-3">${combos.map(x=>`<div class="rounded-lg border ${x.k===mejorAhorro.k?'border-emerald-500':'border-zinc-700'} bg-zinc-900 p-3">
   <p class="font-bold">${CINES[x.k]} · ${SEDE[x.k]}${x.k===mejorAhorro.k?' · Menor total estimado':''}</p>
   <p class="text-sm text-zinc-300 mt-1">${x.plan.items.map(item=>`${item.count} × ${item.combo.name} (${item.combo.items})`).join('; ')}</p>
   <p class="text-sm text-zinc-400 mt-1">Combos: ${cop(x.plan.min)}–${cop(x.plan.max)}</p>
   <p class="text-sm text-zinc-200">Entradas + combos: <b>${cop(x.min)}–${cop(x.max)}</b></p>
  </div>`).join('')}</div>
  <p class="text-xs text-zinc-400 mt-3">Cálculo con entradas y combos de referencia. Cine Colombia y Royal Films son rangos aproximados; se minimiza el valor medio y la cantidad de porciones por combo es orientativa. Confirma precios, porciones y disponibilidad en la sede. Royal Films puede cobrar recargo web por boleta.</p></div>`;};
