<?php

/**
 * elFinder - file manager for web.
 * Session Wrapper Class.
 *
 * @package elfinder
 * @author  Naoki Sawada
 **/

class elFinderSession implements elFinderSessionInterface
{
    /**
     * A flag of session started
     *
     * @var        boolean
     */
    protected $started = false;

    /**
     * Array of session keys of this instance
     *
     * @var        array
     */
    protected $keys = array();

    /**
     * Is enabled base64encode
     *
     * @var        boolean
     */
    protected $base64encode = false;

    /**
     * Read session data and close immediately
     *
     * @var        boolean
     */
    protected $readOnly = false;

    /**
     * Default options array
     *
     * @var        array
     */
    protected $opts = array(
        'base64encode' => false,
        'keys' => array(
            'default' => 'elFinderCaches',
            'netvolume' => 'elFinderNetVolumes'
        ),
        'cookieParams' => array(),
        'readOnly' => false
    );

    /**
     * Constractor
     *
     * @param      array $opts The options
     *
     * @return     self    Instanse of this class
     */
    public function __construct($opts)
    {
        $this->opts = array_merge($this->opts, $opts);
        $this->base64encode = !empty($this->opts['base64encode']);
        $this->keys = $this->opts['keys'];
        $this->readOnly = !empty($this->opts['readOnly']);
    }

