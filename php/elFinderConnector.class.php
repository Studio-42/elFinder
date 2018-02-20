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
	 * Must be use output($data) $data['header']
	 *
	 * @var string
	 * @deprecated
	 **/
	protected $header = '';

	/**
	 * HTTP request method
	 * 
	 * @var string
	 */
	protected $reqMethod = '';
	
	/**
	 * Content type of output JSON
	 * 
	 * @var string
	 */
	protected static $contentType = 'Content-Type: application/json; charset=utf-8';
	
	/**
	 * Constructor
	 *
	 * @param $elFinder
	 * @param bool $debug
	 * @author Dmitry (dio) Levashov
	 */
	public function __construct($elFinder, $debug=false) {
		
		$this->elFinder = $elFinder;
		$this->reqMethod = strtoupper($_SERVER["REQUEST_METHOD"]);
		if ($debug) {
			self::$contentType = 'Content-Type: text/plain; charset=utf-8';
		}
	}
	
	/**
	 * Execute elFinder command and output result
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function run() {
		$isPost = $this->reqMethod === 'POST';
		$src    = $isPost ? array_merge($_GET, $_POST) : $_GET;
		$maxInputVars = (! $src || isset($src['targets']))? ini_get('max_input_vars') : null;
		if ((! $src || $maxInputVars) && $rawPostData = file_get_contents('php://input')) {
			// for max_input_vars and supports IE XDomainRequest()
			$parts = explode('&', $rawPostData);
			if (! $src || $maxInputVars < count($parts)) {
				$src = array();
				foreach($parts as $part) {
					list($key, $value) = array_pad(explode('=', $part), 2, '');
					$key = rawurldecode($key);
					if (preg_match('/^(.+?)\[([^\[\]]*)\]$/', $key, $m)) {
						$key = $m[1];
						$idx = $m[2];
						if (!isset($src[$key])) {
							$src[$key] = array();
						}
						if ($idx) {
							$src[$key][$idx] = rawurldecode($value);
						} else {
							$src[$key][] = rawurldecode($value);
						}
					} else {
						$src[$key] = rawurldecode($value);
					}
				}
				$_POST = $this->input_filter($src);
				$_REQUEST = $this->input_filter(array_merge_recursive($src, $_REQUEST));
			}
		}
		
		if (isset($src['targets']) && $this->elFinder->maxTargets && count($src['targets']) > $this->elFinder->maxTargets) {
			$error = $this->elFinder->error(elFinder::ERROR_MAX_TARGTES);
			$this->output(array('error' => $this->elFinder->error(elFinder::ERROR_MAX_TARGTES)));
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
		$hasFiles = false;
		foreach ($this->elFinder->commandArgsList($cmd) as $name => $req) {
			if ($name === 'FILES') {
				if (isset($_FILES)) {
					$hasFiles = true;
				} elseif ($req) {
					$this->output(array('error' => $this->elFinder->error(elFinder::ERROR_INV_PARAMS, $cmd)));
				}
			} else {
				$arg = isset($src[$name])? $src[$name] : '';
			
				if (!is_array($arg) && $req !== '') {
					$arg = trim($arg);
				}
				if ($req && $arg === '') {
					$this->output(array('error' => $this->elFinder->error(elFinder::ERROR_INV_PARAMS, $cmd)));
				}
				$args[$name] = $arg;
			}
		}
		
		$args['debug'] = isset($src['debug']) ? !!$src['debug'] : false;
		
		$args = $this->input_filter($args);
		if ($hasFiles) {
			$args['FILES'] = $_FILES;
		}
		
		try {
			$this->output($this->elFinder->exec($cmd, $args));
		} catch (elFinderAbortException $e) {
			// connection aborted
			// unlock session data for multiple access
			$this->elFinder->getSession()->close();
			exit();
		}
	}
	
	/**
	 * Output json
	 *
	 * @param  array  data to output
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function output(array $data) {
		// unlock session data for multiple access
		$this->elFinder->getSession()->close();
		// client disconnect should abort
		ignore_user_abort(false);
		
		if ($this->header) {
			self::sendHeader($this->header);
		}
		
		if (isset($data['pointer'])) {
			// set time limit to 0
			elFinder::extendTimeLimit(0);
			
			// send optional header
			if (!empty($data['header'])) {
				self::sendHeader($data['header']);
			}
			
			// clear output buffer
			while(ob_get_level() && ob_end_clean()){}
			
			$toEnd = true;
			$fp = $data['pointer'];
			$sendData = !($this->reqMethod === 'HEAD' || !empty($data['info']['xsendfile']));
			if (($this->reqMethod === 'GET' || !$sendData)
					&& elFinder::isSeekableStream($fp)
					&& (array_search('Accept-Ranges: none', headers_list()) === false)) {
				header('Accept-Ranges: bytes');
				$psize = null;
				if (!empty($_SERVER['HTTP_RANGE'])) {
					$size = $data['info']['size'];
					$start = 0;
					$end = $size - 1;
					if (preg_match('/bytes=(\d*)-(\d*)(,?)/i', $_SERVER['HTTP_RANGE'], $matches)) {
						if (empty($matches[3])) {
							if (empty($matches[1]) && $matches[1] !== '0') {
								$start = $size - $matches[2];
							} else {
								$start = intval($matches[1]);
								if (!empty($matches[2])) {
									$end = intval($matches[2]);
									if ($end >= $size) {
										$end = $size - 1;
									}
									$toEnd = ($end == ($size - 1));
								}
							}
							$psize = $end - $start + 1;
							
							header('HTTP/1.1 206 Partial Content');
							header('Content-Length: ' . $psize);
							header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
							
							// Apache mod_xsendfile dose not support range request
							if (isset($data['info']['xsendfile']) && strtolower($data['info']['xsendfile']) === 'x-sendfile') {
								if (function_exists('header_remove')) {
									header_remove($data['info']['xsendfile']);
								} else {
									header($data['info']['xsendfile'] . ':');
								}
								unset($data['info']['xsendfile']);
								if ($this->reqMethod !== 'HEAD') {
									$sendData = true;
								}
							}
							
							$sendData && fseek($fp, $start);
						}
					}
				}
				if ($sendData && is_null($psize)){
					elFinder::rewind($fp);
				}
			} else {
				header('Accept-Ranges: none');
				if (isset($data['info']) && ! $data['info']['size']) {
					if (function_exists('header_remove')) {
						header_remove('Content-Length');
					} else {
						header('Content-Length:');
					}
				}
			}

			if ($sendData) {
				if ($toEnd) {
					fpassthru($fp);
				} else {
					$out = fopen('php://output', 'wb');
					stream_copy_to_stream($fp, $out, $psize);
					fclose($out);
				}
			}
			
			if (!empty($data['volume'])) {
				$data['volume']->close($data['pointer'], $data['info']['hash']);
			}
			exit();
		} else {
			self::outputJson($data);
			exit(0);
		}
	}
	
	/**
	 * Remove null & stripslashes applies on "magic_quotes_gpc"
	 * 
	 * @param  mixed  $args
	 * @return mixed
	 * @author Naoki Sawada
	 */
	protected function input_filter($args) {
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
	
	/**
	 * Send HTTP header
	 * 
	 * @param string|array $header optional header
	 */
	protected static function sendHeader($header = null) {
		if ($header) {
			if (is_array($header)) {
				foreach ($header as $h) {
					header($h);
				}
			} else {
				header($header);
			}
		}
	}
	
	/**
	 * Output JSON
	 * 
	 * @param array $data
	 */
	public static function outputJson($data) {
		// send header
		$header = isset($data['header']) ? $data['header'] : self::$contentType;
		self::sendHeader($header);
		
		unset($data['header']);
		
		if (!empty($data['raw']) && isset($data['error'])) {
			$out = $data['error'];
		} else {
			if (isset($data['debug']) && isset($data['debug']['phpErrors'])) {
				$data['debug']['phpErrors'] = array_merge($data['debug']['phpErrors'], elFinder::$phpErrors);
			}
			$out = json_encode($data);
		}
		
		// clear output buffer
		while(ob_get_level() && ob_end_clean()){}
		
		header('Content-Length: ' . strlen($out));
		
		echo $out;
		
		flush();
	}
}// END class 
