import {WORKFLOWS,isWorkflow,type Patent,type Workflow} from '../../shared/workflows';
export interface Env{DB:D1Database;ADMIN_PASSWORD:string;SESSION_SECRET:string}
export const json=(value:unknown,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export const err=(message:string,status=400)=>json({error:message},status);
export const validOrigin=(req:Request)=>!!req.headers.get('origin')&&req.headers.get('origin')===new URL(req.url).origin;
export async function body(req:Request):Promise<unknown>{
 if(!req.headers.get('content-type')?.includes('application/json'))throw new Error('需要 JSON');
 const raw=await req.text();if(raw.length>12000)throw new Error('内容过长');
 try{return JSON.parse(raw)}catch{throw new Error('无效 JSON')}
}
export function input(value:unknown):Pick<Patent,'title'|'workflow'|'stage'|'owner'|'note'>{
 if(!value||typeof value!=='object')throw new Error('信息为空');
 const d=value as Record<string,unknown>;
 if(!isWorkflow(d.workflow))throw new Error('流程无效');
 const workflow:Workflow=d.workflow;
 if(typeof d.stage!=='number'||!Number.isInteger(d.stage)||d.stage<0||d.stage>=WORKFLOWS[workflow].stages.length)throw new Error('阶段无效');
 if(typeof d.title!=='string'||!d.title.trim()||d.title.length>160)throw new Error('专利名称无效');
 if(typeof d.owner!=='string'||d.owner.length>60)throw new Error('负责人无效');
 if(typeof d.note!=='string'||d.note.length>1000)throw new Error('备注过长');
 return {title:d.title.trim(),workflow,stage:d.stage,owner:d.owner.trim(),note:d.note.trim()};
}