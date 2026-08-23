import { supabase, ensureVisitorSession, isPermanentUser, signInAdmin, signOut, requirePermanentUser } from './supabase.js';
import { APP_CONFIG } from './config.js';
import { FALLBACK_CONTENT, escapeHtml, formatDate, toast, uploadMedia, deleteMedia, getMediaUrl } from './shared.js';
import { generateWithAI } from './ai.js';
import { exportBackup, createBookPdf } from './export.js';

const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
let content={}; let memories=[]; let currentMemory=null;

async function init(){
  try{await ensureVisitorSession();}catch(e){console.warn(e)}
  if(await isPermanentUser()) showDashboard(); else showLogin();
  wireBase();
}

function wireBase(){
  $('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const b=$('#loginSubmit');b.disabled=true;try{await signInAdmin($('#loginEmail').value.trim(),$('#loginPassword').value);if(!(await isPermanentUser()))throw new Error('La cuenta no es permanente.');await showDashboard()}catch(err){toast(err.message,'error')}finally{b.disabled=false}});
  $('#logoutBtn').addEventListener('click',async()=>{await signOut();location.reload()});
  $$('.admin-nav button').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.tab)));
  $('#contentForm').addEventListener('submit',saveGuidedContent);
  $('#saveAdvancedJson').addEventListener('click',saveAdvancedJson);
  $('#memoryForm').addEventListener('submit',saveMemory);
  $('#memoryReset').addEventListener('click',resetMemoryForm);
  $('#aiMemoryCaption').addEventListener('click',aiMemoryCaption);
  $('#memoryList').addEventListener('click',memoryListAction);
  $('#genericForms').addEventListener('submit',genericSubmit);
  $('#genericLists').addEventListener('click',genericListAction);
  $('#backupBtn').addEventListener('click',()=>exportBackup().catch(e=>toast(e.message,'error')));
  $('#bookBtn').addEventListener('click',()=>createBookPdf().catch(e=>toast(e.message,'error')));
  $('#aiLetterAdmin').addEventListener('click',()=>aiForField('letter'));
  window.addEventListener('hashchange',handleHash);
}

function showLogin(){ $('#loginView').hidden=false;$('#dashboardView').hidden=true; }
async function showDashboard(){
  $('#loginView').hidden=true;$('#dashboardView').hidden=false;
  const {data:{user}}=await supabase.auth.getUser(); $('#adminIdentity').textContent=user.email||user.id;
  await Promise.all([loadContent(),loadMemories(),loadGenericData(),loadChangeLog()]); handleHash();
}


async function loadChangeLog(){
  const {data,error}=await supabase.from('change_log').select('*').order('changed_at',{ascending:false}).limit(40);
  if(error){console.warn(error);return;}
  const host=$('#changeLog'); if(!host)return;
  host.innerHTML=(data||[]).map(r=>`<article class="admin-list-item"><div><strong>${escapeHtml(r.table_name)} · ${escapeHtml(r.action)}</strong><small>${escapeHtml(r.record_id||'')} · ${new Date(r.changed_at).toLocaleString('es-PA')}</small></div></article>`).join('')||'<small>Sin cambios registrados todavía.</small>';
}

