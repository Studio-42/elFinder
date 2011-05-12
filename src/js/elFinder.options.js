(function($) {

/**
 * Default config
 *
 */
elFinder.prototype.options = {
	/* connector url. Required! */
	url            : '',
	requestType : 'get',
	/* interface language */
	lang           : 'en',
	/* additional css class for filemanager container */
	cssClass       : '',
	blurClass : 'elfinder-blur',
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
	openRootOnLoad : true,
	
	resizable : false,
	
	notifyDelay : 500,
	
	syncTree : true,
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
	width          : 'auto',
	/* height to overwrite css options. Attenion! this is heigt of navigation/cwd panels! not total fm height */
	height         : 300,
	/* disable shortcuts exclude arrows/space */
	allowShortcuts : true,
	/* open last visited dir after reload page or close and open browser */
	// rememberLastDir : true,
	/**
	 * Data to append to all ajax requests and to upload form
	 *
	 * @type Object
	 * @default  {}
	 */
	customData : {token : '42'},
	
	handlers : {},
	
	// getFileCallback : function(file) {
	// 	console.log('got file')
	// 	console.log(file)
	// },
	
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
	// allowStatusbar : true,
	/**
	 * Lazy load config.
	 * How many files show at once?
	 *
	 * @type Number
	 * @default  50
	 */
	showFiles : 30,
	/**
	 * Lazy load config.
	 * Distance in px to cwd bottom edge to start display files
	 *
	 * @type Number
	 * @default  100
	 */
	showThreshold : 50,
	
	/**
	 * Additional rule to valid new file name.
	 * By default not allowed empty names or '..'
	 *
	 * @type false|RegExp|function
	 * @default  false
	 * @example
	 *  disable names with spaces:
	 *  validName : /^[^\s]$/
	 */
	validName : false,
	
	sync : 0,
	
	// commands : ['back', 'forward', 'reload', 'up', 'home', 'open', 'copy', 'cut', 'paste', 'rm', 'info', 'duplicate', 'rename'],
	
	commands : ['open', 'reload', 'getfile', 'help'],
	
	
	commandsOptions : {},
	
	/* cookie options */
	cookie         : {
		expires : 30,
		domain  : '',
		path    : '/',
		secure  : false
	},
	
	/**
	 * Toolbar name.
	 * Toolbar is jquery plugin named $.fn.elfindertoolbar+toolbar 
	 * Now only one $.fn.elfindertoolbar exists.
	 * Required for future features.
	 *
	 * @type String
	 * @default ""
	 */
	toolbar : '',
	/* buttons on toolbar */
	toolbarConf : [
		['back', 'forward', 'reload', 'up', 'home'],
		['open', 'select'],
		['copy', 'cut', 'paste', 'duplicate', 'rename'],
		['rm'],
		['info'],
		['help']
	],
	toolbarConf_ : [
		['back', 'forward', 'reload', 'up', 'home'],
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
	commandsOptions : {
		getfile : {
			dblclick : true,
			enter    : true,
			multiple : true,
			folders  : false
		}
	},
	clearCache : true,
	// debug : true
	// debug : ['error', 'event-enable', 'event-disable']
}

})(jQuery);