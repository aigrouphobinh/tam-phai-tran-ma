const token=document.querySelector('#token'),status=document.querySelector('#status');
async function refresh(){const s=await chrome.storage.local.get(['token','enabled','bridgeError','lastFrame','room']);token.value=s.token||'';
 status.textContent=s.bridgeError||(!s.enabled?'Đang tắt':s.lastFrame?'Đã nhận @'+s.room+' · '+new Date(s.lastFrame).toLocaleTimeString('vi-VN'):'Đã bật · chờ tải lại tab TikTok LIVE');}
document.querySelector('#save').onclick=async()=>{if(!/^[0-9a-f]{48}$/.test(token.value.trim())){status.textContent='Mã không đúng. Sao chép từ bảng điều khiển local.';return;}await chrome.storage.local.set({token:token.value.trim(),enabled:true,bridgeError:'',lastFrame:0});await refresh();};
document.querySelector('#stop').onclick=async()=>{await chrome.storage.local.set({enabled:false});await refresh();};
refresh();
