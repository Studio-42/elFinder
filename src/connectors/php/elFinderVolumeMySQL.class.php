<?php

class elFinderVolumeMySQL extends elFinderVolumeDriver {
	
	/**
	 * Database object
	 *
	 * @var mysqli
	 **/
	protected $db = null;
	
	/**
	 * Function or object and method to test files permissions
	 *
	 * @var string|array
	 **/
	protected $accessControl = null;
	
	/**
	 * Cache for files fetched from db
	 *
	 * @var array
	 **/
	protected $files = array();
	
	/**
	 * Default permissions
	 *
	 * @var array
	 **/
	protected $defaults = array(
		'read'  => true,
		'write' => true,
		'rm'    => true
	);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function __construct() {
		$opts = array(
			'host'         => 'localhost',
			'user'         => '',
			'pass'         => '',
			'db'           => '',
			'port'         => null,
			'socket'       => null,
			'files_table'  => 'elfinder_file',
			'perms_table'  => 'elfinder_permission',
			'user_id'      => 0,
			'accessControl' => null,
			'tmbPath' => ''
		);
		$this->options = array_merge($this->options, $opts); 
	}
	
	/*********************************************************************/
	/*                        INIT AND CONFIGURE                         */
	/*********************************************************************/
	
	/**
	 * Prepare driver before mount volume.
	 * Connect to db and check required tables
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
		
		$tables = array();
		if ($res = $this->db->query('SHOW TABLES')) {
			while ($row = $res->fetch_array()) {
				$tables[$row[0]] = 1;
			}
		}

		if (empty($tables[$this->options['files_table']]) || (!$this->accessControl && empty($tables[$this->options['perms_table']]))) {
			return false;
		}

		$this->tbf = $this->options['files_table'];
		$this->tbp = $this->options['perms_table'];
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
		
	}
	
	/******************************************************************/
	/*                              utilites                          */
	/******************************************************************/
	
