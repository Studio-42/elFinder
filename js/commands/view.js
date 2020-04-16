/**
 * @class  elFinder command "view"
 * Change current directory view (icons/list)
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.view = function() {
	"use strict";
	var self = this,
		fm = this.fm,
		subMenuRaw;
	this.value          = fm.viewType;
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;

	this.options = { ui : 'viewbutton'};
	
	this.getstate = function() {
		return 0;
	};
	
	this.extra = {
		icon: 'menu',
		node: $('<span></span>')
			.attr({title: fm.i18n('viewtype')})
			.on('click touchstart', function(e){
				if (e.type === 'touchstart' && e.originalEvent.touches.length > 1) {
					return;
				}
				var node = $(this);
				e.stopPropagation();
				e.preventDefault();
				fm.trigger('contextmenu', {
					raw: getSubMenuRaw(),
					x: node.offset().left,
					y: node.offset().top
				});
			})
	};

	this.exec = function() {
		var self  = this,
			value = this.value == 'list' ? 'icons' : 'list';
			
		fm.storage('view', value);
		return fm.lazy(function() {
			fm.viewchange();
			self.update(void(0), value);
			this.resolve();
		});
	};

	fm.bind('init', function() {
		subMenuRaw = (function() {
			var cwd = fm.getUI('cwd'),
				raws = [],
				sizeNames = fm.options.uiOptions.cwd.iconsView.sizeNames,
				max = fm.options.uiOptions.cwd.iconsView.sizeMax,
				i, size;
			for (i = 0; i <= max; i++) {
				raws.push(
					{
						label    : fm.i18n(sizeNames[i] || ('Size-' + i + ' icons')),
						icon     : 'view',
						callback : (function(s) {
							return function() {
								cwd.trigger('iconpref', {size: s});
								fm.storage('iconsize', s);
								if (self.value === 'list') {
									self.exec();
								}
							};
						})(i)
					}
				);
			}
			raws.push('|');
			raws.push(
				{
					label    : fm.i18n('viewlist'),
					icon     : 'view-list',
					callback : function() {
						if (self.value !== 'list') {
							self.exec();
						}
					}
				}		
			);
			return raws;
		})();
	}).bind('contextmenucreate', function() {
		self.extra = {
			icon: 'menu',
			node: $('<span></span>')
				.attr({title: fm.i18n('cmdview')})
				.on('click touchstart', function(e){
					if (e.type === 'touchstart' && e.originalEvent.touches.length > 1) {
						return;
					}
					var node = $(this),
						raw = subMenuRaw.concat(),
						idx, i;
					if (self.value === 'list') {
						idx = subMenuRaw.length - 1;
					} else {
						idx = parseInt(fm.storage('iconsize') || 0);
					}
					for (i = 0; i < subMenuRaw.length; i++) {
						if (subMenuRaw[i] !== '|') {
							subMenuRaw[i].options = (i === idx? {'className': 'ui-state-active'} : void(0))
							;
						}
					}
					e.stopPropagation();
					e.preventDefault();
					fm.trigger('contextmenu', {
						raw: subMenuRaw,
						x: node.offset().left,
						y: node.offset().top
					});
				})
		};
	});

};
