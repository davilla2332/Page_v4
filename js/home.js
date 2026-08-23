import { supabase, ensureVisitorSession, isPermanentUser } from './supabase.js';
import { APP_CONFIG } from './config.js';
import { loadContent, getProposalState, acceptProposalForever, formatDate, formatDateTime, daysBetween, randomItem, escapeHtml, toast, getMediaUrl, setAdminLinksVisibility } from './shared.js';
import { generateWithAI } from './ai.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let content;
let admin = false;
let noMoves = 0;

async function init() {
  try { await ensureVisitorSession(); } catch (e) { console.warn(e); }
  content = await loadContent();
  admin = await isPermanentUser();
  setAdminLinksVisibility(admin);
  renderStaticContent();
  applySpecialDateMode();
  await renderProposalState();
  renderCounters();
  renderReasons();
  renderOpenWhen();
  await Promise.all([renderFeaturedMemories(), renderChapters(), renderPlans(), renderCapsules(), renderEvents(), renderAchievements(), renderProfiles(), renderTodayMemory(), renderCalendar(), renderStats(), renderMap()]);
  wireInteractions();
  startCounter();
  document.body.classList.add('ready');
}

function renderStaticContent() {
  const hero = content.hero;
  $('#heroEyebrow').textContent = hero.eyebrow;
  $('#heroTitle').textContent = hero.title;
  $('#heroSubtitle').textContent = hero.subtitle;
  $('#proposalQuestion').textContent = hero.question;
  $('#historyTitle').textContent = content.section_texts?.history_title || 'Nuestra historia';
  $('#galleryTitle').textContent = content.section_texts?.gallery_title || 'Nuestros recuerdos';
  $('#chaptersTitle').textContent = content.section_texts?.chapters_title || 'Capítulos';
  $('#plansTitle').textContent = content.section_texts?.plans_title || 'Planes';
  $('#capsulesTitle').textContent = content.section_texts?.capsules_title || 'Cápsulas';
  const couple=content.couple||APP_CONFIG.couple;
  $('#talkDate').textContent = formatDate(couple.startedTalking);
  $('#meetDate').textContent = formatDate(couple.firstMeeting);
  $('#letterTitle').textContent = content.letter?.title || 'Nuestra carta';
  $('#letterBody').textContent = content.letter?.body || '';
  $('#footerText').textContent = content.settings?.footer || FALLBACK;
  const music = $('#bgMusic');
  if (content.settings?.music_url) music.src = content.settings.music_url;
}

async function renderProposalState() {
  const state = await getProposalState();
  if (state.accepted) {
    $('#proposalBadge').hidden = false;
    $('#proposalBadge').innerHTML = `💍 Ella dijo que sí <span>${state.accepted_at ? formatDateTime(state.accepted_at) : ''}</span>`;
    $('#yesBtn').textContent = 'Ver nuestra carta ❤️';
    $('#noBtn').hidden = true;
    $('#viewLetterBtn').hidden = false;
    $('#viewLetterBtnBottom').hidden = false;
  }
}

function renderCounters() {
  const couple=content.couple||APP_CONFIG.couple;
  $('#daysTalking').textContent = daysBetween(couple.startedTalking).toLocaleString('es-PA');
  $('#daysSinceMeet').textContent = daysBetween(couple.firstMeeting).toLocaleString('es-PA');
}

function startCounter() {
  const couple=content.couple||APP_CONFIG.couple;
  const start = new Date(`${couple.startedTalking}T00:00:00-05:00`).getTime();
  const update = () => {
    const diff = Math.max(0, Date.now()-start);
    const days = Math.floor(diff/86400000);
    const hours = Math.floor(diff%86400000/3600000);
    const mins = Math.floor(diff%3600000/60000);
    const secs = Math.floor(diff%60000/1000);
    $('#liveCounter').textContent = `${days} días · ${hours} h · ${mins} min · ${secs} s`;
  };
  update(); setInterval(update,1000);
}

function renderReasons() {
  const list = content.reasons || [];
  $('#reasonText').textContent = randomItem(list) || 'Porque sí. ❤️';
}

function renderOpenWhen() {
  $('#openWhenGrid').innerHTML = (content.open_when || []).map((item,i)=>`
    <button class="open-card" data-open-when="${i}" type="button"><span>✉️</span><strong>${escapeHtml(item.title)}</strong><small>Toca para abrir</small></button>
  `).join('');
}

