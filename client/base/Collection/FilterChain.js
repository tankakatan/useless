/*	High level filtering layer
	======================================================================== */

FilterChain = $extends (FilterChain_AdHoc, {

	Controller: $static ($component ({
		$overrideThis: {
			changed: function (value) { /* called when value changes (when removed, value === undefined) */ },
			wasSet: function () { /* this is called when filter was set (with nonempty value) */ },
			removed: function () { /* this is called when filter was removed */ },
			predicate: function (value) { return undefined /* no predicate by default */ },
			html: _.escape } })),

	$defaults: {
		controllers: {} },

	define: function (name, cfg) {
		this.controllers[name] = new FilterChain.Controller (cfg) },

	values: $observableProperty ({}),

	value: function (name) {
		return this.values[name] },

/*	INTERNAL IMPL
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

	init: function () {
		this.valuesChange (function (values) {
			this.atomicChange (this.$ (function (done) {
				_.each (values, this.setValue)
				_.each (this.filters, this.$ (function (filter, name) {
					if (!(name in values)) {
						this.remove (name) } }))
				done () })) }) },

	setValue: function (value, name) {
		if (value === undefined) {
			this.remove (name) }

		else { var controller = this.controllers[name]

			this.set (name, _.extend ({}, controller, {
				evalPredicate: controller.predicate.partial (value),
				html: controller.html.partial (value),
				removed: controller.removed }))

			controller.wasSet (value)
			controller.changed (value) } } })





















