/* Only the Easy shopping shell is cached. Catalogue/API/media requests pass through. */
'use strict';
const CACHE='kalimpong-easy-shell-2aefc7625bb2f4927628';
const FILES=['easy.html','easy-core.js','easy-lists-core.js','easy-lists.js','easy.js'];
const base=new URL('./',self.location.href),urls=FILES.map(f=>new URL(f,base).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls.map(url=>new Request(url,{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);url.search='';url.hash='';
 if(!urls.includes(url.href))return;
 // Keep a whole version together. A new worker installs a complete new shell.
 event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.href)).then(hit=>hit||fetch(event.request)));
});
self.addEventListener('message',event=>{
 if(event.data!=='EASY_OFFLINE_READY'||!event.ports[0])return;
 event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(urls.map(url=>cache.match(url)))).then(items=>event.ports[0].postMessage({ready:items.every(Boolean)})).catch(()=>event.ports[0].postMessage({ready:false})));
});

