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

test('Issue #39', function() {
    var Model = function() {
            var data = {
                includeOptions: []
            };
            ko.mapping.fromJS(data, {}, this);
        },
        viewModel = new Model();
    for (var i = 0; i < 4; i++) {
        ko.mapping.fromJS({}, {}, viewModel);
    }
    deepEqual(viewModel['__ko_mapping__'].include, [ "_destroy" ]);
});

test('Issue #61', function() {
    var person = ko.mapping.fromJS({
            firstname: "Knock",
            lastname: "McOut",
            address: {
                street: "Some Street",
                number: "123"
            }
        }),
        personJS;
    person.fullName = ko.computed(function() {
        return person.firstname() + ' ' + person.lastname();
    });
    person.address.fullStreet = ko.computed(function() {
        return person.address.number() + ' ' + person.address.street();
    });
    personJS = ko.mapping.toJS(person);
    equal(personJS.fullName, undefined);
    equal(personJS.address.fullStreet, undefined);
});
​
test('Issue #62 - A', function() {
    var mapped = ko.mapping.fromJS([{
            id: "A",
            value: "Value",
            obj: {
                t: "Temp"
            }
        }], {
            key: function (data) {
                return data.id;
            },
            create: function (options) {
                return ko.mapping.fromJS(options.data, {
                    copy: "id",
                    ignore: "obj.t"
                }, {});
            }
        }),
        assertMapped = function (mapped, name) {
            ok(true, name);
            ok(ko.isObservable(mapped));
            mapped = mapped();
            mapped = mapped[0];
            ok(!ko.isObservable(mapped.id));
            ok(ko.isObservable(mapped.value));
            ok(!ko.isObservable(mapped.obj));
            mapped = mapped.obj;
            equal(mapped.t, undefined);
        };
    assertMapped(mapped, "After initial mapping");
    ko.mapping.fromJS([{
        id: "A",
        value: "Value",
        obj: {
            t: "Temp"
        }
    }], mapped);
    assertMapped(mapped, "After updating");
});

test('Issue #62 - B', function() {
    var obj = ko.mapping.fromJS({
            a: "a",
            b: "b",
            c: "c"
        }, {
            ignore: "c"
        });
    equal(obj.a(), "a");
    equal(obj.b(), "b");
    equal(obj.c, undefined);
    ko.mapping.fromJS({
            a: "a",
            b: "b+",
            c: "c"
    }, {
        ignore: "b"
    }, obj);
    equal(obj.a(), "a");
    equal(obj.b(), "b", "Don't update value because ignored");
    equal(obj.c, undefined);
});
