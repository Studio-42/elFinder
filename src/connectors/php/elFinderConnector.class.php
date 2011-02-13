<?php
/**
 * Default elFinder connector
 *
 * @author Dmitry (dio) Levashov
 **/
class elFinderConnector {
	/**
	 * elFinder instance
	 *
	 * @var elFinder
	 **/
	protected $elFinder;
	
	/**
	 * Options
	 *
	 * @var aray
	 **/
	protected $options = array();
	
	/**
	 * Constructor
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function __construct($opts) {
		if (!function_exists('json_encode')) {
			header("Content-Type: application/json");
			exit('{"error":"PHP JSON module not installed"}');
		}
		
		$this->elFinder = new elFinder();
		
		if (isset($opts['bind']) && is_array($opts['bind'])) {
			foreach ($opts['bind'] as $cmd => $handler) {
				$this->elFinder->bind($cmd, $handler);
			}
			unset($opts['bind']);
		}
		
		$this->options = $opts;
	}
	
	/**
	 * Execute elFinder command and output result
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function run() {
		$isPost = $_SERVER["REQUEST_METHOD"] == 'POST';
		$src    = $isPost ? $_POST : $_GET;
		$cmd    = isset($src['cmd']) ? $src['cmd'] : '';
		$args   = array();
		
		if (!$this->elFinder->load($this->options)) {
			$this->output(array('error' => 'Invalid backend configuration'));
		}
			
		// telepat_mode: on
		if (!$cmd && $isPost) {
			$this->output(array('error' => 'Data exceeds the maximum allowed size'), 'Content-Type: text/html');
		}
		// telepat_mode: off
				
		if (!$this->elFinder->commandExists($cmd)) {
			$this->output(array('error' => 'Unknown command'));
		}
		
		foreach ($this->elFinder->commandArgsList($cmd) as $name => $req) {
			$arg = $name == 'FILES' ? $_FILES : (isset($src[$name]) ? trim($src[$name]) : '');
			if ($req && empty($arg)) {
				$this->output('Invalid parameters');
			}
			$args[$name] = $arg;
		}
		
		$result = $this->elFinder->exec($cmd, $args);
		
		$this->output($result, !empty($result['header']) ? $result['header'] : 'Content-Type: text/html' /*'Content-Type: application/json'*/);
		
		
	}
	
	/**
	 * Return elFinder instance
	 *
	 * @return elFinder
	 * @author Dmitry (dio) Levashov
	 **/
	public function get() {
		return $this->elFinder;
	}
	
	/**
	 * Add handler to elFinder command
	 *
	 * @param  string  command name
	 * @param  string|array  callback name or array(object, method)
	 * @return void
	 * @author Dmitry Levashov
	 **/
	public function bind($cmd, $handler) {
		$this->elFinder->bind($cmd, $handler);
	}
	
	/**
	 * Output json
	 *
	 * @param  array  data to output
	 * @param  header[s]
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function output($data, $header) {
		if ($header) {
			if (is_array($header)) {
				foreach ($header as $h) {
					header($h);
				}
			} else {
				header($header);
			}
			
		}
		exit(json_encode($data));
	}
	
}// END class 

?>