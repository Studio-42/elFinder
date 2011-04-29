<?php
/**
 * Based class for elFinder volume.
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
	 * How many subdirs levels return for tree
	 *
	 * @var int
	 **/
	protected $treeDeep = 1;
	
	/**
	 * undocumented class variable
	 *
	 * @var string
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
		'path'         => '',           // root path
		'startPath'    => '',           // open this path on initial request instead of root path
		'treeDeep'     => 1,            // how many subdirs levels return per request
		'URL'          => '',           // root url, not set to disable sending URL to client (replacement for old "fileURL" option)
		'separator'    => DIRECTORY_SEPARATOR,
		'cryptLib'     => '',
		'mimeDetect'   => 'auto',       // how to detect mimetype
		'mimefile'     => '',           // mimetype file path
		'tmbPath'       => '.tmb',       // directory for thumbnails
		'tmbPathMode'   => 0777,         // mode to create thumbnails dir
		'tmbURL'       => '',           // thumbnails dir URL
		'tmbSize'      => 48,           // images thumbnails size (px)
		'imgLib'       => 'auto',       // image manipulations lib name
		// 'tmbCleanProb' => 0,            // how frequiently clean thumbnails dir (0 - never, 100 - every init request)
		'uploadAccepted'     => '',           // regexp to validate filenames
		'uploadAllow'  => array(),      // mimetypes which allowed to upload
		'uploadDeny'   => array(),      // mimetypes which not allowed to upload
		'uploadOrder'  => 'deny,allow', // order to proccess uploadAllow and uploadAllow options
		'dateFormat'   => 'j M Y H:i',  // files dates format
		'copyFrom'     => true,  // allow to copy from this volume to other ones
		'copyTo'       => true,  // allow to copy from other volumes to this one
		'disabled'     => array(),      // list of commands names to disable on this root
		'acceptedName' => '',
		'defaults'     => array(   // default permissions 
			'read'  => true,
			'write' => true
		),
		
	);
	
	/**
	 * Defaults permissions
	 *
	 * @var array
	 **/
	protected $defaults = array(
		'read'  => true,
		'write' => true,
		'rm'    => true
	);
	
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
	 * default extensions/mimetypes for mimeDetect == 'internal' 
	 *
	 * @var array
	 **/
	protected static $mimetypes = array(
		// applications
		'ai'    => 'application/postscript',
		'eps'   => 'application/postscript',
		'exe'   => 'application/octet-stream',
		'doc'   => 'application/vnd.ms-word',
		'xls'   => 'application/vnd.ms-excel',
		'ppt'   => 'application/vnd.ms-powerpoint',
		'pps'   => 'application/vnd.ms-powerpoint',
		'pdf'   => 'application/pdf',
		'xml'   => 'application/xml',
		'odt'   => 'application/vnd.oasis.opendocument.text',
		'swf'   => 'application/x-shockwave-flash',
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
		'sql'   => 'text/x-sql',
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
		//audio

		'mp3'   => 'audio/mpeg',
		'mid'   => 'audio/midi',
		'ogg'   => 'audio/ogg',
		'mp4a'  => 'audio/mp4',
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
		'mkv'   => 'video/x-matroska'
		);
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $separator = DIRECTORY_SEPARATOR;
	
	/**
	 * Files info cache
	 *
	 * @var array
	 **/
	protected $cache = array();
	
	/**
	 * path to hash map cache
	 *
	 * @var array
	 **/
	protected $paths = array();
	
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
		$type = preg_match('/^(imagick|mogrify|gd|auto)$/i', $this->options['imgLib'])
			? strtolower($this->options['imgLib'])
			: 'auto';
			
		if (($type == 'imagick' || $type == 'auto') && extension_loaded('imagick')) {
			$this->imgLib = 'imagick';
		} elseif (($type == 'mogrify' || $type == 'auto') && function_exists('exec')) {
			exec('mogrify --version', $o, $c);
			$this->imgLib = $c == 0 ? 'mogrify' : (function_exists('gd_info') ? 'gd' : '');
		} else {
			$this->imgLib = function_exists('gd_info') ? 'gd' : '';
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
	 * "Mount" volume.
	 * Return true if volume available for read or write, 
	 * false - otherwise
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	public function mount($id, array $opts) {
		// path required
		if (empty($opts['path'])) {
			return false;
		}
		
		$this->id = $id;
		$this->options = array_merge($this->options, $opts);
		
		// default file attribute
		$this->defaults = array(
			'read'    => isset($this->options['defaults']['read'])  ? !!$this->options['defaults']['read'] : true,
			'write'   => isset($this->options['defaults']['write']) ? !!$this->options['defaults']['write'] : true,
			'locked'  => false,
			'hidden'  => false
		);
		
		if (!$this->init()) {
			return false;
		}
		
		$this->today     = mktime(0,0,0, date('m'), date('d'), date('Y'));
		$this->yesterday = $this->today-86400;
		
		// check some options is arrays
		if (!is_array($this->options['uploadAllow'])) {
			$this->options['uploadAllow'] = array();
		}
		if (!is_array($this->options['uploadDeny'])) {
			$this->options['uploadDeny'] = array();
		}
		if (!is_array($this->options['disabled'])) {
			$this->options['disabled'] = array();
		}
		
		$this->cryptLib   = $this->options['cryptLib'];
		$this->mimeDetect = $this->options['mimeDetect'];

		// load mimes from external file for mimeDetect == 'internal'
		// based on Alexey Sukhotin idea and patch: http://elrte.org/redmine/issues/163
		// file must be in file directory or in parent one 
		if (($this->mimeDetect == 'internal' || $this->mimeDetect == 'auto') && !self::$mimetypesLoaded) {
			self::$mimetypesLoaded = true;
			$this->mimeDetect = 'internal';
			
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
							self::$mimetypes[$mime[$i]] = $mime[0];
						}
					}
				}
			}
		}

		// set root path
		$this->root = $this->_normpath($this->options['path']);
		
		if (!$this->_isDir($this->root) || $this->_isHidden($this->root)) {
			return false;
		}
		
		if (!$this->_isReadable($this->root) && !$this->_isWritable($this->root)) {
			return false;
		}
		
		if ($this->_isReadable($this->root)) {
			// check startPath - path to open by default instead of root
			if ($this->options['startPath']) {
				$path = $this->_normpath($this->options['startPath']);
				if ($this->_isDir($path) 
				&& $this->_isReadable($path) 
				&& !$this->_isHidden($path)
				&& $this->_inpath($path, $this->root)) {
					$this->startPath = $path;
				}
			}
		} else {
			$this->options['URL']     = '';
			$this->options['tmbURL']  = '';
			$this->options['tmbPath'] = '';
		}
		
		$this->rootName = empty($this->options['alias']) ? basename($this->root) : $this->options['alias'];
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
		$this->separator = isset($this->options['separator']) ? $this->options['separator'] : DIRECTORY_SEPARATOR;
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
	 * Return file/dir URL.
	 * Used to get current dir URL
	 *
	 * @param  string  $hash  file hash
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function url($hash) {
		$path = $this->decode($hash);
		if (!$path || !$this->URL) {
			return '';
		}
		return $this->_url($path);
	}
	
	/**
	 * Return volume options required by client:
	 * - url
	 * - tmbUrl
	 * - disabled - list of disabled commands
	 * - separator - directory separator
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function options() {
		return array(
			// 'url'       => $this->URL,
			'tmbUrl'    => $this->tmbURL,
			'disabled'  => $this->options['disabled'],
			'separator' => $this->separator
		);
	}
	
	/**
	 * Return true if file exists and not hidden
	 *
	 * @param  string  $hash  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function fileExists($hash) {
		$path = $this->decode($hash);
		return $this->_fileExists($path) && !$this->_isHidden($path);
	}
	
	/**
	 * Return true if folder is readable.
	 * If hash is not set - check root folder
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isReadable($hash='') {
		return $this->_isReadable($hash ? $this->decode($hash) : $this->root);
	}
	
	/**
	 * Return file info or false on error
	 *
	 * @param  string   $hash  file hash
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function file($hash) {
		$path = $this->decode($hash);
		if (($file = $this->stat($path)) == false
		|| $file['hidden']) {
			return $this->setError(elFinder::ERROR_NOT_FOUND);
		}
		unset($file['hidden']);
		return $file;
	}
	
	/**
	 * Return folder info
	 *
	 * @param  string   $hash  folder hash
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function dir($hash) {
		if (($dir = $this->file($hash)) != false) {
			return $dir['mime'] == 'directory' 
				? $dir 
				: $this->setError(elFinder::ERROR_NOT_DIR, $this->path($hash));
		}
		
		return false;
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
		if (($file = $this->dir($hash)) == false) {
			return false;
		}
		if (!$file['read']) {
			return $this->setError(elFinder::ERROR_NOT_READ, $this->path($hash));
		}

		return $this->getScandir($this->decode($hash), $mimes);
	}

	/**
	 * Return subfolders for required one or false on error
	 *
	 * @param  string   $hash  folder hash or empty string to get tree from root folder
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function tree($hash='', $deep=0) {
		$hash = $hash ? $hash : $this->encode($this->root);
		
		if (($dir = $this->dir($hash)) == false) {
			return false;
		}
		
 		unset($dir['hidden']);
		$dirs = $dir['read'] ? $this->gettree($this->decode($hash), $deep > 0 ? $deep -1 : $this->treeDeep-1) : array();
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
		if (($dir = $this->dir($hash)) == false) {
			return false;
		}

		$path = $this->decode($hash);
		$tree = array($dir);
		
		while ($path && $path != $this->root) {
			$path = $this->_dirname($path);
			$dir  = $this->stat($path);
			if (!$dir || !$dir['read'] || $dir['hidden']) {
				return array();
			}
			unset($dir['hidden']);
			array_unshift($tree, $dir);
			if ($path != $this->root) {
				foreach ($this->getScandir($path) as $dir) {
					if (!in_array($dir, $tree)) {
						$tree[] = $dir;
					}
				}
			}
		}
		return $tree;
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
			$this->setError(elFinder::ERROR_NOT_FILE, $file['path']);
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
	 * Create directory
	 *
	 * @param  string   $dst  destination directory
	 * @param  string   $name directory name
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function mkdir($dst, $name) {
	}
	
	/**
	 * Create empty file
	 *
	 * @param  string   $dst  destination directory
	 * @param  string   $name file name
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function mkfile($dst, $name) {
	}
	
	/**
	 * Rename file
	 *
	 * @param  string  $hash  file hash
	 * @param  string  $name  new file name
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function rename($hash, $name) {
		$path  = $this->decode($hash);
		if (($file = $this->file($hash)) == false) {
			return false;
		}
		
		$dir      = $this->_dirname($path);
		$_oldPath = $this->_path($path);
		$_newPath = $dir.$this->separator.$name;
		
		if ($this->_isHidden($dir)) {
			return $this->setError(elFinder::ERROR_NOT_FOUND);
		}
		
		if ($file['locked']) {
			return $this->setError(elFinder::ERROR_LOCKED, $$_oldPath);
		}
		
		if (!$this->_isWritable($dir)) {
			return $this->setError(elFinder::ERROR_NOT_RENAME, $_oldPath);
		}
		
		if (!$this->nameAccepted($name)) {
			return $this->setError(elFinder::ERROR_INVALID_NAME, $name);
		}
		
		$dst = $this->_joinPath($dir, $name);
		if ($this->_fileExists($dst)) {
			return $this->setError(elFinder::ERROR_FILE_EXISTS, $this->_path($dst));
		}
		
		if (!$this->_move($path, $dir, $name)) {
			return $this->setError(elFinder::ERROR_RENAME, $_oldPath, $_newPath);
		} 
		$this->clearStat($path);
		$this->rmTmb($path);
		$renamed = $this->_joinPath($dir, $name);
		
		if (($file = $this->stat($renamed)) == false) {
			return $this->setError(elFinder::ERROR_RENAME, $_oldPath, $_newPath);
		}
		
		if ($file['hidden']) {
			return array();
		}
		
		unset($file['hidden']);
		return $file;
	}
	
	/**
	 * Duplicate file
	 *
	 * @param  string   $hash  file hash
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function duplicate($hash) {
		$path = $this->decode($hash);
		
		if (!$this->_fileExists($path)
		||   $this->_isHidden($path)) {
			return $this->setError(elFinder::ERROR_NOT_FOUND);
		}
		
		$name = $this->uniqueName($path);
		$dir  = $this->_dirname($path);
		
		$this->doCopy($path, $dir, $name);
		
		$path = $this->_joinPath($dir, $name);
		if (($file = $this->stat($path)) == false) {
			return $this->error 
				? false 
				: $this->setError(elFinder::ERROR_COPY, $this->_path($path), $dir.$this->separator.$name);
		}
		unset($file['hidden']);
		return $file;
	}
	
	/**
	 * Copy file in other directory
	 *
	 * @param  string  $source  file hash
	 * @param  string  $dst     destination directory
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function copy($source, $dst) {
	}
	
	/**
	 * Move file in other directory
	 *
	 * @param  string  $source  file hash
	 * @param  string  $dst     destination directory
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function move($source, $dst) {
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
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function save($fp, $dir, $info) {
		return $this->_save($fp, $this->decode($dir), $info);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function copyTo($hash, $dir) {
	}
	
	
	/**
	 * Save error message
	 *
	 * @param  int|array  error number | array(error number, arguments)
	 * @return false
	 * @author Dmitry(dio) Levashov
	 **/
	protected function setError($error) {
		$this->error = func_get_args(); //is_array($error) ? $error : array($error);
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
			if (($hash = array_search($path, $this->paths)) !== false) {
				return $hash;
			}
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
			$hash = $this->id.$hash;
			$this->paths[$hash] = $path;
			return $hash;
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
			if (isset($this->paths[$hash])) {
				// echo 'cache '.$hash.' : '.$this->paths[$hash].'<br>';
				return $this->paths[$hash];
			}
			// cut volume id after it was prepended in encode
			$h = substr($hash, strlen($this->id));
			// replace HTML safe base64 to normal
			$h = base64_decode(strtr($h, '-_.', '+/='));
			// TODO uncrypt hash and return path
			$path = $this->uncrypt($h); 
			// append ROOT to path after it was cut in encode
			$path = $this->_abspath($path);//$this->root.($path == DIRECTORY_SEPARATOR ? '' : DIRECTORY_SEPARATOR.$path); 
			$this->paths[$hash] = $path;
			return $path;
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
		return !empty($this->options['acceptedName']) ? preg_match($this->options['acceptedName'], $name) : true;
	}
	
	/**
	 * Return new unique name based on file name and suffix
	 *
	 * @param  string  $path    file path
	 * @param  string  $suffix  suffix append to name
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function uniqueName($path, $suffix = ' copy') {
		$dir  = $this->_dirname($path);
		$name = $this->_basename($path); 
		$ext  = '';

		if ($this->_isFile($path)) {
			if (preg_match('/\.((tar\.(gz|bz|bz2|z|lzo))|cpio\.gz|ps\.gz|xcf\.(gz|bz2)|[a-z0-9]{1,4})/i', $name, $m)) {
				$ext  = '.'.$m[1];
				$name = substr($name, 0,  strlen($name)-strlen($m[0]));
			}
		}
		
		if (preg_match('/('.$suffix.')(\d*)$/i', $name, $m)) {
			$i    = (int)$m[2];
			$name = substr($name, 0, strlen($name)-strlen($m[2]));
		} else {
			$i     = 0;
			$name .= $suffix;
		}
		while ($i++ <= 10000) {
			$n = $name.($i > 0 ? $i : '').$ext;
			if (!$this->_fileExists($this->_joinPath($dir, $n)))
			// if (!$this->_hasChild($dir, $n)) 
			{
				return $n;
			}
		}
		return $name.md5($path).$ext;
	}
	
	/*********************** file stat *********************/
	
	/**
	 * Return fileinfo from cache.
	 * If there is no info in cache - load it
	 *
	 * @param  string  $path  file cache
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function stat($path) {
		if (!isset($this->cache[$path])) {
			$this->cache[$path] = $this->getstat($path);
		}
		return $this->cache[$path];
	}
	
	/**
	 * Clear files stat cache for required file or all
	 *
	 * @param  string  $path  file path
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function clearStat($path='') {
		if ($path) {
			if (isset($this->cache[$path])) {
				unset($this->cache[$path]);
			}
		} else {
			$this->cache = array();
		}
		
	}
	
	/**
	 * Create fileinfo
	 *
	 * @param  string  $path  file cache
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function getstat($path) {
		$name = $this->_basename($path);
		$root = $path == $this->root;
		
		if ($name == '.' 
		||  $name == '..'
		|| !$this->_fileExists($path)) {
			return false;
		}
		
		$dir   = $this->_isDir($path);
		$mime  = $dir ? 'directory' : $this->mimetype($path);
		$link  = $this->_isLink($path);
		$mtime = $this->_filemtime($path);

		if ($mtime > $this->today) {
			$date = 'Today '.date('H:i', $mtime);
		} elseif ($mtime > $this->yesterday) {
			$date = 'Yesterday '.date('H:i', $mtime);
		} else {
			$date = date($this->options['dateFormat'], $mtime);
		}
		
		$size = 0;
		if ($link) {
			$stat = $this->_lstat($path);
			$size = $stat['size'];
		} elseif (!$dir) {
			$size = $this->_filesize($path);
		}

		$file = array(
			'hash'   => $this->encode($path),
			'phash'  => $root ? '' : $this->encode(dirname($path)),
			'name'   => $root && $this->rootName ? $this->rootName : basename($path),
			'mime'   => $mime,
			'size'   => $size,
			'date'   => $date,
			'read'   => (int)$this->_isReadable($path),
			'write'  => (int)$this->_isWritable($path),
			'locked' => (int)$this->_isLocked($path),
			'hidden' => (int)$this->_isHidden($path)
		);
		
		if (!$root && $link) {
			$target = $this->_readlink($path);
			if ($target) {
				$file['mime']   = $this->mimetype($target);
				$file['link']   = $this->encode($target);
				$file['linkTo'] = $this->_path($target);
			} else {
				$file['mime']  = 'symlink-broken';
				$file['read']  = 0;
				$file['write'] = 0;
			}
		}
		
		
		if ($file['read']) {
			if ($dir) {
				if ($this->_subdirs($path)) {
					$file['dirs'] = 1;
				}
			} else {
				if (($dim = $this->_dimensions($path, $file['mime'])) != false) {
					$file['dim'] = $dim;
				}
				
				if (($tmb = $this->gettmb($path)) != false) {
					$file['tmb'] = $tmb;
				} elseif ($this->canCreateTmb($path, $file['mime'])) {
					$file['tmb'] = 1;
				}
				
				if ($file['write'] && $this->resizable($file['mime'])) {
					$file['resize'] = 1;
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
		$pinfo = pathinfo($path); 
		$ext   = isset($pinfo['extension']) ? strtolower($pinfo['extension']) : '';
		$type  = isset(self::$mimetypes[$ext]) ? self::$mimetypes[$ext] : 'unknown';
		
		if ($type == 'unknown') {
			if ($this->_isDir($path)) {
				$type = 'directory';
			} elseif ($this->_filesize($path) == 0) {
				$type = 'plain/text';
			}
		} elseif ($type == 'application/x-zip') {
			// http://elrte.org/redmine/issues/163
			$type = 'application/zip';
		}
		return $type;
	}
	
	/**
	 * Return true if mime is required mimes list
	 *
	 * @param  string $mime   mime type to check
	 * @param  array  $mimes  allowed mime types list
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mimeAccepted($mime, $mimes) {
		return in_array($mime, $mimes) || in_array(substr($mime, 0, strpos($mime, '/')), $mimes);
	}
	
	/**
	 * Return true if file can be resized by current driver
	 *
	 * @param  string  $path  file path
	 * @param  string  $mime  file mime type
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function resizable($mime) {
		return $this->imgLib 
			&& strpos('image', $mime) == 0 
			&& ($this->imgLib == 'gd' ? $mime == 'image/jpeg' || $mime == 'image/png' || $mime == 'mime/gif' : true);
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
		|| !$this->_isReadable($path) 
		|| $this->_isHidden($path)) {
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
			if (($this->_isDir($p) || !$mimes || $this->mimeAccepted($this->mimetype($p), $mimes))
			&& ($file = $this->stat($p)) != false
			&& !$file['hidden']) {
				unset($file['hidden']);
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
	protected function gettree($path, $deep) {
		$dirs = array();

		foreach ($this->_scandir($path) as $p) {
			
			if ($this->_isDir($p) && ($dir = $this->stat($p)) != false && !$dir['hidden']) {
				unset($dir['hidden']); 
				$dirs[] = $dir;
				if ($deep > 0 && isset($dir['dirs'])) {
					$dirs = array_merge($dirs, $this->gettree($p, $deep-1));
				}
			}
		}
		return $dirs;
	}	
		
	/**********************  manuipulations  ******************/
		
	/**
	 * Remove file/dir
	 *
	 * @param  string  $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function doRm($path) {
		if (!$this->_fileExists($path)) {
			return $this->setError(elFinder::ERROR_NOT_FOUND);
		}

		if ($this->_isLocked($path)) {
			return $this->setError(elFinder::ERROR_LOCKED, $this->_path($path));
		}

		if (!$this->_isWritable($this->_dirname($path))) {
			return $this->setError(elFinder::ERROR_NOT_RM_BY_PARENT, $this->_path($path));
		}
		
		$result = false;
		if ($this->_isLink($path) || $this->_isFile($path)) {
			$result = $this->_unlink($path);
		} elseif ($this->_isDir($path)) {
			foreach ($this->_scandir($path) as $p) {
				$name = $this->_basename($p);
				if ($name != '.' && $name != '..' && !$this->doRm($p)) {
					return false;
				}
			}
			$result = $this->_rmdir($path);
		}

		if ($result) {
			$this->clearStat($path);
			$this->rmTmb($path);
			return true;
		}
		return $this->setError(elFinder::ERROR_REMOVE, $this->_path($path));
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
	protected function doCopy($source, $dstDir, $name='') {
		if (!$name) {
			$name = $this->_basename($source);
		}
		
		$_srcPath = $this->_path($source);
		$_dstPath = $this->_path($dstDir).$this->separator.$name;
		
		if (!$this->_isDir($dstDir)) {
			return $this->setError(elFinder::ERROR_NOT_FOUND);
		}
		
		if (!$this->_isWritable($dstDir)) {
			return $this->setError(elFinder::ERROR_NOT_WRITE, $this->_path($dstDir));
		}

		if (!$this->_fileExists($source)) {
			return $this->setError(elFinder::ERROR_NOT_FOUND);
		}

		if (!$this->_isReadable($source)) {
			return $this->setError(elFinder::ERROR_NOT_COPY, $_srcPath);
		}
		
		if ($this->_inpath($dstDir, $source)) {
			return $this->setError(elFinder::ERROR_NOT_COPY_INTO_ITSELF, $_srcPath);
		}

		$dst = $this->_joinPath($dstDir, $name);
		
		if ($this->_fileExists($dst) && !$this->doRm($dst)) {
			return $this->setError(elFinder::ERROR_NOT_REPLACE, $_dstPath);
		}
		
		if ($this->_isLink($source)) {
			if (($link = $this->_readlink($source)) == false || !$this->_symlink($link, $dstDir, $name)) {
				return $this->setError(elFinder::ERROR_COPY, $_srcPath, $_dstPath);
			}
			return $this->_joinPath($dstDir, $name);
		} 
		
		if ($this->_isFile($source)) {
			if (!$this->_copy($source, $dstDir, $name)) {
				return $this->setError(elFinder::ERROR_COPY, $_srcPath, $_dstPath);
			}
			return $this->_joinPath($dstDir, $name);
		}
		
		if ($this->_isDir($source)) {
			if (!$this->_mkdir($dstDir, $name) || ($ls = $this->_scandir($source)) === false) {
				return $this->setError(elFinder::ERROR_COPY, $_srcPath, $_dstPath);
			}
			
			$dst = $this->_joinPath($dstDir, $name);
			foreach ($ls as $path) {
				$name = $this->_basename($path);
				if ($name != '.' && $name != '..' && !$this->_isHidden($path)) {
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
		return md5(basename($path)).'.png';
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
			&& $this->imgLib 
			// && $this->_isReadable($path)
			&& strpos($path, $this->tmbPath) === false // do not create thumnbnail for thumnbnail
			&& strpos('image', $mime) == 0 
			&& ($this->imgLib == 'gd' ? $mime == 'image/jpeg' || $mime == 'image/png' || $mime == 'mime/gif' : true);
	}
	
	/**
	 * Return x/y coord for crop image thumbnail
	 *
	 * @param  int  $w  image width
	 * @param  int  $h  image height	
	 * @return array
	 **/
	protected function cropPos($w, $h) {
		$x = $y = 0;
		$size = min($w, $h);
		if ($w > $h) {
			$x = ceil(($w - $h)/2);
		} else {
			$y = ceil(($h - $w)/2);
		}
		return array($x, $y, $size);
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
		
		switch ($this->imgLib) {
			case 'imagick':
				try {
					$img = new imagick($tmb);
				} catch (Exception $e) {
					return false;
				}

				$img->contrastImage(1);
				$result = $img->cropThumbnailImage($tmbSize, $tmbSize) && $img->writeImage($tmb);
				break;
				
			case 'mogrify':
				list($x, $y, $size) = $this->cropPos($s[0], $s[1]);
				// exec('mogrify -crop '.$size.'x'.$size.'+'.$x.'+'.$y.' -scale '.$tmbSize.'x'.$tmbSize.'! '.escapeshellarg($tmb), $o, $c);
				exec('mogrify -resize '.$tmbSize.'x'.$tmbSize.'^ -gravity center -extent '.$tmbSize.'x'.$tmbSize.' '.escapeshellarg($tmb), $o, $c);

				if (file_exists($tmb)) {
					$result = true;
				} elseif ($c == 0) {
					// find tmb for psd and animated gif
					if ($mime == 'image/vnd.adobe.photoshop' || $mime = 'image/gif') {
						$pinfo = pathinfo($tmb);
						$test = $pinfo['dirname'].DIRECTORY_SEPARATOR.$pinfo['filename'].'-0.'.$pinfo['extension'];
						if (file_exists($test)) {
							$result = @rename($test, $tmb);
						}
					}
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
					list($x, $y, $size) = $this->cropPos($s[0], $s[1]);
					if (!imagecopyresampled($tmp, $img, 0, 0, $x, $y, $tmbSize, $tmbSize, $size, $size)) {
						return false;
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
	 * Return file/dir URL
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _url($path);
	
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
	 * Copy file into another file
	 *
	 * @param  string  $source  source file path
	 * @param  string  $target  target dir path
	 * @param  string  $name    file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _copy($source, $targetDir, $name='');
	
	/**
	 * Move file into another parent dir
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


	
} // END class

?>