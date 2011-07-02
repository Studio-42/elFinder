/**
 * Default config
 *
 */
elFinder.prototype.options = {
	/**
	 * Connector url. Required!
	 *
	 * @type String
	 */
	url            : '',

	/**
	 * Ajax request type.
	 *
	 * @type String
	 * @default "get"
	 */
	requestType : 'get',

	/**
	 * Interface language
	 *
	 * @type String
	 * @default "en"
	 */
	lang           : 'en',

	/**
	 * Additional css class for filemanager node.
	 *
	 * @type String
	 */
	cssClass       : '',

	commands : ['open', 'reload', 'home', 'up', 'back', 'forward', 'getfile', 'quicklook', 'download', 'rm', 'duplicate', 'rename', 'mkdir', 'mkfile', 'upload', 'copy', 'cut', 'paste', 'edit', 'extract', 'archive', 'search', 'info', 'view', 'help'],
	
	getFileCallback : null,
	/**
	 * UI plugins to load.
	 * Current dir ui and dialogs loads always.
	 * Here set not required plugins as folders tree/toolbar/statusbar etc.
	 *
	 * @type Array
	 * @default ['toolbar', 'tree']
	 */
	ui : ['toolbar', 'places', 'tree', 'path', 'stat'],

	/**
	 * Some UI plugins options.
	 *
	 * @type Object
	 */
	uiOptions : {
		// toolbar content
		toolbar : [
			['back', 'forward'],
			['reload'],
			['home', 'up'],
			// ['reload', 'up', 'home'],
			['mkdir', 'mkfile', 'upload'],
			['open', 'download', 'getfile'],
			['info'],
			['quicklook'],
			['copy', 'cut', 'paste'],
			['rm'],
			['duplicate', 'rename', 'edit'],
			['extract', 'archive'],
			['search'],
			['view'],
			['help']
		]
		// folders tree options
		// tree : {tag : 'ul'}
	},

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
	sort : 'kindDirsFirst',
	
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
	
	resizable : true,
	
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
	/* width */
	width          : 'auto',
	/* height */
	height         : 415,
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
	customData : {token : '42', test : 'test'},
	
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
	
	
	
	/* cookie options */
	cookie         : {
		expires : 30,
		domain  : '',
		path    : '/',
		secure  : false
	},
	
	/* contextmenu commands */
	contextmenu : {
		navbar : ['open', '|', 'copy', 'cut', 'paste', 'duplicate', '|', 'rm', '|', 'info'],
		cwd    : ['reload', 'back', '|', 'upload', 'mkdir', 'mkfile', 'paste', '|', 'search', '|', 'info'],
		files  : ['getfile', '|','open', 'quicklook', '|', 'download', '|', 'edit', '|', 'copy', 'cut', 'paste', 'duplicate', '|', 'rm', '|', 'archive', 'extract', '|', 'info']
	},

	/**
	 * Commands options.
	 *
	 * @type Object
	 **/
	commandsOptions : {
		// "getfile" command options.
		getfile : {
			// allow to return multiple files info
			multiple : false,
			// allow to return filers info
			folders  : false
		},
		// "upload" command options.
		upload : {
			// open dialog on click toolbar button instead of open browser select files dialog
			forceDialog   : false,
			// send files using form with iframe target
			forceIframe   : false, 
			// 15 min timeout before abort upload files using iframe
			iframeTimeout : 900000,
			/**
			 * custom function to upload files
			 *
			 * @param  Object  must contains input[type="file"] node or FileList
			 * @example
			 *   - cmd.exec({input : inputNode})
			 *   - cmd.exec({files : FilesList})
			 * @return jQuery.Deferred
			 **/
			transport : null
		},
		// "quicklook" command options.
		quicklook : {
			autoplay : true,
			jplayer  : 'extensions/jplayer'
		}
	},
	
	// debug : true
	debug : ['error', 'warning', 'event-sync', 'event-searchend']
}
