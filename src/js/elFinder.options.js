(function($) {

/**
 * Default config
 *
 */
elFinder.prototype.options = {
	/* connector url. Required! */
	url            : '',
	/* interface language */
	lang           : 'en',
	/* additional css class for filemanager container */
	cssClass       : '',
	/* characters number to wrap file name in icons view. set to 0 to disable wrap */
	wrap           : 14,
	/* Name for places/favorites (i18n), set to '' to disable places */
	places         : 'Places',
	/* show places before navigation? */
	placesFirst    : true,
	
	/**
	 * Display only required file by types
	 *
	 * @type Array
	 * @default []
	 * @example
	 *  onlyMimes : ["image"] - display all images
	 *  onlyMimes : ["image/png", "application/x-shockwave-flash"] - display png and flash
	 */
	onlyMimes : [],
	
	/**
	 * How to sort files in current directory
	 *
	 * @type String
	 * @default "nameDirsFirst"
	 * @example
	 *  - sort : 'nameDirsFirst' - sort by name, directory first
	 *  - sort : 'kindDirsFirst' - sort by kind, name, directory first
	 *  - sort : 'sizeDirsFirst' - sort by size, name, directory first
	 *  - sort : 'name' - sort by name
	 *  - sort : 'kind' - sort by kind, name
	 *  - sort : 'size' - sort by size, name
	 */
	sort : 'nameDirsFirst',
	
	/**
	 * Show nav panel (not implemented yet)
	 *
	 * @type Boolean
	 * @default true
	 */
	allowNav : true,
	/**
	 * On init expand current root directory in nav
	 *
	 * @type Boolean
	 * @default true
	 */
	navOpenRoot : true,
	/* callback to get file url (for wswing editors) */
	editorCallback : null,
	/* string to cut from file url begin before pass it to editorCallback. variants: '' - nothing to cut, 'root' - cut root url, 'http://...' - string if it exists in the beginig of url  */
	cutURL         : '',
	/* close elfinder after editorCallback */
	closeOnEditorCallback : true,
	/* i18 messages. not set manually! */
	i18n           : {},
	/* fm view (icons|list) */
	view           : 'icons',
	/* width to overwrite css options */
	width          : '',
	/* height to overwrite css options. Attenion! this is heigt of navigation/cwd panels! not total fm height */
	height         : '',
	/* disable shortcuts exclude arrows/space */
	allowShortcuts : true,
	/* open last visited dir after reload page or close and open browser */
	rememberLastDir : true,
	/**
	 * Data to append to all ajax requests and to upload form
	 *
	 * @type Object
	 * @default  {}
	 */
	customData : { },
	/**
	 * Show toolbar?
	 *
	 * @type Boolean
	 * @default  true
	 */
	allowToolbar : true,
	/**
	 * Show navbar?
	 * If set to false - navbar does not shown and dir tree doesnot created
	 *
	 * @type Boolean
	 * @default  true
	 */
	allowNavbar : true,
	/**
	 * Show statusbar?
	 *
	 * @type Boolean
	 * @default  true
	 */
	allowStatusbar : true,
	
	showFiles : 100,
	
	loadFiles : 100,
	
	loadThreshold : 100,
	
	/* cookie options */
	cookie         : {
		expires : 30,
		domain  : '',
		path    : '/',
		secure  : false
	},
	/* buttons on toolbar */
	toolbar        : [
		['back', 'reload'],
		['select', 'open'],
		['mkdir', 'mkfile', 'upload'],
		['copy', 'paste', 'rm'],
		['rename', 'edit'],
		['info', 'quicklook'],
		['icons', 'list'],
		['help']
	],
	/* contextmenu commands */
	contextmenu : {
		'cwd'   : ['reload', 'delim', 'mkdir', 'mkfile', 'upload', 'delim', 'paste', 'delim', 'info'],
		'file'  : ['select', 'open', 'quicklook', 'delim', 'copy', 'cut', 'rm', 'delim', 'duplicate', 'rename', 'edit', 'resize', 'archive', 'extract', 'delim', 'info'],
		'group' : ['select', 'copy', 'cut', 'rm', 'delim', 'archive', 'extract', 'delim', 'info']
	},
	/* jqueryUI dialog options */
	dialog : null,
	/* docked mode */
	docked : false,
	/* auto reload time (min) */
	autoReload : 0,
	/* set to true if you need to select several files at once from editorCallback */
	selectMultiple : false,
	debug : true
	// debug : ['event-ajaxstop', 'event-lock', 'event-cd']
}

})(jQuery);