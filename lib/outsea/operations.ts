export function csvCell(value:unknown){let v=String(value??'');if(/^[\s]*[=+@-]/.test(v)||/^[\t\r]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';}
export function csvFile(headers:string[],rows:unknown[][]){return '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');}
