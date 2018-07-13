<?php
/**
 * Base class for elFinder volume.
 * Provide 2 layers:
 *  1. Public API (commands)
 *  2. abstract fs API
 *
 * All abstract methods begin with "_"
 *
 * @author Dmitry (dio) Levashov
 * @author Troex Nevelin
 * @author Alexey Sukhotin
 **/
abstract class elFinderVolumeDriver {
	
	/**
	 * Net mount key
	 *
	 * @var string
	 **/
	public $netMountKey = '';
	
	/**
	 * Request args
	 * $_POST or $_GET values
	 * 
	 * @var array
	 */
	protected $ARGS = array();
	
	/**
	 * Driver id
	 * Must be started from letter and contains [a-z0-9]
	 * Used as part of volume id
	 *
	 * @var string
	 **/
	protected $driverId = 'a';
	
	/**
	 * Volume id - used as prefix for files hashes
	 *
	 * @var string
	 **/
	protected $id = '';
	
	/**
	 * Flag - volume "mounted" and available
	 *
	 * @var bool
	 **/
	protected $mounted = false;
	
	/**
	 * Root directory path
	 *
	 * @var string
	 **/
	protected $root = '';
	
	/**
	 * Root basename | alias
	 *
	 * @var string
	 **/
	protected $rootName = '';
	
	/**
	 * Default directory to open
	 *
	 * @var string
	 **/
	protected $startPath = '';
	
	/**
	 * Base URL
	 *
	 * @var string
	 **/
	protected $URL = '';
	
	/**
	 * A file save destination path when a temporary content URL is required
	 * on a network volume or the like
	 * If not specified, it tries to use "Connector Path/../files/.tmb".
	 *
	 * @var string
	 */
	protected $tmpLinkPath = '';
	
	/**
	 * A file save destination URL when a temporary content URL is required
	 * on a network volume or the like
	 * If not specified, it tries to use "Connector URL/../files/.tmb".
	 *
	 * @var string
	 */
	protected $tmpLinkUrl = '';
	
	/**
	 * Thumbnails dir path
	 *
	 * @var string
	 **/
	protected $tmbPath = '';
	
	/**
	 * Is thumbnails dir writable
	 *
	 * @var bool
	 **/
	protected $tmbPathWritable = false;
	
	/**
	 * Thumbnails base URL
	 *
	 * @var string
	 **/
	protected $tmbURL = '';
	
	/**
	 * Thumbnails size in px
	 *
	 * @var int
	 **/
	protected $tmbSize = 48;
	
	/**
	 * Image manipulation lib name
	 * auto|imagick|gd|convert
	 *
	 * @var string
	 **/
	protected $imgLib = 'auto';
	
	/**
	 * Video to Image converter
	 * 
	 * @var array
	 */
	protected $imgConverter = array();
	
	/**
	 * Library to crypt files name
	 *
	 * @var string
	 **/
	protected $cryptLib = '';
	
	/**
	 * Archivers config
	 *
	 * @var array
	 **/
	protected $archivers = array(
		'create'  => array(),
		'extract' => array()
	);
	
	/**
	 * Server character encoding
	 *
	 * @var string or null
	 **/
	protected $encoding = null;
	
	/**
	 * How many subdirs levels return for tree
	 *
	 * @var int
	 **/
	protected $treeDeep = 1;
	
	/**
	 * Errors from last failed action
	 *
	 * @var array
	 **/
	protected $error = array();
	
	/**
	 * Today 24:00 timestamp
	 *
	 * @var int
	 **/
	protected $today = 0;
	
	/**
	 * Yesterday 24:00 timestamp
	 *
	 * @var int
	 **/
	protected $yesterday = 0;
	
	/**
	 * Force make dirctory on extract
	 *
	 * @var int
	 **/
	protected $extractToNewdir = 'auto';
	
	/**
	 * Object configuration
	 *
	 * @var array
	 **/
	protected $options = array(
		// Driver ID (Prefix of volume ID), Normally, the value specified for each volume driver is used.
		'driverId'        => '',
		// Id (Suffix of volume ID), Normally, the number incremented according to the specified number of volumes is used.
		'id'              => '',
		// revision id of root directory that uses for caching control of root stat
		'rootRev'         => '',
		// driver type it uses volume root's CSS class name. e.g. 'group' -> Adds 'elfinder-group' to CSS class name.
		'type'            => '',
		// root directory path
		'path'            => '',
		// Folder hash value on elFinder to be the parent of this volume
		'phash'           => '',
		// Folder hash value on elFinder to trash bin of this volume, it require 'copyJoin' to true
		'trashHash'       => '',
		// open this path on initial request instead of root path
		'startPath'       => '',
		// how many subdirs levels return per request
		'treeDeep'        => 1,
		// root url, not set to disable sending URL to client (replacement for old "fileURL" option)
		'URL'             => '',
		// directory link url to own manager url with folder hash (`true`, `false` or default `'auto'`: URL is empty then `true` else `false`)
		'dirUrlOwn'       => 'auto',
		// directory separator. required by client to show paths correctly
		'separator'       => DIRECTORY_SEPARATOR,
		// Use '/' as directory separator when the path hash encode/decode on the Windows server too
		'winHashFix'      => false,
		// Server character encoding (default is '': UTF-8)
		'encoding'        => '',
		// for convert character encoding (default is '': Not change locale)
		'locale'          => '',
		// URL of volume icon image
		'icon'            => '',
		// CSS Class of volume root in tree
		'rootCssClass'    => '',
		// Items to disable session caching
		'noSessionCache'  => array(),
		// enable i18n folder name that convert name to elFinderInstance.messages['folder_'+name]
		'i18nFolderName'  => false,
		// Search timeout (sec)
		'searchTimeout'   => 30,
		// Search exclusion directory regex pattern (require demiliter e.g. '#/path/to/exclude_directory#i')
		'searchExDirReg'  => '',
		// library to crypt/uncrypt files names (not implemented)
		'cryptLib'        => '',
		// how to detect files mimetypes. (auto/internal/finfo/mime_content_type)
		'mimeDetect'      => 'auto',
		// mime.types file path (for mimeDetect==internal)
		'mimefile'        => '',
		// Static extension/MIME of general server side scripts to security issues
		'staticMineMap'   => array(
			'php:*'                        => 'text/x-php',
			'pht:*'                        => 'text/x-php',
			'php3:*'                       => 'text/x-php',
			'php4:*'                       => 'text/x-php',
			'php5:*'                       => 'text/x-php',
			'php7:*'                       => 'text/x-php',
			'phtml:*'                      => 'text/x-php',
			'cgi:*'                        => 'text/x-httpd-cgi',
			'pl:*'                         => 'text/x-perl',
			'asp:*'                        => 'text/x-asap',
			'aspx:*'                       => 'text/x-asap',
			'py:*'                         => 'text/x-python',
			'rb:*'                         => 'text/x-ruby',
			'jsp:*'                        => 'text/x-jsp'
		),
		// mime type normalize map : Array '[ext]:[detected mime type]' => '[normalized mime]'
		'mimeMap'         => array(
			'md:application/x-genesis-rom' => 'text/x-markdown',
			'md:text/plain'                => 'text/x-markdown',
			'markdown:text/plain'          => 'text/x-markdown',
			'css:text/x-asm'               => 'text/css',
			'csv:text/plain'               => 'text/csv',
			'json:text/plain'              => 'application/json',
			'sql:text/plain'               => 'text/x-sql',
			'rtf:text/rtf'                 => 'application/rtf',
			'rtfd:text/rtfd'               => 'application/rtfd',
			'ico:image/vnd.microsoft.icon' => 'image/x-icon',
			'pxd:application/octet-stream' => 'image/x-pixlr-data',
			'amr:application/octet-stream' => 'audio/amr',
			'm4a:video/mp4'                => 'audio/mp4',
			'oga:application/ogg'          => 'audio/ogg',
			'ogv:application/ogg'          => 'video/ogg',
			'zip:application/x-zip'        => 'application/zip',
			'm3u8:text/plain'              => 'application/x-mpegURL',
			'mpd:text/plain'               => 'application/dash+xml',
			'mpd:application/xml'          => 'application/dash+xml',
			'xml:application/xml'          => 'text/xml',
			'*:application/x-dosexec'      => 'application/x-executable',
			'doc:application/vnd.ms-office'=> 'application/msword',
			'xls:application/vnd.ms-office'=> 'application/vnd.ms-excel',
			'ppt:application/vnd.ms-office'=> 'application/vnd.ms-powerpoint',
			'yml:text/plain'               => 'text/x-yaml',
			'ai:application/pdf'           => 'application/postscript',
			'cgm:text/plain'               => 'image/cgm',
			'dxf:text/plain'               => 'image/vnd.dxf',
			'hpgl:text/plain'              => 'application/vnd.hp-hpgl',
			'igs:text/plain'               => 'model/iges',
			'iges:text/plain'              => 'model/iges',
			'plt:application/octet-stream' => 'application/plt',
			'plt:text/plain'               => 'application/plt',
			'sat:text/plain'               => 'application/sat',
			'step:text/plain'              => 'application/step',
			'stp:text/plain'               => 'application/step'
		),
		// An option to add MimeMap to the `mimeMap` option
		// Array '[ext]:[detected mime type]' => '[normalized mime]'
		'additionalMimeMap' => array(),
		// MIME regex of send HTTP header "Content-Disposition: inline" or allow preview in quicklook
		// '.' is allow inline of all of MIME types
		// '$^' is not allow inline of all of MIME types
		'dispInlineRegex' => '^(?:(?:image|video|audio)|application/(?:ogg|x-mpegURL|dash\+xml)|(?:text/plain|application/pdf)$)',
		// temporary content URL's base path
		'tmpLinkPath'     => '',
		// temporary content URL's base URL
		'tmpLinkUrl'      => '',
		// directory for thumbnails
		'tmbPath'         => '.tmb',
		// mode to create thumbnails dir
		'tmbPathMode'     => 0777,
		// thumbnails dir URL. Set it if store thumbnails outside root directory
		'tmbURL'          => '',
		// thumbnails size (px)
		'tmbSize'         => 48,
		// thumbnails crop (true - crop, false - scale image to fit thumbnail size)
		'tmbCrop'         => true,
		// thumbnails background color (hex #rrggbb or 'transparent')
		'tmbBgColor'      => 'transparent',
		// image rotate fallback background color (hex #rrggbb)
		'bgColorFb'       => '#ffffff',
		// image manipulations library
		'imgLib'          => 'auto',
		// Fallback self image to thumbnail (nothing imgLib)
		'tmbFbSelf'       => true,
		// Video to Image converters ['TYPE or MIME' => ['func' => function($file){ /* Converts $file to Image */ return true; }, 'maxlen' => (int)TransferLength]]
		'imgConverter'    => array(),
		// Max length of transfer to image converter
		'tmbVideoConvLen' => 10000000,
		// Captre point seccond
		'tmbVideoConvSec' => 6,
		// Resource path of fallback icon images defailt: php/resouces
		'resourcePath'    => '',
		// Jpeg image saveing quality
		'jpgQuality'      => 100,
		// Save as progressive JPEG on image editing
		'jpgProgressive'  => true,
		// enable to get substitute image with command `dim`
		'substituteImg'   => true,
		// on paste file -  if true - old file will be replaced with new one, if false new file get name - original_name-number.ext
		'copyOverwrite'   => true,
		// if true - join new and old directories content on paste
		'copyJoin'        => true,
		// on upload -  if true - old file will be replaced with new one, if false new file get name - original_name-number.ext
		'uploadOverwrite' => true,
		// mimetypes allowed to upload
		'uploadAllow'     => array(),
		// mimetypes not allowed to upload
		'uploadDeny'      => array(),
		// order to process uploadAllow and uploadDeny options
		'uploadOrder'     => array('deny', 'allow'),
		// maximum upload file size. NOTE - this is size for every uploaded files
		'uploadMaxSize'   => 0,
		// maximum number of chunked upload connection. `-1` to disable chunked upload
		'uploadMaxConn'   => 3,
		// maximum get file size. NOTE - Maximum value is 50% of PHP memory_limit
		'getMaxSize'      => 0,
		// files dates format
		'dateFormat'      => 'j M Y H:i',
		// files time format
		'timeFormat'      => 'H:i',
		// if true - every folder will be check for children folders, -1 - every folder will be check asynchronously, false -  all folders will be marked as having subfolders
		'checkSubfolders' => true, // true, false or -1
		// allow to copy from this volume to other ones?
		'copyFrom'        => true,
		// allow to copy from other volumes to this one?
		'copyTo'          => true,
		// cmd duplicate suffix format e.g. '_%s_' to without spaces
		'duplicateSuffix' => ' %s ',
		// unique name numbar format e.g. '(%d)' to (1), (2)...
		'uniqueNumFormat' => '%d',
		// list of commands disabled on this root
		'disabled'        => array(),
		// enable file owner, group & mode info, `false` to inactivate "chmod" command.
		'statOwner'       => false,
		// allow exec chmod of read-only files
		'allowChmodReadOnly' => false,
		// regexp or function name to validate new file name
		'acceptedName'    => '/^[^\.].*/', // Notice: overwritten it in some volume drivers contractor
		// regexp or function name to validate new directory name
		'acceptedDirname' => '', // used `acceptedName` if empty value
			// function/class method to control files permissions
		'accessControl'   => null,
		// some data required by access control
		'accessControlData' => null,
		// default permissions.
		'defaults'     => array(
			'read'   => true,
			'write'  => true,
			'locked' => false,
			'hidden' => false
		),
		// files attributes
		'attributes'   => array(),
		// max allowed archive files size (0 - no limit)
		'maxArcFilesSize' => 0,
		// Allowed archive's mimetypes to create. Leave empty for all available types.
		'archiveMimes' => array(),
		// Manual config for archivers. See example below. Leave empty for auto detect
		'archivers'    => array(),
		// Use Archive function for remote volume
		'useRemoteArchive' => false,
		// plugin settings
		'plugin'       => array(),
		// Is support parent directory time stamp update on add|remove|rename item
		// Default `null` is auto detection that is LocalFileSystem, FTP or Dropbox are `true`
		'syncChkAsTs'  => null,
		// Long pooling sync checker function for syncChkAsTs is true
		// Calls with args (TARGET DIRCTORY PATH, STAND-BY(sec), OLD TIMESTAMP, VOLUME DRIVER INSTANCE, ELFINDER INSTANCE)
		// This function must return the following values. Changed: New Timestamp or Same: Old Timestamp or Error: false
		// Default `null` is try use elFinderVolumeLocalFileSystem::localFileSystemInotify() on LocalFileSystem driver
		// another driver use elFinder stat() checker
		'syncCheckFunc'=> null,
		// Long polling sync stand-by time (sec)
		'plStandby'    => 30,
		// Sleep time (sec) for elFinder stat() checker (syncChkAsTs is true)
		'tsPlSleep'    => 10,
		// Sleep time (sec) for elFinder ls() checker (syncChkAsTs is false)
		'lsPlSleep'    => 30,
		// Client side sync interval minimum (ms)
		// Default `null` is auto set to ('tsPlSleep' or 'lsPlSleep') * 1000
		// `0` to disable auto sync
		'syncMinMs'    => null,
		// required to fix bug on macos
		// However, we recommend to use the Normalizer plugin instead this option
		'utf8fix'      => false,
		 //                           й                 ё              Й               Ё              Ø         Å
		'utf8patterns' => array("\u0438\u0306", "\u0435\u0308", "\u0418\u0306", "\u0415\u0308", "\u00d8A", "\u030a"),
		'utf8replace'  => array("\u0439",        "\u0451",       "\u0419",       "\u0401",       "\u00d8", "\u00c5"),
		// cache control HTTP headers for commands `file` and  `get`
		'cacheHeaders' => array(
			'Cache-Control: max-age=3600',
			'Expires:',
			'Pragma:'
		),
		// Header to use to accelerate sending local files to clients (e.g. 'X-Sendfile', 'X-Accel-Redirect')
		'xsendfile'    => '',
		// Root path to xsendfile target. Probably, this is required for 'X-Accel-Redirect' on Nginx.
		'xsendfilePath'=> ''
	);

	/**
	 * Defaults permissions
	 *
	 * @var array
	 **/
	protected $defaults = array(
		'read'   => true,
		'write'  => true,
		'locked' => false,
		'hidden' => false
	);
	
	/**
	 * Access control function/class
	 *
	 * @var mixed
	 **/
	protected $attributes = array();
	
	/**
	 * Access control function/class
	 *
	 * @var mixed
	 **/
	protected $access = null;
	
	/**
	 * Mime types allowed to upload
	 *
	 * @var array
	 **/
	protected $uploadAllow = array();
	
	/**
	 * Mime types denied to upload
	 *
	 * @var array
	 **/
	protected $uploadDeny = array();
	
	/**
	 * Order to validate uploadAllow and uploadDeny
	 *
	 * @var array
	 **/
	protected $uploadOrder = array();
	
	/**
	 * Maximum allowed upload file size.
	 * Set as number or string with unit - "10M", "500K", "1G"
	 *
	 * @var int|string
	 **/
	protected $uploadMaxSize = 0;
	
	/**
	 * Run time setting of overwrite items on upload
	 * 
	 * @var string
	 */
	protected $uploadOverwrite = true;
	
	/**
	 * Maximum allowed get file size.
	 * Set as number or string with unit - "10M", "500K", "1G"
	 *
	 * @var int|string
	 **/
	protected $getMaxSize = -1;
	
	/**
	 * Mimetype detect method
	 *
	 * @var string
	 **/
	protected $mimeDetect = 'auto';
	
	/**
	 * Flag - mimetypes from externail file was loaded
	 *
	 * @var bool
	 **/
	private static $mimetypesLoaded = false;
	
	/**
	 * Finfo object for mimeDetect == 'finfo'
	 *
	 * @var object
	 **/
	protected $finfo = null;
	
	/**
	 * List of disabled client's commands
	 *
	 * @var array
	 **/
	protected $disabled = array();
	
	/**
	 * overwrite extensions/mimetypes to mime.types
	 *
	 * @var array
	 **/
	protected static $mimetypes = array(
		// applications
		'exe'   => 'application/x-executable',
		'jar'   => 'application/x-jar',
		// archives
		'gz'    => 'application/x-gzip',
		'tgz'   => 'application/x-gzip',
		'tbz'   => 'application/x-bzip2',
		'rar'   => 'application/x-rar',
		// texts
		'php'   => 'text/x-php',
		'js'    => 'text/javascript',
		'rtfd'  => 'application/rtfd',
		'py'    => 'text/x-python',
		'rb'    => 'text/x-ruby',
		'sh'    => 'text/x-shellscript',
		'pl'    => 'text/x-perl',
		'xml'   => 'text/xml',
		'c'     => 'text/x-csrc',
		'h'     => 'text/x-chdr',
		'cpp'   => 'text/x-c++src',
		'hh'    => 'text/x-c++hdr',
		'md'    => 'text/x-markdown',
		'markdown' => 'text/x-markdown',
		'yml'   => 'text/x-yaml',
		// images
		'bmp'   => 'image/x-ms-bmp',
		'tga'   => 'image/x-targa',
		'xbm'   => 'image/xbm',
		'pxm'   => 'image/pxm',
		//audio
		'wav'   => 'audio/wav',
		// video
		'dv'    => 'video/x-dv',
		'wm'    => 'video/x-ms-wmv',
		'ogm'   => 'video/ogg',
		'm2ts'  => 'video/MP2T',
		'mts'   => 'video/MP2T',
		'ts'    => 'video/MP2T',
		'm3u8'  => 'application/x-mpegURL',
		'mpd'   => 'application/dash+xml'
	);
	
	/**
	 * MIME type list handled as a text file
	 * 
	 * @var array
	 */
	protected $textMimes = array(
		'application/x-empty',
		'application/javascript',
		'application/json',
		'application/xhtml+xml',
		'audio/x-mp3-playlist',
		'application/x-web-config',
		'application/docbook+xml',
		'application/x-php',
		'application/x-perl',
		'application/x-awk',
		'application/x-config',
		'application/x-csh',
		'application/xml',
		'application/sql'
	);
	
	/**
	 * Directory separator - required by client
	 *
	 * @var string
	 **/
	protected $separator = DIRECTORY_SEPARATOR;
	
	/**
	 * Directory separator for decode/encode hash
	 *
	 * @var string
	 **/
	protected $separatorForHash = '';
	
	/**
	 * System Root path (Unix like: '/', Windows: '\', 'C:\' or 'D:\'...)
	 *
	 * @var string
	 **/
	protected $systemRoot = DIRECTORY_SEPARATOR;
	
	/**
	 * Mimetypes allowed to display
	 *
	 * @var array
	 **/
	protected $onlyMimes = array();
	
	/**
	 * Store files moved or overwrited files info
	 *
	 * @var array
	 **/
	protected $removed = array();
	
	/**
	 * Store files added files info
	 *
	 * @var array
	 **/
	protected $added = array();
	
	/**
	 * Cache storage
	 *
	 * @var array
	 **/
	protected $cache = array();
	
	/**
	 * Cache by folders
	 *
	 * @var array
	 **/
	protected $dirsCache = array();
	
	/**
	 * You should use `$this->sessionCache['subdirs']` instead
	 * 
	 * @var array
	 * @deprecated
	 */
	protected $subdirsCache = array();
	
	/**
	 * This volume session cache
	 * 
	 * @var array
	 */
	protected $sessionCache;
	
	/**
	 * Session caching item list
	 * 
	 * @var array
	 */
	protected $sessionCaching = array('rootstat' => true, 'subdirs' => true);
	
	/**
	 * elFinder session wrapper object
	 * 
	 * @var elFinderSessionInterface
	 */
	protected $session;
	
	/**
	 * Search start time
	 * 
	 * @var int
	 */
	protected $searchStart;
	
	/**
	 * Current query word on doSearch
	 *
	 * @var string
	 **/
	protected $doSearchCurrentQuery = array();
	
	/**
	 * Is root modified (for clear root stat cache)
	 * 
	 * @var bool
	 */
	protected $rootModified = false;
	
	/**
	 * Is disable of command `url`
	 * 
	 * @var string
	 */
	protected $disabledGetUrl = false;
	
	/**
	 * Accepted filename validator
	 * 
	 * @var string | callable
	 */
	protected $nameValidator;
	
	/**
	 * Accepted dirname validator
	 * 
	 * @var string | callable
	 */
	protected $dirnameValidator;
	
	/*********************************************************************/
	/*                            INITIALIZATION                         */
	/*********************************************************************/
	
	/**
	 * Prepare driver before mount volume.
	 * Return true if volume is ready.
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function init() {
		return true;
	}	
		
	/**
	 * Configure after successfull mount.
	 * By default set thumbnails path and image manipulation library.
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function configure() {
		// set thumbnails path
		$path = $this->options['tmbPath'];
		if ($path) {
			if (!file_exists($path)) {
				if (mkdir($path)) {
					chmod($path, $this->options['tmbPathMode']);
				} else {
					$path = '';
				}
			} 
			
			if (is_dir($path) && is_readable($path)) {
				$this->tmbPath = $path;
				$this->tmbPathWritable = is_writable($path);
			}
		}
		// set resouce path
		if (! is_dir($this->options['resourcePath'])) {
			$this->options['resourcePath'] = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'resources';
		}

		// set image manipulation library
		$type = preg_match('/^(imagick|gd|convert|auto)$/i', $this->options['imgLib'])
			? strtolower($this->options['imgLib'])
			: 'auto';

		$imgLibFallback = extension_loaded('imagick')? 'imagick' : (function_exists('gd_info')? 'gd' : '');
		if (($type === 'imagick' || $type === 'auto') && extension_loaded('imagick')) {
			$this->imgLib = 'imagick';
		} else if (($type === 'gd' || $type === 'auto') && function_exists('gd_info')) {
			$this->imgLib = 'gd';
		} else {
			$convertCache = 'imgLibConvert';
			if (($convertCmd = $this->session->get($convertCache, false)) !== false) {
				$this->imgLib = $convertCmd;
			} else {
				$this->imgLib = ($this->procExec(ELFINDER_CONVERT_PATH . ' -version') === 0)? 'convert' : '';
				$this->session->set($convertCache, $this->imgLib);
			}
		}
		if ($type !== 'auto' && $this->imgLib === '') {
			// fallback
			$this->imgLib = extension_loaded('imagick')? 'imagick' : (function_exists('gd_info')? 'gd' : '');
		}
		
		// check video to img converter
		if (! empty($this->options['imgConverter']) && is_array($this->options['imgConverter'])) {
			foreach($this->options['imgConverter'] as $_type => $_converter) {
				if (isset($_converter['func'])) {
					$this->imgConverter[strtolower($_type)] = $_converter;
				}
			}
		}
		if (! isset($this->imgConverter['video'])) {
			$videoLibCache = 'videoLib';
			if (($videoLibCmd = $this->session->get($videoLibCache, false)) === false) {
				$videoLibCmd = ($this->procExec(ELFINDER_FFMPEG_PATH . ' -version') === 0)? 'ffmpeg' : '';
				$this->session->set($videoLibCache, $videoLibCmd);
			}
			if ($videoLibCmd) {
				$this->imgConverter['video'] = array(
					'func' => array($this, $videoLibCmd . 'ToImg'),
					'maxlen' => $this->options['tmbVideoConvLen']
				);
			}
		}
		
		// check archivers
		if (empty($this->archivers['create'])) {
			$this->disabled[] ='archive';
		}
		if (empty($this->archivers['extract'])) {
			$this->disabled[] ='extract';
		}
		$_arc = $this->getArchivers();
		if (empty($_arc['create'])) {
			$this->disabled[] ='zipdl';
		}
		
		// check 'statOwner' for command `chmod`
		if (empty($this->options['statOwner'])) {
			$this->disabled[] ='chmod';
		}
		
		// check 'mimeMap'
		if (!is_array($this->options['mimeMap'])) {
			$this->options['mimeMap'] = array();
		}
		if (is_array($this->options['staticMineMap']) && $this->options['staticMineMap']) {
			$this->options['mimeMap'] = array_merge($this->options['mimeMap'], $this->options['staticMineMap']);
		}
		if (is_array($this->options['additionalMimeMap']) && $this->options['additionalMimeMap']) {
			$this->options['mimeMap'] = array_merge($this->options['mimeMap'], $this->options['additionalMimeMap']);
		}
		
		// check 'url' in disabled commands
		if (in_array('url', $this->disabled)) {
			$this->disabledGetUrl = true;
		}
		
		// set run time setting uploadOverwrite
		$this->uploadOverwrite = $this->options['uploadOverwrite'];
	}
	
	/**
	 * @deprecated
	 */
	protected function sessionRestart() {
		$this->sessionCache = $this->session->start()->get($this->id, array());
		return true;
	}
	
