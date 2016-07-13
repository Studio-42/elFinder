<?php

// Implement similar functionality in PHP 5.2 or 5.3
// http://php.net/manual/class.recursivecallbackfilteriterator.php#110974
if (! class_exists('RecursiveCallbackFilterIterator', false)) {
	class RecursiveCallbackFilterIterator extends RecursiveFilterIterator {
	   
	    public function __construct ( RecursiveIterator $iterator, $callback ) {
	        $this->callback = $callback;
	        parent::__construct($iterator);
	    }
	   
	    public function accept () {
	        return call_user_func($this->callback, parent::current(), parent::key(), parent::getInnerIterator());
	    }
	   
	    public function getChildren () {
	        return new self($this->getInnerIterator()->getChildren(), $this->callback);
	    }
	}
}

/**
 * elFinder driver for local filesystem.
 *
 * @author Dmitry (dio) Levashov
 * @author Troex Nevelin
 **/
class elFinderVolumeLocalFileSystem extends elFinderVolumeDriver {
	
	/**
	 * Driver id
	 * Must be started from letter and contains [a-z0-9]
	 * Used as part of volume id
	 *
	 * @var string
	 **/
	protected $driverId = 'l';
	
	/**
	 * Required to count total archive files size
	 *
	 * @var int
	 **/
	protected $archiveSize = 0;

    /**
     * Constructor
     * Extend options with required fields
     *
     * @author Dmitry (dio) Levashov
     */
	public function __construct() {
		$this->options['alias']    = '';              // alias to replace root dir name
		$this->options['dirMode']  = 0755;            // new dirs mode
		$this->options['fileMode'] = 0644;            // new files mode
		$this->options['quarantine'] = '.quarantine'; // quarantine folder name - required to check archive (must be hidden)
		$this->options['rootCssClass'] = 'elfinder-navbar-root-local';
		$this->options['followSymLinks'] = true;
		$this->options['detectDirIcon'] = '';         // file name that is detected as a folder icon e.g. '.diricon.png'
		$this->options['keepTimestamp'] = array('copy', 'move'); // keep timestamp at inner filesystem allowed 'copy', 'move' and 'upload'
	}
	
	/*********************************************************************/
	/*                        INIT AND CONFIGURE                         */
	/*********************************************************************/
	
	/**
	 * Prepare driver before mount volume.
	 * Return true if volume is ready.
	 *
	 * @return bool
	 **/
	protected function init() {
		// Normalize directory separator for windows
		if (DIRECTORY_SEPARATOR !== '/') {
			foreach(array('path', 'tmbPath', 'tmpPath', 'quarantine') as $key) {
				if (!empty($this->options[$key])) {
					$this->options[$key] = str_replace('/', DIRECTORY_SEPARATOR, $this->options[$key]);
				}
			}
		}
		if (!$cwd = getcwd()) {
			return $this->setError('elFinder LocalVolumeDriver requires a result of getcwd().');
		}
		// detect systemRoot
		if (!isset($this->options['systemRoot'])) {
			if ($cwd[0] === $this->separator || $this->root[0] === $this->separator) {
				$this->systemRoot = $this->separator;
			} else if (preg_match('/^([a-zA-Z]:'.preg_quote($this->separator, '/').')/', $this->root, $m)) {
				$this->systemRoot = $m[1];
			} else if (preg_match('/^([a-zA-Z]:'.preg_quote($this->separator, '/').')/', $cwd, $m)) {
				$this->systemRoot = $m[1];
			}
		}
		$this->root = $this->getFullPath($this->root, $cwd);
		if (!empty($this->options['startPath'])) {
			$this->options['startPath'] = $this->getFullPath($this->options['startPath'], $cwd);
		}
		
		if (is_null($this->options['syncChkAsTs'])) {
			$this->options['syncChkAsTs'] = true;
		}
		if (is_null($this->options['syncCheckFunc'])) {
			$this->options['syncCheckFunc'] = array($this, 'localFileSystemInotify');
		}
		
		return true;
	}
	
