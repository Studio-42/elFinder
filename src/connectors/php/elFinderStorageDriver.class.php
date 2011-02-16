<?php
/**
 * Based class for elFinder storages.
 * Realize all storage logic.
 * Create abstraction level under base file sistem operation (like mkdir etc.), 
 * which must be implemented in childs classes 
 *
 * @author Dmitry (dio) Levashov
 * @author Troex Nevelin
 * @author Alexey Sukhotin
 **/
abstract class elFinderStorageDriver {
	/**
	 * Filter directory content rule
	 *
	 * @var int
	 **/
	protected static $FILTER_DIRS_ONLY = 1;
	
	/**
	 * Filter directory content rule
	 *
	 * @var int
	 **/
	protected static $FILTER_FILES_ONLY = 2;
	
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_NAME_DIRS_FIRST = 1;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_KIND_DIRS_FIRST = 2;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_SIZE_DIRS_FIRST = 3;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_NAME            = 4;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_KIND            = 5;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_SIZE            = 6;
	
	/**
	 * Storage id - used as prefix for files hashes
	 *
	 * @var string
	 **/
	protected $id = '';
	
	/**
	 * Error message from last failed action
	 *
	 * @var string
	 **/
	protected $error = '';
	
	/**
	 * Today 24:00 timestamp
	 *
	 * @var int
	 **/
	protected $today = 0;
	
	/**
	 * Yestoday 24:00 timestamp
	 *
	 * @var int
	 **/
	protected $yesterday = 0;
	
	/**
	 * Some options sending to client
	 *
	 * @var array
	 **/
	protected $params = array();
	
	/**
	 * Flag - is storage loaded correctly
	 *
	 * @var bool
	 **/
	protected $available = false;
	
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
	 * Object configuration
	 *
	 * @var array
	 **/
	protected $options = array(
		'path'         => '',           // root path
		'alias'        => '',           // alias to replace root dir name
		'URL'          => '',           // root url, not set to disable sending URL to client (replacement for old "fileURL" option)
		'disabled'     => array(),      // list of commands names to disable on this root
		'mimeDetect'   => 'auto',       // how to detect mimetype
		'cryptLib'     => 'auto',       // how crypt paths? not implemented yet
		'imgLib'       => 'auto',       // image manipulations lib name
		'tmbDir'       => '.tmb',       // directory for thumbnails
		'tmbURL'       => '',           // thumbnails dir URL, set your thumbnails dir is outside root directory
		'tmbCleanProb' => 0,            // how frequiently clean thumbnails dir (0 - never, 100 - every init request)
		'tmbAtOnce'    => 12,           // number of thumbnails to generate per request
		'tmbSize'      => 48,           // images thumbnails size (px)
		'dotFiles'     => false,        // allow dot files?
		'uploadAllow'  => array(),      // mimetypes which allowed to upload
		'uploadDeny'   => array(),      // mimetypes which not allowed to upload
		'uploadOrder'  => 'deny,allow', // order to proccess uploadAllow and uploadAllow options
		'defaults'     => array(        // default permissions 
			'read'  => true,
			'write' => true,
			'rm'    => true
		),
		'perms'        => array(),      // individual folders/files permisions
		'treeDeep'     => 1,            // how many subdirs levels return
		'dateFormat'   => 'j M Y H:i',  // files dates format
		
		'copyFrom'     => true,
		'copyTo'       => true,
	);
	
	
	
