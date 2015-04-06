/*	V 2.0 of Popover utility, will feature:

		- new API based on Component utility
		- generic positioning algorithm around anchor element, so that it always stay in screen's bounds
		- content virtualization (in ListViewPopover subclass)	*/

Popover2 = $component ({

	/*	Public API */

	anchor:		$observableProperty (),
	visible:	$observableProperty (false),
	toggled:	$observableProperty (false),

	/*	Customization API */

	domReady:	$barrier (),
	content:	_.overrideThis,
	hasContent: _.constant (true),		//	override to forbid displaying if no content available

	/*	Lifecycle */

	init: function () {
		_.defaults (this, {
			cls:		'',				// CSS class applied to popover DOM
			hover:		 true,			// one can disable hover mechanics
			click:	 	 true,			// one can disable click-toggle behavior
			modal:		 true,			// one can disable 'modal' toggle behavior
			permanent:	 true,			// never offs its behavior from bound anchors
			placement:	'bottom',		// supported: top/bottom
			align:		'center' }) 	// supported: left/center

		this.anchorChange (this.$ (function (newAnchor, prevAnchor) {
			if (!_.isElement (newAnchor)) {
				throw new Error ('Popover anchor should be raw DOM element (not jQuery object)') }
				
			if (!this.permanent && prevAnchor && prevAnchor._depopoverize) {
				prevAnchor._depopoverize () }

			this.popoverize (newAnchor)
			this.updateLayout () }))

		this.visibleChange (this.$ (function (yes) {
			if (!this.el) {
				this.render () }

			this.overlayEl.css ('display', yes ? '' : 'none')
			this.el.fade (yes)

			if (yes) {
				this.updateLayout () } }))

		this.toggledChange (this.$ (function (yes) {
			if (!yes && this.hover) {
				_.delay (this.$ (function () {
					$(this.anchor).addClass ('just-detoggled') }), 10) }

			this.visible = yes
			this.overlayEl.toggleClass ('toggled', yes)
			this.el.toggleClass ('toggled', yes)

			_.delay (this.$ (function () {
				$(this.anchor).toggleClass ('active toggled', yes) })) })) },

	destroy: function () {
		this.anchor = undefined	// depopoverizes it
		if (this.overlayEl) {
			this.overlayEl.remove () } },

	/*	Internal impl */

	onAnchorClick: function (e) { var $anchor = $(this.anchor)
		this.anchor = e.delegateTarget
		if (!$anchor.hasClass ('no-popover')) {
			this.toggled = !$anchor.hasClass ('toggled') && this.hasContent () && !this.toggled } },

	onAnchorHover: function (e) { var $anchor = $(this.anchor)
		if (!this.toggled && !$anchor.hasClass ('no-popover')) {
			this.anchor = e.delegateTarget
			if (!$anchor.hasClass ('toggled') && !$anchor.hasClass ('just-detoggled')) {
				this.visible = this.hasContent () && true } } },

	onAnchorHoverOut: function () {
		$(this.anchor).removeClass ('just-detoggled')
		if (!this.toggled) {
			this.visible = false } },

	popoverize: function (anchor) {
		if (anchor._popover === this) {
			return }
		if (anchor._popover) {
			if (anchor._depopoverize) {
				anchor._depopoverize ()	// no more than one Popover per anchor pls
			} else {
				throw new Error ('cannot bind on anchor permanently taken by another Popover') } }

		anchor._popover = this
		$(anchor).addClass ('popoverized')

		if (!Platform.iOS && this.hover !== false) {
			$(anchor).mouseenter (this.onAnchorHover)
					 .mousemove  (this.onAnchorHover)
				     .mouseleave (this.onAnchorHoverOut) }

		if (this.click !== false) {
			$(anchor).mousedown (this.onAnchorClick) }

		anchor._depopoverize = function () {
			$(anchor)
				.removeClass ('popoverized')
				.off ('mouseenter',	this.onAnchorHover)
				.off ('mousemove',	this.onAnchorHover)
				.off ('mouseleave',	this.onAnchorHoverOut)
				.off ('click',		this.onAnchorClick)
				.off ('touchstart',	this.onAnchorClick) } },

	render: function () {
		this.overlayEl = $('<div class="modal-overlay modal-popover" style="display: none;">')
			.toggleClass ('no-modal', !this.modal)
			.append (this.el = $('<div class="popover popover2 custom fade ' + this.placement + ' out ' + (this.cls || '') + '">')
				.append (this.arrowEl = $('<div class="arrow"></div>'))
				.append (this.innerEl =	$('<div class="popover-inner"></div>')
					.append (this.contentEl = this.content ())))
			.appendTo (document.body)
			.touchClick (this.$ (function (e) {
				if (e.target === this.overlayEl[0]) {
					this.toggled = false } })) },


	anchorBBox: $property (function () { var anchor = $(this.anchor)
		return anchor.length ?
			BBox.fromLTWH (_.extend (anchor.offset () || {}, { width: anchor.outerWidth (), height: anchor.outerHeight () })) :
			BBox.zero }),


	/*	One may hook to this
	 */
	updateLayout: $bindable (function () {
		if (!this.el) {
			this.render () }

		if (this.width) {
			this.el.width (this.width) }
		else {
			this.el.css ({ width: 'auto' }) 							// compute width based on content width
			this.el.css ({ width: this.el.width () * 1.1 + 'px' }) }	// now make it fixed to prevent sudden auto-width jumping
	
		var anchorBBox = this.anchorBBox

		var left = this.align == 'center' ? Math.round (anchorBBox.center.x - this.el.outerWidth () / 2) : anchorBBox.left
		var maxLeft = $(document).width () - 20
		var maxRight = 20
		var width = this.el.width ()

		if ((left + width) > maxLeft) {
			left = maxLeft - width }

		if (left < maxRight) {
			left = maxRight }

		this.arrowEl.css ({
			left: this.align == 'center' ? Math.round (anchorBBox.center.x - left) : 15 })

		if (this.placement == 'bottom') {
			var top = anchorBBox.bottom + (this.offsetTop || 0)
			this.contentEl.css ({ maxHeight: document.body.scrollHeight - top - 40 }) // clip by lower window bound
			
			this.el.css ({
				left: left,
				top: top }) }
		else {
			this.el.css ({
				left: left,
				top: anchorBBox.top - anchorBBox.height - (this.offsetTop || 0) - this.height }) }

		this.domReady (true)

		/*	hide itself on container scroll
		 */
		if (this.scrollableContainer) {
			$(this.scrollableContainer).one ('scroll', this.$ (function () {
				this.visible = false })) } }) })


