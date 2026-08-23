import { supabase, ensureVisitorSession, isPermanentUser } from './supabase.js';
import { loadContent, escapeHtml, formatDate, randomItem, toast, getMediaUrl } from './shared.js';
import { generateWithAI } from './ai.js';

const $=s=>document.querySelector(s);
let admin=false, content={}, currentQuestion=null;

async function init(){
  try{await ensureVisitorSession();}catch(e){console.warn(e)}
  admin=await isPermanentUser(); content=await loadContent();
  $('#privateCorner').hidden=!admin; $('#privateLock').hidden=admin;
  $('#privateLockNotes').hidden=admin; $('#notesPrivate').hidden=!admin; $('#aiRecapBtn').hidden=!admin;
  await Promise.all([renderPlaylist(),renderWrapped(),renderQuestion(),renderNotes(),renderBeforeAfter()]);
  wire();
}

function wire(){
  $('#rouletteTogether').addEventListener('click',()=>{$('#rouletteResult').textContent=randomItem(content.date_ideas||[]);$('#rouletteResult').hidden=false});
  $('#answerForm')?.addEventListener('submit',saveAnswer);
  $('#noteForm')?.addEventListener('submit',saveNote);
  $('#aiRecapBtn').addEventListener('click',aiRecap);
  $('#quizBtn').addEventListener('click',()=>{
    const pool=[...(content.questions||[])].sort(()=>Math.random()-.5).slice(0,4);
    $('#quizList').innerHTML=pool.map((q,i)=>`<li><strong>${i+1}.</strong> ${escapeHtml(q)}</li>`).join('');
  });
}


async function aiRecap(){
  const btn=$('#aiRecapBtn');btn.disabled=true;btn.textContent='Escribiendo…';
  try{const text=await generateWithAI({type:'recap',prompt:'Crea un resumen romántico del período usando nuestros capítulos, recuerdos, lugares y planes.',context:{},maxLength:850});$('#aiRecapText').textContent=text;$('#aiRecapText').hidden=false;}catch(e){toast(e.message,'error')}finally{btn.disabled=false;btn.textContent='✨ Escribir resumen del año con IA'}
}

async function renderPlaylist(){
  if(!supabase)return;
  const {data}=await supabase.from('playlist').select('*').is('deleted_at',null).order('created_at');
  $('#playlistGrid').innerHTML=(data||[]).map(s=>`<article class="song-card"><span>♫</span><div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.artist||'')}</p><small>${escapeHtml(s.note||'')}</small>${s.url?`<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">Escuchar ↗</a>`:''}</div></article>`).join('')||'<div class="empty-state">Agrega canciones desde el panel privado.</div>';
}

async function renderWrapped(){
  if(!supabase)return;
  const {data}=await supabase.from('memories').select('*').is('deleted_at',null).eq('visibility','public');
  const list=data||[]; const years=[...new Set(list.map(m=>String(m.memory_date||'').slice(0,4)).filter(Boolean))].sort().reverse();
  const year=years[0]||String(new Date().getFullYear()); const ylist=list.filter(m=>String(m.memory_date||'').startsWith(year));
  const months={};const places={};for(const m of ylist){const mo=String(m.memory_date||'').slice(5,7);if(mo)months[mo]=(months[mo]||0)+1;if(m.place)places[m.place]=(places[m.place]||0)+1;}
  const top=(obj)=>Object.entries(obj).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'; const monthName=top(months)==='—'?'—':new Intl.DateTimeFormat('es-PA',{month:'long'}).format(new Date(2026,Number(top(months))-1,1));
  $('#wrappedYear').textContent=year;$('#wrapMemories').textContent=ylist.length;$('#wrapFavorites').textContent=ylist.filter(m=>m.favorite).length;$('#wrapMonth').textContent=monthName;$('#wrapPlace').textContent=top(places);
}

async function renderQuestion(){
  if(!supabase)return;
  const {data}=await supabase.from('couple_questions').select('*').is('deleted_at',null).order('question_date',{ascending:false}).limit(1).maybeSingle();
  currentQuestion=data;
  $('#questionOfDay').textContent=data?.question||randomItem(content.questions||[])||'¿Qué quieres recordar de nosotros hoy?';
  if(!admin)return;
  const {data:answers}=data?await supabase.from('question_answers').select('*').eq('question_id',data.id).order('created_at'):({data:[]});
  const count=answers?.length||0; $('#answerStatus').textContent=`${count}/2 respuestas guardadas`;
  if(count>=2){$('#answersReveal').innerHTML=answers.map(a=>`<article class="answer-card"><strong>${escapeHtml(a.display_name||'Nosotros')}</strong><p>${escapeHtml(a.answer)}</p></article>`).join('');$('#answersReveal').hidden=false}else{$('#answersReveal').hidden=true;}
}

async function saveAnswer(e){
  e.preventDefault(); if(!admin||!currentQuestion){toast('Primero crea una pregunta desde el panel.');return;}
  const answer=$('#answerText').value.trim(),name=$('#answerName').value.trim();if(!answer)return;
  const {data:{user}}=await supabase.auth.getUser(); const {error}=await supabase.from('question_answers').upsert({question_id:currentQuestion.id,user_id:user.id,display_name:name||user.email?.split('@')[0]||'Nosotros',answer},{onConflict:'question_id,user_id'});
  if(error)toast(error.message,'error');else{$('#answerText').value='';toast('Respuesta guardada. Se revelará cuando ambos hayan respondido.','success');await renderQuestion();}
}

async function renderNotes(){
  if(!admin||!supabase)return;
  const {data}=await supabase.from('couple_notes').select('*').is('deleted_at',null).order('created_at',{ascending:false}).limit(30);
  $('#notesList').innerHTML=(data||[]).map(n=>`<article class="note-bubble"><strong>${escapeHtml(n.display_name||'Nosotros')}</strong><p>${escapeHtml(n.body)}</p><small>${new Date(n.created_at).toLocaleString('es-PA')}</small></article>`).join('')||'<small>Dejen aquí la primera nota. ❤️</small>';
}

async function saveNote(e){
  e.preventDefault();const body=$('#noteBody').value.trim(),name=$('#noteName').value.trim();if(!body)return;const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from('couple_notes').insert({user_id:user.id,display_name:name||user.email?.split('@')[0]||'Nosotros',body});if(error)toast(error.message,'error');else{$('#noteBody').value='';await renderNotes();}
}

async function renderBeforeAfter(){
  if(!supabase)return;const {data}=await supabase.from('memories').select('*').is('deleted_at',null).eq('visibility','public').eq('media_type','image').order('memory_date');if(!data?.length)return;
  const first=data[0],last=data[data.length-1];const [u1,u2]=await Promise.all([getMediaUrl(first),getMediaUrl(last)]);$('#beforeAfter').innerHTML=`<article><img src="${escapeHtml(u1)}" alt="${escapeHtml(first.title)}"><small>Entonces · ${formatDate(first.memory_date)}</small><h3>${escapeHtml(first.title)}</h3></article><div class="ba-heart">♥</div><article><img src="${escapeHtml(u2)}" alt="${escapeHtml(last.title)}"><small>Ahora · ${formatDate(last.memory_date)}</small><h3>${escapeHtml(last.title)}</h3></article>`;
}

init();
