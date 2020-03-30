<?php

/**
 * Simple elFinder driver for BoxDrive
 * Box.com API v2.0.
 *
 * @author Dmitry (dio) Levashov
 * @author Cem (discofever)
 **/
class elFinderVolumeBox extends elFinderVolumeDriver
{
    /**
     * Driver id
     * Must be started from letter and contains [a-z0-9]
     * Used as part of volume id.
     *
     * @var string
     **/
    protected $driverId = 'bd';

    /**
     * @var string The base URL for API requests
     */
    const API_URL = 'https://api.box.com/2.0';

    /**
     * @var string The base URL for authorization requests
     */
    const AUTH_URL = 'https://account.box.com/api/oauth2/authorize';

    /**
     * @var string The base URL for token requests
     */
    const TOKEN_URL = 'https://api.box.com/oauth2/token';

    /**
     * @var string The base URL for upload requests
     */
    const UPLOAD_URL = 'https://upload.box.com/api/2.0';

    /**
     * Fetch fields list.
     *
     * @var string
     */
    const FETCHFIELDS = 'type,id,name,created_at,modified_at,description,size,parent,permissions,file_version,shared_link';

    /**
     * Box.com token object.
     *
     * @var object
     **/
    protected $token = null;

    /**
     * Directory for tmp files
     * If not set driver will try to use tmbDir as tmpDir.
     *
     * @var string
     **/
    protected $tmp = '';

    /**
     * Net mount key.
     *
     * @var string
     **/
    public $netMountKey = '';

    /**
     * Thumbnail prefix.
     *
     * @var string
     **/
    private $tmbPrefix = '';

    /**
     * Path to access token file for permanent mount
     *
     * @var string
     */
    private $aTokenFile = '';

    /**
     * hasCache by folders.
     *
     * @var array
     **/
    protected $HasdirsCache = array();

    /**
     * Constructor
     * Extend options with required fields.
     *
     * @author Dmitry (dio) Levashov
     * @author Cem (DiscoFever)
     **/
    public function __construct()
    {
        $opts = array(
            'client_id' => '',
            'client_secret' => '',
            'accessToken' => '',
            'root' => 'Box.com',
            'path' => '/',
            'separator' => '/',
            'tmbPath' => '',
            'tmbURL' => '',
            'tmpPath' => '',
            'acceptedName' => '#^[^\\\/]+$#',
            'rootCssClass' => 'elfinder-navbar-root-box',
        );
        $this->options = array_merge($this->options, $opts);
        $this->options['mimeDetect'] = 'internal';
    }

    /*********************************************************************/
    /*                        ORIGINAL FUNCTIONS                         */
    /*********************************************************************/

    /**
     * Get Parent ID, Item ID, Parent Path as an array from path.
     *
     * @param string $path
     *
     * @return array
     */
    protected function _bd_splitPath($path)
    {
        $path = trim($path, '/');
        $pid = '';
        if ($path === '') {
            $id = '0';
            $parent = '';
        } else {
            $paths = explode('/', trim($path, '/'));
            $id = array_pop($paths);
            if ($paths) {
                $parent = '/' . implode('/', $paths);
                $pid = array_pop($paths);
            } else {
                $pid = '0';
                $parent = '/';
            }
        }

        return array($pid, $id, $parent);
    }

    /**
     * Obtains a new access token from OAuth. This token is valid for one hour.
     *
     * @param string $clientSecret The Box client secret
     * @param string $code         The code returned by Box after
     *                             successful log in
     * @param string $redirectUri  Must be the same as the redirect URI passed
     *                             to LoginUrl
     *
     * @return bool|object
     * @throws \Exception Thrown if this Client instance's clientId is not set
     * @throws \Exception Thrown if the redirect URI of this Client instance's
     *                    state is not set
     */
    protected function _bd_obtainAccessToken($client_id, $client_secret, $code)
    {
        if (null === $client_id) {
            return $this->setError('The client ID must be set to call obtainAccessToken()');
        }

        if (null === $client_secret) {
            return $this->setError('The client Secret must be set to call obtainAccessToken()');
        }

        if (null === $code) {
            return $this->setError('Authorization code must be set to call obtainAccessToken()');
        }

        $url = self::TOKEN_URL;

        $curl = curl_init();

        $fields = http_build_query(
            array(
                'client_id' => $client_id,
                'client_secret' => $client_secret,
                'code' => $code,
                'grant_type' => 'authorization_code',
            )
        );

        curl_setopt_array($curl, array(
            // General options.
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $fields,
            CURLOPT_URL => $url,
        ));

        $decoded = $this->_bd_curlExec($curl, true, array('Content-Length: ' . strlen($fields)));

        $res = (object)array(
            'expires' => time() + $decoded->expires_in - 30,
            'initialToken' => '',
            'data' => $decoded
        );
        if (!empty($decoded->refresh_token)) {
            $res->initialToken = md5($client_id . $decoded->refresh_token);
        }
        return $res;
    }

