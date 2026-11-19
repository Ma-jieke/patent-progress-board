import {type Env,json,err,body} from '../../_lib/common';
import {admin,mutation} from '../../_lib/auth';
import {readData,stored,expose,saveOwners,ownersFor} from '../../_lib/patent-v2';
export const onRequestGet:PagesFunction<Env,'id'>=async({env,params})=>{
 if(!env.DB)return err('数据库尚未绑定',503);
 try{
  const id=String(params.id),patent=await env.DB.prepare('SELECT * FROM patents WHERE id=?').bind(id).first<any>();
  if(!patent)return err('记录不存在',404);
  const {results:history}=await env.DB.prepare('SELECT * FROM status_history WHERE patent_id=? ORDER BY changed_at DESC LIMIT 100').bind(id).all();
  const owners=await ownersFor(env.DB,[id]);
  return json({patent:expose(patent,owners[id]||{}),history});
 }catch(e){console.error(e);return err('详情查询失败',500)}
};
export const onRequestPatch:PagesFunction<Env,'id'>=async({request,env,params})=>{
 if(!mutation(request))return err('请求来源无效',403);
 if(!(await admin(request,env)))return err('请先登录',401);
 if(!env.DB)return err('数据库尚未绑定',503);
 let p;try{p=readData(await body(request))}catch(e){return err(e instanceof Error?e.message:'输入无效')}
 const id=String(params.id);
 try{
  const old=await env.DB.prepare('SELECT * FROM patents WHERE id=?').bind(id).first<any>();
  if(!old)return err('记录不存在',404);
  if(p.version===undefined||p.version!==old.version)return err('记录已经更新，请刷新页面后重试',409);
  if(old.category==='invention'&&old.workflow==='priority'&&p.workflow==='pre')return err('已转优审的记录不能直接切回预审',400);
  const at=new Date().toISOString();
  const result=await env.DB.prepare('UPDATE patents SET title=?,category=?,workflow=?,stage=?,agency=?,inventors=?,owner=?,note=?,updated_at=?,version=version+1 WHERE id=? AND version=?').bind(p.title,p.category,stored(p.workflow),p.stage,p.agency,p.inventors,p.owner,p.note,at,id,old.version).run();
  if(!result.meta.changes)return err('记录已经更新，请刷新页面后重试',409);
  await saveOwners(env.DB,id,p.owners,at);
  const prevFlow=old.category==='software'?'software':old.workflow;
  await env.DB.prepare('INSERT INTO status_history(id,patent_id,previous_workflow,next_workflow,previous_stage,next_stage,note,changed_at) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,prevFlow,p.workflow,old.stage,p.stage,p.note||(prevFlow!==p.workflow?'申报路线调整':'更新阶段和负责人'),at).run();
  return json({patent:expose({...old,...p,id,updated_at:at,version:old.version+1},p.owners)});
 }catch(e){console.error(e);return err('修改失败，请检查数据库迁移是否完成',500)}
};

/**
 * Permanently delete a patent and its dependent stage-owner/history rows
 * (both child tables use ON DELETE CASCADE).
 * Requires the same administrator session and same-origin validation as PATCH.
 */
export const onRequestDelete:PagesFunction<Env,'id'>=async({request,env,params})=>{
 if(!mutation(request))return err('请求来源无效',403);
 if(!(await admin(request,env)))return err('请先登录',401);
 if(!env.DB)return err('数据库尚未绑定',503);
 let data:unknown;
 try{data=await body(request)}
 catch(e){return err(e instanceof Error?e.message:'请求无效',400)}
 if(!data||typeof data!=='object')return err('删除确认信息无效');
 const {version,title,confirmation}=data as Record<string,unknown>;
 if(confirmation!=='DELETE')return err('需要明确确认删除',400);
 if(typeof title!=='string'||!title||typeof version!=='number'||!Number.isInteger(version)||version<0)return err('删除信息不完整',400);
 const id=String(params.id);
 try{
  const old=await env.DB.prepare('SELECT title, version FROM patents WHERE id=?').bind(id).first<{title:string;version:number}>();
  if(!old)return err('记录不存在或已删除',404);
  if(old.version!==version||old.title!==title)return err('记录已被修改，请刷新后再删除',409);
  const result=await env.DB.prepare('DELETE FROM patents WHERE id=? AND version=? AND title=?').bind(id,version,title).run();
  if(!result.meta.changes)return err('删除失败：数据已发生变化，请刷新',409);
  return json({deleted:true,id});
 }catch(e){console.error('delete patent failed',e);return err('删除失败，请稍后重试',500)}
};
