<?php

set_time_limit(0);

class elFinder {
	
	/**
	 * API version number
	 *
	 * @var string
	 **/
	protected $version = '2.0';
	
	/**
	 * Storages (root dirs)
	 *
	 * @var array
	 **/
	protected $volumes = array();
	
	/**
	 * Mounted volumes count
	 * Required to create unique volume id
	 *
	 * @var int
	 **/
	public static $volumesCnt = 1;
	
	/**
	 * Default root (storage)
	 *
	 * @var elFinderStorageDriver
	 **/
	protected $default = null;
	
	/**
	 * Commands and required arguments list
	 *
	 * @var array
	 **/
	protected $commands = array(
		'open'      => array('target' => false, 'tree' => false, 'init' => false, 'mimes' => false),
		'ls'        => array('target' => true, 'mimes' => false),
		'tree'      => array('target' => true),
		'parents'   => array('target' => true),
		'tmb'       => array('targets' => true),
		'file'      => array('target' => true, 'download' => false),
		'size'      => array('targets' => true),
		'mkdir'     => array('target' => true, 'name' => true),
		'mkfile'    => array('target' => true, 'name' => true, 'mimes' => false),
		'rm'        => array('targets' => true),
		'rename'    => array('target' => true, 'name' => true, 'mimes' => false),
		'duplicate' => array('targets' => true, 'suffix' => false),
		'paste'     => array('dst' => true, 'targets' => true, 'cut' => false, 'mimes' => false),
		'upload'    => array('target' => true, 'FILES' => true, 'mimes' => false, 'html' => false),
		'get'       => array('target' => true),
		'put'       => array('target' => true, 'content' => '', 'mimes' => false),
		'archive'   => array('targets' => true, 'type' => true, 'mimes' => false),
		'extract'   => array('target' => true, 'mimes' => false),
		'search'    => array('q' => true, 'mimes' => false),
		'info'      => array('targets' => true),
		'dim'       => array('target' => true),
		'resize'    => array('target' => true, 'width' => true, 'height' => true, 'crop' => false)
	);
	
	/**
	 * Commands listeners
	 *
	 * @var array
	 **/
	protected $listeners = array();
	
	/**
	 * script work time for debug
	 *
	 * @var string
	 **/
	protected $time = 0;
	/**
	 * Is elFinder init correctly?
	 *
	 * @var bool
	 **/
	protected $loaded = false;
	/**
	 * Send debug to client?
	 *
	 * @var string
	 **/
	protected $debug = false;
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $uploadDebug = '';
	
	/**
	 * Store copy files errors
	 *
	 * @var array
	 **/
	protected $copyError = array();
	
	/**
	 * Disabled commands list
	 *
	 * @var array
	 **/
	protected $disabled = array();
	
