// Isolated world: TikTok scripts cannot read the local pairing token.
window.addEventListener('message',event=>{
 if(event.source!==window||event.origin!==location.origin||event.data?.source!=='tam-phai-webcast-v1')return;
 const {room,frame}=event.data;
 if(typeof room!=='string'||typeof frame!=='string'||frame.length>2700000)return;
 chrome.runtime.sendMessage({type:'frame',room,frame}).catch(()=>{});
});
