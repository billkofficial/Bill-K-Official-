import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig, ADMIN_UID } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const collections = ["songs","albums","videos","events","ministry","gallery"];
let currentCollection = null, currentId = null;

const schemas = {
  songs: [
    ["title","Song title","text",true],["artist","Artist","text"],["releaseDate","Release date","date"],
    ["coverUrl","Cover image URL","url"],["youtube","YouTube URL","url"],["spotify","Spotify URL","url"],
    ["appleMusic","Apple Music URL","url"],["boomplay","Boomplay URL","url"],["audiomack","Audiomack URL","url"],
    ["description","Description","textarea"],["featured","Featured","checkbox"],["published","Published","checkbox",true]
  ],
  albums: [
    ["title","Album / EP title","text",true],["artist","Artist","text"],["releaseDate","Release date","date"],
    ["coverUrl","Cover image URL","url"],["type","Type (Album / EP / Single)","text"],["description","Description","textarea"],
    ["tracks","Tracks (one per line)","textarea"],["featured","Featured","checkbox"],["published","Published","checkbox",true]
  ],
  videos: [
    ["title","Video title","text",true],["youtube","YouTube URL","url",true],["thumbnail","Thumbnail URL","url"],
    ["description","Description","textarea"],["published","Published","checkbox",true]
  ],
  events: [
    ["title","Event title","text",true],["date","Date","date",true],["time","Time","time"],
    ["venue","Venue","text"],["location","Location","text"],["description","Description","textarea"],
    ["posterUrl","Poster URL","url"],["ticketUrl","Ticket / booking URL","url"],["ticketInfo","Ticket information","textarea"],
    ["published","Published","checkbox",true]
  ],
  ministry: [
    ["title","Title","text",true],["category","Category","text"],["imageUrl","Image URL","url"],
    ["description","Description","textarea"],["link","More information URL","url"],["published","Published","checkbox",true]
  ],
  gallery: [
    ["title","Caption","text"],["imageUrl","Image URL","url",true],["alt","Accessibility text","text"],
    ["published","Published","checkbox",true]
  ]
};

function show(view) {
  $("#loginView").classList.toggle("hidden", view !== "login");
  $("#appView").classList.toggle("hidden", view !== "app");
}
function msg(el, text, good=false) {
  el.textContent = text; el.className = "message " + (good ? "good" : "bad");
  setTimeout(()=>el.textContent="",3500);
}
function escapeHtml(v="") {
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

onAuthStateChanged(auth, async user => {
  if (!user) return show("login");
  try {
    if (user.uid !== ADMIN_UID) {
      await signOut(auth); msg($("#loginMsg"),"This account is not an authorized administrator."); return;
    }
    $("#userEmail").textContent = user.email ? " · " + user.email : "";
    show("app"); await loadAll();
  } catch(e) { msg($("#loginMsg"), "Firebase setup/security error: " + e.message); }
});

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  try { await signInWithEmailAndPassword(auth,$("#email").value,$("#password").value); }
  catch(e) { msg($("#loginMsg"),"Sign-in failed: " + e.message.replace("Firebase: ","")); }
});
$("#resetBtn").addEventListener("click", async () => {
  const email=$("#email").value.trim();
  if(!email) return msg($("#loginMsg"),"Enter your admin email first.");
  try { await sendPasswordResetEmail(auth,email); msg($("#loginMsg"),"Password reset email sent.",true); }
  catch(e){ msg($("#loginMsg"),"Could not send reset email: "+e.message); }
});
$("#logoutBtn").onclick=()=>signOut(auth);

$("#nav").addEventListener("click", e => {
  const b=e.target.closest("button[data-section]"); if(!b) return;
  $$(".section").forEach(x=>x.classList.remove("active"));
  $("#"+b.dataset.section).classList.add("active");
  $("#sectionTitle").textContent=b.textContent.trim();
});
$$("[data-go]").forEach(b=>b.onclick=()=>document.querySelector(`[data-section="${b.dataset.go}"]`).click());

