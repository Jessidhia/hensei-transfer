javascript:!function(){var n,a;if(n=new XMLHttpRequest,a=new Date().getTime(),n.open("GET","https://raw.githubusercontent.com/Vazkii/hensei-transfer/main/version?_anti_cache_measures="+a,!1),n.send(),19!=n.response.trim()&&confirm("hensei-transfer has received an update. Please re-download the bookmarklet to ensure it's compatible with the latest changes, or click Cancel to proceed anyway.")){window.open("https://github.com/Vazkii/hensei-transfer","_blank");return}window.location.href.includes("game.granbluefantasy.jp")?function n(){var a,e,r,s,t,u,o,l;function m(n,a){let e=[210,220,230,240];var r=[];for(k in n){var s={},t=n[k],u=t.master,o=t.param;if(u&&o){s.name=u.name,s.id=u.id;var l=parseInt(o.evolution);if(s.uncap=l,l>5){var m=1,c=parseInt(o.level);for(k2 in e)if(c>e[k2])m++;else break;s.transcend=m}a&&o.id==a&&(s.qs=!0),r.push(s)}}return r}a=Game,e=function(n){let a={Attack:"atk",Defense:"def",Special:"spec","C.A.":"ca",Healing:"heal","Skill DMG":"skill"},e=["0mlb","1mlb","2mlb","mlb","flb","ulb","trans"],r={"Colossus Omega":4,"Leviathan Omega":4,"Yggdrasil Omega":4,"Tiamat Omega":4,"Luminiera Omega":4,"Celeste Omega":4,Agni:5,Varuna:5,Titan:5,Zephyrus:5,Zeus:5,Hades:5},s=["Refrain of Blazing Vigor","Judgment of Torrential Tides","Bounty of Gracious Earth","Prayer of Grand Gales","Radiance of Insightful Rebirth","Festering of Mournful Obsequies"],t={auto:["1240","758","2204","2208"],skill:["1241","759","2205","2209"],ougi:["1242","760","2206","2210"],cb:["1243","761","2207","2211"],stamina:["502-507","1213-1218","727-736"],enmity:["130-135","71-76","737-746"],tirium:["1260-1265","1266-1271"],progression:["1199-1204","1205-1210"],celere:["322-327","1310-1315"],majesty:["764-769","1731-1735","948"],glory:["1171-1176","1736-1741"],freyr:"1723",apple:"1724",depravity:"1725",echo:"1726",extremity:"2212-2223",sagacity:"2224-2235",supremacy:"2236-2247",atk:"697-706",ma:"707-716",hp:"717-726",crit:"747-756",cap:"1807",healing:"1808",seraphic:"1809",cbgain:"1810",def:"1446",fire:"1447",water:"1448",earth:"1449",wind:"1450",light:"1451",dark:"1452",fortitude:"2043-2048",magnitude:"2049-2055",primal:"1228-1233",magna:"1234-1239"};var u,o,l=["Fire","Water","Earth","Wind","Light","Dark"];function m(n){var a=n.uncap;return 6==a?"D":5==a?"C":null}function c(a,e){if(!a)return"";for(var r in n="\n|"+e+"=",a.keys){var s=a.keys[r];0!=r&&(n+=","),n+=_(parseInt(s))}return n}function _(n){for(var a in t){var e=t[a];if("string"==typeof e&&f(e,n))return a;for(k in e)if(f(e[k],n))return a}return"UNKNOWN"}function f(n,a){if(n.includes("-")){var e=n.split("-"),r=parseInt(e[0]),s=parseInt(e[1]);return a>=r&&a<=s}return parseInt(n)==a}function d(n){var a=e[n.uncap];return n.transcend&&(a+=n.transcend),a}function v(n,a){var e,s=(e=n,e.transcend?5==e.transcend?"D":"C":e.name in r?e.uncap>=r[e.name]?"B":"A":null);return s?"|art"+a+"="+s:""}u=n=function n(e){var r=JSON.parse(e);if("en"!=r.lang)return"Please change your game to English before exporting.";var e="{{TeamSpread";return e+="\n|team="+function n(a){var e="{{Team";for(var r in e+="\n|class="+a.class.toLowerCase(),a.characters){var s=a.characters[r],t=parseInt(r)+1;e+="\n|char"+t+"="+s.name,s.transcend&&(e+="|trans"+t+"="+s.transcend);var u=m(s);u&&(e+="|art"+t+"="+u)}for(var r in a.subskills){var o=a.subskills[r],t=parseInt(r)+1;if(null==o||"null"==o)break;e+="\n|skill"+t+"="+o}return e+="\n|main="+a.summons[0].name,e+="\n|support="+a.friend_summon,e+="\n}}"}(r),e+="\n|weapons="+function n(e){var r="{{WeaponGridSkills",t=null,u=null,o=null;for(var m in e.weapons){var _=e.weapons[m],f=0==m?"mh":"wp"+m,d=0==m?"umh":"u"+m;r+="\n|"+f+"="+_.name,"attr"in _&&(r+=" ("+l[_.attr]+")");var v=_.uncap;"transcend"in _&&(v="t"+_.transcend),r+="|"+d+"="+v,_.awakening&&(r+="|"+(0==m?"awkmh":"awk"+m)+"="+a[_.awakening.type]),_.keys&&(_.name.includes("Ultima")?o=_:_.name.includes("iation")?t=_:(_.name.includes("Draconic")||s.includes(_.name))&&(u=_))}return r+=c(t,"opus"),r+=c(u,"draconic"),r+=c(o,"ultima"),r+="\n}}"}(r),e+="\n|summons="+function n(a){var e="{{SummonGrid",r=-1;for(var s in a.summons){var t=a.summons[s],u=0==s?"main":"s"+s,o=0==s?"umain":"u"+s,l=0==s?"main":s;e+="\n|"+u+"="+t.name,e+="|"+o+"="+d(t),e+=v(t,l),t.qs&&(r=s)}for(var s in a.sub_summons){var t=a.sub_summons[s],m=parseInt(s)+1,u="sub"+m,o="usub"+m;e+="\n|"+u+"="+t.name,e+="|"+o+"="+d(t),e+=v(t,u)}return r>-1&&(e+="\n|quick="+(0==r?"main":r)),e+"\n}}"}(r),e+="\n}}"}(n),o=$("<textarea>"),$("body").append(o),o.text(u),o.select(),document.execCommand("copy"),o.remove(),alert("Copied team data to clipboard!")},s=(r=a.view.deck_model.attributes.deck).name,t=a.lang,u={},o=r.pc,u.lang=t,u.name=s,u.class=o.job.master.name,u.extra=o.isExtraDeck,u.friend_summon=o.damage_info.summon_name,(l=o.familiar_id)||(l=o.shield_id),l&&(u.accessory=l),u.subskills=function n(a){var e=[];for(var r in a){var s=a[r];e.push(s.name)}return e}(o.set_action),u.characters=function n(a){var e=[];for(k in a){var r={},s=a[k],t=s.master,u=s.param;if(t&&u){r.name=t.name,r.id=t.id,r.uncap=parseInt(u.evolution),u.has_npcaugment_constant&&(r.ringed=!0);var o=parseInt(u.phase);o>0&&(r.transcend=o),e.push(r)}}return e}(r.npc),u.weapons=function n(a){let e=[40,60,80,100,150,200],r=[210,220,230,240],s=[[13],[3,13,19,27,40],[3,13,27,40]],t=[13,17,19];var u=[];for(k in a){var o={},l=a[k],m=l.master,c=l.param;if(m&&c){var _=parseInt(m.series_id);o.name=m.name;var f=m.id;if(t.includes(_)){var d=parseInt(m.attribute)-1;o.attr=d,f=`${parseInt(f)-100*d}`}o.id=f;var v=0,p=parseInt(c.level);for(k2 in e)if(p>e[k2])v++;else break;if(o.uncap=v,v>5){var g=1;for(k2 in r)if(p>r[k2])g++;else break;o.transcend=g}var h=c.arousal;if(h.is_arousal_weapon){var b={};b.type=h.form_name,b.lvl=h.level,o.awakening=b}var y=c.augment_skill_info;if(y.length>0){var w=y[0],C=[];for(k2 in w){var x={},O=w[k2];x.id=`${O.skill_id}`,x.val=O.show_value,C.push(x)}o.ax=C}var T=[];for(i in s)if(s[i].includes(_)){var D=`skill${parseInt(i)+1}`;D in l&&T.push(l[D].id)}T.length>0&&(o.keys=T),u.push(o)}}return u}(o.weapons),u.summons=m(o.summons,o.quick_user_summon_id),u.sub_summons=m(o.sub_summons,0),e(JSON.stringify(u))}():alert("Can only be used in game.granbluefantasy.jp")}();