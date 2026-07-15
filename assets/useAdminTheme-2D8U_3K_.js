import{c as h,a as l}from"./index-CocVPakQ.js";import{r as i}from"./vendor-react-S44IyOkZ.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=h("Moon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=h("Sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);function p(s){s=s.replace("#","");const o=parseInt(s.substring(0,2),16)/255,e=parseInt(s.substring(2,4),16)/255,a=parseInt(s.substring(4,6),16)/255,t=Math.max(o,e,a),r=Math.min(o,e,a);let n=0,c=0;const d=(t+r)/2;if(t!==r){const m=t-r;switch(c=d>.5?m/(2-t-r):m/(t+r),t){case o:n=((e-a)/m+(e<a?6:0))/6;break;case e:n=((a-o)/m+2)/6;break;case a:n=((o-e)/m+4)/6;break}}return`${Math.round(n*360)} ${Math.round(c*100)}% ${Math.round(d*100)}%`}function g(){const[s,o]=i.useState(()=>localStorage.getItem("admin-theme")||"dark"),{data:e}=l(),a=i.useCallback(t=>{o(t),localStorage.setItem("admin-theme",t)},[]);return i.useEffect(()=>{const t=document.documentElement;if(t.style.removeProperty("--primary"),t.style.removeProperty("--sidebar-primary"),s==="company"&&e){t.setAttribute("data-admin-theme","company");const r=e.design_title_color,n=e.design_nav_color;if(r){const c=p(r);t.style.setProperty("--primary",c),t.style.setProperty("--sidebar-primary",c)}if(n){const c=p(n);t.style.setProperty("--sidebar-background",c)}}else t.setAttribute("data-admin-theme",s)},[s,e]),{theme:s,setTheme:a}}export{k as M,b as S,g as u};
