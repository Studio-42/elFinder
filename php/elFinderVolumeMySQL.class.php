<?php

/**
 * Simple elFinder driver for MySQL.
 *
 * @author Dmitry (dio) Levashov
 **/
class elFinderVolumeMySQL extends elFinderVolumeDriver {
	
	/**
	 * Driver id
	 * Must be started from letter and contains [a-z0-9]
	 * Used as part of volume id
	 *
	 * @var string
	 **/
	protected $driverId = 'm';
	
	/**
	 * Database object
	 *
	 * @var mysqli
	 **/
	protected $db = null;
	
	/**
	 * Tables to store files
	 *
	 * @var string
	 **/
	protected $tbf = '';
	
	/**
	 * Directory for tmp files
	 * If not set driver will try to use tmbDir as tmpDir
	 *
	 * @var string
	 **/
	protected $tmpPath = '';
	
	/**
	 * Numbers of sql requests (for debug)
	 *
	 * @var int
	 **/
	protected $sqlCnt = 0;
	
	/**
	 * Last db error message
	 *
	 * @var string
	 **/
	protected $dbError = '';
	
	/**
	 * Constructor
	 * Extend options with required fields
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function __construct() {
		$opts = array(
			'host'          => 'localhost',
			'user'          => '',
			'pass'          => '',
			'db'            => '',
			'port'          => null,
			'socket'        => null,
			'files_table'   => 'elfinder_file',
			'tmbPath'       => '',
			'tmpPath'       => ''
		);
		$this->options = array_merge($this->options, $opts);
		$this->options['mimeDetect'] = 'internal';
	}
	
	/*********************************************************************/
	/*                        INIT AND CONFIGURE                         */
	/*********************************************************************/
	
	/**
	 * Prepare driver before mount volume.
	 * Connect to db, check required tables and fetch root path
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function init() {
		
		if (!$this->options['host'] 
		||  !$this->options['user'] 
		||  !$this->options['pass'] 
		||  !$this->options['db']
		||  !$this->options['path']
		||  !$this->options['files_table']) {
			return false;
		}
		
		
		$this->db = new mysqli($this->options['host'], $this->options['user'], $this->options['pass'], $this->options['db'], $this->options['port'], $this->options['socket']);
		if ($this->db->connect_error || @mysqli_connect_error()) {
			return false;
		}
		
		$this->db->set_charset('utf8');

		if ($res = $this->db->query('SHOW TABLES')) {
			while ($row = $res->fetch_array()) {
				if ($row[0] == $this->options['files_table']) {
					$this->tbf = $this->options['files_table'];
					break;
				}
			}
		}

		if (!$this->tbf) {
			return false;
		}

		$this->updateCache($this->options['path'], $this->_stat($this->options['path']));
		
		// $this->options['alias'] = '';
		
		return true;
	}



	/**
	 * Set tmp path
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function configure() {
		parent::configure();
		$tmp = $this->options['tmpPath'];
		if ($tmp) {
			if (!file_exists($tmp)) {
				if (@mkdir($tmp)) {
					@chmod($tmp, $this->options['tmbPathMode']);
				}
			}
			$this->tmpPath = is_dir($tmp) && is_writable($tmp);
		}
		
		if (!$this->tmpPath && $this->tmbPath && $this->tmbPathWritable) {
			$this->tmpPath = $this->tmbPath;
		}
		
		$this->mimeDetect = 'internal';
	}
	
	/**
	 * Close connection
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function umount() {
		$this->db->close();
	}
	
	/**
	 * Return debug info for client
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function debug() {
		$debug = parent::debug();
		$debug['sqlCount'] = $this->sqlCnt;
		if ($this->dbError) {
			$debug['dbError'] = $this->dbError;
		}
		return $debug;
	}

	/**
	 * Perform sql query and return result.
	 * Increase sqlCnt and save error if occured
	 *
	 * @param  string  $sql  query
	 * @return misc
	 * @author Dmitry (dio) Levashov
	 **/
	protected function query($sql) {
		$this->sqlCnt++;
		$res = $this->db->query($sql);
		if (!$res) {
			$this->dbError = $this->db->error;
		}
		return $res;
	}

	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/
	