	/**
	 * Constuctor
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function __construct($id, array $opts) {
		$this->id = $key;
		$this->options = array_merge($this->options, $opts);
		$this->options['path'] = empty($this->options['path']) ? '' : $this->normpath($this->options['path']);
		
		if (!$this->_isDir($this->options['path']) || (!$this->_isReadable($path) && !$this->_isWritable($path))) {
			return;
		}
		
		if ($this->options['URL'] && substr($this->options['URL'], -1, 1) != '/') {
			$this->options['URL'] .= '/';
		}
		$this->options['dirname']  = dirname($this->options['path']);
		$this->options['basename'] = !empty($this->options['alias']) ? $this->options['alias'] : basename($this->options['path']);
		
		$this->setCryptLib();
		$this->setTmbDir();
		$this->setImageLib();
		$this->setMimeDetect();
		
		$this->available = true;
	}
	
	/**
	 * Return true if storage available to work with
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function available() {
		return $this->available;
	}
	
	/**
	 * Return error message from last failed action
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function error() {
		return $this->error;
	}
	
	/**
	 * Return debug info
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function debug() {
		return array(
			'root'       => $this->options['basename'],
			'driver'     => 'LocalFileSystem',
			'mimeDetect' => $this->options['mimeDetect'],
			'imgLib'     => $this->options['imgLib']
		);
	}
	
	/***************************************************************************/
	/*                                utilites                                 */
	/***************************************************************************/
	
	
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
	 * Crypt path and encode to base64
	 *
	 * @param  string  file path
	 * @return string
	 * @author Troex Nevelin
	 **/
	protected function encode($path) {
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
		$hash = $this->prefix.strtr(base64_encode($hash), '+/=', '-_.');
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
	protected function decode($hash) {
		// remove prefix
		$hash = substr($hash, strlen($this->prefix));
		// replace HTML safe base64 to normal
		$hash = base64_decode(strtr($hash, '-_.', '+/='));
		// TODO uncrypt hash and return path
		$path = $this->uncrypt($hash);

		// append ROOT to path after it was cut in _crypt
		return $this->options['path'].($path == '/' ? '' : $path);
	}
	
	/**
	 * Return true if file name is not . or ..
	 * If file name begins with . return value according to $this->options['dotFiles']
	 *
	 * @param  string  $file  file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function accepted($path) {
		$filename = basename($path);
		return '.' != $filename && '..' != $filename && ($this->options['dotFiles'] || '.' != substr($filename, 0, 1)) ;
	}
	
	/**
	 * Return crypted path 
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
	 *
	 * @param  mixed  hash
	 * @return mixed
	 * @author Dmitry (dio) Levashov
	 **/
	protected function uncrypt($hash) {
		return $hash;
	}
	
	/**
	 * Return file mimetype
	 *
	 * @param  string  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mimetype($path) {
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
		$type = explode(';', $type); 
		$type = $type[0];
		
		if ($type == 'unknown' && $this->isDir($path)) {
			$type = 'directory';
		} elseif ($type == 'application/x-zip') {
			// http://elrte.org/redmine/issues/163
			$type = 'application/zip';
		}
		return $type;
	}
	
	/**
	 * Sort files 
	 *
	 * @param  object  file to compare
	 * @param  object  file to compare
	 * @return int
	 * @author Dmitry (dio) Levashov
	 **/
	protected function compare($f1, $f2) {
		$d1 = $f1['mime'] == 'directory';
		$d2 = $f2['mime'] == 'directory';
		$m1 = $f1['mime'];
		$m2 = $f2['mime'];
		$s1 = $f1['size'];
		$s2 = $f2['size'];
		
		if ($this->sort <= self::$SORT_SIZE_DIRS_FIRST && $d1 != $d2) {
			return $d1 ? -1 : 1;
		}
		
		if (($this->sort == self::$SORT_KIND_DIRS_FIRST || $this->sort == self::$SORT_KIND) && $m1 != $m2) {
			return strcmp($m1, $m2);
		}
		
		if (($this->sort == self::$SORT_SIZE_DIRS_FIRST || $this->sort == self::$SORT_SIZE) && $s1 != $s2) {
			return $s1 < $s2 ? -1 : 1;
		}
		
		return strcmp($f1['name'], $f2['name']);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function setError($msg)	{
		$this->error = $msg;
		return false;
	}
	
	/***************************************************************************/
	/*                              init methods                               */
	/***************************************************************************/
	
	/**
	 * Set mime detect method.
	 * Try to load mimes from external file if mimeDetect == 'internal'
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	protected function setMimeDetect() {
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
		
		// load mimes from external file
		// based on Alexey Sukhotin idea and patch: http://elrte.org/redmine/issues/163
		if ($this->options['mimeDetect'] == 'internal') {
			$file = !empty($this->options['mimefile']) 
				? $this->options['mimefile'] 
				: dirname(dirname(__FILE__)).DIRECTORY_SEPARATOR.'mime.types';

			if ($file && file_exists($file)) {
				$mimecf = file($file);
				
				foreach ($mimecf as $line_num => $line) {
					if (!preg_match('/^\s*#/', $line)) {
						$mime = preg_split('/\s+/', $line, -1, PREG_SPLIT_NO_EMPTY);
						for ($i = 1, $size = count($mime); $i < $arrsize ; $i++) {
							$this->mimetypes[$mime[$i]] = $mime[0];
						}
					}
				}
			}
		}
	}
	
	/**
	 * Set crypt lib - not implemented yet
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function setCryptLib() {
		$this->options['cryptLib'] = '';
	}
	
	/**
	 * Set thumbnails dir and url
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function setTmbDir() {
		
		if ($this->options['tmbDir'] && ($this->options['URL'] || $this->options['tmbURL'])) {
			$path = strpos($this->options['tmbDir'], DIRECTORY_SEPARATOR) === false
				? $this->normpath($this->options['tmbDir'])
				: $this->options['path'].DIRECTORY_SEPARATOR.$this->options['tmbDir'];
				
			if ($this->_fileExists($path)) {
				if (!$this->_isDir($path)) {
					$path = '';
				}
			} elseif (!$this->_mkdir($path)) {
				$path = '';
			}
			
			$this->options['tmbDir'] = $path;
			if ($path && !$this->options['tmbURL']) {
				if (strpos($this->options['tmbDir'], $this->options['path']) === 0) {
					$this->options['tmbURL'] = $this->options['URL'].str_replace(DIRECTORY_SEPARATOR, '/', substr($this->options['tmbURL'], strlen($this->options['path'])));
				}
			}
			
			if ($this->options['tmbURL'] && substr($this->options['tmbURL'], -1, 1) != '/') {
				$this->options['tmbURL'] .= '/';
			}
		}
	}
	
	/**
	 * Set image manipulations library
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function setImageLib() {
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
	

	
	
	/***************************************************************************/
	/*                           abstract methods                              */
	/***************************************************************************/
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _fileExists($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isFile($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isDir($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function isLink($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isReadable($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isWritable($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _isRemovable($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _stat($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _mkdir($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _touch($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _symlink($target, $link);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _rmdir($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _unlink($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _readlink($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _fopen($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _fclose($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _scandir($path);

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _tree($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _info($path);

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _copy($from, $to);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _fileGetContents($path);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _filePutContents($path, $content);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _tmb($path, $tmb);
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	abstract protected function _resizeImg($path, $w, $h);
	
} // END class 

?>