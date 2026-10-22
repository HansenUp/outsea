'use client';
import { t, localText, useLocale, errorText } from './i18n';
import { useCallback, useEffect, useState } from 'react';
import { Download, Plus, Save, Loader2, MessageSquare, PauseCircle, PlayCircle, Pencil, X } from 'lucide-react';
async function call(path: string, method = 'GET', body?: unknown) {
    const r = await fetch('/api/' + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const d: any = await r.json();
    if (!r.ok)
        throw new Error(errorText(d.error) || t("操作失败"));
    return d;
}
const channels: Record<string, string> = { xiaohongshu: '小红书', tiktok: 'TikTok', referral: '转介绍', other: '其他' };
const stages: Record<string, string> = { new: '新线索', contacted: '已联系', trial: '体验中', paid: '已付费', lost: '暂不跟进' };
const verdicts: Record<string, string> = { usable: '可直接使用', revise: '需要修改', unusable: '不可使用' };
const empty = { name: '', contact: '', channel: 'xiaohongshu', market: '', stage: 'new', note: '' };
export function FeedbackForm({ jobId, notify }: {
    jobId: string;
    notify: (s: string) => void;
}) {
    useLocale();
    const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [form, setForm] = useState({ rating: 5, verdict: 'usable', note: '' });
    return <section className="feedback-box"><button className="text-link" onClick={() => setOpen(!open)}><MessageSquare size={15}/>{t("反馈这次体验")}{localText(open ? '−' : '＋')}</button>{localText(open && <form onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                    await call('feedback', 'POST', { jobId, ...form });
                    notify(t("反馈已保存，谢谢帮助译帆改进"));
                    setOpen(false);
                }
                catch (e) {
                    notify((e as Error).message);
                }
                finally {
                    setBusy(false);
                }
            }}><div className="form-grid"><label>{t("整体评分")}<select value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })}>{localText([5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{localText(n)}{t("分")}</option>))}</select></label><label>{t("成品可用性")}<select value={form.verdict} onChange={e => setForm({ ...form, verdict: e.target.value })}>{localText(Object.entries(verdicts).map(([v, l]) => <option key={v} value={v}>{localText(l)}</option>))}</select></label></div><label>{t("具体问题或建议")}<textarea rows={3} maxLength={2000} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder={t("例如：型号翻译有变化、文字超出画面，或某语言效果很好。")}/></label><button className="btn outline compact" disabled={busy}>{localText(busy ? <Loader2 size={15} className="spin"/> : <Save size={15}/>)}{t("保存反馈")}</button></form>)}</section>;
}
export function Operations({ notify }: {
    notify: (s: string) => void;
}) {
    useLocale();
    const [data, setData] = useState<any>(null), [form, setForm] = useState(empty), [edit, setEdit] = useState(''), [open, setOpen] = useState(false), [filter, setFilter] = useState('all'), [busy, setBusy] = useState(false);
    const load = useCallback(() => call('admin/operations').then(setData).catch(e => notify(e.message)), [notify]);
    useEffect(() => { load(); }, [load]);
    if (!data)
        return <p className="muted"><Loader2 size={17} className="spin"/>{t("正在读取运营数据…")}</p>;
    const leads = data.leads.filter((l: any) => filter === 'all' || l.stage === filter), paid = data.leads.filter((l: any) => l.stage === 'paid').length;
    return <div className="operations"><div className="stats-grid">{localText([[t("累计任务"), data.totals.total], [t("完成任务"), data.totals.completed || 0], [t("客户线索"), data.leads.length], [t("已付费线索"), paid]].map(([name, value]) => <div key={String(name)}><span>{localText(name)}</span><b>{localText(value)}</b></div>))}</div><section className="panel ops-control"><div><h3>{localText(data.uploadsPaused ? t("新任务已暂停") : t("新任务正常接收"))}</h3><p className="muted">{t("暂停仅阻止新提交；已有任务、预览和下载不受影响。")}</p></div><button className="btn outline" onClick={async () => {
            try {
                await call('admin/uploads', 'PUT', { paused: !data.uploadsPaused });
                await load();
                notify(data.uploadsPaused ? t("已恢复新任务") : t("已暂停新任务提交"));
            }
            catch (e) {
                notify((e as Error).message);
            }
        }}>{localText(data.uploadsPaused ? <PlayCircle size={16}/> : <PauseCircle size={16}/>)} {localText(data.uploadsPaused ? t("恢复接收") : t("暂停接收"))}</button></section><section className="panel"><div className="ops-header"><div><h3>{t("客户线索")}</h3><p>{t("记录经过同意收集的联系方式。已付费为人工标记，不代表平台已收款。")}</p></div><div className="form-actions"><a className="btn outline compact" href="/api/admin/export?type=leads"><Download size={14}/>{t("导出 CSV")}</a><button className="btn primary compact" onClick={() => { setForm(empty); setEdit(''); setOpen(true); }}><Plus size={14}/>{t("新增线索")}</button></div></div><div className="ops-filters"><select aria-label={t("线索阶段筛选")} value={filter} onChange={e => setFilter(e.target.value)}><option value="all">{t("全部阶段")}</option>{localText(Object.entries(stages).map(([v, l]) => <option key={v} value={v}>{localText(l)}</option>))}</select></div>{localText(open && <form className="lead-form" onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                    await call('admin/leads' + (edit ? '/' + edit : ''), edit ? 'PATCH' : 'POST', form);
                    await load();
                    setOpen(false);
                    notify(t("线索已保存"));
                }
                catch (e) {
                    notify((e as Error).message);
                }
                finally {
                    setBusy(false);
                }
            }}><div className="form-grid"><label>{t("客户名称")}<input required maxLength={80} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label>{t("联系方式")}<input required maxLength={160} value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })}/></label><label>{t("获客来源")}<select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>{localText(Object.entries(channels).map(([v, l]) => <option key={v} value={v}>{localText(l)}</option>))}</select></label><label>{t("主要市场及语言")}<input maxLength={80} value={form.market} onChange={e => setForm({ ...form, market: e.target.value })}/></label><label>{t("跟进阶段")}<select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>{localText(Object.entries(stages).map(([v, l]) => <option key={v} value={v}>{localText(l)}</option>))}</select></label></div><label>{t("需求及下次跟进事项")}<textarea rows={3} maxLength={2000} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}/></label><div className="form-actions"><button className="btn primary compact" disabled={busy}><Save size={14}/>{t("保存")}</button><button type="button" className="btn outline compact" onClick={() => setOpen(false)}><X size={14}/>{t("取消")}</button></div></form>)}{localText(leads.length ? <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>{t("客户")}</th><th>{t("来源")}</th><th>{t("市场")}</th><th>{t("阶段")}</th><th>{t("需求与跟进")}</th><th>{t("操作")}</th></tr></thead><tbody>{localText(leads.map((l: any) => <tr key={l.id}><td><b>{localText(l.name)}</b><small>{localText(l.contact)}</small></td><td>{localText(channels[l.channel])}</td><td>{localText(l.market || '—')}</td><td>{localText(stages[l.stage])}</td><td>{localText(l.note || '—')}</td><td><button className="icon-btn" aria-label={t("编辑 ") + l.name} onClick={() => { setEdit(l.id); setForm({ name: l.name, contact: l.contact, channel: l.channel, market: l.market, stage: l.stage, note: l.note }); setOpen(true); }}><Pencil size={15}/></button></td></tr>))}</tbody></table></div> : <p className="ops-empty">{t("暂无线索。新增客户后可按来源与阶段跟进。")}</p>)}</section><section className="panel"><div className="ops-header"><div><h3>{t("客户反馈")}</h3><p>{t("用户在任务预览中提交评分及可用性评价，供运营复盘。")}</p></div><a className="btn outline compact" href="/api/admin/export?type=feedback"><Download size={14}/>{t("导出反馈")}</a></div>{localText(data.feedback.length ? <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>{t("素材及账户")}</th><th>{t("评分")}</th><th>{t("可用性")}</th><th>{t("反馈")}</th></tr></thead><tbody>{localText(data.feedback.map((f: any) => <tr key={f.id}><td>{localText(f.job_name)}<small>{localText(f.username)}</small></td><td>{localText(f.rating)} / 5</td><td>{localText(verdicts[f.verdict])}</td><td>{localText(f.note || '—')}</td></tr>))}</tbody></table></div> : <p className="ops-empty">{t("暂无真实反馈，不展示虚构评分。")}</p>)}</section><section className="panel ops-header"><div><h3>{t("任务复盘导出")}</h3><p>{t("下载最近最多 10,000 条任务记录，用于统计处理量、失败原因与交付效率。")}</p></div><a className="btn outline" href="/api/admin/export?type=jobs"><Download size={15}/>{t("导出任务 CSV")}</a></section><p className="table-footnote">{t("线索和反馈列表最多显示最近 500 条。CSV 包含客户信息，请仅供授权运营人员使用。")}</p></div>;
}
