import {readFile,stat} from 'node:fs/promises';
import {validateSkinManifest} from '../public/skin-renderer.js';
const root=new URL('../public/',import.meta.url),manifest=validateSkinManifest(JSON.parse(await readFile(new URL('assets/characters/manifest.json',root),'utf8')));
const paths=new Set(['assets/arena-background.webp','downloads/tiktok-bridge.zip']);
for(const actor of Object.values(manifest.actors)){if(actor.texture)paths.add(actor.texture.slice(1));for(const layer of actor.layers)paths.add(layer.texture.slice(1));for(const clip of Object.values(actor.animations||{}))paths.add(clip.texture.slice(1));}
for(const name of ['temple_ambience','sword_whoosh','sword_impact','sword_rain','lightning','magic_seal','heal_lotus','shield_bloom','shield_break','dragon_roar','warning','boss_cast','boss_impact','revive','victory'])paths.add('assets/audio/'+name+'.mp3');
for(const path of paths){const s=await stat(new URL(path,root));if(s.size<30)throw Error('Empty asset: '+path);}
function webpSize(bytes){
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('Not a WebP image');
 for(let at=12;at+8<=bytes.length;){
  const type=bytes.toString('ascii',at,at+4),n=bytes.readUInt32LE(at+4),d=at+8;
  if(type==='VP8X'&&n>=10)return [1+bytes.readUIntLE(d+4,3),1+bytes.readUIntLE(d+7,3)];
  if(type==='VP8 '&&n>=10)return [bytes.readUInt16LE(d+6)&0x3fff,bytes.readUInt16LE(d+8)&0x3fff];
  if(type==='VP8L'&&n>=5){const bits=bytes.readUInt32LE(d+1);return [1+(bits&0x3fff),1+((bits>>>14)&0x3fff)];}
  at=d+n+(n%2);
 }
 throw Error('WebP dimensions missing');
}
const sizes=new Map();let clips=0;
for(const [key,actor] of Object.entries(manifest.actors))for(const [state,clip] of Object.entries(actor.animations)){
 if(!sizes.has(clip.texture))sizes.set(clip.texture,webpSize(await readFile(new URL(clip.texture.slice(1),root))));
 const [w,h]=sizes.get(clip.texture);
 if(w!==clip.columns*clip.frameWidth||h!==clip.rows*clip.frameHeight)throw Error('Atlas dimensions do not match '+key+':'+state);
 clips++;
}
console.log(paths.size+' runtime assets and '+clips+' atlas clips verified (schema, dimensions, source bounds).');
