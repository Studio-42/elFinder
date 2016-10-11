<?php

elFinder::$netDrivers['box'] = 'Box';

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
     * @var string The base URL for API requests.
     */
    const API_URL = 'https://api.box.com/2.0';

    /**
     * @var string The base URL for authorization requests.
     */
    const AUTH_URL = 'https://www.box.com/api/oauth2/authorize';

    /**
     * @var string The base URL for token requests.
     */
    const TOKEN_URL = 'https://www.box.com/api/oauth2/token';

    /**
     * @var string The base URL for upload requests.
     */
    const UPLOAD_URL = 'https://upload.box.com/api/2.0';

    /**
     * Fetch fields list.
     *
     * @var string
     */
    const FETCHFIELDS = 'type,id,name,created_at,modified_at,description,size,parent,permissions,file_version,shared_link';

    /**
     * Box.com service object.
     *
     * @var object
     **/
    protected $box = null;

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
            'BoxApiClient' => '',
            'path' => '/',
            'separator' => '/',
            'tmbPath' => '',
            'tmbURL' => '',
            'tmpPath' => '',
            'acceptedName' => '#^[^/\\?*:|"<>]*[^./\\?*:|"<>]$#',
            'rootCssClass' => 'elfinder-navbar-root-box',
        );
        $this->options = array_merge($this->options, $opts);
        $this->options['mimeDetect'] = 'internal';
    }

    /**
     * Prepare
     * Call from elFinder::netmout() before volume->mount().
     *
     * @return array
     *
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

        if ($options['pass'] === 'reauth') {
            $options['user'] = 'init';
            $options['pass'] = '';
            $this->session->remove('elFinderBoxTokens');
            $this->session->remove('elFinderBoxAuthTokens');
        }

        try {
            if (empty($options['client_id']) || empty($options['client_secret'])) {
                return array('exit' => true, 'body' => '{msg:errNetMountNoDriver}');
            }

            if (isset($_GET['code'])) {
                try {
                    // Obtain the token using the code received by the Box.com API					
                    $this->session->set('elFinderBoxAuthTokens',
                                        $this->obtainAccessToken($options['client_id'], $options['client_secret'], $_GET['code']));

                    $out = array(
                            'node' => 'elfinder',
                            'json' => '{"protocol": "box", "mode": "done", "reset": 1}',
                            'bind' => 'netmount',

                    );

                    return array('exit' => 'callback', 'out' => $out);
                } catch (Exception $e) {
                    return $e->getMessage();
                }
            }

            if ($options['user'] === 'init') {
                if (empty($_GET['code']) && empty($_GET['pass']) && empty($this->session->get('elFinderBoxAuthTokens'))) {
                    $cdata = '';
                    $innerKeys = array('cmd', 'host', 'options', 'pass', 'protocol', 'user');
                    $this->ARGS = $_SERVER['REQUEST_METHOD'] === 'POST' ? $_POST : $_GET;
                    foreach ($this->ARGS as $k => $v) {
                        if (!in_array($k, $innerKeys)) {
                            $cdata .= '&'.$k.'='.rawurlencode($v);
                        }
                    }
                    if (empty($options['url'])) {
                        $options['url'] = $this->getConnectorUrl();
                    }
                    $callback = $options['url']
                        .'?cmd=netmount&protocol=box&host=box.com&user=init&pass=return&node='.$options['id'].$cdata;

                    try {
                        // Instantiates a Box.com client bound to your box application

                        //$offline = '';			

                        //if (! empty($options['offline'])) {
                            //$offline = 'wl.offline_access';
                        //}
                        // Gets a log in URL with sufficient privileges from the Box.com API	
                        // Persist the Box client' state for next API requests
                        $this->session->set('elFinderBoxTokens',
                                (object) array(
                                'redirect_uri' => $this->getConnectorUrl().'?cmd=netmount&protocol=box&host=1',
                                'token' => null,
                        ));

                        $url = self::AUTH_URL.'?'.http_build_query(array('response_type' => 'code', 'client_id' => $options['client_id'], 'redirect_uri' => $this->session->get('elFinderBoxTokens')->redirect_uri));

                        $url .= '&oauth_callback='.rawurlencode($callback);
                    } catch (Exception $e) {
                        return array('exit' => true, 'body' => '{msg:errAccess}');
                    }

                    $html = '<input id="elf-volumedriver-box-host-btn" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" value="{msg:btnApprove}" type="button" onclick="window.open(\''.$url.'\')">';
                    $html .= '<script>
							$("#'.$options['id'].'").elfinder("instance").trigger("netmount", {protocol: "box", mode: "makebtn"});
						</script>';

                    return array('exit' => true, 'body' => $html);
                } else {
                    $this->box = $this->session->get('elFinderBoxAuthTokens');

                    $result = $this->query('0', $fetch_self = false, $recursive = false);
                    $folders = [];

                    foreach ($result as $res) {
                        if ($res->type == 'folder') {
                            $folders[$res->id] = $res->name;
                        }
                    }

                    natcasesort($folders);
                    $folders = ['root' => 'All Files'] + $folders;
                    $folders = json_encode($folders);

                    $json = '{"protocol": "box", "mode": "done", "folders": '.$folders.'}';
                    $html = 'Box.com';
                    $html .= '<script>
							$("#'.$options['id'].'").elfinder("instance").trigger("netmount", '.$json.');
							</script>';

                    return array('exit' => true, 'body' => $html);
                }
            }
        } catch (Exception $e) {
            return array('exit' => true, 'body' => '{msg:errNetMountNoDriver}');
        }

        if ($this->session->get('elFinderBoxAuthTokens')) {
            $options['accessToken'] = json_encode($this->session->get('elFinderBoxAuthTokens'));
        }

        unset($options['user'], $options['pass']);

        return $options;
    }

    /**
     * process of on netunmount
     * Drop `box` & rm thumbs.
     * 
     * @param array $options
     *
     * @return bool
     */
    public function netunmount($netVolumes, $key)
    {
        if ($tmbs = glob(rtrim($this->options['tmbPath'], '\\/').DIRECTORY_SEPARATOR.$this->tmbPrefix.'*.png')) {
            foreach ($tmbs as $file) {
                unlink($file);
            }
        }

        return true;
    }

    /**
     * Get script url.
     * 
     * @return string full URL
     *
     * @author Naoki Sawada
     */
    private function getConnectorUrl()
    {
        $url = ((isset($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') ? 'https://' : 'http://')
               .$_SERVER['SERVER_NAME']                                              // host
.($_SERVER['SERVER_PORT'] == 80 ? '' : ':'.$_SERVER['SERVER_PORT'])  // port
.$_SERVER['REQUEST_URI'];                                             // path & query
        list($url) = explode('?', $url);

        return $url;
    }

    /*********************************************************************/
    /*                        INIT AND CONFIGURE                         */
    /*********************************************************************/

    /**
     * Prepare FTP connection
     * Connect to remote server and check if credentials are correct, if so, store the connection id in $ftp_conn.
     *
     * @return bool
     *
     * @author Dmitry (dio) Levashov
     * @author Cem (DiscoFever)
     **/
    protected function init()
    {
        if (!$this->options['accessToken']) {
            return $this->setError('Required options undefined.');
        }

        // make net mount key
        $this->netMountKey = md5(implode('-', array('box', $this->options['path'])));

        if (!$this->box) {
            try {
                $this->options['accessToken'] = json_encode($this->session->get('elFinderBoxAuthTokens'));
                $this->box = json_decode($this->options['accessToken']);
                if (true !== ($res = $this->refreshBoxToken($this->box))) {
                    return $this->setError($res);
                }
            } catch (InvalidArgumentException $e) {
                return $this->setError($e->getMessage());
            }
            try {
                $this->box = json_decode($this->options['accessToken']);
            } catch (Exception $e) {
                return $this->setError($e->getMessage());
            }
        }

        if (!$this->box) {
            return $this->setError('OAuth extension not loaded.');
        }

        // normalize root path
        if ($this->options['path'] == 'root') {
            $this->options['path'] = '/';
        }

        $this->root = $this->options['path'] = $this->_normpath($this->options['path']);

        $this->options['root'] == '' ?  $this->options['root'] = 'Box.com' : $this->options['root'];

        if (empty($this->options['alias'])) {
            $this->options['alias'] = ($this->options['path'] === '/') ? $this->options['root'] :
                                      $this->query(basename($this->options['path']), $fetch_self = true)->name.'@Box.com';
        }

        $this->rootName = $this->options['alias'];

        $this->tmbPrefix = 'box'.base_convert($this->netMountKey, 10, 32);

        if (!empty($this->options['tmpPath'])) {
            if ((is_dir($this->options['tmpPath']) || mkdir($this->options['tmpPath'])) && is_writable($this->options['tmpPath'])) {
                $this->tmp = $this->options['tmpPath'];
            }
        }

        if (!$this->tmp && is_writable($this->options['tmbPath'])) {
            $this->tmp = $this->options['tmbPath'];
        }
        if (!$this->tmp && ($tmp = elFinder::getStaticVar('commonTempPath'))) {
            $this->tmp = $tmp;
        }

        // This driver dose not support `syncChkAsTs`
        $this->options['syncChkAsTs'] = false;

        // 'lsPlSleep' minmum 10 sec
        $this->options['lsPlSleep'] = max(10, $this->options['lsPlSleep']);

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

        $this->disabled[] = 'archive';
        $this->disabled[] = 'extract';
    }

    /**
     * Obtains a new access token from OAuth. This token is valid for one hour.
     *
     * @param string $clientSecret The Box client secret.
     * @param string $code         The code returned by Box after
     *                             successful log in.
     * @param string $redirectUri  Must be the same as the redirect URI passed
     *                             to LoginUrl.
     *
     * @throws \Exception Thrown if this Client instance's clientId is not set.
     * @throws \Exception Thrown if the redirect URI of this Client instance's
     *                    state is not set.
     */
    protected function obtainAccessToken($client_id, $client_secret, $code)
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
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_AUTOREFERER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $fields,

            CURLOPT_HTTPHEADER => array(
                'Content-Length: '.strlen($fields),
            ),

            // SSL options.
            CURLOPT_SSL_VERIFYHOST => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_URL => $url,
        ));

        $result = curl_exec($curl);

        if (false === $result) {
            if (curl_errno($curl)) {
                throw new \Exception('curl_setopt_array() failed: '
                    .curl_error($curl));
            } else {
                throw new \Exception('curl_setopt_array(): empty response');
            }
        }

        $decoded = json_decode($result);

        if (null === $decoded) {
            throw new \Exception('json_decode() failed');
        }

        $token = $this->session->get('elFinderBoxDriveTokens');
        $token->redirect_uri = null;

        $token->token = (object) array(
                'obtained' => time(),
                'data' => $decoded,
        );

        return $token;
    }

    /**
     * Get token and auto refresh.
     * 
     * @param object $box Box API client
     *
     * @return true|string error message
     */
    protected function refreshBoxToken($box)
    {
        try {
            if (!array_key_exists('refresh_token', $box->token->data) || null === $box->token->data->refresh_token) {
                return $this->setError('The refresh token is not set or no permission for renew the token.');
            }
            if (null === $this->options['client_id']) {
                $this->options['client_id'] = ELFINDER_BOX_CLIENTID;
            }

            if (null === $this->options['client_secret']) {
                $this->options['client_secret'] = ELFINDER_BOX_CLIENTSECRET;
            }

            if (0 >= ($box->token->obtained + $box->token->data->expires_in - time())) {
                $url = self::TOKEN_URL;

                $curl = curl_init();

                curl_setopt_array($curl, array(
                    // General options.
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_AUTOREFERER => true,
                    CURLOPT_POST => true, // i am sending post data
                    CURLOPT_POSTFIELDS => 'client_id='.urlencode($this->options['client_id'])
                        .'&client_secret='.urlencode($this->options['client_secret'])
                        .'&grant_type=refresh_token'
                        .'&refresh_token='.urlencode($box->token->data->refresh_token),

                    // SSL options.
                    CURLOPT_SSL_VERIFYHOST => true,
                    CURLOPT_SSL_VERIFYPEER => true,
                    CURLOPT_URL => $url,
                ));

                $result = curl_exec($curl);

                if (false === $result) {
                    if (curl_errno($curl)) {
                        throw new \Exception('curl_setopt_array() failed: '.curl_error($curl));
                    } else {
                        throw new \Exception('curl_setopt_array(): empty response');
                    }
                }

                $decoded = json_decode($result);

                if (null === $decoded) {
                    throw new \Exception('json_decode() failed');
                }

                $box->token = (object) array(
                    'obtained' => time(),
                    'data' => $decoded,
                );

                $this->session->set('elFinderBoxAuthTokens', $box);
                $this->options['accessToken'] = json_encode($this->session->get('elFinderBoxAuthTokens'));
                $this->box = json_decode($this->options['accessToken']);
            }
        } catch (Exception $e) {
            return $e->getMessage();
        }

        return true;
    }

    /**
     * Creates a base cURL object which is compatible with the Box.com API.   
     *
     * @return resource A compatible cURL object.
     */
    private function _prepareCurl()
    {
        $curl = curl_init();

        $defaultOptions = array(
            // General options.
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_AUTOREFERER => true,
            CURLOPT_SSL_VERIFYHOST => true,
            CURLOPT_SSL_VERIFYPEER => true,
        );

        curl_setopt_array($curl, $defaultOptions);

        return $curl;
    }

    /**
     * Creates a base cURL object which is compatible with the Box.com API.
     *
     * @param string $path The path of the API call (eg. /folders/0).     
     *
     * @return resource A compatible cURL object.
     */
    private function _createCurl($path, $contents = false)
    {
        $curl = curl_init($path);
        curl_setopt($curl, CURLOPT_FAILONERROR, true);
        curl_setopt($curl, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, true);

        if ($contents) {
            return curl_exec($curl);
        } else {
            $result = json_decode(curl_exec($curl));
            if (isset($result->entries)) {
                return $result->entries;
            } else {
                return $result;
            }
        }
    }

    /**
     * Drive query and fetchAll.
     * 
     * @param string $sql
     *
     * @return bool|array
     */
    private function query($itemId, $fetch_self = false, $recursive = false)
    {
        $result = [];

        if (null === $itemId) {
            $itemId = '0';
        }

        if ($fetch_self == true) {
            $path = '/folders/'.$itemId.'?fields='.self::FETCHFIELDS;
        } else {
            $path = '/folders/'.$itemId.'/items?fields='.self::FETCHFIELDS;
        }

        if (!$this->_createCurl(self::API_URL.$path.'&access_token='.urlencode($this->box->token->data->access_token))) {
            $path = '/files/'.$itemId.'?fields='.self::FETCHFIELDS;
        }

        $url = self::API_URL.$path
                    .'&access_token='.urlencode($this->box->token->data->access_token);

        if ($recursive) {
            foreach ($this->_createCurl($url) as $file) {
                if ($file->type == 'folder') {
                    $result[] = $file;
                    $result = array_merge($result, $this->query($file->id, $fetch_self = false, $recursive = true));
                } else {
                    $result[] = $file;
                }
            }
        } else {
            $result = $this->_createCurl($url);
        }

        return $result;
    }

    /**
     * Get dat(box metadata) from Box.com.
     * 
     * @param string $path
     *
     * @return array box metadata
     */
    private function getDBdat($path)
    {
        if ($path == '/') {
            return $this->query('0', $fetch_self = true);
        }

        empty($this->HasdirsCache[$path]) ? $HasPath = $path : $HasPath = $this->HasdirsCache[$path][0];

        $itemId = basename($HasPath);

        try {
            return $this->query($itemId, $fetch_self = true);
        } catch (Exception $e) {
            return array();
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
     * Parse line from box metadata output and return file stat (array).
     *
     * @param string $raw line from ftp_rawlist() output
     *
     * @return array
     *
     * @author Dmitry Levashov
     **/
    protected function parseRaw($raw)
    {
        $stat = array();

        $stat['rev'] = isset($raw->id) ? $raw->id : 'root';
        $stat['pid'] = isset($raw->parent->id) ? $raw->parent->id : '0';
        $stat['name'] = $raw->name;
        $stat['mime'] = $raw->type == 'folder' ? 'directory' : parent::$mimetypes[pathinfo($raw->name, PATHINFO_EXTENSION)];
        $stat['size'] = $raw->type == 'folder' ? 0 : (int) $raw->size;
        $stat['ts'] = $raw->modified_at !== null ? strtotime($raw->modified_at) : $_SERVER['REQUEST_TIME'];
        $stat['dirs'] = 0;

        if ($raw->type == 'folder') {
            $stat['dirs'] = (int) $this->_subdirs($stat['rev']);
        }

        if ($raw->type == 'file' && !empty($raw->shared_link->url) && $raw->shared_link->access == 'open') {
            if ($url = $this->getSharedWebContentLink($raw)) {
                $stat['url'] = $url;
            }
        } else {
            $stat['url'] = '1';
        }

        return $stat;
    }

    /**
     * Cache dir contents.
     *
     * @param string $path dir path
     *
     * @author Dmitry Levashov
     **/
    protected function cacheDir($path)
    {
        $path == '/' ? $HasPath = '/' : (empty($this->HasdirsCache[$path]) ? $HasPath = $path : $HasPath = $this->HasdirsCache[$path][0]);
        if ($HasPath == '/') {
            $items = $this->query('0', $fetch_self = true);   // get root directory with folder & files
            $itemId = $items->id;
        } else {
            $itemId = basename($HasPath);
        }

        $this->dirsCache[$path] = array();
        $res = $this->query($itemId);

        $path == '/' ? $mountPath = '/' : $mountPath = $this->_normpath($HasPath.'/');

        if ($res) {
            foreach ($res as $raw) {
                if ($stat = $this->parseRaw($raw)) {
                    $stat = $this->updateCache($mountPath.$raw->id, $stat);
                    if (empty($stat['hidden']) && $path !== $mountPath.$raw->id) {
                        $this->dirsCache[$path][] = $mountPath.$raw->id;
                        $this->HasdirsCache[$this->_normpath($path.'/'.$raw->name)][] = $mountPath.$raw->id;
                    }
                }
            }
        }

        return $this->dirsCache[$path];
    }

    /**
     * Recursive files search.
     *
     * @param string $path  dir path
     * @param string $q     search string
     * @param array  $mimes
     *
     * @return array
     *
     * @author Naoki Sawada
     **/
    protected function doSearch($path, $q, $mimes)
    {
        $path == '/' ? $itemId = '0' : $itemId = basename($path);
        empty($mimes) ? $mimeType = parent::$mimetypes[strtolower($q)] :
                        $mimeType = parent::$mimetypes[strtolower(explode('/', $mimes[0])[1])];

        $path = $this->_normpath($path.'/');
        $result = [];

        $res = $this->query($itemId);

        foreach ($res as $raw) {
            if ($raw->type == 'folder') {
                $result = array_merge($result, $this->doSearch($path.$raw->id, $q, $mimes));
            } else {
                $timeout = $this->options['searchTimeout'] ? $this->searchStart + $this->options['searchTimeout'] : 0;

                if ($timeout && $timeout < time()) {
                    $this->setError(elFinder::ERROR_SEARCH_TIMEOUT, $this->path($this->encode($path)));
                    break;
                }
                if ((!empty($mimeType) && parent::$mimetypes[pathinfo($raw->name, PATHINFO_EXTENSION)] !== $mimeType) || (empty($mimeType) && strcasecmp($raw->name, $q))) {
                    continue;
                }
                if ($stat = $this->parseRaw($raw)) {
                    if (!isset($this->cache[$path.$raw->id])) {
                        $stat = $this->updateCache($path.$raw->id, $stat);
                    }
                    if (!empty($stat['hidden']) || ($mimes && $stat['mime'] === 'directory') || !$this->mimeAccepted($stat['mime'], $mimes)) {
                        continue;
                    }

                    $stat = $this->stat($path.$raw->id);
                    $stat['path'] = $this->path($stat['hash']);
                    $result[] = $stat;
                }
            }
        }

        return $result;
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
     *
     * @author Dmitry (dio) Levashov
     * @author Naoki Sawada
     **/
    protected function copy($src, $dst, $name)
    {
        $this->clearcache();

        $res = $this->query(basename($src), $fetch_self = true);

        if ($res->type == 'folder') {
            $itemId = basename($this->_mkdir($dst, $name));
            $path = $this->_joinPath($dst, $itemId);

            $res = $this->query(basename($src));
            foreach ($res as $raw) {
                $raw->type == 'folder' ? $this->copy($src.'/'.$raw->id, $path, $raw->name) : $this->_copy($src.'/'.$raw->id, $path, $raw->name);
            }

            return $itemId
            ? $this->_joinPath($dst, $itemId)
            : $this->setError(elFinder::ERROR_COPY, $this->_path($src));
        } else {
            $itemId = $this->_copy($src, $dst, $name);

            return $itemId
            ? $this->_joinPath($dst, $itemId)
            : $this->setError(elFinder::ERROR_COPY, $this->_path($src));
        }
    }

    /**
     * Remove file/ recursive remove dir.
     *
     * @param string $path  file path
     * @param bool   $force try to remove even if file locked
     *
     * @return bool
     *
     * @author Dmitry (dio) Levashov
     * @author Naoki Sawada
     **/
    protected function remove($path, $force = false, $recursive = false)
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
            if (!$recursive && !$this->_rmdir($path)) {
                return $this->setError(elFinder::ERROR_RM, $this->_path($path));
            }
        } else {
            if (!$recursive && !$this->_unlink($path, 'files')) {
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
     * @param string $mime file mime type
     
     * @return string|false
     *
     * @author Dmitry (dio) Levashov
     * @author Naoki Sawada
     **/
    protected function createTmb($path, $stat)
    {
        if (!$stat || !$this->canCreateTmb($path, $stat)) {
            return false;
        }

        $name = $this->tmbname($stat);
        $tmb = $this->tmbPath.DIRECTORY_SEPARATOR.$name;

        // copy image into tmbPath so some drivers does not store files on local fs
        if (!$data = $this->getThumbnail($path)) {
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
        if ($s[0] <= $tmbSize && $s[1]  <= $tmbSize) {
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
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function tmbname($stat)
    {
        return $this->tmbPrefix.$stat['rev'].$stat['ts'].'.png';
    }

    /**
     * Get thumbnail from Box.com.
     *
     * @param string $path
     * @param string $size
     *
     * @return string | boolean
     */
    protected function getThumbnail($path)
    {
        $itemId = basename($path);

        try {
            $url = self::API_URL.'/files/'.$itemId.'/content'
            .'?access_token='.urlencode($this->box->token->data->access_token);

            $contents = $this->_createCurl($url, true);

            return $contents;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Return content URL.
     *    
     * @param array $raw data
     *
     * @return array
     *
     * @author Naoki Sawada
     **/
    protected function getSharedWebContentLink($raw)
    {
        $fExtension = pathinfo($raw->name, PATHINFO_EXTENSION);
        $fType = explode('/', parent::$mimetypes[strtolower($fExtension)])[0];

        if ($raw->shared_link->url && ($fType == 'image' || $fType == 'video' || $fType == 'audio')) {
            if ($fExtension == 'jpg' && $fType == 'image') {
                $url = 'https://app.box.com/representation/file_version_'.$raw->file_version->id.'/image_2048_'.$fExtension.'/1.'.$fExtension.'?shared_name='.basename($raw->shared_link->url);

                return $url;
            } elseif ($fExtension !== 'jpg' && $fType == 'image') {
                $url = 'https://app.box.com/representation/file_version_'.$raw->file_version->id.'/image_2048/1.'.$fExtension.'?shared_name='.basename($raw->shared_link->url);

                return $url;
            } elseif ($fType == 'video') {
                $url = 'https://app.box.com/representation/file_version_'.$raw->file_version->id.'/video_480.'.$fExtension.'?shared_name='.basename($raw->shared_link->url);

                return $url;
            } elseif ($fType == 'audio') {
                $url = 'https://app.box.com/index.php?rm=preview_stream&amp&file_version_'.$raw->file_version->id.'/audio/mpeg:'.$raw->name.'&shared_name='.basename($raw->shared_link->url);

                return $url;
            }
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
     * @return array
     *
     * @author Naoki Sawada
     **/
    public function getContentUrl($hash, $options = array())
    {
        if (($file = $this->file($hash)) == false || !$file['url'] || $file['url'] == 1) {
            $path = $this->decode($hash);

            $itemId = basename($path);
            $params['shared_link']['access'] = 'open'; //open|company|collaborators

            $url = self::API_URL.'/files/'.$itemId
                    .'?access_token='.urlencode($this->box->token->data->access_token);

            $curl = $this->_prepareCurl();
            curl_setopt($curl, CURLOPT_URL, $url);
            curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'PUT');
            curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($params));
            $res = json_decode(curl_exec($curl));
            curl_close($curl);

            if ($url = $this->getSharedWebContentLink($res)) {
                return $url;
            }
        }

        return $file['url'];
    }

    /*********************** paths/urls *************************/

    /**
     * Return parent directory path.
     *
     * @param string $path file path
     *
     * @return string
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _dirname($path)
    {
        return $this->_normpath(dirname($path));
    }

    /**
     * Return file name.
     *
     * @param string $path file path
     *
     * @return string
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _basename($path)
    {
        return basename($path);
    }

    /**
     * Join dir name and file name and retur full path.
     *
     * @param string $dir
     * @param string $name
     *
     * @return string
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _joinPath($dir, $name)
    {
        return $this->_normpath($dir.'/'.$name);
    }

    /**
     * Return normalized path, this works the same as os.path.normpath() in Python.
     *
     * @param string $path path
     *
     * @return string
     *
     * @author Troex Nevelin
     **/
    protected function _normpath($path)
    {
        if (DIRECTORY_SEPARATOR !== '/') {
            $path = str_replace(DIRECTORY_SEPARATOR, '/', $path);
        }
        $path = '/'.ltrim($path, '/');

        return $path;
    }

    /**
     * Return file path related to root dir.
     *
     * @param string $path file path
     *
     * @return string
     *
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
     *
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
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _path($path)
    {
        return $this->rootName.$this->_normpath(substr($path, strlen($this->root)));
    }

    /**
     * Return true if $path is children of $parent.
     *
     * @param string $path   path to check
     * @param string $parent parent path
     *
     * @return bool
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _inpath($path, $parent)
    {
        return $path == $parent || strpos($path, $parent.'/') === 0;
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
     *
     * If file does not exists - returns empty array or false.
     *
     * @param string $path file path
     *
     * @return array|false
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _stat($path)
    {
        if ($raw = $this->getDBdat($path)) {
            return $this->parseRaw($raw);
        }

        return false;
    }

    /**
     * Return true if path is dir and has at least one childs directory.
     *
     * @param string $path dir path
     *
     * @return bool
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _subdirs($path)
    {
        if ($path == '/') {
            $itemId = '0';
        } else {
            $itemId = basename($path);
        }

        $path = '/folders/'.$itemId.'/items?limit=1&offset=0&fields='.self::FETCHFIELDS;

        $url = self::API_URL.$path
                    .'&access_token='.urlencode($this->box->token->data->access_token);

        if($res = $this->_createCurl($url)){
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
     *
     * @author Dmitry (dio) Levashov
     **/
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
                $ret = $size[0].'x'.$size[1];
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
     *
     * @author Dmitry (dio) Levashov
     * @author Cem (DiscoFever)
     **/
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
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _fopen($path, $mode = 'rb')
    {
        if (($mode == 'rb' || $mode == 'r')) {
            try {
                $itemId = basename($path);
                $url = self::API_URL.'/files/'.$itemId.'/content'
                            .'?access_token='.urlencode($this->box->token->data->access_token);

                $contents = $this->_createCurl($url, true);

                $fp = tmpfile();
                fputs($fp, $contents);
                rewind($fp);

                return $fp;
            } catch (Exception $e) {
                return false;
            }
        }

        if ($this->tmp) {
            $contents = $this->_getContents($path);

            if ($contents === false) {
                return false;
            }

            if ($local = $this->getTempFile($path)) {
                if (file_put_contents($local, $contents, LOCK_EX) !== false) {
                    return @fopen($local, $mode);
                }
            }
        }

        return false;
    }

    /**
     * Close opened file.
     *
     * @param resource $fp file pointer
     *
     * @return bool
     *
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
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _mkdir($path, $name)
    {
        $path = $this->_normpath($path.'/'.$name);
        basename(dirname($path)) == '' ? $parentId = '0' : $parentId = basename(dirname($path));

        try {
            $params = array('name' => $name, 'parent' => array('id' => $parentId));

            $url = self::API_URL.'/folders'
                    .'?access_token='.urlencode($this->box->token->data->access_token);

            $curl = $this->_prepareCurl();

            curl_setopt_array($curl, array(
                CURLOPT_URL => $url,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($params),
            ));

            //create the Folder in the Parent
            $result = curl_exec($curl);
            $folder = json_decode($result);

            basename(dirname($path)) == '' ? $path = '/'.$folder->id : $path = dirname($path).'/'.$folder->id;
        } catch (Exception $e) {
            return $this->setError('Box error: '.$e->getMessage());
        }

        return $path;
    }

    /**
     * Create file and return it's path or false on failed.
     *
     * @param string $path parent dir path
     * @param string $name new file name
     *
     * @return string|bool
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _mkfile($path, $name)
    {
        $path == '/' ? $path = $path.$name : $path = $path.'/'.$name;

        return $this->_filePutContents($path, '');
    }

    /**
     * Create symlink. FTP driver does not support symlinks.
     *
     * @param string $target link target
     * @param string $path   symlink path
     *
     * @return bool
     *
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
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _copy($source, $targetDir, $name)
    {
        $path = $this->_normpath($targetDir.'/'.$name);

        try {
            //Set the Parent id			
            $targetDir == '/' ? $parentId = '0' : $parentId = basename($targetDir);
            $properties = array('name' => $name, 'parent' => array('id' => $parentId));
            $data = (object) $properties;

            $url = self::API_URL.'/files/'.basename($source).'/copy'
                        .'?access_token='.urlencode($this->box->token->data->access_token);

            $curl = $this->_prepareCurl();

            curl_setopt_array($curl, array(
                CURLOPT_URL => $url,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($data),
            ));

            //copy File in the Parent
            $result = json_decode(curl_exec($curl));

            return $result->id;
        } catch (Exception $e) {
            return $this->setError('Box error: '.$e->getMessage());
        }

        return true;
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
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _move($source, $targetDir, $name)
    {
        try {
            //moving and renaming a file or directory                                  
            //Set new Parent and remove old parent				
            $targetDir == '/' ? $targetParentId = '0' : $targetParentId = basename($targetDir);
            $target = $this->_normpath($targetDir.'/'.basename($source));

            $itemId = basename($source);

            //rename or move file or folder in destination target				
            $properties = array('name' => $name, 'parent' => array('id' => $targetParentId));
            $mimeType = parent::$mimetypes[strtolower(explode('.', $name)[1])];

            empty($mimeType) ? $type = 'folders' : $type = 'files';

            $url = self::API_URL.'/'.$type.'/'.$itemId;
            $data = (object) $properties;

            $curl = $this->_prepareCurl();

            curl_setopt_array($curl, array(
                CURLOPT_URL => $url,
                CURLOPT_CUSTOMREQUEST => 'PUT',

                CURLOPT_HTTPHEADER => array(
                    // The data is sent as JSON as per Box documentation.
                    'Content-Type: application/json',
                    'Authorization: Bearer '.$this->box->token->data->access_token,
                ),

                CURLOPT_POSTFIELDS => json_encode($data),
            ));

            $result = curl_exec($curl);
        } catch (Exception $e) {
            return $this->setError('Box error: '.$e->getMessage());
        }

        return $target;
    }

    /**
     * Remove file.
     *
     * @param string $path file path
     *
     * @return bool
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _unlink($path, $type = null)
    {
        try {
            $itemId = basename($path);

            if ($type == 'folders') {
                $url = self::API_URL.'/'.$type.'/'.$itemId.'?recursive=true'
                    .'&access_token='.urlencode($this->box->token->data->access_token);
            } else {
                $url = self::API_URL.'/'.$type.'/'.$itemId
                    .'?access_token='.urlencode($this->box->token->data->access_token);
            }

            $curl = $this->_prepareCurl();
            curl_setopt_array($curl, array(
                CURLOPT_URL => $url,
                CURLOPT_CUSTOMREQUEST => 'DELETE',
            ));

            //unlink or delete File or Folder in the Parent
            $result = curl_exec($curl);
        } catch (Exception $e) {
            return $this->setError('Box error: '.$e->getMessage());
        }

        return true;
    }

    /**
     * Remove dir.
     *
     * @param string $path dir path
     *
     * @return bool
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _rmdir($path)
    {
        return $this->_unlink($path, 'folders');
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
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _save($fp, $path, $name, $stat)
    {
        if ($name) {
            $path .= '/'.$name;
        }
        $path = $this->_normpath($path);

        empty(basename(dirname($path))) ? $parentId = '0' : $parentId = basename(dirname($path));
        isset($stat['name']) ? $name = $stat['name'] : $name = basename($path);

        $file_exists = '';
        if (empty($stat['rev']) && empty($stat['pid'])) {
            $file = $this->query($parentId);
            if ($file) {
                foreach ($file as $f) {
                    if ($f->name == $name || $f->id == basename($path)) {
                        $name = $f->name;
                        $itemId = $f->id;
                        $file_exists = 'true';
                        break;
                    }
                }
            }
        }

        try {
            //Create or Update a file
            if ($file_exists == 'true'  && !empty($stat) && empty($stat['rev'])) {
                return $this->_normpath(dirname($path).'/'.$f->id);
            }

            $tmpHandle = tmpfile();
            $metaDatas = stream_get_meta_data($fp);
            $tmpFilePath = $metaDatas['uri'];
            fclose($tmpHandle);

            if (!$file_exists && empty($stat['rev']) && empty($stat['pid'])) {
                //upload or create new file in destination target					
                $properties = array('name' => $name, 'parent' => array('id' => $parentId));
                $mimeType = parent::$mimetypes[pathinfo($name, PATHINFO_EXTENSION)];

                $curl = $this->_prepareCurl();

                $cfile = new CURLFile($tmpFilePath, $mimeType);
                $params = array('attributes' => json_encode($properties), 'file' => $cfile);

                $url = self::UPLOAD_URL.'/files/content'
                        .'?access_token='.urlencode($this->box->token->data->access_token);

                $curl = $this->_prepareCurl();
                $stats = fstat($stream);

                $options = array(
                    CURLOPT_URL => $url,
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => $params,
                );

                curl_setopt_array($curl, $options);

                //create or update File in the Target
                $file = json_decode(curl_exec($curl));
            } else {
                //update existing file in destination target				
                $itemId = isset($stat['rev']) ? $stat['rev'] : $f->id;
                $parentId = isset($stat['pid']) ? $stat['pid'] : $f->parent->id;
                $name = isset($stat['name']) ? $stat['name'] : $f->name;

                $properties = array('name' => $name);
                $mimeType = parent::$mimetypes[pathinfo($name, PATHINFO_EXTENSION)];

                $curl = $this->_prepareCurl();

                $url = self::UPLOAD_URL.'/files/'.$itemId.'/content'
                        .'?access_token='.urlencode($this->box->token->data->access_token);

                $cfile = new CURLFile($tmpFilePath, $mimeType);
                $params = array('attributes' => json_encode($properties), 'file' => $cfile);

                $curl = $this->_prepareCurl();

                $options = array(
                    CURLOPT_URL => $url,
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => $params,
                );

                curl_setopt_array($curl, $options);

                //update File
                $file = json_decode(curl_exec($curl));
            }
            if (!is_resource($fp)) {
                fclose($fp);
            }
        } catch (Exception $e) {
            return $this->setError('Box error: '.$e->getMessage());
        }
        $path = $this->_normpath(dirname($path).'/'.$file->entries[0]->id);

        return $path;
    }

    /**
     * Get file contents.
     *
     * @param string $path file path
     *
     * @return string|false
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _getContents($path)
    {
        $contents = '';

        try {
            $itemId = basename($path);
            $url = self::API_URL.'/files/'.$itemId.'/content'
                            .'?access_token='.urlencode($this->box->token->data->access_token);

            $contents = $this->_createCurl($url, true);
        } catch (Exception $e) {
            return $this->setError('Box error: '.$e->getMessage());
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
     *
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
     * @return true
     *
     * @author Dmitry (dio) Levashov
     * @author Alexey Sukhotin
     **/
    protected function _unpack($path, $arc)
    {
        die('Not yet implemented. (_unpack)');
        //return false;
    }

    /**
     * Recursive symlinks search.
     *
     * @param string $path file/dir path
     *
     * @return bool
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _findSymlinks($path)
    {
        die('Not yet implemented. (_findSymlinks)');
    }

    /**
     * Extract files from archive.
     *
     * @param string $path archive path
     * @param array  $arc  archiver command and arguments (same as in $this->archivers)
     *
     * @return true
     *
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
     *
     * @author Dmitry (dio) Levashov,
     * @author Alexey Sukhotin
     **/
    protected function _archive($dir, $files, $name, $arc)
    {
        die('Not yet implemented. (_archive)');
    }
} // END class

