<?php

class elFinder {
	
	/**
	 * Version number
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
		'sync'      => array('target' => true, 'tree' => false, 'mimes' => false),
		'file'      => array('target' => true, 'download' => false),
		'size'      => array('targets' => true),
		'mkdir'     => array('target' => true, 'name' => true),
		'mkfile'    => array('target' => true, 'name' => true, 'mimes' => false),
		'rm'        => array('targets' => true),
		'rename'    => array('target' => true, 'name' => true, 'mimes' => false),
		'duplicate' => array('targets' => true),
		'paste'     => array('dst' => true, 'targets' => true, 'cut' => false, 'mimes' => false),
		'upload'    => array('target' => true, 'FILES' => true, 'mimes' => false),
		'get'       => array('target' => true),
		'put'       => array('target' => true, 'content' => '', 'mimes' => false)
	);
	
	/**
	 * Configuration
	 *
	 * @var array
	 **/
	protected $options = array(
		'disabled' => array(),  // list commands to disable
		'bind'     => array(),  
		'debug'    => false
	);
	
	/**
	 * Commands listeners
	 *
	 * @var array
	 **/
	protected $listeners = array();
	
	/**
	 * undocumented class variable
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
	protected $copyError = array();
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $disabled = array();
	
	const ERROR_UNKNOWN           = 0;
	const ERROR_UNKNOWN_CMD       = 1;
	const ERROR_CONF              = 2;
	const ERROR_CONF_NO_JSON      = 3;
	const ERROR_CONF_NO_VOL       = 4;
	const ERROR_INV_PARAMS        = 5;
	const ERROR_OPEN              = 6;
	const ERROR_DIR_NOT_FOUND     = 7;
	const ERROR_FILE_NOT_FOUND    = 8;
	const ERROR_TRGDIR_NOT_FOUND  = 9;
	const ERROR_NOT_DIR           = 10;
	const ERROR_NOT_FILE          = 11;

	const ERROR_PERM_DENIED       = 12;
	const ERROR_LOCKED            = 13;
	const ERROR_EXISTS            = 14;
	const ERROR_INVALID_NAME      = 15;
	const ERROR_MKDIR             = 16;
	const ERROR_MKFILE            = 17;
	const ERROR_RENAME            = 18;
	const ERROR_COPY              = 19;
	const ERROR_MOVE              = 20;
	const ERROR_COPY_FROM         = 21;
	const ERROR_COPY_TO           = 22;
	const ERROR_COPY_ITSELF       = 23;
	const ERROR_RM                = 24;
	const ERROR_UPLOAD            = 25;
	const ERROR_UPLOAD_NO_FILES   = 26;
	const ERROR_UPLOAD_FILES_SIZE = 27;
	const ERROR_UPLOAD_SIZE       = 28;
	const ERROR_MIME              = 29;
	const ERROR_UPLOAD_TRANSFER   = 30;
	const ERROR_ACCESS_DENIED     = 31;
	const ERROR_SAVE              = 32;
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected static $errors = array(
		0  => 'Unknown error.',
		1  => 'Unknown command.',
		2  => 'Invalid backend configuration.',
		3  => 'PHP JSON module not installed.',
		4  => 'There are no one readable volumes available.',
		5  => 'Invalid parameters for command "$1".',
		6  => 'Unable to open "$1".',
		7  => 'Folder not found.',
		8  => 'File not found.',
		9  => 'Target folder "$1" not found.',
		10 => 'Object is not a folder.',
		11 => 'Object is not a file.',
		12 => 'Permission denied.',
		13 => '"$1" is locked and can not be renamed, moved or removed.',
		14 => 'File named "$1" already exists in this location.',
		15 => 'Invalid file name.',
		16 => 'Unable to create folder "$1".',
		17 => 'Unable to create file "$1".',
		18 => 'Unable to rename "$1".',
		19 => 'Unable to copy "$1".',
		20 => 'Unable to move "$1".',
		21 => 'Copy files from volume "$1" not allowed.',
		22 => 'Copy files to volume "$1" not allowed.',
		23 => 'Unable to copy "$1" into itself.',
		24 => 'Unable to remove "$1".',
		25 => 'Unable to upload "$1".',
		26 => 'There are no uploaded files was found.',
		27 => 'Data exceeds the maximum allowed size.',
		28 => 'File exceeds maximum allowed size.',
		29 => 'Not allowed file type.',
		30 => '"$1" transfer error.',
		31 => 'Access denied',
		32 => 'Unable to save "$1".'
	);
	
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
					
					// unique volume id - used as prefix to files hash
					$id = $volume->driverid().$i.'_';
					
					if ($volume->mount($id, $o)) {
						$this->volumes[$id] = $volume;
						if (!$this->default && $volume->isReadable()) {
							$this->default = $this->volumes[$id]; 
						}
					}
				}
			}
		}
		// if at least one redable volume - ii desu
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
		
		$result = $this->$cmd($args);
		
		if ($this->debug || !empty($args['debug'])) {
			$result['debug'] = array(
				'connector' => 'php', 
				'time'      => $this->utime() - $this->time,
				'memory'    => ceil(memory_get_peak_usage()/1024).'Kb / '.ceil(memory_get_usage()/1024).'Kb / '.ini_get('memory_limit'),
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
	 * Translate error number(s) into error message
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function _error() {
		
		if (func_num_args() == 1) {
			$errors = func_get_arg(0);
			if (!is_array($errors)) {
				$errors = array($errors);
			}
		} else {
			$errors = func_get_args();
		}
		
		if (!count($errors)) {
			return self::$errors[self::ERROR_UNKNOWN];
		}

		for ($i = 0, $c = count($errors); $i < $c; $i++) {
			$v = $errors[$i];

			if (is_int($v) && isset(self::$errors[$v])) {
				$errors[$i] = self::$errors[$v];
			} elseif ($i == 0) {
				$errors[$i] = self::$errors[self::ERROR_UNKNOWN];
			}
		}
		
		return $errors;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
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
		
		if (!count($errors)) {
			return self::$errors[self::ERROR_UNKNOWN];
		}
		
		foreach ($errors as $i => $msg) {
			if (is_int($msg) && !empty(self::$errors[$msg])) {
				$errors[$i] = self::$errors[$msg];
			} elseif ($i == 0) {
				$errors[$i] = self::$errors[self::ERROR_UNKNOWN];
			}
		}
		
		return $errors;
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
		$cwd    = $volume ? $volume->dir($target) : false;
		$hash   = $init ? 'default folder' : '#'.$target;
		
		// on init request we can get invalid dir hash -
		// dir which can not be opened now, but remembered by client,
		// so open default dir
		if (!$cwd || !$cwd['read']) {
			if ($init) {
				$volume = $this->default;
				$target = $volume->defaultPath();
				$cwd    = $volume->dir($target);
			} 
		}
		
		if (!$cwd) {
			return array('error' => $this->error(self::ERROR_OPEN, $hash, self::ERROR_DIR_NOT_FOUND));
		}

		$files = array();
		
		// get folders trees
		if ($args['tree']) {
			foreach ($this->volumes as $id => $v) {
				if (($tree = $v->tree(null, 0, $target)) != false) {
					$files = array_merge($files, $tree);
				} 
			}
		}

		// get current working directory files list and add to $files if not exists in it
		if (($ls = $volume->scandir($target, $args['mimes'])) === false) {
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
		
		if (($volume = $this->volume($target)) == false) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target, self::ERROR_DIR_NOT_FOUND));
		}
		if (($list = $volume->ls($target)) === false) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target, $volume->error()));
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
		
		if (($volume = $this->volume($target)) == false) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target, self::ERROR_DIR_NOT_FOUND));
		}

		if (($dir = $volume->dir($target)) == false
		|| ($tree = $volume->tree($target)) == false) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target, $volume->error()));
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
		
		if (($volume = $this->volume($target)) == false) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target, self::ERROR_DIR_NOT_FOUND));
		}

		return ($tree = $volume->parents($target)) === false 
			? array('error' => $this->error($volume->error()))
			: array('tree' => $tree);
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
			if (($volume = $this->volume($target)) == false) {
				if (!isset($result['tmb_warnings'])) {
					$result['tmb_warnings'] = array();
				}
				$result['tmb_warnings'][] = $this->error(self::ERROR_OPEN, '#'.$target, self::ERROR_FILE_NOT_FOUND);
			} elseif (($tmb = $volume->tmb($target)) != false) {
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
			return array('error' => self::$errors[self::ERROR_FILE_NOT_FOUND], 'header' => $h404, 'raw' => true);
		}
		
		if (($file = $volume->file($target)) == false) {
			return array('error' => self::$errors[self::ERROR_FILE_NOT_FOUND], 'header' => $h404, 'raw' => true);
		}
		
		if (!$file['read']) {
			return array('error' => self::$errors[self::ERROR_ACCESS_DENIED], 'header' => $h403, 'raw' => true);
		}
		
		if (($fp = $volume->open($target)) == false) {
			return array('error' => self::$errors[self::ERROR_FILE_NOT_FOUND], 'header' => $h404, 'raw' => true);
		}
		
		if ($download) {
			$disp = 'attachment';
			$mime = 'application/octet-stream';
		} else {
			$disp  = preg_match('/^(image|text)/i', $file['mime']) 
				|| $file['mime'] == 'application/x-shockwave-flash' 
					? 'inline' 
					: 'attachment';
			$mime = $file['mime'];
		}
		
		$result = array(
			'volume'  => $volume,
			'pointer' => $fp,
			'info'    => $file,
			'header'  => array(
				"Content-Type: ".$mime, 
				"Content-Disposition: ".$disp."; filename=".rawurlencode($file['name']),
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
			|| ($file = $volume->file($target)) == false) {
				return array('error' => $this->error(self::ERROR_OPEN, '#'.$target, self::ERROR_FILE_NOT_FOUND));
			}
			
			if (!$file['read']) {
				return array('error' => $this->error(self::ERROR_OPEN, $file['name'], self::ERROR_PERM_DENIED));
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
		
		if (($volume = $this->volume($target)) == false
		|| ($dir = $volume->dir($target)) == false) {
			return array('error' => $this->error($error, self::ERROR_TRGDIR_NOT_FOUND, '#'.$target));
		}

		if (!$dir['read']) {
			return array('error' => $this->error($error, self::ERROR_PERM_DENIED));
		}

		if (($dir = $volume->mkdir($target, $name)) == false) {
			return array('error' => $this->error($error, $volume->error()));
		}

		return $this->trigger('mkdir', $volume, array('added' => array($dir)));
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
		
		if (($volume = $this->volume($target)) == false
		|| ($dir = $volume->dir($target)) == false) {
			return array('error' => $this->error($error, self::ERROR_TRGDIR_NOT_FOUND, '#'.$target));
		}

		if (!$dir['read']) {
			return array('error' => $this->error($error, self::ERROR_PERM_DENIED));
		}

		if (($file = $volume->mkfile($target, $args['name'])) == false) {
			return array('error' => $this->error($error, $volume->error()));
		}

		if (!$volume->mimeAccepted($file['mime'], $args['mimes'])) {
			$file['hidden'] = true;
		}
		
		return $this->trigger('mkfile', $volume, array('added' => array($file)));
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
		
		if (!$rm['read']) {
			return array('error' => $this->error(self::ERROR_RENAME, $rm['name'], self::ERROR_PERM_DENIED));
		}
		
		if (($file = $volume->rename($target, $name)) == false) {
			return array('error' => $this->error(self::ERROR_RENAME, $rm['name'], $volume->error()));
		}

		if (!$volume->mimeAccepted($file['mime'], $args['mimes'])) {
			$file['hidden'] = true;
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
		
		if (!$targets) {
			return array();
		}
		
		foreach ($targets as $target) {
			if (($volume = $this->volume($target)) == false
			||  ($src = $volume->file($target)) == false) {
				$result['warning'] = $this->error(self::ERROR_COPY, '#'.$target, self::ERROR_FILE_NOT_FOUND);
				break;
			}
			
			if (($file = $volume->duplicate($target)) == false) {
				$result['warning'] = $this->error(self::ERROR_COPY, $src['name'], $volume->error());
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
		
		if (!$targets) {
			return array();
		}
		
		foreach ($targets as $target) {
			if (($volume = $this->volume($target)) == false
			|| ($file = $volume->file($target)) == false) {
				$result['warning'] = $this->error(self::ERROR_REMOVE, '#'.$target, self::ERROR_FILE_NOT_FOUND);
				break;
			}
			
			if (!$volume->rm($target)) {
				$result['warning'] = $this->error(self::ERROR_REMOVE, $file['name'], $volume->error());
				break;
			}
			
			$result = $this->merge($result, $this->trigger('rm', $volume, array('removed' => array($target), 'removedDetails' => array($file))));
		}
		
		return $result;
	}
	
	/**
	 * Save uploaded files
	 *
	 * @return args
	 * @author Dmitry (dio) Levashov
	 **/
	protected function upload($args) {
		$target = $args['target'];
		$volume = $this->volume($target);
		$result = array('added' => array());
		$files  = !empty($args['FILES']['upload']) && is_array($args['FILES']['upload']) 
			? $args['FILES']['upload'] 
			: array();

		if (empty($files)) {
			return array('error' => $this->error(self::ERROR_UPLOAD_NO_FILES));
		}
		
		if (!$volume) {
			return array('error' => $this->error(self::ERROR_UPLOAD, $files['name'][0], self::ERROR_TRGDIR_NOT_FOUND, '#'.$target));
		}
		
		foreach ($files['name'] as $i => $name) {
			$tmpPath = $files['tmp_name'][$i];
			
			if ($files['error'][$i]) {
				$result['warning'] = $this->error(self::ERROR_UPLOAD_TRANSFER, $name);
				break;
			}
			
			if (!$volume->uploadAllow($tmpPath, $name)) {
				$result['warning'] = $this->error(self::ERROR_UPLOAD, $name, $volume->error());
				break;
			}
			
			if (($fp  = fopen($tmpPath, 'rb')) == false
			|| ($file = $volume->save($fp, $target, $name, 'upload')) == false) {
				$result['warning'] = $this->error(self::ERROR_UPLOAD, $name, $volume->error());
				break;
			}
			
			if (!$volume->mimeAccepted($file['mime'], $args['mimes'])) {
				$file['hidden'] = true;
			}
			
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
		$result  = array('removed' => array(), 'added' => array());
		$error   = $cut ? self::ERROR_MOVE : self::ERROR_COPY;
		
		if (!$targets) {
			return array();
		}
		
		if (($dstVolume = $this->volume($dst)) == false
		|| ($dstDir = $dstVolume->dir($dst)) == false) {
			return array('error' => $this->error($error, '#'.$targets[0], self::ERROR_TRGDIR_NOT_FOUND, '#'.$dst));
		}
		
		if (!$dstDir['write']) {
			return array('error' => $this->error($error, '#'.$targets[0], self::ERROR_PERM_DENIED));
		}
		
		foreach ($targets as $target) {
			if (($srcVolume = $this->volume($target)) == false
			|| ($src = $srcVolume->file($target)) == false) {
				$result['warning'] = $this->error($error, '#'.$target, self::ERROR_FILE_NOT_FOUND);
				break;
			}
			
			if ($dstVolume != $srcVolume) {
				if (!$srcVolume->copyFromAllowed()) {
					$root = $srcVolume->file($srcVolume->root());
					$result['warning'] = $this->error($error, self::ERROR_COPY_FROM, $root['name']);
					
					break;
				}
				
				if (!$dstVolume->copyToAllowed()) {
					$root = $dstVolume->file($dstVolume->root());
					$result['warning'] = $this->error($error, self::ERROR_COPY_TO, $root['name']);
					break;
				}
			}

			if (($file = $this->copy($srcVolume, $dstVolume, $src, $dst, $cut)) == false) {
				$result['warning'] = $this->copyError;
				break;
			}

			if (!$dstVolume->mimeAccepted($file['mime'], $args['mimes'])) {
				$file['hidden'] = true;
			}
			
			$result = $this->merge($result, $this->trigger('paste', array($srcVolume, $dstVolume), array('added' => array($file))));
			
			if ($cut) {
				if (!$srcVolume->rm($src['hash'])) {

					$result['warning'] = $this->error($error, $src['name'], $srcVolume->error());
					break;
				}
				$result = $this->merge($result, $this->trigger('rm', $srcVolume, array('removed' => array($src['hash']), 'removedDetails' => array($src))));
			}
		}
		
		return $result;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function get($args) {
		$target = $args['target'];
		$volume = $this->volume($target);
		
		if (!$volume) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target, self::ERROR_FILE_NOT_FOUND));
		}
		
