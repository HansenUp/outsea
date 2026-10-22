import fs from 'node:fs';
import crypto from 'node:crypto';
if(fs.existsSync('.dev.vars'))throw new Error('已有 .dev.vars，拒绝覆盖，避免使现有加密配置失效。');
fs.mkdirSync('outputs',{recursive:true});
const rows=[['admin','超级管理员','admin'],['trial01','体验账户 01','trial'],['trial02','体验账户 02','trial']].map(([username,name,role])=>{const password=crypto.randomBytes(21).toString('base64url')+'!Aa9';const salt=crypto.randomUUID();return{id:crypto.randomUUID(),username,name,role,password,passwordHash:salt+':'+crypto.pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')};});
const vars={SESSION_SECRET:crypto.randomBytes(48).toString('base64url'),BOOTSTRAP_ACCOUNTS:JSON.stringify(rows.map(({password,passwordHash,...r})=>({...r,password:passwordHash})))};
fs.writeFileSync('.dev.vars',Object.entries(vars).map(([k,v])=>k+"='"+v+"'").join('\n')+'\n',{mode:0o600});
fs.writeFileSync('outputs/accounts.md','# Outsea 初始账户（请私密保存）\n\n'+rows.map(r=>`- ${r.name}：\`${r.username}\` / \`${r.password}\``).join('\n')+'\n\n首次登录后可在账户设置修改密码。',{mode:0o600});
console.log('已生成 .dev.vars 和 outputs/accounts.md，未输出密码。');
