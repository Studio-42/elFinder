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
		'open'      => array('target' => false, 'tree' => false, 'init' => false, 'mimes' => false, 'sort' => false),
		'tree'      => array('target' => true),
		'parents'   => array('target' => true),
		'tmb'       => array('current' => true, 'files' => true),
		'sync'      => array('current' => true, 'targets' => true, 'mimes' => false),
		'file'      => array('target' => true),
		'size'      => array('targets' => true),
		'mkdir'     => array('current' => true, 'name' => true),
		'mkfile'    => array('current' => true, 'name' => true),
		'rm'        => array('targets' => true),
		'rename'    => array('target' => true, 'name' => true),
		'duplicate' => array('target' => true),
		
		'paste' => array('dst' => true, 'targets' => true, 'cut' => false),
		'upload' => array(
			'current' => true, 
			'FILES' => true
			)
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
	protected $disabled = array();
	
	const ERROR_UNKNOWN              = 0;
	const ERROR_CONF                 = 1;
	const ERROR_CONF_NO_JSON         = 2;
	const ERROR_CONF_NO_VOL          = 3;
	const ERROR_UNKNOWN_CMD          = 4;
	const ERROR_INV_PARAMS           = 5;
	const ERROR_NOT_FOUND            = 6;
	const ERROR_NOT_READ             = 7;
	const ERROR_NOT_DIR              = 8;
	const ERROR_NOT_FILE             = 9;
	const ERROR_NOT_LIST             = 10;
	const ERROR_NOT_REMOVE           = 11;
	const ERROR_REMOVE               = 12;
	const ERROR_NOT_COPY             = 13;
	const ERROR_NOT_WRITE            = 14;
	const ERROR_NOT_REPLACE          = 15;
	const ERROR_COPY                 = 16;
	const ERROR_NOT_COPY_INTO_ITSELF = 17;
	const ERROR_LOCKED               = 18;
	const ERROR_INVALID_NAME         = 19;
	const ERROR_RENAME               = 20;
	const ERROR_POST_DATA_MAXSIZE    = 21;
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected static $errors = array(
		0  => 'Unknown error.',
		1  => 'Invalid backend configuration. $1',
		2  => 'PHP JSON module not installed.',
		3  => 'There are no one readable volumes available.',
		4  => 'Unknown command.',
		5  => 'Invalid parameters.',
		6  => 'File not found.',
		7  => '"$1" can’t be opened because you don’t have permission to see its contents.',
		8  => '"$1" is not a folder.',
		9  => '"$1" is not a file.',
		10 => 'Unable to get "$1" folders list.',
		11 => '"$1" is locked and can not be removed.',
		12 => 'Unable to remove "$1".',
		13 => '"$1" can’t be copied because you don’t have permission to see its contents.',
		14 => 'You don’t have permission to write into "$1".',
		15 => '"$1" exists and can’t be replaced',
		16 => 'Unable to copy "$1" to "$2".',
		17 => 'Unable to copy "$1" into itself.',
		18 => 'File "$1" locked and can’t be removed or renamed.',
		19 => 'File name "$1" is not allowed.',
		20 => 'Unable to rename "$1" into "$2".',
		21 => 'Data exceeds the maximum allowed size.'
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
		if (isset($opts['bind']) && is_array($opts['bind'])) {
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
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
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
		if (!isset($this->listeners[$cmd])) {
			$this->listeners[$cmd] = array();
		}
		
		if ((is_array($handler) && count($handler) == 2 && class_exists($handler[0]) && method_exists($handler[0], $handler[1]) )
		|| function_exists($handler)) {
			$this->listeners[$cmd][] = $handler;
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
			return array('error' => 'Invalid backend configuration');
		}
		if (!$this->commandExists($cmd)) {
			return array('error' => 'Unknown command');
		}
		
		$result = $this->$cmd($args);
		
		if ($this->debug || !empty($args['debug'])) {
			$result['debug'] = array(
				'connector' => 'php', 
				'time'      => $this->utime() - $this->time
				);
			
			// foreach ($this->volumes as $id => $volume) {
			// 	$result['debug'][$id] = $volume->debug();
			// }
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
	public function errorMessage() {
		
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
			if (isset(self::$errors[$v])) {
				$errors[$i] = self::$errors[$v];
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
	 *  - files        - opened dir content [and dirs tree if args[tree]]
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
		$tree   = !empty($args['tree']);
		$volume = $this->volume($target);
		
		if (!$volume) {
			if ($args['init']) {
				// on init request we can get invalid dir hash -
				// dir which already does not exists but stored in cookie from last session,
				// so open default dir
				$volume = $this->default;
				$target = $volume->defaultPath();
			} else {
				return array('error' => $this->errorMessage(self::ERROR_NOT_FOUND));
			}
		} 
		
		// get current working directory info
		if (($cwd = $volume->dir($target)) == false) {
			return array('error' => $this->errorMessage($volume->error()));
		} 

		$cwd['path'] = $volume->path($target);
		$cwd = array_merge($cwd, $volume->options());
		$files = array();
		
		// get folders trees
		if ($args['tree']) {
			foreach ($this->volumes as $id => $v) {
				$tree = $v->tree();
				if ($tree === false && $id == $volume->id()) {
					return array('error' => $this->errorMessage($volume->error()));
				}
				if ($tree) {
					$files = array_merge($files, $tree);
				}
			}
		}

		// get current working directory files list and add to $files if not exists in it
		if (($ls = $volume->readdir($target, $args['mimes'])) === false) {
			return array('error' => $this->errorMessage($volume->error()));
		}
		
		foreach ($ls as $file) {
			if (!in_array($file, $files)) {
				$files[] = $file;
			}
		}

		$result = array(
			'cwd'   => $cwd,
			'files' => $files
		);

		if (!empty($args['init'])) {
			$result['api'] = $this->version;
			$result['uplMaxSize'] = ini_get('upload_max_filesize');
		}

		return $result;
	}
	
	/**
	 * Return subdirs for required directory
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function tree($args) {
		$dir = $args['target'];
		
		if (($volume = $this->volume($dir)) == false) {
			return array('error' => $this->error(ERROR_NOT_FOUND));
		}
		if (($tree = $volume->tree($dir)) === false) {
			return array('error' => $this->error($volume->error()));
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
		$dir = $args['target'];
				
		if (($volume = $this->volume($dir)) == false) {
			return array('error' => $this->errorMessage(self::ERROR_NOT_FOUND));
		}

		return ($tree = $volume->parents($dir)) === false 
			? array('error' => $this->errorMessage($volume->error()))
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
		$images = array();
		$volume = $this->volume(is_array($args['files']) ? $args['files'][0] : '');
		
		if (!$volume) {
			return array('error' => $this->error(ERROR_NOT_FOUND));
		}
		
		foreach ($args['files'] as $hash) {
			if (($tmb = $volume->tmb($hash)) != false) {
				$images[$hash] = $tmb;
			}
		}
		
		return array(
			'current' => $args['current'],
			'images'  => $images
		);
	}
	
	/**
	 * Check for new/removed files
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function sync($args) {
		$current = $args['current'];
		$targets = $args['targets'];
		$mimes   = !empty($args['mimes']) && is_array($args['mimes']) ? $args['mimes'] : array();
		$removed = array();
		$added   = array();
		$groups  = array();
		$active  = 0;
		// sleep(3);
		// find current volume and check current dir
		foreach ($this->volumes as $id => $v) {
			if (strpos($current, $id) === 0) {
				if (!$v->fileExists($current)) {
					return array('root' => $v->root(), 'current' => $current);
				}
				$active = $id;
			}
		}

		// no current volume or dir
		if (!$active) {
			return array('root' => $this->default->root(), 'current' => $current);
		}

		// find removed files
		foreach ($this->volumes as $id => $v) {
			$groups[$id] = array();
			foreach ($targets as $i => $target) {
				if (strpos($target, $id) === 0) {
					if ($v->fileExists($target)) {
						$groups[$id][] = $target;
					} else {
						$removed[] = $target;
						unset($targets[$i]);
					}
				}
			}
			
			// find new in current directory
			if ($id == $active) {
				if (($files = $v->readdir($current, $mimes)) === false) {
					return array('root' => $v->root(), 'current' => $current);
				}
				foreach ($files as $file) {
					if (!in_array($file['hash'], $groups[$id]) && !in_array($file, $added)) {
						$added[] = $file;
					}
				}
			}
			
			// find new in tree
			$dirs = array();
			// find dirs and store its parents
			foreach ($groups[$id] as $hash) {
				if (($dir = $v->dir($hash)) != false) {
					$dirs[] = $dir['phash'] ? $dir['phash'] : $dir['hash'];
				}
			}
			// load tree for every parents dir and check dirs exists in request data
			$dirs = array_unique($dirs);
			foreach ($dirs as $hash) {
				if (($tree = $v->tree($hash, 1)) != false) {
					foreach ($tree as $dir) {
						if ($dir['hash'] != $current && !in_array($dir['hash'], $groups[$id]) && !in_array($dir, $added)) {
							$added[] = $dir;
						}
					}
				}
			}
		}

		return array('added' => $added, 'removed' => $removed, 'current' => $current);
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
		$target = $args['target'];
		
		if (($volume = $this->volume($target)) == false) {
			return array('error' => $this->error(self::ERROR_NOT_FOUND), 'headers' => 'HTTP/1.x 404 Not Found', 'raw' => true);
		}
		
		if (($file = $volume->file($target)) == false) {
			$errno = $volume->errno();
			return array('error' => $this->error($errno), 'headers' => $errno == self::ERROR_NOT_READ ? 'HTTP/1.x 403 Access Denied' : 'HTTP/1.x 404 Not Found', 'raw' => true);
		}
		
		if (($fp = $volume->open($target)) == false) {
			return array('error' => $this->error(self::ERROR_NOT_FOUND), 'headers' => 'HTTP/1.x 404 Not Found', 'raw' => true);
		}
		
		$disp  = preg_match('/^(image|text)/i', $file['mime']) 
			|| $file['mime'] == 'application/x-shockwave-flash' 
				? 'inline' 
				: 'attachments';
		
		$result = array(
			'volume'  => $volume,
			'pointer' => $fp,
			'info'    => $file,
			'header'  => array(
				"Content-Type: ".$file['mime'], 
				"Content-Disposition: ".$disp."; filename=".$file['name'],
				// "Content-Location: ".$info['name'],
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
		$target = is_array($args['targets']) ? $args['targets'][0] : '';
		
		if (!$target || ($volume = $this->volume($target)) == false) {
			return array('error' => $this->error(ERROR_NOT_FOUND));
		}
		
		foreach ($args['targets'] as $t) {
			$size += $volume->size($t);
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
		$current = $args['current'];
		
		if(($volume = $this->volume($current)) == false) {
			return array('error' => 'Folder not found');
		}
		sleep(5);
		
		return ($hash = $volume->mkdir($current, $args['name'])) === false
			? array('error' => $volume->error())
			: $this->trigger('mkdir', $volume, array('current' => $current, 'added' => array($volume->info($hash, true))));
			
	}
	
	/**
	 * Create empty file
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mkfile($args) {
		$current = $args['current'];
		
		if(($volume = $this->volume($current)) == false) {
			return array('error' => 'Folder not found');
		}
		sleep(5);
		
		return ($hash = $volume->mkfile($current, $args['name'])) === false
			? array('error' => $volume->error())
			: $this->trigger('mkfile', $volume, array('current' => $current, 'added' => array($volume->info($hash, true))));
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function rename($args) {
		$target = $args['target'];
		if (($volume = $this->volume($target)) == false) {
			return array('error' => $this->error(self::ERROR_NOT_FOUND));
		}
		
		if (($file = $volume->rename($target, $args['name'])) == false) {
			return array('error' => $this->error($volume->error()));
		}
		
		return $this->trigger('rename', $volume, array('removed' => array($target), 'added' => array($file)));
	}
	
	/**
	 * Remove dirs/files
	 * Fire "rm" event on every removed files
	 *
	 * @param array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function rm($args) {
		sleep(5);
		if (!is_array($args['targets']) || empty($args['targets'])) {
			return array();
		}
		$targets = $args['targets'];
		$removed = array();
		$volume  = $this->volume($targets[0]);
		if (!$volume) {
			return array('error' => $this->error(self::ERROR_NOT_FOUND));
		}
		
		foreach ($targets as $hash) {
			if (($file = $volume->file($hash)) == false) {
				return array('removed' => $removed, 'error' => $this->error($volume->error()));
			}

			if ($volume->rm($hash)) {
				$removed[] = $hash;
				$removedInfo[] = $file;
			} else {
				return array('error' => $this->error($volume->error()));
			}
		}
		
		$this->trigger('rm', $volume, array('removed' => $removedInfo));
		return array('removed' => $removed);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function duplicate($args) {
		$targets = is_array($args['target']) ? $args['target'] : array();
		$added = array();
		
		if (!$targets) {
			return array();
		}
		
		if (($volume = $this->volume($targets[0])) == false) {
			return array('error' => $this->error(self::ERROR_NOT_FOUND));
		}
		
		foreach ($targets as $hash) {
			if (($h = $volume->duplicate($hash)) !== false
			&& ($file = $volume->file($h)) != false) {
				$added[] = $file;
			} else {
				return array('error' => $this->error($volume->error()));
			}
		}
		
		return $this->trigger('duplicate', $volume, array('added' => $added));
	}
	
	/**
	 * Copy/move files into new destination
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function paste($args) {
		sleep(5);
		return array('error' => 'Not implemented');
		$dst     = $args['dst'];
		$targets = $args['targets'];
		$cut     = !empty($args['cut']);
		$dstRoot = $this->fileRoot($dst);
		
		if (!$dstRoot || !is_array($targets) || empty($targets)) {
			return array('error' => 'Invalid parameters');
		}
		
		$result  = array('dst' => $dst, 'copy' => array(), 'rm' => array());
		
		foreach ($targets as $src) {
			$srcRoot = $this->fileRoot($src);
			if (!$srcRoot) {
				return array('error' => 'Invalid parameters');
			}
			$copy = $dstRoot->paste($srcRoot, $src, $dst);
			// if ($srcRoot == $dstRoot) {
			// 	$copy = $dstRoot->copy($target, $dst);
			// 	if ($copy) {
			// 		$result['copy'][] = $copy;
			// 	} else {
			// 		return array('error' => $dstRoot->error());
			// 	}
			// } else {
			// 	
			// }
			// if ($cut && !$srcRoot->rm($target)) {
			// 	return array('error' => $srcRoot->error());
			// } else {
			// 	$result['rm'][] = $target;
			// }
		}
		return $result;
		
		return $dstRoot->getInfo($args['dst']);
		
		return $args;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function copy($srcRoot, $src, $dstRoot, $dst) {
		
	}
	
	/***************************************************************************/
	/*                                   misc                                  */
	/***************************************************************************/
	
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
	 * Execute all callbacks/listeners for required command
	 *
	 * @param  string  command name
	 * @param  array   data passed to callbacks
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function trigger($cmd, $volume, $result) {
		$data = array(
			'cmd'    => $cmd,
			'volume' => $volume,
			'result' => $result
		);
		if (!empty($this->listeners[$cmd])) {
			foreach ($this->listeners[$cmd] as $handler) {
				$tmp = is_array($handler)
					? $handler[0]->{$handler[1]}($data)
					: $handler($data);
				if (is_array($tmp)) {
					$data['result'] = $tmp;
				}
			}
		}
		return $data['result'];
	}
	
	protected function utime() {
		$time = explode(" ", microtime());
		return (double)$time[1] + (double)$time[0];
	}
	
}


?>