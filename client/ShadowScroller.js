/*	A HACK (WORKS ONLY IN CHROME)
	======================================================================== */

/*	Imagine you have a component which changes DOM in scroll event handler...
	...then sooner or later you will face serious performance issue linked with fact that
	'scroll' event handler is not asynchronous, and heavy DOM manipulation within it
	effectively blocks the scrolling animation thread, creating lags and glitches.

	The idea behind: create a 'shadow' transparent scroller over the target component,
	and constantly copy scroll position from one to another (hence the name). This
	adds desired asynchronicity, so any lag caused by DOM manipulation does not
	fuck up the scroller's smoothness.

	This approach does not remove lags, but separate them from scrolling mechanics,
	carrying them from UI thread to rendering thread.

	The tricky thing is to properly manage the shadow scroller event transparency
	(the pointer-events thing), otherwise you will not able to select anything behind it.
 */

 ShadowScroller = $prototype ({

 	constructor: function (cfg) {
 		_.extend (this, {
 			armed: false,
 			_scrollTop: 0,
 			_scrollLeft: 0 }, cfg)

 		this.renderTo = $(this.renderTo).append (
 			this.scroller =
 				$('<div class="shadow-scroller">').css ({
	 				pointerEvents: this.target ? 'none' : '',
	 				overflow: 'auto',
	 				position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
	 				'-webkit-overflow-scrolling': 'touch' })
 				.append (this.content = $('<div>').css ('width', '100%')))

 		var scroller = (this.target || this.scroller)
 		
		scroller.scroll (this.$ (function (e) {
			this.arm ()
			e.preventDefault ()
			return false })) },

 	scrollTop: function (top) {
 		if (top === undefined) {
 			return this._scrollTop }
		this.scroller[0].scrollTop = top
		this.copyLoop () },

 	scrollLeft: function (left) {
 		if (left === undefined) {
 			return this._scrollLeft }
		this.scroller[0].scrollLeft = left
		this.copyLoop () },

 	width: function (w) {
 		this.content.width (w) },

 	height: function (h) {
 		this.content.height (h) },

	arm: function () {
		if (!this.armed) {
			if (this.target) {
				this.scroller[0].scrollTop = this.target[0].scrollTop
				this.scroller[0].scrollLeft = this.target[0].scrollLeft }

			this._scrollTop = this.scroller[0].scrollTop
			this._scrollLeft = this.scroller[0].scrollLeft
			this.scroller.css ('pointer-events', '')
			this.armed = true
			this.copyLoop ()
			this.postponeDisarm () } },

	copyLoop: function () {
		var scrollTop = this.scroller[0].scrollTop, scrollLeft = this.scroller[0].scrollLeft
		if ((scrollTop != this._scrollTop) || (scrollLeft != this._scrollLeft)) {
			this.postponeDisarm ()
			if (this.target) {
				if (scrollTop != this._scrollTop) {
					this.target.scrollTop (this._scrollTop = scrollTop) }
				if (scrollLeft != this._scrollLeft) {
					this.target.scrollLeft (this._scrollLeft = scrollLeft) } }
			else {
				this.applyScroll (
					this._scrollTop = scrollTop,
					this._scrollLeft = scrollLeft) } }
		if (this.armed) {
			window.requestAnimationFrame (this.$ (this.copyLoop)) } },

	postponeDisarm: _.debounce (function () {
		this.armed = false
		if (this.target) {
			this.scroller.css ('pointer-events', 'none') } }, 250)
 })