<?php

class elFinder {
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $version = '1.2';
	
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
		'open'   => array(
			'target' => false, 
			'tree'   => false, 
			'init'   => false,
			'sort'   => false
			),
		'tmb' => array(),
		'mkdir'  => array(
			'current' => true, 
			'name' => true
			),
		'mkfile' => array(),
		'rename' => array(),
		'duplicate' => array(),
		'rm' => array(),
		'paste' => array(),
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
		list($result, $header) = $this->$cmd($args);
		$result['debug'] = array();
		if ($this->options['debug']) {
			foreach ($this->roots as $key => $root) {
				$result['debug'][$key] = $root->debug();
			}
		}
		
		return array($result, '');
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
		if ($sort < self::$SORT_NAME_DIRS_FIRST || $sort >self::$SORT_SIZE) {
			$sort = self::$SORT_KIND_DIRS_FIRST;
		}
		
		if (false === ($result['cdc'] = $root->dirContent($target, $sort))) {
			return array('error' => $root->error());
		}
		
		if ($args['tree']) {
			$result['tree2'] = array();
			
			foreach ($this->roots as $r) {
				$hash = $r->rootHash();
				$result['tree2'] = array_merge($result['tree2'], $r->tree($hash, $r === $root ? $target : null));
			}
		}
		
		if ($args['init']) {
			$result['api'] = $this->version;
			$result['params'] = array(
				'disabled'   => $this->options['disabled'],
				'uplMaxSize' => ini_get('upload_max_filesize')
			);
		}
		
		return array($result, '');
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
	
	
	
}


?>