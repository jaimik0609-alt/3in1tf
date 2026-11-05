(() => {
"use strict";
const $ = id => document.getElementById(id);
const form = $("businessForm");
const ids = {name:"businessName",description:"description",phone:"whatsapp",instagram:"instagram",google:"google",maps:"maps",logo:"logoUrl"};
let localLogo = "", toastTimer;

const clean = (v,n=500) => String(v || "").trim().slice(0,n);
const initials = name => {
  const w = clean(name,70).split(/\s+/).filter(Boolean);
  return (w.length>1 ? w[0][0]+w[1][0] : (w[0]||"T").slice(0,2)).toUpperCase();
};
function avatar(id,name,url) {
  const el=$(id); el.replaceChildren();
  if(url) {
    const img=new Image(); img.alt="Business logo"; img.referrerPolicy="no-referrer";
    img.src=url; img.onerror=()=>{el.textContent=initials(name);}; el.appendChild(img);
  } else el.textContent=initials(name);
}
function validateUrl(value,label,required) {
  const raw=clean(value,1000);
  if(!raw){if(required) throw Error(label+" is required."); return "";}
  let u; try{u=new URL(raw);}catch{throw Error("Enter a valid "+label+" starting with https://");}
  if(!["https:","http:"].includes(u.protocol)||!u.hostname.includes(".")) throw Error("Enter a valid "+label+" starting with https://");
  return u.href;
}
function readForm() {
  const name=clean($(ids.name).value,70);
  if(!name) throw Error("Please enter your business name.");
  const phone=clean($(ids.phone).value).replace(/\D/g,"");
  if(phone.length<8||phone.length>15) throw Error("Enter a WhatsApp number with country code (8–15 digits).");
  return {v:1,n:name,d:clean($(ids.description).value,180),w:phone,
    i:validateUrl($(ids.instagram).value,"Instagram URL",true),
    g:validateUrl($(ids.google).value,"Google Review URL",true),
    m:validateUrl($(ids.maps).value,"Google Maps URL",false),
    l:validateUrl($(ids.logo).value,"Public logo URL",false)};
}
function encode64(text) {
  const bytes=new TextEncoder().encode(text); let bin="";
  bytes.forEach(b=>bin+=String.fromCharCode(b));
  return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function decode64(text) {
  const s=text.replace(/-/g,"+").replace(/_/g,"/");
  const bin=atob(s+"=".repeat((4-s.length%4)%4));
  return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)));
}
function makeUrl(p) { return location.origin+location.pathname+"#p="+encode64(JSON.stringify(p)); }
function showToast(msg) {
  const el=$("toast"); el.textContent=msg; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2600);
}
function formError(msg) { $("formError").textContent=msg; $("formError").classList.add("show"); }
function updatePreview() {
  const name=clean($(ids.name).value,70)||"Your Business";
  const desc=clean($(ids.description).value,180)||"Your business description will appear here.";
  $("previewName").textContent=name; $("previewDescription").textContent=desc;
  const url=clean($(ids.logo).value);
  if(url){avatar("previewAvatar",name,url);avatar("uploadAvatar",name,url);}
  else if(localLogo){
    ["previewAvatar","uploadAvatar"].forEach(id=>{const el=$(id);el.replaceChildren();const img=new Image();img.alt="Local logo preview";img.src=localLogo;el.appendChild(img);});
  } else {avatar("previewAvatar",name,"");avatar("uploadAvatar",name,"");}
}
Object.values(ids).forEach(id=>$(id).addEventListener("input",updatePreview));
$("logoFile").addEventListener("change",e=>{
  const file=e.target.files&&e.target.files[0]; if(!file)return;
  if(!/^image\/(png|jpeg|webp)$/.test(file.type)){formError("Choose a PNG, JPG or WEBP logo.");return;}
  if(file.size>2*1024*1024){formError("Logo must be 2 MB or smaller.");return;}
  const r=new FileReader();r.onload=()=>{localLogo=String(r.result);updatePreview();$("formError").classList.remove("show");};r.onerror=()=>formError("Could not read the selected logo.");r.readAsDataURL(file);
});
function showPublic(p,url) {
  $("builderPage").hidden=true; $("livePage").hidden=false; document.body.classList.add("is-live");
  $("publicName").textContent=p.n; $("publicDescription").textContent=p.d; $("publicDescription").hidden=!p.d;
  avatar("publicAvatar",p.n,p.l);
  $("reviewLink").href=p.g; $("instagramLink").href=p.i; $("whatsappLink").href="https://wa.me/"+p.w;
  $("mapsLink").href=p.m; $("mapsLink").hidden=!p.m;
  document.title=p.n+" — TAPFLOW";
  history.replaceState(null,"",url);
}
function loadProfile() {
  const p=new URLSearchParams(location.hash.slice(1)).get("p"); if(!p)return false;
  try {
    const data=JSON.parse(decode64(p));
    if(data.v!==1||!data.n||!data.w||!data.i||!data.g) throw Error("Bad data");
    showPublic(data,location.href); return true;
  } catch(e) { formError("This TAPFLOW profile link is invalid or incomplete. Please create the profile again."); return false; }
}
form.addEventListener("submit",e=>{
  e.preventDefault(); $("formError").classList.remove("show");
  try {
    const p=readForm(); const url=makeUrl(p);
    // Conservative size check: NTAG216 has 888 bytes of user memory.
    // Never shorten or truncate profile data to force it onto the tag.
    const urlBytes=new TextEncoder().encode(url).length;
    const estimatedNdefBytes=urlBytes+8;
    if(estimatedNdefBytes>888) throw Error("This profile is approximately "+estimatedNdefBytes+" bytes, exceeding NTAG216's 888-byte user memory. Shorten long links or the description.");
    showPublic(p,url); window.scrollTo({top:0,behavior:"smooth"});
  } catch(err) { formError(err.message||"Please check your information."); }
});
updatePreview();
if(loadProfile()) { $("builderPage").hidden=true; $("livePage").hidden=false; document.body.classList.add("is-live"); }
})();