	/*********************************************************************/
	/*                              PUBLIC API                           */
	/*********************************************************************/
	
	/**
	 * Return driver id. Used as a part of volume id.
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function driverId() {
		return $this->driverId;
	}
	
	/**
	 * Return volume id
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function id() {
		return $this->id;
	}
	
	/**
	 * Assign elFinder session wrapper object
	 * 
	 * @param  $session  elFinderSessionInterface
	 */
	public function setSession($session) {
		$this->session = $session;
	}
	
	/**
	 * Save session cache data
	 * Calls this function before umount this volume on elFinder::exec()
	 * 
	 * @return void
	 */
	public function saveSessionCache() {
		$this->session->set($this->id, $this->sessionCache);
	}
	
	/**
	 * Return debug info for client
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function debug() {
		return array(
			'id'         => $this->id(),
			'name'       => strtolower(substr(get_class($this), strlen('elfinderdriver'))),
			'mimeDetect' => $this->mimeDetect,
			'imgLib'     => $this->imgLib
		);
	}

	/**
	 * chmod a file or folder
	 *
	 * @param  string   $hash    file or folder hash to chmod
	 * @param  string   $mode    octal string representing new permissions
	 * @return array|false
	 * @author David Bartle
	 **/
	public function chmod($hash, $mode) {
		if ($this->commandDisabled('chmod')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}

		if (!($file = $this->file($hash))) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}

		if (!$this->options['allowChmodReadOnly']) {
			if (!$this->attr($this->decode($hash), 'write', null, ($file['mime'] === 'directory'))) {
				return $this->setError(elFinder::ERROR_PERM_DENIED, $file['name']);
			}
		}

		$path = $this->decode($hash);
		$write = $file['write'];

		if ($this->convEncOut(!$this->_chmod($this->convEncIn($path), $mode))) {
			return $this->setError(elFinder::ERROR_PERM_DENIED, $file['name']);
		}

		$this->clearstatcache();
		if ($path == $this->root) {
			$this->rootModified = true;
		}

		if ($file = $this->stat($path)) {
			$files = array($file);
			if ($file['mime'] === 'directory' && $write !== $file['write']) {
				foreach ($this->getScandir($path) as $stat) {
					if ($this->mimeAccepted($stat['mime'])) {
						$files[] = $stat;
					}
				}
			}
			return $files;
		} else {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
	}
	
	/**
	 * stat a file or folder for elFinder cmd exec
	 *
	 * @param  string   $hash    file or folder hash to chmod
	 * @return array
	 * @author Naoki Sawada
	 **/
	public function fstat($hash) {
		$path = $this->decode($hash);
		return $this->stat($path);
	}
	
	/**
	 * Clear PHP stat cache & all of inner stat caches
	 * 
	 */
	public function clearstatcache() {
		clearstatcache();
		$this->clearcache();
	}
	
	/**
	 * Clear inner stat caches for target hash
	 * 
	 * @param string $hash
	 */
	public function clearcaches($hash = null) {
		if ($hash === null) {
			$this->clearcache();
		} else {
			$path = $this->decode($hash);
			unset($this->cache[$path], $this->dirsCache[$path]);
		}
	}

