/**
 * @class  elFinder command "sort"
 * Change sort files rule
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.sort = function() {
	"use strict";
	var self  = this,
		fm    = self.fm,
		setVar = function() {
			self.variants = [];
			$.each(fm.sortRules, function(name, value) {
				if (fm.sorters[name]) {
					var arr = (name === fm.sortType)? (fm.sortOrder === 'asc'? 'n' : 's') : '';
					self.variants.push([name, (arr? '<span class="ui-icon ui-icon-arrowthick-1-'+arr+'"></span>' : '') + '&nbsp;' + fm.i18n('sort'+name)]);
				}
			});
			self.variants.push('|');
			self.variants.push([
				'stick',
				(fm.sortStickFolders? '<span class="ui-icon ui-icon-check"/>' : '') + '&nbsp;' + fm.i18n('sortFoldersFirst')
			]);
			if (fm.ui.tree && fm.options.sortAlsoTreeview !== null) {
				self.variants.push('|');
				self.variants.push([
					'tree',
					(fm.sortAlsoTreeview? '<span class="ui-icon ui-icon-check"/>' : '') + '&nbsp;' + fm.i18n('sortAlsoTreeview')
				]);
			}
			updateContextmenu();
		},
		updateContextmenu = function() {
			var cm = fm.getUI('contextmenu'),
				icon, sub;
			if (cm.is(':visible')) {
				icon = cm.find('span.elfinder-button-icon-sort');
				sub = icon.siblings('div.elfinder-contextmenu-sub');
				sub.find('span.ui-icon').remove();
				sub.children('div.elfinder-contextsubmenu-item').each(function() {
					var tgt = $(this).children('span'),
						name = tgt.text().trim(),
						arr;
					if (name === (i18Name.stick || (i18Name.stick = fm.i18n('sortFoldersFirst')))) {
						if (fm.sortStickFolders) {
							tgt.prepend('<span class="ui-icon ui-icon-check"/>');
						}
					} else if (name === (i18Name.tree || (i18Name.tree = fm.i18n('sortAlsoTreeview')))) {
						if (fm.sortAlsoTreeview) {
							tgt.prepend('<span class="ui-icon ui-icon-check"/>');
						}
					} else if (name === (i18Name[fm.sortType] || (i18Name[fm.sortType] = fm.i18n('sort' + fm.sortType)))) {
						arr = fm.sortOrder === 'asc'? 'n' : 's';
						tgt.prepend('<span class="ui-icon ui-icon-arrowthick-1-'+arr+'"></span>');
					}
				});
			}
		},
		i18Name = {};
	
	/**
	 * Command options
	 *
	 * @type  Object
	 */
	this.options = {ui : 'sortbutton'};
	
	this.keepContextmenu = true;

	fm.bind('sortchange', setVar)
	.bind('sorterupdate', function() {
		setVar();
		fm.getUI().children('.elfinder-button-sort-menu').children('.elfinder-button-menu-item').each(function() {
			var tgt = $(this),
				rel = tgt.attr('rel');
			tgt.toggle(!!(! rel || fm.sorters[rel]));
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
								fm.exec('sort', [], sort);
							}
						}
					})
					.on('mouseenter mouseleave', function(e) {
						$(this).toggleClass('ui-state-hover', e.type === 'mouseenter');
					});
				}
				
			});
		}
	});
	
	this.getstate = function() {
		return 0;
	};
	
	this.exec = function(hashes, cOpt) {
		var fm = this.fm,
			sortopt = $.isPlainObject(cOpt)? cOpt : (function() {
				cOpt += '';
				var sOpts = {};
				if (cOpt === 'stick') {
					sOpts.stick = !fm.sortStickFolders;
				} else if (cOpt === 'tree') {
					sOpts.tree = !fm.sortAlsoTreeview;
				} else if (fm.sorters[cOpt]) {
					if (fm.sortType === cOpt) {
						sOpts.order = fm.sortOrder === 'asc'? 'desc' : 'asc';
					} else {
						sOpts.type = cOpt;
					}
				}
				return sOpts;
			})(),
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
