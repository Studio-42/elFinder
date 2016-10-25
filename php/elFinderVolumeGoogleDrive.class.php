<?php

elFinder::$netDrivers['googledrive'] = 'GoogleDrive';

/**
 * Simple elFinder driver for GoogleDrive
 * google-api-php-client-2.x or above.
 *
 * @author Dmitry (dio) Levashov
 * @author Cem (discofever)
 **/
class elFinderVolumeGoogleDrive extends elFinderVolumeDriver
{
    /**
     * Driver id
     * Must be started from letter and contains [a-z0-9]
     * Used as part of volume id.
     *
     * @var string
     **/
    protected $driverId = 'gd';

    /**
     * Google API client object.
     *
     * @var object
     **/
    protected $client = null;

    /**
     * GoogleDrive service object.
     *
     * @var object
     **/
    protected $service = null;

    /**
     * Cache of parents of each directories.
     * 
     * @var array
     */
    protected $parents = [];

    /**
     * Cache of chiled directories of each directories.
     * 
     * @var array
     */
    protected $directories = null;

    /**
     * Cache of itemID => name of each items.
     * 
     * @var array
     */
    protected $names = [];

    /**
     * MIME tyoe of directory.
     *
     * @var string
     */
    const DIRMIME = 'application/vnd.google-apps.folder';

    /**
     * Fetch fields for list.
     *
     * @var string
     */
    const FETCHFIELDS_LIST = 'files(id,name,mimeType,modifiedTime,parents,permissions,size,imageMediaMetadata(height,width),thumbnailLink,webContentLink,webViewLink),nextPageToken';

    /**
     * Fetch fields for get.
     *
     * @var string
     */
    const FETCHFIELDS_GET = 'id,name,mimeType,modifiedTime,parents,permissions,size,imageMediaMetadata(height,width),thumbnailLink,webContentLink,webViewLink';

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
     * Constructor
     * Extend options with required fields.
     *
     * @author Dmitry (dio) Levashov
     * @author Cem (DiscoFever)
     **/
    public function __construct()
    {
        $opts = [
            'client_id' => '',
            'client_secret' => '',
            'access_token' => '',
            'root' => 'My Drive',
            'gdAlias' => '%s@GDrive',
            'googleApiClient' => '',
            'path' => '/',
            'separator' => '/',
            'useGoogleTmb' => true,
            'acceptedName' => '#^[^/\\?*:|"<>]*[^./\\?*:|"<>]$#',
            'rootCssClass' => 'elfinder-navbar-root-googledrive',
            'publishPermission' => [
                'type' => 'anyone',
                'role' => 'reader',
                'withLink' => true,
            ],
            'appsExportMap' => [
                'application/vnd.google-apps.document' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.google-apps.spreadsheet' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.google-apps.drawing' => 'application/pdf',
                'application/vnd.google-apps.presentation' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.google-apps.script' => 'application/vnd.google-apps.script+json',
                'default' => 'application/pdf',
            ],
        ];
        $this->options = array_merge($this->options, $opts);
        $this->options['mimeDetect'] = 'internal';
    }

    /*********************************************************************/
    /*                        ORIGINAL FUNCTIONS                         */
    /*********************************************************************/

    /**
     * Get token and auto refresh.
     *
     * @param object $client Google API client
     *
     * @return true|string error message
     */
    private function _gd_refreshToken($client)
    {
        try {
            $client->setAccessToken($this->options['access_token']);
            if ($client->isAccessTokenExpired()) {
                $client->setClientId($this->options['client_id']);
                $client->setClientSecret($this->options['client_secret']);
                $refresh_token = $client->fetchAccessTokenWithRefreshToken();
                $client->setAccessToken($refresh_token);
                $this->options['access_token'] = $refresh_token;
                $this->service = new \Google_Service_Drive($client);
            }
        } catch (Exception $e) {
            return $e->getMessage();
        }

        return true;
    }

    /**
     * Drive query and fetchAll.
     *
     * @param string $sql
     *
     * @return bool|array
     */
    private function _gd_query($opts)
    {
        $result = [];
        $pageToken = null;
        $parameters = [
                'fields' => self::FETCHFIELDS_LIST,
                'pageSize' => 1000,
                'spaces' => 'drive',
        ];

        if (is_array($opts)) {
            $parameters = array_merge($parameters, $opts);
        }
        do {
            try {
                if ($pageToken) {
                    $parameters['pageToken'] = $pageToken;
                }
                $files = $this->service->files->listFiles($parameters);

                $result = array_merge($result, $files->getFiles());
                $pageToken = $files->getNextPageToken();
            } catch (Exception $e) {
                $pageToken = null;
            }
        } while ($pageToken);

        return $result;
    }

