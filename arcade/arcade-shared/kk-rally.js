/* KKRally — browser twin of the FIRST RALLY engine (Stone 2, Pong generation).
 * Pure-JS SHA-256 via KKReplay. Same law: fixed tick, integer physics,
 * seed deals opponent + serves, score derived from seed + RLE input tape. */
(function(global){
  'use strict';
  const sha256=function(s){ return KKReplay.sha256(s); };
  const W=160,H=120,PH=26,BALL=2,PX=6,AX=151,PW=3,WIN=5,MAXT=5400;
  function mulberry32(seed){ let a=seed>>>0; return function(){ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
  function runKey(wallet,seed,nonce){ return sha256(String(wallet).toLowerCase()+'|'+seed+'|'+nonce); }
  function dealMatch(seed){ const r2=mulberry32((seed^0x5eed)>>>0); return { opp:{ speed:1+Math.floor(r2()*2), lag:2+Math.floor(r2()*6), err:Math.floor(r2()*12) } }; }
  function doServe(st){ const dir=st.serveRnd()<0.5?-1:1; const vys=[-2,-1,1,2]; st.pendingServe={vx:dir*3,vy:vys[Math.floor(st.serveRnd()*4)]}; }
  function createMatch(seed){
    const deal=dealMatch(seed);
    const st={ seed, opp:deal.opp, serveRnd:mulberry32((seed^0x5e9e)>>>0), aiRnd:mulberry32((seed^0xa17)>>>0),
      tick:0,bx:80,by:60,vx:0,vy:0,py:47,ay:47,pPts:0,aPts:0,hits:0,phase:'serve',serveTimer:20,over:false,ballHist:[],pendingServe:null };
    doServe(st); return st;
  }
  function stepMatch(st,input){
    if(st.over) return st;
    const mv=Math.max(-1,Math.min(1,input|0));
    st.py=Math.max(0,Math.min(H-PH,st.py+mv*2));
    st.ballHist.push(st.by);
    const seen=st.ballHist[Math.max(0,st.ballHist.length-1-st.opp.lag)];
    if(st.aiRnd()*100>=st.opp.err){
      const target=seen-PH/2;
      if(st.ay<target) st.ay=Math.min(target,st.ay+st.opp.speed);
      else if(st.ay>target) st.ay=Math.max(target,st.ay-st.opp.speed);
      st.ay=Math.max(0,Math.min(H-PH,st.ay));
    }
    if(st.phase==='serve'){
      st.serveTimer--;
      if(st.serveTimer<=0){ st.vx=st.pendingServe.vx; st.vy=st.pendingServe.vy; st.phase='play'; }
    } else {
      st.bx+=st.vx; st.by+=st.vy;
      if(st.by<BALL){ st.by=BALL; st.vy=Math.abs(st.vy); }
      if(st.by>H-BALL){ st.by=H-BALL; st.vy=-Math.abs(st.vy); }
      if(st.vx<0&&st.bx-BALL<=PX+PW&&st.bx>PX&&st.by>=st.py-BALL&&st.by<=st.py+PH+BALL){
        st.hits++;
        const off=st.by-(st.py+PH/2);
        st.vy=Math.max(-3,Math.min(3,Math.trunc(off/3)));
        if(st.vy===0) st.vy=off>=0?1:-1;
        st.vx=st.hits>=12?4:3; st.bx=PX+PW+BALL;
      }
      if(st.vx>0&&st.bx+BALL>=AX&&st.bx<AX+PW&&st.by>=st.ay-BALL&&st.by<=st.ay+PH+BALL){
        st.hits++;
        const off=st.by-(st.ay+PH/2);
        st.vy=Math.max(-3,Math.min(3,Math.trunc(off/3)));
        if(st.vy===0) st.vy=off>=0?1:-1;
        st.vx=-(st.hits>=12?4:3); st.bx=AX-BALL;
      }
      if(st.bx<0||st.bx>W){
        if(st.bx<0) st.aPts++; else st.pPts++;
        if(st.pPts>=WIN||st.aPts>=WIN){ st.over=true; }
        else { st.bx=80; st.by=60; st.vx=0; st.vy=0; st.phase='serve'; st.serveTimer=30; doServe(st); }
      }
    }
    st.tick++;
    if(st.tick>=MAXT) st.over=true;
    return st;
  }
  function scoreOf(st){ const raw=st.pPts*1000-st.aPts*100+(st.pPts>st.aPts&&st.over?500:0)+st.hits*5; return Math.max(0,raw); }
  function expandTape(rle,max){ const out=[]; if(Array.isArray(rle)) for(const pair of rle){ if(!Array.isArray(pair)) continue; const v=Math.max(-1,Math.min(1,pair[0]|0)), c=Math.max(0,Math.min(max,pair[1]|0)); for(let i=0;i<c&&out.length<max;i++) out.push(v); } while(out.length<max) out.push(0); return out; }
  function encodeTape(inputs){ const rle=[]; for(const v of inputs){ if(rle.length&&rle[rle.length-1][0]===v) rle[rle.length-1][1]++; else rle.push([v,1]); } return rle; }
  function simulate(seed,rle,inputFn){
    const st=createMatch(seed);
    const inputs=inputFn?null:expandTape(rle,MAXT);
    const raw=[];
    let chain=sha256('first-rally|'+seed);
    while(!st.over){
      const inp=inputFn?inputFn(st):inputs[st.tick];
      if(inputFn) raw.push(inp);
      stepMatch(st,inp);
      if(st.tick%60===0||st.over){ chain=sha256(chain+'|'+st.tick+'|'+st.bx+','+st.by+','+st.py+','+st.ay+','+st.pPts+','+st.aPts); }
    }
    return { score:scoreOf(st), chain, ticks:st.tick, pPts:st.pPts, aPts:st.aPts, hits:st.hits, opp:st.opp, tape:inputFn?encodeTape(raw):rle };
  }
  function botInput(bot){
    return function(st){
      const hist=st.ballHist;
      const seen=hist.length?hist[Math.max(0,hist.length-1-bot.lag)]:60;
      let target;
      if(bot.park) target=60;
      else target=(st.vx<0||bot.trackAlways)?seen:60+(seen-60)/4;
      const center=st.py+PH/2;
      if(bot.errRnd&&bot.errRnd()*100<bot.err) return 0;
      if(target<center-1) return -1;
      if(target>center+1) return 1;
      return 0;
    };
  }
  function genBotRun(seed,kind){
    let bot;
    if(kind==='reactor') bot={lag:5,err:10,errRnd:mulberry32((seed^0xb07e)>>>0)};
    else if(kind==='predictor') bot={lag:0,err:0,park:true};
    else throw new Error('unknown bot '+kind);
    return simulate(seed,null,botInput(bot));
  }
  function verifyRun(rec){
    if(!rec||typeof rec.seed!=='number'||!rec.wallet) return {valid:false,reason:'shape'};
    if(runKey(rec.wallet,rec.seed,rec.nonce)!==rec.key) return {valid:false,reason:'run key mismatch'};
    const sim=simulate(rec.seed,rec.tape);
    return { valid:sim.score===rec.claimedScore&&sim.chain===rec.claimedChain, derivedScore:sim.score, derivedChain:sim.chain, pPts:sim.pPts, aPts:sim.aPts,
      reason:sim.score===rec.claimedScore?(sim.chain===rec.claimedChain?'ok':'chain mismatch'):'score mismatch: replay derives '+sim.score };
  }
  global.KKRally={ W,H,PH,PX,AX,PW,WIN,MAXT,sha256,runKey,dealMatch,createMatch,stepMatch,scoreOf,expandTape,encodeTape,simulate,genBotRun,verifyRun };
})(window);
