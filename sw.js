const CACHE='ul-tracker-v14';
const ASSETS=['./','./manifest.json','./logo.svg'];
const LIVE_PATHS=new Set(['/','/index.html','/app.html','/landing.js','/backend.js','/program.js','/autosave.js']);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return;
  if(LIVE_PATHS.has(url.pathname)){
    e.respondWith(fetch(e.request).catch(()=>url.pathname==='/app.html'?caches.match('./index.html'):Response.error()));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request)));
});