	// Errors messages
	const ERROR_UNKNOWN           = 'errUnknown';
	const ERROR_UNKNOWN_CMD       = 'errUnknownCmd';
	const ERROR_CONF              = 'errConf';
	const ERROR_CONF_NO_JSON      = 'errJSON';
	const ERROR_CONF_NO_VOL       = 'errNoVolumes';
	const ERROR_INV_PARAMS        = 'errCmdParams';
	const ERROR_OPEN              = 'errOpen';
	const ERROR_DIR_NOT_FOUND     = 'errFolderNotFound';
	const ERROR_FILE_NOT_FOUND    = 'errFileNotFound';
	const ERROR_TRGDIR_NOT_FOUND  = 'errTrgFolderNotFound';
	const ERROR_NOT_DIR           = 'errNotFolder';
	const ERROR_NOT_FILE          = 'errNotFile';
	const ERROR_PERM_DENIED       = 'errPerm';
	const ERROR_LOCKED            = 'errLocked';
	const ERROR_EXISTS            = 'errExists';        // 'File named "$1" already exists.'
	const ERROR_INVALID_NAME      = 'errInvName';       // 'Invalid file name.'
	const ERROR_MKDIR             = 'errMkdir';
	const ERROR_MKFILE            = 'errMkfile';
	const ERROR_RENAME            = 'errRename';
	const ERROR_COPY              = 'errCopy';
	const ERROR_MOVE              = 'errMove';
	const ERROR_COPY_FROM         = 'errCopyFrom';
	const ERROR_COPY_TO           = 'errCopyTo';
	const ERROR_COPY_ITSELF       = 'errCopyInItself';
	const ERROR_REPLACE           = 'errReplace';          // 'Unable to replace "$1".'
	const ERROR_RM                = 'errRm';               // 'Unable to remove "$1".'
	const ERROR_UPLOAD            = 'errUpload';           // 'Upload error.'
	const ERROR_UPLOAD_FILE       = 'errUploadFile';       // 'Unable to upload "$1".'
	const ERROR_UPLOAD_NO_FILES   = 'errUploadNoFiles';    // 'No files found for upload.'
	const ERROR_UPLOAD_TOTAL_SIZE = 'errUploadTotalSize';  // 'Data exceeds the maximum allowed size.'
	const ERROR_UPLOAD_FILE_SIZE  = 'errUploadFileSize';   // 'File exceeds maximum allowed size.'
	const ERROR_UPLOAD_FILE_MIME  = 'errUploadMime';       // 'File type not allowed.'
	const ERROR_UPLOAD_TRANSFER   = 'errUploadTransfer';   // '"$1" transfer error.'
	// const ERROR_ACCESS_DENIED     = 'errAccess';
	const ERROR_NOT_REPLACE       = 'errNotReplace';       // Object "$1" already exists at this location and can not be replaced with object of another type.
	const ERROR_SAVE              = 'errSave';
	const ERROR_EXTRACT           = 'errExtract';
	const ERROR_ARCHIVE           = 'errArchive';
	const ERROR_NOT_ARCHIVE       = 'errNoArchive';
	const ERROR_ARCHIVE_TYPE      = 'errArcType';
	const ERROR_ARC_SYMLINKS      = 'errArcSymlinks';
	const ERROR_ARC_MAXSIZE       = 'errArcMaxSize';
	const ERROR_RESIZE            = 'errResize';
	const ERROR_UNSUPPORT_TYPE    = 'errUsupportType';
	
	/**
	 * Constructor
	 *
	 * @param  array  elFinder and roots configurations
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function __construct($opts) {
		$this->time  = $this->utime();
		$this->debug = !empty($opts['debug']);
		
		setlocale(LC_ALL, !empty($opts['locale']) ? $opts['locale'] : 'en_US.UTF-8');

		// bind events listeners
		if (!empty($opts['bind']) && is_array($opts['bind'])) {
			foreach ($opts['bind'] as $cmd => $handler) {
				$this->bind($cmd, $handler);
			}
		}

		// "mount" volumes
		if (isset($opts['roots']) && is_array($opts['roots'])) {
			
			foreach ($opts['roots'] as $i => $o) {
				$class = 'elFinderVolume'.$o['driver'];

				if (class_exists($class)) {
					$volume = new $class();
					
					if ($volume->mount($o)) {
						// unique volume id (ends on "_") - used as prefix to files hash
						$id = $volume->id();
						$this->volumes[$id] = $volume;
						if (!$this->default && $volume->isReadable()) {
							$this->default = $this->volumes[$id]; 
						}
					}
				}
			}
		}
		// if at least one redable volume - ii desu >_<
		$this->loaded = !empty($this->default);
	}
	
	/**
	 * Return true if fm init correctly
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function loaded() {
		return $this->loaded;
	}
	
	/**
	 * Return version (api) number
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function version() {
		return $this->version;
	}
	
	/**
	 * Add handler to elFinder command
	 *
	 * @param  string  command name
	 * @param  string|array  callback name or array(object, method)
	 * @return elFinder
	 * @author Dmitry (dio) Levashov
	 **/
	public function bind($cmd, $handler) {
		$cmds = array_map('trim', explode(' ', $cmd));
		
		foreach ($cmds as $cmd) {
			if ($cmd) {
				if (!isset($this->listeners[$cmd])) {
					$this->listeners[$cmd] = array();
				}

				if ((is_array($handler) && count($handler) == 2 && is_object($handler[0]) && method_exists($handler[0], $handler[1]))
				|| function_exists($handler)) {
					$this->listeners[$cmd][] = $handler;
				}
			}
		}

		return $this;
	}
	