function selectTab(name){
  $$('.admin-nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  $$('.admin-tab').forEach(p=>p.hidden=p.dataset.tab!==name);
}

async function loadContent(){
  const {data,error}=await supabase.from('site_content').select('key,value').order('key'); if(error)return toast(error.message,'error');
  content=structuredClone(FALLBACK_CONTENT); for(const r of data||[])content[r.key]=r.value;
  $('#coupleDavid').value=content.couple?.david||'David';$('#coupleMadeline').value=content.couple?.madeline||'Madeline';$('#coupleTalk').value=content.couple?.startedTalking||'';$('#coupleMeet').value=content.couple?.firstMeeting||'';
  $('#heroEyebrowInput').value=content.hero?.eyebrow||'';$('#heroTitleInput').value=content.hero?.title||'';$('#heroSubtitleInput').value=content.hero?.subtitle||'';$('#heroQuestionInput').value=content.hero?.question||'';
  $('#letterTitleInput').value=content.letter?.title||'';$('#letterBodyInput').value=content.letter?.body||'';
  $('#reasonsInput').value=(content.reasons||[]).join('\n');$('#jarInput').value=(content.jar_messages||[]).join('\n');
  $('#openWhenInput').value=JSON.stringify(content.open_when||[],null,2);$('#dateIdeasInput').value=(content.date_ideas||[]).join('\n');$('#questionsInput').value=(content.questions||[]).join('\n');
  $('#advancedJson').value=JSON.stringify(content,null,2);
}

async function upsertContent(key,value){const {error}=await supabase.from('site_content').upsert({key,value,updated_at:new Date().toISOString()});if(error)throw error;}

async function saveGuidedContent(e){
  e.preventDefault();
  try{
    let openWhen=[];try{openWhen=JSON.parse($('#openWhenInput').value||'[]')}catch{throw new Error('El JSON de “Abrir cuando…” no es válido.');}
    await Promise.all([
      upsertContent('couple',{david:$('#coupleDavid').value.trim(),madeline:$('#coupleMadeline').value.trim(),names:`${$('#coupleDavid').value.trim()} & ${$('#coupleMadeline').value.trim()}`,startedTalking:$('#coupleTalk').value,firstMeeting:$('#coupleMeet').value}),
      upsertContent('hero',{eyebrow:$('#heroEyebrowInput').value.trim(),title:$('#heroTitleInput').value.trim(),subtitle:$('#heroSubtitleInput').value.trim(),question:$('#heroQuestionInput').value.trim()}),
      upsertContent('letter',{title:$('#letterTitleInput').value.trim(),body:$('#letterBodyInput').value.trim()}),
      upsertContent('reasons',$('#reasonsInput').value.split('\n').map(x=>x.trim()).filter(Boolean)),
      upsertContent('jar_messages',$('#jarInput').value.split('\n').map(x=>x.trim()).filter(Boolean)),
      upsertContent('open_when',openWhen),
      upsertContent('date_ideas',$('#dateIdeasInput').value.split('\n').map(x=>x.trim()).filter(Boolean)),
      upsertContent('questions',$('#questionsInput').value.split('\n').map(x=>x.trim()).filter(Boolean))
    ]);
    toast('Textos guardados ❤️','success');await loadContent();
  }catch(err){toast(err.message,'error')}
}

async function saveAdvancedJson(){
  try{const obj=JSON.parse($('#advancedJson').value);for(const [key,value] of Object.entries(obj))await upsertContent(key,value);toast('Configuración avanzada guardada.','success');await loadContent();}catch(e){toast(e.message,'error')}
}

async function loadMemories(){
  const {data,error}=await supabase.from('memories').select('*').order('created_at',{ascending:false});if(error)return toast(error.message,'error');memories=data||[];renderMemoryList();
}

function renderMemoryList(){
  $('#memoryList').innerHTML=memories.map(m=>`<article class="admin-list-item ${m.deleted_at?'deleted':''}"><div><strong>${escapeHtml(m.title)}</strong><small>${formatDate(m.memory_date)} · ${escapeHtml(m.media_type)} · ${escapeHtml(m.visibility)} ${m.deleted_at?'· PAPELERA':''}</small></div><div class="inline-actions"><button type="button" data-edit-memory="${m.id}">Editar</button>${m.deleted_at?`<button type="button" data-restore-memory="${m.id}">Restaurar</button>`:`<button type="button" data-delete-memory="${m.id}">Papelera</button>`}</div></article>`).join('')||'<div class="empty-state">Todavía no hay recuerdos.</div>';
}

async function saveMemory(e){
  e.preventDefault(); await requirePermanentUser(); const file=$('#memoryFile').files[0]; const visibility=$('#memoryVisibility').value;
  let uploadedNew=null; let oldToDelete=null;
  try{
    let storagePath=currentMemory?.storage_path||null; let mediaType=currentMemory?.media_type||'image';
    if(file){
      oldToDelete=currentMemory?{...currentMemory}:null;
      uploadedNew=await uploadMedia(file,visibility); storagePath=uploadedNew.path; mediaType=file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':'image';
    } else if(currentMemory && currentMemory.visibility!==visibility && currentMemory.storage_path){
      throw new Error('Si cambias un recuerdo de público a privado (o al revés), selecciona nuevamente el archivo para moverlo de bucket.');
    }
    if(!storagePath)throw new Error('Selecciona una foto, video o audio.');
    const payload={title:$('#memoryTitle').value.trim(),description:$('#memoryDescription').value.trim(),memory_date:$('#memoryDate').value||null,place:$('#memoryPlace').value.trim()||null,lat:numOrNull($('#memoryLat').value),lng:numOrNull($('#memoryLng').value),tags:$('#memoryTags').value.split(',').map(x=>x.trim()).filter(Boolean),favorite:$('#memoryFavorite').checked,featured:$('#memoryFeatured').checked,visibility,chapter_id:$('#memoryChapter').value||null,storage_path:storagePath,media_type:mediaType,updated_at:new Date().toISOString()};
    const result=currentMemory?await supabase.from('memories').update(payload).eq('id',currentMemory.id):await supabase.from('memories').insert(payload);
    if(result.error)throw result.error;
    if(oldToDelete?.storage_path)await deleteMedia(oldToDelete);
    toast('Recuerdo guardado.','success');resetMemoryForm();await loadMemories();
  }catch(err){
    if(uploadedNew?.path){try{const bucket=visibility==='private'?APP_CONFIG.supabase.privateBucket:APP_CONFIG.supabase.publicBucket;await supabase.storage.from(bucket).remove([uploadedNew.path]);}catch{}}
    toast(err.message,'error');
  }
}

function numOrNull(v){const n=Number(v);return v===''||!Number.isFinite(n)?null:n;}
function resetMemoryForm(){currentMemory=null;$('#memoryForm').reset();$('#memorySubmit').textContent='Guardar recuerdo';$('#memoryPreview').innerHTML='';}
async function memoryListAction(e){const edit=e.target.closest('[data-edit-memory]'),del=e.target.closest('[data-delete-memory]'),res=e.target.closest('[data-restore-memory]');if(edit)return editMemory(edit.dataset.editMemory);if(del)return softDelete('memories',del.dataset.deleteMemory,loadMemories);if(res)return restore('memories',res.dataset.restoreMemory,loadMemories);}
async function editMemory(id){
  currentMemory=memories.find(m=>m.id===id);if(!currentMemory)return;selectTab('memories');$('#memoryTitle').value=currentMemory.title||'';$('#memoryDescription').value=currentMemory.description||'';$('#memoryDate').value=currentMemory.memory_date||'';$('#memoryPlace').value=currentMemory.place||'';$('#memoryLat').value=currentMemory.lat??'';$('#memoryLng').value=currentMemory.lng??'';$('#memoryTags').value=(currentMemory.tags||[]).join(', ');$('#memoryFavorite').checked=!!currentMemory.favorite;$('#memoryFeatured').checked=!!currentMemory.featured;$('#memoryVisibility').value=currentMemory.visibility||'public';$('#memoryChapter').value=currentMemory.chapter_id||'';$('#memorySubmit').textContent='Actualizar recuerdo';const url=await getMediaUrl(currentMemory);$('#memoryPreview').innerHTML=currentMemory.media_type==='image'?`<img src="${escapeHtml(url)}" alt="">`:`<span>Archivo actual: ${escapeHtml(currentMemory.media_type)}</span>`;window.scrollTo({top:0,behavior:'smooth'});
}

const GENERIC={
  chapters:{table:'chapters',title:'Capítulos',fields:[['chapter_number','Número','number'],['chapter_date','Fecha','date'],['emoji','Emoji','text'],['title','Título','text'],['body','Historia','textarea']]},
  plans:{table:'plans',title:'Planes y bucket list',fields:[['title','Plan','text'],['details','Detalles','textarea'],['category','Categoría','text'],['target_date','Fecha objetivo','date'],['completed','Completado','checkbox']]},
  capsules:{table:'capsules',title:'Cápsulas del tiempo',fields:[['title','Título','text'],['message','Mensaje','textarea'],['unlock_at','Desbloquear en','datetime-local'],['visibility','Visibilidad','select:public|private']]},
  events:{table:'events',title:'Fechas y cuentas regresivas',fields:[['title','Evento','text'],['event_date','Fecha','date'],['event_type','Tipo','select:anniversary|birthday|trip|date|other'],['description','Descripción','textarea'],['countdown','Mostrar cuenta atrás','checkbox'],['annual','Repetir cada año','checkbox']]},
  achievements:{table:'achievements',title:'Logros de pareja',fields:[['badge','Emoji','text'],['title','Logro','text'],['description','Descripción','textarea'],['achieved_on','Fecha','date']]},
  profiles:{table:'profiles',title:'Perfiles',key:'user_slot',fields:[['user_slot','Perfil','select:david|madeline'],['display_name','Nombre','text'],['bio','Bio','textarea'],['birthday','Cumpleaños','date'],['favorite_things','Cosas favoritas (separadas por coma)','csv']]},
  playlist:{table:'playlist',title:'Nuestra playlist',fields:[['title','Canción','text'],['artist','Artista','text'],['url','Enlace','text'],['note','Por qué significa algo','textarea']]},
  questions:{table:'couple_questions',title:'Preguntas para responder juntos',fields:[['question','Pregunta','textarea'],['question_date','Fecha','date'],['generated_by_ai','Generada con IA','checkbox']]}
};
let genericData={};

async function loadGenericData(){
  for(const [name,cfg] of Object.entries(GENERIC)){const orderKey=cfg.table==='chapters'?'chapter_number':cfg.table==='profiles'?'user_slot':'created_at';const {data}=await supabase.from(cfg.table).select('*').order(orderKey,{ascending:true});genericData[name]=data||[];}
  renderGeneric();
  const ch=$('#memoryChapter'); if(ch){const selected=ch.value;ch.innerHTML='<option value="">Sin capítulo</option>'+((genericData.chapters||[]).filter(x=>!x.deleted_at).map(x=>`<option value="${x.id}">Cap. ${x.chapter_number} · ${escapeHtml(x.title)}</option>`).join(''));ch.value=selected;}
}

function renderGeneric(){
  const forms=[],lists=[];
  for(const [name,cfg] of Object.entries(GENERIC)){
    forms.push(`<section class="generic-panel" data-generic-panel="${name}"><h3>${cfg.title}</h3><form data-generic-form="${name}"><input type="hidden" name="_id"><div class="form-grid">${cfg.fields.map(f=>fieldHtml(f)).join('')}</div><div class="form-actions">${name==='chapters'?'<button type="button" id="aiChapterAdmin" class="ghost-btn">✨ Ayúdame con IA</button>':''}<button type="submit" class="primary-btn">Guardar</button><button type="reset" class="ghost-btn">Limpiar</button></div></form></section>`);
    lists.push(`<section class="generic-panel" data-generic-list="${name}"><h3>${cfg.title} guardados</h3>${(genericData[name]||[]).map(r=>`<article class="admin-list-item ${r.deleted_at?'deleted':''}"><div><strong>${escapeHtml(r.title||r.display_name||r.question||r.user_slot||'Elemento')}</strong><small>${escapeHtml(summary(r,cfg))}</small></div><div class="inline-actions"><button type="button" data-generic-edit="${name}:${r.id||r[cfg.key]}">Editar</button>${r.deleted_at?`<button type="button" data-generic-restore="${name}:${r.id||r[cfg.key]}">Restaurar</button>`:`${cfg.table==='profiles'?'':`<button type="button" data-generic-delete="${name}:${r.id}">Papelera</button>`}`}</div></article>`).join('')||'<div class="empty-state">Sin elementos todavía.</div>'}</section>`);
  }
  $('#genericForms').innerHTML=forms.join('');$('#genericLists').innerHTML=lists.join('');
  const ai=$('#genericForms #aiChapterAdmin');if(ai)ai.addEventListener('click',()=>aiForField('chapter'));
}

function fieldHtml([key,label,type]){if(type==='textarea')return `<label class="full"><span>${label}</span><textarea name="${key}" rows="4"></textarea></label>`;if(type==='checkbox')return `<label class="check"><input name="${key}" type="checkbox"><span>${label}</span></label>`;if(type.startsWith('select:'))return `<label><span>${label}</span><select name="${key}">${type.slice(7).split('|').map(v=>`<option value="${v}">${v}</option>`).join('')}</select></label>`;return `<label><span>${label}</span><input name="${key}" type="${type==='csv'?'text':type}"></label>`;}
function summary(r,cfg){return cfg.fields.slice(0,3).map(([k])=>Array.isArray(r[k])?r[k].join(', '):r[k]).filter(v=>v!==null&&v!==undefined&&v!=='').join(' · ');}

async function genericSubmit(e){
  const form=e.target.closest('[data-generic-form]');if(!form)return;e.preventDefault();const name=form.dataset.genericForm,cfg=GENERIC[name];const fd=new FormData(form),payload={};
  for(const [key,,type] of cfg.fields){if(type==='checkbox')payload[key]=form.elements[key].checked;else if(type==='number')payload[key]=Number(fd.get(key)||0);else if(type==='csv')payload[key]=String(fd.get(key)||'').split(',').map(x=>x.trim()).filter(Boolean);else payload[key]=fd.get(key)||null;}
  const id=fd.get('_id');
  try{let q;if(cfg.table==='profiles'){q=await supabase.from(cfg.table).upsert(payload);}else if(id){q=await supabase.from(cfg.table).update(payload).eq('id',id);}else q=await supabase.from(cfg.table).insert(payload);if(q.error)throw q.error;toast(`${cfg.title}: guardado.`,'success');form.reset();form.elements._id.value='';await loadGenericData();}catch(err){toast(err.message,'error')}
}

async function genericListAction(e){
  const edit=e.target.closest('[data-generic-edit]'),del=e.target.closest('[data-generic-delete]'),res=e.target.closest('[data-generic-restore]');if(edit){const [name,id]=edit.dataset.genericEdit.split(':');return editGeneric(name,id)}if(del){const [name,id]=del.dataset.genericDelete.split(':');return softDelete(GENERIC[name].table,id,loadGenericData)}if(res){const [name,id]=res.dataset.genericRestore.split(':');return restore(GENERIC[name].table,id,loadGenericData)}
}

function editGeneric(name,id){const cfg=GENERIC[name];const row=(genericData[name]||[]).find(r=>String(r.id||r[cfg.key])===id);if(!row)return;selectTab('story');const form=$(`[data-generic-form="${name}"]`);form.elements._id.value=row.id||'';for(const [key,,type] of cfg.fields){if(type==='checkbox')form.elements[key].checked=!!row[key];else if(type==='datetime-local'&&row[key])form.elements[key].value=new Date(row[key]).toISOString().slice(0,16);else if(type==='csv')form.elements[key].value=(row[key]||[]).join(', ');else form.elements[key].value=row[key]??'';}form.scrollIntoView({behavior:'smooth',block:'start'});}
async function softDelete(table,id,cb){if(!confirm('¿Mover a la papelera? Podrás restaurarlo después.'))return;const {error}=await supabase.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id);if(error)toast(error.message,'error');else{toast('Movido a la papelera.');await cb();}}
async function restore(table,id,cb){const {error}=await supabase.from(table).update({deleted_at:null}).eq('id',id);if(error)toast(error.message,'error');else{toast('Restaurado.','success');await cb();}}


