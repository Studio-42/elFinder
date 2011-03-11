<?php
/**
 * Based class for elFinder volume.
 * Has 2 layers:
 *  1. API (public)
 *  2. Basic fs operations (mkdir, fileinfo etc.) (abstract, protected)
 *
 * @author Dmitry (dio) Levashov
 * @author Troex Nevelin
 * @author Alexey Sukhotin
 **/
abstract class elFinderVolumeDriver {
	
	/**
	 * Driver id
	 * Must be unique and contains [a-z0-9]
	 * Used as part of volume id
	 *
	 * @var string
	 **/
	protected $driverId = 'a';
	
	/**
	 * Storage id - used as prefix for files hashes
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
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $mimeDetect = '';
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $imgLib = '';
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $tmbPath = '';
	
	/**
	 * undocumented class variable
	 *
	 * @var string
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
	 * Some options sending to client
	 *
	 * @var array
	 **/
	protected $params = array(
		'info' => array(),
		'path' => array(),
		'hash' => array()
	);
	
	/**
	 * Object configuration
	 *
	 * @var array
	 **/
	protected $options = array(
		'path'         => '',           // root path
		'alias'        => '',           // alias to replace root dir name
		'startPath'    => '',           // open this path on initial request instead of root path
		'URL'          => '',           // root url, not set to disable sending URL to client (replacement for old "fileURL" option)
		'tmbURL'       => '',           // thumbnails dir URL
		'tmbSize'      => 48,           // images thumbnails size (px)
		'mimeDetect'   => 'auto',  // how to detect mimetype
		'tmbDir'       => '.tmb',  // directory for thumbnails
		'tmbDirMode'   => 0777,
		'imgLib'       => 'auto',  // image manipulations lib name
		'tmbCleanProb' => 0,       // how frequiently clean thumbnails dir (0 - never, 100 - every init request)
		'dotFiles'     => false,   // allow dot files?
		'accepted'     => '',      // regexp to validate filenames
		'disabled'     => array(),      // list of commands names to disable on this root
		'uploadAllow'  => array(),      // mimetypes which allowed to upload
		'uploadDeny'   => array(),      // mimetypes which not allowed to upload
		'uploadOrder'  => 'deny,allow', // order to proccess uploadAllow and uploadAllow options
		'treeDeep'     => 1,            // how many subdirs levels return per request
		'dateFormat'   => 'j M Y H:i',  // files dates format
		'accepted'     => '',           // regexp, additional rule to check file names
		'copyFrom'     => true,
		'copyTo'       => true,
	);
	
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
	 * Filter directory content rules
	 *
	 **/
	const FILTER_DIRS_ONLY = 1;
	const FILTER_FILES_ONLY = 2;
	
	/**
	 * Directory content sort rules
	 *
	 **/
	const SORT_NAME_DIRS_FIRST = 1;
	const SORT_KIND_DIRS_FIRST = 2;
	const SORT_SIZE_DIRS_FIRST = 3;
	const SORT_NAME            = 4;
	const SORT_KIND            = 5;
	const SORT_SIZE            = 6;
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $cache = array();
	
