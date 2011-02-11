<?php

class elFinderStorageLocalFileSystem implements elFinderStorageDriver {
	

	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $sort = 1;
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected static $FILTER_DIRS_ONLY = 1;
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected static $FILTER_FILES_ONLY = 2;
	
	/**
	 * Object configuration
	 *
	 * @var array
	 **/
	protected $options = array(
		'path'         => '',           // directory path
		'URL'          => '',           // root url
		'alias'        => '',           // alias to replace root dir name
		'disabled'     => array(),
		'copyFrom'     => true,
		'copyTo'       => true,
		'treeDeep'     => 1,
		'dotFiles'     => false,        // allow dot files?
		'fileMode'     => 0666,         // new files mode
		'dirMode'      => 0777,         // new dir mode 
		'cryptLib'     => 'auto',
		'fileURL'      => true,         // allow send files urls to frontend?
		'uploadAllow'  => array(),      // mimetypes which allowed to upload
		'uploadDeny'   => array(),      // mimetypes which not allowed to upload
		'uploadOrder'  => 'deny,allow', // order to proccess uploadAllow and uploadAllow options
		'dateFormat'   => 'j M Y H:i',  // files dates format
		'mimeDetect'   => 'auto',       // how to detect mimetype
		'imgLib'       => 'auto',       // image manipulations lib name
		'tmbDir'       => '.tmb',       // directory for thumbnails
		'tmbCleanProb' => 1,            // how frequiently clean thumbnails dir (0 - never, 100 - every init request)
		'tmbAtOnce'    => 5,            // number of thumbnails to generate per request
		'tmbSize'      => 48,           // images thumbnails size (px)
		'read'         => true,         // read permission for root dir itself
		'write'        => true,         // write permission for root dir itself
		'defaults'     => array(        // default permissions 
			'read'  => true,
			'write' => true,
			'rm'    => true
		),
		'perms'        => array()      // individual folders/files permisions    
	);
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $params = array();
	
	/**
	 * Error message from last failed action
	 *
	 * @var string
	 **/
	protected $error = '';
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $prefix = '';
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $today = 0;
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $yesterday = 0;
	
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
	 * @param  array   object configuration
	 * @param  string  unique key to use as prefix in files hashes
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function load(array $opts, $key) {
		$this->prefix = $key;
		$this->options = array_merge($this->options, $opts);
		
		if (empty($this->options['path'])) {
			return false;
		}
		
		$this->options['path'] = $this->normpath($this->options['path']);
		
		if (!is_dir($this->options['path'])) {
			return false;
		}
		
		if (substr($this->options['URL'], -1, 1) != '/') {
			$this->options['URL'] = $this->options['URL'].'/';
		}
		$this->options['read']  = $this->options['read']  && is_readable($this->options['path']);
		$this->options['write'] = $this->options['write'] && is_writable($this->options['path']);
		
		if (!$this->options['read'] && !$this->options['write']) {
			return false;
		}
		
		$this->options['dirname']    = dirname($this->options['path']);
		$this->options['basename']   = !empty($this->options['alias']) ? $this->options['alias'] : basename($this->options['path']);
		$this->options['mimeDetect'] = $this->mimeDetect($this->options['mimeDetect']);
		$this->options['cryptLib']   = $this->cryptLib($this->options['cryptLib']);

		if ($this->options['tmbDir']) {
			$dir = $this->options['path'].DIRECTORY_SEPARATOR.$this->options['tmbDir'];
			$this->options['tmbDir'] = is_dir($dir) || @mkdir($dir, $this->options['dirMode']) ? $dir : '';
			if ($this->options['tmbDir']) {
				$this->options['imgLib'] = $this->imageLib($this->options['imgLib']);
			}
			// @TODO  clean tmb dir
		}
		
		$this->params = array(
			'dotFiles'   => $this->options['dotFiles'],
			'disabled'   => $this->options['disabled'],
			'archives'   => array(),
			'extract'    => array(),
			'url'        => $this->options['fileURL'] ? $this->options['URL'] : ''
		);
		
		$this->today = mktime(0,0,0, date('m'), date('d'), date('Y'));
		$this->yesterday = $this->today-86400;
		return true;
	}
	
