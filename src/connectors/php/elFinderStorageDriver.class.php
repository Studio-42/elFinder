<?php
/**
 * Based class for elFinder storages.
 * Realize all storage logic.
 * Create abstraction level under base file sistem operation (like mkdir etc.), 
 * which must be implemented in childs classes 
 *
 * @author Dmitry (dio) Levashov
 * @author Troex Nevelin
 * @author Alexey Sukhotin
 **/
abstract class elFinderStorageDriver {
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
	 * Storage id - used as prefix for files hashes
	 *
	 * @var string
	 **/
	protected $id = '';
	
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
	 * Flag - is storage loaded correctly
	 *
	 * @var bool
	 **/
	protected $available = false;
	
	
	/**
	 * Object configuration
	 *
	 * @var array
	 **/
	protected $options = array(
		'path'         => '',           // root path
		'alias'        => '',           // alias to replace root dir name
		'URL'          => '',           // root url, not set to disable sending URL to client (replacement for old "fileURL" option)
		'startPath'    => '',           // open this path on initial request instead of root path
		'disabled'     => array(),      // list of commands names to disable on this root
		
		
		
		'tmbDir'       => '.tmb',       // directory for thumbnails
		'tmbURL'       => '',           // thumbnails dir URL, set your thumbnails dir is outside root directory
		
		'tmbAtOnce'    => 12,           // number of thumbnails to generate per request
		'tmbSize'      => 48,           // images thumbnails size (px)
		
		'uploadAllow'  => array(),      // mimetypes which allowed to upload
		'uploadDeny'   => array(),      // mimetypes which not allowed to upload
		'uploadOrder'  => 'deny,allow', // order to proccess uploadAllow and uploadAllow options
		'defaults'     => array(        // default permissions 
			'read'  => true,
			'write' => true,
			'rm'    => true
		),
		
		'treeDeep'     => 1,            // how many subdirs levels return
		'dateFormat'   => 'j M Y H:i',  // files dates format
		
		'copyFrom'     => true,
		'copyTo'       => true,
	);
	
	/**
	 * Constuctor
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function __construct($id, array $opts) {
		$this->id = $id;
		$this->options = array_merge($this->options, $opts);
		$root = empty($this->options['path']) ? '' : $this->normpath($this->options['path']);

		// root does not exists
		if (!$root || !$this->_isDir($root)) {
			return;
		}
		
		$readable = $this->_isReadable($root);
		
		// root not readable and writable
		if (!$readable && !$this->_isWritable($root)) {
			return;
		}
		
		$this->options['path'] = $root;
		
		// if root not readable - set all read rules to false
		if (!$readable) {
			$this->options['default']['read'] = false;
			$this->options['startPath'] = '';
			foreach ($this->options['perms'] as $reg => $rules) {
				if (isset($rules['read'])) {
					$this->options['perms'][$reg]['read'] = false;
				}
			}
		}
		
		// check start dir if set 
		if ($this->options['startPath']) {
			$path = $this->normpath($this->options['startPath']);
			
			if (strpos($this->options['path'], $path) === 0 
			&& $this->accepted($path) 
			&& $this->_isDir($path) 
			&& $this->_isReadable($path)) {
				$this->options['startPath'] = $path;
			} else {
				$this->options['startPath'] = '';
			}
		}
		
		// check trailing slash in url
		if ($this->options['URL'] && substr($this->options['URL'], -1, 1) != '/') {
			$this->options['URL'] .= '/';
		}
		
		$this->options['dirname']  = dirname($this->options['path']);
		$this->options['basename'] = !empty($this->options['alias']) ? $this->options['alias'] : basename($this->options['path']);
		
		$this->_configure();
		$this->available = true;
	}
	
	/**
	 * Return true if storage available to work with
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function available() {
		return $this->available;
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
	
	/**
	 * Return debug info
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function debug() {
		return array(
			'root'       => $this->options['basename'],
			'driver'     => 'LocalFileSystem',
			'mimeDetect' => $this->options['mimeDetect'],
			'imgLib'     => $this->options['imgLib']
		);
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
	public function rootHash() {
		return $this->encode($this->options['path']);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function startPathHash() {
		return $this->options['startPath'] ? $this->encode($this->options['startPath']) : false;
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
		
		if ($this->_accepted($path) || !$this->_fileExists($path)) {
			$this->setError('File not found');
		}
		if (!$this->_isDir($path)) {
			return $this->setError('Invalid parameters');
		}
		return $this->_isReadable($path) 
				? $this->_info($path) 
				: $this->setError('Access denied');
	}
	
	/**
	 * Return directory info (same as info() but with additional fields)
	 * Used to get current working directory info
	 *
	 * @param  string  directory hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function dir($hash) {
		$path = $this->decode($hash);
		
		if ($this->_accepted($path) || !$this->_fileExists($path)) {
			$this->setError('File not found');
		}
		
		if (!$this->_isReadable($path)) {
			return $this->setError('Access denied');
		}
		
		if ($this->_isLink($path)) {
			// try to get link target
			if (false === ($path = $this->_readlink($path))) {
				return $this->setError('Broken link');
			}
			if (!$this->_isReadable($path)) {
				return $this->setError('Access denied');
			}
		}
		
		if (!$this->_isDir($path)) {
			return $this->setError('Invalid parameters');
		}
		
		return array_merge($this->info($path), array(
			'phash'  => $path == $this->options['path']) ? false : $this->encode(dirname($path)),
			'url'    => $this->options['URL'] ? $this->path2url($path, true) : '',
			'rel'    => DIRECTORY_SEPARATOR.$this->options['basename'].substr($path, strlen($this->options['path'])),
			'params' => $this->_params()
		));
	}
	
	/***************************************************************************/
	/*                                utilites                                 */
	/***************************************************************************/
	
	
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
	 * Convert file path into url
	 *
	 * @param  string  $path  file path
	 * @param  bool    $isdir is it directory?
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function path2url($path, $isdir=false) {
		if ($path == $this->options['path']) {
			$url = $this->options['URL'];
		} else {
			$dir  = str_replace(DIRECTORY_SEPARATOR, '/', substr(dirname($path), strlen($this->options['path'])+1));
			$url = $this->options['URL'].($dir ? $dir.'/' : '').rawurlencode(basename($path));
			if ($isdir) {
				$url .= '/';
			}
		}
		return $url;
	}
	
