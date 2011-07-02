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
	 * dir/subdirs map cache
	 *
	 * @var array
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
			// echo mysqli_error();
			
			return false;
		}
		
		$this->db->query('SET SESSION character_set_client=utf8');
		$this->db->query('SET SESSION character_set_connection=utf8');
		$this->db->query('SET SESSION character_set_results=utf8');

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
	 * Perform sql query and return result.
	 * Increase sqlCnt
	 *
	 * @param  string  $sql  query
	 * @return misc
	 * @author Dmitry (dio) Levashov
	 **/
	protected function query($sql) {
		$this->sqlCnt++;
		return $this->db->query($sql);
	}
	
	/**
	 * Return file info from cache.
	 * If there is no info in cache - load it
	 *
	 * @param  string      $path  file cache
	 * @param  array|bool  $raw   if array - save it as file info, if true - return info with addtional fields
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function stat($path, $raw=false, $data=false) {

		if (!isset($this->cache[$path])) {

			if (!is_array($data)) {
				$sql = 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime, f.mime, f.width, f.height, ch.id AS dirs
						FROM '.$this->tbf.' AS f 
						LEFT JOIN '.$this->tbf.' AS p ON p.id=f.parent_id
						LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id 
						WHERE f.id="'.$path.'"
						GROUP BY f.id';
						
				if (($res = $this->query($sql))) {
					$data = $res->fetch_assoc();
				} 
			}
			
			if (!$data) {
				return $this->cache[$path] = false;
			}
			
			$file = array(
				'id'        => $data['id'],
				'parent_id' => $data['parent_id'], 
				'hash'      => $this->encode($data['id']),
				'phash'     => $data['parent_id'] ? $this->encode($data['parent_id']) : '',
				'name'      => $data['name'],
				'mime'      => $data['mime'],
				'size'      => $data['size'],
				'date'      => $this->formatDate($data['mtime'])
			);
			
			if (!$data['parent_id']) {
				$file['volumeid'] = $this->id;
			}
			
			if ($file['mime'] == 'directory') {
				$file['dirs'] = $data['dirs'];
			} else {
				if ($data['width'] && $data['height']) {
					$file['dim'] = $data['width'].'x'.$data['height'];
				}
				if (($tmb = $this->gettmb($file['id'])) != false) {
					$file['tmb'] = $tmb;
				} elseif ($this->canCreateTmb($file['id'], $file['mime'])) {
					$file['tmb'] = 1;
				}
			}

			if (!isset($this->paths[$file['parent_id']][$file['name']])) {
				$this->paths[$file['parent_id']][$file['name']] = $file['id'];
			}
			
			$this->cache[$path] = $file;

			if ($this->cache[$path]) {
				$id = $this->cache[$path]['id'];
				$this->cache[$path]['read']  = $this->attr($id, 'read');
				$this->cache[$path]['write'] = $this->attr($id, 'write');
				if ($this->attr($id, 'locked')) {
					$this->cache[$path]['locked'] = 1;
				}
				if ($this->attr($id, 'hidden')) {
					$this->cache[$path]['hidden'] = 1;
				}
			}
		} 
		
		$file = $this->cache[$path];
		
		if ($file && !$raw) {

			unset($file['id']);
			unset($file['parent_id']);
		}
		return $file;
	}
	
	/**
	 * Reset files info cache
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function clearstat() {
		$this->cache = array();
		$this->paths = array();
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
		return $path == $parent
			? true
			: in_array($parent, $this->getParents($path));
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
		$sql   = 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime, f.mime, f.width, f.height, ch.id AS dirs 
				FROM '.$this->tbf.' AS f 
				LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id 
				WHERE f.parent_id="'.$id.'"
				GROUP BY f.id';

		if ($res = $this->query($sql)) {
			while ($r = $res->fetch_assoc()) {
				$id = $r['id'];
				
				$this->stat($id, false, $r);
				$files[] = $id;
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
		$this->clearstat();

		$sql = 'INSERT INTO '.$this->tbf.' (parent_id, name, size, mtime, mime) 
			VALUES ("'.$path.'", "'.$this->db->real_escape_string($name).'", 0, '.time().', "directory")';

		return $this->query($sql) && $this->db->affected_rows > 0;
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
		$this->clearstat();
		$sql = 'INSERT INTO '.$this->tbf.' (parent_id, name, size, mtime, mime) 
			VALUES ("'.$path.'", "'.$this->db->real_escape_string($name).'", 0, '.time().', "text/plain")';

		return $this->query($sql) && $this->db->affected_rows > 0;
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
		$this->clearstat();
		
		if (!$name) {
			$name = $this->_basename($source);
		}

		$sql = 'INSERT INTO '.$this->tbf.' (parent_id, name, content, size, mtime, mime, width, height)  '
				.'SELECT "'.intval($targetDir).'", "'.$this->db->real_escape_string($name).'", content, size, "'.time().'", mime, width, height FROM '.$this->tbf.' WHERE id="'.intval($source).'"';

		return $this->query($sql) && $this->db->affected_rows;
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
	protected function _save($fp, $dir, $name) {
		$this->clearstat();
		
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
		if ($this->query($sql)) {
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
	
	/**
	 * Get file contents
	 *
	 * @param  string  $path  file path
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _getContents($path) {
		$sql = 'SELECT content FROM '.$this->tbf.' WHERE id='.intval($path);
		if ($res = $this->query($sql)) {
			if ($r = $res->fetch_assoc()) {
				return $r['content'];
			}
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
		$sql = 'UPDATE '.$this->tbf.' SET content="'.$this->db->real_escape_string($content).'", size="'.strlen($content).'", mtime="'.time().'" WHERE id='.intval($path);
		if ($this->query($sql)) {
			$this->clearstat();
			return true;
		}
		return false;
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