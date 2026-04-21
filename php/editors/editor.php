<?php

/**
 * Abstract class of editor plugins.
 *
 * @author Naoki Sawada
 */
class elFinderEditor
{
    /**
     * Lifetime of callback states.
     *
     * @var int
     */
    protected $callbackStateTtl = 86400;

    /**
     * Dedicated directory name for callback states.
     *
     * @var string
     */
    protected $callbackStateDirName = 'elfinder_editor_callback_state';

    /**
     * Array of allowed method by request from client side.
     *
     * @var array
     */
    protected $allowed = array();

    /**
     * elFinder instance
     *
     * @var object elFinder instance
     */
    protected $elfinder;

    /**
     * Arguments
     *
     * @var array argValues
     */
    protected $args;

    /**
     * Constructor.
     *
     * @param object $elfinder
     * @param array  $args
     */
    public function __construct($elfinder, $args)
    {
        $this->elfinder = $elfinder;
        $this->args = $args;
    }

    /**
     * Return boolean that this plugin is enabled.
     *
     * @return bool
     */
    public function enabled()
    {
        return true;
    }

    /**
     * Return boolean that $name method is allowed.
     *
     * @param string $name
     *
     * @return bool
     */
    public function isAllowedMethod($name)
    {
        $checker = array_flip($this->allowed);

        return isset($checker[$name]);
    }

    /**
     * Return $this->args value of the key
     *
     * @param      string $key   target key
     * @param      string $empty empty value
     *
     * @return     mixed
     */
    public function argValue($key, $empty = '')
    {
        return isset($this->args[$key]) ? $this->args[$key] : $empty;
    }

    /**
     * Create callback state and return token params for a callback request.
     *
     * @param string $method
     * @param string $hash
     * @param string $secret
     * @param array  $meta
     * @param int    $ttl
     *
     * @return array|false
     */
    protected function createCallbackState($method, $hash, $secret, $meta = array(), $ttl = null)
    {
        $this->gcCallbackStates();

        $token = $this->createCallbackStateToken();
        $expires = time() + max(60, is_null($ttl) ? (int)$this->callbackStateTtl : (int)$ttl);
        $state = array(
            'editor' => get_class($this),
            'method' => (string)$method,
            'token' => $token,
            'hash' => $hash,
            'expires' => $expires,
            'meta' => is_array($meta) ? $meta : array()
        );

        if (!$this->writeCallbackState($token, $state)) {
            return false;
        }

        return array(
            'token' => $token,
            'expires' => $expires,
            'sig' => $this->createCallbackSignature($method, $token, $expires, $secret)
        );
    }

    /**
     * Verify callback request and return state.
     *
     * @param string $method
     * @param array  $post
     * @param string $secret
     * @param string $tokenKey
     * @param string $expiresKey
     * @param string $sigKey
     *
     * @return array|false
     */
    protected function verifyCallbackRequest($method, $post, $secret, $tokenKey = 'token', $expiresKey = 'expires', $sigKey = 'sig')
    {
        $this->gcCallbackStates();

        if (!is_array($post)) {
            return false;
        }

        $token = isset($post[$tokenKey]) ? (string)$post[$tokenKey] : '';
        $expires = isset($post[$expiresKey]) ? (string)$post[$expiresKey] : '';
        $sig = isset($post[$sigKey]) ? (string)$post[$sigKey] : '';

        if ($token === '' || $expires === '' || $sig === '' || !ctype_digit($expires)) {
            return false;
        }

        $expires = (int)$expires;
        if ($expires < time()) {
            $this->deleteCallbackState($token);
            return false;
        }

        $expectedSig = $this->createCallbackSignature($method, $token, $expires, $secret);
        if (!$this->hashEquals($expectedSig, $sig)) {
            return false;
        }

        $state = $this->readCallbackState($token);
        if (!$state) {
            return false;
        }

        if (empty($state['editor']) || !$this->hashEquals($state['editor'], get_class($this))
            || empty($state['method']) || !$this->hashEquals($state['method'], (string)$method)
            || empty($state['token']) || !$this->hashEquals($state['token'], $token)
            || !isset($state['expires']) || (int)$state['expires'] !== $expires
            || empty($state['hash'])) {
            return false;
        }

        return $state;
    }

    /**
     * Consume callback state.
     *
     * @param string $token
     *
     * @return void
     */
    protected function consumeCallbackState($token)
    {
        $this->deleteCallbackState($token);
    }