    /**
     * Normalize cookie params for session_set_cookie_params()
     *
     * @return array
     */
    protected function getSessionCookieParams()
    {
        $secure = (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off');

        $params = array(
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => true
        );

        if (!empty($this->opts['cookieParams']) && is_array($this->opts['cookieParams'])) {
            $params = array_merge($params, $this->opts['cookieParams']);
        }

        // absorb key case variations
        if (isset($params['SameSite']) && !isset($params['samesite'])) {
            $params['samesite'] = $params['SameSite'];
            unset($params['SameSite']);
        }
        if (isset($params['HttpOnly']) && !isset($params['httponly'])) {
            $params['httponly'] = $params['HttpOnly'];
            unset($params['HttpOnly']);
        }

        return $params;
    }

    /**
     * Apply session cookie params before session_start()
     *
     * @return void
     */
    protected function applySessionCookieParams()
    {
        $p = $this->getSessionCookieParams();

        if (version_compare(PHP_VERSION, '7.3.0', '>=')) {
            session_set_cookie_params(array(
                'lifetime' => isset($p['lifetime']) ? (int)$p['lifetime'] : 0,
                'path' => isset($p['path']) ? $p['path'] : '/',
                'domain' => isset($p['domain']) ? $p['domain'] : '',
                'secure' => !empty($p['secure']),
                'httponly' => !empty($p['httponly']),
                'samesite' => isset($p['samesite']) ? $p['samesite'] : 'Lax'
            ));
        } else {
            // PHP 5.5 compatible
            $path = isset($p['path']) ? $p['path'] : '/';
            if (!empty($p['samesite'])) {
                $path .= '; SameSite=' . $p['samesite'];
            }

            session_set_cookie_params(
                isset($p['lifetime']) ? (int)$p['lifetime'] : 0,
                $path,
                isset($p['domain']) ? $p['domain'] : '',
                !empty($p['secure']),
                !empty($p['httponly'])
            );
        }
    }

    /**
     * {@inheritdoc}
     */
    public function get($key, $empty = null)
    {
        $openedHere = false;

        if (!$this->started) {
            $openedHere = true;
            $this->start();
        }

        $data = null;
        $session =& $this->getSessionRef($key);
        $data = $session;

        if ($data && $this->base64encode) {
            $data = $this->decodeData($data);
        }

        $checkFn = null;
        if (!is_null($empty)) {
            if (is_string($empty)) {
                $checkFn = 'is_string';
            } elseif (is_array($empty)) {
                $checkFn = 'is_array';
            } elseif (is_object($empty)) {
                $checkFn = 'is_object';
            } elseif (is_float($empty)) {
                $checkFn = 'is_float';
            } elseif (is_int($empty)) {
                $checkFn = 'is_int';
            }
        }

        if (is_null($data) || ($checkFn && !$checkFn($data))) {
            $data = $empty;
        }

        if ($openedHere && !$this->readOnly) {
            $this->close();
        }

        return $data;
    }


    /**
     * {@inheritdoc}
     */
    public function start()
    {
        if ($this->started) {
            return $this;
        }

        set_error_handler(array($this, 'session_start_error'), E_NOTICE | E_WARNING);

        $this->applySessionCookieParams();

        if (version_compare(PHP_VERSION, '5.4.0', '>=')) {
            if (session_status() !== PHP_SESSION_ACTIVE) {
                if ($this->readOnly && version_compare(PHP_VERSION, '7.0.0', '>=')) {
                    session_start(array('read_and_close' => true));
                    // read_and_close closes the PHP session immediately,
                    // but mark this wrapper as initialized for the current operation.
                    // close() is not needed after get() in this mode.
                    $this->started = true;
                    restore_error_handler();
                    return $this;
                } else {
                    session_start();
                }
            }
        } else {
            session_start();
        }

        $this->started = (session_id() !== '');

        restore_error_handler();

        return $this;
    }

    /**
     * Get variable reference of $_SESSION
     *
     * @param string $key key of $_SESSION array
     *
     * @return mixed|null
     */
    protected function & getSessionRef($key)
    {
        $session = null;
        if ($this->started) {
            list($cat, $name) = array_pad(explode('.', $key, 2), 2, null);
            if (is_null($name)) {
                if (!isset($this->keys[$cat])) {
                    $name = $cat;
                    $cat = 'default';
                }
            }
            if (isset($this->keys[$cat])) {
                $cat = $this->keys[$cat];
            } else {
                $name = $cat . '.' . $name;
                $cat = $this->keys['default'];
            }
            if (is_null($name)) {
                if (!isset($_SESSION[$cat])) {
                    $_SESSION[$cat] = null;
                }
                $session =& $_SESSION[$cat];
            } else {
                if (!isset($_SESSION[$cat]) || !is_array($_SESSION[$cat])) {
                    $_SESSION[$cat] = array();
                }
                if (!isset($_SESSION[$cat][$name])) {
                    $_SESSION[$cat][$name] = null;
                }
                $session =& $_SESSION[$cat][$name];
            }
        }
        return $session;
    }

    /**
     * base64 decode of session val
     *
     * @param $data
     *
     * @return bool|mixed|string|null
     */
    protected function decodeData($data)
    {
        if ($this->base64encode) {
            if (is_string($data)) {
                if (($data = base64_decode($data)) !== false) {
                    $data = unserialize($data);
                } else {
                    $data = null;
                }
            } else {
                $data = null;
            }
        }
        return $data;
    }

    /**
     * {@inheritdoc}
     */
    public function close()
    {
        if ($this->started) {
            session_write_close();
        }
        $this->started = false;

        return $this;
    }

    /**
     * {@inheritdoc}
     */
    public function set($key, $data)
    {
        $closed = false;
        if (!$this->started) {
            $closed = true;
            $this->start();
        }
        $session =& $this->getSessionRef($key);
        if ($this->base64encode) {
            $data = $this->encodeData($data);
        }
        $session = $data;

        if ($closed) {
            $this->close();
        }

        return $this;
    }

    /**
     * base64 encode for session val
     *
     * @param $data
     *
     * @return string
     */
    protected function encodeData($data)
    {
        if ($this->base64encode) {
            $data = base64_encode(serialize($data));
        }
        return $data;
    }

    /**
     * {@inheritdoc}
     */
    public function remove($key)
    {
        $closed = false;
        if (!$this->started) {
            $closed = true;
            $this->start();
        }

        list($cat, $name) = array_pad(explode('.', $key, 2), 2, null);
        if (is_null($name)) {
            if (!isset($this->keys[$cat])) {
                $name = $cat;
                $cat = 'default';
            }
        }
        if (isset($this->keys[$cat])) {
            $cat = $this->keys[$cat];
        } else {
            $name = $cat . '.' . $name;
            $cat = $this->keys['default'];
        }
        if (is_null($name)) {
            unset($_SESSION[$cat]);
        } else {
            if (isset($_SESSION[$cat]) && is_array($_SESSION[$cat])) {
                unset($_SESSION[$cat][$name]);
            }
        }

        if ($closed) {
            $this->close();
        }

        return $this;
    }

    /**
     * sessioin error handler (Only for suppression of error at session start)
     *
     * @param $errno
     * @param $errstr
     */
    protected function session_start_error($errno, $errstr)
    {
    }
}
