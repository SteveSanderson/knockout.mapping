var mockPush = function (result) {
	var originalPush = result.push;

	var pushed = [];
	result.push = function (value) {
		pushed.push(value);
		return originalPush(value);
	}
	return pushed;
}

var mockRemove = function (result) {
	var originalRemove = result.remove;

	var removed = [];
	result.remove = function (valueOrPredicate) {
		removed.push(valueOrPredicate);
		return originalRemove(valueOrPredicate);
	}
	return removed;
}

describe('Mapping', {

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
			created: {
				"": function(model) {
					return {
						myFunc: function() {
							return 123;
						}
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
			created: {
				"": function(model) {
					return {
						a: {
							a1: "a1"
						}
					};
				}
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
			created: {
				"": function(model) {
					return {
						a: new dummyObject({
							a1: "Hello"
						})
					};
				}
			}
		});
		value_of(ko.isObservable(result.a)).should_be(false);
		value_of(ko.isObservable(result.a.a1)).should_be(false);
		value_of(result.a.a1).should_be('Hello');
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
			created: {
				"": function (model) {
					index++;
					return model;
				}
			}
		});
		value_of(index).should_be(1);
	},

	'ko.mapping.updateFromJS should not overwrite objects in arrays that were specified in the overriden model in the create callback': function () {
		var options = {
			created: {
				"": function(model) {
					var overridenModel = {
						a: ""
					};
					return overridenModel;
				}
			}
		}
		
		var result = ko.mapping.fromJS([], options);
		ko.mapping.updateFromJS(result, [{
			a: "a",
			b: "b"
		}]);

		value_of(ko.isObservable(result)).should_be(true);
		value_of(ko.isObservable(result()[0].a)).should_be(false);
		value_of(result()[0].a).should_be("");
		value_of(ko.isObservable(result()[0].b)).should_be(true);
		value_of(result()[0].b()).should_be("b");
	},

	'ko.mapping.fromJS should not overwrite objects that were specified in the overriden model in the create callback': function () {
		var items = [];
		var index = 0;
		var result = ko.mapping.fromJS({
			a: "a",
			b: "b"
		}, {
			created: {
				"": function (model) {
					var overridenModel = {
						a: ""
					};
					return overridenModel;
				}
			}
		});
		value_of(ko.isObservable(result.a)).should_be(false);
		value_of(result.a).should_be("");
		value_of(ko.isObservable(result.b)).should_be(true);
		value_of(result.b()).should_be("b");
	},
	
	'ko.mapping.updateFromJS fails on objects that were not first mapped using fromJS': function() {
		var result;
		var didThrow = false;
		try {
			ko.mapping.updateFromJS(result, {
				a: "hello"
			});
		}
		catch (ex) {
			didThrow = true
		}
		value_of(didThrow).should_be(true);
	},

	'ko.mapping.updateFromJS should not call the create callback for existing objects': function () {
		var numCreate = 0;
		var options = {
			created: {
				"": function (model) {
					numCreate++;
					var overridenModel = {};
					return overridenModel;
				}
			}
		};
		
		var items = [];
		var index = 0;
		var result = ko.mapping.fromJS({
			a: "hello"
		}, options);

		ko.mapping.updateFromJS(result, {
			a: "bye"
		});

		value_of(numCreate).should_be(1);
	},

	'ko.mapping.updateFromJS should not overwrite the existing observable array': function () {
		var result = ko.mapping.fromJS({
			a: [1]
		});
		
		var resultA = result.a;

		ko.mapping.updateFromJS(result, {
			a: [1]
		});
		
		value_of(resultA).should_be(result.a);
	},

	'ko.mapping.updateFromJS should update observable arrays that were created in the create callback': function () {
		var items = [];
		var index = 0;
		
		var options = {
			created: {
				"": function (model) {
					var overridenModel = {
						data: {
							a: ko.observableArray([])
						}
					}
					return overridenModel;
				}
			},
			subscriptions: {
				"data.a": function(event, item) {
					if (event == "added")
						items.push(item);
				}
			}
		};
		
		var result = ko.mapping.fromJS({
			data: undefined
		}, options);

		value_of(ko.isObservable(result.data.a)).should_be(true);
		
		ko.mapping.updateFromJS(result, {
			data: {
				a: [1, 2]
			}
		});

		value_of(items.length).should_be(2);
		value_of(ko.isObservable(result.data.a)).should_be(true);
		value_of(result.data.a()).should_be([1, 2]);
	},

	'ko.mapping.updateFromJS should send an added callback for every array item that is added to a previously non-existent array': function () {
		var added = [];

		var options = {
			subscriptions: {
				"a": function (event, newValue) {
					if (event === "added") added.push(newValue);
				}
			}
		};
		var result = ko.mapping.fromJS({}, options);
		ko.mapping.updateFromJS(result, {
			a: [1, 2]
		});
		value_of(added.length).should_be(2);
		value_of(added[0]).should_be(1);
		value_of(added[1]).should_be(2);
	},

	'ko.mapping.updateFromJS should send an added callback for every array item that is added to a previously empty array': function () {
		var added = [];

		var options = {
			subscriptions: {
				"a": function (event, newValue) {
					if (event === "added") added.push(newValue);
				}
			}
		};
		var result = ko.mapping.fromJS({ a: [] }, options);
		ko.mapping.updateFromJS(result, {
			a: [1, 2]
		});
		value_of(added.length).should_be(2);
		value_of(added[0]).should_be(1);
		value_of(added[1]).should_be(2);
	},

	'ko.mapping.updateFromJS should not make observable anything that is not in the js object': function () {
		var result = ko.mapping.fromJS({});
		result.a = "a";
		ko.mapping.updateFromJS(result, {
			b: "b"
		});
		
		value_of(ko.isObservable(result.a)).should_be(false);
		value_of(ko.isObservable(result.b)).should_be(true);
		value_of(result.a).should_be("a");
		value_of(result.b()).should_be("b");
	},
	
	'ko.mapping.updateFromJS should not make observable anything that is not in the js object when overriding the model': function () {
		var options = {
			created: {
				"": function(model) {
					return {
						a: "a"
					}
				}
			}
		};
	
		var result = ko.mapping.fromJS({}, options);
		ko.mapping.updateFromJS(result, {
			b: "b"
		});
		
		value_of(ko.isObservable(result.a)).should_be(false);
		value_of(ko.isObservable(result.b)).should_be(true);
		value_of(result.a).should_be("a");
		value_of(result.b()).should_be("b");
	},
	
	'ko.mapping.updateFromJS should send an added callback for every array item that is added': function () {
		var added = [];

		var options = {
			subscriptions: {
				"a": function (event, newValue) {
					if (event === "added") added.push(newValue);
				}
			}
		};
		var result = ko.mapping.fromJS({
			a: []
		}, options);
		ko.mapping.updateFromJS(result, {
			a: [1, 2]
		});
		value_of(added.length).should_be(2);
		value_of(added[0]).should_be(1);
		value_of(added[1]).should_be(2);
	},

	'ko.mapping.fromJS should send an added callback for every array item that is added': function () {
		var added = [];

		var result = ko.mapping.fromJS({
			a: [1, 2]
		}, {
			subscriptions: {
				"a": function (event, newValue) {
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

	'ko.mapping.fromJS should not send create callbacks when atomic items are constructed': function () {
		var atomicValues = ["hello", 123, true, null, undefined];
		var callbacksReceived = 0;
		for (var i = 0; i < atomicValues.length; i++) {
			var result = ko.mapping.fromJS(atomicValues[i], {
				created: {
					"": function (item) {
						callbacksReceived++;
						return item;
					}
				}
			});
		}
		value_of(callbacksReceived).should_be(0);
	},

	'ko.mapping.updateFromJS should send callbacks when atomic array elements are constructed': function () {
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
			subscriptions: {
				"array": function (event, item) {
					if (event == "added")
						items.push(item);
				}
			}
		});
		ko.mapping.updateFromJS(result, newItems);
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
			created: {
				"": pushParent,
				"a": pushParent,
				"a.a1": pushParent,
				"a.a2": pushParent,
				"a.a3": pushParent,
				"a.a3.a31": pushParent
			}
		});
		value_of(parents.length).should_be(1);
		value_of(parents[0]).should_be("");
	},

	'ko.mapping.fromJS should send callbacks containing parent names when descendant objects are not constructed': function () {
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
			//return item;
		};
		var result = ko.mapping.fromJS(obj, {
			created: {
				"": pushParent,
				"a": pushParent,
				"a.a1": pushParent,
				"a.a2": pushParent,
				"a.a3": pushParent,
				"a.a3.a31": pushParent
			}
		});
		value_of(parents.length).should_be(3);
		value_of(parents[0]).should_be("");
		value_of(parents[1]).should_be("a");
		value_of(parents[2]).should_be("a.a3");
	},

	'ko.mapping.updateFromJS should create instead of update, on empty objects': function () {
		var obj = {
			a: ["a1", "a2"]
		};

		var result;
		result = ko.mapping.fromJS({});
		ko.mapping.updateFromJS(result, obj);
		value_of(result.a().length).should_be(2);
		value_of(result.a()[0]).should_be("a1");
		value_of(result.a()[1]).should_be("a2");
	},

	'ko.mapping.updateFromJS should update atomic observables': function () {
		var atomicValues = ["hello", 123, true, null, undefined];
		var atomicValues2 = ["hello2", 124, false, "not null", "defined"];

		for (var i = 0; i < atomicValues.length; i++) {
			var result = ko.mapping.fromJS(atomicValues[i]);
			ko.mapping.updateFromJS(result, atomicValues2[i]);
			value_of(ko.isObservable(result)).should_be(true);
			value_of(result()).should_be(atomicValues2[i]);
		}
	},

	'ko.mapping.updateFromJS should update objects': function () {
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
		ko.mapping.updateFromJS(result, obj2);
		value_of(result.a()).should_be("prop2");
		value_of(result.b.b1()).should_be(124);
		value_of(result.b.b2()).should_be("b22");
	},

	'ko.mapping.updateFromJS should update initially empty objects': function () {
		var obj = {
			a: undefined,
			b: []
		}

		var obj2 = {
			a: "prop2",
			b: ["b1", "b2"]
		}

		var result = ko.mapping.fromJS(obj);
		ko.mapping.updateFromJS(result, obj2);
		value_of(result.a()).should_be("prop2");
		value_of(result.b()).should_include("b1");
		value_of(result.b()).should_include("b2");
	},

	'ko.mapping.updateFromJS should update arrays containing atomic types': function () {
		var obj = ["a1", "a2", 6];
		var obj2 = ["a3", "a4", 7];

		var result = ko.mapping.fromJS(obj);
		pushed = mockPush(result);
		removed = mockRemove(result);

		ko.mapping.updateFromJS(result, obj2);
		value_of(result().length).should_be(3);
		value_of(pushed.length).should_be(3);
		value_of(removed.length).should_be(3);
		value_of(result()).should_include("a3");
		value_of(result()).should_include("a4");
		value_of(result()).should_include(7);
	},

	'ko.mapping.updateFromJS should update arrays containing objects': function () {
		var pushed = [];
		var removed = [];

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
			keys: {
				"a": function (item) {
					return item.id;
				}
			}
		};
		var result = ko.mapping.fromJS(obj, options);
		pushed = mockPush(result.a);
		removed = mockRemove(result.a);

		ko.mapping.updateFromJS(result, obj2);
		value_of(result.a().length).should_be(2);
		value_of(pushed.length).should_be(1);
		value_of(removed.length).should_be(1);
		value_of(result.a()[0].value()).should_be("a1");
		value_of(result.a()[1].value()).should_be("a3");
	},

	'ko.mapping.updateFromJS should escape from reference cycles': function () {
		var obj = {};
		obj.owner = obj;
		var result = ko.mapping.fromJS(obj);
		ko.mapping.updateFromJS(result, obj);
		value_of(result.owner).should_be(result);
	},

	'ko.mapping.updateFromJS should send a callback when adding new objects to an array': function () {
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
			keys: {
				"": function (item) {
					return item.id;
				}
			},
			subscriptions: {
				"": function (event, item) {
					if (event == "added") mappedItems.push(item);
				}
			}
		};
		var result = ko.mapping.fromJS(obj, options);
		ko.mapping.updateFromJS(result, obj2);
		value_of(mappedItems.length).should_be(2);
		value_of(mappedItems[0].id()).should_be(1);
		value_of(mappedItems[1].id()).should_be(2);
	},

	'ko.mapping.updateFromJS should be able to update from an observable source': function () {
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
		ko.mapping.updateFromJS(result, obj2);
		value_of(result().length).should_be(2);
		value_of(result()[0].id()).should_be(1);
		value_of(result()[1].id()).should_be(2);
	},

	'ko.mapping.updateFromJS should send a deleted callback when an item was deleted from an array': function () {
		var obj = [1, 2];
		var obj2 = [1];

		var items = [];

		var options = {
			subscriptions: {
				"": function (event, item) {
					if (event == "deleted") items.push(item);
				}
			}
		};
		var result = ko.mapping.fromJS(obj, options);
		ko.mapping.updateFromJS(result, obj2);
		value_of(items.length).should_be(1);
		value_of(items[0]).should_be(2);
	},

})