    /**
     * Get dat(googledrive metadata) from GoogleDrive.
     *
     * @param string $path
     *
     * @return array googledrive metadata
     */
    private function _gd_getFile($path, $fields = '')
    {
        if ($path === '/') {
            $itemId = 'root';
        } else {
            $itemId = basename($path);
        }
        if (!$fields) {
            $fields = self::FETCHFIELDS_GET;
        }
        try {
            $file = $this->service->files->get($itemId, ['fields' => $fields]);
            if ($file instanceof Google_Service_Drive_DriveFile) {
                return $file;
            } else {
                return [];
            }
        } catch (Exception $e) {
            return [];
        }
    }

    /**
     * Parse line from googledrive metadata output and return file stat (array).
     *
     * @param string $raw line from ftp_rawlist() output
     *
     * @return array
     *
     * @author Dmitry Levashov
     **/
    protected function _gd_parseRaw($raw)
    {
        $stat = [];

        $stat['iid'] = isset($raw['id']) ? $raw['id'] : 'root';
        $stat['name'] = isset($raw['name']) ? $raw['name'] : '';
        $stat['mime'] = $raw['mimeType'] == self::DIRMIME ? 'directory' :
        ($raw['mimeType'] == 'image/bmp' ? 'image/x-ms-bmp' :  $raw['mimeType']);
        $stat['size'] = $raw['mimeType'] == self::DIRMIME ? 0 : (int) $raw['size'];
        $stat['ts'] = isset($raw['modifiedTime']) ? strtotime($raw['modifiedTime']) : $_SERVER['REQUEST_TIME'];
        $stat['locked'] = false;

        if ($raw['mimeType'] === self::DIRMIME) {
            $stat['dirs'] = (int) $this->_subdirs($stat['iid']);
        } elseif ($size = $raw->getImageMediaMetadata()) {
            $stat['width'] = $size['width'];
            $stat['height'] = $size['height'];
        }

        if ($this->options['useGoogleTmb']) {
            if (isset($raw['thumbnailLink'])) {
                $stat['tmb'] = substr($raw['thumbnailLink'], 8); // remove "https://"
            } else {
                $stat['tmb'] = '';
            }
        }

        $stat['url'] = $this->_gd_isPublished($raw) ? $this->_gd_getLink($raw) : '1';

        return $stat;
    }

    /**
     * Get dat(googledrive metadata) from GoogleDrive.
     *
     * @param string $path
     *
     * @return array googledrive metadata
     */
    private function _gd_getNameByPath($path)
    {
        $itemId = basename($path);
        if (!$this->names) {
            $this->_gd_getDirectoryData();
        }

        return isset($this->names[$itemId]) ? $this->names[$itemId] : '';
    }

    /**
     * Make cache of $parents, $names and $directories.
     *
     * @param string $usecache
     */
    protected function _gd_getDirectoryData($usecache = true)
    {
        if ($usecache) {
            $cache = $this->session->get($this->id.$this->netMountKey, []);
            if ($cache) {
                $this->parents = $cache['parents'];
                $this->names = $cache['names'];
                $this->directories = $cache['directories'];

                return;
            }
        }

        $root = '';
        if ($this->root === '/') {
            // get root id
            $res = $this->_gd_getFile('/', 'id');
            $root = $res->getId();
        }

        $data = [];
        $opts = [
                'fields' => 'files(id, name, parents)',
                'q' => sprintf('trashed=false and mimeType="%s"', self::DIRMIME),
        ];
        $res = $this->_gd_query($opts);
        foreach ($res as $raw) {
            if ($parents = $raw->getParents()) {
                $id = $raw->getId();
                $this->parents[$id] = $parents;
                $this->names[$id] = $raw->getName();
                foreach ($parents as $p) {
                    if (isset($data[$p])) {
                        $data[$p][] = $id;
                    } else {
                        $data[$p] = [$id];
                    }
                }
            }
        }
        if ($root) {
            $data['root'] = $data[$root];
        }
        $this->directories = $data;
        $this->session->set($this->id.$this->netMountKey, [
                'parents' => $this->parents,
                'names' => $this->names,
                'directories' => $this->directories,
        ]);
    }

