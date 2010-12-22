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
	var realKoDependentObservable = ko.dependentObservable;
	var deferredObservables;

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
	
	ko.mapping.isMapped = function(viewModel) {
		var unwrapped = ko.utils.unwrapObservable(viewModel);
		return unwrapped && unwrapped[mappingProperty];
	}

	ko.mapping.updateFromJS = function (viewModel, jsObject) {
		if (arguments.length < 2) throw new Error("When calling ko.updateFromJS, pass: the object to update and the object you want to update from.");
		if (!viewModel) throw new Error("The object is undefined.");
		
		if (!viewModel[mappingProperty]) throw new Error("The object you are trying to update was not created by a 'fromJS' or 'fromJSON' mapping.");
		return performMapping(viewModel, jsObject, viewModel[mappingProperty]);
	};

	ko.mapping.updateFromJSON = function (viewModel, jsonString, options) {
		var parsed = ko.utils.parseJson(jsonString);
		return ko.mapping.updateFromJS(viewModel, parsed, options);
	};

	ko.mapping.toJS = function (rootObject, options) {
		if (arguments.length == 0) throw new Error("When calling ko.mapping.toJS, pass the object you want to convert.");
		
		options = options || {};
		options.ignore = options.ignore || [];
		if (!(options.ignore instanceof Array)) {
			options.ignore = [options.ignore];
		}
		
		options.ignore.push(mappingProperty);

		// We just unwrap everything at every level in the object graph
		return ko.mapping.visitModel(rootObject, function (x) {
			return ko.utils.unwrapObservable(x);
		}, options);
	};

	ko.mapping.toJSON = function (rootObject, options) {
		var plainJavaScriptObject = ko.mapping.toJS(rootObject);
		return ko.utils.stringifyJson(plainJavaScriptObject, options);
	};

	function getType(x) {
		if ((x) && (typeof(x) === "object") && (x.constructor == (new Date).constructor)) return "date";
		return typeof x;
	}

	function fillOptions(options) {
		options = options || {};

		// Is there only a root-level mapping present?
		if ((options.create instanceof Function) || (options.key instanceof Function) || (options.arrayChanged instanceof Function)) {
			options = {
				"": options
			};
		}

		return options;
	}

	var proxyDependentObservable = function () {
		ko.dependentObservable = function() {
			var options = arguments[2] || {};
			options.deferEvaluation = true;
			
			var realDependentObservable = new realKoDependentObservable(arguments[0], arguments[1], options);
			realDependentObservable.__ko_proto__ = realKoDependentObservable;
			deferredObservables.push(realDependentObservable);
			return realDependentObservable;
		}
	}

	var unproxyDependentObservable = function () {
		ko.dependentObservable = realKoDependentObservable;
	}

	function performMapping(mappedRootObject, rootObject, options) {
		if (!recursionDepth) {
			deferredObservables = [];
		}
		
		recursionDepth++;
		var result = updateViewModel(mappedRootObject, rootObject, options);
		recursionDepth--;

		return result;
	}

	function updateViewModel(mappedRootObject, rootObject, options, visitedObjects, parentName, parent) {
		var isArray = ko.utils.unwrapObservable(rootObject) instanceof Array;
		
		// If this object was already mapped previously, take the options from there
		if (ko.mapping.isMapped(mappedRootObject)) {
			options = ko.utils.unwrapObservable(mappedRootObject)[mappingProperty];
		}
		
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
						proxyDependentObservable();
						var result = options[parentName].create({
							data: rootObject,
							parent: parent
						});
						unproxyDependentObservable();
						return result;
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
						// If this is a property that was generated by fromJS, we should use the options specified there
						mappedRootObject[indexer] = updateViewModel(mappedRootObject[indexer], rootObject[indexer], options, visitedObjects, indexer, mappedRootObject);
					}
				});
			}
		} else {
			var changes = [];

			var keyCallback = function (x) {
				return x;
			}
			if (options[parentName] && options[parentName].key) {
				keyCallback = options[parentName].key;
			}
			
			if (!ko.isObservable(mappedRootObject)) {
				mappedRootObject = ko.observableArray([]);
				
				mappedRootObject.mappedRemove = function(valueOrPredicate) {
					var predicate = typeof valueOrPredicate == "function" ? valueOrPredicate : function (value) { return value === keyCallback(valueOrPredicate); };
					return mappedRootObject.remove(function(item) {
						return predicate(keyCallback(item));
					});
				}

				mappedRootObject.mappedRemoveAll = function(arrayOfValues) {
					var arrayOfKeys = filterArrayByKey(arrayOfValues, keyCallback);
					return mappedRootObject.remove(function(item) {
						return ko.utils.arrayIndexOf(arrayOfKeys, keyCallback(item)) != -1;
					});
				}

				mappedRootObject.mappedDestroy = function(valueOrPredicate) {
					var predicate = typeof valueOrPredicate == "function" ? valueOrPredicate : function (value) { return value === keyCallback(valueOrPredicate); };
					return mappedRootObject.destroy(function(item) {
						return predicate(keyCallback(item));
					});
				}

				mappedRootObject.mappedDestroyAll = function(arrayOfValues) {
					var arrayOfKeys = filterArrayByKey(arrayOfValues, keyCallback);
					return mappedRootObject.destroy(function(item) {
						return ko.utils.arrayIndexOf(arrayOfKeys, keyCallback(item)) != -1;
					});
				}

				mappedRootObject.mappedIndexOf = function(item) {
					var keys = filterArrayByKey(mappedRootObject(), keyCallback);
					var key = keyCallback(item);
					return ko.utils.arrayIndexOf(keys, key);
				}
			}

			var currentArrayKeys = filterArrayByKey(ko.utils.unwrapObservable(mappedRootObject), keyCallback).sort();
			var prevArrayKeys = filterArrayByKey(rootObject, keyCallback).sort();
			var editScript = ko.utils.compareArrays(currentArrayKeys, prevArrayKeys);

			var newContents = [];
			for (var i = 0, j = editScript.length; i < j; i++) {
				var key = editScript[i];
				switch (key.status) {
				case "added":
					var item = getItemByKey(ko.utils.unwrapObservable(rootObject), key.value, keyCallback);
					var mappedItem = ko.utils.unwrapObservable(updateViewModel(undefined, item, options, visitedObjects, parentName, mappedRootObject));
					
					var index = ko.utils.arrayIndexOf(ko.utils.unwrapObservable(rootObject), item);
					newContents[index] = mappedItem;
					break;
				case "retained":
					var item = getItemByKey(ko.utils.unwrapObservable(rootObject), key.value, keyCallback);
					var mappedItem = getItemByKey(mappedRootObject, key.value, keyCallback);
					updateViewModel(mappedItem, item, options, visitedObjects, parentName, mappedRootObject);
					
					var index = ko.utils.arrayIndexOf(ko.utils.unwrapObservable(rootObject), item);
					newContents[index] = mappedItem;
					break;
				case "deleted":
					var mappedItem = getItemByKey(mappedRootObject, key.value, keyCallback);
					mappedRootObject.remove(mappedItem);
					break;
				}

				changes.push({
					event: key.status,
					item: mappedItem
				});
			}
			
			mappedRootObject(newContents);

			if (options[parentName] && options[parentName].arrayChanged) {
				ko.utils.arrayForEach(changes, function (change) {
					options[parentName].arrayChanged(change.event, change.item);
				});
			}
		}

		return mappedRootObject;
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
		var currentArrayKeys = filterArrayByKey(currentArray, mapKeyCallback).sort();
		var prevArrayKeys = filterArrayByKey(prevArray, mapKeyCallback).sort();
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

	ko.mapping.visitModel = function(rootObject, callback, options) {
		options = options || {};
		options.visitedObjects = options.visitedObjects || new objectLookup();

		var mappedRootObject;
		var unwrappedRootObject = ko.utils.unwrapObservable(rootObject);
		if (!canHaveProperties(unwrappedRootObject)) {
			return callback(rootObject, options.parentName);
		} else {
			// Only do a callback, but ignore the results
			callback(rootObject, options.parentName);
			mappedRootObject = unwrappedRootObject instanceof Array ? [] : {};
		}

		options.visitedObjects.save(rootObject, mappedRootObject);

		var parentName = options.parentName;
		visitPropertiesOrArrayEntries(unwrappedRootObject, function(indexer) {
			if (options.ignore && ko.utils.arrayIndexOf(options.ignore, indexer) != -1) return;
			
			var propertyValue = unwrappedRootObject[indexer];

			options.parentName = parentName || "";
			if (unwrappedRootObject instanceof Array) {
				if (parentName) {
					options.parentName += "[" + indexer + "]";
				}
			} else {
				if (parentName) {
					options.parentName += ".";
				}
				options.parentName += indexer;
			}

			var outputProperty;
			switch (getType(ko.utils.unwrapObservable(propertyValue))) {
				case "object":
				case "undefined":
					var previouslyMappedValue = options.visitedObjects.get(propertyValue);
					mappedRootObject[indexer] = (previouslyMappedValue !== undefined) ? previouslyMappedValue : ko.mapping.visitModel(propertyValue, callback, options);
					break;
				default:
					mappedRootObject[indexer] = callback(propertyValue, options.parentName);
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

	ko.exportSymbol('ko.mapping', ko.mapping);
	ko.exportSymbol('ko.mapping.fromJS', ko.mapping.fromJS);
	ko.exportSymbol('ko.mapping.fromJSON', ko.mapping.fromJSON);
	ko.exportSymbol('ko.mapping.isMapped', ko.mapping.isMapped);
	ko.exportSymbol('ko.mapping.toJS', ko.mapping.toJS);
	ko.exportSymbol('ko.mapping.toJSON', ko.mapping.toJSON);
	ko.exportSymbol('ko.mapping.updateFromJS', ko.mapping.updateFromJS);
	ko.exportSymbol('ko.mapping.updateFromJSON', ko.mapping.updateFromJSON);
	ko.exportSymbol('ko.mapping.visitModel', ko.mapping.visitModel);
})();