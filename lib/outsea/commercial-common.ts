import {env} from 'cloudflare:workers';
export const database=()=>env.DB!;
export function reject(message:string,status=400):never{throw Object.assign(new Error(message),{status});}
export const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const text=(value:unknown,max=2000)=>String(value??'').trim().slice(0,max);
export async function bytes(req:Request,max:number){if(Number(req.headers.get('content-length'))>max)reject('请求内容过大',413);const reader=req.body?.getReader();if(!reader)reject('请求内容为空');const chunks:Uint8Array[]=[];let size=0;for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>max){await reader.cancel();reject('请求内容过大',413);}chunks.push(r.value);}const all=new Uint8Array(size);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}return all;}
export async function readJson(req:Request){try{return JSON.parse(new TextDecoder().decode(await bytes(req,65536)));}catch(e){if((e as any).status)throw e;reject('JSON 格式无效');}}
export function auditStatement(userId:string,action:string,detail:string){return database().prepare('INSERT INTO audit VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),userId,action,detail.slice(0,500),Date.now());}
export async function ownJob(id:string,u:any){const j=await database().prepare('SELECT * FROM jobs WHERE id=?').bind(id).first<any>();if(!j||(u.role!=='admin'&&j.user_id!==u.id))reject('任务不存在',404);return j;}
export function csvResponse(value:string,name:string){return new Response(value,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${name}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
