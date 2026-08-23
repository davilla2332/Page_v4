import { supabase, ensureVisitorSession, isPermanentUser } from './supabase.js';
import { getMediaUrl, formatDate, escapeHtml, toast, setAdminLinksVisibility } from './shared.js';

const $=s=>document.querySelector(s);
let memories=[]; let admin=false; let current=null;

async function init(){
  try{await ensureVisitorSession();}catch(e){console.warn(e)}
  admin=await isPermanentUser(); setAdminLinksVisibility(admin);
  await loadMemories(); wire();
  const hash=location.hash.slice(1); if(hash) setTimeout(()=>openMemory(hash),100);
}

async function loadMemories(){
  if(!supabase){$('#albumGrid').innerHTML='<div class="empty-state">Configura Supabase para ver el álbum.</div>';return;}
  const {data,error}=await supabase.from('memories').select('*').is('deleted_at',null).order('memory_date',{ascending:false,nullsFirst:false});
  if(error){toast(error.message,'error');return;}
  memories=data||[]; await renderFilters(); await render();
}

async function renderFilters(){
  const years=[...new Set(memories.map(m=>String(m.memory_date||'').slice(0,4)).filter(Boolean))].sort().reverse();
  $('#yearFilter').innerHTML='<option value="">Todos los años</option>'+years.map(y=>`<option>${y}</option>`).join('');
  const tags=[...new Set(memories.flatMap(m=>m.tags||[]))].sort();
  $('#tagFilter').innerHTML='<option value="">Todas las etiquetas</option>'+tags.map(t=>`<option>${escapeHtml(t)}</option>`).join('');
}

async function render(){
  const q=$('#searchInput').value.trim().toLowerCase(); const year=$('#yearFilter').value; const tag=$('#tagFilter').value; const fav=$('#favoriteOnly').checked;
  let list=memories.filter(m=>{
    if(year && String(m.memory_date||'').slice(0,4)!==year)return false;
    if(tag && !(m.tags||[]).includes(tag))return false;
    if(fav && !m.favorite)return false;
    if(q && ![m.title,m.description,m.place,...(m.tags||[])].join(' ').toLowerCase().includes(q))return false;
    return true;
  });
  $('#albumCount').textContent=`${list.length} recuerdo${list.length===1?'':'s'}`;
  if(!list.length){$('#albumGrid').innerHTML='<div class="empty-state">No encontramos recuerdos con esos filtros.</div>';return;}
  const cards=[];
  for(const m of list){
    const url=await getMediaUrl(m);
    const media=m.media_type==='video'?`<video src="${escapeHtml(url)}" muted preload="metadata"></video>`:m.media_type==='audio'?`<div class="audio-cover">🎙️</div>`:`<img src="${escapeHtml(url)}" alt="${escapeHtml(m.title)}" loading="lazy">`;
    cards.push(`<button type="button" class="album-card" data-id="${m.id}"><div class="album-thumb">${media}${m.favorite?'<span class="favorite-mark">♥</span>':''}${m.visibility==='private'?'<span class="privacy-mark">🔒</span>':''}</div><div><small>${formatDate(m.memory_date)}</small><h3>${escapeHtml(m.title)}</h3>${m.place?`<p>📍 ${escapeHtml(m.place)}</p>`:''}</div></button>`);
  }
  $('#albumGrid').innerHTML=cards.join('');
}

async function openMemory(id){
  const m=memories.find(x=>x.id===id); if(!m)return; current=m;
  const url=await getMediaUrl(m); if(!url && m.visibility==='private'){toast('Este recuerdo es privado. Inicia sesión para verlo.','error');return;}
  const media=m.media_type==='video'?`<video src="${escapeHtml(url)}" controls autoplay playsinline></video>`:m.media_type==='audio'?`<div class="memory-audio-large"><span>🎙️</span><audio src="${escapeHtml(url)}" controls autoplay></audio></div>`:`<img src="${escapeHtml(url)}" alt="${escapeHtml(m.title)}">`;
  $('#viewerMedia').innerHTML=media; $('#viewerTitle').textContent=m.title; $('#viewerDate').textContent=formatDate(m.memory_date); $('#viewerDescription').textContent=m.description||''; $('#viewerPlace').textContent=m.place?`📍 ${m.place}`:''; $('#viewerTags').innerHTML=(m.tags||[]).map(t=>`<span>${escapeHtml(t)}</span>`).join('');
  $('#viewerFavorite').textContent=m.favorite?'♥ Favorito':'♡ Favorito'; $('#viewerEdit').hidden=!admin;
  await renderSocial(m.id);
  $('#viewer').showModal(); history.replaceState(null,'',`#${id}`);
}

