"use strict"
/**
 * @class  elFinder command "sort"
 * Change sort files rule
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.sort = function() {
	var self  = this,
	fm    = self.fm;
	
	/**
	 * Command options
	 *
	 * @type  Object
	 */
	this.options = {ui : 'sortbutton'};
	
	fm.bind('open sortchange', function() {
		self.variants = [];
		$.each(fm.sortRules, function(name, value) {
			var sort = {
					type  : name,
					order : name == fm.sortType ? fm.sortOrder == 'asc' ? 'desc' : 'asc' : fm.sortOrder
				};
			var arr = name == fm.sortType ? (sort.order == 'asc'? 'n' : 's') : '';
			self.variants.push([sort, (arr? '<span class="ui-icon ui-icon-arrowthick-1-'+arr+'"></span>' : '') + '&nbsp;' + fm.i18n('sort'+name)]);
		});
	});
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function(hashes, sortopt) {
		var fm = this.fm,
			sort = $.extend({
				type  : fm.sortType,
				order : fm.sortOrder,
				stick : fm.sortStickFolders
			}, sortopt);

		this.fm.setSort(sort.type, sort.order, sort.stick);
		return $.Deferred().resolve();
	}

}