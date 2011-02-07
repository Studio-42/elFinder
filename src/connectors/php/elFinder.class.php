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
	
	private function __constructs($opts) {
		
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function load() {
		
		return true;
		// return !empty($this->roots);
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