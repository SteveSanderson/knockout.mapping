module('ProxyDependentObservable');

QUnit.testStart = function() {
	ko.mapping.resetDefaultOptions();
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
					observeB: ko.dependentObservable(function() {
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
					observeA: ko.dependentObservable(function() {
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
					observeB: ko.dependentObservable({
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
					observeA: ko.dependentObservable({
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
					observeParent: ko.dependentObservable(function() {
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
				that.DOprop = ko.dependentObservable(function() {
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
	var obj = {
		a: "b"
	};

	var evaluationCount = 0;
	var mapping = {
		a: {
			create: function(options) {
				var mapped = ko.mapping.fromJS(options.data, mapping);
				mapped.DO = ko.dependentObservable(function() {
					evaluationCount++;
				});
				return mapped;
			}
		}
	};
	
	var mapped = ko.mapping.fromJS(obj, mapping);
	window.setTimeout(function() {
		start();
		equal(evaluationCount, 1);
	}, 0);
});

asyncTest('undeferred dependentObservables that ARE used immediately should NOT be auto-evaluated after mapping', function() {
	var obj = {
		a: "b"
	};

	var evaluationCount = 0;
	var mapping = {
		a: {
			create: function(options) {
				var mapped = ko.mapping.fromJS(options.data, mapping);
				mapped.DO = ko.dependentObservable(function() {
					evaluationCount++;
				});
				return mapped;
			}
		}
	};
	
	var mapped = ko.mapping.fromJS(obj, mapping);
	mapped.a.DO();
	window.setTimeout(function() {
		start();
		equal(evaluationCount, 1);
	}, 0);
});

asyncTest('deferred dependentObservables should NOT be auto-evaluated after mapping', function() {
	var obj = {
		a: "b"
	};

	var evaluationCount = 0;
	var mapping = {
		a: {
			create: function(options) {
				var mapped = ko.mapping.fromJS(options.data, mapping);
				mapped.DO = ko.dependentObservable(function() {
					evaluationCount++;
				}, mapped, { deferEvaluation: true });
				return mapped;
			}
		}
	};
	
	var mapped = ko.mapping.fromJS(obj, mapping);
	window.setTimeout(function() {
		start();
		equal(evaluationCount, 0);
	}, 0);
});

asyncTest('undeferred dependentObservables with read callback that are NOT used immediately SHOULD be auto-evaluated after mapping', function() {
	var obj = {
		a: "b"
	};

	var evaluationCount = 0;
	var mapping = {
		a: {
			create: function(options) {
				var mapped = ko.mapping.fromJS(options.data, mapping);
				mapped.DO = ko.dependentObservable({
					read: function() {
						evaluationCount++;
					}
				});
				return mapped;
			}
		}
	};
	
	var mapped = ko.mapping.fromJS(obj, mapping);
	window.setTimeout(function() {
		start();
		equal(evaluationCount, 1);
	}, 0);
});

asyncTest('undeferred dependentObservables with read callback that ARE used immediately should NOT be auto-evaluated after mapping', function() {
	var obj = {
		a: "b"
	};

	var evaluationCount = 0;
	var mapping = {
		a: {
			create: function(options) {
				var mapped = ko.mapping.fromJS(options.data, mapping);
				mapped.DO = ko.dependentObservable({
					read: function() {
						evaluationCount++;
					}
				});
				return mapped;
			}
		}
	};
	
	var mapped = ko.mapping.fromJS(obj, mapping);
	mapped.a.DO();
	window.setTimeout(function() {
		start();
		equal(evaluationCount, 1);
	}, 0);
});

asyncTest('deferred dependentObservables with read callback should NOT be auto-evaluated after mapping', function() {
	var obj = {
		a: "b"
	};

	var evaluationCount = 0;
	var mapping = {
		a: {
			create: function(options) {
				var mapped = ko.mapping.fromJS(options.data, mapping);
				mapped.DO = ko.dependentObservable({
					read: function() {
						debugger;
						evaluationCount++;
					}
				}, mapped, { deferEvaluation: true });
				return mapped;
			}
		}
	};
	
	var mapped = ko.mapping.fromJS(obj, mapping);
	window.setTimeout(function() {
		start();
		equal(evaluationCount, 0);
	}, 0);
});

