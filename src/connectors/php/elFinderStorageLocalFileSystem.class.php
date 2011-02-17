<?php

/**
 * undocumented class
 *
 * @package default
 * @author Dmitry Levashov
 **/
class elFinderStorageLocalFileSystem extends elFinderStorageDriver {
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected static $mimetypesLoaded = false;
	
	/**
	 * extensions/mimetypes for mimeDetect == 'internal' 
	 *
	 * @var array
	 **/
	protected static $mimetypes = array(
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
	 * Constructor
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function __construct($id, $opts) {
		$o = array(
			'cryptLib'     => 'auto',  // how crypt paths? not implemented yet
			'mimeDetect'   => 'auto',  // how to detect mimetype
			'imgLib'       => 'auto',  // image manipulations lib name
			'tmbCleanProb' => 0,       // how frequiently clean thumbnails dir (0 - never, 100 - every init request)
			'dotFiles'     => false,   // allow dot files?
			'accepted'     => '',      // regexp to validate filenames
			'perms'        => array(), // individual folders/files permisions
		);
		
		// extend parent options
		parent::__construct($id, array_merge($o, $opts));
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
		
		if ($path == $this->options['path']) {
			if ($action == 'read' || $action == 'write') {
				return $this->options['defaults'][$action];
			}
			return false;
		}
		
		$path = substr($path, strlen($this->options['path'])+1);

		foreach ($this->options['perms'] as $regexp => $rules) {
			if (preg_match($regexp, $path) && isset($rules[$action])) {
				return $rules[$action];
			}
		}
		return isset($this->options['defaults'][$action]) ? $this->options['defaults'][$action] : false;
	}
	
	
	
	
	/**
	 * Define mimetype detect method, tmbDir, tmbURL, imgLib options
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	protected function _configure() {
		// define crypt lib - not implemented
		$this->options['cryptLib'] = '';
		
		// define mime detect method
		$regexp = '/text\/x\-(php|c\+\+)/';
		$mimes  = array(
			'finfo' => class_exists('finfo') ? array_shift(explode(';', @finfo_file(finfo_open(FILEINFO_MIME), __FILE__))) : '',
			'mime_content_type' => function_exists('mime_content_type') ? array_shift(explode(';', mime_content_type(__FILE__))) : '',
			'internal' => 'text/x-php'
		);
		$type = $this->options['mimeDetect'];
		$this->options['mimeDetect'] = 'internal';
		
		// test required type
		if (!empty($mimes[$type]) && preg_match($regexp, $mimes[$type])) {
			$this->options['mimeDetect'] = $type;
		} else {
			// find first available type
			foreach ($mimes as $type => $mime) {
				if (preg_match($regexp, $mime)) {
					$this->options['mimeDetect'] = $type;
					break;
				}
			}
		}
		
		// load mimes from external file for mimeDetect = 'internal'
		// based on Alexey Sukhotin idea and patch: http://elrte.org/redmine/issues/163
		if ($this->options['mimeDetect'] == 'internal' && !elFinderStorageLocalFileSystem::$mimetypesLoaded) {
			$file = !empty($this->options['mimefile']) 
				? $this->options['mimefile'] 
				: dirname(dirname(__FILE__)).DIRECTORY_SEPARATOR.'mime.types';

			if ($file && file_exists($file)) {
				$mimecf = file($file);
				
				foreach ($mimecf as $line_num => $line) {
					if (!preg_match('/^\s*#/', $line)) {
						$mime = preg_split('/\s+/', $line, -1, PREG_SPLIT_NO_EMPTY);
						for ($i = 1, $size = count($mime); $i < $size ; $i++) {
							elFinderStorageLocalFileSystem::$mimetypes[$mime[$i]] = $mime[0];
						}
					}
				}
				
				elFinderStorageLocalFileSystem::$mimetypesLoaded = true;
			}
		}
		
		// define thumbnails dir
		if ($this->options['tmbDir']) {
			
			$path = strpos($this->options['tmbDir'], DIRECTORY_SEPARATOR) === false
				? $this->options['path'].DIRECTORY_SEPARATOR.$this->options['tmbDir'] // tmbDir set as dir name
				: $this->normpath($this->options['tmbDir']);  // tmbDir set as path

			if (!file_exists($path)) {
				$path = $this->_mkdir($path) ? $path : '';
			}
			if ($path && (!is_dir($path) || !is_readable($path))) {
				$path = '';
			}	
			// echo $path;	
			if (!$path) {
				$this->options['tmbURL'] = '';
			} elseif (!$this->options['tmbURL'] && strpos($path, $this->options['path']) === 0 && $this->options['defaults']['read']) {
				$this->options['tmbURL'] = $this->options['URL'].str_replace(DIRECTORY_SEPARATOR, '/', substr($path, strlen($this->options['path'])+1));
			}
			
			$this->options['tmbDir'] = $this->options['tmbURL'] ? $path : '';
		}
		
		// define lib to work with images
		$libs = array();
		if (extension_loaded('imagick')) {
			$libs[] = 'imagick';
		}
		if (function_exists('exec')) {
			exec('mogrify --version', $o, $c);
			if ($c == 0) {
				$libs[] = 'mogrify';
			}
		}
		if (function_exists('gd_info')) {
			$libs[] = 'gd';
		}
		
		$this->options['imgLib'] = in_array($this->options['imgLib'], $libs) 
			? $this->options['imgLib'] 
			: array_shift($libs);
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
	 * Return true if file name is not . or ..
	 * If file name begins with . return value according to $this->options['dotFiles']
	 * If set rule to validate filename - check it
	 *
	 * @param  string  $file  file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _accepted($path) {
		$filename = basename($path);
		if ($filename == '.' || $filename == '..') {
			return false;
		}
		if ('.' != substr($filename, 0, 1)) {
			return !!$this->options['dotFiles'];
		}
		
		return !empty($this->options['accepted']) ? preg_match($this->options['accepted'], $filename) : true;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _fileExists($path) {
		return file_exists($path);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _isFile($path) {
		return is_file($path);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _isDir($path) {
		return is_dir($path);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _isLink($path) {
		return is_link($path);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _isReadable($path) {
		return is_readable($path) && $this->allowed($path, 'read');
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _isWritable($path) {
		return is_writable($path) && $this->allowed($path, 'write');
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _isRemovable($path) {
		return $this->allowed($path, 'rm');
	}
	
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _mkdir($path) {
		return mkdir($path);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _touch($path) {
		return touch($path);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _symlink($target, $link) {
		return symlink($target, $link);
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
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _readlink($path) {
		return readlink($path);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _fopen($path, $mode) {
		return fopen($path, $mode);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _fclose($path) {
		return fclose($fp);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _scandir($path) {
		return array();
	}

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _tree($path) {
		return array();
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _stat($path) {
		return stat($path);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _mimetype($path) {
		switch ($this->options['mimeDetect']) {
			case 'finfo':
				if (empty($this->_finfo)) {
					$this->_finfo = finfo_open(FILEINFO_MIME);
				}
				$type = @finfo_file($this->_finfo, $path);
				break;
			case 'mime_content_type':   
			 	$type = mime_content_type($path);
				break;
			default:
				$pinfo = pathinfo($path); 
				$ext   = isset($pinfo['extension']) ? strtolower($pinfo['extension']) : '';
				$type  = isset($this->mimetypes[$ext]) ? $this->mimetypes[$ext] : 'unknown;';
		}
		$type = array_shift(explode(';', $type)); 
		
		if ($type == 'unknown' && $this->_isDir($path)) {
			$type = 'directory';
		} elseif ($type == 'application/x-zip') {
			// http://elrte.org/redmine/issues/163
			$type = 'application/zip';
		}
		return $type;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _info($path) {
		return array();
	}

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _copy($from, $to) {
		return false;
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
	protected function _tmb($path, $tmb) {
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
	
	
	
} // END class 



?>