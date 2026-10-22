'use client';
import {useEffect,useSyncExternalStore} from 'react';
import en from './locales/en.json';
let locale:'zh'|'en'='zh';const listeners=new Set<()=>void>();
export const getLocale=()=>locale;
export function setLocale(value:'zh'|'en'){locale=value;try{localStorage.setItem('sailingo-locale',value);}catch{}document.documentElement.lang=value==='en'?'en':'zh-CN';listeners.forEach(fn=>fn());}
export function useLocale(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},getLocale,()=> 'zh' as const);}
export function t(value:string){return locale==='en'?(en as Record<string,string>)[value]||value:value;}
export function localText<T>(value:T):T{return (typeof value==='string'?t(value):value) as T;}
export function LocaleInit(){useEffect(()=>{try{if(localStorage.getItem('sailingo-locale')==='en')setLocale('en');}catch{}},[]);return null;}
export function LocaleSwitch(){const current=useLocale();return <button className="locale-switch" aria-label="Interface language / 界面语言" onClick={()=>setLocale(current==='zh'?'en':'zh')}>{current==='zh'?'English':'简体中文'}</button>;}

export function errorText(value:string){if(!value)return '';const translated=t(value);return locale==='en'&&/[\u4e00-\u9fff]/.test(translated)?'Unable to complete the operation. Contact support with the task ID.':translated;}
