(() => {
"use strict";
const $ = id => document.getElementById(id);
const form = $("businessForm");
const ids = {name:"businessName",description:"description",phone:"whatsapp",instagram:"instagram",google:"google",maps:"maps",logo:"logoUrl"};
let localLogo = "", profileLink = "", toastTimer;

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
  $("builderPage").hidden=true; $("livePage").hidden=false; $("headerState")?.replaceChildren();
  $("publicName").textContent=p.n; $("publicDescription").textContent=p.d; $("publicDescription").hidden=!p.d;
  avatar("publicAvatar",p.n,p.l);
  $("reviewLink").href=p.g; $("instagramLink").href=p.i; $("whatsappLink").href="https://wa.me/"+p.w;
  $("mapsLink").href=p.m; $("mapsLink").hidden=!p.m;
  $("profileUrl").textContent=url; profileLink=url; document.title=p.n+" — TAPFLOW";
  history.replaceState(null,"",url);
  $("liveMessage").className="live-message";
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
$("editButton").addEventListener("click",()=>{
  try {
    const p=JSON.parse(decode64(new URLSearchParams(location.hash.slice(1)).get("p")));
    $(ids.name).value=p.n; $(ids.description).value=p.d||""; $(ids.phone).value=p.w;
    $(ids.instagram).value=p.i; $(ids.google).value=p.g; $(ids.maps).value=p.m||""; $(ids.logo).value=p.l||"";
    updatePreview(); $("livePage").hidden=true; $("builderPage").hidden=false;
    $("headerState")?.replaceChildren(); document.title="TAPFLOW — Digital Business Card";
    window.scrollTo({top:0,behavior:"smooth"});
  } catch(e) { showToast("Could not load profile for editing."); }
});
async function copyLink() {
  if(!profileLink) throw Error("Publish your profile first.");
  if(navigator.clipboard&&window.isSecureContext) await navigator.clipboard.writeText(profileLink);
  else {
    const t=document.createElement("textarea");t.value=profileLink;t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.select();
    const ok=document.execCommand("copy");t.remove();if(!ok)throw Error("Copy is not available in this browser.");
  }
}
$("copyButton").addEventListener("click",async()=>{try{await copyLink();showToast("Profile link copied.");}catch(e){showToast(e.message);}});
$("shareButton").addEventListener("click",async()=>{
  try {
    if(navigator.share) await navigator.share({title:document.title,text:"Connect with my business",url:profileLink});
    else {await copyLink();showToast("Share is unavailable here. Link copied instead.");}
  } catch(e) { if(e.name!=="AbortError") showToast("Unable to share this link."); }
});
$("qrButton").addEventListener("click",()=>{
  if(typeof QRCode==="undefined"){showToast("QR generator did not load. Check your internet connection.");return;}
  $("qrCode").replaceChildren();
  new QRCode($("qrCode"),{text:profileLink,width:220,height:220,colorDark:"#111111",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
  $("qrPanel").hidden=false;
});
$("downloadQr").addEventListener("click",()=>{
  const canvas=$("qrCode").querySelector("canvas"),img=$("qrCode").querySelector("img");
  const data=canvas?canvas.toDataURL("image/png"):img?img.src:"";
  if(!data){showToast("Generate the QR code first.");return;}
  const a=document.createElement("a");a.href=data;a.download="tapflow-business-profile.png";a.click();
});
function nfcMessage(msg,type="error") {
  const el=$("liveMessage");el.textContent=msg;el.className="live-message show "+type;
}
$("nfcButton").addEventListener("click",async()=>{
  if(!profileLink){nfcMessage("Publish your profile first.");return;}
  if(!window.isSecureContext){nfcMessage("NFC writing requires HTTPS. Deploy this website to Vercel first.");return;}
  if(!("NDEFReader" in window)){nfcMessage("Web NFC is not supported on this device/browser. Use NFC Tools on a compatible Android phone, or use the QR code.");return;}
  try {
    $("nfcButton").disabled=true;$("nfcButton").textContent="Hold card near phone…";
    const ndef=new NDEFReader();
    await ndef.write({records:[{recordType:"url",data:profileLink}]});
    nfcMessage("NFC write completed successfully. Your NTAG216 card now opens this profile.","success");
  } catch(err) {
    let msg=err.message||"NFC write failed.";
    if(err.name==="NotAllowedError")msg="NFC permission was denied. Allow NFC access and try again.";
    if(err.name==="NotSupportedError")msg="NFC is not available on this device.";
    if(err.name==="AbortError")msg="NFC scan was cancelled. Try again.";
    if(err.name==="InvalidStateError")msg="No NFC tag detected. Hold the NTAG216 card near the phone and retry.";
    nfcMessage(msg);
  } finally {$("nfcButton").disabled=false;$("nfcButton").textContent="Write to NFC card";}
});
updatePreview();
if(loadProfile()) { $("builderPage").hidden=true; $("livePage").hidden=false; }
})();