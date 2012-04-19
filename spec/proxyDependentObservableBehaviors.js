(function() {
var generateProxyTests = function(useComputed) {
	var moduleName = useComputed ? 'ProxyComputed' : 'ProxyDependentObservable';
	module(moduleName);

	var func = function() {
		var result;
		result = useComputed ? ko.computed.apply(null, arguments) : ko.dependentObservable.apply(null, arguments);
		return result;
	};

	testStart[moduleName] = function() {
		test = {
			evaluationCount: 0
		};
		test.create = function(createOptions) {
			var obj = {
				a: "b"
			};

			var mapping = {
				a: {
					create: function(options) {
						createOptions = createOptions || {};
						var mapped = ko.mapping.fromJS(options.data, mapping);
						
						var DOdata = function() {
							test.evaluationCount++;
							return "test";
						};
						if (createOptions.useReadCallback) {
							DOdata = {
								read: DOdata
							};
						}
						
						mapped.DO = func(DOdata, mapped, {
							deferEvaluation: !!createOptions.deferEvaluation
						});
						return mapped;
					}
				}
			};
			
			return ko.mapping.fromJS(obj, mapping);
		};
	};

	test('ko.mapping.fromJS should handle interdependent dependent observables in objects', function() {
		var obj = {
			a: { a1: "a1" },
			b: { b1: "b1" }
		}
		
		var dependencyInvocations = [];
		
		var result = ko.mapping.fromJS(obj, {
			a: {
				create: function(options) {
					return {
						a1: ko.observable(options.data.a1),
						observeB: func(function() {
							dependencyInvocations.push("a");
							return options.parent.b.b1();
						})
					}
				}
			},
			b: {
				create: function(options) {
					return {
						b1: ko.observable(options.data.b1),
						observeA: func(function() {
							dependencyInvocations.push("b");
							return options.parent.a.a1();
						})
					}
				},
			}
		});
		
		equal("b1", result.a.observeB());
		equal("a1", result.b.observeA());
	});

	test('ko.mapping.fromJS should handle interdependent dependent observables with read/write callbacks in objects', function() {
		var obj = {
			a: { a1: "a1" },
			b: { b1: "b1" }
		}
		
		var dependencyInvocations = [];
		
		var result = ko.mapping.fromJS(obj, {
			a: {
				create: function(options) {
					return {
						a1: ko.observable(options.data.a1),
						observeB: func({
							read: function() {
								dependencyInvocations.push("a");
								return options.parent.b.b1();
							},
							write: function(value) {
								options.parent.b.b1(value);
							}
						})
					}
				}
			},
			b: {
				create: function(options) {
					return {
						b1: ko.observable(options.data.b1),
						observeA: func({
							read: function() {
								dependencyInvocations.push("b");
								return options.parent.a.a1();
							},
							write: function(value) {
								options.parent.a.a1(value);
							}
						})
					}
				},
			}
		});
		
		equal(result.a.observeB(), "b1");
		equal(result.b.observeA(), "a1");
		
		result.a.observeB("b2");
		result.b.observeA("a2");
		equal(result.a.observeB(), "b2");
		equal(result.b.observeA(), "a2");
	});

	test('ko.mapping.fromJS should handle dependent observables in arrays', function() {
		var obj = {
			items: [
				{ id: "a" },
				{ id: "b" }
			]
		}
		
		var dependencyInvocations = 0;
		
		var result = ko.mapping.fromJS(obj, {
			"items": {
				create: function(options) {
					return {
						id: ko.observable(options.data.id),
						observeParent: func(function() {
							dependencyInvocations++;
							return options.parent().length;
						})
					}
				}
			}
		});
		
		equal(result.items()[0].observeParent(), 2);
		equal(result.items()[1].observeParent(), 2);
	});

	test('nested calls to mapping should not revert proxyDependentObservable multiple times', function() {
		var vmjs = {
			"inner1": {
				"inner2": {
				}
			}
		}
		var vm = undefined;
		var mapping = {
			"inner1": {
				"create": function(options) {
					//use the same mapping object to map inner2
					var that = ko.mapping.fromJS(options.data, mapping);
					that.DOprop = func(function() {
						// if the DO is evaluated straight away, this will return undefined
						return vm;
					});
					return that;
				}
			},
			"inner2": {
				"create": function(options) {
					var that = ko.mapping.fromJS(options.data);
					return that;
				}
			}
		};
		var vm = ko.mapping.fromJS(vmjs, mapping);
		equal(vm.inner1.DOprop(), vm);
	});

	asyncTest('undeferred dependentObservables that are NOT used immediately SHOULD be auto-evaluated after mapping', function() {
		var mapped = test.create();
		window.setTimeout(function() {
			start();
			equal(test.evaluationCount, 1);
		}, 0);
	});

	asyncTest('undeferred dependentObservables that ARE used immediately should NOT be auto-evaluated after mapping', function() {
		var mapped = test.create();
		equal(ko.utils.unwrapObservable(mapped.a.DO), "test");
		window.setTimeout(function() {
			start();
			equal(test.evaluationCount, 1);
		}, 0);
	});

	asyncTest('deferred dependentObservables should NOT be auto-evaluated after mapping', function() {
		var mapped = test.create({ deferEvaluation: true });
		window.setTimeout(function() {
			start();
			equal(test.evaluationCount, 0);
		}, 0);
	});

	asyncTest('undeferred dependentObservables with read callback that are NOT used immediately SHOULD be auto-evaluated after mapping', function() {
		var mapped = test.create({ useReadCallback: true });
		window.setTimeout(function() {
			start();
			equal(test.evaluationCount, 1);
		}, 0);
	});

	asyncTest('undeferred dependentObservables with read callback that ARE used immediately should NOT be auto-evaluated after mapping', function() {
		var mapped = test.create({ useReadCallback: true });
		equal(ko.utils.unwrapObservable(mapped.a.DO), "test");
		window.setTimeout(function() {
			start();
			equal(test.evaluationCount, 1);
		}, 0);
	});

	asyncTest('deferred dependentObservables with read callback should NOT be auto-evaluated after mapping', function() {
		var mapped = test.create({ deferEvaluation: true, useReadCallback: true });
		window.setTimeout(function() {
			start();
			equal(test.evaluationCount, 0);
		}, 0);
	});

	test('can subscribe to proxy dependentObservable', function() {
		var mapped = test.create({ deferEvaluation: true, useReadCallback: true });
		mapped.a.DO.subscribe(function() {
		});
	});

	test('can subscribe to nested proxy dependentObservable', function() {
		var obj = {
			a: { b: null }
		};

		var DOsubscribedVal;
		var mapping = {
			a: {
				create: function(options) {
					var mappedB = ko.mapping.fromJS(options.data, {
						create: function(options) {
							var DOval;
							
							var m = {};
							m.myValue = ko.observable("myValue");
							m.DO = func({
								read: function() {
									return DOval;
								},
								write: function(val) {
									DOval = val;
								}
							});
							m.readOnlyDO = func(function() {
								return m.myValue();
							});
							return m;
						}
					});
					mappedB.DO.subscribe(function(val) {
						DOsubscribedVal = val;
					});
					return mappedB;
				}
			}
		};
		
		var mapped = ko.mapping.fromJS(obj, mapping);
		mapped.a.DO("bob");
		equal(ko.utils.unwrapObservable(mapped.a.readOnlyDO), "myValue");
		equal(ko.utils.unwrapObservable(mapped.a.DO), "bob");
		equal(DOsubscribedVal, "bob");
	});
	
	asyncTest('dependentObservable dependencies trigger subscribers', function() {
		var obj = {
			inner: {
				inner2: {
					dependency: 1
				}
			}
		};
		
		var inner2 = function(data) {
			var _this = this;
			ko.mapping.fromJS(data, {}, _this);
			
			_this.DO = func(function() {
				_this.dependency();
			});

			_this.evaluationCount = 0;
			_this.DO.subscribe(function() {
				_this.evaluationCount++;
			});
		};
		
		var inner = function(data) {
			var _this = this;
			ko.mapping.fromJS(data, {
				inner2: {
					create: function(options) {
						return new inner2(options.data);
					}
				}
			}, _this);
		};
		
		var mapping = {
			inner: {
				create: function(options) {
					return new inner(options.data);
				}
			}
		};
		
		var mapped = ko.mapping.fromJS(obj, mapping);
		var i = mapped.inner.inner2;
		equal(i.evaluationCount, 0);
		window.setTimeout(function() {
			start();
			
			// after the timeout, the DO is already evaluated once by the mapping plugin, causing the subscription to update
			equal(i.evaluationCount, 1);
			
			// change the dependency
			i.dependency(2);
			
			// should also have re-evaluated
			equal(i.evaluationCount, 2);
		});
	});
};

generateProxyTests(false);
generateProxyTests(true);
})();