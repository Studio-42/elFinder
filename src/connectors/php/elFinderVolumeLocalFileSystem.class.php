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
	 * Crypt lib name (not implemented)
	 *
	 * @var string
	 **/
	protected $cryptLib = '';
	
	/**
	 * Base path for images thumbnails
	 *
	 * @var string
	 **/
	protected $tmbPath = '';
	
	/**
	 * Mimetype detect method name
	 *
	 * @var string
	 **/
	protected $mimeDetect = 'internal';
	
	/**
	 * Lib to work images name
	 *
	 * @var string
	 **/
	protected $imgLib = '';
	
	/**
	 * Mime types for which thumbnails can be created
	 *
	 * @var array
	 **/
	protected $tmbMimes = array();
	
	/**
	 * Flag - mimetypes from external file already loaded?
	 *
	 * @var string
	 **/
	protected static $mimetypesLoaded = false;
	
	/**
	 * default extensions/mimetypes for mimeDetect == 'internal' 
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
		'xbm'   => 'image/xbm',
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
	 * Return crypted path 
	 * Not implemented
	 *
	 * @param  string  path
	 * @return mixed
	 * @author Dmitry (dio) Levashov
	 **/
	protected function crypt($path) {
		return $path;
	}
	
	/**
	 * Return uncrypted path 
	 * Not implemented
	 *
	 * @param  mixed  hash
	 * @return mixed
	 * @author Dmitry (dio) Levashov
	 **/
	protected function uncrypt($hash) {
		return $hash;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function tmbPath($path) {
		return $this->tmbPath.DIRECTORY_SEPARATOR.md5($path).'.png';
	}
	
	/**
	 * Return x/y coord for crop image thumbnail
	 *
	 * @param  int  $w  image width
	 * @param  int  $h  image height	
	 * @return array
	 **/
	protected function cropPos($w, $h) {
		$x = $y = 0;
		$size = min($w, $h);
		if ($w > $h) {
			$x = ceil(($w - $h)/2);
		} else {
			$y = ceil(($h - $w)/2);
		}
		return array($x, $y, $size);
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
			'mimeDetect'   => 'auto',  // how to detect mimetype
			'tmbDir'       => '.tmb',       // directory for thumbnails
			
			
			'imgLib'       => 'auto',  // image manipulations lib name
			'tmbCleanProb' => 0,       // how frequiently clean thumbnails dir (0 - never, 100 - every init request)
			'dotFiles'     => false,   // allow dot files?
			'accepted'     => '',      // regexp to validate filenames
			'dirMode'      => 0777,
			'fileMode'     => 0666,
			'defaults'     => array(        // default permissions 
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
	 * Define mimetype detect method, tmbDir, tmbURL, imgLib options etc
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
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
		
		// define crypt lib - not implemented
		$this->cryptLib = '';
		
		// define mime detect method
		$regexp = '/text\/x\-(php|c\+\+)/';
		$mimes  = array(
			'finfo' => class_exists('finfo') ? array_shift(explode(';', @finfo_file(finfo_open(FILEINFO_MIME), __FILE__))) : '',
			'mime_content_type' => function_exists('mime_content_type') ? array_shift(explode(';', mime_content_type(__FILE__))) : '',
			'internal' => 'text/x-php'
		);
		$type = $this->options['mimeDetect'];
		
		// test required type
		if (!empty($mimes[$type]) && preg_match($regexp, $mimes[$type])) {
			$this->mimeDetect = $type;
		} else {
			// find first available type
			foreach ($mimes as $type => $mime) {
				if (preg_match($regexp, $mime)) {
					$this->mimeDetect = $type;
					break;
				}
			}
		}

		// load mimes from external file for mimeDetect = 'internal'
		// based on Alexey Sukhotin idea and patch: http://elrte.org/redmine/issues/163
		if ($this->mimeDetect == 'internal' && !elFinderVolumeLocalFileSystem::$mimetypesLoaded) {
			$file = !empty($this->options['mimefile']) 
				? $this->options['mimefile'] 
				: dirname(dirname(__FILE__)).DIRECTORY_SEPARATOR.'mime.types';

			if ($file && file_exists($file)) {
				$mimecf = file($file);
				
				foreach ($mimecf as $line_num => $line) {
					if (!preg_match('/^\s*#/', $line)) {
						$mime = preg_split('/\s+/', $line, -1, PREG_SPLIT_NO_EMPTY);
						for ($i = 1, $size = count($mime); $i < $size ; $i++) {
							elFinderVolumeLocalFileSystem::$mimetypes[$mime[$i]] = $mime[0];
						}
					}
				}
				
				elFinderVolumeLocalFileSystem::$mimetypesLoaded = true;
			}
		}

		// define thumbnails dir/URL
		if ($this->options['tmbDir'] && $this->options['defaults']['read']) {
			
			$this->tmbPath = strpos($this->options['tmbDir'], DIRECTORY_SEPARATOR) === false
				? $this->normpath($this->root.DIRECTORY_SEPARATOR.$this->options['tmbDir']) // tmbDir set as dir name
				: $this->normpath($this->options['tmbDir']);  // tmbDir set as path
			
			if (file_exists($this->tmbPath)) {
				if (!is_dir($this->tmbPath) || !is_readable($this->tmbPath)) {
					$this->tmbPath = '';
				}
			} elseif (!$this->_mkdir($this->tmbPath)) {
				$this->tmbPath = '';
			}
			
			if (!$this->tmbPath) {
				$this->tmbURL = '';
			} elseif (!$this->tmbURL) {
				$this->tmbURL = $this->_inpath($this->tmbPath, $this->root) ? $this->_path2url($this->tmbPath).'/' : '';
			}
			// echo $this->tmbPath;
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
		
		$this->imgLib = in_array($this->options['imgLib'], $libs) 
			? $this->options['imgLib'] 
			: array_shift($libs);
			
		if ($this->imgLib && $this->tmbURL) {
			$this->tmbMimes = $this->imgLib == 'gd' 
				? array('image/jpeg', 'image/png', 'image/gif') 
				: array('image');
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
	 * Crypt path and encode to base64
	 *
	 * @param  string  file path
	 * @return string
	 * @author Troex Nevelin
	 **/
	protected function _encode($path) {
		// cut ROOT from $path for security reason, even if hacker decodes the path he will not know the root
		$path = substr($path, strlen($this->options['path']));

		// if reqesting root dir $cutRoot will be empty, then assign '/' as we cannot leave it blank for crypt
		if (!$path)	{
			$path = '/';
		}

		// TODO crypt path and return hash
		$hash = $this->crypt($path);

		// hash is used as id in HTML that means it must contain vaild chars
		// make base64 html safe and append prefix in begining
		$hash = strtr(base64_encode($hash), '+/=', '-_.');
		$hash = rtrim($hash, '.'); // remove dots '.' at the end, before it was '=' in base64
		return $hash;
	}
	
	/**
	 * Decode path from base64 and decrypt it
	 *
	 * @param  string  file path
	 * @return string
	 * @author Troex Nevelin
	 **/
	protected function _decode($hash) {
		// replace HTML safe base64 to normal
		$hash = base64_decode(strtr($hash, '-_.', '+/='));
		// TODO uncrypt hash and return path
		$path = $this->uncrypt($hash);

		// append ROOT to path after it was cut in _crypt
		return $this->options['path'].($path == '/' ? '' : $path);
	}
	
	/**
	 * Return true if $path is subdir of $parent
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
		return $this->rootName.($path == $this->root ? '' : DIRECTORY_SEPARATOR.$this->_relpath($path));
	}
	
	/**
	 * Convert file path into url
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _path2url($path, $dir=false) {
		if ($this->URL) {
			return $path == $this->root
				? $this->URL
				: $this->URL.str_replace(DIRECTORY_SEPARATOR, '/', $this->_relpath($path)).($dir ? '/' : '');
		}
		return '';
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
		if ('.' == substr($filename, 0, 1)) {
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
	 * Return true if file can be resized by current driver
	 *
	 * @param  string  $path  file path
	 * @param  string  $mime  file mime type
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _isResizable($path, $mime) {
		return $this->imgLib && $this->validMime($mime, $this->tmbMimes);
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
		return filesize($path);
	}
	
	/**
	 * Return file mime type
	 *
	 * @param  string $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _mimetype($path) {

		switch ($this->mimeDetect) {
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
				$type  = isset(self::$mimetypes[$ext]) ? self::$mimetypes[$ext] : 'unknown;';
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

			if (substr($target, 0, 1) == DIRECTORY_SEPARATOR || preg_match('/^[A-Z]\:\\\/', $target)) {
				// absolute path
				$root = realpath($this->root);
				// check for target outside root
				if ($this->_inpath($target, $root)) {
					$link = $this->root.substr($target, strlen($root));
				}
			} else {
				// relative path
				$link = $this->normpath(dirname($path).DIRECTORY_SEPARATOR.$target);
				// check for target outside root
				if (!$this->_inpath($link, $this->root)) {
					$link = false;
				}
			}
		}
		return $link;
	}
	
	/**
	 * Return file thumnbnail URL or true if thumnbnail can be created
	 *
	 * @param  string  $path  thumnbnail path
	 * @return string|bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _tmbURL($path, $mime) {
		if (!empty($this->tmbMimes) && $this->validMime($mime, $this->tmbMimes)) {
			$tmb = $this->tmbPath($path);
			return file_exists($tmb)
				? $this->tmbURL.basename($tmb)
				: $this->_isReadable($path, $mime);
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
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _scandir($path, $filter=0, $accepted = true) {
		$ret = array();
		
		if (($ls  = @scandir($path)) === false) {
			return false;
		}
		
		for ($i = 0, $s = count($ls); $i < $s; $i++) {
			$p = $path.DIRECTORY_SEPARATOR.$ls[$i];
			$a = $accepted ? $this->_accepted($ls[$i]) : ($ls[$i] != '.' && $ls[$i] != '..');
			
			if ($a) {
				if ($filter == self::$FILTER_DIRS_ONLY) {
					if (is_dir($p)) {
						$ret[] = $p;
					}
				} elseif ($filter == self::$FILTER_FILES_ONLY) {
					if (!is_dir($p)) {
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
	 * Return directory subdirs 
	 *
	 * @param  string  $path  directory path
	 * @param  int     $level how many subdirs level to return
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _tree($path, $level) {
		$read   = $this->_isReadable($path);
		if ($read) {
			$childs = $this->_scandir($path, self::$FILTER_DIRS_ONLY);
		}
		if (!is_array($childs)) {
			$childs = array();
		}
		
		$tree = array(
			array(
				'hash'   => $this->encode($path),
				'phash'  => $path == $this->root ? null : $this->encode($this->_dirname($path)),
				'name'   => $this->_basename($path),
				'read'   => $read,
				'write'  => $this->_isWritable($path),
				'childs' => count($childs) > 0,
				'link'   => $this->_isLink($path)
			)
		);

		if ($level > 0) {
			foreach ($childs as $path) {
				$tree = array_merge($tree, $this->_tree($path, $level-1));
			}
		}
		
		return $tree;
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
	 * Open file and return file pointer
	 *
	 * @param  string  $path  file path
	 * @param  bool    $write open file for writing
	 * @return resource|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fopen($path, $write=false) {
		return @fopen($path, $write ? 'wb' : 'rb');
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
	 * Create thumnbnail and return it's URL on success
	 *
	 * @param  string  $path  file path
	 * @param  string  $mime  file mime type
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _tmb($path, $mime) {
		if (!$this->validMime($mime, $this->tmbMimes)) {
			return false;
		}
		if (($s = @getimagesize($path)) == false) {
			return false;
		}
		
		$tmb = $this->tmbPath($path);
		$result = false;
		$tmbSize = $this->options['tmbSize'];
		
		switch ($this->imgLib) {
			case 'imagick':
				try {
					$img = new imagick($path);
				} catch (Exception $e) {
					return false;
				}

				$img->contrastImage(1);
				$result = $img->cropThumbnailImage($tmbSize, $tmbSize) && $img->writeImage($tmb);
				break;
				
			case 'mogrify':
				if (@copy($path, $tmb)) {
					list($x, $y, $size) = $this->cropPos($s[0], $s[1]);
					// exec('mogrify -crop '.$size.'x'.$size.'+'.$x.'+'.$y.' -scale '.$tmbSize.'x'.$tmbSize.'! '.escapeshellarg($tmb), $o, $c);
					exec('mogrify -resize '.$tmbSize.'x'.$tmbSize.'^ -gravity center -extent '.$tmbSize.'x'.$tmbSize.' '.escapeshellarg($tmb), $o, $c);

					if (file_exists($tmb)) {
						$result = true;
					} elseif ($c == 0) {
						// find tmb for psd and animated gif
						if ($mime == 'image/vnd.adobe.photoshop' || $mime = 'image/gif') {
							$pinfo = pathinfo($tmb);
							$test = $pinfo['dirname'].DIRECTORY_SEPARATOR.$pinfo['filename'].'-0.'.$pinfo['extension'];
							if (file_exists($test)) {
								$result = @rename($test, $tmb);
							}
						}
					}
				}
				break;
				
			case 'gd':
				if ($s['mime'] == 'image/jpeg') {
					$img = imagecreatefromjpeg($path);
				} elseif ($s['mime'] == 'image/png') {
					$img = imagecreatefrompng($path);
				} elseif ($s['mime'] == 'image/gif') {
					$img = imagecreatefromgif($path);
				} elseif ($s['mime'] == 'image/xbm') {
					$img = imagecreatefromxbm($path);
				}
				if ($img &&  false != ($tmp = imagecreatetruecolor($tmbSize, $tmbSize))) {
					list($x, $y, $size) = $this->cropPos($s[0], $s[1]);
					if (!imagecopyresampled($tmp, $img, 0, 0, $x, $y, $tmbSize, $tmbSize, $size, $size)) {
						return false;
					}
					$result = imagepng($tmp, $tmb, 7);
					imagedestroy($img);
					imagedestroy($tmp);
				}
				break;
		}
		
		return $result ? $this->tmbURL.basename($tmb) : false;
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