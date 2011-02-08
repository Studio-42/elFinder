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

		foreach ($opts['roots'] as $o) {
			$class = 'elFinderStorage'.$o['driver'];

			if (class_exists($class)) {
				$root = new $class();
				
				if ($root->load($o)) {
					$this->roots[] = $root;
				}
			}
		}
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