	/**
	 * "Mount" volume.
	 * Return true if volume available for read or write,
	 * false - otherwise
	 *
	 * @param array $opts
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 */
	public function mount(array $opts) {
		$this->options = array_merge($this->options, $opts);
		
		if (!isset($this->options['path']) || $this->options['path'] === '') {
			return $this->setError('Path undefined.');
		}
		
		if (! $this->session) {
			return $this->setError('Session wrapper dose not set. Need to `$volume->setSession(elFinderSessionInterface);` before mount.');
		}
		if (! ($this->session instanceof elFinderSessionInterface)) {
			return $this->setError('Session wrapper instance must be "elFinderSessionInterface".');
		}
		
		// set driverId
		if (!empty($this->options['driverId'])) {
			$this->driverId = $this->options['driverId'];
		}
		
		$this->id = $this->driverId.(!empty($this->options['id']) ? $this->options['id'] : elFinder::$volumesCnt++).'_';
		$this->root = $this->normpathCE($this->options['path']);
		$this->separator = isset($this->options['separator']) ? $this->options['separator'] : DIRECTORY_SEPARATOR;
		if (! empty($this->options['winHashFix'])) {
			$this->separatorForHash = ($this->separator !== '/') ? '/' : '';
		}
		$this->systemRoot = isset($this->options['systemRoot']) ? $this->options['systemRoot'] : $this->separator;
		
		// set ARGS
		$this->ARGS = $_SERVER['REQUEST_METHOD'] === 'POST'? $_POST : $_GET;
		
		$argInit = !empty($this->ARGS['init']);
		
		// session cache
		if ($argInit) {
			$this->session->set($this->id, array());
		}
		$this->sessionCache = $this->session->get($this->id, array());
		
		// default file attribute
		$this->defaults = array(
			'read'    => isset($this->options['defaults']['read'])  ? !!$this->options['defaults']['read']  : true,
			'write'   => isset($this->options['defaults']['write']) ? !!$this->options['defaults']['write'] : true,
			'locked'  => isset($this->options['defaults']['locked']) ? !!$this->options['defaults']['locked'] : false,
			'hidden'  => isset($this->options['defaults']['hidden']) ? !!$this->options['defaults']['hidden'] : false
		);

		// root attributes
		$this->attributes[] = array(
			'pattern' => '~^'.preg_quote($this->separator).'$~',
			'locked'  => true,
			'hidden'  => false
		);
		// set files attributes
		if (!empty($this->options['attributes']) && is_array($this->options['attributes'])) {
			
			foreach ($this->options['attributes'] as $a) {
				// attributes must contain pattern and at least one rule
				if (!empty($a['pattern']) || count($a) > 1) {
					$this->attributes[] = $a;
				}
			}
		}

		if (!empty($this->options['accessControl']) && is_callable($this->options['accessControl'])) {
			$this->access = $this->options['accessControl'];
		}
		
		$this->today     = mktime(0,0,0, date('m'), date('d'), date('Y'));
		$this->yesterday = $this->today-86400;
		
		if (!$this->init()) {
			return false;
		}
		
		// set server encoding
		if (!empty($this->options['encoding']) && strtoupper($this->options['encoding']) !== 'UTF-8') {
			$this->encoding = $this->options['encoding'];
		} else {
			$this->encoding = null;
		}
		
		// check some options is arrays
		$this->uploadAllow = isset($this->options['uploadAllow']) && is_array($this->options['uploadAllow'])
			? $this->options['uploadAllow']
			: array();
			
		$this->uploadDeny = isset($this->options['uploadDeny']) && is_array($this->options['uploadDeny'])
			? $this->options['uploadDeny']
			: array();
		
		$this->options['uiCmdMap'] = (isset($this->options['uiCmdMap']) && is_array($this->options['uiCmdMap']))
			? $this->options['uiCmdMap']
			: array();

		if (is_string($this->options['uploadOrder'])) { // telephat_mode on, compatibility with 1.x
			$parts = explode(',', isset($this->options['uploadOrder']) ? $this->options['uploadOrder'] : 'deny,allow');
			$this->uploadOrder = array(trim($parts[0]), trim($parts[1]));
		} else { // telephat_mode off
			$this->uploadOrder = ! empty($this->options['uploadOrder'])? $this->options['uploadOrder'] : array('deny', 'allow');
		}
			
		if (!empty($this->options['uploadMaxSize'])) {
			$this->uploadMaxSize = elFinder::getIniBytes('', $this->options['uploadMaxSize']);
		}
		// Set maximum to PHP_INT_MAX
		if (!defined('PHP_INT_MAX')) {
			define('PHP_INT_MAX', 2147483647);
		}
		if ($this->uploadMaxSize < 1 || $this->uploadMaxSize > PHP_INT_MAX) {
			$this->uploadMaxSize = PHP_INT_MAX;
		}
		
		// Set to get maximum size to 50% of memory_limit
		$memLimit = elFinder::getIniBytes('memory_limit') / 2;
		if ($memLimit > 0) {
			$this->getMaxSize = empty($this->options['getMaxSize'])? $memLimit : min($memLimit, elFinder::getIniBytes('', $this->options['getMaxSize']));
		} else {
			$this->getMaxSize = -1;
		}
		
		$this->disabled = isset($this->options['disabled']) && is_array($this->options['disabled'])
			? array_values(array_diff($this->options['disabled'], array('open'))) // 'open' is required
			: array();
		
		$this->cryptLib   = $this->options['cryptLib'];
		$this->mimeDetect = $this->options['mimeDetect'];

		// find available mimetype detect method
		$type = strtolower($this->options['mimeDetect']);
		$type = preg_match('/^(finfo|mime_content_type|internal|auto)$/i', $type) ? $type : 'auto';
		$regexp = '/text\/x\-(php|c\+\+)/';
	
		if (($type == 'finfo' || $type == 'auto') 
		&& class_exists('finfo', false)) {
			$tmpFileInfo = explode(';', finfo_file(finfo_open(FILEINFO_MIME), __FILE__));
		} else {
			$tmpFileInfo = false;
		}
	
		$type = 'internal';
		if ($tmpFileInfo && preg_match($regexp, array_shift($tmpFileInfo))) {
			$type = 'finfo';
			$this->finfo = finfo_open(FILEINFO_MIME);
		} elseif (($type == 'mime_content_type' || $type == 'auto') && function_exists('mime_content_type')) {
			$_mimetypes = explode(';', mime_content_type(__FILE__));
			if (preg_match($regexp, array_shift($_mimetypes))) {
				$type = 'mime_content_type';
			}
		}
		$this->mimeDetect = $type;

		// load mimes from external file for mimeDetect == 'internal'
		// based on Alexey Sukhotin idea and patch: http://elrte.org/redmine/issues/163
		// file must be in file directory or in parent one 
		if ($this->mimeDetect === 'internal' && !elFinderVolumeDriver::$mimetypesLoaded) {
			elFinderVolumeDriver::loadMimeTypes(!empty($this->options['mimefile'])? $this->options['mimefile'] : '');
		}

		$this->rootName = empty($this->options['alias']) ? $this->basenameCE($this->root) : $this->options['alias'];

		// This get's triggered if $this->root == '/' and alias is empty.
		// Maybe modify _basename instead?
		if ($this->rootName === '') $this->rootName = $this->separator;

		$root = $this->stat($this->root);
		
		if (!$root) {
			return $this->setError('Root folder does not exist.');
		}
		if (!$root['read'] && !$root['write']) {
			return $this->setError('Root folder has not read and write permissions.');
		}
		
		if ($root['read']) {
			if ($argInit) {
				// check startPath - path to open by default instead of root
				$startPath = $this->options['startPath']? $this->normpathCE($this->options['startPath']) : '';
				if ($startPath) {
					$start = $this->stat($startPath);
					if (!empty($start)
					&& $start['mime'] == 'directory'
					&& $start['read']
					&& empty($start['hidden'])
					&& $this->inpathCE($startPath, $this->root)) {
						$this->startPath = $startPath;
						if (substr($this->startPath, -1, 1) == $this->options['separator']) {
							$this->startPath = substr($this->startPath, 0, -1);
						}
					}
				}
			}
		} else {
			$this->options['URL']     = '';
			$this->options['tmbURL']  = '';
			$this->options['tmbPath'] = '';
			// read only volume
			array_unshift($this->attributes, array(
				'pattern' => '/.*/',
				'read'    => false
			));
		}
		$this->treeDeep = $this->options['treeDeep'] > 0 ? (int)$this->options['treeDeep'] : 1;
		$this->tmbSize  = $this->options['tmbSize'] > 0 ? (int)$this->options['tmbSize'] : 48;
		$this->URL      = $this->options['URL'];
		if ($this->URL && preg_match("|[^/?&=]$|", $this->URL)) {
			$this->URL .= '/';
		}
		if (strtolower($this->options['dirUrlOwn']) === 'auto') {
			$this->options['dirUrlOwn'] = $this->URL? false : true;
		} else {
			$this->options['dirUrlOwn'] = (bool)$this->options['dirUrlOwn'];
		}

		$this->tmbURL   = !empty($this->options['tmbURL']) ? $this->options['tmbURL'] : '';
		if ($this->tmbURL && $this->tmbURL !== 'self' && preg_match("|[^/?&=]$|", $this->tmbURL)) {
			$this->tmbURL .= '/';
		}
		
		$this->nameValidator = !empty($this->options['acceptedName']) && (is_string($this->options['acceptedName']) || is_callable($this->options['acceptedName']))
			? $this->options['acceptedName']
			: '';
		
		$this->dirnameValidator = !empty($this->options['acceptedDirname']) && (is_callable($this->options['acceptedDirname']) || (is_string($this->options['acceptedDirname']) && preg_match($this->options['acceptedDirname'], '') !== false))
			? $this->options['acceptedDirname']
			: $this->nameValidator;

		$this->_checkArchivers();

		// enabling archivers['create'] with options['useRemoteArchive']
		if ($this->options['useRemoteArchive'] && empty($this->archivers['create']) && $this->getTempPath()) {
			$_archivers = $this->getArchivers();
			$this->archivers['create'] = $_archivers['create'];
		}

		// manual control archive types to create
		if (!empty($this->options['archiveMimes']) && is_array($this->options['archiveMimes'])) {
			foreach ($this->archivers['create'] as $mime => $v) {
				if (!in_array($mime, $this->options['archiveMimes'])) {
					unset($this->archivers['create'][$mime]);
				}
			}
		}
		
		// manualy add archivers
		if (!empty($this->options['archivers']['create']) && is_array($this->options['archivers']['create'])) {
			foreach ($this->options['archivers']['create'] as $mime => $conf) {
				if (strpos($mime, 'application/') === 0 
				&& !empty($conf['cmd']) 
				&& isset($conf['argc']) 
				&& !empty($conf['ext'])
				&& !isset($this->archivers['create'][$mime])) {
					$this->archivers['create'][$mime] = $conf;
				}
			}
		}
		
		if (!empty($this->options['archivers']['extract']) && is_array($this->options['archivers']['extract'])) {
			foreach ($this->options['archivers']['extract'] as $mime => $conf) {
				if (strpos($mime, 'application/') === 0
				&& !empty($conf['cmd']) 
				&& isset($conf['argc']) 
				&& !empty($conf['ext'])
				&& !isset($this->archivers['extract'][$mime])) {
					$this->archivers['extract'][$mime] = $conf;
				}
			}
		}
		
		if (! empty($this->options['noSessionCache']) && is_array($this->options['noSessionCache'])) {
			foreach($this->options['noSessionCache'] as $_key) {
				$this->sessionCaching[$_key] = false;
				unset($this->sessionCache[$_key]);
			}
		}
		if ($this->sessionCaching['subdirs']) {
			if (! isset($this->sessionCache['subdirs'])) {
				$this->sessionCache['subdirs'] = array();
			}
		}
		

		$this->configure();
		
		// Normarize disabled (array_merge`for type array of JSON)
		$this->disabled = array_values(array_unique($this->disabled));
		
		// fix sync interval
		if ($this->options['syncMinMs'] !== 0) {
			$this->options['syncMinMs'] = max($this->options[$this->options['syncChkAsTs']? 'tsPlSleep' : 'lsPlSleep'] * 1000, intval($this->options['syncMinMs']));
		}
		
		// ` copyJoin` is required for the trash function
		if ($this->options['trashHash'] && empty($this->options['copyJoin'])) {
			$this->options['trashHash'] = '';
		}
		
		// set tmpLinkPath
		if (elFinder::$tmpLinkPath && !$this->options['tmpLinkPath']) {
			if (is_writeable(elFinder::$tmpLinkPath)) {
				$this->options['tmpLinkPath'] = elFinder::$tmpLinkPath;
			} else {
				elFinder::$tmpLinkPath = '';
			}
		}
		if ($this->options['tmpLinkPath'] && is_writable($this->options['tmpLinkPath'])) {
			$this->tmpLinkPath = realpath($this->options['tmpLinkPath']);
		} else if (! $this->tmpLinkPath && $this->tmbURL && $this->tmbPath) {
			$this->tmpLinkPath = $this->tmbPath;
			$this->options['tmpLinkUrl'] = $this->tmbURL;
 		} else if (!$this->options['URL'] && is_writable('../files/.tmb')) {
			$this->tmpLinkPath = realpath('../files/.tmb');
			$this->options['tmpLinkUrl'] = '';
			if (! elFinder::$tmpLinkPath) {
				elFinder::$tmpLinkPath = $this->tmpLinkPath;
				elFinder::$tmpLinkUrl = '';
			}
		}
		
		// set tmpLinkUrl
		if (elFinder::$tmpLinkUrl && !$this->options['tmpLinkUrl']) {
			$this->options['tmpLinkUrl'] = elFinder::$tmpLinkUrl;
		}
		if ($this->options['tmpLinkUrl']) {
			$this->tmpLinkUrl = $this->options['tmpLinkUrl'];
		}
		if ($this->tmpLinkPath && !$this->tmpLinkUrl) {
			$cur = realpath('./');
			$i = 0;
			while($cur !== $this->systemRoot && strpos($this->tmpLinkPath, $cur) !== 0) {
				$i++;
				$cur = dirname($cur);
			}
			list($req) = explode('?', $_SERVER['REQUEST_URI']);
			$reqs = explode('/', dirname($req));
			$uri = join('/', array_slice($reqs, 0, count($reqs) - 1)).substr($this->tmpLinkPath, strlen($cur));
			$https = (isset($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off');
			$this->tmpLinkUrl = ($https ? 'https://' : 'http://')
				.$_SERVER['SERVER_NAME'] // host
				.(((! $https && $_SERVER['SERVER_PORT'] == 80) || ($https && $_SERVER['SERVER_PORT'] == 443)) ? '' : (':' . $_SERVER['SERVER_PORT']))  // port
				.$uri;
			if (! elFinder::$tmpLinkUrl) {
				elFinder::$tmpLinkUrl = $this->tmpLinkUrl;
			}
		}
		
		// remove last '/'
		if ($this->tmpLinkPath) {
			$this->tmpLinkPath = rtrim($this->tmpLinkPath, '/');
		}
		if ($this->tmpLinkUrl) {
			$this->tmpLinkUrl = rtrim($this->tmpLinkUrl, '/');
		}
		
		// to update options cache
		$this->updateCache($this->root, $root);

		return $this->mounted = true;
	}
	
	/**
	 * Some "unmount" stuffs - may be required by virtual fs
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function umount() {
	}
	
	/**
	 * Remove session cache of this volume
	 * 
	 */
	public function clearSessionCache() {
		$this->sessionCache = array();
	}
	
	/**
	 * Return error message from last failed action
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function error() {
		return $this->error;
	}
	
	/**
	 * Return is uploadable that given file name 
	 *
	 * @param  string  $name  file name
	 * @param  bool    $allowUnknown
	 * @return bool
	 * @author Naoki Sawada
	 **/
	public function isUploadableByName($name, $allowUnknown = false) {
		$mimeByName = $this->mimetype($name, true);
		return (($allowUnknown && $mimeByName === 'unknown') || $this->allowPutMime($mimeByName));
	}
	
	/**
	 * Return Extention/MIME Table (elFinderVolumeDriver::$mimetypes)
	 * 
	 * @return array
	 * @author Naoki Sawada
	 */
	public function getMimeTable() {
		// load mime.types
		if (! elFinderVolumeDriver::$mimetypesLoaded) {
			elFinderVolumeDriver::loadMimeTypes();
		}
		return elFinderVolumeDriver::$mimetypes;
	}
	
	/**
	 * Return file extention detected by MIME type
	 * 
	 * @param  string  $mime    MIME type
	 * @param  string  $suffix  Additional suffix
	 * @return string
	 * @author Naoki Sawada
	 */
	public function getExtentionByMime($mime, $suffix = '') {
		static $extTable = null;
		
		if (is_null($extTable)) {
			$extTable = array_flip(array_unique($this->getMimeTable()));
			foreach($this->options['mimeMap'] as $pair => $_mime) {
				list($ext) = explode(':', $pair);
				if ($ext !== '*' && ! isset($extTable[$_mime])) {
					$extTable[$_mime] = $ext;
				}
			}
		}
		
		if ($mime && isset($extTable[$mime])) {
			return $suffix? ($extTable[$mime] . $suffix) : $extTable[$mime];
		}
		return '';
	}
	
	/**
	 * Set mimetypes allowed to display to client
	 *
	 * @param  array  $mimes
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function setMimesFilter($mimes) {
		if (is_array($mimes)) {
			$this->onlyMimes = $mimes;
		}
	}
	
	/**
	 * Return root folder hash
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function root() {
		return $this->encode($this->root);
	}

	/**
	 * Return root path
	 *
	 * @return string
	 * @author Naoki Sawada
	 **/
	public function getRootPath() {
		return $this->root;
	}

	/**
	 * Return target path hash
	 *
	 * @param  string $path
	 * @param  string $name
	 * @author Naoki Sawada
	 * @return string
	 */
	public function getHash($path, $name = '') {
		if ($name !== '') {
			$path = $this->joinPathCE($path, $name);
		}
		return $this->encode($path);
	}
	
	/**
	 * Return decoded path of target hash
	 * This method do not check the stat of target
	 * Use method `realpath()` to do check of the stat of target
	 *
	 * @param  string $hash
	 * @author Naoki Sawada
	 * @return string
	 */
	public function getPath($hash) {
		return $this->decode($hash);
	}
	
	/**
	 * Return root or startPath hash
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function defaultPath() {
		return $this->encode($this->startPath ? $this->startPath : $this->root);
	}

	/**
	 * Return volume options required by client:
	 *
	 * @param $hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 */
	public function options($hash) {
		$create = $createext = array();
		if (isset($this->archivers['create']) && is_array($this->archivers['create'])) {
			foreach($this->archivers['create'] as $m => $v) {
				$create[] = $m;
				$createext[$m] = $v['ext'];
			}
		}
		$opts = array(
			'path'            => $hash? $this->path($hash) : '',
			'url'             => $this->URL,
			'tmbUrl'          => (! $this->imgLib && $this->options['tmbFbSelf'])? 'self' : $this->tmbURL,
			'disabled'        => $this->disabled,
			'separator'       => $this->separator,
			'copyOverwrite'   => intval($this->options['copyOverwrite']),
			'uploadOverwrite' => intval($this->options['uploadOverwrite']),
			'uploadMaxSize'   => intval($this->uploadMaxSize),
			'uploadMaxConn'   => intval($this->options['uploadMaxConn']),
			'uploadMime'      => array(
				'firstOrder' => isset($this->uploadOrder[0])? $this->uploadOrder[0] : 'deny',
				'allow'      => $this->uploadAllow,
				'deny'       => $this->uploadDeny
			),
			'dispInlineRegex' => $this->options['dispInlineRegex'],
			'jpgQuality'      => intval($this->options['jpgQuality']),
			'archivers'       => array(
				'create'    => $create,
				'extract'   => isset($this->archivers['extract']) && is_array($this->archivers['extract']) ? array_keys($this->archivers['extract']) : array(),
				'createext' => $createext
			),
			'uiCmdMap'        => (isset($this->options['uiCmdMap']) && is_array($this->options['uiCmdMap']))? $this->options['uiCmdMap'] : array(),
			'syncChkAsTs'     => intval($this->options['syncChkAsTs']),
			'syncMinMs'       => intval($this->options['syncMinMs']),
			'i18nFolderName'  => intval($this->options['i18nFolderName']),
			'tmbCrop'         => intval($this->options['tmbCrop']),
			'substituteImg'   => (bool)$this->options['substituteImg']
		);
		if (! empty($this->options['trashHash'])) {
			$opts['trashHash'] = $this->options['trashHash'];
		}
		if ($hash === null) {
			// call from getRootStatExtra()
			if (! empty($this->options['icon'])) {
				$opts['icon'] = $this->options['icon'];
			}
			if (! empty($this->options['rootCssClass'])) {
				$opts['csscls'] = $this->options['rootCssClass'];
			}
			if (isset($this->options['netkey'])) {
				$opts['netkey'] = $this->options['netkey'];
			}
		}
		return $opts;
	}
	
	/**
	 * Get option value of this volume
	 * 
	 * @param string $name  target option name
	 * @return NULL|mixed   target option value
	 * @author Naoki Sawada
	 */
	public function getOption($name) {
		return isset($this->options[$name])? $this->options[$name] : null;
	}
	
	/**
	 * Get plugin values of this options
	 * 
	 * @param string $name  Plugin name
	 * @return NULL|array   Plugin values
	 * @author Naoki Sawada
	 */
	public function getOptionsPlugin($name = '') {
		if ($name) {
			return isset($this->options['plugin'][$name])? $this->options['plugin'][$name] : array();
		} else {
			return $this->options['plugin'];
		}
	}
	
	/**
	 * Return true if command disabled in options
	 *
	 * @param  string  $cmd  command name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function commandDisabled($cmd) {
		return in_array($cmd, $this->disabled);
	}
	
	/**
	 * Return true if mime is required mimes list
	 *
	 * @param  string     $mime   mime type to check
	 * @param  array      $mimes  allowed mime types list or not set to use client mimes list
	 * @param  bool|null  $empty  what to return on empty list
	 * @return bool|null
	 * @author Dmitry (dio) Levashov
	 * @author Troex Nevelin
	 **/
	public function mimeAccepted($mime, $mimes = null, $empty = true) {
		$mimes = is_array($mimes) ? $mimes : $this->onlyMimes;
		if (empty($mimes)) {
			return $empty;
		}
		return $mime == 'directory'
			|| in_array('all', $mimes)
			|| in_array('All', $mimes)
			|| in_array($mime, $mimes)
			|| in_array(substr($mime, 0, strpos($mime, '/')), $mimes);
	}
	
	/**
	 * Return true if voume is readable.
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isReadable() {
		$stat = $this->stat($this->root);
		return $stat['read'];
	}
	
	/**
	 * Return true if copy from this volume allowed
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function copyFromAllowed() {
		return !!$this->options['copyFrom'];
	}
	
	/**
	 * Return file path related to root with convert encoging
	 *
	 * @param  string   $hash  file hash
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function path($hash) {
		return $this->convEncOut($this->_path($this->convEncIn($this->decode($hash))));
	}
	
	/**
	 * Return file real path if file exists
	 *
	 * @param  string  $hash  file hash
	 * @return string | false
	 * @author Dmitry (dio) Levashov
	 **/
	public function realpath($hash) {
		$path = $this->decode($hash);
		return $this->stat($path) ? $path : false;
	}
	
	/**
	 * Return list of moved/overwrited files
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function removed() {
		if ($this->removed) {
			$unsetSubdir = isset($this->sessionCache['subdirs'])? true : false;
			foreach($this->removed as $item) {
				if ($item['mime'] === 'directory') {
					$path = $this->decode($item['hash']);
					if ($unsetSubdir) {
						unset($this->sessionCache['subdirs'][$path]);
					}
					if ($item['phash'] !== '') {
						$parent = $this->decode($item['phash']);
						unset($this->cache[$parent]);
						if ($this->root === $parent) {
							$this->sessionCache['rootstat'] = array();
						}
						if ($unsetSubdir) {
							unset($this->sessionCache['subdirs'][$parent]);
						}
					}
				}
			}
		}
		return $this->removed;
	}
	
	/**
	 * Return list of added files
	 *
	 * @deprecated
	 * @return array
	 * @author Naoki Sawada
	 **/
	public function added() {
		return $this->added;
	}
	
	/**
	 * Clean removed files list
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function resetRemoved() {
		$this->resetResultStat();
	}
	
	/**
	 * Clean added/removed files list
	 *
	 * @return void
	 **/
	public function resetResultStat() {
		$this->removed = array();
		$this->added = array();
	}
	
	/**
	 * Return file/dir hash or first founded child hash with required attr == $val
	 *
	 * @param  string   $hash  file hash
	 * @param  string   $attr  attribute name
	 * @param  bool     $val   attribute value
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function closest($hash, $attr, $val) {
		return ($path = $this->closestByAttr($this->decode($hash), $attr, $val)) ? $this->encode($path) : false;
	}

	/**
	 * Return file info or false on error
	 *
	 * @param  string $hash file hash
	 * @return array|false
	 * @internal param bool $realpath add realpath field to file info
	 * @author Dmitry (dio) Levashov
	 */
	public function file($hash) {
		$file = $this->stat($this->decode($hash));
		
		return ($file) ? $file : $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
	}

	/**
	 * Return folder info
	 *
	 * @param  string $hash folder hash
	 * @param bool $resolveLink
	 * @return array|false
	 * @internal param bool $hidden return hidden file info
	 * @author Dmitry (dio) Levashov
	 */
	public function dir($hash, $resolveLink=false) {
		if (($dir = $this->file($hash)) == false) {
			return $this->setError(elFinder::ERROR_DIR_NOT_FOUND);
		}

		if ($resolveLink && !empty($dir['thash'])) {
			$dir = $this->file($dir['thash']);
		}
		
		return $dir && $dir['mime'] == 'directory' && empty($dir['hidden']) 
			? $dir 
			: $this->setError(elFinder::ERROR_NOT_DIR);
	}
	
	/**
	 * Return directory content or false on error
	 *
	 * @param  string   $hash   file hash
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function scandir($hash) {
		if (($dir = $this->dir($hash)) == false) {
			return false;
		}
		
		$path = $this->decode($hash);
		if ($res = $dir['read']
			? $this->getScandir($path)
			: $this->setError(elFinder::ERROR_PERM_DENIED)) {
			
			$dirs = null;
			if ($this->sessionCaching['subdirs'] && isset($this->sessionCache['subdirs'][$path])) {
				$dirs = $this->sessionCache['subdirs'][$path];
			}
			if ($dirs !== null || (isset($dir['dirs']) && $dir['dirs'] != 1)) {
				$_dir = $dir;
				if ($dirs || $this->subdirs($hash)) {
					$dir['dirs'] = 1;
				} else {
					unset($dir['dirs']);
				}
				if ($dir !== $_dir) {
					$this->updateCache($path, $dir);
				}
			}
		}
		
		return $res;
	}

	/**
	 * Return dir files names list
	 *
	 * @param  string $hash file hash
	 * @param null $intersect
	 * @return array
	 * @author Dmitry (dio) Levashov
	 */
	public function ls($hash, $intersect = null) {
		if (($dir = $this->dir($hash)) == false || !$dir['read']) {
			return false;
		}
		
		$list = array();
		$path = $this->decode($hash);
		
		$check = array();
		if ($intersect) {
			$check = array_flip($intersect);
		}
		
		foreach ($this->getScandir($path) as $stat) {
			if (empty($stat['hidden']) && (!$check || isset($check[$stat['name']])) && $this->mimeAccepted($stat['mime'])) {
				$list[$stat['hash']] = $stat['name'];
			}
		}

		return $list;
	}

	/**
	 * Return subfolders for required folder or false on error
	 *
	 * @param  string   $hash  folder hash or empty string to get tree from root folder
	 * @param  int      $deep  subdir deep
	 * @param  string   $exclude  dir hash which subfolders must be exluded from result, required to not get stat twice on cwd subfolders
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function tree($hash='', $deep=0, $exclude='') {
		$path = $hash ? $this->decode($hash) : $this->root;
		
		if (($dir = $this->stat($path)) == false || $dir['mime'] != 'directory') {
			return false;
		}
		
		$dirs = $this->gettree($path, $deep > 0 ? $deep -1 : $this->treeDeep-1, $exclude ? $this->decode($exclude) : null);
		array_unshift($dirs, $dir);
		return $dirs;
	}
	
	/**
	 * Return part of dirs tree from required dir up to root dir
	 *
	 * @param  string    $hash   directory hash
	 * @param  bool|null $lineal only lineal parents
	 * @param  string    $until  hash that is enough to that extent >= 2.1.24
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function parents($hash, $lineal = false) {
		if (($current = $this->dir($hash)) == false) {
			return false;
		}
		
		$args = func_get_args();
		// checks 3rd param `$until` (elFinder >= 2.1.24)
		$until = '';
		if (isset($args[2])) {
			$until = $args[2];
		}
		
		$path = $this->decode($hash);
		$tree = array();
		
		while ($path && $path != $this->root) {
			elFinder::checkAborted();
			$path = $this->dirnameCE($path);
			if (!($stat = $this->stat($path)) || !empty($stat['hidden']) || !$stat['read']) {
				return false;
			}
			
			array_unshift($tree, $stat);
			if (!$lineal) {
				foreach ($this->gettree($path, 0) as $dir) {
					elFinder::checkAborted();
					if (!isset($tree[$dir['hash']])) {
						$tree[$dir['hash']] = $dir;
					}
				}
			}
			
			if ($until && $until === $this->encode($path)) {
				break;
			}
		}

		return $tree ? array_values($tree) : array($current);
	}

	/**
	 * Create thumbnail for required file and return its name of false on failed
	 *
	 * @param $hash
	 * @return false|string
	 * @author Dmitry (dio) Levashov
	 */
	public function tmb($hash) {
		$path = $this->decode($hash);
		$stat = $this->stat($path);
		
		if (isset($stat['tmb'])) {
			$res = $stat['tmb'] == "1" ? $this->createTmb($path, $stat) : $stat['tmb'];
			if (! $res) {
				list($type) = explode('/', $stat['mime']);
				$fallback = $this->options['resourcePath'] . DIRECTORY_SEPARATOR . strtolower($type) . '.png';
				if (is_file($fallback)) {
					$res = $this->tmbname($stat);
					if (! copy($fallback, $this->tmbPath . DIRECTORY_SEPARATOR . $res)) {
						$res = false;
					}
				}
			}
			return $res;
		}
		return false;
	}
	
	/**
	 * Return file size / total directory size
	 *
	 * @param  string   file hash
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	public function size($hash) {
		return $this->countSize($this->decode($hash));
	}
	
	/**
	 * Open file for reading and return file pointer
	 *
	 * @param  string   file hash
	 * @return Resource
	 * @author Dmitry (dio) Levashov
	 **/
	public function open($hash) {
		if (($file = $this->file($hash)) == false
		|| $file['mime'] == 'directory') {
			return false;
		}
		
		return $this->fopenCE($this->decode($hash), 'rb');
	}
	
	/**
	 * Close file pointer
	 *
	 * @param  Resource  $fp   file pointer
	 * @param  string    $hash file hash
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function close($fp, $hash) {
		$this->fcloseCE($fp, $this->decode($hash));
	}
	
	/**
	 * Create directory and return dir info
	 *
	 * @param  string   $dsthash  destination directory hash
	 * @param  string   $name directory name
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function mkdir($dsthash, $name) {
		if ($this->commandDisabled('mkdir')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if (!$this->nameAccepted($name, true)) {
			return $this->setError(elFinder::ERROR_INVALID_DIRNAME);
		}
		
		if (($dir = $this->dir($dsthash)) == false) {
			return $this->setError(elFinder::ERROR_TRGDIR_NOT_FOUND, '#'.$dsthash);
		}
		
		$path = $this->decode($dsthash);
		
		if (!$dir['write'] || !$this->allowCreate($path, $name, true)) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		$dst  = $this->joinPathCE($path, $name);
		$stat = $this->isNameExists($dst); 
		if (!empty($stat)) { 
			return $this->setError(elFinder::ERROR_EXISTS, $name);
		}
		$this->clearcache();
		
		$mkpath = $this->convEncOut($this->_mkdir($this->convEncIn($path), $this->convEncIn($name)));
		if ($mkpath) {
			$this->clearstatcache();
			$this->updateSubdirsCache($path, true);
			$this->updateSubdirsCache($mkpath, false);
		}
		
		return $mkpath? $this->stat($mkpath) : false;
	}
	
	/**
	 * Create empty file and return its info
	 *
	 * @param  string   $dst  destination directory
	 * @param  string   $name file name
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function mkfile($dst, $name) {
		if ($this->commandDisabled('mkfile')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if (!$this->nameAccepted($name, false)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME);
		}
		
		$mimeByName = $this->mimetype($name, true);
		if ($mimeByName && !$this->allowPutMime($mimeByName)) {
			return $this->setError(elFinder::ERROR_UPLOAD_FILE_MIME, $name);
		}
		
		if (($dir = $this->dir($dst)) == false) {
			return $this->setError(elFinder::ERROR_TRGDIR_NOT_FOUND, '#'.$dst);
		}
		
		$path = $this->decode($dst);
		
		if (!$dir['write'] || !$this->allowCreate($path, $name, false)) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if ($this->isNameExists($this->joinPathCE($path, $name))) {
			return $this->setError(elFinder::ERROR_EXISTS, $name);
		}
		
		$this->clearcache();
		$res = false;
		if ($path = $this->convEncOut($this->_mkfile($this->convEncIn($path), $this->convEncIn($name)))) {
			$this->clearstatcache();
			$res = $this->stat($path);
		}
		return $res;
	}
	
	/**
	 * Rename file and return file info
	 *
	 * @param  string  $hash  file hash
	 * @param  string  $name  new file name
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function rename($hash, $name) {
		if ($this->commandDisabled('rename')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if (!($file = $this->file($hash))) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
		
		if ($name === $file['name']) {
			return $file;
		}
		
		if (!empty($file['locked'])) {
			return $this->setError(elFinder::ERROR_LOCKED, $file['name']);
		}
		
		$isDir = ($file['mime'] === 'directory');
		
		if (!$this->nameAccepted($name, $isDir)) {
			return $this->setError($isDir? elFinder::ERROR_INVALID_DIRNAME : elFinder::ERROR_INVALID_NAME);
		}
		
		if (! $isDir) {
			$mimeByName = $this->mimetype($name, true);
			if ($mimeByName && !$this->allowPutMime($mimeByName)) {
				return $this->setError(elFinder::ERROR_UPLOAD_FILE_MIME, $name);
			}
		}
		
		$path = $this->decode($hash);
		$dir  = $this->dirnameCE($path);
		$stat = $this->isNameExists($this->joinPathCE($dir, $name));
		if ($stat) {
			return $this->setError(elFinder::ERROR_EXISTS, $name);
		}
		
		if (!$this->allowCreate($dir, $name, ($file['mime'] === 'directory'))) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}

		$this->rmTmb($file); // remove old name tmbs, we cannot do this after dir move


		if ($path = $this->convEncOut($this->_move($this->convEncIn($path), $this->convEncIn($dir), $this->convEncIn($name)))) {
			$this->clearcache();
			return $this->stat($path);
		}
		return false;
	}
	
	/**
	 * Create file copy with suffix "copy number" and return its info
	 *
	 * @param  string   $hash    file hash
	 * @param  string   $suffix  suffix to add to file name
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function duplicate($hash, $suffix='copy') {
		if ($this->commandDisabled('duplicate')) {
			return $this->setError(elFinder::ERROR_COPY, '#'.$hash, elFinder::ERROR_PERM_DENIED);
		}
		
		if (($file = $this->file($hash)) == false) {
			return $this->setError(elFinder::ERROR_COPY, elFinder::ERROR_FILE_NOT_FOUND);
		}

		$path = $this->decode($hash);
		$dir  = $this->dirnameCE($path);
		$name = $this->uniqueName($dir, $file['name'], sprintf($this->options['duplicateSuffix'], $suffix));

		if (!$this->allowCreate($dir, $name, ($file['mime'] === 'directory'))) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}

		return ($path = $this->copy($path, $dir, $name)) == false
			? false
			: $this->stat($path);
	}

	/**
	 * Save uploaded file.
	 * On success return array with new file stat and with removed file hash (if existed file was replaced)
	 *
	 * @param  Resource $fp file pointer
	 * @param  string $dst destination folder hash
	 * @param $name
	 * @param  string $tmpname file tmp name - required to detect mime type
	 * @param  array $hashes exists files hash array with filename as key
	 * @return array|false
	 * @internal param string $src file name
	 * @author Dmitry (dio) Levashov
	 */
	public function upload($fp, $dst, $name, $tmpname, $hashes = array()) {
		if ($this->commandDisabled('upload')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if (($dir = $this->dir($dst)) == false) {
			return $this->setError(elFinder::ERROR_TRGDIR_NOT_FOUND, '#'.$dst);
		}

		if (empty($dir['write'])) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if (!$this->nameAccepted($name, false)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME);
		}
		
		$mimeByName = '';
		if ($this->mimeDetect === 'internal') {
			$mime = $this->mimetype($tmpname, $name);
		} else {
			$mime = $this->mimetype($tmpname, $name);
			$mimeByName = $this->mimetype($name, true);
			if ($mime === 'unknown') {
				$mime = $mimeByName;
			}
		}

		if (!$this->allowPutMime($mime) || ($mimeByName && !$this->allowPutMime($mimeByName))) {
			return $this->setError(elFinder::ERROR_UPLOAD_FILE_MIME, '(' . $mime . ')');
		}

		$tmpsize = sprintf('%u', filesize($tmpname));
		if ($this->uploadMaxSize > 0 && $tmpsize > $this->uploadMaxSize) {
			return $this->setError(elFinder::ERROR_UPLOAD_FILE_SIZE);
		}

		$dstpath = $this->decode($dst);
		if (isset($hashes[$name])) {
			$test = $this->decode($hashes[$name]);
			$file = $this->stat($test);
		} else {
			$test = $this->joinPathCE($dstpath, $name);
			$file = $this->isNameExists($test);
		}
		
		$this->clearcache();
		
		if ($file && $file['name'] === $name) { // file exists and check filename for item ID based filesystem
			if ($this->uploadOverwrite) {
				if (!$file['write']) {
					return $this->setError(elFinder::ERROR_PERM_DENIED);
				} elseif ($file['mime'] == 'directory') {
					return $this->setError(elFinder::ERROR_NOT_REPLACE, $name);
				} 
				$this->remove($test);
			} else {
				$name = $this->uniqueName($dstpath, $name, '-', false);
			}
		}
		
		$stat = array(
			'mime'   => $mime, 
			'width'  => 0, 
			'height' => 0, 
			'size'   => $tmpsize);
		
		// $w = $h = 0;
		if (strpos($mime, 'image') === 0 && ($s = getimagesize($tmpname))) {
			$stat['width'] = $s[0];
			$stat['height'] = $s[1];
		}
		// $this->clearcache();
		if (($path = $this->saveCE($fp, $dstpath, $name, $stat)) == false) {
			return false;
		}
		
		$stat = $this->stat($path);
		// Try get URL
		if (empty($stat['url']) && ($url = $this->getContentUrl($stat['hash']))) {
			$stat['url'] = $url;
		}

		return $stat;
	}

	/**
	 * Paste files
	 *
	 * @param  Object $volume source volume
	 * @param $src
	 * @param  string $dst destination dir hash
	 * @param  bool $rmSrc remove source after copy?
	 * @param array $hashes
	 * @return array|false
	 * @internal param string $source file hash
	 * @author Dmitry (dio) Levashov
	 */
	public function paste($volume, $src, $dst, $rmSrc = false, $hashes = array()) {
		$err = $rmSrc ? elFinder::ERROR_MOVE : elFinder::ERROR_COPY;
		
		if ($this->commandDisabled('paste')) {
			return $this->setError($err, '#'.$src, elFinder::ERROR_PERM_DENIED);
		}

		if (($file = $volume->file($src, $rmSrc)) == false) {
			return $this->setError($err, '#'.$src, elFinder::ERROR_FILE_NOT_FOUND);
		}

		$name = $file['name'];
		$errpath = $volume->path($file['hash']);
		
		if (($dir = $this->dir($dst)) == false) {
			return $this->setError($err, $errpath, elFinder::ERROR_TRGDIR_NOT_FOUND, '#'.$dst);
		}
		
		if (!$dir['write'] || !$file['read']) {
			return $this->setError($err, $errpath, elFinder::ERROR_PERM_DENIED);
		}

		$destination = $this->decode($dst);

		if (($test = $volume->closest($src, $rmSrc ? 'locked' : 'read', $rmSrc))) {
			return $rmSrc
				? $this->setError($err, $errpath, elFinder::ERROR_LOCKED, $volume->path($test))
				: $this->setError($err, $errpath, empty($file['thash'])? elFinder::ERROR_PERM_DENIED : elFinder::ERROR_MKOUTLINK);
		}

		if (isset($hashes[$name])) {
			$test = $this->decode($hashes[$name]);
			$stat = $this->stat($test);
		} else {
			$test = $this->joinPathCE($destination, $name);
			$stat = $this->isNameExists($test);
		}
		$this->clearcache();
		$dstDirExists = false;
		if ($stat && $stat['name'] === $name) { // file exists and check filename for item ID based filesystem
			if ($this->options['copyOverwrite']) {
				// do not replace file with dir or dir with file
				if (!$this->isSameType($file['mime'], $stat['mime'])) {
					return $this->setError(elFinder::ERROR_NOT_REPLACE, $this->path($stat['hash']));
				}
				// existed file is not writable
				if (empty($stat['write'])) {
					return $this->setError($err, $errpath, elFinder::ERROR_PERM_DENIED);
				}
				if ($this->options['copyJoin']) {
					if (!empty($stat['locked'])) {
						return $this->setError(elFinder::ERROR_LOCKED, $this->path($stat['hash']));
					}
				} else {
					// existed file locked or has locked child
					if (($locked = $this->closestByAttr($test, 'locked', true))) {
						$stat = $this->stat($locked);
						return $this->setError(elFinder::ERROR_LOCKED, $this->path($stat['hash']));
					}
				}
				// target is entity file of alias
				if ($volume === $this && ((isset($file['target']) && $test == $file['target']) || $test == $this->decode($src))) {
					return $this->setError(elFinder::ERROR_REPLACE, $errpath);
				}
				// remove existed file
				if (! $this->options['copyJoin'] || $stat['mime'] !== 'directory') {
					if (! $this->remove($test)) {
						return $this->setError(elFinder::ERROR_REPLACE, $this->path($stat['hash']));
					}
				} else if ($stat['mime'] === 'directory') {
					$dstDirExists = true;
				}
			} else {
				$name = $this->uniqueName($destination, $name, ' ', false);
			}
		}
		
		// copy/move inside current volume
		if ($volume === $this) { //  changing == operand to === fixes issue #1285 - Paul Canning 24/03/2016
			$source = $this->decode($src);
			// do not copy into itself
			if ($this->inpathCE($destination, $source)) {
				return $this->setError(elFinder::ERROR_COPY_INTO_ITSELF, $errpath);
			}
			$rmDir = false;
			if ($rmSrc) {
				if ($dstDirExists) {
					$rmDir = true;
					$method = 'copy';
				} else {
					$method = 'move';
				}
			} else {
				$method = 'copy';
			}
			$this->clearcache();
			if ($res = ($path = $this->$method($source, $destination, $name)) ? $this->stat($path) : false) {
				if ($rmDir) {
					$this->remove($source);
				}
			} else {
				return false;
			}
		} else {
			// copy/move from another volume
			if (!$this->options['copyTo'] || !$volume->copyFromAllowed()) {
				return $this->setError(elFinder::ERROR_COPY, $errpath, elFinder::ERROR_PERM_DENIED);
			}
			
			$this->error = array();
			if (($path = $this->copyFrom($volume, $src, $destination, $name)) == false) {
				return false;
			}
			
			if ($rmSrc && !$this->error()) {
				if (!$volume->rm($src)) {
					if ($volume->file($src)) {
						$this->addError(elFinder::ERROR_RM_SRC);
					} else {
						$this->removed[] = $file;
					}
				}
			}
			$res = $this->stat($path);
		}
		return $res;
	}
	
	/**
	 * Return path to archive of target items
	 * 
	 * @param  array  $hashes
	 * @return string archive path
	 * @author Naoki Sawada
	 */
	public function zipdl($hashes) {
		if ($this->commandDisabled('zipdl')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		$archivers = $this->getArchivers();
		$cmd = null;
		if (!$archivers || empty($archivers['create'])) {
			return false;
		}
		$archivers = $archivers['create'];
		if (!$archivers) {
			return false;
		}
		foreach(array('zip', 'tgz') as $ext) {
			$mime = $this->mimetype('file.'.$ext, true);
			if (isset($archivers[$mime])) {
				$cmd = $archivers[$mime];
				break;
			}
		}
		if (!$cmd) {
			$cmd = array_shift($archivers);
			$mime = $this->mimetype('file.'.$ext, true);
		}
		$ext = $cmd['ext'];
		$res = false;
		$mixed = false;
		$hashes = array_values($hashes);
		$dirname = dirname(str_replace($this->separator, DIRECTORY_SEPARATOR, $this->path($hashes[0])));
		$cnt = count($hashes);
		if ($cnt > 1) {
			for($i = 1; $i < $cnt; $i++) {
				if ($dirname !== dirname(str_replace($this->separator, DIRECTORY_SEPARATOR, $this->path($hashes[$i])))) {
					$mixed = true;
					break;
				}
			}
		}
		if ($mixed || $this->root == $this->dirnameCE($this->decode($hashes[0]))) {
			$prefix = $this->rootName;
		} else {
			$prefix = basename($dirname);
		}
		if ($dir = $this->getItemsInHand($hashes)) {
			$tmppre = (substr(PHP_OS, 0, 3) === 'WIN')? 'zdl' : 'elfzdl';
			$pdir = dirname($dir);
			// garbage collection (expire 2h)
			register_shutdown_function(array('elFinder', 'GlobGC'), $pdir.DIRECTORY_SEPARATOR.$tmppre.'*', 7200);
			$files = self::localScandir($dir);
			if ($files && ($arc = tempnam($dir, $tmppre))) {
				unlink($arc);
				$arc = $arc.'.'.$ext;
				$name = basename($arc);
				if ($arc = $this->makeArchive($dir, $files, $name, $cmd)) {
					$file = tempnam($pdir, $tmppre);
					unlink($file);
					$res = rename($arc, $file);
					$this->rmdirRecursive($dir);
				}
			}
		}
		return $res? array('path' => $file, 'ext' => $ext, 'mime' => $mime, 'prefix' => $prefix) : false;
	}
	
	/**
	 * Return file contents
	 *
	 * @param  string  $hash  file hash
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function getContents($hash) {
		$file = $this->file($hash);
		
		if (!$file) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
		
		if ($file['mime'] == 'directory') {
			return $this->setError(elFinder::ERROR_NOT_FILE);
		}
		
		if (!$file['read']) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if ($this->getMaxSize > 0 && $file['size'] > $this->getMaxSize) {
			return $this->setError(elFinder::ERROR_UPLOAD_FILE_SIZE);
		}
		
		return $file['size']? $this->_getContents($this->convEncIn($this->decode($hash), true)) : '';
	}
	
	/**
	 * Put content in text file and return file info.
	 *
	 * @param  string  $hash     file hash
	 * @param  string  $content  new file content
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function putContents($hash, $content) {
		if ($this->commandDisabled('edit')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		$path = $this->decode($hash);
		
		if (!($file = $this->file($hash))) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
		
		if (!$file['write']) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		// check data cheme
		if (preg_match('~^\0data:(.+?/.+?);base64,~', $content, $m)) {
			$dMime =$m[1];
			if ($file['size'] > 0 && $dMime !== $file['mime']) {
				return $this->setError(elFinder::ERROR_PERM_DENIED);
			}
			$content = base64_decode(substr($content, strlen($m[0])));
		}
		
		// check MIME
		$name = $this->basenameCE($path);
		$mime = '';
		$mimeByName = $this->mimetype($name, true);
		if ($this->mimeDetect !== 'internal') {
			if ($tp = $this->tmpfile()) {
				fwrite($tp, $content);
				$info = stream_get_meta_data($tp);
				$filepath = $info['uri'];
				$mime = $this->mimetype($filepath, $name);
				fclose($tp);
			}
		}
		if (!$this->allowPutMime($mimeByName) || ($mime && !$this->allowPutMime($mime))) {
			return $this->setError(elFinder::ERROR_UPLOAD_FILE_MIME);
		}
		
		$this->clearcache();
		$res = false;
		if ($this->convEncOut($this->_filePutContents($this->convEncIn($path), $content))) {
			$this->clearstatcache();
			$res = $this->stat($path);
		}
		return $res;
	}

	/**
	 * Extract files from archive
	 *
	 * @param  string $hash archive hash
	 * @param null $makedir
	 * @return array|bool
	 * @author Dmitry (dio) Levashov,
	 * @author Alexey Sukhotin
	 */
	public function extract($hash, $makedir = null) {
		if ($this->commandDisabled('extract')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if (($file = $this->file($hash)) == false) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
		
		$archiver = isset($this->archivers['extract'][$file['mime']])
			? $this->archivers['extract'][$file['mime']]
			: false;
			
		if (!$archiver) {
			return $this->setError(elFinder::ERROR_NOT_ARCHIVE);
		}
		
		$path   = $this->decode($hash);
		$parent = $this->stat($this->dirnameCE($path));

		if (!$file['read'] || !$parent['write']) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		$this->clearcache();
		$this->extractToNewdir = is_null($makedir)? 'auto' : (bool)$makedir;
		
		if ($path = $this->convEncOut($this->_extract($this->convEncIn($path), $archiver))) {
			if (is_array($path)) {
				foreach ($path as $_k => $_p) {
					$path[$_k] = $this->stat($_p);
				}
			} else {
				$path = $this->stat($path);
			}
			return $path;
		} else {
			return false;
		}
	}

	/**
	 * Add files to archive
	 *
	 * @param $hashes
	 * @param $mime
	 * @param string $name
	 * @return array|bool
	 */
	public function archive($hashes, $mime, $name = '') {
		if ($this->commandDisabled('archive')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}

		if ($name !== '' && !$this->nameAccepted($name, false)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME);
		}

		$archiver = isset($this->archivers['create'][$mime])
			? $this->archivers['create'][$mime]
			: false;
			
		if (!$archiver) {
			return $this->setError(elFinder::ERROR_ARCHIVE_TYPE);
		}
		
		$files = array();
		$useRemoteArchive = !empty($this->options['useRemoteArchive']);

		foreach ($hashes as $hash) {
			if (($file = $this->file($hash)) == false) {
				return $this->setError(elFinder::ERROR_FILE_NOT_FOUND, '#'+$hash);
			}
			if (!$file['read']) {
				return $this->setError(elFinder::ERROR_PERM_DENIED);
			}
			$path = $this->decode($hash);
			if (!isset($dir)) {
				$dir = $this->dirnameCE($path);
				$stat = $this->stat($dir);
				if (!$stat['write']) {
					return $this->setError(elFinder::ERROR_PERM_DENIED);
				}
			}
			
			$files[] = $useRemoteArchive? $hash : $this->basenameCE($path);
		}
		
		if ($name === '') {
			$name = count($files) == 1 ? $files[0] : 'Archive';
		} else {
			$name = str_replace(array('/', '\\'), '_', preg_replace('/\.' . preg_quote($archiver['ext'], '/') . '$/i', '', $name));
		}
		$name .='.' . $archiver['ext'];
		$name = $this->uniqueName($dir, $name, '');
		$this->clearcache();
		if ($useRemoteArchive) {
			return ($path = $this->remoteArchive($files, $name, $archiver)) ? $this->stat($path) : false;
		} else {
			return ($path = $this->convEncOut($this->_archive($this->convEncIn($dir), $this->convEncIn($files), $this->convEncIn($name), $archiver))) ? $this->stat($path) : false;
		}
	}

	/**
	 * Create an archive from remote items 
	 *
	 * @param      string   $hashes  files hashes list
	 * @param      string   $name    archive name
	 * @param      string   $arc     archiver options
	 * @return     string|boolean  path of created archive
	 */
	protected function remoteArchive($hashes, $name, $arc) {
		$resPath = false;
		$file0 = $this->file($hashes[0]);
		if ($file0 && ($dir = $this->getItemsInHand($hashes))) {
			$files = self::localScandir($dir);
			if ($files) {
				if ($arc = $this->makeArchive($dir, $files, $name, $arc)) {
					if ($fp = fopen($arc, 'rb')) {
						$path = $this->decode($file0['phash']);
						$stat = array();
						$resPath = $this->saveCE($fp, $path, $name, $stat);
						fclose($fp);
					}
				}
			}
			$this->rmdirRecursive($dir);
		}
		return $resPath;
	}
	
	/**
	 * Resize image
	 *
	 * @param  string   $hash    image file
	 * @param  int      $width   new width
	 * @param  int      $height  new height
	 * @param  int      $x       X start poistion for crop
	 * @param  int      $y       Y start poistion for crop
	 * @param  string   $mode    action how to mainpulate image
	 * @param  string   $bg      background color
	 * @param  int      $degree  rotete degree
	 * @param  int      $jpgQuality  JEPG quality (1-100)
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 * @author nao-pon
	 * @author Troex Nevelin
	 **/
	public function resize($hash, $width, $height, $x, $y, $mode = 'resize', $bg = '', $degree = 0, $jpgQuality = null) {
		if ($this->commandDisabled('resize')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if ($mode === 'rotate' && $degree == 0) {
			return array('losslessRotate' => ($this->procExec(ELFINDER_EXIFTRAN_PATH . ' -h') === 0 || $this->procExec(ELFINDER_JPEGTRAN_PATH . ' -version') === 0));
		}
		
		if (($file = $this->file($hash)) == false) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
		
		if (!$file['write'] || !$file['read']) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		$path = $this->decode($hash);
		
		$work_path = $this->getWorkFile($this->encoding? $this->convEncIn($path, true) : $path);

		if (!$work_path || !is_writable($work_path)) {
			if ($work_path && $path !== $work_path && is_file($work_path)) {
				unlink($work_path);
			}
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}

		if ($this->imgLib !== 'imagick' && $this->imgLib !== 'convert') {
			if (elFinder::isAnimationGif($work_path)) {
				return $this->setError(elFinder::ERROR_UNSUPPORT_TYPE);
			}
		}

		if (elFinder::isAnimationPng($work_path)) {
			return $this->setError(elFinder::ERROR_UNSUPPORT_TYPE);
		}

		switch($mode) {
			
			case 'propresize':
				$result = $this->imgResize($work_path, $width, $height, true, true, null, $jpgQuality);
				break;

			case 'crop':
				$result = $this->imgCrop($work_path, $width, $height, $x, $y, null, $jpgQuality);
				break;

			case 'fitsquare':
				$result = $this->imgSquareFit($work_path, $width, $height, 'center', 'middle', ($bg ? $bg : $this->options['tmbBgColor']), null, $jpgQuality);
				break;

			case 'rotate':
				$result = $this->imgRotate($work_path, $degree, ($bg ? $bg : $this->options['bgColorFb']), null, $jpgQuality);
				break;

			default:
				$result = $this->imgResize($work_path, $width, $height, false, true, null, $jpgQuality);
				break;
		}
		
		$ret = false;
		if ($result) {
			$this->rmTmb($file);
			$this->clearstatcache();
			$fstat = stat($work_path);
			$imgsize = getimagesize($work_path);
			if ($path !== $work_path) {
				$file['size'] = $fstat['size'];
				$file['ts'] = $fstat['mtime'];
				if ($imgsize) {
					$file['width'] = $imgsize[0];
					$file['height'] = $imgsize[1];
				}
				if ($fp = fopen($work_path, 'rb')) {
					$ret = $this->saveCE($fp, $this->dirnameCE($path), $this->basenameCE($path), $file);
					fclose($fp);
				}
			} else {
				$ret = true;
			}
			if ($ret) {
				$this->clearcache();
				$ret = $this->stat($path);
				if ($imgsize) {
					$ret['width'] = $imgsize[0];
					$ret['height'] = $imgsize[1];
				}
			}
		}
		if ($path !== $work_path) {
			is_file($work_path) && unlink($work_path);
		}
		
		return $ret;
	}
	
	/**
	 * Remove file/dir
	 *
	 * @param  string  $hash  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function rm($hash) {
		return $this->commandDisabled('rm')
			? $this->setError(elFinder::ERROR_PERM_DENIED)
			: $this->remove($this->decode($hash));
	}

	/**
	 * Search files
	 *
	 * @param  string $q search string
	 * @param  array $mimes
	 * @param null $hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 */
	public function search($q, $mimes, $hash = null) {
		$res = array();
		$matchMethod = null;
		$args = func_get_args();
		if (!empty($args[3])) {
			$matchMethod = 'searchMatch' . $args[3];
			if (! is_callable(array($this, $matchMethod))) {
				return array();
			}
		}

		$dir = null;
		if ($hash) {
			$dir = $this->decode($hash);
			$stat = $this->stat($dir);
			if (!$stat || $stat['mime'] !== 'directory' || !$stat['read']) {
				$q = '';
			}
		}
		if ($mimes && $this->onlyMimes) {
			$mimes = array_intersect($mimes, $this->onlyMimes);
			if (!$mimes) {
				$q = '';
			}
		}
		$this->searchStart = time();
		
		$qs = preg_split('/"([^"]+)"| +/', $q, -1, PREG_SPLIT_NO_EMPTY|PREG_SPLIT_DELIM_CAPTURE);
		$query = $excludes = array();
		foreach($qs as $_q) {
			$_q = trim($_q);
			if ($_q !== '') {
				if ($_q[0] === '-') {
					if (isset($_q[1])) {
						$excludes[] = substr($_q, 1);
					}
				} else {
					$query[] = $_q;
				}
			}
		}
		if (! $query) {
			$q = '';
		} else {
			$q = join(' ', $query);
			$this->doSearchCurrentQuery = array(
				'q' => $q,
				'excludes' => $excludes,
				'matchMethod' => $matchMethod
			);
		}
		
		if ($q === '' || $this->commandDisabled('search')) {
			return $res;
		}

		// valided regex $this->options['searchExDirReg']
		if ($this->options['searchExDirReg']) {
			if (false === preg_match($this->options['searchExDirReg'], '')) {
				$this->options['searchExDirReg'] = '';
			}
		}
		
		// check the leaf root too
		if (!$mimes && (is_null($dir) || $dir == $this->root)) {
			$rootStat = $this->stat($this->root);
			if (!empty($rootStat['phash'])) {
				if ($this->stripos($rootStat['name'], $q) !== false) {
					$res = array($rootStat);
				}
			}
		}

		return array_merge($res, $this->doSearch(is_null($dir)? $this->root : $dir, $q, $mimes));
	}
	
	/**
	 * Return image dimensions
	 *
	 * @param  string  $hash  file hash
	 * @return array|string
	 * @author Dmitry (dio) Levashov
	 **/
	public function dimensions($hash) {
		if (($file = $this->file($hash)) == false) {
			return false;
		}
		if (func_num_args() > 1) {
			$args = func_get_arg(1);
		} else {
			$args = array();
		}
		return $this->convEncOut($this->_dimensions($this->convEncIn($this->decode($hash)), $file['mime'], $args));
	}
	
	/**
	 * Return has subdirs
	 *
	 * @param  string  $hash  file hash
	 * @return bool
	 * @author Naoki Sawada
	 **/
	public function subdirs($hash) {
		return (bool) $this->subdirsCE($this->decode($hash));
	}
	
	/**
	 * Return content URL (for netmout volume driver)
	 * If file.url == 1 requests from JavaScript client with XHR
	 * 
	 * @param string $hash  file hash
	 * @param array $options  options array
	 * @return boolean|string
	 * @author Naoki Sawada
	 */
	public function getContentUrl($hash, $options = array()) {
		if (($file = $this->file($hash)) === false) {
			return false;
		}
		if (empty($file['url']) && $this->URL) {
			$path = str_replace($this->separator, '/', substr($this->decode($hash), strlen(rtrim($this->root, '/'.$this->separator)) + 1));
			if ($this->encoding) {
				$path = $this->convEncIn($path, true);
			}
			$path = str_replace('%2F', '/', rawurlencode($path));
			return $this->URL . $path;
		} else {
			$ret = false;
			if  ($file['url'] && $file['url'] != 1) {
				return $file['url'];
			} else if (!empty($options['temporary']) && ($tempInfo = $this->getTempLinkInfo('temp_' . md5($hash)))) {
				if ($source = $this->open($hash)) {
					if ($dest = fopen($tempInfo['path'], 'wb')) {
						if (stream_copy_to_stream($source, $dest)) {
							$ret = $tempInfo['url'];
						}
						fclose($dest);
					}
					$this->close($source, $hash);
				}
			}
			return $ret;
		}
	}
	
	/**
	 * Get temporary contents link infomation
	 * 
	 * @param string $name
	 * @return boolean|array
	 * @author Naoki Sawada
	 */
	public function getTempLinkInfo($name = null) {
		if ($this->tmpLinkPath) {
			if (! $name) {
				$name = 'temp_' . md5($_SERVER['REMOTE_ADDR'] . (string)microtime(true));
			} else if (substr($name, 0, 5) !== 'temp_') {
				$name = 'temp_' . $name;
			}
			register_shutdown_function(array('elFinder', 'GlobGC'), $this->tmpLinkPath . DIRECTORY_SEPARATOR . 'temp_*', elFinder::$tmpLinkLifeTime);
			return array(
				'path' => $path = $this->tmpLinkPath . DIRECTORY_SEPARATOR . $name,
				'url'  => $this->tmpLinkUrl . '/' . $name
			);
		}
		return false;
	}
	
	/**
	 * Get URL of substitute image by request args `substitute` or 4th argument $maxSize
	 * 
	 * @param string   $target  Target hash
	 * @param array    $srcSize Size info array [width, height]
	 * @param resource $srcfp   Source file file pointer
	 * @param integer  $maxSize Maximum pixel of substitute image
	 * @return boolean
	 */
	public function getSubstituteImgLink($target, $srcSize, $srcfp = null, $maxSize = null) {
		$url = false;
		if (! $maxSize) {
			$args = elFinder::$currentArgs;
			if (! empty($args['substitute'])) {
				$maxSize = $args['substitute'];
			}
		}
		if ($maxSize && $srcSize[0] && $srcSize[1]) {
			if ($this->getOption('substituteImg')) {
				$maxSize = intval($maxSize);
				$zoom = min(($maxSize/$srcSize[0]),($maxSize/$srcSize[1]));
				if ($zoom < 1) {
					$width = round($srcSize[0] * $zoom);
					$height = round($srcSize[1] * $zoom);
					$jpgQuality = 50;
					$preserveExif = false;
					$unenlarge = true;
					$checkAnimated = true;
					if (! $srcfp) {
						elFinder::checkAborted();
						$srcfp = $this->open($target);
					}
					if ($srcfp && ($tempLink = $this->getTempLinkInfo())) {
						elFinder::checkAborted();
						$dest = fopen($tempLink['path'], 'wb');
						if ($dest && stream_copy_to_stream($srcfp, $dest)) {
							fclose($dest);
							if ($this->imageUtil('resize', $tempLink['path'], compact('width', 'height', 'jpgQuality', 'preserveExif', 'unenlarge', 'checkAnimated'))) {
								$url = $tempLink['url'];
								// set expire to 1 min left
								touch($tempLink['path'], time() - elFinder::$tmpLinkLifeTime + 60);
							} else {
								unlink($tempLink['path']);
							}
						}
						$this->close($srcfp, $target);
					}
				}
			}
		}
		
		return $url;
	}
	
	/**
	 * Return temp path
	 * 
	 * @return string
	 * @author Naoki Sawada
	 */
	public function getTempPath() {
		$tempPath = null;
		if (isset($this->tmpPath) && $this->tmpPath && is_writable($this->tmpPath)) {
			$tempPath = $this->tmpPath;
		} else if (isset($this->tmp) && $this->tmp && is_writable($this->tmp)) {
			$tempPath = $this->tmp;
		} else if (elFinder::getStaticVar('commonTempPath') && is_writable(elFinder::getStaticVar('commonTempPath'))) {
			$tempPath = elFinder::getStaticVar('commonTempPath');
		} else if (function_exists('sys_get_temp_dir')) {
			$tempPath = sys_get_temp_dir();
		} else if ($this->tmbPathWritable) {
			$tempPath = $this->tmbPath;
		}
		if ($tempPath && DIRECTORY_SEPARATOR !== '/') {
			$tempPath = str_replace('/', DIRECTORY_SEPARATOR, $tempPath);
		}
		return $tempPath;
	}
	
	/**
	 * (Make &) Get upload taget dirctory hash
	 * 
	 * @param string $baseTargetHash
	 * @param string $path
	 * @param array  $result
	 * @return boolean|string
	 * @author Naoki Sawada
	 */
	public function getUploadTaget($baseTargetHash, $path, & $result) {
		$base = $this->decode($baseTargetHash);
		$targetHash = $baseTargetHash;
		$path = ltrim($path, $this->separator);
		$dirs = explode($this->separator, $path);
		array_pop($dirs);
		foreach($dirs as $dir) {
			$targetPath = $this->joinPathCE($base, $dir);
			if (! $_realpath = $this->realpath($this->encode($targetPath))) {
				if ($stat = $this->mkdir($targetHash, $dir)) {
					$result['added'][] = $stat;
					$targetHash = $stat['hash'];
					$base = $this->decode($targetHash);
				} else {
					return false;
				}
			} else {
				$targetHash = $this->encode($_realpath);
				if ($this->dir($targetHash)) {
					$base = $this->decode($targetHash);
				} else {
					return false;
				}
			}
		}
		return $targetHash;
	}
	
	/**
	 * Return this uploadMaxSize value
	 * 
	 * @return integer
	 * @author Naoki Sawada
	 */
	public function getUploadMaxSize() {
		return $this->uploadMaxSize;
	}
	
	public function setUploadOverwrite($var) {
		$this->uploadOverwrite = (bool)$var;
	}
	
	/**
	 * Image file utility
	 * 
	 * @param string $mode     'resize', 'rotate', 'propresize', 'crop', 'fitsquare'
	 * @param string $src      Image file local path
	 * @param array  $options  excute options
	 * @return bool
	 * @author Naoki Sawada
	 */
	public function imageUtil($mode, $src, $options = array()) {
		if (! isset($options['jpgQuality'])) {
			$options['jpgQuality'] = intval($this->options['jpgQuality']);
		}
		if (! isset($options['bgcolor'])) {
			$options['bgcolor'] = '#ffffff';
		}
		if (! isset($options['bgColorFb'])) {
			$options['bgColorFb'] = $this->options['bgColorFb'];
		}
		
		// check 'width' ,'height'
		if (in_array($mode, array('resize', 'propresize', 'crop', 'fitsquare'))) {
			if (empty($options['width']) || empty($options['height'])) {
				return false;
			}
		}
		
		if (! empty($options['checkAnimated'])) {
			if ($this->imgLib !== 'imagick' && $this->imgLib !== 'convert') {
				if (elFinder::isAnimationGif($src)) {
					return false;
				}
			}
			if (elFinder::isAnimationPng($src)) {
				return false;
			}
		}
		
		switch($mode) {
			case 'rotate':
				if (empty($options['degree'])) {
					return true;
				}
				return (bool)$this->imgRotate($src, $options['degree'], $options['bgColorFb'], null, $options['jpgQuality']);
			
			case 'resize':
				return (bool)$this->imgResize($src, $options['width'], $options['height'], false, true, null, $options['jpgQuality'], $options);
			
			case 'propresize':
				return (bool)$this->imgResize($src, $options['width'], $options['height'], true, true, null, $options['jpgQuality'], $options);
			
			case 'crop':
				if (isset($options['x']) && isset($options['y'])) {
					return (bool)$this->imgCrop($src, $options['width'], $options['height'], $options['x'], $options['y'], null, $options['jpgQuality']);
				}
				break;
			
			case 'fitsquare':
				return (bool)$this->imgSquareFit($src, $options['width'], $options['height'], 'center', 'middle', $options['bgcolor'], null, $options['jpgQuality']);
			
		}
		return false;
	}
	
	/**
	 * Convert Video To Image by ffmpeg
	 * 
	 * @param  $file video source file path
	 * @param  $stat file stat array
	 * @param  $self volume driver object
	 * @param  $ss   start seconds
	 * @return bool
	 * @author Naoki Sawada
	 */
	public function ffmpegToImg($file, $stat, $self, $ss = null) {
		$name = basename($file);
		$path = dirname($file);
		$tmp = $path . DIRECTORY_SEPARATOR . md5($name);
		// register auto delete on shutdown
		$GLOBALS['elFinderTempFiles'][$tmp] = true;
		if (rename($file, $tmp)) {
			if ($ss === null) {
				// specific start time by file name (xxx^[sec].[extention] - video^3.mp4)
				if (preg_match('/\^(\d+(?:\.\d+)?)\.[^.]+$/', $stat['name'], $_m)) {
					$ss = $_m[1];
				} else {
					$ss = $this->options['tmbVideoConvSec'];
				}
			}
			$cmd = sprintf(ELFINDER_FFMPEG_PATH . ' -i %s -ss 00:00:%.3f -vframes 1 -f image2 %s', escapeshellarg($tmp), $ss, escapeshellarg($file));
			$r = ($this->procExec($cmd) === 0);
			clearstatcache();
			if ($r && $ss > 0 && ! file_exists($file)) {
				// Retry by half of $ss
				$ss = max(intval($ss / 2), 0);
				rename($tmp, $file);
				$r = $this->ffmpegToImg($file, $stat, $self, $ss);
			} else {
				unlink($tmp);
			}
			return $r;
		}
		return false;
	}

	/**
	 * Creates a temporary file and return file pointer
	 * 
	 * @return resource|boolean
	 */
	public function tmpfile() {
		if ($tmp = $this->getTempFile()) {
			return fopen($tmp, 'wb');
		}
		return false;
	}
	
	/**
	 * Save error message
	 *
	 * @param  array  error 
	 * @return false
	 * @author Naoki Sawada
	 **/
	protected function setError() {
		$this->error = array();
		$this->addError(func_get_args());
		return false;
	}
	
	/**
	 * Add error message
	 *
	 * @param  array  error 
	 * @return false
	 * @author Dmitry(dio) Levashov
	 **/
	protected function addError() {
		foreach (func_get_args() as $err) {
			if (is_array($err)) {
				$this->error = array_merge($this->error, $err);
			} else {
				$this->error[] = $err;
			}
		}
		return false;
	}
	
	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/
	
	/***************** server encoding support *******************/
	
	/**
	 * Return parent directory path (with convert encoding)
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Naoki Sawada
	 **/
	protected function dirnameCE($path) {
		$dirname = (!$this->encoding)? $this->_dirname($path) :	$this->convEncOut($this->_dirname($this->convEncIn($path)));
		// check to infinite loop prevention
		return ($dirname != $path)? $dirname : '';
	}
	
	/**
	 * Return file name (with convert encoding)
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Naoki Sawada
	 **/
	protected function basenameCE($path) {
		return (!$this->encoding)? $this->_basename($path) : $this->convEncOut($this->_basename($this->convEncIn($path)));
	}
	
	/**
	 * Join dir name and file name and return full path. (with convert encoding)
	 * Some drivers (db) use int as path - so we give to concat path to driver itself
	 *
	 * @param  string  $dir   dir path
	 * @param  string  $name  file name
	 * @return string
	 * @author Naoki Sawada
	 **/
	protected function joinPathCE($dir, $name) {
		return (!$this->encoding)? $this->_joinPath($dir, $name) : $this->convEncOut($this->_joinPath($this->convEncIn($dir), $this->convEncIn($name)));
	}
	
	/**
	 * Return normalized path (with convert encoding)
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Naoki Sawada
	 **/
	protected function normpathCE($path) {
		return (!$this->encoding)? $this->_normpath($path) : $this->convEncOut($this->_normpath($this->convEncIn($path)));
	}
	
	/**
	 * Return file path related to root dir (with convert encoding)
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Naoki Sawada
	 **/
	protected function relpathCE($path) {
		return (!$this->encoding)? $this->_relpath($path) : $this->convEncOut($this->_relpath($this->convEncIn($path)));
	}
	
	/**
	 * Convert path related to root dir into real path (with convert encoding)
	 *
	 * @param  string  $path  rel file path
	 * @return string
	 * @author Naoki Sawada
	 **/
	protected function abspathCE($path) {
		return (!$this->encoding)? $this->_abspath($path): $this->convEncOut($this->_abspath($this->convEncIn($path)));
	}
	
	/**
	 * Return true if $path is children of $parent (with convert encoding)
	 *
	 * @param  string  $path    path to check
	 * @param  string  $parent  parent path
	 * @return bool
	 * @author Naoki Sawada
	 **/
	protected function inpathCE($path, $parent) {
		return (!$this->encoding)? $this->_inpath($path, $parent) : $this->convEncOut($this->_inpath($this->convEncIn($path), $this->convEncIn($parent)));
	}

	/**
	 * Open file and return file pointer (with convert encoding)
	 *
	 * @param  string $path file path
	 * @param string $mode
	 * @return false|resource
	 * @internal param bool $write open file for writing
	 * @author Naoki Sawada
	 */
	protected function fopenCE($path, $mode='rb') {
		return (!$this->encoding)? $this->_fopen($path, $mode) : $this->convEncOut($this->_fopen($this->convEncIn($path), $mode));
	}
	
	/**
	 * Close opened file (with convert encoding)
	 * 
	 * @param  resource  $fp    file pointer
	 * @param  string    $path  file path
	 * @return bool
	 * @author Naoki Sawada
	 **/
	protected function fcloseCE($fp, $path='') {
		return (!$this->encoding)? $this->_fclose($fp, $path) : $this->convEncOut($this->_fclose($fp, $this->convEncIn($path)));
	}
	
	/**
	 * Create new file and write into it from file pointer. (with convert encoding)
	 * Return new file path or false on error.
	 *
	 * @param  resource  $fp   file pointer
	 * @param  string    $dir  target dir path
	 * @param  string    $name file name
	 * @param  array     $stat file stat (required by some virtual fs)
	 * @return bool|string
	 * @author Naoki Sawada
	 **/
	protected function saveCE($fp, $dir, $name, $stat) {
		$res = (!$this->encoding)? $this->_save($fp, $dir, $name, $stat) : $this->convEncOut($this->_save($fp, $this->convEncIn($dir), $this->convEncIn($name), $this->convEncIn($stat)));
		if ($res !== false) {
			$this->clearstatcache();
		}
		return $res;
	}
	
	/**
	 * Return true if path is dir and has at least one childs directory (with convert encoding)
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Naoki Sawada
	 **/
	protected function subdirsCE($path) {
		if ($this->sessionCaching['subdirs']) {
			if (isset($this->sessionCache['subdirs'][$path]) && ! $this->isMyReload()) {
				return $this->sessionCache['subdirs'][$path];
			}
		}
		$hasdir = (bool) ((!$this->encoding)? $this->_subdirs($path) : $this->convEncOut($this->_subdirs($this->convEncIn($path))));
		$this->updateSubdirsCache($path, $hasdir);
		return $hasdir;
	}
	
	/**
	 * Return files list in directory (with convert encoding)
	 *
	 * @param  string  $path  dir path
	 * @return array
	 * @author Naoki Sawada
	 **/
	protected function scandirCE($path) {
		return (!$this->encoding)? $this->_scandir($path) : $this->convEncOut($this->_scandir($this->convEncIn($path)));
	}
	
	/**
	 * Create symlink (with convert encoding)
	 *
	 * @param  string  $source     file to link to
	 * @param  string  $targetDir  folder to create link in
	 * @param  string  $name       symlink name
	 * @return bool
	 * @author Naoki Sawada
	 **/
	protected function symlinkCE($source, $targetDir, $name) {
		return (!$this->encoding)? $this->_symlink($source, $targetDir, $name) : $this->convEncOut($this->_symlink($this->convEncIn($source), $this->convEncIn($targetDir), $this->convEncIn($name)));
	}
	
	/***************** paths *******************/
	
	/**
	 * Encode path into hash
	 *
	 * @param  string  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 * @author Troex Nevelin
	 **/
	protected function encode($path) {
		if ($path !== '') {

			// cut ROOT from $path for security reason, even if hacker decodes the path he will not know the root
			$p = $this->relpathCE($path);
			// if reqesting root dir $path will be empty, then assign '/' as we cannot leave it blank for crypt
			if ($p === '')	{
				$p = $this->separator;
			}
			// change separator
			if ($this->separatorForHash) {
				$p = str_replace($this->separator, $this->separatorForHash, $p);
			}
			// TODO crypt path and return hash
			$hash = $this->crypt($p);
			// hash is used as id in HTML that means it must contain vaild chars
			// make base64 html safe and append prefix in begining
			$hash = strtr(base64_encode($hash), '+/=', '-_.');
			// remove dots '.' at the end, before it was '=' in base64
			$hash = rtrim($hash, '.'); 
			// append volume id to make hash unique
			return $this->id.$hash;
		}
	    //TODO: Add return statement here
	}
	
	/**
	 * Decode path from hash
	 *
	 * @param  string  file hash
	 * @return string
	 * @author Dmitry (dio) Levashov
	 * @author Troex Nevelin
	 **/
	protected function decode($hash) {
		if (strpos($hash, $this->id) === 0) {
			// cut volume id after it was prepended in encode
			$h = substr($hash, strlen($this->id));
			// replace HTML safe base64 to normal
			$h = base64_decode(strtr($h, '-_.', '+/='));
			// TODO uncrypt hash and return path
			$path = $this->uncrypt($h);
			// change separator
			if ($this->separatorForHash) {
				$path = str_replace($this->separatorForHash, $this->separator, $path);
			}
			// append ROOT to path after it was cut in encode
			return $this->abspathCE($path);//$this->root.($path === $this->separator ? '' : $this->separator.$path); 
		}
	    //TODO: Add return statement here
	}
	
	/**
	 * Return crypted path 
	 * Not implemented
	 *
	 * @param  string  path
	 * @return mixed
	 * @author Dmitry (dio) Levashov
	 **/
	protected function crypt($path) {
		return $path;
	}
	
	/**
	 * Return uncrypted path 
	 * Not implemented
	 *
	 * @param  mixed  hash
	 * @return mixed
	 * @author Dmitry (dio) Levashov
	 **/
	protected function uncrypt($hash) {
		return $hash;
	}
	
	/**
	 * Validate file name based on $this->options['acceptedName'] regexp or function
	 *
	 * @param  string  $name  file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function nameAccepted($name, $isDir = false) {
		if (json_encode($name)===false) {
			return false;
		}
		$nameValidator = $isDir? $this->dirnameValidator : $this->nameValidator;
		if ($nameValidator) {
			if (is_callable($nameValidator)) {
				$res = call_user_func($nameValidator, $name);
				return $res;
			}
			if (preg_match($nameValidator, '') !== false) {
				return preg_match($nameValidator, $name);
			}
		}
		return true;
	}

	/**
	 * Return session rootstat cache key
	 * 
	 * @return string
	 */
	protected function getRootstatCachekey() {
		return md5($this->root.(isset($this->options['alias'])? $this->options['alias'] : ''));
	}

	/**
	 * Return new unique name based on file name and suffix
	 *
	 * @param $dir
	 * @param $name
	 * @param  string $suffix suffix append to name
	 * @param bool $checkNum
	 * @param int $start
	 * @return string
	 * @internal param string $path file path
	 * @author Dmitry (dio) Levashov
	 */
	public function uniqueName($dir, $name, $suffix = ' copy', $checkNum = true, $start = 1) {
		static $lasts = null;
		
		if ($lasts === null) {
			$lasts = array();
		}
		
		$ext = '';

		$splits = elFinder::splitFileExtention($name);
		if ($splits[1]) {
			$ext  = '.'.$splits[1];
			$name = $splits[0];
		} 
		
		if ($checkNum && preg_match('/('.preg_quote($suffix, '/').')(\d*)$/i', $name, $m)) {
			$i    = (int)$m[2];
			$name = substr($name, 0, strlen($name)-strlen($m[2]));
		} else {
			$i     = $start;
			$name .= $suffix;
		}
		$max = $i+100000;
		
		if (isset($lasts[$name])) {
			$i = max($i, $lasts[$name]);
		}

		while ($i <= $max) {
			$n = $name.($i > 0 ? sprintf($this->options['uniqueNumFormat'], $i) : '').$ext;

			if (!$this->isNameExists($this->joinPathCE($dir, $n))) {
				$this->clearcache();
				$lasts[$name] = ++$i;
				return $n;
			}
			$i++;
		}
		return $name.md5($dir).$ext;
	}
	
	/**
	 * Converts character encoding from UTF-8 to server's one
	 * 
	 * @param  mixed  $var           target string or array var
	 * @param  bool   $restoreLocale do retore global locale, default is false
	 * @param  string $unknown       replaces character for unknown
	 * @return mixed
	 * @author Naoki Sawada
	 */
	public function convEncIn($var = null, $restoreLocale = false, $unknown = '_') {
		return (!$this->encoding)? $var : $this->convEnc($var, 'UTF-8', $this->encoding, $this->options['locale'], $restoreLocale, $unknown);
	}
	
	/**
	 * Converts character encoding from server's one to UTF-8
	 * 
	 * @param  mixed  $var           target string or array var
	 * @param  bool   $restoreLocale do retore global locale, default is true
	 * @param  string $unknown       replaces character for unknown
	 * @return mixed
	 * @author Naoki Sawada
	 */
	public function convEncOut($var = null, $restoreLocale = true, $unknown = '_') {
		return (!$this->encoding)? $var : $this->convEnc($var, $this->encoding, 'UTF-8', $this->options['locale'], $restoreLocale, $unknown);
	}

	/**
	 * Converts character encoding (base function)
	 *
	 * @param  mixed $var target string or array var
	 * @param  string $from from character encoding
	 * @param  string $to to character encoding
	 * @param  string $locale local locale
	 * @param $restoreLocale
	 * @param  string $unknown replaces character for unknown
	 * @return mixed
	 */
	protected function convEnc($var, $from, $to, $locale, $restoreLocale, $unknown = '_') {
		if (strtoupper($from) !== strtoupper($to)) {
			if ($locale) {
				setlocale(LC_ALL, $locale);
			}
			if (is_array($var)) {
				$_ret = array();
				foreach($var as $_k => $_v) {
					$_ret[$_k] = $this->convEnc($_v, $from, $to, '', false, $unknown = '_');
				}
				$var = $_ret;
			} else {
				$_var = false;
				if (is_string($var)) {
					$_var = $var;
					if (false !== ($_var = iconv($from, $to.'//TRANSLIT', $_var))) {
						$_var = str_replace('?', $unknown, $_var);
					}
				}
				if  ($_var !== false) {
					$var = $_var;
				}
			}
			if ($restoreLocale) {
				setlocale(LC_ALL, elFinder::$locale);
			}
		}
		return $var;
	}
	
	/*********************** util mainly for inheritance class *********************/
	
	/**
	 * Get temporary filename. Tempfile will be removed when after script execution finishes or exit() is called.
	 * When needing the unique file to a path, give $path to parameter.
	 * 
	 * @param  string       $path for get unique file to a path
	 * @return string|false
	 * @author Naoki Sawada
	 */
	protected function getTempFile($path = '') {
		static $cache = array();
		static $rmfunc;
		
		$key = '';
		if ($path !== '') {
			$key = $this->id . '#' . $path;
			if (isset($cache[$key])) {
				return $cache[$key];
			}
		}
		
		if ($tmpdir = $this->getTempPath()) {
			$name = tempnam($tmpdir, 'ELF');
			if ($key) {
				$cache[$key] = $name;
			}
			// register auto delete on shutdown
			$GLOBALS['elFinderTempFiles'][$name] = true;
			return $name;
		}
		
		return false;
	}
	
	/**
	 * File path of local server side work file path
	 * 
	 * @param  string $path path need convert encoding to server encoding
	 * @return string
	 * @author Naoki Sawada
	 */
	protected function getWorkFile($path) {
		if ($wfp = $this->tmpfile()) {
			if ($fp = $this->_fopen($path)) {
				while(!feof($fp)) {
					fwrite($wfp, fread($fp, 8192));
				}
				$info = stream_get_meta_data($wfp);
				fclose($wfp);
				if ($info && ! empty($info['uri'])) {
					return $info['uri'];
				}
			}
		}
		return false;
	}
	
	/**
	 * Get image size array with `dimensions`
	 *
	 * @param string $path path need convert encoding to server encoding
	 * @param string $mime file mime type
	 * @return array|false
	 */
	public function getImageSize($path, $mime = '') {
		$size = false;
		if ($mime === '' || strtolower(substr($mime, 0, 5)) === 'image') {
			if ($work = $this->getWorkFile($path)) {
				if ($size = getimagesize($work)) {
					$size['dimensions'] = $size[0].'x'.$size[1];
					$srcfp = fopen($work, 'rb');
					$cArgs = elFinder::$currentArgs;
					if (!empty($cArgs['target']) && $subImgLink = $this->getSubstituteImgLink($cArgs['target'], $size, $srcfp)) {
						$size['url'] = $subImgLink;
					}
				}
			}
			is_file($work) && unlink($work);
		}
		return $size;
	}
	
	/**
	 * Delete dirctory trees
	 *
	 * @param string $localpath path need convert encoding to server encoding
	 * @return boolean
	 * @author Naoki Sawada
	 */
	protected function delTree($localpath) {
		foreach ($this->_scandir($localpath) as $p) {
			elFinder::checkAborted();
			$stat = $this->stat($this->convEncOut($p));
			$this->convEncIn();
			($stat['mime'] === 'directory')? $this->delTree($p) : $this->_unlink($p);
		}
		$res = $this->_rmdir($localpath);
		$res && $this->clearstatcache();
		return $res;
	}
	
	/**
	 * Copy items to a new temporary directory on the local server
	 * 
	 * @param  array  $hashes  target hashes
	 * @param  string $dir     destination directory (for recurcive)
	 * @param  string $canLink it can use link() (for recurcive)
	 * @return string|false    saved path name
	 * @author Naoki Sawada
	 */
	protected function getItemsInHand($hashes, $dir = null, $canLink = null) {
		static $totalSize = 0;
		if (is_null($dir)) {
			$totalSize = 0;
			if (! $tmpDir = $this->getTempPath()) {
				return false;
			}
			$dir = tempnam($tmpDir, 'elf');
			if (!unlink($dir) || !mkdir($dir, 0700, true)) {
				return false;
			}
			register_shutdown_function(array($this, 'rmdirRecursive'), $dir);
		}
		if (is_null($canLink)) {
			$canLink = ($this instanceof elFinderVolumeLocalFileSystem);
		}
		elFinder::checkAborted();
		$res = true;
		$files = array();
		foreach ($hashes as $hash) {
			if (($file = $this->file($hash)) == false) {
				continue;
			}
			if (!$file['read']) {
				continue;
			}
			
			$name = $file['name'];
			// for call from search results
			if (isset($files[$name])) {
				$name = preg_replace('/^(.*?)(\..*)?$/', '$1_'.$files[$name]++.'$2', $name);
			} else {
				$files[$name] = 1;
			}
			$target = $dir.DIRECTORY_SEPARATOR.$name;
			
			if ($file['mime'] === 'directory') {
				$chashes = array();
				$_files = $this->scandir($hash);
				foreach($_files as $_file) {
					if ($file['read']) {
						$chashes[] = $_file['hash'];
					}
				}
				if (($res = mkdir($target, 0700, true)) && $chashes) {
					$res = $this->getItemsInHand($chashes, $target, $canLink);
				}
				if (!$res) {
					break;
				}
				!empty($file['ts']) && touch($target, $file['ts']);
			} else {
				$path = $this->decode($hash);
				if (! $canLink || ! ($canLink = link($path, $target))) {
					if ($fp = $this->fopenCE($path)) {
						if ($tfp = fopen($target, 'wb')) {
							$totalSize += stream_copy_to_stream($fp, $tfp);
							fclose($tfp);
						}
						!empty($file['ts']) && touch($target, $file['ts']);
						$this->fcloseCE($fp, $path);
					}
				} else {
					$totalSize += filesize($path);
				}
				if ($this->options['maxArcFilesSize'] > 0 && $this->options['maxArcFilesSize'] < $totalSize) {
					$res = $this->setError(elFinder::ERROR_ARC_MAXSIZE);
				}
			}
		}
		return $res? $dir : false;
	}
	
	/*********************** file stat *********************/
	
	/**
	 * Check file attribute
	 *
	 * @param  string  $path  file path
	 * @param  string  $name  attribute name (read|write|locked|hidden)
	 * @param  bool    $val   attribute value returned by file system
	 * @param  bool    $isDir path is directory (true: directory, false: file)
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function attr($path, $name, $val=null, $isDir=null) {
		if (!isset($this->defaults[$name])) {
			return false;
		}
		
		$relpath = $this->relpathCE($path);
		if ($this->separator !== '/') {
			$relpath = str_replace($this->separator, '/', $relpath);
		}
		$relpath = '/' . $relpath;
		
		$perm = null;
		
		if ($this->access) {
			$perm = call_user_func($this->access, $name, $path, $this->options['accessControlData'], $this, $isDir, $relpath);
			if ($perm !== null) {
				return !!$perm;
			}
		}
		
		foreach($this->attributes as $attrs) {
			if (isset($attrs[$name]) && isset($attrs['pattern']) && preg_match($attrs['pattern'], $relpath)) {
				$perm = $attrs[$name];
				break;
			} 
		}
		
		return $perm === null ? (is_null($val)? $this->defaults[$name] : $val) : !!$perm;
	}

	/**
	 * Return true if file with given name can be created in given folder.
	 *
	 * @param string $dir parent dir path
	 * @param string $name new file name
	 * @param null $isDir
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 */
	protected function allowCreate($dir, $name, $isDir = null) {
		return $this->attr($this->joinPathCE($dir, $name), 'write', true, $isDir);
	}
	
	/**
	 * Return true if file MIME type can save with check uploadOrder config.
	 * 
	 * @param string $mime
	 * @return boolean
	 */
	protected function allowPutMime($mime) {
		// logic based on http://httpd.apache.org/docs/2.2/mod/mod_authz_host.html#order
		$allow  = $this->mimeAccepted($mime, $this->uploadAllow, null);
		$deny   = $this->mimeAccepted($mime, $this->uploadDeny,  null);
		$res = true; // default to allow
		if (strtolower($this->uploadOrder[0]) == 'allow') { // array('allow', 'deny'), default is to 'deny'
			$res = false; // default is deny
			if (!$deny && ($allow === true)) { // match only allow
				$res = true;
			}// else (both match | no match | match only deny) { deny }
		} else { // array('deny', 'allow'), default is to 'allow' - this is the default rule
			$res = true; // default is allow
			if (($deny === true) && !$allow) { // match only deny
				$res = false;
			} // else (both match | no match | match only allow) { allow }
		}
		return $res;
	}
	
	/**
	 * Return fileinfo 
	 *
	 * @param  string  $path  file cache
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function stat($path) {
		if ($path === false || is_null($path)) {
			return false;
		}
		$is_root = ($path == $this->root);
		if ($is_root) {
			$rootKey = $this->getRootstatCachekey();
			if ($this->sessionCaching['rootstat'] && !isset($this->sessionCache['rootstat'])) {
				$this->sessionCache['rootstat'] = array();
			}
			if (! isset($this->cache[$path]) && ! $this->isMyReload()) {
				// need $path as key for netmount/netunmount
				if ($this->sessionCaching['rootstat'] && isset($this->sessionCache['rootstat'][$rootKey])) {
					if ($ret = $this->sessionCache['rootstat'][$rootKey]) {
						if ($this->options['rootRev'] === $ret['rootRev']) {
							if (isset($this->options['phash'])) {
								$ret['isroot'] = 1;
								$ret['phash'] = $this->options['phash'];
							}
							return $ret;
						}
					}
				}
			}
		}
		$ret = isset($this->cache[$path])
			? $this->cache[$path]
			: $this->updateCache($path, $this->convEncOut($this->_stat($this->convEncIn($path))));
		if ($is_root && $this->sessionCaching['rootstat']) {
			if ($ret) {
				$this->rootModified = false;
				$this->sessionCache['rootstat'][$rootKey] = $ret;
				if (isset($this->options['phash'])) {
					$ret['isroot'] = 1;
					$ret['phash'] = $this->options['phash'];
				}
			} else {
				unset($this->sessionCache['rootstat'][$rootKey]);
			}
		}
		return $ret;
	}
	
	/**
	 * Get root stat extra key values
	 * 
	 * @return array stat extras
	 * @author Naoki Sawada
	 */
	protected function getRootStatExtra() {
		$stat = array();
		if ($this->rootName) {
			$stat['name'] = $this->rootName;
		}
		$stat['rootRev'] = $this->options['rootRev'];
		$stat['options'] = $this->options(null);
		return $stat;
	}
	
	/**
	 * Return fileinfo based on filename
	 * For item ID based path file system
	 * Please override if needed on each drivers
	 *
	 * @param  string  $path  file cache
	 * @return array
	 */
	protected function isNameExists($path) {
		return $this->stat($path);
	}
	
	/**
	 * Put file stat in cache and return it
	 *
	 * @param  string  $path   file path
	 * @param  array   $stat   file stat
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function updateCache($path, $stat) {
		if (empty($stat) || !is_array($stat)) {
			return $this->cache[$path] = array();
		}

		$stat['hash'] = $this->encode($path);

		$root = $path == $this->root;
		$parent = '';
		
		if ($root) {
			$stat = array_merge($stat, $this->getRootStatExtra());
		} else {
			if (!isset($stat['name']) || $stat['name'] === '') {
				$stat['name'] = $this->basenameCE($path);
			}
			if (empty($stat['phash'])) {
				$parent = $this->dirnameCE($path);
				$stat['phash'] = $this->encode($parent);
			} else {
				$parent = $this->decode($stat['phash']);
			}
		}
		
		// name check
		if (!$jeName = json_encode($stat['name'])) {
			return $this->cache[$path] = array();
		}
		// fix name if required
		if ($this->options['utf8fix'] && $this->options['utf8patterns'] && $this->options['utf8replace']) {
			$stat['name'] = json_decode(str_replace($this->options['utf8patterns'], $this->options['utf8replace'], $jeName));
		}
		
		
		if (empty($stat['mime'])) {
			$stat['mime'] = $this->mimetype($stat['name'], true);
		}
		
		// @todo move dateformat to client
		// $stat['date'] = isset($stat['ts'])
		// 	? $this->formatDate($stat['ts'])
		// 	: 'unknown';
			
		if (!isset($stat['size'])) {
			$stat['size'] = 'unknown';
		}	

		if ($isDir = ($stat['mime'] === 'directory')) {
			$stat['volumeid'] = $this->id;
		}
		
		$stat['read']  = intval($this->attr($path, 'read', isset($stat['read']) ? !!$stat['read'] : null, $isDir));
		$stat['write'] = intval($this->attr($path, 'write', isset($stat['write']) ? !!$stat['write'] : null, $isDir));
		if ($root) {
			$stat['locked'] = 1;
			if ($this->options['type'] !== '') {
				$stat['type'] = $this->options['type'];
			}
		} else {
			// lock when parent directory is not writable
			if (!isset($stat['locked'])) {
				$pstat = $this->stat($parent);
				if (isset($pstat['write']) && !$pstat['write']) {
					$stat['locked'] = true;
				}
			}
			if ($this->attr($path, 'locked', isset($stat['locked']) ? !!$stat['locked'] : null, $isDir)) {
				$stat['locked'] = 1;
			} else {
				unset($stat['locked']);
			}
		}

		if ($root) {
			unset($stat['hidden']);
		} elseif ($this->attr($path, 'hidden', isset($stat['hidden']) ? !!$stat['hidden'] : null, $isDir) 
		|| !$this->mimeAccepted($stat['mime'])) {
			$stat['hidden'] = 1;
		} else {
			unset($stat['hidden']);
		}
		
		if ($stat['read'] && empty($stat['hidden'])) {
			
			if ($isDir) {
				// caching parent's subdirs
				if ($parent) {
					$this->updateSubdirsCache($parent, true);
				}
				// for dir - check for subdirs
				if ($this->options['checkSubfolders']) {
					if (! isset($stat['dirs']) && intval($this->options['checkSubfolders']) === -1) {
						$stat['dirs'] = -1;
					}
					if (isset($stat['dirs'])) {
						if ($stat['dirs']) {
							if ($stat['dirs'] == -1) {
								$stat['dirs'] = ($this->sessionCaching['subdirs'] && isset($this->sessionCache['subdirs'][$path]))? (int)$this->sessionCache['subdirs'][$path] : -1;
							} else {
								$stat['dirs'] = 1;
							}
						} else {
							unset($stat['dirs']);
						}
					} elseif (!empty($stat['alias']) && !empty($stat['target'])) {
						$stat['dirs'] = isset($this->cache[$stat['target']])
							? intval(isset($this->cache[$stat['target']]['dirs']))
							: $this->subdirsCE($stat['target']);
						
					} elseif ($this->subdirsCE($path)) {
						$stat['dirs'] = 1;
					}
				} else {
					$stat['dirs'] = 1;
				}
				if ($this->options['dirUrlOwn'] === true) {
					$stat['url'] = '#elf_' . $stat['hash'];
				}
			} else {
				// for files - check for thumbnails
				$p = isset($stat['target']) ? $stat['target'] : $path;
				if ($this->tmbURL && !isset($stat['tmb']) && $this->canCreateTmb($p, $stat)) {
					$tmb = $this->gettmb($p, $stat);
					$stat['tmb'] = $tmb ? $tmb : 1;
				}
				
			}
			if (!isset($stat['url']) && $this->URL && $this->encoding) {
				$_path = str_replace($this->separator, '/', substr($path, strlen($this->root) + 1));
				$stat['url'] = rtrim($this->URL, '/') . '/' . str_replace('%2F', '/', rawurlencode((substr(PHP_OS, 0, 3) === 'WIN')? $_path : $this->convEncIn($_path, true)));
			}
		} else {
			if ($isDir) {
				unset($stat['dirs']);
			}
		}
		
		if (!empty($stat['alias']) && !empty($stat['target'])) {
			$stat['thash'] = $this->encode($stat['target']);
			//$this->cache[$stat['target']] = $stat;
			unset($stat['target']);
		}
		
		$this->cache[$path] = $stat;
		
		if ($root && $this->sessionCaching['rootstat']) {
			// to update session cache
			$this->stat($path);
		}
		
		return $stat;
	}
	
	/**
	 * Get stat for folder content and put in cache
	 *
	 * @param  string  $path
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function cacheDir($path) {
		$this->dirsCache[$path] = array();
		$hasDir = false;

		foreach ($this->scandirCE($path) as $p) {
			if (($stat = $this->stat($p)) && empty($stat['hidden'])) {
				if (! $hasDir && $stat['mime'] === 'directory') {
					$hasDir = true;
				}
				$this->dirsCache[$path][] = $p;
			}
		}
		
		$this->updateSubdirsCache($path, $hasDir);
	}
	
	/**
	 * Clean cache
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function clearcache() {
		$this->cache = $this->dirsCache = array();
	}

	/**
	 * Return file mimetype
	 *
	 * @param  string      $path file path
	 * @param  string|bool $name
	 * @return string
	 * @author Dmitry (dio) Levashov
	 */
	protected function mimetype($path, $name = '') {
		$type = '';
		$nameCheck = false;
		
		if ($name === '') {
			$name = $path;
		} else if ($name === true) {
			$name = $path;
			$nameCheck = true;
		}
		$ext = (false === $pos = strrpos($name, '.')) ? '' : substr($name, $pos + 1);
		$size = file_exists($path)? filesize($path) : -1;
		if (! $nameCheck && is_readable($path) && $size > 0) {
			// detecting by contents
			if ($this->mimeDetect === 'finfo') {
				$type = finfo_file($this->finfo, $path);
			} else if ($this->mimeDetect === 'mime_content_type') {
				$type = mime_content_type($path);
			}
			if ($type) {
				if ($ext && preg_match('~^application/(?:octet-stream|(?:x-)?zip)~', $type)) {
					// load default MIME table file "mime.types"
					if (!elFinderVolumeDriver::$mimetypesLoaded) {
						elFinderVolumeDriver::loadMimeTypes();
					}
					if (isset(elFinderVolumeDriver::$mimetypes[$ext])) {
						$type = elFinderVolumeDriver::$mimetypes[$ext];
					}
				} else if ($ext === 'js' && preg_match('~^text/~', $type)) {
					$type = 'text/javascript';
				}
			}
		}
		if (! $type) {
			// detecting by filename
			$type = elFinderVolumeDriver::mimetypeInternalDetect($name);
			if ($type === 'unknown' && $size === 0) {
				$type = 'text/plain';
			}
		}
		
		$type = explode(';', $type);
		$type = trim($type[0]);
		
		// mime type normalization
		$_checkKey = strtolower($ext.':'.$type);
		if (isset($this->options['mimeMap'][$_checkKey])) {
			$type = $this->options['mimeMap'][$_checkKey];
		} else {
			$_checkKey = strtolower($ext.':*');
			if (isset($this->options['mimeMap'][$_checkKey])) {
				$type = $this->options['mimeMap'][$_checkKey];
			} else {
				$_checkKey = strtolower('*:'.$type);
				if (isset($this->options['mimeMap'][$_checkKey])) {
					$type = $this->options['mimeMap'][$_checkKey];
				}
			}
		}
		
		return $type;
	}
	
	/**
	 * Load file of mime.types
	 *
	 * @param string  $mimeTypesFile  The mime types file
	 */
	static protected function loadMimeTypes($mimeTypesFile = '') {
		if (! elFinderVolumeDriver::$mimetypesLoaded) {
			elFinderVolumeDriver::$mimetypesLoaded = true;
			$file = false;
			if (!empty($mimeTypesFile) && file_exists($mimeTypesFile)) {
				$file = $mimeTypesFile;
			} elseif (elFinder::$defaultMimefile && file_exists(elFinder::$defaultMimefile)) {
				$file = elFinder::$defaultMimefile;
			} elseif (file_exists(dirname(__FILE__).DIRECTORY_SEPARATOR.'mime.types')) {
				$file = dirname(__FILE__).DIRECTORY_SEPARATOR.'mime.types';
			} elseif (file_exists(dirname(dirname(__FILE__)).DIRECTORY_SEPARATOR.'mime.types')) {
				$file = dirname(dirname(__FILE__)).DIRECTORY_SEPARATOR.'mime.types';
			}

			if ($file && file_exists($file)) {
				$mimecf = file($file);

				foreach ($mimecf as $line_num => $line) {
					if (!preg_match('/^\s*#/', $line)) {
						$mime = preg_split('/\s+/', $line, -1, PREG_SPLIT_NO_EMPTY);
						for ($i = 1, $size = count($mime); $i < $size ; $i++) {
							if (!isset(self::$mimetypes[$mime[$i]])) {
								self::$mimetypes[$mime[$i]] = $mime[0];
							}
						}
					}
				}
			}
		}
	}

	/**
	 * Detect file mimetype using "internal" method or Loading mime.types with $path = ''
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	static protected function mimetypeInternalDetect($path = '') {
		// load default MIME table file "mime.types"
		if (!elFinderVolumeDriver::$mimetypesLoaded) {
			elFinderVolumeDriver::loadMimeTypes();
		}
		$ext = '';
		if ($path) {
			$pinfo = pathinfo($path); 
			$ext   = isset($pinfo['extension']) ? strtolower($pinfo['extension']) : '';
		}
		return ($ext && isset(elFinderVolumeDriver::$mimetypes[$ext])) ? elFinderVolumeDriver::$mimetypes[$ext] : 'unknown';
	}
	
	/**
	 * Return file/total directory size
	 *
	 * @param  string  $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function countSize($path) {
		
		elFinder::checkAborted();
		
		$result = array('size' => 0, 'files' => 0, 'dirs' => 0);
		$stat = $this->stat($path);

		if (empty($stat) || !$stat['read'] || !empty($stat['hidden'])) {
			$result['size'] = 'unknown';
			return $result;
		}
		
		if ($stat['mime'] !== 'directory') {
			$result['size'] = intval($stat['size']);
			$result['files'] = 1;
			return $result;
		}
		
		$result['dirs'] = 1;
		$subdirs = $this->options['checkSubfolders'];
		$this->options['checkSubfolders'] = true;
		foreach ($this->getScandir($path) as $stat) {
			if ($isDir = ($stat['mime'] === 'directory' && $stat['read'])) {
				++$result['dirs'];
			} else {
				++$result['files'];
			}
			$res = $isDir
				? $this->countSize($this->decode($stat['hash'])) 
				: (isset($stat['size']) ? array('size' => intval($stat['size'])) : array());
			if (! empty($res['size']) && is_numeric($res['size'])) {
				$result['size'] += $res['size'];
			}
			if (! empty($res['files']) && is_numeric($res['files'])) {
				$result['files'] += $res['files'];
			}
			if (! empty($res['dirs']) && is_numeric($res['dirs'])) {
				$result['dirs'] += $res['dirs'];
				--$result['dirs'];
			}
		}
		$this->options['checkSubfolders'] = $subdirs;
		return $result;
	}
	
	/**
	 * Return true if all mimes is directory or files
	 *
	 * @param  string  $mime1  mimetype
	 * @param  string  $mime2  mimetype
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function isSameType($mime1, $mime2) {
		return ($mime1 == 'directory' && $mime1 == $mime2) || ($mime1 != 'directory' && $mime2 != 'directory');
	}
	
	/**
	 * If file has required attr == $val - return file path,
	 * If dir has child with has required attr == $val - return child path
	 *
	 * @param  string   $path  file path
	 * @param  string   $attr  attribute name
	 * @param  bool     $val   attribute value
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function closestByAttr($path, $attr, $val) {
		$stat = $this->stat($path);
		
		if (empty($stat)) {
			return false;
		}
		
		$v = isset($stat[$attr]) ? $stat[$attr] : false;
		
		if ($v == $val) {
			return $path;
		}

		return $stat['mime'] == 'directory'
			? $this->childsByAttr($path, $attr, $val) 
			: false;
	}
	
	/**
	 * Return first found children with required attr == $val
	 *
	 * @param  string   $path  file path
	 * @param  string   $attr  attribute name
	 * @param  bool     $val   attribute value
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function childsByAttr($path, $attr, $val) {
		foreach ($this->scandirCE($path) as $p) {
			if (($_p = $this->closestByAttr($p, $attr, $val)) != false) {
				return $_p;
			}
		}
		return false;
	}
	
	protected function isMyReload($target = '', $ARGtarget = '') {
		if ($this->rootModified || (! empty($this->ARGS['cmd']) && $this->ARGS['cmd'] === 'parents')) {
			return true;
		}
		if (! empty($this->ARGS['reload'])) {
			if ($ARGtarget === '') {
				$ARGtarget = isset($this->ARGS['target'])? $this->ARGS['target']
					: ((isset($this->ARGS['targets']) && is_array($this->ARGS['targets']) && count($this->ARGS['targets']) === 1)?
						$this->ARGS['targets'][0] : '');
			}
			if ($ARGtarget !== '') {
				$ARGtarget = strval($ARGtarget);
				if ($target === '') {
					return (strpos($ARGtarget, $this->id) === 0);
				} else {
					$target = strval($target);
					return ($target === $ARGtarget);
				}
			}
		}
		return false;
	}
	
	/**
	 * Update subdirs cache data
	 * 
	 * @param string $path
	 * @param bool   $subdirs
	 * 
	 * @returnv void
	 */
	protected function updateSubdirsCache($path, $subdirs) {
		if (isset($this->cache[$path])) {
			if ($subdirs) {
				$this->cache[$path]['dirs'] = 1;
			} else {
				unset($this->cache[$path]['dirs']);
			}
		}
		if ($this->sessionCaching['subdirs']) {
			$this->sessionCache['subdirs'][$path] = $subdirs;
		}
		if ($this->sessionCaching['rootstat'] && $path == $this->root) {
			unset($this->sessionCache['rootstat'][$this->getRootstatCachekey()]);
		}
	}
	
	/*****************  get content *******************/
	
	/**
	 * Return required dir's files info.
	 * If onlyMimes is set - return only dirs and files of required mimes
	 *
	 * @param  string  $path  dir path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function getScandir($path) {
		$files = array();
		
		!isset($this->dirsCache[$path]) && $this->cacheDir($path);

		foreach ($this->dirsCache[$path] as $p) {
			if (($stat = $this->stat($p)) && empty($stat['hidden'])) {
				$files[] = $stat;
			}
		}

		return $files;
	}


	/**
	 * Return subdirs tree
	 *
	 * @param  string $path parent dir path
	 * @param  int $deep tree deep
	 * @param string $exclude
	 * @return array
	 * @author Dmitry (dio) Levashov
	 */
	protected function gettree($path, $deep, $exclude='') {
		$dirs = array();
		
		!isset($this->dirsCache[$path]) && $this->cacheDir($path);

		foreach ($this->dirsCache[$path] as $p) {
			$stat = $this->stat($p);
			
			if ($stat && empty($stat['hidden']) && $p != $exclude && $stat['mime'] == 'directory') {
				$dirs[] = $stat;
				if ($deep > 0 && !empty($stat['dirs'])) {
					$dirs = array_merge($dirs, $this->gettree($p, $deep-1));
				}
			}
		}

		return $dirs;
	}	
		
	/**
	 * Recursive files search
	 *
	 * @param  string  $path   dir path
	 * @param  string  $q      search string
	 * @param  array   $mimes
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function doSearch($path, $q, $mimes) {
		$result = array();
		$matchMethod = empty($this->doSearchCurrentQuery['matchMethod'])? 'searchMatchName' : $this->doSearchCurrentQuery['matchMethod'];
		$timeout = $this->options['searchTimeout']? $this->searchStart + $this->options['searchTimeout'] : 0;
		if ($timeout && $timeout < time()) {
			$this->setError(elFinder::ERROR_SEARCH_TIMEOUT, $this->path($this->encode($path)));
			return $result;
		}
		
		foreach($this->scandirCE($path) as $p) {
			elFinder::extendTimeLimit($this->options['searchTimeout'] + 30);
			
			if ($timeout && ($this->error || $timeout < time())) {
				!$this->error && $this->setError(elFinder::ERROR_SEARCH_TIMEOUT, $this->path($this->encode($path)));
				break;
			}

			
			$stat = $this->stat($p);

			if (!$stat) { // invalid links
				continue;
			}

			if (!empty($stat['hidden']) || !$this->mimeAccepted($stat['mime'], $mimes)) {
				continue;
			}
			
			$name = $stat['name'];

			if ($this->doSearchCurrentQuery['excludes']) {
				foreach($this->doSearchCurrentQuery['excludes'] as $exclude) {
					if ($this->stripos($name, $exclude) !== false) {
						continue 2;
					}
				}
			}

			if ((!$mimes || $stat['mime'] !== 'directory') && $this->$matchMethod($name, $q, $p) !== false) {
				$stat['path'] = $this->path($stat['hash']);
				if ($this->URL && !isset($stat['url'])) {
					$path = str_replace($this->separator, '/', substr($p, strlen($this->root) + 1));
					if ($this->encoding) {
						$path = str_replace('%2F', '/', rawurlencode($this->convEncIn($path, true)));
					} else {
						$path = str_replace('%2F', '/', rawurlencode($path));
					}
					$stat['url'] = $this->URL . $path;
				}
				
				$result[] = $stat;
			}
			if ($stat['mime'] == 'directory' && $stat['read'] && !isset($stat['alias'])) {
				if (! $this->options['searchExDirReg'] || ! preg_match($this->options['searchExDirReg'], $p)) {
					$result = array_merge($result, $this->doSearch($p, $q, $mimes));
				}
			}
		}
		
		return $result;
	}
		
	/**********************  manuipulations  ******************/
		
	/**
	 * Copy file/recursive copy dir only in current volume.
	 * Return new file path or false.
	 *
	 * @param  string  $src   source path
	 * @param  string  $dst   destination dir path
	 * @param  string  $name  new file name (optionaly)
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function copy($src, $dst, $name) {
		
		elFinder::checkAborted();
		
		$srcStat = $this->stat($src);
		
		if (!empty($srcStat['thash'])) {
			$target = $this->decode($srcStat['thash']);
			if (!$this->inpathCE($target, $this->root)) {
				return $this->setError(elFinder::ERROR_COPY, $this->path($srcStat['hash']), elFinder::ERROR_MKOUTLINK);
			}
			$stat   = $this->stat($target);
			$this->clearcache();
			return $stat && $this->symlinkCE($target, $dst, $name)
				? $this->joinPathCE($dst, $name)
				: $this->setError(elFinder::ERROR_COPY, $this->path($srcStat['hash']));
		} 
		
		if ($srcStat['mime'] === 'directory') {
			$testStat = $this->isNameExists($this->joinPathCE($dst, $name));
			$this->clearcache();
			
			if (($testStat && $testStat['mime'] !== 'directory') || (! $testStat && ! $testStat = $this->mkdir($this->encode($dst), $name))) {
				return $this->setError(elFinder::ERROR_COPY, $this->path($srcStat['hash']));
			}
			
			$dst = $this->decode($testStat['hash']);
			
			foreach ($this->getScandir($src) as $stat) {
				if (empty($stat['hidden'])) {
					$name = $stat['name'];
					$_src = $this->decode($stat['hash']);
					if (! $this->copy($_src, $dst, $name)) {
						$this->remove($dst, true); // fall back
						return $this->setError($this->error, elFinder::ERROR_COPY, $this->_path($src));
					}
				}
			}
			
			$this->added[] = $testStat;
			
			return $dst;
		}

		if ($this->options['copyJoin']) {
			$test = $this->joinPathCE($dst, $name);
			if ($testStat = $this->isNameExists($test)) {
				$this->remove($test);
			}
		} else {
			$testStat = false;
		}
		if ($res = $this->convEncOut($this->_copy($this->convEncIn($src), $this->convEncIn($dst), $this->convEncIn($name)))) {
			$path = is_string($res)? $res : $this->joinPathCE($dst, $name);
			$this->clearstatcache();
			if ($this->ARGS['cmd'] !== 'duplicate') {
				$this->added[] = $this->stat($path);
			}
			return $path;
		}

		return $this->setError(elFinder::ERROR_COPY, $this->path($srcStat['hash']));
	}

	/**
	 * Move file
	 * Return new file path or false.
	 *
	 * @param  string  $src   source path
	 * @param  string  $dst   destination dir path
	 * @param  string  $name  new file name 
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function move($src, $dst, $name) {
		$stat = $this->stat($src);
		$stat['realpath'] = $src;
		$this->rmTmb($stat); // can not do rmTmb() after _move()
		$this->clearcache();
		
		if ($res = $this->convEncOut($this->_move($this->convEncIn($src), $this->convEncIn($dst), $this->convEncIn($name)))) {
			$this->clearstatcache();
			$this->removed[] = $stat;
			if ($stat['mime'] === 'directory') {
				$this->updateSubdirsCache($dst, true);
			}
			return is_string($res)? $res : $this->joinPathCE($dst, $name);
		}

		return $this->setError(elFinder::ERROR_MOVE, $this->path($stat['hash']));
	}

	/**
	 * Copy file from another volume.
	 * Return new file path or false.
	 *
	 * @param  Object  $volume       source volume
	 * @param  string  $src          source file hash
	 * @param  string  $destination  destination dir path
	 * @param  string  $name         file name
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function copyFrom($volume, $src, $destination, $name) {
		
		elFinder::checkAborted();
		
		if (($source = $volume->file($src)) == false) {
			return $this->addError(elFinder::ERROR_COPY, '#'.$src, $volume->error());
		}
		
		$srcIsDir = ($source['mime'] === 'directory');
		
		$errpath = $volume->path($source['hash']);
		
		if (!$this->nameAccepted($source['name'], $srcIsDir)) {
			return $this->addError(elFinder::ERROR_COPY, $errpath, $srcIsDir? elFinder::ERROR_INVALID_DIRNAME : elFinder::ERROR_INVALID_NAME);
		}
		
		if (!$source['read']) {
			return $this->addError(elFinder::ERROR_COPY, $errpath, elFinder::ERROR_PERM_DENIED);
		}
		
		if ($srcIsDir) {
			$test = $this->isNameExists($this->joinPathCE($destination, $name));
			$this->clearcache();

			if (($test && $test['mime'] != 'directory') || (! $test && ! $test = $this->mkdir($this->encode($destination), $name))) {
				return $this->addError(elFinder::ERROR_COPY, $errpath);
			}
			
			//$path = $this->joinPathCE($destination, $name);
			$path = $this->decode($test['hash']);
			
			foreach ($volume->scandir($src) as $entr) {
				$this->copyFrom($volume, $entr['hash'], $path, $entr['name']);
			}
			
			$this->added[] = $test;
		} else {
			// MIME check
			$mimeByName = $this->mimetype($source['name'], true);
			if ($source['mime'] === $mimeByName) {
				$mimeByName = '';
			}
			if (!$this->allowPutMime($source['mime']) || ($mimeByName && !$this->allowPutMime($mimeByName))) {
				return $this->addError(elFinder::ERROR_UPLOAD_FILE_MIME, $errpath);
			}
			
			if (strpos($source['mime'], 'image') === 0 && ($dim = $volume->dimensions($src))) {
				if (is_array($dim)) {
					$dim = isset($dim['dim'])? $dim['dim'] : null;
				}
				if ($dim) {
					$s = explode('x', $dim);
					$source['width']  = $s[0];
					$source['height'] = $s[1];
				}
			}
			
			if (($fp = $volume->open($src)) == false
			|| ($path = $this->saveCE($fp, $destination, $name, $source)) == false) {
				$fp && $volume->close($fp, $src);
				return $this->addError(elFinder::ERROR_COPY, $errpath);
			}
			$volume->close($fp, $src);

			$this->added[] = $this->stat($path);;
		}
		
		return $path;
	}
		
	/**
	 * Remove file/ recursive remove dir
	 *
	 * @param  string  $path   file path
	 * @param  bool    $force  try to remove even if file locked
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function remove($path, $force = false) {
		$stat = $this->stat($path);
		
		if (empty($stat)) {
			return $this->setError(elFinder::ERROR_RM, $path, elFinder::ERROR_FILE_NOT_FOUND);
		}
		
		$stat['realpath'] = $path;
		$this->rmTmb($stat);
		$this->clearcache();
		
		if (!$force && !empty($stat['locked'])) {
			return $this->setError(elFinder::ERROR_LOCKED, $this->path($stat['hash']));
		}
		
		if ($stat['mime'] == 'directory' && empty($stat['thash'])) {
			$ret = $this->delTree($this->convEncIn($path));
			$this->convEncOut();
			if (!$ret) {
				return $this->setError(elFinder::ERROR_RM, $this->path($stat['hash']));
			}
		} else {
			if ($this->convEncOut(!$this->_unlink($this->convEncIn($path)))) {
				return $this->setError(elFinder::ERROR_RM, $this->path($stat['hash']));
			}
			$this->clearstatcache();
		}

		$this->removed[] = $stat;
		return true;
	}
	

	/************************* thumbnails **************************/
		
	/**
	 * Return thumbnail file name for required file
	 *
	 * @param  array  $stat  file stat
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function tmbname($stat) {
		$name = $stat['hash'].$stat['ts'].'.png';
		if (strlen($name) > 255) {
			$name = $this->id.md5($stat['hash']).$stat['ts'].'.png';
		}
		return $name;
	}
	
	/**
	 * Return thumnbnail name if exists
	 *
	 * @param  string  $path file path
	 * @param  array   $stat file stat
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function gettmb($path, $stat) {
		if ($this->tmbURL && $this->tmbPath) {
			// file itself thumnbnail
			if (strpos($path, $this->tmbPath) === 0) {
				return basename($path);
			}

			$name = $this->tmbname($stat);
			if (file_exists($this->tmbPath.DIRECTORY_SEPARATOR.$name)) {
				return $name;
			}
		}
		return false;
	}
	
	/**
	 * Return true if thumnbnail for required file can be created
	 *
	 * @param  string  $path  thumnbnail path 
	 * @param  array   $stat  file stat
	 * @param  bool    $checkTmbPath
	 * @return string|bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function canCreateTmb($path, $stat, $checkTmbPath = true) {
		if ((! $checkTmbPath || $this->tmbPathWritable) 
			&& (! $this->tmbPath || strpos($path, $this->tmbPath) === false) // do not create thumnbnail for thumnbnail
		) {
			$mime = strtolower($stat['mime']);
			list($type) = explode('/', $mime);
			if (! empty($this->imgConverter)) {
				if (isset($this->imgConverter[$mime])) {
					return true;
				}
				if (isset($this->imgConverter[$type])) {
					return true;
				}
			}
			return $this->imgLib
				&& ($type === 'image')
				&& ($this->imgLib == 'gd' ? in_array($stat['mime'], array('image/jpeg', 'image/png', 'image/gif', 'image/x-ms-bmp')) : true);
		}
		return false;
	}
	
	/**
	 * Return true if required file can be resized.
	 * By default - the same as canCreateTmb
	 *
	 * @param  string  $path  thumnbnail path 
	 * @param  array   $stat  file stat
	 * @return string|bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function canResize($path, $stat) {
		return $this->canCreateTmb($path, $stat, false);
	}

	/**
	 * Create thumnbnail and return it's URL on success
	 *
	 * @param  string $path file path
	 * @param $stat
	 * @return false|string
	 * @internal param string $mime file mime type
	 * @author Dmitry (dio) Levashov
	 */
	protected function createTmb($path, $stat) {
		if (!$stat || !$this->canCreateTmb($path, $stat)) {
			return false;
		}

		$name = $this->tmbname($stat);
		$tmb  = $this->tmbPath.DIRECTORY_SEPARATOR.$name;

		$maxlength = -1;
		$imgConverter = null;
		
		// check imgConverter
		$mime = strtolower($stat['mime']);
		list($type) = explode('/', $mime);
		if (isset($this->imgConverter[$mime])) {
			$imgConverter = $this->imgConverter[$mime]['func'];
			if (! empty($this->imgConverter[$mime]['maxlen'])) {
				$maxlength = intval($this->imgConverter[$mime]['maxlen']);
			}
		} else if (isset($this->imgConverter[$type])) {
			$imgConverter = $this->imgConverter[$type]['func'];
			if (! empty($this->imgConverter[$type]['maxlen'])) {
				$maxlength = intval($this->imgConverter[$type]['maxlen']);
			}
		}
		if ($imgConverter && ! is_callable($imgConverter)) {
			return false;
		}

		// copy image into tmbPath so some drivers does not store files on local fs
		if (($src = $this->fopenCE($path, 'rb')) == false) {
			return false;
		}

		if (($trg = fopen($tmb, 'wb')) == false) {
			$this->fcloseCE($src, $path);
			return false;
		}

		stream_copy_to_stream($src, $trg, $maxlength);

		$this->fcloseCE($src, $path);
		fclose($trg);

		// call imgConverter
		if ($imgConverter) {
			if (! call_user_func_array($imgConverter, array($tmb, $stat, $this))) {
				file_exists($tmb) && unlink($tmb);
				return false;
			}
		}

		$result = false;
		
		$tmbSize = $this->tmbSize;
		
		if ($this->imgLib === 'imagick') {
			try {
				$imagickTest = new imagick($tmb);
				$imagickTest->clear();
				$imagickTest = true;
			} catch (Exception $e) {
				$imagickTest = false;
			}
		}
		
		if (($this->imgLib === 'imagick' && ! $imagickTest) || ($s = getimagesize($tmb)) === false) {
			if ($this->imgLib === 'imagick') {
				$bgcolor = $this->options['tmbBgColor'];
				if ($bgcolor === 'transparent') {
					$bgcolor = 'rgba(255, 255, 255, 0.0)';
				}
				try {
					$imagick = new imagick();
					$imagick->setBackgroundColor(new ImagickPixel($bgcolor));
					$imagick->readImage($this->getExtentionByMime($stat['mime'], ':') . $tmb);
					$imagick->setImageFormat('png');
					$imagick->writeImage($tmb);
					$imagick->clear();
					if (($s = getimagesize($tmb)) !== false) {
						$result = true;
					}
				} catch (Exception $e) {}
			}
			if (! $result) {
				// fallback imgLib to GD
				if (function_exists('gd_info') && ($s = getimagesize($tmb))) {
					$this->imgLib = 'gd';
				} else {
					file_exists($tmb) && unlink($tmb);
					return false;
				}
			}
			$result = false;
		}

		/* If image smaller or equal thumbnail size - just fitting to thumbnail square */
		if ($s[0] <= $tmbSize && $s[1]	<= $tmbSize) {
			$result = $this->imgSquareFit($tmb, $tmbSize, $tmbSize, 'center', 'middle', $this->options['tmbBgColor'], 'png' );
		} else {
		
			if ($this->options['tmbCrop']) {
		
				$result = $tmb;
				/* Resize and crop if image bigger than thumbnail */
				if (!(($s[0] > $tmbSize && $s[1] <= $tmbSize) || ($s[0] <= $tmbSize && $s[1] > $tmbSize) ) || ($s[0] > $tmbSize && $s[1] > $tmbSize)) {
					$result = $this->imgResize($tmb, $tmbSize, $tmbSize, true, false, 'png');
				}
		
				if ($result && ($s = getimagesize($tmb)) != false) {
					$x = $s[0] > $tmbSize ? intval(($s[0] - $tmbSize)/2) : 0;
					$y = $s[1] > $tmbSize ? intval(($s[1] - $tmbSize)/2) : 0;
					$result = $this->imgCrop($result, $tmbSize, $tmbSize, $x, $y, 'png');
				} else {
					$result = false;
				}
		
			} else {
				$result = $this->imgResize($tmb, $tmbSize, $tmbSize, true, true, 'png');
			}
		
			if ($result) {
				if ($s = getimagesize($tmb)) {
					if ($s[0] !== $tmbSize || $s[1] !== $tmbSize) {
						$result = $this->imgSquareFit($result, $tmbSize, $tmbSize, 'center', 'middle', $this->options['tmbBgColor'], 'png' );
					}
				}
			}
		}
		
		if (!$result) {
			unlink($tmb);
			return false;
		}

		return $name;
	}

	/**
	 * Resize image
	 *
	 * @param  string   $path               image file
	 * @param  int      $width              new width
	 * @param  int      $height             new height
	 * @param  bool	    $keepProportions    crop image
	 * @param  bool	    $resizeByBiggerSide resize image based on bigger side if true
	 * @param  string   $destformat         image destination format
	 * @param  int      $jpgQuality         JEPG quality (1-100)
	 * @param  array    $options            Other extra options
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	protected function imgResize($path, $width, $height, $keepProportions = false, $resizeByBiggerSide = true, $destformat = null, $jpgQuality = null, $options = array()) {
		if (($s = getimagesize($path)) == false) {
			return false;
		}

		$result = false;
		
		if (!$jpgQuality) {
			$jpgQuality = $this->options['jpgQuality'];
		}
		
		list($orig_w, $orig_h) = array($s[0], $s[1]);
		list($size_w, $size_h) = array($width, $height);
		
		if (empty($options['unenlarge']) || $orig_w > $size_w || $orig_h > $size_h) {
			if ($keepProportions == true) {
				/* Resizing by biggest side */
				if ($resizeByBiggerSide) {
					if ($orig_w > $orig_h) {
						$size_h = round($orig_h * $width / $orig_w);
						$size_w = $width;
					} else {
						$size_w = round($orig_w * $height / $orig_h);
						$size_h = $height;
					}
				} else {
					if ($orig_w > $orig_h) {
						$size_w = round($orig_w * $height / $orig_h);
						$size_h = $height;
					} else {
						$size_h = round($orig_h * $width / $orig_w);
						$size_w = $width;
					}
				}
			}
		} else {
			$size_w = $orig_w;
			$size_h = $orig_h;
		}

		elFinder::extendTimeLimit(300);
		switch ($this->imgLib) {
			case 'imagick':
				
				try {
					$img = new imagick($path);
				} catch (Exception $e) {
					return false;
				}

				// Imagick::FILTER_BOX faster than FILTER_LANCZOS so use for createTmb
				// resize bench: http://app-mgng.rhcloud.com/9
				// resize sample: http://www.dylanbeattie.net/magick/filters/result.html
				$filter = ($destformat === 'png' /* createTmb */)? Imagick::FILTER_BOX : Imagick::FILTER_LANCZOS;
				
				$ani = ($img->getNumberImages() > 1);
				if ($ani && is_null($destformat)) {
					$img = $img->coalesceImages();
					do {
						$img->resizeImage($size_w, $size_h, $filter, 1);
					} while ($img->nextImage());
					$img = $img->optimizeImageLayers();
					$result = $img->writeImages($path, true);
				} else {
					if ($ani) {
						$img->setFirstIterator();
					}
					if (strtoupper($img->getImageFormat()) === 'JPEG') {
						$img->setImageCompression(imagick::COMPRESSION_JPEG);
						$img->setImageCompressionQuality($jpgQuality);
						if (isset($options['preserveExif']) && ! $options['preserveExif']) {
							try {
								$orientation = $img->getImageOrientation();
							} catch (ImagickException $e) {
								$orientation = 0;
							}
							$img->stripImage();
							if ($orientation) {
								$img->setImageOrientation($orientation);
							}
						}
						if ($this->options['jpgProgressive']) {
							$img->setInterlaceScheme(Imagick::INTERLACE_PLANE);
						}
					}
					$img->resizeImage($size_w, $size_h, $filter, true);
					if ($destformat) {
						$result = $this->imagickImage($img, $path, $destformat, $jpgQuality);
					} else {
						$result = $img->writeImage($path);
					}
				}
				
				$img->clear();

				return $result ? $path : false;

				break;

			case 'convert':
				extract($this->imageMagickConvertPrepare($path, $destformat, $jpgQuality, $s));
				$filter = ($destformat === 'png' /* createTmb */)? '-filter Box' : '-filter Lanczos';
				$strip = (isset($options['preserveExif']) && ! $options['preserveExif'])? ' -strip' : '';
				$cmd = sprintf('%s %s%s%s%s%s %s -geometry %dx%d! %s %s', ELFINDER_CONVERT_PATH, $quotedPath, $coalesce, $jpgQuality, $strip, $interlace, $filter, $size_w, $size_h, $deconstruct, $quotedDstPath);
				
				$result = false;
				if ($this->procExec($cmd) === 0) {
					$result = true;
				}
				return $result ? $path : false;

				break;

			case 'gd':
				elFinder::expandMemoryForGD(array($s, array($size_w, $size_h)));
				$img = $this->gdImageCreate($path,$s['mime']);

				if ($img && false != ($tmp = imagecreatetruecolor($size_w, $size_h))) {
				
					$bgNum = false;
					if ($s[2] === IMAGETYPE_GIF && (! $destformat || $destformat === 'gif')) {
						$bgIdx = imagecolortransparent($img);
						if ($bgIdx !== -1) {
							$c = imagecolorsforindex($img, $bgIdx);
							$bgNum = imagecolorallocate($tmp, $c['red'], $c['green'], $c['blue']);
							imagefill($tmp, 0, 0, $bgNum);
							imagecolortransparent($tmp, $bgNum);
						}
					}
					if ($bgNum === false) {
						$this->gdImageBackground($tmp, 'transparent');
					}
					
					if (!imagecopyresampled($tmp, $img, 0, 0, 0, 0, $size_w, $size_h, $s[0], $s[1])) {
						return false;
					}
		
					$result = $this->gdImage($tmp, $path, $destformat, $s['mime'], $jpgQuality);

					imagedestroy($img);
					imagedestroy($tmp);

					return $result ? $path : false;

				}
				break;
		}
		
		return false;
  	}
  
	/**
	 * Crop image
	 *
	 * @param  string   $path               image file
	 * @param  int      $width              crop width
	 * @param  int      $height             crop height
	 * @param  bool	    $x                  crop left offset
	 * @param  bool	    $y                  crop top offset
	 * @param  string   $destformat         image destination format
	 * @param  int      $jpgQuality         JEPG quality (1-100)
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
  	protected function imgCrop($path, $width, $height, $x, $y, $destformat = null, $jpgQuality = null) {
		if (($s = getimagesize($path)) == false) {
			return false;
		}

		$result = false;
		
		if (!$jpgQuality) {
			$jpgQuality = $this->options['jpgQuality'];
		}

		elFinder::extendTimeLimit(300);
		switch ($this->imgLib) {
			case 'imagick':
				
				try {
					$img = new imagick($path);
				} catch (Exception $e) {
					return false;
				}
				
				$ani = ($img->getNumberImages() > 1);
				if ($ani && is_null($destformat)) {
					$img = $img->coalesceImages();
					do {
						$img->setImagePage($s[0], $s[1], 0, 0);
						$img->cropImage($width, $height, $x, $y);
						$img->setImagePage($width, $height, 0, 0);
					} while ($img->nextImage());
					$img = $img->optimizeImageLayers();
					$result = $img->writeImages($path, true);
				} else {
					if ($ani) {
						$img->setFirstIterator();
					}
					$img->setImagePage($s[0], $s[1], 0, 0);
					$img->cropImage($width, $height, $x, $y);
					$img->setImagePage($width, $height, 0, 0);
					$result = $this->imagickImage($img, $path, $destformat, $jpgQuality);
				}
				
				$img->clear();

				return $result ? $path : false;

				break;

			case 'convert':
				extract($this->imageMagickConvertPrepare($path, $destformat, $jpgQuality, $s));
				$cmd = sprintf('%s %s%s%s%s -crop %dx%d+%d+%d%s %s', ELFINDER_CONVERT_PATH, $quotedPath, $coalesce, $jpgQuality, $interlace, $width, $height, $x, $y, $deconstruct, $quotedDstPath);
				
				$result = false;
				if ($this->procExec($cmd) === 0) {
					$result = true;
				}
				return $result ? $path : false;

				break;

			case 'gd':
				elFinder::expandMemoryForGD(array($s, array($width, $height)));
				$img = $this->gdImageCreate($path,$s['mime']);

				if ($img && false != ($tmp = imagecreatetruecolor($width, $height))) {
					
					$bgNum = false;
					if ($s[2] === IMAGETYPE_GIF && (! $destformat || $destformat === 'gif')) {
						$bgIdx = imagecolortransparent($img);
						if ($bgIdx !== -1) {
							$c = imagecolorsforindex($img, $bgIdx);
							$bgNum = imagecolorallocate($tmp, $c['red'], $c['green'], $c['blue']);
							imagefill($tmp, 0, 0, $bgNum);
							imagecolortransparent($tmp, $bgNum);
						}
					}
					if ($bgNum === false) {
						$this->gdImageBackground($tmp, 'transparent');
					}

					$size_w = $width;
					$size_h = $height;

					if ($s[0] < $width || $s[1] < $height) {
						$size_w = $s[0];
						$size_h = $s[1];
					}

					if (!imagecopy($tmp, $img, 0, 0, $x, $y, $size_w, $size_h)) {
						return false;
					}
					
					$result = $this->gdImage($tmp, $path, $destformat, $s['mime'], $jpgQuality);

					imagedestroy($img);
					imagedestroy($tmp);

					return $result ? $path : false;

				}
				break;
		}

		return false;
	}

	/**
	 * Put image to square
	 *
	 * @param  string $path image file
	 * @param  int $width square width
	 * @param  int $height square height
	 * @param int|string $align reserved
	 * @param int|string $valign reserved
	 * @param  string $bgcolor square background color in #rrggbb format
	 * @param  string $destformat image destination format
	 * @param  int $jpgQuality JEPG quality (1-100)
	 * @return false|string
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 */
	protected function imgSquareFit($path, $width, $height, $align = 'center', $valign = 'middle', $bgcolor = '#0000ff', $destformat = null, $jpgQuality = null) {
		if (($s = getimagesize($path)) == false) {
			return false;
		}

		$result = false;

		/* Coordinates for image over square aligning */
		$y = ceil(abs($height - $s[1]) / 2); 
		$x = ceil(abs($width - $s[0]) / 2);

		if (!$jpgQuality) {
			$jpgQuality = $this->options['jpgQuality'];
		}

		elFinder::extendTimeLimit(300);
		switch ($this->imgLib) {
			case 'imagick':
				try {
					$img = new imagick($path);
				} catch (Exception $e) {
					return false;
				}
				
				if ($bgcolor === 'transparent') {
					$bgcolor = 'rgba(255, 255, 255, 0.0)';
				}
				$ani = ($img->getNumberImages() > 1);
				if ($ani && is_null($destformat)) {
					$img1 = new Imagick();
					$img1->setFormat('gif');
					$img = $img->coalesceImages();
					do {
						$gif = new Imagick();
						$gif->newImage($width, $height, new ImagickPixel($bgcolor));
						$gif->setImageColorspace($img->getImageColorspace());
						$gif->setImageFormat('gif');
						$gif->compositeImage( $img, imagick::COMPOSITE_OVER, $x, $y );
						$gif->setImageDelay($img->getImageDelay());
						$gif->setImageIterations($img->getImageIterations());
						$img1->addImage($gif);
						$gif->clear();
					} while ($img->nextImage());
					$img1 = $img1->optimizeImageLayers();
					$result = $img1->writeImages($path, true);
				} else {
					if ($ani) {
						$img->setFirstIterator();
					}
					$img1 = new Imagick();
					$img1->newImage($width, $height, new ImagickPixel($bgcolor));
					$img1->setImageColorspace($img->getImageColorspace());
					$img1->compositeImage( $img, imagick::COMPOSITE_OVER, $x, $y );
					$result = $this->imagickImage($img1, $path, $destformat, $jpgQuality);
				}
				
				$img1->clear();
				$img->clear();
				return $result ? $path : false;

				break;

			case 'convert':
				extract($this->imageMagickConvertPrepare($path, $destformat, $jpgQuality, $s));
				if ($bgcolor === 'transparent') {
					$bgcolor = 'rgba(255, 255, 255, 0.0)';
				}
				$cmd = sprintf('%s -size %dx%d "xc:%s" png:- | convert%s%s%s png:-  %s -geometry +%d+%d -compose over -composite%s %s', ELFINDER_CONVERT_PATH, $width, $height, $bgcolor, $coalesce, $jpgQuality, $interlace, $quotedPath, $x, $y, $deconstruct, $quotedDstPath);
				
				$result = false;
				if ($this->procExec($cmd) === 0) {
					$result = true;
				}
				return $result ? $path : false;

				break;

			case 'gd':
				elFinder::expandMemoryForGD(array($s, array($width, $height)));
				$img = $this->gdImageCreate($path,$s['mime']);

				if ($img &&  false != ($tmp = imagecreatetruecolor($width, $height))) {

					$this->gdImageBackground($tmp, $bgcolor);
					if ($bgcolor === 'transparent' && ($destformat === 'png' || $s[2] === IMAGETYPE_PNG)) {
						$bgNum = imagecolorallocatealpha($tmp, 255, 255, 255, 127);
						imagefill($tmp, 0, 0, $bgNum);
					}

					if (!imagecopy($tmp, $img, $x, $y, 0, 0, $s[0], $s[1])) {
						return false;
					}

					$result = $this->gdImage($tmp, $path, $destformat, $s['mime'], $jpgQuality);

					imagedestroy($img);
					imagedestroy($tmp);

					return $result ? $path : false;
				}
				break;
		}

		return false;
	}

	/**
	 * Rotate image
	 *
	 * @param  string   $path               image file
	 * @param  int      $degree             rotete degrees
	 * @param  string   $bgcolor            square background color in #rrggbb format
	 * @param  string   $destformat         image destination format
	 * @param  int      $jpgQuality         JEPG quality (1-100)
	 * @return string|false
	 * @author nao-pon
	 * @author Troex Nevelin
	 **/
	protected function imgRotate($path, $degree, $bgcolor = '#ffffff', $destformat = null, $jpgQuality = null) {
		if (($s = getimagesize($path)) == false || $degree % 360 === 0) {
			return false;
		}

		$result = false;

		// try lossless rotate
		if ($degree % 90 === 0 && in_array($s[2], array(IMAGETYPE_JPEG, IMAGETYPE_JPEG2000))) {
			$count = ($degree / 90) % 4;
			$exiftran = array(
				1 => '-9',
				2 => '-1',
				3 => '-2'
			);
			$jpegtran = array(
				1 => '90',
				2 => '180',
				3 => '270'
			);
			$quotedPath = escapeshellarg($path);
			$cmds = array();
			if ($this->procExec(ELFINDER_EXIFTRAN_PATH . ' -h') === 0) {
				$cmds[] = ELFINDER_EXIFTRAN_PATH . ' -i '.$exiftran[$count].' '.$path;
			}
			if ($this->procExec(ELFINDER_JPEGTRAN_PATH . ' -version') === 0) {
				$cmds[] = ELFINDER_JPEGTRAN_PATH . ' -rotate '.$jpegtran[$count].' -copy all -outfile '.$quotedPath.' '.$quotedPath;
			}
			foreach($cmds as $cmd) {
				if ($this->procExec($cmd) === 0) {
					$result = true;
					break;
				}
			}
			if ($result) {
				return $path;
			}
		}

		if (!$jpgQuality) {
			$jpgQuality = $this->options['jpgQuality'];
		}

		elFinder::extendTimeLimit(300);
		switch ($this->imgLib) {
			case 'imagick':
				try {
					$img = new imagick($path);
				} catch (Exception $e) {
					return false;
				}

				if ($s[2] === IMAGETYPE_GIF || $s[2] === IMAGETYPE_PNG) {
					$bgcolor = 'rgba(255, 255, 255, 0.0)';
				}
				if ($img->getNumberImages() > 1) {
					$img = $img->coalesceImages();
					do {
						$img->rotateImage(new ImagickPixel($bgcolor), $degree);
					} while ($img->nextImage());
					$img = $img->optimizeImageLayers();
					$result = $img->writeImages($path, true);
				} else {
					$img->rotateImage(new ImagickPixel($bgcolor), $degree);
					$result = $this->imagickImage($img, $path, $destformat, $jpgQuality);
				}
				$img->clear();
				return $result ? $path : false;

				break;

			case 'convert':
				extract($this->imageMagickConvertPrepare($path, $destformat, $jpgQuality, $s));
				if ($s[2] === IMAGETYPE_GIF || $s[2] === IMAGETYPE_PNG) {
					$bgcolor = 'rgba(255, 255, 255, 0.0)';
				}
				$cmd = sprintf('%s %s%s%s%s -background "%s" -rotate %d%s %s', ELFINDER_CONVERT_PATH, $quotedPath, $coalesce, $jpgQuality, $interlace, $bgcolor, $degree, $deconstruct, $quotedDstPath);
				
				$result = false;
				if ($this->procExec($cmd) === 0) {
					$result = true;
				}
				return $result ? $path : false;

				break;

			case 'gd':
				elFinder::expandMemoryForGD(array($s, array($w, $h)));
				$img = $this->gdImageCreate($path,$s['mime']);

				$degree = 360 - $degree;
				
				$bgNum = -1;
				$bgIdx = false;
				if ($s[2] === IMAGETYPE_GIF) {
					$bgIdx = imagecolortransparent($img);
					if ($bgIdx !== -1) {
						$c = imagecolorsforindex($img, $bgIdx);
						$w = imagesx($img);
						$h = imagesy($img);
						$newImg = imagecreatetruecolor($w, $h);
						imagepalettecopy($newImg, $img);
						$bgNum = imagecolorallocate($newImg, $c['red'], $c['green'], $c['blue']);
						imagefill($newImg, 0, 0, $bgNum);
						imagecolortransparent($newImg, $bgNum);
						imagecopy($newImg, $img, 0, 0, 0, 0, $w, $h);
						imagedestroy($img);
						$img = $newImg;
						$newImg = null;
					}
				} else if ($s[2] === IMAGETYPE_PNG) {
					$bgNum = imagecolorallocatealpha($img, 255, 255, 255, 127);
				}
				if ($bgNum === -1) {
					list($r, $g, $b) = sscanf($bgcolor, "#%02x%02x%02x");
					$bgNum = imagecolorallocate($img, $r, $g, $b);
				}
				
				$tmp = imageRotate($img, $degree, $bgNum);
				if ($bgIdx !== -1) {
					imagecolortransparent($tmp, $bgNum);
				}

				$result = $this->gdImage($tmp, $path, $destformat, $s['mime'], $jpgQuality);

				imageDestroy($img);
				imageDestroy($tmp);

				return $result ? $path : false;

				break;
		}

		return false;
	}

	/**
	 * Execute shell command
	 *
	 * @param  string $command command line
	 * @param  string $output stdout strings
	 * @param  int $return_var process exit code
	 * @param  string $error_output stderr strings
	 * @return int exit code
	 * @author Alexey Sukhotin
	 */
	protected function procExec($command , &$output = '', &$return_var = -1, &$error_output = '') {

		static $allowed = null;
		
		if ($allowed === null) {
			if ($allowed = function_exists('proc_open')) {
				if ($disabled = ini_get('disable_functions')) {
					$funcs = array_map('trim', explode(',', $disabled));
					$allowed = ! in_array('proc_open', $funcs);
				}
			}
		}
		
		if (! $allowed) {
			$return_var = -1;
			return $return_var;
		}
		
		if (! $command) {
			$return_var = 0;
			return $return_var;
		}
		
		$descriptorspec = array(
			0 => array("pipe", "r"),  // stdin
			1 => array("pipe", "w"),  // stdout
			2 => array("pipe", "w")   // stderr
		);

		$process = proc_open($command, $descriptorspec, $pipes, null, null);

		if (is_resource($process)) {
			stream_set_blocking($pipes[1], 0);
			stream_set_blocking($pipes[2], 0);

			fclose($pipes[0]);

			$tmpout = '';
			$tmperr = '';
			while (feof($pipes[1]) === false || feof($pipes[2]) === false) {
				elFinder::extendTimeLimit();
				$read = array($pipes[1], $pipes[2]);
				$write = null;
				$except = null;
				$ret = stream_select($read, $write, $except, 1);
				if ($ret === false) {
					// error
					break;
				} else if ($ret === 0) {
					// timeout
					continue;
				} else {
					foreach ($read as $sock) {
						if ($sock === $pipes[1]) {
							$tmpout .= fread($sock, 4096);
						} else if ($sock === $pipes[2]) {
							$tmperr .= fread($sock, 4096);
						}
					}
				}
			}

			fclose($pipes[1]);
			fclose($pipes[2]);

			$error_output = $tmpout;
			$output = $tmperr;
			$return_var = proc_close($process);

		} else {
			$return_var = -1;
		}
		
		return $return_var;
		
	}

	/**
	 * Remove thumbnail, also remove recursively if stat is directory
	 *
	 * @param  string  $stat  file stat
	 * @return void
	 * @author Dmitry (dio) Levashov
	 * @author Naoki Sawada
	 * @author Troex Nevelin
	 **/
	protected function rmTmb($stat) {
		if ($this->tmbPathWritable) {
			if ($stat['mime'] === 'directory') {
				foreach ($this->scandirCE($this->decode($stat['hash'])) as $p) {
					elFinder::extendTimeLimit(30);
					$name = $this->basenameCE($p);
					$name != '.' && $name != '..' && $this->rmTmb($this->stat($p));
				}
			} else if (!empty($stat['tmb']) && $stat['tmb'] != "1") {
				$tmb = $this->tmbPath.DIRECTORY_SEPARATOR.rawurldecode($stat['tmb']);
				file_exists($tmb) && unlink($tmb);
				clearstatcache();
			}
		}
	}
	
	/**
	 * Create an gd image according to the specified mime type
	 *
	 * @param string $path image file
	 * @param string $mime
	 * @return gd image resource identifier
	 */
	protected function gdImageCreate($path,$mime){
		switch($mime){
			case 'image/jpeg':
			return imagecreatefromjpeg($path);

			case 'image/png':
			return imagecreatefrompng($path);

			case 'image/gif':
			return imagecreatefromgif($path);

			case 'image/x-ms-bmp':
			if (!function_exists('imagecreatefrombmp')) {
				include_once dirname(__FILE__).'/libs/GdBmp.php';
			}
			return imagecreatefrombmp($path);
			
			case 'image/xbm':
			return imagecreatefromxbm($path);
			
			case 'image/xpm':
			return imagecreatefromxpm($path);
		}
		return false;
	}

	/**
	 * Output gd image to file
	 *
	 * @param resource $image gd image resource
	 * @param string $filename The path to save the file to.
	 * @param string $destformat The Image type to use for $filename
	 * @param string $mime The original image mime type
	 * @param int $jpgQuality JEPG quality (1-100)
	 * @return bool
	 */
	protected function gdImage($image, $filename, $destformat, $mime, $jpgQuality = null ){

		if (! $jpgQuality) {
			$jpgQuality = $this->options['jpgQuality'];
		}
		if ($destformat) {
			switch ($destformat) {
				case 'jpg':
					$mime = 'image/jpeg';
					break;
				case 'gif':
					$mime = 'image/gif';
					break;
				case 'png':
				default:
					$mime = 'image/png';
					break;
			}
		}
		switch ($mime) {
			case 'image/gif':
				return imagegif($image, $filename);
			case 'image/jpeg':
				if ($this->options['jpgProgressive']) {
					imageinterlace($image, true);
				}
				return imagejpeg($image, $filename, $jpgQuality);
			case 'image/wbmp':
				return imagewbmp($image, $filename);
			case 'image/png':
			default:
				return imagepng($image, $filename);
		}
	}

	/**
	 * Output imagick image to file
	 *
	 * @param resource $img imagick image resource
	 * @param string $filename The path to save the file to.
	 * @param string $destformat The Image type to use for $filename
	 * @param int $jpgQuality JEPG quality (1-100)
	 * @return bool
	 */
	protected function imagickImage($img, $filename, $destformat, $jpgQuality = null ){

		if (!$jpgQuality) {
			$jpgQuality = $this->options['jpgQuality'];
		}
		
		try {
			if ($destformat) {
				if ($destformat === 'gif') {
					$img->setImageFormat('gif');
				} else if ($destformat === 'png') {
					$img->setImageFormat('png');
				} else if ($destformat === 'jpg') {
					$img->setImageFormat('jpeg');
				}
			}
			if (strtoupper($img->getImageFormat()) === 'JPEG') {
				$img->setImageCompression(imagick::COMPRESSION_JPEG);
				$img->setImageCompressionQuality($jpgQuality);
				if ($this->options['jpgProgressive']) {
					$img->setInterlaceScheme(Imagick::INTERLACE_PLANE);
				}
				try {
					$orientation = $img->getImageOrientation();
				} catch (ImagickException $e) {
					$orientation = 0;
				}
				$img->stripImage();
				if ($orientation) {
					$img->setImageOrientation($orientation);
				}
			}
			$result = $img->writeImage($filename);
		} catch (Exception $e) {
			$result = false;
		}
		
		return $result;
	}

	/**
	 * Assign the proper background to a gd image
	 *
	 * @param resource $image gd image resource
	 * @param string $bgcolor background color in #rrggbb format
	 */
	protected function gdImageBackground($image, $bgcolor){
	
		if ($bgcolor === 'transparent'){
			imagealphablending($image, false);
			imagesavealpha($image, true);
		} else {
			list($r, $g, $b) = sscanf($bgcolor, "#%02x%02x%02x");
			$bgcolor1 = imagecolorallocate($image, $r, $g, $b);
			imagefill($image, 0, 0, $bgcolor1);
		}
	}

	/**
	 * Prepare variables for exec convert of ImageMagick
	 *
	 * @param  string  $path
	 * @param  string  $destformat
	 * @param  int     $jpgQuality
	 * @param  array   $imageSize
	 * @return array
	 */
	protected function imageMagickConvertPrepare($path, $destformat, $jpgQuality, $imageSize = null) {
		if (is_null($imageSize)) {
			$imageSize = getimagesize($path);
		}
		if (!$imageSize) {
			return array();
		}
		$srcType = $this->getExtentionByMime($imageSize['mime'], ':');
		$ani = false;
		$cmd = 'identify ' . escapeshellarg($srcType . $path);
		if ($this->procExec($cmd, $o) === 0) {
			$ani = preg_split('/(?:\r\n|\n|\r)/', trim($o));
			if (count($ani) < 2) {
				$ani = false;
			}
		}
		$coalesce = $index = $interlace = '';
		$deconstruct = ' +repage';
		if ($ani) {
			if (is_null($destformat)) {
				$coalesce = ' -coalesce -repage 0x0';
				$deconstruct = ' +repage -deconstruct -layers optimize';
			} else {
				$index = '[0]';
				if ($srcType === 'ico:') {
					foreach($ani as $_i => $_info) {
						if (preg_match('/ (\d+)x(\d+) /', $_info, $m)) {
							if ($m[1] == $imageSize[0] && $m[2] == $imageSize[1]) {
								$index = '[' . $_i . ']';
								break;
							}
						}
					}
				}
			}
		}
		if ($imageSize[2] === IMAGETYPE_JPEG || $imageSize[2] === IMAGETYPE_JPEG2000) {
			$jpgQuality = ' -quality ' . $jpgQuality;
			if ($this->options['jpgProgressive']) {
				$interlace = ' -interlace Plane';
			}
		} else {
			$jpgQuality = '';
		}
		$quotedPath = escapeshellarg($srcType . $path . $index);
		$quotedDstPath = escapeshellarg(($destformat? ($destformat . ':') : $srcType) . $path);
		return compact('ani', 'index', 'coalesce', 'deconstruct', 'jpgQuality', 'quotedPath', 'quotedDstPath', 'interlace');
	}

	/*********************** misc *************************/
	
	/**
	 * Return smart formatted date
	 *
	 * @param  int     $ts  file timestamp
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	// protected function formatDate($ts) {
	// 	if ($ts > $this->today) {
	// 		return 'Today '.date($this->options['timeFormat'], $ts);
	// 	}
	// 	
	// 	if ($ts > $this->yesterday) {
	// 		return 'Yesterday '.date($this->options['timeFormat'], $ts);
	// 	} 
	// 	
	// 	return date($this->options['dateFormat'], $ts);
	// }

	/**
	* Find position of first occurrence of string in a string with multibyte support
	*
	* @param  string  $haystack  The string being checked.
	* @param  string  $needle    The string to find in haystack.
	* @param  int     $offset    The search offset. If it is not specified, 0 is used.
	* @return int|bool
	* @author Alexey Sukhotin
	**/
	protected function stripos($haystack , $needle , $offset = 0) {
		if (function_exists('mb_stripos')) {
			return mb_stripos($haystack , $needle , $offset, 'UTF-8');
		} else if (function_exists('mb_strtolower') && function_exists('mb_strpos')) {
			return mb_strpos(mb_strtolower($haystack, 'UTF-8'), mb_strtolower($needle, 'UTF-8'), $offset);
		} 
		return stripos($haystack , $needle , $offset);
	}

	/**
	 * Default serach match method (name match)
	 *
	 * @param  String  $name  Item name
	 * @param  String  $query Query word
	 * @param  String  $path  Item path
	 *
	 * @return @return bool
	 */
	protected function searchMatchName($name , $query , $path) {
		return $this->stripos($name , $query) !== false;
	}

	/**
	 * Get server side available archivers
	 * 
	 * @param bool $use_cache
	 * @return array
	 */
	protected function getArchivers($use_cache = true) {

		$sessionKey = 'ARCHIVERS_CACHE';
		if ($use_cache && isset($this->sessionCache[$sessionKey]) && is_array($this->sessionCache[$sessionKey])) {
			return $this->sessionCache[$sessionKey];
		}
		
		$arcs = array(
			'create'  => array(),
			'extract' => array()
		);
		
		if ($this->procExec('') === 0) {
		
			$this->procExec(ELFINDER_TAR_PATH . ' --version', $o, $ctar);
			
			if ($ctar == 0) {
				$arcs['create']['application/x-tar']  = array('cmd' => ELFINDER_TAR_PATH, 'argc' => '-cf', 'ext' => 'tar');
				$arcs['extract']['application/x-tar'] = array('cmd' => ELFINDER_TAR_PATH, 'argc' => '-xf', 'ext' => 'tar', 'toSpec' => '-C ');
				unset($o);
				$this->procExec(ELFINDER_GZIP_PATH . ' --version', $o, $c);
				if ($c == 0) {
					$arcs['create']['application/x-gzip']  = array('cmd' => ELFINDER_TAR_PATH, 'argc' => '-czf', 'ext' => 'tgz');
					$arcs['extract']['application/x-gzip'] = array('cmd' => ELFINDER_TAR_PATH, 'argc' => '-xzf', 'ext' => 'tgz', 'toSpec' => '-C ');
				}
				unset($o);
				$this->procExec(ELFINDER_BZIP2_PATH . ' --version', $o, $c);
				if ($c == 0) {
					$arcs['create']['application/x-bzip2']  = array('cmd' => ELFINDER_TAR_PATH, 'argc' => '-cjf', 'ext' => 'tbz');
					$arcs['extract']['application/x-bzip2'] = array('cmd' => ELFINDER_TAR_PATH, 'argc' => '-xjf', 'ext' => 'tbz', 'toSpec' => '-C ');
				}
				unset($o);
				$this->procExec(ELFINDER_XZ_PATH . ' --version', $o, $c);
				if ($c == 0) {
					$arcs['create']['application/x-xz']  = array('cmd' => ELFINDER_TAR_PATH, 'argc' => '-cJf', 'ext' => 'xz');
					$arcs['extract']['application/x-xz'] = array('cmd' => ELFINDER_TAR_PATH, 'argc' => '-xJf', 'ext' => 'xz', 'toSpec' => '-C ');
				}
			}
			unset($o);
			$this->procExec(ELFINDER_ZIP_PATH . ' -h', $o, $c);
			if ($c == 0) {
				$arcs['create']['application/zip']  = array('cmd' => ELFINDER_ZIP_PATH, 'argc' => '-r9 -q', 'ext' => 'zip');
			}
			unset($o);
			$this->procExec(ELFINDER_UNZIP_PATH . ' --help', $o, $c);
			if ($c == 0) {
				$arcs['extract']['application/zip'] = array('cmd' => ELFINDER_UNZIP_PATH, 'argc' => '-q',  'ext' => 'zip', 'toSpec' => '-d ');
			}
			unset($o);
			$this->procExec(ELFINDER_RAR_PATH . ' --version', $o, $c);
			if ($c == 0 || $c == 7) {
				$arcs['create']['application/x-rar']  = array('cmd' => ELFINDER_RAR_PATH, 'argc' => 'a -inul', 'ext' => 'rar');
			}
			unset($o);
			$this->procExec(ELFINDER_UNRAR_PATH, $o, $c);
			if ($c==0 || $c == 7) {
				$arcs['extract']['application/x-rar'] = array('cmd' => ELFINDER_UNRAR_PATH, 'argc' => 'x -y', 'ext' => 'rar', 'toSpec' => '');
			}
			unset($o);
			$this->procExec(ELFINDER_7Z_PATH, $o, $c);
			if ($c == 0) {
				$arcs['create']['application/x-7z-compressed']  = array('cmd' => ELFINDER_7Z_PATH, 'argc' => 'a', 'ext' => '7z');
				$arcs['extract']['application/x-7z-compressed'] = array('cmd' => ELFINDER_7Z_PATH, 'argc' => 'x -y', 'ext' => '7z', 'toSpec' => '-o');
				
				if (empty($arcs['create']['application/zip'])) {
					$arcs['create']['application/zip'] = array('cmd' => ELFINDER_7Z_PATH, 'argc' => 'a -tzip', 'ext' => 'zip');
				}
				if (empty($arcs['extract']['application/zip'])) {
					$arcs['extract']['application/zip'] = array('cmd' => ELFINDER_7Z_PATH, 'argc' => 'x -tzip -y', 'ext' => 'zip', 'toSpec' => '-o');
				}
				if (empty($arcs['create']['application/x-tar'])) {
					$arcs['create']['application/x-tar'] = array('cmd' => ELFINDER_7Z_PATH, 'argc' => 'a -ttar', 'ext' => 'tar');
				}
				if (empty($arcs['extract']['application/x-tar'])) {
					$arcs['extract']['application/x-tar'] = array('cmd' => ELFINDER_7Z_PATH, 'argc' => 'x -ttar -y', 'ext' => 'tar', 'toSpec' => '-o');
				}
				if (substr(PHP_OS, 0, 3) === 'WIN' && empty($arcs['extract']['application/x-rar'])) {
					$arcs['extract']['application/x-rar'] = array('cmd' => ELFINDER_7Z_PATH, 'argc' => 'x -trar -y', 'ext' => 'rar', 'toSpec' => '-o');
				}
			}
		
		}
		
		// Use PHP ZipArchive Class
		if (class_exists('ZipArchive', false)) {
			if (empty($arcs['create']['application/zip'])) {
				$arcs['create']['application/zip']  = array('cmd' => 'phpfunction', 'argc' => array('self', 'zipArchiveZip'), 'ext' => 'zip');
			}
			if (empty($arcs['extract']['application/zip'])) {
				$arcs['extract']['application/zip'] = array('cmd' => 'phpfunction', 'argc' => array('self', 'zipArchiveUnzip'), 'ext' => 'zip');
			}
		}
		
		$this->sessionCache[$sessionKey] = $arcs;
		return $arcs;
	}

	/**
	 * Resolve relative / (Unix-like)absolute path
	 * 
	 * @param string $path  target path
	 * @param string $base  base path
	 * @return string
	 */
	protected function getFullPath($path, $base) {
		$separator = $this->separator;
		$systemroot = $this->systemRoot;

		if ($base[0] === $separator && strpos($base, 0, strlen($systemroot)) !== $systemroot) {
			$base = $systemroot . substr($base, 1);
		}
		if ($base !== $systemroot) {
			$base = rtrim($base, $separator);
		}
		
		// 'Here'
		if ($path === '' || $path === '.' . $separator) return $base;
		
		$sepquoted = preg_quote($separator, '#');

		if (substr($path, 0, 3) === '..' . $separator) {
			$path = $base . $separator . $path;
		}
		// normalize `/../`
		$normreg = '#('.$sepquoted.')[^'.$sepquoted.']+'.$sepquoted.'\.\.'.$sepquoted.'#'; // '#(/)[^\/]+/\.\./#'
		while(preg_match($normreg, $path)) {
			$path = preg_replace($normreg, '$1', $path, 1);
		}
		if ($path !== $systemroot) {
			$path = rtrim($path, $separator);
		}

		// Absolute path
		if ($path[0] === $separator || strpos($path, $systemroot) === 0) {
			return $path;
		}
		
		$preg_separator = '#' . $sepquoted . '#';
		
		// Relative path from 'Here'
		if (substr($path, 0, 2) === '.' . $separator || $path[0] !== '.') {
			$arrn = preg_split($preg_separator, $path, -1, PREG_SPLIT_NO_EMPTY);
			if ($arrn[0] !== '.') {
				array_unshift($arrn, '.');
			}
			$arrn[0] = rtrim($base, $separator);
			return join($separator, $arrn);
		}
		
		return $path;
	}

	/**
	 * Remove directory recursive on local file system
	 *
	 * @param string $dir Target dirctory path
	 * @return boolean
	 * @author Naoki Sawada
	 */
	public function rmdirRecursive($dir) {
		return self::localRmdirRecursive($dir);
	}

	/**
	 * Create archive and return its path
	 *
	 * @param  string  $dir    target dir
	 * @param  array   $files  files names list
	 * @param  string  $name   archive name
	 * @param  array   $arc    archiver options
	 * @return string|bool
	 * @author Dmitry (dio) Levashov, 
	 * @author Alexey Sukhotin
	 * @author Naoki Sawada
	 **/
	protected function makeArchive($dir, $files, $name, $arc) {
		if ($arc['cmd'] === 'phpfunction') {
			if (is_callable($arc['argc'])) {
				call_user_func_array($arc['argc'], array($dir, $files, $name));
			}
		} else {
			$cwd = getcwd();
			if (chdir($dir)) {
				foreach($files as $i => $file) {
					$files[$i] = '.'.DIRECTORY_SEPARATOR.basename($file);
				}
				$files = array_map('escapeshellarg', $files);
				
				$cmd = $arc['cmd'].' '.$arc['argc'].' '.escapeshellarg($name).' '.implode(' ', $files);
				$this->procExec($cmd, $o, $c);
				chdir($cwd);
			} else {
				return false;
			}
		}
		$path = $dir.DIRECTORY_SEPARATOR.$name;
		return file_exists($path) ? $path : false;
	}
	
	/**
	 * Unpack archive
	 *
	 * @param  string      $path  archive path
	 * @param  array       $arc   archiver command and arguments (same as in $this->archivers)
	 * @param  bool|string $mode  bool: remove archive ( unlink($path) ) | string: extract to directory
	 * @return void
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 * @author Naoki Sawada
	 **/
	protected function unpackArchive($path, $arc, $mode = true) {
		if (is_string($mode)) {
			$dir = $mode;
			$chdir = null;
			$remove = false;
		} else {
			$dir = dirname($path);
			$chdir = $dir;
			$remove = $mode;
		}
		$dir = realpath($dir);
		$path = realpath($path);
		if ($arc['cmd'] === 'phpfunction') {
			if (is_callable($arc['argc'])) {
				call_user_func_array($arc['argc'], array($path, $dir));
			}
		} else {
			$cwd = getcwd();
			if (!$chdir || chdir($dir)) {
				if ($chdir) {
					$cmd = $arc['cmd'].' '.$arc['argc'].' '.escapeshellarg(basename($path));
				} else {
					$cmd = $arc['cmd'].' '.$arc['argc'].' '.escapeshellarg($path).' '.$arc['toSpec'].escapeshellarg($dir);
				}
				$this->procExec($cmd, $o, $c);
				$chdir && chdir($cwd);
			}
		}
		$remove && unlink($path);
	}

	/**
	 * Check and filter the extracted items
	 * 
	 * @param  string $path    target local path
	 * @param  array  $checks  types to check default: ['symlink', 'name', 'writable', 'mime']
	 * @return array  ['symlinks' => [], 'names' => [], 'writables' => [], 'mimes' => [], 'rmNames' => [], 'totalSize' => 0]
	 * @author Naoki Sawada
	 */
	protected function checkExtractItems($path, $checks = null) {
		if (is_null($checks) || ! is_array($checks)) {
			$checks = array('symlink', 'name', 'writable', 'mime');
		}
		$chkSymlink = in_array('symlink', $checks);
		$chkName = in_array('name', $checks);
		$chkWritable = in_array('writable', $checks);
		$chkMime = in_array('mime', $checks);
		
		$res = array(
			'symlinks' => array(),
			'names' => array(),
			'writables' => array(),
			'mimes' => array(),
			'rmNames' => array(),
			'totalSize' => 0
		);
		
		if (is_dir($path)) {
			foreach (self::localScandir($path) as $name) {
				$p = $path.DIRECTORY_SEPARATOR.$name;
				if (!is_readable($p)) {
					// Perhaps a symbolic link to open_basedir restricted location
					self::localRmdirRecursive($p);
					$res['symlinks'][] = $p;
					$res['rmNames'][] = $name;
					continue;
				}
				if ($chkSymlink && is_link($p)) {
					self::localRmdirRecursive($p);
					$res['symlinks'][] = $p;
					$res['rmNames'][] = $name;
					continue;
				}
				$isDir = is_dir($p);
				if ($chkName && ! $this->nameAccepted($name, $isDir)) {
					self::localRmdirRecursive($p);
					$res['names'][] = $p;
					$res['rmNames'][] = $name;
					continue;
				}
				if ($chkWritable && ! $this->attr($p, 'write', null, $isDir)) {
					self::localRmdirRecursive($p);
					$res['writables'][] = $p;
					$res['rmNames'][] = $name;
					continue;
				}
				if ($chkMime && ($mimeByName = elFinderVolumeDriver::mimetypeInternalDetect($name)) && !$this->allowPutMime($mimeByName)) {
					self::localRmdirRecursive($p);
					$res['mimes'][] = $p;
					$res['rmNames'][] = $name;
					continue;
				}
				if ($isDir) {
					$cRes = $this->checkExtractItems($p, $checks);
					foreach($cRes as $k => $v) {
						if (is_array($v)) {
							$res[$k] = array_merge($res[$k], $cRes[$k]);
						} else {
							$res[$k] += $cRes[$k];
						}
					}
				} else {
					$res['totalSize'] += sprintf('%u', filesize($p));
				}
			}
			$res['rmNames'] = array_unique($res['rmNames']);
		} else {
			if ($chkSymlink && is_link($path)) {
				unlink($path);
				$res['symlinks'][] = $path;
				$res['rmNames'][] = basename($path);
			} else if ($chkName && ! $this->nameAccepted($name, false)) {
				unlink($path);
				$res['names'][] = $path;
				$res['rmNames'][] = $name;
			} else if ($chkWritable && ! $this->attr($path, 'write', null, $isDir)) {
				unlink($path);
				$res['writables'][] = $path;
				$res['rmNames'][] = $name;
			} else if ($chkMime && ($mimeByName = elFinderVolumeDriver::mimetypeInternalDetect($name)) && !$this->allowPutMime($mimeByName)) {
				unlink($path);
				$res['mimes'][] = $path;
				$res['rmNames'][] = $name;
			} else {
				$res['totalSize'] += sprintf('%u', filesize($path));
			}
		}
		
		return $res;
	}

	/**
	 * Return files of target directory that is dotfiles excludes.
	 *
	 * @param  string $dir target directory path
	 * @return array
	 * @throws Exception
	 * @author Naoki Sawada
	 */
	protected static function localScandir($dir) {
		// PHP function scandir() is not work well in specific environment. I dont know why.
		// ref. https://github.com/Studio-42/elFinder/issues/1248
		$files = array();
		if ($dh = opendir($dir)) {
			while (false !== ($file = readdir($dh))) {
				if ($file !== '.' && $file !== '..') {
					$files[] = $file;
				}
			}
			closedir($dh);
		} else {
			throw new Exception('Can not open local directory.');
		}
		return $files;
	}
	
	/**
	 * Remove directory recursive on local file system
	 *
	 * @param string $dir Target dirctory path
	 * @return boolean
	 * @author Naoki Sawada
	 */
	protected static function localRmdirRecursive($dir) {
		// try system command
		if (is_callable('exec')) {
			$o = '';
			$r = 1;
			if (substr(PHP_OS, 0, 3) === 'WIN') {
				exec('rd /S /Q ' . escapeshellarg($dir), $o, $r);
				if ($r === 0) {
					exec('del /F /Q ' . escapeshellarg($dir), $o, $r);
				}
			} else {
				exec('rm -rf ' . escapeshellarg($dir), $o, $r);
			}
			if ($r === 0) {
				return true;
			}
		}
		if (!is_link($dir) && is_dir($dir)) {
			chmod($dir, 0777);
			if ($handle = opendir($dir)) {
				while (false !== ($file = readdir($handle))) {
					if ($file === '.' || $file === '..') {
						continue;
					}
					elFinder::extendTimeLimit(30);
					$path = $dir . DIRECTORY_SEPARATOR . $file;
					if (!is_link($dir) && is_dir($path)) {
						self::localRmdirRecursive($path);
					} else {
						chmod($path, 0666);
						unlink($path);
					}
				}
				closedir($handle);
			}
			return rmdir($dir);
		} else {
			chmod($dir, 0666);
			return unlink($dir);
		}
		return false;
	}
	
	/**
	 * Move item recursive on local file system
	 * 
	 * @param string $src
	 * @param string $target
	 * @param string $overWrite
	 * @param string $copyJoin
	 * @return boolean
	 * @author Naoki Sawada
	 */
	protected static function localMoveRecursive($src, $target, $overWrite = true, $copyJoin = true) {
		$res = false;
		if (! file_exists($target)) {
			return rename($src, $target);
		}
		if (! $copyJoin || ! is_dir($target)) {
			if ($overWrite) {
				if (is_dir($target)) {
					$del = self::localRmdirRecursive($target);
				} else {
					$del = unlink($target);
				}
				if ($del) {
					return rename($src, $target);
				}
			}
		} else {
			foreach(self::localScandir($src) as $item) {
				$res |= self::localMoveRecursive($src.DIRECTORY_SEPARATOR.$item, $target.DIRECTORY_SEPARATOR.$item, $overWrite, $copyJoin);
			}
		}
		return (bool)$res;
	}
	
	/**
	 * Create Zip archive using PHP class ZipArchive
	 * 
	 * @param  string        $dir      target dir
	 * @param  array         $files    files names list
	 * @param  string|object $zipPath  Zip archive name
	 * @return bool
	 * @author Naoki Sawada
	 */
	protected static function zipArchiveZip($dir, $files, $zipPath) {
		try {
			if ($start = is_string($zipPath)) {
				$zip = new ZipArchive();
				if ($zip->open($dir . DIRECTORY_SEPARATOR . $zipPath, ZipArchive::CREATE) !== true) {
					$zip = false;
				}
			} else {
				$zip = $zipPath;
			}
			if ($zip) {
				foreach($files as $file) {
					$path = $dir . DIRECTORY_SEPARATOR . $file;
					if (is_dir($path)) {
						$zip->addEmptyDir($file);
						$_files = array();
						if ($handle = opendir($path)) {
							while (false !== ($entry = readdir($handle))) {
								if ($entry !== "." && $entry !== "..") {
									$_files[] = $file . DIRECTORY_SEPARATOR . $entry;
								}
							}
							closedir($handle);
						}
						if ($_files) {
							self::zipArchiveZip($dir, $_files, $zip);
						}
					} else {
						$zip->addFile($path, $file);
					}
				}
				$start && $zip->close();
			}
		} catch (Exception $e) {
			return false;
		}
		return true;
	}
	
	/**
	 * Unpack Zip archive using PHP class ZipArchive
	 * 
	 * @param  string $zipPath  Zip archive name
	 * @param  string $toDir    Extract to path
	 * @return bool
	 * @author Naoki Sawada
	 */
	protected static function zipArchiveUnzip($zipPath, $toDir) {
		try {
			$zip = new ZipArchive();
			if ($zip->open($zipPath) === true) {
				$zip->extractTo($toDir);
				$zip->close();
			}
		} catch (Exception $e) {
			return false;
		}
		return true;
	}
	
	/**
	 * Recursive symlinks search
	 *
	 * @param  string  $path  file/dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected static function localFindSymlinks($path) {
		if (is_link($path)) {
			return true;
		}
		
		if (is_dir($path)) {
			foreach (self::localScandir($path) as $name) {
				$p = $path.DIRECTORY_SEPARATOR.$name;
				if (is_link($p)) {
					return true;
				}
				if (is_dir($p) && $this->_findSymlinks($p)) {
					return true;
				}
			}
		}
		
		return false;
	}
	
	/**==================================* abstract methods *====================================**/
	
	/*********************** paths/urls *************************/
	
	/**
	 * Return parent directory path
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _dirname($path);

	/**
	 * Return file name
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _basename($path);

	/**
	 * Join dir name and file name and return full path.
	 * Some drivers (db) use int as path - so we give to concat path to driver itself
	 *
	 * @param  string  $dir   dir path
	 * @param  string  $name  file name
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _joinPath($dir, $name);

	/**
	 * Return normalized path 
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _normpath($path);

	/**
	 * Return file path related to root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _relpath($path);
	
	/**
	 * Convert path related to root dir into real path
	 *
	 * @param  string  $path  rel file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _abspath($path);
	
	/**
	 * Return fake path started from root dir.
	 * Required to show path on client side.
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _path($path);
	
	/**
	 * Return true if $path is children of $parent
	 *
	 * @param  string  $path    path to check
	 * @param  string  $parent  parent path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _inpath($path, $parent);
	
	/**
	 * Return stat for given path.
	 * Stat contains following fields:
	 * - (int)    size    file size in b. required
	 * - (int)    ts      file modification time in unix time. required
	 * - (string) mime    mimetype. required for folders, others - optionally
	 * - (bool)   read    read permissions. required
	 * - (bool)   write   write permissions. required
	 * - (bool)   locked  is object locked. optionally
	 * - (bool)   hidden  is object hidden. optionally
	 * - (string) alias   for symlinks - link target path relative to root path. optionally
	 * - (string) target  for symlinks - link target path. optionally
	 *
	 * If file does not exists - returns empty array or false.
	 *
	 * @param  string  $path    file path 
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _stat($path);
	

	/***************** file stat ********************/

		
	/**
	 * Return true if path is dir and has at least one childs directory
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _subdirs($path);
	
	/**
	 * Return object width and height
	 * Ususaly used for images, but can be realize for video etc...
	 *
	 * @param  string  $path  file path
	 * @param  string  $mime  file mime type
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _dimensions($path, $mime);
	
	/******************** file/dir content *********************/

	/**
	 * Return files list in directory
	 *
	 * @param  string  $path  dir path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _scandir($path);
	
	/**
	 * Open file and return file pointer
	 *
	 * @param  string $path file path
	 * @param  string $mode open mode
	 * @return resource|false
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _fopen($path, $mode="rb");
	
	/**
	 * Close opened file
	 * 
	 * @param  resource  $fp    file pointer
	 * @param  string    $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _fclose($fp, $path='');
	
	/********************  file/dir manipulations *************************/
	
	/**
	 * Create dir and return created dir path or false on failed
	 *
	 * @param  string  $path  parent dir path
	 * @param string  $name  new directory name
	 * @return string|bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _mkdir($path, $name);
	
	/**
	 * Create file and return it's path or false on failed
	 *
	 * @param  string  $path  parent dir path
	 * @param string  $name  new file name
	 * @return string|bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _mkfile($path, $name);
	
	/**
	 * Create symlink
	 *
	 * @param  string  $source     file to link to
	 * @param  string  $targetDir  folder to create link in
	 * @param  string  $name       symlink name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _symlink($source, $targetDir, $name);

	/**
	 * Copy file into another file (only inside one volume)
	 *
	 * @param  string $source source file path
	 * @param $targetDir
	 * @param  string $name file name
	 * @return bool|string
	 * @internal param string $target target dir path
	 * @author Dmitry (dio) Levashov
	 */
	abstract protected function _copy($source, $targetDir, $name);

	/**
	 * Move file into another parent dir.
	 * Return new file path or false.
	 *
	 * @param  string $source source file path
	 * @param $targetDir
	 * @param  string $name file name
	 * @return bool|string
	 * @internal param string $target target dir path
	 * @author Dmitry (dio) Levashov
	 */
	abstract protected function _move($source, $targetDir, $name);
	
	/**
	 * Remove file
	 *
	 * @param  string  $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _unlink($path);

	/**
	 * Remove dir
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _rmdir($path);

	/**
	 * Create new file and write into it from file pointer.
	 * Return new file path or false on error.
	 *
	 * @param  resource  $fp   file pointer
	 * @param  string    $dir  target dir path
	 * @param  string    $name file name
	 * @param  array     $stat file stat (required by some virtual fs)
	 * @return bool|string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _save($fp, $dir, $name, $stat);
	
	/**
	 * Get file contents
	 *
	 * @param  string  $path  file path
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _getContents($path);
	
	/**
	 * Write a string to a file
	 *
	 * @param  string  $path     file path
	 * @param  string  $content  new file content
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _filePutContents($path, $content);

	/**
	 * Extract files from archive
	 *
	 * @param  string  $path file path
	 * @param  array   $arc  archiver options
	 * @return bool
	 * @author Dmitry (dio) Levashov, 
	 * @author Alexey Sukhotin
	 **/
	abstract protected function _extract($path, $arc);

	/**
	 * Create archive and return its path
	 *
	 * @param  string  $dir    target dir
	 * @param  array   $files  files names list
	 * @param  string  $name   archive name
	 * @param  array   $arc    archiver options
	 * @return string|bool
	 * @author Dmitry (dio) Levashov, 
	 * @author Alexey Sukhotin
	 **/
	abstract protected function _archive($dir, $files, $name, $arc);

	/**
	 * Detect available archivers
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov, 
	 * @author Alexey Sukhotin
	 **/
	abstract protected function _checkArchivers();

	/**
	 * Change file mode (chmod)
	 *
	 * @param  string  $path  file path
	 * @param  string  $mode  octal string such as '0755'
	 * @return bool
	 * @author David Bartle,
	 **/
	abstract protected function _chmod($path, $mode);

	
} // END class
