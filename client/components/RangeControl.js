RangeControl = $component ({
	
	$defaults: {
		min: undefined,
		max: undefined,
		scale: undefined, // e.g.: [{ value: 1, title: 'one' }, { value: 2, title: 'two' }, ...]
		floatingPoint: false },

	minMaxReady: $barrier (),

	init: function () {
		this.el = $(this.renderTo || '<div>').addClass ('range')

		var handleWidth = this.handleWidth = 40
		var sliderWidth = this.sliderWidth = this.el.width () - this.handleWidth*2 + 4
		var handlePosition = this.handlePosition = [0, sliderWidth]

		var leftHandle = this.leftHandle = $('<div class="handle from">')
			.css ({ width: handleWidth, left: handlePosition[0] })
			.appendTo (this.el)
			.drag ({
				start: function () {
					lastHandlePosition = handlePosition[0] },
				move: this.$ (function (offset) {
					leftHandle.css ('left', handlePosition[0] = Math.min (this.sliderWidth, Math.max (0, lastHandlePosition + offset.x)))
					rightHandle.css ('left', handlePosition[1] = Math.max (handlePosition[0], handlePosition[1]))
					this.updateLabels () }),
				end: this.$ (this.triggerValueChanged) })

		var rightHandle = this.rightHandle = $('<div class="handle to">')
			.css ({ width: handleWidth, left: handlePosition[1] })
			.appendTo (this.el)
			.drag ({
				start: function () {
					lastHandlePosition = handlePosition[1] },
				move: this.$ (function (offset) {
					rightHandle.css ('left', handlePosition[1] = Math.min (this.sliderWidth, Math.max (0, lastHandlePosition + offset.x)))
					leftHandle.css ('left', handlePosition[0] = Math.min (handlePosition[0], handlePosition[1]))
					this.updateLabels () }),
				end: this.$ (this.triggerValueChanged) })

		this.el.on ('dblclick', this.$ (this.reset)) },

	changeMetrics: function (changes) {
		var values = [this.valueLeft (), this.valueRight ()] // save values
		changes.call (this)
		this.leftHandle.css ('left', this.handlePosition[0] = this.valueToHandlePosition (values[0], 0)) // restore handle positions
		this.rightHandle.css ('left', this.handlePosition[1] = this.valueToHandlePosition (values[1], this.sliderWidth))
		this.updateLabels () },

	updateLayout: function () {
		this.changeMetrics (function () {
			this.sliderWidth = this.el.width () - this.handleWidth*2 + 4  }) },

	triggerValueChanged: function () {
		this.valueChanged (this.valueLeft (), this.valueRight ()) },

	expanded: function () {
		return (this.valueLeft () === undefined) && (this.valueRight () === undefined) },

	reset: function (silent) {
		this.leftHandle.css ('left', this.handlePosition[0] = 0)
		this.rightHandle.css ('left', this.handlePosition[1] = this.sliderWidth)
		this.updateLabels ()
		if (silent !== true) {
			this.triggerValueChanged () } },

	setValue: function (min, max, silent) {
		this.minMaxReady (function () {
			this.setValueLeft (min)
			this.setValueRight (max)
			this.updateLabels ()
			if (silent !== true) {
				this.triggerValueChanged () } }) },

	setMinMax: function (min, max) {
		this.changeMetrics (function () { this.min = min; this.max = max })
		this.minMaxReady (true) },

	setCustomScale: function (scale) {
		this.changeMetrics (function () { this.scale = scale })
		this.minMaxReady (true) },

	hasMinMax: function () {
		return this.min !== undefined && this.max !== undefined },

	hasCustomScale: function () {
		return this.scale !== undefined },

	formatValue: function (value) {
		if (this.hasCustomScale ()) {
			return value.label }
		else if (this.hasMinMax ()) {
			return Math.floor (value) }
		else {
			return value } },

	setValueLeft: function (v) {
		this.leftHandle.css ('left', this.handlePosition[0] = this.valueToHandlePosition (v, 0)) },

	setValueRight: function (v) {
		this.rightHandle.css ('right', this.handlePosition[1] = this.valueToHandlePosition (v, this.sliderWidth)) },

	valueToHandlePosition: function (val, edgeCase) {
		if (val === undefined) {
			return edgeCase }
		else {
			if (this.hasCustomScale ()) {
				var index = this.scale.indexOf (_.find (this.scale, this.$ (function (entry) { return this.valueEquals (entry, val) })))
				if (index >= 0) {
					return (index / (this.scale.length - 1)) * this.sliderWidth }
				else {
					return edgeCase } }
			else if (this.hasMinMax ()) {
				return ((val - this.min) / (this.max - this.min)) * this.sliderWidth }
			else {
				return edgeCase } } },

	valueLeft: function () {
		if (this.handlePosition[0] === 0) {
			return undefined }
		else {
			return this.valueOf (this.handlePosition[0] / this.sliderWidth) } },

	valueRight: function () {
		if (this.handlePosition[1] === this.sliderWidth) {
			return undefined }
		else {
			return this.valueOf (this.handlePosition[1] / this.sliderWidth) } },

	valueOf: function (t) {
		if (this.hasMinMax ()) {
			var value = _.lerp (t, this.min, this.max)
			return this.floatingPoint ? value : Math.floor (value + 0.00001) }
		else if (this.hasCustomScale ()) {
			return this.scale[Math.floor (_.lerp (t, 0, this.scale.length - 1) + 0.00001)] }
		else {
			return t } },

	valueEquals: function (a, b) {
		return a == b }, // one may override this for custom scales 

	updateLabels: function () {
		this.leftHandle.text (this.formatValue (this.valueOf (this.handlePosition[0] / this.sliderWidth)))
		this.rightHandle.text (this.formatValue (this.valueOf (this.handlePosition[1] / this.sliderWidth))) }
		
})