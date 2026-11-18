import {type Env,json,err} from '../../_lib/common';
import {mutation,clearCookie} from '../../_lib/auth';
export const onRequestPost:PagesFunction<Env>=async({request})=>mutation(request)?json({authenticated:false},200,{'Set-Cookie':clearCookie}):err('来源无效',403);