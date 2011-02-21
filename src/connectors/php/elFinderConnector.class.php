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
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $header = 'Content-Type: text/html' /*'Content-Type: application/json'*/;
	
	/**
	 * Constructor
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function __construct($elFinder) {
		if (!function_exists('json_encode')) {
			$this->output(array('error' => '{"error":"PHP JSON module not installed"}', 'raw' => true));
		}
		
		$this->elFinder = $elFinder;
		
	}
	
	/**
	 * Execute elFinder command and output result
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function run() {
		$isPost = $_SERVER["REQUEST_METHOD"] == 'POST';
		$src    = $_SERVER["REQUEST_METHOD"] == 'POST' ? $_POST : $_GET;
		$cmd    = isset($src['cmd']) ? $src['cmd'] : '';
		$args   = array();
		
		if (!function_exists('json_encode')) {
			header($this->header);
			exit('{"error":"PHP JSON module not installed"}');
		}
		
		if (!$this->elFinder->loaded()) {
			$this->output(array('error' => 'Invalid backend configuration'));
		}
		
		// telepat_mode: on
		if (!$cmd && $isPost) {
			$this->output(array('error' => 'Data exceeds the maximum allowed size', 'header' => 'Content-Type: text/html'));
		}
		// telepat_mode: off
		
		if (!$this->elFinder->commandExists($cmd)) {
			$this->output(array('error' => 'Unknown command'));
		}
		
		// collect required arguments to exec command
		foreach ($this->elFinder->commandArgsList($cmd) as $name => $req) {
			$arg = $name == 'FILES' 
				? $_FILES 
				: (isset($src[$name]) ? $src[$name] : '');
				
			if (!is_array($arg)) {
				$arg = trim($arg);
			}
			if ($req && empty($arg)) {
				$this->output(array('error' => 'Invalid parameters'));
			}
			$args[$name] = $arg;
		}
		
		$args['debug'] = isset($src['debug']) ? !!$src['debug'] : false;
		
		$this->output($this->elFinder->exec($cmd, $args));
	}
	
	/**
	 * Output json
	 *
	 * @param  array  data to output
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function output(array $data) {
		$header = isset($data['header']) ? $data['header'] : 'Content-Type: text/html' /*'Content-Type: application/json'*/;
		unset($data['header']);
		
		if ($header) {
			if (is_array($header)) {
				foreach ($header as $h) {
					header($h);
				}
			} else {
				header($header);
			}
		}
		
		if (isset($data['pointer'])) {
			rewind($data['pointer']);
			fpassthru($data['pointer']);
			if (!empty($data['volume'])) {
				$data['volume']->fclose($data['pointer']);
			}
		} else {
			if (!empty($data['raw']) && !empty($data['error'])) {
				exit($data['error']);
			} else {
				exit(json_encode($data));
			}
		}
		
	}
	
}// END class 

?>