    /**
     * Get token and auto refresh.
     *
     * @return true|string error message
     * @throws Exception
     */
    protected function _bd_refreshToken()
    {
        if (!property_exists($this->token, 'expires') || $this->token->expires < time()) {
            if (!$this->options['client_id']) {
                $this->options['client_id'] = ELFINDER_BOX_CLIENTID;
            }

            if (!$this->options['client_secret']) {
                $this->options['client_secret'] = ELFINDER_BOX_CLIENTSECRET;
            }

            if (empty($this->token->data->refresh_token)) {
                throw new \Exception(elFinder::ERROR_REAUTH_REQUIRE);
            } else {
                $refresh_token = $this->token->data->refresh_token;
                $initialToken = $this->_bd_getInitialToken();
            }

            $lock = '';
            $aTokenFile = $this->aTokenFile? $this->aTokenFile : $this->_bd_getATokenFile();
            if ($aTokenFile && is_file($aTokenFile)) {
                $lock = $aTokenFile . '.lock';
                if (file_exists($lock)) {
                    // Probably updating on other instance
                    return true;
                }
                touch($lock);
                $GLOBALS['elFinderTempFiles'][$lock] = true;
            }

            $postData = array(
                'client_id' => $this->options['client_id'],
                'client_secret' => $this->options['client_secret'],
                'grant_type' => 'refresh_token',
                'refresh_token' => $refresh_token
            );

            $url = self::TOKEN_URL;

            $curl = curl_init();

            curl_setopt_array($curl, array(
                // General options.
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true, // i am sending post data
                CURLOPT_POSTFIELDS => http_build_query($postData),
                CURLOPT_URL => $url,
            ));

            $decoded = $error = '';
            try {
                $decoded = $this->_bd_curlExec($curl, true, array(), $postData);
            } catch (Exception $e) {
                $error = $e->getMessage();
            }
            if (!$decoded && !$error) {
                $error = 'Tried to renew the access token, but did not get a response from the Box server.';
            }
            if ($error) {
                $lock && unlink($lock);
                throw new \Exception('Box access token update failed. ('.$error.') If this message appears repeatedly, please notify the administrator.');
            }

            if (empty($decoded->access_token)) {
                if ($aTokenFile) {
                    if (is_file($aTokenFile)) {
                        unlink($aTokenFile);
                    }
                }
                $err = property_exists($decoded, 'error')? ' ' . $decoded->error : '';
                $err .= property_exists($decoded, 'error_description')? ' ' . $decoded->error_description : '';
                throw new \Exception($err? $err : elFinder::ERROR_REAUTH_REQUIRE);
            }

            $token = (object)array(
                'expires' => time() + $decoded->expires_in - 300,
                'initialToken' => $initialToken,
                'data' => $decoded,
            );

            $this->token = $token;
            $json = json_encode($token);

            if (!empty($decoded->refresh_token)) {
                if (empty($this->options['netkey']) && $aTokenFile) {
                    file_put_contents($aTokenFile, json_encode($token), LOCK_EX);
                    $this->options['accessToken'] = $json;
                } else if (!empty($this->options['netkey'])) {
                    // OAuth2 refresh token can be used only once,
                    // so update it if it is the same as the token file
                    if ($aTokenFile && is_file($aTokenFile)) {
                        if ($_token = json_decode(file_get_contents($aTokenFile))) {
                            if ($_token->data->refresh_token === $refresh_token) {
                                file_put_contents($aTokenFile, $json, LOCK_EX);
                            }
                        }
                    }
                    $this->options['accessToken'] = $json;
                    // update session value
                    elFinder::$instance->updateNetVolumeOption($this->options['netkey'], 'accessToken', $json);
                    $this->session->set('BoxTokens', $token);
                } else {
                    throw new \Exception(ERROR_CREATING_TEMP_DIR);
                }
            }
            $lock && unlink($lock);
        }

        return true;
    }

    /**
     * Creates a base cURL object which is compatible with the Box.com API.
     *
     * @param array $options cURL options
     *
     * @return resource A compatible cURL object
     */
    protected function _bd_prepareCurl($options = array())
    {
        $curl = curl_init();

        $defaultOptions = array(
            // General options.
            CURLOPT_RETURNTRANSFER => true,
        );

        curl_setopt_array($curl, $options + $defaultOptions);

        return $curl;
    }

