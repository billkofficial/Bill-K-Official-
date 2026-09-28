import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// If Firebase has not been configured yet, the original static website remains visible.
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PASTE_")) {
  console.info("Bill K CMS: Firebase is not configured yet; showing the static site.");
} else {
  const app=initializeApp(firebaseConfig), db=getFirestore(app);
  const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const set=(sel,v)=>{const e=document.querySelector(sel);if(e&&v!==undefined&&v!==null)e.textContent=v};
  const link=(sel,v)=>{const e=document.querySelector(sel);if(e&&v){e.href=v;e.target="_blank";e.rel="noopener"}};
  async function one(path){return (await getDoc(doc(db,"settings",path))).data()||{}}
  async function published(col){const s=await getDocs(query(collection(db,col),where("published","==",true)));return s.docs.map(x=>({id:x.id,...x.data()}))}

  async function run(){
    const site=await one("site"), about=await one("about"), socials=await one("socials");
    if(site.slogan) set(".hero h1", site.slogan.replace(/^.*?\b/i,""));
    if(site.heroTitle) set(".hero h1", site.heroTitle);
    if(site.heroText) set(".hero-copy", site.heroText);
    if(site.scripture) set(".verse", `“${site.scripture}”`);
    if(site.announcement) { let a=document.querySelector(".intro p"); if(a)a.textContent=site.announcement; }
    if(about.bio) { const p=document.querySelector(".intro p"); if(p)p.textContent=about.bio; }
    if(site.whatsapp){const a=document.querySelector('.contact-list a[href^="https://wa.me/"]');if(a){a.href=site.whatsapp.startsWith("http")?site.whatsapp:"https://wa.me/"+site.whatsapp.replace(/\D/g,"");a.querySelector("strong").textContent=site.whatsapp;}}
    if(site.phone){const a=document.querySelector('.contact-list a[href^="tel:"]');if(a){a.href="tel:"+site.phone.replace(/\s/g,"");a.querySelector("strong").textContent=site.phone;}}
    if(site.email){const a=document.querySelector('.contact-list a[href^="mailto:"]');if(a){a.href="mailto:"+site.email;a.querySelector("strong").textContent=site.email;}}
    const socialMap={youtube:".social-grid a:nth-child(1)",tiktok:".social-grid a:nth-child(2)",instagram:".social-grid a:nth-child(3)",facebook:".social-grid a:nth-child(4)",spotify:".social-grid a:nth-child(5)",boomplay:".social-grid a:nth-child(6)",audiomack:".social-grid a:nth-child(7)"};
    Object.entries(socialMap).forEach(([k,s])=>link(s,socials[k]));

    const songs=await published("songs");
    if(songs.length){const grid=document.querySelector(".music-grid");if(grid)grid.innerHTML=songs.map((d,i)=>`<article class="music-card ${i===0?'featured':''}"><img src="${esc(d.coverUrl||'assets/testimony-of-grace.jpg')}" alt="${esc(d.title)}"><div class="card-body"><span>${esc(d.type||'SONG')}</span><h3>${esc(d.title)}</h3><p>${esc(d.description||'')}</p><div class="links">${d.youtube?`<a href="${esc(d.youtube)}" target="_blank" rel="noopener">YouTube</a>`:''}${d.spotify?`<a href="${esc(d.spotify)}" target="_blank" rel="noopener">Spotify</a>`:''}${d.boomplay?`<a href="${esc(d.boomplay)}" target="_blank" rel="noopener">Boomplay</a>`:''}${d.audiomack?`<a href="${esc(d.audiomack)}" target="_blank" rel="noopener">Audiomack</a>`:''}</div></div></article>`).join("");}

    const albums=await published("albums");
    if(albums.length){const grid=document.querySelector(".music-grid");if(grid){/* songs remain the primary music cards; album data is used when no songs exist */ if(!songs.length)grid.innerHTML=albums.map(d=>`<article class="music-card featured"><img src="${esc(d.coverUrl||'assets/testimony-of-grace.jpg')}" alt="${esc(d.title)}"><div class="card-body"><span>${esc(d.type||'ALBUM')}</span><h3>${esc(d.title)}</h3><p>${esc(d.description||'')}</p></div></article>`).join("");}}

    const events=await published("events");
    if(events.length){const section=document.createElement("section");section.className="section dark-section cms-events";section.innerHTML=`<div class="section-head"><div><div class="section-label">EVENTS</div><h2>Upcoming moments</h2></div></div><div class="music-grid">${events.map(d=>`<article class="music-card"><img src="${esc(d.posterUrl||'assets/the-journey.jpg')}" alt="${esc(d.title)}"><div class="card-body"><span>${esc(d.date||'EVENT')}</span><h3>${esc(d.title)}</h3><p>${esc(d.venue||d.location||'')}${d.ticketInfo?` — ${esc(d.ticketInfo)}`:''}</p>${d.ticketUrl?`<div class="links"><a href="${esc(d.ticketUrl)}" target="_blank" rel="noopener">Tickets</a></div>`:''}</div></article>`).join("")}</div>`;document.querySelector("main").insertBefore(section,document.querySelector("#booking"));}

    const videos=await published("videos");
    if(videos.length){const first=videos[0];const card=document.querySelector(".youtube-card");if(card){card.href=first.youtube||card.href;const h=card.querySelector("h3");if(h)h.textContent=first.title;const p=card.querySelector("p");if(p&&first.description)p.textContent=first.description;}}
  }
  run().catch(e=>console.error("Bill K CMS load error:",e));
}
