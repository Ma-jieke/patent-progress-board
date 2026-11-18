import {type Env,json,err,body,input} from '../_lib/common';
import {admin,mutation} from '../_lib/auth';
export const onRequestGet:PagesFunction<Env>=async({env})=>{
 if(!env.DB)return err('数据库尚未绑定',503);
 try{const {results}=await env.DB.prepare('SELECT * FROM patents ORDER BY updated_at DESC LIMIT 500').all();return json({patents:results})}
 catch(e){console.error(e);return err('数据库读取失败，请先执行初始化 SQL',503)}
};
export const onRequestPost:PagesFunction<Env>=async({request,env})=>{
 if(!mutation(request))return err('来源无效',403);
 if(!(await admin(request,env)))return err('请先登录',401);
 if(!env.DB)return err('数据库尚未绑定',503);
 let p;try{p=input(await body(request))}catch(e){return err(e instanceof Error?e.message:'数据无效')}
 try{
  const id=crypto.randomUUID(),at=new Date().toISOString();
  await env.DB.batch([
   env.DB.prepare('INSERT INTO patents(id,title,workflow,stage,owner,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,p.title,p.workflow,p.stage,p.owner,p.note,at,at),
   env.DB.prepare('INSERT INTO status_history(id,patent_id,previous_workflow,next_workflow,previous_stage,next_stage,note,changed_at) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,null,p.workflow,null,p.stage,p.note||'新增专利',at)
  ]);
  return json({patent:{...p,id,created_at:at,updated_at:at}},201);
 }catch(e){console.error(e);return err('保存失败',500)}
};