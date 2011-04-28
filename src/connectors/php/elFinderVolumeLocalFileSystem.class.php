<?php

/**
 * elFinder driver for local filesystem.
 *
 * @author Dmitry (dio) Levashov
 * @author Troex Nevelin
 **/
class elFinderVolumeLocalFileSystem extends elFinderVolumeDriver {
	
	/**
	 * Constructor
	 * Extend options with required fields
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function __construct() {
		$opts = array(
			'alias'        => '',           // alias to replace root dir name
			'dirMode'      => 0777,
			'fileMode'     => 0666,
			'attributes' => array(
				array(
					'pattern' => '/\/\../',
					'read' => false,
					'write' => false,
					'locked' => true,
					'hidden' => true
				)
			)
		);
		$this->options = array_merge($this->options, $opts); 
	}
	
	/*********************************************************************/
	/*                        INIT AND CONFIGURE                         */
	/*********************************************************************/
	
	/**
	 * Prepare driver before mount volume.
	 * Return true on success
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function init() {
		// set files attributes
		foreach ($this->options['attributes'] as $a) {
			// attributes must contain pattern and at least one rule
			if (!empty($a['pattern']) || count($a) > 1) {
				$this->attributes[] = $a;
			}
		}
		
		// find available mimetype detect method
		$type = preg_match('/^(finfo|mime_content_type|internal|auto)$/i', $this->options['mimeDetect']) 
			? strtolower($this->options['mimeDetect'])
			: 'auto';
		$regexp = '/text\/x\-(php|c\+\+)/';
		
		if (($type == 'finfo' || $type == 'auto') 
		&& class_exists('finfo')
		&& preg_match($regexp, array_shift(explode(';', @finfo_file(finfo_open(FILEINFO_MIME), __FILE__))))) {
			$this->options['mimeDetect'] = 'finfo';
		} elseif (($type == 'mime_content_type' || $type == 'auto') 
		&& function_exists('mime_content_type')
		&& preg_match($regexp, array_shift(explode(';', mime_content_type(__FILE__))))) {
			$this->options['mimeDetect'] = 'mime_content_type';
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
		// chek thumbnails path
		if ($this->options['tmbPath']) {
			$this->options['tmbPath'] = strpos($this->options['tmbPath'], DIRECTORY_SEPARATOR) === false
				// tmb path set as dirname under root dir
				? $this->root.DIRECTORY_SEPARATOR.$this->options['tmbPath']
				// tmb path as full path
				: $this->_normpath($this->options['tmbPath']);
		}
		
		parent::configure();
		
		// if no thumbnails url - try detect it
		if ($this->_isReadable($this->root) && !$this->tmbURL && $this->URL) {
			if (strpos($this->tmbPath, $this->root) === 0) {
				$this->tmbURL = $this->URL.str_replace(DIRECTORY_SEPARATOR, '/', substr($this->tmbPath, strlen($this->root)+1));
				if (preg_match("|[^/?&=]$|", $this->tmbURL)) {
					$this->tmbURL .= '/';
				}
			}
		}
		
		// if root dir is not readable - disallow read/remove/rename any files/dirs
		if (!$this->_isReadable($this->root)) {
			$this->defaults['read'] = false;
			
			array_unshift($this->attributes, array(
				'pattern' => '/.*/', 
				'read'    => false,
				'locked'  => true,
				'hidden'  => true
			));
		}
		
		$this->separator = DIRECTORY_SEPARATOR;
	}
	
	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/
	
	/**
	 * Return file attribute (read|write|locked|hidden)
	 *
	 * @param  string  $path  file path
	 * @param  string  $name  attribute name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function attr($path, $name) {
		if ($path == $this->root) {
			return $name == 'locked'
				? true // root dir always locked!
				: (isset($this->defaults[$name]) ? $this->defaults[$name] : false);
		}

		$path = DIRECTORY_SEPARATOR.$this->_relpath($path);

		for ($i = 0, $c = count($this->attributes); $i < $c; $i++) {
			$attr = $this->attributes[$i];

			if (isset($attr[$name]) && preg_match($attr['pattern'], $path)) {
				return $attr[$name];
			} 
		}
		return isset($this->defaults[$name]) ? $this->defaults[$name] : false;
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
		} 
		
		if ($type) {
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

		return parent::mimetype($path);
	}
	
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
		return $dir.DIRECTORY_SEPARATOR.$name;
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
	 * Return file path related to root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _relpath($path) {
		return $path == $this->root ? '' : substr($path, strlen($this->root)+1);
	}
	
	/**
	 * Return file path started from root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _abspath($path) {
		return $path == DIRECTORY_SEPARATOR ? $this->root : $this->root.DIRECTORY_SEPARATOR.$path;
	}
	
	/**
	 * Return fake path started from root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _path($path) {
		return $this->rootName.($path == $this->root ? '' : substr($path, strlen($this->root)));
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
	 * Return file/dir URL
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _url($path) {
		if (!$this->URL) {
			return '';
		}
		if ($path == $this->root) {
			return $this->URL;
		}
		if ($this->_isDir($path)) {
			$path .= $this->separator;
		}
		return $this->URL.str_replace($this->separator, '/', substr($path, strlen($this->root)+1));
	}
	
	/**
	 * Return true if $parent dir has child with $name
	 *
	 * @param  string  $parent  dir path
	 * @param  string  $name    file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _hasChild($parent, $name) {
		return file_exists($parent.DIRECTORY_SEPARATOR.$name);
	}
	
	/**
	 * Return true if file exists
	 *
	 * @param  string $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fileExists($path) {
		return file_exists($path);
	}
	
	/**
	 * Return true if path is a directory
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isDir($path) {
		return is_dir($path);
	}
	
	/**
	 * Return true if path is a file
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isFile($path) {
		return is_file($path);
	}
	
	/**
	 * Return true if path is a symlink
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isLink($path) {
		return is_link($path);
	}
	
	/**
	 * Return true if path is readable
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isReadable($path) {
		return is_readable($path) && $this->attr($path, 'read');
	}
	
	/**
	 * Return true if path is writable
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isWritable($path) {
		return is_writable($path) && $this->attr($path, 'write');
	}
	
	/**
	 * Return true if path is locked
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isLocked($path) {
		return $this->attr($path, 'locked');
	}
	
	/**
	 * Return true if path is hidden
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isHidden($path) {
		return $this->attr($path, 'hidden');
	}
	
	/**
	 * Return file size
	 *
	 * @param  string $path  file path
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _filesize($path) {
		return filesize($path);
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
	 * Return symlink stat (required only size and mtime)
	 *
	 * @param  string  $path  link path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _lstat($path) {
		return lstat($path);
	}
	
	/**
	 * Return symlink target file
	 *
	 * @param  string  $path  link path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _readlink($path) {
		$target = @readlink($path);
		if (!$target) {
			return false;
		}

		// absolute path
		if (substr($target, 0, 1) == '/') {
			$root = realpath($this->root);
			// not exists or link to outside root
			if (!file_exists($target) || !$this->_inpath($target, $root) || $target == $root) {
				return false;
			}
			return $this->root.substr($target, strlen($root));
		}
		
		$target = $this->_normpath($this->root.DIRECTORY_SEPARATOR.$target);
		// echo $this->root.' '. $target.'<br>';
		// not exists or link to outside root
		if (!file_exists($target) || !$this->_inpath($target, $target) || $this->root == $target) {

			return false;
		}
		return $target;
	}
	
	/**
	 * Return true if path is dir and has at least one childs directory
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _subdirs($path) {
		if (is_dir($path) && is_readable($path)) {
			$dir = dir($path);
			while (($entry = $dir->read()) !== false) {
				$p = $dir->path.DIRECTORY_SEPARATOR.$entry;
				if ($entry != '.' && $entry != '..' && is_dir($p) && !$this->_isHidden($p)) {
					$dir->close();
					return true;
				}
			}
			$dir->close();
		}
		return false;
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
		$ls    = @scandir($path);
		
		if (is_array($ls)) {
			for ($i =0, $l = count($ls); $i < $l; $i++) {
				if ($ls[$i] != '.' && $ls[$i] != '..') {
					$files[] = $path.DIRECTORY_SEPARATOR.$ls[$i];	
				}
			}
		}
		return $files;
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
		return strpos($mime, 'image') === 0 && ($s = @getimagesize($path)) !== false 
			? $s[0].'x'.$s[1] 
			: false;
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
	protected function _fclose($fp, $path) {
		return @fclose($fp);
	}
	
	/**
	 * Remove file
	 *
	 * @param  string  $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _unlink($path) {
		return @unlink($path);
	}

	/**
	 * Remove dir
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _rmdir($path) {
		return @rmdir($path);
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
		$target = $targetDir.DIRECTORY_SEPARATOR.($name ? $name : basename($source));
		return copy($source, $target);
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
		$target = $targetDir.DIRECTORY_SEPARATOR.($name ? $name : basename($source));
		return @rename($source, $target);
	}
	
	/**
	 * Create dir
	 *
	 * @param  string  $path  parent dir path
	 * @param string  $name  new directory name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _mkdir($path, $name) {
		$path = $path.DIRECTORY_SEPARATOR.$name;
		
		if (@mkdir($path)) {
			@chmod($path, $this->options['dirMode']);
			return true;
		}
		return false;
	}
	
	/**
	 * Create symlink
	 *
	 * @param  string  $target  link target
	 * @param  string  $path    symlink path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _symlink($target, $path, $name='') {
		if (!$name) {
			$name = basename($path);
		}
		$target = '.'.DIRECTORY_SEPARATOR.$this->relpath($target);
		$path = $path.DIRECTORY_SEPARATOR.$name;
		if (@symlink($target, $path)) {
			@chmod($path, $this->options[$this->_isDir($target) ? 'dirMode' : 'fileMode'] );
			return true;
		}
		return false;
	}
	

	
} // END class 


?>