/* BLOBPLAYER KERNEL — the clean protocol.
   Path 1: Blockchain DVR. Own the latency, prove the chain.
   - K(n+1) = SHA256(K(n) || "|next")  — iterative chain (David's story)
   - Chunk n encrypted with K(n+1), nonce prepended
   - Batches: 5s of chunks → ONE Walrus PUT (beats 429s)
   - Manifest published INCREMENTALLY during recording (viewers can watch mid-stream)
   - Every PUT verified by GET before marked ok
*/
const BP = {
  AGG: 'https://aggregator.walrus-testnet.walrus.space',
  PUB: 'https://publisher.walrus-testnet.walrus.space',
  EPOCHS: 5,
  BATCH_SECS: 5, // one PUT per 5 seconds of video

  hex(b){ return Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join(''); },
  bhex(h){ return new Uint8Array(h.match(/../g).map(x=>parseInt(x,16))); },

  // Pure-JS SHA256 (FIPS 180-4) — no crypto.subtle dependency
  sha256(data){
    var K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var l=data.length,bitLen=l*8,padLen=(((l+1+8+63)>>6)<<6);
    var m=new Uint8Array(padLen);m.set(data);m[l]=0x80;
    var dv=new DataView(m.buffer);
    dv.setUint32(padLen-8,Math.floor(bitLen/4294967296));dv.setUint32(padLen-4,bitLen>>>0);
    var w=new Uint32Array(64);
    function rotr(x,n){return(x>>>n)|(x<<(32-n));}
    for(var off=0;off<padLen;off+=64){
      for(var i=0;i<16;i++)w[i]=dv.getUint32(off+i*4);
      for(var i=16;i<64;i++){var s0=rotr(w[i-15],7)^rotr(w[i-15],18)^(w[i-15]>>>3),s1=rotr(w[i-2],17)^rotr(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)|0;}
      var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for(var i=0;i<64;i++){var S1=rotr(e,6)^rotr(e,11)^rotr(e,25),ch=(e&f)^(~e&g),t1=(h+S1+ch+K[i]+w[i])|0,S0=rotr(a,2)^rotr(a,13)^rotr(a,22),mj=(a&b)^(a&c)^(b&c),t2=(S0+mj)|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}
      H[0]=(H[0]+a)|0;H[1]=(H[1]+b)|0;H[2]=(H[2]+c)|0;H[3]=(H[3]+d)|0;H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0;
    }
    var out=new Uint8Array(32),odv=new DataView(out.buffer);
    for(var i=0;i<8;i++)odv.setUint32(i*4,H[i]>>>0);
    return out;
  },

  // K(n+1) = SHA256(K(n) || "|next")
  derive(k){ return this.sha256(new Uint8Array([...k, ...new TextEncoder().encode('|next')])); },

  // Fetch with 429 retry + exponential backoff
  async fetchRetry(url, opts={}, retries=8){
    for(let i=0;i<retries;i++){
      try{
        const r=await fetch(url,opts);
        if(r.status===429){
          await new Promise(r=>setTimeout(r,Math.min(8000*(i+1),30000)));
          continue;
        }
        return r;
      }catch(e){
        if(i===retries-1)throw e;
        await new Promise(r=>setTimeout(r,3000*(i+1)));
      }
    }
    throw new Error('retry exhausted');
  },

  // PUT bytes to Walrus, return blob ID. Verifies by GET.
  async putVerified(data){
    const r=await this.fetchRetry(this.PUB+`/v1/blobs?epochs=${this.EPOCHS}`,{method:'PUT',body:data});
    if(!r.ok)throw new Error('PUT '+r.status);
    const j=await r.json();
    const bid=(j.newlyCreated||j.alreadyCertified).blobObject.blobId;
    // verify retrievable
    const g=await this.fetchRetry(this.AGG+'/v1/blobs/'+bid,{});
    if(!g.ok)throw new Error('verify GET '+g.status);
    return bid;
  },

  async getBlob(bid){
    const r=await this.fetchRetry(this.AGG+'/v1/blobs/'+bid,{});
    if(!r.ok)throw new Error('GET '+r.status);
    return new Uint8Array(await r.arrayBuffer());
  },

  // Encrypt chunk n with K(n+1). Returns nonce||ciphertext.
  encryptChunk(raw, key){
    const nonce=nacl.randomBytes(24);
    const c=nacl.secretbox(raw,nonce,key);
    const out=new Uint8Array(24+c.length);
    out.set(nonce); out.set(c,24);
    return out;
  },

  decryptChunk(packed, key){
    return nacl.secretbox.open(packed.slice(24),packed.slice(0,24),key);
  }
};
