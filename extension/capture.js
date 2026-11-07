// Observe only incoming Webcast traffic. Preserve native constructor behavior.
(()=>{
 if(window.__tamPhaiCapture)return;window.__tamPhaiCapture=true;
 const NativeWebSocket=window.WebSocket;
 window.WebSocket=new Proxy(NativeWebSocket,{construct(Target,args,newTarget){
  const ws=Reflect.construct(Target,args,newTarget),url=String(args[0]||'');
  if(/webcast|webcast-ws|im-ws/i.test(url))ws.addEventListener('message',async event=>{
   try{
    const path=/^\/@([a-zA-Z0-9_.]+)\/live\/?$/.exec(location.pathname);if(!path)return;
    const data=event.data;if(typeof data==='string')return;
    const bytes=new Uint8Array(data instanceof Blob?await data.arrayBuffer():data);
    if(bytes.length>2_000_000)return;
    let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
    window.postMessage({source:'tam-phai-webcast-v1',room:path[1],frame:btoa(binary)},location.origin);
   }catch{/* A failed observation must never interrupt the actual livestream. */}
  });
  return ws;
 }});
})();
