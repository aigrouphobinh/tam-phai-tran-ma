import {cp,rm,mkdir,writeFile} from 'node:fs/promises';
const out=new URL('../dist/',import.meta.url),root=new URL('../',import.meta.url);
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});await cp(new URL('public/',root),out,{recursive:true});
for(const name of ['engine.mjs','combat-geometry.mjs','boss-cycle.mjs'])await cp(new URL(name,root),new URL(name,out));
await writeFile(new URL('runtime-config.js',out),'export const STATIC_PREVIEW=true;\n');
for(const [route,file] of [['admin','index.html'],['obs','obs.html'],['models','models.html'],['animation-studio','animation-studio.html']]){await mkdir(new URL(route+'/',out),{recursive:true});await cp(new URL(file,out),new URL(route+'/index.html',out));}
console.log('Static practice build: dist/ · LIVE uses the local Node server.');
