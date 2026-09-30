const CACHE='ul-tracker-v22';
const ASSETS=['./manifest.json','./logo.svg','./app.css?v=5','./workout-artwork.js?v=3','./workout-artwork/male/back.webp','./workout-artwork/male/chest.webp','./workout-artwork/male/arms.webp','./workout-artwork/male/legs.webp','./workout-artwork/male/front.webp','./workout-artwork/male/posterior.webp','./workout-artwork/female/back.webp','./workout-artwork/female/chest.webp','./workout-artwork/female/arms.webp','./workout-artwork/female/legs.webp','./workout-artwork/female/front.webp','./workout-artwork/female/posterior.webp'];
const LIVE_PATHS=new Set(['/','/index.html','/app.html','/landing.js','/backend.js','/program.js','/autosave.js']);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ul-tracker-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return;
  if(LIVE_PATHS.has(url.pathname)){
    e.respondWith(fetch(e.request).catch(()=>Response.error()));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request)));
});
