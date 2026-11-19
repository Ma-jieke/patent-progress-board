import {WORKFLOWS,isWorkflow,isCategory,type Workflow,type Category} from '../../shared/workflows';
export type Data={title:string;category:Category;workflow:Workflow;stage:number;agency:string;inventors:string;owner:string;note:string;owners:Record<string,string>;version?:number};
export const normalFlow=(row:{workflow:string;category?:string})=>row.category==='software'?'software':row.workflow;
export const expose=(row:any,owners:Record<string,string>={})=>({...row,workflow:normalFlow(row),category:row.category|| (row.workflow==='utility'?'utility':'invention'),agency:row.agency||'',inventors:row.inventors||'',owners,version:row.version||0});
export function readData(raw:unknown):Data{
 if(!raw||typeof raw!=='object')throw new Error('请填写专利信息');
 const x=raw as Record<string,unknown>;
 if(!isCategory(x.category)||!isWorkflow(x.workflow))throw new Error('成果类型或申报流程无效');
 const cat=x.category,flow=x.workflow;
 if((cat==='invention'&&!['pre','priority'].includes(flow))||(cat==='utility'&&flow!=='utility')||(cat==='software'&&flow!=='software'))throw new Error('成果类型与申报流程不匹配');
 if(!Number.isInteger(x.stage)||Number(x.stage)<0||Number(x.stage)>=WORKFLOWS[flow].stages.length)throw new Error('节点不存在');
 const safe=(k:string,max:number,required=false)=>{if(typeof x[k]!=='string')throw new Error(k+' 必须是文本');const v=(x[k] as string).trim();if(v.length>max||required&&!v)throw new Error(k+' 长度或内容不符合要求');return v};
 const title=safe('title',180,true),agency=safe('agency',90),inventors=safe('inventors',500),owner=safe('owner',60),note=safe('note',1200);
 if(cat!=='software'&&!agency)throw new Error('请选择或填写专利代理机构');
 let owners:Record<string,string>={};
 if(x.owners!==undefined){
  if(!x.owners||Array.isArray(x.owners)||typeof x.owners!=='object'||Object.keys(x.owners).length>60)throw new Error('节点负责人格式不正确');
  for(const [key,val] of Object.entries(x.owners as Record<string,unknown>)){
   const parts=key.split(':');if(parts.length!==2||!isWorkflow(parts[0])||!/^\d+$/.test(parts[1])||+parts[1]>=WORKFLOWS[parts[0]].stages.length)throw new Error('节点编号不正确');
   if(typeof val!=='string'||val.trim().length>60)throw new Error('负责人姓名过长');
   owners[key]=val.trim();
  }
 }
 owners[flow+':'+x.stage]=owner;
 const version=x.version===undefined?undefined:Number(x.version);
 if(version!==undefined&&(!Number.isInteger(version)||version<0))throw new Error('版本编号错误');
 return {title,category:cat,workflow:flow,stage:x.stage as number,agency,inventors,owner,note,owners,version};
}
export async function saveOwners(db:D1Database,id:string,owners:Record<string,string>,date:string){
 const tasks:D1PreparedStatement[]=[];
 for(const [key,owner] of Object.entries(owners)){
  const [workflow,index]=key.split(':');
  tasks.push(db.prepare('INSERT INTO stage_owners(patent_id,workflow,stage,owner,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(patent_id,workflow,stage) DO UPDATE SET owner=excluded.owner,updated_at=excluded.updated_at').bind(id,workflow,Number(index),owner,date));
  if(owner)tasks.push(db.prepare('INSERT OR IGNORE INTO staff(name,created_at) VALUES(?,?)').bind(owner,date));
 }
 if(tasks.length)await db.batch(tasks);
}
export async function ownersFor(db:D1Database,ids:string[]){
 if(!ids.length)return {} as Record<string,Record<string,string>>;
 const result=await db.prepare('SELECT patent_id,workflow,stage,owner FROM stage_owners LIMIT 4000').all<{patent_id:string;workflow:string;stage:number;owner:string}>();
 const map:Record<string,Record<string,string>>={};
 const selected=new Set(ids);
 for(const o of result.results||[])if(selected.has(o.patent_id)){(map[o.patent_id]??={})[o.workflow+':'+o.stage]=o.owner}
 return map;
}
export const stored=(flow:Workflow)=>flow==='software'?'utility':flow;