	/**
	 * Return true if file exists
	 *
	 * @param  string  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function fileExists($hash) {
		return file_exists($this->decode($hash));
	}
	
	/**
	 * Return true if file is ordinary file
	 *
	 * @param  string  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isFile($hash) {
		return is_file($this->decode($hash));
	}
	
	/**
	 * Return true if file is directory
	 *
	 * @param  string  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isDir($hash) {
		return is_dir($this->decode($hash));
	}
	
	/**
	 * Return true if file is readable
	 *
	 * @param  string  file hash (use "/" to test root dir)
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isReadable($hash) {
		$path = !$hash || $hash == '/' ? $this->options['path'] : $this->decode($hash);
		return $this->accepted($path) && $this->allowed($path, 'read');
	}
	
	/**
	 * Return true if file is writable
	 *
	 * @param  string  file hash (use "/" to test root dir)
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isWritable($hash) {
		$path = !$hash || $hash == '/' ? $this->options['path'] : $this->decode($hash);
		return $this->accepted($path) && $this->allowed($path, 'write');
	}
	
	/**
	 * Return true if file can be removed
	 *
	 * @param  string  file hash (use "/" to test root dir)
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isRemovable($hash) {
		$path = !$hash || $hash == '/' ? $this->options['path'] : $this->decode($hash);
		return $this->accepted($path) && $this->allowed($path, 'rm');
	}

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function rootHash() {
		return $this->encode($this->options['path']);
	}

	/**
	 * Return directory info
	 *
	 * @param  string  directory hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function dirInfo($hash) {
		$path = $this->decode($hash);
		$link = false;
		
		if (filetype($path) == 'link') {
			if (false === ($path = $this->readlink($path))) {
				return $this->setError('Access denied');
			}
			$link = true;
		}
		
		if (!is_dir($path)) {
			return $this->setError('Invalid parameters');
		}
		
		if (!$this->accepted($path) || !$this->allowed($path, 'read')) {
			return $this->setError('Access denied');
		}

		$info = $this->info($path);
		if ($path != $this->options['path']) {
			$info['phash'] = $this->decode(dirname($path));
		}
		
		$info['url']    = $this->path2url($path).'/';
		$info['params'] = $this->params;
		// $info['link']   = $link;
		
		return $info;
	}
	
	
	/**
	 * Return directory content
	 *
	 * @param  string  directory hash
	 * @param  string  sort rule
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function dirContent($hash, $sort) {
		$files = array();
		$path  = $this->decode($hash);
		
		if (!is_dir($path)) {
			return $this->setError('Invalid parameters');
		}
		if (!$this->accepted($path) || !$this->allowed($path, 'read')) {
			return $this->setError('Access denied');
		}
		
		foreach ($this->ls($path) as $file) {
			$files[] = $this->info($file);
		}
		
		$this->sort = $sort;
		usort($files, array($this, 'compare'));
		return $files;
	}

	/**
	 * Return directory subdirs.
	 * Return one-level array, each dir contains parent dir hash
	 *
	 * @param  string  directory hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function tree($root) {
		$path = $this->decode($root);

		if (!is_dir($path)) {
			return $this->setError('Invalid parameters');
		}
		if (!$this->accepted($path)) {
			return $this->setError('Access denied');
		}
		// @TODO check parents for read
		
		$tree = $this->getTree($path, $this->options['treeDeep']);
		// debug($tree);
		return $tree;
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
		$path = $this->decode($hash);
		
		if (!is_dir($path)) {
			return $this->setError('Invalid parameters');
		}
		if (!is_readable($path)) {
			return $this->setError('Access denied');
		}
		
		if (!$this->options['imgLib']) {
			return array();
		}
		
		$count  = $this->options['tmbAtOnce'] > 0 ? $this->options['tmbAtOnce'] : 5;
		$files  = $this->ls($path, self::$FILTER_FILES_ONLY);
		$result = array(
			'current' => $hash, 
			'images'  => array(),
			'tmb'     => false
			);
			
		for ($i = 0, $s = count($files); $i < $s; $i++) {
			$file = $files[$i];
			$mime = $this->mimetype($file);
			
			if ($this->allowed($file, 'read') && $this->resizable($mime)) {
				$tmb = $this->tmbPath($file);
				if (!file_exists($tmb)) {
					if ($count > 0) {
						if ($this->thumbnail($file, $tmb)) {
							$result['images'][$this->encode($file)] = $this->path2url($tmb);
							// $result['images'][] = array('hash' => $this->encode($file), 'tmb' => $this->path2url($tmb));
							$count--;
						}
					} else {
						$result['tmb'] = true;
						break;
					}
				}
			}
		}
		return $result;
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
	/*                                protected                                */
	/***************************************************************************/
	
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
	 * Return true if required action available for file
	 *
	 * @param  string  file path
	 * @param  string  action (read|write|rm)
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function allowed($path, $action) {
		
		if ($path == $this->options['path']) {
			return $action == 'read' ? $this->options['read'] : ($action == 'write' ? $this->options['write'] : false);
		}
		
		if (($action == 'read'  && !is_readable($path))
		||  ($action == 'write' && !is_writable($path))
		||  ($action == 'rm'    && !is_writable(dirname($path)))) {
			return false;
		}
		
		$path = substr($path, strlen($this->options['path'])+1);

		foreach ($this->options['perms'] as $regexp => $rules) {
			if (preg_match($regexp, $path)) {
				if (isset($rules[$action])) {
					return $rules[$action];
				}
			}
		}
		return isset($this->options['defaults'][$action]) ? $this->options['defaults'][$action] : false;
	}
	

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function info($path) {
		$root = $path == $this->options['path'];
		$name = $root ? $this->options['basename'] : basename($path);
		// $rel  = DIRECTORY_SEPARATOR.$this->options['basename'].substr($path, strlen($this->options['path']));
		$type = filetype($path);
		// use != 'link' - http://ru2.php.net/manual/en/function.filetype.php#100319
		$stat = $type != 'link' ? @stat($path) : @lstat($path);
		
		if ($stat['mtime'] > $this->today) {
			$date = 'Today '.date('H:i', $stat['mtime']);
		} elseif ($stat['mtime'] > $this->yesterday) {
			$date = 'Yesterday '.date('H:i', $stat['mtime']);
		} else {
			$date = date($this->options['dateFormat'], $stat['mtime']);
		}

		$info = array(
			'name'  => htmlspecialchars($name),
			'hash'  => $this->encode($path),
			'mime'  => $type == 'dir' ? 'directory' : $this->mimetype($path),
			// 'rel'   => $rel,
			'date'  => $date, 
			'size'  => $type == 'dir' ? 0 : $stat['size'],
			'read'  => $this->allowed($path, 'read'),
			'write' => $this->allowed($path, 'write'),
			'rm'    => $this->allowed($path, 'rm'),
			);
			
		if ($type == 'link') {
			if (false === ($link = $this->readlink($path))) {
				$info['mime']  = 'symlink-broken';
				$info['read']  = false;
				$info['write'] = false;
			} else {
				$info['mime'] = $this->mimetype($link);
				$info['link'] = $this->encode($link);
				$info['linkTo'] = DIRECTORY_SEPARATOR.$this->options['basename'].substr($link, strlen($this->options['path']));
				$info['path'] = $link;
			}
		}
			
		if ($info['mime'] != 'directory' && $info['read']) {
			// if ($this->options['fileURL'] && $this->allowed($path, 'read')) {
			// 	$info['url'] = $this->path2url($path);
			// }
			
			if (strpos($info['mime'], 'image') === 0 && false != ($s = getimagesize($path))) {
				$info['dim'] = $s[0].'x'.$s[1];
				if ($this->resizable($info['mime'])) {
					$info['resize'] = true;
					if (($tmb = $this->tmbPath($path)) != '') {
						$info['tmb'] = file_exists($tmb) ? $this->path2url($tmb) : true;
						// if (file_exists($tmb)) {
						// 	$info['tmb'] = $this->path2url($tmb);
						// } else {
						// 	$info['createTmb'] = true;
						// }
						// $info['tmb'] = file_exists($tmb) ? $this->path2url($tmb) : true;
					}
					// $info['tmbfile'] = $this->path2url($tmb);
					// $info['tmbDir'] = $this->options['tmbDir'];
				}
			}
			
		}
			
		return $info;
	}
	

	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function readlink($path) {
		$target = @readlink($path);
		if ($target) {
			if ('/' != substr($target, 0, 1)) {
				$target = dirname($path).DIRECTORY_SEPARATOR.$target;
			}
			$target = $this->normpath($target);
		}
		return $target && file_exists($target) && $this->accepted($target) && strpos($target, $this->options['path']) === 0 ? $target : false;
	}
	