	/**
	 * Cache dir contents
	 *
	 * @param  string  $path  dir path
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function cacheDir($path) {
		$this->dirsCache[$path] = array();

		$sql = 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime AS ts, f.mime, f.read, f.write, f.locked, f.hidden, f.width, f.height, ch.id AS dirs 
				FROM '.$this->tbf.' AS f 
				LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id AND ch.mime="directory"
				WHERE f.parent_id="'.$path.'"
				GROUP BY f.id';
				
		$res = $this->query($sql);
		if ($res) {
			while ($row = $res->fetch_assoc()) {
				$id = $row['id'];
				if ($row['parent_id']) {
					$row['phash'] = $this->encode($row['parent_id']);
				}
				unset($row['id']);
				unset($row['parent_id']);
				if (($stat = $this->updateCache($id, $row)) && empty($stat['hidden'])) {
					$this->dirsCache[$path][] = $id;
				}
			}
		}
	}

	/**
	 * Return array of parents paths (ids)
	 *
	 * @param  int   $path  file path (id)
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function getParents($path) {
		$parents = array();

		while ($path) {
			if ($file = $this->stat($path)) {
				array_unshift($parents, $path);
				$path = $file['phash'] ? $this->decode($file['phash']) : false;
			}
		}
		
		if (count($parents)) {
			array_pop($parents);
		}
		return $parents;
	}

	/*********************** paths/urls *************************/
	
	/**
	 * Return parent directory path
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _dirname($path) {
		return ($stat = $this->stat($path)) ? ($stat['phash'] ? $this->decode($stat['phash']) : $this->root) : false;
	}

	/**
	 * Return file name
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _basename($path) {
		return ($stat = $this->stat($path)) ? $stat['name'] : false;
	}

	/**
	 * Join dir name and file name and return full path
	 *
	 * @param  string  $dir
	 * @param  string  $name
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _joinPath($dir, $name) {
		$sql = 'SELECT id FROM '.$this->tbf.' WHERE parent_id="'.$dir.'" AND name="'.$this->db->real_escape_string($name).'"';
		if (($res = $this->query($sql)) && ($r = $res->fetch_assoc())) {
			$this->updateCache($r['id'], $this->_stat($r['id']));
			return $r['id'];
		}
		return -1;
	}
	
	/**
	 * Return normalized path, this works the same as os.path.normpath() in Python
	 *
	 * @param  string  $path  path
	 * @return string
	 * @author Troex Nevelin
	 **/
	protected function _normpath($path) {
		return $path;
	}
	
	/**
	 * Return file path related to root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _relpath($path) {
		return $path;
	}
	
	/**
	 * Convert path related to root dir into real path
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _abspath($path) {
		return $path;
	}
	
	/**
	 * Return fake path started from root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _path($path) {
		if (($file = $this->stat($path)) == false) {
			return '';
		}
		
		$parentsIds = $this->getParents($path);
		$path = '';
		foreach ($parentsIds as $id) {
			$dir = $this->stat($id);
			$path .= $dir['name'].$this->separator;
		}
		return $path.$file['name'];
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
		return $path == $parent
			? true
			: in_array($parent, $this->getParents($path));
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
		$sql = 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime AS ts, f.mime, f.read, f.write, f.locked, f.hidden, f.width, f.height, IF(ch.id, 1, 0) AS dirs
				FROM '.$this->tbf.' AS f 
				LEFT JOIN '.$this->tbf.' AS p ON p.id=f.parent_id
				LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id AND ch.mime="directory"
				WHERE f.id="'.$path.'"
				GROUP BY f.id';

		$res = $this->query($sql);
		
		if ($res) {
			$stat = $res->fetch_assoc();
			if ($stat['parent_id']) {
				$stat['phash'] = $this->encode($stat['parent_id']);
			}
			unset($stat['id']);
			unset($stat['parent_id']);
			return $stat;
			
		}
		return array();
	}
	
	/**
	 * Return true if path is dir and has at least one childs directory
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _subdirs($path) {
		return ($stat = $this->stat($path)) ? $stat['dirs'] : false;
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
		return ($stat = $this->stat($path)) && $stat['width'] && $stat['height'] ? $stat['width'].'x'.$stat['height'] : '';
	}
	
	/******************** file/dir content *********************/
		
