// Deploy only to the owner's Cloudflare account. Secrets never belong in this file.
export async function runMaintenance(env,fetcher=fetch){
 const origin=new URL(env.SITE_URL);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hostname==='example.invalid')throw new Error('Configure the exact production HTTPS origin');
 if(!env.MAINTENANCE_TOKEN||!env.STATUS_KV)throw new Error('Scheduler token and STATUS_KV are required');
 let state,incident='ok',report=null;
 try{for(let attempt=0;attempt<3;attempt++){try{const response=await fetcher(origin.origin+'/api/maintenance',{method:'POST',headers:{Authorization:'Bearer '+env.MAINTENANCE_TOKEN,'Content-Type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.timeout(25000)});if(!response.ok){const error=new Error('Maintenance HTTP '+response.status);error.retryable=response.status>=500||response.status===429;throw error;}report=await response.json();if(!report.ok||!report.heartbeat)throw Object.assign(new Error('Heartbeat missing'),{retryable:false});break;}catch(e){if(attempt===2||e.retryable===false)throw e;await new Promise(r=>setTimeout(r,250*(attempt+1)));}}
 if(report?.monitor?.unknownCalls||report?.monitor?.stuckJobs)incident='attention';
 }catch(e){incident='unavailable';}
 try{state=JSON.parse(await env.STATUS_KV.get('maintenance-state')||'null');}catch{state=null;}
 const now=Date.now(),notify=incident!==state?.incident||(incident!=='ok'&&now-(state?.notifiedAt||0)>1800000);
 let notifiedAt=state?.notifiedAt||0;
 if(notify&&env.ALERT_WEBHOOK){const hook=new URL(env.ALERT_WEBHOOK);if(hook.protocol!=='https:'||hook.username||hook.password)throw new Error('Alert destination must be HTTPS');const response=await fetcher(hook.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service:'Sailingo',origin:origin.origin,status:incident,unknownCalls:report?.monitor?.unknownCalls||0,stuckJobs:report?.monitor?.stuckJobs||0,timestamp:new Date(now).toISOString()}),redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Alert delivery failed');notifiedAt=now;}
 await env.STATUS_KV.put('maintenance-state',JSON.stringify({incident,checkedAt:now,notifiedAt}),{expirationTtl:604800});if(incident==='unavailable')throw new Error('Maintenance unavailable; check dashboard and scheduler logs');return {incident,report};
}
export default {scheduled(_event,env,ctx){ctx.waitUntil(runMaintenance(env));}};