	/**
	 * "Mount" volume
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	public function mount($id, array $opts) {
		$this->id = $id;
		if (($opts = $this->_prepare($opts)) === false) {
			return false;
		}
		$this->options = array_merge($this->options, $opts);

		// root does not exists or not readable and writable
		if (empty($this->options['path']) 
		|| !$this->_isDir($this->options['path'])
		|| !($read = $this->_isReadable($this->options['path'])) && !$this->_isWritable($this->options['path'])) {
			return false;
		}
		
		$this->root       = $this->options['path'];
		$startPath        = @$this->options['startPath'];
		$this->URL        = $this->options['URL'];
		$this->rootName   = !empty($this->options['alias']) ? $this->options['alias'] : $this->_basename($this->root);
		$this->treeDeep   = $this->options['treeDeep'] > 0 ? (int)$this->options['treeDeep'] : 1;
		$this->tmbSize    = $this->options['tmbSize'] > 0 ? (int)$this->options['tmbSize'] : 48;
		$this->today      = mktime(0,0,0, date('m'), date('d'), date('Y'));
		$this->yesterday  = $this->today-86400;
		$this->mimeDetect = $this->confMimeDetect();
		$this->imgLib     = $this->confImgLib();
		$this->tmbPath    = $this->confTmbPath();
		$this->tmbPathWritable = $this->tmbPath && is_writable($this->tmbPath);
		$this->tmbURL     = $this->URL ? $this->confTmbURL() : '';
		$this->cryptLib   = $this->confCryptLib();

		if ($startPath 
			&& $this->_inpath($startPath, $this->root) 
			&& $this->accepted($startPath) 
			&& $this->_isDir($startPath) 
			&& $this->_isReadable($startPath)) {
			// allow startPath for readable root
			$this->startPath = $startPath;
		}
		
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
		
		$this->_configure();
		return $this->mounted = true;
	}
	
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
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function id() {
		return $this->id;
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
	
	
	/***************************************************************************/
	/*                              storage API                                */
	/***************************************************************************/
	
