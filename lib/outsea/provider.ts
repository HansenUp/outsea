import {blockDemoProvider} from './demo';
import {hash,hex,hmac} from './security';
export type ProviderConfig={accessKeyId:string;accessKeySecret:string;region:'cn-beijing'|'ap-southeast-1';ossBucket:string;ossRegion:string};
const enc=(s:string)=>encodeURIComponent(s).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
export async function aidge(c:ProviderConfig,action:string,params:Record<string,string>){blockDemoProvider();
 // A single leased job is processed at a time; pace calls conservatively.
 await new Promise(resolve=>setTimeout(resolve,1100));
 const host=`aidge.${c.region}.aliyuncs.com`;
 const encoded=Object.keys(params).sort().map(k=>`${enc(k)}=${enc(params[k])}`).join('&');
 const body=action==='VideoTranslation'?encoded:'';const query=body?'':encoded;
 const headers:Record<string,string>={'host':host,'x-acs-action':action,'x-acs-version':'2026-04-28','x-acs-date':new Date().toISOString().replace(/\.\d{3}Z$/,'Z'),'x-acs-signature-nonce':crypto.randomUUID(),'x-acs-content-sha256':await hash(body)};
 const signed=Object.keys(headers).sort().join(';');const canonical=Object.keys(headers).sort().map(k=>`${k}:${headers[k]}\n`).join('');
 const request=['POST','/',query,canonical,signed,headers['x-acs-content-sha256']].join('\n');
 if(body)headers['content-type']='application/x-www-form-urlencoded';
 headers.Authorization=`ACS3-HMAC-SHA256 Credential=${c.accessKeyId},SignedHeaders=${signed},Signature=${hex(await hmac(c.accessKeySecret,'ACS3-HMAC-SHA256\n'+await hash(request)))}`;
 const response=await fetch(`https://${host}/?${query}`,{method:'POST',headers,body:body||undefined,signal:AbortSignal.timeout(90000)});const data=await response.json() as any;
 if(!response.ok||data.Success===false||(data.Code&&!['success','Success','200'].includes(data.Code)))throw Object.assign(new Error(`翻译服务错误：${String(data.Code||response.status).slice(0,80)}`),{definitive:true,requestId:data.RequestId});
 return {...(data.Data||data),__requestId:data.RequestId};
}
export async function ossSource(c:ProviderConfig,key:string,body:ArrayBuffer,mime:string){blockDemoProvider();
 if(!/^[a-z0-9][a-z0-9-]{2,62}$/.test(c.ossBucket)||!/^oss-[a-z0-9-]+$/.test(c.ossRegion))throw new Error('OSS 配置格式不正确');
 const host=`${c.ossBucket}.${c.ossRegion}.aliyuncs.com`;const date=new Date().toUTCString();const resource=`/${c.ossBucket}/${key}`;
 const signature=btoa(String.fromCharCode(...new Uint8Array(await hmac(c.accessKeySecret,`PUT\n\n${mime}\n${date}\n${resource}`,'SHA-1'))));
 const resp=await fetch(`https://${host}/${key}`,{method:'PUT',headers:{'Content-Type':mime,Date:date,Authorization:`OSS ${c.accessKeyId}:${signature}`},body,signal:AbortSignal.timeout(60000)});
 if(!resp.ok)throw new Error(`OSS 上传失败（${resp.status}），请检查存储权限`);
 return ossReadUrl(c,key);
}
export async function ossReadUrl(c:ProviderConfig,key:string){blockDemoProvider();const expires=Math.floor(Date.now()/1000)+7200;const resource=`/${c.ossBucket}/${key}`;const signature=btoa(String.fromCharCode(...new Uint8Array(await hmac(c.accessKeySecret,`GET\n\n\n${expires}\n${resource}`,'SHA-1'))));return `https://${c.ossBucket}.${c.ossRegion}.aliyuncs.com/${key}?OSSAccessKeyId=${enc(c.accessKeyId)}&Expires=${expires}&Signature=${enc(signature)}`;}
export async function ossDelete(c:ProviderConfig,key:string){blockDemoProvider();const date=new Date().toUTCString();const signature=btoa(String.fromCharCode(...new Uint8Array(await hmac(c.accessKeySecret,`DELETE\n\n\n${date}\n/${c.ossBucket}/${key}`,'SHA-1'))));await fetch(`https://${c.ossBucket}.${c.ossRegion}.aliyuncs.com/${key}`,{method:'DELETE',headers:{Date:date,Authorization:`OSS ${c.accessKeyId}:${signature}`},signal:AbortSignal.timeout(15000)});}
export function resultUrl(data:any){let r=data.Result??data;if(typeof r==='string'){try{r=JSON.parse(r);}catch{throw new Error('翻译服务返回了无效结果');}}return r.ImageUrl||r.imageUrl||r.videoUrl||r.video_url||r.resultUrl||r.url;}
