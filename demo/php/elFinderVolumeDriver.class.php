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
	 * undocumented class variable
	 *
	 * @var string
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
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $archivers = array(
		'create'  => array(),
		'extract' => array()
	);
	
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
		// library to crypt/uncrypt files names (not implemented)
		'cryptLib'        => '',
		// how to detect files mimetypes. (auto/internal/finfo/mime_content_type)
		'mimeDetect'      => 'auto',       
		// mime.types file path (for mimeDetect==internal)
		'mimefile'        => '',          
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
		// how frequiently clean thumbnails dir (0 - never, 100 - every init request)    
		'tmbCleanProb' => 0,            
		// on paste file -  if true - old file will be replaced with new one, if false new file get name - original_name-number.ext
		'copyOverwrite'   => true,    
		// if true - join new and old directories content on paste     
		'copyJoin'        => true, 
		// on upload -  if true - old file will be replaced with new one, if false new file get name - original_name-number.ext   
		'uploadOverwrite' => true, 
		// mimetypes allowed to upload
		'uploadAllow'     => array('all'),      
		// mimetypes not allowed to upload
		'uploadDeny'      => array(),      
		// order to proccess uploadAllow and uploadAllow options
		'uploadOrder'     => 'deny,allow', 
		// maximum upload file size. NOTE - this is size for every uploaded files
		'uploadMaxSize'   => 0,
		// files dates format
		'dateFormat'      => 'j M Y H:i',  
		// files time format
		'timeFormat'      => 'H:i',
		// allow to copy from this volume to other ones?
		'copyFrom'        => true,  
		// allow to copy from other volumes to this one?
		'copyTo'          => true,  
		// list of commands disabled on this root
		'disabled'        => array(),      
		// regexp or function name to validate new file name
		'acceptedName'    => '/^[^\.]/',
		// function/class method to control files permissions
		'accessControl' => null,
		// some data required by access control
		'accessControlData' => null,
		// default permissions. not set hidden/locked here - take no effect
		'defaults'     => array(   
			'read'   => true,
			'write'  => true
		),
		// files attributes
		'attributes'   => array(),  
		// Allowed archive's mimetypes to create. Leave empty for all available types. 
		'archiveMimes' => array(),  
		// Manual config for archivers. See example below. Leave empty for auto detect	
		'archivers'    => array(),
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
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $diabled = array();
	
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
		'doc'   => 'application/vnd.ms-word',
		'xls'   => 'application/vnd.ms-excel',
		'ppt'   => 'application/vnd.ms-powerpoint',
		'pps'   => 'application/vnd.ms-powerpoint',
		'pdf'   => 'application/pdf',
		'xml'   => 'application/xml',
		'odt'   => 'application/vnd.oasis.opendocument.text',
		'swf'   => 'application/x-shockwave-flash',
		'torrent' => 'application/x-bittorrent',
		'jar'   => 'application/x-jar',
		// archives
		'gz'    => 'application/x-gzip',
		'tgz'   => 'application/x-gzip',
		'bz'    => 'application/x-bzip2',
		'bz2'   => 'application/x-bzip2',
		'tbz'   => 'application/x-bzip2',
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
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $separator = DIRECTORY_SEPARATOR;
	
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
		
		// clean thumbnails dir
		if ($this->tmbPath) {
			srand((double) microtime() * 1000000);

			if (rand(1, 200) <= $this->options['tmbCleanProb']) {
				$ls = scandir($this->tmbPath);

				for ($i=0, $s = count($ls); $i < $s; $i++) {
					$pinfo = pathinfo($ls[$i]);

					if (strtolower($pinfo['extension']) == 'png') {
						@unlink($this->tmbPath.DIRECTORY_SEPARATOR.$ls[$i]);
					}
				}
			}
		}
	}
	
	
	/*********************************************************************/
	/*                              PUBLIC API                           */
	/*********************************************************************/
	
	/**
	 * Return driver id
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
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function name() {
		return strtolower(substr(get_class($this), strlen('elfinderdriver')));
	}
		
	/**
	 * Return debug info for client
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function debug() {
		return array(
			'mimeDetect' => $this->mimeDetect,
			'imgLib'     => $this->imgLib
		);
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
		if (empty($opts['path'])) {
			return false;
		}
		
		$this->options = array_merge($this->options, $opts);
		$this->id = $this->driverId.(!empty($this->options['id']) ? $this->options['id'] : elFinder::$volumesCnt++).'_';
		$this->root = $this->_normpath($this->options['path']);
		$this->separator = isset($this->options['separator']) ? $this->options['separator'] : DIRECTORY_SEPARATOR;
		
		// default file attribute
		$this->defaults = array(
			'read'    => isset($this->options['defaults']['read'])  ? !!$this->options['defaults']['read']  : true,
			'write'   => isset($this->options['defaults']['write']) ? !!$this->options['defaults']['write'] : true,
			'locked'  => false,
			'hidden'  => false
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

		if (!empty($this->options['accessControl'])) {
			if (is_string($this->options['accessControl']) 
			&& function_exists($this->options['accessControl'])) {
				$this->access = $this->options['accessControl'];
			} elseif (is_array($this->options['accessControl']) 
			&& count($this->options['accessControl']) > 1 
			&& is_object($this->options['accessControl'][0])
			&& method_exists($this->options['accessControl'][0], $this->options['accessControl'][1])) {
				$this->access = array($this->options['accessControl'][0], $this->options['accessControl'][1]);
			}
		}
		// debug($this->attributes);
		if (!$this->init()) {
			return false;
		}

		$this->today     = mktime(0,0,0, date('m'), date('d'), date('Y'));
		$this->yesterday = $this->today-86400;
		
		// check some options is arrays
		$this->uploadAllow = isset($this->options['uploadAllow']) && is_array($this->options['uploadAllow'])
			? $this->options['uploadAllow']
			: array();
			
		$this->uploadDeny = isset($this->options['uploadDeny']) && is_array($this->options['uploadDeny'])
			? $this->options['uploadDeny']
			: array();
			
		$parts = explode(',', isset($this->options['uploadOrder']) ? $this->options['uploadOrder'] : 'deny,allow');
		$this->uploadOrder = array(trim($parts[0]), trim($parts[1]));
			
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
		&& class_exists('finfo')
		&& preg_match($regexp, array_shift(explode(';', @finfo_file(finfo_open(FILEINFO_MIME), __FILE__))))) {
			$type = 'finfo';
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
							} else {
								// echo $mime[$i].' '.$mime[0].'<br>';
							}
						}
					}
				}
			}
		}
		// debug(self::$mimetypes);
		// set root path
		if (!$this->_isDir($this->root)) {
			return false;
		}

		$read = $this->attr($this->root, 'read');
		// echo $this->attr($this->root.'/.tmb', 'hidden');
		if (!$read && !$this->attr($this->root, 'write')) {
			return false;
		}
		
		if ($read) {
			// check startPath - path to open by default instead of root
			if ($this->options['startPath']) {
				$path = $this->_normpath($this->options['startPath']);
				if ($this->_isDir($path) 
				&& $this->attr($path, 'read') 
				&& !$this->attr($path, 'hidden')
				&& $this->_inpath($path, $this->root)) {
					$this->startPath = $path;
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
		
		$this->rootName = empty($this->options['alias']) ? $this->_basename($this->root) : $this->options['alias'];
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
		
		$this->nameValidator = is_string($this->options['acceptedName']) && !empty($this->options['acceptedName']) 
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
				if (substr($mime, 'application/') === 0 
				&& !empty($cons['cmd']) 
				&& isset($conf['argc']) 
				&& !empty($conf['ext'])
				&& !isset($this->archivers['extract'][$mime])) {
					$this->archivers['extract'][$mime] = $conf;
				}
			}
		}

		$this->configure();
		return $this->mounted = true;
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
	 * Return root folder hash
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function root() {
		return $this->encode($this->root);
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
	 * Return file path started from root dir
	 *
	 * @param  string  $hash  file hash
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function path($hash) {
		return $this->_path($this->decode($hash));
	}
	
	/**
	 * Return volume options required by client:
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function options($hash) {
		return array(
			'path'          => $this->path($hash),
			'url'           => $this->URL,
			'tmbUrl'        => $this->tmbURL,
			'disabled'      => $this->disabled,
			'separator'     => $this->separator,
			'copyOverwrite' => intval($this->options['copyOverwrite']),
			'archivers'     => array(
				'create'  => array_keys($this->archivers['create']),
				'extract' => array_keys($this->archivers['extract'])
			)
		);
	}
	
	/**
	 * Return true if mime is required mimes list
	 *
	 * @param  string $mime   mime type to check
	 * @param  array  $mimes  allowed mime types list
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function mimeAccepted($mime, $mimes=array()) {
		return $mime == 'directory' || empty($mimes) || in_array($mime, $mimes) || in_array(substr($mime, 0, strpos($mime, '/')), $mimes);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function copyFromAllowed() {
		return !!$this->options['copyFrom'];
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function copyToAllowed() {
		return !!$this->options['copyTo'];
	}
	
	/**
	 * Return true if file exists
	 *
	 * @param  string  $hash  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function fileExists($hash) {
		$path = $this->decode($hash);
		return $path && $this->_fileExists($path);
	}
	
	/**
	 * Check if file is folder
	 *
	 * @param  string  $hash  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isDir($hash) {
		$path = $this->decode($hash);
		return $path && $this->_fileExists($path) && $this->_isDir($this->decode($hash));
	}
	
	/**
	 * Check if file is not folder
	 *
	 * @param  string  $hash  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isFile($hash) {
		$path = $this->decode($hash);
		return $path && $this->_fileExists($path) && $this->_isFile($this->decode($hash));
	}
	
	/**
	 * Check if file symlink
	 *
	 * @param  string  $hash  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isLink($hash) {
		$path = $this->decode($hash);
		return $path && $this->_fileExists($path) && $this->_isLink($this->decode($hash));
	}
	
	/**
	 * Return true if folder is readable.
	 * If hash is not set - check root folder
	 *
	 * @param  string  $hash  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isReadable($hash='') {
		$path = $hash ? $this->decode($hash) : $this->root;
		return $path && $this->_fileExists($path) && $this->attr($path, 'read');
	}
	
	/**
	 * Return true if folder is writeable.
	 * If hash is not set - check root folder
	 *
	 * @param  string  $hash  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isWritable($hash='') {
		$path = $hash ? $this->decode($hash) : $this->root;
		return $path && $this->_fileExists($path) && $this->attr($path, 'write');
	}
	
	/**
	 * Return true if file is hidden
	 *
	 * @param  string  $hash  file hash
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function isHidden($hash) {
		$path = $this->decode($hash);
		return $path && $this->_fileExists($path) && $this->attr($path, 'hidden');
	}
	
	/**
	 * Return true if file is locked
	 *
	 * @param  string  $hash  file hash
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function isLocked($hash) {
		$path = $this->decode($hash);
		return $path && $this->_fileExists($path) && $this->attr($path, 'locked');
	}
	
	/**
	 * Return file parent folder hash
	 *
	 * @param  string  $hash  file hash
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function parent($hash) {
		$path = $this->decode($hash);
		return $path ? $this->_dirname($path) : '';
	}
	
	/**
	 * Return file info or false on error
	 *
	 * @param  string   $hash    file hash
	 * @param  bool     $hidden  return hidden file info
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function file($hash, $hidden=false) {
		if (($file = $this->stat($this->decode($hash))) == false
		|| !($hidden || empty($file['hidden']))) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
		return $file;
	}
	
	/**
	 * Return folder info
	 *
	 * @param  string   $hash  folder hash
	 * @param  bool     $hidden  return hidden file info
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function dir($hash, $hidden=false, $resolveLink=false) {
		if (($dir = $this->file($hash, $hidden)) == false) {
			return $this->setError(elFinder::ERROR_DIR_NOT_FOUND);
		}
		
		if ($dir['mime'] != 'directory') {
			return $this->setError(elFinder::ERROR_NOT_DIR);
		}
		
		
		if ($resolveLink && !empty($dir['alias'])) {
			if (!($target = $this->_readlink($this->decode($hash)))) {
				return  $this->setError(elFinder::ERROR_DIR_NOT_FOUND);
			}

			if (!($dir = $this->stat($target)) || $this->attr($target, 'hidden')) {
				return  $this->setError(elFinder::ERROR_DIR_NOT_FOUND);
			}
			
			if ($dir['mime'] != 'directory') {
				return $this->setError(elFinder::ERROR_NOT_DIR);
			}
		}
		
		return $dir;
		
		return $dir['mime'] == 'directory' 
			? $dir 
			: $this->setError(elFinder::ERROR_NOT_DIR);
	}
	
	/**
	 * Return directory content or false on error
	 *
	 * @param  string   $hash   file hash
	 * @param  array    $mimes  allowed mimetypes list
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function scandir($hash, $mimes=array()) {
		if (($dir = $this->dir($hash)) == false) {
			return false;
		}
		
		return $dir['read']
			? $this->getScandir($this->decode($hash), $mimes)
			: $this->setError(elFinder::ERROR_PERM_DENIED);
	}

	/**
	 * Return dir files names list
	 * 
	 * @param  string  $hash   file hash
	 * @param  array   $mimes  allowed mimetypes list
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function ls($hash, $mimes=array()) {
		if (($dir = $this->dir($hash)) == false) {
			return false;
		}
		
		if (!$dir['read']) {
			$this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		$list = array();
		
		foreach ($this->_scandir($this->decode($hash)) as $p) {
			if (!$this->attr($p, 'hidden')
			&& ($this->_isDir($p) || !$mimes || $this->mimeAccepted($this->mimetype($p), $mimes))) {
				$list[] = $this->_basename($p);
			}
 		}

		return $list;
	}

	/**
	 * Return subfolders for required one or false on error
	 *
	 * @param  string   $hash  folder hash or empty string to get tree from root folder
	 * @param  int      $deep  subdir deep
	 * @param  string   $exclude  dir hash which subfolders must be exluded from result, required to not get stat twice on cwd subfolders
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function tree($hash='', $deep=0, $exclude='') {
		$hash = $hash ? $hash : $this->encode($this->root);
		
		if (($dir = $this->dir($hash)) == false) {
			return false;
		}
		if (!$dir['read']) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		$path = $this->decode($hash);
		$dirs = $this->gettree($path, $deep > 0 ? $deep -1 : $this->treeDeep-1, $this->decode($exclude));
		array_unshift($dirs, $dir);
		return $dirs;
	}
	
	/**
	 * Return part of dirs tree from required dir upside till root dir
	 *
	 * @param  string  $hash  directory hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function parents($hash) {
		if (($current = $this->dir($hash)) == false) {
			return false;
		}

		$path = $this->decode($hash);
		$tree = array();
		
		while ($path && $path != $this->root) {
			$path = $this->_dirname($path);
			if ($this->attr($path, 'hidden')) {
				return $this->setError(elFinder::ERROR_DIR_NOT_FOUND);
			}
			
			if (!$this->attr($path, 'read')) {
				return $this->setError(elFinder::ERROR_OPEN, $this->_basename($path), '<br>', elFinder::ERROR_PERM_DENIED);
			}
			
			$dir = $this->stat($path);

			array_unshift($tree, $dir);
			if ($path != $this->root) {
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
		if ($path = $this->decode($hash)) {
			return ($tmb = $this->gettmb($path)) ? $tmb : $this->createTmb($path);
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
		$path = $this->decode($hash);

		if (($file = $this->file($hash)) == false) {
			return false;
		}
		
		if ($file['mime'] == 'directory') {
			return false;
		}

		return $this->_fopen($path, 'rb');
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
		$this->_fclose($fp, $this->decode($hash));
	}
	
	/**
	 * Create directory and return dir info
	 *
	 * @param  string   $dst  destination directory
	 * @param  string   $name directory name
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function mkdir($dst, $name, $copy=false) {
		$path = $this->decode($dst);
		
		if (($dir = $this->dir($dst)) == false) {
			return $this->setError(elFinder::ERROR_TRGDIR_NOT_FOUND, '#'.$dst);
		}
		
		if (!$dir['write']) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if (!$this->nameAccepted($name)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME);
		}
		
		if ($copy && !$this->options['copyOverwrite']) {
			$name = $this->uniqueName($path, $name, '-', false);
		}
		
		$dst = $this->_joinPath($path, $name);
		
		if ($this->_fileExists($dst)) {
			
			if ($copy) {
				if (!$this->options['copyJoin'] && $this->attr($dst, 'write')) {
					foreach ($this->_scandir($dst) as $p) {
						$this->doRm($p);
					}
				}
				return $this->stat($dst);
			} 

			return $this->setError(elFinder::ERROR_EXISTS, $name);
		}
		
		return $this->_mkdir($path, $name) ? $this->stat($this->_joinPath($path, $name)) : false;
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
		$path = $this->decode($dst);
	
		if (($dir = $this->dir($dst, true)) == false) {
			return $this->setError(elFinder::ERROR_TRGDIR_NOT_FOUND, '#dst');
		}

		if (!$dir['write']) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}

		if (!$this->nameAccepted($name)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME, $name);
		}

		if ($this->_fileExists($this->_joinPath($path, $name))) {
			return $this->setError(elFinder::ERROR_EXISTS, $name);
		}

		return $this->_mkfile($path, $name) ? $this->stat($this->_joinPath($path, $name)) : false;
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
		$path = $this->decode($hash);
		
		
		if (!($file = $this->file($hash))) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
		
		$dir = $this->_dirname($path);
		
		if ($this->attr($path, 'locked')) {
			return $this->setError(elFinder::ERROR_LOCKED, $file['name']);
		}
		
		if (!$this->nameAccepted($name)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME, $name);
		}
		
		if ($name == $file['name']) {
			return $file;
		}
		
		$dst = $this->_joinPath($dir, $name);
		
		if ($this->_fileExists($dst)) {
			return $this->setError(elFinder::ERROR_EXISTS, $file['name']);
		}
		
		if ($this->_move($path, $dir, $name)) {
			$this->rmTmb($path);
			return $this->stat($this->_joinPath($dir, $name));
		} 
		return false;
	}
	
	/**
	 * Create file copy with suffix "copy number" and return its info
	 *
	 * @param  string   $hash  file hash
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function duplicate($hash) {
		if (($file = $this->file($hash)) == false) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
		
		$path = $this->decode($hash);
		$dir  = $this->_dirname($path);
		
		return ($path = $this->doCopy($path, $dir, $this->uniqueName($dir, $file['name']))) == false
			? false
			: $this->stat($path);
	}
	
	/**
	 * Return true if file mime type accepted for upload
	 *
	 * @param  string  $tmpPath  temporary file path
	 * @param  string  $name     file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function uploadAllow($tmpPath, $name) {
		if (!$this->nameAccepted($name)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME, $name);
		}
		
		$mime  = $this->mimetype($this->mimeDetect == 'internal' ? $name : $tmpPath); 
		$allow = in_array('all', $this->uploadAllow) || $this->mimeAccepted($mime, $this->uploadAllow);
		$deny  = in_array('all', $this->uploadDeny)  || $this->mimeAccepted($mime, $this->uploadDeny);
		// dont ask me what this mean. I forgot it, but its work :)
		// for details see python connector
		if (!($this->uploadOrder[0] == 'allow' ? $allow && !$deny : $allow || !$deny)) {
			return $this->setError(elFinder::ERROR_MIME);
		}
		
		if ($this->uploadMaxSize > 0 && filesize($tmpPath) > $this->uploadMaxSize) {
			return $this->setError(elFinder::ERROR_UPLOAD_SIZE);
		}

		return true;
	}
	
	/**
	 * Save file in required directory.
	 *
	 * @param  resource $fp   file pointer
	 * @param  string   $dst  destination directory
	 * @param  string   $name file name
	 * @param  string   $cmd  source command name
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function save($fp, $dst, $name, $cmd='upload') {
		if (($dir = $this->dir($dst, true, true)) == false) {
			return $this->setError(elFinder::ERROR_TRGDIR_NOT_FOUND, '#'.$dst);
		}
		
		if (!$dir['write']) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if (!$this->nameAccepted($name)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME, $name);
		}
		
		$dst  = $this->decode($dst);
		$_dst = $this->_joinPath($dst, $name);
		
		if ($this->_fileExists($_dst)) {
			if (($cmd == 'upload' && !$this->options['uploadOverwrite'])
			||  ($cmd == 'copy'   && !$this->options['copyOverwrite'])) {
				$name = $this->uniqueName($dst, $name, '-', false);
			} elseif (!$this->attr($_dst, 'write')) {
				return $this->setError(elFinder::ERROR_PERM_DENIED);
			} elseif (!$this->doRm($_dst)) {
				return false;
			}
		}
		
		return ($path = $this->_save($fp, $dst, $name))
			? $this->stat($path)
			: false;
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
		
		return $this->_getContents($this->decode($hash));
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
		$path = $this->decode($hash);
		
		if (!($file = $this->file($hash))) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
		
		if (!$file['write']) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		return $this->_filePutContents($path, $content) ? $this->stat($path) : false;
	}
	
	/**
	 * Extract files from archive
	 *
	 * @param  string  $hash  archive hash
	 * @return array|bool
	 * @author Dmitry (dio) Levashov, 
	 * @author Alexey Sukhotin
	 **/
	public function extract($hash) {
		if (($file = $this->file($hash)) == false) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
		$archiver = isset($this->archivers['extract'][$file['mime']])
			? $this->archivers['extract'][$file['mime']]
			: false;
		if (!$archiver) {
			return $this->setError(elFinder::ERROR_NOT_ARCHIVE);
		}
		
		$path = $this->decode($hash);
		
		if (!$file['read'] || !$this->attr($this->_dirname($path), 'write')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		$before = $this->scandir($file['phash']);

		if (!$this->_extract($path, $archiver)) {
			return false;
		}
		
		$after = $this->scandir($file['phash']);
		$diff = array();
		foreach ($after as $file) {
			if (!in_array($file, $before)) {
				$diff[] = $file;
			}
		}
		return $diff;
	}

	/**
	 * Add files to archive
	 *
	 * @return void
	 **/
	public function archive($hashes, $mime) {

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
				$dir = $this->_dirname($path);
				if (!$this->attr($dir, 'write')) {
					return $this->error(elFinder::ERROR_PERM_DENIED);
				}
			}
			
			$files[] = $this->_basename($path);
		}
		
		$name = (count($files) == 1 ? $files[0] : 'Archive').'.'.$archiver['ext'];
		$name = $this->uniqueName($dir, $name, '');
		
		$archive = $this->_archive($dir, $files, $name, $archiver);
		
		return $archive ? $this->stat($archive) : false;
	}

	/**
	 * Remove file/dir
	 *
	 * @param  string  $hash  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function rm($hash) {
		return $this->doRm($this->decode($hash));
	}
	
	/**
	 * undocumented function
	 *
	 * @param  string  $q  search string
	 * @param  array   $mimes
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function search($q, $mimes) {
		return $this->doSearch($this->root, $q, $mimes);
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
		
		return $this->_dimensions($this->decode($hash), $file['mime']);
	}
	
	/**
	 * Save error message
	 *
	 * @param  int|array  error number | array(error number, arguments)
	 * @return false
	 * @author Dmitry(dio) Levashov
	 **/
	protected function setError($error) {
		$this->error = func_get_args();
		return false;
	}
	
	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/
	
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
		if ($path) {
			// cut ROOT from $path for security reason, even if hacker decodes the path he will not know the root
			$p = $this->_relpath($path);
			// if reqesting root dir $path will be empty, then assign '/' as we cannot leave it blank for crypt
			if (!$p)	{
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
			return $this->_abspath($path);//$this->root.($path == DIRECTORY_SEPARATOR ? '' : DIRECTORY_SEPARATOR.$path); 
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
	 * Validate file name based on $this->options['acceptedName'] regexp
	 *
	 * @param  string  $name  file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function nameAccepted($name) {
		if ($this->nameValidator) {
			if (function_exists($this->nameValidator)) {
				$f = $this->nameValidator;
				return $f($name);
			}
			return preg_match($this->nameValidator, $name);
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
	protected function uniqueName($dir, $name, $suffix = ' copy', $checkNum=true) {
		$ext  = '';

		if (!$this->_isDir($this->_joinPath($dir, $name))) {
			if (preg_match('/\.((tar\.(gz|bz|bz2|z|lzo))|cpio\.gz|ps\.gz|xcf\.(gz|bz2)|[a-z0-9]{1,4})$/i', $name, $m)) {
				$ext  = '.'.$m[1];
				$name = substr($name, 0,  strlen($name)-strlen($m[0]));
			} 
		}
		
		if ($checkNum && preg_match('/('.$suffix.')(\d*)$/i', $name, $m)) {
			$i    = (int)$m[2];
			$name = substr($name, 0, strlen($name)-strlen($m[2]));
		} else {
			$i     = 0;
			$name .= $suffix;
		}
		$max = $i+100000;

		while ($i <= $max) {
			$n = $name.($i > 0 ? $i : '').$ext;
			if (!$this->_fileExists($this->_joinPath($dir, $n))) {
				return $n;
			}
			$i++;
		}
		return $name.md5($dir).$ext;
	}
	
	/*********************** file stat *********************/
	
	/**
	 * Check file attribute
	 *
	 * @param  string  $path  file path
	 * @param  string  $name  attribute name (read|write|locked|hidden)
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function attr($path, $name) {
		if (!isset($this->defaults[$name])) {
			return false;
		}
		
		$defaults = $perm1 = $perm2 = $perm3 = $this->defaults[$name];

		switch ($name) {
			case 'read':   $perm1 = $this->_isReadable($path); break;
			case 'write':  $perm1 = $this->_isWritable($path); break;
			case 'locked': $perm1 = $this->_isLocked($path);   break;
			case 'hidden': $perm1 = $this->_isHidden($path);   break;
		}
		
		$path = $this->separator.$this->_relpath($path);
		
		if ($this->access) {
			if (is_array($this->access)) {
				$obj    = $this->access[0];
				$method = $this->access[1];
				$perm2  = $obj->{$method}($name, $path, $this->options['accessControlData'], $this);
			} else {
				$func  = $this->access;
				$perm2 = $func($name, $path, $this->options['accessControlData'], $this);
			}
		}
		
		for ($i = 0, $c = count($this->attributes); $i < $c; $i++) {
			$attrs = $this->attributes[$i];

			if (isset($attrs[$name]) && isset($attrs['pattern']) && preg_match($attrs['pattern'], $path)) {
				$perm3 = $attrs[$name];
				break;
			} 
		}
		
		$ret = $name == 'read' || $name == 'write' 
			? $defaults & $perm1 & $perm2 & $perm3
			: $defaults ^ $perm1 ^ $perm2 ^ $perm3;

		return $ret;
	}
	
	/**
	 * Return fileinfo 
	 *
	 * @param  string  $path  file cache
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function stat($path) {
		$root  = $path == $this->root;
		$link  = !$root && $this->_isLink($path);
		
		if (!$path || (!$this->_fileExists($path) && !$link)) {
			return false;
		}

		$dir   = $this->_isDir($path);
		
		$file = array(
			'hash'  => $this->encode($path),
			'phash' => $root ? '' : $this->encode(dirname($path)),
			'name'  => $root ? $this->rootName : $this->_basename($path)
		);
		
		if ($link) {
			$stat = $this->_lstat($path);
			$file['size'] = $stat['size'];
			$file['date'] = $this->formatDate($stat['mtime']);
		} else {
			
			$file['size'] = $dir ? 0 : $this->_filesize($path);
			$file['date'] = $this->formatDate($this->_filemtime($path));
		}

		if ($link) {
			if (($target = $this->_readlink($path)) != false) {
				$file['mime']  = $this->mimetype($target);
				$file['alias'] = $this->_path($target);
				$file['read']  = (int)$this->attr($path, 'read');
				$file['write'] = (int)$this->attr($path, 'write');
			} else {
				$file['mime']  = 'symlink-broken';
				$file['read']  = 0;
				$file['write'] = 0;
			}
		} else {
			$file['mime']  = $dir ? 'directory' : $this->mimetype($path);
			$file['read']  = (int)$this->attr($path, 'read');
			$file['write'] = (int)$this->attr($path, 'write');
		}

		if ($this->attr($path, 'locked')) {
			$file['locked'] = 1;
		}
		if ($this->attr($path, 'hidden')) {
			$file['hidden'] = 1;
		}
		
		if ($this->options['utf8fix']) {
			$file['name'] = json_decode(str_replace($this->options['utf8patterns'], $this->options['utf8replace'], json_encode($file['name'])));
		}
		
		if ($root) {
			$file['volumeid'] = $this->id;
		}
		
		if ($file['read'] && !isset($file['hidden'])) {
			if ($dir) {
				if (!$link && $this->_subdirs($path)) {
					$file['dirs'] = 1;
				}
			} else {
				if (($tmb = $this->gettmb($path)) != false) {
					$file['tmb'] = $tmb;
				} elseif ($this->canCreateTmb($path, $file['mime'])) {
					$file['tmb'] = 1;
				}
			}
		}
		
		return $file;
	}
	
	/**
	 * Return file mimetype
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mimetype($path) {	
		$type = '';
		
		if ($this->mimeDetect == 'finfo') {
			if (empty($this->finfo)) {
				$this->finfo = finfo_open(FILEINFO_MIME);
			}
			$type =  @finfo_file($this->finfo, $path); 
		} elseif ($type == 'mime_content_type') {
			$type = mime_content_type($path);
		} else {
			$pinfo = pathinfo($path); 
			$ext   = isset($pinfo['extension']) ? strtolower($pinfo['extension']) : '';
			$type  = isset(self::$mimetypes[$ext]) ? self::$mimetypes[$ext] : 'unknown';
		}
		
		$type = explode(';', $type);
		$type = trim($type[0]);
		
		if ($type == 'unknown') {
			if ($this->_isLink($path)) {
				$target = $this->_readlink($path);
				$type = $target ? $this->mimetype($target) : 'symlink-broken';
			} else if ($this->_isDir($path)) {
				$type = 'directory';
			} elseif ($this->_filesize($path) == 0 || preg_match('/\.(ini|conf)$/i', $path)) {
				$type = 'text/plain';
			}
		} elseif ($type == 'application/x-empty') {
			// finfo return this mime for empty files
			$type = 'text/plain';
		} elseif ($type == 'application/x-zip') {
			// http://elrte.org/redmine/issues/163
			$type = 'application/zip';
		}
		return $type;
	}
	
	
	/**
	 * Return file/total directory size
	 *
	 * @param  string  $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function countSize($path) {
		if (!$this->_fileExists($path) 
		|| !$this->attr($path, 'read') 
		|| $this->attr($path, 'hidden')) {
			return 0;
		}
		if ($this->_isLink($path)) {
			$lstat = $this->_lstat($path);
			return $lstat['size'];
		}
		if ($this->_isFile($path)) {
			return $this->_filesize($path);
		}
		
		$size = 0;
		foreach ($this->_scandir($path) as $p) {
			$name = $this->_basename($p);
			if ($name != '.' && $p != '..') {
				$size += $this->countSize($p);
			}
		}
		return $size;
	}
	
	
	/*****************  get content *******************/
	
	/**
	 * Return required dir files info
	 *
	 * @param  string  $path  dir path
	 * @param  array   $mimes only dirs files this mimes include in result 
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function getScandir($path, $mimes=array()) {
		$files = array();
		
		foreach ($this->_scandir($path) as $p) {
			if (!$this->attr($p, 'hidden')
			&& ($this->_isDir($p) || !$mimes || $this->mimeAccepted($this->mimetype($p), $mimes))
			&& ($file = $this->stat($p)) != false) {
				$files[] = $file;
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

		foreach ($this->_scandir($path) as $p) {
			if (!$this->attr($p, 'hidden')
			&& $this->_isDir($p)
			&& $path != $exclude
			&& ($dir = $this->stat($p))) {
				$dirs[] = $dir;
				if ($deep > 0 && isset($dir['dirs'])) {
					$dirs = array_merge($dirs, $this->gettree($p, $deep-1));
				}
			}
		}
		return $dirs;
	}	
		
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function doSearch($path, $q, $mimes) {
		$result = array();

		foreach($this->_scandir($path) as $p) {
			$mime = $this->mimetype($p);
			if ($this->attr($p, 'hidden') || !$this->mimeAccepted($mime)) {
				continue;
			}
			
			$name = $this->_basename($p);

			if (strpos($name, $q) !== false) {
				$stat = $this->stat($p);

				$stat['path'] = $this->_path($p);
				if ($this->URL) {
					$stat['url'] = $this->URL.str_replace($this->separator, '/', substr($p, strlen($this->root)+1));
				}
				
				$result[] = $stat;
			}
			if ($mime == 'directory' && $this->attr($p, 'read') && !$this->_isLink($p)) {
				
				$result = array_merge($result, $this->doSearch($p, $q, $mimes));
			}
		}
		
		return $result;
	}
		
	/**********************  manuipulations  ******************/
		
	/**
	 * Remove file/ recursive remove dir
	 *
	 * @param  string  $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function doRm($path) {
		if (!$this->_fileExists($path)) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}

		$dirname = $this->_dirname($path);
		$name    = $this->_basename($path);
		
		if ($this->attr($path, 'locked')) {
			return $this->setError(elFinder::ERROR_LOCKED, $name);
		}

		if ($this->_isLink($path) || $this->_isFile($path)) {
			$this->rmTmb($path);
			return $this->_unlink($path);
		} elseif ($this->_isDir($path)) {
			foreach ($this->_scandir($path) as $p) {
				$name = $this->_basename($p);
				if ($name != '.' && $name != '..' && !$this->doRm($p)) {
					return false;
				}
			}
			return $this->_rmdir($path);
		}
	}
	
	/**
	 * Copy file/recursive copy dir
	 *
	 * @param  string  $source  source path
	 * @param  string  $target  target dir path
	 * @param  string  $name    new file name
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function doCopy($source, $dst, $name='') {

		if (!$this->_fileExists($source)) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
		
		if (!$this->attr($source, 'read')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if (!$this->_isDir($dst)) {
			return $this->setError(elFinder::ERROR_TRGDIR_NOT_FOUND, $dst['name']);
		}
		
		if (!$this->attr($dst, 'write')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
		
		if ($this->_inpath($dst, $source)) {
			return $this->setError(elFinder::ERROR_COPY_INTO_ITSELF, $source['name']);
		}

		if (!$name) {
			$name = $this->_basename($source);
		}

		$_dst = $this->_joinPath($dst, $name);
		
		if ($this->_fileExists($_dst)) {
			if ($this->attr($_dst, 'locked')) {
				return $this->setError(elFinder::ERROR_LOCKED, $name);
			}
			
			if (!$this->doRm($_dst)) {
				return false;
			}
		}
		
		if ($this->_isLink($source)) {
			return ($link = $this->_readlink($source)) != false && $this->_symlink($link, $dst, $name)
				? $this->_joinPath($dst, $name)
				: false;
		} 
		
		if ($this->_isFile($source)) {
			return $this->_copy($source, $dst, $name) ? $this->_joinPath($dst, $name) : false;
		}
		
		if ($this->_isDir($source)) {
			if (!$this->_mkdir($dst, $name) || ($ls = $this->_scandir($source)) === false) {
				return false;
			}
			
			$dst = $this->_joinPath($dst, $name);
			foreach ($ls as $path) {
				$name = $this->_basename($path);
				if ($name != '.' && $name != '..' && !$this->attr($path, 'hidden')) {
					if (!$this->doCopy($path, $dst)) {
						return false;
					}
				}
			}
			return $dst;
		} 
		return false;
	}
	
	
	/************************* thumbnails **************************/
		
	/**
	 * Return thumbnail file name for required file
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function tmbname($path) {
		return md5($path).'.png';
	}
	
	/**
	 * Return thumnbnail name if exists
	 *
	 * @param  string  $path file path
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function gettmb($path) {
		if ($this->tmbURL && $this->tmbPath) {
			// file itself thumnbnail
			if (strpos($path, $this->tmbPath) === 0) {
				return basename($path);
			}
			$name = $this->tmbname($path);
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
	 * @param  string  $mime  file mimetype
	 * @return string|bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function canCreateTmb($path, $mime) {
		return $this->tmbPath
			&& $this->tmbURL
			&& $this->tmbPathWritable 
			&& strpos($path, $this->tmbPath) === false // do not create thumnbnail for thumnbnail
			&& $this->imgLib 
			&& strpos($mime, 'image') === 0 
			&& ($this->imgLib == 'gd' ? $mime == 'image/jpeg' || $mime == 'image/png' || $mime == 'mime/gif' : true);
	}
	
	/**
	 * Return x/y coord for crop image thumbnail
	 *
	 * @param  int    $w      image width
	 * @param  int    $h      image height	
	 * @param  int    $size   thumbnail size
	 * @param  bool   $crop   crop image fragment for thumbnail
	 * @return array 
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	protected function tmbEffects($w, $h, $tmbSize, $crop = true) {
		$x = 0;
		$y = 0;
		$size_w = 0;
		$size_h = 0;
		
		if ($crop == false) {

			/* Calculating image scale width and height */
			$xscale = $w / $tmbSize;
			$yscale = $h / $tmbSize;

			if ($yscale > $xscale) {
				$newwidth = round($w * (1 / $yscale));
				$newheight = round($h * (1 / $yscale));
			} else {
				$newwidth = round($w * (1 / $xscale));
				$newheight = round($h * (1 / $xscale));
			}

			/* Keeping original dimensions if image fitting into thumbnail without scale */
			if ($w <= $tmbSize && $h <= $tmbSize) {
				$newwidth = $w;
				$newheight = $h;
			}

			/* Calculating coordinates for aligning thumbnail */
			$y = ceil(($tmbSize - $newheight) / 2); 
			$x = ceil(($tmbSize - $newwidth) / 2);
			
			$size_w = $newwidth;
			$size_h = $newheight;
			
		} else {
		
			$size_w = $size_h = min($w, $h);
			
			/* calculating coordinates for cropping thumbnail */
			if ($w > $h) {
				$x = ceil(($w - $h)/2);
			} else {
				$y = ceil(($h - $w)/2);
			}		
			
		}
		
		return array($x, $y, $size_w, $size_h);
	}
	
	/**
	 * Create thumnbnail and return it's URL on success
	 *
	 * @param  string  $path  file path
	 * @param  string  $mime  file mime type
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function createTmb($path) {
		$mime = $this->mimetype($path);
		if (!$this->canCreateTmb($path, $mime)) {
			return false;
		}
		$name = $this->tmbName($path);
		$tmb  = $this->tmbPath.DIRECTORY_SEPARATOR.$name;
		// copy image in tmbPath so some drivers does not store files on local fs
		if (($src = $this->_fopen($path, 'rb')) == false 
		||  ($trg = @fopen($tmb, 'wb')) == false) {
			return false;
		}

		while (!feof($src)) {
			fwrite($trg, fread($src, 8192));
		}

		$this->_fclose($src, $path);
		fclose($trg);

		if (($s = @getimagesize($tmb)) == false) {
			return false;
		}
		
		$result = false;
		$tmbSize = $this->tmbSize;

		list($x, $y, $size_w, $size_h) = $this->tmbEffects($s[0], $s[1], $tmbSize, $this->options['tmbCrop']);
		
		switch ($this->imgLib) {
			case 'imagick':
				try {
					$img = new imagick($tmb);
				} catch (Exception $e) {
					return false;
				}

				$img->contrastImage(1);

				if ($this->options['tmbCrop'] == false) {
					$img1 = new Imagick();
					$img1->newImage($tmbSize, $tmbSize, new ImagickPixel($this->options['tmbBgColor']));
					$img1->setImageFormat('png');
					$img->resizeImage($size_w, $size_h, NULL, true);
					$img1->compositeImage( $img, imagick::COMPOSITE_OVER, $x, $y );
					$result = $img1->writeImage($tmb);
          		} else {
					$result = $img->cropThumbnailImage($tmbSize, $tmbSize) && $img->writeImage($tmb);
				}
				break;
				
			case 'gd':
				if ($s['mime'] == 'image/jpeg') {
					$img = imagecreatefromjpeg($tmb);
				} elseif ($s['mime'] == 'image/png') {
					$img = imagecreatefrompng($tmb);
				} elseif ($s['mime'] == 'image/gif') {
					$img = imagecreatefromgif($tmb);
				} elseif ($s['mime'] == 'image/xbm') {
					$img = imagecreatefromxbm($tmb);
				}
				if ($img &&  false != ($tmp = imagecreatetruecolor($tmbSize, $tmbSize))) {
        
					if ($this->options['tmbCrop'] == false) {
					
						if ($this->options['tmbBgColor'] == 'transparent') {
							list($r, $g, $b) = array(0, 0, 255);
						} else {
							list($r, $g, $b) = sscanf($this->options['tmbBgColor'], "#%02x%02x%02x");
						}

						$bgcolor = imagecolorallocate($tmp, $r, $g, $b);
						
						if ($this->options['tmbBgColor'] == 'transparent') {
							$bgcolor = imagecolortransparent($tmp, $bgcolor);
						}
        
						imagefill($tmp, 0, 0, $bgcolor);

						if (!imagecopyresampled($tmp, $img, $x, $y, 0, 0, $size_w, $size_h, $s[0], $s[1])) {
							return false;
						}
        
					} else {
						if (!imagecopyresampled($tmp, $img, 0, 0, $x, $y, $tmbSize, $tmbSize, $size_w, $size_h)) {
							return false;
						}
					}					

					$result = imagepng($tmp, $tmb, 7);
					imagedestroy($img);
					imagedestroy($tmp);
				}
				break;
		}
		
		return $result ? $name : false;
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
			2 => array("pipe", "w") // stderr
		);
	
		$process = proc_open($command, $descriptorspec, $pipes, null, null);
    
		if (is_resource($process)) {

			fclose($pipes[0]);
    
			$tmpout = '';
			$tmperr = '';
    
			if( !feof( $pipes[1] ) ) {
				$output[] = fgets($pipes[1], 1024);
			}
			if( !feof( $pipes[2] ) ) {
				$error_output[] = fgets($pipes[2], 1024);
			}  

			fclose($pipes[1]);
			fclose($pipes[2]);
			$return_var = proc_close($process);


		}
		
		return $return_var;
		
	}
	
	/**
	 * Remove thumbnail
	 *
	 * @param  string  $path  file path
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function rmTmb($path) {
		$path = $this->tmbPath.DIRECTORY_SEPARATOR.$this->tmbName($path);
		if (file_exists($path)) {
			@unlink($path);
		}
	}

	/*********************** misc *************************/
	
	/**
	 * Return smart formatted date
	 *
	 * @param  int     $ts  file timestamp
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function formatDate($ts) {
		if ($ts > $this->today) {
			return 'Today '.date($this->options['timeFormat'], $ts);
		}
		
		if ($ts > $this->yesterday) {
			return 'Yesterday '.date($this->options['timeFormat'], $ts);
		} 
		
		return date($this->options['dateFormat'], $ts);
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
	
	/*********************** check type *************************/
	
	/**
	 * Return true if file exists
	 *
	 * @param  string $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _fileExists($path);
	
	/**
	 * Return true if path is a directory
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _isDir($path);
	
	/**
	 * Return true if path is a file
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _isFile($path);
	
	/**
	 * Return true if path is a symlink
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _isLink($path);
	
	/***************** file attributes ********************/
	
	/**
	 * Return true if path is readable
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _isReadable($path);
	
	/**
	 * Return true if path is writable
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _isWritable($path);
	
	/**
	 * Return true if path is locked
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _isLocked($path);
	
	/**
	 * Return true if path is hidden
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _isHidden($path);
	
	/***************** file stat ********************/
	
	/**
	 * Return file size
	 *
	 * @param  string $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _filesize($path);
	
	/**
	 * Return file modification time
	 *
	 * @param  string $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _filemtime($path);
		
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
	
	/**
	 * Return symlink stat (required only size and mtime)
	 *
	 * @param  string  $path  link path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _lstat($path);
	
	/******************** file/dir content *********************/
	
	/**
	 * Return symlink target file
	 *
	 * @param  string  $path  link path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _readlink($path);
	
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
	 * @param  string  $path  file path
	 * @param  bool    $write open file for writing
	 * @return resource|false
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _fopen($path, $mode="rb");
	
	/**
	 * Close opened file
	 *
	 * @param  resource  $fp  file pointer
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _fclose($fp, $path);
	
	/********************  file/dir manipulations *************************/
	
	/**
	 * Create dir
	 *
	 * @param  string  $path  parent dir path
	 * @param string  $name  new directory name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _mkdir($path, $name);
	
	/**
	 * Create file
	 *
	 * @param  string  $path  parent dir path
	 * @param string  $name  new file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _mkfile($path, $name);
	
	/**
	 * Create symlink
	 *
	 * @param  string  $target  link target
	 * @param  string  $path    symlink dir
	 * @param  string  $name    symlink name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _symlink($target, $path, $name='');
	
	/**
	 * Copy file into another file (only inside one volume)
	 *
	 * @param  string  $source  source file path
	 * @param  string  $target  target dir path
	 * @param  string  $name    file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _copy($source, $targetDir, $name='');
	
	/**
	 * Move file into another parent dir (only inside one volume)
	 *
	 * @param  string  $source  source file path
	 * @param  string  $target  target dir path
	 * @param  string  $name    file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _move($source, $targetDir, $name='');
	
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
	 * @return bool|string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _save($fp, $dir, $name);
	
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
	
} // END class

?>