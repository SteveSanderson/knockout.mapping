// Knockout Mapping plugin v2.0.4
// (c) 2011 Steven Sanderson, Roy Jacobs - http://knockoutjs.com/
// License: MIT (http://www.opensource.org/licenses/mit-license.php)

(function(b,i){"function"===typeof define&&define.amd?define(function(){return function(b){i(b)}}):i(b.ko)})(this,function(b){function i(a,b){for(var c in b)b.hasOwnProperty(c)&&b[c]&&(c&&a[c]&&!(a[c]instanceof Array)?i(a[c],b[c]):a[c]=b[c])}function C(a,b){var c={};i(c,a);i(c,b);return c}function D(a,b){a=a||{};if(a.create instanceof Function||a.update instanceof Function||a.key instanceof Function||a.arrayChanged instanceof Function)a={"":a};b&&(a.ignore=l(b.ignore,a.ignore),a.include=l(b.include,
a.include),a.copy=l(b.copy,a.copy));a.ignore=l(a.ignore,h.ignore);a.include=l(a.include,h.include);a.copy=l(a.copy,h.copy);a.mappedProperties=a.mappedProperties||{};return a}function l(a,d){a instanceof Array||(a="undefined"===b.mapping.getType(a)?[]:[a]);d instanceof Array||(d="undefined"===b.mapping.getType(d)?[]:[d]);return a.concat(d)}function L(a,d){var c=b.dependentObservable;b.dependentObservable=function(c,d,e){var e=e||{},g=e.deferEvaluation;c&&"object"==typeof c&&(e=c);var r=!1,k=function(c){var d=
t({read:function(){r||(b.utils.arrayRemoveItem(a,c),r=!0);return c.apply(c,arguments)},write:function(a){return c(a)},deferEvaluation:!0});d.__ko_proto__=t;return d};e.deferEvaluation=!0;c=new t(c,d,e);c.__ko_proto__=t;g||(a.push(c),c=k(c));return c};b.computed=b.dependentObservable;var e=d();b.dependentObservable=c;b.computed=b.dependentObservable;return e}function y(a,d,c,e,f,h){var x=b.utils.unwrapObservable(d)instanceof Array,h=h||"";if(b.mapping.isMapped(a))var g=b.utils.unwrapObservable(a)[n],
c=C(g,c);var r=function(){return c[e]&&c[e].create instanceof Function},k=function(a){return L(E,function(){return c[e].create({data:a||d,parent:f})})},s=function(){return c[e]&&c[e].update instanceof Function},p=function(a,M){var g={data:M||d,parent:f,target:b.utils.unwrapObservable(a)};b.isWriteableObservable(a)&&(g.observable=a);return c[e].update(g)};if(g=z.get(d))return g;e=e||"";if(x){var x=[],m=!1,j=function(a){return a};c[e]&&c[e].key&&(j=c[e].key,m=!0);b.isObservable(a)||(a=b.observableArray([]),
a.mappedRemove=function(b){var c="function"==typeof b?b:function(a){return a===j(b)};return a.remove(function(a){return c(j(a))})},a.mappedRemoveAll=function(c){var d=v(c,j);return a.remove(function(a){return-1!=b.utils.arrayIndexOf(d,j(a))})},a.mappedDestroy=function(b){var c="function"==typeof b?b:function(a){return a===j(b)};return a.destroy(function(a){return c(j(a))})},a.mappedDestroyAll=function(c){var d=v(c,j);return a.destroy(function(a){return-1!=b.utils.arrayIndexOf(d,j(a))})},a.mappedIndexOf=
function(c){var d=v(a(),j),c=j(c);return b.utils.arrayIndexOf(d,c)},a.mappedCreate=function(c){if(-1!==a.mappedIndexOf(c))throw Error("There already is an object with the key that you specified.");var d=r()?k(c):c;s()&&(c=p(d,c),b.isWriteableObservable(d)?d(c):d=c);a.push(d);return d});var g=v(b.utils.unwrapObservable(a),j).sort(),i=v(d,j);m&&i.sort();for(var m=b.utils.compareArrays(g,i),g={},i=[],l=0,t=m.length;l<t;l++){var u=m[l],o,q=h+"["+l+"]";switch(u.status){case "added":var w=A(b.utils.unwrapObservable(d),
u.value,j);o=y(void 0,w,c,e,a,q);r()||(o=b.utils.unwrapObservable(o));q=H(b.utils.unwrapObservable(d),w,g);i[q]=o;g[q]=!0;break;case "retained":w=A(b.utils.unwrapObservable(d),u.value,j);o=A(a,u.value,j);y(o,w,c,e,a,q);q=H(b.utils.unwrapObservable(d),w,g);i[q]=o;g[q]=!0;break;case "deleted":o=A(a,u.value,j)}x.push({event:u.status,item:o})}a(i);c[e]&&c[e].arrayChanged&&b.utils.arrayForEach(x,function(a){c[e].arrayChanged(a.event,a.item)})}else if(F(d)){a=b.utils.unwrapObservable(a);if(!a){if(r())return m=
k(),s()&&(m=p(m)),m;if(s())return p(m);a={}}s()&&(a=p(a));z.save(d,a);I(d,function(e){var f=h.length?h+"."+e:e;if(-1==b.utils.arrayIndexOf(c.ignore,f))if(-1!=b.utils.arrayIndexOf(c.copy,f))a[e]=d[e];else{var g=z.get(d[e])||y(a[e],d[e],c,e,a,f);if(b.isWriteableObservable(a[e]))a[e](b.utils.unwrapObservable(g));else a[e]=g;c.mappedProperties[f]=!0}})}else switch(b.mapping.getType(d)){case "function":s()?b.isWriteableObservable(d)?(d(p(d)),a=d):a=p(d):a=d;break;default:b.isWriteableObservable(a)?s()?
a(p(a)):a(b.utils.unwrapObservable(d)):(a=r()?k():b.observable(b.utils.unwrapObservable(d)),s()&&a(p(a)))}return a}function H(a,b,c){for(var e=0,f=a.length;e<f;e++)if(!0!==c[e]&&a[e]===b)return e;return null}function J(a,d){var c;d&&(c=d(a));"undefined"===b.mapping.getType(c)&&(c=a);return b.utils.unwrapObservable(c)}function A(a,d,c){a=b.utils.arrayFilter(b.utils.unwrapObservable(a),function(a){return J(a,c)===d});if(0==a.length)throw Error("When calling ko.update*, the key '"+d+"' was not found!");
if(1<a.length&&F(a[0]))throw Error("When calling ko.update*, the key '"+d+"' was not unique!");return a[0]}function v(a,d){return b.utils.arrayMap(b.utils.unwrapObservable(a),function(a){return d?J(a,d):a})}function I(a,b){if(a instanceof Array)for(var c=0;c<a.length;c++)b(c);else for(c in a)b(c)}function F(a){var d=b.mapping.getType(a);return"object"===d&&null!==a&&"undefined"!==d}function K(){var a=[],d=[];this.save=function(c,e){var f=b.utils.arrayIndexOf(a,c);0<=f?d[f]=e:(a.push(c),d.push(e))};
this.get=function(c){c=b.utils.arrayIndexOf(a,c);return 0<=c?d[c]:void 0}}b.exportSymbol=function(a,b){for(var c=a.split("."),e=window,f=0;f<c.length-1;f++)e=e[c[f]];e[c[c.length-1]]=b};b.exportProperty=function(a,b,c){a[b]=c};b.mapping={};var n="__ko_mapping__",t=b.dependentObservable,G=0,E,z,B={include:["_destroy"],ignore:[],copy:[]},h=B;b.mapping.isMapped=function(a){return(a=b.utils.unwrapObservable(a))&&a[n]};b.mapping.fromJS=function(a){if(0==arguments.length)throw Error("When calling ko.fromJS, pass the object you want to convert.");
window.setTimeout(function(){G=0},0);G++||(E=[],z=new K);var d,c;2==arguments.length&&(arguments[1][n]?c=arguments[1]:d=arguments[1]);3==arguments.length&&(d=arguments[1],c=arguments[2]);c&&(d=C(d,c[n]));d=D(d);var e=y(c,a,d);c&&(e=c);--G||window.setTimeout(function(){b.utils.arrayForEach(E,function(a){a&&a()})},0);e[n]=C(e[n],d);return e};b.mapping.fromJSON=function(a){var d=b.utils.parseJson(a);arguments[0]=d;return b.mapping.fromJS.apply(this,arguments)};b.mapping.updateFromJS=function(){throw Error("ko.mapping.updateFromJS, use ko.mapping.fromJS instead. Please note that the order of parameters is different!");
};b.mapping.updateFromJSON=function(){throw Error("ko.mapping.updateFromJSON, use ko.mapping.fromJSON instead. Please note that the order of parameters is different!");};b.mapping.toJS=function(a,d){h||b.mapping.resetDefaultOptions();if(0==arguments.length)throw Error("When calling ko.mapping.toJS, pass the object you want to convert.");if(!(h.ignore instanceof Array))throw Error("ko.mapping.defaultOptions().ignore should be an array.");if(!(h.include instanceof Array))throw Error("ko.mapping.defaultOptions().include should be an array.");
if(!(h.copy instanceof Array))throw Error("ko.mapping.defaultOptions().copy should be an array.");d=D(d,a[n]);return b.mapping.visitModel(a,function(a){return b.utils.unwrapObservable(a)},d)};b.mapping.toJSON=function(a,d){var c=b.mapping.toJS(a,d);return b.utils.stringifyJson(c)};b.mapping.defaultOptions=function(){if(0<arguments.length)h=arguments[0];else return h};b.mapping.resetDefaultOptions=function(){h={include:B.include.slice(0),ignore:B.ignore.slice(0),copy:B.copy.slice(0)}};b.mapping.getType=
function(a){return a&&"object"===typeof a&&a.constructor==(new Date).constructor?"date":typeof a};b.mapping.visitModel=function(a,d,c){c=c||{};c.visitedObjects=c.visitedObjects||new K;c.parentName||(c=D(c));var e,f=b.utils.unwrapObservable(a);if(F(f))d(a,c.parentName),e=f instanceof Array?[]:{};else return d(a,c.parentName);c.visitedObjects.save(a,e);var h=c.parentName;I(f,function(a){if(!(c.ignore&&-1!=b.utils.arrayIndexOf(c.ignore,a))){var g=f[a],i=c,k=h||"";f instanceof Array?h&&(k+="["+a+"]"):
(h&&(k+="."),k+=a);i.parentName=k;if(!(-1===b.utils.arrayIndexOf(c.copy,a)&&-1===b.utils.arrayIndexOf(c.include,a)&&f[n]&&f[n].mappedProperties&&!f[n].mappedProperties[a]&&!(f instanceof Array)))switch(b.mapping.getType(b.utils.unwrapObservable(g))){case "object":case "undefined":i=c.visitedObjects.get(g);e[a]="undefined"!==b.mapping.getType(i)?i:b.mapping.visitModel(g,d,c);break;default:e[a]=d(g,c.parentName)}}});return e};b.exportSymbol("ko.mapping",b.mapping);b.exportSymbol("ko.mapping.fromJS",
b.mapping.fromJS);b.exportSymbol("ko.mapping.fromJSON",b.mapping.fromJSON);b.exportSymbol("ko.mapping.isMapped",b.mapping.isMapped);b.exportSymbol("ko.mapping.defaultOptions",b.mapping.defaultOptions);b.exportSymbol("ko.mapping.toJS",b.mapping.toJS);b.exportSymbol("ko.mapping.toJSON",b.mapping.toJSON);b.exportSymbol("ko.mapping.updateFromJS",b.mapping.updateFromJS);b.exportSymbol("ko.mapping.updateFromJSON",b.mapping.updateFromJSON);b.exportSymbol("ko.mapping.visitModel",b.mapping.visitModel)});
