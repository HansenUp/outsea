'use client';
import {ConsentSettings} from '../commercial';
import { t, localText, useLocale, LocaleSwitch } from '../i18n';
import { useEffect, useState } from 'react';
export default function Service() {
    useLocale();
    const [service, setService] = useState<any>(null), [error, setError] = useState('');
    useEffect(() => {
        fetch('/api/service').then(r => {
            if (!r.ok)
                throw new Error(t("读取服务资料失败"));
            return r.json();
        }).then(setService).catch(e => setError(e.message));
    }, []);
    return <main className="service-page"><ConsentSettings/><LocaleSwitch/><a className="text-link" href="/">{t("← 返回译帆")}</a><h1>{t("服务、隐私与售后说明")}</h1><p className="muted">{t("版本：2026-10-21 · 图片付费试运营")}</p>{localText(error ? <p role="alert">{localText(error)}</p> : !service ? <p>{t("正在读取服务资料…")}</p> : <><div className={service.paidOpen ? 'success-box' : 'error-box'}>{localText(service.paidOpen ? t("正在接受约定范围内的人工付费订单。") : t("当前尚未开放真实收费。请勿向未确认主体付款；准备阶段不承诺真实交付时限。"))}</div><section><h2>{t("服务提供者与联系")}</h2><p>{t("经营/服务主体：")}{localText(service.operator || t("待经营者提供，尚未接单"))}<br />{t("客服：")}{localText(service.contact || t("待提供"))}<br />{t("服务时段：")}{localText(service.hours)}<br />{t("商户收款渠道：")}{localText(service.paymentChannel || t("未启用"))}<br />{t("收款主体：")}{localText(service.paymentEntity || t("未确认"))}</p></section><section><h2>{t("交付范围与计费")}</h2><p>{t("新账户赠送积分：")}{service.welcomeCredits}{t("，仅用于最多 3 张图片；每个图片语言结果消耗积分：")}{service.imageCredits}{t("。积分先预留，成功扣除，明确失败返还；供应商结果不明时冻结待核对。购买套餐的积分与金额以创建订单时的快照为准。未使用购买积分可按原订单单价申请退款，赠送积分不可提现或退款；退款需人工处理，平台不自动转账。")}</p><p>{t("本阶段以商品图片中的文字翻译与回填为主。1 张图片 × 1 种目标语言为 1 个交付单位；10 张图片翻译 2 种语言为 20 个单位。实际价格、语向、检查范围、数量和交付安排，以付款前双方确认的订单为准。视频仅在另行约定并确认成本后受控体验，不含配音、口型同步或店铺上架。")}</p><p>{t("当前采用人工核对商户收款的方式，不提供自动扣款。付款前核对订单号、收款主体、金额及交付范围；后台的收退款记录不代表平台已执行资金转账。")}</p></section><section><h2>{t("售后与退款")}</h2><p>{t("技术失败且未生成对应结果，释放该结果的交付次数或按订单约定退款。明显漏译或严重排版问题，在约定范围内提供一次处理机会，仍不可用按约处理退款。客户更换原稿、增加语向属于新任务。人工检查若未明确包含母语审校，则不能理解为专业母语审校。请在上架前核对品牌、型号、数字、尺寸和广告表达。具体约定不得减损依法享有的权利。")}</p></section><section><h2>{t("素材与账户信息如何处理")}</h2><p>{t("我们处理登录所需的邮箱/用户名、密码哈希、任务素材、结果、订单联系及凭证记录，以提供账户、翻译、交付与售后服务。密码不以明文保存；供应商密钥仅在服务端加密配置。素材仅本人及履行交付职责的管理员访问，不建立公开素材库，不以此同意替代其他用途授权。")}</p><p>{t("翻译供应商为阿里云 Aidge，临时处理中转存储为 OSS，平台文件存储为托管环境提供的私有存储。实际处理与存储地域：")}{localText(service.supplierRegion || t("待经营者核实，核实前不接收真实付费素材"))}{t("。如素材含个人信息，应先去除无关个人信息；涉及个人信息跨境处理时，需另行确认接收方、地域、适用义务及必要授权，不以本页作一揽子同意。")}</p><p>{t("原稿计划保存")}{localText(service.sourceDays)}{t("天、结果")}{localText(service.resultDays)}{t("天；后台定时清理，具体到期提示以任务时间为准。用户可在任务中主动删除素材；删除不会自动退款或抹除已发生的交付记录。订单与必要审计记录按适用法定要求保存，联系方式可通过客服申请更正或删除。请自行备份已下载成品。")}</p></section><section><h2>{t("来源记录与事务邮件")}</h2><p>{t("推广来源记录可自行选择，拒绝不影响服务。经同意后记录来源标签和随机访问标识，匿名访问记录保留30天；可通过本页设置撤回，移除当前来源归属，订单与账务留存不受影响。")}</p><p>{t("正式环境的邮箱验证和密码找回通过 Resend 发送事务邮件，处理收件邮箱与必要的账户操作链接；演示环境仅写入本地演示收件箱。链接一次使用，邮箱验证有效24小时，密码重置有效15分钟。")}</p><p>{t("返工文件与结果按同一留存策略清理；删除任务会清除返工文件，必要的版本、验收和账务历史保留。")}</p></section><section><h2>{t("上传授权与使用限制")}</h2><p>{t("仅上传有权处理的商品素材，不上传身份证件、支付信息、未经授权的人像或其他不必要个人信息。不得用服务处理侵权、违法或规避监管的内容。人工接单前需确认原稿授权和具体交付范围。服务中断或供应商异常时，我们会暂停新单并联系受影响客户，不承诺销量或流量增长。")}</p></section></>)}</main>;
}