async function renderSocial(memoryId){
  if(!supabase)return;
  const [{data:reactions},{data:comments}]=await Promise.all([
    supabase.from('memory_reactions').select('reaction').eq('memory_id',memoryId),
    supabase.from('memory_comments').select('*').eq('memory_id',memoryId).is('deleted_at',null).order('created_at')
  ]);
  const counts={}; for(const r of reactions||[]) counts[r.reaction]=(counts[r.reaction]||0)+1;
  $('#reactionBar').innerHTML=['❤️','😍','🥹','😂'].map(r=>`<button type="button" data-reaction="${r}">${r} <span>${counts[r]||0}</span></button>`).join('');
  $('#commentsList').innerHTML=(comments||[]).map(c=>`<div class="comment"><strong>${escapeHtml(c.display_name||'Nosotros')}</strong><p>${escapeHtml(c.body)}</p><small>${new Date(c.created_at).toLocaleString('es-PA')}</small></div>`).join('')||'<small>Aún no hay comentarios.</small>';
  $('#commentForm').hidden=!admin;
}

async function react(reaction){
  if(!admin){toast('Inicia sesión como David o Madeline para reaccionar.');return;}
  const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from('memory_reactions').upsert({memory_id:current.id,user_id:user.id,reaction},{onConflict:'memory_id,user_id,reaction',ignoreDuplicates:true});
  if(error)toast(error.message,'error'); else renderSocial(current.id);
}

async function comment(e){
  e.preventDefault(); if(!admin)return;
  const body=$('#commentBody').value.trim(); if(!body)return;
  const {data:{user}}=await supabase.auth.getUser();
  const displayName=$('#commentName').value.trim()||user.email?.split('@')[0]||'Nosotros';
  const {error}=await supabase.from('memory_comments').insert({memory_id:current.id,user_id:user.id,display_name:displayName,body});
  if(error)toast(error.message,'error'); else{$('#commentBody').value='';renderSocial(current.id)}
}

function wire(){
  ['input','change'].forEach(ev=>{$('#searchInput').addEventListener(ev,render);$('#yearFilter').addEventListener(ev,render);$('#tagFilter').addEventListener(ev,render);$('#favoriteOnly').addEventListener(ev,render)});
  $('#albumGrid').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)openMemory(b.dataset.id)});
  $('#viewer').addEventListener('close',()=>history.replaceState(null,'',location.pathname));
  $('#reactionBar').addEventListener('click',e=>{const b=e.target.closest('[data-reaction]');if(b)react(b.dataset.reaction)});
  $('#commentForm').addEventListener('submit',comment);
  $('#viewerEdit').addEventListener('click',()=>location.href=`admin.html#memory:${current.id}`);
  $('#viewerFavorite').addEventListener('click',toggleFavorite);
  $('#viewerShare').addEventListener('click',shareMemory);
  $('#viewerQr').addEventListener('click',showQr);
  $('#slideshowBtn').addEventListener('click',slideshow);
}


async function toggleFavorite(){
  if(!admin){toast('Solo las cuentas de David/Madeline pueden cambiar favoritos.');return;}
  const next=!current.favorite;const {error}=await supabase.from('memories').update({favorite:next}).eq('id',current.id);if(error)return toast(error.message,'error');current.favorite=next;const idx=memories.findIndex(m=>m.id===current.id);if(idx>=0)memories[idx].favorite=next;$('#viewerFavorite').textContent=next?'♥ Favorito':'♡ Favorito';await render();
}

async function shareMemory(){
  const url=`${location.origin}${location.pathname}#${current.id}`;
  if(navigator.share){try{await navigator.share({title:current.title,text:current.description||'Un recuerdo de nosotros ❤️',url});return}catch(e){if(e.name==='AbortError')return;}}
  $('#miniShareText')?.remove();const p=document.createElement('p');p.id='miniShareText';p.className='result-bubble';p.textContent=url;$('#viewerShare').insertAdjacentElement('afterend',p);toast('Copia el enlace mostrado para compartir este recuerdo.');
}

async function showQr(){
  try{const mod=await import('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm');const QR=mod.default||mod;const url=`${location.origin}${location.pathname}#${current.id}`;$('#qrImage').src=await QR.toDataURL(url,{width:420,margin:2});$('#qrDialog').showModal();}catch(e){toast('No se pudo crear el QR. '+e.message,'error')}
}

async function slideshow(){
  const publicMems=memories.filter(m=>m.media_type==='image' && (m.visibility==='public'||admin));
  if(!publicMems.length){toast('Agrega fotos para iniciar la presentación.');return;}
  let i=0; $('#slideshow').showModal();
  const show=async()=>{const m=publicMems[i%publicMems.length];$('#slideImage').src=await getMediaUrl(m);$('#slideTitle').textContent=m.title;$('#slideCaption').textContent=m.description||'';};
  await show(); const timer=setInterval(async()=>{i++;await show()},4200); $('#slideshow').addEventListener('close',()=>clearInterval(timer),{once:true});
}

init();
