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
			$this->output(array('error' => '{"error":"PHP JSON module not installed"}', 'raw' => true));
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
			$this->output(array('error' => 'Data exceeds the maximum allowed size', 'header' => 'Content-Type: text/html'));
		}
		// telepat_mode: off
				
		if (!$this->elFinder->commandExists($cmd)) {
			$this->output(array('error' => 'Unknown command'));
		}
		
		foreach ($this->elFinder->commandArgsList($cmd) as $name => $req) {
			$arg = $name == 'FILES' ? $_FILES : (isset($src[$name]) ? $src[$name] : '');
			if (!is_array($arg)) {
				$arg = trim($arg);
			}
			if ($req && empty($arg)) {
				$this->output(array('error' => 'Invalid parameters'));
			}
			$args[$name] = $arg;
		}
		
		
		if (!empty($src['mimes']) && is_array($src['mimes'])) {
			$args['mimes'] = $src['mimes'];
		}
		if (!empty($src['sort'])) {
			$args['sort'] = $src['sort'];
		}
		
		$this->output($this->elFinder->exec($cmd, $args));
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
	 * @author Dmitry (dio) Levashov
	 **/
	public function bind($cmd, $handler) {
		$this->elFinder->bind($cmd, $handler);
	}
	
	/**
	 * remove handler from elFinder command
	 *
	 * @param  string  command name
	 * @param  string|array  callback name or array(object, method)
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function unbind($cmd, $handler) {
		$this->elFinder->unbind($cmd, $handler);
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
		$raw    = isset($data['raw']) ? $data['raw'] : false;
		if (isset($data['header'])) {
			unset($data['header']);
		} 
		if (isset($data['raw'])) {
			unset($data['raw']);
		}
		
		
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
			if (!empty($data['root'])) {
				$data['root']->close($data['pointer']);
			}
		} else {
			exit($raw ? $data['error'] : json_encode($data));
		}
		
		
	}
	
}// END class 

?>