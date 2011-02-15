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
	protected $roots = array();
	
	/**
	 * Default root (storage)
	 *
	 * @var elFinderStorageDriver
	 **/
	protected $defaultRoot = null;
	
	/**
	 * Commands and required arguments list
	 *
	 * @var array
	 **/
	protected $commands = array(
		'open'      => array('target' => false, 'tree' => false, 'init' => false),
		'tree'      => array('target' => true),
		'tmb'       => array('current' => true),
		'file'      => array('target' => true),
		'mkdir'     => array('current' => true, 'name' => true),
		'mkfile'    => array('current' => true, 'name' => true),
		'rm'        => array('targets' => true),
		'rename'    => array(),
		'duplicate' => array(),
		
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
		'disabled' => array(), // list commands to disable
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
	 * Load storages (roots)
	 * Return true if at least one storage available
	 *
	 * @param  array  elFinder and storages configuration
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function load(array $opts) {
		$this->time = $this->utime();
		if (isset($opts['defaults']) && is_array($opts['defaults'])) {
			$this->options = array_merge($this->options, $opts['defaults']);
		}

		if (empty($opts['roots']) || !is_array($opts['roots'])) {
			return false;
		}

		// disable requied commands
		$this->options['disabled'] = $this->disabled($this->options['disabled']);
		foreach ($this->options['disabled'] as $cmd) {
			unset($this->commands[$cmd]);
		}

		// load storages
		foreach ($opts['roots'] as $i => $o) {
			$class = 'elFinderStorage'.$o['driver'];

			if (class_exists($class)) {
				$root = new $class();
				// storage id - used as prefix to files hash
				$key  = strtolower(substr($o['driver'], 0, 1)).$i.'f';
				// check disabled commands fo storage
				$o['disabled'] = $this->disabled(@$o['disabled']);
				if ($root->load($o, $key)) {
					$this->roots[$key] = $root;
					if (!$this->defaultRoot && $root->isReadable('/')) {
						// first readable root is default root
						$this->defaultRoot = & $this->roots[$key];
					}
				}
			}
		}

		return !empty($this->roots);
	}
	
	/**
	 * Return version (api) number
	 * Required to correct interaction with client
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
	 * @author Dmitry Levashov
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
	 * @author Dmitry Levashov
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
		return isset($this->commands[$cmd]) && method_exists($this, $cmd);
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
		
		$result = $this->$cmd($args);
		$result['debug'] = array(
			'connector' => 'php', 
			'time' => $this->utime() - $this->time
			);
		// exit( $result['debug']['time']);
		if ($this->options['debug']) {
			foreach ($this->roots as $key => $root) {
				$result['debug'][$key] = $root->debug();
			}
		}
		
		$this->trigger($cmd, array_merge($result, array('cmd' => $cmd, 'args' => $args)));
		
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
		$root   = $this->fileRoot($target);
		
		if (!$root) {
			if ($args['init']) {
				$root   = $this->defaultRoot;
				$target = $root->rootHash();
			} else {
				return array('error' => 'Invalid parameters');
			}
		}
		
		if (!$root->isDir($target)) {
			return array('error' => 'Invalid parameters');
		}
		
		if (false === ($result['cwd'] = $root->dirInfo($target, isset($args['init'])))) {
			return array('error' => $root->error());
		}

		$sort = (int)$args['sort'];
		if ($sort < self::$SORT_NAME_DIRS_FIRST || $sort > self::$SORT_SIZE) {
			$sort = self::$SORT_NAME_DIRS_FIRST;
		}

		$mimes = !empty($args['mimes']) && is_array($args['mimes']) ? $args['mimes'] : array();
		if (false === ($result['cdc'] = $root->dirContent($target, $sort, $mimes))) {
			return array('error' => $root->error());
		}
		
		if ($args['tree']) {
			$result['tree'] = array();
			
			foreach ($this->roots as $r) {
				$hash = $r->rootHash();
				$result['tree'] = array_merge($result['tree'], $r->tree($hash, $r === $root ? $target : null));
			}
		}
		
		if ($args['init']) {
			$result['api'] = $this->version;
			$result['params'] = array(
				'disabled'   => $this->options['disabled'],
				'uplMaxSize' => ini_get('upload_max_filesize')
			);
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
		return array('current' => $args['current'], 'dir' => $root->getInfo($hash));
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
	protected function fileRoot($hash) {
		foreach ($this->roots as $key => $root) {
			if (strpos($hash, $key) === 0 && $root->fileExists($hash)) {
				return $root;
			}
		}
		return false;
	}
	
	/**
	 * Check commands names to be disabled and fix if required
	 *
	 * @param  array  commands names
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function disabled($cmds) {
		$disabled = array();
		if (is_array($cmds)) {
			foreach ($cmds as $cmd) {
				if (isset($this->commands[$cmd]) && !preg_match('/^(open|tree|tmb|ping)$/', $cmd)) {
					$disabled[] = $cmd;
				}
			}
		}
		return $disabled;
	}
	
	/**
	 * Execute all callbacks/listeners for required command
	 *
	 * @param  string  command name
	 * @param  array   data passed to callbacks
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function trigger($cmd, $data) {
		if (!empty($this->listeners[$cmd])) {
			foreach ($this->listeners[$cmd] as $handler) {
				if (is_array($handler)) {
					$handler[0]->{$handler[1]}($data);
				} else {
					$handler($data);
				}
			}
		}
	}
	
	protected function utime() {
		$time = explode(" ", microtime());
		return (double)$time[1] + (double)$time[0];
	}
	
}


?>