	/**
	 * Remove event (command exec) handler
	 *
	 * @param  string  command name
	 * @param  string|array  callback name or array(object, method)
	 * @return elFinder
	 * @author Dmitry (dio) Levashov
	 **/
	public function unbind($cmd, $handler) {
		if (!empty($this->listeners[$cmd])) {
			foreach ($this->listeners[$cmd] as $i => $h) {
				if ($h === $handler) {
					unset($this->listeners[$cmd][$i]);
					return $this;
				}
			}
		}
		return $this;
	}
	
	/**
	 * Return true if command exists
	 *
	 * @param  string  command name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function commandExists($cmd) {
		return $this->loaded && isset($this->commands[$cmd]) && method_exists($this, $cmd);
	}
	
	/**
	 * Return command required arguments info
	 *
	 * @param  string  command name
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function commandArgsList($cmd) {
		return $this->commandExists($cmd) ? $this->commands[$cmd] : array();
	}
	
	/**
	 * Exec command and return result
	 *
	 * @param  string  $cmd  command name
	 * @param  array   $args command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function exec($cmd, $args) {
		
		if (!$this->loaded) {
			return array('error' => $this->error(self::ERROR_CONF, self::ERROR_CONF_NO_VOL));
		}
		if (!$this->commandExists($cmd)) {
			return array('error' => $this->error(self::ERROR_UNKNOWN_CMD));
		}
		
		if (!empty($args['mimes']) && is_array($args['mimes'])) {
			foreach ($this->volumes as $id => $v) {
				$this->volumes[$id]->setMimesFilter($args['mimes']);
			}
		}
		
		$result = $this->$cmd($args);
		
		if ($this->debug || !empty($args['debug'])) {
			$result['debug'] = array(
				'connector' => 'php', 
				'phpver'    => PHP_VERSION,
				'time'      => $this->utime() - $this->time,
				'memory'    => ceil(memory_get_peak_usage()/1024).'Kb / '.ceil(memory_get_usage()/1024).'Kb / '.ini_get('memory_limit'),
				'upload'    => $this->uploadDebug,
				'volumes'   => array()
				);
			
			foreach ($this->volumes as $id => $volume) {
				$result['debug']['volumes'][] = array_merge(
					array('id' => $id, 'driver' => $volume->name()), 
					$volume->debug());
			}
		}
		
		return $result;
	}
	
	/***************************************************************************/
	/*                                 commands                                */
	/***************************************************************************/
	
