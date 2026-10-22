import {initDemo} from './init-demo.mjs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
const maintenanceToken=randomBytes(32).toString('hex');
const maintenanceHash=createHash('sha256').update(maintenanceToken).digest('hex');
const root=fileURLToPath(new URL('../',import.meta.url));
const vars=fileURLToPath(new URL('../.dev.vars',import.meta.url));
const requested=process.argv.slice(2);const demo=requested.includes('--demo');const runtimeArgs=requested.filter(x=>x!=='--demo');if(demo&&runtimeArgs.some((x,i)=>i%2===0?x!=='--port':!/^\d{2,5}$/.test(x)))throw new Error('Demo accepts only --port and always binds to loopback with isolated local storage.');if(demo)initDemo();
const args=['--import',fileURLToPath(new URL('./wrangler-env.mjs',import.meta.url)),fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url)),'dev','--config','dist/server/wrangler.json','--local','--persist-to',demo?'.wrangler/demo-state':'.wrangler/state','--ip','127.0.0.1','--inspector-port','0','--var',`MAINTENANCE_TOKEN_HASH:${maintenanceHash}`,...(existsSync(vars)?['--env-file',vars]:[]),...(demo?['--var','LOCAL_DEMO_MODE:loopback-only-v1','--var','LOCAL_DEMO_STORAGE:isolated-v1']:[]),...runtimeArgs];
const child=spawn(process.execPath,args,{cwd:root,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
const portArg=process.argv.indexOf('--port');const port=portArg>=0?process.argv[portArg+1]:'8787';
let draining=false,wasHealthy=false,lastError='';
async function tick(){if(draining)return;draining=true;try{const r=await fetch(`http://127.0.0.1:${port}/api/maintenance`,{method:'POST',headers:{Authorization:`Bearer ${maintenanceToken}`},signal:AbortSignal.timeout(55000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);if(!wasHealthy)console.log(`[local scheduler] ready; maintenance runs every minute. ${demo?'DEMO: paid APIs are blocked.':'Real API calls remain controlled by admin settings.'}`);wasHealthy=true;lastError='';}catch(error){if(wasHealthy&&lastError!==error.message){console.error('[local scheduler]',error.message);lastError=error.message;}}finally{draining=false;}}
const startup=setTimeout(tick,8000),timer=setInterval(tick,60000);
child.on('exit',code=>{clearTimeout(startup);clearInterval(timer);process.exit(code??1);});
