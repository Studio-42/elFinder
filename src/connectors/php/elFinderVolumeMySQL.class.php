<?php

/**
 * Simple elFinder driver for MySQL.
 *
 * @author Dmitry (dio) Levashov
 **/
class elFinderVolumeMySQL extends elFinderVolumeDriver {
	
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
	 * Tables to store files attributes
	 *
	 * @var string
	 **/
	protected $tba = '';
	
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
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $cache = array();
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $paths = array();
	
	/**
	 * Numbers of sql requests (for debug)
	 *
	 * @var int
	 **/
	protected $sqlCnt = 0;
	
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
			'attr_table'   => 'elfinder_attribute',
			'user_id'       => 0,
			'accessControl' => null,
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
		
		$this->db = new mysqli($this->options['host'], $this->options['user'], $this->options['pass'], $this->options['db']);
		if ($this->db->connect_error || @mysqli_connect_error()) {
			echo mysqli_error();
			
			return false;
		}
		
		$this->db->query('SET SESSION character_set_client=utf8');
		$this->db->query('SET SESSION character_set_connection=utf8');
		$this->db->query('SET SESSION character_set_results=utf8');
		
		if ($this->options['accessControl']) {
			if (is_string($this->options['accessControl']) 
			&& function_exists($this->options['accessControl'])) {
				$this->accessControl = $this->options['accessControl'];
			} elseif (is_array($this->options['accessControl']) 
			&& class_exists($this->options['accessControl'][0])
			&& method_exists($this->options['accessControl'][0], $this->options['accessControl'][1])) {
				$this->accessControl = $this->options['accessControl'];
			}
		}
		
		$this->tbf = $this->options['files_table'];
		$this->tba = $this->options['attr_table'];
		
		$tables = array();
		if ($res = $this->db->query('SHOW TABLES')) {
			while ($row = $res->fetch_array()) {
				$tables[$row[0]] = 1;
			}
		}

		if (empty($tables[$this->tbf])) {
			return false;
		}
		
		$this->tba = empty($tables[$this->options['attr_table']]) ? '' : $this->options['attr_table'];
		
		$this->uid = (int)$this->options['user_id'];
		
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

