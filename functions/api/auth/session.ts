import {type Env,json} from '../../_lib/common';
import {admin} from '../../_lib/auth';
export const onRequestGet:PagesFunction<Env>=async({request,env})=>json({authenticated:await admin(request,env)});