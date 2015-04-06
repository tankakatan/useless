/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
------------------------------------------------------------------------

Foundation.js is former common.js, split into micro-modules that join back
into single file when served to client. In node.js they load as regular
modules, using standard 'require' utility.

What foundation.js is, could be best described as 'busybox': a portable
palette of ideas, bound together by those characters:

	- It's basic and abstract (i.e. sensible as building block in any type of application)
	- It's cross-platform (i.e. work both in Node.js and browser engines)
	- It's simple yet powerful (and that power comes from simplicity)... at least, it tends to be

Its mission is to match the application code to thought structures from which it
renders; cutting all clutter that hinders the original intention, diminishing the
gap between 'what should be done' and 'how it should be done'. 

------------------------------------------------------------------------
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */

_ = require ('underscore')


/*	Bootstrap code (couple of absolutely urgent fixes to underscore.js)
	======================================================================== */

_ = (function () {

	_.mixin ({
		zipWith: function (rows, zippo) {
					return _.reduce (_.rest (rows), function (memo, row) {
						return _.times (Math.max ((memo && memo.length) || 0, (row && row.length) || 0), function (i) {
							return zippo (memo && memo[i], row && row[i]) }) }, _.first (rows)) } })

	if ('a1 b2 c3' !== _.zipWith ([['a','b','c'], [1,2,3]], function (a, b) { return a + b }).join (' ')) {
		throw new Error ('_.zipWith broken') }

	var __mixin = _.mixin
		_.mixin = function (what) { __mixin (what); return _ } // _.mixin that returns _

	if (_.mixin ({}) !== _) {
		throw new Error ('_.mixin broken') }

	return _ }) ()


/*	As we do not run macro processor on server scripts, $include reduces to
	built-in require (if running in Node.js environment)
	======================================================================== */

	$include = require


/*	Internal dependencies
	======================================================================== */


/*	Third party (free-licensed)
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

	$include ('./foundation/3rd/unicode_hack')	// provides missing unicode regexp syntax
	$include ('./foundation/3rd/Base64')		// Base64 encoder/decoder


/*	Basics of basics
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

	$include ('./foundation/tier0/platform')	// platform abstraction layer
	$include ('./foundation/tier0/assert')		// $assert syntax
	$include ('./foundation/tier0/arguments')	// argument count tracking utility (to streamline metaprogramming utilities)
	$include ('./foundation/tier0/function')	// function-centric utilities
	$include ('./foundation/tier0/busybox')		// a vocabulary for functional expressions that process real stuff
	$include ('./foundation/tier0/type')		// type system extensions
	$include ('./foundation/tier0/stdlib')		// consider it as underscore 2.0
	$include ('./foundation/tier0/properties')	// properties 2.0
	$include ('./foundation/tier0/keywords')	// metaprogramming utility
	$include ('./foundation/tier0/typeMatch')	// advanced type system extensions


/*	Delivers continuation-passing style notation to various common things
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

	$include ('./foundation/CPS')


/*	OOP paradigm
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

	$include ('./foundation/OOP')


/*	Ports platform.js to OOP terms 
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

	Platform = $singleton ({ $property: {
		engine:	_.platform ().engine,
		system: _.platform ().system,
		device: _.platform ().device,

		NodeJS: _.platform ().engine === 'node',
		iPad:	_.platform ().device === 'iPad',
		iPhone: _.platform ().device === 'iPhone',
		iOS:	_.platform ().system === 'iOS' } })


/*	Provides infix notation for stdlib utility
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

	$include ('./foundation/infix/extensionMethods')	// bootstrap
	$include ('./foundation/infix/Function')			// extends Function
	$include ('./foundation/infix/Array')				// extends Array
	$include ('./foundation/infix/String')				// extends String


/*	Dynamic code binding toolbox
 	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

	$include ('./foundation/dynamic/bindable')			// for ad-hoc dependency injection in any object's method
	$include ('./foundation/dynamic/stream')			// a generalization of Event (multicast model for function calls)


/*	Performance testing utility
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

	$include ('./foundation/profiling')


/*	Otherwise basic utility (actually a bug-ridden clumsy legacy code)
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

	$include ('./foundation/math')		// clumsy math utils
	$include ('./foundation/Parse')		// clumsy parsing utils
	$include ('./foundation/Format')	// clumsy formatting utils
	$include ('./foundation/Sort')		// (this one is normal)


/*	Self-awareness utils: callstack access + source code access
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

	$include ('./foundation/reflection')

/*	==================================================================== */

	if (Platform.NodeJS) { // Should strip it from client with conditional macro in future...
		module.exports = _ }

