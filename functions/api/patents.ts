import {type Env,json,err,body} from '../_lib/common';
import {admin,mutation} from '../_lib/auth';
import {readData,stored,expose,saveOwners,ownersFor} from '../_lib/patent-v2';
export const onRequestGet:PagesFunction<Env>=async({env})=>{
 if(!env.DB)return err('数据库尚未绑定',503);
 try{
  const {results}=await env.DB.prepare('SELECT * FROM patents ORDER BY updated_at DESC LIMIT 500').all<any>();
  const map=await ownersFor(env.DB,(results||[]).map(x=>x.id));
  return json({patents:(results||[]).map(x=>expose(x,map[x.id]||{}))});
 }catch(e){console.error(e);return err('数据库可能尚未执行0002升级脚本',503)}
};
export const onRequestPost:PagesFunction<Env>=async({request,env})=>{
 if(!mutation(request))return err('请求来源无效',403);
 if(!(await admin(request,env)))return err('请先登录',401);
 if(!env.DB)return err('数据库尚未绑定',503);
 let p;try{p=readData(await body(request))}catch(e){return err(e instanceof Error?e.message:'输入无效')}
 const id=crypto.randomUUID(),at=new Date().toISOString();
 try{
  await env.DB.batch([
   env.DB.prepare('INSERT INTO patents(id,title,category,workflow,stage,agency,inventors,owner,note,created_at,updated_at,version) VALUES(?,?,?,?,?,?,?,?,?,?,?,0)').bind(id,p.title,p.category,stored(p.workflow),p.stage,p.agency,p.inventors,p.owner,p.note,at,at),
   env.DB.prepare('INSERT INTO status_history(id,patent_id,previous_workflow,next_workflow,previous_stage,next_stage,note,changed_at) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,null,p.workflow,null,p.stage,p.note||'创建成果记录',at)
  ]);
  await saveOwners(env.DB,id,p.owners,at);
  return json({patent:expose({...p,id,created_at:at,updated_at:at,version:0},p.owners)},201);
 }catch(e){console.error(e);return err('保存失败，请检查数据库迁移是否完成',500)}
};
