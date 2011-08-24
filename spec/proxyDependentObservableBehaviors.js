describe('ProxyDependentObservable', {
	before_each: function() {
		ko.mapping.resetDefaultOptions();
	},

	'ko.mapping.fromJS should handle interdependent dependent observables in objects': function() {
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
		
		value_of(result.a.observeB()).should_be("b1");
		value_of(result.b.observeA()).should_be("a1");
	},

	'ko.mapping.fromJS should handle interdependent dependent observables with read/write callbacks in objects': function() {
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
		
		value_of(result.a.observeB()).should_be("b1");
		value_of(result.b.observeA()).should_be("a1");
		
		result.a.observeB("b2");
		result.b.observeA("a2");
		value_of(result.a.observeB()).should_be("b2");
		value_of(result.b.observeA()).should_be("a2");
	},

	'ko.mapping.fromJS should handle dependent observables in arrays': function() {
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
		
		value_of(result.items()[0].observeParent()).should_be(2);
		value_of(result.items()[1].observeParent()).should_be(2);
	},
	
	'nested calls to mapping should not revert proxyDependentObservable multiple times': function() {
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
		value_of(vm.inner1.DOprop()).should_be(vm);
	}
});