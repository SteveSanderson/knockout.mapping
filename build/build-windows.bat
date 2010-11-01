@echo off 
set AllFiles=..\knockout.mapping.js

copy /A /B version-header.js+%AllFiles% output\knockout.mapping-latest.debug.js

@rem Now call Google Closure Compiler to produce a minified version
copy /y version-header.js output\knockout.mapping-latest.js
tools\curl -d output_info=compiled_code -d output_format=text -d compilation_level=ADVANCED_OPTIMIZATIONS --data-urlencode js_code@output\knockout.mapping-latest.debug.js "http://closure-compiler.appspot.com/compile" >> output\knockout.mapping-latest.js
