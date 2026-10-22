import {AcquisitionConsent,RecoveryLink} from './commercial';
import {DemoBanner} from './demo';
import {LocaleInit} from './i18n';
import type {Metadata} from 'next';
import './globals.css';
import './light.css';
import './design-system.css';
export const metadata:Metadata={title:'译帆 Sailingo · 商品素材多语言翻译',description:'面向跨境卖家的图片与短视频多语言翻译工作台。上传、翻译、预览，按语言打包下载。',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><LocaleInit/><DemoBanner/>{children}<AcquisitionConsent/><RecoveryLink/></body></html>;}
