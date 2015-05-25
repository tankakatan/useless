/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
------------------------------------------------------------------------

UNSORTED UI CODE (SUBJECT TO REFACTORING)

------------------------------------------------------------------------
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */


/*	some handy jQuery extensions
	======================================================================== */

$.fn.extend ({
	item: function (value) { /* links controller/data instance to its DOM counterpart */
		if (value) { 												// setter
			if (this.length) {
				this[0]._item = value }
			return this }
		else {														// getter
			return this.length ? this[0]._item : undefined } },

	showLoadingUntil: function (fn, then) {
		var loadingOverlay = new ProgressOverlay ({ renderTo: this, indefinite: true })
		fn (function () {
			loadingOverlay.disappear ()
			if (then) { then.apply (null, arguments) } }, loadingOverlay) },

	showLoadingUntilCollectionReady: function (cfg, then) {
		var loadingOverlay = new ProgressOverlay ({ renderTo: this, title: cfg.title, indefinite: true })
		cfg.collection.restoredFromRemoteOrigin (function () {
			loadingOverlay.disappear ()
			if (then) { then () } }) },
	
	waitUntil: function (fn, then) { this.addClass ('wait').attr ('disabled', true)
		fn (this.$ (function () {
			this.removeClass ('wait').removeAttr ('disabled')
			if (then) {
				then.apply (null, arguments) } })); return this },

	enableScrollFaders: function (cfg) {
		var horizontal = cfg && cfg.horizontal
		var faderTop, faderBottom
		this.css ({ position: 'relative' })
		this.append (faderTop = $('<div class="scroll-fader scroll-fader-' + (horizontal ? 'left' : 'top') + '"></div>'))
			.append (faderBottom = $('<div class="scroll-fader scroll-fader-' + (horizontal ? 'right' : 'bottom') + '"></div>'))
			.find ((cfg && cfg.scroller) || '.scroller').scroll (function () {
				var scrollTop = horizontal ? $(this).scrollLeft () : $(this).scrollTop (),
					height = horizontal ? $(this).width () : $(this).height (),
					max = horizontal ? this.scrollWidth : this.scrollHeight
				faderTop.css ({ opacity: scrollTop > 0 ? 1 : 0 })
				faderBottom.css ({ opacity: (scrollTop + height) < max ? 1 : 0 })
			}).scroll ()
		return this },

	enableScrollFaders2: function (cfg) {
		var horizontal = cfg && cfg.horizontal
		this.scroll (function () {
						var offset = horizontal ? $(this).scrollLeft () : $(this).scrollTop (),
							viewportSize = horizontal ? $(this).width () : $(this).height (),
							contentSize = horizontal ? this.scrollWidth : this.scrollHeight
						var travel = (offset / (contentSize - viewportSize))
						$(this).css ('-webkit-mask-image', '-webkit-linear-gradient(left, ' +
							'rgba(0,0,0,' + (1.0 - travel) + '),' +
							'rgba(0,0,0,1) 15%,' +
							'rgba(0,0,0,1) 85%,' +
							'rgba(0,0,0,' + travel + '))') }).scroll ()
		return this },

	scrollToRight: function () {
		if (this[0]) {
			this.scrollLeft (this[0].scrollWidth) }
		return this },

	hasParent: function (el) {
		var parent = this
		while (parent.length > 0) {
			if (parent[0] == el[0]) {
				return true }
			parent = parent.parent () }
		return false },

	fade: function (visible, complete) {
		if (visible) {
			this.removeClass ('hide out')
			_.delay (this.$ (function () {
				if (!this.is ('.out')) {
					this.addClass ('in') } }), 1) }
		else {
			this.removeClass ('in').addClass ('out')
			this.one ($.support.transition.end, function () {
				if ($(this).is ('.out')) {
					$(this).addClass ('hide')
					if (complete) {
						complete () } } }) }
		return this },

	nonemptyValue: function () {
		var value = $.trim (this.val ())
		return (value.length == 0) ? undefined : value },

	intValue: function () {
		var value = parseInt ($(this).nonemptyValue (), 10)
		return isNaN (value) ? undefined : value },

	hitTest: function (event) {
		var offset = this.offset ()
		var pt = {
			x: event.clientX - offset.left,
			y: event.clientY - offset.top }
		return (pt.x >= 0) && (pt.y >= 0) && (pt.x < $(this).width ()) && (pt.y < $(this).height ()) },

	belongsTo: function (selector) {
		return (this.is (selector) || this.parents (selector).length) },

	selectClass: function (key, classes) {
		return this.removeClass (_.values (classes).join (' ')).addClass (classes[key]) },

	drag: function (cfg) {
		var begin = function (initialEvent) {
			if (Platform.iOS || initialEvent.which === 1) {
				if (cfg.start (initialEvent) !== false) /* one can cancel drag by returning false from 'start' */ {
					var abort = undefined
					var move = function (e) {
						if (Platform.iOS || e.which === 1) {
							e.preventDefault ()
							translatedEvent = UI.translateTouchEvent (e)
							cfg.move ({
								x: translatedEvent.pageX - initialEvent.pageX,
								y: translatedEvent.pageY - initialEvent.pageY }, translatedEvent) }
						else {
							abort (e) } }
					var end = function (e) {
						$(document).off ('mousemove touchmove', move)
						cfg.end (e) }
					abort = function (e) {
						$(document).off ('mouseup touchend', end)
						end (e) }
					$(document).on ('mousemove touchmove', move)
					$(document).one ('mouseup touchend', end) } } }

		return this.on (Platform.iOS ? 'touchstart' : 'mousedown', _.$ (this, function (e) {
			var where = _.extend ({}, UI.translateTouchEvent (e)) /* copy event, cuz on iPad it's re-used by browser */
			if (Platform.iOS && cfg.longPress) {
				var cancel = undefined
				var timeout = window.setTimeout (_.$ (this, function () {
					this.off ('touchmove touchend', cancel)
					begin (where) }), 300)
				cancel = this.$ (function () {
					window.clearTimeout (timeout)
					this.off ('touchmove touchend', cancel) })
				this.one ('touchmove touchend', cancel) }
			else {
				begin (where) } })) },

	selectorItem: function (cfg_) { 			var cfg = _.extend ({ detoggleable: true }, cfg_)
		return this.touchClick (function (e) {	var item = $(this)
			
			if ( (e.target === e.delegateTarget) || (
				!(e.target.tagName === 'BUTTON') && !(e.target.tagName === 'A'))) {
				if (cfg.detoggleable) {
					item.toggleClass ('active') }
				else {
					item.addClass ('active') }

				if (!cfg.multiByDefault && !(cfg.multi && (e.altKey || e.ctrlKey || e.shiftKey))) {
					item.siblings ().removeClass ('active')
					if (item.hasClass ('inner')) { // And cousins too...
						item.parent ().siblings ().children ().removeClass ('active') } }
				
				if (cfg.multi || cfg.multiByDefault) {
					cfg.selectionChanged (item.parent ().children ('.active')) }
				else {
					cfg.selectionChanged (item.hasClass ('active') ? item : $()) }

				e.preventDefault () }

			return false }, { disableTouch: cfg.touchClick ? false : true }) },

	transform: function (cfg) {
		return this.css ('-webkit-transform',
			(cfg.translate ? ('translate(' + cfg.translate.x + 'px,' + cfg.translate.y + 'px) ') : '') +
			(cfg.rotate ? ('rotate(' + cfg.rotate + 'rad) ') : '') +
			(cfg.scale ? ('scale(' + cfg.scale.x + ',' + cfg.scale.y + ')') : '')) },

	disappear: function (fade) {
		if (fade) {
			return this.addClass ('disappear').on ('transitionend', function () {
				$(this).remove () }) }
		else {
			return this.remove () } },

	monitorInput: function (cfg) {
		var change = function () {
			if ($.trim ($(this).val ()) === '') {
				cfg.empty (true) }
			else {
				cfg.empty (false) } }
		return this
			.keyup (change)
			.change (change)
			.focus (_.bind (cfg.focus || _.noop, cfg, true))
			.blur (_.bind (cfg.focus || _.noop, cfg, false)) },

	touchDoubleclick: function (fn) {
		if (Platform.iOS) {
			var lastTime = Date.now ()
			return this.on ('touchend', function () {
				var now = Date.now ()
				if ((now - lastTime) < 200) {
					fn.apply (this, arguments) }
				lastTime = now }) }
		else {
			return this.dblclick (fn) } },

	touchClick: function (fn, cfg) {
		var self = this
		cfg = cfg || {}
		if (!cfg.disableTouch && Platform.iOS) { // touch experience
			var touchstartHandler = function (e) {
				fn.apply (this, arguments)
				e.preventDefault () // prevents nasty delayed click-focus effect on iOS
				return false }

			var clickHandler = function (e) {
				e.preventDefault ()
				return false }

			if (cfg.handler) {
				cfg.handler ({
					unbind: function () {
						self.off ('touchstart', touchstartHandler).off ('click', clickHandler) } }) }

			return this.on ('touchstart', touchstartHandler).on ('click', clickHandler) }

		else { // mouse experience
			if (cfg.handler) {
				cfg.handler ({
					unbind: function () {
						self.off ('click', fn) } }) }
			return this.click (fn) } },

	touchTooltip: function (cfg) {
		if (Platform.iOS) {
			var hideTooltipWithDelay = _.debounce (_.$ (this, function () { $(this).tooltip ('hide') }), 1000)
			return this
				.tooltip (_.extend (cfg, { trigger: 'manual' }))
				.on ('touchstart', function () {
					$(this).tooltip ('show')
					hideTooltipWithDelay () }) }
		else {
			return this.tooltip (cfg) } } })


