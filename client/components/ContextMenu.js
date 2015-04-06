/*	TODO: derive from Component
	======================================================================== */

ContextMenu = {
	
	el: undefined,

	init: function () {
		if (!this._init) {
			this._init = true
			$(document.body).mousedown (_.$ (this, function () {
				this._destroyTimeout = window.setTimeout (_.$ (this, this.destroy), 50) })) } },

	destroy: function () {
		if (this.el) {
			this.el.remove ()
			this.el = undefined
			if (this.toggled) {
				this.toggled (false)
				this.toggled = undefined } }
		if (this._destroyTimeout) {
			window.clearTimeout (this._destroyTimeout)
			this._destroyTimeout = undefined } },

	show: function (event, context, items, toggled) {
		this.showAt (event.clientX, event.clientY, context, items, toggled)
		event.preventDefault ()
		return false },

	showAt: function (x, y, context, items, toggled) {
		this.init ()
		this.destroy ()
		this.el = $('<ul class="context-menu dropdown-menu" role="menu"></ul>').css ({
				left: x + 'px',
				top: y + 'px' })
			.click (_.$ (this, this.destroy))
			.mousedown (function (e) {
				e.preventDefault ()
				return false })
			.append (_.map (items, function (click, label) {
				return $('<li>').append ($('<a href="javascript:{}">').text (label).click (_.$ (context, click))) }))
			.appendTo (document.body).fadeIn (200)
		if (toggled) {
			this.toggled = toggled
			toggled (true) } },

	toggleAt: function (x, y, context, items, toggled) {
		if (this.el) {
			this.destroy () }
		else {
			this.showAt (x, y, context, items, toggled) } } }