    /**
     * Creates a base cURL object which is compatible with the Box.com API.
     *
     * @param      $url
     * @param bool $contents
     *
     * @return boolean|array
     * @throws Exception
     */
    protected function _bd_fetch($url, $contents = false)
    {
        $curl = curl_init($url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

        if ($contents) {
            return $this->_bd_curlExec($curl, false);
        } else {
            $result = $this->_bd_curlExec($curl);

            if (isset($result->entries)) {
                $res = $result->entries;
                $cnt = count($res);
                $total = $result->total_count;
                $offset = $result->offset;
                $single = ($result->limit == 1) ? true : false;
                if (!$single && $total > ($offset + $cnt)) {
                    $offset = $offset + $cnt;
                    if (strpos($url, 'offset=') === false) {
                        $url .= '&offset=' . $offset;
                    } else {
                        $url = preg_replace('/^(.+?offset=)\d+(.*)$/', '${1}' . $offset . '$2', $url);
                    }
                    $more = $this->_bd_fetch($url);
                    if (is_array($more)) {
                        $res = array_merge($res, $more);
                    }
                }

                return $res;
            } else {
                if (isset($result->type) && $result->type === 'error') {
                    return false;
                } else {
                    return $result;
                }
            }
        }
    }

    /**
     * Call curl_exec().
     *
     * @param resource    $curl
     * @param bool|string $decodeOrParent
     * @param array       $headers
     *
     * @throws \Exception
     * @return mixed
     */
    protected function _bd_curlExec($curl, $decodeOrParent = true, $headers = array(), $postData = array())
    {
        if ($this->token) {
            $headers = array_merge(array(
                'Authorization: Bearer ' . $this->token->data->access_token,
            ), $headers);
        }

        $result = elFinder::curlExec($curl, array(), $headers, $postData);

        if (!$decodeOrParent) {
            return $result;
        }

        $decoded = json_decode($result);

        if ($error = !empty($decoded->error_code)) {
            $errmsg = $decoded->error_code;
            if (!empty($decoded->message)) {
                $errmsg .= ': ' . $decoded->message;
            }
            throw new \Exception($errmsg);
        } else if ($error = !empty($decoded->error)) {
            $errmsg = $decoded->error;
            if (!empty($decoded->error_description)) {
                $errmsg .= ': ' . $decoded->error_description;
            }
            throw new \Exception($errmsg);
        }

        // make catch
        if ($decodeOrParent && $decodeOrParent !== true) {
            $raws = null;
            if (isset($decoded->entries)) {
                $raws = $decoded->entries;
            } elseif (isset($decoded->id)) {
                $raws = array($decoded);
            }
            if ($raws) {
                foreach ($raws as $raw) {
                    if (isset($raw->id)) {
                        $stat = $this->_bd_parseRaw($raw);
                        $itemPath = $this->_joinPath($decodeOrParent, $raw->id);
                        $this->updateCache($itemPath, $stat);
                    }
                }
            }
        }

        return $decoded;
    }

    /**
     * Drive query and fetchAll.
     *
     * @param      $itemId
     * @param bool $fetch_self
     * @param bool $recursive
     *
     * @return bool|object
     * @throws Exception
     */
    protected function _bd_query($itemId, $fetch_self = false, $recursive = false)
    {
        $result = [];

        if (null === $itemId) {
            $itemId = '0';
        }

        if ($fetch_self) {
            $path = '/folders/' . $itemId . '?fields=' . self::FETCHFIELDS;
        } else {
            $path = '/folders/' . $itemId . '/items?limit=1000&fields=' . self::FETCHFIELDS;
        }

        $url = self::API_URL . $path;

        if ($recursive) {
            foreach ($this->_bd_fetch($url) as $file) {
                if ($file->type == 'folder') {
                    $result[] = $file;
                    $result = array_merge($result, $this->_bd_query($file->id, $fetch_self = false, $recursive = true));
                } elseif ($file->type == 'file') {
                    $result[] = $file;
                }
            }
        } else {
            $result = $this->_bd_fetch($url);
            if ($fetch_self && !$result) {
                $path = '/files/' . $itemId . '?fields=' . self::FETCHFIELDS;
                $url = self::API_URL . $path;
                $result = $this->_bd_fetch($url);
            }
        }

        return $result;
    }

    /**
     * Get dat(box metadata) from Box.com.
     *
     * @param string $path
     *
     * @return object box metadata
     * @throws Exception
     */
    protected function _bd_getRawItem($path)
    {
        if ($path == '/') {
            return $this->_bd_query('0', $fetch_self = true);
        }

        list(, $itemId) = $this->_bd_splitPath($path);

        try {
            return $this->_bd_query($itemId, $fetch_self = true);
        } catch (Exception $e) {
            $empty = new stdClass;
            return $empty;
        }
    }

    /**
     * Parse line from box metadata output and return file stat (array).
     *
     * @param object $raw line from ftp_rawlist() output
     *
     * @return array
     * @author Dmitry Levashov
     **/
    protected function _bd_parseRaw($raw)
    {
        $stat = array();

        $stat['rev'] = isset($raw->id) ? $raw->id : 'root';
        $stat['name'] = $raw->name;
        if (!empty($raw->modified_at)) {
            $stat['ts'] = strtotime($raw->modified_at);
        }

        if ($raw->type === 'folder') {
            $stat['mime'] = 'directory';
            $stat['size'] = 0;
            $stat['dirs'] = -1;
        } else {
            $stat['size'] = (int)$raw->size;
            if (!empty($raw->shared_link->url) && $raw->shared_link->access == 'open') {
                if ($url = $this->getSharedWebContentLink($raw)) {
                    $stat['url'] = $url;
                }
            } elseif (!$this->disabledGetUrl) {
                $stat['url'] = '1';
            }
        }

        return $stat;
    }

    /**
     * Get thumbnail from Box.com.
     *
     * @param string $path
     * @param string $size
     *
     * @return string | boolean
     */
    protected function _bd_getThumbnail($path)
    {
        list(, $itemId) = $this->_bd_splitPath($path);

        try {
            $url = self::API_URL . '/files/' . $itemId . '/thumbnail.png?min_height=' . $this->tmbSize . '&min_width=' . $this->tmbSize;

            $contents = $this->_bd_fetch($url, true);
            return $contents;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Remove item.
     *
     * @param string $path file path
     *
     * @return bool
     **/
    protected function _bd_unlink($path, $type = null)
    {
        try {
            list(, $itemId) = $this->_bd_splitPath($path);

            if ($type == 'folders') {
                $url = self::API_URL . '/' . $type . '/' . $itemId . '?recursive=true';
            } else {
                $url = self::API_URL . '/' . $type . '/' . $itemId;
            }

            $curl = $this->_bd_prepareCurl(array(
                CURLOPT_URL => $url,
                CURLOPT_CUSTOMREQUEST => 'DELETE',
            ));

            //unlink or delete File or Folder in the Parent
            $this->_bd_curlExec($curl);
        } catch (Exception $e) {
            return $this->setError('Box error: ' . $e->getMessage());
        }

        return true;
    }

    /**
     * Get AccessToken file path
     *
     * @return string  ( description_of_the_return_value )
     */
    protected function _bd_getATokenFile()
    {
        $tmp = $aTokenFile = '';
        if (!empty($this->token->data->refresh_token)) {
            if (!$this->tmp) {
                $tmp = elFinder::getStaticVar('commonTempPath');
                if (!$tmp) {
                    $tmp = $this->getTempPath();
                }
                $this->tmp = $tmp;
            }
            if ($tmp) {
                $aTokenFile = $tmp . DIRECTORY_SEPARATOR . $this->_bd_getInitialToken() . '.btoken';
            }
        }
        return $aTokenFile;
    }

    /**
     * Get Initial Token (MD5 hash)
     *
     * @return string
     */
    protected function _bd_getInitialToken()
    {
        return (empty($this->token->initialToken)? md5($this->options['client_id'] . (!empty($this->token->data->refresh_token)? $this->token->data->refresh_token : $this->token->data->access_token)) : $this->token->initialToken);
    }

    /*********************************************************************/
    /*                        OVERRIDE FUNCTIONS                         */
    /*********************************************************************/

    /**
     * Prepare
     * Call from elFinder::netmout() before volume->mount().
     *
     * @return array
     * @author Naoki Sawada
     * @author Raja Sharma updating for Box
     **/
    public function netmountPrepare($options)
    {
        if (empty($options['client_id']) && defined('ELFINDER_BOX_CLIENTID')) {
            $options['client_id'] = ELFINDER_BOX_CLIENTID;
        }
        if (empty($options['client_secret']) && defined('ELFINDER_BOX_CLIENTSECRET')) {
            $options['client_secret'] = ELFINDER_BOX_CLIENTSECRET;
        }

        if (isset($options['pass']) && $options['pass'] === 'reauth') {
            $options['user'] = 'init';
            $options['pass'] = '';
            $this->session->remove('BoxTokens');
        }

        if (isset($options['id'])) {
            $this->session->set('nodeId', $options['id']);
        } else if ($_id = $this->session->get('nodeId')) {
            $options['id'] = $_id;
            $this->session->set('nodeId', $_id);
        }

        if (!empty($options['tmpPath'])) {
            if ((is_dir($options['tmpPath']) || mkdir($this->options['tmpPath'])) && is_writable($options['tmpPath'])) {
                $this->tmp = $options['tmpPath'];
            }
        }

        try {
            if (empty($options['client_id']) || empty($options['client_secret'])) {
                return array('exit' => true, 'body' => '{msg:errNetMountNoDriver}');
            }

            $itpCare = isset($options['code']);
            $code = $itpCare? $options['code'] : (isset($_GET['code'])? $_GET['code'] : '');
            if ($code) {
                try {
                    if (!empty($options['id'])) {
                        // Obtain the token using the code received by the Box.com API
                        $this->session->set('BoxTokens',
                            $this->_bd_obtainAccessToken($options['client_id'], $options['client_secret'], $code));

                        $out = array(
                            'node' => $options['id'],
                            'json' => '{"protocol": "box", "mode": "done", "reset": 1}',
                            'bind' => 'netmount'
                        );
                    } else {
                        $nodeid = ($_GET['host'] === '1')? 'elfinder' : $_GET['host'];
                        $out = array(
                            'node' => $nodeid,
                            'json' => json_encode(array(
                                'protocol' => 'box',
                                'host' => $nodeid,
                                'mode' => 'redirect',
                                'options' => array(
                                    'id' => $nodeid,
                                    'code'=> $code
                                )
                            )),
                            'bind' => 'netmount'
                        );
                    }
                    if (!$itpCare) {
                        return array('exit' => 'callback', 'out' => $out);
                    } else {
                        return array('exit' => true, 'body' => $out['json']);
                    }
                } catch (Exception $e) {
                    $out = array(
                        'node' => $options['id'],
                        'json' => json_encode(array('error' => $e->getMessage())),
                    );

                    return array('exit' => 'callback', 'out' => $out);
                }
            } elseif (!empty($_GET['error'])) {
                $out = array(
                    'node' => $options['id'],
                    'json' => json_encode(array('error' => elFinder::ERROR_ACCESS_DENIED)),
                );

                return array('exit' => 'callback', 'out' => $out);
            }

            if ($options['user'] === 'init') {
                $this->token = $this->session->get('BoxTokens');

                if ($this->token) {
                    try {
                        $this->_bd_refreshToken();
                    } catch (Exception $e) {
                        $this->setError($e->getMessage());
                        $this->token = null;
                        $this->session->remove('BoxTokens');
                    }
                }

                if (empty($this->token)) {
                    $result = false;
                } else {
                    $path = $options['path'];
                    if ($path === '/' || $path === 'root') {
                        $path = '0';
                    }
                    $result = $this->_bd_query($path, $fetch_self = false, $recursive = false);
                }

                if ($result === false) {
                    $redirect = elFinder::getConnectorUrl();
                    $redirect .= (strpos($redirect, '?') !== false? '&' : '?') . 'cmd=netmount&protocol=box&host=' . ($options['id'] === 'elfinder'? '1' : $options['id']);

                    try {
                        $this->session->set('BoxTokens', (object)array('token' => null));
                        $url = self::AUTH_URL . '?' . http_build_query(array('response_type' => 'code', 'client_id' => $options['client_id'], 'redirect_uri' => $redirect));
                    } catch (Exception $e) {
                        return array('exit' => true, 'body' => '{msg:errAccess}');
                    }

                    $html = '<input id="elf-volumedriver-box-host-btn" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" value="{msg:btnApprove}" type="button">';
                    $html .= '<script>
                            $("#' . $options['id'] . '").elfinder("instance").trigger("netmount", {protocol: "box", mode: "makebtn", url: "' . $url . '"});
                        </script>';

                    return array('exit' => true, 'body' => $html);
                } else {
                    $folders = [];

                    if ($result) {
                        foreach ($result as $res) {
                            if ($res->type == 'folder') {
                                $folders[$res->id . ' '] = $res->name;
                            }
                        }
                        natcasesort($folders);
                    }

                    if ($options['pass'] === 'folders') {
                        return ['exit' => true, 'folders' => $folders];
                    }

                    $folders = ['root' => 'My Box'] + $folders;
                    $folders = json_encode($folders);

                    $expires = empty($this->token->data->refresh_token) ? (int)$this->token->expires : 0;
                    $mnt2res = empty($this->token->data->refresh_token) ? '' : ', "mnt2res": 1';
                    $json = '{"protocol": "box", "mode": "done", "folders": ' . $folders . ', "expires": ' . $expires . $mnt2res . '}';
                    $html = 'Box.com';
                    $html .= '<script>
                            $("#' . $options['id'] . '").elfinder("instance").trigger("netmount", ' . $json . ');
                            </script>';

                    return array('exit' => true, 'body' => $html);
                }
            }
        } catch (Exception $e) {
            return array('exit' => true, 'body' => '{msg:errNetMountNoDriver}');
        }

        if ($_aToken = $this->session->get('BoxTokens')) {
            $options['accessToken'] = json_encode($_aToken);
            if ($this->options['path'] === 'root' || !$this->options['path']) {
                $this->options['path'] = '/';
            }
        } else {
            $this->session->remove('BoxTokens');
            $this->setError(elFinder::ERROR_NETMOUNT, $options['host'], implode(' ', $this->error()));

            return array('exit' => true, 'error' => $this->error());
        }

        $this->session->remove('nodeId');
        unset($options['user'], $options['pass'], $options['id']);

        return $options;
    }

    /**
     * process of on netunmount
     * Drop `box` & rm thumbs.
     *
     * @param $netVolumes
     * @param $key
     *
     * @return bool
     */
    public function netunmount($netVolumes, $key)
    {
        if ($tmbs = glob(rtrim($this->options['tmbPath'], '\\/') . DIRECTORY_SEPARATOR . $this->tmbPrefix . '*.png')) {
            foreach ($tmbs as $file) {
                unlink($file);
            }
        }

        return true;
    }

    /**
     * Return debug info for client.
     *
     * @return array
     **/
    public function debug()
    {
        $res = parent::debug();
        if (!empty($this->options['netkey']) && !empty($this->options['accessToken'])) {
            $res['accessToken'] = $this->options['accessToken'];
        }

        return $res;
    }

    /*********************************************************************/
    /*                        INIT AND CONFIGURE                         */
    /*********************************************************************/

    /**
     * Prepare FTP connection
     * Connect to remote server and check if credentials are correct, if so, store the connection id in $ftp_conn.
     *
     * @return bool
     * @throws Exception
     * @author Dmitry (dio) Levashov
     * @author Cem (DiscoFever)
     */
    protected function init()
    {
        if (!$this->options['accessToken']) {
            return $this->setError('Required option `accessToken` is undefined.');
        }

        if (!empty($this->options['tmpPath'])) {
            if ((is_dir($this->options['tmpPath']) || mkdir($this->options['tmpPath'])) && is_writable($this->options['tmpPath'])) {
                $this->tmp = $this->options['tmpPath'];
            }
        }

        $error = false;
        try {
            $this->token = json_decode($this->options['accessToken']);
            if (!is_object($this->token)) {
                throw new Exception('Required option `accessToken` is invalid JSON.');
            }

            // make net mount key
            if (empty($this->options['netkey'])) {
                $this->netMountKey = $this->_bd_getInitialToken();
            } else {
                $this->netMountKey = $this->options['netkey'];
            }

            if ($this->aTokenFile = $this->_bd_getATokenFile()) {
                if (empty($this->options['netkey'])) {
                    if ($this->aTokenFile) {
                        if (is_file($this->aTokenFile)) {
                            $this->token = json_decode(file_get_contents($this->aTokenFile));
                            if (!is_object($this->token)) {
                                unlink($this->aTokenFile);
                                throw new Exception('Required option `accessToken` is invalid JSON.');
                            }
                        } else {
                            file_put_contents($this->aTokenFile, json_encode($this->token), LOCK_EX);
                        }
                    }
                } else if (is_file($this->aTokenFile)) {
                    // If the refresh token is the same as the permanent volume
                    $this->token = json_decode(file_get_contents($this->aTokenFile));
                }
            }

            $this->needOnline && $this->_bd_refreshToken();
        } catch (Exception $e) {
            $this->token = null;
            $error = true;
            $this->setError($e->getMessage());
        }

        if ($this->netMountKey) {
            $this->tmbPrefix = 'box' . base_convert($this->netMountKey, 16, 32);
        }

        if ($error) {
            if (empty($this->options['netkey']) && $this->tmbPrefix) {
                // for delete thumbnail 
                $this->netunmount(null, null);
            }
            return false;
        }

        // normalize root path
        if ($this->options['path'] == 'root') {
            $this->options['path'] = '/';
        }

        $this->root = $this->options['path'] = $this->_normpath($this->options['path']);

        $this->options['root'] = ($this->options['root'] == '')? 'Box.com' : $this->options['root'];

        if (empty($this->options['alias'])) {
            if ($this->needOnline) {
                list(, $itemId) = $this->_bd_splitPath($this->options['path']);
                $this->options['alias'] = ($this->options['path'] === '/') ? $this->options['root'] :
                    $this->_bd_query($itemId, $fetch_self = true)->name . '@Box';
                if (!empty($this->options['netkey'])) {
                    elFinder::$instance->updateNetVolumeOption($this->options['netkey'], 'alias', $this->options['alias']);
                }
            } else {
                $this->options['alias'] = $this->options['root'];
            }
        }

        $this->rootName = $this->options['alias'];

        // This driver dose not support `syncChkAsTs`
        $this->options['syncChkAsTs'] = false;

        // 'lsPlSleep' minmum 10 sec
        $this->options['lsPlSleep'] = max(10, $this->options['lsPlSleep']);

        // enable command archive
        $this->options['useRemoteArchive'] = true;

        return true;
    }

    /**
     * Configure after successfull mount.
     *
     * @author Dmitry (dio) Levashov
     * @throws elFinderAbortException
     */
    protected function configure()
    {
        parent::configure();

        // fallback of $this->tmp
        if (!$this->tmp && $this->tmbPathWritable) {
            $this->tmp = $this->tmbPath;
        }
    }

    /*********************************************************************/
    /*                               FS API                              */
    /*********************************************************************/

    /**
     * Close opened connection.
     *
     * @author Dmitry (dio) Levashov
     **/
    public function umount()
    {
    }

    /**
     * Return fileinfo based on filename
     * For item ID based path file system
     * Please override if needed on each drivers.
     *
     * @param string $path file cache
     *
     * @return array|boolean
     * @throws elFinderAbortException
     */
    protected function isNameExists($path)
    {
        list(, $name, $parent) = $this->_bd_splitPath($path);

        // We can not use it because the search of Box.com there is a time lag.
        // ref. https://docs.box.com/reference#searching-for-content
        // > Note: If an item is added to Box then it becomes accessible through the search endpoint after ten minutes.

        /***
         * $url = self::API_URL.'/search?limit=1&offset=0&content_types=name&ancestor_folder_ids='.rawurlencode($pid)
         * .'&query='.rawurlencode('"'.$name.'"')
         * .'fields='.self::FETCHFIELDS;
         * $raw = $this->_bd_fetch($url);
         * if (is_array($raw) && count($raw)) {
         * return $this->_bd_parseRaw($raw);
         * }
         ***/

        $phash = $this->encode($parent);

        // do not recursive search
        $searchExDirReg = $this->options['searchExDirReg'];
        $this->options['searchExDirReg'] = '/.*/';
        $search = $this->search($name, array(), $phash);
        $this->options['searchExDirReg'] = $searchExDirReg;

        if ($search) {
            $f = false;
            foreach($search as $f) {
                if ($f['name'] !== $name) {
                    $f = false;
                }
                if ($f) {
                    break;
                }
            }
            return $f;
        }

        return false;
    }

    /**
     * Cache dir contents.
     *
     * @param string $path dir path
     *
     * @return
     * @throws Exception
     * @author Dmitry Levashov
     */
    protected function cacheDir($path)
    {
        $this->dirsCache[$path] = array();
        $hasDir = false;

        if ($path == '/') {
            $items = $this->_bd_query('0', $fetch_self = true);   // get root directory with folder & files
            $itemId = $items->id;
        } else {
            list(, $itemId) = $this->_bd_splitPath($path);
        }

        $res = $this->_bd_query($itemId);

        if ($res) {
            foreach ($res as $raw) {
                if ($stat = $this->_bd_parseRaw($raw)) {
                    $itemPath = $this->_joinPath($path, $raw->id);
                    $stat = $this->updateCache($itemPath, $stat);
                    if (empty($stat['hidden'])) {
                        if (!$hasDir && $stat['mime'] === 'directory') {
                            $hasDir = true;
                        }
                        $this->dirsCache[$path][] = $itemPath;
                    }
                }
            }
        }

        if (isset($this->sessionCache['subdirs'])) {
            $this->sessionCache['subdirs'][$path] = $hasDir;
        }

        return $this->dirsCache[$path];
    }

    /**
     * Copy file/recursive copy dir only in current volume.
     * Return new file path or false.
     *
     * @param string $src  source path
     * @param string $dst  destination dir path
     * @param string $name new file name (optionaly)
     *
     * @return string|false
     * @author Dmitry (dio) Levashov
     * @author Naoki Sawada
     **/
    protected function copy($src, $dst, $name)
    {
        if ($res = $this->_copy($src, $dst, $name)) {
            $this->added[] = $this->stat($res);
            return $res;
        } else {
            return $this->setError(elFinder::ERROR_COPY, $this->_path($src));
        }
    }

    /**
     * Remove file/ recursive remove dir.
     *
     * @param string $path  file path
     * @param bool   $force try to remove even if file locked
     *
     * @return bool
     * @throws elFinderAbortException
     * @author Dmitry (dio) Levashov
     * @author Naoki Sawada
     */
    protected function remove($path, $force = false)
    {
        $stat = $this->stat($path);
        $stat['realpath'] = $path;
        $this->rmTmb($stat);
        $this->clearcache();

        if (empty($stat)) {
            return $this->setError(elFinder::ERROR_RM, $this->_path($path), elFinder::ERROR_FILE_NOT_FOUND);
        }

        if (!$force && !empty($stat['locked'])) {
            return $this->setError(elFinder::ERROR_LOCKED, $this->_path($path));
        }

        if ($stat['mime'] == 'directory') {
            if (!$this->_rmdir($path)) {
                return $this->setError(elFinder::ERROR_RM, $this->_path($path));
            }
        } else {
            if (!$this->_unlink($path)) {
                return $this->setError(elFinder::ERROR_RM, $this->_path($path));
            }
        }

        $this->removed[] = $stat;

        return true;
    }

    /**
     * Create thumnbnail and return it's URL on success.
     *
     * @param string $path file path
     * @param        $stat
     *
     * @return string|false
     * @throws ImagickException
     * @throws elFinderAbortException
     * @author Dmitry (dio) Levashov
     * @author Naoki Sawada
     */
    protected function createTmb($path, $stat)
    {
        if (!$stat || !$this->canCreateTmb($path, $stat)) {
            return false;
        }

        $name = $this->tmbname($stat);
        $tmb = $this->tmbPath . DIRECTORY_SEPARATOR . $name;

        // copy image into tmbPath so some drivers does not store files on local fs
        if (!$data = $this->_bd_getThumbnail($path)) {
            // try get full contents as fallback
            if (!$data = $this->_getContents($path)) {
                return false;
            }
        }
        if (!file_put_contents($tmb, $data)) {
            return false;
        }

        $tmbSize = $this->tmbSize;

        if (($s = getimagesize($tmb)) == false) {
            return false;
        }

        $result = true;
        /* If image smaller or equal thumbnail size - just fitting to thumbnail square */
        if ($s[0] <= $tmbSize && $s[1] <= $tmbSize) {
            $result = $this->imgSquareFit($tmb, $tmbSize, $tmbSize, 'center', 'middle', $this->options['tmbBgColor'], 'png');
        } else {
            if ($this->options['tmbCrop']) {

                /* Resize and crop if image bigger than thumbnail */
                if (!(($s[0] > $tmbSize && $s[1] <= $tmbSize) || ($s[0] <= $tmbSize && $s[1] > $tmbSize)) || ($s[0] > $tmbSize && $s[1] > $tmbSize)) {
                    $result = $this->imgResize($tmb, $tmbSize, $tmbSize, true, false, 'png');
                }

                if ($result && ($s = getimagesize($tmb)) != false) {
                    $x = $s[0] > $tmbSize ? intval(($s[0] - $tmbSize) / 2) : 0;
                    $y = $s[1] > $tmbSize ? intval(($s[1] - $tmbSize) / 2) : 0;
                    $result = $this->imgCrop($tmb, $tmbSize, $tmbSize, $x, $y, 'png');
                }
            } else {
                $result = $this->imgResize($tmb, $tmbSize, $tmbSize, true, true, 'png');
            }

            if ($result) {
                $result = $this->imgSquareFit($tmb, $tmbSize, $tmbSize, 'center', 'middle', $this->options['tmbBgColor'], 'png');
            }
        }

        if (!$result) {
            unlink($tmb);

            return false;
        }

        return $name;
    }

    /**
     * Return thumbnail file name for required file.
     *
     * @param array $stat file stat
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function tmbname($stat)
    {
        return $this->tmbPrefix . $stat['rev'] . $stat['ts'] . '.png';
    }

    /**
     * Return content URL.
     *
     * @param object $raw data
     *
     * @return string
     * @author Naoki Sawada
     **/
    protected function getSharedWebContentLink($raw)
    {
        if ($raw->shared_link->url) {
            return sprintf('https://app.box.com/index.php?rm=box_download_shared_file&shared_name=%s&file_id=f_%s', basename($raw->shared_link->url), $raw->id);
        } elseif ($raw->shared_link->download_url) {
            return $raw->shared_link->download_url;
        }

        return false;
    }

    /**
     * Return content URL.
     *
     * @param string $hash    file hash
     * @param array  $options options
     *
     * @return string
     * @throws Exception
     * @author Naoki Sawada
     */
    public function getContentUrl($hash, $options = array())
    {
        if (!empty($options['onetime']) && $this->options['onetimeUrl']) {
            return parent::getContentUrl($hash, $options);
        }
        if (!empty($options['temporary'])) {
            // try make temporary file
            $url = parent::getContentUrl($hash, $options);
            if ($url) {
                return $url;
            }
        }
        if (($file = $this->file($hash)) == false || !$file['url'] || $file['url'] == 1) {
            $path = $this->decode($hash);

            list(, $itemId) = $this->_bd_splitPath($path);
            $params['shared_link']['access'] = 'open'; //open|company|collaborators

            $url = self::API_URL . '/files/' . $itemId;

            $curl = $this->_bd_prepareCurl(array(
                CURLOPT_URL => $url,
                CURLOPT_CUSTOMREQUEST => 'PUT',
                CURLOPT_POSTFIELDS => json_encode($params),
            ));
            $res = $this->_bd_curlExec($curl, true, array(
                // The data is sent as JSON as per Box documentation.
                'Content-Type: application/json',
            ));

            if ($url = $this->getSharedWebContentLink($res)) {
                return $url;
            }
        }

        return '';
    }

    /*********************** paths/urls *************************/

    /**
     * Return parent directory path.
     *
     * @param string $path file path
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _dirname($path)
    {
        list(, , $dirname) = $this->_bd_splitPath($path);

        return $dirname;
    }

    /**
     * Return file name.
     *
     * @param string $path file path
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _basename($path)
    {
        list(, $basename) = $this->_bd_splitPath($path);

        return $basename;
    }

    /**
     * Join dir name and file name and retur full path.
     *
     * @param string $dir
     * @param string $name
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _joinPath($dir, $name)
    {
        if (strval($dir) === '0') {
            $dir = '';
        }

        return $this->_normpath($dir . '/' . $name);
    }

    /**
     * Return normalized path, this works the same as os.path.normpath() in Python.
     *
     * @param string $path path
     *
     * @return string
     * @author Troex Nevelin
     **/
    protected function _normpath($path)
    {
        if (DIRECTORY_SEPARATOR !== '/') {
            $path = str_replace(DIRECTORY_SEPARATOR, '/', $path);
        }
        $path = '/' . ltrim($path, '/');

        return $path;
    }

    /**
     * Return file path related to root dir.
     *
     * @param string $path file path
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _relpath($path)
    {
        return $path;
    }

    /**
     * Convert path related to root dir into real path.
     *
     * @param string $path file path
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _abspath($path)
    {
        return $path;
    }

    /**
     * Return fake path started from root dir.
     *
     * @param string $path file path
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _path($path)
    {
        return $this->rootName . $this->_normpath(substr($path, strlen($this->root)));
    }

    /**
     * Return true if $path is children of $parent.
     *
     * @param string $path   path to check
     * @param string $parent parent path
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _inpath($path, $parent)
    {
        return $path == $parent || strpos($path, $parent . '/') === 0;
    }

    /***************** file stat ********************/
    /**
     * Return stat for given path.
     * Stat contains following fields:
     * - (int)    size    file size in b. required
     * - (int)    ts      file modification time in unix time. required
     * - (string) mime    mimetype. required for folders, others - optionally
     * - (bool)   read    read permissions. required
     * - (bool)   write   write permissions. required
     * - (bool)   locked  is object locked. optionally
     * - (bool)   hidden  is object hidden. optionally
     * - (string) alias   for symlinks - link target path relative to root path. optionally
     * - (string) target  for symlinks - link target path. optionally.
     * If file does not exists - returns empty array or false.
     *
     * @param string $path file path
     *
     * @return array|false
     * @throws Exception
     * @author Dmitry (dio) Levashov
     */
    protected function _stat($path)
    {
        if ($raw = $this->_bd_getRawItem($path)) {
            return $this->_bd_parseRaw($raw);
        }

        return false;
    }

    /**
     * Return true if path is dir and has at least one childs directory.
     *
     * @param string $path dir path
     *
     * @return bool
     * @throws Exception
     * @author Dmitry (dio) Levashov
     */
    protected function _subdirs($path)
    {
        list(, $itemId) = $this->_bd_splitPath($path);

        $path = '/folders/' . $itemId . '/items?limit=1&offset=0&fields=' . self::FETCHFIELDS;

        $url = self::API_URL . $path;

        if ($res = $this->_bd_fetch($url)) {
            if ($res[0]->type == 'folder') {
                return true;
            }
        }

        return false;
    }

    /**
     * Return object width and height
     * Ususaly used for images, but can be realize for video etc...
     *
     * @param string $path file path
     * @param string $mime file mime type
     *
     * @return string
     * @throws ImagickException
     * @throws elFinderAbortException
     * @author Dmitry (dio) Levashov
     */
    protected function _dimensions($path, $mime)
    {
        if (strpos($mime, 'image') !== 0) {
            return '';
        }

        $ret = '';
        if ($work = $this->getWorkFile($path)) {
            if ($size = @getimagesize($work)) {
                $cache['width'] = $size[0];
                $cache['height'] = $size[1];
                $ret = array('dim' => $size[0] . 'x' . $size[1]);
                $srcfp = fopen($work, 'rb');
                $target = isset(elFinder::$currentArgs['target'])? elFinder::$currentArgs['target'] : '';
                if ($subImgLink = $this->getSubstituteImgLink($target, $size, $srcfp)) {
                    $ret['url'] = $subImgLink;
                }
            }
        }
        is_file($work) && @unlink($work);

        return $ret;
    }

    /******************** file/dir content *********************/

    /**
     * Return files list in directory.
     *
     * @param string $path dir path
     *
     * @return array
     * @throws Exception
     * @author Dmitry (dio) Levashov
     * @author Cem (DiscoFever)
     */
    protected function _scandir($path)
    {
        return isset($this->dirsCache[$path])
            ? $this->dirsCache[$path]
            : $this->cacheDir($path);
    }

    /**
     * Open file and return file pointer.
     *
     * @param string $path file path
     * @param string $mode
     *
     * @return resource|false
     * @author Dmitry (dio) Levashov
     */
    protected function _fopen($path, $mode = 'rb')
    {
        if ($mode === 'rb' || $mode === 'r') {
            list(, $itemId) = $this->_bd_splitPath($path);
            $data = array(
                'target' => self::API_URL . '/files/' . $itemId . '/content',
                'headers' => array('Authorization: Bearer ' . $this->token->data->access_token),
            );

            // to support range request
            if (func_num_args() > 2) {
                $opts = func_get_arg(2);
            } else {
                $opts = array();
            }
            if (!empty($opts['httpheaders'])) {
                $data['headers'] = array_merge($opts['httpheaders'], $data['headers']);
            }

            return elFinder::getStreamByUrl($data);
        }

        return false;
    }

    /**
     * Close opened file.
     *
     * @param resource $fp file pointer
     * @param string   $path
     *
     * @return void
     * @author Dmitry (dio) Levashov
     */
    protected function _fclose($fp, $path = '')
    {
        is_resource($fp) && fclose($fp);
        if ($path) {
            unlink($this->getTempFile($path));
        }
    }

    /********************  file/dir manipulations *************************/

    /**
     * Create dir and return created dir path or false on failed.
     *
     * @param string $path parent dir path
     * @param string $name new directory name
     *
     * @return string|bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _mkdir($path, $name)
    {
        try {
            list(, $parentId) = $this->_bd_splitPath($path);
            $params = array('name' => $name, 'parent' => array('id' => $parentId));

            $url = self::API_URL . '/folders';

            $curl = $this->_bd_prepareCurl(array(
                CURLOPT_URL => $url,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($params),
            ));

            //create the Folder in the Parent
            $folder = $this->_bd_curlExec($curl, $path);

            return $this->_joinPath($path, $folder->id);
        } catch (Exception $e) {
            return $this->setError('Box error: ' . $e->getMessage());
        }
    }

    /**
     * Create file and return it's path or false on failed.
     *
     * @param string $path parent dir path
     * @param string $name new file name
     *
     * @return string|bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _mkfile($path, $name)
    {
        return $this->_save($this->tmpfile(), $path, $name, array());
    }

    /**
     * Create symlink. FTP driver does not support symlinks.
     *
     * @param string $target link target
     * @param string $path   symlink path
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _symlink($target, $path, $name)
    {
        return false;
    }

    /**
     * Copy file into another file.
     *
     * @param string $source    source file path
     * @param string $targetDir target directory path
     * @param string $name      new file name
     *
     * @return string|false
     * @author Dmitry (dio) Levashov
     **/
    protected function _copy($source, $targetDir, $name)
    {
        try {
            //Set the Parent id
            list(, $parentId) = $this->_bd_splitPath($targetDir);
            list(, $srcId) = $this->_bd_splitPath($source);

            $srcItem = $this->_bd_getRawItem($source);

            $properties = array('name' => $name, 'parent' => array('id' => $parentId));
            $data = (object)$properties;

            $type = ($srcItem->type === 'folder') ? 'folders' : 'files';
            $url = self::API_URL . '/' . $type . '/' . $srcId . '/copy';

            $curl = $this->_bd_prepareCurl(array(
                CURLOPT_URL => $url,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($data),
            ));

            //copy File in the Parent
            $result = $this->_bd_curlExec($curl, $targetDir);

            if (isset($result->id)) {
                if ($type === 'folders' && isset($this->sessionCache['subdirs'])) {
                    $this->sessionCache['subdirs'][$targetDir] = true;
                }

                return $this->_joinPath($targetDir, $result->id);
            }

            return false;
        } catch (Exception $e) {
            return $this->setError('Box error: ' . $e->getMessage());
        }
    }

    /**
     * Move file into another parent dir.
     * Return new file path or false.
     *
     * @param string $source source file path
     * @param string $target target dir path
     * @param string $name   file name
     *
     * @return string|bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _move($source, $targetDir, $name)
    {
        try {
            //moving and renaming a file or directory
            //Set new Parent and remove old parent
            list(, $parentId) = $this->_bd_splitPath($targetDir);
            list(, $itemId) = $this->_bd_splitPath($source);

            $srcItem = $this->_bd_getRawItem($source);

            //rename or move file or folder in destination target
            $properties = array('name' => $name, 'parent' => array('id' => $parentId));

            $type = ($srcItem->type === 'folder') ? 'folders' : 'files';
            $url = self::API_URL . '/' . $type . '/' . $itemId;
            $data = (object)$properties;

            $curl = $this->_bd_prepareCurl(array(
                CURLOPT_URL => $url,
                CURLOPT_CUSTOMREQUEST => 'PUT',
                CURLOPT_POSTFIELDS => json_encode($data),
            ));

            $result = $this->_bd_curlExec($curl, $targetDir, array(
                // The data is sent as JSON as per Box documentation.
                'Content-Type: application/json',
            ));

            if ($result && isset($result->id)) {
                return $this->_joinPath($targetDir, $result->id);
            }

            return false;
        } catch (Exception $e) {
            return $this->setError('Box error: ' . $e->getMessage());
        }
    }

    /**
     * Remove file.
     *
     * @param string $path file path
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _unlink($path)
    {
        return $this->_bd_unlink($path, 'files');
    }

    /**
     * Remove dir.
     *
     * @param string $path dir path
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _rmdir($path)
    {
        return $this->_bd_unlink($path, 'folders');
    }

    /**
     * Create new file and write into it from file pointer.
     * Return new file path or false on error.
     *
     * @param resource $fp   file pointer
     * @param string   $dir  target dir path
     * @param string   $name file name
     * @param array    $stat file stat (required by some virtual fs)
     *
     * @return bool|string
     * @author Dmitry (dio) Levashov
     **/
    protected function _save($fp, $path, $name, $stat)
    {
        $itemId = '';
        if ($name === '') {
            list($parentId, $itemId, $parent) = $this->_bd_splitPath($path);
        } else {
            if ($stat) {
                if (isset($stat['name'])) {
                    $name = $stat['name'];
                }
                if (isset($stat['rev']) && strpos($stat['hash'], $this->id) === 0) {
                    $itemId = $stat['rev'];
                }
            }
            list(, $parentId) = $this->_bd_splitPath($path);
            $parent = $path;
        }

        try {
            //Create or Update a file
            $metaDatas = stream_get_meta_data($fp);
            $tmpFilePath = isset($metaDatas['uri']) ? $metaDatas['uri'] : '';
            // remote contents
            if (!$tmpFilePath || empty($metaDatas['seekable'])) {
                $tmpHandle = $this->tmpfile();
                stream_copy_to_stream($fp, $tmpHandle);
                $metaDatas = stream_get_meta_data($tmpHandle);
                $tmpFilePath = $metaDatas['uri'];
            }

            if ($itemId === '') {
                //upload or create new file in destination target
                $properties = array('name' => $name, 'parent' => array('id' => $parentId));
                $url = self::UPLOAD_URL . '/files/content';
            } else {
                //update existing file in destination target
                $properties = array('name' => $name);
                $url = self::UPLOAD_URL . '/files/' . $itemId . '/content';
            }

            if (class_exists('CURLFile')) {
                $cfile = new CURLFile($tmpFilePath);
            } else {
                $cfile = '@' . $tmpFilePath;
            }
            $params = array('attributes' => json_encode($properties), 'file' => $cfile);
            $curl = $this->_bd_prepareCurl(array(
                CURLOPT_URL => $url,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $params,
            ));

            $file = $this->_bd_curlExec($curl, $parent);

            return $this->_joinPath($parent, $file->entries[0]->id);
        } catch (Exception $e) {
            return $this->setError('Box error: ' . $e->getMessage());
        }
    }

    /**
     * Get file contents.
     *
     * @param string $path file path
     *
     * @return string|false
     * @author Dmitry (dio) Levashov
     **/
    protected function _getContents($path)
    {
        try {
            list(, $itemId) = $this->_bd_splitPath($path);
            $url = self::API_URL . '/files/' . $itemId . '/content';

            $contents = $this->_bd_fetch($url, true);
        } catch (Exception $e) {
            return $this->setError('Box error: ' . $e->getMessage());
        }

        return $contents;
    }

    /**
     * Write a string to a file.
     *
     * @param string $path    file path
     * @param string $content new file content
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _filePutContents($path, $content)
    {
        $res = false;

        if ($local = $this->getTempFile($path)) {
            if (file_put_contents($local, $content, LOCK_EX) !== false
                && ($fp = fopen($local, 'rb'))) {
                clearstatcache();
                $res = $this->_save($fp, $path, '', array());
                fclose($fp);
            }
            file_exists($local) && unlink($local);
        }

        return $res;
    }

    /**
     * Detect available archivers.
     **/
    protected function _checkArchivers()
    {
        // die('Not yet implemented. (_checkArchivers)');
        return array();
    }

    /**
     * chmod implementation.
     *
     * @return bool
     **/
    protected function _chmod($path, $mode)
    {
        return false;
    }

    /**
     * Extract files from archive.
     *
     * @param string $path archive path
     * @param array  $arc  archiver command and arguments (same as in $this->archivers)
     *
     * @return true
     * @author Dmitry (dio) Levashov,
     * @author Alexey Sukhotin
     **/
    protected function _extract($path, $arc)
    {
        die('Not yet implemented. (_extract)');
    }

    /**
     * Create archive and return its path.
     *
     * @param string $dir   target dir
     * @param array  $files files names list
     * @param string $name  archive name
     * @param array  $arc   archiver options
     *
     * @return string|bool
     * @author Dmitry (dio) Levashov,
     * @author Alexey Sukhotin
     **/
    protected function _archive($dir, $files, $name, $arc)
    {
        die('Not yet implemented. (_archive)');
    }
} // END class