    /**
     * Get descendants directories.
     *
     * @param string $itemId
     *
     * @return array
     */
    protected function _gd_getDirectories($itemId)
    {
        $ret = [];
        if ($this->directories === null) {
            $this->_gd_getDirectoryData();
        }
        $data = $this->directories;
        if (isset($data[$itemId])) {
            $ret = $data[$itemId];
            foreach ($data[$itemId] as $cid) {
                $ret = array_merge($ret, $this->_gd_getDirectories($cid));
            }
        }

        return $ret;
    }

    /**
     * Get ID based path from item ID.
     *
     * @param string $path
     */
    protected function _gd_getMountPaths($id)
    {
        $root = false;
        if ($this->directories === null) {
            $this->_gd_getDirectoryData();
        }
        list($pid) = explode('/', $id, 2);
        $path = $id;
        if ('/'.$pid === $this->root) {
            $root = true;
        } elseif (!isset($this->parents[$pid])) {
            $root = true;
            $path = ltrim(substr($path, strlen($pid)), '/');
        }
        $res = [];
        if ($root) {
            if ($this->root === '/' || strpos('/'.$path, $this->root) === 0) {
                $res = [(strpos($path, '/') === false) ? '/' : ('/'.$path)];
            }
        } else {
            foreach ($this->parents[$pid] as $p) {
                $_p = $p.'/'.$path;
                $res = array_merge($res, $this->_gd_getMountPaths($_p));
            }
        }

        return $res;
    }

    /**
     * Return is published.
     *
     * @param object $file
     *
     * @return bool
     */
    protected function _gd_isPublished($file)
    {
        $res = false;
        $pType = $this->options['publishPermission']['type'];
        $pRole = $this->options['publishPermission']['role'];
        if ($permissions = $file->getPermissions()) {
            foreach ($permissions as $permission) {
                if ($permission->type === $pType && $permission->role === $pRole) {
                    $res = true;
                    break;
                }
            }
        }

        return $res;
    }

    /**
     * return item URL link.
     *
     * @param object $file
     *
     * @return string
     */
    protected function _gd_getLink($file)
    {
        if ($url = $file->getWebContentLink()) {
            return str_replace('export=download', 'export=media', $url);
        }
        if ($url = $file->getWebViewLink()) {
            return $url;
        }

        return '';
    }

    /**
     * Get download url.
     *
     * @param Google_Service_Drive_DriveFile $file
     *
     * @return string|false
     */
    protected function _gd_getDownloadUrl($file)
    {
        if (strpos($file->mimeType, 'application/vnd.google-apps') !== 0) {
            return 'https://www.googleapis.com/drive/v3/files/'.$file->getId().'?alt=media';
        } else {
            $mimeMap = $this->options['appsExportMap'];
            if (isset($mimeMap[$file->getMimeType()])) {
                $mime = $mimeMap[$file->getMimeType()];
            } else {
                $mime = $mimeMap['default'];
            }
            $mime = rawurlencode($mime);

            return 'https://www.googleapis.com/drive/v3/files/'.$file->getId().'/export?mimeType='.$mime;
        }

        return false;
    }

    /**
     * Return stream file pointer for read file.
     *
     * @param object $file
     * @param array  $redirect
     *
     * @return resource|false
     */
    protected function _gd_getReadStream($file, $redirect = [])
    {
        if (!$redirect) {
            $redirect = [
                    'cnt' => 0,
                    'url' => '',
                    'token' => '',
                    'cookies' => [],
            ];
            if ($dlurl = $this->_gd_getDownloadUrl($file)) {
                $token = $this->client->getAccessToken();
                $access_token = '';
                if (is_array($token)) {
                    $access_token = $token['access_token'];
                } else {
                    if ($token = @json_decode($client->getAccessToken())) {
                        $access_token = $token->access_token;
                    }
                }
                $redirect = [
                        'cnt' => 0,
                        'url' => '',
                        'token' => $access_token,
                        'cookies' => [],
                ];
            }
        } else {
            if ($redirect['cnt'] > 5) {
                return false;
            }
            $dlurl = $redirect['url'];
            $redirect['url'] = '';
            $access_token = $redirect['token'];
        }

        if ($dlurl) {
            $url = parse_url($dlurl);
            $cookies = [];
            if ($redirect['cookies']) {
                foreach ($redirect['cookies'] as $d => $c) {
                    if (strpos($url['host'], $d) !== false) {
                        $cookies[] = $c;
                    }
                }
            }
            if ($access_token) {
                $query = isset($url['query']) ? '?'.$url['query'] : '';
                $stream = stream_socket_client('ssl://'.$url['host'].':443');
                stream_set_timeout($stream, 300);
                fputs($stream, "GET {$url['path']}{$query} HTTP/1.1\r\n");
                fputs($stream, "Host: {$url['host']}\r\n");
                fputs($stream, "Authorization: Bearer {$access_token}\r\n");
                fputs($stream, "Connection: Close\r\n");
                if ($cookies) {
                    fputs($stream, 'Cookie: '.implode('; ', $cookies)."\r\n");
                }
                fputs($stream, "\r\n");
                while (($res = trim(fgets($stream))) !== '') {
                    // find redirect
                    if (preg_match('/^Location: (.+)$/', $res, $m)) {
                        $redirect['url'] = $m[1];
                    }
                    // fetch cookie
                    if (strpos($res, 'Set-Cookie:') === 0) {
                        $domain = $url['host'];
                        if (preg_match('/^Set-Cookie:(.+)(?:domain=\s*([^ ;]+))?/i', $res, $c1)) {
                            if (!empty($c1[2])) {
                                $domain = trim($c1[2]);
                            }
                            if (preg_match('/([^ ]+=[^;]+)/', $c1[1], $c2)) {
                                $redirect['cookies'][$domain] = $c2[1];
                            }
                        }
                    }
                }
                if ($redirect['url']) {
                    ++$redirect['cnt'];
                    fclose($stream);

                    return $this->_gd_getReadStream($file, $redirect);
                }

                return $stream;
            }
        }

        return false;
    }

