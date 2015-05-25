TileView = $component ({

/*	TESTS
	======================================================================== */

	$tests: {
		'reorder history algorithms': function () {

			/*	Helper
			 */
			var moveArrayItem = function (arr, from, to) {
				var val = arr[from]
				arr.removeAt (from)
				arr.insertAt (val, to); return arr }

			$assert (moveArrayItem (['a','b'], 0, 1), ['b','a'])
			$assert (moveArrayItem (['a','b','c','d','e'], 1, 4), ['a','c','d','e','b'])

			/*	Test routine
			 */
			var test = function () {
				var users = _.times (_.random (1, 20), Format.randomHexString.partial (16))
				var original = _.clone (users)
				var history = new TileView.ReorderHistory ()

				/*	simulates drag & drop of user tile
				 */
				var move = function (arr, from, to) {
					history.itemMoved ({ id: users[from], from: from, to: to })
					moveArrayItem (users, from, to) }

				/*	simulate monkey at work
				 */
				for (var i = 0, n = _.random (50); i < n; i++) {
					move (users, _.random (0, users.length - 1), _.random (0, users.length - 1)) }

				/*	reconstruct from history
				 */
				var reconstructed = _.clone (original)
				_.each (history.entries, function (entry) {
					moveArrayItem (reconstructed, reconstructed.indexOf (entry.id), entry.to) })

				/*	should be equal to monkey-generated data
				 */
				return $assert (users, reconstructed) }

			/*	Repeat test 200 times
			 */
			for (var i = 0, n = 200; (i < n) && test (); i++) { _.noop () }
		}
	},

/*	CONFIGURATION
	======================================================================== */

	$defaults: {
		minTileWidth: 200,
		tileHeight: 200,
		source: undefined,
		singleColumnMode: false },
	
	$overrideThis: {
		tileAllocated: function (el) {},
		tileRendered: function (el, item) {} },

	init: function () {
		this.rowRenderer = new (this.noVirtualization ? DumbshitListViewRenderer : VirtualListViewRenderer) ({
			el: this.el = $(this.el).addClass ('tile-view'),
			isClustered: false,
			bottomPadding: 1,
			itemExtent: this.tileHeight,
			itemClass: 'row',
			itemCount: this.$ (function () {
				return this.isClustered () ? this.source.clusters.length : this.numRows }),
			updateItem: this.$ (this.updateRow),
			allocItem: this.$ (this.allocRow),
			freeItem: this.$ (this.freeRow),
			viewportUpdated: this.$ (this.updateChildViewports) })

		this.canvas = this.rowRenderer.canvas
		this.viewport = this.rowRenderer.viewport

		this.source.changed (this.refresh) // refresh() is blazingly fast so we don't bother with itemUpdated/itemDeleted here

		this.initReorder ()

		$(window).resize (this.canvasSizeChanged)
		_.delay (this.canvasSizeChanged) },
	
	destroy: function () {
		this.source.changed.off (this.refresh)
		$(window).off ('resize', this.canvasSizeChanged)
		this.el.remove () },

/*	PUBLIC API
	======================================================================== */

	scrollToTop: function () {
		this.rowRenderer.scrollTo (0) },

	setMetrics: function (cfg) {
		_.extend (this, { singleColumnMode: false }, cfg)
		this.rowRenderer.itemExtent = this.tileHeight
		this.refresh (true) },

	isClustered: function () {
		return this.source.isClustered () && !this.singleColumnMode },

	toggleReorderMode: function (yes) {
		if (!this.isClustered ()) {
			this.el.toggleClass ('reordering', yes)
			this.reorderMode = yes
			this.reorderHistory = new TileView.ReorderHistory ()
			this.refresh (true) } },

	refresh: $bindable (function (resetCache) {
		if (this.viewportWidth == undefined) {
			return }

		this.canvas.width (this.viewport.width ())
		this.rowHeight = this.tileHeight

		var minColumnWidth = this.minTileWidth
		var totalWidth = this.viewportWidth

		this.columnsPerRow = this.singleColumnMode ? 1 : Math.max (1, Math.floor (totalWidth / minColumnWidth))
		this.columnWidths = this.singleColumnMode ? [totalWidth] : _.equalDistribution (totalWidth, this.columnsPerRow)

		var left = 0
		this.columnOffsets = _.map (this.columnWidths, function (w) { left += w; return (left - w); })

		this.numRows = Math.floor ((this.source.items.length - 1) / this.columnsPerRow) + 1

		if (resetCache || (this.rowRenderer.clustered != this.isClustered ())) {
			this.rowRenderer.reset () }
		else {
			this.rowRenderer.refresh () }

		this.rowRenderer.clustered = this.isClustered () }),

/*	Reorder history
	======================================================================== */

	ReorderHistory: $static ($prototype ({
		constructor: function (cfg) {
			//this.originalItems = cfg.originalItems
			//this.originalIndices = TileView.ReorderHistory.indices (this.originalItems)
			this.entries = []
			/*this.entriesById = {}*/ },

		itemMoved: function (move /* {id,from,to} */) { var lastEntry = _.last (this.entries)
			if (lastEntry && lastEntry.id === move.id) {
				if (lastEntry.from === move.to) {
					this.removeEntry (lastEntry) } // not moved
				else {
					lastEntry.to = move.to } } // sequential moves of the same item do collapse
			else {
				this.appendEntry (move) } },

		packed: $property (function () {
			return _.map (this.entries, function (entry) {
				return [entry.id, entry.from, entry.to] }) }),

		$private: {
			/*indices: $static (function (items) {
				var indices = {}
				_.each (items, function (item, i) { indices[item] = i })
				return indices }),*/
			appendEntry: function (entry) {
				this.entries.push (entry) },
			removeEntry: function (entry) {
				this.entries.remove (entry) } }})),

/*	Layout stuff
	======================================================================== */

	canvasSizeChanged: function () {
		if (this.viewport.is (':visible')) {
			var viewportWidth = this.viewport.width ()
			if (viewportWidth != this.viewportWidth) {
				this.viewportWidth = viewportWidth
				this.refresh (true) } } },

	updateChildViewports: function () {
		if (this.isClustered ()) {
			var rows = this.rowRenderer
			_.each (rows ? rows.renderedItems : [], function (row, index) {
				if (rows.isItemVisible (rows.renderedRange.top + index)) {
					row.smallGrainUpdate () } }) } },
			
	tileAddressFromOffset: function (offset) {
		var row = Math.floor (offset.top / this.rowHeight)
		var column = _.reduce (this.columnWidths,
			function (memo, width, index) { var x = offset.left - memo.left
				return { left: memo.left + width, match: (x >= 0 && x < width) ? index : memo.match } },
			{ left: 0, match: 0 }).match
		return {
			row: row, column: column, index: (row * this.columnsPerRow + column) } },

	validTileAddressFromOffset: function (offset) {
		var address = this.tileAddressFromOffset (offset)
		var renderedRange = this.rowRenderer.renderedRange
		var renderedRows = this.rowRenderer.renderedItems

		/* clamp vertical */
		var row = _.clamp (address.row, renderedRange.top, renderedRange.bottom - 1)

		/* clamp horizontal */
		var index = _.clamp (row * this.columnsPerRow + address.column,
			renderedRange.top * this.columnsPerRow, // min tile index
			Math.min (this.source.items.length, (renderedRange.top + renderedRows.length) * this.columnsPerRow) - 1) // max tile index
		
		/* rebuild address */
		return {
			row: Math.floor (index / this.columnsPerRow),
			column: index % this.columnsPerRow,
			index: index } },

	mouseEventPositionInCanvas: function (e) {
		var canvasOffset = this.canvas.offset ()
		return {
			left: e.pageX - canvasOffset.left,
			top: e.pageY - canvasOffset.top } },

/*	VirtualListViewRenderer callbacks
	======================================================================== */

	freeRow: function (row) {
		_.each (row.renderedItems || row, function (tile) {
			tile.style.display = 'none' }) },

	allocRow: function () {
		if (this.isClustered ()) {
			return new VirtualListViewRenderer ({
				itemExtent: this.minTileWidth,
				vertical: false,
				parent: this,

				itemCount: function () {
					return this.cluster ? this.cluster.items.length : 0 },

				getViewportPosition: function () {
					if (this.parent.rowRenderer.shadowScroller) {
						return this.parent.rowRenderer.shadowScroller.scrollLeft () }
					else {
						return this.parent.rowRenderer.viewport[0].scrollLeft } },

				getViewportSize: function () {
					return this.parent.viewport.width () },

				isViewportVisible: function () {
					return true },

				scrollTo: function () {},

				updateScrollLength: function (width) {
					var oldWidth = this.parent.canvas.width ()
					if (width > oldWidth) {
						this.parent.canvas.width (width)
						if (this.parent.rowRenderer.shadowScroller) {
							this.parent.rowRenderer.shadowScroller.width (width) } } },

				freeItem: function (tile) {
					tile.style.display = 'none' },

				allocItem: function () {
					var tile = $('<div>')
						.css ({ width: this.itemExtent, height: this.parent.tileHeight })
						.appendTo (this.parent.canvas)
					this.parent.tileAllocated (tile)
					return tile[0] },

				updateItem: function (tile, index, offset) {
					var item = this.cluster.items[index]
					tile._item = item
					tile.className = 'tile' + ((this.clusterIndex % 2 === 0) ? '' : ' even')
					tile.style.display = ''
					TileView.setTilePosition (tile, offset, this.offsetTop)
					this.parent.tileRendered (tile, item) } }) }

		else {
			var tiles = []
			for (var i = 0, n = this.columnsPerRow; i < n; i++) {
				var tile = $('<div>')
					.css ({ width: this.columnWidths[i], height: this.tileHeight })
					.appendTo (this.canvas)
				this.tileAllocated (tile)
				tiles.push (tile[0]) }
			return tiles } },

	updateRow: function (row, rowIndex, offsetTop) {
		if (this.isClustered ()) {
			_.extend (row, { // row is an instance of VirtualListViewRenderer
				cluster: this.source.clusters[rowIndex],
				clusterIndex: rowIndex,
				offsetTop: offsetTop })

			row.refresh () }

		else {
			var columnsPerRow = this.columnsPerRow, columnOffsets = this.columnOffsets
			var from = rowIndex * columnsPerRow
			var to = Math.min (from + columnsPerRow, this.source.items.length)
			var isClustered = this.source.isClustered () // clustering viz codepath for single row mode

			for (var i = 0, n = row.length, itemIndex = 0, tile = undefined; i < n; i++) {
				itemIndex = from + i
				tile = row[i]
				if (itemIndex < to) {
					var item = this.source.items[itemIndex]
					tile._item = item
					if (item) {
						if (isClustered) {
							tile.className = 'tile' + ((this.source.clusterIndexForItem (itemIndex) % 2 === 0) ? '' : ' even') }
						else {
							tile.className = 'tile' + (((i % 2 - rowIndex % 2) === 0) ? '' : ' even') }

						tile.style.display = ''
						TileView.setTilePosition (tile, columnOffsets[i], offsetTop)
						this.tileRendered (tile, item) }
					else {
						tile.style.display = 'none' } }
				else {
					tile.style.display = 'none' } } } },

	initReorder: function () {
		var tileEl = undefined, tile = undefined
		var origin = undefined
		var originScrollTop = undefined
		var offset = undefined
		var initialTileAddress = undefined
		var tileAddress = undefined
		var mouseEvent = undefined
		var rowHeight = this.rowRenderer.itemExtent
		var scroller = (this.rowRenderer.shadowScroller && this.rowRenderer.shadowScroller.scroller) || this.rowRenderer.viewport
		var updateTilePosition = this.$ (function (helperOnly) {
			if (helperOnly !== true) {
				var targetAddress = this.validTileAddressFromOffset (this.mouseEventPositionInCanvas (mouseEvent))
				if (this.moveTile (tileAddress, targetAddress)) {
					tileAddress = targetAddress } }

			TileView.setTilePosition (tileEl,
				origin.left + offset.x,
				origin.top + offset.y - (originScrollTop - scroller.scrollTop ())) })

		var updateHelperPosition = function () {
			//updateTilePosition (true) // needs work
			updateTilePosition () }

		this.el.drag ({
			longPress: true,
			start: this.$ (function (e) {
				initialTileAddress = tileAddress = this.validTileAddressFromOffset (this.mouseEventPositionInCanvas (e))
				if (this.reorderMode && !this.isClustered () && tileAddress.index < this.source.items.length) {
					tileEl = this.rowRenderer.getRenderedItem (tileAddress.row)[tileAddress.column]
					tile = $(tileEl)
					origin = { left: tileEl._left, top: tileEl._top }
					offset = { x: 0, y: 0 }
					mouseEvent = e
					originScrollTop = scroller.scrollTop ()
					this.viewport.on ('scroll', updateHelperPosition)
					this.el.addClass ('dragging')
					tile.addClass ('dragging')
					this.draggingTile = tileEl

					// pop to top of visual stack, instead of changing z-index, it gives over 9000 performance boost
					this.canvas.append (tile) }
				else {
					return false } }),

			move: this.$ (function (newOffset, newEvent) {
				var direction = Sort.numbers (newOffset.y, offset.y)
				offset = newOffset
				mouseEvent = newEvent
				var scrollTop = scroller.scrollTop ()

				/* off screen scrolling behavior
				 */
				var tileBounds = { top: tileEl._top - scrollTop, bottom: (tileEl._top + rowHeight) - scrollTop }
				var viewportBounds = { top: 0, bottom: scroller.height () }
				var scrollDurationPerRow = 200
				if ((viewportBounds.top - tileBounds.top) > 0 && (scrollTop > 0)) {
					if ((direction < 0) && !scroller.is (':animated')) {
						if (this.rowRenderer.shadowScroller) {
							this.rowRenderer.shadowScroller.arm () }

						scroller.animate ({ scrollTop: 0 }, {
							queue: false, easing: 'easeInSine',
							duration: _.clamp (scrollDurationPerRow * (scrollTop / rowHeight), 1500, 5000) }) } }

					else if ((tileBounds.bottom - viewportBounds.bottom) > -50) {
						if ((direction > 0) && !scroller.is (':animated')) {
							var scrollHeight = this.canvas.height () - scroller.height () - scrollTop
							if (this.rowRenderer.shadowScroller) {
								this.rowRenderer.shadowScroller.arm () }

							scroller.animate ({ scrollTop: this.canvas.height () - scroller.height () }, {
								queue: false, easing: 'easeInSine',
								duration: _.clamp (scrollDurationPerRow * (scrollHeight / rowHeight), 1500, 5000) }) } }
					else {
						scroller.stop () } // stop scrolling

				updateTilePosition () }),

			end: this.$ (function () {
				this.reorderHistory.itemMoved ({
					id: tile.item ()._id, from: initialTileAddress.index, to: tileAddress.index })

				scroller.stop ()
				this.viewport.off ('scroll', updateHelperPosition)
				this.el.removeClass ('dragging')
				tile.removeClass ('dragging')
				this.draggingTile = undefined
				_.delay (this.$ (function () {
					TileView.setTilePosition (tileEl,
						this.columnOffsets[tileAddress.column],
						tileAddress.row * this.rowRenderer.itemExtent) })) }) }) },

	/* sub helper for initReorder
	 */
	moveTile: function (from, to) {
		if (from.index == to.index) {
			return false }
		
		var sourceRow = this.rowRenderer.getRenderedItem (from.row)
		var targetRow = this.rowRenderer.getRenderedItem (to.row)
		var direction = (to.index < from.index) ? 1 : -1
		var tile = sourceRow[from.column]

		if (sourceRow == undefined || targetRow == undefined) {
			console.log ('TileView: something bad happened, trying to insert from/into nonexistent row')
			return false }

		if (to.column >= targetRow.length) {
			console.log ('TileView: something bad happened, trying to insert into nonexistent column')
			return false }

		/* move DOM element & collection item */
		if ((from.row == to.row) || (direction > 0)) {
			targetRow.splice (to.column, 0, sourceRow.splice (from.column, 1)[0]) }
		else {
			targetRow.splice (to.column + 1, 0, sourceRow.splice (from.column, 1)[0]) }

		this.source.items.splice (to.index, 0, this.source.items.splice (from.index, 1)[0])

		/* update affected tiles */
		var rowIndex = to.row
		var row = targetRow
		var animate = !Platform.iOS

		while (true) {
			var nextRow = this.rowRenderer.getRenderedItem (rowIndex + direction)
			if (rowIndex != from.row) { /* shift tiles */

				if ((direction > 0) && (row.length > this.columnsPerRow)) {

					/* move last tile to lower row */
					var last = row.pop ()
					if (nextRow) {
						nextRow.unshift (last) // prepend

						if (animate) {
							/* make it's copy slide to right then remove it */
							$(last).clone ()
								.prependTo (this.canvas)
								.css ({ left: this.viewport.width () })
								.on ('transitionend', function () { $(this).remove () })

							/* make original one slide from left */
							$(last).addClass ('noanimate').css ({ left: -this.columnWidths[0] }), last.offsetLeft // trigger reflow
							$(last).removeClass ('noanimate') } }
						else {
							last.style.display = 'none' } }

					else if (direction < 0) {

						/* move last tile to upper row */
						var first = row.shift ()
						if (nextRow) {
							nextRow.push (first)

							if (animate) {
								/* make it's copy slide to left then remove it */
								var slideTo = -this.columnWidths[0]
								var clone = $(first).clone ()
									.prependTo (this.canvas)
									.on ('transitionend', function () { $(this).remove () })
								_.delay (function () { clone.css ({ left: slideTo }) })

								/* make original one slide from right */
								$(first).addClass ('noanimate').css ({ left: this.viewport.width () }), first.offsetLeft // trigger reflow
								$(first).removeClass ('noanimate') } }
						else {
							first.style.display = 'none' } } }
						
			/* update tile positions */
			var draggingTile = this.draggingTile
			var columnOffsets = this.columnOffsets, rowHeight = this.rowRenderer.itemExtent
			_.each (row, function (child, columnIndex) {
				if (child != draggingTile) {
					var offsetTop = rowIndex * rowHeight
					_.delay (function () {
						TileView.setTilePosition (child, columnOffsets[columnIndex], offsetTop) }) }

				$(child).toggleClass ('even', (columnIndex % 2 - rowIndex % 2) !== 0) })

			/* iterate to next row */
			if (nextRow && (rowIndex != from.row)) {
				row = nextRow
				rowIndex += direction }
			else {
				break } } /* done */

		return true },

	setTilePosition: $static (function (el, x, y) {
		el._left = x
		el._top = y
		//el.style.webkitTransform = 'translate(' + x + 'px,' + y + 'px)' // wtf, somehow it is more slow??!
		el.style.left = x + 'px'
		el.style.top = y + 'px' }) })














