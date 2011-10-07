"use strict"
/**
 * @class  elFinder command "sort"
 * Change sort files rule
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.sort = function() {
	var self = this,
		sorts = ['nameDirsFirst', 'kindDirsFirst', 'sizeDirsFirst', 'dateDirsFirst', 'name', 'kind', 'size', 'date'], i;
	
	/**
	 * Command options
	 *
	 * @type  Object
	 */
	this.options = {ui : 'sortbutton'};
	
	this.value = 1;
	this.variants = [];
	
	for (i = 0; i < sorts.length; i++) {
		this.variants.push([sorts[i], this.fm.i18n('sort' + sorts[i])])
	}
	
	this.disableOnSearch = true;
	
	this.fm.bind('load sortchange', function() {
		self.value = sorts[self.fm.sort-1];
		self.change();
	});
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function(hashes, type) {
		var dir = $.inArray(type, sorts)+1 == this.fm.sort ? (this.fm.sortDirect == 'asc' ? 'desc' : 'asc') : this.fm.sortDirect;

		this.fm.setSort(type, dir);
	}

}