	/**
	 * Return files list in directory.
	 *
	 * @param  string  $path  dir path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _scandir($path) {
		return isset($this->dirsCache[$path])
			? $this->dirsCache[$path]
			: $this->cacheDir($path);
	}
		
	/**
	 * Open file and return file pointer
	 *
	 * @param  string  $path  file path
	 * @param  bool    $write open file for writing
	 * @return resource|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fopen($path, $mode='rb') {
		
		if ($this->tmp) {
			$local = $this->tmp.DIRECTORY_SEPARATOR.md5($path);

			if (ftp_get($this->connect, $local, $path, FTP_BINARY)) {
				return @fopen($local, $mode);
			}
		}
		
		return false;
	}
	
	/**
	 * Close opened file
	 *
	 * @param  resource  $fp  file pointer
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fclose($fp, $path='') {
		@fclose($fp);
		if ($path) {
			@unlink($this->tmp.DIRECTORY_SEPARATOR.md5($path));
		}
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
		if (($path = ftp_mkdir($this->connect, $path.'/'.$name)) == false) {
			return false;
		} 
		
		$this->options['dirMode'] && @ftp_chmod($this->connect, $this->options['dirMode'], $path);
		return $path;
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
		if ($this->tmp) {
			$path = $path.'/'.$name;
			$local = $this->tmp.DIRECTORY_SEPARATOR.md5($path);
			$res = touch($local) && ftp_put($this->connect, $path, $local, FTP_ASCII);
			@unlink($local);
			return $res ? $path : false;
		}
		return false;
	}
	
	/**
	 * Create symlink. FTP driver does not support symlinks.
	 *
	 * @param  string  $target  link target
	 * @param  string  $path    symlink path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _symlink($target, $path, $name) {
		return false;
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
		$res = false;
		
		if ($this->tmp) {
			$local  = $this->tmp.DIRECTORY_SEPARATOR.md5($source);
			$target = $targetDir.DIRECTORY_SEPARATOR.$name;

			if (ftp_get($this->connect, $local, $source, FTP_BINARY)
			&& ftp_put($this->connect, $target, $local, $this->ftpMode($target))) {
				$res = $target;
			}
			@unlink($local);
		}
		
		return $res;
	}
	
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
	protected function _move($source, $targetDir, $name) {
		$target = $targetDir.DIRECTORY_SEPARATOR.$name;
		return ftp_rename($this->connect, $source, $target) ? $target : false;
	}
		
	/**
	 * Remove file
	 *
	 * @param  string  $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _unlink($path) {
		return ftp_delete($this->connect, $path);
	}

	/**
	 * Remove dir
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _rmdir($path) {
		return ftp_rmdir($this->connect, $path);
	}
	
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
	protected function _save($fp, $dir, $name, $mime, $w, $h) {
		$path = $dir.'/'.$name;
		return ftp_fput($this->connect, $path, $fp, $this->ftpMode($path))
			? $path
			: false;
	}
	
	/**
	 * Get file contents
	 *
	 * @param  string  $path  file path
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _getContents($path) {
		$contents = '';
		if (($fp = $this->_fopen($path))) {
			while (!feof($fp)) {
			  $contents .= fread($fp, 8192);
			}
			$this->_fclose($fp, $path);
			return $contents;
		}
		return false;
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
		$res = false;

		if ($this->tmp) {
			$local = $this->tmp.DIRECTORY_SEPARATOR.md5($path).'.txt';
			
			if (@file_put_contents($local, $content, LOCK_EX) !== false
			&& ($fp = @fopen($local, 'rb'))) {
				clearstatcache();
				$res  = ftp_fput($this->connect, $path, $fp, $this->ftpMode($path));
				@fclose($fp);
			}
			file_exists($local) && @unlink($local);
		}

		return $res;
	}

	/**
	 * Detect available archivers
	 *
	 * @return void
	 **/
	protected function _checkArchivers() {
		// die('Not yet implemented. (_checkArchivers)');
		return array();
	}

	/**
	 * Unpack archive
	 *
	 * @param  string  $path  archive path
	 * @param  array   $arc   archiver command and arguments (same as in $this->archivers)
	 * @return true
	 * @return void
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	protected function _unpack($path, $arc) {
		die('Not yet implemented. (_unpack)');
		return false;
	}

	/**
	 * Recursive symlinks search
	 *
	 * @param  string  $path  file/dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _findSymlinks($path) {
		die('Not yet implemented. (_findSymlinks)');
		if (is_link($path)) {
			return true;
		}
		if (is_dir($path)) {
			foreach (scandir($path) as $name) {
				if ($name != '.' && $name != '..') {
					$p = $path.DIRECTORY_SEPARATOR.$name;
					if (is_link($p)) {
						return true;
					}
					if (is_dir($p) && $this->_findSymlinks($p)) {
						return true;
					} elseif (is_file($p)) {
						$this->archiveSize += filesize($p);
					}
				}
			}
		} else {
			$this->archiveSize += filesize($path);
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
		die('Not yet implemented. (_extract)');
		
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
		die('Not yet implemented. (_archive)');
		return false;
	}
	
} // END class 

/*************************************************************************/

/**
 * Simple elFinder driver for MySQL.
 *
 * @author Dmitry (dio) Levashov
 **/
class _elFinderVolumeMySQL extends elFinderVolumeDriver {
	
