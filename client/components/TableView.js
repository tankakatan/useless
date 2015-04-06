CountedFieldValuesCollection = $extends (Collection, {

	isCollection: $property (true), // for RTTI, as our Collections zoo not deriving from single base class

	init: function () {
		Collection.prototype.init.call (this)

		this.sourceUpdated ()

		this.source.updated (this.sourceUpdated)
		this.source.itemUpdated (this.sourceItemUpdated)
		this.source.itemDeleted (this.sourceItemDeleted) },

	sourceUpdated: function () {
		var id = this.fieldId
		var entries = this.source.items
		var countValues = {}
		for (var i = 0, n = entries.length; i < n; i++) {
			var value = entries[i][id]
			var count = countValues[value]
			countValues[value] = (count || 0) + 1 }

		this.update (_.map (countValues, function (count, k) {
			return { _id: k, count: count } })) },

	sourceItemUpdated: function (nowItem, wasItem) {
		var id = this.fieldId
		var now = nowItem[id]
		var was = (wasItem || {})[id]
		if (now !== was) {
			if (was) {
				this.mapItem (was, function (item) {
					return item && _.extend (item, { count: item.count - 1 }) }) }
			this.mapItem (now, function (item) {
				return _.extend (item || { _id: now }, { count: ((item && item.count) || 0) + 1 }) }) } },

	sourceItemDeleted: function (wasItem) {
		this.mapItem (wasItem[this.fieldId], function (item) {
			return _.extend (item, { count: item.count - 1 }) }) } })