async function renderFeaturedMemories() {
  if (!supabase) return;
  const { data } = await supabase.from('memories').select('*').is('deleted_at',null).eq('featured',true).eq('visibility','public').order('memory_date',{ascending:false}).limit(6);
  const host = $('#featuredMemories');
  if (!data?.length) {
    host.innerHTML = `<div class="empty-state">📷 Los recuerdos destacados aparecerán aquí cuando los agregues desde el panel.</div>`;
    return;
  }
  const cards=[]; const imageUrls=[];
  for (const mem of data) {
    const url = await getMediaUrl(mem);
    cards.push(memoryCard(mem,url));
    if(mem.media_type==='image' && url) imageUrls.push({url,title:mem.title});
  }
  host.innerHTML=cards.join('');
  const polaroids=[...document.querySelectorAll('.polaroid')];
  imageUrls.slice(0,3).forEach((item,i)=>{ if(polaroids[i]) polaroids[i].innerHTML=`<span class="tape"></span><img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}">`; });
}

function memoryCard(mem,url) {
  const visual = mem.media_type === 'video' ? `<video src="${escapeHtml(url)}" muted playsinline preload="metadata"></video>` : mem.media_type === 'audio' ? `<div class="audio-art">🎙️<audio src="${escapeHtml(url)}" controls></audio></div>` : `<img src="${escapeHtml(url)}" alt="${escapeHtml(mem.title)}" loading="lazy">`;
  return `<article class="memory-card" data-memory-id="${mem.id}"><div class="memory-media">${visual}${mem.favorite?'<span class="favorite-mark">♥</span>':''}</div><div class="memory-copy"><small>${formatDate(mem.memory_date)}</small><h3>${escapeHtml(mem.title)}</h3><p>${escapeHtml(mem.description||'')}</p>${mem.place?`<span>📍 ${escapeHtml(mem.place)}</span>`:''}</div></article>`;
}

async function renderChapters() {
  if (!supabase) return;
  const { data } = await supabase.from('chapters').select('*').is('deleted_at',null).order('chapter_number');
  $('#chaptersGrid').innerHTML = data?.length ? data.map(ch=>`<article class="chapter-card"><div class="chapter-no">${escapeHtml(ch.emoji||'❤️')} Capítulo ${String(ch.chapter_number).padStart(2,'0')}</div><small>${formatDate(ch.chapter_date)}</small><h3>${escapeHtml(ch.title)}</h3><p>${escapeHtml(ch.body)}</p></article>`).join('') : `<div class="empty-state">Aquí crecerán los capítulos de su historia.</div>`;
}

async function renderPlans() {
  if (!supabase) return;
  const { data } = await supabase.from('plans').select('*').is('deleted_at',null).order('completed').order('target_date',{ascending:true,nullsFirst:false});
  const total=data?.length||0, done=(data||[]).filter(x=>x.completed).length;
  $('#plansProgress').style.setProperty('--progress', total?`${Math.round(done/total*100)}%`:'0%');
  $('#plansProgressText').textContent = total ? `${done} de ${total} sueños cumplidos` : 'Empiecen agregando su primer plan';
  $('#plansList').innerHTML = data?.length ? data.map(p=>`<li class="${p.completed?'done':''}"><span>${p.completed?'✓':'♡'}</span><div><strong>${escapeHtml(p.title)}</strong><small>${escapeHtml(p.details||'')}${p.target_date?` · ${formatDate(p.target_date)}`:''}</small></div></li>`).join('') : '';
}

async function renderCapsules() {
  if (!supabase) return;
  const { data } = await supabase.from('capsules').select('*').is('deleted_at',null).order('unlock_at');
  const now = Date.now();
  $('#capsulesGrid').innerHTML = data?.length ? data.map(c=>{
    const unlocked = new Date(c.unlock_at).getTime() <= now;
    return `<article class="capsule-card ${unlocked?'unlocked':'locked'}" data-capsule-id="${c.id}"><span class="capsule-icon">${unlocked?'💌':'🔒'}</span><small>${unlocked?'Ya se puede abrir':'Se desbloquea '+formatDateTime(c.unlock_at)}</small><h3>${escapeHtml(c.title)}</h3><button type="button" class="ghost-btn" data-open-capsule="${c.id}" ${unlocked?'':'disabled'}>${unlocked?'Abrir mensaje':'Todavía no ❤️'}</button><div class="capsule-message" hidden>${escapeHtml(c.message)}</div></article>`;
  }).join('') : `<div class="empty-state">Escriban una carta para su yo del futuro.</div>`;
}

