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