	/**
	 * Normalize error messages
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function error() {
		$errors = array();

		foreach (func_get_args() as $msg) {
			if (is_array($msg)) {
				$errors = array_merge($errors, $msg);
			} else {
				$errors[] = $msg;
			}
		}
		
		return count($errors) ? $errors : array(self::ERROR_UNKNOWN);
	}
	
	/**
	 * "Open" directory
	 * Return array with following elements
	 *  - cwd          - opened dir info
	 *  - files        - opened dir content [and dirs tree if $args[tree]]
	 *  - api          - api version (if $args[init])
	 *  - uplMaxSize   - if $args[init]
	 *  - error        - on failed
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function open($args) {
		$target = $args['target'];
		$init   = !empty($args['init']);
		$tree   = !empty($args['tree']);
		$volume = $this->volume($target);
		$cwd    = $volume ? $volume->dir($target, true) : false;
		$hash   = $init ? 'default folder' : '#'.$target;

		// on init request we can get invalid dir hash -
		// dir which can not be opened now, but remembered by client,
		// so open default dir
		if ((!$cwd || !$cwd['read']) && $init) {
			$volume = $this->default;
			$cwd    = $volume->dir($volume->defaultPath(), true);
		}
		
		if (!$cwd) {
			return array('error' => $this->error(self::ERROR_OPEN, $hash, self::ERROR_DIR_NOT_FOUND));
		}
		if (!$cwd['read']) {
			return array('error' => $this->error(self::ERROR_OPEN, $hash, self::ERROR_PERM_DENIED));
		}

		$files = array();

		// get folders trees
		if ($args['tree']) {
			foreach ($this->volumes as $id => $v) {

				if (($tree = $v->tree('', 0, $cwd['hash'])) != false) {
					$files = array_merge($files, $tree);
				} 
			}
		}

		// get current working directory files list and add to $files if not exists in it
		if (($ls = $volume->scandir($cwd['hash'])) === false) {
			return array('error' => $this->error(self::ERROR_OPEN, $cwd['name'], $volume->error()));
		}
		
		foreach ($ls as $file) {
			if (!in_array($file, $files)) {
				$files[] = $file;
			}
		}
		
		$result = array(
			'cwd'     => $cwd,
			'options' => $volume->options($target),
			'files'   => $files
		);

		if (!empty($args['init'])) {
			$result['api'] = $this->version;
			$result['uplMaxSize'] = ini_get('upload_max_filesize');
		}
		
		return $result;
	}
	
	/**
	 * Return dir files names list
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function ls($args) {
		$target = $args['target'];
		
		if (($volume = $this->volume($target)) == false
		|| ($list = $volume->ls($target)) === false) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target));
		}
		return array('list' => $list);
	}
	
	/**
	 * Return subdirs for required directory
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function tree($args) {
		$target = $args['target'];
		
		if (($volume = $this->volume($target)) == false
		|| ($tree = $volume->tree($target)) == false) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target));
		}

		return array('tree' => $tree);
	}
	
	/**
	 * Return parents dir for required directory
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function parents($args) {
		$target = $args['target'];
		
		if (($volume = $this->volume($target)) == false
		|| ($tree = $volume->parents($target)) == false) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target));
		}

		return array('tree' => $tree);
	}
	
	/**
	 * Return new created thumbnails list
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function tmb($args) {
		
		$result  = array('images' => array());
		$targets = $args['targets'];
		
		foreach ($targets as $target) {
			if (($volume = $this->volume($target)) != false
			&& (($tmb = $volume->tmb($target)) != false)) {
				$result['images'][$target] = $tmb;
			}
		}
		return $result;
	}
	
	/**
	 * Required to output file in browser when volume URL is not set 
	 * Return array contains opened file pointer, root itself and required headers
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function file($args) {
		$target   = $args['target'];
		$download = !empty($args['download']);
		$h403     = 'HTTP/1.x 403 Access Denied';
		$h404     = 'HTTP/1.x 404 Not Found';

		if (($volume = $this->volume($target)) == false) { 
			return array('error' => 'File not found', 'header' => $h404, 'raw' => true);
		}
		
		if (($file = $volume->file($target)) == false) {
			return array('error' => 'File not found', 'header' => $h404, 'raw' => true);
		}
		
		if (!$file['read']) {
			return array('error' => 'Access denied', 'header' => $h403, 'raw' => true);
		}
		
		if (($fp = $volume->open($target)) == false) {
			return array('error' => 'File not found', 'header' => $h404, 'raw' => true);
		}
		
		if ($download) {
			$disp = 'attachment';
			$mime = 'application/octet-stream';
		} else {
			$disp  = preg_match('/^(image|text)/i', $file['mime']) || $file['mime'] == 'application/x-shockwave-flash' 
					? 'inline' 
					: 'attachment';
			$mime = $file['mime'];
		}
		
		$ua = $_SERVER["HTTP_USER_AGENT"];
		$filename = 'filename='.$file['name'];
		
		 if (preg_match("/MSIE ([0-9]{1,}[\.0-9]{0,})/", $ua)) {
			$filename = 'filename='.str_replace("+", "%20", rawurlencode($file['name']));
		} elseif (preg_match("/Firefox\/\d+/", $ua)) {
			$filename = "filename*=UTF-8''".$file['name'];
		}
		
		$result = array(
			'volume'  => $volume,
			'pointer' => $fp,
			'info'    => $file,
			'header'  => array(
				"Content-Type: ".$mime, 
				"Content-Disposition: ".$disp."; ".$filename,
				"Content-Location: ".$file['name'],
				'Content-Transfer-Encoding: binary',
				"Content-Length: ".$file['size'],
				"Connection: close"
			)
		);
		return $result;
	}
	
	/**
	 * Count total files size
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function size($args) {
		$size = 0;
		
		foreach ($args['targets'] as $target) {
			if (($volume = $this->volume($target)) == false
			|| ($file = $volume->file($target)) == false
			|| !$file['read']) {
				return array('error' => $this->error(self::ERROR_OPEN, '#'.$target));
			}
			
			$size += $volume->size($target);
		}
		return array('size' => $size);
	}
	
	/**
	 * Create directory
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mkdir($args) {
		$target = $args['target'];
		$name   = $args['name'];
		$error  = array(self::ERROR_MKDIR, $name);
		
		if (($volume = $this->volume($target)) == false) {
			return array('error' => $this->error($error, self::ERROR_TRGDIR_NOT_FOUND, '#'.$target));
		}

		return ($dir = $volume->mkdir($target, $name)) == false
			? array('error' => $this->error($error, $volume->error()))
			: $this->trigger('mkdir', $volume, array('added' => array($dir)));
	}
	
	/**
	 * Create empty file
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mkfile($args) {
		$target = $args['target'];
		$name   = $args['name'];
		$error  = array(self::ERROR_MKFILE, $name);
		
		if (($volume = $this->volume($target)) == false) {
			return array('error' => $this->error($error, self::ERROR_TRGDIR_NOT_FOUND, '#'.$target));
		}

		return ($file = $volume->mkfile($target, $args['name'])) == false
			? array('error' => $this->error($error, $volume->error()))
			: $this->trigger('mkfile', $volume, array('added' => array($file)));
	}
	
	/**
	 * Rename file
	 *
	 * @param  array  $args
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function rename($args) {
		$target = $args['target'];
		$name   = $args['name'];
		
		if (($volume = $this->volume($target)) == false
		||  ($rm  = $volume->file($target)) == false) {
			return array('error' => $this->error(self::ERROR_RENAME, '#'.$target, self::ERROR_FILE_NOT_FOUND));
		}
		
		if (($file = $volume->rename($target, $name)) == false) {
			return array('error' => $this->error(self::ERROR_RENAME, $rm['name'], $volume->error()));
		}

		return $this->merge(array(), $this->trigger('rename', $volume, array('removed' => array($target), 'added' => array($file), 'removedDetails' => array($rm))));
	}
	
	/**
	 * Duplicate file - create copy with "copy %d" suffix
	 *
	 * @param array  $args  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function duplicate($args) {
		$targets = is_array($args['targets']) ? $args['targets'] : array();
		$result  = array('added' => array());
		$suffix  = empty($args['suffix']) ? 'copy' : $args['suffix'];
		
		foreach ($targets as $target) {
			if (($volume = $this->volume($target)) == false
			|| ($src = $volume->file($target)) == false) {
				$result['warning'] = $this->error(self::ERROR_COPY, '#'.$target, self::ERROR_FILE_NOT_FOUND);
				break;
			}
			
			if (($file = $volume->duplicate($target, $suffix)) == false) {
				$result['warning'] = $this->error($volume->error());
				break;
			}
			
			$result = $this->merge($result, $this->trigger('duplicate', $volume, array('added' => array($file), 'src' => $src)));
		}
		
		return $result;
	}
		
	/**
	 * Remove dirs/files
	 *
	 * @param array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function rm($args) {
		$targets = is_array($args['targets']) ? $args['targets'] : array();
		$result  = array('removed' => array());
		
		foreach ($targets as $target) {
			if (($volume = $this->volume($target)) == false
			|| ($file = $volume->file($target)) == false) {
				$result['warning'] = $this->error(self::ERROR_RM, '#'.$target, self::ERROR_FILE_NOT_FOUND);
				break;
			}
			
			if (!$volume->rm($target)) {
				$result['warning'] = $this->error($volume->error());
				break;
			}
			
			$result = $this->merge($result, $this->trigger('rm', $volume, array('removed' => array($target), 'removedDetails' => array($file))));
		}
		
		return $result;
	}
	
	
	/**
	 * Save uploaded files
	 *
	 * @param  array
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function upload($args) {
		$target = $args['target'];
		$volume = $this->volume($target);
		$files  = isset($args['FILES']['upload']) && is_array($args['FILES']['upload']) ? $args['FILES']['upload'] : array();
		$result = array('added' => array(), 'removed' => array(), 'header' => empty($args['html']) ? false : 'Content-Type: text/html; charset=utf-8');
		
		if (empty($files)) {
			return array('error' => $this->error(self::ERROR_UPLOAD, self::ERROR_UPLOAD_NO_FILES), 'header' => $header);
		}
		
		if (!$volume) {
			return array('error' => $this->error(self::ERROR_UPLOAD, self::ERROR_TRGDIR_NOT_FOUND, '#'.$target), 'header' => $header);
		}
		
		foreach ($files['name'] as $i => $name) {
			if (($error = $files['error'][$i]) > 0) {				
				$result['warning'] = $this->error(self::ERROR_UPLOAD_FILE, $name, $error == UPLOAD_ERR_INI_SIZE || $error == UPLOAD_ERR_FORM_SIZE ? self::ERROR_UPLOAD_FILE_SIZE : self::ERROR_UPLOAD_TRANSFER);
				$this->uploadDebug = 'Upload error code: '.$error;
				break;
			}
			
			$tmpname = $files['tmp_name'][$i];
			
			if (($fp = fopen($tmpname, 'rb')) == false) {
				$result['warning'] = $this->error(self::ERROR_UPLOAD_FILE, $name, self::ERROR_UPLOAD_TRANSFER);
				$this->uploadDebug = 'Upload error: unable open tmp file';
				break;
			}
			
			if (($file = $volume->upload($fp, $target, $name, $tmpname)) === false) {
				$result['warning'] = $this->error(self::ERROR_UPLOAD_FILE, $name, $volume->error());
				fclose($fp);
				break;
			}
			
			fclose($fp);
			
			$result = $this->merge($result, $this->trigger('upload', $volume, array('added' => array($file))));
		}
		
		return $result;
	}
		
	/**
	 * Copy/move files into new destination
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function paste($args) {
		$dst     = $args['dst'];
		$targets = is_array($args['targets']) ? $args['targets'] : array();
		$cut     = !empty($args['cut']);
		$error   = $cut ? self::ERROR_MOVE : self::ERROR_COPY;
		$result  = array('removed' => array(), 'added' => array());
		
		if (($dstVolume = $this->volume($dst)) == false) {
			return array('error' => $this->error($error, '#'.$targets[0], self::ERROR_TRGDIR_NOT_FOUND, '#'.$dst));
		}
		
		foreach ($targets as $target) {
			if (($srcVolume = $this->volume($target)) == false
			|| ($src = $srcVolume->file($target)) == false) {
				$result['warning'] = $this->error($error, '#'.$target, self::ERROR_FILE_NOT_FOUND);
				break;
			}
			
			if (($file = $dstVolume->paste($srcVolume, $target, $dst)) == false) {
				$result['warning'] = $this->error($dstVolume->error());
				break;
			}
			
			$result = $this->merge($result, $this->trigger('paste', array($srcVolume, $dstVolume), array('added' => array($file))));
			
			if ($cut) {
				if ($srcVolume->rm($target)) {
					$result = $this->merge($result, $this->trigger('rm', $srcVolume, array('removed' => array($target), 'removedDetails' => array($src))));
				} else {
					$result['warning'] = $this->error($srcVolume->error());
					break;
				}
			}
		}
		
		
		return $result;
	}
	
	/**
	 * Return file content
	 *
	 * @param  array  $args  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function get($args) {
		$target = $args['target'];
		$volume = $this->volume($target);
		
		if (!$volume || ($file = $volume->file($target)) == false) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target, self::ERROR_FILE_NOT_FOUND));
		}
		
		return ($content = $volume->getContents($target)) === false
			? array('error' => $this->error(self::ERROR_OPEN, $file['name'], $volume->error()))
			: array('content' => $content);
	}
	
	/**
	 * Save content into text file
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function put($args) {
		$target = $args['target'];
		$error  = array(self::ERROR_SAVE, '#'.$target);
		
		if (($volume = $this->volume($target)) == false
		|| ($file = $volume->file($target)) == false) {
			return array('error' => $this->error($error, self::ERROR_FILE_NOT_FOUND));
		}
		$error[1] = $file['name'];
		
		if ($volume->commandDisabled('edit')) {
			return array('error' => $this->error($error, self::ERROR_ACCESS_DENIED));
		}
		
		if (($file = $volume->putContents($target, $args['content'])) == false) {
			return array('error' => $this->error($error, $volume->error()));
		}
		if (!$volume->mimeAccepted($file['mime'], $args['mimes'])) {
			$file['hidden'] = true;
		}
		
		return $this->trigger('put', $volume, array('changed' => array($file)));
	}

	/**
	 * Extract files from archive
	 *
	 * @param  array  $args  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov, 
	 * @author Alexey Sukhotin
	 **/
	protected function extract($args) {
		$target = $args['target'];
		$mimes  = !empty($args['mimes']) && is_array($args['mimes']) ? $args['mimes'] : array();
		$error  = array(self::ERROR_EXTRACT, '#'.$target);

		if (($volume = $this->volume($target)) == false
		|| ($file = $volume->file($target)) == false) {
			return array('error' => $this->error($error, self::ERROR_FILE_NOT_FOUND));
		}  
    
		$error[1] = $file['name'];
		
		if ($volume->commandDisabled('extract')) {
			return array('error' => $this->error($error, self::ERROR_ACCESS_DENIED));
		}

		if (($file = $volume->extract($target)) == false) {
			return array('error' => $this->error($error, $volume->error()));
		}

		return $this->trigger('extract', $volume, array('added' => array($file)));
	}
	