	/**
	 * Driver id
	 * Must be started from letter and contains [a-z0-9]
	 * Used as part of volume id
	 *
	 * @var string
	 **/
	protected $driverId = 'm';
	
	/**
	 * Database object
	 *
	 * @var mysqli
	 **/
	protected $db = null;
	
	/**
	 * Tables to store files
	 *
	 * @var string
	 **/
	protected $tbf = '';
	
	/**
	 * Function or object and method to test files permissions
	 *
	 * @var string|array
	 **/
	protected $accessControl = null;
	
	/**
	 * Directory for tmp files
	 * If not set driver will try to use tmbDir as tmpDir
	 *
	 * @var string
	 **/
	protected $tmpPath = '';
	
	/**
	 * Files info cache
	 *
	 * @var array
	 **/
	protected $cache = array();
	
	/**
	 * Numbers of sql requests (for debug)
	 *
	 * @var int
	 **/
	protected $sqlCnt = 0;
	
	/**
	 * Last db error message
	 *
	 * @var string
	 **/
	protected $dbError = '';
	
	/**
	 * Constructor
	 * Extend options with required fields
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function __construct() {
		$opts = array(
			'host'          => 'localhost',
			'user'          => '',
			'pass'          => '',
			'db'            => '',
			'port'          => null,
			'socket'        => null,
			'files_table'   => 'elfinder_file',
			'tmbPath'       => '',
			'tmpPath'       => ''
		);
		$this->options = array_merge($this->options, $opts); 
	}
	
	/*********************************************************************/
	/*                        INIT AND CONFIGURE                         */
	/*********************************************************************/
	
	/**
	 * Prepare driver before mount volume.
	 * Connect to db, check required tables and fetch root path
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function init() {
	
		if (!$this->options['host'] 
		||  !$this->options['user'] 
		||  !$this->options['pass'] 
		||  !$this->options['db']
		||  !$this->options['path']) {
			return false;
		}
		
		$this->db = new mysqli($this->options['host'], $this->options['user'], $this->options['pass'], $this->options['db'], $this->options['port'], $this->options['socket']);
		if ($this->db->connect_error || @mysqli_connect_error()) {
			return false;
		}
		
		$this->db->set_charset('utf8');

		if ($res = $this->db->query('SHOW TABLES')) {
			while ($row = $res->fetch_array()) {
				if ($row[0] == $this->options['files_table']) {
					$this->tbf = $this->options['files_table'];
					break;
				}
			}
		}

		if (!$this->tbf) {
			return false;
		}

		$this->options['alias'] = '';

		return true;
	}
	
	/**
	 * Set tmp path
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function configure() {
		parent::configure();
		$tmp = $this->options['tmpPath'];
		if ($tmp) {
			if (!file_exists($tmp)) {
				if (@mkdir($tmp)) {
					@chmod($tmp, $this->options['tmbPathMode']);
				}
			}
			$this->tmpPath = is_dir($tmp) && is_writable($tmp);
		}
		
		if (!$this->tmpPath && $this->tmbPath && $this->tmbPathWritable) {
			$this->tmpPath = $this->tmbPath;
		}
		
		$this->mimeDetect = 'internal';
	}
	
	/**
	 * Close connection
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function umount() {
		$this->db->close();
	}
	
	/**
	 * Return debug info for client
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function debug() {
		$debug = parent::debug();
		$debug['sqlCount'] = $this->sqlCnt;
		if ($this->dbError) {
			$debug['dbError'] = $this->dbError;
		}
		return $debug;
	}
	
	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/
		
	/**
	 * Perform sql query and return result.
	 * Increase sqlCnt and save error if occured
	 *
	 * @param  string  $sql  query
	 * @return misc
	 * @author Dmitry (dio) Levashov
	 **/
	protected function query($sql) {
		$this->sqlCnt++;
		$res = $this->db->query($sql);
		if (!$res) {
			$this->dbError = $this->db->error;
		}
		return $res;
	}
	