async function renderEvents() {
  if (!supabase) return;
  const { data } = await supabase.from('events').select('*').is('deleted_at',null).order('event_date');
  const now = new Date();
  const cards = (data||[]).filter(e=>e.countdown).map(e=>{
    let target = new Date(`${e.event_date}T12:00:00`);
    if (e.annual) {
      target.setFullYear(now.getFullYear());
      if (target < now) target.setFullYear(now.getFullYear()+1);
    }
    const days=Math.max(0,Math.ceil((target-now)/86400000));
    return `<div class="countdown-card"><span>${escapeHtml(e.event_type==='anniversary'?'💞':'📅')}</span><div><small>Faltan ${days} días</small><strong>${escapeHtml(e.title)}</strong></div></div>`;
  });
  $('#countdowns').innerHTML = cards.join('');
}

async function renderAchievements() {
  if (!supabase) return;
  const { data } = await supabase.from('achievements').select('*').is('deleted_at',null).order('achieved_on');
  $('#achievements').innerHTML = data?.length ? data.map(a=>`<article class="achievement"><span>${escapeHtml(a.badge||'🏆')}</span><div><strong>${escapeHtml(a.title)}</strong><small>${formatDate(a.achieved_on)} · ${escapeHtml(a.description||'')}</small></div></article>`).join('') : `<div class="empty-state">Los logros de pareja aparecerán aquí.</div>`;
}

async function renderProfiles() {
  if (!supabase) return;
  const { data } = await supabase.from('profiles').select('*').order('user_slot');
  const host=$('#profiles');
  if (!data?.length) return;
  const cards=[];
  for (const p of data) {
    let img='';
    if (p.avatar_path) {
      img=supabase.storage.from('couple-public').getPublicUrl(p.avatar_path).data.publicUrl;
    }
    cards.push(`<article class="profile-card">${img?`<img src="${escapeHtml(img)}" alt="${escapeHtml(p.display_name)}">`:`<div class="profile-initial">${escapeHtml((p.display_name||'?')[0])}</div>`}<h3>${escapeHtml(p.display_name)}</h3><p>${escapeHtml(p.bio||'')}</p>${p.favorite_things?.length?`<small>Le encanta: ${p.favorite_things.map(escapeHtml).join(' · ')}</small>`:''}</article>`);
  }
  host.innerHTML=cards.join('');
}

async function renderTodayMemory() {
  if (!supabase) return;
  const today = new Date();
  const mm=String(today.getMonth()+1).padStart(2,'0'), dd=String(today.getDate()).padStart(2,'0');
  const { data } = await supabase.from('memories').select('*').is('deleted_at',null).eq('visibility','public').order('memory_date',{ascending:true});
  const same=(data||[]).filter(m=>String(m.memory_date).slice(5,10)===`${mm}-${dd}` && String(m.memory_date).slice(0,4)!==String(today.getFullYear()));
  const pick=randomItem(same.length?same:data||[]);
  if (!pick) return;
  const url=await getMediaUrl(pick);
  $('#todayMemory').innerHTML=`<div class="today-copy"><span>✨ Recuerdo del día</span><h3>${escapeHtml(pick.title)}</h3><p>${escapeHtml(pick.description||'')}</p><a href="album.html#${pick.id}">Volver a este momento →</a></div>${pick.media_type==='image'?`<img src="${escapeHtml(url)}" alt="${escapeHtml(pick.title)}">`:'<div class="today-symbol">♥</div>'}`;
}

