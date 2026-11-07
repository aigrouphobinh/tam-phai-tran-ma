// Decode only frames the user's own TikTok browser has already received.
// No signing service and no TikTok cookies are sent to the local game.
import {deserializeWebSocketMessage,WebcastDeserializeConfig} from 'tiktok-live-connector';
WebcastDeserializeConfig.showBase64OnDecodeError=false;
const methods={WebcastChatMessage:'chat',WebcastLikeMessage:'like',WebcastGiftMessage:'gift',WebcastMemberMessage:'member'};
export async function decodeFrame(bytes){
 if(bytes.length>2_000_000)throw Error('Frame vượt giới hạn');
 const decoded=await deserializeWebSocketMessage(bytes),out=[];
 for(const m of decoded.protoMessageFetchResult?.messages||[]){const d=m.decodedData;
  if(d&&methods[d.type])out.push({type:methods[d.type],data:{...d.data,msgId:String(d.data.common?.msgId||'0')!=='0'?d.data.common.msgId:m.msgId}});
  else if(d?.type==='WebcastRoomUserSeqMessage')out.push({type:'viewers',data:{count:Number(d.data.total||d.data.totalUser||0)}});
 }return out;
}
