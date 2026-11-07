import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
export function serializeRaid(raid){return {version:1,savedAt:new Date().toISOString(),state:{...raid,players:[...raid.players.entries()],eventLedger:[...raid.eventLedger.entries()],inputLedger:[...raid.inputLedger.entries()],comboLedger:[...raid.comboLedger.entries()]}};}
export function restoreRaid(raid,record){const s=record?.state;
 if(record?.version!==1||!s||!Array.isArray(s.players)||s.players.length>2000||!Number.isFinite(s.hp)||s.hp<0||s.hp>80000||!Number.isFinite(s.elapsed))throw Error('Checkpoint không hợp lệ');
 for(const k of Object.keys(raid))if(k in s&&!['players','eventLedger','inputLedger','comboLedger','scores'].includes(k))raid[k]=s[k];
 raid.players=new Map(s.players);raid.eventLedger=new Map(s.eventLedger||[]);raid.inputLedger=new Map(s.inputLedger||[]);raid.comboLedger=new Map(s.comboLedger||[]);
 raid.scores=Object.assign(Object.create(null),s.scores||{});return raid;
}
export class CheckpointStore{
 constructor(path){this.path=path;this.pending=Promise.resolve();this.error='';}
 async load(raid){try{restoreRaid(raid,JSON.parse(await readFile(this.path,'utf8')));return true;}catch(e){if(e.code!=='ENOENT')this.error=e.message;return false;}}
 save(raid){const bytes=JSON.stringify(serializeRaid(raid));this.pending=this.pending.catch(()=>{}).then(async()=>{await mkdir(dirname(this.path),{recursive:true});await writeFile(this.path+'.tmp',bytes);await rename(this.path+'.tmp',this.path);this.error='';}).catch(e=>{this.error=e.message;});return this.pending;}
}
