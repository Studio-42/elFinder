<?php

/**
 * Simple elFinder driver for OneDrive
 * onedrive api v5.0.
 *
 * @author Dmitry (dio) Levashov
 * @author Cem (discofever)
 **/
class elFinderVolumeOneDrive extends elFinderVolumeDriver
{
    /**
     * Driver id
     * Must be started from letter and contains [a-z0-9]
     * Used as part of volume id.
     *
     * @var string
     **/
    protected $driverId = 'od';

    /**
     * @var string The base URL for API requests
     **/
    const API_URL = 'https://graph.microsoft.com/v1.0/me/drive/items/';

    /**
     * @var string The base URL for authorization requests
     */
    const AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';

    /**
     * @var string The base URL for token requests
     */
    const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

    /**
     * OneDrive token object.
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
    protected $tmbPrefix = '';

    /**
     * hasCache by folders.
     *
     * @var array
     **/
    protected $HasdirsCache = array();

    /**
     * Query options of API call.
     *
     * @var array
     */
    protected $queryOptions = array();

    /**
     * Current token expires
     *
     * @var integer
     **/
    private $expires;

    /**
     * Path to access token file for permanent mount
     *
     * @var string
     */
    private $aTokenFile = '';

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
            'root' => 'OneDrive.com',
            'OneDriveApiClient' => '',
            'path' => '/',
            'separator' => '/',
            'tmbPath' => '',
            'tmbURL' => '',
            'tmpPath' => '',
            'acceptedName' => '#^[^/\\?*:|"<>]*[^./\\?*:|"<>]$#',
            'rootCssClass' => 'elfinder-navbar-root-onedrive',
            'useApiThumbnail' => true,
        );
        $this->options = array_merge($this->options, $opts);
        $this->options['mimeDetect'] = 'internal';
    }

    /*********************************************************************/
    /*                        ORIGINAL FUNCTIONS                         */
    /*********************************************************************/

    /**
     * Obtains a new access token from OAuth. This token is valid for one hour.
     *
     * @param        $client_id
     * @param        $client_secret
     * @param string $code         The code returned by OneDrive after
     *                             successful log in
     *
     * @return object|string
     * @throws Exception Thrown if the redirect URI of this Client instance's
     *                    state is not set
     */
    protected function _od_obtainAccessToken($client_id, $client_secret, $code)
    {
        if (null === $client_id) {
            return 'The client ID must be set to call obtainAccessToken()';
        }

        if (null === $client_secret) {
            return 'The client Secret must be set to call obtainAccessToken()';
        }

        $url = self::TOKEN_URL;

        $curl = curl_init();

        $fields = http_build_query(
            array(
                'client_id' => $client_id,
                'redirect_uri' => elFinder::getConnectorUrl(),
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

            CURLOPT_HTTPHEADER => array(
                'Content-Length: ' . strlen($fields),
            ),

            CURLOPT_URL => $url,
        ));

        $result = curl_exec($curl);

        if (false === $result) {
            if (curl_errno($curl)) {
                throw new \Exception('curl_setopt_array() failed: '
                    . curl_error($curl));
            } else {
                throw new \Exception('curl_setopt_array(): empty response');
            }
        }
        curl_close($curl);

        $decoded = json_decode($result);

        if (null === $decoded) {
            throw new \Exception('json_decode() failed');
        }

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
     * @return true
     * @throws Exception
     */
    protected function _od_refreshToken()
    {
        if (!property_exists($this->token, 'expires') || $this->token->expires < time()) {
            if (!$this->options['client_id']) {
                $this->options['client_id'] = ELFINDER_ONEDRIVE_CLIENTID;
            }

            if (!$this->options['client_secret']) {
                $this->options['client_secret'] = ELFINDER_ONEDRIVE_CLIENTSECRET;
            }

            if (empty($this->token->data->refresh_token)) {
                throw new \Exception(elFinder::ERROR_REAUTH_REQUIRE);
            } else {
                $refresh_token = $this->token->data->refresh_token;
                $initialToken = $this->_od_getInitialToken();
            }

            $url = self::TOKEN_URL;

            $curl = curl_init();

            curl_setopt_array($curl, array(
                // General options.
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true, // i am sending post data
                CURLOPT_POSTFIELDS => 'client_id=' . urlencode($this->options['client_id'])
                    . '&client_secret=' . urlencode($this->options['client_secret'])
                    . '&grant_type=refresh_token'
                    . '&refresh_token=' . urlencode($this->token->data->refresh_token),

                CURLOPT_URL => $url,
            ));

            $result = curl_exec($curl);

            if (!$result) {
                if (curl_errno($curl)) {
                    throw new \Exception('curl_setopt_array() failed: ' . curl_error($curl));
                } else {
                    throw new \Exception('curl_setopt_array(): empty response');
                }
            }
            curl_close($curl);

            $decoded = json_decode($result);

            if (!$decoded) {
                throw new \Exception('json_decode() failed');
            }

            if (empty($decoded->access_token)) {
                if ($this->aTokenFile) {
                    if (is_file($this->aTokenFile)) {
                        unlink($this->aTokenFile);
                    }
                }
                $err = property_exists($decoded, 'error')? ' ' . $decoded->error : '';
                $err .= property_exists($decoded, 'error_description')? ' ' . $decoded->error_description : '';
                throw new \Exception($err? $err : elFinder::ERROR_REAUTH_REQUIRE);
            }

            $token = (object)array(
                'expires' => time() + $decoded->expires_in - 30,
                'initialToken' => $initialToken,
                'data' => $decoded,
            );

            $this->token = $token;
            $json = json_encode($token);

            if (!empty($decoded->refresh_token)) {
                if (empty($this->options['netkey']) && $this->aTokenFile) {
                    file_put_contents($this->aTokenFile, json_encode($token));
                    $this->options['accessToken'] = $json;
                } else if (!empty($this->options['netkey'])) {
                    // OAuth2 refresh token can be used only once,
                    // so update it if it is the same as the token file
                    $aTokenFile = $this->_od_getATokenFile();
                    if ($aTokenFile && is_file($aTokenFile)) {
                        if ($_token = json_decode(file_get_contents($aTokenFile))) {
                            if ($_token->data->refresh_token === $refresh_token) {
                                file_put_contents($aTokenFile, $json);
                            }
                        }
                    }
                    $this->options['accessToken'] = $json;
                    // update session value
                    elFinder::$instance->updateNetVolumeOption($this->options['netkey'], 'accessToken', $this->options['accessToken']);
                    $this->session->set('OneDriveTokens', $token);
                } else {
                    throw new \Exception(elFinder::ERROR_CREATING_TEMP_DIR);
                }
            }
        }

        return true;
    }

    /**
     * Get Parent ID, Item ID, Parent Path as an array from path.
     *
     * @param string $path
     *
     * @return array
     */
    protected function _od_splitPath($path)
    {
        $path = trim($path, '/');
        $pid = '';
        if ($path === '') {
            $id = 'root';
            $parent = '';
        } else {
            $paths = explode('/', trim($path, '/'));
            $id = array_pop($paths);
            if ($paths) {
                $parent = '/' . implode('/', $paths);
                $pid = array_pop($paths);
            } else {
                $pid = 'root';
                $parent = '/';
            }
        }

        return array($pid, $id, $parent);
    }

    /**
     * Creates a base cURL object which is compatible with the OneDrive API.
     *
     * @return resource A compatible cURL object
     */
    protected function _od_prepareCurl($url = null)
    {
        $curl = curl_init($url);

        $defaultOptions = array(
            // General options.
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => array(
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->token->data->access_token,
            ),
        );

        curl_setopt_array($curl, $defaultOptions);

        return $curl;
    }

    /**
     * Creates a base cURL object which is compatible with the OneDrive API.
     *
     * @param string $path The path of the API call (eg. me/skydrive)
     * @param bool   $contents
     *
     * @return resource A compatible cURL object
     * @throws elFinderAbortException
     */
    protected function _od_createCurl($path, $contents = false)
    {
        elFinder::checkAborted();
        $curl = $this->_od_prepareCurl($path);

        if ($contents) {
            $res = elFinder::curlExec($curl);
        } else {
            $result = json_decode(curl_exec($curl));
            curl_close($curl);
            if (isset($result->value)) {
                $res = $result->value;
                unset($result->value);
                $result = (array)$result;
                if (!empty($result['@odata.nextLink'])) {
                    $nextRes = $this->_od_createCurl($result['@odata.nextLink'], false);
                    if (is_array($nextRes)) {
                        $res = array_merge($res, $nextRes);
                    }
                }
            } else {
                $res = $result;
            }
        }

        return $res;
    }

    /**
     * Drive query and fetchAll.
     *
     * @param       $itemId
     * @param bool  $fetch_self
     * @param bool  $recursive
     * @param array $options
     *
     * @return object|array
     * @throws elFinderAbortException
     */
    protected function _od_query($itemId, $fetch_self = false, $recursive = false, $options = array())
    {
        $result = array();

        if (null === $itemId) {
            $itemId = 'root';
        }

        if ($fetch_self == true) {
            $path = $itemId;
        } else {
            $path = $itemId . '/children';
        }

        if (isset($options['query'])) {
            $path .= '?' . http_build_query($options['query']);
        }

        $url = self::API_URL . $path;

        $res = $this->_od_createCurl($url);
        if (!$fetch_self && $recursive && is_array($res)) {
            foreach ($res as $file) {
                $result[] = $file;
                if (!empty($file->folder)) {
                    $result = array_merge($result, $this->_od_query($file->id, false, true, $options));
                }
            }
        } else {
            $result = $res;
        }

        return isset($result->error) ? array() : $result;
    }

    /**
     * Parse line from onedrive metadata output and return file stat (array).
     *
     * @param object $raw line from ftp_rawlist() output
     *
     * @return array
     * @author Dmitry Levashov
     **/
    protected function _od_parseRaw($raw)
    {
        $stat = array();

        $folder = isset($raw->folder) ? $raw->folder : null;

        $stat['rev'] = isset($raw->id) ? $raw->id : 'root';
        $stat['name'] = $raw->name;
        if (isset($raw->lastModifiedDateTime)) {
            $stat['ts'] = strtotime($raw->lastModifiedDateTime);
        }

        if ($folder) {
            $stat['mime'] = 'directory';
            $stat['size'] = 0;
            if (empty($folder->childCount)) {
                $stat['dirs'] = 0;
            } else {
                $stat['dirs'] = -1;
            }
        } else {
            if (isset($raw->file->mimeType)) {
                $stat['mime'] = $raw->file->mimeType;
            }
            $stat['size'] = (int)$raw->size;
            if (!$this->disabledGetUrl) {
                $stat['url'] = '1';
            }
            if (isset($raw->image) && $img = $raw->image) {
                isset($img->width) ? $stat['width'] = $img->width : $stat['width'] = 0;
                isset($img->height) ? $stat['height'] = $img->height : $stat['height'] = 0;
            }
            if (!empty($raw->thumbnails)) {
                if ($raw->thumbnails[0]->small->url) {
                    $stat['tmb'] = substr($raw->thumbnails[0]->small->url, 8); // remove "https://"
                }
            } elseif (!empty($raw->file->processingMetadata)) {
                $stat['tmb'] = '1';
            }
        }

        return $stat;
    }

    /**
     * Get raw data(onedrive metadata) from OneDrive.
     *
     * @param string $path
     *
     * @return array|object onedrive metadata
     */
    protected function _od_getFileRaw($path)
    {
        list(, $itemId) = $this->_od_splitPath($path);
        try {
            $res = $this->_od_query($itemId, true, false, $this->queryOptions);

            return $res;
        } catch (Exception $e) {
            return array();
        }
    }

    /**
     * Get thumbnail from OneDrive.com.
     *
     * @param string $path
     *
     * @return string | boolean
     */
    protected function _od_getThumbnail($path)
    {
        list(, $itemId) = $this->_od_splitPath($path);

        try {
            $url = self::API_URL . $itemId . '/thumbnails/0/medium/content';

            return $this->_od_createCurl($url, $contents = true);
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Upload large files with an upload session.
     *
     * @param resource $fp       source file pointer
     * @param number   $size     total size
     * @param string   $name     item name
     * @param string   $itemId   item identifier
     * @param string   $parent   parent
     * @param string   $parentId parent identifier
     *
     * @return string The item path
     */
    protected function _od_uploadSession($fp, $size, $name, $itemId, $parent, $parentId)
    {
        try {
            $send = $this->_od_getChunkData($fp);
            if ($send === false) {
                throw new Exception('Data can not be acquired from the source.');
            }

            // create upload session
            if ($itemId) {
                $url = self::API_URL . $itemId . '/createUploadSession';
            } else {
                $url = self::API_URL . $parentId . ':/' . rawurlencode($name) . ':/createUploadSession';
            }
            $curl = $this->_od_prepareCurl($url);
            curl_setopt_array($curl, array(
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => '{}',
            ));
            $sess = json_decode(curl_exec($curl));
            curl_close($curl);

            if ($sess) {
                if (isset($sess->error)) {
                    throw new Exception($sess->error->message);
                }
                $next = strlen($send);
                $range = '0-' . ($next - 1) . '/' . $size;
            } else {
                throw new Exception('API response can not be obtained.');
            }

            $id = null;
            $retry = 0;
            while ($sess) {
                elFinder::extendTimeLimit();
                $putFp = tmpfile();
                fwrite($putFp, $send);
                fseek($putFp, 0);
                $url = $sess->uploadUrl;
                $curl = curl_init();
                $options = array(
                    CURLOPT_URL => $url,
                    CURLOPT_PUT => true,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_INFILE => $putFp,
                    CURLOPT_HTTPHEADER => array(
                        'Content-Length: ' . strlen($send),
                        'Content-Range: bytes ' . $range,
                    ),
                );
                curl_setopt_array($curl, $options);
                $sess = json_decode(curl_exec($curl));
                curl_close($curl);
                if ($sess) {
                    if (isset($sess->error)) {
                        throw new Exception($sess->error->message);
                    }
                    if (isset($sess->id)) {
                        $id = $sess->id;
                        break;
                    }
                    if (isset($sess->nextExpectedRanges)) {
                        list($_next) = explode('-', $sess->nextExpectedRanges[0]);
                        if ($next == $_next) {
                            $send = $this->_od_getChunkData($fp);
                            if ($send === false) {
                                throw new Exception('Data can not be acquired from the source.');
                            }
                            $next += strlen($send);
                            $range = $_next . '-' . ($next - 1) . '/' . $size;
                            $retry = 0;
                        } else {
                            if (++$retry > 3) {
                                throw new Exception('Retry limit exceeded with uploadSession API call.');
                            }
                        }
                        $sess->uploadUrl = $url;
                    }
                } else {
                    throw new Exception('API response can not be obtained.');
                }
            }

            if ($id) {
                return $this->_joinPath($parent, $id);
            } else {
                throw new Exception('An error occurred in the uploadSession API call.');
            }
        } catch (Exception $e) {
            return $this->setError('OneDrive error: ' . $e->getMessage());
        }
    }

    /**
     * Get chunk data by file pointer to upload session.
     *
     * @param resource $fp source file pointer
     *
     * @return bool|string chunked data
     */
    protected function _od_getChunkData($fp)
    {
        static $chunkSize = null;
        if ($chunkSize === null) {
            $mem = elFinder::getIniBytes('memory_limit');
            if ($mem < 1) {
                $mem = 10485760; // 10 MiB
            } else {
                $mem -= memory_get_usage() - 1061548;
                $mem = min($mem, 10485760);
            }
            if ($mem > 327680) {
                $chunkSize = floor($mem / 327680) * 327680;
            } else {
                $chunkSize = $mem;
            }
        }
        if ($chunkSize < 8192) {
            return false;
        }

        $contents = '';
        while (!feof($fp) && strlen($contents) < $chunkSize) {
            $contents .= fread($fp, 8192);
        }

        return $contents;
    }

    /**
     * Get AccessToken file path
     *
     * @return string  ( description_of_the_return_value )
     */
    protected function _od_getATokenFile()
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
                $aTokenFile = $tmp . DIRECTORY_SEPARATOR . $this->_od_getInitialToken() . '.otoken';
            }
        }
        return $aTokenFile;
    }

    /**
     * Get Initial Token (MD5 hash)
     *
     * @return string
     */
    protected function _od_getInitialToken()
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
     * @author Raja Sharma updating for OneDrive
     **/
    public function netmountPrepare($options)
    {
        if (empty($options['client_id']) && defined('ELFINDER_ONEDRIVE_CLIENTID')) {
            $options['client_id'] = ELFINDER_ONEDRIVE_CLIENTID;
        }
        if (empty($options['client_secret']) && defined('ELFINDER_ONEDRIVE_CLIENTSECRET')) {
            $options['client_secret'] = ELFINDER_ONEDRIVE_CLIENTSECRET;
        }

        if (isset($options['pass']) && $options['pass'] === 'reauth') {
            $options['user'] = 'init';
            $options['pass'] = '';
            $this->session->remove('OneDriveTokens');
        }

        if (isset($options['id'])) {
            $this->session->set('nodeId', $options['id']);
        } elseif ($_id = $this->session->get('nodeId')) {
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

            if (isset($_GET['code'])) {
                try {
                    // Obtain the token using the code received by the OneDrive API
                    $this->session->set('OneDriveTokens',
                        $this->_od_obtainAccessToken($options['client_id'], $options['client_secret'], $_GET['code']));

                    $out = array(
                        'node' => $options['id'],
                        'json' => '{"protocol": "onedrive", "mode": "done", "reset": 1}',
                        'bind' => 'netmount',
                    );

                    return array('exit' => 'callback', 'out' => $out);
                } catch (Exception $e) {
                    $out = array(
                        'node' => $options['id'],
                        'json' => json_encode(array('error' => elFinder::ERROR_ACCESS_DENIED . ' ' . $e->getMessage())),
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
                $this->token = $this->session->get('OneDriveTokens');

                if ($this->token) {
                    try {
                        $this->_od_refreshToken();
                    } catch (Exception $e) {
                        $this->setError($e->getMessage());
                        $this->token = null;
                        $this->session->remove('OneDriveTokens');
                    }
                }

                if (empty($this->token)) {
                    $result = false;
                } else {
                    $path = $options['path'];
                    if ($path === '/') {
                        $path = 'root';
                    }
                    $result = $this->_od_query($path, false, false, array(
                        'query' => array(
                            'select' => 'id,name',
                            'filter' => 'folder ne null',
                        ),
                    ));
                }

                if ($result === false) {
                    $cdata = '';
                    $innerKeys = array('cmd', 'host', 'options', 'pass', 'protocol', 'user');
                    $this->ARGS = $_SERVER['REQUEST_METHOD'] === 'POST' ? $_POST : $_GET;
                    foreach ($this->ARGS as $k => $v) {
                        if (!in_array($k, $innerKeys)) {
                            $cdata .= '&' . $k . '=' . rawurlencode($v);
                        }
                    }
                    if (empty($options['url'])) {
                        $options['url'] = elFinder::getConnectorUrl();
                    }
                    $callback = $options['url']
                        . (strpos($options['url'], '?') !== false? '&' : '?') . 'cmd=netmount&protocol=onedrive&host=onedrive.com&user=init&pass=return&node=' . $options['id'] . $cdata;

                    try {
                        $this->session->set('OneDriveTokens', (object)array('token' => null));

                        $offline = '';
                        // Gets a log in URL with sufficient privileges from the OneDrive API
                        if (!empty($options['offline'])) {
                            $offline = ' offline_access';
                        }

                        $redirect_uri = $options['url'] . '/netmount/onedrive/1';
                        $url = self::AUTH_URL
                            . '?client_id=' . urlencode($options['client_id'])
                            . '&scope=' . urlencode('files.readwrite.all' . $offline)
                            . '&response_type=code'
                            . '&redirect_uri=' . urlencode($redirect_uri);

                        $url .= '&oauth_callback=' . rawurlencode($callback);
                    } catch (Exception $e) {
                        return array('exit' => true, 'body' => '{msg:errAccess}');
                    }

                    $html = '<input id="elf-volumedriver-onedrive-host-btn" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" value="{msg:btnApprove}" type="button" onclick="window.open(\'' . $url . '\')">';
                    $html .= '<script>
                            $("#' . $options['id'] . '").elfinder("instance").trigger("netmount", {protocol: "onedrive", mode: "makebtn"});
                            </script>';

                    return array('exit' => true, 'body' => $html);
                } else {
                    $folders = [];

                    if ($result) {
                        foreach ($result as $res) {
                            $folders[$res->id] = $res->name;
                        }
                        natcasesort($folders);
                    }

                    if ($options['pass'] === 'folders') {
                        return ['exit' => true, 'folders' => $folders];
                    }

                    $folders = ['root' => 'My OneDrive'] + $folders;
                    $folders = json_encode($folders);

                    $expires = empty($this->token->data->refresh_token) ? (int)$this->token->expires : 0;
                    $mnt2res = empty($this->token->data->refresh_token) ? '' : ', "mnt2res": 1';
                    $json = '{"protocol": "onedrive", "mode": "done", "folders": ' . $folders . ', "expires": ' . $expires . $mnt2res .'}';
                    $html = 'OneDrive.com';
                    $html .= '<script>
                            $("#' . $options['id'] . '").elfinder("instance").trigger("netmount", ' . $json . ');
                            </script>';

                    return array('exit' => true, 'body' => $html);
                }
            }
        } catch (Exception $e) {
            return array('exit' => true, 'body' => '{msg:errNetMountNoDriver}');
        }

        if ($_aToken = $this->session->get('OneDriveTokens')) {
            $options['accessToken'] = json_encode($_aToken);
            if ($this->options['path'] === 'root' || !$this->options['path']) {
                $this->options['path'] = '/';
            }
        } else {
            $this->session->remove('OneDriveTokens');
            $this->setError(elFinder::ERROR_NETMOUNT, $options['host'], implode(' ', $this->error()));

            return array('exit' => true, 'error' => $this->error());
        }

        $this->session->remove('nodeId');
        unset($options['user'], $options['pass'], $options['id']);

        return $options;
    }

    /**
     * process of on netunmount
     * Drop `onedrive` & rm thumbs.
     *
     * @param array $options
     *
     * @return bool
     */
    public function netunmount($netVolumes, $key)
    {
        if (!$this->options['useApiThumbnail'] && ($tmbs = glob(rtrim($this->options['tmbPath'], '\\/') . DIRECTORY_SEPARATOR . $this->tmbPrefix . '*.png'))) {
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
     * @throws elFinderAbortException
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
                $this->netMountKey = $this->_od_getInitialToken();
            } else {
                $this->netMountKey = $this->options['netkey'];
            }

            if ($this->aTokenFile = $this->_od_getATokenFile()) {
                if (empty($this->options['netkey'])) {
                    if ($this->aTokenFile) {
                        if (is_file($this->aTokenFile)) {
                            $this->token = json_decode(file_get_contents($this->aTokenFile));
                            if (!is_object($this->token)) {
                                unlink($this->aTokenFile);
                                throw new Exception('Required option `accessToken` is invalid JSON.');
                            }
                        } else {
                            file_put_contents($this->aTokenFile, $this->token);
                        }
                    }
                } else if (is_file($this->aTokenFile)) {
                    // If the refresh token is the same as the permanent volume
                    $this->token = json_decode(file_get_contents($this->aTokenFile));
                }
            }

            if ($this->needOnline) {
                $this->_od_refreshToken();

                $this->expires = empty($this->token->data->refresh_token) ? (int)$this->token->expires : 0;
            }
        } catch (Exception $e) {
            $this->token = null;
            $error = true;
            $this->setError($e->getMessage());
        }

        if ($this->netMountKey) {
            $this->tmbPrefix = 'onedrive' . base_convert($this->netMountKey, 16, 32);
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

        $this->options['root'] = ($this->options['root'] == '')? 'OneDrive.com' : $this->options['root'];

        if (empty($this->options['alias'])) {
            if ($this->needOnline) {
                $this->options['alias'] = ($this->options['path'] === '/') ? $this->options['root'] :
                    $this->_od_query(basename($this->options['path']), $fetch_self = true)->name . '@OneDrive';
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

        $this->queryOptions = array(
            'query' => array(
                'select' => 'id,name,lastModifiedDateTime,file,folder,size,image',
            ),
        );

        if ($this->options['useApiThumbnail']) {
            $this->options['tmbURL'] = 'https://';
            $this->options['tmbPath'] = '';
            $this->queryOptions['query']['expand'] = 'thumbnails(select=small)';
        }

        // enable command archive
        $this->options['useRemoteArchive'] = true;

        return true;
    }

    /**
     * Configure after successfull mount.
     *
     * @author Dmitry (dio) Levashov
     **/
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

    protected function isNameExists($path)
    {
        list($pid, $name) = $this->_od_splitPath($path);

        $raw = $this->_od_query($pid . '/children/' . rawurlencode($name), true);
        return $raw ? $this->_od_parseRaw($raw) : false;
    }

    /**
     * Cache dir contents.
     *
     * @param string $path dir path
     *
     * @return array
     * @throws elFinderAbortException
     * @author Dmitry Levashov
     */
    protected function cacheDir($path)
    {
        $this->dirsCache[$path] = array();
        $hasDir = false;

        list(, $itemId) = $this->_od_splitPath($path);

        $res = $this->_od_query($itemId, false, false, $this->queryOptions);

        if ($res) {
            foreach ($res as $raw) {
                if ($stat = $this->_od_parseRaw($raw)) {
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
     * @throws elFinderAbortException
     * @author Dmitry (dio) Levashov
     * @author Naoki Sawada
     */
    protected function copy($src, $dst, $name)
    {
        $itemId = '';
        if ($this->options['copyJoin']) {
            $test = $this->joinPathCE($dst, $name);
            if ($testStat = $this->isNameExists($test)) {
                $this->remove($test);
            }
        }

        if ($path = $this->_copy($src, $dst, $name)) {
            $this->added[] = $this->stat($path);
        } else {
            $this->setError(elFinder::ERROR_COPY, $this->_path($src));
        }

        return $path;
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
        if ($this->options['useApiThumbnail']) {
            if (func_num_args() > 2) {
                list(, , $count) = func_get_args();
            } else {
                $count = 0;
            }
            if ($count < 10) {
                if (isset($stat['tmb']) && $stat['tmb'] != '1') {
                    return $stat['tmb'];
                } else {
                    sleep(2);
                    elFinder::extendTimeLimit();
                    $this->clearcache();
                    $stat = $this->stat($path);

                    return $this->createTmb($path, $stat, ++$count);
                }
            }

            return false;
        }
        if (!$stat || !$this->canCreateTmb($path, $stat)) {
            return false;
        }

        $name = $this->tmbname($stat);
        $tmb = $this->tmbPath . DIRECTORY_SEPARATOR . $name;

        // copy image into tmbPath so some drivers does not store files on local fs
        if (!$data = $this->_od_getThumbnail($path)) {
            return false;
        }
        if (!file_put_contents($tmb, $data)) {
            return false;
        }

        $result = false;

        $tmbSize = $this->tmbSize;

        if (($s = getimagesize($tmb)) == false) {
            return false;
        }

        /* If image smaller or equal thumbnail size - just fitting to thumbnail square */
        if ($s[0] <= $tmbSize && $s[1] <= $tmbSize) {
            $result = $this->imgSquareFit($tmb, $tmbSize, $tmbSize, 'center', 'middle', $this->options['tmbBgColor'], 'png');
        } else {
            if ($this->options['tmbCrop']) {

                /* Resize and crop if image bigger than thumbnail */
                if (!(($s[0] > $tmbSize && $s[1] <= $tmbSize) || ($s[0] <= $tmbSize && $s[1] > $tmbSize)) || ($s[0] > $tmbSize && $s[1] > $tmbSize)) {
                    $result = $this->imgResize($tmb, $tmbSize, $tmbSize, true, false, 'png');
                }

                if (($s = getimagesize($tmb)) != false) {
                    $x = $s[0] > $tmbSize ? intval(($s[0] - $tmbSize) / 2) : 0;
                    $y = $s[1] > $tmbSize ? intval(($s[1] - $tmbSize) / 2) : 0;
                    $result = $this->imgCrop($tmb, $tmbSize, $tmbSize, $x, $y, 'png');
                }
            } else {
                $result = $this->imgResize($tmb, $tmbSize, $tmbSize, true, true, 'png');
            }

            $result = $this->imgSquareFit($tmb, $tmbSize, $tmbSize, 'center', 'middle', $this->options['tmbBgColor'], 'png');
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
     * @param string $hash    file hash
     * @param array  $options options
     *
     * @return string
     * @author Naoki Sawada
     **/
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
        $res = '';
        if (($file = $this->file($hash)) == false || !$file['url'] || $file['url'] == 1) {
            $path = $this->decode($hash);

            list(, $itemId) = $this->_od_splitPath($path);
            try {
                $url = self::API_URL . $itemId . '/createLink';
                $data = (object)array(
                    'type' => 'embed',
                    'scope' => 'anonymous',
                );
                $curl = $this->_od_prepareCurl($url);
                curl_setopt_array($curl, array(
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => json_encode($data),
                ));

                $result = curl_exec($curl);
                curl_close($curl);
                if ($result) {
                    $result = json_decode($result);
                    if (isset($result->link)) {
                        list(, $res) = explode('?', $result->link->webUrl);
                        $res = 'https://onedrive.live.com/download.aspx?' . $res;
                    }
                }
            } catch (Exception $e) {
                $res = '';
            }
        }

        return $res;
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
        list(, , $dirname) = $this->_od_splitPath($path);

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
        list(, $basename) = $this->_od_splitPath($path);

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
        if ($dir === 'root') {
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
     * @author Dmitry (dio) Levashov
     **/
    protected function _stat($path)
    {
        if ($raw = $this->_od_getFileRaw($path)) {
            $stat = $this->_od_parseRaw($raw);
            if ($path === $this->root) {
                $stat['expires'] = $this->expires;
            }
            return $stat;
        }

        return false;
    }

    /**
     * Return true if path is dir and has at least one childs directory.
     *
     * @param string $path dir path
     *
     * @return bool
     * @throws elFinderAbortException
     * @author Dmitry (dio) Levashov
     */
    protected function _subdirs($path)
    {
        list(, $itemId) = $this->_od_splitPath($path);

        return (bool)$this->_od_query($itemId, false, false, array(
            'query' => array(
                'top' => 1,
                'select' => 'id',
                'filter' => 'folder ne null',
            ),
        ));
    }

    /**
     * Return object width and height
     * Ususaly used for images, but can be realize for video etc...
     *
     * @param string $path file path
     * @param string $mime file mime type
     *
     * @return string
     * @throws elFinderAbortException
     * @author Dmitry (dio) Levashov
     */
    protected function _dimensions($path, $mime)
    {
        if (strpos($mime, 'image') !== 0) {
            return '';
        }

        //$cache = $this->_od_getFileRaw($path);
        if (func_num_args() > 2) {
            $args = func_get_arg(2);
        } else {
            $args = array();
        }
        if (!empty($args['substitute'])) {
            $tmbSize = intval($args['substitute']);
        } else {
            $tmbSize = null;
        }
        list(, $itemId) = $this->_od_splitPath($path);
        $options = array(
            'query' => array(
                'select' => 'id,image',
            ),
        );
        if ($tmbSize) {
            $tmb = 'c' . $tmbSize . 'x' . $tmbSize;
            $options['query']['expand'] = 'thumbnails(select=' . $tmb . ')';
        }
        $raw = $this->_od_query($itemId, true, false, $options);

        if ($raw && property_exists($raw, 'image') && $img = $raw->image) {
            if (isset($img->width) && isset($img->height)) {
                $ret = array('dim' => $img->width . 'x' . $img->height);
                if ($tmbSize) {
                    $srcSize = explode('x', $ret['dim']);
                    if (min(($tmbSize / $srcSize[0]), ($tmbSize / $srcSize[1])) < 1) {
                        if (!empty($raw->thumbnails)) {
                            $tmbArr = (array)$raw->thumbnails[0];
                            if (!empty($tmbArr[$tmb]->url)) {
                                $ret['url'] = $tmbArr[$tmb]->url;
                            }
                        }
                    }
                }

                return $ret;
            }
        }

        $ret = '';
        if ($work = $this->getWorkFile($path)) {
            if ($size = @getimagesize($work)) {
                $cache['width'] = $size[0];
                $cache['height'] = $size[1];
                $ret = $size[0] . 'x' . $size[1];
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
     * @throws elFinderAbortException
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
     * @param string $path  file path
     * @param bool   $write open file for writing
     *
     * @return resource|false
     * @author Dmitry (dio) Levashov
     **/
    protected function _fopen($path, $mode = 'rb')
    {
        if ($mode === 'rb' || $mode === 'r') {
            list(, $itemId) = $this->_od_splitPath($path);
            $data = array(
                'target' => self::API_URL . $itemId . '/content',
                'headers' => array('Authorization: Bearer ' . $this->token->data->access_token),
            );

            return elFinder::getStreamByUrl($data);
        }

        return false;
    }

    /**
     * Close opened file.
     *
     * @param resource $fp file pointer
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _fclose($fp, $path = '')
    {
        fclose($fp);
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
        $namePath = $this->_joinPath($path, $name);
        list($parentId) = $this->_od_splitPath($namePath);

        try {
            $properties = array(
                'name' => (string)$name,
                'folder' => (object)array(),
            );

            $data = (object)$properties;

            $url = self::API_URL . $parentId . '/children';

            $curl = $this->_od_prepareCurl($url);

            curl_setopt_array($curl, array(
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($data),
            ));

            //create the Folder in the Parent
            $result = curl_exec($curl);
            curl_close($curl);
            $folder = json_decode($result);

            return $this->_joinPath($path, $folder->id);
        } catch (Exception $e) {
            return $this->setError('OneDrive error: ' . $e->getMessage());
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
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _copy($source, $targetDir, $name)
    {
        $path = $this->_joinPath($targetDir, $name);

        try {
            //Set the Parent id
            list(, $parentId) = $this->_od_splitPath($targetDir);
            list(, $itemId) = $this->_od_splitPath($source);

            $url = self::API_URL . $itemId . '/copy';

            $properties = array(
                'name' => (string)$name,
            );
            if ($parentId === 'root') {
                $properties['parentReference'] = (object)array('path' => '/drive/root:');
            } else {
                $properties['parentReference'] = (object)array('id' => (string)$parentId);
            }
            $data = (object)$properties;
            $curl = $this->_od_prepareCurl($url);
            curl_setopt_array($curl, array(
                CURLOPT_POST => true,
                CURLOPT_HEADER => true,
                CURLOPT_HTTPHEADER => array(
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $this->token->data->access_token,
                    'Prefer: respond-async',
                ),
                CURLOPT_POSTFIELDS => json_encode($data),
            ));
            $result = curl_exec($curl);
            curl_close($curl);

            $res = new stdClass();
            if (preg_match('/Location: (.+)/', $result, $m)) {
                $monUrl = trim($m[1]);
                while ($res) {
                    usleep(200000);
                    $curl = curl_init($monUrl);
                    curl_setopt_array($curl, array(
                        CURLOPT_RETURNTRANSFER => true,
                        CURLOPT_HTTPHEADER => array(
                            'Content-Type: application/json',
                        ),
                    ));
                    $res = json_decode(curl_exec($curl));
                    curl_close($curl);
                    if (isset($res->status)) {
                        if ($res->status === 'completed' || $res->status === 'failed') {
                            break;
                        }
                    } elseif (isset($res->error)) {
                        return $this->setError('OneDrive error: ' . $res->error->message);
                    }
                }
            }

            if ($res && isset($res->resourceId)) {
                if (isset($res->folder) && isset($this->sessionCache['subdirs'])) {
                    $this->sessionCache['subdirs'][$targetDir] = true;
                }

                return $this->_joinPath($targetDir, $res->resourceId);
            }

            return false;
        } catch (Exception $e) {
            return $this->setError('OneDrive error: ' . $e->getMessage());
        }

        return true;
    }

    /**
     * Move file into another parent dir.
     * Return new file path or false.
     *
     * @param string $source source file path
     * @param        $targetDir
     * @param string $name   file name
     *
     * @return string|bool
     * @author Dmitry (dio) Levashov
     */
    protected function _move($source, $targetDir, $name)
    {
        try {
            list(, $targetParentId) = $this->_od_splitPath($targetDir);
            list($sourceParentId, $itemId, $srcParent) = $this->_od_splitPath($source);

            $properties = array(
                'name' => (string)$name,
            );
            if ($targetParentId !== $sourceParentId) {
                $properties['parentReference'] = (object)array('id' => (string)$targetParentId);
            }

            $url = self::API_URL . $itemId;
            $data = (object)$properties;

            $curl = $this->_od_prepareCurl($url);

            curl_setopt_array($curl, array(
                CURLOPT_CUSTOMREQUEST => 'PATCH',
                CURLOPT_POSTFIELDS => json_encode($data),
            ));

            $result = json_decode(curl_exec($curl));
            curl_close($curl);
            if ($result && isset($result->id)) {
                return $targetDir . '/' . $result->id;
            } else {
                return false;
            }
        } catch (Exception $e) {
            return $this->setError('OneDrive error: ' . $e->getMessage());
        }

        return false;
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
        $stat = $this->stat($path);
        try {
            list(, $itemId) = $this->_od_splitPath($path);

            $url = self::API_URL . $itemId;

            $curl = $this->_od_prepareCurl($url);
            curl_setopt_array($curl, array(
                CURLOPT_CUSTOMREQUEST => 'DELETE',
            ));

            //unlink or delete File or Folder in the Parent
            $result = curl_exec($curl);
            curl_close($curl);
        } catch (Exception $e) {
            return $this->setError('OneDrive error: ' . $e->getMessage());
        }

        return true;
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
        return $this->_unlink($path);
    }

    /**
     * Create new file and write into it from file pointer.
     * Return new file path or false on error.
     *
     * @param resource $fp   file pointer
     * @param          $path
     * @param string   $name file name
     * @param array    $stat file stat (required by some virtual fs)
     *
     * @return bool|string
     * @author Dmitry (dio) Levashov
     */
    protected function _save($fp, $path, $name, $stat)
    {
        $itemId = '';
        $size = null;
        if ($name === '') {
            list($parentId, $itemId, $parent) = $this->_od_splitPath($path);
        } else {
            if ($stat) {
                if (isset($stat['name'])) {
                    $name = $stat['name'];
                }
                if (isset($stat['rev']) && strpos($stat['hash'], $this->id) === 0) {
                    $itemId = $stat['rev'];
                }
            }
            list(, $parentId) = $this->_od_splitPath($path);
            $parent = $path;
        }

        if ($stat && isset($stat['size'])) {
            $size = $stat['size'];
        } else {
            $stats = fstat($fp);
            if (isset($stats[7])) {
                $size = $stats[7];
            }
        }

        if ($size > 4194304) {
            return $this->_od_uploadSession($fp, $size, $name, $itemId, $parent, $parentId);
        }

        try {
            // for unseekable file pointer
            if (!elFinder::isSeekableStream($fp)) {
                if ($tfp = tmpfile()) {
                    if (stream_copy_to_stream($fp, $tfp, $size? $size : -1) !== false) {
                        rewind($tfp);
                        $fp = $tfp;
                    }
                }
            }

            //Create or Update a file
            if ($itemId === '') {
                $url = self::API_URL . $parentId . ':/' . rawurlencode($name) . ':/content';
            } else {
                $url = self::API_URL . $itemId . '/content';
            }
            $curl = $this->_od_prepareCurl();

            $options = array(
                CURLOPT_URL => $url,
                CURLOPT_PUT => true,
                CURLOPT_INFILE => $fp,
            );
            // Size
            if ($size !== null) {
                $options[CURLOPT_INFILESIZE] = $size;
            }

            curl_setopt_array($curl, $options);

            //create or update File in the Target
            $file = json_decode(curl_exec($curl));
            curl_close($curl);

            return $this->_joinPath($parent, $file->id);
        } catch (Exception $e) {
            return $this->setError('OneDrive error: ' . $e->getMessage());
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
        $contents = '';

        try {
            list(, $itemId) = $this->_od_splitPath($path);
            $url = self::API_URL . $itemId . '/content';
            $contents = $this->_od_createCurl($url, $contents = true);
        } catch (Exception $e) {
            return $this->setError('OneDrive error: ' . $e->getMessage());
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
     * Unpack archive.
     *
     * @param string $path archive path
     * @param array  $arc  archiver command and arguments (same as in $this->archivers)
     *
     * @return void
     * @author Dmitry (dio) Levashov
     * @author Alexey Sukhotin
     */
    protected function _unpack($path, $arc)
    {
        die('Not yet implemented. (_unpack)');
        //return false;
    }

    /**
     * Extract files from archive.
     *
     * @param string $path archive path
     * @param array  $arc  archiver command and arguments (same as in $this->archivers)
     *
     * @return void
     * @author Dmitry (dio) Levashov,
     * @author Alexey Sukhotin
     */
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
