// Knockout Mapping plugin v0.5
// (c) 2010 Steven Sanderson, Roy Jacobs - http://knockoutjs.com/
// License: Ms-Pl (http://www.opensource.org/licenses/ms-pl.html)

// Knockout Mapping plugin v0.5
// License: Ms-Pl (http://www.opensource.org/licenses/ms-pl.html)
// Google Closure Compiler helpers (used only to make the minified file smaller)
ko.exportSymbol = function (publicPath, object) {
	var tokens = publicPath.split(".");
	var target = window;
	for (var i = 0; i < tokens.length - 1; i++)
	target = target[tokens[i]];
	target[tokens[tokens.length - 1]] = object;
};
ko.exportProperty = function (owner, publicName, object) {
	owner[publicName] = object;
};

(function () {
	ko.mapping = {};

	function getType(x) {
		if ((x) && (typeof(x) === "object") && (x.constructor.toString().match(/date/i) !== null)) return "date";
		return typeof x;
	}

	function dummyCallback(x) {
		return x;
	}

	// Clones the supplied object graph, making certain things observable as per comments
	ko.mapping.fromJS = function (jsObject, options) {
		if (arguments.length == 0) throw new Error("When calling ko.fromJS, pass the object you want to convert.");

		options = options || {};
		options.create = options.create || {};
		options.keys = options.keys || {};
		options.subscriptions = options.subscriptions || {};
		options.mapInput = dummyCallback;
		options.mapOutput = convertValueToObservable;

		return mapJsObjectGraph(jsObject, options);
	};

	ko.mapping.fromJSON = function (jsonString, options) {
		var parsed = ko.utils.parseJson(jsonString);
		return ko.mapping.fromJS(parsed, options);
	};

	ko.mapping.updateFromJS = function (viewModel, jsObject, options) {
		if (arguments.length < 2) throw new Error("When calling ko.updateFromJS, pass: the object to update and the object you want to update from.");

		options = options || {};
		options.create = options.create || {};
		options.keys = options.keys || {};
		options.subscriptions = options.subscriptions || {};

		return updateViewModel(viewModel, jsObject, options);
	};

	function updateViewModel(mappedRootObject, rootObject, options, visitedObjects, parentName) {
		var createMappedObject = function (object) {
			// Map the new item and map all of its child properties. Unwrap it, because the elements in an observableArray should not be observable.
			_options = {
				create: options.create
			};
			return ko.utils.unwrapObservable(ko.mapping.fromJS(object, _options));
		}

		if (mappedRootObject === undefined) {
			return createMappedObject(rootObject);
		}

		visitedObjects = visitedObjects || new objectLookup();
		if (visitedObjects.get(rootObject)) return mappedRootObject;
		visitedObjects.save(rootObject, mappedRootObject);

		var isArray = ko.utils.unwrapObservable(mappedRootObject) instanceof Array;
		if (!isArray) {

			// For atomic types, do a direct update on the observable
			if (!canHaveProperties(mappedRootObject)) {

				// If it's an array element, it's not observable, otherwise it is
				if (ko.isWriteableObservable(mappedRootObject)) {
					mappedRootObject(ko.utils.unwrapObservable(rootObject));
				} else {
					mappedRootObject = ko.utils.unwrapObservable(rootObject);
				}

			} else {

				// Otherwise, visit all properties and update recursively
				visitPropertiesOrArrayEntries(rootObject, function (indexer) {
					var mappedProperty = mappedRootObject[indexer];
					var property = rootObject[indexer];

					updateViewModel(mappedProperty, property, options, visitedObjects, indexer);
				});

			}
		} else {
			parentName = parentName || "root";
			var keyCallback = dummyCallback;
			if (options.keys[parentName]) keyCallback = options.keys[parentName];
			compareArrays(ko.utils.unwrapObservable(mappedRootObject), rootObject, parentName, keyCallback, function (event, item) {
				switch (event) {
				case "added":
					var mappedItem = createMappedObject(item);
					mappedRootObject.push(mappedItem);
					break;
				case "retained":
					var mappedItem = getItemByKey(mappedRootObject, mapKey(item, keyCallback), keyCallback);
					updateViewModel(mappedItem, item, options, visitedObjects);
					break;
				case "deleted":
					var mappedItem = getItemByKey(mappedRootObject, mapKey(item, keyCallback), keyCallback);
					mappedRootObject.remove(mappedItem);
					break;
				}
			});
		}

		return mappedRootObject;
	}

	function mapKey(item, callback) {
		var mappedItem = item;
		if (callback) mappedItem = callback(item);

		return ko.utils.unwrapObservable(mappedItem);
	}

	function getItemByKey(array, key, callback) {
		var filtered = ko.utils.arrayFilter(ko.utils.unwrapObservable(array), function (item) {
			return mapKey(item, callback) == key;
		});

		if (filtered.length != 1) throw new Error("When calling ko.update*, the key '" + key + "' was not found or not unique!");

		return filtered[0];
	}

	function filterArrayByKey(array, callback) {
		return ko.utils.arrayMap(ko.utils.unwrapObservable(array), function (item) {
			if (callback) return mapKey(item, callback);
			else return item;
		});
	}

	function compareArrays(prevArray, currentArray, parentName, mapKeyCallback, callback, callbackTarget) {
		var currentArrayKeys = filterArrayByKey(currentArray, mapKeyCallback);
		var prevArrayKeys = filterArrayByKey(prevArray, mapKeyCallback);
		var editScript = ko.utils.compareArrays(prevArrayKeys, currentArrayKeys);

		for (var i = 0, j = editScript.length; i < j; i++) {
			var key = editScript[i];
			switch (key.status) {
			case "added":
				var item = getItemByKey(ko.utils.unwrapObservable(currentArray), key.value, mapKeyCallback);
				callback("added", item);
				break;
			case "retained":
				var item = getItemByKey(currentArray, key.value, mapKeyCallback);
				callback("retained", item);
				break;
			case "deleted":
				var item = getItemByKey(ko.utils.unwrapObservable(prevArray), key.value, mapKeyCallback);
				callback("deleted", item);
				break;
			}
		}
	}

	ko.mapping.updateFromJSON = function (viewModel, jsonString, options) {
		var parsed = ko.utils.parseJson(jsonString);
		return ko.mapping.updateFromJS(viewModel, parsed, options);
	};

	function visitPropertiesOrArrayEntries(rootObject, visitorCallback) {
		if (rootObject instanceof Array) {
			for (var i = 0; i < rootObject.length; i++)
			visitorCallback(i);
		} else {
			for (var propertyName in rootObject)
			visitorCallback(propertyName);
		}
	};

	function convertValueToObservable(valueToMap, isArrayMember) {
		valueToMap = ko.utils.unwrapObservable(valueToMap); // Don't add an extra layer of observability
		// Don't map direct array members (although we will map any child properties they may have)
		if (isArrayMember) return valueToMap;

		// Convert arrays to observableArrays
		if (valueToMap instanceof Array) return ko.observableArray(valueToMap);

		// Map non-atomic values as non-observable objects
		if ((getType(valueToMap) == "object") && (valueToMap !== null)) return valueToMap;

		// Map atomic values (other than array members) as observables
		return ko.observable(valueToMap);
	}

	function canHaveProperties(object) {
		return (getType(object) == "object") && (object !== null) && (object !== undefined);
	}

	function mapJsObjectGraph(rootObject, options, visitedObjects, isArrayMember, parentName) {
		visitedObjects = visitedObjects || new objectLookup();

		rootObject = options.mapInput(rootObject);
		if (!canHaveProperties(rootObject)) {
			var mappedRootObject = options.mapOutput(rootObject, isArrayMember);
			return mappedRootObject;
		}

		parentName = parentName || "root";

		var rootObjectIsArray = rootObject instanceof Array;
		var outputProperties = rootObjectIsArray ? [] : {};

		var mappedRootObject;
		if (options.create[parentName]) mappedRootObject = options.create[parentName](rootObject, parentName);
		if (!mappedRootObject) mappedRootObject = options.mapOutput(outputProperties, isArrayMember);

		if (rootObjectIsArray) {
			var subscriptions = options.subscriptions[parentName];
			var prevArray = [];
			if (subscriptions) {
				if (!(subscriptions instanceof Array)) subscriptions = [subscriptions];
				mappedRootObject.subscribe(function (currentArray) {
					compareArrays(prevArray, currentArray, parentName, options.keys[parentName], function (event, item) {
						ko.utils.arrayForEach(subscriptions, function (subscriptionCallback) {
							subscriptionCallback(event, item);
						});
					});
					prevArray = currentArray.slice(0);
				});
			}
		}

		if (mappedRootObject === undefined) throw new Error("Create callback did not return an object!");
		visitedObjects.save(rootObject, mappedRootObject);

		visitPropertiesOrArrayEntries(rootObject, function (indexer) {
			var propertyValue = options.mapInput(rootObject[indexer]);

			var outputProperty;
			switch (getType(propertyValue)) {
			case "boolean":
			case "number":
			case "string":
			case "function":
			case "date":
				outputProperty = options.mapOutput(propertyValue, rootObjectIsArray);
				break;
			case "object":
			case "undefined":
				var previouslyMappedValue = visitedObjects.get(propertyValue);
				outputProperty = (previouslyMappedValue !== undefined) ? previouslyMappedValue : mapJsObjectGraph(propertyValue, options, visitedObjects, rootObjectIsArray, indexer);
				break;
			}

			if (rootObjectIsArray) {
				mappedRootObject.push(outputProperty);
				if (mappedRootObject.koAdded) mappedRootObject.koAdded(outputProperty);
			} else {
				outputProperties[indexer] = outputProperty;
			}
		});

		return mappedRootObject;
	}

	function objectLookup() {
		var keys = [];
		var values = [];
		this.save = function (key, value) {
			var existingIndex = ko.utils.arrayIndexOf(keys, key);
			if (existingIndex >= 0) values[existingIndex] = value;
			else {
				keys.push(key);
				values.push(value);
			}
		};
		this.get = function (key) {
			var existingIndex = ko.utils.arrayIndexOf(keys, key);
			return (existingIndex >= 0) ? values[existingIndex] : undefined;
		};
	};

	ko.mapping.toJS = function (rootObject) {
		if (arguments.length == 0) throw new Error("When calling ko.mapping.toJS, pass the object you want to convert.");

		options = {};
		options.create = options.create || {};
		options.keys = options.keys || {};
		options.subscriptions = options.subscriptions || {};
		options.mapInput = function (valueToMap) {
			return ko.utils.unwrapObservable(valueToMap);
		};
		options.mapOutput = dummyCallback;

		// We just unwrap everything at every level in the object graph
		return mapJsObjectGraph(rootObject, options);
	};

	ko.mapping.toJSON = function (rootObject) {
		var plainJavaScriptObject = ko.mapping.toJS(rootObject);
		return ko.utils.stringifyJson(plainJavaScriptObject);
	};

	ko.exportSymbol('ko.mapping', ko.mapping);
	ko.exportSymbol('ko.mapping.fromJS', ko.mapping.fromJS);
	ko.exportSymbol('ko.mapping.fromJSON', ko.mapping.fromJSON);
	ko.exportSymbol('ko.mapping.updateFromJS', ko.mapping.updateFromJS);
	ko.exportSymbol('ko.mapping.updateFromJSON', ko.mapping.updateFromJSON);
	ko.exportSymbol('ko.mapping.toJS', ko.mapping.toJS);
	ko.exportSymbol('ko.mapping.toJSON', ko.mapping.toJSON);
})();