	/**
	 * Create archive
	 *
	 * @param  array  $args  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov, 
	 * @author Alexey Sukhotin
	 **/
	protected function archive($args) {
		$targets = isset($args['targets']) && is_array($args['targets']) ? $args['targets'] : array();
		$type    = $args['type'];
		$mimes   = !empty($args['mimes']) && is_array($args['mimes']) ? $args['mimes'] : array();
		$volume  = count($targets) ? $this->volume($targets[0]) : false;
	
		if (($volume = $this->volume($targets[0])) == false) {
			return $this->error(self::ERROR_ARCHIVE, self::ERROR_TRGDIR_NOT_FOUND);
		}
	
		if ($volume->commandDisabled('archive')) {
			return array('error' => $this->error(self::ERROR_ARCHIVE, self::ERROR_ACCESS_DENIED));
		}
	
		if (($archive = $volume->archive($targets, $args['type'])) == false) {
			return $this->error(self::ERROR_ARCHIVE, $volume->error());
		}
	
		return $this->trigger('archive', $volume, array('added' => array($archive)), $mimes);
	}
	
	/**
	 * Search files
	 *
	 * @param  array  $args  command arguments
	 * @return array
	 * @author Dmitry Levashov
	 **/
	protected function search($args) {
		$q      = trim($args['q']);
		$mimes  = !empty($args['mimes']) && is_array($args['mimes']) ? $args['mimes'] : array();
		$result = array();

		foreach ($this->volumes as $volume) {
			$result = array_merge($result, $volume->search($q, $mimes));
		}
		
		return array('files' => $result);
	}
	
