<?php

/**
 * undocumented class
 *
 * @package default
 * @author Dmitry Levashov
 **/
class elFinderVolumeLocalFileSystem extends elFinderVolumeDriver {
	
	/**
	 * Driver id
	 * Must be unique and contains [a-z0-9]
	 * Used as part of volume id
	 *
	 * @var string
	 **/
	protected $driverId = 'l';
	
	/**
	 * finfo object
	 *
	 * @var object
	 **/
	protected $finfo = null;
	
	
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
	 * Return true if required action available for file
	 *
	 * @param  string  file path
	 * @param  string  action (read|write|rm)
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function allowed($path, $action) {
		
		if ($path == $this->root) {
			if ($action == 'read' || $action == 'write') {
				return $this->options['defaults'][$action];
			}
			return false;
		}

		$path = $this->_relpath($path);

		foreach ($this->options['perms'] as $regexp => $rules) {
			if (preg_match($regexp, $path) && isset($rules[$action])) {
				return $rules[$action];
			}
		}
		return isset($this->options['defaults'][$action]) ? $this->options['defaults'][$action] : false;
	}
	
	/**
	 * Return best available mimetype detection method name
	 * Override parent method for additional methods support
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function confMimeDetect() {
		$type = preg_match('/^(finfo|mime_content_type|internal|auto)$/i', $this->options['mimeDetect']) 
			? strtolower($this->options['mimeDetect'])
			: 'auto';
		$regexp = '/text\/x\-(php|c\+\+)/';
		
		if (($type == 'finfo' || $type == 'auto') 
		&& class_exists('finfo')
		&& preg_match($regexp, array_shift(explode(';', @finfo_file(finfo_open(FILEINFO_MIME), __FILE__))))) {
			return 'finfo';
		}
		if (($type == 'mime_content_type' || $type == 'auto') 
		&& function_exists('mime_content_type')
		&& preg_match($regexp, array_shift(explode(';', mime_content_type(__FILE__))))) {
			return 'mime_content_type';
		}
		return 'internal';
	}
	
	/**
	 * Return file mime type
	 * Override parent method
	 *
	 * @param  string $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mimetype($path) {
		$type = '';
		
		if ($this->mimeDetect == 'finfo') {
			if (empty($this->finfo)) {
				$this->finfo = finfo_open(FILEINFO_MIME);
			}
			$type =  @finfo_file($this->finfo, $path); 
		} elseif ($type == 'mime_content_type') {
			$type = mime_content_type($path);
		} else {
			return parent::mimetype($path);
		}

		$type = array_shift(explode(';', $type)); 
		
		if ($type == 'unknown' && is_dir($path)) {
			$type = 'directory';
		} elseif ($type == 'application/x-zip') {
			// http://elrte.org/redmine/issues/163
			$type = 'application/zip';
		}
		return $type;
	}
	
	/**
	 * Prepare object configuration
	 *
	 * @param  array  $opts  object configuration
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _prepare(array $opts) {
		$o = array(
			'cryptLib'     => 'auto',  // how crypt paths? not implemented yet
			'dirMode'      => 0777,
			'fileMode'     => 0666,
			'defaults'     => array(   // default permissions 
				'read'  => true,
				'write' => true,
				'rm'    => true
			),
			'perms'        => array(), // individual folders/files permisions
		);
		
		if (!empty($opts['path'])) {
			$opts['path'] = $this->normpath($opts['path']);
		}
		if (!empty($opts['startPath'])) {
			$opts['startPath'] = $this->normpath($opts['startPath']);
		}
		
		return array_merge($o, $opts);
	}
	
	/**
	 * Check permisions
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _configure() {
		// if root dir is not readable - disallow read any files/dirs
		if (!is_readable($this->options['path'])) {
			$this->options['defaults']['read'] = false;
			foreach ($this->options['perms'] as $i => $rules) {
				if (isset($rules['read'])) {
					$this->options['perms'][$i]['read'] = false;
				}
			}
		}
		// if root dir is not writable - disallow write into any files/dirs
		if (!is_writable($this->options['path'])) {
			$this->options['defaults']['write'] = false;
			foreach ($this->options['perms'] as $i => $rules) {
				if (isset($rules['write'])) {
					$this->options['perms'][$i]['write'] = false;
				}
			}
		}
		
	}
	
	/**
	 * Return current root data required by client (disabled commands, archive ability, etc.)
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _params() {
		return array(
			'dotFiles'   => $this->options['dotFiles'],
			'disabled'   => $this->options['disabled'],
			'archives'   => array(),
			'extract'    => array()
		);
	}
	
	/**
	 * Return path related to root path
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _relpath($path) {
		return $path == $this->root ? '' : substr($path, strlen($this->root)+1);
	}
	
	/**
	 * Returns fake absolute path - begining with root dir
	 *
	 * @param  string  $path  file path
	 * @return strng
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _abspath($path) {
		return $path == DIRECTORY_SEPARATOR ? $this->root : $this->root.DIRECTORY_SEPARATOR.$path;
	}
	
	/**
	 * Return path info same as pathinfo()
	 *
	 * @param  string  $path  file path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _pathinfo($path) {
		return pathinfo($path);
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
		return $path == $parent || strpos($path, $parent.DIRECTORY_SEPARATOR) === 0;
	}
	
	/**
	 * Return file parent directory name
	 *
	 * @param  string $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _dirname($path) {
		return dirname($path);
	}

	/**
	 * Return file name
	 *
	 * @param  string $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _basename($path) {
		return $path == $this->root && $this->rootName ? $this->rootName : basename($path);
	}
	
	/**
	 * Convert file path into url
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _path2url($path) {
		if ($this->URL) {
			return $path == $this->root
				? $this->URL
				: $this->URL.str_replace(DIRECTORY_SEPARATOR, '/', $this->_relpath($path));
		}
		return '';
	}
	
	
	
	/**
	 * Return true if file exists
	 *
	 * @param  string  $path file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fileExists($path) {
		return file_exists($path);
	}
	
	/**
	 * Returns TRUE if the filename exists and is a regular file, FALSE otherwise.
	 *
	 * @param  string  $path file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isFile($path) {
		return is_file($path);
	}
	
	/**
	 * Returns TRUE if the thumbnail with given name exists
	 *
	 * @param  string  $name  thumbnail file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _tmbExists($name) {
		return file_exists($this->tmbPath.DIRECTORY_SEPARATOR.$name);
	}
	
	/**
	 * Returns TRUE if the filename exists and is a directory, FALSE otherwise.
	 *
	 * @param  string  $path file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isDir($path) {
		return is_dir($path);
	}
	
	/**
	 * Returns TRUE if the filename exists and is a symlink, FALSE otherwise.
	 *
	 * @param  string  $path file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isLink($path) {
		return is_link($path);
	}
	
	/**
	 * Returns TRUE if the file exists and readable.
	 *
	 * @param  string  $path file path
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _isReadable($path) {
		return is_readable($path) && $this->allowed($path, 'read');
	}
	
	/**
	 * Returns TRUE if the file exists and writeable.
	 *
	 * @param  string  $path file path
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _isWritable($path) {
		return is_writable($path) && $this->allowed($path, 'write');
	}
	
	/**
	 * Returns TRUE if the file exists and can be removed.
	 *
	 * @param  string  $path file path
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _isRemovable($path) {
		if ($path != $this->root && $this->_isLink($path)) {
			if (($target = $this->_readlink($path)) === false
			|| !$this->_isRemovable($target)) {
				return false;
			}
		}
		return $this->allowed($path, 'rm');
	}
	
	/**
	 * Return true if path is dir and has at least one childs directory
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _hasSubdirs($path) {
		if (is_dir($path)) {
			$dir = dir($path);
			while (($entry = $dir->read()) !== false) {
				if ($entry != '.' && $entry != '..' && $this->accepted($entry) && is_dir($dir->path.DIRECTORY_SEPARATOR.$entry)) {
					$dir->close();
					return true;
				}
			}
			$dir->close();
		}
		return false;
	}
	
	
	/**
	 * Return true if $parent dir contains file with $name
	 *
	 * @param  string  $parent  parent dir path
	 * @param  string  $name    name to test
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _hasChild($parent, $name) {
		return file_exists($parent.DIRECTORY_SEPARATOR.$name);
	}
	
	/**
	 * Return file modification time
	 *
	 * @param  string $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _filemtime($path) {
		return filemtime($path);
	}
	
	/**
	 * Return file size
	 *
	 * @param  string $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _filesize($path) {
		return @filesize($path);
	}
	
	/**
	 * Returns the target of a symbolic link,
	 * if target exists and is under root dir
	 *
	 * @param  string  $link  link path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _readlink($path) {
		$link = false;

		if (($target = @readlink($path)) !== false) {
			$target = $this->normpath($target);

			if ($target == $path) {
				// circlic 0_o is it possible?
				return false;
			}

			if (substr($target, 0, 1) == DIRECTORY_SEPARATOR || preg_match('/^[A-Z]\:\\\/', $target)) {
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
	 * Return directory content.
	 *
	 * @param  string  $path     dir path
	 * @param  int     $filter   content filter (only dirs/only files)
	 * @param  bool    $accepted return only files with accepted names?
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _scandir($path, $filter=0, $accepted = true) {
		$ret = array();
		
		if (($ls  = @scandir($path)) === false) {
			return false;
		}
		
		if ($filter != self::FILTER_DIRS_ONLY && $filter != self::FILTER_FILES_ONLY) {
			$filter = 0;
		}
		
		for ($i = 0, $s = count($ls); $i < $s; $i++) {
			$p = $path.DIRECTORY_SEPARATOR.$ls[$i];
			$a = $accepted ? $this->accepted($ls[$i]) : ($ls[$i] != '.' && $ls[$i] != '..');
			
			if ($a) {
				if ($filter) {
					$d = is_dir($p);
					if (($filter == self::FILTER_DIRS_ONLY && $d)
					||  ($filter == self::FILTER_FILES_ONLY && !$d)) {
						$ret[] = $p;
					}
				} else {
					$ret[] = $p;
				}
			}
		}
		return $ret;
	}

	/**
	 * Create directory
	 * Return new directory path or false on failed
	 *
	 * @param  string  $parent  parent directory path
	 * @param  string  $name    new directory name
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _mkdir($parent, $name) {
		$path = $parent.DIRECTORY_SEPARATOR.basename($name);
		if (!file_exists($path) && @mkdir($path)) {
			chmod($path, $this->options['dirMode']);
			return $path;
		}
		return false;
	}
	
	/**
	 * Create empty file
	 * Return new file path or false on failed
	 *
	 * @param  string  $parent  parent directory path
	 * @param  string  $name    new file name
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _mkfile($parent, $name) {
		$path = $parent.DIRECTORY_SEPARATOR.basename($name);
		if (!file_exists($path) && @touch($path)) {
			chmod($path, $this->options['fileMode']);
			return $path;
		}
		return false;
	}
	
	

	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _symlink($target, $link) {
		if (symlink($target, $link)) {
			chmod($link, $this->options['fileMode']);
			return true;
		} 
		return false;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _rmdir($path) {
		return rmdir($path);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _unlink($path) {
		return unlink($path);
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
		return @fopen($path, $mode);
	}
	
	/**
	 * Close opened file
	 *
	 * @param  resource  $fp  file pointer
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fclose($fp) {
		return @fclose($fp);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _copy($src, $dir, $name='') {
		$error = array('Unable to copy $1.', $this->_abspath($src));
		
		if (!$this->_isReadable($src) || !$this->_isWritable($dir)) {
			return $this->setError($error, 'Not enough permissions.');
		}
		if (!$name) {
			$name = $this->_basename($src);
		}
		$target = $dir.DIRECTORY_SEPARATOR.$name;
		
		if ($this->_isLink($src)) {
			if (($lt = $this->_readlink($src)) == false) {
				return $this->setError($error);
			}
			$lt = $this->normpath($lt);
			if (strpos($lt, $this->root) === 0) {
				$lt = substr($lt, strlen($this->root)+1);
			}
			if (!$this->_symlink($lt, $target)) {
				return $this->setError($error);
			}
		} elseif ($this->_isDir($src)) {
			if (($dir = $this->_mkdir($dir, $name)) == false) {
				return $this->setError($error);
			}
			if (($ls = $this->_scandir($src)) === false) {
				return $this->setError($error);
				
				
			}
			foreach ($ls as $file) {
				if (!$this->_copy($file, $dir)) {
					return $this->setError(array('Unable to copy $1.', $this->_abspath($file)));
				}
			}
		} else {
			if (!copy($src, $target)) {
				return $this->setError($error);
			}
		}
		
		
		return $target;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _fileGetContents($path) {
		return '';
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _filePutContents($path, $content) {
		return false;
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _resizeImg($path, $w, $h) {
		return false;
	}
	
	/**
	 * Return debug info
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _debug() {
		return array(
			'mimeDetect' => $this->mimeDetect,
			'imgLib'     => $this->imgLib
		);
	}
	
	
	
} // END class 



?>