	/**
	 * Return root directory hash
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
	 * Return true if file exists
	 *
	 * @param  string  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function fileExists($hash) {
		$path = $this->decode($hash);
		return $path && $this->accepted($path) && $this->_fileExists($path) ;
	}
	
	/**
	 * Return true if file is ordinary file
	 *
	 * @param  string  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isFile($hash) {
		$path = $this->decode($hash);
		if ($path && $this->accepted($path) && $this->_isFile($path)) {
			if ($this->_isLink($path) && $this->readlink($path) === false) {
				return false;
			}
			return true;
		}
		return false;
		return $path && $this->accepted($path) && $this->_isFile($path);
	}
	
	/**
	 * Return true if file is directory
	 *
	 * @param  string  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isDir($hash) {
		$path = $this->decode($hash);
		if ($path && $this->accepted($path) && $this->_isDir($path)) {
			if ($this->_isLink($path) && $this->readlink($path) === false) {
				return false;
			}
			return true;
		}
		return false;
		return $path && $this->accepted($path) && $this->_isDir($path);
	}
	
	/**
	 * Return true if file is symlink
	 *
	 * @param  string  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isLink($hash) {
		$path = $this->decode($hash);
		return $path && $this->accepted($path) && $this->_isLink($path);
	}
	
	/**
	 * Return true if file is readable
	 *
	 * @param  string  file hash 
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isReadable($hash) {
		$path = $this->decode($hash);
		return $path && $this->accepted($path) && $this->_isReadable($path);
	}
	
	/**
	 * Return true if file is readable
	 *
	 * @param  string  file hash 
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isWritable($hash) {
		$path = $this->decode($hash);
		return $path && $this->accepted($path) && $this->_isWritable($path);
	}
	
	/**
	 * Return true if file can be removed
	 *
	 * @param  string  file hash 
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isRemovable($hash) {
		$path = $this->decode($hash);
		return $path && $this->accepted($path) && $this->_isRemovable($path);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function open($hash, $mimes=array(), $tree = false) {
		if (($path = $this->path($hash, '', 'read')) === false) {
			return false;
		}

		$files = array();
		
		if (($ls = $this->_scandir($path)) === false) {
			return $this->setError('Unable to open folder');
		}
		
		foreach ($ls as $file) {
			$info = $this->fileinfo($file);
			$files[$info['hash']] = $info;
		}
		
		// append tree if required
		if ($tree) {
			$tree = $this->gettree($this->root, $this->treeDeep);

			foreach ($tree as $dir) {
				if (!isset($files[$dir['hash']])) {
					$files[$dir['hash']] = $dir;
				}
			}
		}
		// debug($mimes);
		$files = $this->filter($files, $mimes);
		return array_values($files);
	}
	
	/**
	 * Return file/dir info
	 *
	 * @param  string  file hash
	 * @param  array   tells what additional params add to result
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function info($hash, $extended=false) {
		
		if (($path = $this->path($hash, '', 'read')) === false) {
			return false;
		}
		$info = $this->fileinfo($path);
		
		if ($extended) {
			$info['params'] = array_merge(array('tmbUrl' => $this->tmbURL),  $this->_params());
			$info['url'] = $this->_path2url($path).($path == $this->root ? '' : '/');
			// $info['tmbUrl'] = $this->tmbURL;
		}
		
		return $info;
	}
	
	
	/**
	 * Return subdirectories info for required folder
	 *
	 * @param  string $hash  parent dir hash, or empty string for root dir
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function tree($hash='') {
		return false == ($path = $this->path($hash ? $hash : $this->root(), 'd', 'read'))
			? false
			: $this->gettree($path, $this->treeDeep);
	}
	
	/**
	 * Return parents directories for required one
	 *
	 * @param  string  $hash  directory hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function parents($hash) {
		if (($path = $this->path($hash, 'd', 'read')) === false) {
			return $this->setError('File not found');
		}
		
		$tree = array($this->fileinfo($path, array('phash', 'childs')));
		while ($path != $this->root) {
			$path = $this->_dirname($path);
			if (!$this->_isReadable($path)) {
				return $this->setError('Access denied');
				
			} 
			$info = $this->fileinfo($path, array('phash', 'childs'));
			$info['childs'] = 1;
			array_unshift($tree, $info);
		}
		return $tree;
	}
	
	/**
	 * Create thumbnails for required files
	 *
	 * @param  array  $files  files hashes
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function tmb($files) {
		$images = array();
		if ($this->tmbURL) {
			foreach ($files as $hash) {
				if (($path = $this->path($hash, 'f', 'read')) !== false) {
					if (($tmb = $this->tmbURL($path)) != false || ($tmb = $this->createTmb($path)) != false) {
						$images[$hash] = $tmb;
					} 
				}
			}
		}
		return $images;	
	}
	
	/**
	 * Check for new/removed files
	 *
	 * @param  array  files hashes from client
	 * @param  string current directory hash if it belongs current volume
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function sync($hashes, $current='', $mimes=array()) {
		$result = array('removed' => array(), 'added' => array());
		$exists = array();
		$parents = array();
		$added = array();
		
		// check removed files
		foreach ($hashes as $hash) {
			if (($path = $this->path($hash)) == false) {
				$result['removed'][] = $hash;
			} else {
				$exists[] = $path;
			}
		}

		// find new files in current directory if required
		if ($current 
		&& ($cwd = $this->path($current, 'd', 'read')) != false
		&& ($ls = $this->_scandir($cwd)) !== false) {
			$added = array_diff($ls, $exists);
		}
		
		// find new directories
		foreach ($exists as $path) {
			if ($this->_isDir($path)) {

				$parents[] = $path == $this->root ? $path : $this->_dirname($path);
			}
		}
		
		foreach (array_unique($parents) as $path) {
			$added = array_merge($added, array_diff($this->_scandir($path, self::FILTER_DIRS_ONLY), $exists));
		}
		
		foreach (array_unique($added) as $path) {
			$result['added'][] = $this->fileinfo($path);
		}
		
		$result['added'] = array_values($this->filter($result['added'], $mimes));
		
		return $result;
	}
	
	/**
	 * Open file and return file pointer
	 * Return false on error
	 *
	 * @param  string  $hash  file hash
	 * @param  bool    $write open file for writing?
	 * @return resource|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function fopen($hash, $mode = 'rb') {
		if (($path = $this->path($hash, 'f', substr($mode, 'r') === 0 ? 'read' : 'write')) == false) {
			return false;
		}
		
		if (($fp = $this->_fopen($path, $mode)) === false) {
			return $this->setError('Unable to open file');
		}
		
		return $fp;
	}
	
	/**
	 * Close file pointer
	 *
	 * @param  resource file pointer
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function fclose($fp) {
		$this->_fclose($fp);
	}
	
	/**
	 * Create directory
	 *
	 * @param  string  $hash  parent directory hash
	 * @param  string  $name  new directory name
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function mkdir($hash, $name)	{
		if (($path = $this->path($hash, 'd', 'write')) === false) {
			return false;
		}
		// to avoid ../ in dir name
		$name = $this->_basename($name);
		
		if (!$name || !$this->accepted($name)) {
			return $this->setError('Invalid folder name');
		}
		// check for file with required name
		if ($this->_hasChild($path, $name)) {
			return $this->setError('File or folder with the same name already exists');
		}
		
		if (($path = $this->_mkdir($path, $name)) === false) {
			return $this->setError('Unable to create folder');
		}
		
		return $this->encode($path);
	}
	
	/**
	 * Create empty file
	 *
	 * @param  string  $hash  parent directory hash
	 * @param  string  $name  new directory name
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function mkfile($hash, $name) {
		if (($path = $this->path($hash, 'd', 'write')) === false) {
			return false;
		}
		// to avoid ../ in dir name
		$name = $this->_basename($name);
		
		if (!$name || !$this->accepted($name)) {
			return $this->setError('Invalid file name');
		}
		// check for file with required name
		if ($this->_hasChild($path, $name)) {
			return $this->setError('File or folder with the same name already exists');
		}
		
		if (($path = $this->_mkfile($path, $name)) === false) {
			return $this->setError('Unable to create file');
		}
		
		return $this->encode($path);
	}
	
	/**
	 * Remove dir/file
	 *
	 * @param  string  $hash  file hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function rm($hash) {
		return ($path = $this->path($hash, '', 'rm')) && $this->remove($path);
	}
	
	/**
	 * Duplicate file
	 *
	 * @param  string  $hash file hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function duplicate($hash) {
		if (($path = $this->path($hash, '', 'read')) === false) {
			return false;
		}
		
		return !($p = $this->_copy($path, $this->_dirname($path), $this->uniqueName($path)))
			? false
			: $this->encode($p);
	}
	
	/**
	 * Return driver debug info
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function debug()	{
		return array_merge(array('driver' => get_class($this), 'root' => $this->root), $this->_debug());
	}
	
	
	/***************************************************************************/
	/*                            storage configure                            */
	/***************************************************************************/
	
