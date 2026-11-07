export function giftEvent(data,seen) {
  const gift=data.giftDetails||{}, detail=data.gift||{};
  const id=String(data.user?.uniqueId||data.uniqueId||'');
  const streak=Number(detail.type??detail.giftType??gift.giftType??data.giftType)===1;
  if(streak&&!['1','true'].includes(String(data.repeatEnd??data.repeat_end))) return;
  const key=(streak&&data.groupId)||data.common?.msgId||data.msgId;
  const token=key&&id+':'+String(key);
  if(token&&seen.has(token)) return;
  if(token){seen.add(token);if(seen.size>8192)seen.delete(seen.values().next().value);}
  return {type:'gift',id,name:data.user?.nickname||id,coins:Number(detail.diamondCount??gift.diamondCount??data.diamondCount??data.extendedGiftInfo?.diamondCount??1),count:Number(data.repeatCount??data.comboCount??1)};
}
export function live(room,send,status){
  let stopped=false,client,timer,delay=2000;
  const seen=new Set();
  async function open(){
    try{
      const {TikTokLiveConnection,WebcastEvent,ControlEvent}=await import('tiktok-live-connector');
      if(stopped)return;
      const c=new TikTokLiveConnection(room,{processInitialData:false,authenticateWs:false});
      client=c;
      const active=()=>!stopped&&c===client;
      function retry(error){
        if(!active())return;
        client=null;
        try{Promise.resolve(c.disconnect()).catch(()=>{});}catch{}
        status('Mất kết nối: '+String(error?.message||error||'LIVE').slice(0,140));
        timer=setTimeout(open,delay);delay=Math.min(30000,delay*2);
      }
      for(const [kind,event] of [['chat',WebcastEvent.CHAT],['like',WebcastEvent.LIKE],['gift',WebcastEvent.GIFT]]){
        c.on(event,data=>{
          if(!active())return;
          const id=data.user?.uniqueId||data.uniqueId;
          const payload=kind==='gift'?giftEvent(data,seen):{type:kind,id,name:data.user?.nickname||id,text:data.comment,count:Number(data.likeCount)||1};
          if(payload)send(payload);
        });
      }
      c.on(ControlEvent.DISCONNECTED,()=>retry('LIVE ngắt kết nối'));
      c.on(ControlEvent.ERROR,e=>{if(active())status('Lỗi LIVE: '+String(e?.message||e).slice(0,140));});
      try{await c.connect();if(active()){status('LIVE @'+room);delay=2000;}}catch(e){retry(e);}
    }catch(e){if(!stopped)status('Không mở được connector: '+e.message);}
  }
  open();
  return ()=>{stopped=true;clearTimeout(timer);try{Promise.resolve(client?.disconnect()).catch(()=>{});}catch{}};
}