async function renderCalendar() {
  if (!supabase) return;
  const { data: mems } = await supabase.from('memories').select('id,title,memory_date').is('deleted_at',null).eq('visibility','public');
  const { data: events } = await supabase.from('events').select('id,title,event_date,event_type').is('deleted_at',null);
  const items=[...(mems||[]).map(x=>({date:x.memory_date,title:x.title,icon:'📷'})),...(events||[]).map(x=>({date:x.event_date,title:x.title,icon:'💞'}))].sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-12);
  $('#calendarList').innerHTML = items.length ? items.map(x=>`<div class="calendar-item"><time>${formatDate(x.date,{day:'2-digit',month:'short'})}</time><span>${x.icon}</span><strong>${escapeHtml(x.title)}</strong></div>`).join('') : `<div class="empty-state">Agrega recuerdos y fechas para llenar su calendario.</div>`;
}

async function renderStats() {
  if (!supabase) return;
  const [mem,chap,plan] = await Promise.all([
    supabase.from('memories').select('id',{count:'exact',head:true}).is('deleted_at',null),
    supabase.from('chapters').select('id',{count:'exact',head:true}).is('deleted_at',null),
    supabase.from('plans').select('id',{count:'exact',head:true}).is('deleted_at',null).eq('completed',true)
  ]);
  $('#statMemories').textContent=mem.count||0;
  $('#statChapters').textContent=chap.count||0;
  $('#statPlans').textContent=plan.count||0;
}

