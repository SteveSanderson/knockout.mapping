module('Integration tests');

test('Store', function() {
	function Product(data) {
		
		var viewModel = {
			guid: ko.observable(),
			name : ko.observable()
		};
		
		ko.mapping.fromJS(data, {}, viewModel);
		
		return viewModel;
	}

	Store = function(data) {
		data = data || {};
		var mapping = {
				Products: {
					key: function(data) {
						return ko.utils.unwrapObservable(data.guid);
					},
					create: function(options) {
						return new Product(options.data);
					}
				},
			
				Selected: {
					update: function(options) {
						return ko.utils.arrayFirst(viewModel.Products(), function(p) {
							return p.guid() == options.data.guid;
						});
					}
				}
			};

		var viewModel = {
			Products: ko.observableArray(),
			Selected : ko.observable()
		};

		ko.mapping.fromJS(data, mapping, viewModel);
		
		return viewModel;
	};

	var jsData = {
		"Products": [
			{ "guid": "01", "name": "Product1" },
			{ "guid": "02", "name": "Product2" },
			{ "guid": "03", "name": "Product3" }
		],
		"Selected": { "guid": "02" }
	};
	var viewModel = new Store(jsData);
	equal(viewModel.Selected().name(), "Product2");
});

test('Issue #34', function() {
	var importData = function(dataArray, target) {
		var mapping = {
			"create": function( options ) {
				return options.data;
			}
		};

		return ko.mapping.fromJS(dataArray, mapping, target);
	};

	var viewModel = {
		things: ko.observableArray( [] ),
		load: function() {
			var rows = [
				{ id: 1 }
			];
	
			importData(rows, viewModel.things);
		}
	};
	
	viewModel.load();
	viewModel.load();
	viewModel.load();
});

test('Adding large amounts of items to array is slow', function() {
	var numItems = 5000;
	var data = [];
	for (var t=0;t<numItems;t++) {
		data.push({ id: t });
	}
	
	var mapped = ko.mapping.fromJS(data, {
		key: function(data) {
			return ko.utils.unwrapObservable(data).id;
		}
	});
});

test('Issue #87', function() {
	var Item = function(data) {
		var _this = this;

		var mapping = {
			include: ["name"]
		};

		data = data || {};
		_this.name = ko.observable(data.name || "c");

		ko.mapping.fromJS(data, mapping, _this);
	};

	var Container = function(data) {
		var _this = this;

		var mapping = {
			items: {
				create: function(options) {
					return new Item(options.data);
				}
			}
		};

		_this.addItem = function() {
			_this.items.push(new Item());
		};

		ko.mapping.fromJS(data, mapping, _this);
	};

	var data = {
		items: [
			{ name: "a" },
			{ name: "b" }
		]
	};

	var mapped = new Container(data);

	mapped.addItem();
	equal(mapped.items().length, 3);
	equal(mapped.items()[0].name(), "a");
	equal(mapped.items()[1].name(), "b");
	equal(mapped.items()[2].name(), "c");

	var unmapped = ko.mapping.toJS(mapped);
	equal(unmapped.items.length, 3);
	equal(unmapped.items[0].name, "a");
	equal(unmapped.items[1].name, "b");
	equal(unmapped.items[2].name, "c");
});

test('Issue #88', function() {
	var ViewModel = function(data) {
	    ko.mapping.fromJS(data, {
	        copy: ["id"]
	    }, this);

	    this.reference = ko.observable(this);
	};

	var viewModel = new ViewModel({"id":123, "name":"Alice"});
	var unmapped;

	unmapped = ko.mapping.toJS(viewModel);
	equal(unmapped.id, 123);
	equal(unmapped.name, "Alice");

	unmapped = ko.mapping.toJS(viewModel.reference);
	equal(unmapped.id, 123);
	equal(unmapped.name, "Alice");

	unmapped = ko.mapping.toJS(viewModel.reference());
	equal(unmapped.id, 123);
	equal(unmapped.name, "Alice");
});