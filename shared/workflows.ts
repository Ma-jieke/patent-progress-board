export const WORKFLOWS = {
 pre:{label:'预审',stages:['撰写中','学校平台预审','预审通过后交专利公司撰写','撰写研发证明材料等相关材料','学校盖章','预审中','下证']},
 priority:{label:'优先审查',stages:['撰写中','学校平台预审','预审通过后交专利公司撰写','撰写研发证明材料等相关材料','学校盖章','预审不通过转优审','下证']},
 utility:{label:'实用新型',stages:['撰写中','学校平台预审','预审通过后交专利公司撰写','审查中','下证']}
} as const;
export type Workflow=keyof typeof WORKFLOWS;
export const isWorkflow=(v:unknown):v is Workflow=>typeof v==='string'&&Object.prototype.hasOwnProperty.call(WORKFLOWS,v);
export type Patent={id:string;title:string;workflow:Workflow;stage:number;owner:string;note:string;created_at:string;updated_at:string};