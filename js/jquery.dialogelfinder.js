/**
 * @class dialogelfinder - open elFinder in dialog window
 *
 * @param  Object  elFinder options with dialog options
 * @example
 * $(selector).dialogelfinder({
 *     // some elfinder options
 *     title          : 'My files', // dialog title, default = "Files"
 *     width          : 850,        // dialog width, default 840
 *     autoOpen       : false,      // if false - dialog will not be opened after init, default = true
 *     destroyOnClose : true        // destroy elFinder on close dialog, default = false
 * })
 * @author Dmitry (dio) Levashov
 **/
$.fn.dialogelfinder = function(opts, opts2) {
		var position = 'elfinderPosition',
		destroy  = 'elfinderDestroyOnClose',
		node, pos;

	if ($.isPlainObject(opts)) {
		this.not('.elfinder').each(function() {

			opts.handlers = opts.handlers || {};

			var node    = $(this),
				doc     = $(document),
				toolbar = $('<div class="ui-widget-header dialogelfinder-drag ui-corner-top">'+(opts.title || 'Files')+'</div>'),
				button  = $('<a href="#" class="dialogelfinder-drag-close ui-corner-all"><span class="ui-icon ui-icon-closethick"> </span></a>')
					.appendTo(toolbar)
					.on('click', function(e) {
						e.preventDefault();
						node.dialogelfinder('close');
					}),
				init    = opts.handlers.init,
				elfinder;

			opts.handlers.init = function(e, fm) {
				node.prepend(toolbar);
				init && init(e, fm);
			};

			elfinder = node.addClass('elfinder dialogelfinder touch-punch')
				.css('position', 'absolute')
				.hide()
				.appendTo('body')
				.draggable({
					handle : '.dialogelfinder-drag',
					containment : 'window',
					stop : function() {
						node.trigger('resize');
						elfinder.trigger('resize');
					}
				})
				.elfinder(opts, opts2)
				.elfinder('instance');
			
			elfinder.reloadCallback = function(o, o2) {
				elfinder.destroy();
				o.handlers.init = init;
				node.dialogelfinder(o, o2).dialogelfinder('open');
			};
			
			node.width(parseInt(node.width()) || 840) // fix width if set to "auto"
				.data(destroy, !!opts.destroyOnClose)
				.find('.elfinder-toolbar').removeClass('ui-corner-top');
			
			opts.position && node.data(position, opts.position);
			
			opts.autoOpen !== false && $(this).dialogelfinder('open');

		});
	} else {
		if (opts === 'open') {
			node = $(this);
			pos = node.data(position) || {
				top  : parseInt($(document).scrollTop() + ($(window).height() < node.height() ? 2 : ($(window).height() - node.height())/2)),
				left : parseInt($(document).scrollLeft() + ($(window).width() < node.width()  ? 2 : ($(window).width()  - node.width())/2))
			};

			if (node.is(':hidden')) {
				node.addClass('ui-front').css(pos).show().trigger('resize');

				setTimeout(function() {
					// fix resize icon position and make elfinder active
					node.trigger('resize').trigger('mousedown');
				}, 200);
			}
		} else if (opts === 'close') {
			node = $(this).removeClass('ui-front');
				
			if (node.is(':visible')) {
				!!node.data(destroy)
					? node.elfinder('destroy').remove()
					: node.elfinder('close');
			}
		} else if (opts === 'instance') {
			return $(this).getElFinder();
		}
	}

	return this;
};
