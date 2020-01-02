/**
 * @class elFinder command "hide".
 * folders/files to hide as personal setting.
 *
 * @type  elFinder.command
 * @author  Naoki Sawada
 */
elFinder.prototype.commands.hide = function() {
	"use strict";

	var self = this,
		nameCache = {},
		hideData, hideCnt, cMenuType, sOrigin;

	this.syncTitleOnChange = true;

	this.shortcuts = [{
		pattern : 'ctrl+shift+dot',
		description : this.fm.i18n('toggleHidden')
	}];

	this.init = function() {
		var fm = this.fm;
		
		hideData = fm.storage('hide') || {items: {}};
		hideCnt = Object.keys(hideData.items).length;

		this.title = fm.i18n(hideData.show? 'hideHidden' : 'showHidden');
		self.update(void(0), self.title);
	};

	this.fm.bind('select contextmenucreate closecontextmenu', function(e, fm) {
		var sel = (e.data? (e.data.selected || e.data.targets) : null) || fm.selected();
		if (e.type === 'select' && e.data) {
			sOrigin = e.data.origin;
		} else if (e.type === 'contextmenucreate') {
			cMenuType = e.data.type;
		}
		if (!sel.length || (((e.type !== 'contextmenucreate' && sOrigin !== 'navbar') || cMenuType === 'cwd') && sel[0] === fm.cwd().hash)) {
			self.title = fm.i18n(hideData.show? 'hideHidden' : 'showHidden');
		} else {
			self.title = fm.i18n('cmdhide');
		}
		if (e.type !== 'closecontextmenu') {
			self.update(cMenuType === 'cwd'? (hideCnt? 0 : -1) : void(0), self.title);
		} else {
			cMenuType = '';
			requestAnimationFrame(function() {
				self.update(void(0), self.title);
			});
		}
	});

	this.getstate = function(sel) {
		return (this.fm.cookieEnabled && cMenuType !== 'cwd' && (sel || this.fm.selected()).length) || hideCnt? 0 : -1;
	};

	this.exec = function(hashes, opts) {
		var fm = this.fm,
			dfrd = $.Deferred()
				.done(function() {
					fm.trigger('hide', {items: items, opts: opts});
				})
				.fail(function(error) {
					fm.error(error);
				}),
			o = opts || {},
			items = o.targets? o.targets : (hashes || fm.selected()),
			added = [],
			removed = [],
			notifyto, files, res;

		hideData = fm.storage('hide') || {};
		if (!$.isPlainObject(hideData)) {
			hideData = {};
		}
		if (!$.isPlainObject(hideData.items)) {
			hideData.items = {};
		}
		if (opts._currentType === 'shortcut' || !items.length || (opts._currentType !== 'navbar' && sOrigin !=='navbar' && items[0] === fm.cwd().hash)) {
			if (hideData.show) {
				o.hide = true;
			} else if (Object.keys(hideData.items).length) {
				o.show = true;
			}
		}
		if (o.reset) {
			o.show = true;
			hideCnt = 0;
		}
		if (o.show || o.hide) {
			if (o.show) {
				hideData.show = true;
			} else {
				delete hideData.show;
			}
			if (o.show) {
				fm.storage('hide', o.reset? null : hideData);
				self.title = fm.i18n('hideHidden');
				self.update(o.reset? -1 : void(0), self.title);
				$.each(hideData.items, function(h) {
					var f = fm.file(h, true);
					if (f && (fm.searchStatus.state || !f.phash || fm.file(f.phash))) {
						added.push(f);
					}
				});
				if (added.length) {
					fm.updateCache({added: added});
					fm.add({added: added});
				}
				if (o.reset) {
					hideData = {items: {}};
				}
				return dfrd.resolve();
			}
			items = Object.keys(hideData.items);
		}

		if (items.length) {
			$.each(items, function(i, h) {
				var f;
				if (!hideData.items[h]) {
					f = fm.file(h);
					if (f) {
						nameCache[h] = f.i18 || f.name;
					}
					hideData.items[h] = nameCache[h]? nameCache[h] : h;
				}
			});
			hideCnt = Object.keys(hideData.items).length;
			files = this.files(items);
			fm.storage('hide', hideData);
			fm.remove({removed: items});
			if (hideData.show) {
				this.exec(void(0), {hide: true});
			}
			if (!o.hide) {
				res = {};
				res.undo = {
					cmd : 'hide',
					callback : function() {
						var nData = fm.storage('hide');
						if (nData) {
							$.each(items, function(i, h) {
								delete nData.items[h];
							});
							hideCnt = Object.keys(nData.items).length;
							fm.storage('hide', nData);
							fm.trigger('hide', {items: items, opts: {}});
							self.update(hideCnt? 0 : -1);
						}
						fm.updateCache({added: files});
						fm.add({added: files});
					}
				};
				res.redo = {
					cmd : 'hide',
					callback : function() {
						return fm.exec('hide', void(0), {targets: items});
					}
				};
			}
		}

		return dfrd.state() == 'rejected' ? dfrd : dfrd.resolve(res);
	};
};