    /**
     * Get thumbnail from GoogleDrive.com.
     *
     * @param string $path
     * @param string $size
     *
     * @return string | boolean
     */
    protected function _gd_getThumbnail($path)
    {
        $itemId = basename($path);

        try {
            $contents = $this->service->files->get($itemId, [
                    'alt' => 'media',
            ]);
            $contents = $contents->getBody()->detach();
            rewind($contents);

            return $contents;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Publish permissions specified path item.
     *
     * @param string $path
     *
     * @return bool
     */
    protected function _gd_publish($path)
    {
        if ($file = $this->_gd_getFile($path)) {
            if ($this->_gd_isPublished($file)) {
                return true;
            }
            try {
                if ($this->service->permissions->create($file->getId(), new \Google_Service_Drive_Permission($this->options['publishPermission']))) {
                    return true;
                }
            } catch (Exception $e) {
                return false;
            }
        }

        return false;
    }

    /**
     * unPublish permissions specified path.
     *
     * @param string $path
     *
     * @return bool
     */
    protected function _gd_unPublish($path)
    {
        if ($file = $this->_gd_getFile($path)) {
            if (!$this->_gd_isPublished($file)) {
                return true;
            }
            $permissions = $file->getPermissions();
            $pType = $this->options['publishPermission']['type'];
            $pRole = $this->options['publishPermission']['role'];
            try {
                foreach ($permissions as $permission) {
                    if ($permission->type === $pType && $permission->role === $pRole) {
                        $this->service->permissions->delete($file->getId(), $permission->getId());

                        return true;
                        break;
                    }
                }
            } catch (Exception $e) {
                return false;
            }
        }

        return false;
    }

    /*********************************************************************/
    /*                        EXTENDED FUNCTIONS                         */
    /*********************************************************************/

    /**
     * Prepare
     * Call from elFinder::netmout() before volume->mount().
     *
     * @return array
     *
     * @author Naoki Sawada
     * @author Raja Sharma updating for GoogleDrive
     **/
    public function netmountPrepare($options)
    {
        if (empty($options['client_id']) && defined('ELFINDER_GOOGLEDRIVE_CLIENTID')) {
            $options['client_id'] = ELFINDER_GOOGLEDRIVE_CLIENTID;
        }
        if (empty($options['client_secret']) && defined('ELFINDER_GOOGLEDRIVE_CLIENTSECRET')) {
            $options['client_secret'] = ELFINDER_GOOGLEDRIVE_CLIENTSECRET;
        }

        if (!isset($options['pass'])) {
            $options['pass'] = '';
        }

        try {
            $client = new \Google_Client();
            $client->setClientId($options['client_id']);
            $client->setClientSecret($options['client_secret']);

            if ($options['pass'] === 'reauth') {
                $options['pass'] = '';
                $this->session->set('GoogleDriveAuthParams', [])->set('GoogleDriveTokens', []);
            } elseif ($options['pass'] === 'googledrive') {
                $options['pass'] = '';
            }

            $options = array_merge($this->session->get('GoogleDriveAuthParams', []), $options);

            if (!isset($options['access_token'])) {
                $options['access_token'] = $this->session->get('GoogleDriveTokens', []);
                $this->session->remove('GoogleDriveTokens');
            }
            $aToken = $options['access_token'];

            $rootObj = $service = null;
            if ($aToken) {
                try {
                    $client->setAccessToken($aToken);
                    if ($client->isAccessTokenExpired()) {
                        $aToken = array_merge($aToken, $client->fetchAccessTokenWithRefreshToken());
                        $client->setAccessToken($aToken);
                    }
                    $service = new \Google_Service_Drive($client);
                    $rootObj = $service->files->get('root');

                    $options['access_token'] = $aToken;
                    $this->session->set('GoogleDriveAuthParams', $options);
                } catch (Exception $e) {
                    $aToken = [];
                    $options['access_token'] = [];
                    if ($options['user'] !== 'init') {
                        $this->session->set('GoogleDriveAuthParams', $options);

                        return ['exit' => true, 'error' => elFinder::ERROR_REAUTH_REQUIRE];
                    }
                }
            }

            if ($options['user'] === 'init') {
                if (empty($options['url'])) {
                    $options['url'] = $this->getConnectorUrl();
                }

                $callback = $options['url']
                           .'?cmd=netmount&protocol=googledrive&host=1';
                $client->setRedirectUri($callback);

                if (!$aToken && empty($_GET['code'])) {
                    $client->setScopes([Google_Service_Drive::DRIVE]);
                    if (!empty($options['offline'])) {
                        $client->setApprovalPrompt('force');
                        $client->setAccessType('offline');
                    }
                    $url = $client->createAuthUrl();

                    $html = '<input id="elf-volumedriver-googledrive-host-btn" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" value="{msg:btnApprove}" type="button" onclick="window.open(\''.$url.'\')">';
                    $html .= '<script>
                        $("#'.$options['id'].'").elfinder("instance").trigger("netmount", {protocol: "googledrive", mode: "makebtn"});
                    </script>';
                    if (empty($options['pass']) && $options['host'] !== '1') {
                        $options['pass'] = 'return';
                        $this->session->set('GoogleDriveAuthParams', $options);

                        return ['exit' => true, 'body' => $html];
                    } else {
                        $out = [
                            'node' => $options['id'],
                            'json' => '{"protocol": "googledrive", "mode": "makebtn", "body" : "'.str_replace($html, '"', '\\"').'", "error" : "'.elFinder::ERROR_ACCESS_DENIED.'"}',
                            'bind' => 'netmount',
                        ];

                        return ['exit' => 'callback', 'out' => $out];
                    }
                } else {
                    if (!empty($_GET['code'])) {
                        $aToken = $client->fetchAccessTokenWithAuthCode($_GET['code']);
                        $options['access_token'] = $aToken;
                        $this->session->set('GoogleDriveTokens', $aToken)->set('GoogleDriveAuthParams', $options);
                        $out = [
                            'node' => $options['id'],
                            'json' => '{"protocol": "googledrive", "mode": "done", "reset": 1}',
                            'bind' => 'netmount',
                        ];

                        return ['exit' => 'callback', 'out' => $out];
                    }
                    $folders = [];
                    foreach ($service->files->listFiles([
                        'pageSize' => 1000,
                        'q' => 'trashed = false and mimeType = "application/vnd.google-apps.folder"',
                    ]) as $f) {
                        $folders[$f->getId()] = $f->getName();
                    }
                    natcasesort($folders);
                    $folders = ['root' => $rootObj->getName()] + $folders;
                    $folders = json_encode($folders);
                    $json = '{"protocol": "googledrive", "mode": "done", "folders": '.$folders.'}';
                    $options['pass'] = 'return';
                    $html = 'Google.com';
                    $html .= '<script>
                        $("#'.$options['id'].'").elfinder("instance").trigger("netmount", '.$json.');
                    </script>';
                    $this->session->set('GoogleDriveAuthParams', $options);

                    return ['exit' => true, 'body' => $html];
                }
            }
        } catch (Exception $e) {
            $this->session->remove('GoogleDriveAuthParams')->remove('GoogleDriveTokens');
            if (empty($options['pass'])) {
                return ['exit' => true, 'body' => '{msg:'.elFinder::ERROR_ACCESS_DENIED.'}'.' '.$e->getMessage()];
            } else {
                return ['exit' => true, 'error' => [elFinder::ERROR_ACCESS_DENIED, $e->getMessage()]];
            }
        }

        if (!$aToken) {
            return ['exit' => true, 'error' => elFinder::ERROR_REAUTH_REQUIRE];
        }

        if ($options['path'] === '/') {
            $options['path'] = 'root';
        }

        try {
            $file = $service->files->get($options['path']);
            $options['alias'] = sprintf($this->options['gdAlias'], $file->getName());
        } catch (Google_Service_Exception $e) {
            $err = json_decode($e->getMessage(), true);
            if (isset($err['error']) && $err['error']['code'] == 404) {
                return ['exit' => true, 'error' => [elFinder::ERROR_TRGDIR_NOT_FOUND, $options['path']]];
            } else {
                return ['exit' => true, 'error' => $e->getMessage()];
            }
        } catch (Exception $e) {
            return ['exit' => true, 'error' => $e->getMessage()];
        }

        foreach (['host', 'user', 'pass', 'id', 'offline'] as $key) {
            unset($options[$key]);
        }

        return $options;
    }

    /**
     * process of on netunmount
     * Drop `googledrive` & rm thumbs.
     * 
     * @param array $options
     *
     * @return bool
     */
    public function netunmount($netVolumes, $key)
    {
        if (!$this->options['useGoogleTmb']) {
            if ($tmbs = glob(rtrim($this->options['tmbPath'], '\\/').DIRECTORY_SEPARATOR.$this->netMountKey.'*.png')) {
                foreach ($tmbs as $file) {
                    unlink($file);
                }
            }
        }
        $this->session->remove($this->id.$this->netMountKey);

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
        if (!$this->options['access_token']) {
            return $this->setError('Required options undefined.');
        }

        // make net mount key
        $aToken = is_array($this->options['access_token'])? $this->options['access_token']['access_token'] : $this->options['access_token'];
        $this->netMountKey = md5($aToken . '-' . $this->options['path']);

        if (!$this->service) {
            if ($this->options['googleApiClient'] && !class_exists('Google_Client')) {
                include_once $this->options['googleApiClient'];
            }
            if (!class_exists('Google_Client')) {
                return $this->setError('Class Google_Client not found.');
            }

            $client = new \Google_Client();

            try {
                $client->setAccessToken($this->options['access_token']);
                if (true !== ($res = $this->_gd_refreshToken($client))) {
                    return $this->setError($res);
                }
            } catch (InvalidArgumentException $e) {
                return $this->setError($e->getMessage());
            }
            try {
                $this->service = new \Google_Service_Drive($client);
            } catch (Google_Service_Exception $e) {
                return $this->setError($e->getMessage());
            }
        }

        if (!$this->service) {
            return $this->setError('OAuth extension not loaded.');
        }

        $this->client = $client;

        // normalize root path
        if ($this->options['path'] == 'root') {
            $this->options['path'] = '/';
        }
        $this->root = $this->options['path'] = $this->_normpath($this->options['path']);

        $this->options['root'] == '' ?  $this->options['root'] = $this->_gd_getNameByPath('root') : $this->options['root'];

        if (empty($this->options['alias'])) {
            $this->options['alias'] = ($this->options['path'] === '/') ? $this->options['root'] : sprintf($this->options['gdAlias'], $this->_gd_getNameByPath($this->options['path']));
        }

        $this->rootName = $this->options['alias'];

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

        if ($this->options['useGoogleTmb']) {
            $this->options['tmbURL'] = 'https://';
        }

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

        if ($this->isMyReload()) {
            $this->_gd_getDirectoryData(false);
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
     * Cache dir contents.
     *
     * @param string $path dir path
     *
     * @author Dmitry Levashov
     **/
    protected function cacheDir($path)
    {
        $pid = ($path === '/') ? 'root' : basename($path);

        $opts = [
            'fields' => self::FETCHFIELDS_LIST,
            'q' => sprintf('trashed=false and "%s" in parents', $pid),
        ];

        $this->dirsCache[$path] = [];
        $res = $this->_gd_query($opts);

        $mountPath = $this->_normpath($path.'/');

        if ($res) {
            foreach ($res as $raw) {
                if ($stat = $this->_gd_parseRaw($raw)) {
                    $stat = $this->updateCache($mountPath.$raw->id, $stat);
                    if (empty($stat['hidden']) && $path !== $mountPath.$raw->id) {
                        $this->dirsCache[$path][] = $mountPath.$raw->id;
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
        $path == '/' || $path == 'root' ? $itemId = 'root' : $itemId = basename($path);

        $path = $this->_normpath($path.'/');
        $result = [];
        $query = '';

        if ($itemId !== 'root') {
            $dirs = array_merge([$itemId], $this->_gd_getDirectories($itemId));
            $query = '(\''.implode('\' in parents or \'', $dirs).'\' in parents)';
        }

        $tmp = [];
        if (!$mimes) {
            foreach (explode(' ', $q) as $_v) {
                $tmp[] = 'fullText contains \''.str_replace('\'', '\\\'', $_v).'\'';
            }
            $query .= ($query ? ' and ' : '').implode(' and ', $tmp);
        } else {
            foreach ($mimes as $_v) {
                $tmp[] = 'mimeType contains \''.str_replace('\'', '\\\'', $_v).'\'';
            }
            $query .= ($query ? ' and ' : '').'('.implode(' or ', $tmp).')';
        }

        $opts = [
            'q' => sprintf('trashed=false and (%s)', $query),
        ];

        $res = $this->_gd_query($opts);

        $timeout = $this->options['searchTimeout'] ? $this->searchStart + $this->options['searchTimeout'] : 0;
        foreach ($res as $raw) {
            if ($timeout && $timeout < time()) {
                $this->setError(elFinder::ERROR_SEARCH_TIMEOUT, $this->_path($path));
                break;
            }
            if ($stat = $this->_gd_parseRaw($raw)) {
                if ($parents = $raw->getParents()) {
                    foreach ($parents as $parent) {
                        $paths = $this->_gd_getMountPaths($parent);
                        foreach ($paths as $path) {
                            $path = ($path === '') ? '/' : (rtrim($path, '/').'/');
                            if (!isset($this->cache[$path.$raw->id])) {
                                $stat = $this->updateCache($path.$raw->id, $stat);
                            } else {
                                $stat = $this->cache[$path.$raw->id];
                            }
                            if (empty($stat['hidden'])) {
                                $stat['path'] = $this->_path($path).$stat['name'];
                                $result[] = $stat;
                            }
                        }
                    }
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
        $res = $this->_gd_getFile($src);
        if ($res['mimeType'] == self::DIRMIME) {
            $itemId = basename($this->_mkdir($dst, $name));
            $path = $this->_joinPath($dst, $itemId);
            $opts = [
                'q' => sprintf('trashed=false and "%s" in parents', basename($src)),
            ];

            $res = $this->_gd_query($opts);
            foreach ($res as $raw) {
                $raw['mimeType'] == self::DIRMIME ? $this->copy($src.'/'.$raw['id'], $path, $raw['name']) : $this->_copy($src.'/'.$raw['id'], $path, $raw['name']);
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
            if (!$recursive && !$this->_unlink($path)) {
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
     *
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
        if (!$data = $this->_gd_getThumbnail($path)) {
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
        return $this->netMountKey.$stat['iid'].$stat['ts'].'.png';
    }

    /**
     * Return content URL (for netmout volume driver)
     * If file.url == 1 requests from JavaScript client with XHR.
     * 
     * @param string $hash    file hash
     * @param array  $options options array
     *
     * @return bool|string
     *
     * @author Naoki Sawada
     */
    public function getContentUrl($hash, $options = [])
    {
        if (($file = $this->file($hash)) == false || !$file['url'] || $file['url'] == 1) {
            $path = $this->decode($hash);

            if ($this->_gd_publish($path)) {
                if ($raw = $this->_gd_getFile($path)) {
                    return $this->_gd_getLink($raw);
                }
            }
        }

        return false;
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
        if (!$this->names) {
            $this->_gd_getDirectoryData();
        }
        $path = $this->_normpath(substr($path, strlen($this->root)));
        $names = [];
        $paths = explode('/', $path);
        foreach ($paths as $_p) {
            $names[] = isset($this->names[$_p]) ? $this->names[$_p] : $_p;
        }

        return $this->rootName.implode('/', $names);
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
        if ($raw = $this->_gd_getFile($path)) {
            return $this->_gd_parseRaw($raw);
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
        if ($this->directories === null) {
            $this->_gd_getDirectoryData();
        }

        return isset($this->directories[basename($path)]);
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

        if ($file = $this->_gd_getFile($path)) {
            if (isset($file['imageMediaMetadata'])) {
                return $file['imageMediaMetadata']['width'].'x'.$file['imageMediaMetadata']['height'];
            }
        }

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
            if ($file = $this->_gd_getFile($path)) {
                return $this->_gd_getReadStream($file);
            } else {
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
        basename(dirname($path)) == '' ? $parentId = 'root' : $parentId = basename(dirname($path));

        try {
            $files = new \Google_Service_Drive_DriveFile();

            $files->setName($name);
            $files->setMimeType(self::DIRMIME);
            $files->setParents([$parentId]);

            //create the Folder in the Parent
            $createdFile = $this->service->files->create($files);

            basename(dirname($path)) == '' ? $path = '/'.$createdFile['id'] : $path = dirname($path).'/'.$createdFile['id'];

            $this->_gd_getDirectoryData(false);

            return $path;
        } catch (Exception $e) {
            return $this->setError('GoogleDrive error: '.$e->getMessage());
        }
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
        return $this->_save(tmpfile(), $path, $name, []);
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
            $files = new \Google_Service_Drive_DriveFile();
            $files->setName($name);

            //Set the Parent id         
            $targetDir == '/' ? $parentId = 'root' : $parentId = basename($targetDir);
            $files->setParents([$parentId]);

            $file = $this->service->files->copy(basename($source), $files, ['fields' => self::FETCHFIELDS_GET]);
            $itemId = $file->id;

            return $itemId;
        } catch (Exception $e) {
            return $this->setError('GoogleDrive error: '.$e->getMessage());
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
        $target = $this->_normpath($targetDir.'/'.basename($source));
        try {
            //moving and renaming a file or directory
            $files = new \Google_Service_Drive_DriveFile();
            $files->setName($name);

            //Set new Parent and remove old parent          
            $targetDir == '/' || $targetDir == 'root' ? $addParents = 'root' : $addParents = basename($targetDir);
            basename(dirname($source)) == '/' || basename(dirname($source)) == '' ? $removeParents = 'root' : $removeParents = basename(dirname($source));

            $opts = ['addParents' => $addParents, 'removeParents' => $removeParents];

            $file = $this->service->files->update(basename($source), $files, $opts);
        } catch (Exception $e) {
            return $this->setError('GoogleDrive error: '.$e->getMessage());
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
    protected function _unlink($path)
    {
        try {
            $files = new \Google_Service_Drive_DriveFile();
            $files->setTrashed(true);

            $opts = ['removeParents' => basename(dirname($path))];
            $this->service->files->update(basename($path), $files, $opts);
        } catch (Exception $e) {
            return $this->setError('GoogleDrive error: '.$e->getMessage());
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
        $res = $this->_unlink($path);
        $res && $this->_gd_getDirectoryData(false);

        return $res;
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
        if ($name !== '') {
            $path .= '/'.$name;
        } else {
            $stat['iid'] = basename($path);
        }

        $path = $this->_normpath($path);

        if (!$stat || empty($stat['iid'])) {
            $pid = empty(basename(dirname($path))) ? 'root' : basename(dirname($path));
            $opts = [
                'q' => sprintf('trashed=false and "%s" in parents and name="%s"', $pid, $name),
            ];
            $res = $this->_gd_query($opts);
            $res = empty($res) ? null : $res[0];
        } else {
            $res = $this->_gd_getFile($path);
        }

        try {
            $files = new \Google_Service_Drive_DriveFile();

            if ($res) {
                //Update a file
                $itemId = $res['id'];
                $name = $res['name'];
                $mimeType = $res['mimeType'];

                if (!empty($stat) && empty($stat['iid'])) {
                    return $this->_normpath(dirname($path).'/'.$itemId);
                }

                $files->setName($name);
                $files->setDescription('');
                if (isset($stat['mime'])) {
                    $mimeType = $stat['mime'];
                }
                // Send the request to the API for updation contents.
                $data = stream_get_contents($fp);
                $file = $this->service->files->update($itemId, $files, [
                    'data' => $data,
                    'mimeType' => $mimeType,
                    'uploadType' => 'multipart',
                ]);
            } else {
                //Insert or Create a file
                $name == '' ? $name = basename($path) : $name = $name;
                $files->setName($name);
                $files->setDescription('');
                $mimeType = empty($stat['mime']) ? self::mimetypeInternalDetect($name) : $stat['mime'];
                $files->setMimeType($mimeType);

                //Set the Folder Parent         
                basename(dirname($path)) == '' ? $parentId = 'root' : $parentId = basename(dirname($path));

                $files->setParents([$parentId]);
                // Send the request to the API for new file contents.
                $data = stream_get_contents($fp);
                $file = $this->service->files->create($files, [
                    'data' => $data,
                    'mimeType' => $mimeType,
                    'uploadType' => 'media',
                ]);
            }
        } catch (Exception $e) {
            return $this->setError('GoogleDrive error: '.$e->getMessage());
        }
        $path = $this->_normpath(dirname($path).'/'.$file->getId());

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

            $contents = $this->service->files->get($itemId, [
                'alt' => 'media',
            ]);
            $contents = (string) $contents->getBody();
        } catch (Exception $e) {
            return $this->setError('GoogleDrive error: '.$e->getMessage());
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
                $res = $this->_save($fp, $path, '', []);
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
        return [];
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