		if (!$this->tmpPath) {
			// $this->disabled[] = 'upload';
			// $this->disabled[] = 'paste';
		}
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
		return $debug;
	}
	
	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/
	
	/**
	 * Return file info from cache.
	 * If there is no info in cache - load it
	 *
	 * @param  string  $path  file cache
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function stat($path, $raw=false) {

		$file = isset($this->cache[$path])
			? $this->cache[$path]
			: $this->cache[$path] = $this->getstat($path);
		
		if ($file && !$raw) {
			unset($file['id']);
			unset($file['parent_id']);
		}
		return $file;
	}
	
	/**
	 * Try to fetch file from db and return it
	 *
	 * @param  string  file path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function getstat($path) {
		$this->sqlCnt++;
		$sql = $this->tba
			? 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime, f.mime, f.width, f.height, ch.id AS dirs, 
				a.aread, a.awrite, a.alocked, a.ahidden
				FROM '.$this->tbf.' AS f 
				LEFT JOIN '.$this->tbf.' AS p ON p.id=f.parent_id
				LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id 
				LEFT JOIN '.$this->tba.' AS a ON a.file_id=f.id AND user_id='.$this->uid.'
				WHERE f.id="'.$path.'"
				GROUP BY f.id'
			: 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime, f.mime, f.width, f.height, ch.id AS dirs, 
				"" AS aread, "" AS awrite, "" AS alocked, "" AS ahidden 
				FROM '.$this->tbf.' AS f 
				LEFT JOIN '.$this->tbf.' AS p ON p.id=f.parent_id
				LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id 
				WHERE f.path="'.$path.'"
				GROUP BY f.id';

		return ($res = $this->db->query($sql))
			? $this->prepareStat($res->fetch_assoc())
			: false;
	}
	
	/**
	 * Convert file data fetched from db into fileinfo structure
	 *
	 * @param  array     $raw  assoc array from db
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function prepareStat($raw) {
		
		if (empty($raw) || empty($raw['id'])) {
			return false;
		}
		
		$file = array(
			'id'    => $raw['id'],
			'parent_id' => $raw['parent_id'], 
			'hash'  => $this->encode($raw['id']),
			'phash' => $raw['parent_id'] ? $this->encode($raw['parent_id']) : '',
			'name'  => $raw['name'],
			'mime'  => $raw['mime'],
			'size'  => $raw['size']
		);
		if ($raw['mtime'] > $this->today) {
			$file['date'] = 'Today '.date('H:i', $raw['mtime']);
		} elseif ($raw['mtime'] > $this->yesterday) {
			$file['date'] = 'Yesterday '.date('H:i', $raw['mtime']);
		} else {
			$file['date'] = date($this->options['dateFormat'], $raw['mtime']);
		}
		
		if ($this->accessControl) {
			$file['read']   = (int)$this->accessControl($this->uid, 'read',   $raw['id'], $this->defaults['read']);
			$file['write']  = (int)$this->accessControl($this->uid, 'write',  $raw['id'], $this->defaults['write']);
			$file['locked'] = (int)$this->accessControl($this->uid, 'locked', $raw['id'], $this->defaults['locked']);
			$file['hidden'] = (int)$this->accessControl($this->uid, 'hidden', $raw['id'], $this->defaults['hidden']);
			
		} else {
			$file['read']   = intval($raw['aread']   == '' ? $this->defaults['read']   : $raw['aread']);
			$file['write']  = intval($raw['awrite']  == '' ? $this->defaults['write']  : $raw['awrite']);
			$file['locked'] = intval($raw['alocked'] == '' ? $this->defaults['locked'] : $raw['alocked']);
			$file['hidden'] = intval($raw['ahidden'] == '' ? $this->defaults['hidden'] : $raw['ahidden']);
		}
		// root always locked
		if (!$file['phash']) {
			$file['locked'] = 1;
			$file['hidden'] = 0;
		}
		
		if ($file['read']) {
			if ($file['mime'] == 'directory') {
				if ($raw['dirs']) {
					$file['dirs'] = 1;
				}
			} else {
				if ($raw['width'] && $raw['height']) {
					$file['dim'] = $raw['width'].'x'.$raw['height'];
				}

				if (($tmb = $this->gettmb($raw['id'])) != false) {
					$file['tmb'] = $tmb;
				} elseif ($this->canCreateTmb($raw['id'], $file['mime'])) {
					$file['tmb'] = 1;
				}

			}
		} 
		
		// debug($file);
		return $file;
	}
	
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
				if (!$this->_isReadable($id) || $this->_isHidden($id)) {
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
		if (!$this->stat($dir)) {
			return -1;
		}
		
		if (!isset($this->paths[$dir][$name])) {
			$this->sqlCnt++;
			$sql = 'SELECT id FROM '.$this->tbf.' WHERE parent_id="'.$dir.'" AND name="'.$this->db->real_escape_string($name).'"';
			if ($res = $this->db->query($sql)) {
				if ($r = $res->fetch_assoc()) {
					$this->paths[$dir][$name] = $r['id'];
				}
			} else {
				// $this->paths[$dir][$name] = -1;
			}
			
		}
		return isset($this->paths[$dir][$name]) ? $this->paths[$dir][$name] : -1;
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
		if ($path == $parent) {
			return true;
		}
		return in_array($parent, $this->getParents($path));
	}
	
	/**
	 * Return file/dir URL
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _url($path) {
		return $this->URL ? $this->URL.$path.$this->separator : '';
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
		return ($file = $this->stat($path)) ? $file['read'] : false;
	}
	
	/**
	 * Return true if path is writable
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isWritable($path) {
		return ($file = $this->stat($path)) ? $file['write'] : false;
	}
	
	/**
	 * Return true if path is locked
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isLocked($path) {
		return ($file = $this->stat($path)) ? $file['locked'] : false;
	}
	
	/**
	 * Return true if path is hidden
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isHidden($path) {
		return ($file = $this->stat($path)) ? $file['hidden'] : false;
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
		$this->sqlCnt++;
		$sql = $this->tba
			? 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime, f.mime, f.width, f.height, ch.id AS dirs, 
				a.aread, a.awrite, a.alocked, a.ahidden
				FROM '.$this->tbf.' AS f 
				LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id 
				LEFT JOIN '.$this->tba.' AS a ON a.file_id=f.id AND user_id='.$this->uid.' 
				WHERE f.parent_id="'.$id.'"
				GROUP BY f.id'
			: 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime, f.mime, f.width, f.height, ch.id AS dirs, 
				"" AS aread, "" AS awrite, "" AS alocked, "" AS ahidden
				FROM '.$this->tbf.' AS f 
				LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id 
				WHERE f.parent_id="'.$id.'"
				GROUP BY f.id';

		if ($res = $this->db->query($sql)) {
			while ($r = $res->fetch_assoc()) {
				$id = $r['id'];
				if (!isset($this->cache[$id])) {
					$file = $this->prepareStat($r);
					$this->cache[$id] = $file;
				} else {
					$file = $this->cache[$id];
				}
				$files[] = $r['id'];
				
				if (!isset($this->paths[$r['parent_id']][$r['name']])) {
					$this->paths[$r['parent_id']][$r['name']] = $r['id'];
				}
			}
		}

		return $files;
	}

	/**
	 * Copy file into tmp dir, open it and return file pointer
	 *
	 * @param  string  $path  file path
	 * @param  bool    $write open file for writing
	 * @return resource|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fopen($path, $mode='rb') {
		if ($this->tmpPath && ($file = $this->stat($path)) && $file['read']) {
			$tmp = $this->tmpPath.DIRECTORY_SEPARATOR.$path;

			if ($fp = fopen($tmp, 'w')) {
				if ($res = $this->db->query('SELECT content FROM '.$this->tbf.' WHERE id="'.$path.'"')) {
					if ($r = $res->fetch_assoc()) {
						fwrite($fp, $r['content']);
					}
				}
				fclose($fp);
				
				return fopen($tmp, $mode);
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
	protected function _fclose($fp, $path) {
		@fclose($fp);
		if ($path) {
			@unlink($this->tmpPath.DIRECTORY_SEPARATOR.$path);
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
		if (!$this->_isDir($path)) {
			return false;
		}
		$this->sqlCnt++;
		$sql = 'INSERT INTO '.$this->tbf.' (parent_id, name, size, mtime, mime) 
			VALUES ("'.$path.'", "'.$this->db->real_escape_string($name).'", 0, '.time().', "directory")';

		return $this->db->query($sql) && $this->db->affected_rows > 0;
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
		if (!$this->_isDir($path)) {
			return false;
		}
		$this->sqlCnt++;
		$sql = 'INSERT INTO '.$this->tbf.' (parent_id, name, size, mtime, mime) 
			VALUES ("'.$path.'", "'.$this->db->real_escape_string($name).'", 0, '.time().', "text/plain")';

		return $this->db->query($sql) && $this->db->affected_rows > 0;
		
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
	protected function _copy($source, $targetDir, $name='') {
		if (!$this->stat($source)) {
			return false;
		}
		// debug($source);
		if (!$name) {
			$name = $this->_basename($source);
		}
		$this->sqlCnt++;
		$sql = 'INSERT INTO '.$this->tbf.' (parent_id, name, content, size, mtime, mime, width, height)  '
				.'SELECT "'.intval($targetDir).'", "'.$this->db->real_escape_string($name).'", content, size, "'.time().'", mime, width, height FROM '.$this->tbf.' WHERE id="'.intval($source).'"';

		if ($this->db->query($sql) && $this->db->affected_rows) {
			$id = $this->db->insert_id;
			
			if ($this->tba) {
				$this->sqlCnt++;
				$sql = 'SELECT user_id, aread, awrite, alocked, ahidden FROM '.$this->tba.' WHERE file_id="'.intval($source).'"';
				if ($res = $this->db->query($sql)) {
					$data = array();
					while ($r = $res->fetch_assoc()) {
						$data[] = '"'.implode('","', $r).'"';
					}
					
					if ($data) {
						$this->sqlCnt++;
						$sql = 'INSERT INTO '.$this->tba.' (file_id, user_id, aread, awrite, alocked, ahidden) VALUES ';
						$sql .= '('.implode('), (', $data).')';
						$this->db->query($sql);
					}
				}
			}
			
			return true;
		}
		return false;
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
		$parentId = $this->_dirname($source);
		
		$sql = 'UPDATE '.$this->tbf.' SET parent_id="'.$parentId.'", name="'.$this->db->real_escape_string($name).'", mtime="'.time().'" WHERE id="'.intval($source).'"';
		
		return $this->db->query($sql) && $this->db->affected_rows;
	}
	
	/**
	 * Remove file
	 *
	 * @param  string  $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _unlink($path) {
		$this->sqlCnt++;
		$sql = 'DELETE FROM '.$this->tbf.' WHERE id="'.intval($path).'" AND mime!="directory" LIMIT 1';
		return $this->db->query($sql) && $this->db->affected_rows > 0;
	}

	/**
	 * Remove dir
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _rmdir($path) {
		$sql = 'SELECT COUNT(f.id) AS num FROM '.$this->tbf.' WHERE parent_id="'.intval($path).'" GROUP BY f.parent_id';
		$this->sqlCnt++;
		if ($res = $this->db->query($sql)) {
			if ($r = $res->fetch_assoc()) {
				if ($r['num'] > 0) {
					return false;
				}
			}
		}
		$sql = 'DELETE FROM '.$this->tbf.' WHERE id="'.intval($path).'" AND mime="directory" LIMIT 1';
		return $this->db->query($sql) ? $this->db->affected_rows > 0 : false;
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
	protected function _save($fp, $dir, $name) {
		
		$id = $this->_joinPath($dir, $name);
		
		if ($this->tmpPath) {
			$tmp = $this->tmpPath.DIRECTORY_SEPARATOR.$name;
			if (!($target = @fopen($tmp, 'wb'))) {
				return false;
			}

			while (!feof($fp)) {
				fwrite($target, fread($fp, 8192));
			}
			fclose($target);
			$mime  = parent::mimetype($tmp);
			$width = $height = 0;
			if (strpos($mime, 'image') === 0) {
				if (($s = getimagesize($tmp))) {
					$width  = $s[0];
					$height = $s[1];
				}
			}
			
			$sql = $id > 0
				? 'REPLACE INTO %s (id, parent_id, name, content, size, mtime, mime, width, height) VALUES ('.$id.', %d, "%s", LOAD_FILE("%s"), %d, %d, "%s", %d, %d)'
				: 'INSERT INTO %s (parent_id, name, content, size, mtime, mime, width, height) VALUES (%d, "%s", LOAD_FILE("%s"), %d, %d, "%s", %d, %d)';
			$sql = sprintf($sql, $this->tbf, $dir, $this->db->real_escape_string($name), realpath($tmp), filesize($tmp), time(), $mime, $width, $height);
			
		} else {
			$this->mimeDetect = 'internal';
			$mime = parent::mimetype($name);
			$stat = fstat($fp);
			$size = $stat['size'];
			$content = '';
			while (!feof($fp)) {
				$content .= fread($fp, 8192);
			}

			$sql = $id > 0
				? 'REPLACE INTO %s (id, parent_id, name, content, size, mtime, mime, width, height) VALUES ('.$id.', %d, "%s", "%s", %d, %d, "%s", %d, %d)'
				: 'INSERT INTO %s (parent_id, name, content, size, mtime, mime, width, height) VALUES (%d, "%s", "%s", %d, %d, "%s", %d, %d)';
			$sql = sprintf($sql, $this->tbf, $dir, $this->db->real_escape_string($name), '0x' . bin2hex($content), $size, time(), $mime, 0, 0);
		}
		if ($this->db->query($sql)) {
			if ($tmp) {
				unlink($tmp);
			}
			return $id > 0 ? $id : $this->db->insert_id;
		}
		if ($tmp) {
			unlink($tmp);
		}
		return false;
	}
	
	
} // END class

?>