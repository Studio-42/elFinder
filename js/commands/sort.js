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
		setVar = function() {
			self.variants = [];
			$.each(fm.sortRules, function(name, value) {
				var sort = {
						type  : name,
						order : name == fm.sortType ? fm.sortOrder == 'asc' ? 'desc' : 'asc' : fm.sortOrder
					};
				if ($.inArray(name, fm.sorters) !== -1) {
					var arr = name == fm.sortType ? (sort.order == 'asc'? 's' : 'n') : '';
					self.variants.push([sort, (arr? '<span class="ui-icon ui-icon-arrowthick-1-'+arr+'"></span>' : '') + '&nbsp;' + fm.i18n('sort'+name)]);
				}
			});
			self.variants.push('|');
			self.variants.push([
				{
					type  : fm.sortType,
					order : fm.sortOrder,
					stick : !fm.sortStickFolders,
					tree  : fm.sortAlsoTreeview
				},
				(fm.sortStickFolders? '<span class="ui-icon ui-icon-check"/>' : '') + '&nbsp;' + fm.i18n('sortFoldersFirst')
			]);
			if (fm.ui.tree) {
				self.variants.push('|');
				self.variants.push([
					{
						type  : fm.sortType,
						order : fm.sortOrder,
						stick : fm.sortStickFolders,
						tree  : !fm.sortAlsoTreeview
					},
					(fm.sortAlsoTreeview? '<span class="ui-icon ui-icon-check"/>' : '') + '&nbsp;' + fm.i18n('sortAlsoTreeview')
				]);
			}
		};
	
	/**
	 * Command options
	 *
	 * @type  Object
	 */
	this.options = {ui : 'sortbutton'};
	
	fm.bind('open sortchange', setVar)
	.bind('open', function() {
		fm.unbind('add', setVar).one('add', setVar)
		fm.getUI('toolbar').find('.elfiner-button-sort .elfinder-button-menu .elfinder-button-menu-item').each(function() {
			var tgt = $(this),
				rel = tgt.attr('rel');
			tgt.toggle(! rel || $.inArray(rel, fm.sorters) !== -1);
		});
	})
	.bind('cwdrender', function() {
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
						if (! $(this).data('dragging')) {
							e.stopPropagation();
							if (! fm.getUI('cwd').data('longtap')) {
								self.exec([], sort);
							}
						}
					})
					.hover(function() {
						$(this).addClass('ui-state-hover');
					},function() {
						$(this).removeClass('ui-state-hover');
					});
				}
				
			});
		}
	});
	
	this.getstate = function() {
		return 0;
	};
	
	this.exec = function(hashes, sortopt) {
		var fm = this.fm,
			sort = Object.assign({
				type  : fm.sortType,
				order : fm.sortOrder,
				stick : fm.sortStickFolders,
				tree  : fm.sortAlsoTreeview
			}, sortopt);

		return fm.lazy(function() {
			fm.setSort(sort.type, sort.order, sort.stick, sort.tree);
			this.resolve();
		});
	};

};
