/*	A temporary stub for real require.js for browser code, allowing to not
	bother with ugly conditional require() calls in shared code.
	======================================================================== */

if (typeof require !== 'undefined') {
	throw new Error ('Got require already defined! Are you running require.js on server? Somebody call the police!') }

require = function (moduleName) {
	var moduleExports = {
		'underscore': 			_,
		'underscore.string': 	_.string,
		'./foundation': 		{},
		'./concurrency': 		{},
		'./base/foundation': 	{},
		'./DAL': 				typeof DAL == 'undefined' ? undefined : DAL,
		'./base/log': 			typeof log == 'undefined' ? undefined : log,
		'./log': 				typeof log == 'undefined' ? undefined : log }

	if (!moduleExports[moduleName]) {
		throw new Error (moduleName in moduleExports ?
			('require.js: you forgot to include scripts file for ' + moduleName + ' module') :
			('require.js: unknown module ' + moduleName)) }
	else {
		return moduleExports[moduleName] }}