		return ($content = $volume->getContents($target)) === false
			? array('error' => $this->error(self::ERROR_OPEN, '#'.$target, $volume->error()))
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
		
		if (($file = $volume->putContents($target, $args['content'])) == false) {
			return array('error' => $this->error($error, $volume->error()));
		}
		if (!$volume->mimeAccepted($file['mime'], $args['mimes'])) {
			$file['hidden'] = true;
		}
		
		return $this->trigger('put', $volume, array('changed' => array($file)));
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
				$this->error($error, $name, $dstVolume->error());
				return false;
			}
			
			if (($files = $srcVolume->scandir($hash)) === false) {
				$this->error($error, $name, $srcVolume->error());
				return false;
			}
			
			foreach ($files as $file) {
				if (!$this->copy($srcVolume, $dstVolume, $file, $dir['hash'], $cut)) {
					$this->error($error, $file['name'], $srcVolume->error());
					return false;
				}
			}
			return $dstVolume->dir($dir['hash']);
		} else {
			if (($fp = $srcVolume->open($hash)) == false) {
				$this->error($error, $name, $srcVolume->error());
				return false;
			}
			if (($file = $dstVolume->save($fp, $dst, $name, 'copy')) == false) {
				$this->error($error, $name, $srcVolume->error());
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
			if (strpos($hash, $id) === 0) {
				return $this->volumes[$id];
			}
		}
		return false;
	}
	
	/**
	 * Filter files list by mime types
	 *
	 * @param  array  $files   files to filter
	 * @param  object $volume  files volume
	 * @param  array  $mimes   mimetypes list
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function filterByMimes($files, $volume, $mimes = array())	{
		if (empty($mimes)) {
			return $files;
		}
		$result = array();
		foreach ($files as $file) {
			if ($volume->checkMime($file['hash'], $mimes)) {
				$result[] = $file;
			}
		}
		return $result;
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