	/**
	 * Crypt path and encode to base64
	 *
	 * @param  string  file path
	 * @return string
	 * @author Troex Nevelin
	 **/
	protected function encode($path) {
		// cut ROOT from $path for security reason, even if hacker decodes the path he will not know the root
		$path = substr($path, strlen($this->options['path']));

		// if reqesting root dir $cutRoot will be empty, then assign '/' as we cannot leave it blank for crypt
		if (!$path)	{
			$path = '/';
		}

		// TODO crypt path and return hash
		$hash = $this->crypt($path);

		// hash is used as id in HTML that means it must contain vaild chars
		// make base64 html safe and append prefix in begining
		$hash = $this->id.strtr(base64_encode($hash), '+/=', '-_.');
		$hash = rtrim($hash, '.'); // remove dots '.' at the end, before it was '=' in base64
		return $hash;
	}
	
	/**
	 * Decode path from base64 and decrypt it
	 *
	 * @param  string  file path
	 * @return string
	 * @author Troex Nevelin
	 **/
	protected function decode($hash) {
		// remove prefix
		$hash = substr($hash, strlen($this->id));
		// replace HTML safe base64 to normal
		$hash = base64_decode(strtr($hash, '-_.', '+/='));
		// TODO uncrypt hash and return path
		$path = $this->uncrypt($hash);

		// append ROOT to path after it was cut in _crypt
		return $this->options['path'].($path == '/' ? '' : $path);
	}
		
	/**
	 * Return crypted path 
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
	 *
	 * @param  mixed  hash
	 * @return mixed
	 * @author Dmitry (dio) Levashov
	 **/
	protected function uncrypt($hash) {
		return $hash;
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
	 * Configure such staffs as tmbDir/URL, imgLib etc.
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
	 * Return true if filename of given path is accepted for current storage
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
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _info($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _readlink($path);
	
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
	abstract protected function _scandir($path);

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _tree($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _stat($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _mimetype($path);
	
	

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
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _tmb($path, $tmb);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _resizeImg($path, $w, $h);
	
} // END class 

?>