import {type Env,validOrigin} from './common';
const keyName='patent_admin';const age=12*60*60;const enc=new TextEncoder();
function b64(data:Uint8Array){let t='';for(const c of data)t+=String.fromCharCode(c);return btoa(t).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
function decode(s:string){const raw=atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'='));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
function eq(a:Uint8Array,b:Uint8Array){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a[i]^b[i];return x===0}
async function hmac(secret:string,s:string){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(s)))}
async function digest(s:string){return new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s)))}
export async function passwordOK(s:string,env:Env){return !!env.ADMIN_PASSWORD&&eq(await digest(s),await digest(env.ADMIN_PASSWORD))}
export async function token(env:Env){const payload=b64(enc.encode(JSON.stringify({exp:Math.floor(Date.now()/1000)+age,nonce:crypto.randomUUID()})));return payload+'.'+b64(await hmac(env.SESSION_SECRET,payload))}
export async function admin(req:Request,env:Env){if(!env.SESSION_SECRET||!env.ADMIN_PASSWORD)return false;const found=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(keyName+'='));if(!found)return false;const values=found.slice(keyName.length+1).split('.');if(values.length!==2)return false;try{const [payload,signature]=values;if(!eq(decode(signature),await hmac(env.SESSION_SECRET,payload)))return false;const data=JSON.parse(new TextDecoder().decode(decode(payload)));return typeof data.exp==='number'&&data.exp>Date.now()/1000}catch{return false}}
export const cookie=(v:string)=>keyName+'='+v+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age='+age;
export const clearCookie=keyName+'=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
export const mutation=(req:Request)=>validOrigin(req);
export async function ipKey(req:Request,env:Env){const ip=req.headers.get('CF-Connecting-IP')||'localhost';return b64(await hmac(env.SESSION_SECRET,'ip:'+ip))}
