import { supabase, ensureVisitorSession, isPermanentUser } from './supabase.js';
import { APP_CONFIG } from './config.js';
import { generateWithAI } from './ai.js';

const host=document.querySelector('#diagnosticList');
function add(name,ok,detail=''){const el=document.createElement('article');el.className=`diagnostic-row ${ok?'ok':'bad'}`;el.innerHTML=`<span>${ok?'✓':'!'}</span><div><strong>${name}</strong><small>${detail}</small></div>`;host.appendChild(el);}

async function run(){
  if(!supabase){add('js/config.js',false,'Faltan URL y/o publishable/anon key de Supabase.');return;}
  add('js/config.js',true,'URL y clave pública tienen formato configurado.');
  try{const s=await ensureVisitorSession();add('Supabase Auth',true,`Sesión disponible · ${s.user.is_anonymous?'visitante anónimo':'cuenta permanente'}`);}catch(e){add('Supabase Auth',false,e.message);return;}
  for(const [label,table] of [['Textos','site_content'],['Recuerdos','memories'],['Capítulos','chapters'],['Propuesta','proposal_global_state']]){
    const {error}=await supabase.from(table).select('*').limit(1);add(label,!error,error?.message||`Tabla ${table} responde.`);
  }
  try{const {error}=await supabase.storage.from(APP_CONFIG.supabase.publicBucket).list('',{limit:1});add('Storage público',!error,error?.message||`Bucket ${APP_CONFIG.supabase.publicBucket} responde.`);}catch(e){add('Storage público',false,e.message)}
  const permanent=await isPermanentUser();add('Permisos de edición',permanent,permanent?'Cuenta permanente: edición habilitada.':'Sesión anónima: edición bloqueada, como debe ser.');
}

document.querySelector('#testAi').addEventListener('click',async()=>{const out=document.querySelector('#aiTestResult');out.hidden=false;out.textContent='Probando…';try{out.textContent=await generateWithAI({type:'reason',prompt:'Genera una razón corta para comprobar la conexión.',context:{test:true},maxLength:140});}catch(e){out.textContent=`Error: ${e.message}`;}});
run();
