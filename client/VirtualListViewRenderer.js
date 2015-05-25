/*	Provides back-end algorithms for containers with virtualization.

	In facts, it is a memory management / cache invalidation algorithm,
	abstracted from actual methods of how do you manage actual elements in
	container's DOM. What it means:

	-	At allocItem you should allocate a DOM element and insert it into
		your parent DOM manually. VirtualListViewRenderer won't do this for you.

	-	At freeItem you should mark your DOM element as unused by an appropriate
		method (either remove it from DOM, or hide it). VirtualListViewRenderer
		won't do this for you (although it calls .css ('display', 'none') on
		'item' as a reference implementation, which is enough for most cases
		of application).

	-	At updateItem you should position your element according to computed
		offsetTop manually, and also un-hide it / put back to DOM, if needed, as
		it could be freeItem'ed before. VirtualListViewRenderer won't do this
		for you.

	Items that you get or return at those injection points, they could be
	anything. VirtualListViewRenderer doesn't make any assumption on what they
	could be. Typically they're DOM elements, wrapped in jQuery helper object.
	As more complex example, TileView defines its 'items' as either arrays of
	tiles, or instances of VirtualListViewRenderer, thus attaining a fractal-like
	two-dimensional datagrid structure (for clustered Collection views).
 */

 VirtualListViewRenderer = $prototype ({

 	/*	Main injection points. Override them. Implementation provided is only a reference!
	 */
	allocItem: function () {
		return $('<div>').appendTo (this.canvas) },
	freeItem: function (item) {
		item.css ('display', 'none') },
		
	updateItem: function (item, index, offset) {
		item.css ('display', '').css ('top', offset)
	},
	itemCount: _.overrideThis,

	constructor: function (cfg) {
		_.extend (this, {
			itemExtent: 200,
			scrollLength: 0,
			renderedRange: { top: -1, bottom: -1 },
			renderedItems: [],
			vertical: true,
			overRender: Platform.iOS ? 3 : 1,
			bottomPadding: 0,
			freeItems: [],
			viewportPosition: 0,
			viewportSize: 0 }, cfg)

		this.bigGrainUpdateDebounced = _.debounce (this.$ (this.bigGrainUpdate), 200)

		if (this.el) {
			/* render to DOM */
			this.canvas = (this.canvas || $('<div class="canvas">')).appendTo (
				this.viewport = (this.viewport || $('<div class="viewport">'))
					.scroll (this.$ (Platform.iOS ? this.bigGrainUpdate.arity0 : this.smallGrainUpdate))
					.appendTo (this.el = $(this.el).addClass ('items-view ' + (this.vertical ? 'vertical' : 'horizontal'))))
			
			if (!cfg.noShadowScroller && !Platform.iOS && (navigator.userAgent.indexOf ('Chrome') >= 0)) {
				/* speedups scroll */
				this.shadowScroller = new ShadowScroller ({
					renderTo: this.el,
					target: VirtualListViewRenderer.DEBUG_MODE ? undefined : this.viewport,
					applyScroll: this.$ (function (y, x) {
						this.canvas.transform ({ translate: { x: -x, y: -y } })
						this.smallGrainUpdate ()
					})
				})
			}
		} else {
			/* canvas & viewport should be provided by owning component */
		}

		_.delay (this.$ (this.reset)) },

	getViewportPosition: function () {
		var scroller = this.shadowScroller || this.viewport
		return (this.vertical ? scroller.scrollTop () : scroller.scrollLeft ()) },

	getViewportPositionInItems: function () {
		return Math.floor (this.viewportPosition / this.itemExtent) },

	getViewportSizeInItems: function () {
		return Math.floor (this.viewportSize / this.itemExtent) + this.bottomPadding
	},
	getRenderedItem: function (index) {
		if (index < this.renderedRange.top || index >= this.renderedRange.bottom) {
			return undefined
		} else {
			return this.renderedItems[index - this.renderedRange.top]
		}
	},
	isItemVisible: function (index) {
		var viewportTop = this.viewportPosition
		var viewportBottom = viewportTop + this.viewportSize
		var itemTop = index * this.itemExtent
		var itemBottom = itemTop + this.itemExtent

		return (itemTop >= viewportTop && itemTop <= viewportBottom) || (itemBottom >= viewportTop && itemBottom <= viewportBottom)
	},
	numItemsToOverRender: function () {
		return Math.floor (this.getViewportSizeInItems () * this.overRender)
	},

	scrollTo: function (index) {
		var scroller = (this.shadowScroller || this.viewport)
		var method = this.vertical ? scroller.scrollTop : scroller.scrollLeft
		var offset = (index || 0) * this.itemExtent
		method.call (scroller, offset)
		this.refresh () },

	getViewportSize: function () {
		return (this.vertical ? this.viewport.height () : this.viewport.width ())
	},

	isViewportVisible: function () {
		return this.viewport.is (':visible')
	},

	reset: function () {
		if (this.isViewportVisible ()) {
			this.viewportSize = this.getViewportSize () }
		if (this.canvas) {
			this.canvas.empty () }
		this.freeItems.removeAll ()
		this.renderedItems.removeAll ()
		this.renderedRange = { top: -1, bottom: -1 }
		this.scrollTo (0) },
	
	refresh: function () {
		this.updateScrollLength ((this.itemCount () + this.bottomPadding) * this.itemExtent)
		this.bigGrainUpdate (this.$ (function () {
			var top = this.renderedRange.top
			_.each (this.renderedItems, function (item, i) {
				this.updateItem (item, top + i, (top + i) * this.itemExtent) }, this) })) },

	updateScrollLength: function (length) {
		if (this.scrollLength != length) {
			this.scrollLength = length
			if (this.canvas) {
				this.canvas.css (this.vertical ? 'height' : 'width', length) }
			if (this.shadowScroller) {
				this.shadowScroller.height (length) } } },

	/*	Gets called whenether scroll event occurs
	 */
	smallGrainUpdate: function () {
		/* update viewport position (somehow accessing scrollTop is slow, so cache it) */
		this.viewportPosition = this.getViewportPosition ()

		/* set 'updating' flag that disables pointer-events from inner stuff, greatly increasing scroll performance */
		if (!this.updating) {
			this.updating = true
			if (this.el) {
				this.el.addClass ('updating')
			}
		}

		var overRender = this.numItemsToOverRender ()

		if (!Platform.iOS && this.el) {
			this.el.toggleClass ('scrolled', this.viewportPosition > 0)
		}

		/* expand rendered range to include viewport frame, but not more than overRender allows */
		if (!Platform.iOS) {
			var requestedRange = this.viewportRangeWithPadding (1)
			this.renderRange ({
				top: Math.max (requestedRange.top - overRender*2 + 2, Math.min (requestedRange.top, this.renderedRange.top)),
				bottom: Math.min (requestedRange.bottom + overRender*2 - 2, Math.max (requestedRange.bottom, this.renderedRange.bottom))
			})
		}

		this.bigGrainUpdateDebounced ()

		/* notify delegates */
		if (this.viewportUpdated) {
			this.viewportUpdated () }
	},

	/*	Gets called whenether scroll event finishes / or when layout gets changed
	 */
	bigGrainUpdate: function (then) {
		this.viewportPosition = this.getViewportPosition ()
		this.renderRange (this.viewportRangeWithPadding (this.numItemsToOverRender ()))

		if (this.el) {
			this.updating = false
			this.el.removeClass ('updating') }

		/* notify delegates */
		if (this.viewportUpdated) {
			this.viewportUpdated ()
		}

		if (then) {
			then () }
	},

	viewportRangeWithPadding: function (padding) {
		var position = this.getViewportPositionInItems (),
			size     = this.getViewportSizeInItems (),
			max		 = this.itemCount ()

		var top = position - padding
		var bottom = position + size + padding

		var extraTop = bottom > max ? (max - bottom) : 0
		var extraBottom = top < 0 ? -top : 0

		return {
			top: position - padding + extraTop,
			bottom: position + size + padding + extraBottom
		}
	},

	renderRange: function (range) {
		var requestedRange = {
			top: _.clamp (range.top, 0, this.itemCount () - 1),
			bottom: _.clamp (range.bottom, 0, this.itemCount ())
		}

		if /* two ranges intersect, shift rendered array towards scroll direction */ (
			requestedRange.bottom >= this.renderedRange.top &&
			requestedRange.top <= this.renderedRange.bottom) {
			var cap = {
				top: this.renderedRange.top - requestedRange.top,
				bottom: requestedRange.bottom - this.renderedRange.bottom
			}
			//log.info ('requested', requestedRange, 'rendered', this.renderedRange, 'cap is', cap)
			if (cap.bottom < 0) {
				this.removeItems (this.renderedItems.length + cap.bottom, -cap.bottom)
			}
			if (cap.top < 0) {
				this.removeItems (0, -cap.top)
			}
			if (cap.top > 0) {
				this.prependItems (requestedRange.top, cap.top)
			}
			if (cap.bottom > 0) {
				this.appendItems (this.renderedRange.bottom, cap.bottom)
			}
		} else /* flush */ {
			//log.red ('FLUSH')
			this.removeItems (0, this.renderedItems.length)
			this.appendItems (requestedRange.top, requestedRange.bottom - requestedRange.top)
		}
		
		this.renderedRange = requestedRange

		_.each (this.freeItems, function (item) { this.freeItem (item) }, this)

		var numItems = this.itemCount ()

		if (this.loadingTop) {
			var bottom = (Math.max (0, this.renderedRange.top) * this.itemExtent)
			this.loadingTop.css ({
				top: 0,
				height: this.itemExtent * this.renderedRange.top,
				display: (this.renderedRange.top === 0) ? 'none' : ''
			})
		}
		if (this.loadingBottom) {
			var top = (Math.max (0, this.renderedRange.bottom) * this.itemExtent)
			this.loadingBottom.css ({
				top: top,
				height: (this.itemExtent * this.itemCount ()) - top,
				display: (this.renderedRange.bottom === numItems) ? 'none' : ''
			})
		}
		//log.warn ('renderRange done, renderedItems =', this.renderedItems.length)
	},
	prependItems: function (from, howmany) {
		//log.error ('prepending', howmany, 'items from', from)
		for (var i = from + howmany - 1; i >= from; i--) {
			this.renderedItems.unshift (this.renderItem (i, true))
		}
	},
	appendItems: function (from, howmany) {
		//log.success ('appending', howmany, 'items from', from)
		for (var i = from, to = i + howmany; i < to; i++) {
			this.renderedItems.push (this.renderItem (i, false))
		}
	},
	removeItems: function (from, howmany) {
		for (var i = from, to = Math.min (this.renderedItems.length, i + howmany); i < to; i++) {
			this.removeItem (this.renderedItems[i])
		}
		this.renderedItems.splice (from, howmany)
	},
	removeItem: function (item) {
		this.freeItems.push (item)
	},
	renderItem: function (index, takeFromTop) {
		var item = this.freeItems.length ? (takeFromTop ? this.freeItems.pop () : this.freeItems.shift ()) : this.allocItem ()
		this.updateItem (item, index, index * this.itemExtent)
		return item
	}
})