	/**
	 * Return file info (used by client "places" ui)
	 *
	 * @param  array  $args  command arguments
	 * @return array
	 * @author Dmitry Levashov
	 **/
	protected function info($args) {
		$files = array();
		
		foreach ($args['targets'] as $hash) {
			if (($volume = $this->volume($hash)) != false
			&& ($info = $volume->file($hash)) != false) {
				$files[] = $info;
			}
		}
		
		return array('files' => $files);
	}
	
	/**
	 * Return image dimmensions
	 *
	 * @param  array  $args  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function dim($args) {
		$target = $args['target'];
		
		if (($volume = $this->volume($target)) != false) {
			$dim = $volume->dimensions($target);
			return $dim ? array('dim' => $dim) : array();
		}
		return array();
	}
	
	/**
	 * Resize image
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	protected function resize($args) {
		$target = $args['target'];
		$width  = $args['width'];
		$height = $args['height'];
		$crop   = !empty($args['crop']);
		$error  = array(self::ERROR_RESIZE, '#'.$target);
		
		if (($volume = $this->volume($target)) == false
		|| ($file = $volume->file($target)) == false) {
			return array('error' => $this->error($error, self::ERROR_FILE_NOT_FOUND));
		}

		$error[1] = $file['name'];

		if ($volume->commandDisabled('resize')) {
			return array('error' => $this->error($error, self::ERROR_PERM_DENIED));
		}
			
		if (($file = $volume->resize($target, $width, $height, $crop)) == false) {
			return array('error' => $this->error($error, $volume->error()));
		}
		
		return $this->trigger('resize', $volume, array('changed' => array($file)));
	}
	
	/***************************************************************************/
	/*                                   misc                                  */
	/***************************************************************************/
	
