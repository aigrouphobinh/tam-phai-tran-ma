let queued=0,chain=Promise.resolve();
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message.type!=='frame'||!sender.tab||!/^https:\/\/www\.tiktok\.com\/@[a-zA-Z0-9_.]+\/live\/?(?:\?|$)/.test(sender.url||''))return;
 if(queued>=80){chrome.storage.local.set({bridgeError:'Hàng đợi đầy · kiểm tra server local'});return;}
 queued++;
 chain=chain.catch(()=>{}).then(async()=>{
  const {token,enabled}=await chrome.storage.local.get(['token','enabled']);if(!enabled||!token)return;
  const response=await fetch('http://127.0.0.1:8788/api/tiktok/frame',{
   method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
   body:JSON.stringify({room:message.room,frame:message.frame}),signal:AbortSignal.timeout(5000)
  });
  const payload=await response.json();if(!response.ok)throw Error(payload.error||'HTTP '+response.status);
  await chrome.storage.local.set({lastFrame:Date.now(),bridgeError:'',room:message.room});
 }).catch(async e=>{await chrome.storage.local.set({bridgeError:e.message});}).finally(()=>queued--);
 reply({queued:true});
});
