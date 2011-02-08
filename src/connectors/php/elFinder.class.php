<?php

class elFinder {
	protected $roots = array();
	
	protected $commands = array(
		'open'   => array(
			'target' => false, 
			'tree' => false, 
			'init' => false
			),
		'mkdir'  => array(
			'current' => true, 
			'name' => true
			),
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
		'debug' => false
	);
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $defaultRoot = null;
	
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

		foreach ($opts['roots'] as $i => $o) {
			$class = 'elFinderStorage'.$o['driver'];

			if (class_exists($class)) {
				$root = new $class();
				$key = strtolower(substr($o['driver'], 0, 1)).$i.'f';
				if ($root->load($o, $key)) {
					$this->roots[$key] = $root;
					if (!$this->defaultRoot && $root->isReadable('/')) {
						$this->defaultRoot = & $this->roots[$key];
						// echo $key.'<br>';
					}
				}
			}
		}
		// echo $this->default;
		// debug($this->roots);
		return !empty($this->roots);
	}
	
	public function commandExists($cmd) {
		return isset($this->commands[$cmd]) && method_exists($this, $cmd);
	}
	
	public function commandArgsList($cmd) {
		return $this->commandExists($cmd) ? $this->commands[$cmd] : array();
	}
	
	public function exec($cmd, $args) {
		return $this->$cmd($args);
	}
	
	

	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
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
		
		if (false == ($cwd = $root->fileInfo($target))) {
			return array('error' => $root->error());
		}
		
		debug($cwd);
		
		$cdc = $root->ls($target, '');
		// debug($root);
		// debug($this->defaultRoot);
	}
	
	
	
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
	
}


?>