async function aiMemoryCaption(){
  try{
    const btn=$('#aiMemoryCaption');btn.disabled=true;btn.textContent='Creando…';
    const text=await generateWithAI({type:'caption',prompt:$('#memoryDescription').value,context:{names:(content.couple?.names||APP_CONFIG.couple.names),title:$('#memoryTitle').value,date:$('#memoryDate').value,place:$('#memoryPlace').value,tags:$('#memoryTags').value},maxLength:320});
    $('#memoryDescription').value=text;
    btn.textContent='✨ Dedicatoria con IA';btn.disabled=false;
  }catch(e){toast(e.message,'error');const btn=$('#aiMemoryCaption');btn.textContent='✨ Dedicatoria con IA';btn.disabled=false;}
}

async function aiForField(type){
  try{if(type==='letter'){const btn=$('#aiLetterAdmin');btn.disabled=true;const text=await generateWithAI({type:'letter',prompt:$('#letterBodyInput').value,context:{names:(content.couple?.names||APP_CONFIG.couple.names),startedTalking:(content.couple?.startedTalking||APP_CONFIG.couple.startedTalking),firstMeeting:(content.couple?.firstMeeting||APP_CONFIG.couple.firstMeeting)},maxLength:1100});$('#letterBodyInput').value=text;btn.disabled=false;}
  else{const form=$('[data-generic-form="chapters"]');const prompt=form.elements.body.value||form.elements.title.value;const text=await generateWithAI({type:'chapter',prompt,context:{names:(content.couple?.names||APP_CONFIG.couple.names),title:form.elements.title.value,date:form.elements.chapter_date.value},maxLength:900});form.elements.body.value=text;}}
  catch(e){toast(e.message,'error');const b=$('#aiLetterAdmin');if(b)b.disabled=false;}
}

function handleHash(){const h=location.hash.slice(1);if(h.startsWith('memory:')){selectTab('memories');const id=h.split(':')[1];if(memories.length)editMemory(id);}}

init();
