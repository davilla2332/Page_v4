let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  document.querySelectorAll('[data-install-app]').forEach(b => b.hidden = false);
});
window.addEventListener('pwa-install-request', async()=>{
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
}
