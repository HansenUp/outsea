export function inspectMedia(bytes: Uint8Array) {
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength); const str=(i:number,n:number)=>String.fromCharCode(...bytes.slice(i,i+n));
 if(bytes.length<24) throw new Error('文件不完整或格式不支持');
 let width=0,height=0,mime='';
 if(str(0,8)==='\x89PNG\r\n\x1a\n'){mime='image/png';width=v.getUint32(16);height=v.getUint32(20);}
 else if(bytes[0]===255&&bytes[1]===216){ mime='image/jpeg';let p=2;while(p+9<bytes.length){if(bytes[p]!==255){p++;continue;}const marker=bytes[p+1];if(marker===217||marker===218)break;const len=v.getUint16(p+2);if(len<2)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){height=v.getUint16(p+5);width=v.getUint16(p+7);break;}p+=len+2;}}
 else if(str(0,4)==='RIFF'&&str(8,4)==='WEBP'){mime='image/webp';const tag=str(12,4);if(tag==='VP8X'){width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);}else if(tag==='VP8 '&&bytes.length>30){width=v.getUint16(26,true)&16383;height=v.getUint16(28,true)&16383;}else if(tag==='VP8L'&&bytes.length>25){const b=v.getUint32(21,true);width=1+(b&16383);height=1+((b>>>14)&16383);}}
 if(mime){if(!width||!height||width>4000||height>4000)throw new Error('图片尺寸须在 4000 × 4000 像素以内');if(bytes.length>10*1024*1024)throw new Error('图片不能超过 10 MB');return{kind:'image',mime,width,height,duration:0};}
 if(str(4,4)!=='ftyp')throw new Error('仅支持 PNG、JPG、WebP 图片和 MP4 / MOV 视频');
 if(bytes.length>20*1024*1024)throw new Error('视频不能超过 20 MB');
 const durations:number[]=[];let moov=false,mdat=false,fragmented=false;
 function boxes(start:number,end:number,depth=0){if(depth>6)return;for(let p=start;p+8<=end;){let size=v.getUint32(p),head=8;const type=str(p+4,4);if(size===1){if(p+16>end)throw new Error('无效的视频结构');size=Number(v.getBigUint64(p+8));head=16;}if(size===0)size=end-p;if(size<head||p+size>end)throw new Error('视频文件结构损坏');if(type==='moov')moov=true;if(type==='mdat')mdat=true;if(type==='moof')fragmented=true;if(['moov','trak','mdia'].includes(type))boxes(p+head,p+size,depth+1);if(['mvhd','mdhd'].includes(type)){const q=p+head;const ver=bytes[q];const timeOffset=ver===1?20:12;const durationOffset=ver===1?24:16;if(q+durationOffset+(ver===1?8:4)>p+size)throw new Error('视频时长信息损坏');const scale=v.getUint32(q+timeOffset);const d=ver===1?Number(v.getBigUint64(q+durationOffset)):v.getUint32(q+durationOffset);if(scale&&d)durations.push(d/scale);}p+=size;}}
 boxes(0,bytes.length);const duration=Math.max(...durations);
 if(!moov||!mdat||fragmented||!Number.isFinite(duration)||duration<=0)throw new Error('无法校验视频时长，请导出为普通 MP4 后重试');
 if(duration>5)throw new Error(`体验视频最长 5 秒，当前 ${duration.toFixed(2)} 秒`);
 return{kind:'video',mime:'video/mp4',duration,width:0,height:0};
}
