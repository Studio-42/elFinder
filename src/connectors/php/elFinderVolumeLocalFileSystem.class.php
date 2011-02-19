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
			'tmbAtOnce'    => 12,           // number of thumbnails to generate per request
			'tmbSize'      => 48,           // images thumbnails size (px)
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
				? $this->root.DIRECTORY_SEPARATOR.$this->options['tmbDir'] // tmbDir set as dir name
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
		return strpos($path, $parent) === 0;
	}
	
	/**
	 * Return path related to root path
	 *
	 * @param  string  $path  fuke path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _relpath($path) {
		return substr($path, strlen($this->root)+1);
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
	protected function _scandir($path, $filter=0) {
		$ret = array();
		$ls  = scandir($path);
		
		for ($i = 0, $s = count($ls); $i < $s; $i++) {
			$p = $path.DIRECTORY_SEPARATOR.$ls[$i];
			if ($this->_accepted($ls[$i])) {
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
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _tree($path, $level) {
		$read   = $this->_isReadable($path);
		$childs = $read ? $this->_scandir($path, self::$FILTER_DIRS_ONLY) : array();
		
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
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _mkdir($path) {
		if (@mkdir($path)) {
			chmod($path, $this->options['dirMode']);
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
	protected function _touch($path) {
		if (@touch($path)) {
			chmod($path, $this->options['fileMode']);
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