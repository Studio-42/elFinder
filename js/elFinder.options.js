/**
 * Default elFinder config
 *
 * @type  Object
 * @autor Dmitry (dio) Levashov
 */
elFinder.prototype._options = {
	/**
	 * URLs of 3rd party libraries CDN
	 * 
	 * @type Object
	 */
	cdns : {
		// for editor etc.
		ace        : 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12',
		codemirror : 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.61.1',
		ckeditor   : 'https://cdnjs.cloudflare.com/ajax/libs/ckeditor/4.16.1',
		ckeditor5  : 'https://cdn.ckeditor.com/ckeditor5/28.0.0',
		tinymce    : 'https://cdnjs.cloudflare.com/ajax/libs/tinymce/5.7.1',
		simplemde  : 'https://cdnjs.cloudflare.com/ajax/libs/simplemde/1.11.2',
		fabric     : 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/4.2.0',
		fabric16   : 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/1.6.7',
		tui        : 'https://uicdn.toast.com',
		// for quicklook etc.
		hls        : 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.0.2/hls.min.js',
		dash       : 'https://cdnjs.cloudflare.com/ajax/libs/dashjs/3.2.2/dash.all.min.js',
		flv        : 'https://cdnjs.cloudflare.com/ajax/libs/flv.js/1.5.0/flv.min.js',
		videojs    : 'https://cdnjs.cloudflare.com/ajax/libs/video.js/7.12.1',
		prettify   : 'https://cdn.jsdelivr.net/gh/google/code-prettify@f1c3473acd1e8ea8c8c1a60c56e89f5cdd06f915/loader/run_prettify.js',
		psd        : 'https://cdnjs.cloudflare.com/ajax/libs/psd.js/3.2.0/psd.min.js',
		rar        : 'https://cdn.jsdelivr.net/gh/nao-pon/rar.js@6cef13ec66dd67992fc7f3ea22f132d770ebaf8b/rar.min.js',
		zlibUnzip  : 'https://cdn.jsdelivr.net/gh/imaya/zlib.js@0.3.1/bin/unzip.min.js', // need check unzipFiles() in quicklook.plugins.js when update
		zlibGunzip : 'https://cdn.jsdelivr.net/gh/imaya/zlib.js@0.3.1/bin/gunzip.min.js',
		bzip2      : 'https://cdn.jsdelivr.net/gh/nao-pon/bzip2.js@0.8.0/bzip2.js',
		marked     : 'https://cdnjs.cloudflare.com/ajax/libs/marked/2.0.3/marked.min.js',
		sparkmd5   : 'https://cdnjs.cloudflare.com/ajax/libs/spark-md5/3.0.0/spark-md5.min.js',
		jssha      : 'https://cdnjs.cloudflare.com/ajax/libs/jsSHA/3.2.0/sha.min.js',
		amr        : 'https://cdn.jsdelivr.net/gh/yxl/opencore-amr-js@dcf3d2b5f384a1d9ded2a54e4c137a81747b222b/js/amrnb.js',
		tiff       : 'https://cdn.jsdelivr.net/gh/seikichi/tiff.js@545ede3ee46b5a5bc5f06d65954e775aa2a64017/tiff.min.js'
	},
	
	/**
	 * Connector url. Required!
	 *
	 * @type String
	 */
	url : '',

	/**
	 * Ajax request type.
	 *
	 * @type String
	 * @default "get"
	 */
	requestType : 'get',
	
	/**
	 * Use CORS to connector url
	 * 
	 * @type Boolean|null  true|false|null(Auto detect)
	 */
	cors : null,

	/**
	 * Array of header names to return parrot out in HTTP headers received from the server
	 * 
	 * @type Array
	 */
	parrotHeaders : [],

	/**
	 * Maximum number of concurrent connections on request
	 * 
	 * @type Number
	 * @default 3
	 */
	requestMaxConn : 3,

	/**
	 * Transport to send request to backend.
	 * Required for future extensions using websockets/webdav etc.
	 * Must be an object with "send" method.
	 * transport.send must return $.Deferred() object
	 *
	 * @type Object
	 * @default null
	 * @example
	 *  transport : {
	 *    init : function(elfinderInstance) { },
	 *    send : function(options) {
	 *      var dfrd = $.Deferred();
	 *      // connect to backend ...
	 *      return dfrd;
	 *    },
	 *    upload : function(data) {
	 *      var dfrd = $.Deferred();
	 *      // upload ...
	 *      return dfrd;
	 *    }
	 *    
	 *  }
	 **/
	transport : {},

	/**
	 * URL to upload file to.
	 * If not set - connector URL will be used
	 *
	 * @type String
	 * @default  ''
	 */
	urlUpload : '',

	/**
	 * Allow to drag and drop to upload files
	 *
	 * @type Boolean|String
	 * @default  'auto'
	 */
	dragUploadAllow : 'auto',
	
	/**
	 * Confirmation dialog displayed at the time of overwriting upload
	 * 
	 * @type Boolean
	 * @default true
	 */
	overwriteUploadConfirm : true,
	
	/**
	 * Max size of chunked data of file upload
	 * 
	 * @type Number
	 * @default  10485760(10MB)
	 */
	uploadMaxChunkSize : 10485760,
	
	/**
	 * Regular expression of file name to exclude when uploading folder
	 * 
	 * @type Object
	 * @default { win: /^(?:desktop\.ini|thumbs\.db)$/i, mac: /^\.ds_store$/i }
	 */
	folderUploadExclude : {
		win: /^(?:desktop\.ini|thumbs\.db)$/i,
		mac: /^\.ds_store$/i
	},
	
	/**
	 * Timeout for upload using iframe
	 *
	 * @type Number
	 * @default  0 - no timeout
	 */
	iframeTimeout : 0,
	
	/**
	 * Data to append to all requests and to upload files
	 *
	 * @type Object
	 * @default  {}
	 */
	customData : {},
	
	/**
	 * Event listeners to bind on elFinder init
	 *
	 * @type Object
	 * @default  {}
	 */
	handlers : {},

	/**
	 * Any custom headers to send across every ajax request
	 *
	 * @type Object
	 * @default {}
	 */
	customHeaders : {},

	/**
	 * Any custom xhrFields to send across every ajax request
	 *
	 * @type Object
	 * @default {}
	 */
	xhrFields : {},

	/**
	 * Interface language
	 *
	 * @type String
	 * @default "en"
	 */
	lang : 'en',

	/**
	 * Base URL of elfFinder library starting from Manager HTML
	 * Auto detect when empty value
	 * 
	 * @type String
	 * @default ""
	 */
	baseUrl : '',

	/**
	 * Base URL of i18n js files
	 * baseUrl + "js/i18n/" when empty value
	 * 
	 * @type String
	 * @default ""
	 */
	i18nBaseUrl : '',

	/**
	 * Base URL of worker js files
	 * baseUrl + "js/worker/" when empty value
	 * 
	 * @type String
	 * @default ""
	 */
	 workerBaseUrl : '',
	
	/**
	 * Auto load required CSS
	 * `false` to disable this function or
	 * CSS URL Array to load additional CSS files
	 * 
	 * @type Boolean|Array
	 * @default true
	 */
	cssAutoLoad : true,

	/**
	 * Theme to load
	 * {"themeid" : "Theme CSS URL"} or
	 * {"themeid" : "Theme manifesto.json URL"} or
	 * Theme manifesto.json Object
	 * {
	 *   "themeid" : {
	 *     "name":"Theme Name",
	 *     "cssurls":"Theme CSS URL",
	 *     "author":"Author Name",
	 *     "email":"Author Email",
	 *     "license":"License",
	 *     "link":"Web Site URL",
	 *     "image":"Screen Shot URL",
	 *     "description":"Description"
	 *   }
	 * }
	 * 
	 * @type Object
	 */
	themes : {},

	/**
	 * Theme id to initial theme
	 * 
	 * @type String|Null
	 */
	theme : null,

	/**
	 * Maximum value of error dialog open at the same time
	 * 
	 * @type Number
	 */
	maxErrorDialogs : 5,

	/**
	 * Additional css class for filemanager node.
	 *
	 * @type String
	 */
	cssClass : '',

	/**
	 * Active commands list. '*' means all of the commands that have been load.
	 * If some required commands will be missed here, elFinder will add its
	 *
	 * @type Array
	 */
	commands : ['*'],
	// Available commands list
	//commands : [
	//	'archive', 'back', 'chmod', 'colwidth', 'copy', 'cut', 'download', 'duplicate', 'edit', 'extract',
	//	'forward', 'fullscreen', 'getfile', 'help', 'home', 'info', 'mkdir', 'mkfile', 'netmount', 'netunmount',
	//	'open', 'opendir', 'paste', 'places', 'quicklook', 'reload', 'rename', 'resize', 'restore', 'rm',
	//	'search', 'sort', 'up', 'upload', 'view', 'zipdl'
	//],
	
	/**
	 * Commands options.
	 *
	 * @type Object
	 **/
	commandsOptions : {
		// // configure shortcuts of any command
		// // add `shortcuts` property into each command
		// any_command_name : {
		// 	shortcuts : [] // for disable this command's shortcuts
		// },
		// any_command_name : {
		// 	shortcuts : function(fm, shortcuts) {
		// 		// for add `CTRL + E` for this command action
		// 		shortcuts[0]['pattern'] += ' ctrl+e';
		// 		return shortcuts;
		// 	}
		// },
		// any_command_name : {
		// 	shortcuts : function(fm, shortcuts) {
		// 		// for full customize of this command's shortcuts
		// 		return [ { pattern: 'ctrl+e ctrl+down numpad_enter' + (fm.OS != 'mac' && ' enter') } ];
		// 	}
		// },
		// "getfile" command options.
		getfile : {
			onlyURL  : false,
			// allow to return multiple files info
			multiple : false,
			// allow to return filers info
			folders  : false,
			// action after callback (""/"close"/"destroy")
			oncomplete : '',
			// action when callback is fail (""/"close"/"destroy")
			onerror : '',
			// get path before callback call
			getPath    : true, 
			// get image sizes before callback call
			getImgSize : false
		},
		open : {
			// HTTP method that request to the connector when item URL is not valid URL.
			// If you set to "get" will be displayed request parameter in the browser's location field
			// so if you want to conceal its parameters should be given "post".
			// Nevertheless, please specify "get" if you want to enable the partial request by HTTP Range header.
			method : 'post',
			// Where to open into : 'window'(default), 'tab' or 'tabs'
			// 'tabs' opens in each tabs
			into   : 'window',
			// Default command list of action when select file
			// String value that is 'Command Name' or 'Command Name1/CommandName2...'
			selectAction : 'open'
		},
		opennew : {
			// URL of to open elFinder manager
			// Default '' : Origin URL
			url : '',
			// Use search query of origin URL
			useOriginQuery : true
		},
		// "upload" command options.
		upload : {
			// Open elFinder upload dialog: 'button' OR Open system OS upload dialog: 'uploadbutton'
			ui : 'button'
		},
		// "download" command options.
		download : {
			// max request to download files when zipdl disabled
			maxRequests : 10,
			// minimum count of files to use zipdl
			minFilesZipdl : 2
		},
		// "quicklook" command options.
		quicklook : {
			autoplay : true,
			width    : 450,
			height   : 300,
			// ControlsList of HTML5 audio/video preview
			// see https://googlechrome.github.io/samples/media/controlslist.html
			mediaControlsList : '', // e.g. 'nodownload nofullscreen noremoteplayback'
			// Show toolbar of PDF preview (with <embed> tag)
			pdfToolbar : true,
			// Maximum lines to preview at initial
			textInitialLines : 100,
			// Maximum lines to preview by prettify
			prettifyMaxLines : 300,
			// quicklook window must be contained in elFinder node on window open (true|false)
			contain : false,
			// preview window into NavDock (0 : undocked | 1 : docked(show) | 2 : docked(hide))
			docked   : 0,
			// Docked preview height ('auto' or Number of pixel) 'auto' is setted to the Navbar width
			dockHeight : 'auto',
			// media auto play when docked
			dockAutoplay : false,
			// Google Maps API key (Require Maps JavaScript API)
			googleMapsApiKey : '',
			// Google Maps API Options
			googleMapsOpts : {
				maps : {},
				kml : {
					suppressInfoWindows : false,
					preserveViewport : false
				}
			},
			// ViewerJS (https://viewerjs.org/) Options
			// To enable this you need to place ViewerJS on the same server as elFinder and specify that URL in `url`.
			viewerjs : {
				url: '', // Example '/ViewerJS/index.html'
				mimes: ['application/pdf', 'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.presentation'],
				pdfNative: true // Use Native PDF Viewer first
			},
			// MIME types to CAD-Files and 3D-Models online viewer on sharecad.org
			// Example ['image/vnd.dwg', 'image/vnd.dxf', 'model/vnd.dwf', 'application/vnd.hp-hpgl', 'application/plt', 'application/step', 'model/iges', 'application/vnd.ms-pki.stl', 'application/sat', 'image/cgm', 'application/x-msmetafile']
			sharecadMimes : [],
			// MIME types to use Google Docs online viewer
			// Example ['application/pdf', 'image/tiff', 'application/vnd.ms-office', 'application/msword', 'application/vnd.ms-word', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/postscript', 'application/rtf']
			googleDocsMimes : [],
			// MIME types to use Microsoft Office Online viewer
			// Example ['application/msword', 'application/vnd.ms-word', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.presentation']
			// These MIME types override "googleDocsMimes"
			officeOnlineMimes : [],
			// File size threshold when using the dim command for obtain the image size necessary to image preview
			getDimThreshold : '200K',
			// Max filesize to show filenames of the zip/tar/gzip/bzip file 
			unzipMaxSize : '50M',
			// MIME-Type regular expression that does not check empty files
			mimeRegexNotEmptyCheck : /^application\/vnd\.google-apps\./
		},
		// "edit" command options.
		edit : {
			// dialog width, integer(px) or integer+'%' (example: 650, '80%' ...)
			dialogWidth : void(0),
			// dialog height, integer(px) or integer+'%' (example: 650, '80%' ...)
			dialogHeight : void(0),
			// list of allowed mimetypes to edit of text files
			// if empty - any text files can be edited
			mimes : [],
			// MIME-types to unselected as default of "File types to enable with "New file"" in preferences
			mkfileHideMimes : [],
			// MIME-types of text file to make empty file
			makeTextMimes : ['text/plain', 'text/css', 'text/html'],
			// Use the editor stored in the browser
			// This value allowd overwrite with user preferences
			useStoredEditor : false,
			// Open the maximized editor window
			// This value allowd overwrite with user preferences
			editorMaximized : false,
			// edit files in wysisyg's
			editors : [
				// {
				// 	/**
				// 	 * editor info
				// 	 * @type  Object
				// 	 */
				// 	info : { name: 'Editor Name' },
				// 	/**
				// 	 * files mimetypes allowed to edit in current wysisyg
				// 	 * @type  Array
				// 	 */
				// 	mimes : ['text/html'], 
				// 	/**
				// 	 * HTML element for editing area (optional for text editor)
				// 	 * @type  String
				// 	 */
				// 	html : '<textarea></textarea>', 
				// 	/**
				// 	 * Initialize editing area node (optional for text editor)
				// 	 * 
				// 	 * @param  String  dialog DOM id
				// 	 * @param  Object  target file object
				// 	 * @param  String  target file content (text or Data URI Scheme(binary file))
				// 	 * @param  Object  elFinder instance
				// 	 * @type  Function
				// 	 */
				// 	init : function(id, file, content, fm) {
				// 		$(this).attr('id', id + '-text').val(content);
				// 	},
				// 	/**
				// 	 * Get edited contents (optional for text editor)
				// 	 * @type  Function
				// 	 */
				// 	getContent : function() {
				// 		return $(this).val();
				// 	},
				// 	/**
				// 	 * Called when "edit" dialog loaded.
				// 	 * Place to init wysisyg.
				// 	 * Can return wysisyg instance
				// 	 *
				// 	 * @param  DOMElement  textarea node
				// 	 * @return Object      editor instance|jQuery.Deferred(return instance on resolve())
				// 	 */
				// 	load : function(textarea) { },
				// 	/**
				// 	 * Called before "edit" dialog closed.
				// 	 * Place to destroy wysisyg instance.
				// 	 *
				// 	 * @param  DOMElement  textarea node
				// 	 * @param  Object      wysisyg instance (if was returned by "load" callback)
				// 	 * @return void
				// 	 */
				// 	close : function(textarea, instance) { },
				// 	/**
				// 	 * Called before file content send to backend.
				// 	 * Place to update textarea content if needed.
				// 	 *
				// 	 * @param  DOMElement  textarea node
				// 	 * @param  Object      wysisyg instance (if was returned by "load" callback)
				// 	 * @return void
				// 	 */
				// 	save : function(textarea, instance) {},
				// 	/**
				// 	 * Called after load() or save().
				// 	 * Set focus to wysisyg editor.
				// 	 *
				// 	 * @param  DOMElement  textarea node
				// 	 * @param  Object      wysisyg instance (if was returned by "load" callback)
				// 	 * @return void
				// 	 */
				// 	focus : function(textarea, instance) {}
				// 	/**
				// 	 * Called after dialog resized..
				// 	 *
				// 	 * @param  DOMElement  textarea node
				// 	 * @param  Object      wysisyg instance (if was returned by "load" callback)
				// 	 * @param  Object      resize event object
				// 	 * @param  Object      data object
				// 	 * @return void
				// 	 */
				// 	resize : function(textarea, instance, event, data) {}
				// 
				// }
			],
			// Character encodings of select box
			encodings : ['Big5', 'Big5-HKSCS', 'Cp437', 'Cp737', 'Cp775', 'Cp850', 'Cp852', 'Cp855', 'Cp857', 'Cp858', 
				'Cp862', 'Cp866', 'Cp874', 'EUC-CN', 'EUC-JP', 'EUC-KR', 'GB18030', 'ISO-2022-CN', 'ISO-2022-JP', 'ISO-2022-KR', 
				'ISO-8859-1', 'ISO-8859-2', 'ISO-8859-3', 'ISO-8859-4', 'ISO-8859-5', 'ISO-8859-6', 'ISO-8859-7', 
				'ISO-8859-8', 'ISO-8859-9', 'ISO-8859-13', 'ISO-8859-15', 'KOI8-R', 'KOI8-U', 'Shift-JIS', 
				'Windows-1250', 'Windows-1251', 'Windows-1252', 'Windows-1253', 'Windows-1254', 'Windows-1257'],
			// options for extra editors
			extraOptions : {
				// upload command options
				uploadOpts : {},
				// TUI Image Editor's options
				tuiImgEditOpts : {
					// Path prefix of icon-a.svg, icon-b.svg, icon-c.svg and icon-d.svg in the Theme. 
					// `iconsPath` MUST follow the same origin policy.
					iconsPath : void(0), // default is "./img/tui-"
					// Theme object
					theme : {}
				},
				// Pixo image editor constructor options - https://pixoeditor.com/
				// Require 'apikey' to enable it
				pixo: {
					apikey: ''
				},
				// Browsing manager URL for CKEditor, TinyMCE
				// Uses self location with the empty value or not defined.
				//managerUrl : 'elfinder.html'
				managerUrl : null,
				// CKEditor editor options
				ckeditor: {},
				// CKEditor 5 editor options
				ckeditor5: {
					// builds mode - 'classic', 'inline', 'balloon', 'balloon-block' or 'decoupled-document'
					mode: 'decoupled-document'
				},
				// TinyMCE editor options
				tinymce : {},
				// Setting for Online-Convert.com
				onlineConvert : {
					maxSize  : 100, // (MB) Max 100MB on free account
					showLink : true // It must be enabled with free account
				}
			}
		},
		fullscreen : {
			// fullscreen mode 'screen'(When the browser supports it) or 'window'
			mode: 'screen' // 'screen' or 'window'
		},
		search : {
			// Incremental search from the current view
			incsearch : {
				enable : true, // is enable true or false
				minlen : 1,    // minimum number of characters
				wait   : 500   // wait milliseconds
			},
			// Additional search types
			searchTypes : {
				// "SearchMime" is implemented in default
				SearchMime : {           // The key is search type that send to the connector
					name : 'btnMime',    // Button text to be processed in i18n()
					title : 'searchMime',// Button title to be processed in i18n()
					incsearch : 'mime'   // Incremental search target filed name of the file object
					// Or Callable function
					/* incsearch function example
					function(queryObject, cwdHashes, elFinderInstance) {
						var q = queryObject.val;
						var regex = queryObject.regex;
						var matchedHashes = $.grep(cwdHashes, function(hash) {
							var file = elFinderInstance.file(hash);
							return (file && file.mime && file.mime.match(regex))? true : false;
						});
						return matchedHashes;
					}
					*/
				}
			}
		},
		// "info" command options.
		info : {
			// If the URL of the Directory is null,
			// it is assumed that the link destination is a URL to open the folder in elFinder
			nullUrlDirLinkSelf : true,
			// Information items to be hidden by default
			// These name are 'size', 'aliasfor', 'path', 'link', 'dim', 'modify', 'perms', 'locked', 'owner', 'group', 'perm' and your custom info items label
			hideItems : [],
			// Maximum file size (byte) to get file contents hash (md5, sha256 ...)
			showHashMaxsize : 104857600, // 100 MB
			// Array of hash algorisms to show on info dialog
			// These name are 'md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'sha3-224', 'sha3-256', 'sha3-384', 'sha3-512', 'shake128' and 'shake256'
			showHashAlgorisms : ['md5', 'sha256'],
			// Options for fm.getContentsHashes()
			showHashOpts : {
				shake128len : 256,
				shake256len : 512
			},
			custom : {
				// /**
				//  * Example of custom info `desc`
				//  */
				// desc : {
				// 	/**
				// 	 * Lable (require)
				// 	 * It is filtered by the `fm.i18n()`
				// 	 * 
				// 	 * @type String
				// 	 */
				// 	label : 'Description',
				// 	
				// 	/**
				// 	 * Template (require)
				// 	 * `{id}` is replaced in dialog.id
				// 	 * 
				// 	 * @type String
				// 	 */
				// 	tpl : '<div class="elfinder-info-desc"><span class="elfinder-spinner"></span></div>',
				// 	
				// 	/**
				// 	 * Restricts to mimetypes (optional)
				// 	 * Exact match or category match
				// 	 * 
				// 	 * @type Array
				// 	 */
				// 	mimes : ['text', 'image/jpeg', 'directory'],
				// 	
				// 	/**
				// 	 * Restricts to file.hash (optional)
				// 	 * 
				// 	 * @ type Regex
				// 	 */
				// 	hashRegex : /^l\d+_/,
				// 
				// 	/**
				// 	 * Request that asks for the description and sets the field (optional)
				// 	 * 
				// 	 * @type Function
				// 	 */
				// 	action : function(file, fm, dialog) {
				// 		fm.request({
				// 		data : { cmd : 'desc', target: file.hash },
				// 			preventDefault: true,
				// 		})
				// 		.fail(function() {
				// 			dialog.find('div.elfinder-info-desc').html(fm.i18n('unknown'));
				// 		})
				// 		.done(function(data) {
				// 			dialog.find('div.elfinder-info-desc').html(data.desc);
				// 		});
				// 	}
				// }
			}
		},
		mkdir: {
			// Enable automatic switching function ["New Folder" / "Into New Folder"] of toolbar buttton
			intoNewFolderToolbtn: false
		},
		resize: {
			// defalt status of snap to 8px grid of the jpeg image ("enable" or "disable")
			grid8px : 'disable',
			// Preset size array [width, height]
			presetSize : [[320, 240], [400, 400], [640, 480], [800,600]],
			// File size (bytes) threshold when using the `dim` command for obtain the image size necessary to start editing
			getDimThreshold : 204800,
			// File size (bytes) to request to get substitute image (400px) with the `dim` command
			dimSubImgSize : 307200
		},
		rm: {
			// If trash is valid, items moves immediately to the trash holder without confirm.
			quickTrash : true,
			// Maximum wait seconds when checking the number of items to into the trash
			infoCheckWait : 10,
			// Maximum number of items that can be placed into the Trash at one time
			toTrashMaxItems : 1000
		},
		paste : {
			moveConfirm : false // Display confirmation dialog when moving items
		},
		help : {
			// Tabs to show
			view : ['about', 'shortcuts', 'help', 'integrations', 'debug'],
			// HTML source URL of the heip tab
			helpSource : ''
		},
		preference : {
			// dialog width
			width: 600,
			// dialog height
			height: 400,
			// tabs setting see preference.js : build()
			categories: null,
			// preference setting see preference.js : build()
			prefs: null,
			// language setting  see preference.js : build()
			langs: null,
			// Command list of action when select file
			// Array value are 'Command Name' or 'Command Name1/CommandName2...'
			selectActions : ['open', 'edit/download', 'resize/edit/download', 'download', 'quicklook']
		}
	},
	
	/**
	 * Disabled commands relationship
	 * 
	 * @type Object
	 */
	disabledCmdsRels : {
		'get'       : ['edit'],
		'rm'        : ['cut', 'empty'],
		'file&url=' : ['download', 'zipdl'] // file command and volume options url is empty
	},

	/**
	 * Callback for prepare boot up
	 * 
	 * - The this object in the function is an elFinder node
	 * - The first parameter is elFinder Instance
	 * - The second parameter is an object of other parameters
	 *   For now it can use `dfrdsBeforeBootup` Array
	 * 
	 * @type Function
	 * @default null
	 * @return void
	 */
	bootCallback : null,
	
	/**
	 * Callback for "getfile" commands.
	 * Required to use elFinder with WYSIWYG editors etc..
	 *
	 * @type Function
	 * @default null (command not active)
	 */
	getFileCallback : null,
	
	/**
	 * Default directory view. icons/list
	 *
	 * @type String
	 * @default "icons"
	 */
	defaultView : 'icons',
	
	/**
	 * Hash of default directory path to open
	 * 
	 * NOTE: This setting will be disabled if the target folder is specified in location.hash.
	 * 
	 * If you want to find the hash in Javascript
	 * can be obtained with the following code. (In the case of a standard hashing method)
	 * 
	 * var volumeId = 'l1_'; // volume id
	 * var path = 'path/to/target'; // without root path
	 * //var path = 'path\\to\\target'; // use \ on windows server
	 * var hash = volumeId + btoa(path).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '.').replace(/\.+$/, '');
	 * 
	 * @type String
	 * @default ""
	 */
	startPathHash : '',

	/**
	 * Emit a sound when a file is deleted
	 * Sounds are in sounds/ folder
	 * 
	 * @type Boolean
	 * @default true
	 */
	sound : true,
	
	/**
	 * UI plugins to load.
	 * Current dir ui and dialogs loads always.
	 * Here set not required plugins as folders tree/toolbar/statusbar etc.
	 *
	 * @type Array
	 * @default ['toolbar', 'places', 'tree', 'path', 'stat']
	 * @full ['toolbar', 'places', 'tree', 'path', 'stat']
	 */
	ui : ['toolbar', 'places', 'tree', 'path', 'stat'],
	
	/**
	 * Some UI plugins options.
	 * @type Object
	 */
	uiOptions : {
		// toolbar configuration
		toolbar : [
			['home', 'back', 'forward', 'up', 'reload'],
			['netmount'],
			['mkdir', 'mkfile', 'upload'],
			['open', 'download', 'getfile'],
			['undo', 'redo'],
			['copy', 'cut', 'paste', 'rm', 'empty', 'hide'],
			['duplicate', 'rename', 'edit', 'resize', 'chmod'],
			['selectall', 'selectnone', 'selectinvert'],
			['quicklook', 'info'],
			['extract', 'archive'],
			['search'],
			['view', 'sort'],
			['preference', 'help'],
			['fullscreen']
		],
		// toolbar extra options
		toolbarExtra : {
			// also displays the text label on the button (true / false / 'none')
			displayTextLabel: false,
			// Exclude `displayTextLabel` setting UA type
			labelExcludeUA: ['Mobile'],
			// auto hide on initial open
			autoHideUA: ['Mobile'],
			// Initial setting value of hide button in toolbar setting
			defaultHides: ['home', 'reload'],
			// show Preference button ('none', 'auto', 'always')
			// If you do not include 'preference' in the context menu you should specify 'auto' or 'always'
			showPreferenceButton: 'none',
			// show Preference button into contextmenu of the toolbar (true / false)
			preferenceInContextmenu: true
		},
		// directories tree options
		tree : {
			// set path info to attr title
			attrTitle : true,
			// expand current root on init
			openRootOnLoad : true,
			// expand current work directory on open
			openCwdOnOpen  : true,
			// auto loading current directory parents and do expand their node.
			syncTree : true,
			// Maximum number of display of each child trees
			// The tree of directories with children exceeding this number will be split
			subTreeMax : 100,
			// Numbar of max connctions of subdirs request
			subdirsMaxConn : 2,
			// Number of max simultaneous processing directory of subdirs
			subdirsAtOnce : 5,
			// Durations of each animations
			durations : {
				slideUpDown : 'fast',
				autoScroll : 'fast'
			}
			// ,
			// /**
			//  * Add CSS class name to navbar directories (optional)
			//  * see: https://github.com/Studio-42/elFinder/pull/1061,
			//  *      https://github.com/Studio-42/elFinder/issues/1231
			//  * 
			//  * @type Function
			//  */
			// getClass: function(dir) {
			// 	// e.g. This adds the directory's name (lowercase) with prefix as a CSS class
			// 	return 'elfinder-tree-' + dir.name.replace(/[ "]/g, '').toLowerCase();
			// }
		},
		// navbar options
		navbar : {
			minWidth : 150,
			maxWidth : 500,
			// auto hide on initial open
			autoHideUA: [] // e.g. ['Mobile']
		},
		navdock : {
			// disabled navdock ui
			disabled : false,
			// percentage of initial maximum height to work zone
			initMaxHeight : '50%',
			// percentage of maximum height to work zone by user resize action
			maxHeight : '90%'
		},
		cwd : {
			// display parent folder with ".." name :)
			oldSchool : false,
			
			// fm.UA types array to show item select checkboxes e.g. ['All'] or ['Mobile'] etc. default: ['Touch']
			showSelectCheckboxUA : ['Touch'],

			// Enable dragout by dragstart with Alt key or Shift key
			metakeyDragout : true,
			
			// file info columns displayed
			listView : {
				// name is always displayed, cols are ordered
				// e.g. ['perm', 'date', 'size', 'kind', 'owner', 'group', 'mode']
				// mode: 'mode'(by `fileModeStyle` setting), 'modestr'(rwxr-xr-x) , 'modeoct'(755), 'modeboth'(rwxr-xr-x (755))
				// 'owner', 'group' and 'mode', It's necessary set volume driver option "statOwner" to `true`
				// for custom, characters that can be used in the name is `a-z0-9_`
				columns : ['perm', 'date', 'size', 'kind'],
				// override this if you want custom columns name
				// example
				// columnsCustomName : {
				//		date : 'Last modification',
				// 		kind : 'Mime type'
				// }
				columnsCustomName : {},
				// fixed list header colmun
				fixedHeader : true
			},

			// icons view setting
			iconsView : {
				// default icon size (0-3 in default CSS (cwd.css - elfinder-cwd-size[number]))
				size: 0,
				// number of maximum size (3 in default CSS (cwd.css - elfinder-cwd-size[number]))
				// uses in preference.js
				sizeMax: 3,
				// Name of each size
				sizeNames: {
					0: 'viewSmall',
					1: 'viewMedium',
					2: 'viewLarge',
					3: 'viewExtraLarge' 
				}
			},

			// /**
			//  * Add CSS class name to cwd directories (optional)
			//  * see: https://github.com/Studio-42/elFinder/pull/1061,
			//  *      https://github.com/Studio-42/elFinder/issues/1231
			//  * 
			//  * @type Function
			//  */
			// ,
			// getClass: function(file) {
			// 	// e.g. This adds the directory's name (lowercase) with prefix as a CSS class
			// 	return 'elfinder-cwd-' + file.name.replace(/[ "]/g, '').toLowerCase();
			//}
			
			//,
			//// Template placeholders replacement rules for overwrite. see ui/cwd.js replacement
			//replacement : {
			//	tooltip : function(f, fm) {
			//		var list = fm.viewType == 'list', // current view type
			//			query = fm.searchStatus.state == 2, // is in search results
			//			title = fm.formatDate(f) + (f.size > 0 ? ' ('+fm.formatSize(f.size)+')' : ''),
			//			info  = '';
			//		if (query && f.path) {
			//			info = fm.escape(f.path.replace(/\/[^\/]*$/, ''));
			//		} else {
			//			info = f.tooltip? fm.escape(f.tooltip).replace(/\r/g, '&#13;') : '';
			//		}
			//		if (list) {
			//			info += (info? '&#13;' : '') + fm.escape(f.name);
			//		}
			//		return info? info + '&#13;' + title : title;
			//	}
			//}
		},
		path : {
			// Move to head of work zone without UI navbar
			toWorkzoneWithoutNavbar : true
		},
		dialog : {
			// Enable to auto focusing on mouse over in the target form element
			focusOnMouseOver : true
		},
		toast : {
			animate : {
				// to show
				showMethod: 'fadeIn', // fadeIn, slideDown, and show are built into jQuery
				showDuration: 300,    // milliseconds
				showEasing: 'swing',  // swing and linear are built into jQuery
				// timeout to hide
				timeOut: 3000,
				// to hide
				hideMethod: 'fadeOut',
				hideDuration: 1500,
				hideEasing: 'swing'
			}
		}
	},

	/**
	 * MIME regex of send HTTP header "Content-Disposition: inline" or allow preview in quicklook
	 * This option will overwrite by connector configuration
	 * 
	 * @type String
	 * @default '^(?:(?:image|video|audio)|text/plain|application/pdf$)'
	 * @example
	 *  dispInlineRegex : '.',  // is allow inline of all of MIME types
	 *  dispInlineRegex : '$^', // is not allow inline of all of MIME types
	 */
	dispInlineRegex : '^(?:(?:image|video|audio)|application/(?:x-mpegURL|dash\+xml)|(?:text/plain|application/pdf)$)',

	/**
	 * Display only required files by types
	 *
	 * @type Array
	 * @default []
	 * @example
	 *  onlyMimes : ["image"] - display all images
	 *  onlyMimes : ["image/png", "application/x-shockwave-flash"] - display png and flash
	 */
	onlyMimes : [],

	/**
	 * Custom files sort rules.
	 * All default rules (name/size/kind/date/perm/mode/owner/group) set in elFinder._sortRules
	 *
	 * @type {Object}
	 * @example
	 * sortRules : {
	 *   name : function(file1, file2) { return file1.name.toLowerCase().localeCompare(file2.name.toLowerCase()); }
	 * }
	 */
	sortRules : {},

	/**
	 * Default sort type.
	 *
	 * @type {String}
	 */
	sortType : 'name',
	
	/**
	 * Default sort order.
	 *
	 * @type {String}
	 * @default "asc"
	 */
	sortOrder : 'asc',
	
	/**
	 * Display folders first?
	 *
	 * @type {Boolean}
	 * @default true
	 */
	sortStickFolders : true,
	
	/**
	 * Sort also applies to the treeview (null: disable this feature)
	 *
	 * @type Boolean|null
	 * @default false
	 */
	sortAlsoTreeview : false,
	
	/**
	 * If true - elFinder will formating dates itself, 
	 * otherwise - backend date will be used.
	 *
	 * @type Boolean
	 */
	clientFormatDate : true,
	
	/**
	 * Show UTC dates.
	 * Required set clientFormatDate to true
	 *
	 * @type Boolean
	 */
	UTCDate : false,
	
	/**
	 * File modification datetime format.
	 * Value from selected language data  is used by default.
	 * Set format here to overwrite it.
	 *
	 * @type String
	 * @default  ""
	 */
	dateFormat : '',
	
	/**
	 * File modification datetime format in form "Yesterday 12:23:01".
	 * Value from selected language data is used by default.
	 * Set format here to overwrite it.
	 * Use $1 for "Today"/"Yesterday" placeholder
	 *
	 * @type String
	 * @default  ""
	 * @example "$1 H:m:i"
	 */
	fancyDateFormat : '',
	
	/**
	 * Style of file mode at cwd-list, info dialog
	 * 'string' (ex. rwxr-xr-x) or 'octal' (ex. 755) or 'both' (ex. rwxr-xr-x (755))
	 * 
	 * @type {String}
	 * @default 'both'
	 */
	fileModeStyle : 'both',
	
	/**
	 * elFinder width
	 *
	 * @type String|Number
	 * @default  "auto"
	 */
	width : 'auto',
	
	/**
	 * elFinder node height
	 * Number: pixcel or String: Number + "%"
	 *
	 * @type Number | String
	 * @default  400
	 */
	height : 400,
	
	/**
	 * Do not resize the elFinder node itself on resize parent node
	 * Specify `true` when controlling with CSS such as Flexbox
	 *
	 * @type Boolean
	 * @default false
	 */
	noResizeBySelf : false,

	/**
	 * Base node object or selector
	 * Element which is the reference of the height percentage
	 *
	 * @type Object|String
	 * @default null | $(window) (if height is percentage)
	 **/
	heightBase : null,
	
	/**
	 * Make elFinder resizable if jquery ui resizable available
	 *
	 * @type Boolean
	 * @default  true
	 */
	resizable : true,
	
	/**
	 * Timeout before open notifications dialogs
	 *
	 * @type Number
	 * @default  500 (.5 sec)
	 */
	notifyDelay : 500,
	
	/**
	 * Position CSS, Width of notifications dialogs
	 *
	 * @type Object
	 * @default {position: {}, width : null} - Apply CSS definition
	 * position: CSS object | null (null: position center & middle)
	 */
	notifyDialog : {position : {}, width : null, canClose : false, hiddens : ['open']},
	
	/**
	 * Dialog contained in the elFinder node
	 * 
	 * @type Boolean
	 * @default false
	 */
	dialogContained : false,
	
	/**
	 * Allow shortcuts
	 *
	 * @type Boolean
	 * @default  true
	 */
	allowShortcuts : true,
	
	/**
	 * Remeber last opened dir to open it after reload or in next session
	 *
	 * @type Boolean
	 * @default  true
	 */
	rememberLastDir : true,
	
	/**
	 * Clear historys(elFinder) on reload(not browser) function
	 * Historys was cleared on Reload function on elFinder 2.0 (value is true)
	 * 
	 * @type Boolean
	 * @default  false
	 */
	reloadClearHistory : false,
	
	/**
	 * Use browser native history with supported browsers
	 *
	 * @type Boolean
	 * @default  true
	 */
	useBrowserHistory : true,
	
	/**
	 * Lazy load config.
	 * How many files display at once?
	 *
	 * @type Number
	 * @default  50
	 */
	showFiles : 50,
	
	/**
	 * Lazy load config.
	 * Distance in px to cwd bottom edge to start display files
	 *
	 * @type Number
	 * @default  50
	 */
	showThreshold : 50,
	
	/**
	 * Additional rule to valid new file name.
	 * By default not allowed empty names or '..'
	 * This setting does not have a sense of security.
	 *
	 * @type false|RegExp|function
	 * @default  false
	 * @example
	 *  disable names with spaces:
	 *  validName : /^[^\s]+$/,
	 */
	validName : false,
	
	/**
	 * Additional rule to filtering for browsing.
	 * This setting does not have a sense of security.
	 * 
	 * The object `this` is elFinder instance object in this function
	 *
	 * @type false|RegExp|function
	 * @default  false
	 * @example
	 *  show only png and jpg files:
	 *  fileFilter : /.*\.(png|jpg)$/i,
	 *  
	 *  show only image type files:
	 *  fileFilter : function(file) { return file.mime && file.mime.match(/^image\//i); },
	 */
	fileFilter : false,
	
	/**
	 * Backup name suffix.
	 *
	 * @type String
	 * @default  "~"
	 */
	backupSuffix : '~',
	
	/**
	 * Sync content interval
	 *
	 * @type Number
	 * @default  0 (do not sync)
	 */
	sync : 0,
	
	/**
	 * Sync start on load if sync value >= 1000
	 *
	 * @type     Bool
	 * @default  true
	 */
	syncStart : true,
	
	/**
	 * How many thumbnails create in one request
	 *
	 * @type Number
	 * @default  5
	 */
	loadTmbs : 5,
	
	/**
	 * Cookie option for browsersdoes not suppot localStorage
	 *
	 * @type Object
	 */
	cookie         : {
		expires  : 30,
		domain   : '',
		path     : '/',
		secure   : false,
		samesite : 'lax'
	},
	
	/**
	 * Contextmenu config
	 *
	 * @type Object
	 */
	contextmenu : {
		// navbarfolder menu
		navbar : ['open', 'opennew', 'download', '|', 'upload', 'mkdir', '|', 'copy', 'cut', 'paste', 'duplicate', '|', 'rm', 'empty', 'hide', '|', 'rename', '|', 'archive', '|', 'places', 'info', 'chmod', 'netunmount'],
		// current directory menu
		cwd    : ['undo', 'redo', '|', 'back', 'up', 'reload', '|', 'upload', 'mkdir', 'mkfile', 'paste', '|', 'empty', 'hide', '|', 'view', 'sort', 'selectall', 'colwidth', '|', 'places', 'info', 'chmod', 'netunmount', '|', 'fullscreen', '|', 'preference'],
		// current directory file menu
		files  : ['getfile', '|' ,'open', 'opennew', 'download', 'opendir', 'quicklook', '|', 'upload', 'mkdir', '|', 'copy', 'cut', 'paste', 'duplicate', '|', 'rm', 'empty', 'hide', '|', 'rename', 'edit', 'resize', '|', 'archive', 'extract', '|', 'selectall', 'selectinvert', '|', 'places', 'info', 'chmod', 'netunmount']
	},

	/**
	 * elFinder node enable always
	 * This value will set to `true` if <body> has elFinder node only
	 * 
	 * @type     Bool
	 * @default  false
	 */
	enableAlways : false,
	
	/**
	 * elFinder node enable by mouse over
	 * 
	 * @type     Bool
	 * @default  true
	 */
	enableByMouseOver : true,

	/**
	 * Show window close confirm dialog
	 * Value is which state to show
	 * 'hasNotifyDialog', 'editingFile', 'hasSelectedItem' and 'hasClipboardData'
	 * 
	 * @type     Array
	 * @default  ['hasNotifyDialog', 'editingFile']
	 */
	windowCloseConfirm : ['hasNotifyDialog', 'editingFile'],

	/**
	 * Function decoding 'raw' string converted to unicode
	 * It is used instead of fm.decodeRawString(str)
	 * 
	 * @type Null|Function
	 */
	rawStringDecoder : typeof Encoding === 'object' && $.isFunction(Encoding.convert)? function(str) {
		return Encoding.convert(str, {
			to: 'UNICODE',
			type: 'string'
		});
	} : null,

	/**
	 * Debug config
	 *
	 * @type Array|String('auto')|Boolean(true|false)
	 */
	debug : ['error', 'warning', 'event-destroy'],

	/**
	 * Show toast messeges of backend warning (if found data `debug.backendErrors` in backend results)
	 *
	 * @type Boolean|Object (toast options)
	 */
	toastBackendWarn : true
};