/*	SVG helpers
	======================================================================== */

$.extend ({
	svg: function (tag) {
		return $(document.createElementNS ('http://www.w3.org/2000/svg', tag)) },
	translate: function (pt) {
		return this.attr ('transform', 'translate(' + pt.x + ',' + pt.y + ')') },
	transform: function (t) {
		var m = t.components
		return this.attr ('transform', 'matrix(' +
			m[0][0] + ',' + m[1][0] + ',' + m[0][1] + ',' + m[1][1] + ',' + m[0][2] + ',' + m[1][2] + ')') },
	clientBBox: function () {
		var rect = this[0].getBoundingClientRect ()
		return new BBox (rect.left, rect.top, rect.width, rect.height) } })


/*	Displays modal overlay with title and progressbar (indefinite animation mode available).
	======================================================================== */

var ProgressOverlay = $prototype ({
	constructor: function (cfg) {
		this.el = $('<div class="modal-overlay">' +
			'<div class="background"></div>' +
			'<div class="modal loading">' +
				'<div class="modal-body">' +
					'<h5>' + (cfg.title || 'Don\'t panic') + '</h5>' +
					'<div class="progress progress-striped active">' +
					'<div class="bar" style="width: 0%;"></div>' +
					'</div>' +
					'<div class="loading-error hide alert alert-error fade in">' +
						'<span class="message"></span>' +
					'</div>' +
				'</div>' +
				'<div class="modal-footer hide">' +
					'<button type="button" class="btn btn-warning retry">Попробовать ещё раз</button>' +
				'</div>' +
			'</div>' +
		'</div>').appendTo (this.renderTo = (cfg.renderTo || document.body))
		if (cfg.indefinite) {
			this.indefiniteAnimation () } },
	dead: function () {
		return !this.el },
	indefiniteAnimation: function () {
		var maxWidth = this.el.find ('.progress').width ()
		var barWidth = this.el.find ('.bar').width ()
		this.el.find ('.bar').animate ({
			width: Math.round (barWidth + (maxWidth - barWidth) * 0.5) /* median */ },
			5000, 'linear', this.$ (function () {
										if (this.el) {
											this.indefiniteAnimation () } })) },
	title: function (text) {
		this.el.find ('h5').text (text) },
	progress: function (n) {
		this.el.find ('.bar').width (Math.round (this.el.find ('.progress').width () * n)) },
	retry: function (handler) {
		this.el.find ('.retry').unbind ('click touchstart').touchClick (handler) },
	clearError: function () {
		this.el.find ('.modal.loading').removeClass ('error')
		if (this.indefinite) {
			this.indefiniteAnimation () } },
	error: function (text) {
		this.el.find ('.modal.loading').addClass ('error').find ('.message').text (text)
		this.el.find ('.bar').stop () },
	disappear: function () {
		this.el.fadeOut (500, this.$ (function () {
			this.el.remove ()
			delete this.el })) } })


