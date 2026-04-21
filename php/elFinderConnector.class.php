<?php

/**
 * Default elFinder connector
 *
 * @author Dmitry (dio) Levashov
 **/
class elFinderConnector
{
    /**
     * elFinder instance
     *
     * @var elFinder
     **/
    protected $elFinder;

    /**
     * Options
     *
     * @var array
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
     * CSRF token header name
     *
     * @var string
     */
    protected static $csrfHeaderName = 'X-elFinder-CSRF';

    /**
     * JSON response key for CSRF token
     *
     * @var string
     */
    protected static $csrfResponseKey = 'csrf';

    /**
     * Session key for CSRF token data
     *
     * @var string
     */
    protected static $csrfSessionKey = 'elfinder.csrf';

    /**
     * Default CSRF token TTL seconds
     *
     * @var int
     */
    protected static $csrfTokenTtl = 900;

    /**
     * Commands that require CSRF header validation
     *
     * @var array
     */
    protected static $csrfProtectedCmds = array(
        'archive' => true,
        'chmod' => true,
        'dim' => true,
        'duplicate' => true,
        'editor' => true,
        'extract' => true,
        'mkdir' => true,
        'mkfile' => true,
        'netmount' => true,
        'paste' => true,
        'put' => true,
        'rename' => true,
        'resize' => true,
        'rm' => true,
        'upload' => true
    );

    /**
     * Constructor
     *
     * @param      $elFinder
     * @param bool $debug
     *
     * @author Dmitry (dio) Levashov
     */
    public function __construct($elFinder, $debug = false)
    {

        $this->elFinder = $elFinder;
        $this->reqMethod = strtoupper($_SERVER["REQUEST_METHOD"]);
        if ($debug) {
            self::$contentType = 'Content-Type: text/plain; charset=utf-8';
        }
    }

    /**
     * Determine whether the command requires CSRF validation
     *
     * @param string $cmd
     *
     * @return bool
     */
    protected function csrfProtectedCommand($cmd)
    {
        return isset(self::$csrfProtectedCmds[$cmd]);
    }

    /**
     * Determine whether current request should issue CSRF token
     *
     * @param string $cmd
     * @param array  $src
     *
     * @return bool
     */
    protected function shouldIssueCsrfToken($cmd, array $src)
    {
        return ($cmd === 'open' && !empty($src['init']));
    }

    /**
     * Determine whether current request should refresh CSRF token TTL
     *
     * @param string $cmd
     * @param array  $src
     *
     * @return bool
     */
    protected function shouldRefreshCsrfToken($cmd, array $src)
    {
        return ($cmd === 'info' && !empty($src['reload']));
    }

    /**
     * Generate or reuse current CSRF token
     *
     * @return string
     * @throws Exception
     */
    protected function issueCsrfToken()
    {
        $session = $this->elFinder->getSession();
        $now = time();
        $tokenData = $session->get(self::$csrfSessionKey, array());

        if (!is_array($tokenData)) {
            $tokenData = array();
        }

        if (empty($tokenData['token']) || empty($tokenData['expires']) || (int)$tokenData['expires'] <= $now) {
            $tokenData = array(
                'token' => $this->generateCsrfToken(),
                'expires' => $now + self::$csrfTokenTtl
            );
            $session->set(self::$csrfSessionKey, $tokenData);
        }

        return $tokenData['token'];
    }

    /**
     * Generate a random CSRF token string with old PHP compatibility
     *
     * @return string
     * @throws Exception
     */
    protected function generateCsrfToken()
    {
        if (function_exists('random_bytes')) {
            return bin2hex(random_bytes(32));
        }

        if (function_exists('openssl_random_pseudo_bytes')) {
            return bin2hex(openssl_random_pseudo_bytes(32));
        }

        return sha1(uniqid(mt_rand(), true) . microtime(true));
    }

