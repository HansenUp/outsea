import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {pbkdf2Sync} from 'node:crypto';
const sqlite=new DatabaseSync(':memory:');
for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args;}bind(...args){return new Statement(this.sql,args);}async first(){return sqlite.prepare(this.sql).get(...this.args)||null;}async all(){return{results:sqlite.prepare(this.sql).all(...this.args)};}async run(){const r=sqlite.prepare(this.sql).run(...this.args);return{meta:{changes:Number(r.changes)}};}}
const objects=new Map();
export const env={SESSION_SECRET:'test-master-secret-never-deploy-32-characters',BOOTSTRAP_ACCOUNTS:JSON.stringify(['admin','trial01','trial02'].map((username,i)=>({id:username,username,name:username,role:i?'trial':'admin',password:'test-salt:'+pbkdf2Sync('Test!Password123456','test-salt',100000,32,'sha256').toString('hex')}))),DB:{prepare(sql){return new Statement(sql);},async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}},BUCKET:{async put(key,body,options){objects.set(key,{bytes:body instanceof Uint8Array?body:new Uint8Array(body),httpMetadata:options?.httpMetadata});},async get(key){const x=objects.get(key);return x?{...x,body:new Blob([x.bytes]).stream(),arrayBuffer:async()=>x.bytes.slice().buffer}:null;},async delete(key){objects.delete(key);}}};
export {sqlite,objects};
