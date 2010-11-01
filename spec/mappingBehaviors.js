
var mockPush = function(result) {
	var originalPush = result.push;

	var pushed = [];
	result.push = function (value) {
		pushed.push(value);
		return originalPush(value);
	}
	return pushed;
}

var mockRemove = function(result) {		
	var originalRemove = result.remove;
		
	var removed = [];
	result.remove = function (valueOrPredicate) {
		removed.push(valueOrPredicate);
		return originalRemove(valueOrPredicate);
	}
	return removed;
}

describe('Mapping', {

    'ko.mapping.toJS should unwrap observable values': function() {
        var atomicValues = ["hello", 123, true, null, undefined, { a : 1 }];
        for (var i = 0; i < atomicValues.length; i++) {
            var data = ko.observable(atomicValues[i]);
            var result = ko.mapping.toJS(data);
            value_of(ko.isObservable(result)).should_be(false);
            value_of(result).should_be(atomicValues[i]);
        }
    },
    
    'ko.mapping.toJS should unwrap observable properties, including nested ones': function() {
        var data = {
            a : ko.observable(123),
            b : {
                b1 : ko.observable(456),
                b2 : 789
            }
        };
        var result = ko.mapping.toJS(data);
        value_of(result.a).should_be(123);
        value_of(result.b.b1).should_be(456);
        value_of(result.b.b2).should_be(789);
    },
    
    'ko.mapping.toJS should unwrap observable arrays and things inside them': function() {
        var data = ko.observableArray(['a', 1, { someProp : ko.observable('Hey') }]);
        var result = ko.mapping.toJS(data);
        value_of(result.length).should_be(3);
        value_of(result[0]).should_be('a');
        value_of(result[1]).should_be(1);
        value_of(result[2].someProp).should_be('Hey');
    },
    
    'ko.mapping.toJSON should unwrap everything and then stringify': function() {
        var data = ko.observableArray(['a', 1, { someProp : ko.observable('Hey') }]);	
        var result = ko.mapping.toJSON(data);
        
        // Check via parsing so the specs are independent of browser-specific JSON string formatting
        value_of(typeof result).should_be('string');
        var parsedResult = ko.utils.parseJson(result);
        value_of(parsedResult.length).should_be(3);
        value_of(parsedResult[0]).should_be('a');
        value_of(parsedResult[1]).should_be(1);
        value_of(parsedResult[2].someProp).should_be('Hey');		
    },
	
    'ko.mapping.fromJS should require a parameter': function() {
        var didThrow = false;
        try { ko.mapping.fromJS() }
        catch(ex) { didThow = true }    	
        value_of(didThow).should_be(true);
    },
    
    'ko.mapping.fromJS should return an observable if you supply an atomic value': function() {
        var atomicValues = ["hello", 123, true, null, undefined];
        for (var i = 0; i < atomicValues.length; i++) {
            var result = ko.mapping.fromJS(atomicValues[i]);
            value_of(ko.isObservable(result)).should_be(true);
            value_of(result()).should_be(atomicValues[i]);
        }
    },
    
    'ko.mapping.fromJS should return an observableArray if you supply an array, but should not wrap its entries in further observables': function() {
        var sampleArray = ["a", "b"];
        var result = ko.mapping.fromJS(sampleArray);
        value_of(typeof result.destroyAll).should_be('function'); // Just an example of a function on ko.observableArray but not on Array
        value_of(result().length).should_be(2);
        value_of(result()[0]).should_be("a");
        value_of(result()[1]).should_be("b");
    },    
    
    'ko.mapping.fromJS should not return an observable if you supply an object that could have properties': function() {
        value_of(ko.isObservable(ko.mapping.fromJS({}))).should_be(false);
    },    
    
    'ko.mapping.fromJS should map the top-level properties on the supplied object as observables': function() {
        var result = ko.mapping.fromJS({ a : 123, b : 'Hello', c : true });
        value_of(ko.isObservable(result.a)).should_be(true);
        value_of(ko.isObservable(result.b)).should_be(true);
        value_of(ko.isObservable(result.c)).should_be(true);
        value_of(result.a()).should_be(123);
        value_of(result.b()).should_be('Hello');
        value_of(result.c()).should_be(true);
    },
    
    'ko.mapping.fromJS should map descendant properties on the supplied object as observables': function() {
        var result = ko.mapping.fromJS({ 
            a : { 
                a1 : 'a1value',
                a2 : {
                    a21 : 'a21value',
                    a22 : 'a22value'
                }
            }, 
            b : { b1 : null, b2 : undefined }
        });
        value_of(result.a.a1()).should_be('a1value');
        value_of(result.a.a2.a21()).should_be('a21value');
        value_of(result.a.a2.a22()).should_be('a22value');
        value_of(result.b.b1()).should_be(null);
        value_of(result.b.b2()).should_be(undefined);
    },
    
    'ko.mapping.fromJS should map observable properties, but without adding a further observable wrapper': function() {
        var result = ko.mapping.fromJS({ a : ko.observable('Hey') });
        value_of(result.a()).should_be('Hey');    	
    },
    
    'ko.mapping.fromJS should escape from reference cycles': function() {
        var obj = {};
        obj.someProp = { owner : obj };
        var result = ko.mapping.fromJS(obj);
        value_of(result.someProp.owner).should_be(result);
    },

    'ko.mapping.fromJS should send relevant create callbacks': function() {
		var items = [];
		var index = 0;
        var result = ko.mapping.fromJS({ a: [1, 2] }, {
			create: function(model, parent) {
				switch (index++) {
					case 0:
						value_of(parent).should_be(undefined);
						value_of(ko.isObservable(model)).should_be(false);
						break;
					case 1:
						value_of(parent).should_be("a");
						value_of(ko.isObservable(model)).should_be(true);
						break;
				}
				return model;
			}
		});
        value_of(index).should_be(2);
    },

    'ko.mapping.fromJS should send an added callback for every array item that is added': function() {
		var added = [];
        var result = ko.mapping.fromJS({ a: [1, 2] }, {
			create: function(data, parent) {
				if (parent == "a") {
					data.added = function(newValue) {
						added.push(newValue);
					}
				}
				return data;
			}
		});
        value_of(added.length).should_be(2);
		value_of(added[0]).should_be(1);
		value_of(added[1]).should_be(2);
    },

    'ko.mapping.fromJSON should parse and then map in the same way': function() {
        var jsonString = ko.utils.stringifyJson({  // Note that "undefined" property values are omitted by the stringifier, so not testing those
            a : { 
                a1 : 'a1value',
                a2 : {
                    a21 : 'a21value',
                    a22 : 'a22value'
                }
            }, 
            b : { b1 : null }
        });
        var result = ko.mapping.fromJSON(jsonString);
        value_of(result.a.a1()).should_be('a1value');
        value_of(result.a.a2.a21()).should_be('a21value');
        value_of(result.a.a2.a22()).should_be('a22value');
        value_of(result.b.b1()).should_be(null);
    },

	'ko.mapping.fromJS should be able to map empty object structures': function() {
		var obj = {
			someProp: undefined,
			a: []
		};
        var result = ko.mapping.fromJS(obj);
        value_of(ko.isObservable(result.someProp)).should_be(true);
        value_of(ko.isObservable(result.a)).should_be(true);
        value_of(ko.isObservable(result.unknownProperty)).should_be(false);
	},

	'ko.mapping.fromJS should not send create callbacks when atomic items are constructed': function() {
        var atomicValues = ["hello", 123, true, null, undefined];
		var callbacksReceived = 0;
        for (var i = 0; i < atomicValues.length; i++) {
            var result = ko.mapping.fromJS(atomicValues[i], {
				create: function(item, parent) {
					callbacksReceived++;
					return item;
				}
			});
        }
		value_of(callbacksReceived).should_be(0);
	},

	'ko.mapping.updateFromJS should send callbacks when array elements are constructed': function() {
		var oldItems = { array: [] };
		var newItems = {
			array: [{ id : 1 }, { id : 2 }]
		};
	
		var items = [];
		var result = ko.mapping.fromJS(oldItems, {
			create: function(data, parent) {
				if (parent == "array") {
					data.added = function(newValue) {
						items.push(newValue);
					}
				}
				return data;
			}
		});
		result = ko.mapping.updateFromJS(result, newItems);
		value_of(items.length).should_be(2);
		value_of(items[0].id()).should_be(1);
		value_of(items[1].id()).should_be(2);
	},
	
	'ko.mapping.fromJS should send callbacks containing parent names when descendant objects are constructed': function() {
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
        var result = ko.mapping.fromJS(obj, { create: function(data, parent, property) {
			parents.push(parent);
			return data;
		}});
		value_of(parents.length).should_be(3);
		value_of(parents[0]).should_be(undefined);
		value_of(parents[1]).should_be("a");
		value_of(parents[2]).should_be("a3");
	},

	'ko.mapping.updateFromJS should create instead of update, on empty objects': function() {
        var obj = {
			a: ["a1", "a2"]
		};
		
		var result;
		result = ko.mapping.updateFromJS(result, obj);
		value_of(result.a().length).should_be(2);
		value_of(result.a()[0]).should_be("a1");
		value_of(result.a()[1]).should_be("a2");
	},

	'ko.mapping.updateFromJS should update atomic observables': function() {
        var atomicValues = ["hello", 123, true, null, undefined];
		var atomicValues2 = ["hello2", 124, false, "not null", "defined"];
		
        for (var i = 0; i < atomicValues.length; i++) {
            var result = ko.mapping.fromJS(atomicValues[i]);
			result = ko.mapping.updateFromJS(result, atomicValues2[i]);
            value_of(ko.isObservable(result)).should_be(true);
            value_of(result()).should_be(atomicValues2[i]);
        }
	},

	'ko.mapping.updateFromJS should update objects': function() {
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
		result = ko.mapping.updateFromJS(result, obj2);
		value_of(result.a()).should_be("prop2");
		value_of(result.b.b1()).should_be(124);
		value_of(result.b.b2()).should_be("b22");
	},

	'ko.mapping.updateFromJS should update initially empty objects': function() {
		var obj = {
			a: undefined,
			b: []
        }
		
		var obj2 = {
			a: "prop2",
			b: ["b1", "b2"]
		}
		
		var result = ko.mapping.fromJS(obj);
		result = ko.mapping.updateFromJS(result, obj2);
		value_of(result.a()).should_be("prop2");
		value_of(result.b()).should_include("b1");
		value_of(result.b()).should_include("b2");
	},

	'ko.mapping.updateFromJS should update arrays containing atomic types': function() {
		var obj = ["a1", "a2", 6];
		var obj2 = ["a3", "a4", 7];
		
		var result = ko.mapping.fromJS(obj);
		pushed = mockPush(result);
		removed = mockRemove(result);
		
		result = ko.mapping.updateFromJS(result, obj2);
		value_of(result().length).should_be(3);
		value_of(pushed.length).should_be(3);
		value_of(removed.length).should_be(3);
		value_of(result()).should_include("a3");
		value_of(result()).should_include("a4");
		value_of(result()).should_include(7);
	},

	'ko.mapping.updateFromJS should update arrays containing objects': function() {
		var pushed = [];
		var removed = [];
	
		var obj = {
			a: [
				{ id: 1, value: "a1" },
				{ id: 2, value: "a2" }
			]
        }
		
		var obj2 = {
			a: [
				{ id: 1, value: "a1" },
				{ id: 3, value: "a3" }
			]
		}
		
		var result = ko.mapping.fromJS(obj, {
			create: function(item, parent) {
				if (parent == "a") {
					item.mapKey = function(item, parentName) {
						return item.id;
					}
				}
				return item;
			}
		});
		pushed = mockPush(result.a);
		removed = mockRemove(result.a);

		result = ko.mapping.updateFromJS(result, obj2);
		value_of(result.a().length).should_be(2);
		value_of(pushed.length).should_be(1);
		value_of(removed.length).should_be(1);
		value_of(result.a()[0].value()).should_be("a1");
		value_of(result.a()[1].value()).should_be("a3");
	},
	
    'ko.mapping.updateFromJS should escape from reference cycles': function() {
        var obj = {};
        obj.someProp = { owner : obj };
        var result = ko.mapping.fromJS(obj);
        var result = ko.mapping.updateFromJS(result, obj);
        value_of(result.someProp.owner).should_be(result);
    },
	
	'ko.mapping.updateFromJS should send a callback when adding new objects to an array': function() {
		var obj = [{ id: 1 }];
		var obj2 = [{ id: 1 }, { id: 2 }];
		
		var mappedItems = [];
		var result = ko.mapping.fromJS(obj, {
			create: function(item, parent) {
				item.added = function(newValue) {
					mappedItems.push(newValue);
				}
				item.mapKey = function(item) {
					return item.id;
				}
				return item;
			}
		});
		result = ko.mapping.updateFromJS(result, obj2);
		value_of(mappedItems.length).should_be(2);
		value_of(mappedItems[0].id()).should_be(1);
		value_of(mappedItems[1].id()).should_be(2);
	},

	'ko.mapping.updateFromJS should be able to update from an observable source': function() {
		var obj = [{ id: 1 }];
		var obj2 = ko.mapping.fromJS([{ id: 1 }, { id: 2 }]);
		
		var result = ko.mapping.fromJS(obj);
		result = ko.mapping.updateFromJS(result, obj2);
		value_of(result().length).should_be(2);
		value_of(result()[0].id()).should_be(1);
		value_of(result()[1].id()).should_be(2);
	},

	'ko.mapping.updateFromJS should send a deleted callback when an item was deleted from an array': function() {
		var obj = [1, 2];
		var obj2 = [1];
		
		var items = [];
		var result = ko.mapping.fromJS(obj, {
			create: function(item, parent) {
				item.deleted = function(item) {
					items.push(item);
				}
				return item;
			}
		});
		result = ko.mapping.updateFromJS(result, obj2);
		value_of(items.length).should_be(1);
		value_of(items[0]).should_be(2);
	},
	
})