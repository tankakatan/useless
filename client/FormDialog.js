FormDialog = $component ({

	$defaults: {
		value: {},
		changes: {},
		cancelable: true },

	saved: function (historyEntry) { /* override this */ },

	init: function () {

		this.el = $('<div class="modal-overlay form-dialog" style="z-index:2000;">' +
			'<div class="background"></div>' +
			'<div class="modal">' +
				'<div class="modal-body"></div>' +
				'<div class="modal-footer"></div>' +
			'</div>' +
		'</div>').appendTo (document.body)

		this.bodyEl		= this.el.find ('.modal-body')
		this.footerEl	= this.el.find ('.modal-footer')

		if (this.cancelable !== false) {
			$('<button class="btn">').text (this.noLabel ? this.noLabel : 'Закрыть').appendTo (this.footerEl).click (this.$ (function () {
				this.close () })) }

		$('<button class="btn btn-success btn-save">')
			.text (this.yesLabel ? this.yesLabel : 'Сохранить')
			.appendTo (this.footerEl)
			.toggle ((this.saveable === undefined) ? true : this.saveable)
			.touchClick (this.$ (function (e) {
				$(e.delegateTarget).addClass ('wait')
				this.footerEl.find ('.btn:not(.wait)').remove ()
				this.save (this) }))

		if (this.del) {
			$('<button class="btn btn-danger pull-left" style="margin-left: 0;">')
				.text ('Удалить')
				.appendTo (this.footerEl)
				.click (this.$ (function (e) {
					$(e.delegateTarget).addClass ('wait')
					this.footerEl.find ('.btn:not(.wait)').remove ()
					this.del (this) })) }

		/*	Renders from schema
		 */
		if (this.collection && this.collection.fields) {
			_.each (this.collection.fields, function (field, id) {
				if (!(id in this.value)) {
					this.value[id] = this.changes[id] = _.eval (field.defaultValue) }

				var input = this.inputFromFieldDefinition (field, id)
				if (input) {
					this.field ({
						name: field.name,
						input: input }) } }, this) } },

	inputFromFieldDefinition: function (field, id) {
		if (field.type === 'string') {
			if (field.trait === 'id' && _.isString (field.collection)) {
				return this.inputPopover (_.extend (_.pick (field, 'filter', 'sort', 'sortOrder'), {
								id: id,
								source: DataManager[field.collection] })) }

			else if (field.trait === 'enum' && field.values) {
				return this.inputPopover ({
								id: id,
								source: Collection.coerce (field.values) }) }

			else if (field.trait !== 'id') {
				return this.inputText ({ id: id }) } }

		else if (field.type === 'number' && field.trait === 'date') {
			return this.inputDate ({ id: id }) }

		return undefined },

	save: function () {
		DataManager[this.collection.name].upsertItem (
			_.extend (_.pick (this.value, '_id'), this.changes), this.$ (function (entry) {
				this.saved (entry)
				this.close () })) },

	close: $alias ('destroy'),

	destroy: function () {
		this.el.remove () },

	field: function (cfg) {
		this.bodyEl.append ($('<div class="row">')
			.append ($('<label>').text (cfg.name))
			.append ($('<div class="value">').append (cfg.input))) },

	inputDate: function (cfg) {
		var day, month, year
		var handleChanges = this.$ (function () {
			this.changes[cfg.id] = new Date (
				year.attr ('data-value'),
				month.attr ('data-value'),
				day.attr ('data-value')).getTime () })

		var value = this.value && this.value[cfg.id] && new Date (this.value[cfg.id])

		day = this.inputPopover ({
			id: 'day',
			source: Collection.coerce (_.times (31, function (x) { return x + 1 })),
			itemContent: _.property ('_id'),
			commitSelection: handleChanges,
			value: value && value.getDate () })

		month = this.inputPopover ({
			id: 'month',
			source: Collection.coerce (_.times (12, _.identity)),
			itemContent: _.property ('_id').then (_.propertyOf (Format.monthNamesCase)),
			commitSelection: handleChanges,
			value: value && value.getMonth () })

		year = this.inputPopover ({
			id: 'year',
			source: Collection.coerce (_.times (20, function (x) { return (new Date ().getFullYear () - x) })),
			itemContent: _.property ('_id'),
			commitSelection: handleChanges,
			value: value && value.getFullYear () })

		return $('<div class="date-picker">').append ([day, month, year]) },

	inputTime: function (cfg) {

		var hour, minute, second

		var handleChanges = this.$ (function () {
			this.changes[cfg.id] = new Date (
				hour.attr ('data-value'),
				minute.attr ('data-value'),
				second.attr ('data-value')).getTime () })

		var value = 
			this.value[cfg.id] ? 
				new Date (this.value[cfg.id]) : 
					undefined

		// var that = this // this.$
		var inputPopoverHelper = function (id, range, value) {
			return this.inputPopover ({
				id: id,
				source: Collection.coerce (range),
				itemContent: function (item) { return (item._id > 9) ? item._id : '0' + item._id },
				commitSelection: handleChanges,
				value: value
			})
		}.bind (this)

		second = inputPopoverHelper ('second', _.range (0, 60), value && value.getSeconds ())
		minute = inputPopoverHelper ('minute', _.range (0, 60), value && value.getMinutes ())
		hour = inputPopoverHelper ('hour', _.range (0, 24), value && value.getHours ())

		return $('<div class="time-picker">').append ([hour, minute, second]) },

	inputDatetime: function (cfg) {

		var day, month, year, hour, minute, second
		var handleChanges = this.$ (function () {
			this.changes[cfg.id] = new Date (
				year.attr ('data-value'),
				month.attr ('data-value'),
				day.attr ('data-value'),
				hour.attr ('data-value'),
				minute.attr ('data-value'),
				second.attr ('data-value')).getTime ()
			if (cfg.commitSelection) { cfg.commitSelection () } })

		var value = this.value && this.value[cfg.id]
		var dateValue = value && new Date (value)

		var inputPopoverHelper = function (id, value, length, translator) {

			var content = {
				'day': 		_.property ('_id'),
				'year': 	_.property ('_id'),
				'month': 	_.property ('_id').then (_.propertyOf (Format.monthNamesCase)) }

			var popover = {
				id: id,
				source: Collection.coerce (_.times (length, translator)),
				itemContent: content[id] || _.property ('_id').then (Format.leadingZero),
				commitSelection: handleChanges,
				value: value }

			if (id === 'month') {
				popover.label = function (monthNumber) {
					return Format.monthNamesCase[monthNumber._id] } }
			
			return this.inputPopover (popover) }.bind (this)

		if (dateValue) {
			day = 		inputPopoverHelper (
							'day', dateValue.getDate (), 31, function (date) {
								return date + 1 })
			month = 	inputPopoverHelper ('month', dateValue.getMonth (), 12)
			year = 		inputPopoverHelper (
							'year', dateValue.getFullYear (), 20, function (year) {
								return (new Date ().getFullYear () + year) })
			hour = 		inputPopoverHelper ('hour', dateValue.getHours (), 24)
			minute = 	inputPopoverHelper ('minute', dateValue.getMinutes (), 60)
			second = 	inputPopoverHelper ('second', dateValue.getSeconds (), 60) }

		return $('<div class="datetime-picker">').append ([day, month, year, hour, minute, second]) },

	dateTimePicker: function (cfg) {

		var dateTimeFormat = (cfg && cfg.format) || "D MMMM YYYY H:mm"
		var dateTimePicker = $('<div class="datetime-picker">')
				.append ($('<input type="text" class="form-control" data-date-format="' + dateTimeFormat + '">')
				.datetimepicker (_.extend ({
						language: 'ru',
						useSeconds: false,
						showToday: true,
						keepOpen: false,
						defaultDate: (cfg.date ? moment (cfg.date) : moment ()),
						minDate: moment () }, _.omit (cfg || {}, 'date', 'format', 'showNowBtn'))) )
				
				// .append ($('<span class="input-group-addon">')
				// 	.append ($('<span class="glyphicon glyphicon-calendar">')) )
		
		if (cfg && cfg.showNowBtn) {
			dateTimePicker
				.append ($('<button class="btn btn-small btn-info btn-filter btn-date-now">').text ('Сейчас')
					.touchClick (function (e) {
						dateTimePicker.datetimepicker ({ language: 'ru' }).data ("DateTimePicker")
							.setDate (moment ()) })
					.prepend ('<span class="glyphicon glyphicon-time">')) }

		return dateTimePicker },

	inputText: function (cfg) {
		return (cfg.inputElement ? cfg.inputElement : $('<input type="text"></input>'))
			.attr ('placeholder', cfg.placeholder || '')
			.addClass (cfg.id)
			.val ((this.value && this.value[cfg.id]) || '')
			.on ('keyup keydown change', this.$ (function (e) {
				this.changes[cfg.id] = $(e.delegateTarget).val () })) },

	inputPopover: function (cfg) {
		_.defaults (cfg, { readonly: false })

		var input = $('<input type="text" class="selector"></input>')
			.addClass (cfg.id)
			.val ('Загрузка...')
			.attr ('placeholder', cfg.placeholder || '')

		input.updateWithItemId = function (itemId) {
            var item = itemId && cfg.source.index[itemId]
            var itemToString = cfg.itemText || cfg.itemContent || cfg.source.text || function (item) { return item.name || item._id }
            input.attr ('data-value', itemId).val ((item && itemToString (item)) || itemId || '')
            return this } 

		if (cfg.readonly)
			input.attr ('readonly', true)

		console.log (cfg.id, cfg.source)

		cfg.source.notEmpty (this.$ (function () { _.delay (this.$ (function () {
			var item = null

			var popover = new ListViewPopover (_.extend ({
					hover: false,
	                click: true,
	                width: input.width () + 20,
					anchor: input[0],
	                itemClick: this.$ (function (id, item) {
						input.updateWithItemId (id)
						if (cfg.commitSelection) {
							cfg.commitSelection (item) }
						else {
							this.changes[cfg.id] = id } }) },
             	cfg, {
					source: (cfg.filter || cfg.sort) ?
						new SortedFilteredCollection (_.pick (cfg, 'source', 'filter', 'sort', 'sortOrder')) :
						cfg.source }))

			var value = (cfg.value !== undefined) ? cfg.value : (this.value && this.value[cfg.id])
			
			if (value !== undefined) {
				input.updateWithItemId (value) }
			else {
				input.val ('') }

			if (cfg.keyup)
				input.keyup (cfg.keyup)

			input.blur (function () {
				popover.toggled = false })

			if (cfg.readonly) {
				input.click (function (e) {
					if (popover.toggled) {
						input.blur () }
					else {
						popover.toggled = false } }) }
			else {
				input.on ('click focus', function (e) {
					popover.toggled = true }) } })) }))

		return input }
})