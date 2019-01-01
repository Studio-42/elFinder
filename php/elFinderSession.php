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
    protected $started = false;

    protected $cookiePay = false;

    protected $keys = array();

    protected $base64encode = false;

    protected $opts = array(
        'base64encode' => false,
        'keys' => array(
            'default' => 'elFinderCaches',
            'netvolume' => 'elFinderNetVolumes'
        )
    );

    public function __construct($opts)
    {
        $this->opts = array_merge($this->opts, $opts);
        $this->base64encode = !empty($this->opts['base64encode']);
        $this->keys = $this->opts['keys'];

        return $this;
    }

    /**
     * {@inheritdoc}
     */
    public function start()
    {
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
     * {@inheritdoc}
     */
    public function close()
    {
        if ($this->started) {
            if (!$this->cookiePay) {
                $cParm = session_get_cookie_params();
                ini_set('session.use_cookies', 0);
                setcookie(session_name(), session_id(), 0, $cParm['path'], $cParm['domain'], $cParm['secure'], $cParm['httponly']);
                $this->cookiePay = true;
            }
            session_write_close();
        }
        $this->started = false;

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

    protected function encodeData($data)
    {
        if ($this->base64encode) {
            $data = base64_encode(serialize($data));
        }
        return $data;
    }

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

    protected function session_start_error($errno, $errstr)
    {
    }
}
