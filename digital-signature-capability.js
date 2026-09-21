(function(){
  'use strict';
  const PROFILE_KEY='nute-ris-v551-signature-profiles';
  const CONFIG_KEY='nute-ris-v551-signature-config';
  const enc=new TextEncoder();
  const dec=new TextDecoder();
  const b64=u8=>btoa(String.fromCharCode(...u8));
  const unb64=s=>Uint8Array.from(atob(String(s||'').replace(/\s+/g,'')),c=>c.charCodeAt(0));
  const hex=u8=>Array.from(u8).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
  const sha256=async data=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof data==='string'?enc.encode(data):data)));
  const stable=o=>JSON.stringify(o,Object.keys(o).sort());
  const profiles=()=>{try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}')}catch{return {}}};
  const saveProfiles=x=>localStorage.setItem(PROFILE_KEY,JSON.stringify(x));
  const config=()=>{try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')}catch{return {}}};
  const saveConfig=x=>localStorage.setItem(CONFIG_KEY,JSON.stringify(x));

  function readLen(bytes,pos){let len=bytes[pos++];if((len&0x80)===0)return {len,pos};const n=len&0x7f;len=0;for(let i=0;i<n;i++)len=(len<<8)|bytes[pos++];return {len,pos}}
  function node(bytes,pos=0){const tag=bytes[pos++];const lr=readLen(bytes,pos);const start=lr.pos,end=start+lr.len;return {tag,start,end,next:end,bytes}}
  function children(n){const a=[];let p=n.start;while(p<n.end){const c=node(n.bytes,p);a.push(c);p=c.next}return a}
  function oid(n){const b=n.bytes.slice(n.start,n.end);if(!b.length)return '';const out=[Math.floor(b[0]/40),b[0]%40];let v=0;for(let i=1;i<b.length;i++){v=(v<<7)|(b[i]&0x7f);if(!(b[i]&0x80)){out.push(v);v=0}}return out.join('.')}
  const OIDS={'2.5.4.3':'CN','2.5.4.6':'C','2.5.4.7':'L','2.5.4.8':'ST','2.5.4.10':'O','2.5.4.11':'OU','1.2.840.113549.1.9.1':'E'};
  function strVal(n){const b=n.bytes.slice(n.start,n.end);if(n.tag===0x1e){let s='';for(let i=0;i<b.length;i+=2)s+=String.fromCharCode((b[i]<<8)|b[i+1]);return s}try{return dec.decode(b)}catch{return ''}}
  function dn(n){const parts=[];for(const set of children(n)){for(const seq of children(set)){const pair=children(seq);if(pair.length>=2)parts.push(`${OIDS[oid(pair[0])]||oid(pair[0])}=${strVal(pair[1])}`)}}return parts.join(', ')}
  function pemToDer(text){const m=String(text).match(/-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/);return m?unb64(m[1]):null}
  function timeVal(n){const s=strVal(n);if(!s)return '';let y,mo,d,h,mi,se;if(n.tag===0x17){y=Number(s.slice(0,2));y+=y>=50?1900:2000;mo=s.slice(2,4);d=s.slice(4,6);h=s.slice(6,8);mi=s.slice(8,10);se=s.slice(10,12)||'00'}else{y=s.slice(0,4);mo=s.slice(4,6);d=s.slice(6,8);h=s.slice(8,10);mi=s.slice(10,12);se=s.slice(12,14)||'00'}return `${y}-${mo}-${d}T${h}:${mi}:${se}Z`}
  function parseX509(der){
    try{
      const root=node(der,0),r=children(root),tbs=children(r[0]);let i=0;if(tbs[i]?.tag===0xa0)i++;
      const serial=hex(tbs[i++].bytes.slice(tbs[i-1].start,tbs[i-1].end));i++;const issuer=dn(tbs[i++]);const validity=children(tbs[i++]);const subject=dn(tbs[i++]);
      return {serialNumber:serial,issuer,subject,validFrom:timeVal(validity[0]),validTo:timeVal(validity[1])};
    }catch(e){return {parseError:e.message}}
  }
  async function inspectCertificate(file){
    const raw=new Uint8Array(await file.arrayBuffer());let der=raw;const text=file.name.toLowerCase().endsWith('.pem')?dec.decode(raw):'';const p=text?pemToDer(text):null;if(p)der=p;
    const meta=parseX509(der);return {...meta,fileName:file.name,size:file.size,fingerprintSha256:await sha256(der),rawCertificateBase64:b64(der)};
  }
  function classifyCertificate(meta,cfg=config()){
    const hay=`${meta.issuer||''} ${meta.subject||''}`.toLowerCase();const patterns=(cfg.governmentIssuerPatterns||['ban cơ yếu','ban co yeu','government specialized','chuyên dùng công vụ','chuyen dung cong vu']).map(x=>String(x).toLowerCase());
    return patterns.some(p=>hay.includes(p))?'GOVERNMENT_SPECIALIZED_CA':'UNCLASSIFIED_X509';
  }
  async function demoKey(userId){
    const key=`nute-ris-v551-demo-sign-key-${userId}`;try{const x=JSON.parse(localStorage.getItem(key)||'null');if(x)return x}catch{}
    const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const out={privateKey:await crypto.subtle.exportKey('jwk',kp.privateKey),publicKey:await crypto.subtle.exportKey('jwk',kp.publicKey)};localStorage.setItem(key,JSON.stringify(out));return out;
  }
  const adapters={
    browser_demo:{
      id:'browser_demo',name:'WebCrypto Test Adapter',kind:'DEMO_BROWSER_ECDSA',production:false,
      async sign(payload,ctx){const keys=await demoKey(ctx.userId);const canonical=stable(payload);const priv=await crypto.subtle.importKey('jwk',keys.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);const s=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},priv,enc.encode(canonical)));return {adapterId:this.id,providerType:'DEMO_BROWSER_ECDSA',trustLevel:'DEMO_ONLY',algorithm:'ECDSA-P256-SHA256',payloadHash:await sha256(canonical),signature:b64(s),publicKey:keys.publicKey,verificationStatus:'VALID_CRYPTOGRAPHIC_DEMO'}},
      async verify(payload,sig){try{const canonical=stable(payload);if(await sha256(canonical)!==sig.payloadHash)return {ok:false,status:'DOCUMENT_CHANGED'};const pub=await crypto.subtle.importKey('jwk',sig.publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);const ok=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},pub,unb64(sig.signature),enc.encode(canonical));return {ok,status:ok?'VALID_CRYPTOGRAPHIC_DEMO':'INVALID_SIGNATURE'}}catch(e){return {ok:false,status:'VERIFY_ERROR',detail:e.message}}}
    }
  };
  function getProfile(userId){return profiles()[userId]||null}
  function saveProfile(userId,p){const all=profiles();all[userId]=p;saveProfiles(all);return p}
  function removeProfile(userId){const all=profiles();delete all[userId];saveProfiles(all)}
  function registerAdapter(adapter){if(!adapter?.id||typeof adapter.sign!=='function'||typeof adapter.verify!=='function')throw new Error('Adapter không đúng contract digital.signature');adapters[adapter.id]=adapter;return adapter}
  function adapterList(){return Object.values(adapters).map(a=>({id:a.id,name:a.name,kind:a.kind,production:a.production}))}
  function payloadFor(instance){return {instanceId:instance.id,templateId:instance.templateId,templateVersion:instance.templateVersion,documentVersion:instance.documentVersion||1,values:instance.values}}
  async function signInstance(instance,ctx){const profile=getProfile(ctx.userId)||{adapterId:'browser_demo'};const a=adapters[profile.adapterId||'browser_demo']||adapters.browser_demo;const signed=await a.sign(payloadFor(instance),ctx);return {...signed,certificateProfileId:profile.id||null,signerRoles:ctx.roles||[],approvalLevel:ctx.approvalLevel||null,signedAt:new Date().toISOString()}}
  async function verifyInstance(instance,sig){const a=adapters[sig.adapterId]||adapters.browser_demo;return a.verify(payloadFor(instance),sig)}

  window.NuteDigitalSignature={inspectCertificate,classifyCertificate,getProfile,saveProfile,removeProfile,getConfig:config,saveConfig,registerAdapter,adapterList,signInstance,verifyInstance,payloadFor};
})();
