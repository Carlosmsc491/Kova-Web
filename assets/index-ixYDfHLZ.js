const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/Dashboard-BtCb7w7u.js","assets/vendor-react-DkvkBpDj.js","assets/useExpenseStore-BvS0ChI1.js","assets/vendor-zustand-DXwlS5ls.js","assets/firestoreService-Dxyo0c0_.js","assets/vendor-firebase-DJiLipVq.js","assets/useIncomeStore-C6A4OqU6.js","assets/useCreditStore-DxttwPBa.js","assets/useGoalsStore-CwKvQp8b.js","assets/useAccountStore-CCSz7DRq.js","assets/formatters-B7hz3SrI.js","assets/dateUtils-CsuMG0V1.js","assets/budgetEngine-DXOkvBCa.js","assets/chevron-right-Dp-_fxcP.js","assets/credit-card-B8Vle04j.js","assets/arrow-right-DlYSs7CZ.js","assets/Expenses-DmqojcJY.js","assets/useHistoryStore-CY5nkgWW.js","assets/plus-szUAYsrq.js","assets/trash-2-CjMYwSYv.js","assets/home-Dba38rpF.js","assets/Income-BfBK5UlT.js","assets/Credit-DJ6rYIGQ.js","assets/Goals-j31imtwC.js","assets/Chat-Cu2MC__4.js","assets/History-Dinx9GH0.js","assets/CashFlow-TYvz-6BN.js","assets/TransferModal-DsajPyXI.js","assets/Household-CbdgClVb.js","assets/Accounts-IEL8g8TO.js"])))=>i.map(i=>d[i]);
import{r as u,a as at,u as ye,b as xe,N as ot,O as te,H as it,c as ct,d as x,e as be}from"./vendor-react-DkvkBpDj.js";import{c as G}from"./vendor-zustand-DXwlS5ls.js";import{r as R,_ as P,C as O,a as M,E as we,o as lt,F as ve,L as dt,g as ke,i as ut,b as ft,v as mt,c as ne,d as pt,e as ht,f as gt,h as yt,j as xt,k as bt,s as wt,l as se,m as vt,n as kt,p as It,q as jt}from"./vendor-firebase-DJiLipVq.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const o of a)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&r(i)}).observe(document,{childList:!0,subtree:!0});function n(a){const o={};return a.integrity&&(o.integrity=a.integrity),a.referrerPolicy&&(o.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?o.credentials="include":a.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(a){if(a.ep)return;a.ep=!0;const o=n(a);fetch(a.href,o)}})();var Ie={exports:{}},F={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Tt=u,St=Symbol.for("react.element"),At=Symbol.for("react.fragment"),_t=Object.prototype.hasOwnProperty,Et=Tt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,Ct={key:!0,ref:!0,__self:!0,__source:!0};function je(e,t,n){var r,a={},o=null,i=null;n!==void 0&&(o=""+n),t.key!==void 0&&(o=""+t.key),t.ref!==void 0&&(i=t.ref);for(r in t)_t.call(t,r)&&!Ct.hasOwnProperty(r)&&(a[r]=t[r]);if(e&&e.defaultProps)for(r in t=e.defaultProps,t)a[r]===void 0&&(a[r]=t[r]);return{$$typeof:St,type:e,key:o,ref:i,props:a,_owner:Et.current}}F.Fragment=At;F.jsx=je;F.jsxs=je;Ie.exports=F;var s=Ie.exports,Te,re=at;Te=re.createRoot,re.hydrateRoot;const Nt="modulepreload",Rt=function(e){return"/Kova-Web/"+e},ae={},v=function(t,n,r){let a=Promise.resolve();if(n&&n.length>0){document.getElementsByTagName("link");const i=document.querySelector("meta[property=csp-nonce]"),c=(i==null?void 0:i.nonce)||(i==null?void 0:i.getAttribute("nonce"));a=Promise.allSettled(n.map(l=>{if(l=Rt(l),l in ae)return;ae[l]=!0;const d=l.endsWith(".css"),m=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${m}`))return;const f=document.createElement("link");if(f.rel=d?"stylesheet":Nt,d||(f.as="script"),f.crossOrigin="",f.href=l,c&&f.setAttribute("nonce",c),document.head.appendChild(f),d)return new Promise((I,y)=>{f.addEventListener("load",I),f.addEventListener("error",()=>y(new Error(`Unable to preload CSS for ${l}`)))})}))}function o(i){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=i,window.dispatchEvent(c),!c.defaultPrevented)throw i}return a.then(i=>{for(const c of i||[])c.status==="rejected"&&o(c.reason);return t().catch(o)})},Se="@firebase/installations",W="0.6.9";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ae=1e4,_e=`w:${W}`,Ee="FIS_v2",Pt="https://firebaseinstallations.googleapis.com/v1",Ot=60*60*1e3,Lt="installations",Dt="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Mt={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},T=new we(Lt,Dt,Mt);function Ce(e){return e instanceof ve&&e.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ne({projectId:e}){return`${Pt}/projects/${e}/installations`}function Re(e){return{token:e.token,requestStatus:2,expiresIn:$t(e.expiresIn),creationTime:Date.now()}}async function Pe(e,t){const r=(await t.json()).error;return T.create("request-failed",{requestName:e,serverCode:r.code,serverMessage:r.message,serverStatus:r.status})}function Oe({apiKey:e}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e})}function Ft(e,{refreshToken:t}){const n=Oe(e);return n.append("Authorization",zt(t)),n}async function Le(e){const t=await e();return t.status>=500&&t.status<600?e():t}function $t(e){return Number(e.replace("s","000"))}function zt(e){return`${Ee} ${e}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function qt({appConfig:e,heartbeatServiceProvider:t},{fid:n}){const r=Ne(e),a=Oe(e),o=t.getImmediate({optional:!0});if(o){const d=await o.getHeartbeatsHeader();d&&a.append("x-firebase-client",d)}const i={fid:n,authVersion:Ee,appId:e.appId,sdkVersion:_e},c={method:"POST",headers:a,body:JSON.stringify(i)},l=await Le(()=>fetch(r,c));if(l.ok){const d=await l.json();return{fid:d.fid||n,registrationStatus:2,refreshToken:d.refreshToken,authToken:Re(d.authToken)}}else throw await Pe("Create Installation",l)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function De(e){return new Promise(t=>{setTimeout(t,e)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ut(e){return btoa(String.fromCharCode(...e)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vt=/^[cdef][\w-]{21}$/,H="";function Bt(){try{const e=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(e),e[0]=112+e[0]%16;const n=Ht(e);return Vt.test(n)?n:H}catch{return H}}function Ht(e){return Ut(e).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $(e){return`${e.appName}!${e.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Me=new Map;function Fe(e,t){const n=$(e);$e(n,t),Kt(n,t)}function $e(e,t){const n=Me.get(e);if(n)for(const r of n)r(t)}function Kt(e,t){const n=Gt();n&&n.postMessage({key:e,fid:t}),Wt()}let j=null;function Gt(){return!j&&"BroadcastChannel"in self&&(j=new BroadcastChannel("[Firebase] FID Change"),j.onmessage=e=>{$e(e.data.key,e.data.fid)}),j}function Wt(){Me.size===0&&j&&(j.close(),j=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yt="firebase-installations-database",Jt=1,S="firebase-installations-store";let U=null;function Y(){return U||(U=lt(Yt,Jt,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(S)}}})),U}async function L(e,t){const n=$(e),a=(await Y()).transaction(S,"readwrite"),o=a.objectStore(S),i=await o.get(n);return await o.put(t,n),await a.done,(!i||i.fid!==t.fid)&&Fe(e,t.fid),t}async function ze(e){const t=$(e),r=(await Y()).transaction(S,"readwrite");await r.objectStore(S).delete(t),await r.done}async function z(e,t){const n=$(e),a=(await Y()).transaction(S,"readwrite"),o=a.objectStore(S),i=await o.get(n),c=t(i);return c===void 0?await o.delete(n):await o.put(c,n),await a.done,c&&(!i||i.fid!==c.fid)&&Fe(e,c.fid),c}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function J(e){let t;const n=await z(e.appConfig,r=>{const a=Xt(r),o=Zt(e,a);return t=o.registrationPromise,o.installationEntry});return n.fid===H?{installationEntry:await t}:{installationEntry:n,registrationPromise:t}}function Xt(e){const t=e||{fid:Bt(),registrationStatus:0};return qe(t)}function Zt(e,t){if(t.registrationStatus===0){if(!navigator.onLine){const a=Promise.reject(T.create("app-offline"));return{installationEntry:t,registrationPromise:a}}const n={fid:t.fid,registrationStatus:1,registrationTime:Date.now()},r=Qt(e,n);return{installationEntry:n,registrationPromise:r}}else return t.registrationStatus===1?{installationEntry:t,registrationPromise:en(e)}:{installationEntry:t}}async function Qt(e,t){try{const n=await qt(e,t);return L(e.appConfig,n)}catch(n){throw Ce(n)&&n.customData.serverCode===409?await ze(e.appConfig):await L(e.appConfig,{fid:t.fid,registrationStatus:0}),n}}async function en(e){let t=await oe(e.appConfig);for(;t.registrationStatus===1;)await De(100),t=await oe(e.appConfig);if(t.registrationStatus===0){const{installationEntry:n,registrationPromise:r}=await J(e);return r||n}return t}function oe(e){return z(e,t=>{if(!t)throw T.create("installation-not-found");return qe(t)})}function qe(e){return tn(e)?{fid:e.fid,registrationStatus:0}:e}function tn(e){return e.registrationStatus===1&&e.registrationTime+Ae<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function nn({appConfig:e,heartbeatServiceProvider:t},n){const r=sn(e,n),a=Ft(e,n),o=t.getImmediate({optional:!0});if(o){const d=await o.getHeartbeatsHeader();d&&a.append("x-firebase-client",d)}const i={installation:{sdkVersion:_e,appId:e.appId}},c={method:"POST",headers:a,body:JSON.stringify(i)},l=await Le(()=>fetch(r,c));if(l.ok){const d=await l.json();return Re(d)}else throw await Pe("Generate Auth Token",l)}function sn(e,{fid:t}){return`${Ne(e)}/${t}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function X(e,t=!1){let n;const r=await z(e.appConfig,o=>{if(!Ue(o))throw T.create("not-registered");const i=o.authToken;if(!t&&on(i))return o;if(i.requestStatus===1)return n=rn(e,t),o;{if(!navigator.onLine)throw T.create("app-offline");const c=ln(o);return n=an(e,c),c}});return n?await n:r.authToken}async function rn(e,t){let n=await ie(e.appConfig);for(;n.authToken.requestStatus===1;)await De(100),n=await ie(e.appConfig);const r=n.authToken;return r.requestStatus===0?X(e,t):r}function ie(e){return z(e,t=>{if(!Ue(t))throw T.create("not-registered");const n=t.authToken;return dn(n)?Object.assign(Object.assign({},t),{authToken:{requestStatus:0}}):t})}async function an(e,t){try{const n=await nn(e,t),r=Object.assign(Object.assign({},t),{authToken:n});return await L(e.appConfig,r),n}catch(n){if(Ce(n)&&(n.customData.serverCode===401||n.customData.serverCode===404))await ze(e.appConfig);else{const r=Object.assign(Object.assign({},t),{authToken:{requestStatus:0}});await L(e.appConfig,r)}throw n}}function Ue(e){return e!==void 0&&e.registrationStatus===2}function on(e){return e.requestStatus===2&&!cn(e)}function cn(e){const t=Date.now();return t<e.creationTime||e.creationTime+e.expiresIn<t+Ot}function ln(e){const t={requestStatus:1,requestTime:Date.now()};return Object.assign(Object.assign({},e),{authToken:t})}function dn(e){return e.requestStatus===1&&e.requestTime+Ae<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function un(e){const t=e,{installationEntry:n,registrationPromise:r}=await J(t);return r?r.catch(console.error):X(t).catch(console.error),n.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function fn(e,t=!1){const n=e;return await mn(n),(await X(n,t)).token}async function mn(e){const{registrationPromise:t}=await J(e);t&&await t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pn(e){if(!e||!e.options)throw V("App Configuration");if(!e.name)throw V("App Name");const t=["projectId","apiKey","appId"];for(const n of t)if(!e.options[n])throw V(n);return{appName:e.name,projectId:e.options.projectId,apiKey:e.options.apiKey,appId:e.options.appId}}function V(e){return T.create("missing-app-config-values",{valueName:e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ve="installations",hn="installations-internal",gn=e=>{const t=e.getProvider("app").getImmediate(),n=pn(t),r=M(t,"heartbeat");return{app:t,appConfig:n,heartbeatServiceProvider:r,_delete:()=>Promise.resolve()}},yn=e=>{const t=e.getProvider("app").getImmediate(),n=M(t,Ve).getImmediate();return{getId:()=>un(n),getToken:a=>fn(n,a)}};function xn(){P(new O(Ve,gn,"PUBLIC")),P(new O(hn,yn,"PRIVATE"))}xn();R(Se,W);R(Se,W,"esm2017");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const D="analytics",bn="firebase_id",wn="origin",vn=60*1e3,kn="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig",Z="https://www.googletagmanager.com/gtag/js";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const g=new dt("@firebase/analytics");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const In={"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":"Firebase Analytics Interop Component failed to instantiate: {$reason}","invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":"Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}","no-api-key":'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',"no-app-id":'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',"no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":"Trusted Types detected an invalid gtag resource: {$gtagURL}."},b=new we("analytics","Analytics",In);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jn(e){if(!e.startsWith(Z)){const t=b.create("invalid-gtag-resource",{gtagURL:e});return g.warn(t.message),""}return e}function Be(e){return Promise.all(e.map(t=>t.catch(n=>n)))}function Tn(e,t){let n;return window.trustedTypes&&(n=window.trustedTypes.createPolicy(e,t)),n}function Sn(e,t){const n=Tn("firebase-js-sdk-policy",{createScriptURL:jn}),r=document.createElement("script"),a=`${Z}?l=${e}&id=${t}`;r.src=n?n==null?void 0:n.createScriptURL(a):a,r.async=!0,document.head.appendChild(r)}function An(e){let t=[];return Array.isArray(window[e])?t=window[e]:window[e]=t,t}async function _n(e,t,n,r,a,o){const i=r[a];try{if(i)await t[i];else{const l=(await Be(n)).find(d=>d.measurementId===a);l&&await t[l.appId]}}catch(c){g.error(c)}e("config",a,o)}async function En(e,t,n,r,a){try{let o=[];if(a&&a.send_to){let i=a.send_to;Array.isArray(i)||(i=[i]);const c=await Be(n);for(const l of i){const d=c.find(f=>f.measurementId===l),m=d&&t[d.appId];if(m)o.push(m);else{o=[];break}}}o.length===0&&(o=Object.values(t)),await Promise.all(o),e("event",r,a||{})}catch(o){g.error(o)}}function Cn(e,t,n,r){async function a(o,...i){try{if(o==="event"){const[c,l]=i;await En(e,t,n,c,l)}else if(o==="config"){const[c,l]=i;await _n(e,t,n,r,c,l)}else if(o==="consent"){const[c,l]=i;e("consent",c,l)}else if(o==="get"){const[c,l,d]=i;e("get",c,l,d)}else if(o==="set"){const[c]=i;e("set",c)}else e(o,...i)}catch(c){g.error(c)}}return a}function Nn(e,t,n,r,a){let o=function(...i){window[r].push(arguments)};return window[a]&&typeof window[a]=="function"&&(o=window[a]),window[a]=Cn(o,e,t,n),{gtagCore:o,wrappedGtag:window[a]}}function Rn(e){const t=window.document.getElementsByTagName("script");for(const n of Object.values(t))if(n.src&&n.src.includes(Z)&&n.src.includes(e))return n;return null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pn=30,On=1e3;class Ln{constructor(t={},n=On){this.throttleMetadata=t,this.intervalMillis=n}getThrottleMetadata(t){return this.throttleMetadata[t]}setThrottleMetadata(t,n){this.throttleMetadata[t]=n}deleteThrottleMetadata(t){delete this.throttleMetadata[t]}}const He=new Ln;function Dn(e){return new Headers({Accept:"application/json","x-goog-api-key":e})}async function Mn(e){var t;const{appId:n,apiKey:r}=e,a={method:"GET",headers:Dn(r)},o=kn.replace("{app-id}",n),i=await fetch(o,a);if(i.status!==200&&i.status!==304){let c="";try{const l=await i.json();!((t=l.error)===null||t===void 0)&&t.message&&(c=l.error.message)}catch{}throw b.create("config-fetch-failed",{httpStatus:i.status,responseMessage:c})}return i.json()}async function Fn(e,t=He,n){const{appId:r,apiKey:a,measurementId:o}=e.options;if(!r)throw b.create("no-app-id");if(!a){if(o)return{measurementId:o,appId:r};throw b.create("no-api-key")}const i=t.getThrottleMetadata(r)||{backoffCount:0,throttleEndTimeMillis:Date.now()},c=new qn;return setTimeout(async()=>{c.abort()},vn),Ke({appId:r,apiKey:a,measurementId:o},i,c,t)}async function Ke(e,{throttleEndTimeMillis:t,backoffCount:n},r,a=He){var o;const{appId:i,measurementId:c}=e;try{await $n(r,t)}catch(l){if(c)return g.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${c} provided in the "measurementId" field in the local Firebase config. [${l==null?void 0:l.message}]`),{appId:i,measurementId:c};throw l}try{const l=await Mn(e);return a.deleteThrottleMetadata(i),l}catch(l){const d=l;if(!zn(d)){if(a.deleteThrottleMetadata(i),c)return g.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${c} provided in the "measurementId" field in the local Firebase config. [${d==null?void 0:d.message}]`),{appId:i,measurementId:c};throw l}const m=Number((o=d==null?void 0:d.customData)===null||o===void 0?void 0:o.httpStatus)===503?ne(n,a.intervalMillis,Pn):ne(n,a.intervalMillis),f={throttleEndTimeMillis:Date.now()+m,backoffCount:n+1};return a.setThrottleMetadata(i,f),g.debug(`Calling attemptFetch again in ${m} millis`),Ke(e,f,r,a)}}function $n(e,t){return new Promise((n,r)=>{const a=Math.max(t-Date.now(),0),o=setTimeout(n,a);e.addEventListener(()=>{clearTimeout(o),r(b.create("fetch-throttle",{throttleEndTimeMillis:t}))})})}function zn(e){if(!(e instanceof ve)||!e.customData)return!1;const t=Number(e.customData.httpStatus);return t===429||t===500||t===503||t===504}class qn{constructor(){this.listeners=[]}addEventListener(t){this.listeners.push(t)}abort(){this.listeners.forEach(t=>t())}}async function Un(e,t,n,r,a){if(a&&a.global){e("event",n,r);return}else{const o=await t,i=Object.assign(Object.assign({},r),{send_to:o});e("event",n,i)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Vn(){if(ft())try{await mt()}catch(e){return g.warn(b.create("indexeddb-unavailable",{errorInfo:e==null?void 0:e.toString()}).message),!1}else return g.warn(b.create("indexeddb-unavailable",{errorInfo:"IndexedDB is not available in this environment."}).message),!1;return!0}async function Bn(e,t,n,r,a,o,i){var c;const l=Fn(e);l.then(y=>{n[y.measurementId]=y.appId,e.options.measurementId&&y.measurementId!==e.options.measurementId&&g.warn(`The measurement ID in the local Firebase config (${e.options.measurementId}) does not match the measurement ID fetched from the server (${y.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(y=>g.error(y)),t.push(l);const d=Vn().then(y=>{if(y)return r.getId()}),[m,f]=await Promise.all([l,d]);Rn(o)||Sn(o,m.measurementId),a("js",new Date);const I=(c=i==null?void 0:i.config)!==null&&c!==void 0?c:{};return I[wn]="firebase",I.update=!0,f!=null&&(I[bn]=f),a("config",m.measurementId,I),m.measurementId}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hn{constructor(t){this.app=t}_delete(){return delete E[this.app.options.appId],Promise.resolve()}}let E={},ce=[];const le={};let B="dataLayer",Kn="gtag",de,Ge,ue=!1;function Gn(){const e=[];if(ut()&&e.push("This is a browser extension environment."),gt()||e.push("Cookies are not available."),e.length>0){const t=e.map((r,a)=>`(${a+1}) ${r}`).join(" "),n=b.create("invalid-analytics-context",{errorInfo:t});g.warn(n.message)}}function Wn(e,t,n){Gn();const r=e.options.appId;if(!r)throw b.create("no-app-id");if(!e.options.apiKey)if(e.options.measurementId)g.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${e.options.measurementId} provided in the "measurementId" field in the local Firebase config.`);else throw b.create("no-api-key");if(E[r]!=null)throw b.create("already-exists",{id:r});if(!ue){An(B);const{wrappedGtag:o,gtagCore:i}=Nn(E,ce,le,B,Kn);Ge=o,de=i,ue=!0}return E[r]=Bn(e,ce,le,t,de,B,n),new Hn(e)}function Yn(e=pt()){e=ke(e);const t=M(e,D);return t.isInitialized()?t.getImmediate():Jn(e)}function Jn(e,t={}){const n=M(e,D);if(n.isInitialized()){const a=n.getImmediate();if(ht(t,n.getOptions()))return a;throw b.create("already-initialized")}return n.initialize({options:t})}function Xn(e,t,n,r){e=ke(e),Un(Ge,E[e.app.options.appId],t,n,r).catch(a=>g.error(a))}const fe="@firebase/analytics",me="0.10.8";function Zn(){P(new O(D,(t,{options:n})=>{const r=t.getProvider("app").getImmediate(),a=t.getProvider("installations-internal").getImmediate();return Wn(r,a,n)},"PUBLIC")),P(new O("analytics-internal",e,"PRIVATE")),R(fe,me),R(fe,me,"esm2017");function e(t){try{const n=t.getProvider(D).getImmediate();return{logEvent:(r,a,o)=>Xn(n,r,a,o)}}catch(n){throw b.create("interop-component-reg-failed",{reason:n})}}}Zn();const Qn={apiKey:"AIzaSyDtNBnapSe11VNGOXCsRhZ_wsKRKQj750c",authDomain:"kona-finances.firebaseapp.com",projectId:"kona-finances",storageBucket:"kona-finances.firebasestorage.app",messagingSenderId:"438045737411",appId:"1:438045737411:web:b055121b206dc0e9003d76",measurementId:"G-7N754Q14NJ"},Q=yt(Qn),A=xt(Q),Gs=bt(Q);try{Yn(Q)}catch{}const _="kova_username",es="kova-user@kova-app.com";function pe(e){return`${e.toLowerCase().trim()}@kova-app.com`}const C=G((e,t)=>({user:null,unlocked:!1,loading:!0,error:null,username:localStorage.getItem(_)||null,init:()=>{kt(A,jt).catch(()=>{}),It(A,n=>{e({user:n,unlocked:!!n,loading:!1})})},setupPin:async(n,r)=>{e({error:null,loading:!0});const a=pe(n);try{const o=await vt(A,a,r);return localStorage.setItem(_,n.toLowerCase().trim()),e({user:o.user,unlocked:!0,loading:!1,username:n.toLowerCase().trim()}),{ok:!0}}catch(o){return o.code==="auth/email-already-in-use"?t().unlock(n,r):(e({error:o.message,loading:!1}),{ok:!1,error:o.message})}},unlock:async(n,r)=>{e({error:null,loading:!0});const a=pe(n);try{const o=await se(A,a,r);return localStorage.setItem(_,n.toLowerCase().trim()),e({user:o.user,unlocked:!0,loading:!1,username:n.toLowerCase().trim()}),{ok:!0}}catch(o){if(o.code==="auth/invalid-credential"||o.code==="auth/user-not-found")try{const c=await se(A,es,r);return localStorage.setItem(_,n.toLowerCase().trim()),e({user:c.user,unlocked:!0,loading:!1,username:n.toLowerCase().trim()}),{ok:!0}}catch{}const i=o.code==="auth/invalid-credential"||o.code==="auth/wrong-password"?"Wrong PIN. Try again.":o.code==="auth/user-not-found"?"User not found. Check username.":o.message;return e({error:i,loading:!1}),{ok:!1,error:i}}},lock:async()=>{await wt(A),e({user:null,unlocked:!1})},hasStoredUsername:()=>!!localStorage.getItem(_),getStoredUsername:()=>localStorage.getItem(_)||""}));/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ts=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),We=(...e)=>e.filter((t,n,r)=>!!t&&r.indexOf(t)===n).join(" ");/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var ns={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ss=u.forwardRef(({color:e="currentColor",size:t=24,strokeWidth:n=2,absoluteStrokeWidth:r,className:a="",children:o,iconNode:i,...c},l)=>u.createElement("svg",{ref:l,...ns,width:t,height:t,stroke:e,strokeWidth:r?Number(n)*24/Number(t):n,className:We("lucide",a),...c},[...i.map(([d,m])=>u.createElement(d,m)),...Array.isArray(o)?o:[o]]));/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=(e,t)=>{const n=u.forwardRef(({className:r,...a},o)=>u.createElement(ss,{ref:o,iconNode:t,className:We(`lucide-${ts(e)}`,r),...a}));return n.displayName=`${e}`,n};/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rs=h("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const as=h("CircleCheckBig",[["path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14",key:"g774vq"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const os=h("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const is=h("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cs=h("Delete",[["path",{d:"M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z",key:"1oy587"}],["line",{x1:"18",x2:"12",y1:"9",y2:"15",key:"1olkx5"}],["line",{x1:"12",x2:"18",y1:"9",y2:"15",key:"1n50pc"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ls=h("DollarSign",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ye=h("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ds=h("Landmark",[["line",{x1:"3",x2:"21",y1:"22",y2:"22",key:"j8o0r"}],["line",{x1:"6",x2:"6",y1:"18",y2:"11",key:"10tf0k"}],["line",{x1:"10",x2:"10",y1:"18",y2:"11",key:"54lgf6"}],["line",{x1:"14",x2:"14",y1:"18",y2:"11",key:"380y"}],["line",{x1:"18",x2:"18",y1:"18",y2:"11",key:"1kevvc"}],["polygon",{points:"12 2 20 7 4 7",key:"jkujk7"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const us=h("LayoutDashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fs=h("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ms=h("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ps=h("Moon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hs=h("ReceiptText",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M14 8H8",key:"1l3xfs"}],["path",{d:"M16 12H8",key:"1fr5h0"}],["path",{d:"M13 16H8",key:"wsln4y"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gs=h("Sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ys=h("Target",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xs=h("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const he=h("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bs=h("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]),ws=["1","2","3","4","5","6","7","8","9","","0","⌫"];function vs({filled:e}){return s.jsx("div",{className:`w-4 h-4 rounded-full border-2 transition-all duration-150 ${e?"bg-accent-primary border-accent-primary scale-110":"border-text-muted"}`})}function ks(){const e=ye(),{setupPin:t,unlock:n,unlocked:r,loading:a,error:o,hasStoredUsername:i,getStoredUsername:c}=C(),[l,d]=u.useState(c()||""),[m,f]=u.useState(""),[I,y]=u.useState(!1),[Xe,ee]=u.useState(i()?"pin":"username"),Ze=u.useRef(null),q=i();u.useEffect(()=>{r&&e("/",{replace:!0})},[r,e]);const Qe=()=>{y(!0),setTimeout(()=>y(!1),500)},et=p=>{p.preventDefault(),l.trim()&&ee("pin")},tt=p=>{if(p==="⌫"){f(rt=>rt.slice(0,-1));return}if(!p||m.length>=6)return;const k=m+p;f(k),k.length>=4&&nt(k)},nt=async p=>{(q?await n(l.trim(),p):await t(l.trim(),p)).ok||(Qe(),f(""))},st=()=>{d(""),f(""),ee("username")};return Xe==="username"?s.jsxs("div",{className:"h-full bg-bg-primary flex flex-col items-center justify-center px-8",children:[s.jsxs("div",{className:"mb-8 text-center",children:[s.jsx("div",{className:"w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary to-purple-800 flex items-center justify-center mx-auto mb-4",children:s.jsx("span",{className:"text-white text-2xl font-bold font-display",children:"K"})}),s.jsx("h1",{className:"text-2xl font-bold font-display text-text-primary",children:"KOVA"}),s.jsx("p",{className:"text-text-muted text-sm mt-1",children:"Personal Finance OS"})]}),s.jsxs("form",{onSubmit:et,className:"w-full max-w-xs space-y-4",children:[s.jsxs("div",{children:[s.jsx("label",{className:"text-text-muted text-xs block mb-1.5",children:"Username"}),s.jsxs("div",{className:"flex items-center gap-2 bg-bg-secondary border border-border-color rounded-xl px-3 py-3 focus-within:border-accent-primary transition-colors",children:[s.jsx(he,{size:16,className:"text-text-muted shrink-0"}),s.jsx("input",{ref:Ze,type:"text",value:l,onChange:p=>d(p.target.value),placeholder:"carlosmsc18",className:"flex-1 bg-transparent text-text-primary text-sm outline-none placeholder-text-muted",autoFocus:!0,autoComplete:"username"})]}),s.jsx("p",{className:"text-text-muted text-xs mt-1.5",children:"Your unique identifier. Different username = different data."})]}),s.jsx("button",{type:"submit",disabled:!l.trim(),className:"w-full bg-accent-primary text-white rounded-xl py-3 text-sm font-semibold hover:bg-accent-primary/90 disabled:opacity-40 transition-colors",children:"Continue"})]})]}):s.jsxs("div",{className:"h-full bg-bg-primary flex flex-col items-center justify-center px-8",children:[s.jsxs("div",{className:"mb-8 text-center",children:[s.jsx("div",{className:"w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary to-purple-800 flex items-center justify-center mx-auto mb-4",children:s.jsx("span",{className:"text-white text-2xl font-bold font-display",children:"K"})}),s.jsx("h1",{className:"text-2xl font-bold font-display text-text-primary",children:"KOVA"}),s.jsx("p",{className:"text-text-muted text-sm mt-1",children:"Personal Finance OS"})]}),s.jsxs("div",{className:"flex items-center gap-2 bg-bg-secondary border border-border-color rounded-full px-3 py-1.5 mb-4",children:[s.jsx(he,{size:12,className:"text-accent-primary"}),s.jsx("span",{className:"text-text-primary text-xs font-medium",children:l})]}),s.jsx("p",{className:"text-text-secondary text-sm mb-1 font-medium",children:q?"Enter your PIN":"Create a PIN (4–6 digits)"}),!q&&s.jsx("p",{className:"text-text-muted text-xs mb-4",children:"You'll only need this if you get signed out"}),s.jsx("div",{className:`flex gap-4 mb-6 mt-2 transition-transform ${I?"animate-bounce":""}`,children:Array.from({length:6}).map((p,k)=>s.jsx(vs,{filled:k<m.length},k))}),o&&s.jsx("p",{className:"text-accent-danger text-sm mb-4 text-center",children:o}),s.jsx("div",{className:"grid grid-cols-3 gap-3 w-full max-w-xs",children:ws.map((p,k)=>s.jsx("button",{onClick:()=>tt(p),disabled:a||!p&&p!=="0",className:`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${p==="⌫"?"text-text-muted bg-bg-secondary hover:bg-bg-tertiary":p?"text-text-primary bg-bg-secondary hover:bg-bg-tertiary border border-border-color":"invisible"}`,children:p==="⌫"?s.jsx(cs,{size:20,className:"mx-auto"}):p},k))}),a&&s.jsx("div",{className:"mt-4 w-5 h-5 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin"}),s.jsxs("button",{onClick:st,className:"mt-6 text-text-muted text-xs hover:text-accent-primary transition-colors",children:["Not ",l,"? Switch user"]})]})}function Je(){try{const e=localStorage.getItem("kova-theme");if(e==="light"||e==="dark")return e}catch{}return"dark"}function K(e){const t=document.documentElement;e==="light"?t.classList.add("light"):t.classList.remove("light");try{localStorage.setItem("kova-theme",e)}catch{}}K(Je());const Is=G((e,t)=>({theme:Je(),toggle:()=>{const n=t().theme==="dark"?"light":"dark";K(n),e({theme:n})},setTheme:n=>{K(n),e({theme:n})}})),js={"/":"Dashboard","/expenses":"Expenses","/income":"Income","/credit":"Credit","/goals":"Goals","/chat":"AI Assistant","/history":"History","/cashflow":"Cash Flow","/household":"Household","/accounts":"Accounts"};function Ts(){const{pathname:e}=xe(),t=ye(),n=js[e]??"KOVA",r=e==="/",{theme:a,toggle:o}=Is(),i=C(c=>c.lock);return s.jsxs("header",{className:"shrink-0 bg-bg-secondary border-b border-border-color px-4 flex items-center justify-between h-14",children:[s.jsxs("div",{className:"flex items-center gap-3",children:[!r&&s.jsx("button",{onClick:()=>t(-1),className:"p-1.5 -ml-1 text-text-muted hover:text-text-primary rounded-lg transition-colors",children:s.jsx(rs,{size:20})}),r&&s.jsx("div",{className:"w-7 h-7 rounded-lg bg-gradient-to-br from-accent-primary to-purple-800 flex items-center justify-center",children:s.jsx("span",{className:"text-white text-sm font-bold font-display",children:"K"})}),s.jsx("h1",{className:"text-text-primary font-semibold font-display",children:n})]}),s.jsxs("div",{className:"flex items-center gap-1",children:[s.jsx("button",{onClick:o,className:"p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-tertiary transition-colors",title:a==="dark"?"Switch to light mode":"Switch to dark mode",children:a==="dark"?s.jsx(gs,{size:18}):s.jsx(ps,{size:18})}),r&&s.jsxs(s.Fragment,{children:[s.jsx("button",{onClick:()=>t("/accounts"),className:"p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-tertiary transition-colors",title:"Accounts",children:s.jsx(ds,{size:18})}),s.jsx("button",{onClick:()=>t("/expenses"),className:"p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-tertiary transition-colors",title:"Expenses",children:s.jsx(hs,{size:18})}),s.jsx("button",{onClick:()=>t("/history"),className:"p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-tertiary transition-colors",title:"History",children:s.jsx(is,{size:18})}),s.jsx("button",{onClick:i,className:"p-2 text-text-muted hover:text-accent-danger rounded-xl hover:bg-bg-tertiary transition-colors",title:"Sign out",children:s.jsx(fs,{size:18})})]})]})]})}const Ss=[{to:"/",label:"Home",Icon:us},{to:"/cashflow",label:"Flow",Icon:xs},{to:"/income",label:"Income",Icon:ls},{to:"/goals",label:"Goals",Icon:ys},{to:"/chat",label:"Chat",Icon:ms}];function As(){return s.jsx("nav",{className:"shrink-0 bg-bg-secondary border-t border-border-color safe-bottom",children:s.jsx("div",{className:"flex items-center justify-around h-16",children:Ss.map(({to:e,label:t,Icon:n})=>s.jsx(ot,{to:e,end:e==="/",className:({isActive:r})=>`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[52px] ${r?"text-accent-primary":"text-text-muted active:text-text-secondary"}`,children:({isActive:r})=>s.jsxs(s.Fragment,{children:[s.jsx(n,{size:22,strokeWidth:r?2.5:1.8}),s.jsx("span",{className:"text-[10px] font-medium",children:t})]})},e))})})}function _s(){const{pathname:e}=xe(),t=e==="/chat";return s.jsxs("div",{className:"h-full flex flex-col bg-bg-primary overflow-hidden",children:[s.jsx(Ts,{}),t?s.jsx("main",{className:"flex-1 min-h-0 flex flex-col overflow-hidden",children:s.jsx("div",{className:"flex-1 min-h-0 max-w-2xl w-full mx-auto flex flex-col px-4 py-0 overflow-hidden",children:s.jsx(te,{})})}):s.jsx("main",{className:"flex-1 overflow-y-auto",children:s.jsx("div",{className:"px-4 py-5 max-w-2xl mx-auto pb-6",children:s.jsx(te,{})})}),s.jsx(As,{})]})}let Es=0;const N=G(e=>({toasts:[],add:(t,n="success")=>{const r=++Es;e(a=>({toasts:[...a.toasts,{id:r,message:t,type:n}]})),setTimeout(()=>{e(a=>({toasts:a.toasts.filter(o=>o.id!==r)}))},3500)},remove:t=>e(n=>({toasts:n.toasts.filter(r=>r.id!==t)}))})),Ws={success:e=>N.getState().add(e,"success"),error:e=>N.getState().add(e,"error"),info:e=>N.getState().add(e,"info")},Cs={success:as,error:os,info:Ye},ge={success:"border-accent-secondary/30 bg-accent-secondary/10 text-accent-secondary",error:"border-accent-danger/30 bg-accent-danger/10 text-accent-danger",info:"border-accent-primary/30 bg-accent-primary/10 text-accent-primary"};function Ns(){const{toasts:e,remove:t}=N();return s.jsx("div",{className:"fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4",children:e.map(n=>{const r=Cs[n.type]??Ye;return s.jsxs("div",{className:`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-sm font-medium shadow-lg pointer-events-auto max-w-sm w-full ${ge[n.type]??ge.info}`,children:[s.jsx(r,{size:16,className:"shrink-0"}),s.jsx("span",{className:"flex-1",children:n.message}),s.jsx("button",{onClick:()=>t(n.id),className:"opacity-60 hover:opacity-100 transition-opacity",children:s.jsx(bs,{size:14})})]},n.id)})})}const Rs=u.lazy(()=>v(()=>import("./Dashboard-BtCb7w7u.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]))),Ps=u.lazy(()=>v(()=>import("./Expenses-DmqojcJY.js"),__vite__mapDeps([16,1,2,3,4,5,9,10,17,18,19,20]))),Os=u.lazy(()=>v(()=>import("./Income-BfBK5UlT.js"),__vite__mapDeps([21,1,6,3,4,5,9,10,17,11,18,13]))),Ls=u.lazy(()=>v(()=>import("./Credit-DJ6rYIGQ.js"),__vite__mapDeps([22,1,7,3,4,5,2,10,17,18,14,19]))),Ds=u.lazy(()=>v(()=>import("./Goals-j31imtwC.js"),__vite__mapDeps([23,1,8,3,4,5,2,10,17,18,19]))),Ms=u.lazy(()=>v(()=>import("./Chat-Cu2MC__4.js"),__vite__mapDeps([24,1,3,4,5,2,6,7,8,9]))),Fs=u.lazy(()=>v(()=>import("./History-Dinx9GH0.js"),__vite__mapDeps([25,1,17,3,4,5,10,14]))),$s=u.lazy(()=>v(()=>import("./CashFlow-TYvz-6BN.js"),__vite__mapDeps([26,1,2,3,4,5,9,6,10,12,11,27,15]))),zs=u.lazy(()=>v(()=>import("./Household-CbdgClVb.js"),__vite__mapDeps([28,1,3,4,5,2,6,10,18,20,19]))),qs=u.lazy(()=>v(()=>import("./Accounts-IEL8g8TO.js"),__vite__mapDeps([29,1,9,3,4,5,10,27,15,18,19])));function w(){return s.jsx("div",{className:"flex items-center justify-center py-16",children:s.jsx("div",{className:"w-6 h-6 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin"})})}function Us({children:e}){const t=C(r=>r.unlocked);return C(r=>r.loading)?s.jsx("div",{className:"h-full bg-bg-primary flex items-center justify-center",children:s.jsx("div",{className:"w-8 h-8 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin"})}):t?e:s.jsx(be,{to:"/unlock",replace:!0})}function Vs(){const{init:e}=C();return u.useEffect(()=>{e()},[e]),s.jsxs(it,{children:[s.jsx(Ns,{}),s.jsxs(ct,{children:[s.jsx(x,{path:"/unlock",element:s.jsx(ks,{})}),s.jsxs(x,{path:"/",element:s.jsx(Us,{children:s.jsx(_s,{})}),children:[s.jsx(x,{index:!0,element:s.jsx(u.Suspense,{fallback:s.jsx(w,{}),children:s.jsx(Rs,{})})}),s.jsx(x,{path:"expenses",element:s.jsx(u.Suspense,{fallback:s.jsx(w,{}),children:s.jsx(Ps,{})})}),s.jsx(x,{path:"income",element:s.jsx(u.Suspense,{fallback:s.jsx(w,{}),children:s.jsx(Os,{})})}),s.jsx(x,{path:"credit",element:s.jsx(u.Suspense,{fallback:s.jsx(w,{}),children:s.jsx(Ls,{})})}),s.jsx(x,{path:"goals",element:s.jsx(u.Suspense,{fallback:s.jsx(w,{}),children:s.jsx(Ds,{})})}),s.jsx(x,{path:"chat",element:s.jsx(u.Suspense,{fallback:s.jsx(w,{}),children:s.jsx(Ms,{})})}),s.jsx(x,{path:"history",element:s.jsx(u.Suspense,{fallback:s.jsx(w,{}),children:s.jsx(Fs,{})})}),s.jsx(x,{path:"cashflow",element:s.jsx(u.Suspense,{fallback:s.jsx(w,{}),children:s.jsx($s,{})})}),s.jsx(x,{path:"household",element:s.jsx(u.Suspense,{fallback:s.jsx(w,{}),children:s.jsx(zs,{})})}),s.jsx(x,{path:"accounts",element:s.jsx(u.Suspense,{fallback:s.jsx(w,{}),children:s.jsx(qs,{})})})]}),s.jsx(x,{path:"*",element:s.jsx(be,{to:"/",replace:!0})})]})]})}Te(document.getElementById("root")).render(s.jsx(u.StrictMode,{children:s.jsx(Vs,{})}));export{is as C,ls as D,ds as L,ys as T,bs as X,as as a,rs as b,h as c,xs as d,Gs as e,A as f,s as j,Ws as t};