	/**
	 * Recursive copy
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function copy($srcVolume, $dstVolume, $src, $dst, $cut) {
		$error = $cut ? self::ERROR_MOVE : self::ERROR_COPY;
		
		if (!$src['read']) {
			$this->copyError = $this->error($error, $src['name'], self::ERROR_PERM_DENIED);
			return false;
		}
		
		$name = $src['name'];
		$hash = $src['hash'];
		
		if ($src['mime'] == 'directory') {

			if (($dir = $dstVolume->mkdir($dst, $name, true)) == false) {
				$this->copyError = $this->error($error, $name, $dstVolume->error());
				return false;
			}
			
			if (($files = $srcVolume->scandir($hash)) === false) {
				$this->copyError = $this->error($error, $name, $srcVolume->error());
				return false;
			}
			
			foreach ($files as $file) {
				if (!$this->copy($srcVolume, $dstVolume, $file, $dir['hash'], $cut)) {
					$this->copyError = $this->error($error, $file['name'], $srcVolume->error());
					return false;
				}
			}
			return $dstVolume->dir($dir['hash']);
		} else {
			if (($fp = $srcVolume->open($hash)) == false) {
				$this->copyError = $this->error($error, $name, $srcVolume->error());
				return false;
			}
			if (($file = $dstVolume->save($fp, $dst, $name, 'copy')) == false) {
				$this->copyError = $this->error($error, $name, $srcVolume->error());
			}
			$srcVolume->close($fp, $hash);
			
			return $file; 
			
		}
	}
	
	/**
	 * Return root - file's owner
	 *
	 * @param  string  file hash
	 * @return elFinderStorageDriver
	 * @author Dmitry (dio) Levashov
	 **/
	protected function volume($hash) {
		foreach ($this->volumes as $id => $v) {
			if (strpos(''.$hash, $id) === 0) {
				return $this->volumes[$id];
			} 
		}
		return false;
	}
	
