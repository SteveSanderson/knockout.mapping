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
	
	var mappingProperty = "__ko_mapping__";

	function getType(x) {
		if ((x) && (typeof(x) === "object") && (x.constructor == (new Date).constructor)) return "date";
		return typeof x;
	}
	
	function fillOptions(options) {
		options = options || {};
		options.created = options.created || {};
		options.keys = options.keys || {};
		options.subscriptions = options.subscriptions || {};
		return options;
	}

	// Clones the supplied object graph, making certain things observable as per comments
	ko.mapping.fromJS = function (jsObject, options) {
		if (arguments.length == 0) throw new Error("When calling ko.fromJS, pass the object you want to convert.");

		options = fillOptions(options);
		var result = updateViewModel(undefined, jsObject, options);
		result[mappingProperty] = result[mappingProperty] || {};
		result[mappingProperty] = options;
		return result;
	};

	ko.mapping.fromJSON = function (jsonString, options) {
		var parsed = ko.utils.parseJson(jsonString);
		return ko.mapping.fromJS(parsed, options);
	};

	ko.mapping.updateFromJS = function (viewModel, jsObject) {
		if (arguments.length < 2) throw new Error("When calling ko.updateFromJS, pass: the object to update and the object you want to update from.");
		var options = viewModel[mappingProperty];
		if (!options) throw new Error("The object you are trying to update was not created by a 'fromJS' or 'fromJSON' mapping!");

		return updateViewModel(viewModel, jsObject, options);
	};
	
	function generateName(parentName, indexer) {
		if (!parentName) {
			return indexer;
		} else {
			return parentName + "." + indexer;
		}
	}

	function updateViewModel(mappedRootObject, rootObject, options, visitedObjects, parentName) {
		var isArray = ko.utils.unwrapObservable(rootObject) instanceof Array;
		
		var createCallback = function(defaultObject) {
			// When using the 'created' callback, the result is used as a model for the mapped root object
			var createdMappedObject;
			if ((options.created[parentName]) && (canHaveProperties(rootObject) && (!isArray))) {
				var _options = fillOptions();
				createdMappedObject = options.created[parentName](rootObject, parentName);
			}
			
			return createdMappedObject || defaultObject;
		}
		
		visitedObjects = visitedObjects || new objectLookup();
		if (visitedObjects.get(rootObject)) return mappedRootObject;

		parentName = parentName || "";
		
		if (!isArray) {

			// For atomic types, do a direct update on the observable
			if (!canHaveProperties(rootObject)) {
				switch (getType(rootObject)) {
					case "function":
						mappedRootObject = rootObject;
						break;
					default:
						if (ko.isWriteableObservable(mappedRootObject)) {
							mappedRootObject(ko.utils.unwrapObservable(rootObject));
						} else {
							mappedRootObject = ko.observable(ko.utils.unwrapObservable(rootObject));
						}
						break;
				}

				visitedObjects.save(rootObject, mappedRootObject);
				
			} else {

				// Non-writeable observables or atomic properties that are created during the creation callback should be ignored when mapping
				ignoreProperties = [];
				if (!mappedRootObject) {
					mappedRootObject = createCallback({});
					visitPropertiesOrArrayEntries(mappedRootObject, function (indexer) {
						if (!ko.isWriteableObservable(mappedRootObject[indexer])) {
							ignoreProperties[indexer] = true;
						}
					});
				}

				visitedObjects.save(rootObject, mappedRootObject);

				// For non-atomic types, visit all properties and update recursively
				visitPropertiesOrArrayEntries(rootObject, function (indexer) {
					if (!ignoreProperties[indexer]) {
					
						var mappedProperty;
						
						var prevMappedProperty = visitedObjects.get(rootObject[indexer]);
						if (prevMappedProperty) {
							// In case we are adding an already mapped property, fill it with the previously mapped property value to prevent recursion.
							mappedRootObject[indexer] = prevMappedProperty;
						} else {
							mappedRootObject[indexer] = updateViewModel(mappedRootObject[indexer], rootObject[indexer], options, visitedObjects, generateName(parentName, indexer));
						}
					
					}
				});
			}
		} else {
			if (!ko.isObservable(mappedRootObject)) {
				mappedRootObject = createCallback(ko.observableArray([]));
			}

			var keyCallback = function (x) {
				return x;
			}
			
			if (options.keys[parentName]) keyCallback = options.keys[parentName];
			
			var subscriptions = getArraySubscriptions(options, parentName);
			var changes = [];
			
			compareArrays(ko.utils.unwrapObservable(mappedRootObject), rootObject, parentName, keyCallback, function (event, item) {
				switch (event) {
				case "added":
					var mappedItem = ko.utils.unwrapObservable(updateViewModel(undefined, item, options, visitedObjects, parentName));
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
				
				changes.push({
					event: event,
					item: mappedItem
				});
			});
			
			ko.utils.arrayForEach(subscriptions, function (subscriptionCallback) {
				ko.utils.arrayForEach(changes, function(change) {
					subscriptionCallback(change.event, change.item);
				});
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
			if (callback) {
				return mapKey(item, callback);
			} else {
				return item;
			}
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

	function canHaveProperties(object) {
		return (getType(object) == "object") && (object !== null) && (object !== undefined);
	}
	
	function getArraySubscriptions(options, parentName) {
		var subscriptions = options.subscriptions[parentName];
		var prevArray = [];
		if (subscriptions) {
			if (!(subscriptions instanceof Array)) subscriptions = [subscriptions];
			return subscriptions;
		} else {
			return [];
		}
	}

	function unwrapModel(rootObject, visitedObjects) {
		visitedObjects = visitedObjects || new objectLookup();

		rootObject = ko.utils.unwrapObservable(rootObject);
		if (!canHaveProperties(rootObject)) {
			return rootObject;
		}

		var rootObjectIsArray = rootObject instanceof Array;

		visitedObjects.save(rootObject, rootObject);

		visitPropertiesOrArrayEntries(rootObject, function (indexer) {
			var propertyValue = ko.utils.unwrapObservable(rootObject[indexer]);

			var outputProperty;
			switch (getType(propertyValue)) {
			case "object":
			case "undefined":
				var previouslyMappedValue = visitedObjects.get(propertyValue);
				rootObject[indexer] = (previouslyMappedValue !== undefined) ? previouslyMappedValue : unwrapModel(propertyValue, visitedObjects);
				break;
			default:
				rootObject[indexer] = ko.utils.unwrapObservable(propertyValue);
			}
		});

		return rootObject;
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

		// We just unwrap everything at every level in the object graph
		return unwrapModel(rootObject);
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