async function renderMap() {
  if (!supabase || !window.L) return;
  const { data } = await supabase.from('memories').select('id,title,lat,lng,place,memory_date').is('deleted_at',null).eq('visibility','public').not('lat','is',null).not('lng','is',null);
  if (!data?.length) { $('#mapEmpty').hidden=false; return; }
  const map=L.map('storyMap',{scrollWheelZoom:false}).setView([8.9824,-79.5199],9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  const bounds=[];
  for (const m of data) {
    L.marker([m.lat,m.lng]).addTo(map).bindPopup(`<strong>${escapeHtml(m.title)}</strong><br>${escapeHtml(m.place||'')}<br><small>${formatDate(m.memory_date)}</small>`);
    bounds.push([m.lat,m.lng]);
  }
  if(bounds.length>1) map.fitBounds(bounds,{padding:[30,30]}); else map.setView(bounds[0],13);
}


function applySpecialDateMode(){
  const d=new Date(), md=`${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const labels={'07-12':'Hoy celebramos el día en que empezó nuestro primer hola 💬','08-16':'Hoy celebramos el día en que nos conocimos ✨','02-14':'Hoy la página también está de San Valentín ❤️','12-24':'Una Navidad más para guardar juntos 🎄','12-25':'Feliz Navidad a nuestra historia 🎄'};
  if(!labels[md])return;
  document.body.classList.add('special-day');
  const b=document.createElement('div');b.className='special-day-banner';b.textContent=labels[md];document.body.prepend(b);
}

function wireInteractions() {
  $('#yesBtn').addEventListener('click', async()=>{
    try {
      const state=await getProposalState();
      if(!state.accepted) {
        const saved=await acceptProposalForever();
        $('#proposalBadge').hidden=false;
        $('#proposalBadge').innerHTML=`💍 Ella dijo que sí <span>${formatDateTime(saved?.accepted_at||new Date())}</span>`;
        $('#noBtn').hidden=true;
        $('#viewLetterBtn').hidden=false;
        $('#viewLetterBtnBottom').hidden=false;
        heartBurst();
      }
      openLetter();
    } catch(e){ toast(e.message,'error'); }
  });

  $('#noBtn').addEventListener('pointerenter', moveNoButton);
  $('#noBtn').addEventListener('click', moveNoButton);
  $('#letterClose').addEventListener('click', closeLetter);
  $('#letterOverlay').addEventListener('click', e=>{ if(e.target.id==='letterOverlay') closeLetter(); });
  $('#viewLetterBtn').addEventListener('click',openLetter);
  $('#reasonBtn').addEventListener('click',()=>{$('#reasonText').animate([{opacity:.2,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:300}); $('#reasonText').textContent=randomItem(content.reasons||[])});
  $('#jarBtn').addEventListener('click',()=>{ $('#jarMessage').textContent=randomItem(content.jar_messages||[])||'❤️'; $('#jarMessage').hidden=false; });
  $('#dateRouletteBtn').addEventListener('click',()=>{$('#dateIdea').textContent=randomItem(content.date_ideas||[]); $('#dateIdea').hidden=false;});
  $('#musicToggle').addEventListener('click',toggleMusic);
  $('#installBtn').addEventListener('click',()=>window.dispatchEvent(new CustomEvent('pwa-install-request')));
  let brandClicks=0; document.querySelector('.brand').addEventListener('click',e=>{brandClicks++; if(brandClicks>=5){e.preventDefault();brandClicks=0;$('#miniModalTitle').textContent='Encontraste un secreto ❤️';$('#miniModalBody').textContent='Entre tantas líneas de código escondí una verdad sencilla: volvería a elegir conocerte, incluso sabiendo que terminaría queriéndote así de bonito.';$('#miniModal').showModal();heartBurst();}});
  $('#aiReasonBtn').addEventListener('click',()=>aiFill('reason'));
  $('#aiLetterBtn').addEventListener('click',()=>aiFill('letter'));

  $('#openWhenGrid').addEventListener('click',e=>{
    const b=e.target.closest('[data-open-when]'); if(!b)return;
    const item=content.open_when[Number(b.dataset.openWhen)];
    $('#miniModalTitle').textContent=item.title; $('#miniModalBody').textContent=item.body; $('#miniModal').showModal();
  });
  $('#capsulesGrid').addEventListener('click',e=>{
    const b=e.target.closest('[data-open-capsule]'); if(!b)return;
    const msg=b.parentElement.querySelector('.capsule-message').textContent;
    $('#miniModalTitle').textContent=b.parentElement.querySelector('h3').textContent; $('#miniModalBody').textContent=msg; $('#miniModal').showModal();
  });
  $('#dailyQuestionBtn').addEventListener('click',()=>{$('#dailyQuestionText').textContent=randomItem(content.questions||[]);});
}

function moveNoButton(e) {
  e.preventDefault(); noMoves++;
  const btn=$('#noBtn'); const box=$('#proposalActions').getBoundingClientRect();
  const maxX=Math.max(0,box.width-btn.offsetWidth), maxY=80;
  btn.style.transform=`translate(${Math.random()*maxX-maxX/2}px, ${Math.random()*maxY-maxY/2}px) rotate(${Math.random()*8-4}deg)`;
  const labels=['¿Segura? 🥺','Piénsalo otra vez 😭','Ese botón está nervioso 😅','Creo que quería decir que sí 👀','Última oportunidad 😌'];
  btn.textContent=labels[Math.min(noMoves-1,labels.length-1)];
}

function openLetter(){ $('#letterOverlay').hidden=false; requestAnimationFrame(()=>$('#letterOverlay').classList.add('open')); document.body.classList.add('modal-open'); }
function closeLetter(){ $('#letterOverlay').classList.remove('open'); setTimeout(()=>{$('#letterOverlay').hidden=true;document.body.classList.remove('modal-open')},250); }

function heartBurst() {
  for(let i=0;i<28;i++){
    const h=document.createElement('span'); h.className='burst-heart'; h.textContent=['♥','♡','❤'][i%3];
    h.style.left=`${50+(Math.random()*20-10)}%`; h.style.top='55%'; h.style.setProperty('--x',`${Math.random()*500-250}px`); h.style.setProperty('--y',`${-(100+Math.random()*500)}px`); h.style.animationDelay=`${Math.random()*180}ms`; document.body.appendChild(h); setTimeout(()=>h.remove(),1800);
  }
}

async function toggleMusic(){ const audio=$('#bgMusic'); if(audio.paused){try{await audio.play();$('#musicToggle').textContent='❚❚ Música';}catch{toast('El navegador bloqueó el audio automático. Toca de nuevo.')}}else{audio.pause();$('#musicToggle').textContent='♫ Música';}}

async function aiFill(type){
  if(!admin){toast('Inicia sesión en el panel para usar la IA.','error');return;}
  const btn=type==='reason'?$('#aiReasonBtn'):$('#aiLetterBtn'); const old=btn.textContent; btn.disabled=true; btn.textContent='Creando…';
  try{
    const text=await generateWithAI({type,context:{...(content.couple||APP_CONFIG.couple),reasons:content.reasons},maxLength:type==='letter'?900:220});
    if(type==='reason') $('#reasonText').textContent=text; else { $('#letterBody').textContent=text; openLetter(); }
  }catch(e){toast(`IA: ${e.message}`,'error')}finally{btn.disabled=false;btn.textContent=old}
}

const FALLBACK='Hecho con amor ❤️';
init();
