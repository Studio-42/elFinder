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
	protected $header = 'Content-Type: application/json';
	
	
	/**
	 * Constructor
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function __construct($elFinder, $debug=false) {
		
		$this->elFinder = $elFinder;
		if ($debug) {
			$this->header = 'Content-Type: text/html; charset=utf-8';
		}
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
		if ($isPost && !$src && $rawPostData = @file_get_contents('php://input')) {
			// for support IE XDomainRequest()
			$parts = explode('&', $rawPostData);
			foreach($parts as $part) {
				list($key, $value) = array_pad(explode('=', $part), 2, '');
				$src[$key] = rawurldecode($value);
			}
			$_POST = $this->input_filter($src);
			$_REQUEST = $this->input_filter(array_merge_recursive($src, $_REQUEST));
		}
		$cmd    = isset($src['cmd']) ? $src['cmd'] : '';
		$args   = array();
		
		if (!function_exists('json_encode')) {
			$error = $this->elFinder->error(elFinder::ERROR_CONF, elFinder::ERROR_CONF_NO_JSON);
			$this->output(array('error' => '{"error":["'.implode('","', $error).'"]}', 'raw' => true));
		}
		
		if (!$this->elFinder->loaded()) {
			$this->output(array('error' => $this->elFinder->error(elFinder::ERROR_CONF, elFinder::ERROR_CONF_NO_VOL), 'debug' => $this->elFinder->mountErrors));
		}
		
		// telepat_mode: on
		if (!$cmd && $isPost) {
			$this->output(array('error' => $this->elFinder->error(elFinder::ERROR_UPLOAD, elFinder::ERROR_UPLOAD_TOTAL_SIZE), 'header' => 'Content-Type: text/html'));
		}
		// telepat_mode: off
		
		if (!$this->elFinder->commandExists($cmd)) {
			$this->output(array('error' => $this->elFinder->error(elFinder::ERROR_UNKNOWN_CMD)));
		}
		
		// collect required arguments to exec command
		foreach ($this->elFinder->commandArgsList($cmd) as $name => $req) {
			$arg = $name == 'FILES' 
				? $_FILES 
				: (isset($src[$name]) ? $src[$name] : '');
				
			if (!is_array($arg)) {
				$arg = trim($arg);
			}
			if ($req && (!isset($arg) || $arg === '')) {
				$this->output(array('error' => $this->elFinder->error(elFinder::ERROR_INV_PARAMS, $cmd)));
			}
			$args[$name] = $arg;
		}
		
		$args['debug'] = isset($src['debug']) ? !!$src['debug'] : false;
		
		$this->output($this->elFinder->exec($cmd, $this->input_filter($args)));
	}
	
	/**
	 * Output json
	 *
	 * @param  array  data to output
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function output(array $data) {
		$header = isset($data['header']) ? $data['header'] : $this->header;
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
				$data['volume']->close($data['pointer'], $data['info']['hash']);
			}
			exit();
		} else {
			if (!empty($data['raw']) && !empty($data['error'])) {
				exit($data['error']);
			} else {
				exit(json_encode($data));
			}
		}
		
	}
	
	/**
	 * Remove null & stripslashes applies on "magic_quotes_gpc"
	 * 
	 * @param  mixed  $args
	 * @return mixed
	 * @author Naoki Sawada
	 */
	private function input_filter($args) {
		static $magic_quotes_gpc = NULL;
		
		if ($magic_quotes_gpc === NULL)
			$magic_quotes_gpc = (version_compare(PHP_VERSION, '5.4', '<') && get_magic_quotes_gpc());
		
		if (is_array($args)) {
			return array_map(array(& $this, 'input_filter'), $args);
		}
		$res = str_replace("\0", '', $args);
		$magic_quotes_gpc && ($res = stripslashes($res));
		return $res;
	}
}// END class 