	/**
	 * Fetch one file info from db
	 *
	 * @param  int  $id  file id
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	// protected function fetch($id) {
	// 	$sql = 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime, f.mime, f.width, f.height, ch.id AS dirs
	// 			FROM '.$this->tbf.' AS f 
	// 			LEFT JOIN '.$this->tbf.' AS p ON p.id=f.parent_id
	// 			LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id AND ch.mime="directory"
	// 			WHERE f.id="'.$id.'"
	// 			GROUP BY f.id';
	// 			
	// 	$res = $this->query($sql);
	// 	return $res ? $res->fetch_assoc() : false;
	// }
	
	/**
	 * Fetch childs files for required directory
	 *
	 * @param  int  $id  directory id
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	// protected function fetchChilds($id) {
	// 	$sql = 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime, f.mime, f.width, f.height, ch.id AS dirs 
	// 			FROM '.$this->tbf.' AS f 
	// 			LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id AND ch.mime="directory"
	// 			WHERE f.parent_id="'.$id.'"
	// 			GROUP BY f.id';
	// 			
	// 	$res = $this->query($sql);
	// 	if ($res) {
	// 		$result = array();
	// 		while ($row = $res->fetch_assoc()) {
	// 			$result[] = $row;
	// 		}
	// 		return $result;
	// 	}
	// 	return false;
	// }
	
	/**
	 * Update cache with file info
	 *
	 * @param  array  $data  file info from db
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	// protected function updateCache($data) {
	// 
	// 	if (!is_array($data) || empty($data['id'])) {
	// 		return false;
	// 	}
	// 	
	// 	$id   = $data['id'];
	// 	$mime = $data['mime'];
	// 	$file = array(
	// 		'id'        => $data['id'],
	// 		'parent_id' => $data['parent_id'], 
	// 		'hash'      => $this->encode($data['id']),
	// 		'phash'     => $data['parent_id'] ? $this->encode($data['parent_id']) : '',
	// 		'name'      => $data['name'],
	// 		'mime'      => $mime,
	// 		'size'      => $data['size'],
	// 		'ts'        => $data['mtime'],
	// 		'date'      => $this->formatDate($data['mtime'])
	// 	);
	// 	
	// 	if (!$data['parent_id']) {
	// 		$file['volumeid'] = $this->id;
	// 	} 
	// 	
	// 	if ($mime == 'directory') {
	// 		if ($data['dirs']) {
	// 			$file['dirs'] = 1;
	// 		}
	// 		
	// 	} else {
	// 		if ($data['width'] && $data['height']) {
	// 			$file['dim'] = $data['width'].'x'.$data['height'];
	// 		}
	// 		if (($tmb = $this->gettmb($id)) != false) {
	// 			$file['tmb'] = $tmb;
	// 		} elseif ($this->canCreateTmb($id, $mime)) {
	// 			$file['tmb'] = 1;
	// 		}
	// 	}
	// 	
	// 	// required to attr() use _relpath() for regexp rules
	// 	$this->cache[$id] = $file;
	// 	
	// 	$file['read']  = $this->attr($id, 'read');
	// 	$file['write'] = $this->attr($id, 'write');
	// 	if ($this->attr($id, 'locked')) {
	// 		$file['locked'] = 1;
	// 	}
	// 	if ($this->attr($id, 'hidden')) {
	// 		$file['hidden'] = 1;
	// 	}
	// 	
	// 	$this->cache[$id] = $file;
	// 	return true;
	// }
	
	/**
	 * Return file info from cache.
	 * If there is no info in cache - load it
	 *
	 * @param  string  $path  file cache
	 * @param  bool    $raw  return stat with additional fields
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	// protected function stat($path, $raw=false) {
	// 	if (!isset($this->cache[$path])) {
	// 		if (!$this->updateCache($this->fetch($path))) {
	// 			$this->cache[$path] = false;
	// 		}
	// 	}
	// 	
	// 	$file = $this->cache[$path];
	// 	
	// 	if (empty($file)) {
	// 		return false;
	// 	}
	// 	
	// 	if (!$raw) {
	// 		unset($file['id']);
	// 		unset($file['parent_id']);
	// 	}
	// 	
	// 	return $file;
	// }

	/**
	 * Reset files info cache
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	// protected function clearstat() {
	// 	$this->cache = array();
	// 	$this->paths = array();
	// }
	
	/**
	 * Return array of parents id if all parents readable and not hidden
	 *
	 * @param  int   $id  file id
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function getParents($id) {
		$parents = array();

		while ($id > 0) {
			$file = $this->stat($id, true);
			if (!$file) {
				return array();
			}
			$id = $file['parent_id'];
			if ($id > 0) {
				if (!$this->attr($id, 'read') || $this->attr($id, 'hidden')) {
					return array();
				}
				array_unshift($parents, $id);
				
			}
		}
		return $parents;
	}
	
	/**
	 * Return file mimetype
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mimetype($path) {
		return ($file = $this->stat($path)) ? $file['mime'] : 'unknown';
	}
	
	/**
	 * Return temporary file path for required file
	 *
	 * @param  string  $path   file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function tmpname($path) {
		return $this->tmpPath.DIRECTORY_SEPARATOR.md5($path);
	}
	
	/**
	 * Create empty object with required mimetype
	 *
	 * @param  string  $path  parent dir path
	 * @param  string  $name  object name
	 * @param  string  $mime  mime type
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function make($path, $name, $mime) {
		if ($this->_isDir($path)) {
			$this->clearstat();

			$sql = 'INSERT INTO %s (parent_id, name, size, mtime, mime) VALUES ("%s", "%s", 0, %d, "%s")';
			$sql = sprintf($sql, $this->tbf, $path, $this->db->real_escape_string($name), time(), $mime);
			return $this->query($sql) && $this->db->affected_rows > 0;
		}
		return false;
	}
	
	/*********************** paths/urls *************************/
	