	/**
	 * Execute all callbacks/listeners for required command
	 *
	 * @param  string  command name
	 * @param  array   data passed to callbacks
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function trigger($cmd, $volumes, $result) {
		$data = array(
			'cmd'     => $cmd,
			'volumes' => is_array($volumes) ? $volumes : array($volumes),
			'result'  => $result
		);
		$volumes = is_array($volumes) ? $volumes : array($volumes);
		$keys    = array_keys($result);
		
		if (!empty($this->listeners[$cmd])) {
			foreach ($this->listeners[$cmd] as $handler) {
				$result = is_array($handler) && count($handler) > 1
					? $handler[0]->{$handler[1]}($cmd, $volumes, $result)
					: $handler($cmd, $volumes, $result);
				
				if (is_array($result)) {
					$diff = array_diff($keys, array_keys($result));
					if (empty($diff)) {
						$result = $result;
					}
				}
			}
		}
		
		// some volume methods can return hidden by "onlyMimes" options files.
		// this file may be required by some listeners but can not be shown to client
		// so here we remove its
		
		if (!empty($result['added']) && is_array($result['added'])) {
			foreach ($result['added'] as $i => $file) {
				if (!empty($file['hidden'])) {
					unset($result['added'][$i]);
				}
			}
			$result['added'] = array_merge(array(), $result['added']);
		}
		
		if (!empty($result['changed']) && is_array($result['changed'])) {
			foreach ($result['changed'] as $i => $file) {
				if (!empty($file['hidden'])) {
					unset($result['changed'][$i]);
				}
			}
			$result['changed'] = array_merge(array(), $result['changed']);
		}
		
		return $result;
	}
	
	/**
	 * Required by commands manipulated several files.
	 * Merge command result and $this->trigger() returned data
	 *
	 * @param  array  $one  command data
	 * @param  array  $two  trigger result
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function merge($one, $two) {
		
		if (!empty($two['error'])) {
			$one['warning'] = $two['error'];
		}
		if (!empty($two['warning'])) {
			$one['warning'] = $two['warning'];
		}
		
		if (!empty($two['added']) && is_array($two['added'])) {
			if (!isset($one['added']) || !is_array($one['added'])) {
				$one['added'] = $two['added'];
			} else {
				$one['added'] = array_merge($one['added'], $two['added']);
			}
		}
		
		if (!empty($two['removed']) && is_array($two['removed'])) {
			if (!isset($one['removed']) || !is_array($one['removed'])) {
				$one['removed'] = $two['removed'];
			} else {
				$one['removed'] = array_merge($one['removed'], $two['removed']);
			}
		}
		
		return $one;
	}
	
	
	protected function utime() {
		$time = explode(" ", microtime());
		return (double)$time[1] + (double)$time[0];
	}
	
}


?>
