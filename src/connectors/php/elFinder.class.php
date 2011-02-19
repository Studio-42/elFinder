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
		'tmb'       => array('current' => true),
		'file'      => array('target' => true),
		'mkdir'     => array('current' => true, 'name' => true),
		'mkfile'    => array('current' => true, 'name' => true),
		'rm'        => array('targets' => true),
		'rename'    => array(),
		'duplicate' => array('current' => true, 'target' => true),
		
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
	 * Constructor
	 *
	 * @param  array  elFinder and roots configurations
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function __construct($opts) {
		$this->time  = $this->utime();
		$this->debug = !empty($opts['debug']);
		
		// disable requied commands
		if (isset($opts['disable']) && is_array($opts['disable'])) {
			foreach ($opts['disable'] as $cmd) {
				if (!preg_match('/^(open|tree|tmb|file|ping)$/', $cmd) && isset($this->commands[$cmd])) {
					unset($this->commands[$cmd]);
				}
			}
		}
		
		// bind events listeners
		if (isset($opts['bind']) && is_array($opts['bind'])) {
			foreach ($opts['bind'] as $cmd => $handler) {
				$this->bind($cmd, $handler);
			}
		}

		// load storages
		if (isset($opts['roots']) && is_array($opts['roots'])) {
			
			foreach ($opts['roots'] as $i => $o) {
				$class = 'elFinderVolume'.$o['driver'];

				if (class_exists($class)) {
					$volume = new $class();
					
					// unique volume id - used as prefix to files hash
					$id = $volume->driverid().$i;
					
					if ($volume->mount($id, $o)) {
						$this->volumes[$id] = $volume;
						if (!$this->default && $volume->isReadable($volume->root())) {
							$this->default = $this->volumes[$id];
						}
					}
				}
			}
		}
		// if at least one redable volume - ii des
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
	 * @param  string  command name
	 * @param  array   command arguments
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
		
		// if ($this->debug) {
		// 	$result['debug'] = array(
		// 		'connector' => 'php', 
		// 		'time'      => $this->utime() - $this->time
		// 		);
		// 	foreach ($this->roots as $key => $root) {
		// 		$result['debug'][$key] = $root->debug();
		// 	}
		// }
		
		return $result;
	}
	
	/***************************************************************************/
	/*                                 commands                                */
	/***************************************************************************/

	
	/**
	 * "Open" directory
	 * Return cwd,cdc,[tree, params] for client
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function open($args) {
		$result = array();
		$target = $args['target'];
		$volume = $this->volume($target);
		
		if (!$volume) {
			if ($args['init']) {
				// on init request we can get invalid dir hash -
				// dir which already does not exists but stored in cookie from last session,
				// so open default dir
				$volume = $this->default;
				if (false == ($target = $volume->start())) {
					$target = $volume->root();
				}
			} else {
				return array('error' => 'Invalid parameters');
			}
		}
		
		if (false === ($result['cwd'] = $volume->dir($target))) {
			return array('error' => $volume->error());
		}
		
		if (false === ($result['cdc'] = $volume->scandir($target))) {
			return array('error' => $volume->error());
		}
		
		
		if ($args['tree']) {
			$result['tree'] = array();
			foreach ($this->volumes as $volume) {
				if (false == ($tree = $volume->tree(''))) {
					return array('error' => $volume->error());
				}
				$result['tree'] = array_merge($result['tree'], $tree);
			}
		}
		
		if (!empty($args['init'])) {
			$result['api'] = $this->version;
			$result['params'] = array(
				'commands'   => array_keys($this->commands),
				'uplMaxSize' => ini_get('upload_max_filesize')
			);
		}
		
		if (!empty($args['debug'])) {
			$result['debug'] = array();
			foreach ($this->volumes as $id => $volume) {
				$result['debug'][$id] = $volume->debug();
			}
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
		$target = $args['target'];
		$root = $this->fileRoot($target);
		
		if (!$root || !$root->isDir($target)) {
			return array('error' => 'Invalid parameters');
		}
		
		return array('tree' => $root->tree($target));
	}
	
	/**
	 * Return new created thumbnails list
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function tmb($args) {

		$root = $this->fileRoot($args['current']);
		
		if (!$root) {
			return array('error' => 'Invalid parameters');
		}
		
		if (false === ($result = $root->tmb($args['current']))) {
			return array('error' => $root->error());
		}
		
		return $result;
	}
	
	/**
	 * Required to output file in browser when option fileURL == false 
	 * Return array contains opened file pointer, root itself and required headers
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function file($args) {

		$hash = $args['target'];
		$root = $this->fileRoot($hash);
		if (!$root) {
			return array('error' => 'Invalid parameters', 'headers' => 'HTTP/1.x 404 Not Found', 'raw' => true);
		}
		
		$result = $root->file($hash);
		
		if (!$result) {
			$error = $root->error();
			return array('error' => $error, 'headers' => $error == 'Access denied' ? 'HTTP/1.x 403 Access Denied' : 'HTTP/1.x 404 Not Found', 'raw' => true);
		}
		
		return $result;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function mkdir($args) {
		$root = $this->fileRoot($args['current']);
		if (!$root) {
			return array('error' => 'Invalid parameters');
		}
		
		if (false == ($hash = $root->mkdir($args['current'], $args['name']))) {
			return array('error' => $root->error());
		}
		
		return $this->trigger('mkdir', $args, $root, array('current' => $args['current'], 'dir' => $root->getInfo($hash)));
		// return array('current' => $args['current'], 'dir' => $root->getInfo($hash));
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function mkfile($args) {
		$root = $this->fileRoot($args['current']);
		if (!$root) {
			return array('error' => 'Invalid parameters');
		}
		if (false == ($hash = $root->mkfile($args['current'], $args['name']))) {
			return array('error' => $root->error());
		}
		return array('current' => $args['current'], 'file' => $root->getInfo($hash));
	}
	
	/**
	 * Remove dirs/files
	 *
	 * @param array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function rm($args) {
		$removed = array();
		
		if (!is_array($args['targets'])) {
			return array('error' => 'Invalid parameters');
		}
		
		foreach ($args['targets'] as $hash) {
			if (false == ($root = $this->fileRoot($hash))) {
				return array('error' => 'File not found');
			}
			
			if ($root->rm($hash)) {
				$removed[] = $hash;
			} else {
				return array('error' => $root->error());
			}
		}
		
		return array('removed' => $removed);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function duplicate($args) {
		$root = $this->fileRoot($args['current']);
		if (!$root || !is_array($args['target']) || empty($args['target'])) {
			return array('error' => 'Invalid parameters');
		}
		
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
			if (strpos($hash, $id) === 0 && $v->fileExists($hash)) {
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
	protected function trigger($cmd, $args, $root, $result) {
		$data = array(
			'cmd' => $cmd,
			'args' => $args,
			'root' => $root,
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