	/**
	 * Return parent directory path
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _dirname($path) {
		return ($file = $this->stat($path, true)) ? $file['parent_id'] : false;
	}

	/**
	 * Find in given dir child with required name and return it's id.
	 * If child not exists - return -1
	 *
	 * @param  int  $dir
	 * @param  string  $name
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _joinPath($dir, $name) {
		
		$sql = 'SELECT id FROM '.$this->tbf.' WHERE parent_id="'.$dir.'" AND name="'.$this->db->real_escape_string($name).'"';
		if (($res = $this->query($sql)) && ($r = $res->fetch_assoc())) {
			return $r['id'];
		}
		return -1;
	}
	
	/**
	 * Return file name
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _basename($path) {
		return ($file = $this->stat($path)) ? $file['name'] : '';
	}

	/**
	 * Return path without changes
	 *
	 * @param  string  $path  path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _normpath($path) {
		return $path;
	}

	/**
	 * Return path (id) without changes
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _relpath($path) {
		return $path;
	}
	
	/**
	 * Return path (id) without changes
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _abspath($path) {
		return $path;
	}
	
	/**
	 * Return fake path started from root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _path($path) {
		if (($file = $this->stat($path)) == false) {
			return '';
		}
		
		$parentsIds = $this->getParents($path);
		$path = '';
		foreach ($parentsIds as $id) {
			$dir = $this->stat($id);
			$path .= $dir['name'].$this->separator;
		}
		return $path.$file['name'];
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
		return $path == $parent
			? true
			: in_array($parent, $this->getParents($path));
	}
	
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
		$stat = array();

		if (!file_exists($path)) {
			return $stat;
		}

		if ($path != $this->root && is_link($path)) {
			if (($target = $this->readlink($path)) == false 
			|| $target == $path) {
				$stat['mime']  = 'symlink-broken';
				$stat['read']  = false;
				$stat['write'] = false;
				$stat['size']  = 0;
				return $stat;
			}
			$stat['alias']  = $this->_path($target);
			$stat['target'] = $target;
			$path  = $target;
			$lstat = lstat($path);
			$size  = $lstat['size'];
		} else {
			$size = @filesize($path);
		}
		
		$dir = is_dir($path);
		
		$stat['mime']  = $dir ? 'directory' : $this->mimetype($path);
		$stat['ts']    = filemtime($path);
		$stat['read']  = is_readable($path);
		$stat['write'] = is_writable($path);
		if ($stat['read']) {
			$stat['size'] = $dir ? 0 : $size;
		}
		
		return $stat;
	}
	
	
	/*********************** check type *************************/
		
	/**
	 * Return true if file exists
	 *
	 * @param  string $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fileExists($path) {
		return !!$this->stat($path);
	}
	
	/**
	 * Return true if path is a directory
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isDir($path) {
		return ($file = $this->stat($path)) ? $file['mime'] == 'directory' : false;
	}
	
	/**
	 * Return true if path is a file
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isFile($path) {
		return ($file = $this->stat($path)) ? $file['mime'] != 'directory' : false;
	}
	
	/**
	 * Return false, this driver does not support symlinks
	 *
	 * @param  string  file path
	 * @return false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isLink($path) {
		return false;
	}
	
	/***************** file attributes ********************/
	
	/**
	 * Return true if path is readable
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isReadable($path) {
		return true;
	}
	
	/**
	 * Return true if path is writable
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isWritable($path) {
		return true;
	}
	
	/**
	 * Return true if path is locked
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isLocked($path) {
		return false;
	}
	
	/**
	 * Return true if path is hidden
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isHidden($path) {
		return false;
	}
	
	/***************** file stat ********************/
	
