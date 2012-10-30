Release 2.3.3 - October 30th, 2012

* Fixed issue #105, #111: Update callback is not being called
* Fixed issue #107: String values in mapping cause infinite recursion in extendObject

Release 2.3.2 - August 20th, 2012

* Fixed issue #86: Don't update properties on object with update callback

Release 2.3.1 - August 6th, 2012

* Fixed issue #33: Create method in mappings receive meaningless options.parent for observableArray properties
* Fixed issue #99: Updating throttled observable
* Fixed issue #100: private variable leaks onto window object

Release 2.3.0 - July 31st, 2012

* Added support for not mapping certain array elements (return "options.skip" from your create callback)
* Fixed issue #91: "wrap" function makes computed writable
* Fixed issue #94: Bug/problem with ignore argument in mapping.fromJS

Release 2.2.4