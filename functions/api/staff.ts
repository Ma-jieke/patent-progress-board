import {type Env,json,err,body} from '../_lib/common';
import {admin,mutation} from '../_lib/auth';
export const onRequestGet:PagesFunction<Env>=async({env})=>{
 if(!env.DB)return err('数据库尚未绑定',503);
 try{const {results}=await env.DB.prepare('SELECT name FROM staff ORDER BY name COLLATE NOCASE LIMIT 200').all<{name:string}>();return json({staff:(results||[]).map(x=>x.name)})}
 catch(e){console.error(e);return err('请先执行数据库升级',503)}
};
export const onRequestPost:PagesFunction<Env>=async({request,env})=>{
 if(!mutation(request))return err('请求来源无效',403);
 if(!(await admin(request,env)))return err('请先登录',401);
 try{
  const x=await body(request) as {name?:unknown};
  if(typeof x?.name!=='string'||!x.name.trim()||x.name.trim().length>60)return err('请输入有效姓名');
  const name=x.name.trim();
  await env.DB.prepare('INSERT OR IGNORE INTO staff(name,created_at) VALUES(?,?)').bind(name,new Date().toISOString()).run();
  return json({name},201)
 }catch(e){console.error(e);return err('保存负责人失败',500)}
};