    /**
     * Garbage collect expired callback states.
     *
     * @return void
     */
    protected function gcCallbackStates()
    {
        $dir = $this->getCallbackStateDir(false);
        if (!$dir) {
            return;
        }

        $files = glob($dir . DIRECTORY_SEPARATOR . '*.json');
        if (!$files) {
            return;
        }

        $now = time();
        foreach ($files as $path) {
            if (!is_file($path)) {
                continue;
            }

            $remove = false;
            $json = file_get_contents($path);
            if ($json === false || $json === '') {
                $remove = true;
            } else {
                $state = json_decode($json, true);
                if (!is_array($state) || empty($state['expires']) || (int)$state['expires'] < $now) {
                    $remove = true;
                }
            }

            if ($remove) {
                @unlink($path);
            }
        }
    }

    /**
     * Return callback state directory.
     *
     * @param bool $create
     *
     * @return string|false
     */
    protected function getCallbackStateDir($create = false)
    {
        $base = elFinder::getCommonTempPath();
        if (!$base) {
            return false;
        }

        $dir = $base . DIRECTORY_SEPARATOR . $this->callbackStateDirName;
        if (!is_dir($dir)) {
            if (!$create || !@mkdir($dir, 0700, true)) {
                return false;
            }
        }

        return is_writable($dir) ? $dir : false;
    }

    /**
     * Return callback state file path.
     *
     * @param string $token
     * @param bool   $create
     *
     * @return string|false
     */
    protected function getCallbackStatePath($token, $create = false)
    {
        $dir = $this->getCallbackStateDir($create);
        if (!$dir || !is_string($token) || $token === '') {
            return false;
        }

        return $dir . DIRECTORY_SEPARATOR . hash('sha256', $token) . '.json';
    }

    /**
     * Persist callback state.
     *
     * @param string $token
     * @param array  $state
     *
     * @return bool
     */
    protected function writeCallbackState($token, $state)
    {
        $path = $this->getCallbackStatePath($token, true);
        if (!$path) {
            return false;
        }

        $json = json_encode($state);
        if ($json === false) {
            return false;
        }

        return file_put_contents($path, $json, LOCK_EX) !== false;
    }

    /**
     * Read callback state.
     *
     * @param string $token
     *
     * @return array|false
     */
    protected function readCallbackState($token)
    {
        $path = $this->getCallbackStatePath($token, false);
        if (!$path || !is_file($path)) {
            return false;
        }

        $json = file_get_contents($path);
        if ($json === false || $json === '') {
            return false;
        }

        $state = json_decode($json, true);

        return is_array($state) ? $state : false;
    }

    /**
     * Delete callback state.
     *
     * @param string $token
     *
     * @return void
     */
    protected function deleteCallbackState($token)
    {
        $path = $this->getCallbackStatePath($token, false);
        if ($path && is_file($path)) {
            @unlink($path);
        }
    }

    /**
     * Create callback signature.
     *
     * @param string $method
     * @param string $token
     * @param int    $expires
     * @param string $secret
     *
     * @return string
     */
    protected function createCallbackSignature($method, $token, $expires, $secret)
    {
        $payload = implode('|', array(get_class($this), (string)$method, (string)$token, (string)$expires));

        return hash_hmac('sha256', $payload, (string)$secret);
    }

    /**
     * Create random callback state token.
     *
     * @return string
     */
    protected function createCallbackStateToken()
    {
        if (function_exists('random_bytes')) {
            return bin2hex(random_bytes(32));
        }

        if (function_exists('openssl_random_pseudo_bytes')) {
            $bytes = openssl_random_pseudo_bytes(32);
            if ($bytes !== false) {
                return bin2hex($bytes);
            }
        }

        return md5(uniqid(mt_rand(), true)) . md5(uniqid(mt_rand(), true));
    }

    /**
     * Constant-time string comparison.
     *
     * @param string $known
     * @param string $user
     *
     * @return bool
     */
    protected function hashEquals($known, $user)
    {
        if (function_exists('hash_equals')) {
            return hash_equals((string)$known, (string)$user);
        }

        $known = (string)$known;
        $user = (string)$user;
        if (strlen($known) !== strlen($user)) {
            return false;
        }

        $result = 0;
        $length = strlen($known);
        for ($i = 0; $i < $length; $i++) {
            $result |= ord($known[$i]) ^ ord($user[$i]);
        }

        return $result === 0;
    }
}
