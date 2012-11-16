A fork of the Object mapping plugin for [Knockout](http://knockoutjs.com/) - Find the documentation [here](http://knockoutjs.com/documentation/plugins-mapping.html).

#New Stuff#

No breaking changes, but adds an additional options array `observe`. When `observe` contains one or more property names, all properties are copied except the the ones in `observe`; they are observed. The arrays `ignore` and `include` still work as normal. 

The array `copy` can be used for efficiency to copy the whole property including children. If an array or object property is not specified in `copy` or `observe` then it is recursively mapped. For example:

```
var data = {
	a: "a",
	b: [{ b1: "v1" }, { b2: "v2" }] 
};

var result = ko.mapping.fromJS(data, { observe: "a" });
var result2 = ko.mapping.fromJS(data, { observe: "a", copy: "b" }); //will be faster to map.
```
Both result and result2 will be:
```
{
	a: observable("a"),
	b: [{ b1: "v1" }, { b2: "v2" }] 
}
```

Drilling down into arrays/objects works but copy and observe can conflict:

```
var data = {
	a: "a",
	b: [{ b1: "v1" }, { b2: "v2" }] 
};
var result = ko.mapping.fromJS(data, { observe: "b[0].b1"});
var results = ko.mapping.fromJS(data, { observe: "b[0].b1", copy: "b" });
```
result will be:

```
{
	a: "a",
	b: [{ b1: observable("v1") }, { b2: "v2" }] 
}
```

while result2 will be:

```
{
	a: "a",
	b: [{ b1: "v1" }, { b2: "v2" }] 
}
```
