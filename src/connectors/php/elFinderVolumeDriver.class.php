<?php
/**
 * Based class for elFinder volume.
 * Realize all logic.
 * Abstract level realize base file sistem operation (like mkdir etc.), 
 * which must be implemented in childs classes 
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
	 * Flag - volume "mounted"and available
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
	protected $start = '';
	
	/**
	 * Base URL
	 *
	 * @var string
	 **/
	protected $URL = '';
	
	/**
	 * Thumbnails base URL
	 *
	 * @var string
	 **/
	protected $tmbURL = '';
	

	
	/**
	 * Error message from last failed action
	 *
	 * @var string
	 **/
	protected $error = '';
	
	/**
	 * Today 24:00 timestamp
	 *
	 * @var int
	 **/
	protected $today = 0;
	
	/**
	 * Yestoday 24:00 timestamp
	 *
	 * @var int
	 **/
	protected $yesterday = 0;
	
	/**
	 * Some options sending to client
	 *
	 * @var array
	 **/
	protected $params = array();
	
	/**
	 * Object configuration
	 *
	 * @var array
	 **/
	protected $options = array(
		'path'         => '',           // root path
		'alias'        => '',           // alias to replace root dir name
		'URL'          => '',           // root url, not set to disable sending URL to client (replacement for old "fileURL" option)
		'tmbURL'       => '',           // thumbnails dir URL
		'startPath'    => '',           // open this path on initial request instead of root path
		'disabled'     => array(),      // list of commands names to disable on this root
		'uploadAllow'  => array(),      // mimetypes which allowed to upload
		'uploadDeny'   => array(),      // mimetypes which not allowed to upload
		'uploadOrder'  => 'deny,allow', // order to proccess uploadAllow and uploadAllow options
		'treeDeep'     => 1,            // how many subdirs levels return
		'dateFormat'   => 'j M Y H:i',  // files dates format
		
		'copyFrom'     => true,
		'copyTo'       => true,
	);
	
	/**
	 * Filter directory content rule
	 *
	 * @var int
	 **/
	protected static $FILTER_DIRS_ONLY = 1;
	
	/**
	 * Filter directory content rule
	 *
	 * @var int
	 **/
	protected static $FILTER_FILES_ONLY = 2;
	
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_NAME_DIRS_FIRST = 1;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_KIND_DIRS_FIRST = 2;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_SIZE_DIRS_FIRST = 3;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_NAME            = 4;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_KIND            = 5;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_SIZE            = 6;
	
	/**
	 * "Mount" volume
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function mount($id, array $opts) {
		$this->id = $id;
		$opts = $this->_prepare($opts);
		$this->options = array_merge($this->options, $opts);
		$this->root    = @$this->options['path'];
		$this->start   = @$this->options['startPath'];
		$this->URL     = empty($this->options['URL']) ? '' : $this->options['URL'].(substr($this->options['URL'], -1, 1) != '/' ? '/' : '');
		$this->tmbURL  = empty($this->options['tmbURL']) ? '' : $this->options['tmbURL'].(substr($this->options['tmbURL'], -1, 1) != '/' ? '/' : '');
		
		// root does not exists
		if (!$this->root || !$this->_isDir($this->root)) {
			return false;
		}
		
		// root not readable and writable
		if (!($readable = $this->_isReadable($this->root)) 
		&& !$this->_isWritable($this->root)) {
			return false;
		}
		
		if (!$readable) {
			$this->start = $this->URL = $this->tmbURL = '';
		} elseif ($this->start) {
			// check start dir if set 
			if (!$this->_accepted($this->start) 
			|| !$this->_inpath($this->start, $this->root) 
			|| !$this->_isDir($this->start) 
			|| !$this->_isReadable($this->start)) {
				$this->start = '';
			}
		}
		$this->rootName = !empty($this->options['alias']) ? $this->options['alias'] : $this->_basename($this->root);
		
		if ($this->options['treeDeep'] > 0) {
			$this->options['treeDeep'] = (int)$this->options['treeDeep'];
		} else {
			$this->options['treeDeep'] = 1;
		}
		
		$this->today = mktime(0,0,0, date('m'), date('d'), date('Y'));
		$this->yesterday = $this->today-86400;
		$this->_configure();
		return $this->mounted = true;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function driverId() {
		return $this->driverId;
	}
	
	/**
	 * Return error message from last failed action
	 *
	 * @return string
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
	 * Return start directory hash if set
	 *
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	public function start() {
		return $this->start ? $this->encode($this->start) : false;
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
		return $path && $this->_accepted($path) && $this->_fileExists($path) ;
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
		return $path && $this->_accepted($path) && $this->_isFile($path);
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
		return $path && $this->_accepted($path) && $this->_isDir($path);
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
		return $path && $this->_accepted($path) && $this->_isLink($path);
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
		return $path && $this->_accepted($path) && $this->_isReadable($path);
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
		return $path && $this->_accepted($path) && $this->_isWritable($path);
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
		return $path && $this->_accepted($path) && $this->_isRemovable($path);
	}
	
	/**
	 * Return file/dir info
	 *
	 * @param  string  file hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function info($hash) {
		$path = $this->decode($hash);
		// @todo replace with path() and benchmark
		if (!$path || $this->_accepted($path) || !$this->_fileExists($path)) {
			$this->setError('File not found');
		}

		return $this->fileinfo($path);
	}
	
	/**
	 * Return directory info (same as info() but with additional fields)
	 * Used to get current working directory info, so return info only if dir is readable
	 *
	 * @param  string  directory hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function dir($hash) {
		
		return false == ($path = $this->path($hash, 'd', 'read', true))
			? false
			: array_merge($this->fileinfo($path), array(
					'phash'  => $path == $this->root ? false : $this->encode($this->_dirname($path)),
					'url'    => $this->_path2url($path, true),
					'path'    => $this->_abspath($path), 
					'params' => $this->_params()
				));
	}
	
	/**
	 * Return directory content
	 *
	 * @param  string  $hash  file hash
	 * @param  int     $sort  how to sort files
	 * @param  array   $mimes mimetypes list to filter files
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function scandir($hash, $sort=1, $mimes=array()) {
		if (false == ($path = $this->path($hash, 'd', 'read'))) {
			return false;
		}
		
		$files = array();
		foreach ($this->_scandir($path) as $file) {
			$files[] = $this->fileinfo($file);
		}
		
		$files = $this->filter($files, $mimes);
		
		if ($sort < self::$SORT_NAME_DIRS_FIRST || $sort > self::$SORT_SIZE) {
			$sort = self::$SORT_NAME_DIRS_FIRST;
		}
		$this->sort = $sort;
		usort($files, array($this, 'compare'));
		return $files;
	}
	
	/**
	 * Return subdirectories info for required folder
	 *
	 * @param  string $hash  parent dir hash, or empty string for root dir
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function tree($hash) {
		return false == ($path = $this->path($hash ? $hash : $this->root(), 'd', 'read'))
			? false
			: $this->_tree($path, $this->options['treeDeep']);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function tmb($hash) {
		if (false == ($path = $this->path($hash, 'd', 'read'))) {
			return false;
		}
		$tmb = array();
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
	/*                                utilites                                 */
	/***************************************************************************/
	
	/**
	 * Decode hash into path and return if it meets the requirement
	 *
	 * @param  string  $hash  file hash
	 * @param  string  $type  file type (d|f)
	 * @param  string  $perm  permission of required type must be allowed
	 * @param  bool    $linkTarget  if file is link - check and return link target
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function path($hash, $type='f', $perm="read", $linkTarget = false) {
		$path = $this->decode($hash);

		if (!$path || !$this->_accepted($path) || !$this->_fileExists($path)) {
			return $this->setError('File not found');
		}
		
		if (($perm == 'read' && !$this->_isReadable($path))
		|| ($perm == 'write' && !$this->_isWritable($path))
		|| ($perm == 'rm'    && !$this->_isRemovable($path))) {
			return $this->setError('Access denied');
		}
		
		if ($linkTarget && $this->_isLink($path)) {
			if (false === ($path = $this->_readlink($path))) {
				return $this->setError('File not found');
			}
			if (($perm == 'read'  && !$this->_isReadable($path))
			||  ($perm == 'write' && !$this->_isWritable($path))
			||  ($perm == 'rm'    && !$this->_isRemovable($path))) {
				return $this->setError('Access denied');
			}
		}
		
		if (($type == 'd' && !$this->_isDir($path))
		||  ($type == 'f' && !$this->_isFile($path))) {
			return $this->setError('Invalid parameters');
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
		foreach ($mimes as $req) {
			if (strpos($mime, $req) === 0) {
				return true;
			}
		}
		return false;
	}
	
	/**
	 * Return file info
	 *
	 * @param  string  $path  file path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function fileinfo($path) {
		$mime = $this->_mimetype($path);
		$time = $this->_filemtime($path);
		
		if ($time > $this->today) {
			$date = 'Today '.date('H:i', $time);
		} elseif ($time > $this->yesterday) {
			$date = 'Yesterday '.date('H:i', $time);
		} else {
			$date = date($this->options['dateFormat'], $time);
		}
		
		$info = array(
			'name'  => htmlspecialchars($this->_basename($path)),
			'hash'  => $this->encode($path),
			'mime'  => $mime,
			'date'  => $date, 
			'size'  => $mime == 'directory' ? 0 : $this->_filesize($path),
			'read'  => $this->_isReadable($path),
			'write' => $this->_isWritable($path),
			'rm'    => $this->_isRemovable($path),
			);
			
		if ($this->_isLink($path)) {
			if (false === ($link = $this->_readlink($path))) {
				$info['mime']  = 'symlink-broken';
				$info['read']  = false;
				$info['write'] = false;
			} else {
				$info['mime']   = $this->_mimetype($link);
				$info['link']   = $this->encode($link);
				$info['linkTo'] = $this->_abspath($link);
			}
		}
		
		if ($info['read']) {
			if (($dim = $this->_dimensions($path, $info['mime'])) != false) {
				$info['dim'] = $dim;
			}
			
			if (($tmb = $this->_tmbURL($path, $info['mime'])) != false) {
				$info['tmb'] = $tmb;
			}
			
			if ($this->_isResizable($path, $info['mime'])) {
				$info['resize'] = true;
			}
		}
			
		return $info;
		
	}
	
	/**
	 * Encode path into hash
	 *
	 * @param  string  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function encode($path) {
		return $this->id.$this->_encode($path);
	}
	
	/**
	 * Decode path from hash
	 *
	 * @param  string  file hash
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function decode($hash) {
		return $this->_decode(substr($hash, strlen($this->id)));
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
		$s1 = $f1['size'];
		$s2 = $f2['size'];
		
		if ($this->sort <= self::$SORT_SIZE_DIRS_FIRST && $d1 != $d2) {
			return $d1 ? -1 : 1;
		}
		
		if (($this->sort == self::$SORT_KIND_DIRS_FIRST || $this->sort == self::$SORT_KIND) && $m1 != $m2) {
			return strcmp($m1, $m2);
		}
		
		if (($this->sort == self::$SORT_SIZE_DIRS_FIRST || $this->sort == self::$SORT_SIZE) && $s1 != $s2) {
			return $s1 < $s2 ? -1 : 1;
		}
		
		return strcmp($f1['name'], $f2['name']);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function setError($msg)	{
		$this->error = $msg;
		return false;
	}
	

	
	
	/***************************************************************************/
	/*                           abstract methods                              */
	/***************************************************************************/
	
	/**
	 * Prepare object configuration and do any stuffs required before "mount"
	 * Return  object configuration
	 *
	 * @param  array  $opts  object configuration
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _prepare(array $opts);
	
	/**
	 * Any actions after success "mount"
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
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _encode($path);

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _decode($hash);
	
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
	 * Return file URL
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _path2url($path);
	
	/**
	 * Return true if filename is accepted for current storage
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _accepted($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _fileExists($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isFile($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isDir($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isLink($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isReadable($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isWritable($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isRemovable($path);
	
	/**
	 * Return true if file can be resized by current driver
	 *
	 * @param  string  $path  file path
	 * @param  string  $mime  file mime type
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _isResizable($path, $mime);
	
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
	 * Return file mime type
	 *
	 * @param  string $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _mimetype($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _readlink($path);
	
	/**
	 * Return file thumnbnail URL or true if thumnbnail can be created
	 *
	 * @param  string  $path  thumnbnail path
	 * @return string|bool
	 * @author Dmitry (dio) Levashov
	 **/
	abstract protected function _tmbURL($path, $mime);
	
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
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _scandir($path);

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _tree($path, $level);
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _mkdir($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _touch($path);
	
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
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _fopen($path, $mode);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _fclose($path);
	
	

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _copy($from, $to);
	
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
	 * Return file thumnbnail path
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	// abstract protected function _tmbPath($path);
	
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	// abstract protected function _tmb($path, $tmb);
	
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