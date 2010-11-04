// Knockout Mapping plugin v0.5
// (c) 2010 Steven Sanderson, Roy Jacobs - http://knockoutjs.com/
// License: Ms-Pl (http://www.opensource.org/licenses/ms-pl.html)

// Knockout Mapping plugin v0.5
// (c) 2010 Steven Sanderson, Roy Jacobs - http://knockoutjs.com/
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
	var recursionDepth = 0;
	var dependencyTriggers;
	var realKoDependentObservable;

	ko.mapping.fromJS = function (jsObject, options, target) {
		if (arguments.length == 0) throw new Error("When calling ko.fromJS, pass the object you want to convert.");

		options = fillOptions(options);
		var result = performMapping(target, jsObject, options);
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

		return performMapping(viewModel, jsObject, options);
	};
	
	ko.mapping.updateFromJSON = function (viewModel, jsonString, options) {
		var parsed = ko.utils.parseJson(jsonString);
		return ko.mapping.updateFromJS(viewModel, parsed, options);
	};
	
	ko.mapping.toJS = function (rootObject) {
		if (arguments.length == 0) throw new Error("When calling ko.mapping.toJS, pass the object you want to convert.");

		// We just unwrap everything at every level in the object graph
		return visitModel(rootObject, function (x) {
			return ko.utils.unwrapObservable(x);
		});
	};

	ko.mapping.toJSON = function (rootObject) {
		var plainJavaScriptObject = ko.mapping.toJS(rootObject);
		return ko.utils.stringifyJson(plainJavaScriptObject);
	};

	function getType(x) {
		if ((x) && (typeof(x) === "object") && (x.constructor == (new Date).constructor)) return "date";
		return typeof x;
	}

	function fillOptions(options) {
		options = options || {};

		// Is there only a root-level mapping present?
		if (
			(options.create instanceof Function) ||
			(options.key instanceof Function) ||
			(options.arrayChanged instanceof Function)
		   ) {
			options = {
				"": options
			};
		}
		
		return options;
	}

	var proxyDependentObservable = function () {
		// We need to proxy all calls to dependentObservable, since it will evaluate immediately.
		// Possibly it refers to properties that are not mapped yet!
		//
		// We wrap the dependentObservable in another dependent observable.
		// This wrapper will ignore the first call that is always done to immediately evaluate the dependent observables to determine the dependencies.
		//
		// Instead, we have only one dependency: dependencyTrigger.
		//
		// This dependencyTrigger will be set to true when the entire object is mapped, causing the 'real' dependencyObject to be constructed.
		// All subsequent calls will go straight through this wrapper to the real dependencyObject.
		realKoDependentObservable = ko.dependentObservable;

		ko.dependentObservable = function () {
			var args = arguments;
			var dependentObservable;

			var item = {
				trigger: ko.observable(false)
			};

			var proxy = new realKoDependentObservable(function () {
				if (!item.trigger()) {
					return;
				}

				if (!dependentObservable) {
					dependentObservable = realKoDependentObservable.apply(this, args);
					item.dependentObservable = dependentObservable;
				}
				return dependentObservable();
			});

			item.proxy = proxy;
			dependencyTriggers.push(item);
			return proxy;
		}
	}

	var unproxyDependentObservable = function () {
		ko.dependentObservable = realKoDependentObservable;
	}

	function performMapping(mappedRootObject, rootObject, options) {
		if (!recursionDepth) {
			dependencyTriggers = [];
			proxyDependentObservable();
		}

		recursionDepth++;
		var result = updateViewModel(mappedRootObject, rootObject, options);
		recursionDepth--;

		if (!recursionDepth) {
			unproxyDependentObservable();
			if (dependencyTriggers.length) {
				// Now, replace all the proxy dependent observables with the real ones
				visitModel(result, function (item) {
					var foundTrigger = ko.utils.arrayFirst(dependencyTriggers, function (triggerItem) {
						return (triggerItem.proxy == item);
					}, this);

					if (foundTrigger) {
						foundTrigger.trigger(true);
						return foundTrigger.dependentObservable;
					} else {
						return item;
					}
				});
			}
		}
		
		return result;
	}
	
	function updateViewModel(mappedRootObject, rootObject, options, visitedObjects, parentName, parent) {
		var isArray = ko.utils.unwrapObservable(rootObject) instanceof Array;

		var hasCreateCallback = function () {
			return options[parentName] && options[parentName].create instanceof Function;
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

			} else {

				if (!mappedRootObject) {
					if (hasCreateCallback()) {
						return options[parentName].create(rootObject, parent);
					} else {
						mappedRootObject = {};
					}
				}

				visitedObjects.save(rootObject, mappedRootObject);

				// For non-atomic types, visit all properties and update recursively
				visitPropertiesOrArrayEntries(rootObject, function (indexer) {
					var mappedProperty;

					var prevMappedProperty = visitedObjects.get(rootObject[indexer]);
					if (prevMappedProperty) {
						// In case we are adding an already mapped property, fill it with the previously mapped property value to prevent recursion.
						mappedRootObject[indexer] = prevMappedProperty;
					} else {
						mappedRootObject[indexer] = updateViewModel(mappedRootObject[indexer], rootObject[indexer], options, visitedObjects, generateName(parentName, indexer), mappedRootObject);
					}
				});
			}
		} else {
			if (!ko.isObservable(mappedRootObject)) {
				mappedRootObject = ko.observableArray([]);
			}

			var changes = [];

			var keyCallback = function(x) { return x; }
			if (options[parentName] && options[parentName].key) {
				keyCallback = options[parentName].key;
			}
			
			compareArrays(ko.utils.unwrapObservable(mappedRootObject), rootObject, keyCallback, function (event, item) {
				switch (event) {
				case "added":
					var mappedItem = ko.utils.unwrapObservable(updateViewModel(undefined, item, options, visitedObjects, parentName, parent));
					mappedRootObject.push(mappedItem);
					break;
				case "retained":
					var mappedItem = getItemByKey(mappedRootObject, mapKey(item, keyCallback), keyCallback);
					updateViewModel(mappedItem, item, options, visitedObjects, parentName, parent);
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

			if (options[parentName] && options[parentName].arrayChanged) {
				ko.utils.arrayForEach(changes, function (change) {
					options[parentName].arrayChanged(change.event, change.item);
				});
			}
		}

		return mappedRootObject;
	}

	function generateName(parentName, indexer) {
		if (!parentName) {
			return indexer;
		} else {
			return parentName + "." + indexer;
		}
	}
	
	function mapKey(item, callback) {
		var mappedItem;
		if (callback) mappedItem = callback(item);
		if (!mappedItem) mappedItem = item;

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

	function compareArrays(prevArray, currentArray, mapKeyCallback, callback, callbackTarget) {
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

	function visitModel(rootObject, callback, visitedObjects) {
		visitedObjects = visitedObjects || new objectLookup();

		rootObject = callback(rootObject);
		var unwrappedRootObject = ko.utils.unwrapObservable(rootObject);
		if (!canHaveProperties(unwrappedRootObject)) {
			return rootObject;
		}

		visitedObjects.save(rootObject, rootObject);

		visitPropertiesOrArrayEntries(unwrappedRootObject, function (indexer) {
			var propertyValue = unwrappedRootObject[indexer];

			var outputProperty;
			switch (getType(ko.utils.unwrapObservable(propertyValue))) {
			case "object":
			case "undefined":
				var previouslyMappedValue = visitedObjects.get(propertyValue);
				unwrappedRootObject[indexer] = (previouslyMappedValue !== undefined) ? previouslyMappedValue : visitModel(propertyValue, callback, visitedObjects);
				break;
			default:
				unwrappedRootObject[indexer] = callback(propertyValue);
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

	ko.exportSymbol('ko.mapping', ko.mapping);
	ko.exportSymbol('ko.mapping.fromJS', ko.mapping.fromJS);
	ko.exportSymbol('ko.mapping.fromJSON', ko.mapping.fromJSON);
	ko.exportSymbol('ko.mapping.updateFromJS', ko.mapping.updateFromJS);
	ko.exportSymbol('ko.mapping.updateFromJSON', ko.mapping.updateFromJSON);
	ko.exportSymbol('ko.mapping.toJS', ko.mapping.toJS);
	ko.exportSymbol('ko.mapping.toJSON', ko.mapping.toJSON);
})();