/*	Other common UI utils (probly subject to refactoring)
	======================================================================== */

var UI = {
	translateTouchEvent: function (e) {
		return (e.originalEvent.touches && e.originalEvent.touches[0]) || e },

	overlayUnder: function (foregroundEls, then) {
		$(foregroundEls).css ('z-index', 100000)
		var el = $('<div class="modal-overlay"><div class="background"></div></div>')
			.css ('z-index', 99999)
			.appendTo ('body > .content')
		then (function () /* hide */ {
			el.fadeOut (500, function () {
				$(foregroundEls).css ('z-index', '')
				el.remove () }) }) },

	/*	this is for iPad debugging, writes string to overlay log
	 */
	log: function () {
		UI._log (log.impl.stringifyArguments (arguments)) },
	logPinned: function (id) {
		UI._log (log.impl.stringifyArguments (_.rest (arguments)), id) },
	_log: function (s, id) {
		var log = $('#debug-log').show ()
		if (log.length === 0) {
			log = $('<div id="debug-log">')
				.css ({
					position: 'fixed', color: 'red', zIndex: 10000,
					right: 0, top: 0, width: 300, height: 300, background: 'rgba(255,255,255,0.75)',
					padding: 20, 'overflow-y': 'auto' })
				.appendTo (document.body)
				.touchClick (function () {
					log.hide () }) }
		var item = id && $('#' + id)
		if (item && item.length) {
			var counter = item.find ('.counter'), msg = item.find ('.msg')
			if (msg.text () == s) {
				counter.text ((parseInt (counter.text (), 10) || 0) + 1) }
			else {
				msg.text (s)
				counter.text ('') } }
		else {
			log.prepend ($('<div>')
				.attr ('id', id)
				.append ($('<span class="msg">').text (s))
				.append ($('<span class="counter" style="float: right;"">'))) } } }
			