	/**
	 * Return file size
	 *
	 * @param  string $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _filesize($path) {
		return ($file = $this->stat($path)) ? $file['size'] : false;
	}
	
	/**
	 * Return file modification time
	 *
	 * @param  string $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _filemtime($path) { 
		return ($file = $this->stat($path)) ? $file['mtime'] : false;
	}
	
	/**
	 * Return true if path is dir and has at least one childs directory
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _subdirs($path) {
		return ($file = $this->stat($path)) ? $file['dirs'] : false;
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
	protected function _dimensions($path, $mime) { 
		return ($file = $this->stat($path)) ? $file['dim'] : false;
	}
	
	/**
	 * Return false, this driver does not support symlinks
	 *
	 * @param  string  $path  link path
	 * @return false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _lstat($path) { 
		return false;
	}
	
	/******************** file/dir content *********************/
	
	/**
	 * Return false, this driver does not support symlinks
	 *
	 * @param  string  $path  link path
	 * @return false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _readlink($path) {
		return false;
	}
	
	/**
	 * Return files list in directory
	 *
	 * @param  string  $path  dir path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _scandir($id) {
		$files = array();
		
		$raw = $this->fetchChilds($id);

		if (is_array($raw)) {
			foreach ($raw as $data) {
				$id = $data['id'];
				$this->updateCache($data);
				if ($this->stat($id)) {
					$files[] = $id;
				}
			}
		}
		return $files;
	}

	/**
	 * Copy file into tmp dir, open it and return file pointer
	 *
	 * @param  string  $path  file path
	 * @param  string  $mode  open file mode (ignored in this driver)
	 * @return resource|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fopen($path, $mode='rb') {
		
		$fp = $this->tmbPathWritable
			? @fopen($this->tmpname($path), 'w+')
			: tmpfile();
		
		
		if ($fp) {
			if (($res = $this->query('SELECT content FROM '.$this->tbf.' WHERE id="'.$path.'"'))
			&& ($r = $res->fetch_assoc())) {
				fwrite($fp, $r['content']);
				rewind($fp);
				return $fp;
			} else {
				$this->_fclose($fp, $path);
			}
		}
		
		return false;
	}
	
	/**
	 * Close opened file and remove it from tmp dir
	 *
	 * @param  resource  $fp    file pointer
	 * @param  string    $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fclose($fp, $path='') {
		@fclose($fp);
		if ($path) {
			$path = $this->tmpPath.DIRECTORY_SEPARATOR.md5($path);
			is_file($path) && @unlink($path);
		}
	}
	
	/********************  file/dir manipulations *************************/
	
