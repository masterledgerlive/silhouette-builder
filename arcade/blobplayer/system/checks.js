/* BLOBPLAYER SYSTEM CHECKS — green lights before go-live.
   Every app runs these. No green = no go.
*/
const BPC = {
  results:{},

  set(id, ok, msg){
    this.results[id]={ok,msg};
    const el=document.getElementById('chk-'+id);
    if(el){
      el.className='check '+(ok===null?'wait':ok?'ok':'fail');
      el.innerHTML=(ok===null?'⏳ ':ok?'✅ ':'❌ ')+msg;
    }
    return ok;
  },

  async runAll(){
    const R=this.results={};
    // 1. NaCl
    this.set('nacl', typeof nacl!=='undefined'&&!!nacl.secretbox,
      'NaCl secretbox '+(typeof nacl!=='undefined'?'loaded':'MISSING'));
    // 2. Key generation
    try{
      const k=nacl.randomBytes(32);
      this.set('keygen', k.length===32, 'Key gen: 32 bytes '+(k.length===32?'✓':'✗'));
    }catch(e){ this.set('keygen',false,'Key gen: '+e.message); }
    // 3. Key derivation (deterministic)
    try{
      const k0=new Uint8Array(32).fill(7);
      const a=BP.derive(k0), b=BP.derive(k0);
      const ok=a.length===32&&BP.hex(a)===BP.hex(b)&&BP.hex(a)!==BP.hex(k0);
      this.set('derive', ok, 'Key chain: K(n+1)=SHA256(K(n)||"|next") '+(ok?'✓ deterministic':'✗ FAILED'));
    }catch(e){ this.set('derive',false,'Derive: '+e.message); }
    // 4. Encrypt/decrypt roundtrip
    try{
      const k=nacl.randomBytes(32), msg=new TextEncoder().encode('blobplayer');
      const enc=BP.encryptChunk(msg,k);
      const dec=BP.decryptChunk(enc,k);
      const ok=dec&&new TextDecoder().decode(dec)==='blobplayer';
      this.set('crypt', !!ok, 'Encrypt/decrypt roundtrip '+(ok?'✓':'✗'));
    }catch(e){ this.set('crypt',false,'Crypt: '+e.message); }
    // 5. Walrus PUT + GET verify
    try{
      this.set('walrus', null, 'Walrus PUT+GET verify…');
      const data=new TextEncoder().encode('bp-check-'+Date.now());
      const bid=await BP.putVerified(data);
      const back=await BP.getBlob(bid);
      const ok=back.length===data.length&&back.every((v,i)=>v===data[i]);
      this.set('walrus', ok, 'Walrus: blob '+bid.slice(0,12)+'… '+(ok?'verified ✓':'MISMATCH ✗'));
    }catch(e){ this.set('walrus',false,'Walrus: '+e.message); }
    // 6. MediaRecorder
    const mr=typeof MediaRecorder!=='undefined';
    this.set('mr', mr, 'MediaRecorder '+(mr?'available ✓':'MISSING ✗'));
    // 7. MediaSource (for MSE viewers)
    const ms=typeof MediaSource!=='undefined';
    this.set('ms', true, 'MediaSource '+(ms?'available':'unavailable (blob-URL fallback)'));

    const allOk=['nacl','keygen','derive','crypt','walrus','mr'].every(k=>R[k]&&R[k].ok);
    return allOk;
  }
};