	/**
	 * Configure after successfull mount.
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function configure() {
		$root = $this->stat($this->root);
		
		// chek thumbnails path
		if ($this->options['tmbPath']) {
			$this->options['tmbPath'] = strpos($this->options['tmbPath'], DIRECTORY_SEPARATOR) === false
				// tmb path set as dirname under root dir
				? $this->_abspath($this->options['tmbPath'])
				// tmb path as full path
				: $this->_normpath($this->options['tmbPath']);
		}

		parent::configure();
		
		// set $this->tmp by options['tmpPath']
		$this->tmp = '';
		if (!empty($this->options['tmpPath'])) {
			if ((is_dir($this->options['tmpPath']) || mkdir($this->options['tmpPath'], 0755, true)) && is_writable($this->options['tmpPath'])) {
				$this->tmp = $this->options['tmpPath'];
			}
		}
		if (!$this->tmp && ($tmp = elFinder::getStaticVar('commonTempPath'))) {
			$this->tmp = $tmp;
		}
		
		// if no thumbnails url - try detect it
		if ($root['read'] && !$this->tmbURL && $this->URL) {
			if (strpos($this->tmbPath, $this->root) === 0) {
				$this->tmbURL = $this->URL.str_replace(DIRECTORY_SEPARATOR, '/', substr($this->tmbPath, strlen($this->root)+1));
				if (preg_match("|[^/?&=]$|", $this->tmbURL)) {
					$this->tmbURL .= '/';
				}
			}
		}

		// check quarantine dir
		$this->quarantine = '';
		if (!empty($this->options['quarantine'])) {
			if (is_dir($this->options['quarantine'])) {
				if (is_writable($this->options['quarantine'])) {
					$this->quarantine = $this->options['quarantine'];
				}
				$this->options['quarantine'] = '';
			} else {
				$this->quarantine = $this->_abspath($this->options['quarantine']);
				if ((!is_dir($this->quarantine) && !mkdir($this->quarantine)) || !is_writable($this->quarantine)) {
					$this->options['quarantine'] = $this->quarantine = '';
				}
			}
		}
		
		if (!$this->quarantine) {
			if (!$this->tmp) {
				$this->archivers['extract'] = array();
				$this->disabled[] = 'extract';
			} else {
				$this->quarantine = $this->tmp;
			}
		}
		
		if ($this->options['quarantine']) {
			$this->attributes[] = array(
					'pattern' => '~^'.preg_quote(DIRECTORY_SEPARATOR.$this->options['quarantine']).'$~',
					'read'    => false,
					'write'   => false,
					'locked'  => true,
					'hidden'  => true
			);
		}
		
		if (! empty($this->options['keepTimestamp'])) {
			$this->options['keepTimestamp'] = array_flip($this->options['keepTimestamp']);
		}
	}
	
	/**
	 * Long pooling sync checker
	 * This function require server command `inotifywait`
	 * If `inotifywait` need full path, Please add `define('ELFINER_INOTIFYWAIT_PATH', '/PATH_TO/inotifywait');` into connector.php
	 * 
	 * @param string     $path
	 * @param int        $standby
	 * @param number     $compare
	 * @return number|bool
	 */
	public function localFileSystemInotify($path, $standby, $compare) {
		if (isset($this->sessionCache['localFileSystemInotify_disable'])) {
			return false;
		}
		$path = realpath($path);
		$mtime = filemtime($path);
		if (! $mtime) {
			return false;
		}
		if ($mtime != $compare) {
			return $mtime;
		}
		$inotifywait = defined('ELFINER_INOTIFYWAIT_PATH')? ELFINER_INOTIFYWAIT_PATH : 'inotifywait';
		$standby = max(1, intval($standby));
		$cmd = $inotifywait.' '.escapeshellarg($path).' -t '.$standby.' -e moved_to,moved_from,move,close_write,delete,delete_self';
		$this->procExec($cmd , $o, $r);
		if ($r === 0) {
			// changed
			clearstatcache();
			if (file_exists($path)) {
				$mtime = filemtime($path); // error on busy?
				return $mtime? $mtime : time();
			} else {
				// target was removed
				return 0;
			}
		} else if ($r === 2) {
			// not changed (timeout)
			return $compare;
		}
		// error
		// cache to $_SESSION
		$this->sessionCache['localFileSystemInotify_disable'] = true;
		$this->session->set($this->id, $this->sessionCache, true);
		return false;
	}
	
	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/

