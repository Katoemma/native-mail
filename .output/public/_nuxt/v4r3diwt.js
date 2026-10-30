import{V as t,i as s,n as o}from"#entry";const n=t(e=>{if(e.path==="/login"||e.path.startsWith("/api/"))return;if(!s().loggedIn)return o("/login")});export{n as default};
