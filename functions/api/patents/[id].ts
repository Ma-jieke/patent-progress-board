import {type Env,json,err,body,input} from '../../_lib/common';
import {admin,mutation} from '../../_lib/auth';
export const onRequestGet:PagesFunction<Env,'id'>=async({env,params})=>{
 if(!env.DB)return err('数据库尚未绑定',503);
 try{const id=String(params.id),patent=await env.DB.prepare('SELECT * FROM patents WHERE id=?').bind(id).first();if(!patent)return err('专利不存在',404);const {results:history}=await env.DB.prepare('SELECT * FROM status_history WHERE patent_id=? ORDER BY changed_at DESC LIMIT 80').bind(id).all();return json({patent,history})}
 catch(e){console.error(e);return err('详情读取失败',500)}
};
export const onRequestPatch:PagesFunction<Env,'id'>=async({request,env,params})=>{
 if(!mutation(request))return err('来源无效',403);
 if(!(await admin(request,env)))return err('请先登录',401);
 if(!env.DB)return err('数据库尚未绑定',503);
 let p;try{p=input(await body(request))}catch(e){return err(e instanceof Error?e.message:'数据无效')}
 try{
  const id=String(params.id);
  const old=await env.DB.prepare('SELECT * FROM patents WHERE id=?').bind(id).first<{title:string;workflow:string;stage:number;updated_at:string}>();
  if(!old)return err('专利不存在',404);
  const at=new Date().toISOString();
  const updated=await env.DB.prepare('UPDATE patents SET title=?,workflow=?,stage=?,owner=?,note=?,updated_at=? WHERE id=? AND updated_at=?').bind(p.title,p.workflow,p.stage,p.owner,p.note,at,id,old.updated_at).run();
  if(!updated.meta.changes)return err('有其他管理员已修改，请刷新重试',409);
  await env.DB.prepare('INSERT INTO status_history(id,patent_id,previous_workflow,next_workflow,previous_stage,next_stage,note,changed_at) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,old.workflow,p.workflow,old.stage,p.stage,p.note||'更新专利信息',at).run();
  return json({patent:{...old,...p,id,updated_at:at}});
 }catch(e){console.error(e);return err('更新失败',500)}
};