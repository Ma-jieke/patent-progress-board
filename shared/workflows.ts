export const WORKFLOWS = {
 pre:{label:'发明专利 · 预审',stages:['撰写中','学校平台预审','预审通过后交专利公司撰写','撰写研发证明材料等相关材料','学校盖章','预审中','下证']},
 priority:{label:'发明专利 · 优先审查',stages:['优先审查中','撰写优先审查相关材料','学校盖章','优审中','下证']},
 utility:{label:'实用新型',stages:['撰写中','学校平台审查','审查通过后交专利公司撰写','审查中','下证']},
 software:{label:'计算机软件著作权',stages:['撰写中','审查中','下证']}
} as const;
export const CATEGORIES = {invention:'发明专利',utility:'实用新型专利',software:'计算机软件著作权'} as const;
export const AGENCIES = ['安徽阜梦','北京荟英'] as const;
export type Workflow = keyof typeof WORKFLOWS;
export type Category = keyof typeof CATEGORIES;
export const isWorkflow=(v:unknown):v is Workflow => typeof v==='string'&&Object.prototype.hasOwnProperty.call(WORKFLOWS,v);
export const isCategory=(v:unknown):v is Category => typeof v==='string'&&Object.prototype.hasOwnProperty.call(CATEGORIES,v);
export const categoryOf=(flow:Workflow):Category=>flow==='pre'||flow==='priority'?'invention':flow==='utility'?'utility':'software';
export type Patent={id:string;title:string;category:Category;workflow:Workflow;stage:number;agency:string;inventors:string;owner:string;note:string;version:number;created_at:string;updated_at:string};
