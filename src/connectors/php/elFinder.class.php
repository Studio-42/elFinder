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
	protected $default = '';
	
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
					if (!$this->default && $root->isReadable('/')) {
						$this->default = $key;
					}
				}
			}
		}
		echo $this->default;
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
		
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function open()
	{
	}
	
}


?>