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
     * To fix PHP bug that duplicate Set-Cookie header to be sent
     *
     * @var        boolean
     * @see        https://bugs.php.net/bug.php?id=75554
     */
    protected $fixCookieRegist = false;

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
     * Default options array
     *
     * @var        array
     */
    protected $opts = array(
        'base64encode' => false,
        'keys' => array(
            'default' => 'elFinderCaches',
            'netvolume' => 'elFinderNetVolumes'
        )
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
        if (function_exists('apache_get_version')) {
            $this->fixCookieRegist = true;
        }

        return $this;
    }

    /**
     * {@inheritdoc}
     */
    public function get($key, $empty = null)
    {
        $closed = false;
        if (!$this->started) {
            $closed = true;
            $this->start();
        }

        $data = null;

        if ($this->started) {
            $session =& $this->getSessionRef($key);
            $data = $session;
            if ($data && $this->base64encode) {
                $data = $this->decodeData($data);
            }
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
            $session = $data = $empty;
        }

        if ($closed) {
            $this->close();
        }

        return $data;
    }

    /**
     * {@inheritdoc}
     */
    public function start()
    {
        if ($this->fixCookieRegist === true) {
            // apache2 SAPI has a bug of session cookie register
            // see https://bugs.php.net/bug.php?id=75554
            // see https://github.com/php/php-src/pull/3231
            ini_set('session.use_cookies', 0);
        }
        if (version_compare(PHP_VERSION, '5.4.0', '>=')) {
            if (session_status() !== PHP_SESSION_ACTIVE) {
                session_start();
            }
        } else {
            set_error_handler(array($this, 'session_start_error'), E_NOTICE);
            session_start();
            restore_error_handler();
        }
        $this->started = session_id() ? true : false;

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
            if ($this->fixCookieRegist === true) {
                // regist cookie only once for apache2 SAPI
                $cParm = session_get_cookie_params();
                setcookie(session_name(), session_id(), 0, $cParm['path'], $cParm['domain'], $cParm['secure'], $cParm['httponly']);
                $this->fixCookieRegist = false;
            }
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
