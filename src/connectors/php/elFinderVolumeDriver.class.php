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
	 * Filter directory content rules
	 *
	 **/
	const FILTER_DIRS_ONLY = 1;
	const FILTER_FILES_ONLY = 2;
	
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
	 * Default permissions
	 *
	 * @var array
	 **/
	
	/**
	 * Image manipulation lib name
	 * auto|imagick|mogtify|gd
	 *
	 * @var string
	 **/
	protected $imgLib = 'auto';
	
	protected $defaults = array(
		'read'  => true,
		'write' => true,
		'rm'    => true
	);
	
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
	protected $treeDeep = 1;
	
	/**
	 * Error messages from last failed action
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
		'path'         => '',           // root path
		'alias'        => '',           // alias to replace root dir name
		'startPath'    => '',           // open this path on initial request instead of root path
		'treeDeep'     => 1,            // how many subdirs levels return per request
		'URL'          => '',           // root url, not set to disable sending URL to client (replacement for old "fileURL" option)
		
		
		
		
		'mimeDetect'   => 'auto',       // how to detect mimetype
		'mimefile'     => '',           // mimetype file path
		
		'tmbPath'       => '.tmb',       // directory for thumbnails
		'tmbPathMode'   => 0777,
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
		
		'dotFiles'     => false,        // allow dot files?
		'allowed'     => '',           // regexp, additional rule to check file names
		'disabled'     => array(),      // list of commands names to disable on this root
		'defaults'     => array(   // default permissions 
			'read'  => true,
			'write' => true,
			'rm'    => true
		)
	);
	
	/**
	 * Mimetype detect method
	 * auto|
	 *
	 * @var string
	 **/
	protected $mimeDetect = 'auto';
	
	/**
	 * undocumented class variable
	 *
	 * @var string
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
	 * Files info cache
	 *
	 * @var array
	 **/
	protected $files = array();
	
	/**
	 * hash to path map cache
	 *
	 * @var array
	 **/
	protected $hashes = array();
	
	/**
	 * path to hash map cache
	 *
	 * @var array
	 **/
	protected $paths = array();
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
	 * "Mount" volume
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	public function mount($id, array $opts) {
		$this->id = $id;

		$this->options = $this->extend($this->options, $opts);
		// debug($this->options);
		if (empty($this->options['path']) 
		|| !$this->_init()) {
			return false;
		}
		$this->defaults['read']  = (int)$this->options['defaults']['read'];
		$this->defaults['write'] = (int)$this->options['defaults']['write'];
		$this->defaults['rm']    = (int)$this->options['defaults']['rm'];
		$this->today      = mktime(0,0,0, date('m'), date('d'), date('Y'));
		$this->yesterday  = $this->today-86400;
		
		$this->root = $this->normpath($this->options['path']);
		$this->rootName = empty($this->options['alias']) ? basename($this->root) : $this->options['alias'];
		
		if (!$this->_isDir($this->root) 
		|| (!$this->_isReadable($this->root) && !$this->_isWritable($this->root))) {
			return false;
		}
		
		if ($this->_isReadable($this->root)) {
			$this->treeDeep   = $this->options['treeDeep'] > 0 ? (int)$this->options['treeDeep'] : 1;
			$this->URL        = $this->options['URL'];
			if (preg_match("|[^/?&=]$|", $this->URL)) {
				$this->URL .= '/';
			}
			$this->cryptLib = $this->confCryptLib();
			$this->tmbPath = $this->confTmbPath();
			$this->tmbPathWritable = $this->tmbPath && is_writable($this->tmbPath);
			$this->tmbURL  = $this->confTmbURL();
			$this->tmbSize = $this->options['tmbSize'] > 0 ? (int)$this->options['tmbSize'] : 48;
			$this->imgLib  = $this->confImgLib();
			
			if ($this->options['startPath']) {
				$path = $this->normpath($this->options['startPath']);
				if ($this->inpath($path, $this->root)) {
					$start = $this->file($path);
					if ($start && $start['mime'] == 'directory' && $start['read']) {
						$this->startPath = $path;
					}
				}
				
			}
			
			$this->mimeDetect = $this->confMimeDetect();
			// load mimes from external file for mimeDetect = 'internal'
			// based on Alexey Sukhotin idea and patch: http://elrte.org/redmine/issues/163
			if ($this->mimeDetect == 'internal' && !self::$mimetypesLoaded) {
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
					self::$mimetypesLoaded = true;
				}
			}
			
			
		}
		
		
		echo 'root: '.$this->root.' name: '.$this->rootName.' url: '.$this->URL.' start: '.$this->startPath. '<br>';
		$this->_configure();
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
	 * Return root or startPath hash
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function defaultPath() {
		return $this->encode($this->startPath ? $this->startPath : $this->root);
	}
	
	/**
	 * Return base url
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function url() {
		return $this->URL;
	}
	
	/**
	 * Return file path relative root dir
	 *
	 * @param  string  $hash  file hash
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function path($hash) {
		$path = $this->decode($hash);
		return $this->rootName.DIRECTORY_SEPARATOR.($path == $this->root ? '' : $this->relpath($path).DIRECTORY_SEPARATOR);
	}
	
	/**
	 * Return volume parameters
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function params() {
		return array(
			'tmbURL'   => $this->tmbURL,
			'dotFiles' => (int)$this->options['dotFiles'],
			'disabled' => array()
		);
	}
	
	/**
	 * Return true if file is ordinary file
	 *
	 * @param  string  file hash 
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isFile($hash) {
		return $this->_isFile($this->decode($hash));
	}
	
	/**
	 * Return true if file is directory
	 *
	 * @param  string  file hash 
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isDir($hash) {
		return $this->_isDir($this->decode($hash));
	}
	
	/**
	 * Return true if file is readable
	 *
	 * @param  string  file hash 
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isReadable($hash='') {
		return $this->_isReadable($hash ? $this->decode($hash) : $this->root);
	}
	
	/**
	 * Return true if file is writable
	 *
	 * @param  string  file hash 
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isWritable($hash) {
		return $this->_isWritable($this->decode($hash));
	}
	
	/**
	 * Return true if file is removeable
	 *
	 * @param  string  file hash 
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isRemovable($hash) {
		return $this->_isRemovable($this->decode($hash));
	}
	
	/**
	 * Return file info or false on error
	 *
	 * @param  string   $hash  file hash
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function info($hash) {
		$file = $this->file($this->decode($hash));
		if (!$file) {
			return $this->setError('File not found');
		}
		if (!$file['read']) {
			return $this->setError('The $1 "$2" can’t be opened because you don’t have permission to see its contents.', $file['mime'] == 'directory' ? 'Folder' : 'File', $file['name']);
		}
		return $file;
	}
	
	
	/*********************************************************************/
	/*                        INIT AND CONFIGURE                         */
	/*********************************************************************/

	/**
	 * Prepare driver before mount volume.
	 * Return true on success
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _init();

	/**
	 * Any actions after successfull "mount"
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _configure();

	/**
	 * Extend first array by data from second
	 *
	 * @param  array
	 * @param  array
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function extend($dst, $src) {
		
		foreach ($src as $k => $v) {
			if (is_scalar($v)) {
				$dst[$k] = $v;
			} elseif (is_array($v)) {
				$dst[$k] = $this->extend(isset($dst[$k]) && is_array($dst[$k]) ? $dst[$k] : array(), $v );
			}
		}
		
		return $dst;
	}
	
	/**
	 * Return mimetype detection method name - internal
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function confMimeDetect() {
		return 'internal';
	}
	
	/**
	 * Return thumbnails path.
	 * Path must be real path on fs
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function confTmbPath() {
		$path = $this->options['tmbPath'];
		if ($path) {
			$path = $this->normpath(strpos($path, DIRECTORY_SEPARATOR) === false ? $this->root.DIRECTORY_SEPARATOR.$path : $path);

			if (!file_exists($path)) {
				if (@mkdir($path)) {
					chmod($path, $this->options['tmbPathMode']);
				} else {
					$path = '';
				}
			} 
			return is_dir($path) ? $path : '';
		}
		return '';
	}
	
	
	/**
	 * Return thumbnails dir URL
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function confTmbURL() {
		if ($this->options['tmbURL']) {
			return $this->options['tmbURL'];
		} elseif ($this->URL && $this->tmbPath && $this->inpath($this->tmbPath, $this->root)) {
			return $this->path2url($this->tmbPath).'/';
		}
		return '';
	}
	
	/**
	 * Return best available image manipulations library name
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function confImgLib() {
		$type = preg_match('/^(imagick|mogrify|gd|auto)$/i', $this->options['imgLib'])
			? strtolower($this->options['imgLib'])
			: 'auto';
			
		if (($type == 'imagick' || $type == 'auto') && extension_loaded('imagick')) {
			return 'imagick';
		}
			
		if (($type == 'mogrify' || $type == 'auto') && function_exists('exec')) {
			exec('mogrify --version', $o, $c);
			if ($c == 0) {
				return 'mogrify';
			}
		}
		
		return function_exists('gd_info') ? 'gd' : '';
	}
	
	/**
	 * Return crypt library name. Not implemented
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function confCryptLib() {
		return '';
	}
	
	/**
	 * Save error message
	 *
	 * @param  string|array  error message
	 * @return false
	 * @author Dmitry(dio) Levashov
	 **/
	protected function setError($msg)	{
		$this->error = func_get_args();
		return false;
	}
	
	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/
	/**
	 * Return normalized path, this works the same as os.path.normpath() in Python
	 *
	 * @param  string  $path  path
	 * @return string
	 * @author Troex Nevelin
	 **/
	protected function normpath($path) {
		if (empty($path)) {
			return '.';
		}

		if (strpos($path, '/') === 0) {
			$initial_slashes = true;
		} else {
			$initial_slashes = false;
		}
			
		if (($initial_slashes) 
		&& (strpos($path, '//') === 0) 
		&& (strpos($path, '///') === false)) {
			$initial_slashes = 2;
		}
			
		$initial_slashes = (int) $initial_slashes;

		$comps = explode('/', $path);
		$new_comps = array();
		foreach ($comps as $comp) {
			if (in_array($comp, array('', '.'))) {
				continue;
			}
				
			if (($comp != '..') 
			|| (!$initial_slashes && !$new_comps) 
			|| ($new_comps && (end($new_comps) == '..'))) {
				array_push($new_comps, $comp);
			} elseif ($new_comps) {
				array_pop($new_comps);
			}
		}
		$comps = $new_comps;
		$path = implode('/', $comps);
		if ($initial_slashes) {
			$path = str_repeat('/', $initial_slashes) . $path;
		}
		
		return $path ? $path : '.';
	}
	
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
			if (isset($this->paths[$path])) {
				// echo 'cache '.$this->paths[$path];
				return $this->paths[$path];
			}
			// cut ROOT from $path for security reason, even if hacker decodes the path he will not know the root
			$path = $this->relpath($path);
			// if reqesting root dir $path will be empty, then assign '/' as we cannot leave it blank for crypt
			if (!$path)	{
				$path = DIRECTORY_SEPARATOR;
			}

			// TODO crypt path and return hash
			$hash = $this->crypt($path);
			// hash is used as id in HTML that means it must contain vaild chars
			// make base64 html safe and append prefix in begining
			$hash = strtr(base64_encode($hash), '+/=', '-_.');
			// remove dots '.' at the end, before it was '=' in base64
			$hash = rtrim($hash, '.'); 
			// append volume id to make hash unique
			$hash = $this->id.$hash;
			$this->paths[$path] = $hash;
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
			if (!empty($this->hashes[$hash])) {
				// echo 'cache '.$this->hashes[$hash];
				return $this->hashes[$hash];
			}
			// cut volume id after it was prepended in encode
			$h = substr($hash, strlen($this->id));
			// replace HTML safe base64 to normal
			$h = base64_decode(strtr($h, '-_.', '+/='));
			// TODO uncrypt hash and return path
			$path = $this->uncrypt($h); 
			// append ROOT to path after it was cut in encode
			$path = $this->root.($path == DIRECTORY_SEPARATOR ? '' : DIRECTORY_SEPARATOR.$path); 
			$this->hashes[$hash] = $path;
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
	 * Return path related to root
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function relpath($path) {
		return $path == $this->root ? '' : substr($path, strlen($this->root)+1);
	}
	
	/**
	 * Return true if $path is children of $parent
	 *
	 * @param  string  $path    path to check
	 * @param  string  $parent  parent path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function inpath($path, $parent) {
		return $path == $parent || strpos($path.DIRECTORY_SEPARATOR, $parent) === 0;
	}
	
	/**
	 * Convert file path into url
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function path2url($path) {
		if ($this->URL) {
			return $path == $this->root
				? $this->URL
				: $this->URL.str_replace(DIRECTORY_SEPARATOR, '/', $this->relpath($path));
		}
		return '';
	}
	
	
	/**
	 * Return true if file name is not . or ..
	 * If file name begins with . return value according to $this->options['dotFiles']
	 * If set rule to validate filename - check it
	 *
	 * @param  string  $file  file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function accepted($path) {
		$filename = basename($path);
		if ($filename == '.' || $filename == '..') {
			return false;
		}
		if ('.' == substr($filename, 0, 1)) {
			return !!$this->options['dotFiles'];
		}
		
		return empty($this->options['accepted']) ? true : preg_match($this->options['accepted'], $path);
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
	 * Returns the target of a symbolic link,
	 * if target exists and is under root dir
	 *
	 * @param  string  $link  link path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function readlink($path) {
		$link = false;

		if (($target = $this->_readlink($path)) !== false) {
			$target = $this->normpath($target);

			if ($target == $path) {
				// circlic 0_o is it possible?
				$link = false;
			} elseif (substr($target, 0, 1) == DIRECTORY_SEPARATOR || preg_match('/^[A-Z]\:\\\/', $target)) {
				// absolute path
				$link = $this->root.substr($target, strlen(realpath($this->root)));
			} else {
				// relative path
				$link = $this->normpath(dirname($path).DIRECTORY_SEPARATOR.$target);
			}
		}
		return $link;
	}
	
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
		if ($this->tmbURL) {
			// file itself thumnbnail
			if ($this->inpath($path, $this->tmbPath)) {
				return basename($path);
			}
			$name = $this->tmbname($path);
			if ($this->_tmbExists($name)) {
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
			&& !$this->_inpath($path, $this->tmbPath) // do not create thumnbnail for thumnbnail
			&& $this->imgLib 
			&& strpos('image', $mime) == 0 
			&& ($this->imgLib == 'gd' ? $mime == 'image/jpeg' || $mime == 'image/png' || $mime == 'mime/gif' : true);
	}
	
	/**
	 * Return true if file can be resized by current driver
	 *
	 * @param  string  $path  file path
	 * @param  string  $mime  file mime type
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function resizable($path, $mime) {
		return $this->imgLib 
			&& strpos('image', $mime) == 0 
			&& ($this->imgLib == 'gd' ? $mime == 'image/jpeg' || $mime == 'image/png' || $mime == 'mime/gif' : true);
	}
	
	/**
	 * Return fileinfo from cache.
	 * If there is no info in cache - load it
	 *
	 * @param  string  $path  file cache
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function file($path) {
		return isset($this->files[$path]) ? $this->files[$path] : $this->files[$path] = $this->fileinfo($path);
	}
	
	/**
	 * Return fileinfo
	 *
	 * @param  string  $path  file cache
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function fileinfo($path) {
		$root = $path == $this->root;
		if (($root || $this->accepted($path)) && $this->_fileExists($path)) {
			$link  = $this->_isLink($path);
			$mime  = $this->mimetype($path);
			$dir   = $mime == 'directory';
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
				'hash'  => $this->encode($path),
				'phash' => $root ? '' : $this->decode(dirname($path)),
				'name'  => $root && $this->options['alias'] ? $this->options['alias'] : basename($path),
				'mime'  => $mime,
				'size'  => $size,
				'date'  => $date,
				'read'  => (int)$this->_isReadable($path),
				'write' => (int)$this->_isWritable($path),
				'rm'    => (int)$this->_isRemovable($path)
			);
			
			if (!$root && $link) {
				$target = $this->readlink($path);
				if ($target) {
					$file['mime']   = $this->mimetype($target);
					$file['link']   = $this->encode($target);
					$file['linkTo'] = $this->abspath($target);
				} else {
					$file['mime']  = 'symlink-broken';
					$file['read']  = 0;
					$file['write'] = 0;
				}
			}
			
			if ($dir && $this->_subdirs($path)) {
				if ($this->_subdirs($path)) {
					$file['dirs'] = 1;
				}
			} elseif (1) {
				if (($tmb = $this->gettmb($path)) != false) {
					$file['tmb'] = $tmb;
				} elseif ($this->canCreateTmb($path, $file['mime'])) {
					$file['tmb'] = 1;
				}
				
				if (($dim = $this->_dimensions($path, $file['mime'])) != false) {
					$file['dim'] = $dim;
				}
				
				if ($file['write'] && $this->resizable($path, $file['mime'])) {
					$file['resize'] = 1;
				}
			}
			return $file;
		}
		return false;
	}
	
	
	/************************** abstract methods ***************************/
	
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
	 * Return true if file can be removed
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _isRemovable($path);
	
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
	 * Return symlink stat (required only size and mtime)
	 *
	 * @param  string  $path  link path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _lstat($path);
	
	/**
	 * Return symlink target file
	 *
	 * @param  string  $path  link path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _readlink($path);
	
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
	
}

?>