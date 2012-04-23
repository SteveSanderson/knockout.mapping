@echo off 
set AllFiles=..\knockout.mapping.js

@rem Call Google Closure Compiler to produce a minified version
copy /y version-header.js output\knockout.mapping-latest.js
cscript tools\searchReplace.js "var DEBUG=true;" "/**@const*/var DEBUG=false;" output\knockout.mapping-latest.debug.js >nul
tools\curl -d output_info=compiled_code -d output_format=text -d compilation_level=SIMPLE_OPTIMIZATIONS --data-urlencode js_code@output\knockout.mapping-latest.debug.js "http://closure-compiler.appspot.com/compile" >> output\knockout.mapping-latest.js

@rem Also create a simple debug-enabled version
copy /A /B version-header.js+%AllFiles% output\knockout.mapping-latest.debug.js
