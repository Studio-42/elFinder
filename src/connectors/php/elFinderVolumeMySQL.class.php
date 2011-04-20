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
	protected function _init() {

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
		if ($this->tba && empty($tables[$this->tba])) {
			$this->tba = '';
		}
		
		$this->uid = (int)$this->options['user_id'];
		
		if ($res = $this->db->query('SELECT path FROM '.$this->tbf.' WHERE id='.intval($this->options['path']))) {
			if ($r = $res->fetch_assoc()) {
				$this->options['path'] = $r['path'];
			}
		} 
		
		if ($this->options['startPath']) {
			if ($res = $this->db->query('SELECT path FROM '.$this->tbf.' WHERE id='.intval($this->options['startPath']))) {
				if ($r = $res->fetch_assoc()) {
					$this->options['startPath'] = $r['path'];
				}
			}
		}
		
		
		return true;
	}
	
	/**
	 * No configure required
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _configure() { 
		if ($this->options['tmpPath']) {
			if (!file_exists($this->options['tmpPath'])) {
				@mkdir($this->options['tmpPath']);
			}
		}
		
		if (is_dir($this->options['tmpPath']) && is_writable($this->options['tmpPath'])) {
			$this->tmpPath = $this->options['tmpPath'];
		} elseif ($this->tmbPathWritable) {
			$this->tmpPath = $this->tmbPath;
		}
	}
	
	
	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/
	
	/**
	 * Try to fetch file info from db and return
	 *
	 * @param  string  file path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function fileinfo($path) {
		$root = $path == $this->root;
		$path = $this->db->real_escape_string($path);
		
		if ($this->tba) {
			$sql = 'SELECT f.id, f.path, p.path AS parent_path, f.name, f.size, f.mtime, f.mime, f.width, f.height, ch.id AS dirs, 
				a.aread, a.awrite, a.alocked, a.ahidden
				FROM '.$this->tbf.' AS f 
				LEFT JOIN '.$this->tbf.' AS p ON p.id=f.parent_id
				LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id 
				LEFT JOIN '.$this->tba.' AS a ON a.file_id=f.id AND user_id='.$this->uid.'
				WHERE f.path="'.$path.'"
				GROUP BY f.id';
			
		} else {
			$sql = 'SELECT f.id, f.path, p.path AS parent_path, f.name, f.size, f.mtime, f.mime, f.width, f.height, ch.id AS dirs, 
				"" AS aread, "" AS awrite, "" AS alocked, "" AS ahidden 
				FROM '.$this->tbf.' AS f 
				LEFT JOIN '.$this->tbf.' AS p ON p.id=f.parent_id
				LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id 
				WHERE f.path="'.$path.'"
				GROUP BY f.id';
		}
		
			
		if ($res = $this->db->query($sql)) {
			return $this->prepareInfo($res->fetch_assoc());
		}

		return false;
	}
	
	/**
	 * Get file data from db and return complete fileinfo array 
	 *
	 * @param  array  $raw  file data
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function prepareInfo($raw) {
		// debug($raw);
		// debug($this->defaults);
		$info = array(
			'hash'  => $this->encode($raw['path']),
			'phash' => $raw['parent_path'] ? $this->encode($raw['parent_path']) : '',
			'name'  => $raw['name'],
			'mime'  => $raw['mime'],
			'size'  => $raw['size']
		);
		
		if ($raw['mtime'] > $this->today) {
			$info['date'] = 'Today '.date('H:i', $raw['mtime']);
		} elseif ($raw['mtime'] > $this->yesterday) {
			$info['date'] = 'Yesterday '.date('H:i', $raw['mtime']);
		} else {
			$info['date'] = date($this->options['dateFormat'], $raw['mtime']);
		}
		
		if ($this->accessControl) {
			$info['read']   = (int)$this->accessControl($this->uid, 'read',   $raw['id'], $raw['path'], $this->defaults['read']);
			$info['write']  = (int)$this->accessControl($this->uid, 'write',  $raw['id'], $raw['path'], $this->defaults['write']);
			$info['locked'] = (int)$this->accessControl($this->uid, 'locked', $raw['id'], $raw['path'], $this->defaults['locked']);
			$info['hidden'] = (int)$this->accessControl($this->uid, 'hidden', $raw['id'], $raw['path'], $this->defaults['hidden']);
			
		} else {
			$info['read']   = intval($raw['aread']   == '' ? $this->defaults['read']   : $raw['aread']);
			$info['write']  = intval($raw['awrite']  == '' ? $this->defaults['write']  : $raw['awrite']);
			$info['locked'] = intval($raw['alocked'] == '' ? $this->defaults['locked'] : $raw['alocked']);
			$info['hidden'] = intval($raw['ahidden'] == '' ? $this->defaults['hidden'] : $raw['ahidden']);
		}

		if (!$info['phash']) {
			$info['locked'] = 1;
			$info['hidden'] = 0;
		} else {
			if ($this->locked($raw['path'])) {
				$info['locked'] = 1;
			}
			if ($this->hidden($raw['path'])) {
				$info['hidden'] = 1;
			}
		}


		if ($info['read']) {
			if ($info['mime'] == 'directory') {
				if ($raw['dirs']) {
					$info['dirs'] = 1;
				}
			} else {
				if ($raw['width'] && $raw['height']) {
					$info['dim'] = $raw['width'].'x'.$raw['height'];
				}
				
				if (($tmb = $this->gettmb($raw['path'])) != false) {
					$info['tmb'] = $tmb;
				} elseif ($this->tmbPath
						&& $this->tmbURL
						&& $this->tmbPathWritable 
						&& !$this->inpath($raw['path'], $this->tmbPath) // do not create thumnbnail for thumnbnail
						&& $this->imgLib 
						&& strpos('image', $info['mime']) == 0 
						&& ($this->imgLib == 'gd' ? $info['mime'] == 'image/jpeg' || $info['mime'] == 'image/png' || $info['mime'] == 'mime/gif' : true)) {
					$info['tmb'] = 1;
				}
				
				if ($info['write'] && $this->resizable($info['mime'])) {
					$info['resize'] = 1;
				}
			}
		}
		
		return $info;
	}
	
	/**
	 * Return file mimetype
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mimetype($path) {
		return ($file = $this->file($path)) ? $file['mime'] : 'unknown';
	}
	
	/**
	 * Return true if file exists
	 *
	 * @param  string $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fileExists($path) {
		return !!$this->file($path);
	}
	
	/**
	 * Return true if path is a directory
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isDir($path) {
		return ($file = $this->file($path)) ? $file['mime'] == 'directory' : false;
	}
	
	/**
	 * Return true if path is a file
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isFile($path) {
		return !$this->_isDir($hash);
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
	/**
	 * Return true if path is readable
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isReadable($path) {
		return ($file = $this->file($path)) ? $file['read'] : false;
	}
	
	/**
	 * Return true if path is writable
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isWritable($path) {
		return ($file = $this->file($path)) ? $file['write'] : false;
	}
	
	/**
	 * Return file size
	 *
	 * @param  string $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _filesize($path) {
		return ($file = $this->file($path)) ? $file['size'] : false;
	}
	
	/**
	 * Return file modification time
	 *
	 * @param  string $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _filemtime($path) { 
		return ($file = $this->file($path)) ? $file['mtime'] : false;
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
	 * Return true if path is dir and has at least one childs directory
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _subdirs($path) {
		return ($file = $this->file($path)) ? $file['dirs'] : false;
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
		return ($file = $this->file($path)) ? $file['dim'] : false;
	}
	
	/**
	 * Return files list in directory
	 *
	 * @param  string  $path  dir path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _scandir($path) {
		$files = array();
		$path  = $this->db->real_escape_string($path);
		
		if ($this->tba) {
			$sql = 'SELECT f.id, f.path, p.path AS parent_path, f.name, f.size, f.mtime, f.mime, f.width, f.height, ch.id AS dirs, 
				a.aread, a.awrite, a.alocked, a.ahidden
				FROM '.$this->tbf.' AS f 
				LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id 
				LEFT JOIN '.$this->tba.' AS a ON a.file_id=f.id AND user_id='.$this->uid.', '
				.$this->tbf.' AS p 
				WHERE p.path="'.$path.'" AND f.parent_id=p.id
				GROUP BY f.id  ORDER BY f.path';
			
		} else {
			$sql = 'SELECT f.id, f.path, p.path AS parent_path, f.name, f.size, f.mtime, f.mime, f.width, f.height, ch.id AS dirs, 
				"" AS aread, "" AS awrite, "" AS alocked, "" AS ahidden 
				FROM '.$this->tbf.' AS f 
				LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id,'
				.$this->tbf.' AS p  
				WHERE p.path="'.$path.'" AND f.parent_id=p.id
				GROUP BY f.id ORDER BY f.path';
		}
		

		if ($res = $this->db->query($sql)) {
			while ($r = $res->fetch_assoc()) {
				$path = $r['path'];
				if (!isset($this->files[$path])) {
					$file = $this->prepareInfo($r);
					$this->files[$path] = $file;
				} else {
					$file = $this->files[$path];
				}
				$files[] = $path;
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
		if ($this->tmpPath && ($file = $this->file($path)) && $file['read']) {
			$tmp = $this->tmpPath.DIRECTORY_SEPARATOR.$file['name'];

			if ($fp = fopen($tmp, 'w')) {
				if ($res = $this->db->query('SELECT content FROM '.$this->tbf.' WHERE path="'.$this->db->real_escape_string($path).'"')) {
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
			@unlink($this->tmpPath.DIRECTORY_SEPARATOR.basename($path));
		}
	}
} // END class

?>