"use strict";
/**
 * @class  elFinder command "sort"
 * Change sort files rule
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.sort = function() {
	var self  = this,
	fm    = self.fm,
	timer;
	
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
	
	fm.bind('open sortchange viewchange search searchend', function() {
		timer && clearTimeout(timer);
		timer = setTimeout(function(){
			var cols = $(fm.cwd).find('div.elfinder-cwd-wrapper-list table');
			if (cols.length) {
				$.each(fm.sortRules, function(name, value) {
					var td = cols.find('thead tr td.elfinder-cwd-view-th-'+name);
					if (td.length) {
						var current = ( name == fm.sortType),
						sort = {
							type  : name,
							order : current ? fm.sortOrder == 'asc' ? 'desc' : 'asc' : fm.sortOrder
						},arr;
						if (current) {
							td.addClass('ui-state-active');
							arr = fm.sortOrder == 'asc' ? 'n' : 's';
							$('<span class="ui-icon ui-icon-triangle-1-'+arr+'"/>').appendTo(td);
						}
						$(td).on('click', function(e){
							e.stopPropagation();
							self.exec([], sort);
						})
						.hover(function() {
							$(this).addClass('ui-state-hover');
						},function() {
							$(this).removeClass('ui-state-hover');
						});
					}
					
				});
			}
		}, 100);
	});
	
	this.getstate = function() {
		return 0;
	};
	
	this.exec = function(hashes, sortopt) {
		var fm = this.fm,
			sort = $.extend({
				type  : fm.sortType,
				order : fm.sortOrder,
				stick : fm.sortStickFolders
			}, sortopt);

		this.fm.setSort(sort.type, sort.order, sort.stick);
		return $.Deferred().resolve();
	};

};