async function loadAll(){
  await Promise.all(collections.map(loadCollection));
  await loadSite(); await loadAbout(); await loadSocials(); await updateStats();
}
async function loadCollection(name){
  const snap=await getDocs(collection(db,name));
  const box=$("#"+name+"List"); if(!box) return;
  box.innerHTML="";
  snap.forEach(s=>{
    const d=s.data();
    const title=d.title||d.caption||"Untitled";
    const image=d.coverUrl||d.thumbnail||d.posterUrl||d.imageUrl||"";
    box.insertAdjacentHTML("beforeend",`
      <article class="item">
        ${image?`<img src="${escapeHtml(image)}" alt="">`:"<div class='placeholder'>BK</div>"}
        <div class="item-main"><h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(d.description||d.venue||d.releaseDate||"")}</p>
        <span class="pill ${d.published===false?'off':''}">${d.published===false?'Draft':'Published'}</span></div>
        <div class="item-actions"><button data-edit="${s.id}" data-col="${name}">Edit</button><button class="danger" data-delete="${s.id}" data-col="${name}">Delete</button></div>
      </article>`);
  });
}
document.addEventListener("click", async e=>{
  const add=e.target.closest("[data-add]"); if(add) openEditor(add.dataset.add,null,{});
  const edit=e.target.closest("[data-edit]"); if(edit){
    const snap=await getDoc(doc(db,edit.dataset.col,edit.dataset.edit)); openEditor(edit.dataset.col,edit.dataset.edit,snap.data()||{});
  }
  const del=e.target.closest("[data-delete]"); if(del && confirm("Delete this item permanently?")){
    await deleteDoc(doc(db,del.dataset.col,del.dataset.delete)); await loadCollection(del.dataset.col); await updateStats();
  }
});

function openEditor(col,id,data){
  currentCollection=col; currentId=id; $("#editorTitle").textContent=(id?"Edit ":"Add ")+col;
  const box=$("#editorFields"); box.innerHTML="";
  (schemas[col]||[]).forEach(([key,label,type,required])=>{
    const val=data[key] ?? (type==="checkbox"?false:"");
    if(type==="textarea") box.insertAdjacentHTML("beforeend",`<label class="wide">${label}<textarea name="${key}" ${required?"required":""}>${escapeHtml(val)}</textarea></label>`);
    else if(type==="checkbox") box.insertAdjacentHTML("beforeend",`<label class="check"><input name="${key}" type="checkbox" ${val?"checked":""}> ${label}</label>`);
    else box.insertAdjacentHTML("beforeend",`<label>${label}<input name="${key}" type="${type}" value="${escapeHtml(val)}" ${required?"required":""}></label>`);
  });
  $("#editor").showModal();
}
async function saveEditor(e){
  e.preventDefault();
  const out={};
  schemas[currentCollection].forEach(([key,,type])=>{
    const el=$("#editorFields").elements[key]; out[key]=type==="checkbox"?el.checked:el.value.trim();
  });
  out.updatedAt=serverTimestamp();
  if(currentId) await setDoc(doc(db,currentCollection,currentId),out,{merge:true});
  else { out.createdAt=serverTimestamp(); await addDoc(collection(db,currentCollection),out); }
  $("#editor").close(); await loadCollection(currentCollection); await updateStats();
}
$("#editorForm").addEventListener("submit",saveEditor);
$("#closeEditor").onclick=()=>$("#editor").close(); $("#cancelEditor").onclick=()=>$("#editor").close();

async function loadSite(){
  const s=(await getDoc(doc(db,"settings","site"))).data()||{};
  for(const [k,v] of Object.entries(s)) { const el=$("#siteForm").elements[k]; if(el) el.value=v||""; }
}
$("#siteForm").addEventListener("submit",async e=>{
  e.preventDefault(); const o={}; [...e.target.elements].forEach(el=>{if(el.name)o[el.name]=el.value.trim();});
  await setDoc(doc(db,"settings","site"),o,{merge:true}); msg($("#siteMsg"),"Site settings saved.",true);
});
async function loadAbout(){
  const d=(await getDoc(doc(db,"settings","about"))).data()||{}; $("#aboutForm").elements.bio.value=d.bio||"";
}
$("#aboutForm").addEventListener("submit",async e=>{e.preventDefault();await setDoc(doc(db,"settings","about"),{bio:e.target.bio.value},{merge:true});msg($("#aboutMsg"),"Biography saved.",true);});
async function loadSocials(){
  const d=(await getDoc(doc(db,"settings","socials"))).data()||{};
  for(const [k,v] of Object.entries(d)){const el=$("#socialForm").elements[k];if(el)el.value=v||"";}
}
$("#socialForm").addEventListener("submit",async e=>{
  e.preventDefault();const o={};[...e.target.elements].forEach(el=>{if(el.name)o[el.name]=el.value.trim();});
  await setDoc(doc(db,"settings","socials"),o,{merge:true});msg($("#socialMsg"),"Social links saved.",true);
});
async function updateStats(){
  const counts=await Promise.all(collections.map(async c=>(await getDocs(collection(db,c))).size));
  $("#stats").innerHTML=collections.map((c,i)=>`<div class="stat"><b>${counts[i]}</b><span>${c}</span></div>`).join("");
}