DumbshitListViewRenderer = $prototype ({
	constructor: function (cfg) {
		/* configure */
		_.extend (this, {
			itemExtent: 200,
			renderedRange: { top: -1, bottom: -1 },
			renderedItems: [],
			vertical: true,
			viewportPosition: 0,
			viewportSize: 0,
		}, cfg)

		if (this.el) {
			this.canvas = $('<div class="canvas">').appendTo (
				this.viewport = $('<div class="viewport">')
					.appendTo (this.el = $(this.el).addClass ('items-view ' + (this.vertical ? 'vertical' : 'horizontal'))))
		}

		this.refresh ()
	},
	allocItem: function () {
		/* override this */
		return $('<div>')
	},
	updateItem: function (item, index, offset) {
		/* override this */
	},
	itemCount: function () {
		/* override this */ return 0
	},
	layoutChanged: function () {
		this.refresh ()
	},
	reset: function () {
		if (this.canvas) {
			this.canvas
				.css (this.vertical ? 'height' : 'width', (this.itemCount () + 1) * this.itemExtent)
				.empty () }

		this.renderedRange = { top: -1, bottom: -1 }
		this.renderedItems.length = 0
		for (var i = 0, n = this.itemCount (); i < n; i++) {
			this.updateItem (this.allocItem (), i, i * this.itemExtent)
		}
	},
	refresh: function () {
		this.reset ()
	},
	scrollTo: function (offset) {
		if (this.vertical) {
			this.viewport.scrollTop (offset) }
		else {
			this.viewport.scrollLeft (offset) }
	},
	getViewportPositionInItems: function () {
		return Math.floor (this.viewportPosition / this.itemExtent)
	},
	getViewportSizeInItems: function () {
		return Math.floor (this.viewportSize / this.itemExtent) + 1
	},
	getRenderedItem: function (index) {
		if (index < this.renderedRange.top || index >= this.renderedRange.bottom) {
			return undefined
		} else {
			return this.renderedItems[index - this.renderedRange.top]
		}
	},
	getViewportPosition: function () {
		return (this.vertical ? this.viewport[0].scrollTop : this.viewport[0].scrollLeft)
	},
	getViewportSize: function () {
		return (this.vertical ? this.viewport.height () : this.viewport.width ())
	}
})

StubListViewRenderer = $prototype ({
	constructor: function (cfg) {
		_.extend (this, cfg)
	},
	allocItem: function () {
		/* override this */
		return $('<div>')
	},
	updateItem: function (item, index, offset) {
		/* override this */
	},
	itemCount: function () {
		/* override this */ return 0
	},
	scrollTo: function (offset) {
		this.el.scrollTop (offset * this.itemExtent)
	},
	reset: function () {
		this.el.empty ()
		for (var i = 0, n = this.itemCount (); i < n; i++) {
			this.updateItem (this.allocItem (), i)
		}
	},
	refresh: function (resetCache) {
		this.reset ()
	},
})