	/**
	 * Return file mimetype detect method.
	 * Core support only "internal"
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function confMimeDetect() {
		return 'internal';
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
	 * Return thumbnails path.
	 * Path must be real path on fs
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function confTmbPath() {
		$path = $this->options['tmbDir'];
		
		$path = $this->normpath(strpos($path, DIRECTORY_SEPARATOR) === false ? $this->root.DIRECTORY_SEPARATOR.$path : $path);
		
		if (!file_exists($path)) {
			if (@mkdir($path)) {
				chmod($path, $this->options['tmbDirMode']);
				return $path;
			}
			return '';
		} 
		return is_dir($path) ? $path : '';
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
		} elseif ($this->_inpath($this->tmbPath, $this->root)) {
			return $this->_path2url($this->tmbPath).'/';
		}
		return '';
	}
	
	/***************************************************************************/
	/*                                utilites                                 */
	/***************************************************************************/
	
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
			$path = $this->_relpath($path);
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
			if (!empty($this->cache['hash'][$hash])) {
				return $this->cache['hash'][$hash];
			}
			// cut volume id after it was prepended in encode
			$h = substr($hash, strlen($this->id));
			// replace HTML safe base64 to normal
			$h = base64_decode(strtr($h, '-_.', '+/='));
			// TODO uncrypt hash and return path
			$path = $this->uncrypt($h);
			// append ROOT to path after it was cut in encode
			$path = $this->_abspath($path);
			$this->cache['hash'][$hash] = $path;
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
	 * Return file mimetype
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mimetype($path) {
		$pinfo = $this->_pathinfo($path); 
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
	 * Return true if file name is not . or ..
	 * If file name begins with . return value according to $this->options['dotFiles']
	 * If set rule to validate filename - check it
	 *
	 * @param  string  $file  file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function accepted($path) {
		$filename = $this->_basename($path);
		if ($filename == '.' || $filename == '..') {
			return false;
		}
		if ('.' == substr($filename, 0, 1)) {
			return !!$this->options['dotFiles'];
		}
		if (!empty($this->options['accepted'])) {
			return preg_match($this->options['accepted']);
		}
		return true;
	}
	
	/**
	 * Decode hash into path and return if it meets the requirement
	 *
	 * @param  string  $hash  file hash
	 * @param  string  $type  file type (d|f)
	 * @param  string  $perm  required permission
	 * @param  bool    $linkTarget  if file is link - check and return link target path instead of link path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function path($hash, $type='', $perm="", $linkTarget = false) {
		
		if (!$hash || !($path = $this->decode($hash))) {
			return $this->setError($type == 'd' ? 'Folder not found' : 'File not found');
		}

		if (!$this->accepted($path) || !$this->_fileExists($path)) {
			return $this->setError(array(($type == 'd' ? 'Folder' : 'File').' "$1" not found', $this->_basename($path)));
		}
		
		if ($type) {
			$dir = $this->_isDir($path);
			if (($type == 'd' && !$dir)
			||  ($type == 'f' &&  $dir)) {
				return $this->setError(array(($type == 'd' ? 'Folder' : 'File').' "$1" not found', $this->_basename($path)));
			}
		}
		
		if ($perm == 'read' && !$this->_isReadable($path)) {
			return $this->setError(array(($dir ? 'The folder' : 'The file').' "$1" can’t be opened because you don’t have permission to see its contents.', $this->_basename($path)));
		}
		if ($perm == 'write' && !$this->_isWritable($path)) {
			return $this->setError(array(($dir ? 'Folder' : 'File').' "$1" has not write permissions.', $this->_basename($path)));
		}
		if ($perm == 'rm' && !$this->_isRemovable($path)) {
			return $this->setError(array(($dir ? 'Folder' : 'File').' "$1" can not be removed.', $this->_basename($path)));			
		}
		
		if ($linkTarget && $this->_isLink($path)) {
			if (false === ($path = $this->_readlink($path))) {
				return $this->setError($type == 'd' ? 'Folder not found' : 'File not found');
			}
		}
		
		return $path;
	}
	
	/**
	 * Filter files list by mimetypes
	 *
	 * @param  array  $files  files list (every item is the same as info() method returns)
	 * @param  array  $mimes  allowed mime types list
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function filter($files, $mimes=array()) {
		if (!empty($mimes)) {
			foreach ($files as $id => $file) {
				// debug($file);
				if ($file['mime'] != 'directory' && !$this->validMime($file['mime'], $mimes)) {
					unset($files[$id]);
				}
			}
		}
		return $files;
	}
	
	/**
	 * Check if mime is required mimes list
	 *
	 * @param  string $mime   mime type to check
	 * @param  array  $mimes  allowed mime types list
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function validMime($mime, $mimes) {
		return in_array($mime, $mimes) || in_array(substr($mime, 0, strpos($mime, '/')), $mimes);
	}
	
	/**
	 * Return file info
	 *
	 * @param  string  $path  file path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function fileinfo($path) {
		$root = $path == $this->root;
		
		if (!empty($this->cache['info'][$path])) {
			return $this->cache['info'][$path];
		}
		
		$info = array(
			'name'  => htmlspecialchars($this->_basename($path)),
			'hash'  => $this->encode($path),
			'phash' => $root ? null : $this->encode($this->_dirname($path)),
			'mime'  => $this->mimetype($path),
			'read'  => (int)$this->_isReadable($path),
			'write' => (int)$this->_isWritable($path),
			'rm'    => (int)$this->_isRemovable($path),
			'rel'   => $root ? $this->rootName : DIRECTORY_SEPARATOR.$this->_relpath($path)
		);
		
		
		if ($info['read']) {
			$time = $this->_filemtime($path);
			if ($time > $this->today) {
				$info['date'] = 'Today '.date('H:i', $time);
			} elseif ($time > $this->yesterday) {
				$info['date'] = 'Yesterday '.date('H:i', $time);
			} else {
				$info['date'] = date($this->options['dateFormat'], $time);
			}
			
			if ($path != $this->root && $this->_isLink($path)) {
				if (false === ($link = $this->readlink($path))) {
					$info['mime']  = 'symlink-broken';
					$info['read']  = 0;
					$info['write'] = 0;
				} else {
					$info['mime']   = $this->mimetype($link);
					$info['link']   = $this->encode($link);
					$info['linkTo'] = $this->rootName.DIRECTORY_SEPARATOR.$this->_relpath($path);
				}
			}
			
			if ($info['mime'] == 'directory') {
				$info['childs'] = (int)$this->_hasSubdirs($path);
			} elseif ($info['mime'] != 'symlink-broken') {
				$info['size'] = $this->_filesize($path);
				
				if (($tmb = $this->getTmb($path)) != false) {
					$info['tmb'] = $tmb;
				} elseif ($this->canCreateTmb($path, $info['mime'])) {
					$info['tmb'] = 1;
				}
				
				if (($dim = $this->dimensions($path, $info['mime'])) != false) {
					$info['dim'] = $dim;
				}
				if ($info['write'] && $this->isResizable($path, $info['mime'])) {
					$info['resize'] = 1;
				}
			}
		} else {
			$info['date'] = 'unknown';
		}

		$this->cache['info'][$path] = $info;
		return $info;
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
		if (($path = $this->_readlink($path)) === false) {
			return false;
		}
		// check for target outside root
		return $this->_inpath($path, $this->root) && $this->_fileExists($path) ? $path : false;
	}
	
	/**
	 * Return thumbnail file name for required file
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function tmbName($path) {
		return md5($this->_basename($path)).'.png';
	}
	
	/**
	 * Return thumnbnail name if exists
	 *
	 * @param  string  $path file path
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function getTmb($path) {
		if ($this->tmbURL) {
			// file itself thumnbnail
			if ($this->_inpath($path, $this->tmbPath)) {
				return $this->_basename($path);
			}
			$name = $this->tmbName($path);
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
		return $this->imgLib 
			&& !$this->_inpath($path, $this->tmbPath)
			&& $this->tmbURL
			&& $this->tmbPathWritable 
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
	protected function isResizable($path, $mime) {
		return $this->imgLib 
			&& strpos('image', $mime) == 0 
			&& ($this->imgLib == 'gd' ? $mime == 'image/jpeg' || $mime == 'image/png' || $mime == 'mime/gif' : true);
	}
	
	/**
	 * Return object width and height
	 * Ususaly used for images, but can be realize for video etc...
	 *
	 * @param  string  $path  file path
	 * @param  string  $mime  file mime type
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function dimensions($path, $mime) {
		return strpos($mime, 'image') === 0 && ($s = @getimagesize($path)) !== false 
			? $s[0].'x'.$s[1] 
			: false;
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

		$tmb = $this->tmbPath.DIRECTORY_SEPARATOR.$this->tmbName($path);
		// copy image in tmbPath so some drivers does not store files on local fs
		if (($src = $this->_fopen($path, 'rb')) == false 
		|| ($trg = @fopen($tmb, 'wb')) == false) {
			return false;
		}
		
		while (!feof($src)) {
			fwrite($trg, fread($src, 8192));
		}
		
		$this->fclose($src);
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
		
		return $result ? $this->tmbURL.basename($tmb) : false;
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
	 * Return directories tree
	 *
	 * @param  string  $path   directory to start from
	 * @param  int     $level  how many levels fetch
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function gettree($path, $level) {
		$info = $this->fileinfo($path, array('phash', 'childs'));
		$tree = array($info);

		if ($level > 0 && $info['read'] && $info['childs'] && ($dirs = $this->_scandir($path, self::FILTER_DIRS_ONLY)) != false) {
			foreach ($dirs as $dir) {
				$tree = array_merge($tree, $this->gettree($dir, $level-1));
			}
		}
		return $tree;
	}
	
	/**
	 * Remove file/recursive remove directory
	 *
	 * @param  string  $hash  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function remove($path) {
		if (!$this->_fileExists($path)) {
			return $this->setError('File not found');
		}
		
		$dir = $this->_isDir($path);

		if (!$this->_isRemovable($path)) {
			return $this->setError(array('Unable to delete '.($dir ? 'folder' : 'file').' "$1".', $this->_basename($path)), 'Not enough permissions.');			
		}
		
		if ($dir) {
			$ls = $this->_scandir($path, 0, false);
			if (is_array($ls)) {
				foreach ($ls as $file) {
					if (!$this->remove($file)) {
						return false;
					}
				}
			}
		} 
		
		return ($dir ? $this->_rmdir($path) : $this->_unlink($path)) 
			? true 
			: $this->setError(array('Unable to delete '.($dir ? 'folder' : 'file').' "$1".', $this->_basename($path)));
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function uniqueName($path, $suffix = ' copy') {
		$dir  = $this->_dirname($path);
		$name = $this->_basename($path); 
		$ext  = '';

		if ($this->_isFile($path)) {
			if (preg_match('/\.(tar\.gz|tar\.bz|tar\.bz2|[a-z0-9]{1,4})$/i', $name, $m)) {
				$ext = '.'.$m[1];
				$name = substr($name, 0,  strlen($name)-strlen($m[0]));
			}
		}
		
		if (preg_match('/('.$suffix.')(\d*)$/i', $name, $m)) {
			$i = (int)$m[2];
			$name = substr($name, 0, strlen($name)-strlen($m[2]));
		} else {
			$name .= $suffix;
			$i = 0;
		}
		
		while ($i++ <= 10000) {
			$n = $name.($i > 0 ? $i : '').$ext;
			
			if (!$this->_hasChild($dir, $n)) {
				return $n;
			}
		}
		return $name.md5($path).$ext;
	}
	
		
	/**
	 * Sort files 
	 *
	 * @param  object  file to compare
	 * @param  object  file to compare
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function compare($f1, $f2) {
		$d1 = $f1['mime'] == 'directory';
		$d2 = $f2['mime'] == 'directory';
		$m1 = $f1['mime'];
		$m2 = $f2['mime'];
		$s1 = isset($f1['size']) ? $f1['size'] : 0;
		$s2 = isset($f2['size']) ? $f2['size'] : 0;
		
		if ($this->sort <= self::SORT_SIZE_DIRS_FIRST && $d1 != $d2) {
			return $d1 ? -1 : 1;
		}
		
		if (($this->sort == self::SORT_KIND_DIRS_FIRST || $this->sort == self::SORT_KIND) && $m1 != $m2) {
			return strcmp($m1, $m2);
		}
		
		if (($this->sort == self::SORT_SIZE_DIRS_FIRST || $this->sort == self::SORT_SIZE) && $s1 != $s2) {
			return $s1 < $s2 ? -1 : 1;
		}
		
		return strcmp($f1['name'], $f2['name']);
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
	
	
	/***************************************************************************/
	/*                           abstract methods                              */
	/***************************************************************************/
	
	/**
	 * Prepare object configuration and do any stuffs required before "mount"
	 * Return  object configuration or false on failed
	 *
	 * @param  array  $opts  object configuration
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _prepare(array $opts);
	
	/**
	 * Any actions after successfull "mount"
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _configure();
	
	/**
	 * Return current root data required by client (disabled commands, archive ability, etc.)
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _params();
	
	/**
	 * Return path related to root path
	 *
	 * @param  string  $path  fuke path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _relpath($path);
	
	/**
	 * Returns fake absolute path - begining with root dir
	 *
	 * @param  string  $path  file path
	 * @return strng
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _abspath($path);
	
	/**
	 * Return path info same as pathinfo()
	 *
	 * @param  string  $path  file path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _pathinfo($path);
	
	/**
	 * Return true if $path is subdir of $parent
	 *
	 * @param  string  $path    path to check
	 * @param  string  $parent  parent path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _inpath($path, $parent);
	
	/**
	 * Return file parent directory name
	 *
	 * @param  string $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _dirname($path);

	/**
	 * Return file name
	 *
	 * @param  string $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _basename($path);
	
	
	/**
	 * Return file URL
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _path2url($path);
	
	/**
	 * Return true if file exists
	 *
	 * @param  string  $path file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _fileExists($path);
	
	/**
	 * Returns TRUE if the filename exists and is a regular file, FALSE otherwise.
	 *
	 * @param  string  $path file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _isFile($path);
	
	/**
	 * Returns TRUE if the thumbnail with given name exists
	 *
	 * @param  string  $name  thumbnail file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _tmbExists($name);
	
	/**
	 * Returns TRUE if the filename exists and is a directory, FALSE otherwise.
	 *
	 * @param  string  $path file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _isDir($path);
	
	/**
	 * Returns TRUE if the filename exists and is a symlink, FALSE otherwise.
	 *
	 * @param  string  $path file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _isLink($path);
	
	/**
	 * Returns TRUE if the file exists and readable.
	 *
	 * @param  string  $path file path
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isReadable($path);
	
	/**
	 * Returns TRUE if the file exists and writable.
	 *
	 * @param  string  $path file path
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isWritable($path);
	
	/**
	 * Returns TRUE if the file exists and can be removed.
	 *
	 * @param  string  $path file path
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isRemovable($path);
	
	/**
	 * Return true if path is dir and has at least one childs directory
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _hasSubdirs($path);
	
	/**
	 * Return true if $parent dir contains file with $name
	 *
	 * @param  string  $parent  parent dir path
	 * @param  string  $name    name to test
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _hasChild($parent, $name);
	
	/**
	 * Return file modification time
	 *
	 * @param  string $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _filemtime($path);
	
	/**
	 * Return file size
	 *
	 * @param  string $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _filesize($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _readlink($path);
	
	/**
	 * Return directory content.
	 *
	 * @param  string  $path     dir path
	 * @param  int     $filter   content filter (only dirs/only files)
	 * @param  bool    $accepted return only files with accepted names?
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _scandir($path, $filter=0, $accepted = true);
	
	/**
	 * Create directory
	 * Return new directory path or false on failed
	 *
	 * @param  string  $parent  parent directory path
	 * @param  string  $name    new directory name
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _mkdir($parent, $name);
	
	/**
	 * Create empty file
	 * Return new file path or false on failed
	 *
	 * @param  string  $parent  parent directory path
	 * @param  string  $name    new file name
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _mkfile($parent, $name);

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _symlink($target, $link);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _rmdir($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _unlink($path);
	
	
	
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
	abstract protected function _fclose($fp);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _copy($src, $dir, $name='');
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _fileGetContents($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _filePutContents($path, $content);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	// abstract protected function _resizeImg($path, $w, $h);
	
	/**
	 * Return debug info
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _debug();
	
} // END class 

?>