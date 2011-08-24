describe('Mapping', {
	before_each: function() {
		ko.mapping.resetDefaultOptions();
	},

	'ko.mapping.toJS should unwrap observable values': function () {
		var atomicValues = ["hello", 123, true, null, undefined,
		{
			a: 1
		}];
		for (var i = 0; i < atomicValues.length; i++) {
			var data = ko.observable(atomicValues[i]);
			var result = ko.mapping.toJS(data);
			value_of(ko.isObservable(result)).should_be(false);
			value_of(result).should_be(atomicValues[i]);
		}
	},

	'ko.mapping.toJS should unwrap observable properties, including nested ones': function () {
		var data = {
			a: ko.observable(123),
			b: {
				b1: ko.observable(456),
				b2: 789
			}
		};
		var result = ko.mapping.toJS(data);
		value_of(result.a).should_be(123);
		value_of(result.b.b1).should_be(456);
		value_of(result.b.b2).should_be(789);
	},

	'ko.mapping.toJS should unwrap observable arrays and things inside them': function () {
		var data = ko.observableArray(['a', 1,
		{
			someProp: ko.observable('Hey')
		}]);
		var result = ko.mapping.toJS(data);
		value_of(result.length).should_be(3);
		value_of(result[0]).should_be('a');
		value_of(result[1]).should_be(1);
		value_of(result[2].someProp).should_be('Hey');
	},

	'ko.mapping.toJS should ignore specified single property': function() {
		var data = {
			a: "a",
			b: "b"
		};
		
		var result = ko.mapping.toJS(data, { ignore: "b" });
		value_of(result.a).should_be("a");
		value_of(result.b).should_be(undefined);
	},

	'ko.mapping.fromJS should ignore specified single property': function() {
		var data = {
			a: "a",
			b: "b"
		};
		
		var result = ko.mapping.fromJS(data, { ignore: "b" });
		value_of(result.a()).should_be("a");
		value_of(result.b).should_be(undefined);
	},

	'ko.mapping.fromJS should ignore specified array item': function() {
		var data = {
			a: "a",
			b: [{ b1: "v1" }, { b2: "v2" }] 
		};
		
		var result = ko.mapping.fromJS(data, { ignore: "b[1].b2" });
		value_of(result.a()).should_be("a");
		value_of(result.b()[0].b1()).should_be("v1");
		value_of(result.b()[1].b2).should_be(undefined);
	},

	'ko.mapping.fromJS should ignore specified single property, also when going back .toJS': function() {
		var data = {
			a: "a",
			b: "b"
		};
		
		var result = ko.mapping.fromJS(data, { ignore: "b" });
		var js = ko.mapping.toJS(result);
		value_of(js.a).should_be("a");
		value_of(js.b).should_be(undefined);
	},

	'ko.mapping.fromJS should copy specified single property': function() {
		var data = {
			a: "a",
			b: "b"
		};
		
		var result = ko.mapping.fromJS(data, { copy: "b" });
		value_of(result.a()).should_be("a");
		value_of(result.b).should_be("b");
	},

	'ko.mapping.fromJS should copy specified array': function() {
		var data = {
			a: "a",
			b: ["b1", "b2"]
		};
		
		var result = ko.mapping.fromJS(data, { copy: "b" });
		value_of(result.a()).should_be("a");
		value_of(result.b).should_be(["b1", "b2"]);
	},

	'ko.mapping.fromJS should copy specified array item': function() {
		var data = {
			a: "a",
			b: [{ b1: "v1" }, { b2: "v2" }] 
		};
		
		var result = ko.mapping.fromJS(data, { copy: "b[0].b1" });
		value_of(result.a()).should_be("a");
		value_of(result.b()[0].b1).should_be("v1");
		value_of(result.b()[1].b2()).should_be("v2");
	},

	'ko.mapping.fromJS should copy specified single property, also when going back .toJS': function() {
		var data = {
			a: "a",
			b: "b"
		};
		
		var result = ko.mapping.fromJS(data, { copy: "b" });
		var js = ko.mapping.toJS(result);
		value_of(js.a).should_be("a");
		value_of(js.b).should_be("b");
	},

	'ko.mapping.fromJS should copy specified single property, also when going back .toJS, except when overridden': function() {
		var data = {
			a: "a",
			b: "b"
		};
		
		var result = ko.mapping.fromJS(data, { copy: "b" });
		var js = ko.mapping.toJS(result, { ignore: "b" });
		value_of(js.a).should_be("a");
		value_of(js.b).should_be(undefined);
	},
	
	'ko.mapping.toJS should include specified single property': function() {
		var data = {
			a: "a"
		};
		
		var mapped = ko.mapping.fromJS(data);
		mapped.c = 1;
		mapped.d = 2;
		var result = ko.mapping.toJS(mapped, { include: "c" });
		value_of(result.a).should_be("a");
		value_of(result.c).should_be(1);
		value_of(result.d).should_be(undefined);
	},

	'ko.mapping.toJS should by default ignore the mapping property': function() {
		var data = {
			a: "a",
			b: "b"
		};
		
		var fromJS = ko.mapping.fromJS(data);
		var result = ko.mapping.toJS(fromJS);
		value_of(result.a).should_be("a");
		value_of(result.b).should_be("b");
		value_of(result.__ko_mapping__).should_be(undefined);
	},

	'ko.mapping.toJS should by default include the _destroy property': function() {
		var data = {
			a: "a"
		};
		
		var fromJS = ko.mapping.fromJS(data);
		fromJS._destroy = true;
		var result = ko.mapping.toJS(fromJS);
		value_of(result.a).should_be("a");
		value_of(result._destroy).should_be(true);
	},

	'ko.mapping.toJS should merge the default includes': function() {
		var data = {
			a: "a"
		};
		
		var fromJS = ko.mapping.fromJS(data);
		fromJS.b = "b";
		fromJS._destroy = true;
		var result = ko.mapping.toJS(fromJS, { include: "b" });
		value_of(result.a).should_be("a");
		value_of(result.b).should_be("b");
		value_of(result._destroy).should_be(true);
	},

	'ko.mapping.toJS should merge the default ignores': function() {
		var data = {
			a: "a",
			b: "b",
			c: "c"
		};
		
		ko.mapping.defaultOptions().ignore = ["a"];
		var fromJS = ko.mapping.fromJS(data);
		var result = ko.mapping.toJS(fromJS, { ignore: "b" });
		value_of(result.a).should_be(undefined);
		value_of(result.b).should_be(undefined);
		value_of(result.c).should_be("c");
	},

	'ko.mapping.defaultOptions should by default include the _destroy property': function() {
		value_of(ko.utils.arrayIndexOf(ko.mapping.defaultOptions().include, "_destroy")).should_not_be(-1);
	},

	'ko.mapping.defaultOptions.include should be an array': function() {
		var didThrow = false;
		try {
			ko.mapping.defaultOptions().include = {};
			ko.mapping.toJS({});
		}
		catch (ex) {
			didThrow = true
		}
		value_of(didThrow).should_be(true);
	},

	'ko.mapping.defaultOptions.ignore should be an array': function() {
		var didThrow = false;
		try {
			ko.mapping.defaultOptions().ignore = {};
			ko.mapping.toJS({});
		}
		catch (ex) {
			didThrow = true
		}
		value_of(didThrow).should_be(true);
	},

	'ko.mapping.defaultOptions can be set': function() {
		var oldOptions = ko.mapping.defaultOptions();
		ko.mapping.defaultOptions({ a: "a" });
		var newOptions = ko.mapping.defaultOptions();
		ko.mapping.defaultOptions(oldOptions);
		value_of(newOptions.a).should_be("a");
	},

	'ko.mapping.toJS should ignore properties that were not part of the original model': function () {
		var data = {
			a: 123,
			b: {
				b1: 456,
				b2: [
					"b21", "b22"
				],
			}
		};
		
		var mapped = ko.mapping.fromJS(data);
		mapped.extraProperty = ko.observable(333);
		mapped.extraFunction = function() {};
		
		var unmapped = ko.mapping.toJS(mapped);
		value_of(unmapped.a).should_be(123);
		value_of(unmapped.b.b1).should_be(456);
		value_of(unmapped.b.b2[0]).should_be("b21");
		value_of(unmapped.b.b2[1]).should_be("b22");
		value_of(unmapped.extraProperty).should_be(undefined);
		value_of(unmapped.extraFunction).should_be(undefined);
		value_of(unmapped.__ko_mapping__).should_be(undefined);
	},

	'ko.mapping.toJS should ignore properties that were not part of the original model when there are no nested create callbacks': function () {
		var data = [
			{
				a: [{ id: "a1.1" }, { id: "a1.2" }]
			}
		];
		
		var mapped = ko.mapping.fromJS(data, {
			create: function(options) {
				return ko.mapping.fromJS(options.data);
			}
		});
		mapped.extraProperty = ko.observable(333);
		mapped.extraFunction = function() {};
		
		var unmapped = ko.mapping.toJS(mapped);
		value_of(unmapped[0].a[0].id).should_be("a1.1");
		value_of(unmapped[0].a[1].id).should_be("a1.2");
		value_of(unmapped.extraProperty).should_be(undefined);
		value_of(unmapped.extraFunction).should_be(undefined);
		value_of(unmapped.__ko_mapping__).should_be(undefined);
	},
	
	'ko.mapping.toJS should ignore properties that were not part of the original model when there are nested create callbacks': function () {
		var data = [
			{
				a: [{ id: "a1.1" }, { id: "a1.2" }]
			}
		];
		
		var nestedMappingOptions = {
			a: {
				create: function(options) {
					return ko.mapping.fromJS(options.data);
				}
			}
		};
		
		var mapped = ko.mapping.fromJS(data, {
			create: function(options) {
				return ko.mapping.fromJS(options.data, nestedMappingOptions);
			}
		});
		mapped.extraProperty = ko.observable(333);
		mapped.extraFunction = function() {};
		
		var unmapped = ko.mapping.toJS(mapped);
		value_of(unmapped[0].a[0].id).should_be("a1.1");
		value_of(unmapped[0].a[1].id).should_be("a1.2");
		value_of(unmapped.extraProperty).should_be(undefined);
		value_of(unmapped.extraFunction).should_be(undefined);
		value_of(unmapped.__ko_mapping__).should_be(undefined);
	},
	
	'ko.mapping.toJS should ignore specified properties': function() {
		var data = {
			a: "a",
			b: "b",
			c: "c"
		};
		
		var result = ko.mapping.toJS(data, { ignore: ["b", "c"] });
		value_of(result.a).should_be("a");
		value_of(result.b).should_be(undefined);
		value_of(result.c).should_be(undefined);
	},

	'ko.mapping.toJSON should ignore specified properties': function() {
		var data = {
			a: "a",
			b: "b",
			c: "c"
		};
		
		var result = ko.mapping.toJSON(data, { ignore: ["b", "c"] });
		value_of(result).should_be("{\"a\":\"a\"}");
	},

	'ko.mapping.toJSON should unwrap everything and then stringify': function () {
		var data = ko.observableArray(['a', 1,
		{
			someProp: ko.observable('Hey')
		}]);
		var result = ko.mapping.toJSON(data);

		// Check via parsing so the specs are independent of browser-specific JSON string formatting
		value_of(typeof result).should_be('string');
		var parsedResult = ko.utils.parseJson(result);
		value_of(parsedResult.length).should_be(3);
		value_of(parsedResult[0]).should_be('a');
		value_of(parsedResult[1]).should_be(1);
		value_of(parsedResult[2].someProp).should_be('Hey');
	},

	'ko.mapping.fromJS should require a parameter': function () {
		var didThrow = false;
		try {
			ko.mapping.fromJS()
		}
		catch (ex) {
			didThrow = true
		}
		value_of(didThrow).should_be(true);
	},

	'ko.mapping.fromJS should return an observable if you supply an atomic value': function () {
		var atomicValues = ["hello", 123, true, null, undefined];
		for (var i = 0; i < atomicValues.length; i++) {
			var result = ko.mapping.fromJS(atomicValues[i]);
			value_of(ko.isObservable(result)).should_be(true);
			value_of(result()).should_be(atomicValues[i]);
		}
	},

	'ko.mapping.fromJS should be able to map into an existing object': function () {
		var existingObj = {
			a: "a"
		};
		
		var obj = {
			b: "b"
		};
		
		ko.mapping.fromJS(obj, {}, existingObj);
		
		value_of(ko.isObservable(existingObj.a)).should_be(false);
		value_of(ko.isObservable(existingObj.b)).should_be(true);
		value_of(existingObj.a).should_be("a");
		value_of(existingObj.b()).should_be("b");
	},

	'ko.mapping.fromJS should return an observableArray if you supply an array, but should not wrap its entries in further observables': function () {
		var sampleArray = ["a", "b"];
		var result = ko.mapping.fromJS(sampleArray);
		value_of(typeof result.destroyAll).should_be('function'); // Just an example of a function on ko.observableArray but not on Array
		value_of(result().length).should_be(2);
		value_of(result()[0]).should_be("a");
		value_of(result()[1]).should_be("b");
	},

	'ko.mapping.fromJS should not return an observable if you supply an object that could have properties': function () {
		value_of(ko.isObservable(ko.mapping.fromJS({}))).should_be(false);
	},

	'ko.mapping.fromJS should not wrap functions in an observable': function () {
		var result = ko.mapping.fromJS({}, {
			create: function(model) {
				return {
					myFunc: function() {
						return 123;
					}
				}
			}
		});
		value_of(result.myFunc()).should_be(123);
	},

	'ko.mapping.fromJS should map the top-level atomic properties on the supplied object as observables': function () {
		var result = ko.mapping.fromJS({
			a: 123,
			b: 'Hello',
			c: true
		});
		value_of(ko.isObservable(result.a)).should_be(true);
		value_of(ko.isObservable(result.b)).should_be(true);
		value_of(ko.isObservable(result.c)).should_be(true);
		value_of(result.a()).should_be(123);
		value_of(result.b()).should_be('Hello');
		value_of(result.c()).should_be(true);
	},

	'ko.mapping.fromJS should not map the top-level non-atomic properties on the supplied object as observables': function () {
		var result = ko.mapping.fromJS({
			a: {
				a1: "Hello"
			}
		});
		value_of(ko.isObservable(result.a)).should_be(false);
		value_of(ko.isObservable(result.a.a1)).should_be(true);
		value_of(result.a.a1()).should_be('Hello');
	},

	'ko.mapping.fromJS should not map the top-level non-atomic properties on the supplied overriden model as observables': function () {
		var result = ko.mapping.fromJS({
			a: {
				a2: "a2"
			}
		}, {
			create: function(model) {
				return {
					a: {
						a1: "a1"
					}
				};
			}
		});
		value_of(ko.isObservable(result.a)).should_be(false);
		value_of(ko.isObservable(result.a.a1)).should_be(false);
		value_of(result.a.a2).should_be(undefined);
		value_of(result.a.a1).should_be('a1');
	},
	
	'ko.mapping.fromJS should not map top-level objects on the supplied overriden model as observables': function () {
		var dummyObject = function (options) {
			this.a1 = options.a1;
			return this;
		}
	
		var result = ko.mapping.fromJS({}, {
			create: function(model) {
				return {
					a: new dummyObject({
						a1: "Hello"
					})
				};
			}
		});
		value_of(ko.isObservable(result.a)).should_be(false);
		value_of(ko.isObservable(result.a.a1)).should_be(false);
		value_of(result.a.a1).should_be('Hello');
	},

	'ko.mapping.fromJS should allow non-unique atomic properties': function () {
		ko.mapping.fromJS({
			a: [1, 2, 1]
		});
	},

	'ko.mapping.fromJS should not allow non-unique non-atomic properties': function () {
		var options = {
			key: function(item) { return ko.utils.unwrapObservable(item.id); }
		};

		var didThrow = false;
		try {
			ko.mapping.fromJS([
				{ id: "a1" },
				{ id: "a2" },
				{ id: "a1" }
			], options);
		}
		catch (ex) {
			didThrow = true
		}
		value_of(didThrow).should_be(true);
	},

	'ko.mapping.fromJS should map descendant properties on the supplied object as observables': function () {
		var result = ko.mapping.fromJS({
			a: {
				a1: 'a1value',
				a2: {
					a21: 'a21value',
					a22: 'a22value'
				}
			},
			b: {
				b1: null,
				b2: undefined
			}
		});
		value_of(result.a.a1()).should_be('a1value');
		value_of(result.a.a2.a21()).should_be('a21value');
		value_of(result.a.a2.a22()).should_be('a22value');
		value_of(result.b.b1()).should_be(null);
		value_of(result.b.b2()).should_be(undefined);
	},

	'ko.mapping.fromJS should map observable properties, but without adding a further observable wrapper': function () {
		var result = ko.mapping.fromJS({
			a: ko.observable('Hey')
		});
		value_of(result.a()).should_be('Hey');
	},

	'ko.mapping.fromJS should escape from reference cycles': function () {
		var obj = {};
		obj.someProp = {
			owner: obj
		};
		var result = ko.mapping.fromJS(obj);
		value_of(result.someProp.owner === result).should_be(true);
	},

	'ko.mapping.fromJS should send relevant create callbacks': function () {
		var items = [];
		var index = 0;
		var result = ko.mapping.fromJS({
			a: "hello"
		}, {
			create: function (model) {
				index++;
				return model;
			}
		});
		value_of(index).should_be(1);
	},
	
	'ko.mapping.fromJS should send relevant create callbacks when mapping arrays': function () {
		var items = [];
		var index = 0;
		var result = ko.mapping.fromJS([
			"hello"
		], {
			create: function (model) {
				index++;
				return model;
			}
		});
		value_of(index).should_be(1);
	},

	'ko.mapping.fromJS should send parent along to create callback when creating an object': function() {
		var obj = {
			a: "a",
			b: {
				b1: "b1"
			}
		};
		
		var result = ko.mapping.fromJS(obj, {
			"b": {
				create: function(options) {
					value_of(ko.isObservable(options.parent.a)).should_be(true);
					value_of(options.parent.a()).should_be("a");
				}
			}
		});
	},

	'ko.mapping.fromJS should send parent along to create callback when creating an array item': function() {
		var obj = {
			a: "a",
			b: [
				{ id: 1 },
				{ id: 2 }
			]
		};
		
		var numCreated = 0;
		var result = ko.mapping.fromJS(obj, {
			"b": {
				create: function(options) {
					value_of(ko.isObservable(options.parent)).should_be(true);
					value_of(options.parent() instanceof Array).should_be(true);
					numCreated++;
				}
			}
		});
		
		value_of(numCreated).should_be(2);
	},

	'ko.mapping.fromJS should update objects in arrays that were specified in the overriden model in the create callback': function () {
		var options = {
			create: function(options) {
				return ko.mapping.fromJS(options.data);
			}
		}
		
		var result = ko.mapping.fromJS([], options);
		ko.mapping.fromJS([{
			a: "a",
			b: "b"
		}], {}, result);

		value_of(ko.isObservable(result)).should_be(true);
		value_of(ko.isObservable(result()[0].a)).should_be(true);
		value_of(result()[0].a()).should_be("a");
		value_of(ko.isObservable(result()[0].b)).should_be(true);
		value_of(result()[0].b()).should_be("b");
	},
	
	'ko.mapping.fromJS should use the create callback to update objects in arrays': function () {
		var created = [];
		var arrayEvents = 0;
		
		var options = {
			key: function(item) { return ko.utils.unwrapObservable(item.id); },
			create: function(options) {
				created.push(options.data.id);
				return ko.mapping.fromJS(options.data);
			},
			arrayChanged: function(event, item) {
				arrayEvents++;
			}
		}
		
		var result = ko.mapping.fromJS([
			{ id: "a" }
		], options);
		
		ko.mapping.fromJS([
			{ id: "a" },
			{ id: "b" }
		], {}, result);

		value_of(created[0]).should_be("a");
		value_of(created[1]).should_be("b");
		value_of(result()[0].id()).should_be("a");
		value_of(result()[1].id()).should_be("b");
		value_of(arrayEvents).should_be(3); // added, retained, added
	},
	
	'ko.mapping.fromJS should not call the create callback for existing objects': function () {
		var numCreate = 0;
		var options = {
			create: function (model) {
				numCreate++;
				var overridenModel = {};
				return overridenModel;
			}
		};
		
		var items = [];
		var index = 0;
		var result = ko.mapping.fromJS({
			a: "hello"
		}, options);

		ko.mapping.fromJS({
			a: "bye"
		}, {}, result);

		value_of(numCreate).should_be(1);
	},

	'ko.mapping.fromJS should not overwrite the existing observable array': function () {
		var result = ko.mapping.fromJS({
			a: [1]
		});
		
		var resultA = result.a;

		ko.mapping.fromJS({
			a: [1]
		}, result);
		
		value_of(resultA).should_be(result.a);
	},

	'ko.mapping.fromJS should send an added callback for every array item that is added to a previously non-existent array': function () {
		var added = [];

		var options = {
			"a" : {
				arrayChanged: function (event, newValue) {
					if (event === "added") added.push(newValue);
				}
			}
		};
		var result = ko.mapping.fromJS({}, options);
		ko.mapping.fromJS({
			a: [1, 2]
		}, {}, result);
		value_of(added.length).should_be(2);
		value_of(added[0]).should_be(1);
		value_of(added[1]).should_be(2);
	},

	'ko.mapping.fromJS should send an added callback for every array item that is added to a previously empty array': function () {
		var added = [];

		var options = {
			"a": {
				arrayChanged: function (event, newValue) {
					if (event === "added") added.push(newValue);
				}
			}
		};
		var result = ko.mapping.fromJS({ a: [] }, options);
		ko.mapping.fromJS({
			a: [1, 2]
		}, {}, result);
		value_of(added.length).should_be(2);
		value_of(added[0]).should_be(1);
		value_of(added[1]).should_be(2);
	},

	'ko.mapping.fromJS should not make observable anything that is not in the js object': function () {
		var result = ko.mapping.fromJS({});
		result.a = "a";
		value_of(ko.isObservable(result.a)).should_be(false);
		
		ko.mapping.fromJS({
			b: "b"
		}, {}, result);
		
		value_of(ko.isObservable(result.a)).should_be(false);
		value_of(ko.isObservable(result.b)).should_be(true);
		value_of(result.a).should_be("a");
		value_of(result.b()).should_be("b");
	},
	
	'ko.mapping.fromJS should not make observable anything that is not in the js object when overriding the model': function () {
		var options = {
			create: function(model) {
				return {
					a: "a"
				}
			}
		};
	
		var result = ko.mapping.fromJS({}, options);
		ko.mapping.fromJS({
			b: "b"
		}, {}, result);
		
		value_of(ko.isObservable(result.a)).should_be(false);
		value_of(ko.isObservable(result.b)).should_be(true);
		value_of(result.a).should_be("a");
		value_of(result.b()).should_be("b");
	},
	
	'ko.mapping.fromJS should send an added callback for every array item that is added': function () {
		var added = [];

		var options = {
			"a": {
				arrayChanged: function (event, newValue) {
					if (event === "added") added.push(newValue);
				}
			}
		};
		var result = ko.mapping.fromJS({
			a: []
		}, options);
		ko.mapping.fromJS({
			a: [1, 2]
		}, {}, result);
		value_of(added.length).should_be(2);
		value_of(added[0]).should_be(1);
		value_of(added[1]).should_be(2);
	},

	'ko.mapping.fromJS should send an added callback for every array item that is added': function () {
		var added = [];

		var result = ko.mapping.fromJS({
			a: [1, 2]
		}, {
			"a": {
				arrayChanged: function (event, newValue) {
					if (event === "added") added.push(newValue);
				}
			}
		});
		value_of(added.length).should_be(2);
		value_of(added[0]).should_be(1);
		value_of(added[1]).should_be(2);
	},

	'ko.mapping.fromJSON should parse and then map in the same way': function () {
		var jsonString = ko.utils.stringifyJson({ // Note that "undefined" property values are omitted by the stringifier, so not testing those
			a: {
				a1: 'a1value',
				a2: {
					a21: 'a21value',
					a22: 'a22value'
				}
			},
			b: {
				b1: null
			}
		});
		var result = ko.mapping.fromJSON(jsonString);
		value_of(result.a.a1()).should_be('a1value');
		value_of(result.a.a2.a21()).should_be('a21value');
		value_of(result.a.a2.a22()).should_be('a22value');
		value_of(result.b.b1()).should_be(null);
	},

	'ko.mapping.fromJS should be able to map empty object structures': function () {
		var obj = {
			someProp: undefined,
			a: []
		};
		var result = ko.mapping.fromJS(obj);
		value_of(ko.isObservable(result.someProp)).should_be(true);
		value_of(ko.isObservable(result.a)).should_be(true);
		value_of(ko.isObservable(result.unknownProperty)).should_be(false);
	},

	'ko.mapping.fromJS should send create callbacks when atomic items are constructed': function () {
		var atomicValues = ["hello", 123, true, null, undefined];
		var callbacksReceived = 0;
		for (var i = 0; i < atomicValues.length; i++) {
			var result = ko.mapping.fromJS(atomicValues[i], {
				create: function (item) {
					callbacksReceived++;
					return item;
				}
			});
		}
		value_of(callbacksReceived).should_be(5);
	},

	'ko.mapping.fromJS should send callbacks when atomic array elements are constructed': function () {
		var oldItems = {
			array: []
		};
		var newItems = {
			array: [{
				id: 1
			},
			{
				id: 2
			}]
		};

		var items = [];
		var result = ko.mapping.fromJS(oldItems, {
			"array": {
				arrayChanged: function (event, item) {
					if (event == "added")
						items.push(item);
				}
			}
		});
		ko.mapping.fromJS(newItems, {}, result);
		value_of(items.length).should_be(2);
	},

	'ko.mapping.fromJS should not send callbacks containing parent names when descendant objects are constructed': function () {
		var obj = {
			a: {
				a1: "hello",
				a2: 234,
				a3: {
					a31: null
				}
			}
		};
		var parents = [];
		var pushParent = function (item, parent) {
			parents.push(parent);
			return item;
		};
		var result = ko.mapping.fromJS(obj, {
			create: pushParent
		});
		value_of(parents.length).should_be(1);
		value_of(parents[0]).should_be(undefined);
	},

	'ko.mapping.fromJS should create instead of update, on empty objects': function () {
		var obj = {
			a: ["a1", "a2"]
		};

		var result;
		result = ko.mapping.fromJS({});
		ko.mapping.fromJS(obj, {}, result);
		value_of(result.a().length).should_be(2);
		value_of(result.a()[0]).should_be("a1");
		value_of(result.a()[1]).should_be("a2");
	},

	'ko.mapping.fromJS should update atomic observables': function () {
		var atomicValues = ["hello", 123, true, null, undefined];
		var atomicValues2 = ["hello2", 124, false, "not null", "defined"];

		for (var i = 0; i < atomicValues.length; i++) {
			var result = ko.mapping.fromJS(atomicValues[i]);
			ko.mapping.fromJS(atomicValues2[i], {}, result);
			value_of(ko.isObservable(result)).should_be(true);
			value_of(result()).should_be(atomicValues2[i]);
		}
	},

	'ko.mapping.fromJS should update objects': function () {
		var obj = {
			a: "prop",
			b: {
				b1: null,
				b2: "b2"
			}
		}

		var obj2 = {
			a: "prop2",
			b: {
				b1: 124,
				b2: "b22"
			}
		}

		var result = ko.mapping.fromJS(obj);
		ko.mapping.fromJS(obj2, {}, result);
		value_of(result.a()).should_be("prop2");
		value_of(result.b.b1()).should_be(124);
		value_of(result.b.b2()).should_be("b22");
	},

	'ko.mapping.fromJS should update initially empty objects': function () {
		var obj = {
			a: undefined,
			b: []
		}

		var obj2 = {
			a: "prop2",
			b: ["b1", "b2"]
		}

		var result = ko.mapping.fromJS(obj);
		ko.mapping.fromJS(obj2, {}, result);
		value_of(result.a()).should_be("prop2");
		value_of(result.b()).should_include("b1");
		value_of(result.b()).should_include("b2");
	},

	'ko.mapping.fromJS should update arrays containing atomic types': function () {
		var obj = ["a1", "a2", 6];
		var obj2 = ["a3", "a4", 7];

		var result = ko.mapping.fromJS(obj);

		ko.mapping.fromJS(obj2, {}, result);
		value_of(result().length).should_be(3);
		value_of(result()).should_include("a3");
		value_of(result()).should_include("a4");
		value_of(result()).should_include(7);
	},

	'ko.mapping.fromJS should update arrays containing objects': function () {
		var obj = {
			a: [{
				id: 1,
				value: "a1"
			},
			{
				id: 2,
				value: "a2"
			}]
		}

		var obj2 = {
			a: [{
				id: 1,
				value: "a1"
			},
			{
				id: 3,
				value: "a3"
			}]
		}

		var options = {
			"a": {
				key: function (item) {
					return item.id;
				}
			}
		};
		var result = ko.mapping.fromJS(obj, options);

		ko.mapping.fromJS(obj2, {}, result);
		value_of(result.a().length).should_be(2);
		value_of(result.a()[0].value()).should_be("a1");
		value_of(result.a()[1].value()).should_be("a3");
	},

	'ko.mapping.fromJS should escape from reference cycles': function () {
		var obj = {};
		obj.owner = obj;
		var result = ko.mapping.fromJS(obj);
		ko.mapping.fromJS(obj, {}, result);
		value_of(result.owner).should_be(result);
	},

	'ko.mapping.fromJS should send a callback when adding new objects to an array': function () {
		var obj = [{
			id: 1
		}];
		var obj2 = [{
			id: 1
		},
		{
			id: 2
		}];

		var mappedItems = [];

		var options = {
			key: function(item) {
				return item.id;
			},
			arrayChanged: function (event, item) {
				if (event == "added") mappedItems.push(item);
			}
		};
		var result = ko.mapping.fromJS(obj, options);
		ko.mapping.fromJS(obj2, {}, result);
		value_of(mappedItems.length).should_be(2);
		value_of(mappedItems[0].id()).should_be(1);
		value_of(mappedItems[1].id()).should_be(2);
	},

	'ko.mapping.fromJS should be able to update from an observable source': function () {
		var obj = [{
			id: 1
		}];
		var obj2 = ko.mapping.fromJS([{
			id: 1
		},
		{
			id: 2
		}]);

		var result = ko.mapping.fromJS(obj);
		ko.mapping.fromJS(obj2, {}, result);
		value_of(result().length).should_be(2);
		value_of(result()[0].id()).should_be(1);
		value_of(result()[1].id()).should_be(2);
	},

	'ko.mapping.fromJS should send a deleted callback when an item was deleted from an array': function () {
		var obj = [1, 2];
		var obj2 = [1];

		var items = [];

		var options = {
			arrayChanged: function (event, item) {
				if (event == "deleted") items.push(item);
			}
		};
		var result = ko.mapping.fromJS(obj, options);
		ko.mapping.fromJS(obj2, {}, result);
		value_of(items.length).should_be(1);
		value_of(items[0]).should_be(2);
	},
	
	'ko.mapping.fromJS should reuse options that were added in ko.mapping.fromJS': function() {
		var viewModelMapping = {
			key: function(data) {
				return ko.utils.unwrapObservable(data.id);
			},
			create: function(options) {
				return new viewModel(options);
			}
		};
		
		var viewModel = function(options) {
			var mapping = {
				entries: viewModelMapping
			};

			ko.mapping.fromJS(options.data, mapping, this);

			this.func = function() { return true; };
		};
		
        var model = ko.mapping.fromJS([], viewModelMapping);
		
        var data = [{
			"id": 1,
			"entries": [{
				"id": 2,
				"entries": [{
					"id": 3,
					"entries": []
				}]
			}]
        }];
		
		ko.mapping.fromJS(data, {}, model);
		ko.mapping.fromJS(data, {}, model);
		
		value_of(model()[0].func()).should_be(true);
		value_of(model()[0].entries()[0].func()).should_be(true);
		value_of(model()[0].entries()[0].entries()[0].func()).should_be(true);
	},
	
	'ko.mapping.toJS should not change the mapped object': function() {
		var obj = {
			a: "a"
		}
		
		var result = ko.mapping.fromJS(obj);
		result.b = ko.observable(123);
		var toJS = ko.mapping.toJS(result);
		
		value_of(ko.isObservable(result.b)).should_be(true);
		value_of(result.b()).should_be(123);
		value_of(toJS.b).should_be(undefined);
	},
	
	'ko.mapping.toJS should not change the mapped array': function() {
		var obj = [{
			a: 50
		}]
		
		var result = ko.mapping.fromJS(obj);
		result()[0].b = ko.observable(123);
		var toJS = ko.mapping.toJS(result);
		
		value_of(ko.isObservable(result()[0].b)).should_be(true);
		value_of(result()[0].b()).should_be(123);
	},

	'observableArray.mappedRemove should use key callback if available': function() {
		var obj = [
			{ id : 1 },
			{ id : 2 }
		]
		
		var result = ko.mapping.fromJS(obj, {
			key: function(item) {
				return ko.utils.unwrapObservable(item.id);
			}
		});
		result.mappedRemove({ id : 2 });
		value_of(result().length).should_be(1);
	},
	
	'observableArray.mappedRemove with predicate should use key callback if available': function() {
		var obj = [
			{ id : 1 },
			{ id : 2 }
		]
		
		var result = ko.mapping.fromJS(obj, {
			key: function(item) {
				return ko.utils.unwrapObservable(item.id);
			}
		});
		result.mappedRemove(function(key) {
			return key == 2;
		});
		value_of(result().length).should_be(1);
	},
	
	'observableArray.mappedRemoveAll should use key callback if available': function() {
		var obj = [
			{ id : 1 },
			{ id : 2 }
		]
		
		var result = ko.mapping.fromJS(obj, {
			key: function(item) {
				return ko.utils.unwrapObservable(item.id);
			}
		});
		result.mappedRemoveAll([{ id : 2 }]);
		value_of(result().length).should_be(1);
	},
	
	'observableArray.mappedDestroy should use key callback if available': function() {
		var obj = [
			{ id : 1 },
			{ id : 2 }
		]
		
		var result = ko.mapping.fromJS(obj, {
			key: function(item) {
				return ko.utils.unwrapObservable(item.id);
			}
		});
		result.mappedDestroy({ id : 2 });
		value_of(result()[0]._destroy).should_be(undefined);
		value_of(result()[1]._destroy).should_be(true);
	},
	
	'observableArray.mappedDestroy with predicate should use key callback if available': function() {
		var obj = [
			{ id : 1 },
			{ id : 2 }
		]
		
		var result = ko.mapping.fromJS(obj, {
			key: function(item) {
				return ko.utils.unwrapObservable(item.id);
			}
		});
		result.mappedDestroy(function(key) {
			return key == 2;
		});
		value_of(result()[0]._destroy).should_be(undefined);
		value_of(result()[1]._destroy).should_be(true);
	},
		
	'observableArray.mappedDestroyAll should use key callback if available': function() {
		var obj = [
			{ id : 1 },
			{ id : 2 }
		]
		
		var result = ko.mapping.fromJS(obj, {
			key: function(item) {
				return ko.utils.unwrapObservable(item.id);
			}
		});
		result.mappedDestroyAll([{ id : 2 }]);
		value_of(result()[0]._destroy).should_be(undefined);
		value_of(result()[1]._destroy).should_be(true);
	},
	
	'observableArray.mappedIndexOf should use key callback if available': function() {
		var obj = [
			{ id : 1 },
			{ id : 2 }
		]
		
		var result = ko.mapping.fromJS(obj, {
			key: function(item) {
				return ko.utils.unwrapObservable(item.id);
			}
		});
		value_of(result.mappedIndexOf({ id : 1 })).should_be(0);
		value_of(result.mappedIndexOf({ id : 2 })).should_be(1);
		value_of(result.mappedIndexOf({ id : 3 })).should_be(-1);
	},
	
	'observableArray.mappedCreate should use key callback if available and not allow duplicates': function() {
		var obj = [
			{ id : 1 },
			{ id : 2 }
		]
		
		var result = ko.mapping.fromJS(obj, {
			key: function(item) {
				return ko.utils.unwrapObservable(item.id);
			}
		});		
		
		var caught = false;
		try {
			result.mappedCreate({ id : 1 });
		}		
		catch(e) {
			caught = true;
		}
		
		value_of(caught).should_be(true);
		value_of(result().length).should_be(2);	
	},

	'observableArray.mappedCreate should use create callback if available': function() {
		var obj = [ 
			{ id : 1 },
			{ id : 2 }
		]
		
		var childModel = function(data){			
			ko.mapping.fromJS(data, {}, this);
			this.Hello = ko.observable("hello");
		}
		
		var result = ko.mapping.fromJS(obj, {
			key: function(item) {
				return ko.utils.unwrapObservable(item.id);
			},
			create: function(options){
				return new childModel(options.data);
			}
		});
				
		result.mappedCreate({ id: 3 });
		var index = result.mappedIndexOf({ id : 3 });
		value_of(index).should_be(2);				
		value_of(result()[index].Hello()).should_be("hello");
	},

    'observableArray.mappedCreate should use update callback if available': function() {
        var obj = [
            { id : 1 },
            { id : 2 }
        ]

        var childModel = function(data){
            ko.mapping.fromJS(data, {}, this);
        }

        var result = ko.mapping.fromJS(obj, {
            key: function(item) {
                return ko.utils.unwrapObservable(item.id);
            },
            create: function(options){
                return new childModel(options.data);
            },
            update: function(obj, options){
                return {
                    bla: obj.id() * 10
                };
            }
        });

        result.mappedCreate({ id: 3 });
        value_of(result()[0].bla).should_be(10);
        value_of(result()[2].bla).should_be(30);
    },

	'ko.mapping.fromJS should merge options from subsequent calls': function() {
		var obj = ['a'];
		
		var result = ko.mapping.fromJS(obj, { dummyOption1: 1 });
		ko.mapping.fromJS({}, { dummyOption2: 2 }, result);
		
		value_of(result.__ko_mapping__.dummyOption1).should_be(1);
		value_of(result.__ko_mapping__.dummyOption2).should_be(2);
	},

	'ko.mapping.fromJS should correctly handle falsey values': function () {
		var obj = [false, ""];

		var result = ko.mapping.fromJS(obj);
		
		value_of(result()[0] === false).should_be(true);
		value_of(result()[1] === "").should_be(true);
	},

	'ko.mapping.fromJS should correctly handle falsey values in keys': function () {
		var created = [];
		var gotDeletedEvent = false;
		
		var options = {
			key: function(item) { return ko.utils.unwrapObservable(item.id); },
			arrayChanged: function(event, item) {
				if (event === "deleted") gotDeletedEvent = true;
			}
		}
		
		var result = ko.mapping.fromJS([
			{ id: 0 }
		], options);
		
		ko.mapping.fromJS([
			{ id: 0 },
			{ id: 1 }
		], {}, result);
		
		value_of(gotDeletedEvent).should_be(false);
	},
	
	'ko.mapping.fromJS should allow duplicate atomic items in arrays': function () {
		var result = ko.mapping.fromJS([
			"1", "1", "2"
		]);
		
		value_of(result().length).should_be(3);
		value_of(result()[0]).should_be("1");
		value_of(result()[1]).should_be("1");
		value_of(result()[2]).should_be("2");
		
		ko.mapping.fromJS([
			"1", "1", "1", "2"
		], {}, result);
		
		value_of(result().length).should_be(4);
		value_of(result()[0]).should_be("1");
		value_of(result()[1]).should_be("1");
		value_of(result()[2]).should_be("1");
		value_of(result()[3]).should_be("2");
	},

	'when doing ko.mapping.fromJS on an already mapped object, the new options should combine with the old': function() {
		var dataA = {
			a: "a"
		};
		var dataB = {
			b: "b"
		};
		
		var mapped = {};
		ko.mapping.fromJS(dataA, {}, mapped);
		ko.mapping.fromJS(dataB, {}, mapped);
		value_of(mapped.__ko_mapping__.mappedProperties.a).should_be(true);
		value_of(mapped.__ko_mapping__.mappedProperties.b).should_be(true);
	},
	
	'ko.mapping.fromJS should merge options from subsequent calls': function() {
		var obj = ['a'];
		
		var result = ko.mapping.fromJS(obj, { dummyOption1: 1 });
		ko.mapping.fromJS(['b'], { dummyOption2: 2 }, result);
		
		value_of(result.__ko_mapping__.dummyOption1).should_be(1);
		value_of(result.__ko_mapping__.dummyOption2).should_be(2);
	},

	'ko.mapping.fromJS should work on unmapped objects': function() {
		var obj = ko.observableArray(['a']);
		
		ko.mapping.fromJS(['b'], {}, obj);
		
		value_of(obj()[0]).should_be('b');
	},
	
	'ko.mapping.fromJSON should merge options from subsequent calls': function() {
		var obj = ['a'];
		
		var result = ko.mapping.fromJS(obj, { dummyOption1: 1 });
		ko.mapping.fromJSON('["b"]', { dummyOption2: 2 }, result);
		
		value_of(result.__ko_mapping__.dummyOption1).should_be(1);
		value_of(result.__ko_mapping__.dummyOption2).should_be(2);
	},
	
	'ko.mapping.fromJS should be able to update observables not created by fromJS': function() {
		var existing = {
			a: ko.observable(),
			d: ko.observableArray()
		};
		
		ko.mapping.fromJS({
			a: {
				b: "b!"
			},
			d: [2]
		}, {}, existing);
		
		value_of(existing.a().b()).should_be("b!");
		value_of(existing.d().length).should_be(1);
		value_of(existing.d()[0]).should_be(2);
	},

    'ko.mapping.fromJS should accept an already mapped object as the second parameter': function() {
        var mapped = ko.mapping.fromJS({ a: "a" });
        ko.mapping.fromJS({ a: "b" }, mapped);
        value_of(mapped.a()).should_be("b");
    }
});

