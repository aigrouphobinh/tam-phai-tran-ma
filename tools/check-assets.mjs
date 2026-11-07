import {readFile,stat} from 'node:fs/promises';
const root=new URL('../public/',import.meta.url),manifest=JSON.parse(await readFile(new URL('assets/characters/manifest.json',root),'utf8'));
const paths=new Set(['assets/arena-background.webp','downloads/tiktok-bridge.zip']);
for(const actor of Object.values(manifest.actors)){paths.add(actor.texture.slice(1));for(const clip of Object.values(actor.animations||{}))paths.add(clip.texture.slice(1));}
for(const name of ['temple_ambience','sword_whoosh','sword_impact','sword_rain','lightning','magic_seal','heal_lotus','shield_bloom','shield_break','dragon_roar','warning','boss_cast','boss_impact','revive','victory'])paths.add('assets/audio/'+name+'.mp3');
for(const path of paths){const s=await stat(new URL(path,root));if(s.size<30)throw Error('Empty asset: '+path);}
console.log(paths.size+' runtime assets verified.');