    /**
     * Get HTTP request header value
     *
     * @param string $name
     *
     * @return string
     */
    protected function getRequestHeader($name)
    {
        $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        if (isset($_SERVER[$serverKey])) {
            return trim($_SERVER[$serverKey]);
        } else {
            if (function_exists('getallheaders')) {
                $headers = getallheaders();
                if (isset($headers[$name])) {
                    return trim($headers[$name]);
                }
            }
            return '';
        }
    }

    /**
     * Validate CSRF token header for protected commands
     *
     * @return bool
     */
    protected function validateCsrfToken()
    {
        $session = $this->elFinder->getSession();
        $tokenData = $session->get(self::$csrfSessionKey, array());
        $headerToken = $this->getRequestHeader(self::$csrfHeaderName);
        $now = time();

        if (!is_array($tokenData) || empty($tokenData['token']) || empty($tokenData['expires'])) {
            return false;
        }

        if ((int)$tokenData['expires'] <= $now) {
            $session->remove(self::$csrfSessionKey);
            return false;
        }

        if ($headerToken === '') {
            return false;
        }

        if (function_exists('hash_equals')) {
            return hash_equals($tokenData['token'], $headerToken);
        }

        return ($tokenData['token'] === $headerToken);
    }

    /**
     * Refresh current CSRF token TTL if header matches the active token
     *
     * @return bool
     */
    protected function refreshCsrfTokenTtl()
    {
        $session = $this->elFinder->getSession();
        $tokenData = $session->get(self::$csrfSessionKey, array());
        $headerToken = $this->getRequestHeader(self::$csrfHeaderName);
        $now = time();
        $isValid = false;

        if (!is_array($tokenData) || empty($tokenData['token']) || empty($tokenData['expires']) || $headerToken === '') {
            return false;
        }

        if ((int)$tokenData['expires'] <= $now) {
            $session->remove(self::$csrfSessionKey);
            return false;
        }

        if (function_exists('hash_equals')) {
            $isValid = hash_equals($tokenData['token'], $headerToken);
        } else {
            $isValid = ($tokenData['token'] === $headerToken);
        }

        if (!$isValid) {
            return false;
        }

        $tokenData['expires'] = $now + self::$csrfTokenTtl;
        $session->set(self::$csrfSessionKey, $tokenData);

        return true;
    }

    /**
     * Output CSRF validation error response
     *
     * @return void
     * @throws elFinderAbortException
     */
    protected function outputCsrfError()
    {
        $this->output(array(
            'error' => $this->elFinder->error(elFinder::ERROR_PERM_DENIED, 'Invalid request. Please reload.'),
            'csrfReload' => true,
            'header' => array(
                'HTTP/1.1 403 Forbidden',
                self::$contentType
            )
        ));
    }

