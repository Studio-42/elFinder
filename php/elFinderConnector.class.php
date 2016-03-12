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
				$key = rawurldecode($key);
				if (substr($key, -2) === '[]') {
					$key = substr($key, 0, strlen($key) - 2);
					if (!isset($src[$key])) {
						$src[$key] = array();
					}
					$src[$key][] = rawurldecode($value);
				} else {
					$src[$key] = rawurldecode($value);
				}
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
			
				if (!is_array($arg)) {
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
		// clear output buffer
		while(ob_get_level() && @ob_end_clean()){}
		
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
			$toEnd = true;
			$fp = $data['pointer'];
			if (elFinder::isSeekableStream($fp) && (array_search('Accept-Ranges: none', headers_list()) === false)) {
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
							
							fseek($fp, $start);
						}
					}
				}
				if (is_null($psize)){
					rewind($fp);
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

			// unlock session data for multiple access
			$this->elFinder->getSession()->close();
			// client disconnect should abort
			ignore_user_abort(false);

			if ($toEnd) {
				fpassthru($fp);
			} else {
				$out = fopen('php://output', 'wb');
				stream_copy_to_stream($fp, $out, $psize);
				fclose($out);
			}
			if (!empty($data['volume'])) {
				$data['volume']->close($data['pointer'], $data['info']['hash']);
			}
			exit();
		} else {
			if (!empty($data['raw']) && !empty($data['error'])) {
				echo $data['error'];
			} else {
				echo json_encode($data);
			}
			flush();
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
}// END class 
