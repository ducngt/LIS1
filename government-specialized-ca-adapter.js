(function(){
  'use strict';
  const ds=window.NuteDigitalSignature;if(!ds)throw new Error('digital-signature-capability.js phải được nạp trước Government Specialized CA Adapter.');
  ds.registerAdapter({
    id:'government_specialized_ca',
    name:'Government Specialized CA Adapter',
    kind:'GOVERNMENT_SPECIALIZED_CA',
    production:true,
    async sign(payload,ctx){
      const cfg=ds.getConfig();const profile=ds.getProfile(ctx.userId);
      if(!profile?.certificate)throw new Error('Chưa đăng ký chứng thư số công vụ cho tài khoản này.');
      if(!cfg.bridgeUrl)throw new Error('Government Specialized CA Adapter đã được tích hợp nhưng chưa cấu hình Digital Signature Bridge. GitHub Pages không thể truy cập private key/USB Token trực tiếp.');
      const res=await fetch(cfg.bridgeUrl.replace(/\/$/,'')+'/sign',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({capability:'digital.signature.sign',payload,certificateFingerprint:profile.certificate.fingerprintSha256,certificateSerial:profile.certificate.serialNumber})});
      if(!res.ok)throw new Error(`Signature Bridge HTTP ${res.status}`);const x=await res.json();
      return {...x,adapterId:this.id,providerType:'GOVERNMENT_SPECIALIZED_CA',trustLevel:x.trustLevel||'PKI_EXTERNAL',certificate:profile.certificate,verificationStatus:x.verificationStatus||'SIGNED_BY_EXTERNAL_PKI'};
    },
    async verify(payload,sig){
      const cfg=ds.getConfig();
      if(cfg.bridgeUrl){try{const res=await fetch(cfg.bridgeUrl.replace(/\/$/,'')+'/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({capability:'digital.signature.verify',payload,signature:sig})});if(res.ok)return await res.json()}catch(e){return {ok:false,status:'BRIDGE_UNREACHABLE',detail:e.message}}}
      return {ok:false,status:'EXTERNAL_VALIDATION_REQUIRED',detail:'Cần Signature Bridge/PKI service để kiểm tra certificate chain, OCSP/CRL, timestamp và chữ ký công vụ.'};
    }
  });
})();