	/**
	 * Create dir
	 *
	 * @param  string  $path  parent dir path
	 * @param  string  $name  new directory name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _mkdir($path, $name) {
		return $this->make($path, $name, 'directory');
	}
	
	/**
	 * Create file
	 *
	 * @param  string  $path  parent dir path
	 * @param  string  $name  new file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _mkfile($path, $name) {
		return $this->make($path, $name, 'text/plain');
	}
		
	/**
	 * Driver does not support symlinks - return false
	 *
	 * @param  string  $target  link target
	 * @param  string  $path    symlink path
	 * @return false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _symlink($target, $path, $name='') {
		return false;
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
	protected function _copy($source, $target, $name='') {
		$this->clearstat();
		$name = empty($name) ? $this->_basename($source) : $name;
		$id   = $this->_joinPath($target, $name);

		$sql = $id > 0
			? sprintf('REPLACE INTO %s (id, parent_id, name, content, size, mtime, mime, width, height) (SELECT %d, %d, name, content, size, mtime, mime, width, height FROM %s WHERE id=%d)', $this->tbf, $id, $this->_dirname($id), $this->tbf, $source)
			: sprintf('INSERT INTO %s (parent_id, name, content, size, mtime, mime, width, height) SELECT %d, "%s", content, size, %d, mime, width, height FROM %s WHERE id=%d', $this->tbf, $target, $this->db->real_escape_string($name), time(), $this->tbf, $source);
		
		$this->clearstat();
		return $this->query($sql);
	}
	
	/**
	 * Move file into another parent dir
	 *
	 * @param  string  $source  source file path
	 * @param  string  $target  target dir path
	 * @param  string  $name    file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _move($source, $targetDir, $name='') {
		if (!$name) {
			$name = $this->_basename($source);
		}
		
		$this->clearstat();
		$sql = 'UPDATE '.$this->tbf.' SET parent_id="'.$this->_dirname($source).'", name="'.$this->db->real_escape_string($name).'", mtime="'.time().'" WHERE id="'.intval($source).'"';
		
		return $this->query($sql) && $this->db->affected_rows;
	}
	
	/**
	 * Remove file
	 *
	 * @param  string  $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _unlink($path) {
		$this->clearstat();
		$sql = 'DELETE FROM '.$this->tbf.' WHERE id="'.intval($path).'" AND mime!="directory" LIMIT 1';
		return $this->query($sql) && $this->db->affected_rows > 0;
	}

	/**
	 * Remove dir
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _rmdir($path) {
		$this->clearstat();
		$sql = 'SELECT COUNT(f.id) AS num FROM '.$this->tbf.' WHERE parent_id="'.intval($path).'" GROUP BY f.parent_id';
		if ($res = $this->query($sql)) {
			if ($r = $res->fetch_assoc()) {
				if ($r['num'] > 0) {
					return false;
				}
			}
		}
		$sql = 'DELETE FROM '.$this->tbf.' WHERE id="'.intval($path).'" AND mime="directory" LIMIT 1';
		return $this->query($sql) ? $this->db->affected_rows > 0 : false;
	}
	
	/**
	 * Create new file and write into it from file pointer
	 * Return new file path or false on error.
	 *
	 * @param  resource  $fp   file pointer
	 * @param  string    $dir  target dir path
	 * @param  string    $name file name
	 * @return bool|string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _save($fp, $dir, $name, $mime, $w, $h) {
		$this->clearstat();
		
		$id = $this->_joinPath($dir, $name);
		$this->rmTmb($id);

		$tmp = $this->tmpPath.DIRECTORY_SEPARATOR.md5(rand());
		// tmp dir exists so copy file on it and try LOAD_FILE
		if ($this->tmbPathWritable && ($target = @fopen($tmp, 'wb')) != false) {
			
			while (!feof($fp)) {
				fwrite($target, fread($fp, 8192));
			}
			@fclose($target);
			
			$sql = $id > 0
				? 'REPLACE INTO %s (id, parent_id, name, content, size, mtime, mime, width, height) VALUES ('.$id.', %d, "%s", LOAD_FILE("%s"), %d, %d, "%s", %d, %d)'
				: 'INSERT INTO %s (parent_id, name, content, size, mtime, mime, width, height) VALUES (%d, "%s", LOAD_FILE("%s"), %d, %d, "%s", %d, %d)';
			$sql = sprintf($sql, $this->tbf, $dir, $this->db->real_escape_string($name), realpath($tmp), filesize($tmp), time(), $mime, $w, $h);

			$res = $this->query($sql);
			@unlink($tmp);
			
			if ($res) {
				if ($id > 0) {
					return $id;
				} elseif ($this->db->insert_id) {
					return $this->db->insert_id;
				}
			} 
		}

		// tmp dir not exists or LOAD_FILE not allowed - try to load content in variable 0_o
		$stat = fstat($fp);
		$size = $stat['size'];
		$content = '';

		rewind($fp);
		while (!feof($fp)) {
			$content .= fread($fp, 8192);
		}

		$content = $this->db->real_escape_string($content);

		$sql = $id > 0
			? 'REPLACE INTO %s (id, parent_id, name, content, size, mtime, mime, width, height) VALUES ('.$id.', %d, "%s", "%s", %d, %d, "%s", %d, %d)'
			: 'INSERT INTO %s (parent_id, name, content, size, mtime, mime, width, height) VALUES (%d, "%s", "%s", %d, %d, "%s", %d, %d)';
		$sql = sprintf($sql, $this->tbf, $dir, $this->db->real_escape_string($name), $content, $size, time(), $mime, $w, $h);
		
		unset($content);
		
		if ($this->query($sql)) {
			return $id > 0 ? $id : $this->db->insert_id;
		} 

		return false;
	}

	/**
	 * Get file contents
	 *
	 * @param  string  $path  file path
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _getContents($path) {
		$sql = sprintf('SELECT content FROM %s WHERE id=%d', $this->tbf, $path);
		if (($res = $this->query($sql))
		&& ($r = $res->fetch_assoc())) {
			return $r['content'];
		}
		return false;
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
		$this->clearstat();
		$sql = sprintf('UPDATE %s SET content="%s", size=%d, mtime=%d WHERE id=%d', $this->tbf, $this->db->real_escape_string($content), strlen($content), time(), $path);
		return $this->query($sql);
	}
	
	/**
	 * Extract files from archive
	 * NOT available in this driver!
	 *
	 * @param  string  $path file path
	 * @param  array   $arc  archiver options
	 * @return bool
	 * @author Dmitry (dio) Levashov, 
	 * @author Alexey Sukhotin
	 **/
	protected function _extract($path, $arc) {
		return false;
	}

	/**
	 * Create archive and return its path
	 * NOT available in this driver!
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
		return false;
	}

	/**
	 * Detect available archivers
	 * NOT available in this driver!
	 *
	 * @return false
	 * @author Dmitry (dio) Levashov, 
	 * @author Alexey Sukhotin
	 **/
	protected function _checkArchivers() {
		return array();
	}
	
} // END class

?>