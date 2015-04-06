InfiniScrollContainer = $component ({

	$defaults: {
		el: undefined,
		collection: undefined,
		itemClass: 'item',
		numItemsToOverRender: 5 },

	$overrideThis: {
		item:		function (index) { return $('<div>') },
		updateItem:	function (el, item) {},
		removeItem:	function (el) { el.remove () } },

	init: function () {
		this.itemsRendered = 0
		this.collection = this.sort ?
			(new SortedFilteredCollection (_.pick (this, 'sortField', 'sort', 'sortOrder', 'source'))) :
			this.source

		_.delay (this.refresh)
		
		this.source.updated (this.refresh)
		this.el.scroll (this.$ (function () {
			if (this.scrolledAtMax) {
				this.overRender () } }))

		this.collection.itemUpdated (this.$ (function (item, before, index) {
			_.delay (this.$ (function () {
				var el = this.findById (item._id)
				if (el.length) {
					this.updateItem (el, item) }
				else {
					this.newItem (item).insertBefore (this.atIndex (index)) }})) }))

		this.collection.itemDeleted (this.$ (function (data) {
			var el = this.findById (data._id)
			if (el.length) {
				this.removeItem (el) } })) },

	findById: function (id) {
		return this.el.find ('> .' + this.itemClass + '[data-id=' + id + ']') },

	atIndex: function (id) {
		return this.el.find ('.' + this.itemClass)[index] },

	scrolledAtMax: $property (function () {
		return (this.el[0].scrollTop + this.el.outerHeight ()) === this.el[0].scrollHeight }),

	beforeRefresh: function () {},
	refresh: function () {
		this.el.empty ()
		this.beforeRefresh ()
		this.fillViewport ()
		this.overRender () },

	fillViewport: function () {
		for (var i = 0, viewportHeight = this.el.outerHeight ();
			(this.el[0].scrollHeight <= viewportHeight) && this.appendItem (); i++) {} },

	overRender: function () {
		for (var i = 0; (i < this.numItemsToOverRender) && this.appendItem (); i++) {} },

	newItem: function (item) {
		return this.item (item).attr ('data-id', item._id) },

	appendItem: function () {
		if (this.itemsRendered < this.collection.items.length) {
			var item = this.collection.items[this.itemsRendered]
			this.el.append (this.newItem (item))
			this.itemsRendered++
			return true }
		else {
			return false } } })