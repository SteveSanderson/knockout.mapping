// Knockout Mapping plugin v0.5
// License: Ms-Pl (http://www.opensource.org/licenses/ms-pl.html)

(function() {
	ko.mapping = {};

    function getType(x) {
		if ((x) && (typeof (x) === "object") && (x.constructor.toString().match(/date/i) !== null)) return "date";
       	return typeof x;
	}
	
	function dummyCallback(x) { return x; }
	
    // Clones the supplied object graph, making certain things observable as per comments
    ko.mapping.fromJS = function(jsObject, callbacks) {
        if (arguments.length == 0)
            throw new Error("When calling ko.fromJS, pass the object you want to convert.");
			
		callbacks = callbacks || {};
		callbacks.create = callbacks.create || dummyCallback;
		callbacks.mapInput = dummyCallback;
		callbacks.mapOutput = convertValueToObservable;
			
        return mapJsObjectGraph(jsObject, callbacks);
    };

    ko.mapping.fromJSON = function(jsonString, callbacks) {
        var parsed = ko.utils.parseJson(jsonString);
        return ko.mapping.fromJS(parsed, callbacks);
    };

    ko.mapping.updateFromJS = function(viewModel, jsObject, callbacks) {
        if (arguments.length < 2)
            throw new Error("When calling ko.updateFromJS, pass: the object to update and the object you want to update from.");
			
		callbacks = callbacks || {};
		callbacks.create = callbacks.create || dummyCallback;
		//callbacks.mapKey = callbacks.mapKey || dummyCallback;
			
        return updateViewModel(viewModel, jsObject, callbacks);
    };
	
	function updateViewModel(mappedRootObject, rootObject, callbacks, visitedObjects, parentName) {
		var createMappedObject = function(object) {
			// Map the new item and map all of its child properties. Unwrap it, because the elements in an observableArray should not be observable.
			_callbacks = {
				create: callbacks.create
			};
			return ko.utils.unwrapObservable(ko.mapping.fromJS(object, _callbacks));
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
				visitPropertiesOrArrayEntries(rootObject, function(indexer) {
					var mappedProperty = mappedRootObject[indexer];
					var property = rootObject[indexer];
				
					updateViewModel(mappedProperty, property, callbacks, visitedObjects, indexer);
				});
				
			}
		} else {
			var mapKey = function(item) {
				var mappedItem = item;
				if (mappedRootObject.mapKey)
					mappedItem = mappedRootObject.mapKey(item, parentName);
					
				return ko.utils.unwrapObservable(mappedItem);
			}
		
			var getItemByKey = function(array, key) {
				var filtered = ko.utils.arrayFilter(ko.utils.unwrapObservable(array), function(item) {
					return mapKey(item) == key;
				});
				
				if (filtered.length != 1)
					throw new Error("When calling ko.update*, the key '" + key + "' was not found or not unique!");
					
				return filtered[0];
			}
		
			var mappedRootObjectKeys = ko.utils.arrayMap(ko.utils.unwrapObservable(mappedRootObject), mapKey);
			var rootObjectKeys = ko.utils.arrayMap(ko.utils.unwrapObservable(rootObject), mapKey);
			var editScript = ko.utils.compareArrays(mappedRootObjectKeys, rootObjectKeys);

			for (var i = 0, j = editScript.length; i < j; i++) {
				var key = editScript[i];
				switch (key.status) {
					case "added":
						var item = getItemByKey(ko.utils.unwrapObservable(rootObject), key.value);
				        item = createMappedObject(item);
						mappedRootObject.push(item);
						break;
					case "retained":
						// Keys are the same, so do a regular update
						var mappedItem = getItemByKey(mappedRootObject, key.value);
						var item = getItemByKey(rootObject, key.value);
						updateViewModel(mappedItem, item, callbacks, visitedObjects);
						break;
					case "deleted":
						var item = getItemByKey(ko.utils.unwrapObservable(mappedRootObject), key.value);
						mappedRootObject.remove(item);
						break;
				}
			}
		}
		
		return mappedRootObject;
	}

    ko.mapping.updateFromJSON = function(viewModel, jsonString, callbacks) {
        var parsed = ko.utils.parseJson(jsonString);
        return ko.mapping.updateFromJS(viewModel, parsed, callbacks);
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
		if (isArrayMember)
			return valueToMap;

		// Convert arrays to observableArrays
		if (valueToMap instanceof Array)
			return ko.observableArray(valueToMap);

		// Map non-atomic values as non-observable objects
		if ((getType(valueToMap) == "object") && (valueToMap !== null))
			return valueToMap;

		// Map atomic values (other than array members) as observables
		return ko.observable(valueToMap);
	}
	
	function canHaveProperties(object) {
        return (getType(object) == "object") && (object !== null) && (object !== undefined);
	}
	
    function mapJsObjectGraph(rootObject, callbacks, visitedObjects, isArrayMember, parentName) {
        visitedObjects = visitedObjects || new objectLookup();

        rootObject = callbacks.mapInput(rootObject);
        if (!canHaveProperties(rootObject)) {
            var mappedRootObject = callbacks.mapOutput(rootObject, isArrayMember);
			return mappedRootObject;
		}

        var rootObjectIsArray = rootObject instanceof Array;
        var outputProperties = rootObjectIsArray ? [] : {};
        var mappedRootObject = callbacks.mapOutput(outputProperties, isArrayMember);
		mappedRootObject = callbacks.create(mappedRootObject, parentName);
		if (mappedRootObject === undefined)
			throw new Error("Create callback did not return an object!");
        visitedObjects.save(rootObject, mappedRootObject);

        visitPropertiesOrArrayEntries(rootObject, function(indexer) {
            var propertyValue = callbacks.mapInput(rootObject[indexer]);

			var outputProperty;
            switch (getType(propertyValue)) {
                case "boolean":
                case "number":
                case "string":
                case "function":
                case "date":
                    outputProperty = callbacks.mapOutput(propertyValue, rootObjectIsArray);
                    break;
                case "object":
                case "undefined":
                    var previouslyMappedValue = visitedObjects.get(propertyValue);
                    outputProperty = (previouslyMappedValue !== undefined)
                        ? previouslyMappedValue
                        : mapJsObjectGraph(propertyValue, callbacks, visitedObjects, rootObjectIsArray, indexer);
                    break;
            }
			
			if (rootObjectIsArray) {
				mappedRootObject.push(outputProperty);
				if (mappedRootObject.koAdded)
					mappedRootObject.koAdded(outputProperty);
			} else {
				outputProperties[indexer] = outputProperty;
			}
        });

        return mappedRootObject;
    }

    function objectLookup() {
        var keys = [];
        var values = [];
        this.save = function(key, value) {
            var existingIndex = ko.utils.arrayIndexOf(keys, key);
            if (existingIndex >= 0)
                values[existingIndex] = value;
            else {
                keys.push(key);
                values.push(value);
            }
        };
        this.get = function(key) {
            var existingIndex = ko.utils.arrayIndexOf(keys, key);
            return (existingIndex >= 0) ? values[existingIndex] : undefined;
        };
    };

    ko.mapping.toJS = function(rootObject) {
        if (arguments.length == 0)
            throw new Error("When calling ko.mapping.toJS, pass the object you want to convert.");

		callbacks = {};
		callbacks.create = dummyCallback;
		callbacks.mapInput = function(valueToMap) {
            return ko.utils.unwrapObservable(valueToMap);
        };
		callbacks.mapOutput = dummyCallback;
			
        // We just unwrap everything at every level in the object graph
        return mapJsObjectGraph(rootObject, callbacks);
    };

    ko.mapping.toJSON = function(rootObject) {
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