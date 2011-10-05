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
		this.fm.setSort(type);
	}

}