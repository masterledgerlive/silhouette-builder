/* BLOB CINEMA ERROR CATCHER — v1
   Shows every JS error visibly on the page. No more silent deaths.
   Include via: <script src="./errcatch.js"></script> right after <body> */
(function(){
  var box=null;
  function ensureBox(){
    if(box) return box;
    box=document.createElement('div');
    box.id='errcatch-box';
    box.style.cssText='position:fixed;bottom:10px;right:10px;max-width:400px;max-height:300px;overflow-y:auto;background:#3a0f1a;border:2px solid #ff5470;border-radius:8px;padding:10px;z-index:99999;font-family:monospace;font-size:.75rem;color:#ffb3c0;display:none';
    box.innerHTML='<b style="color:#ff5470">⚠ ERRORS</b> <button onclick="this.parentNode.style.display=\'none\'" style="float:right;background:#3a0f1a;border:1px solid #ff5470;color:#ff5470;border-radius:4px;cursor:pointer">hide</button><div id="errcatch-list"></div>';
    document.body.appendChild(box);
    return box;
  }
  function show(msg,src){
    var b=ensureBox(); b.style.display='block';
    var l=document.getElementById('errcatch-list');
    var d=document.createElement('div');
    d.style.cssText='margin-top:6px;padding:4px;border-top:1px solid #5a1f2a;word-break:break-all';
    d.textContent='['+new Date().toLocaleTimeString()+'] '+(src?src+': ':'')+msg;
    l.appendChild(d);
    // also log to console
    console.error('[ERRCATCH]',src||'',msg);
  }
  window.addEventListener('error',function(e){
    var fn=e.filename||'';
    // ignore browser extension noise (wallets, etc.) — not our code
    if(fn.indexOf('chrome-extension://')===0||fn.indexOf('moz-extension://')===0||
       fn.indexOf('evmAsk.js')>=0||fn.indexOf('inpage.js')>=0||fn.indexOf('contentscript')>=0) return;
    show(e.message+(e.lineno?' (line '+e.lineno+')':''), fn?fn.split('/').pop():'');
  });
  window.addEventListener('unhandledrejection',function(e){
    var msg=e.reason?(e.reason.message||String(e.reason)):'unknown rejection';
    show(msg,'promise');
  });
  // expose for manual use: errcatch('something failed', 'myFunction')
  window.errcatch=show;
  window.errcatchClear=function(){ var b=document.getElementById('errcatch-box'); if(b) b.style.display='none'; var l=document.getElementById('errcatch-list'); if(l) l.innerHTML=''; };
})();
