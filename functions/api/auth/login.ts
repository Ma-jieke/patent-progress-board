import {type Env,json,err,body} from '../../_lib/common';
import {mutation,passwordOK,token,cookie,ipKey} from '../../_lib/auth';
export const onRequestPost:PagesFunction<Env>=async({request,env})=>{
 if(!mutation(request))return err('来源无效',403);
 if(!env.DB||!env.ADMIN_PASSWORD||!env.SESSION_SECRET||env.SESSION_SECRET.length<32)return err('数据库或管理员密钥尚未配置',503);
 try{
  const data=await body(request) as {password?:unknown};
  if(typeof data?.password!=='string'||data.password.length>256)return err('请输入管理员密码');
  const key=await ipKey(request,env),now=Math.floor(Date.now()/1000);
  const previous=await env.DB.prepare('SELECT count,started_at,locked_until FROM login_attempts WHERE ip_key=?').bind(key).first<{count:number;started_at:number;locked_until:number}>();
  if(previous&&previous.locked_until>now)return err('登录尝试过多，15分钟后再试',429);
  if(!(await passwordOK(data.password,env))){
   const same=!!previous&&now-previous.started_at<900;
   const count=same?previous!.count+1:1;
   await env.DB.prepare('INSERT INTO login_attempts(ip_key,count,started_at,locked_until) VALUES(?,?,?,?) ON CONFLICT(ip_key) DO UPDATE SET count=excluded.count,started_at=excluded.started_at,locked_until=excluded.locked_until').bind(key,count,same?previous!.started_at:now,count>=8?now+900:0).run();
   return err('密码错误',401);
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip_key=?').bind(key).run();
  return json({authenticated:true},200,{'Set-Cookie':cookie(await token(env))});
 }catch(e){console.error(e);return err('登录失败，请检查数据库',500)}
};