    /**
     * Execute elFinder command and output result
     *
     * @return void
     * @throws Exception
     * @author Dmitry (dio) Levashov
     */
    public function run()
    {
        $isPost = $this->reqMethod === 'POST';
        $src = $isPost ? array_merge($_GET, $_POST) : $_GET;
        $maxInputVars = (!$src || isset($src['targets'])) ? ini_get('max_input_vars') : null;
        if ((!$src || $maxInputVars) && $rawPostData = file_get_contents('php://input')) {
            // for max_input_vars and supports IE XDomainRequest()
            $parts = explode('&', $rawPostData);
            if (!$src || $maxInputVars < count($parts)) {
                $src = array();
                foreach ($parts as $part) {
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
            $this->output(array('error' => $this->elFinder->error(elFinder::ERROR_MAX_TARGTES)));
        }

        $cmd = isset($src['cmd']) ? $src['cmd'] : '';
        $args = array();

        if (!function_exists('json_encode')) {
            $error = $this->elFinder->error(elFinder::ERROR_CONF, elFinder::ERROR_CONF_NO_JSON);
            $this->output(array('error' => '{"error":["' . implode('","', $error) . '"]}', 'raw' => true));
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

        if ($this->shouldRefreshCsrfToken($cmd, $src)) {
            $this->refreshCsrfTokenTtl();
        }

        if ($this->csrfProtectedCommand($cmd)) {
            if (!$this->validateCsrfToken()) {
                $this->outputCsrfError();
            }
            $this->refreshCsrfTokenTtl();
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
                $arg = isset($src[$name]) ? $src[$name] : '';

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
            $result = $this->elFinder->exec($cmd, $args);
            if ($this->shouldIssueCsrfToken($cmd, $src) && is_array($result) && !isset($result['error'])) {
                $result[self::$csrfResponseKey] = $this->issueCsrfToken();
            }
            $this->output($result);
        } catch (elFinderAbortException $e) {
            // connection aborted
            // unlock session data for multiple access
            $this->elFinder->getSession()->close();
            // HTTP response code
            header('HTTP/1.0 204 No Content');
            // clear output buffer
            while (ob_get_level() && ob_end_clean()) {
            }
            exit();
        }
    }

    /**
     * Sets the header.
     *
     * @param array|string  $value HTTP header(s)
     */
    public function setHeader($value)
    {
        $this->header = $value;
    }

    /**
     * Output json
     *
     * @param  array  data to output
     *
     * @return void
     * @throws elFinderAbortException
     * @author Dmitry (dio) Levashov
     */
    protected function output(array $data)
    {
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
            while (ob_get_level() && ob_end_clean()) {
            }

            $toEnd = true;
            $fp = $data['pointer'];
            $sendData = !($this->reqMethod === 'HEAD' || !empty($data['info']['xsendfile']));
            $psize = null;
            if (($this->reqMethod === 'GET' || !$sendData)
                && (elFinder::isSeekableStream($fp) || elFinder::isSeekableUrl($fp))
                && (array_search('Accept-Ranges: none', headers_list()) === false)) {
                header('Accept-Ranges: bytes');
                if (!empty($_SERVER['HTTP_RANGE'])) {
                    $size = $data['info']['size'];
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

                            $sendData && !elFinder::isSeekableUrl($fp) && fseek($fp, $start);
                        }
                    }
                }
                if ($sendData && is_null($psize)) {
                    elFinder::rewind($fp);
                }
            } else {
                header('Accept-Ranges: none');
                if (isset($data['info']) && !$data['info']['size']) {
                    if (function_exists('header_remove')) {
                        header_remove('Content-Length');
                    } else {
                        header('Content-Length:');
                    }
                }
            }

            if ($sendData) {
                if ($toEnd || elFinder::isSeekableUrl($fp)) {
                    // PHP < 5.6 has a bug of fpassthru
                    // see https://bugs.php.net/bug.php?id=66736
                    if (version_compare(PHP_VERSION, '5.6', '<')) {
                        file_put_contents('php://output', $fp);
                    } else {
                        fpassthru($fp);
                    }
                } else {
                    $out = fopen('php://output', 'wb');
                    stream_copy_to_stream($fp, $out, $psize);
                    fclose($out);
                }
            }

            if (!empty($data['volume'])) {
                $data['volume']->close($fp, $data['info']['hash']);
            } else {
                fclose($fp);
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
     * @param  mixed $args
     *
     * @return mixed
     * @author Naoki Sawada
     */
    protected function input_filter($args)
    {
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
    protected static function sendHeader($header = null)
    {
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
    public static function outputJson($data)
    {
        // send header
        $header = isset($data['header']) ? $data['header'] : self::$contentType;
        self::sendHeader($header);

        unset($data['header']);

        if (!empty($data['raw']) && isset($data['error'])) {
            $out = $data['error'];
        } else {
            if (isset($data['debug']) && isset($data['debug']['backendErrors'])) {
                $data['debug']['backendErrors'] = array_merge($data['debug']['backendErrors'], elFinder::$phpErrors);
            }
            $out = json_encode($data);
        }

        // clear output buffer
        while (ob_get_level() && ob_end_clean()) {
        }

        header('Content-Length: ' . strlen($out));

        echo $out;

        flush();
    }
}// END class 
