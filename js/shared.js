import { supabase, ensureVisitorSession, isPermanentUser } from './supabase.js';
import { APP_CONFIG } from './config.js';

export const FALLBACK_CONTENT = {
  couple: { david:'David', madeline:'Madeline', names:'David & Madeline', startedTalking:'2026-07-12', firstMeeting:'2026-08-16' },
  hero: {
    eyebrow: 'Nuestra historia, escrita a dos corazones',
    title: 'David & Madeline',
    subtitle: 'Hay encuentros que parecen casualidad… hasta que empiezas a sentir que todo te estaba llevando a esa persona.',
    question: '¿Quieres seguir escribiendo esta historia conmigo?'
  },
  letter: {
    title: 'Para ti, mi lugar favorito ❤️',
    body: 'Desde que llegaste, los días comunes empezaron a tener algo especial. No quiero prometerte una historia perfecta; quiero prometerte una historia real: con risas, conversaciones eternas, planes improvisados, apoyo en los días difíciles y muchos recuerdos que todavía no existen. Si algún día vuelves a esta carta, quiero que recuerdes esto: elegirte no fue un impulso de un instante. Fue darme cuenta, poco a poco, de que quiero seguir descubriendo la vida contigo.'
  },
  reasons: [
    'Porque contigo una conversación sencilla puede convertirse en mi parte favorita del día.',
    'Porque haces que tenga ganas de crear recuerdos incluso en los días normales.',
    'Porque me gusta quién soy cuando estoy contigo.',
    'Porque todavía tenemos demasiadas primeras veces por vivir.'
  ],
  jar_messages: [
    'Hoy también te elegiría.',
    'Gracias por convertirte en un lugar seguro dentro de mis días.',
    'Algún día miraremos atrás y sonreiremos por todo lo que empezó con un simple hola.',
    'No necesito un día especial para recordarte lo importante que eres para mí.'
  ],
  open_when: [
    { title: 'Abrir cuando me extrañes', body: 'Si me extrañas, piensa que en alguna parte yo también estoy deseando volver a verte. La distancia solo confirma cuánto significan nuestros momentos juntos.' },
    { title: 'Abrir cuando tengas un día difícil', body: 'No tienes que poder con todo al mismo tiempo. Quiero estar para escucharte, acompañarte y recordarte lo increíble que eres incluso cuando tú no puedas verlo.' },
    { title: 'Abrir cuando quieras sonreír', body: 'Busca una de nuestras fotos más tontas. Si no funciona, recuerda que de todas las personas del mundo terminaste encontrándome a mí. Eso ya es bastante gracioso.' }
  ],
  section_texts: {
    history_title: 'Dos fechas que cambiaron el rumbo',
    gallery_title: 'Nuestro archivo de momentos',
    chapters_title: 'Capítulos que todavía siguen creciendo',
    plans_title: 'Lo que todavía nos falta vivir',
    capsules_title: 'Mensajes para nuestro futuro'
  },
  settings: {
    music_enabled: true,
    music_url: './assets/audio/our-theme.wav',
    relationship_label: 'Desde nuestro primer hola',
    footer: 'Hecho con recuerdos, promesas y un poquito de código ❤️'
  },
  date_ideas: [
    'Picnic al atardecer con una playlist hecha por los dos',
    'Cocinar una receta que ninguno haya probado',
    'Salir a manejar sin destino y elegir el lugar sobre la marcha',
    'Noche de películas con snacks escogidos por el otro',
    'Tomar fotos como turistas en nuestra propia ciudad',
    'Escribir una carta para abrir dentro de un año'
  ],
  questions: [
    '¿Qué pequeño momento conmigo recuerdas con más cariño?',
    '¿Qué lugar te gustaría conocer juntos algún día?',
    '¿Qué cosa cotidiana te hace sentir querido/a?',
    '¿Qué canción te hace pensar en nosotros?'
  ]
};

export function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

export function formatDate(dateValue, options={day:'2-digit', month:'long', year:'numeric'}) {
  if (!dateValue) return '';
  const [y,m,d] = String(dateValue).slice(0,10).split('-').map(Number);
  if (!y || !m || !d) return String(dateValue);
  return new Intl.DateTimeFormat('es-PA', options).format(new Date(Date.UTC(y,m-1,d,12)));
}

export function formatDateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-PA', {dateStyle:'medium', timeStyle:'short'}).format(new Date(value));
}

export function daysBetween(startDate, endDate=new Date()) {
  const [y,m,d] = startDate.split('-').map(Number);
  const start = Date.UTC(y,m-1,d);
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  return Math.max(0, Math.floor((end-start)/86400000));
}

export function randomItem(arr=[]) { return arr[Math.floor(Math.random()*arr.length)]; }

export function toast(message, type='info') {
  let host = document.querySelector('#toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  host.appendChild(item);
  setTimeout(() => item.classList.add('show'), 20);
  setTimeout(() => { item.classList.remove('show'); setTimeout(()=>item.remove(),250); }, 3600);
}

export async function loadContent() {
  if (!supabase) return structuredClone(FALLBACK_CONTENT);
  await ensureVisitorSession();
  const { data, error } = await supabase.from('site_content').select('key,value');
  if (error) {
    console.warn('site_content fallback', error);
    return structuredClone(FALLBACK_CONTENT);
  }
  const merged = structuredClone(FALLBACK_CONTENT);
  for (const row of data || []) merged[row.key] = row.value;
  return merged;
}

export async function getProposalState() {
  if (!supabase) return { accepted:false, accepted_at:null };
  await ensureVisitorSession();
  const { data } = await supabase.from('proposal_global_state').select('*').eq('id',1).maybeSingle();
  return data || { accepted:false, accepted_at:null };
}

export async function acceptProposalForever() {
  await ensureVisitorSession();
  const { data, error } = await supabase.rpc('accept_proposal_forever');
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function getMediaUrl(memory) {
  if (!supabase || !memory?.storage_path) return memory?.public_url || '';
  if (memory.visibility === 'private') {
    if (!(await isPermanentUser())) return '';
    const { data, error } = await supabase.storage.from(APP_CONFIG.supabase.privateBucket).createSignedUrl(memory.storage_path, 3600);
    if (error) return '';
    return data.signedUrl;
  }
  return supabase.storage.from(APP_CONFIG.supabase.publicBucket).getPublicUrl(memory.storage_path).data.publicUrl;
}

export async function uploadMedia(file, visibility='public') {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const safe = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');
  const path = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}-${safe}`;
  const bucket = visibility === 'private' ? APP_CONFIG.supabase.privateBucket : APP_CONFIG.supabase.publicBucket;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type });
  if (error) throw error;
  return { path, bucket };
}

export async function deleteMedia(memory) {
  if (!memory?.storage_path || !supabase) return;
  const bucket = memory.visibility === 'private' ? APP_CONFIG.supabase.privateBucket : APP_CONFIG.supabase.publicBucket;
  await supabase.storage.from(bucket).remove([memory.storage_path]);
}

export function setAdminLinksVisibility(isAdmin) {
  document.querySelectorAll('[data-admin-only]').forEach(el => el.hidden = !isAdmin);
}