/*	A simple dropdown menu popover, very handy in case of hard-coded menu items (which is the common case)
 */
MenuPopover = $extends (Popover2, {
	content: function () {
				return $('<div class="popover-content">').append (
							$('<ul class="popover-list ' + (this.listCls || '') + '"></ul>').append (
								_.map (this.items, this.$ (function (click, title) {
																return $('<li class="item">')
																	.text (title)
																	.click (this.$ (function () {
																						if (this.autoHide !== false) {
																							this.toggled = false }
																						click () })) })))) } })
$.fn.extend ({
	menuPopover: function (cfg) {
		var menu = new MenuPopover (_.extend ({
			anchor: this[0],
			hover: false,
			cls: 'small-text' }, cfg))
	}
})

/*	Popover built around VirtualListViewRenderer to handle any amount of input data
 */
ListViewPopover = $extends (Popover2, {

	/*	Customization API */

	itemClick: $trigger (/* id, item */),

	itemContent: function (item) {
		if (this.source.html) {
			return this.source.html (item) }
		else if (this.source.text) {
			return this.source.text (item) }
		else {
			return _.escape (item.name || item.label || item._id || _.stringify (item)) } },

	content: function () {
		return this.contentEl },

	hasContent: function () {
		return this.itemCount > 0 },

	/*	Number of items
	 */
	itemCount: $property (function () {
		return (this.itemsRenderer && this.itemsRenderer.itemCount ()) || 0 }),

	/*	Call to update contents
	 */
	refresh: function () {
		this.itemsRenderer.refresh () },


	/*	Lifecycle */

	init: function () {
		_.defaults (this, {
			width:		150,
			autoHide:	true,	// false to disable auto-detoggleing on item selected
			itemHeight: 25 })	// TODO: read from CSS

		_.extend (this, {
			source: Collection.coerce (this.source) })

		this.itemsRenderer = new (this.noVirtualization ? StubListViewRenderer : VirtualListViewRenderer) ({
			el: this.contentEl = $('<ul>')
					.attr ('class', this.contentCls || 'popover-content popover-list'),
			noShadowScroller: true,
			itemExtent: this.itemHeight,
			itemCount: this.$ (function () { return this.source.items.length }),
			updateItem: this.updateItem,
			allocItem: this.allocItem })

		this.domReady (this.$ (function () {
			this.source.updated (this.scrollTo.partial (0))
			this.source.changed (this.updateLayout) }))

		if (!this.noVirtualization) {
			this.updateLayout.onBefore (function () {
				this.contentEl.height (this.itemsRenderer.itemCount () * this.itemHeight - 2) }) }

		this.updateLayout.onAfter (
			_.delay.partial (this.layoutChanged).arity0)

		Popover2.prototype.init.call (this) },

	scrollTo: function (offset) {
		if (this.itemsRenderer) {
			this.itemsRenderer.scrollTo (offset) } },

	layoutChanged: function () {
		if (this.itemsRenderer) {
			this.itemsRenderer.reset () } },

	/*	Internals  */

	allocItem: function () {
		return $('<li>')
			.attr ('class', this.itemCls || 'item')
			.appendTo (this.itemsRenderer.canvas || this.itemsRenderer.el)
			.mousedown (this.$ (function (e) {
				var item = $(e.delegateTarget).item ()
				if (this.autoHide !== false) {
					this.toggled = false }
				this.itemClick (item._id, item) })) },

	updateItem: function (el, index, offsetTop) {
		var item = this.source.items[index]
		el.item (item)
		  .css ({ display: '', top: offsetTop })
		  .empty ()
		  .append (this.itemContent (item)).attr ('data-id', item._id) } })















