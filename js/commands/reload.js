/**
 * @class  elFinder command "reload"
 * Sync files and folders
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.reload = function() {
	var self   = this,
		search = false;
	
	this.alwaysEnabled = true;
	this.updateOnSelect = true;
	
	this.shortcuts = [{
		pattern     : 'ctrl+shift+r f5'
	}];
	
	this.getstate = function() {
		return 0;
	};
	
	this.init = function() {
		this.fm.bind('search searchend', function(e) {
			search = e.type == 'search';
		});
	};
	
	this.fm.bind('contextmenu', function(e){
		var fm = self.fm;
		if (fm.options.sync >= 1000) {
			var node;
			self.extra = {
				icon: 'accept',
				node: $('<span/>')
					.attr({title: fm.i18n('autoSync')})
					.on('click', function(e){
						e.stopPropagation();
						e.preventDefault();
						node.parent()
							.toggleClass('ui-state-disabled', fm.options.syncStart)
							.parent().removeClass('ui-state-hover');
						fm.options.syncStart = !fm.options.syncStart;
						fm.autoSync(fm.options.syncStart? null : 'stop');
					})
			};
			node = self.extra.node;
			node.ready(function(){
				setTimeout(function(){
					node.parent().toggleClass('ui-state-disabled', !fm.options.syncStart).css('pointer-events', 'auto');
				}, 10);
			});
		}
	});
	
	this.exec = function() {
		var fm = this.fm;
		if (!search) {
			var dfrd    = fm.sync(),
				timeout = setTimeout(function() {
					fm.notify({type : 'reload', cnt : 1, hideCnt : true});
					dfrd.always(function() { fm.notify({type : 'reload', cnt  : -1}); });
				}, fm.notifyDelay);
				
			return dfrd.always(function() { 
				clearTimeout(timeout); 
				fm.trigger('reload');
			});
		} else {
			$('div.elfinder-toolbar > div.'+fm.res('class', 'searchbtn') + ' > span.ui-icon-search').click();
		}
	};

};