	/*********************** paths/urls *************************/
	
	/**
	 * Return parent directory path
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _dirname($path) {
		return dirname($path);
	}

	/**
	 * Return file name
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _basename($path) {
		return basename($path);
	}

	/**
	 * Join dir name and file name and retur full path
	 *
	 * @param  string  $dir
	 * @param  string  $name
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _joinPath($dir, $name) {
		return rtrim($dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $name;
	}
	
	/**
	 * Return normalized path, this works the same as os.path.normpath() in Python
	 *
	 * @param  string  $path  path
	 * @return string
	 * @author Troex Nevelin
	 **/
	protected function _normpath($path) {
		if (empty($path)) {
			return '.';
		}
		
		$changeSep = (DIRECTORY_SEPARATOR !== '/');
		if ($changeSep) {
			$drive = '';
			if (preg_match('/^([a-zA-Z]:)(.*)/', $path, $m)) {
				$drive = $m[1];
				$path = $m[2]? $m[2] : '/';
			}
			$path = str_replace(DIRECTORY_SEPARATOR, '/', $path);
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
		
		if ($changeSep) {
			$path = $drive . str_replace('/', DIRECTORY_SEPARATOR, $path);
		}
		
		return $path ? $path : '.';
	}
	
	/**
	 * Return file path related to root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _relpath($path) {
		if ($path === $this->root) {
			return '';
		} else {
			if (strpos($path, $this->root) === 0) {
				return ltrim(substr($path, strlen($this->root)), DIRECTORY_SEPARATOR);
			} else {
				// for link
				return $path;
			}
		}
	}
	
	/**
	 * Convert path related to root dir into real path
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _abspath($path) {
		if ($path === DIRECTORY_SEPARATOR) {
			return $this->root;
		} else {
			if ($path[0] === DIRECTORY_SEPARATOR) {
				// for link
				return $path;
			} else {
				return $this->_joinPath($this->root, $path);
			}
		}
	}
	
	/**
	 * Return fake path started from root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _path($path) {
		return $this->rootName.($path == $this->root ? '' : $this->separator.$this->_relpath($path));
	}
	
	/**
	 * Return true if $path is children of $parent
	 *
	 * @param  string  $path    path to check
	 * @param  string  $parent  parent path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _inpath($path, $parent) {
		$cwd = getcwd();
		$real_path   = $this->getFullPath($path,   $cwd);
		$real_parent = $this->getFullPath($parent, $cwd);
		if ($real_path && $real_parent) {
			return $real_path === $real_parent || strpos($real_path, rtrim($real_parent, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR) === 0;
		}
		return false;
	}
	
	
	
	/***************** file stat ********************/

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
	protected function _stat($path) {
		
		static $statOwner;
		if (is_null($statOwner)) {
			$statOwner = (!empty($this->options['statOwner']));
		}
		
		$stat = array();

		if (!file_exists($path) && !is_link($path)) {
			return $stat;
		}

		//Verifies the given path is the root or is inside the root. Prevents directory traveral.
		if (!$this->_inpath($path, $this->root)) {
			return $stat;
		}

		$gid = $uid = 0;
		$stat['isowner'] = false;
		$linkreadable = false;
		if ($path != $this->root && is_link($path)) {
			if (! $this->options['followSymLinks']) {
				return array();
			}
			if (!($target = $this->readlink($path))
			|| $target == $path) {
				if (is_null($target)) {
					$stat = array();
					return $stat;
				} else {
					$stat['mime']  = 'symlink-broken';
					$target = readlink($path);
					$lstat = lstat($path);
					$ostat = $this->getOwnerStat($lstat['uid'], $lstat['gid']);
					$linkreadable = !empty($ostat['isowner']);
				}
			}
			$stat['alias'] = $this->_path($target);
			$stat['target'] = $target;
		}
		$size = sprintf('%u', filesize($path));
		$stat['ts'] = filemtime($path);
		if ($statOwner) {
			$fstat = stat($path);
			$uid = $fstat['uid'];
			$gid = $fstat['gid'];
			$stat['perm'] = substr((string)decoct($fstat['mode']), -4);
			$stat = array_merge($stat, $this->getOwnerStat($uid, $gid));
		}
		
		if (($dir = is_dir($path)) && $this->options['detectDirIcon']) {
			$favicon = $path . DIRECTORY_SEPARATOR . $this->options['detectDirIcon'];
			if ($this->URL && file_exists($favicon)) {
				$stat['icon'] = $this->URL . str_replace(DIRECTORY_SEPARATOR, '/', substr($favicon, strlen($this->root) + 1));
			}
		}
		
		if (!isset($stat['mime'])) {
			$stat['mime'] = $dir ? 'directory' : $this->mimetype($path);
		}
		//logical rights first
		$stat['read'] = ($linkreadable || is_readable($path))? null : false;
		$stat['write'] = is_writable($path)? null : false;

		if (is_null($stat['read'])) {
			$stat['size'] = $dir ? 0 : $size;
		}
		
		return $stat;
	}
	
	/**
	 * Get stat `owner`, `group` and `isowner` by `uid` and `gid`
	 * Sub-fuction of _stat() and _scandir()
	 * 
	 * @param integer $uid
	 * @param integer $gid
	 * @return array  stat
	 */
	protected function getOwnerStat($uid, $gid) {
		static $names = null;
		static $phpuid = null;
		
		if (is_null($names)) {
			$names = array('uid' => array(), 'gid' =>array());
		}
		if (is_null($phpuid)) {
			if (is_callable('posix_getuid')) {
				$phpuid = posix_getuid();
			} else {
				$phpuid = 0;
			}
		}
		
		$stat = array();
		
		if ($uid) {
			$stat['isowner'] = ($phpuid == $uid);
			if (isset($names['uid'][$uid])) {
				$stat['owner'] = $names['uid'][$uid];
			} else if (is_callable('posix_getpwuid')) {
				$pwuid = posix_getpwuid($uid);
				$stat['owner'] = $names['uid'][$uid] = $pwuid['name'];
			} else {
				$stat['owner'] = $names['uid'][$uid] = $uid;
			}
		}
		if ($gid) {
			if (isset($names['gid'][$gid])) {
				$stat['group'] = $names['gid'][$gid];
			} else if (is_callable('posix_getgrgid')) {
				$grgid = posix_getgrgid($gid);
				$stat['group'] = $names['gid'][$gid] = $grgid['name'];
			} else {
				$stat['group'] = $names['gid'][$gid] = $gid;
			}
		}
		
		return $stat;
	}

	/**
	 * Return true if path is dir and has at least one childs directory
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _subdirs($path) {

		$dirs = false;
		if (is_dir($path)) {
			if (class_exists('FilesystemIterator', false)) {
				$dirItr = new ParentIterator(
					new RecursiveDirectoryIterator($path,
						FilesystemIterator::SKIP_DOTS |
						(defined('RecursiveDirectoryIterator::FOLLOW_SYMLINKS')?
							RecursiveDirectoryIterator::FOLLOW_SYMLINKS : 0)
					)
				);
				$dirItr->rewind();
				if ($dirItr->hasChildren()) {
					$dirs = true;
					$name = $dirItr->getSubPathName();
					while($name) {
						if (!$this->attr($path . DIRECTORY_SEPARATOR . $name, 'read', null, true)) {
							$dirs = false;
							$dirItr->next();
							$name = $dirItr->getSubPathName();
							continue;
						}
						$dirs = true;
						break;
					}
				}
			} else {
				$path = strtr($path, array('['  => '\\[', ']'  => '\\]', '*'  => '\\*', '?'  => '\\?'));
				return (bool)glob(rtrim($path, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . '*', GLOB_ONLYDIR);
			}
		}
		return $dirs;
	}
	
	/**
	 * Return object width and height
	 * Usualy used for images, but can be realize for video etc...
	 *
	 * @param  string  $path  file path
	 * @param  string  $mime  file mime type
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _dimensions($path, $mime) {
		clearstatcache();
		return strpos($mime, 'image') === 0 && ($s = getimagesize($path)) !== false 
			? $s[0].'x'.$s[1] 
			: false;
	}
	/******************** file/dir content *********************/
	
	/**
	 * Return symlink target file
	 *
	 * @param  string  $path  link path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function readlink($path) {
		if (!($target = readlink($path))) {
			return null;
		}

		if (strpos($target, $this->systemRoot) !== 0) {
			$target = $this->_joinPath(dirname($path), $target);
		}

		if (!file_exists($target)) {
			return false;
		}
		
		return $target;
	}
		
	/**
	 * Return files list in directory.
	 *
	 * @param  string  $path  dir path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _scandir($path) {
		$files = array();
		$cache = array();
		$statOwner = (!empty($this->options['statOwner']));
		$dirItr = array();
		$followSymLinks = $this->options['followSymLinks'];
		try {
			$dirItr = new DirectoryIterator($path);
		} catch (UnexpectedValueException $e) {}
		
		foreach ($dirItr as $file) {
			try {
				if ($file->isDot()) { continue; }
				
				$files[] = $fpath = $file->getPathname();
				
				$br = false;
				$stat = array();
				
				$gid = $uid = 0;
				$stat['isowner'] = false;
				$linkreadable = false;
				if ($file->isLink()) {
					if (! $followSymLinks) { continue; }
					if (!($target = $this->readlink($fpath))
					|| $target == $fpath) {
						if (is_null($target)) {
							$stat = array();
							$br = true;
						} else {
							$_path = $fpath;
							$stat['mime']  = 'symlink-broken';
							$target = readlink($_path);
							$lstat = lstat($_path);
							$ostat = $this->getOwnerStat($lstat['uid'], $lstat['gid']);
							$linkreadable = !empty($ostat['isowner']);
							$dir = false;
							$stat['alias'] = $this->_path($target);
							$stat['target'] = $target;
						}
					} else {
						$dir = is_dir($target);
						$stat['alias'] = $this->_path($target);
						$stat['target'] = $target;
						$stat['mime'] = $dir ? 'directory' : $this->mimetype($stat['alias']);
					}
				} else {
					if (($dir = $file->isDir()) && $this->options['detectDirIcon']) {
						$path = $file->getPathname();
						$favicon = $path . DIRECTORY_SEPARATOR . $this->options['detectDirIcon'];
						if ($this->URL && file_exists($favicon)) {
							$stat['icon'] = $this->URL . str_replace(DIRECTORY_SEPARATOR, '/', substr($favicon, strlen($this->root) + 1));
						}
					}
					$stat['mime'] = $dir ? 'directory' : $this->mimetype($fpath);
				}
				$size = sprintf('%u', $file->getSize());
				$stat['ts'] = $file->getMTime();
				if (!$br) {
					if ($statOwner && !$linkreadable) {
						$uid = $file->getOwner();
						$gid = $file->getGroup();
						$stat['perm'] = substr((string)decoct($file->getPerms()), -4);
						$stat = array_merge($stat, $this->getOwnerStat($uid, $gid));
					}
					
					//logical rights first
					$stat['read'] = ($linkreadable || $file->isReadable())? null : false;
					$stat['write'] = $file->isWritable()? null : false;
					
					if (is_null($stat['read'])) {
						$stat['size'] = $dir ? 0 : $size;
					}
					
				}
				
				$cache[] = array($fpath, $stat);
			} catch (RuntimeException $e) {
				continue;
			}
		}
		
		if ($cache) {
			$cache = $this->convEncOut($cache, false);
			foreach($cache as $d) {
				$this->updateCache($d[0], $d[1]);
			}
		}
		
		return $files;
	}

    /**
     * Open file and return file pointer
     *
     * @param  string $path file path
     * @param string $mode
     * @return false|resource
     * @internal param bool $write open file for writing
     * @author Dmitry (dio) Levashov
     */
	protected function _fopen($path, $mode='rb') {
		return fopen($path, $mode);
	}

    /**
     * Close opened file
     *
     * @param  resource $fp file pointer
     * @param string $path
     * @return bool
     * @author Dmitry (dio) Levashov
     */
	protected function _fclose($fp, $path='') {
		return fclose($fp);
	}
	
	/********************  file/dir manipulations *************************/
	
	/**
	 * Create dir and return created dir path or false on failed
	 *
	 * @param  string  $path  parent dir path
	 * @param string  $name  new directory name
	 * @return string|bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _mkdir($path, $name) {
		$path = $this->_joinPath($path, $name);

		if (mkdir($path)) {
			chmod($path, $this->options['dirMode']);
			clearstatcache();
			return $path;
		}

		return false;
	}
	
	/**
	 * Create file and return it's path or false on failed
	 *
	 * @param  string  $path  parent dir path
	 * @param string  $name  new file name
	 * @return string|bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _mkfile($path, $name) {
		$path = $this->_joinPath($path, $name);
		
		if (($fp = fopen($path, 'w'))) {
			fclose($fp);
			chmod($path, $this->options['fileMode']);
			clearstatcache();
			return $path;
		}
		return false;
	}
	
	/**
	 * Create symlink
	 *
	 * @param  string  $source     file to link to
	 * @param  string  $targetDir  folder to create link in
	 * @param  string  $name       symlink name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _symlink($source, $targetDir, $name) {
		return symlink($source, $this->_joinPath($targetDir, $name));
	}
	
	/**
	 * Copy file into another file
	 *
	 * @param  string  $source     source file path
	 * @param  string  $targetDir  target directory path
	 * @param  string  $name       new file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _copy($source, $targetDir, $name) {
		$mtime = filemtime($source);
		$target = $this->_joinPath($targetDir, $name);
		if ($ret = copy($source, $target)) {
			isset($this->options['keepTimestamp']['copy']) && $mtime && touch($target, $mtime);
			clearstatcache();
		}
		return $ret;
	}

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
	protected function _move($source, $targetDir, $name) {
		$mtime = filemtime($source);
		$target = $this->_joinPath($targetDir, $name);
		if ($ret = rename($source, $target) ? $target : false) {
			isset($this->options['keepTimestamp']['move']) && $mtime && touch($target, $mtime);
			clearstatcache();
		}
		return $ret;
	}
		
	/**
	 * Remove file
	 *
	 * @param  string  $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _unlink($path) {
		$ret = unlink($path);
		$ret && clearstatcache();
		return $ret;
	}

	/**
	 * Remove dir
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _rmdir($path) {
		$ret = rmdir($path);
		$ret && clearstatcache();
		return $ret;
	}
	
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
	protected function _save($fp, $dir, $name, $stat) {
		$path = $this->_joinPath($dir, $name);

		$meta = stream_get_meta_data($fp);
		$uri = isset($meta['uri'])? $meta['uri'] : '';
		if ($uri && ! preg_match('#^[a-zA-Z0-9]+://#', $uri)) {
			fclose($fp);
			$mtime = filemtime($uri);
			$isCmdPaste = ($this->ARGS['cmd'] === 'paste');
			$isCmdCopy = ($isCmdPaste && empty($this->ARGS['cut']));
			if (($isCmdCopy || !rename($uri, $path)) && !copy($uri, $path)) {
				return false;
			}
			// keep timestamp on upload
			if ($mtime && $this->ARGS['cmd'] === 'upload' && isset($this->options['keepTimestamp']['upload'])) {
				touch($path, $mtime);
			}
			// re-create the source file for remove processing of paste command
			$isCmdPaste && !$isCmdCopy && touch($uri);
		} else {
			if (file_put_contents($path, $fp, LOCK_EX) === false) {
				return false;
			}
		}
		
		if (is_link($path)) {
			unlink($path);
			return $this->setError(elFinder::ERROR_SAVE, $name);
		}
		
		chmod($path, $this->options['fileMode']);
		clearstatcache();
		return $path;
	}
	
	/**
	 * Get file contents
	 *
	 * @param  string  $path  file path
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _getContents($path) {
		return file_get_contents($path);
	}
	
	/**
	 * Write a string to a file
	 *
	 * @param  string  $path     file path
	 * @param  string  $content  new file content
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _filePutContents($path, $content) {
		if (file_put_contents($path, $content, LOCK_EX) !== false) {
			clearstatcache();
			return true;
		}
		return false;
	}

	/**
	 * Detect available archivers
	 *
	 * @return void
	 **/
	protected function _checkArchivers() {
		$this->archivers = $this->getArchivers();
		return;
	}

    /**
     * chmod availability
     *
     * @param string $path
     * @param string $mode
     * @return bool
     */
	protected function _chmod($path, $mode) {
		$modeOct = is_string($mode) ? octdec($mode) : octdec(sprintf("%04o",$mode));
		$ret = chmod($path, $modeOct);
		$ret && clearstatcache();
		return  $ret;
	}

	/**
	 * Recursive symlinks search
	 *
	 * @param  string  $path  file/dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _findSymlinks($path) {
		if (is_link($path)) {
			return true;
		}
		
		if (is_dir($path)) {
			foreach (self::localScandir($path) as $name) {
				$p = $path.DIRECTORY_SEPARATOR.$name;
				if (is_link($p) || !$this->nameAccepted($name)
					||
				(($mimeByName = elFinderVolumeDriver::mimetypeInternalDetect($name)) && $mimeByName !== 'unknown' && !$this->allowPutMime($mimeByName))) {
					$this->setError(elFinder::ERROR_SAVE, $name);
					return true;
				}
				if (is_dir($p) && $this->_findSymlinks($p)) {
					return true;
				} elseif (is_file($p)) {
					$this->archiveSize += sprintf('%u', filesize($p));
				}
			}
		} else {
			
			$this->archiveSize += sprintf('%u', filesize($path));
		}
		
		return false;
	}

	/**
	 * Extract files from archive
	 *
	 * @param  string  $path  archive path
	 * @param  array   $arc   archiver command and arguments (same as in $this->archivers)
	 * @return true
	 * @author Dmitry (dio) Levashov, 
	 * @author Alexey Sukhotin
	 **/
	protected function _extract($path, $arc) {
		
		if ($this->quarantine) {

			$dir     = $this->quarantine.DIRECTORY_SEPARATOR.md5(basename($path).mt_rand());
			$archive = $dir.DIRECTORY_SEPARATOR.basename($path);
			
			if (!mkdir($dir)) {
				return false;
			}
			
			// insurance unexpected shutdown
			register_shutdown_function(array($this, 'rmdirRecursive'), realpath($dir));
			
			chmod($dir, 0777);
			
			// copy in quarantine
			if (!copy($path, $archive)) {
				return false;
			}
			
			// extract in quarantine
			$this->unpackArchive($archive, $arc);
			
			// get files list
			$ls = self::localScandir($dir);
			
			// no files - extract error ?
			if (empty($ls)) {
				return false;
			}
			
			$this->archiveSize = 0;
			
			// find symlinks
			$symlinks = $this->_findSymlinks($dir);
			
			if ($symlinks) {
				$this->delTree($dir);
				return $this->setError(array_merge($this->error, array(elFinder::ERROR_ARC_SYMLINKS)));
			}

			// check max files size
			if ($this->options['maxArcFilesSize'] > 0 && $this->options['maxArcFilesSize'] < $this->archiveSize) {
				$this->delTree($dir);
				return $this->setError(elFinder::ERROR_ARC_MAXSIZE);
			}
			
			$extractTo = $this->extractToNewdir; // 'auto', ture or false
			
			// archive contains one item - extract in archive dir
			$name = '';
			$src = $dir.DIRECTORY_SEPARATOR.$ls[0];
			if (($extractTo === 'auto' || !$extractTo) && count($ls) === 1 && is_file($src)) {
				$name = $ls[0];
			} else if ($extractTo === 'auto' || $extractTo) {
				// for several files - create new directory
				// create unique name for directory
				$src = $dir;
				$name = basename($path);
				if (preg_match('/\.((tar\.(gz|bz|bz2|z|lzo))|cpio\.gz|ps\.gz|xcf\.(gz|bz2)|[a-z0-9]{1,4})$/i', $name, $m)) {
					$name = substr($name, 0,  strlen($name)-strlen($m[0]));
				}
				$test = dirname($path).DIRECTORY_SEPARATOR.$name;
				if (file_exists($test) || is_link($test)) {
					$name = $this->uniqueName(dirname($path), $name, '-', false);
				}
			}
			
			if ($name !== '') {
				$result  = dirname($path).DIRECTORY_SEPARATOR.$name;

				if (! rename($src, $result)) {
					$this->delTree($dir);
					return false;
				}
			} else {
				$dstDir = dirname($path);
				$res = false;
				$result = array();
				foreach($ls as $name) {
					$target = $dstDir.DIRECTORY_SEPARATOR.$name;
					if (is_dir($target)) {
						$this->delTree($target);
					}
					if (rename($dir.DIRECTORY_SEPARATOR.$name, $target)) {
						$result[] = $target;
					}
				}
				if (!$result) {
					$this->delTree($dir);
					return false;
				}
			}
			
			is_dir($dir) && $this->delTree($dir);
			
			return (is_array($result) || file_exists($result)) ? $result : false;
		}
        //TODO: Add return statement here
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
	 **/
	protected function _archive($dir, $files, $name, $arc) {
		return $this->makeArchive($dir, $files, $name, $arc);
	}
	
	/******************** Over write functions *************************/
	
	/**
	 * File path of local server side work file path
	 *
	 * @param  string $path
	 * @return string
	 * @author Naoki Sawada
	 */
	protected function getWorkFile($path) {
		return $path;
	}

	/**
	 * Delete dirctory trees
	 *
	 * @param string $localpath path need convert encoding to server encoding
	 * @return boolean
	 * @author Naoki Sawada
	 */
	protected function delTree($localpath) {
		return $this->rmdirRecursive($localpath);
	}

	/******************** Over write (Optimized) functions *************************/

	/**
	 * Recursive files search
	 *
	 * @param  string  $path   dir path
	 * @param  string  $q      search string
	 * @param  array   $mimes
	 * @return array
	 * @author Dmitry (dio) Levashov
	 * @author Naoki Sawada
	 **/
	protected function doSearch($path, $q, $mimes) {
		if ($this->encoding || ! class_exists('FilesystemIterator', false)) {
			// non UTF-8 use elFinderVolumeDriver::doSearch()
			return parent::doSearch($path, $q, $mimes);
		}

		$match = array();
		try {
			$iterator = new RecursiveIteratorIterator(
				new RecursiveCallbackFilterIterator(
					new RecursiveDirectoryIterator($path,
						FilesystemIterator::KEY_AS_PATHNAME |
						FilesystemIterator::SKIP_DOTS |
						((defined('RecursiveDirectoryIterator::FOLLOW_SYMLINKS') && $this->options['followSymLinks'])?
							RecursiveDirectoryIterator::FOLLOW_SYMLINKS : 0)
					),
					array($this, 'localFileSystemSearchIteratorFilter')
				),
				RecursiveIteratorIterator::SELF_FIRST,
				RecursiveIteratorIterator::CATCH_GET_CHILD
			);
			foreach ($iterator as $key => $node) {
				if ($node->isDir()) {
					if ($this->stripos($node->getFilename(), $q) !== false) {
						$match[] = $key;
					}
				} else {
					$match[] = $key;
				}
			}
		} catch (Exception $e) {}
		
		$result = array();
		
		if ($match) {
			foreach($match as $p) {
				$stat = $this->stat($p);
		
				if (!$stat) { // invalid links
					continue;
				}
		
				if (!empty($stat['hidden']) || !$this->mimeAccepted($stat['mime'], $mimes)) {
					continue;
				}
					
				$name = $stat['name'];
		
				if ((!$mimes || $stat['mime'] !== 'directory')) {
					$stat['path'] = $this->path($stat['hash']);
					if ($this->URL && !isset($stat['url'])) {
						$path = str_replace(DIRECTORY_SEPARATOR, '/', substr($p, strlen($this->root) + 1));
						$stat['url'] = $this->URL . $path;
					}
		
					$result[] = $stat;
				}
			}
		}
		
		return $result;
	}

    /******************** Original local functions ************************
     * @param $file
     * @param $key
     * @param $iterator
     * @return bool
     */

	public function localFileSystemSearchIteratorFilter($file, $key, $iterator) {
		$name = $file->getFilename();
		if ($this->doSearchCurrentQuery['excludes']) {
			foreach($this->doSearchCurrentQuery['excludes'] as $exclude) {
				if ($this->stripos($name, $exclude) !== false) {
					return false;
				}
			}
		}
		if ($iterator->hasChildren()) {
			if ($this->options['searchExDirReg'] && preg_match($this->options['searchExDirReg'], $key)) {
				return false;
			}
			return (bool)$this->attr($key, 'read', null, true);
		}
		return ($this->stripos($name, $this->doSearchCurrentQuery['q']) === false)? false : true;
	}
	
} // END class 