	/**
	 * If file exists in cache return it
	 * or try to fetch file info from db and store in cache
	 *
	 * @param  string  file path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function fileinfo($path) {
		$root = $path == $this->root;
		if ($root || $this->accepted($path)) {
			
			$sql = 'SELECT f.id, f.parent_id, f.path, p.path AS parent_path, f.name, f.size, f.mtime, f.mime, f.width, f.height, d.id AS dirs FROM '
				.$this->tbf.' AS f LEFT JOIN '.$this->tbf.' AS p ON p.id=f.parent_id 
				LEFT JOIN '.$this->tbf.' AS d ON d.parent_id=f.id
				WHERE f.path="'.$this->db->real_escape_string($path).'" GROUP BY f.id';
			// echo $sql;
			if ($res = $this->db->query($sql)) {
				$file = $res->fetch_assoc();
				$id   = $file['id'];
			} 
			
			if (empty($file)) {
				return null;
			}
			
			
			$file['hash'] = $this->encode($file['path']);
			$file['phash'] = $file['parent_path'] ? $this->encode($file['parent_path']) : null;
			$mtime = $file['mtime'];
			if ($mtime > $this->today) {
				$date = 'Today '.date('H:i', $mtime);
			} elseif ($mtime > $this->yesterday) {
				$date = 'Yesterday '.date('H:i', $mtime);
			} else {
				$date = date($this->options['dateFormat'], $mtime);
			}
			$file['date'] = $date;
			
			if (is_string($this->accessControl)) {
				$file['read']  = (int)$this->accessControl($this->uid, 'read',  $id, $path);
				$file['write'] = (int)$this->accessControl($this->uid, 'write', $id, $path);
				$file['rm']    = (int)$this->accessControl($this->uid, 'rm',    $id, $path);
			} elseif (is_array($this->accessControl)) {
				$obj = $this->accessControl[0];
				$m   = $this->accessControl[1];
				$file['read']  = (int)$obj->{$m}($this->uid, 'read',  $id, $path);
				$file['write'] = (int)$obj->{$m}($this->uid, 'write', $id, $path);
				$file['rm']    = (int)$obj->{$m}($this->uid, 'rm',    $id, $path);
			} else {
				$file['read']  = (int)$this->defaults['read'];
				$file['rm']    = (int)$this->defaults['rm'];

				$sql = 'SELECT f.id, f.path, p.perm_read, p.perm_write, p.perm_rm FROM '
						.$this->tbf.' AS f, '
						.$this->tbp.' AS p '
						.'WHERE (f.id='.$id.' OR INSTR("'.$this->db->real_escape_string($path).'", CONCAT(f.path, "/"))=1) 
						AND p.user_id='.$this->uid.' AND p.file_id=f.id ORDER BY f.path';
						
				if ($res = $this->db->query($sql)) {
					while ($r = $res->fetch_assoc()) {
						if ($r['id'] == $id) {
							$file['read'] = (int)$r['perm_read'];
							$file['rm']   = (int)$r['perm_rm'];
							if (!isset($file['write']) || $file['write'] === true) {
								// set write perm if parent writable
								$file['write'] = (int)$r['perm_write'];
							}
						} else {
							if (!$r['perm_read']) {
								// one of parents not readable
								return null;
							}
							$file['write'] = (int)$r['perm_write'];
						}
					}
				}
				if (!isset($file['write'])) {
					$file['write'] = (int)$this->defaults['write'];
				}
			}
			if ($root) {
				$file['rm'] = 0;
			}
			
			
			
			if ($file['mime'] == 'directory') {
				$file['dirs'] = $file['dirs'] ? 1 : 0;
			} else {
				unset($file['dirs']);
				if (($tmb = $this->gettmb($path)) != false) {
					$file['tmb'] = $tmb;
				} elseif ($this->canCreateTmb($path, $file['mime'])) {
					$file['tmb'] = 1;
				}
				
				if ($file['width'] && $file['height']) {
					$file['dim'] = $file['width'].'x'.$file['height'];
				}
				
				if ($file['write'] && $this->resizable($path, $file['mime'])) {
					$file['resize'] = 1;
				}
			}
			
			unset($file['id'], $file['parent_id'], $file['path'], $file['mtime'], $file['parent_path'], $file['width'], $file['height']);
			$this->files[$path] = $file;
			
		}

		return empty($this->files[$path]) ? null : $this->files[$path];
	}
	
	
	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/
	
	/**
	 * Return true if file exists
	 *
	 * @param  string $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fileExists($path) {
		
	}
	
	
	/**
	 * Return true if path is a directory
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isDir($path) {
		return ($file = $this->file($path)) !== null ? $file['mime'] == 'directory' : false;
	}
	
	/**
	 * Return true if path is a file
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isFile($path) {
		return ($file = $this->file($path)) !== null ? $file['mime'] != 'directory' : false;
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
		return ($file = $this->file($path)) !== null ? $file['read'] : false;
	}
	
	/**
	 * Return true if path is writable
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isWritable($path) {
		return ($file = $this->file($path)) !== null ? $file['write'] : false;
	}
	
	/**
	 * Return true if file can be removed
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isRemovable($path) {
		return ($file = $this->file($path)) !== null ? $file['rm'] : false;
	}
	
	/**
	 * Return file size
	 *
	 * @param  string $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _filesize($path) {
		return ($file = $this->file($path)) !== null ? $file['size'] : false;
	}
	
	/**
	 * Return file modification time
	 *
	 * @param  string $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _filemtime($path) { 
		return ($file = $this->file($path)) !== null ? $file['mtime'] : false;
	}
	
	/**
	 * Return symlink stat (required only size and mtime)
	 *
	 * @param  string  $path  link path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _lstat($path) { 
		return false;
	}
	
	/**
	 * Return symlink target file
	 *
	 * @param  string  $path  link path
	 * @return string
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
		return ($file = $this->file($path)) !== null ? $file['dirs'] : false;
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
		return ($file = $this->file($path)) !== null ? $file['dim'] : false;
	}
	
	
}
?>