	/**
	 * Return [filtered] directory content 
	 *
	 * @param  string  directory path
	 * @param  int     filter (self::$FILTER_DIRS_ONLY|self::$FILTER_FILES_ONLY)
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function ls($path, $filter=0) {
		$ret = array();
		$ls  = scandir($path);
		
		for ($i=0, $s = count($ls); $i < $s; $i++) { 
			if ($this->accepted($ls[$i])) {
				$p = $path.DIRECTORY_SEPARATOR.$ls[$i];
				$allow = true;
				if ($filter == self::$FILTER_DIRS_ONLY) {
					$allow = is_dir($p) && (filetype($p) != 'link' || false != $this->readlink($p));
				} elseif ($filter == self::$FILTER_FILES_ONLY) {
					$allow = !is_dir($p);
				}
				
				if ($allow) {
					$ret[] = $p;
				}
			}
		}
		return $ret;
	}
	
	/**
	 * Return required dir childs dirs
	 *
	 * @param  strng  dir path
	 * @param  int    level counter (decrease on each next level)
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function getTree($path, $level) {
		$hash   = $this->encode($path);
		$root   = $path == $this->options['path'];
		$read   = $this->allowed($path, 'read');
		$childs = $read ? $this->ls($path, self::$FILTER_DIRS_ONLY) : array();

		$tree = array(
			array(
				'hash'   => $hash,
				'phash'  => $root ? null : $this->encode(dirname($path)),
				'name'   => $root ? $this->options['basename'] : basename($path),
				'read'   => $read,
				'write'  => $this->allowed($path, 'write'),
				'childs' => count($childs) > 0,
				'link'   => filetype($path) == 'link'
			)
		);
		
		if ($level > 0) {
			foreach ($childs as $path) {
				$read   = $this->allowed($path, 'read');
				$childs = $read ? $this->ls($path, self::$FILTER_DIRS_ONLY) : array();
				$tree[] = array(
					'hash'   => $this->encode($path),
					'phash'  => $hash,
					'name'   => basename($path),
					'read'   => $read,
					'write'  => $this->allowed($path, 'write'),
					'childs' => count($childs) > 0,
					'link'   => filetype($path) == 'link'
				);
				
				if (count($childs)) {
					$tree = array_merge($tree, $this->getTree($path, $level-1));
				}
			}
		}
		return $tree;
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
	 * Return file URL
	 *
	 * @param  string  $path 
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function path2url($path) {
		$dir  = substr(dirname($path), strlen($this->options['path'])+1);
		$file = rawurlencode(basename($path));
		return $this->options['URL'].($dir ? str_replace(DIRECTORY_SEPARATOR, '/', $dir).'/' : '').$file;
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
				// if (filetype($path) == 'dir') {
				// 	$type = 'directory';
				// } else {
					$pinfo = pathinfo($path); 
					$ext   = isset($pinfo['extension']) ? strtolower($pinfo['extension']) : '';
					$type  = isset($this->mimetypes[$ext]) ? $this->mimetypes[$ext] : 'unknown;';
					
				// }
		}
		$type = explode(';', $type); 
		return $type[0];
		
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function encode($path) {
		// cut ROOT from $path for security reason, even if hacker decodes the path he will not know the root
		$path = substr($path, strlen($this->options['path']));
		// $cutRoot = substr($path, strlen($this->_options['root']));

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

		// $this->_result['debug']['crypt_'.$hash] = $cutRoot;

		return $hash;
		
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function decode($hash) {
		// echo $hash.'<br>';
		// remove prefix
		$hash = substr($hash, strlen($this->prefix));
		// echo $hash.'<br>';
		// replace HTML safe base64 to normal
		$hash = base64_decode(strtr($hash, '-_.', '+/='));
		// echo $hash.'<br>';
		// TODO uncrypt hash and return path
		$path = $this->uncrypt($hash);

		// append ROOT to path after it was cut in _crypt
		return $this->options['path'].($path == '/' ? '' : $path);
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
	 * Return true if file image and can be resized
	 *
	 * @param  string  file mimetype
	 * @return bool
	 * @author Dmitry Levashov
	 **/
	protected function resizable($mime) {
		return $this->options['imgLib'] && strpos($mime, 'image') === 0
			? ($this->options['imgLib'] == 'gd' ? $mime == 'image/jpeg' || $mime == 'image/png' || $mime == 'image/gif' : true) 
			: false;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function tmbPath($path) {
		if ($this->options['tmbDir']) {
			return dirname($path) == $this->options['tmbDir']
				? $path
				: $this->options['tmbDir'].DIRECTORY_SEPARATOR.$this->encode($path).'.png';
		}
		return '';
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function thumbnail($path, $tmb) {
		if (false == ($s = getimagesize($path))) {
			return false;
		}
		$tmbSize = $this->options['tmbSize'];
		
		switch ($this->options['imgLib']) {
			case 'imagick':
				try {
					$img = new imagick($path);
				} catch (Exception $e) {
					return false;
				}
				
				$img->contrastImage(1);
				return $img->cropThumbnailImage($tmbSize, $tmbSize) && $img->writeImage($tmb);
				break;
				
			case 'mogrify':
				if (@copy($path, $tmb)) {
					list($x, $y, $size) = $this->cropPos($s[0], $s[1]);
					// exec('mogrify -crop '.$size.'x'.$size.'+'.$x.'+'.$y.' -scale '.$tmbSize.'x'.$tmbSize.'! '.escapeshellarg($tmb), $o, $c);
					exec('mogrify -resize '.$tmbSize.'x'.$tmbSize.'^ -gravity center -extent '.$tmbSize.'x'.$tmbSize.' '.escapeshellarg($tmb), $o, $c);
					
					if (file_exists($tmb)) {
						return true;
					} elseif ($c == 0) {
						// find tmb for psd and animated gif
						$mime = $this->mimetype($img);
						if ($mime == 'image/vnd.adobe.photoshop' || $mime = 'image/gif') {
							$pinfo = pathinfo($tmb);
							$test = $pinfo['dirname'].DIRECTORY_SEPARATOR.$pinfo['filename'].'-0.'.$pinfo['extension'];
							if (file_exists($test)) {
								return rename($test, $tmb);
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
				} 
				if ($img &&  false != ($tmp = imagecreatetruecolor($tmbSize, $tmbSize))) {
					list($x, $y, $size) = $this->cropPos($s[0], $s[1]);
					if (!imagecopyresampled($tmp, $img, 0, 0, $x, $y, $tmbSize, $tmbSize, $size, $size)) {
						return false;
					}
					$r = imagepng($tmp, $tmb, 7);
					imagedestroy($img);
					imagedestroy($tmp);
					return $r;
				}
				
				return false;
		}
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
	 * Return mime detect available method
	 *
	 * @param  string  required mimetype detect method
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mimeDetect($type) {
		$regexp = '/text\/x\-(php|c\+\+)/';
		$mimes  = array(
			'finfo' => '',
			'mime_content_type' => '',
			'internal' => 'text/x-c++'
		);
		
		if (class_exists('finfo')) {
			$finfo = finfo_open(FILEINFO_MIME);
			$mime  = @finfo_file($finfo, __FILE__);
			$mime  = explode(';', $mime);
			$mimes['finfo']  = $mime[0];
		}
		
		if (function_exists('mime_content_type')) {
			$mime = mime_content_type(__FILE__);
			$mime = explode(';', $mime);
			$mimes['mime_content_type']  = $mime[0];
		}
		
		// test required type
		if (!empty($mimes[$type]) && preg_match($regexp, $mimes[$type])) {
			return $type;
		}
		// find best available type
		foreach ($mimes as $type => $mime) {
			if (preg_match($regexp, $mime)) {
				return $type;
			}
		}
	}
	
	/**
	 * Return available image manipulations lib
	 *
	 * @param  string  required lib
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function imageLib($lib) {
		$libs = array(
			'imagick' => extension_loaded('imagick'),
			'mogrify' => false,
			'gd'      => function_exists('gd_info')
		);
		
		if (!empty($libs[$lib])) {
			return $lib;
		}
		
		foreach ($libs as $lib => $exists) {
			if ($exists) {
				return $lib;
			}
		}
		return '';
	}
	
	/**
	 * Return available crypt lib - not implemented yet
	 *
	 * @param  string  required lib
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function cryptLib($lib) {
		return '';
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
	
	/**
	 * Method to sort files 
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
		
		if ($this->sort <= elFInder::$SORT_SIZE_DIRS_FIRST && $d1 != $d2) {
			return $d1 ? -1 : 1;
		}
		
		if (($this->sort == elFInder::$SORT_KIND_DIRS_FIRST || $this->sort == elFInder::$SORT_KIND) && $m1 != $m2) {
			return strcmp($m1, $m2);
		}
		
		if (($this->sort == elFInder::$SORT_SIZE_DIRS_FIRST || $this->sort == elFInder::$SORT_SIZE) && $s1 != $s2) {
			return $s1 < $s2 ? -1 : 1;
		}
		
		return strcmp($f1['name'], $f2['name']);
	}
	
}


?>