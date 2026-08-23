const CACHE='dm-v4-shell-1';
const SHELL=['./','./index.html','./album.html','./admin.html','./together.html','./diagnostics.html','./css/styles.css','./js/config.js','./js/supabase.js','./js/shared.js','./js/home.js','./js/album.js','./js/admin.js','./js/together.js','./js/diagnostics.js','./js/ai.js','./js/pwa.js','./js/export.js','./assets/icons/heart.svg','./assets/audio/our-theme.wav'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin) return;
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp;}).catch(()=>cached)));
});
