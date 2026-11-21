const C='literasa-v19';            // cache aplikasi (diganti tiap rilis)
const M='literasa-media-v3';       // cache video (dipertahankan antarrilis)
const VIDEO='video-level2-v3.mp4';
const F=['./','index.html','surat.html','ayo-bermain.html','detektif-surat.html','asesmen.html','literasa.css','literasa.js','poster-level2.jpg','icon-192.png','icon-512.png','manifest.json'];
self.addEventListener('install',e=>{
  e.waitUntil(Promise.all([
    caches.open(C).then(c=>Promise.all(F.map(u=>c.add(u).catch(()=>{})))),
    /* video disimpan utuh agar Level 2 bisa diputar tanpa internet; gagal diam-diam bila sedang offline */
    caches.open(M).then(c=>c.match(VIDEO).then(h=>h||c.add(VIDEO))).catch(()=>{})
  ]).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==M).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));

/* Video dilayani dari cache dengan dukungan Range (dibutuhkan pemutar video untuk melompat). Bila belum tersimpan, ambil dari jaringan. */
async function video(req){
  const r=await (await caches.open(M)).match(VIDEO);
  if(!r)return fetch(req);
  const b=await r.blob(),n=b.size,h=req.headers.get('range'),m=h&&/bytes=(\d*)-(\d*)/.exec(h);
  const ct={'Content-Type':'video/mp4','Accept-Ranges':'bytes'};
  if(!m)return new Response(b,{status:200,headers:Object.assign({'Content-Length':n},ct)});
  let s=m[1]===''?Math.max(0,n-parseInt(m[2],10)):parseInt(m[1],10),e=(m[1]===''||m[2]==='')?n-1:Math.min(parseInt(m[2],10),n-1);
  if(isNaN(s)||s>=n||e<s)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+n}});
  return new Response(b.slice(s,e+1),{status:206,headers:Object.assign({'Content-Range':'bytes '+s+'-'+e+'/'+n,'Content-Length':e-s+1},ct)});
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  // Jangan campuri permintaan ke server lain (mis. Apps Script untuk cek koneksi asesmen)
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  if(u.pathname.endsWith('/'+VIDEO)){e.respondWith(video(e.request));return}
  if(/\.(mp4|webm)$/i.test(u.pathname))return;
  e.respondWith(caches.match(e.request).then(r=>{
    const n=fetch(e.request).then(x=>{if(x.ok){const y=x.clone();caches.open(C).then(c=>c.put(e.request,y))}return x}).catch(()=>r);
    return r||n;
  }));
});
