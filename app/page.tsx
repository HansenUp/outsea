'use client';
import {TaskBusiness,Growth,Runtime,MailAdmin,RevisionHistory,EmailAccount,ForgotPassword} from './commercial';
import { t, localText, useLocale, getLocale, errorText } from './i18n';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowUpRight, ArrowRight, Upload, Image as ImageIcon, Film, Languages, Layers, Download, Plus, Check, CheckCircle2, X, ChevronDown, ChevronRight, ShieldCheck, Settings2, LogOut, LayoutDashboard, Clock, Loader2, RefreshCw, Eye, Lock, Globe2, Menu, FileImage, FolderOpen, AlertCircle, KeyRound, HelpCircle, Play, Sparkles, Search, Trash2 } from 'lucide-react';
import {resultImageBytes,downloadDemoResult,makeDemoSource} from './demo';
import {Glossary,TranslationOptions,Inspection,IssueCreate,Issues,Economics} from './workflow';
import {AccountMenu} from './account-menu';
import { Credits, CreditBalance } from './credits';
import { LocaleSwitch } from './i18n';
import { Pilot } from './pilot';
import { Landing } from './landing';
import { Operations, FeedbackForm } from './operations';
import { makeZip } from '@/lib/outsea/zip';
type User = {
    id: string;
    username: string;
    email?: string | null;
    name: string;
    role: string;
    enabled: number;
    imageQuota: number;
    videoQuota: number;
    mustRotate?: boolean;
    emailVerified?:boolean;
};
type Result = {
    id: string;
    language: string;
    status: string;
    error?: string;
};
type Job = {
    demo?:boolean;
    id: string;
    user_id: string;
    name: string;
    kind: string;
    status: string;
    error?: string;
    size: number;
    duration: string;
    languages: string[];
    created_at: number;
    results: Result[];
};
const LANGS = [['en', 'EN', '英语', 'English'], ['es', 'ES', '西班牙语', 'Español'], ['id', 'ID', '印尼语', 'Indonesia'], ['th', 'TH', '泰语', 'ไทย'], ['vi', 'VI', '越南语', 'Tiếng Việt'], ['ja', 'JP', '日语', '日本語'], ['ko', 'KR', '韩语', '한국어'], ['fr', 'FR', '法语', 'Français'], ['de', 'DE', '德语', 'Deutsch'], ['pt', 'PT', '葡萄牙语', 'Português'], ['ms', 'MY', '马来语', 'Melayu']];
const statuses: Record<string, string> = { queued: '等待处理', processing: '正在翻译', completed: '翻译完成', partial: '部分完成', failed: '处理失败', deleted: '素材已删除' };
async function api(path: string, options: RequestInit = {}) {
    const res = await fetch('/api/' + path, { ...options, headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers } });
    const data: any = await res.json();
    if (!res.ok)
        throw new Error(errorText(data.error) || t("请求失败"));
    return data;
}
const fmt = (t: number) => new Date(t).toLocaleString(getLocale()==='en'?'en-US':'zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
function Brand() { useLocale(); return <span className="brand"><span className="brand-symbol"><svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M5 22 14 5l9 17H5Z" stroke="currentColor" strokeWidth="2"/><path d="M14 5v17M6 17h16" stroke="currentColor" strokeWidth="1.5"/></svg></span><b>{getLocale()==='en'?'Sailingo':<>译帆<span>Sailingo</span></>}</b></span>; }
function Product({ english = false, small = false }: {
    english?: boolean;
    small?: boolean;
}) { useLocale(); return <div className={'product-scene ' + (small ? 'small' : '')}><div className="scene-circle"/><span className="product-kicker">EVERYDAY, BETTER.</span><h3>{localText(english ? <>A little calm.<br />Every day.</> : <>{t("把松弛感")}<br />{t("装进日常。")}</>)}</h3><p>{localText(english ? 'LIGHTWEIGHT · STAYS COOL' : t("轻量随行 · 长效保冷"))}</p><div className="bottle-shadow"/><div className="bottle"><div className="bottle-lid"/><div className="bottle-neck"/><div className="bottle-body"><span>mori.</span><small>DAILY ESSENTIALS<br />500 ml</small></div><div className="bottle-shine"/></div><div className="product-bottom"><span>{localText(english ? 'Made for your everyday.' : t("随时出发，自在随行。"))}</span><b>500<span>ml</span></b></div></div>; }
export default function App() {
    useLocale();
    const [user, setUser] = useState<User | null>(null), [ready, setReady] = useState(false), [loading, setLoading] = useState(true), [view, setView] = useState('create'), [login, setLogin] = useState(false), [toast, setToast] = useState(''), [jobs, setJobs] = useState<Job[]>([]), [modalJob, setModalJob] = useState<Job | null>(null), [sample, setSample] = useState(false), [mobile, setMobile] = useState(false);
    const [loggingOut,setLoggingOut]=useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [startKind, setStartKind] = useState<'image' | 'video'>('image'), [afterLogin, setAfterLogin] = useState('create');
    function openAuth(mode: 'login' | 'register' = 'login') { setAfterLogin('create'); setStartKind('image'); setAuthMode(mode); setLogin(true); }
    function startFlow(kind: 'image' | 'video' = 'image', next = 'create') { openAuth('login'); setStartKind(kind); setAfterLogin(next); }
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const notify = useCallback((s: string) => {
        setToast(s);
        if (toastTimer.current)
            clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(''), 6000);
    }, []);
    const refresh = useCallback(async () => {
        try {
            const d = await api('bootstrap');
            setUser(d.user);
            if (d.user?.mustRotate)
                setView('account');
            setReady(d.providerReady && d.launch?.testingEnabled);
            if (d.user?.mustRotate)
                setJobs([]);
            if (d.user && !d.user.mustRotate) {
                const j = await api('jobs');
                setJobs(j.jobs);
            }
        }
        catch (e) {
            notify((e as Error).message);
        }
        finally {
            setLoading(false);
        }
    }, [notify]);
    useEffect(() => { refresh(); }, [refresh]);
    useEffect(() => {
        if (!user || user.mustRotate)
            return;
        let active=true;const t = setInterval(() => api('jobs').then(d => {if(!active)return; setJobs(d.jobs); setModalJob(j => j ? d.jobs.find((x: Job) => x.id === j.id) || j : null); }).catch(() => { }), 5000);
        return () => {active=false;clearInterval(t);};
    }, [user]);
    useEffect(() => {
        const open = login || sample || !!modalJob;
        if (open)
            document.body.style.overflow = 'hidden';
        const key = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setLogin(false);
                setSample(false);
                setModalJob(null);
                setMobile(false);
            }
            if (e.key?.toLowerCase() === 'n' && !open && user && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
                setView('create');
            }
        };
        window.addEventListener('keydown', key);
        return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', key); };
    }, [login, sample, modalJob, user]);
    const processing = useRef(new Set<string>());
    useEffect(() => {
        const t = setInterval(() => {
            jobs.filter(j => ['queued', 'processing'].includes(j.status)).forEach(j => {
                if (processing.current.has(j.id))
                    return;
                processing.current.add(j.id);
                api(`jobs/${j.id}/process`, { method: 'POST', body: '{}' }).then(d => setJobs(d.jobs)).catch(e => notify(e.message)).finally(() => processing.current.delete(j.id));
            });
        }, 4000);
        return () => clearInterval(t);
    }, [jobs, notify]);
    function go(v: string) {
        if (user?.mustRotate && v !== 'account') {
            notify(t("上线前请先轮换超管密码"));
            setView('account');
            return;
        }
        if (!user) {
            setLogin(true);
            return;
        }
        setView(v);
        setMobile(false);
        window.scrollTo({ top: 0 });
    }
    async function logout() {
        if(loggingOut)return;setLoggingOut(true);
        try {
            await api('auth/logout', { method: 'POST', body: '{}' });
            setUser(null);
            setJobs([]);
            setView('create');setMobile(false);setModalJob(null);setSample(false);setLogin(false);setReady(false);notify(t('已退出登录'));
        }
        catch (e) {
            notify((e as Error).message);
        }finally{setLoggingOut(false);}
    }
    async function zipDownload(j: Job) {
        try {
            notify(t("正在整理下载文件…"));
            const files = [];const manifestVersions:{language:string;version:string}[]=[];
            for (const r of j.results.filter(r => r.status === 'completed')) {
                const res = await fetch(`/api/jobs/${j.id}/result/${r.language}`);
                if (!res.ok)
                    throw new Error(t("下载失败，请重试"));
                manifestVersions.push({language:r.language,version:res.headers.get('X-Sailingo-Version')||'original'});const ct = res.headers.get('content-type');
                const output=j.demo?await resultImageBytes(res):{bytes:new Uint8Array(await res.arrayBuffer()),ext:ct==='image/jpeg'?'jpg':ct==='image/webp'?'webp':j.kind==='image'?'png':'mp4'};
                files.push({name:`${r.language}/${j.demo?'DEMO-SAMPLE-':''}${j.name.replace(/\.[^.]+$/, '')}.${output.ext}`,bytes:output.bytes});
            }
            if (!files.length)
                throw new Error(t("暂无可下载的结果"));
            files.push({ name: 'manifest.json', bytes: new TextEncoder().encode(JSON.stringify({ demo:!!j.demo,notice:j.demo?'LOCAL DEMO - PRESET TEXT - NOT TRANSLATED - NO PAYMENT':undefined,source: j.name, languages: j.languages,versions:manifestVersions, exportedAt: new Date().toISOString() }, null, 2)) });
            const url = URL.createObjectURL(makeZip(files));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${j.demo?'DEMO-SAMPLE':'outsea'}-${j.id.slice(0, 8)}.zip`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            notify(t("下载已开始"));
        }
        catch (e) {
            notify((e as Error).message);
        }
    }
    return <div className="app"><header className="topbar"><a href="/" aria-label={t("译帆首页")}><Brand /></a><nav className="top-nav">{localText(user ? <><span className="top-product-label">{t("素材翻译工作台")}</span><button onClick={() => go('guide')}>{t("帮助中心")}</button></> : <><button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>{t("产品功能")}</button><button onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })}>{t("使用流程")}</button><button onClick={() => setSample(true)}>{t("效果示例")}</button></>)}</nav><div className="top-actions"><LocaleSwitch />{localText(user ? <><AccountMenu user={user} busy={loggingOut} onAccount={()=>go('account')} onCredits={()=>go('credits')} onLogout={logout}/><button className="icon-btn mobile-toggle" aria-label={t("打开菜单")} onClick={() => setMobile(!mobile)}><Menu size={20}/></button></> : <><button className="text-link" onClick={() => openAuth()}>{t("登录")}</button><button className="btn primary compact" onClick={() => openAuth('register')}>{t("免费体验")}</button></>)}</div></header>
 {localText(user ? <div className="workspace"><aside className={'sidebar ' + (mobile ? 'open' : '')}><div><div className="space-heading"><span>{t("译")}</span><div><b>{t("我的工作空间")}</b><small>{localText(user.role === 'admin' ? t("管理员") : t("个人体验版"))}</small></div></div><p className="side-caption">{t("素材管理")}</p><button className={view==='glossary'?'selected':''} onClick={()=>go('glossary')}><ShieldCheck size={18}/>{t("品牌与术语")}</button><button className={view==='issues'?'selected':''} onClick={()=>go('issues')}><AlertCircle size={18}/>{t("问题反馈")}</button><button className={view === 'credits' ? 'selected' : ''} onClick={() => go('credits')}><Layers size={18}/>{t("我的积分")}</button><button className={view === 'create' ? 'selected' : ''} onClick={() => go('create')}><Plus size={18}/>{t("新建翻译")}<span className="key-cap">N</span></button><button className={view === 'jobs' ? 'selected' : ''} onClick={() => go('jobs')}><Layers size={18}/>{t("我的任务")}<span className="nav-count">{localText(jobs.length)}</span></button><button className={view === 'guide' ? 'selected' : ''} onClick={() => go('guide')}><HelpCircle size={18}/>{t("使用指南")}</button>{localText(user.role === 'admin' && <><p className="side-caption second">{t("管理空间")}</p><button className={view === 'admin' ? 'selected' : ''} onClick={() => go('admin')}><ShieldCheck size={18}/>{t("超级管理后台")}</button></>)}</div><div className="side-bottom"><div className="quota-card"><span className="eyebrow"><Sparkles size={13}/>{localText(user.role === 'admin' ? t("管理员空间") : t("图片翻译积分"))}</span><h4>{localText(user.role === 'admin' ? t("平台管理") : t("积分账户"))}</h4><p>{localText(user.role === 'admin' ? t("管理账户、翻译引擎与任务。") : t("注册赠送积分，最多体验 3 张图片；后续购买积分。"))}</p><button onClick={() => go('account')}>{t("查看账户")}<ArrowUpRight size={14}/></button></div><button onClick={logout} disabled={loggingOut}><LogOut size={17}/>{t(loggingOut?"正在退出…":"退出登录")}</button><span className="side-footer">SAILINGO STUDIO © 2026</span></div></aside><main className="work-main">{localText(user.mustRotate && <div className="security-banner" role="alert">{t("上线前必须轮换超管密码。旧密码曾以明文交付，管理及真实调用暂时锁定。请使用下方“修改密码”，保存后重新登录。")}</div>)}<div className="breadcrumb">{t("工作空间")}<ChevronRight size={12}/><span>{localText({ create: t("新建翻译"), jobs: t("我的任务"), guide: t("使用指南"), admin: t("超级管理后台"), account: t("账户设置"), credits: t("我的积分"), glossary:t("品牌与术语"), issues:t("问题反馈") }[view])}</span></div>
 {localText(view === 'create' && <><div className="work-heading"><div><h1>{t("新建素材翻译")}</h1><p>{t("上传中文商品素材，生成目标语言版本。")}</p></div><button className="btn outline compact" onClick={() => go('guide')}><HelpCircle size={15}/>{t("使用指南")}</button></div><Creator initialKind={startKind} user={user} ready={ready} jobs={jobs} onCreated={async () => { await refresh(); setView('jobs'); }} notify={notify}/><div className="workspace-foot"><span><ShieldCheck size={14}/>{t("素材私有存储 · 仅本人及管理员可访问")}</span><span><Clock size={14}/>{t("任务自动保存，随时回来查看")}</span></div>{localText(jobs.length > 0 && <section className="recent-real"><div className="section-heading"><h3>{t("最近任务")}</h3><button className="text-link" onClick={() => go('jobs')}>{t("查看全部")}<ArrowRight size={14}/></button></div><Jobs jobs={jobs.slice(0, 3)} onPreview={setModalJob} onDownload={zipDownload} onRetry={async (j) => {
                        try {
                            await api(`jobs/${j.id}/retry`, { method: 'POST', body: '{}' });
                            await refresh();
                            notify(t("任务已重新加入队列"));
                        }
                        catch (e) {
                            notify((e as Error).message);
                        }
                    }}/></section>)}</>)}
 {localText(view === 'jobs' && <><div className="page-heading"><div><h1>{t("我的翻译任务")}<span className="muted">/ {localText(jobs.length.toString().padStart(2, '0'))}</span></h1><p>{t("管理翻译进度，预览与下载多语言成品。")}</p></div><button className="btn primary" onClick={() => go('create')}><Plus size={16}/>{t("新建翻译")}</button></div><Jobs jobs={jobs} onPreview={setModalJob} onDownload={zipDownload} onRetry={async (j) => {
                    try {
                        await api(`jobs/${j.id}/retry`, { method: 'POST', body: '{}' });
                        await refresh();
                        notify(t("任务已重新加入队列"));
                    }
                    catch (e) {
                        notify((e as Error).message);
                    }
                }}/></>)}
 {localText(view === 'guide' && <Guide onCreate={() => go('create')}/>)}
 {view==='glossary'&&<Glossary/>}{view==='issues'&&<Issues admin={user.role==='admin'}/>}
 {localText(view === 'credits' && <Credits notify={notify}/>)}
 {localText(view === 'account' && <Account user={user} jobs={jobs} notify={notify} onPassword={() => { setUser(null); setLogin(true); }}/>)}
 {localText(view === 'admin' && user.role === 'admin' && <Admin notify={notify} onUpdate={refresh} jobs={jobs}/>)}
 </main></div> : <><Landing onStart={() => openAuth('register')} onImage={() => startFlow('image')} onVideo={() => startFlow('video')} onTasks={() => startFlow('image', 'jobs')}/><footer className="footer"><Brand /><span>{t("商品素材，多语言交付。")}</span><a href="/service">{t("服务、隐私与售后")}</a><span>© 2026 Sailingo</span></footer></>)}
 {localText(loading && <div className="loading-bar"/>)}{localText(toast && <div className="toast" role="status"><AlertCircle size={18}/>{localText(toast)}<button aria-label={t("关闭提示")} onClick={() => setToast('')}><X size={15}/></button></div>)}
 {localText(login && <Login initialMode={authMode} onClose={() => setLogin(false)} onLogin={async () => { setLogin(false); setView(afterLogin); await refresh(); window.scrollTo({ top: 0 }); }} notify={notify}/>)}
 {localText(sample && <div className="modal-backdrop" onClick={() => setSample(false)}><section className="modal sample-modal" role="dialog" aria-modal="true" aria-label={t("翻译效果示例")} onClick={e => e.stopPropagation()}><button className="modal-close icon-btn" aria-label={t("关闭")} onClick={() => setSample(false)}><X size={20}/></button><p className="eyebrow">VISUAL LOCALIZATION</p><h2>{t("同一份好商品，换一种表达。")}</h2><p className="muted">{t("以下为预制设计示例，用于说明产品交付形式，不代表实时翻译结果。")}</p><div className="sample-pair"><div><span className="sample-label">{t("中文原稿")}</span><Product /></div><div><span className="sample-label accent">{t("英语版本")}</span><Product english/></div></div><button className="btn primary" onClick={() => { setSample(false); user ? go('create') : setLogin(true); }}>{t("用自己的素材试一试")}<ArrowUpRight size={16}/></button></section></div>)}
 {localText(modalJob && <div className="modal-backdrop" onClick={() => setModalJob(null)}><section className="modal result-modal" role="dialog" aria-modal="true" aria-label={t("任务结果预览")} onClick={e => e.stopPropagation()}><button className="modal-close icon-btn" aria-label={t("关闭")} onClick={() => setModalJob(null)}><X size={20}/></button><p className="eyebrow">TRANSLATION RESULTS</p><h2>{modalJob.demo&&<span className="demo-tag">DEMO</span>}{localText(modalJob.name)}</h2><p className="muted">{localText(statuses[modalJob.status])} · {localText(fmt(modalJob.created_at))}</p><div className="results-grid"><div className="preview-result"><span>{t("原始素材 · 中文")}</span>{localText(modalJob.kind === 'image' ? <img src={`/api/jobs/${modalJob.id}/source`} alt={t("原始素材")}/> : <video src={`/api/jobs/${modalJob.id}/source`} controls/>)}</div>{localText(modalJob.results.map(r => <div className="preview-result" key={r.id}><span>{localText(LANGS.find(l => l[0] === r.language)?.[2])} <b className={'status ' + r.status}>{localText(statuses[r.status])}</b></span><small className="result-id">{t("验收结果编号：")}{localText(r.id)}</small>{localText(r.status === 'completed' ? <>{localText(modalJob.kind === 'image' ? <img src={`/api/jobs/${modalJob.id}/result/${r.language}`} alt={r.language + t(" 翻译结果")}/> : <video src={`/api/jobs/${modalJob.id}/result/${r.language}`} controls/>)}<a className="btn outline" href={`/api/jobs/${modalJob.id}/result/${r.language}?download=1`} onClick={e=>{if(modalJob.demo){e.preventDefault();downloadDemoResult(`/api/jobs/${modalJob.id}/result/${r.language}`,`${modalJob.id}-${r.language}`).catch(err=>notify(err.message));}}} download><Download size={15}/>{t("下载此版本")}</a></> : <div className="result-pending">{localText(r.status === 'failed' ? <AlertCircle /> : <Loader2 className="spin"/>)}<p>{localText(r.error || t("翻译结果将在处理完成后显示"))}</p></div>)}</div>))}</div><RevisionHistory job={modalJob} onIssues={()=>{setModalJob(null);go('issues');}}/>{modalJob.kind==='image'&&<Inspection job={modalJob}/>}<IssueCreate job={modalJob}/><FeedbackForm jobId={modalJob.id} notify={notify}/><div className="modal-bottom"><small>{t(modalJob.demo?"模拟预览：预设文案非真实翻译，请勿用于上架。":"请核对尺寸、型号、文字排版后再用于上架。")}</small><button className="btn primary" disabled={!modalJob.results.some(r => r.status === 'completed')} onClick={() => zipDownload(modalJob)}><Download size={16}/>{t("打包下载 ZIP")}</button></div></section></div>)}
 </div>;
}
function Login({ initialMode, onClose, onLogin }: {
    initialMode: 'login' | 'register';
    onClose: () => void;
    onLogin: () => void;
    notify: (s: string) => void;
}) {
    useLocale();
    const [mode, setMode] = useState(initialMode), [username, setUsername] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const register = mode === 'register';
    return <div className="modal-backdrop" onClick={onClose}><section className="modal login-modal" role="dialog" aria-modal="true" aria-label={register ? t("邮箱注册") : t("账户登录")} onClick={e => e.stopPropagation()}><button className="modal-close icon-btn" aria-label={t("关闭")} onClick={onClose}><X size={20}/></button><Brand /><div className="auth-tabs"><button className={!register ? 'selected' : ''} onClick={() => { setMode('login'); setError(''); setPassword(''); }}>{t("账户登录")}</button><button className={register ? 'selected' : ''} onClick={() => { setMode('register'); setError(''); setPassword(''); }}>{t("邮箱注册")}</button></div><h2>{localText(register ? t("注册译帆") : t("登录译帆"))}</h2><p className="muted">{localText(register ? t("注册赠送积分，最多体验 3 张图片。") : t("使用邮箱或用户名和密码进入工作台。"))}</p><form onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
                await api('auth/' + mode, { method: 'POST', body: JSON.stringify(register ? { email, username, password } : { username, password }) });
                onLogin();
            }
            catch (err) {
                setError((err as Error).message);
            }
            finally {
                setBusy(false);
            }
        }}>{localText(register ? <><label>{t("邮箱")}<input type="email" autoFocus autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required maxLength={254}/></label><label>{t("用户名")}<small>{t("可选，用于登录")}</small><input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder={t("字母开头，3—24 位字母、数字或下划线")} pattern="[a-zA-Z][a-zA-Z0-9_]{2,23}" maxLength={24}/></label></> : <label>{t("邮箱或用户名")}<input autoFocus autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder={t("请输入邮箱或用户名")} required maxLength={254}/></label>)}<label>{t("密码")}<input type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={register ? t("至少 12 位，包含字母和数字") : t("请输入密码")} required minLength={register ? 12 : 1} maxLength={128}/></label>{localText(error && <p className="error-box" role="alert">{localText(error)}</p>)}<button className="btn primary full" disabled={busy}>{localText(busy ? <Loader2 className="spin" size={17}/> : <>{localText(register ? t("注册并进入工作台") : t("登录工作台"))} <ArrowUpRight size={17}/></>)}</button></form>{!register&&<ForgotPassword/>}<div className="login-note"><Lock size={14}/><span>{localText(register ? t("请使用自己的邮箱注册，并妥善保存密码。") : t("原有管理员与体验账户可直接登录；已绑定邮箱可使用上方找回入口。"))}</span></div></section></div>;
}
function Creator({ initialKind = 'image', user, ready, jobs, onCreated, notify }: {
    initialKind?: 'image' | 'video';
    user: User;
    ready: boolean;
    jobs: Job[];
    onCreated: () => void;
    notify: (s: string) => void;
}) {
    useLocale();
    const [demo,setDemo]=useState(false);
    const requestIds=useRef(new WeakMap<File,string>());
    const [balance, setBalance] = useState<any>(null), [unitCost, setUnitCost] = useState(1);
    useEffect(() => { api('credits').then(d => { setBalance(d.wallet); setUnitCost(d.imageCredits); }).catch(() => { }); }, []);
    const [allowed, setAllowed] = useState<string[]>(['en']), [trialOpen, setTrialOpen] = useState(false);
    useEffect(() => { api('bootstrap').then(d => { setDemo(!!d.demo);setAllowed(d.launch?.languages || ['en']); setTrialOpen(!!d.launch?.allowTrials || !!d.launch?.paidEnabled); }).catch(() => { }); }, []);
    const [orders, setOrders] = useState<any[]>([]), [orderId, setOrderId] = useState('');
    useEffect(() => { api('orders').then(d => setOrders(d.orders.filter((o: any) => o.status === 'paid'))).catch(() => { }); }, []);
    const selectedOrder = orders.find(o => o.id === orderId);
    const [kind, setKind] = useState(user.role==='admin'?initialKind:'image'), [files, setFiles] = useState<File[]>([]), [langs, setLangs] = useState(['en']), [busy, setBusy] = useState(false), [drag, setDrag] = useState(false), [consent, setConsent] = useState(false), [preview, setPreview] = useState(''), [fileError, setFileError] = useState('');
    const [qualityOptions,setQualityOptions]=useState({protectProduct:true,sourceText:'',demoScenario:'normal'});
    const input = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (!files[0]) {
            setPreview('');
            return;
        }
        const url = URL.createObjectURL(files[0]);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [files]);
    async function choose(list: FileList | null) {
        if (!list)
            return;
        setFileError('');
        const f = Array.from(list);
        if (user.role !== 'admin' && !selectedOrder && !balance?.paid && f.length > 1) {
            setFileError(t("体验账户每次只能选择一个文件"));
            return;
        }
        if (f.length > 10) {
            setFileError(t("每批最多上传 10 个文件"));
            return;
        }
        for (const item of f) {
            if (item.size > (kind === 'image' ? 10 : 20) * 1024 * 1024) {
                setFileError(t("文件超出大小限制"));
                return;
            }
            if (kind === 'image' && !['image/png', 'image/jpeg', 'image/webp'].includes(item.type)) {
                setFileError(t("请选择 PNG、JPG 或 WebP 图片"));
                return;
            }
            if (kind === 'video') {
                if (!/\.(mp4|mov)$/i.test(item.name)) {
                    setFileError(t("请选择 MP4 / MOV 视频"));
                    return;
                }
                try {
                    await new Promise<void>((resolve, reject) => { const v = document.createElement('video'); const url = URL.createObjectURL(item); v.preload = 'metadata'; const timer = setTimeout(() => { URL.revokeObjectURL(url); reject(new Error(t("视频读取超时，请重新导出 MP4"))); }, 10000); v.onloadedmetadata = () => { clearTimeout(timer); URL.revokeObjectURL(url); v.duration > 5 ? reject(new Error((getLocale()==='en'?`Video is ${v.duration.toFixed(2)} seconds. Maximum: 5 seconds.`:`视频为 ${v.duration.toFixed(2)} 秒，体验上限为 5 秒`))) : resolve(); }; v.onerror = () => { clearTimeout(timer); URL.revokeObjectURL(url); reject(new Error(t("无法读取该视频，请转换为 MP4"))); }; v.src = url; });
                }
                catch (e) {
                    setFileError((e as Error).message);
                    return;
                }
            }
        }
        setFiles(f);
    }
        const exhausted = selectedOrder ? selectedOrder.used >= selectedOrder.units : user.role !== 'admin' && !!balance && (Math.floor((balance.freeImagesUsed<3?balance.free:0)/unitCost)+Math.floor(balance.paid/unitCost))<langs.length*Math.max(1,files.length);
    return <div className="creator-grid"><section className="upload-panel"><div className="panel-title"><h3><span className="step-circle">1</span>{t("上传商品素材")}</h3><span className="muted">{t("中文原素材")}</span></div><div className="pilot-order-select">{t("交付方式")}<select aria-label={t("交付订单")} value={orderId} onChange={e => { setOrderId(e.target.value); setFiles([]); setKind('image'); const chosen = orders.find(o => o.id === e.target.value); setLangs(chosen ? JSON.parse(chosen.languages).slice(0, 1) : ['en']); }}><option value="">{t("积分支付 / 管理员验收测试")}</option>{localText(orders.map((o: any) => <option key={o.id} value={o.id}>{localText(o.customer)} · {localText(o.id.slice(0, 8))} · {localText(o.used)}/{localText(o.units)}{t("个交付单位")}</option>))}</select></div><div className="type-tabs"><button className={kind === 'image' ? 'active' : ''} onClick={() => { setKind('image'); setFiles([]); setFileError(''); }}><ImageIcon size={17}/>{t("图片翻译")}</button><button title={t("视频暂仅供管理员验收测试")} disabled={demo||!!selectedOrder || user.role !== 'admin'} className={kind === 'video' ? 'active' : ''} onClick={() => { setKind('video'); setFiles([]); setFileError(''); }}><Film size={17}/>{t("视频翻译")}<span>≤ 5s</span></button></div><input ref={input} type="file" hidden accept={kind === 'image' ? 'image/png,image/jpeg,image/webp' : '.mp4,.mov'} multiple={user.role === 'admin' || !!selectedOrder || !!balance?.paid} onChange={e => { choose(e.target.files); e.target.value = ''; }}/>
 <div className={'drop-zone ' + (drag ? 'drag ' : '') + (files.length ? 'has-file' : '')} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files); }}>{localText(files.length ? <><div className="upload-preview">{localText(kind === 'image' ? <img src={preview} alt={t("上传的商品图片")}/> : <video src={preview} controls/>)}</div><div className="file-meta"><div><b>{localText(files[0].name)}{localText(files.length > 1 ? (getLocale()==='en'?` and ${files.length-1} more`:` 等 ${files.length} 个文件`) : '')}</b><p>{localText((files.reduce((a, b) => a + b.size, 0) / 1024 / 1024).toFixed(2))}{t("MB · 已选择")}</p></div><button className="icon-btn" aria-label={t("移除文件")} onClick={() => setFiles([])}><Trash2 size={17}/></button></div><button className="text-link" onClick={() => input.current?.click()}>{t("重新选择素材")}</button></> : <><div className="upload-art"><div className="art-back"/>{localText(kind === 'image' ? <FileImage size={34} strokeWidth={1.3}/> : <Film size={34} strokeWidth={1.3}/>)}<span><Plus size={13}/></span></div><h3>{t("点击选择或拖拽")}{localText(kind === 'image' ? t("图片") : t("视频"))}{t("到这里")}</h3><p>{t("或点击下方按钮，从本地选择素材")}</p><button className="btn light" onClick={() => input.current?.click()}><Upload size={16}/>{t("选择")}{localText(kind === 'image' ? t("图片") : t("视频"))}</button><small>{localText(kind === 'image' ? t("JPG / PNG / WebP · 最大 10 MB · 4000 × 4000 内") : t("MP4 / MOV · 最大 20 MB · 时长不超过 5 秒"))}</small></>)}</div>{localText(fileError && <div className="error-box" role="alert">{localText(fileError)}</div>)}{demo&&<button className="btn outline full" onClick={()=>makeDemoSource().then(file=>{setKind('image');setFiles([file]);setFileError('');setQualityOptions(v=>({...v,sourceText:'MARIN MB-500 保温杯 500ml 尺寸 7×22cm'}));}).catch(err=>notify(err.message))}>{t("使用演示样图（无需准备文件）")}</button>}<div className="upload-tips"><ShieldCheck size={16}/><p>{t("文件私有保存，翻译时通过限时授权供处理服务读取。")}</p></div></section>
 <section className="settings-panel"><div className="panel-title"><h3><span className="step-circle">2</span>{t("设置目标市场")}</h3><Settings2 size={17}/></div><div className="source-language"><div><span>{t("源语言")}</span><b>{t("简体中文")}</b></div><span className="code-tag">ZH</span><ArrowRight size={16}/><div><span>{t("目标语言")}</span><b>{t("多语言输出")}</b></div></div><div className="language-heading"><b>{t("选择目标语言")}</b><span>{t("已选")}{localText(langs.length)} / 3</span></div><div className="language-grid">{localText(LANGS.map(([code, short, name, native]) => <button aria-pressed={langs.includes(code)} key={code} disabled={!allowed.includes(code)} className={langs.includes(code) ? 'selected' : ''} onClick={() => {
                if (selectedOrder && !JSON.parse(selectedOrder.languages).includes(code)) {
                    notify(t("订单未约定此语向"));
                    return;
                }
                if (langs.includes(code))
                    setLangs(langs.filter(l => l !== code));
                else if (langs.length < 3)
                    setLangs([...langs, code]);
                else
                    notify(t("每份素材最多选择 3 种语言"));
            }}><span className="lang-code">{localText(short)}</span><span>{localText(name)}<small>{localText(native)}</small></span><span className="checkbox">{localText(langs.includes(code) && <Check size={11}/>)}</span></button>))}</div><div className="processing-mode"><Languages size={17}/><div><b>{localText(kind === 'image' ? t("画面文字翻译与回填") : t("视频画面文字翻译"))}</b><p>{localText(kind === 'image' ? t("识别中文，翻译并回填；保留品牌名。") : t("翻译嵌入画面的中文卖点文字，保留原音轨。"))}</p></div><CheckCircle2 size={15}/></div><div className={'engine-note ' + (ready ? 'configured' : '')}><span className={ready ? 'green-dot' : 'amber-dot'}/>{localText(ready ? t(demo?"本地模拟引擎 · 无真实翻译":"翻译引擎已配置") : t("等待管理员配置引擎与授权测试预算"))}{localText(!ready && <small>{t("可选择素材与语言；配置后即可提交。")}</small>)}</div><TranslationOptions value={qualityOptions} onChange={setQualityOptions}/><label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/><span>{t(demo?"我确认仅在本机模拟处理有权上传的素材；查看":"我有权上传和处理该素材，并同意按")}<a href="/service" target="_blank" rel="noreferrer">{t("服务与隐私说明")}</a>{t(demo?"。演示不会发送给外部翻译服务。":"交由翻译服务处理。")}</span></label><button className="btn primary full translate-btn" disabled={busy || !files.length || !langs.length || !consent || !ready || exhausted || (user.role !== 'admin' && !selectedOrder && !trialOpen)} onClick={async () => {
            setBusy(true);let completed=0;
            try { for (const file of files) {const data=new FormData();data.append('file',file);if(!requestIds.current.has(file))requestIds.current.set(file,crypto.randomUUID());data.append('requestId',requestIds.current.get(file)!);data.append('languages',JSON.stringify(langs));data.append('sourceText',files.length===1?qualityOptions.sourceText:'');data.append('protectProduct',String(qualityOptions.protectProduct));data.append('demoScenario',qualityOptions.demoScenario);data.append('rightsConfirmed','true');data.append('policyVersion','2026-10-21');if(orderId)data.append('orderId',orderId);await api('jobs',{method:'POST',body:data});completed++;}
              notify(t('提交成功，任务正在自动处理'));setFiles([]);
            }catch(e){setFiles(files.slice(completed));notify((e as Error).message);}finally{setBusy(false);if(completed)onCreated();}
        }}>{localText(busy ? <><Loader2 size={17} className="spin"/>{t("正在上传与校验…")}</> : <><Languages size={17}/>{t("开始翻译")}<ArrowUpRight size={17}/></>)}</button><CreditBalance /><div className="submit-note">{localText(exhausted ? t("积分不足，请在我的积分中购买") : user.role === 'admin' ? t("管理员可批量提交，单个视频仍限制 5 秒") : selectedOrder ? t("按成功的图片语言结果结算；失败交付次数释放") : !trialOpen ? t("受控试运营：请先联系运营确认邀请或付费订单") : (getLocale()==='en'?`Reserve ${langs.length*unitCost*Math.max(1,files.length)} credits · Released on confirmed failure`:`本次预留 ${langs.length*unitCost*Math.max(1,files.length)} 积分 · 明确失败自动返还`))}</div></section></div>;
}
function Jobs({ jobs, onPreview, onDownload, onRetry }: {
    jobs: Job[];
    onPreview: (j: Job) => void;
    onDownload: (j: Job) => void;
    onRetry: (j: Job) => void;
}) {
    useLocale();
    const [filter, setFilter] = useState('all'), [query, setQuery] = useState('');
    const list = jobs.filter(j => (filter === 'all' || j.kind === filter) && j.name.toLowerCase().includes(query.toLowerCase()));
    return <><div className="jobs-toolbar"><div className="filter-tabs">{localText([['all', t("全部素材")], ['image', t("图片")], ['video', t("视频")]].map(([v, l]) => <button key={v} className={v === filter ? 'selected' : ''} onClick={() => setFilter(v)}>{localText(l)}</button>))}</div><label className="search"><Search size={16}/><input placeholder={t("搜索素材名称")} value={query} onChange={e => setQuery(e.target.value)}/></label></div>{localText(!list.length ? <div className="empty-state"><FolderOpen size={42} strokeWidth={1}/><h3>{localText(jobs.length ? t("没有匹配的任务") : t("暂无翻译任务"))}</h3><p>{localText(jobs.length ? t("试试其他关键词或素材类型") : t("上传商品素材后，在这里查看翻译进度、预览和下载结果。"))}</p></div> : <div className="job-list">{localText(list.map(j => <article className="job-row" key={j.id}><button className="job-thumb" onClick={() => onPreview(j)} aria-label={t("预览 ") + j.name}>{localText(j.kind === 'image' ? <img src={`/api/jobs/${j.id}/source`} alt=""/> : <Film size={24}/>)}</button><div className="job-info"><h3>{j.demo&&<span className="demo-tag">DEMO</span>}{localText(j.name)}</h3><p>{localText(j.kind === 'image' ? t("图片") : `${Number(j.duration).toFixed(1)} 秒视频`)}<span>·</span>{localText(fmt(j.created_at))}<span>·</span>{localText((j.size / 1024 / 1024).toFixed(1))} MB</p><div className="job-langs">{localText(j.languages.map(l => <span key={l}>{localText(LANGS.find(x => x[0] === l)?.[2])}</span>))}</div>{localText(j.error && <small className="error-text">{localText(j.error)}</small>)}</div><div className="job-status"><span className={'status ' + j.status}>{localText(['queued', 'processing'].includes(j.status) ? <Loader2 size={12} className="spin"/> : j.status === 'completed' ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>)} {localText(statuses[j.status])}</span><small>{localText(j.results.filter(r => r.status === 'completed').length)} / {localText(j.results.length)}{t("个语言版本")}</small></div><div className="job-actions">{localText(!['queued', 'processing', 'deleted'].includes(j.status) && <button className="icon-btn" title={t("删除素材（不自动退款）")} onClick={async () => {
                        if (!window.confirm(t("删除该任务的原稿与成品？交付与订单记录保留，不会自动退款。")))
                            return;
                        try {
                            await api(`jobs/${j.id}/delete`, { method: 'POST', body: '{}' });
                            window.location.reload();
                        }
                        catch (e) {
                            window.alert((e as Error).message);
                        }
                    }}><Trash2 size={17}/></button>)}<button className="icon-btn" title={t("预览结果")} onClick={() => onPreview(j)}><Eye size={18}/></button>{localText(j.results.some(r => r.status === 'completed') && <button className="btn outline compact" onClick={() => onDownload(j)}><Download size={15}/>{t("下载")}</button>)}{localText(['failed', 'partial'].includes(j.status) && <button className="icon-btn" title={t("重试失败版本")} onClick={() => onRetry(j)}><RefreshCw size={17}/></button>)}</div></article>))}</div>)}<p className="table-footnote">{t("任务与素材私有保存。失败版本可单独重试，成功版本不会重复处理。")}</p></>;
}
function Guide({ onCreate }: {
    onCreate: () => void;
}) { useLocale(); return <><div className="page-heading"><div><h1>{t("使用指南")}</h1><p>{t("从中文原素材，到适合目标市场的视觉表达。")}</p></div></div><div className="guide-cards">{localText([['01', t("准备好素材"), t("图片支持 JPG、PNG、WebP，10 MB 以内、4000 × 4000 像素以内；视频支持普通 MP4 / MOV，20 MB 以内且不超过 5 秒。")], ['02', t("选择你的市场"), t("每个文件可以选择 1—3 种目标语言。系统翻译画面中的中文文字，视频保留原音轨，当前不包含配音和口型同步。")], ['03', t("提交并等待处理"), t("任务保存在“我的任务”。处理时长取决于素材与供应商队列。关闭页面后任务仍保留，重新打开即可同步结果。")], ['04', t("核对后下载使用"), t("预览各语言成品，检查品牌、尺寸、型号和文字排版。可以单独下载，也可以按语言打包 ZIP 下载。")]].map(([n, h, p]) => <article key={n}><span>{localText(n)}</span><h3>{localText(h)}</h3><p>{localText(p)}</p></article>))}</div><div className="guide-faq"><h3>{t("体验规则")}</h3><p>{t("新账户赠送 0—3 积分，由管理员配置；每个图片语言结果默认 1 积分，赠送积分最多用于 3 张图片。处理中预留积分，成功扣除，明确失败返还；供应商状态不明时冻结待核对。")}</p><h3>{t("为什么暂时不能提交？")}</h3><p>{t("若显示“等待管理员配置翻译引擎”，请由管理员接入阿里云 Aidge 与 OSS。系统不会生成假翻译或扣除未执行任务的额度。")}</p><button className="btn primary" onClick={onCreate}>{t("开始翻译")}<ArrowUpRight size={16}/></button></div></>; }
function Account({ user, jobs, notify, onPassword }: {
    user: User;
    jobs: Job[];
    notify: (s: string) => void;
    onPassword: () => void;
}) {
    useLocale();
    const [current, setCurrent] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false);
    return <><div className="page-heading"><div><h1>{t("账户与安全")}</h1><p>{t("管理账户信息和图片翻译积分。")}</p></div></div><div className="account-grid"><section className="panel"><div className="account-avatar">{localText(user.name.slice(0, 1))}</div><h2>{localText(user.name)}</h2><p className="muted">{localText(user.username)} · {localText(user.role === 'admin' ? t("超级管理员") : t("体验账户"))}</p>{localText(user.email && <p className="muted account-email">{localText(user.email)}</p>)}<CreditBalance /><EmailAccount user={user}/><p className="tiny muted">{t("每张图片的每种语言单独扣积分。赠送积分仅用于最多 3 张图片。")}</p></section><section className="panel"><h3><KeyRound size={18}/>{t("修改密码")}</h3><p className="muted">{t("修改后所有现有登录会话将失效。")}</p><form onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
                await api('auth/password', { method: 'POST', body: JSON.stringify({ current, password }) });
                notify(t("密码已更新，请重新登录"));
                onPassword();
            }
            catch (err) {
                notify((err as Error).message);
            }
            finally {
                setBusy(false);
            }
        }}><label>{t("当前密码")}<input type="password" required autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)}/></label><label>{t("新密码")}<input type="password" minLength={16} maxLength={128} required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}/><small>{t("至少 16 位，包含大小写字母、数字与符号。")}</small></label><button className="btn outline" disabled={busy}>{localText(busy ? <Loader2 className="spin" size={16}/> : <Lock size={15}/>)}{t("更新密码")}</button></form></section></div></>;
}
function Admin({ notify, onUpdate, jobs }: {
    notify: (s: string) => void;
    onUpdate: () => void;
    jobs: Job[];
}) {
    useLocale();
    const [data, setData] = useState<any>(null), [tab, setTab] = useState('pilot'), [busy, setBusy] = useState(false), [config, setConfig] = useState({ accessKeyId: '', accessKeySecret: '', region: 'cn-beijing', ossBucket: '', ossRegion: 'oss-cn-beijing' }), [resetUser, setResetUser] = useState(''), [newPass, setNewPass] = useState('');
    const load = useCallback(() => api('admin/overview').then(d => {
        setData(d);
        if (d.provider)
            setConfig(c => ({ ...c, region: d.provider.region, ossBucket: d.provider.ossBucket, ossRegion: d.provider.ossRegion }));
    }).catch(e => notify(e.message)), [notify]);
    useEffect(() => { load(); }, [load]);
    async function mutate(id: string, b: any) {
        try {
            await api('admin/users/' + id, { method: 'PATCH', body: JSON.stringify(b) });
            await load();
            onUpdate();
            notify(t("账户设置已更新"));
        }
        catch (e) {
            notify((e as Error).message);
        }
    }
    return <><div className="page-heading"><div><h1>{t("超级管理后台")}</h1><p>{t("管理翻译引擎、体验账户和平台运行记录。")}</p></div><span className="admin-badge"><Lock size={13}/>{t("超级管理员专属")}</span></div><div className="filter-tabs admin-tabs">{localText([['business',t("任务核算")],['growth',t("获客转化")],['runtime',t("运行保障")],['mail',t("邮件服务")],['glossary',t("术语绑定")],['issues',t("工单处理")],['economics',t("成本统计")],['credits', t("积分管理")], ['pilot', t("付费试运营")], ['overview', t("运行概览")], ['users', t("体验账户")], ['provider', t("翻译引擎")], ['operations', t("运营管理")], ['audit', t("操作日志")]].map(([id, l]) => <button key={id} className={id === tab ? 'selected' : ''} onClick={() => setTab(id)}>{localText(l)}</button>))}</div>{tab==='business'&&<TaskBusiness/>}{tab==='growth'&&<Growth/>}{tab==='runtime'&&<Runtime/>}{tab==='mail'&&<MailAdmin/>}{tab==='glossary'&&<Glossary admin/>}{tab==='issues'&&<Issues admin/>}{tab==='economics'&&<Economics/>}{localText(tab === 'credits' && <Credits admin notify={notify}/>)} {localText(tab === 'pilot' && <Pilot notify={notify}/>)} {localText(tab === 'overview' && <><div className="stats-grid">{localText([[t("总任务"), jobs.length], [t("已完成"), jobs.filter(j => j.status === 'completed').length], [t("处理中"), jobs.filter(j => ['queued', 'processing'].includes(j.status)).length], [t("失败任务"), jobs.filter(j => j.status === 'failed').length]].map(([l, n]) => <div key={l}><span>{localText(l)}</span><b>{localText(n)}</b></div>))}</div><section className="panel engine-summary"><div><span className={data?.provider ? 'green-dot' : 'amber-dot'}/><h3>{localText(data?.provider ? t("翻译服务已配置") : t("翻译服务等待接入"))}</h3><p>{t("图片翻译 · 视频画面文字翻译 · 私有素材存储")}</p></div><button className="btn outline" onClick={() => setTab('provider')}>{t("配置翻译引擎")}<ArrowUpRight size={15}/></button></section></>)}{localText(tab === 'users' && <section className="panel"><h3>{t("体验账户管理")}</h3><p className="muted">{t("新账户赠送积分仅一次，最多用于 3 张图片。后续通过购买积分继续使用。")}</p>{localText(data?.users.filter((u: User) => u.role !== 'admin').map((u: User) => <div className="admin-user" key={u.id}><div className="small-avatar">{localText(u.name.slice(0, 1))}</div><div><b>{localText(u.name)}</b><p>{localText(u.username)} · {localText(u.enabled ? t("已启用") : t("已停用"))}</p></div><div className="admin-user-actions"><button className="btn outline compact" onClick={() => setResetUser(u.id)}>{t("重置密码")}</button><button className="text-link" onClick={() => mutate(u.id, { enabled: !u.enabled })}>{localText(u.enabled ? t("停用") : t("启用"))}</button></div></div>))}{localText(resetUser && <form className="reset-form" onSubmit={e => { e.preventDefault(); mutate(resetUser, { password: newPass }); setNewPass(''); setResetUser(''); }}><label>{t("新密码（至少 16 位，含大小写、数字与符号）")}<input type="password" required minLength={16} maxLength={128} value={newPass} onChange={e => setNewPass(e.target.value)}/></label><button className="btn primary compact">{t("保存新密码")}</button><button type="button" className="btn outline compact" onClick={() => setResetUser('')}>{t("取消")}</button></form>)}</section>)}{localText(tab === 'provider' && <section className="panel provider-panel"><h3><Languages size={19}/>{t("阿里云 Aidge + OSS")}</h3><p className="muted">{t("接入后即可处理真实素材。密钥仅在服务端加密保存，不会返回浏览器。")}</p>{localText(data?.provider && <div className="success-box">{t("当前已配置 ·")}{localText(data.provider.accessKeyId)} · {localText(data.provider.ossBucket)}</div>)}<form onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                    await api('admin/provider', { method: 'PUT', body: JSON.stringify(config) });
                    setConfig(c => ({ ...c, accessKeyId: '', accessKeySecret: '' }));
                    await load();
                    onUpdate();
                    notify(t("配置已加密保存"));
                }
                catch (err) {
                    notify((err as Error).message);
                }
                finally {
                    setBusy(false);
                }
            }}><div className="form-grid"><label>AccessKey ID<input value={config.accessKeyId} required autoComplete="off" onChange={e => setConfig({ ...config, accessKeyId: e.target.value })}/></label><label>AccessKey Secret<input type="password" value={config.accessKeySecret} required autoComplete="new-password" onChange={e => setConfig({ ...config, accessKeySecret: e.target.value })}/></label><label>{t("Aidge 服务地域")}<select value={config.region} onChange={e => setConfig({ ...config, region: e.target.value })}><option value="cn-beijing">{t("中国 · 北京")}</option><option value="ap-southeast-1">{t("国际 · 新加坡")}</option></select></label><label>{t("OSS Bucket 名称")}<input value={config.ossBucket} required placeholder="your-private-bucket" onChange={e => setConfig({ ...config, ossBucket: e.target.value })}/></label><label>{t("OSS 地域")}<input value={config.ossRegion} required placeholder="oss-cn-beijing" onChange={e => setConfig({ ...config, ossRegion: e.target.value })}/></label></div><div className="config-help"><h4>{t("接入前准备")}</h4><ol><li>{t("在阿里云开通 Aidge 图片翻译、视频画面翻译服务。")}</li><li>{t("创建私有 OSS Bucket，配置该前缀的 1 天生命周期清理规则。")}</li><li>{t("为专用 RAM 账户授予所需翻译、OSS 读写删除权限。")}</li><li>{t("填写配置，保存后执行连接检查，再用真实素材测试。")}</li></ol><a href="https://www.alibabacloud.com/help/zh/aidge/interface-overview/" target="_blank" rel="noreferrer">{t("查看官方接入文档")}<ArrowUpRight size={13}/></a></div><div className="form-actions"><button className="btn primary" disabled={busy}>{localText(busy ? <Loader2 className="spin" size={16}/> : <Lock size={15}/>)}{t("加密保存配置")}</button><button type="button" className="btn outline" disabled={!data?.provider || busy} onClick={async () => {
                setBusy(true);
                try {
                    const d = await api('admin/provider/test', { method: 'POST', body: '{}' });
                    notify(d.message);
                }
                catch (e) {
                    notify((e as Error).message);
                }
                finally {
                    setBusy(false);
                }
            }}><RefreshCw size={15}/>{t("连接检查")}</button></div></form></section>)}{localText(tab === 'operations' && <Operations notify={notify}/>)} {localText(tab === 'audit' && <section className="panel"><h3>{t("最近操作日志")}</h3><div className="audit-list">{localText(data?.logs.length ? data.logs.map((l: any) => <div key={l.id}><span>{localText(fmt(l.created_at))}</span><b>{localText(l.action)}</b><span>{localText(l.detail)}</span></div>) : <p className="muted">{t("暂无操作记录")}</p>)}</div></section>)}</>;
}