TableView = $component ({

	/*	Injection points for behavior customization (contextMenu is also supported, simply define that method)
	 */
	rowClass: 			function (item) { return '' },
//	contextMenu:		function (cfg) {},					// cfg = { event, row, cell, column, item }
	cellDoubleClick:	$trigger (/*cfg*/),					// cfg = { event, row, cell, column, item }
	selection:			$observableProperty (),

	state: $observableProperty ({}), // this is for persistence

	/*	Override this to commit requested state changes to external persistence controller
	 */
	requestStateChange: function (newState) {
		this.state = newState },

	/*	Default column config
	 */
	defaultColumnConfig: function (column) {

		/*	Common behavior
		 */
		var cfg = {
			cls: column.flexWidth ? 'left-align' : '',
			html: (column.text || _.identity).then (_.escape),
			htmlShort: (column.html || column.text || _.identity).then (_.escape) }
		
		/*	Dates
		 */
		if (column.type === 'number' && column.trait === 'date' && !column.render) {
			var timeFormat = _.pick (column, 'withAgoText', 'shortUnits')
			return _.extend (cfg, {
				alloc: function (el) {
					el.on ('mouseenter', function () {
						el.html (Format.dateTimeFromTimestamp (parseInt (el.attr ('data-date'), 10), timeFormat)) })
					el.on ('mouseleave', function () {
						el.html (Format.relativeTime (parseInt (el.attr ('data-date'), 10), timeFormat)) })
					return el },

				update: function (el, value) {
					el.html (Format.relativeTime (value, timeFormat)).attr ('data-date', value) } }) }

		/*	Any other
		 */
		else {
			return _.extend (cfg, {
				alloc: function (span) {

					/*	Prealloc with text node, if applicable
					 */
					if (!this.render && !this.asHtml) {
						span.append (span._text = document.createTextNode('')) }

					return span },

				update:	function (el, value, entry) {

					/*	Render either in-place (for simple text) or call render(), which is slow, but works for ad-hoc stuff
					 */
					if (el._text) {
						el._text.nodeValue = this.text (value, entry) }
					else {
						el.empty ().append (this.render (value, entry)) } },

				/*	For performance, one should not use render() but should override
					alloc/update pair, and perform update in-place, not creating any
					DOM at update() call. For pure text data, simply do not override render() at all.
				 */
				render: function (value, entry) {
					return this.htmlShort ? this.htmlShort (value) : value } }) } },

	/*	Setup
	 */
	init: function () {

		/*	Default table view config
		 */
		_.defaults (this, {
			disableCellPopover:	false,
			selectedItemId:		undefined,
			filtersById:		{},
			filters:			[],
			rowHeight:			25,
			toggleableColumns:	true,
			noVirtualization:	false })

		/*	Init collection
		 */
		if (!this.source || !this.source.filterBy) {
			this.source = new SortedFilteredCollection (
				_.pick (this, 'source', 'sortField', 'sort', 'sortOrder')) }

		/*	Extend columns data with field descriptions from Collection
		 */
		if (_.isArray (this.columns)) {
			var fields = this.source.originalSource.fields || {}
			_.each (this.columns, function (column) {
				_.defaults (column, fields[column.id]) }) }

		/*	Or extend field descriptions with column data
		 */
		else {
			this.columns = _.map (this.source.originalSource.fields, function (v, k) {
								return _.extend ({ id: k }, v, (this.columns || {})[k]) }, this) }

		/*	Inject default cfg into columns + index them by id
		 */
		this.columnsById = _.indexBy.flip2 ('id',
			_.map (this.columns, function (column) {
				return _.defaults (column, this.defaultColumnConfig (column)) }, this))

		/*	Memoize cell popovers
		 */
		_.each (this.columns, function (column) {
			if (column.cellPopover) {
				column.cellPopover = _.memoize (column.cellPopover)

				/*	Notify popover about cell change
				 */
				column.cellPopover ().anchorChange (function (anchor) {
					if (this.cellChange) { var item = $(anchor).parent ().item ()
						this.cellChange (item, item[column.id]) } })

				/*	This is needed to supress highlighting of whole row when popoverized cell is hovered
				 */
				column.cellPopover ().visibleChange (function (yes) {
					$(this.anchor).parent ().toggleClass ('popover-visible', yes) }) } })

		/*	Init filters
		 */
		this.initFilters ()

		/*	Hold reference to table-bar instance
		 */
		this.bar = $(this.bar)

		/*	Init DOM
		 */
		this.el = $(this.el).addClass ('table-view')
		this.headers = $('<div class="headers">').appendTo (this.el)
		this.content = $('<div class="content">').appendTo (this.el)

		/*	DOM memory management, 'sliding window' cache algorithms
		 */
		this.rowRenderer = new (this.noVirtualization ? DumbshitListViewRenderer : VirtualListViewRenderer) ({
			el: this.content,
			itemExtent: this.rowHeight,
			itemCount: this.$ (function () { return this.source.items.length }),
			updateItem: this.updateRow,
			allocItem: this.allocRow })

		/*	Shortcuts for DOM access
		 */
		this.canvas = this.rowRenderer.canvas
		this.viewport = this.rowRenderer.viewport

		/*	Init stuff
		 */
		this.initTextSearch ()

		/*	Bind to source collection
		 */
		this.source.changed (this.refresh)
		this.source.updated (this.updateBar)

		/*	Bind to other dependent collections (in theory, this is not needed more, as RemoteCollection.html now returns databind-enabled <span>)
		 */
		/*_.each (this.columns, this.$ (function (column) {
			if (typeof column.collection === 'string') {
				DataManager[column.collection].changed (this.refresh) } })) */

		/*	Refresh on selection change
		 */
		this.selectionChange (this.refresh)

		/*	Listen to layout change events
		 */
		$(window).resize (this.rebuildLayout)

		/*	Rebuild layout
		 */
		this.rebuildLayout () },


	/*	Obtains popover for a column (do not override: use column.popover to override)
	 */
	columnPopover: $memoize (function (columnId) {		
		var column			= this.columnsById[columnId]
		var isCollection	= column.isObjectID && typeof column.collection === 'string'
		var isEnum			= column.trait === 'enum'
		
		/*	Custom popover
		 */
		if (column.popover) {
			return column.popover.call (this) }

		/*	Enum popovers
		 */
		else if (isCollection || isEnum) {
			return this.countedFieldValuesPopover ({
				fieldId: column.id,
				popoverWidth: column.popoverWidth }) }
		
		/*	No frigging popover at all
		 */
		return undefined }),


	countedFieldValuesPopover: function (cfg) { var fieldHtml = this.fieldHtml (cfg.fieldId)
		return new ListViewPopover ({
			width: cfg.popoverWidth || 160,
			hasContent: function () {
				return this.itemCount > 1 },

			source: new SortedFilteredCollection ({
				filter: function (item) { return item.count > 0 },
				source: new CountedFieldValuesCollection ({
					source: this.source,
					fieldId: cfg.fieldId }) }),

			itemContent: this.$ (function (item) {
				return (item._id === 'undefined' ? 'Неизвестно' : fieldHtml (item._id)) + '<span class="count">' + item.count + '</span>' }),

			itemClick: cfg.itemClick || this.filterBy.partial (cfg.fieldId).arity1 }) },

	fieldHtml: function (field) {
		return ((this.columnsById[field] || {}).html || (this.source.fields && this.source.fields[field].html) || _.escape) },

	/*	Call this to update contents
	 */
	refresh: function () {
		this.rowRenderer.refresh () },

	/*	Filtering API
	 */
	initFilters: function () {
		this.stateChange (function (state) {
			this.filterChain.values = state })

		this.filterChain =
			new FilterChain ({ collection: this.source,

					wasSet: this.$ (function (filter, id) {
						var column = this.columnsById[id]
						if (column) {
							column.headerEl.addClass ('filtered no-popover').find ('.name').html (_.eval (filter.html)) } }),

					removed: this.$ (function (filter, id) {
						var column = this.columnsById[id]
						if (column) {
							column.headerEl.removeClass ('filtered no-popover').html (this.columnHeaderHtml (column)) } }),
					
					changed: this.$ (function (filters) {
						this.rowRenderer.scrollTo (0)
						this.updateBar () }) })

		_.each (this.filters, this.defineFilter.flip2)
		_.each (this.columnsById, function (column, id) {
			this.filterChain.define (id, _.extend ({
				html: column.htmlShort,
				predicate: function (value) {
					return function (item) { return item[id] === value } } }, column.filter)) }, this) },

	hasFilter: function (id) {
		return this.filterChain.has (id) },

	filterBy: function (id, value) {
		if (arguments.length === 1) { // for short notation: "filterBy (xxx)"
			value = true }
		this.requestStateChange (_.nonempty (_.extend ({}, this.state, _.object ([[id, value]])))) },

	toggleFilter: function (id, value) {
		if (this.hasFilter (id)) {
			this.removeFilter (id) }
		else {
			this.filterBy (id, value) } },

	removeFilter: function (id) {
		this.requestStateChange (_.omit (this.state, id)) },

	defineFilter: function (name, cfg) {
		this.filterChain.define (name, cfg) },

	/*	Full-text search
	 */
	initTextSearch: function () {
		TableView.fullTextSearchBehavior ({
			ui: this.bar.find ('.search'),
			define: this.defineFilter,
			set: this.filterBy,
			remove: this.removeFilter }) },

	/*	Re-usable piece of behavior
	 */
	fullTextSearchBehavior: $static (function (cfg) { var filterToken = '#text'

		var input = cfg.ui.find ('input')

		cfg.define (filterToken, {
			wasSet: function (searchText) { cfg.ui.addClass ('active')
						if (!input.is (':focus')) {
							input.val (searchText) }
						if (cfg.wasSet) {
							cfg.wasSet (searchText) } },

			predicate: function (searchText) {
							return function (item) {
								return (item.searchText.indexOf (searchText) >= 0) } },

			removed: function () { cfg.ui.removeClass ('active')
						input.val ('')
						if (cfg.removed) {
							cfg.removed () } } })

		cfg.ui.find ('.cancel').touchClick (function () {
			cfg.remove (filterToken) })

		input.on ('keyup change', function (e) {
			var input = $(e.delegateTarget)
			var searchText = $.trim (input.val ().toLowerCase ())
			cfg.set (filterToken, ((e.keyCode != 27) && (searchText.length > 2) && searchText) || undefined) }) }),

	/*	Gets called whenether viewport updates its metrics
	 */
	rebuildLayout: function () {
		if (this.viewport.is (':visible')) {
			var viewportWidth = this.viewport.width ()
			if (viewportWidth != this.viewportWidth) {
				this.canvas.width (this.viewportWidth = viewportWidth)
				this.computeColumnWidths ()
				this.renderHeaders ()
				this.rowRenderer.reset ()
				this.updateBar () } } },

	computeColumnWidths: function () {
		_.each (this.columns, function (column) {
			if (column.fixedWidth === undefined && column.flexWidth === undefined) {
				column.flexWidth = 100 } })

		var columns = _.filter (this.columns, function (column) { return !column.hidden })
		var totalFlexWidth = _.reduce (columns, function (sum, column) { return sum + (column.flexWidth || 0) }, 0)
		var totalFixedWidth = _.reduce (columns, function (sum, column) { return sum + (column.fixedWidth || 0) }, 0)
		var left = 0
		var totalFlexWidthInPixels = this.viewportWidth - totalFixedWidth

		_.each (columns, this.$ (function (column, index) {
			if (index == this.columns.length - 1) {
				column.width = this.viewportWidth - left }
			else {
				column.width = column.fixedWidth || Math.floor ((column.flexWidth / totalFlexWidth) * totalFlexWidthInPixels) }

			column.offset = left
			left += column.width })) },

	/*	Re-renders DOM for column headers
	 */
	renderHeaders: function () {
		this.headers.html ('').append (
			_.map (this.columns, this.$ (function (column, index) {
				return (column.headerEl = column.hidden ? undefined : this.renderHeader (column, index).appendTo (this.headers)) }))) },

	/*	Re-renders .table-bar
	 */
	updateBar: function () {
		var filtersEl = this.bar.find ('.filters').empty ()

		if (this.filterChain.empty) {
			filtersEl.append (UI.tableBarAllSelectedPane (this.source.iconCls || '',
				'Всего', this.source.items.length, this.source.originalSource.names))
		} else {
			filtersEl.append (_.map (_.values (this.filterChain.filters).reversed, function (filter) {
				return (UI.tableBarRemoveFilterButton (_.eval (filter.html), this.source.items.length,
					_.map (this.source.originalSource.names, function (name) { return name.split (' ')[0] }))
					.mousedown (this.removeFilter.partial (filter.id))) }, this)) } },

	/*	Returns HTML content for a column header
	 */
	columnHeaderHtml: function (column) {
		return '<span class="name">' + (column.nameHtml || column.name.capitalized) + '</span>' },

	/*	Renders DOM for a column header
	 */
	renderHeader: function (column, index) {
		return this.withColumnPopover (column, $('<span>')
			.attr ('class', _.nonempty (['header', column.id, column.cls]).join (' '))
			.css ({ left: column.offset, width: column.width })
			.append (this.columnHeaderHtml (column))
			.mousedown (this.$ (function (e) {
				if (this.hasFilter (column.id) && this.toggleableColumns) {
					this.removeFilter (column.id) } }))) },

	/*	Adds popover behavior to column header
	 */
	withColumnPopover: function (column, el) {
		_.delay (this.$ (function () {
			var popover = this.columnPopover (column.id)
			if (popover) {
				if (_.isString (column.cls) && (column.cls.indexOf ('left-align') >= 0)) {
					popover.align = 'left' }
				popover.anchor = el[0] } }))
		return el },

	/*	Allocates re-usable DOM placeholder for a table row
	 */
	allocRow: function () {
		var el = $('<div class="row">')
					.mousedown (this.$ (function (e) { var itemId =  $(e.delegateTarget).item ()._id
						if (e.button === 0) {
							if (this.selection == itemId && this.cellDoubleClick.queue.length === 0) {
								this.selection = undefined }
							else {
								this.selection = $(e.delegateTarget).item ()._id } } }))

		el._cellsById = _.object (
			_.map (_.reject (this.columns, _.property ('hidden')),
				function (column) {
					return [column.id, this.allocCell (column, el)] }, this))

		return el
			.attr	({ 'class': 'row' })
			.css	({ 'height': this.rowHeight })
			.append (_.values (el._cellsById))
			.appendTo (this.canvas) },

	/*	Allocates re-usable DOM placeholder for a table cell
	 */
	allocCell: function (column, row) {
		var cell = column.alloc ($('<span>')
			.attr ('class', _.nonempty (['column', column.id, (_.isString (column.cls) && column.cls) || undefined]).join (' '))
			.css ({ display: '', left: column.offset, width: column.width, height: this.rowHeight })
			.bind ('contextmenu', this.$ (function (e) {
				if (this.contextMenu) {
					return this.contextMenu ({ event: e, row: row, cell: $(e.delegateTarget), column: column, item: row._item }) } }))
			.dblclick (this.$ (function (e) {
				var context = { event: e, row: row, cell: $(e.delegateTarget), column: column, item: row._item }
				if (column.cellDoubleClick) {				// call column-level handler
					column.cellDoubleClick (context) }
				this.cellDoubleClick (context) })))			// call table-level handler

		/*	Instant helper for TableView column.click (...), column.hover (...), etc
		*/
		var getEntryData = function (e) {
			return { event: e, row: row, cell: $(e.delegateTarget), column: column, item: row._item } }

		if (column.cellClick) {
			cell.click (this.$ (function (e) { column.cellClick (getEntryData (e)) }))}

		if (column.cellHoverIn) {
			cell.hover (
				function (e) { column.cellHoverIn (getEntryData (e)) },
				function (e) { if (column.cellHoverOut) { column.cellHoverOut (getEntryData (e)) }} )}


		if (!this.disableCellPopover && column.cellPopover) {
			cell.hover (
				function () { row.addClass ('cell-hovered') },
				function () { row.removeClass ('cell-hovered') })

			column.cellPopover ().popoverize (cell[0]) }

		cell[0]._fixedClassPart = cell[0].className

		return cell },

	/*	Injects actual data into rendered placeholder
	 */
	updateRow: function (row, rowIndex, offsetTop) {
		var item = this.source.items[rowIndex]
		var columns = this.columnsById

			/*	Update row element
			 */
			_.extend (row
						.item (item)
						.attr ('data-id', item._id)
						.attr ('class', 'row ' +
							(rowIndex % 2 ? 'even ' : '') +
							(item._id === this.selection ? 'selected selected-first selected-last ' : '') +
							this.rowClass (item))
						.css ({ top: offsetTop, display: '' }), {
					_id: item._id,
					_item: item })

			/*	Update cell elements
			 */
			_.each (row._cellsById, function (cell, id) {
				var column = columns[id]
				var value  = item[id]

				if (_.isFunction (column.cls)) {
					cell[0].className = (cell[0]._fixedClassPart + ' ' + column.cls (value, item)) }

				cell.item (item)
				column.update (cell, value, item) }) } })




