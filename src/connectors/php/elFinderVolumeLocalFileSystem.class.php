<?php

/**
 * elFinder driver for local filesystem.
 *
 * @author Dmitry (dio) Levashov
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
			'dirMode'      => 0777,
			'fileMode'     => 0666,
			'perms'        => array(), // individual folders/files permisions
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
	protected function _init() {
		return true;
	}
	
	/**
	 * Check permisions
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _configure() {
		// if root dir is not readable - disallow read any files/dirs
		if (!is_readable($this->root)) {
			$this->defaults['read'] = false;
			if (isset($this->options['perms']['/.*/'])) {
				$this->options['perms']['/.*/']['read'] = false;
			} else {
				$this->options['perms']['/.*/'] = array('read' => false);
			}
		}
		// if root dir is not writable - disallow write into any files/dirs
		if (!is_writable($this->options['path'])) {
			$this->defaults['write'] = false;
			if (isset($this->options['perms']['/.*/'])) {
				$this->options['perms']['/.*/']['write'] = false;
			} else {
				$this->options['perms']['/.*/'] = array('read' => false);
			}
		}
		
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
	
	
	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/
	
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
		return is_readable($path);
	}
	
	/**
	 * Return true if path is writable
	 *
	 * @param  string  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isWritable($path) {
		return is_writable($path);
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
			if (!file_exists($target) || !$this->inpath($root, $target || $root == $target)) {
				return false;
			}
			return $this->root.substr($target, strlen($root));
		}
		
		$target = $this->normpath($this->root.DIRECTORY_SEPARATOR.$target);
		// echo $this->root.' '. $target.'<br>';
		// not exists or link to outside root
		if (!file_exists($target) || !$this->inpath($this->root, $target) || $this->root == $target) {

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
				if ($entry != '.' && $entry != '..' && is_dir($p) && !$this->hidden($p)) {
					$dir->close();
					return true;
				}
			}
			$dir->close();
		}
		return false;
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
	 * @param  string  $source  source file name
	 * @param  string  $target  target file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _copy($source, $target) {
		return @copy($source, $target);
	}
	
	/**
	 * Create dir
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _mkdir($path) {
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
	protected function _symlink($target, $path) {
		$target = '.'.DIRECTORY_SEPARATOR.$this->relpath($target);
		if (@symlink($target, $path)) {
			@chmod($path, $this->options[$this->_isDir($target) ? 'dirMode' : 'fileMode'] );
			return true;
		}
		return false;
	}
	
	/**
	 * Rename file
	 *
	 * @param  string  $oldPath  file to rename path
	 * @param  string  $newPath  new path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _rename($oldPath, $newPath) {
		return @rename($oldPath, $newPath);
	}
	
} // END class 


?>