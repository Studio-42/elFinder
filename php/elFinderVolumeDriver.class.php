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
	 * auto|imagick|mogtify|gd
	 *
	 * @var string
	 **/
	protected $imgLib = 'auto';
	
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
		'id'              => '',
		// root directory path
		'path'            => '',
		// open this path on initial request instead of root path
		'startPath'       => '',
		// how many subdirs levels return per request
		'treeDeep'        => 1,
		// root url, not set to disable sending URL to client (replacement for old "fileURL" option)
		'URL'             => '',
		// directory separator. required by client to show paths correctly
		'separator'       => DIRECTORY_SEPARATOR,
		// Server character encoding (default is '': UTF-8)
		'encoding'        => '',
		// for convert character encoding (default is '': Not change locale)
		'locale'          => '',
		// URL of volume icon (16x16 pixel image file)
		'icon'            => '',
		// CSS Class of volume root in tree
		'rootCssClass'    => '',
		// Search timeout (sec)
		'searchTimeout'   => 30,
		// library to crypt/uncrypt files names (not implemented)
		'cryptLib'        => '',
		// how to detect files mimetypes. (auto/internal/finfo/mime_content_type)
		'mimeDetect'      => 'auto',
		// mime.types file path (for mimeDetect==internal)
		'mimefile'        => '',
		// mime type normalize map : Array '[ext]:[detected mime type]' => '[normalized mime]'
		'mimeMap'         => array(
		                     'md:application/x-genesis-rom' => 'text/x-markdown',
		                     'md:text/plain'                => 'text/x-markdown',
		                     'markdown:text/plain'          => 'text/x-markdown',
		                     'css:text/x-asm'               => 'text/css'
		                    ),
		// MIME regex of send HTTP header "Content-Disposition: inline"
		// '.' is allow inline of all of MIME types
		// '$^' is not allow inline of all of MIME types
		'dispInlineRegex' => '^(?:(?:image|text)|application/x-shockwave-flash$)',
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
		'tmbBgColor'      => '#ffffff',
		// image manipulations library
		'imgLib'          => 'auto',
		// Jpeg image saveing quality
		'jpgQuality'      => 100,
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
		// order to proccess uploadAllow and uploadDeny options
		'uploadOrder'     => array('deny', 'allow'),
		// maximum upload file size. NOTE - this is size for every uploaded files
		'uploadMaxSize'   => 0,
		// files dates format
		'dateFormat'      => 'j M Y H:i',
		// files time format
		'timeFormat'      => 'H:i',
		// if true - every folder will be check for children folders, otherwise all folders will be marked as having subfolders
		'checkSubfolders' => true,
		// allow to copy from this volume to other ones?
		'copyFrom'        => true,
		// allow to copy from other volumes to this one?
		'copyTo'          => true,
		// list of commands disabled on this root
		'disabled'        => array(),
		// enable file owner, group & mode info, `false` to inactivate "chmod" command.
		'statOwner'       => false,
		// allow exec chmod of read-only files
		'allowChmodReadOnly' => false,
		// regexp or function name to validate new file name
		'acceptedName'    => '/^[^\.].*/', //<-- DONT touch this! Use constructor options to overwrite it!
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
		'utf8fix'      => false,
		 //                           й                 ё              Й               Ё              Ø         Å
		'utf8patterns' => array("\u0438\u0306", "\u0435\u0308", "\u0418\u0306", "\u0415\u0308", "\u00d8A", "\u030a"),
		'utf8replace'  => array("\u0439",        "\u0451",       "\u0419",       "\u0401",       "\u00d8", "\u00c5")
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
	 * default extensions/mimetypes for mimeDetect == 'internal' 
	 *
	 * @var array
	 **/
	protected static $mimetypes = array(
		// applications
		'ai'    => 'application/postscript',
		'eps'   => 'application/postscript',
		'exe'   => 'application/x-executable',
		'doc'   => 'application/msword',
		'dot'   => 'application/msword',
		'xls'   => 'application/vnd.ms-excel',
		'xlt'   => 'application/vnd.ms-excel',
		'xla'   => 'application/vnd.ms-excel',
		'ppt'   => 'application/vnd.ms-powerpoint',
		'pps'   => 'application/vnd.ms-powerpoint',
		'pdf'   => 'application/pdf',
		'xml'   => 'application/xml',
		'swf'   => 'application/x-shockwave-flash',
		'torrent' => 'application/x-bittorrent',
		'jar'   => 'application/x-jar',
		// open office (finfo detect as application/zip)
		'odt'   => 'application/vnd.oasis.opendocument.text',
		'ott'   => 'application/vnd.oasis.opendocument.text-template',
		'oth'   => 'application/vnd.oasis.opendocument.text-web',
		'odm'   => 'application/vnd.oasis.opendocument.text-master',
		'odg'   => 'application/vnd.oasis.opendocument.graphics',
		'otg'   => 'application/vnd.oasis.opendocument.graphics-template',
		'odp'   => 'application/vnd.oasis.opendocument.presentation',
		'otp'   => 'application/vnd.oasis.opendocument.presentation-template',
		'ods'   => 'application/vnd.oasis.opendocument.spreadsheet',
		'ots'   => 'application/vnd.oasis.opendocument.spreadsheet-template',
		'odc'   => 'application/vnd.oasis.opendocument.chart',
		'odf'   => 'application/vnd.oasis.opendocument.formula',
		'odb'   => 'application/vnd.oasis.opendocument.database',
		'odi'   => 'application/vnd.oasis.opendocument.image',
		'oxt'   => 'application/vnd.openofficeorg.extension',
		// MS office 2007 (finfo detect as application/zip)
		'docx'  => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'docm'  => 'application/vnd.ms-word.document.macroEnabled.12',
		'dotx'  => 'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
		'dotm'  => 'application/vnd.ms-word.template.macroEnabled.12',
		'xlsx'  => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'xlsm'  => 'application/vnd.ms-excel.sheet.macroEnabled.12',
		'xltx'  => 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
		'xltm'  => 'application/vnd.ms-excel.template.macroEnabled.12',
		'xlsb'  => 'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
		'xlam'  => 'application/vnd.ms-excel.addin.macroEnabled.12',
		'pptx'  => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		'pptm'  => 'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
		'ppsx'  => 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
		'ppsm'  => 'application/vnd.ms-powerpoint.slideshow.macroEnabled.12',
		'potx'  => 'application/vnd.openxmlformats-officedocument.presentationml.template',
		'potm'  => 'application/vnd.ms-powerpoint.template.macroEnabled.12',
		'ppam'  => 'application/vnd.ms-powerpoint.addin.macroEnabled.12',
		'sldx'  => 'application/vnd.openxmlformats-officedocument.presentationml.slide',
		'sldm'  => 'application/vnd.ms-powerpoint.slide.macroEnabled.12',
		// archives
		'gz'    => 'application/x-gzip',
		'tgz'   => 'application/x-gzip',
		'bz'    => 'application/x-bzip2',
		'bz2'   => 'application/x-bzip2',
		'tbz'   => 'application/x-bzip2',
		'xz'    => 'application/x-xz',
		'zip'   => 'application/zip',
		'rar'   => 'application/x-rar',
		'tar'   => 'application/x-tar',
		'7z'    => 'application/x-7z-compressed',
		// texts
		'txt'   => 'text/plain',
		'php'   => 'text/x-php',
		'html'  => 'text/html',
		'htm'   => 'text/html',
		'js'    => 'text/javascript',
		'css'   => 'text/css',
		'rtf'   => 'text/rtf',
		'rtfd'  => 'text/rtfd',
		'py'    => 'text/x-python',
		'java'  => 'text/x-java-source',
		'rb'    => 'text/x-ruby',
		'sh'    => 'text/x-shellscript',
		'pl'    => 'text/x-perl',
		'xml'   => 'text/xml',
		'sql'   => 'text/x-sql',
		'c'     => 'text/x-csrc',
		'h'     => 'text/x-chdr',
		'cpp'   => 'text/x-c++src',
		'hh'    => 'text/x-c++hdr',
		'log'   => 'text/plain',
		'csv'   => 'text/x-comma-separated-values',
		'md'    => 'text/x-markdown',
		'markdown' => 'text/x-markdown',
		// images
		'bmp'   => 'image/x-ms-bmp',
		'jpg'   => 'image/jpeg',
		'jpeg'  => 'image/jpeg',
		'gif'   => 'image/gif',
		'png'   => 'image/png',
		'tif'   => 'image/tiff',
		'tiff'  => 'image/tiff',
		'tga'   => 'image/x-targa',
		'psd'   => 'image/vnd.adobe.photoshop',
		'ai'    => 'image/vnd.adobe.photoshop',
		'xbm'   => 'image/xbm',
		'pxm'   => 'image/pxm',
		//audio
		'mp3'   => 'audio/mpeg',
		'mid'   => 'audio/midi',
		'ogg'   => 'audio/ogg',
		'oga'   => 'audio/ogg',
		'm4a'   => 'audio/x-m4a',
		'wav'   => 'audio/wav',
		'wma'   => 'audio/x-ms-wma',
		// video
		'avi'   => 'video/x-msvideo',
		'dv'    => 'video/x-dv',
		'mp4'   => 'video/mp4',
		'mpeg'  => 'video/mpeg',
		'mpg'   => 'video/mpeg',
		'mov'   => 'video/quicktime',
		'wm'    => 'video/x-ms-wmv',
		'flv'   => 'video/x-flv',
		'mkv'   => 'video/x-matroska',
		'webm'  => 'video/webm',
		'ogv'   => 'video/ogg',
		'ogm'   => 'video/ogg'
		);
	
	/**
	 * Directory separator - required by client
	 *
	 * @var string
	 **/
	protected $separator = DIRECTORY_SEPARATOR;
	
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
	 * Cache for subdirsCE()
	 * 
	 * @var array
	 */
	protected $subdirsCache = array();
	
	/**
	 * Reference of $_SESSION[elFinder::$sessionCacheKey][$this->id]
	 * 
	 * @var array
	 */
	protected $sessionCache;
	
	
	/**
	 * Search start time
	 * 
	 * @var int
	 */
	protected $searchStart;
	
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
		// set ARGS
		$this->ARGS = $_SERVER['REQUEST_METHOD'] === 'POST'? $_POST : $_GET;
		// set thumbnails path
		$path = $this->options['tmbPath'];
		if ($path) {
			if (!file_exists($path)) {
				if (@mkdir($path)) {
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

		// set image manipulation library
		$type = preg_match('/^(imagick|gd|auto)$/i', $this->options['imgLib'])
			? strtolower($this->options['imgLib'])
			: 'auto';

		if (($type == 'imagick' || $type == 'auto') && extension_loaded('imagick')) {
			$this->imgLib = 'imagick';
		} else {
			$this->imgLib = function_exists('gd_info') ? 'gd' : '';
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
	}
	
	protected function sessionRestart() {
		$start = @session_start();
		if (!isset($_SESSION[elFinder::$sessionCacheKey])) {
			$_SESSION[elFinder::$sessionCacheKey] = array();
		}
		$this->sessionCache = &$_SESSION[elFinder::$sessionCacheKey][$this->id];
		return $start;
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

		if ($this->convEncOut(!$this->_chmod($this->convEncIn($path), $mode))) {
			return $this->setError(elFinder::ERROR_PERM_DENIED, $file['name']);
		}

		$this->clearcache();

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
	
	
	public function clearstatcache() {
		clearstatcache();
		$this->cache = $this->dirsCache = array();
	}
	
	/**
	 * "Mount" volume.
	 * Return true if volume available for read or write, 
	 * false - otherwise
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	public function mount(array $opts) {
		if (!isset($opts['path']) || $opts['path'] === '') {
			return $this->setError('Path undefined.');;
		}
		
		$this->options = array_merge($this->options, $opts);
		$this->id = $this->driverId.(!empty($this->options['id']) ? $this->options['id'] : elFinder::$volumesCnt++).'_';
		$this->root = $this->normpathCE($this->options['path']);
		$this->separator = isset($this->options['separator']) ? $this->options['separator'] : DIRECTORY_SEPARATOR;
		$this->systemRoot = isset($this->options['systemRoot']) ? $this->options['systemRoot'] : $this->separator;
		
		// set server encoding
		if (!empty($this->options['encoding']) && strtoupper($this->options['encoding']) !== 'UTF-8') {
			$this->encoding = $this->options['encoding'];
		} else {
			$this->encoding = null;
		}
		
		$argInit = !empty($this->ARGS['init']);
		
		// session cache
		if ($argInit || ! isset($_SESSION[elFinder::$sessionCacheKey][$this->id])) {
			$_SESSION[elFinder::$sessionCacheKey][$this->id] = array();
		}
		$this->sessionCache = &$_SESSION[elFinder::$sessionCacheKey][$this->id];
		
		// default file attribute
		$this->defaults = array(
			'read'    => isset($this->options['defaults']['read'])  ? !!$this->options['defaults']['read']  : true,
			'write'   => isset($this->options['defaults']['write']) ? !!$this->options['defaults']['write'] : true,
			'locked'  => isset($this->options['defaults']['locked']) ? !!$this->options['defaults']['locked'] : false,
			'hidden'  => isset($this->options['defaults']['hidden']) ? !!$this->options['defaults']['hidden'] : false
		);

		// root attributes
		$this->attributes[] = array(
			'pattern' => '~^'.preg_quote(DIRECTORY_SEPARATOR).'$~',
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
		
		// debug($this->attributes);
		if (!$this->init()) {
			return false;
		}
		
		// check some options is arrays
		$this->uploadAllow = isset($this->options['uploadAllow']) && is_array($this->options['uploadAllow'])
			? $this->options['uploadAllow']
			: array();
			
		$this->uploadDeny = isset($this->options['uploadDeny']) && is_array($this->options['uploadDeny'])
			? $this->options['uploadDeny']
			: array();

		if (is_string($this->options['uploadOrder'])) { // telephat_mode on, compatibility with 1.x
			$parts = explode(',', isset($this->options['uploadOrder']) ? $this->options['uploadOrder'] : 'deny,allow');
			$this->uploadOrder = array(trim($parts[0]), trim($parts[1]));
		} else { // telephat_mode off
			$this->uploadOrder = $this->options['uploadOrder'];
		}
			
		if (!empty($this->options['uploadMaxSize'])) {
			$size = ''.$this->options['uploadMaxSize'];
			$unit = strtolower(substr($size, strlen($size) - 1));
			$n = 1;
			switch ($unit) {
				case 'k':
					$n = 1024;
					break;
				case 'm':
					$n = 1048576;
					break;
				case 'g':
					$n = 1073741824;
			}
			$this->uploadMaxSize = intval($size)*$n;
		}
		// Set maximum to PHP_INT_MAX
		if (!defined('PHP_INT_MAX')) {
			define('PHP_INT_MAX', 2147483647);
		}
		if ($this->uploadMaxSize < 1 || $this->uploadMaxSize > PHP_INT_MAX) {
			$this->uploadMaxSize = PHP_INT_MAX;
		}
		
		$this->disabled = isset($this->options['disabled']) && is_array($this->options['disabled'])
			? $this->options['disabled']
			: array();
		
		$this->cryptLib   = $this->options['cryptLib'];
		$this->mimeDetect = $this->options['mimeDetect'];

		// find available mimetype detect method
		$type = strtolower($this->options['mimeDetect']);
		$type = preg_match('/^(finfo|mime_content_type|internal|auto)$/i', $type) ? $type : 'auto';
		$regexp = '/text\/x\-(php|c\+\+)/';
	
		if (($type == 'finfo' || $type == 'auto') 
		&& class_exists('finfo', false)) {
			$tmpFileInfo = @explode(';', @finfo_file(finfo_open(FILEINFO_MIME), __FILE__));
		} else {
			$tmpFileInfo = false;
		}
	
		if ($tmpFileInfo && preg_match($regexp, array_shift($tmpFileInfo))) {
			$type = 'finfo';
			$this->finfo = finfo_open(FILEINFO_MIME);
		} elseif (($type == 'mime_content_type' || $type == 'auto') 
		&& function_exists('mime_content_type')
		&& preg_match($regexp, array_shift(explode(';', mime_content_type(__FILE__))))) {
			$type = 'mime_content_type';
		} else {
			$type = 'internal';
		}
		$this->mimeDetect = $type;

		// load mimes from external file for mimeDetect == 'internal'
		// based on Alexey Sukhotin idea and patch: http://elrte.org/redmine/issues/163
		// file must be in file directory or in parent one 
		if ($this->mimeDetect == 'internal' && !self::$mimetypesLoaded) {
			self::$mimetypesLoaded = true;
			$this->mimeDetect = 'internal';
			$file = false;
			if (!empty($this->options['mimefile']) && file_exists($this->options['mimefile'])) {
				$file = $this->options['mimefile'];
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

		$this->rootName = empty($this->options['alias']) ? $this->basenameCE($this->root) : $this->options['alias'];

		// This get's triggered if $this->root == '/' and alias is empty.
		// Maybe modify _basename instead?
		if ($this->rootName === '') $this->rootName = $this->separator;

		$root = $this->stat($this->root);
		
		if (!$root) {
			return $this->setError('Root folder does not exists.');
		}
		if (!$root['read'] && !$root['write']) {
			return $this->setError('Root folder has not read and write permissions.');
		}
		
		// debug($root);
		
		if ($root['read']) {
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

		$this->tmbURL   = !empty($this->options['tmbURL']) ? $this->options['tmbURL'] : '';
		if ($this->tmbURL && preg_match("|[^/?&=]$|", $this->tmbURL)) {
			$this->tmbURL .= '/';
		}
		
		$this->nameValidator = !empty($this->options['acceptedName']) && (is_string($this->options['acceptedName']) || is_callable($this->options['acceptedName']))
			? $this->options['acceptedName']
			: '';

		$this->_checkArchivers();
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

		$this->configure();
		
		// Normarize disabled (array_merge`for type array of JSON)
		$this->disabled = array_merge(array_unique($this->disabled));
		
		// fix sync interval
		if ($this->options['syncMinMs'] !== 0) {
			$this->options['syncMinMs'] = max($this->options[$this->options['syncChkAsTs']? 'tsPlSleep' : 'lsPlSleep'] * 1000, intval($this->options['syncMinMs']));
		}

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
	public function isUploadableByName($name, $allowUnknown = true) {
		$mimeByName = elFinderVolumeDriver::mimetypeInternalDetect($name);
		return (($allowUnknown && $mimeByName === 'unknown') || $this->allowPutMime($mimeByName));
	}
	
	/**
	 * Return Extention/MIME Table (elFinderVolumeDriver::$mimetypes)
	 * 
	 * @return array
	 * @author Naoki Sawada
	 */
	public function getMimeTable() {
		return elFinderVolumeDriver::$mimetypes;
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
	 * Return target path hash
	 * 
	 * @param  string $path
	 * @param  string $name
	 * @author Naoki Sawada
	 */
	public function getHash($path, $name = '') {
		if ($name !== '') {
			$path = $this->joinPathCE($path, $name);
		}
		return $this->encode($path);
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
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function options($hash) {
		$create = $createext = array();
		if (isset($this->archivers['create']) && is_array($this->archivers['create'])) {
			foreach($this->archivers['create'] as $m => $v) {
				$create[] = $m;
				$createext[$m] = $v['ext'];
			}
		}
		return array(
			'path'            => $this->path($hash),
			'url'             => $this->URL,
			'tmbUrl'          => $this->tmbURL,
			'disabled'        => $this->disabled,
			'separator'       => $this->separator,
			'copyOverwrite'   => intval($this->options['copyOverwrite']),
			'uploadOverwrite' => intval($this->options['uploadOverwrite']),
			'uploadMaxSize'   => intval($this->uploadMaxSize),
			'dispInlineRegex' => $this->options['dispInlineRegex'],
			'jpgQuality'      => intval($this->options['jpgQuality']),
			'archivers'       => array(
				'create'    => $create,
				'extract'   => isset($this->archivers['extract']) && is_array($this->archivers['extract']) ? array_keys($this->archivers['extract']) : array(),
				'createext' => $createext
			),
			'uiCmdMap'        => (isset($this->options['uiCmdMap']) && is_array($this->options['uiCmdMap']))? $this->options['uiCmdMap'] : array(),
			'syncChkAsTs'     => intval($this->options['syncChkAsTs']),
			'syncMinMs'       => intval($this->options['syncMinMs'])
		);
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
	 * @return string
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
		return $this->removed;
	}
	
	/**
	 * Clean removed files list
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function resetRemoved() {
		$this->removed = array();
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
	 * @param  string   $hash      file hash
	 * @param  bool     $realpath  add realpath field to file info
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function file($hash) {
		$path = $this->decode($hash);
		$isRoot = ($path == $this->root);
		
		$file = $this->stat($path);
		
		if ($isRoot) {
			$file = array_merge($file, $this->getRootStatExtra());
		}
		
		return ($file) ? $file : $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
	}
	
	/**
	 * Return folder info
	 *
	 * @param  string   $hash  folder hash
	 * @param  bool     $hidden  return hidden file info
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
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
		
		return $dir['read']
			? $this->getScandir($this->decode($hash))
			: $this->setError(elFinder::ERROR_PERM_DENIED);
	}

	/**
	 * Return dir files names list
	 * 
	 * @param  string  $hash   file hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function ls($hash, $intersect = null) {
		if (($dir = $this->dir($hash)) == false || !$dir['read']) {
			return false;
		}
		
		$list = array('exists' => array(), 'hashes' => array());
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
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function parents($hash, $lineal = false) {
		if (($current = $this->dir($hash)) == false) {
			return false;
		}

		$path = $this->decode($hash);
		$tree = array();
		
		while ($path && $path != $this->root) {
			$path = $this->dirnameCE($path);
			if (!($stat = $this->stat($path)) || !empty($stat['hidden']) || !$stat['read']) {
				return false;
			}
			
			array_unshift($tree, $stat);
			if (!$lineal) {
				foreach ($this->gettree($path, 0) as $dir) {
					if (!in_array($dir, $tree)) {
						$tree[] = $dir;
					}
				}
			}
		}

		return $tree ? $tree : array($current);
	}
	
	/**
	 * Create thumbnail for required file and return its name of false on failed
	 *
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function tmb($hash) {
		$path = $this->decode($hash);
		$stat = $this->stat($path);
		
		if (isset($stat['tmb'])) {
			return $stat['tmb'] == "1" ? $this->createTmb($path, $stat) : $stat['tmb'];
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
		
		if (!$this->nameAccepted($name)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME);
		}
		
		if (($dir = $this->dir($dsthash)) == false) {
			return $this->setError(elFinder::ERROR_TRGDIR_NOT_FOUND, '#'.$dsthash);
		}
		
		$path = $this->decode($dsthash);
		
		if (!$dir['write'] || !$this->allowCreate($path, $name, true)) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		$dst  = $this->joinPathCE($path, $name);
		$stat = $this->stat($dst); 
		if (!empty($stat)) { 
			return $this->setError(elFinder::ERROR_EXISTS, $name);
		}
		$this->clearcache();
		return ($path = $this->convEncOut($this->_mkdir($this->convEncIn($path), $this->convEncIn($name)))) ? $this->stat($path) : false;
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
		
		if (!$this->nameAccepted($name)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME);
		}
		
		if (($dir = $this->dir($dst)) == false) {
			return $this->setError(elFinder::ERROR_TRGDIR_NOT_FOUND, '#'.$dst);
		}
		
		$path = $this->decode($dst);
		
		if (!$dir['write'] || !$this->allowCreate($path, $name, false)) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if ($this->stat($this->joinPathCE($path, $name))) {
			return $this->setError(elFinder::ERROR_EXISTS, $name);
		}
		
		$this->clearcache();
		return ($path = $this->convEncOut($this->_mkfile($this->convEncIn($path), $this->convEncIn($name)))) ? $this->stat($path) : false;
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
		
		if (!$this->nameAccepted($name)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME, $name);
		}
		
		$mimeByName = elFinderVolumeDriver::mimetypeInternalDetect($name);
		if ($mimeByName && $mimeByName !== 'unknown' && !$this->allowPutMime($mimeByName)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME, $name);
		}
		
		if (!($file = $this->file($hash))) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
		
		if ($name == $file['name']) {
			return $file;
		}
		
		if (!empty($file['locked'])) {
			return $this->setError(elFinder::ERROR_LOCKED, $file['name']);
		}
		
		$path = $this->decode($hash);
		$dir  = $this->dirnameCE($path);
		$stat = $this->stat($this->joinPathCE($dir, $name));
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
		$name = $this->uniqueName($dir, $file['name'], ' '.$suffix.' ');

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
	 * @param  Resource $fp      file pointer
	 * @param  string   $dst     destination folder hash
	 * @param  string   $src     file name
	 * @param  string   $tmpname file tmp name - required to detect mime type
	 * @param  array    $hashes  exists files hash array with filename as key
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function upload($fp, $dst, $name, $tmpname, $hashes = array()) {
		if ($this->commandDisabled('upload')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if (($dir = $this->dir($dst)) == false) {
			return $this->setError(elFinder::ERROR_TRGDIR_NOT_FOUND, '#'.$dst);
		}

		if (!$dir['write']) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if (!$this->nameAccepted($name)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME);
		}
		
		$mime = $this->mimetype($this->mimeDetect == 'internal' ? $name : $tmpname, $name);
		$mimeByName = '';
		if ($this->mimeDetect !== 'internal') {
			$mimeByName = elFinderVolumeDriver::mimetypeInternalDetect($name);
			if ($mime == 'unknown') {
				$mime = $mimeByName;
			}
		}

		if (!$this->allowPutMime($mime) || ($mimeByName && $mimeByName !== 'unknown' && !$this->allowPutMime($mimeByName))) {
			return $this->setError(elFinder::ERROR_UPLOAD_FILE_MIME);
		}

		$tmpsize = sprintf('%u', filesize($tmpname));
		if ($this->uploadMaxSize > 0 && $tmpsize > $this->uploadMaxSize) {
			return $this->setError(elFinder::ERROR_UPLOAD_FILE_SIZE);
		}

		$dstpath = $this->decode($dst);
		if (isset($hashes[$name])) {
			$test = $this->decode($hashes[$name]);
		} else {
			$test = $this->joinPathCE($dstpath, $name);
		}
		
		$file = $this->stat($test);
		$this->clearcache();
		
		if ($file && $file['name'] === $name) { // file exists and check filename for item ID based filesystem
			// check POST data `overwrite` for 3rd party uploader
			$overwrite = isset($_POST['overwrite'])? (bool)$_POST['overwrite'] : $this->options['uploadOverwrite'];
			if ($overwrite) {
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
		
		

		return $this->stat($path);
	}
	
	/**
	 * Paste files
	 *
	 * @param  Object  $volume  source volume
	 * @param  string  $source  file hash
	 * @param  string  $dst     destination dir hash
	 * @param  bool    $rmSrc   remove source after copy?
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
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
				: $this->setError($err, $errpath, !empty($file['thash'])? elFinder::ERROR_PERM_DENIED : elFinder::ERROR_MKOUTLINK);
		}

		if (isset($hashes[$name])) {
			$test = $this->decode($hashes[$name]);
		} else {
			$test = $this->joinPathCE($destination, $name);
		}
		$stat = $this->stat($test);
		$this->clearcache();
		if ($stat && $stat['name'] === $name) { // file exists and check filename for item ID based filesystem
			if ($this->options['copyOverwrite']) {
				// do not replace file with dir or dir with file
				if (!$this->isSameType($file['mime'], $stat['mime'])) {
					return $this->setError(elFinder::ERROR_NOT_REPLACE, $this->path($stat['hash']));
				}
				// existed file is not writable
				if (!$stat['write']) {
					return $this->setError($err, $errpath, elFinder::ERROR_PERM_DENIED);
				}
				// existed file locked or has locked child
				if (($locked = $this->closestByAttr($test, 'locked', true))) {
					$stat = $this->stat($locked);
					return $this->setError(elFinder::ERROR_LOCKED, $this->path($stat['hash']));
				}
				// target is entity file of alias
				if ($volume == $this && ($test == @$file['target'] || $test == $this->decode($src))) {
					return $this->setError(elFinder::ERROR_REPLACE, $errpath);
				}
				// remove existed file
				if (!$this->remove($test)) {
					return $this->setError(elFinder::ERROR_REPLACE, $this->path($stat['hash']));
				}
			} else {
				$name = $this->uniqueName($destination, $name, ' ', false);
			}
		}
		
		// copy/move inside current volume
		if ($volume == $this) {
			$source = $this->decode($src);
			// do not copy into itself
			if ($this->inpathCE($destination, $source)) {
				return $this->setError(elFinder::ERROR_COPY_INTO_ITSELF, $errpath);
			}
			$method = $rmSrc ? 'move' : 'copy';
			$this->clearcache();
			return ($path = $this->$method($source, $destination, $name)) ? $this->stat($path) : false;
		}
		
		// copy/move from another volume
		if (!$this->options['copyTo'] || !$volume->copyFromAllowed()) {
			return $this->setError(elFinder::ERROR_COPY, $errpath, elFinder::ERROR_PERM_DENIED);
		}
		
		if (($path = $this->copyFrom($volume, $src, $destination, $name)) == false) {
			return false;
		}
		
		if ($rmSrc) {
			if (!$volume->rm($src)) {
				return $this->setError(elFinder::ERROR_MOVE, $errpath, elFinder::ERROR_RM_SRC);
			}
		}
		return $this->stat($path);
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
		foreach(array('zip', 'tgz') as $ext) {
			$mime = self::$mimetypes[$ext];
			if (isset($archivers[$mime])) {
				$cmd = $archivers[$mime];
				break;
			}
		}
		if (!$cmd) {
			$cmd = $archivers[0];
			$ext = $cmd['ext'];
			$mime = elFinderVolumeDriver::mimetypeInternalDetect('file.'.$ext);
		}
		$res = false;
		$mixed = false;
		$hashes = array_merge($hashes);
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
			// garbage collection
			$ttl = 7200; // expire 2h
			$time = time();
			foreach(glob($pdir.DIRECTORY_SEPARATOR.$tmppre.'*') as $_file) {
				if (filemtime($_file) + $ttl < $time) {
					@unlink($_file);
				}
			}
			$files = array_diff(scandir($dir), array('.', '..'));
			if ($files && ($arc = tempnam($dir, $tmppre))) {
				unlink($arc);
				$arc = $arc.'.'.$ext;
				$name = basename($arc);
				if ($arc = $this->makeArchive($dir, $files, $name, $cmd)) {
					$file = tempnam($pdir, $tmppre);
					unlink($file);
					$res = @rename($arc, $file);
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
		
		return $this->convEncOut($this->_getContents($this->convEncIn($this->decode($hash))));
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
		
		// check MIME
		$name = $this->basenameCE($path);
		$mime = '';
		$mimeByName = elFinderVolumeDriver::mimetypeInternalDetect($name);
		if ($this->mimeDetect !== 'internal') {
			if ($tp = tmpfile()) {
				fwrite($tp, $content);
				$info = stream_get_meta_data($tp);
				$filepath = $info['uri'];
				$mime = $this->mimetype($filepath, $name);
				fclose($tp);
			}
		}
		if (!$this->allowPutMime($mimeByName) || ($mime && $mime !== 'unknown' && !$this->allowPutMime($mime))) {
			return $this->setError(elFinder::ERROR_UPLOAD_FILE_MIME);
		}
		
		$this->clearcache();
		return $this->convEncOut($this->_filePutContents($this->convEncIn($path), $content)) ? $this->stat($path) : false;
	}
	
	/**
	 * Extract files from archive
	 *
	 * @param  string  $hash  archive hash
	 * @return array|bool
	 * @author Dmitry (dio) Levashov, 
	 * @author Alexey Sukhotin
	 **/
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
	 * @return void
	 **/
	public function archive($hashes, $mime, $name = '') {
		if ($this->commandDisabled('archive')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}

		$archiver = isset($this->archivers['create'][$mime])
			? $this->archivers['create'][$mime]
			: false;
			
		if (!$archiver) {
			return $this->setError(elFinder::ERROR_ARCHIVE_TYPE);
		}
		
		$files = array();
		
		foreach ($hashes as $hash) {
			if (($file = $this->file($hash)) == false) {
				return $this->error(elFinder::ERROR_FILE_NOT_FOUND, '#'+$hash);
			}
			if (!$file['read']) {
				return $this->error(elFinder::ERROR_PERM_DENIED);
			}
			$path = $this->decode($hash);
			if (!isset($dir)) {
				$dir = $this->dirnameCE($path);
				$stat = $this->stat($dir);
				if (!$stat['write']) {
					return $this->error(elFinder::ERROR_PERM_DENIED);
				}
			}
			
			$files[] = $this->basenameCE($path);
		}
		
		if ($name === '') {
			$name = count($files) == 1 ? $files[0] : 'Archive';
		} else {
			$name = str_replace(array('/', '\\'), '_', preg_replace('/\.' . preg_quote($archiver['ext'], '/') . '$/i', '', $name));
		}
		$name .='.' . $archiver['ext'];
		$name = $this->uniqueName($dir, $name, '');
		$this->clearcache();
		return ($path = $this->convEncOut($this->_archive($this->convEncIn($dir), $this->convEncIn($files), $this->convEncIn($name), $archiver))) ? $this->stat($path) : false;
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
				@unlink($work_path);
			}
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}

		if ($this->imgLib != 'imagick') {
			if (elFinder::isAnimationGif($work_path)) {
				return $this->setError(elFinder::ERROR_UNSUPPORT_TYPE);
			}
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
				$result = $this->imgRotate($work_path, $degree, ($bg ? $bg : $this->options['tmbBgColor']), null, $jpgQuality);
				break;

			default:
				$result = $this->imgResize($work_path, $width, $height, false, true, null, $jpgQuality);
				break;
		}
		
		$ret = false;
		if ($result) {
			$stat = $this->stat($path);
			clearstatcache();
			$fstat = stat($work_path);
			$stat['size'] = $fstat['size'];
			$stat['ts'] = $fstat['mtime'];
			if ($imgsize = @getimagesize($work_path)) {
				$stat['width'] = $imgsize[0];
				$stat['height'] = $imgsize[1];
				$stat['mime'] = $imgsize['mime'];
			}
			if ($path !== $work_path) {
				if ($fp = @fopen($work_path, 'rb')) {
					$ret = $this->saveCE($fp, $this->dirnameCE($path), $this->basenameCE($path), $stat);
					@fclose($fp);
				}
			} else {
				$ret = true;
			}
			if ($ret) {
				$this->rmTmb($file);
				$this->clearcache();
				$ret = $this->stat($path);
				$ret['width'] = $stat['width'];
				$ret['height'] = $stat['height'];
			}
		}
		if ($path !== $work_path) {
			is_file($work_path) && @unlink($work_path);
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
	 * @param  string  $q  search string
	 * @param  array   $mimes
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function search($q, $mimes, $hash = null) {
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
		return ($q === '' || $this->commandDisabled('search'))
			? array()
			: $this->doSearch(is_null($dir)? $this->root : $dir, $q, $mimes);
	}
	
	/**
	 * Return image dimensions
	 *
	 * @param  string  $hash  file hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function dimensions($hash) {
		if (($file = $this->file($hash)) == false) {
			return false;
		}
		
		return $this->convEncOut($this->_dimensions($this->convEncIn($this->decode($hash)), $file['mime']));
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
		if (($file = $this->file($hash)) == false || !$file['url'] || $file['url'] == 1) {
			return false;
		}
		return $file['url'];
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
		} else if (function_exists('sys_get_temp_dir')) {
			$tempPath = sys_get_temp_dir();
		} else if (isset($this->tmbPath) && $this->tmbPath && is_writable($this->tmbPath)) {
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
	
	/**
	 * Save error message
	 *
	 * @param  array  error 
	 * @return false
	 * @author Dmitry(dio) Levashov
	 **/
	protected function setError($error) {
		
		$this->error = array();
		
		foreach (func_get_args() as $err) {
			if (is_array($err)) {
				$this->error = array_merge($this->error, $err);
			} else {
				$this->error[] = $err;
			}
		}
		
		// $this->error = is_array($error) ? $error : func_get_args();
		return false;
	}
	
	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/
	
	/***************** server encoding support *******************/
	
	/**
	 * Return parent directory path (with convert encording)
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Naoki Sawada
	 **/
	protected function dirnameCE($path) {
		return (!$this->encoding)? $this->_dirname($path) :	$this->convEncOut($this->_dirname($this->convEncIn($path)));
	}
	
	/**
	 * Return file name (with convert encording)
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Naoki Sawada
	 **/
	protected function basenameCE($path) {
		return (!$this->encoding)? $this->_basename($path) : $this->convEncOut($this->_basename($this->convEncIn($path)));
	}
	
	/**
	 * Join dir name and file name and return full path. (with convert encording)
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
	 * Return normalized path (with convert encording)
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Naoki Sawada
	 **/
	protected function normpathCE($path) {
		return (!$this->encoding)? $this->_normpath($path) : $this->convEncOut($this->_normpath($this->convEncIn($path)));
	}
	
	/**
	 * Return file path related to root dir (with convert encording)
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Naoki Sawada
	 **/
	protected function relpathCE($path) {
		return (!$this->encoding)? $this->_relpath($path) : $this->convEncOut($this->_relpath($this->convEncIn($path)));
	}
	
	/**
	 * Convert path related to root dir into real path (with convert encording)
	 *
	 * @param  string  $path  rel file path
	 * @return string
	 * @author Naoki Sawada
	 **/
	protected function abspathCE($path) {
		return (!$this->encoding)? $this->_abspath($path): $this->convEncOut($this->_abspath($this->convEncIn($path)));
	}
	
	/**
	 * Return true if $path is children of $parent (with convert encording)
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
	 * Open file and return file pointer (with convert encording)
	 *
	 * @param  string  $path  file path
	 * @param  bool    $write open file for writing
	 * @return resource|false
	 * @author Naoki Sawada
	 **/
	protected function fopenCE($path, $mode='rb') {
		return (!$this->encoding)? $this->_fopen($path, $mode) : $this->convEncOut($this->_fopen($this->convEncIn($path), $mode));
	}
	
	/**
	 * Close opened file (with convert encording)
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
	 * Create new file and write into it from file pointer. (with convert encording)
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
		return (!$this->encoding)? $this->_save($fp, $dir, $name, $stat) : $this->convEncOut($this->_save($fp, $this->convEncIn($dir), $this->convEncIn($name), $this->convEncIn($stat)));
	}
	
	/**
	 * Return true if path is dir and has at least one childs directory (with convert encording)
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Naoki Sawada
	 **/
	protected function subdirsCE($path) {
		if (!isset($this->subdirsCache[$path])) {
			$this->subdirsCache[$path] = (!$this->encoding)? $this->_subdirs($path) : $this->convEncOut($this->_subdirs($this->convEncIn($path)));
		}
		return $this->subdirsCache[$path];
	}
	
	/**
	 * Return files list in directory (with convert encording)
	 *
	 * @param  string  $path  dir path
	 * @return array
	 * @author Naoki Sawada
	 **/
	protected function scandirCE($path) {
		return (!$this->encoding)? $this->_scandir($path) : $this->convEncOut($this->_scandir($this->convEncIn($path)));
	}
	
	/**
	 * Create symlink (with convert encording)
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
				$p = DIRECTORY_SEPARATOR;
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
			// append ROOT to path after it was cut in encode
			return $this->abspathCE($path);//$this->root.($path == DIRECTORY_SEPARATOR ? '' : DIRECTORY_SEPARATOR.$path); 
		}
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
	protected function nameAccepted($name) {
		if (!json_encode($name)) {
			return false;
		}
		if ($this->nameValidator) {
			if (is_callable($this->nameValidator)) {
				$res = call_user_func($this->nameValidator, $name);
				return $res;
			}
			if (preg_match($this->nameValidator, '') !== false) {
				return preg_match($this->nameValidator, $name);
			}
		}
		return true;
	}
	
	/**
	 * Return new unique name based on file name and suffix
	 *
	 * @param  string  $path    file path
	 * @param  string  $suffix  suffix append to name
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function uniqueName($dir, $name, $suffix = ' copy', $checkNum = true, $start = 1) {
		$ext  = '';

		if (preg_match('/\.((tar\.(gz|bz|bz2|z|lzo))|cpio\.gz|ps\.gz|xcf\.(gz|bz2)|[a-z0-9]{1,4})$/i', $name, $m)) {
			$ext  = '.'.$m[1];
			$name = substr($name, 0,  strlen($name)-strlen($m[0]));
		} 
		
		if ($checkNum && preg_match('/('.preg_quote($suffix, '/').')(\d*)$/i', $name, $m)) {
			$i    = (int)$m[2];
			$name = substr($name, 0, strlen($name)-strlen($m[2]));
		} else {
			$i     = $start;
			$name .= $suffix;
		}
		$max = $i+100000;

		while ($i <= $max) {
			$n = $name.($i > 0 ? $i : '').$ext;

			if (!$this->stat($this->joinPathCE($dir, $n))) {
				$this->clearcache();
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
	 * @param  mixed  $var     target string or array var
	 * @param  string $from    from character encoding
	 * @param  string $to      to character encoding
	 * @param  string $locale  local locale
	 * @param  string $unknown replaces character for unknown
	 * @return mixed
	 */
	protected function convEnc($var, $from, $to, $locale, $restoreLocale, $unknown = '_') {
		if (strtoupper($from) !== strtoupper($to)) {
			if ($locale) {
				@setlocale(LC_ALL, $locale);
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
					if (false !== ($_var = @iconv($from, $to.'//TRANSLIT', $_var))) {
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
			if (!$rmfunc) {
				$rmfunc = create_function('$f', 'is_file($f) && @unlink($f);');
			}
			$name = tempnam($tmpdir, 'ELF');
			if ($key) {
				$cache[$key] = $name;
			}
			register_shutdown_function($rmfunc, $name);
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
		if ($work = $this->getTempFile()) {
			if ($wfp = fopen($work, 'wb')) {
				if ($fp = $this->_fopen($path)) {
					while(!feof($fp)) {
						fwrite($wfp, fread($fp, 8192));
					}
					$this->_fclose($fp, $path);
					fclose($wfp);
					return $work;
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
				if ($size = @getimagesize($work)) {
					$size['dimensions'] = $size[0].'x'.$size[1];
				}
			}
			is_file($work) && @unlink($work);
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
			@set_time_limit(30);
			$stat = $this->stat($this->convEncOut($p));
			$this->convEncIn();
			($stat['mime'] === 'directory')? $this->delTree($p) : $this->_unlink($p);
		}
		return $this->_rmdir($localpath);
	}
	
	/**
	 * Copy items to a new temporary directory on the local server
	 * 
	 * @param  array  $hashes  target hashes
	 * @param  string $dir     destination directory (for recurcive)
	 * @return string|false    saved path name
	 * @author Naoki Sawada
	 */
	protected function getItemsInHand($hashes, $dir = null) {
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
				if ($chashes) {
					mkdir($target, 0700, true);
					$res = $this->getItemsInHand($chashes, $target);
				}
				if (!$res) {
					break;
				}
				!empty($file['ts']) && @touch($target, $file['ts']);
			} else {
				$path = $this->decode($hash);
				if ($fp = $this->fopenCE($path)) {
					if ($tfp = fopen($target, 'wb')) {
						$totalSize += stream_copy_to_stream($fp, $tfp);
						fclose($tfp);
					}
					!empty($file['ts']) && @touch($target, $file['ts']);
					$this->fcloseCE($fp, $path);
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
		
		
		$perm = null;
		
		if ($this->access) {
			$perm = call_user_func($this->access, $name, $path, $this->options['accessControlData'], $this, $isDir);

			if ($perm !== null) {
				return !!$perm;
			}
		}
		
		if ($this->separator != '/') {
			$path = str_replace($this->separator, '/', $this->relpathCE($path));
		} else {
			$path = $this->relpathCE($path);
		}

		$path = '/'.$path;

		for ($i = 0, $c = count($this->attributes); $i < $c; $i++) {
			$attrs = $this->attributes[$i];
			
			if (isset($attrs[$name]) && isset($attrs['pattern']) && preg_match($attrs['pattern'], $path)) {
				$perm = $attrs[$name];
			} 
		}
		
		return $perm === null ? (is_null($val)? $this->defaults[$name] : $val) : !!$perm;
	}
	
	/**
	 * Return true if file with given name can be created in given folder.
	 *
	 * @param string $dir  parent dir path
	 * @param string $name new file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function allowCreate($dir, $name, $isDir = null) {
		$path = $this->joinPathCE($dir, $name);
		$perm = null;
		
		if ($this->access) {
			$perm = call_user_func($this->access, 'write', $path, $this->options['accessControlData'], $this, $isDir);			
			if ($perm !== null) {
				return !!$perm;
			}
		}
		
		$testPath = $this->separator.$this->relpathCE($path);
		
		for ($i = 0, $c = count($this->attributes); $i < $c; $i++) {
			$attrs = $this->attributes[$i];
			
			if (isset($attrs['write']) && isset($attrs['pattern']) && preg_match($attrs['pattern'], $testPath)) {
				$perm = $attrs['write'];
			} 
		}
		
		return $perm === null ? true : $perm;
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
			$rootKey = md5($path);
			if (!isset($this->sessionCache['rootstat'])) {
				$this->sessionCache['rootstat'] = array();
			}
			if (! $this->isMyReload()) {
				// need $path as key for netmount/netunmount
				if (isset($this->sessionCache['rootstat'][$rootKey])) {
					if ($ret = elFinder::sessionDataDecode($this->sessionCache['rootstat'][$rootKey], 'array')) {
						return $ret;
					}
				}
			}
		}
		$ret = isset($this->cache[$path])
			? $this->cache[$path]
			: $this->updateCache($path, $this->convEncOut($this->_stat($this->convEncIn($path))));
		if ($is_root) {
			$this->sessionRestart();
			$this->sessionCache['rootstat'][$rootKey] = elFinder::sessionDataEncode($ret);
			elFinder::sessionWrite();
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
		if (! empty($this->options['icon'])) {
			$stat['icon'] = $this->options['icon'];
		}
		if (! empty($this->options['rootCssClass'])) {
			$stat['csscls'] = $this->options['rootCssClass'];
		}
		if (! empty($this->tmbURL)) {
			$stat['tmbUrl'] = $this->tmbURL;
		}
		$stat['uiCmdMap'] = (isset($this->options['uiCmdMap']) && is_array($this->options['uiCmdMap']))? $this->options['uiCmdMap'] : array();
		$stat['disabled'] = $this->disabled;
		if (isset($this->options['netkey'])) {
			$stat['netkey'] = $this->options['netkey'];
		}
		return $stat;
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
			$stat['mime'] = $this->mimetype($stat['name']);
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
		} else {
			// lock when parent directory is not writable
			if (!isset($stat['locked'])) {
				$parent = $this->dirnameCE($path);
				$pstat = isset($this->cache[$parent])? $this->cache[$parent] : array();
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
					$this->subdirsCache[$parent] = true;
				}
				// for dir - check for subdirs
				if ($this->options['checkSubfolders']) {
					if (isset($stat['dirs'])) {
						if ($stat['dirs']) {
							$stat['dirs'] = 1;
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
		
		if (isset($this->options['netkey']) && $path === $this->root) {
			$stat['netkey'] = $this->options['netkey'];
		}
		
		return $this->cache[$path] = $stat;
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
		$this->subdirsCache[$path] = false;

		foreach ($this->scandirCE($path) as $p) {
			if (($stat = $this->stat($p)) && empty($stat['hidden'])) {
				if ($stat['mime'] === 'directory') {
					$this->subdirsCache[$path] = true;
				}
				$this->dirsCache[$path][] = $p;
			}
		}
	}
	
	/**
	 * Clean cache
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function clearcache() {
		$this->cache = $this->dirsCache = array();
		$this->sessionRestart();
		unset($this->sessionCache['rootstat'][md5($this->root)]);
		elFinder::sessionWrite();
	}
	
	/**
	 * Return file mimetype
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mimetype($path, $name = '') {
		$type = '';
		
		if ($name === '') {
			$name = $path;
		}
		$ext = (false === $pos = strrpos($name, '.')) ? '' : substr($name, $pos + 1);
		if ($this->mimeDetect == 'finfo') {
			if ($type = @finfo_file($this->finfo, $path)) {
				if ($ext && preg_match('~^application/(?:octet-stream|(?:x-)?zip)~', $type)) {
					if (isset(elFinderVolumeDriver::$mimetypes[$ext])) $type = elFinderVolumeDriver::$mimetypes[$ext];
				} else if ($ext === 'js' && preg_match('~^text/~', $type)) {
					$type = 'text/javascript';
				}
			} else {
				$type = 'unknown';
			}
		} elseif ($this->mimeDetect == 'mime_content_type') {
			$type = mime_content_type($path);
		} else {
			$type = elFinderVolumeDriver::mimetypeInternalDetect($path);
		}
		
		$type = explode(';', $type);
		$type = trim($type[0]);

		if (in_array($type, array('application/x-empty', 'inode/x-empty'))) {
			// finfo return this mime for empty files
			$type = 'text/plain';
		} elseif ($type == 'application/x-zip') {
			// http://elrte.org/redmine/issues/163
			$type = 'application/zip';
		}
		
		// mime type normalization
		$_checkKey = strtolower($ext.':'.$type);
		if (isset($this->options['mimeMap'][$_checkKey])) {
			$type = $this->options['mimeMap'][$_checkKey];
		}
		
		return $type == 'unknown' && $this->mimeDetect != 'internal'
			? elFinderVolumeDriver::mimetypeInternalDetect($path)
			: $type;
		
	}
	
	/**
	 * Detect file mimetype using "internal" method
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	static protected function mimetypeInternalDetect($path) {
		// load default MIME table file "mime.types"
		if (!elFinderVolumeDriver::$mimetypesLoaded) {
			elFinderVolumeDriver::$mimetypesLoaded = true;
			$file = dirname(__FILE__).DIRECTORY_SEPARATOR.'mime.types';
			if (is_readable($file)) {
				$mimecf = file($file);
				foreach ($mimecf as $line_num => $line) {
					if (!preg_match('/^\s*#/', $line)) {
						$mime = preg_split('/\s+/', $line, -1, PREG_SPLIT_NO_EMPTY);
						for ($i = 1, $size = count($mime); $i < $size ; $i++) {
							if (!isset(elFinderVolumeDriver::$mimetypes[$mime[$i]])) {
								elFinderVolumeDriver::$mimetypes[$mime[$i]] = $mime[0];
							}
						}
					}
				}
			}
		}
		$pinfo = pathinfo($path); 
		$ext   = isset($pinfo['extension']) ? strtolower($pinfo['extension']) : '';
		return isset(elFinderVolumeDriver::$mimetypes[$ext]) ? elFinderVolumeDriver::$mimetypes[$ext] : 'unknown';
	}
	
	/**
	 * Return file/total directory size
	 *
	 * @param  string  $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function countSize($path) {
		$stat = $this->stat($path);

		if (empty($stat) || !$stat['read'] || !empty($stat['hidden'])) {
			return 'unknown';
		}
		
		if ($stat['mime'] != 'directory') {
			return $stat['size'];
		}
		
		$subdirs = $this->options['checkSubfolders'];
		$this->options['checkSubfolders'] = true;
		$result = 0;
		foreach ($this->getScandir($path) as $stat) {
			$size = $stat['mime'] == 'directory' && $stat['read'] 
				? $this->countSize($this->joinPathCE($path, $stat['name'])) 
				: (isset($stat['size']) ? intval($stat['size']) : 0);
			if ($size > 0) {
				$result += $size;
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
		if (! empty($this->ARGS['cmd']) && $this->ARGS['cmd'] === 'parents') {
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
	 * @param  string  $path  parent dir path
	 * @param  int     $deep  tree deep
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
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
		
		$timeout = $this->options['searchTimeout']? $this->searchStart + $this->options['searchTimeout'] : 0;
		if ($timeout && $timeout < time()) {
			$this->setError(elFinder::ERROR_SEARCH_TIMEOUT, $this->path($this->encode($path)));
			return $result;
		}
		
		foreach($this->scandirCE($path) as $p) {
			@set_time_limit($this->options['searchTimeout'] + 30);
			
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

			if ((!$mimes || $stat['mime'] !== 'directory') && $this->stripos($name, $q) !== false) {
				$stat['path'] = $this->path($stat['hash']);
				if ($this->URL && !isset($stat['url'])) {
					$path = str_replace($this->separator, '/', substr($p, strlen($this->root) + 1));
					if ($this->encoding) {
						$path = str_replace('%2F', '/', rawurlencode($this->convEncIn($path, true)));
					}
					$stat['url'] = $this->URL . $path;
				}
				
				$result[] = $stat;
			}
			if ($stat['mime'] == 'directory' && $stat['read'] && !isset($stat['alias'])) {
				$result = array_merge($result, $this->doSearch($p, $q, $mimes));
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
		$srcStat = $this->stat($src);
		$this->clearcache();
		
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
		
		if ($srcStat['mime'] == 'directory') {
			$test = $this->stat($this->joinPathCE($dst, $name));
			$this->clearcache();
			
			if (($test && $test['mime'] != 'directory') || (! $test = $this->mkdir($this->encode($dst), $name))) {
				return $this->setError(elFinder::ERROR_COPY, $this->path($srcStat['hash']));
			}
			
			$dst = $this->decode($test['hash']);
			
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
			$this->clearcache();
			return $dst;
		}

		if ($res = $this->convEncOut($this->_copy($this->convEncIn($src), $this->convEncIn($dst), $this->convEncIn($name)))) {
			return is_string($res)? $res : $this->joinPathCE($dst, $name);
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
			$this->removed[] = $stat;
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
		
		if (($source = $volume->file($src)) == false) {
			return $this->setError(elFinder::ERROR_COPY, '#'.$src, $volume->error());
		}
		
		$errpath = $volume->path($source['hash']);
		
		if (!$this->nameAccepted($source['name'])) {
			return $this->setError(elFinder::ERROR_COPY, $errpath, elFinder::ERROR_INVALID_NAME);
		}
				
		if (!$source['read']) {
			return $this->setError(elFinder::ERROR_COPY, $errpath, elFinder::ERROR_PERM_DENIED);
		}
		
		if ($source['mime'] == 'directory') {
			$test = $this->stat($this->joinPathCE($destination, $name));
			$this->clearcache();

			if (($test && $test['mime'] != 'directory') || (! $test = $this->mkdir($this->encode($destination), $name))) {
			//if ((!$stat || $stat['mime'] != 'directory') && $this->convEncOut(!$this->_mkdir($this->convEncIn($destination), $this->convEncIn($name)))) {
				return $this->setError(elFinder::ERROR_COPY, $errpath);
			}
			
			$path = $this->joinPathCE($destination, $name);
			$path = $this->decode($test['hash']);
			
			foreach ($volume->scandir($src) as $entr) {
				if (!$this->copyFrom($volume, $entr['hash'], $path, $entr['name'])) {
					$this->remove($path, true); // fall back
					return $this->setError($this->error, elFinder::ERROR_COPY, $errpath);
				}
			}
			
		} else {
			// $mime = $source['mime'];
			// $w = $h = 0;
			if (($dim = $volume->dimensions($src))) {
				$s = explode('x', $dim);
				$source['width']  = $s[0];
				$source['height'] = $s[1];
			}
			
			if (($fp = $volume->open($src)) == false
			|| ($path = $this->saveCE($fp, $destination, $name, $source)) == false) {
				$fp && $volume->close($fp, $src);
				return $this->setError(elFinder::ERROR_COPY, $errpath);
			}
			$volume->close($fp, $src);
			
			// MIME check
			$stat = $this->stat($path);
			$mimeByName = elFinderVolumeDriver::mimetypeInternalDetect($stat['name']);
			if ($stat['mime'] === $mimeByName) {
				$mimeByName = '';
			}
			if (!$this->allowPutMime($stat['mime']) || ($mimeByName && $mimeByName !== 'unknown' && !$this->allowPutMime($mimeByName))) {
				$this->remove($path, true);
				return $this->setError(elFinder::ERROR_UPLOAD_FILE_MIME, $errpath);
			}
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
		return $stat['hash'].$stat['ts'].'.png';
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
		return (!$checkTmbPath || $this->tmbPathWritable) 
			&& (!$this->tmbPath || strpos($path, $this->tmbPath) === false) // do not create thumnbnail for thumnbnail
			&& $this->imgLib 
			&& strpos($stat['mime'], 'image') === 0 
			&& ($this->imgLib == 'gd' ? in_array($stat['mime'], array('image/jpeg', 'image/png', 'image/gif', 'image/x-ms-bmp')) : true);
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
	 * @param  string  $path  file path
	 * @param  string  $mime  file mime type
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function createTmb($path, $stat) {
		if (!$stat || !$this->canCreateTmb($path, $stat)) {
			return false;
		}

		$name = $this->tmbname($stat);
		$tmb  = $this->tmbPath.DIRECTORY_SEPARATOR.$name;

		// copy image into tmbPath so some drivers does not store files on local fs
		if (($src = $this->fopenCE($path, 'rb')) == false) {
			return false;
		}

		if (($trg = fopen($tmb, 'wb')) == false) {
			$this->fcloseCE($src, $path);
			return false;
		}

		while (!feof($src)) {
			fwrite($trg, fread($src, 8192));
		}

		$this->fcloseCE($src, $path);
		fclose($trg);

		$result = false;
		
		$tmbSize = $this->tmbSize;
		
		if (($s = getimagesize($tmb)) == false) {
			return false;
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
				$result = $this->imgSquareFit($result, $tmbSize, $tmbSize, 'center', 'middle', $this->options['tmbBgColor'], 'png' );
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
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	protected function imgResize($path, $width, $height, $keepProportions = false, $resizeByBiggerSide = true, $destformat = null, $jpgQuality = null) {
		if (($s = @getimagesize($path)) == false) {
			return false;
		}

		$result = false;
		
		list($size_w, $size_h) = array($width, $height);
	
		if (!$jpgQuality) {
			$jpgQuality = $this->options['jpgQuality'];
		}
		
		if ($keepProportions == true) {
		
			list($orig_w, $orig_h) = array($s[0], $s[1]);
		
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
					$img->resizeImage($size_w, $size_h, $filter, 1);
					$result = $this->imagickImage($img, $path, $destformat, $jpgQuality);
				}
				
				$img->destroy();

				return $result ? $path : false;

				break;

			case 'gd':
				$img = $this->gdImageCreate($path,$s['mime']);

				if ($img &&  false != ($tmp = imagecreatetruecolor($size_w, $size_h))) {
				
					$this->gdImageBackground($tmp,$this->options['tmbBgColor']);
					
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
		if (($s = @getimagesize($path)) == false) {
			return false;
		}

		$result = false;
		
		if (!$jpgQuality) {
			$jpgQuality = $this->options['jpgQuality'];
		}

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
				
				$img->destroy();

				return $result ? $path : false;

				break;

			case 'gd':
				$img = $this->gdImageCreate($path,$s['mime']);

				if ($img &&  false != ($tmp = imagecreatetruecolor($width, $height))) {
					
					$this->gdImageBackground($tmp,$this->options['tmbBgColor']);

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
	 * @param  string   $path               image file
	 * @param  int      $width              square width
	 * @param  int      $height             square height
	 * @param  int	    $align              reserved
	 * @param  int 	    $valign             reserved
	 * @param  string   $bgcolor            square background color in #rrggbb format
	 * @param  string   $destformat         image destination format
	 * @param  int      $jpgQuality         JEPG quality (1-100)
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	protected function imgSquareFit($path, $width, $height, $align = 'center', $valign = 'middle', $bgcolor = '#0000ff', $destformat = null, $jpgQuality = null) {
		if (($s = @getimagesize($path)) == false) {
			return false;
		}

		$result = false;

		/* Coordinates for image over square aligning */
		$y = ceil(abs($height - $s[1]) / 2); 
		$x = ceil(abs($width - $s[0]) / 2);

		if (!$jpgQuality) {
			$jpgQuality = $this->options['jpgQuality'];
		}

		switch ($this->imgLib) {
			case 'imagick':
				try {
					$img = new imagick($path);
				} catch (Exception $e) {
					return false;
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
						$gif->destroy();
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
					$result = $this->imagickImage($img, $path, $destformat, $jpgQuality);
				}
				
				$img1->destroy();
				$img->destroy();
				return $result ? $path : false;

				break;

			case 'gd':
				$img = $this->gdImageCreate($path,$s['mime']);

				if ($img &&  false != ($tmp = imagecreatetruecolor($width, $height))) {

					$this->gdImageBackground($tmp,$bgcolor);

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
		if (($s = @getimagesize($path)) == false || $degree % 360 === 0) {
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
			$cmds = array(
				'exiftran -i '.$exiftran[$count].' '.$path,
				'jpegtran -rotate '.$jpegtran[$count].' -copy all -outfile '.$quotedPath.' '.$quotedPath
			);
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

		switch ($this->imgLib) {
			case 'imagick':
				try {
					$img = new imagick($path);
				} catch (Exception $e) {
					return false;
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
				$img->destroy();
				return $result ? $path : false;

				break;

			case 'gd':
				$img = $this->gdImageCreate($path,$s['mime']);

				$degree = 360 - $degree;
				list($r, $g, $b) = sscanf($bgcolor, "#%02x%02x%02x");
				$bgcolor = imagecolorallocate($img, $r, $g, $b);
				$tmp = imageRotate($img, $degree, (int)$bgcolor);

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
	 * @param  string  $command       command line
	 * @param  array   $output        stdout strings
	 * @param  array   $return_var    process exit code
	 * @param  array   $error_output  stderr strings
	 * @return int     exit code
	 * @author Alexey Sukhotin
	 **/
	protected function procExec($command , array &$output = null, &$return_var = -1, array &$error_output = null) {

		$descriptorspec = array(
			0 => array("pipe", "r"),  // stdin
			1 => array("pipe", "w"),  // stdout
			2 => array("pipe", "w")   // stderr
		);

		$process = proc_open($command, $descriptorspec, $pipes, null, null);

		if (is_resource($process)) {

			fclose($pipes[0]);

			$tmpout = '';
			$tmperr = '';

			$output = stream_get_contents($pipes[1]);
			$error_output = stream_get_contents($pipes[2]);

			fclose($pipes[1]);
			fclose($pipes[2]);
			$return_var = proc_close($process);


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
		if ($stat['mime'] === 'directory') {
			foreach ($this->scandirCE($this->decode($stat['hash'])) as $p) {
				@set_time_limit(30);
				$name = $this->basenameCE($p);
				$name != '.' && $name != '..' && $this->rmTmb($this->stat($p));
			}
		} else if (!empty($stat['tmb']) && $stat['tmb'] != "1") {
			$tmb = $this->tmbPath.DIRECTORY_SEPARATOR.$stat['tmb'];
			file_exists($tmb) && @unlink($tmb);
			clearstatcache();
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
			return @imagecreatefromjpeg($path);

			case 'image/png':
			return @imagecreatefrompng($path);

			case 'image/gif':
			return @imagecreatefromgif($path);

			case 'image/x-ms-bmp':
			if (!function_exists('imagecreatefrombmp')) {
				include_once dirname(__FILE__).'/libs/GdBmp.php';
			}
			return @imagecreatefrombmp($path);
			
			case 'image/xbm':
			return @imagecreatefromxbm($path);
			
			case 'image/xpm':
			return @imagecreatefromxpm($path);
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
	 * @param int    $jpgQuality  JEPG quality (1-100)
	 */
	protected function gdImage($image, $filename, $destformat, $mime, $jpgQuality = null ){

		if (!$jpgQuality) {
			$jpgQuality = $this->options['jpgQuality'];
		}
		if ($destformat == 'jpg' || ($destformat == null && $mime == 'image/jpeg')) {
			return imagejpeg($image, $filename, $jpgQuality);
		}

		if ($destformat == 'gif' || ($destformat == null && $mime == 'image/gif')) {
			return imagegif($image, $filename, 7);
		}

		return imagepng($image, $filename, 7);
	}

	/**
	 * Output imagick image to file
	 *
	 * @param resource $img imagick image resource
	 * @param string $filename The path to save the file to.
	 * @param string $destformat The Image type to use for $filename
	 * @param int    $jpgQuality  JEPG quality (1-100)
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
		
		
		
		if ($destformat == 'jpg' || ($destformat == null && $mime == 'image/jpeg')) {
			return imagejpeg($image, $filename, $jpgQuality);
		}

		if ($destformat == 'gif' || ($destformat == null && $mime == 'image/gif')) {
			return imagegif($image, $filename, 7);
		}

		return imagepng($image, $filename, 7);
	}

	/**
	 * Assign the proper background to a gd image
	 *
	 * @param resource $image gd image resource
	 * @param string $bgcolor background color in #rrggbb format
	 */
	protected function gdImageBackground($image, $bgcolor){

		if( $bgcolor == 'transparent' ){
			imagesavealpha($image,true);
			$bgcolor1 = imagecolorallocatealpha($image, 255, 255, 255, 127);

		}else{
			list($r, $g, $b) = sscanf($bgcolor, "#%02x%02x%02x");
			$bgcolor1 = imagecolorallocate($image, $r, $g, $b);
		}

		imagefill($image, 0, 0, $bgcolor1);
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
		
		if (function_exists('proc_open')) {
		
			$this->procExec('tar --version', $o, $ctar);
			
			if ($ctar == 0) {
				$arcs['create']['application/x-tar']  = array('cmd' => 'tar', 'argc' => '-cf', 'ext' => 'tar');
				$arcs['extract']['application/x-tar'] = array('cmd' => 'tar', 'argc' => '-xf', 'ext' => 'tar');
				unset($o);
				$test = $this->procExec('gzip --version', $o, $c);
				if ($c == 0) {
					$arcs['create']['application/x-gzip']  = array('cmd' => 'tar', 'argc' => '-czf', 'ext' => 'tgz');
					$arcs['extract']['application/x-gzip'] = array('cmd' => 'tar', 'argc' => '-xzf', 'ext' => 'tgz');
				}
				unset($o);
				$test = $this->procExec('bzip2 --version', $o, $c);
				if ($c == 0) {
					$arcs['create']['application/x-bzip2']  = array('cmd' => 'tar', 'argc' => '-cjf', 'ext' => 'tbz');
					$arcs['extract']['application/x-bzip2'] = array('cmd' => 'tar', 'argc' => '-xjf', 'ext' => 'tbz');
				}
				unset($o);
				$test = $this->procExec('xz --version', $o, $c);
				if ($c == 0) {
					$arcs['create']['application/x-xz']  = array('cmd' => 'tar', 'argc' => '-cJf', 'ext' => 'xz');
					$arcs['extract']['application/x-xz'] = array('cmd' => 'tar', 'argc' => '-xJf', 'ext' => 'xz');
				}
			}
			unset($o);
			$this->procExec('zip -v', $o, $c);
			if ($c == 0) {
				$arcs['create']['application/zip']  = array('cmd' => 'zip', 'argc' => '-r9', 'ext' => 'zip');
			}
			unset($o);
			$this->procExec('unzip --help', $o, $c);
			if ($c == 0) {
				$arcs['extract']['application/zip'] = array('cmd' => 'unzip', 'argc' => '',  'ext' => 'zip');
			}
			unset($o);
			$this->procExec('rar --version', $o, $c);
			if ($c == 0 || $c == 7) {
				$arcs['create']['application/x-rar']  = array('cmd' => 'rar', 'argc' => 'a -inul', 'ext' => 'rar');
				$arcs['extract']['application/x-rar'] = array('cmd' => 'rar', 'argc' => 'x -y',    'ext' => 'rar');
			} else {
				unset($o);
				$test = $this->procExec('unrar', $o, $c);
				if ($c==0 || $c == 7) {
					$arcs['extract']['application/x-rar'] = array('cmd' => 'unrar', 'argc' => 'x -y', 'ext' => 'rar');
				}
			}
			unset($o);
			$this->procExec('7za --help', $o, $c);
			if ($c == 0) {
				$arcs['create']['application/x-7z-compressed']  = array('cmd' => '7za', 'argc' => 'a', 'ext' => '7z');
				$arcs['extract']['application/x-7z-compressed'] = array('cmd' => '7za', 'argc' => 'x -y', 'ext' => '7z');
				
				if (empty($arcs['create']['application/zip'])) {
					$arcs['create']['application/zip'] = array('cmd' => '7za', 'argc' => 'a -tzip', 'ext' => 'zip');
				}
				if (empty($arcs['extract']['application/zip'])) {
					$arcs['extract']['application/zip'] = array('cmd' => '7za', 'argc' => 'x -tzip -y', 'ext' => 'zip');
				}
				if (empty($arcs['create']['application/x-tar'])) {
					$arcs['create']['application/x-tar'] = array('cmd' => '7za', 'argc' => 'a -ttar', 'ext' => 'tar');
				}
				if (empty($arcs['extract']['application/x-tar'])) {
					$arcs['extract']['application/x-tar'] = array('cmd' => '7za', 'argc' => 'x -ttar -y', 'ext' => 'tar');
				}
			} else if (substr(PHP_OS,0,3) === 'WIN') {
				// check `7z` for Windows server.
				unset($o);
				$this->procExec('7z', $o, $c);
				if ($c == 0) {
					$arcs['create']['application/x-7z-compressed']  = array('cmd' => '7z', 'argc' => 'a', 'ext' => '7z');
					$arcs['extract']['application/x-7z-compressed'] = array('cmd' => '7z', 'argc' => 'x -y', 'ext' => '7z');
					
					if (empty($arcs['create']['application/zip'])) {
						$arcs['create']['application/zip'] = array('cmd' => '7z', 'argc' => 'a -tzip', 'ext' => 'zip');
					}
					if (empty($arcs['extract']['application/zip'])) {
						$arcs['extract']['application/zip'] = array('cmd' => '7z', 'argc' => 'x -tzip -y', 'ext' => 'zip');
					}
					if (empty($arcs['create']['application/x-tar'])) {
						$arcs['create']['application/x-tar'] = array('cmd' => '7z', 'argc' => 'a -ttar', 'ext' => 'tar');
					}
					if (empty($arcs['extract']['application/x-tar'])) {
						$arcs['extract']['application/x-tar'] = array('cmd' => '7z', 'argc' => 'x -ttar -y', 'ext' => 'tar');
					}
				}
			}
		
		}
		
		// Use PHP ZipArchive Class
		if (class_exists('ZipArchive', false)) {
			if (empty($arcs['create']['application/zip'])) {
				$arcs['create']['application/zip']  = array('cmd' => 'phpfunction', 'argc' => 'self::zipArchiveZip', 'ext' => 'zip');
			}
			if (empty($arcs['extract']['application/zip'])) {
				$arcs['extract']['application/zip'] = array('cmd' => 'phpfunction', 'argc' => 'self::zipArchiveUnzip', 'ext' => 'zip');
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

		$sepquoted = preg_quote($separator, '#');

		// normalize `/../`
		$normreg = '#('.$sepquoted.')[^'.$sepquoted.']+'.$sepquoted.'\.\.'.$sepquoted.'#';
		while(preg_match($normreg, $path)) {
			$path = preg_replace($normreg, '$1', $path);
		}
		
		// 'Here'
		if ($path === '' || $path === '.' . $separator) return $base;
		
		// Absolute path
		if ($path[0] === $separator || strpos($path, $systemroot) === 0) {
			return $path;
		}
		
		$preg_separator = '#' . $sepquoted . '#';
		
		// Relative path from 'Here'
		if (substr($path, 0, 2) === '.' . $separator || $path[0] !== '.' || substr($path, 0, 3) !== '..' . $separator) {
			$arrn = preg_split($preg_separator, $path, -1, PREG_SPLIT_NO_EMPTY);
			if ($arrn[0] !== '.') {
				array_unshift($arrn, '.');
			}
			$arrn[0] = $base;
			return join($separator, $arrn);
		}
		
		// Relative path from dirname()
		if (substr($path, 0, 3) === '../') {
			$arrn = preg_split($preg_separator, $path, -1, PREG_SPLIT_NO_EMPTY);
			$arrp = preg_split($preg_separator, $base, -1, PREG_SPLIT_NO_EMPTY);
		
			while (! empty($arrn) && $arrn[0] === '..') {
				array_shift($arrn);
				array_pop($arrp);
			}
			$path = ! empty($arrp) ? $systemroot . join($separator, array_merge($arrp, $arrn)) :
				(! empty($arrn) ? $systemroot . join($separator, $arrn) : $systemroot);
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
		if (!is_link($dir) && is_dir($dir)) {
			@chmod($dir, 0777);
			foreach (array_diff(scandir($dir), array('.', '..')) as $file) {
				@set_time_limit(30);
				$path = $dir . DIRECTORY_SEPARATOR . $file;
				if (!is_link($dir) && is_dir($path)) {
					$this->rmdirRecursive($path);
				} else {
					@chmod($path, 0666);
					@unlink($path);
				}
			}
			return @rmdir($dir);
		} else if (is_file($dir) || is_link($dir)) {
			@chmod($dir, 0666);
			return @unlink($dir);
		}
		return false;
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
			chdir($dir);
			
			$files = array_map('escapeshellarg', $files);
			
			$cmd = $arc['cmd'].' '.$arc['argc'].' '.escapeshellarg($name).' '.implode(' ', $files);
			$this->procExec($cmd, $o, $c);
			chdir($cwd);
		}
		$path = $dir.DIRECTORY_SEPARATOR.$name;
		return file_exists($path) ? $path : false;
	}
	
	/**
	 * Unpack archive
	 *
	 * @param  string  $path   archive path
	 * @param  array   $arc    archiver command and arguments (same as in $this->archivers)
	 * @param  bool    $remove remove archive ( unlink($path) )
	 * @return void
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 * @author Naoki Sawada
	 **/
	protected function unpackArchive($path, $arc, $remove = true) {
		$dir = dirname($path);
		if ($arc['cmd'] === 'phpfunction') {
			if (is_callable($arc['argc'])) {
				call_user_func_array($arc['argc'], array($path, $dir));
			}
		} else {
			$cwd = getcwd();
			chdir($dir);
			$cmd = $arc['cmd'].' '.$arc['argc'].' '.escapeshellarg(basename($path));
			$this->procExec($cmd, $o, $c);
			chdir($cwd);
		}
		$remove && unlink($path);
	}
	
	/**
	 * Create Zip archive using PHP class ZipArchive
	 * 
	 * @param  string        $dir      target dir
	 * @param  array         $files    files names list
	 * @param  string|object $zipPath  Zip archive name
	 * @return void
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
	 * @param  string  $source  source file path
	 * @param  string  $target  target dir path
	 * @param  string  $name    file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _copy($source, $targetDir, $name);
	
	/**
	 * Move file into another parent dir.
	 * Return new file path or false.
	 *
	 * @param  string  $source  source file path
	 * @param  string  $target  target dir path
	 * @param  string  $name    file name
	 * @return string|bool
	 * @author Dmitry (dio) Levashov
	 **/
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
