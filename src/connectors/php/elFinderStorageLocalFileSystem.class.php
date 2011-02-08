<?php

class elFinderStorageLocalFileSystem implements elFinderStorageDriver {
	
	/**
	 * Object configuration
	 *
	 * @var array
	 **/
	protected $options = array();
	
	/**
	 * Error message from last failed action
	 *
	 * @var string
	 **/
	protected $error = '';
	
	/**
	 * extensions/mimetypes for _mimetypeDetect = 'internal' 
	 *
	 * @var array
	 **/
	protected $mimetypes = array(
		// applications
		'ai'    => 'application/postscript',
		'eps'   => 'application/postscript',
		'exe'   => 'application/octet-stream',
		'doc'   => 'application/vnd.ms-word',
		'xls'   => 'application/vnd.ms-excel',
		'ppt'   => 'application/vnd.ms-powerpoint',
		'pps'   => 'application/vnd.ms-powerpoint',
		'pdf'   => 'application/pdf',
		'xml'   => 'application/xml',
		'odt'   => 'application/vnd.oasis.opendocument.text',
		'swf'   => 'application/x-shockwave-flash',
		// archives
		'gz'    => 'application/x-gzip',
		'tgz'   => 'application/x-gzip',
		'bz'    => 'application/x-bzip2',
		'bz2'   => 'application/x-bzip2',
		'tbz'   => 'application/x-bzip2',
		'zip'   => 'application/zip',
		'rar'   => 'application/x-rar',
		'tar'   => 'application/x-tar',
		'7z'    => 'application/x-7z-compressed',
		// texts
		'txt'   => 'text/plain',
		'php'   => 'text/x-php',
		'html'  => 'text/html',
		'htm'   => 'text/html',
		'js'    => 'text/javascript',
		'css'   => 'text/css',
		'rtf'   => 'text/rtf',
		'rtfd'  => 'text/rtfd',
		'py'    => 'text/x-python',
		'java'  => 'text/x-java-source',
		'rb'    => 'text/x-ruby',
		'sh'    => 'text/x-shellscript',
		'pl'    => 'text/x-perl',
		'sql'   => 'text/x-sql',
		// images
		'bmp'   => 'image/x-ms-bmp',
		'jpg'   => 'image/jpeg',
		'jpeg'  => 'image/jpeg',
		'gif'   => 'image/gif',
		'png'   => 'image/png',
		'tif'   => 'image/tiff',
		'tiff'  => 'image/tiff',
		'tga'   => 'image/x-targa',
		'psd'   => 'image/vnd.adobe.photoshop',
		'ai'    => 'image/vnd.adobe.photoshop',
		//audio

		'mp3'   => 'audio/mpeg',
		'mid'   => 'audio/midi',
		'ogg'   => 'audio/ogg',
		'mp4a'  => 'audio/mp4',
		'wav'   => 'audio/wav',
		'wma'   => 'audio/x-ms-wma',
		// video
		'avi'   => 'video/x-msvideo',
		'dv'    => 'video/x-dv',
		'mp4'   => 'video/mp4',
		'mpeg'  => 'video/mpeg',
		'mpg'   => 'video/mpeg',
		'mov'   => 'video/quicktime',
		'wm'    => 'video/x-ms-wmv',
		'flv'   => 'video/x-flv',
		'mkv'   => 'video/x-matroska'
		);
	
	
	/**
	 * Init storage.
	 * Return true if storage available
	 *
	 * @param  array  object configuration
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function load(array $opts) {
		$this->options = array_merge($this->options, $opts);
		
		if (empty($this->options['path'])) {
			return false;
		}
		
		$this->options['path'] = $this->normpath($this->options['path']);
		
		if (!is_dir($this->options['path']) || !is_readable($this->options['path'])) {
			return false;
		}
		
		$this->options['dirname'] = dirname($this->options['path']);
		$this->options['basename'] = !empty($this->options['alias']) ? $this->options['alias'] : basename($this->options['path']);
		
		debug($this->options['path']);
		debug($this->options['dirname']);
		
		return true;
	}
	
	/**
	 * Return directory/file info
	 *
	 * @param  string  directory hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function info($hash) {
		
	}
	
	/**
	 * Return directory content
	 *
	 * @param  string  directory hash
	 * @param  string  sort rule
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function ls($hash, $sort) {
		
	}

	/**
	 * Return directory subdirs.
	 * Return one-level array, each dir contains parent dir hash
	 *
	 * @param  string  directory hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function tree($hash) {
		
	}

	/**
	 * Create thumbnails in directory
	 * Return info about created thumbnails
	 *
	 * @param  string  directory hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function tmb($hash) {
		
	}

	/**
	 * Open file and return descriptor
	 * Requered to copy file across storages with different types
	 *
	 * @param  string  file hash
	 * @param  string  open mode
	 * @return resource
	 * @author Dmitry (dio) Levashov
	 **/
	public function open($hash, $mode="rb") {
		
	}

	/**
	 * Close file opened by open() methods
	 *
	 * @param  resource  file descriptor
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function close($fp) {
		
	}
	
	/**
	 * Create directory
	 *
	 * @param  string  parent directory hash
	 * @param  string  new directory name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function mkdir($hash, $name) {
		
	}

	/**
	 * Create empty file
	 *
	 * @param  string  parent directory hash
	 * @param  string  new file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function mkfile($hash, $name) {
		
	}

	/**
	 * Remove directory/file
	 *
	 * @param  string  directory/file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function rm($hash) {
		
	}

	/**
	 * Rename directory/file
	 *
	 * @param  string  directory/file hash
	 * @param  string  new name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function rename($hash, $name) {
		
	}

	/**
	 * Create directory/file copy
	 *
	 * @param  string  directory/file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function duplicate($hash) {
		
	}

	/**
	 * Copy file into required directory
	 *
	 * @param  resource  file to copy descriptor
	 * @param  string    target directory hash
	 * @param  string    file to copy in name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function copy($fp, $hash, $name) {
		
	}
	
	/**
	 * Return file content
	 *
	 * @param  string  file hash
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function getContent($hash) {
		
	}

	/**
	 * Write content into file
	 *
	 * @param  string  file hash
	 * @param  string  new content
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function setContent($hash, $content) {
		
	}

	/**
	 * Create archive from required directories/files
	 *
	 * @param  array   files hashes
	 * @param  string  archive name
	 * @param  string  archive mimetype
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function archive($files, $name, $type) {
		
	}

	/**
	 * Extract files from archive
	 *
	 * @param  string  archive hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function extract($hash) {
		
	}
	
	/**
	 * Resize image
	 *
	 * @param  string  image hash
	 * @param  int     new width
	 * @param  int     new height
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function resize($hash, $w, $h) {
		
	}

	/**
	 * Find directories/files by name mask
	 * Not implemented on client side yet
	 * For future version
	 *
	 * @param  string  name mask
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function find($mask) {
		
	}
	
	/**
	 * Return error message from last failed action
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function error() {
		return $this->$error;
	}
	
	/**
	 * Return debug info
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function debug() {
		
	}

	
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
	
}


?>