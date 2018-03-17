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
            'access_token' => [],
            'refresh_token' => '',
            'serviceAccountConfigFile' => '',
            'root' => 'My Drive',
            'gdAlias' => '%s@GDrive',
            'googleApiClient' => '',
            'path' => '/',
            'tmbPath' => '',
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
     * Get Parent ID, Item ID, Parent Path as an array from path.
     *
     * @param string $path
     *
     * @return array
     */
    protected function _gd_splitPath($path)
    {
        $path = trim($path, '/');
        $pid = '';
        if ($path === '') {
            $id = 'root';
            $parent = '';
        } else {
            $paths = explode('/', $path);
            $id = array_pop($paths);
            if ($paths) {
                $parent = '/'.implode('/', $paths);
                $pid = array_pop($paths);
            } else {
                $rootid = ($this->root === '/') ? 'root' : trim($this->root, '/');
                if ($id === $rootid) {
                    $parent = '';
                } else {
                    $parent = $this->root;
                    $pid = $rootid;
                }
            }
        }

        return array($pid, $id, $parent);
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
        list(, $itemId) = $this->_gd_splitPath($path);
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
        if (isset($raw['modifiedTime'])) {
            $stat['ts'] = strtotime($raw['modifiedTime']);
        }

        if ($raw['mimeType'] === self::DIRMIME) {
            $stat['mime'] = 'directory';
            $stat['size'] = 0;
        } else {
            $stat['mime'] = $raw['mimeType'] == 'image/bmp' ? 'image/x-ms-bmp' : $raw['mimeType'];
            $stat['size'] = (int) $raw['size'];
            if ($size = $raw->getImageMediaMetadata()) {
                $stat['width'] = $size['width'];
                $stat['height'] = $size['height'];
            }

            $published = $this->_gd_isPublished($raw);

            if ($this->options['useGoogleTmb']) {
                if (isset($raw['thumbnailLink'])) {
                    if ($published) {
                        $stat['tmb'] = 'drive.google.com/thumbnail?authuser=0&sz=s'.$this->options['tmbSize'].'&id='.$raw['id'];
                    } else {
                        $stat['tmb'] = substr($raw['thumbnailLink'], 8); // remove "https://"
                    }
                } else {
                    $stat['tmb'] = '';
                }
            }

            if ($published) {
                $stat['url'] = $this->_gd_getLink($raw);
            } elseif (!$this->disabledGetUrl) {
                $stat['url'] = '1';
            }
        }

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
        list(, $itemId) = $this->_gd_splitPath($path);
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
            if ($res = $this->_gd_getFile('/', 'id')) {
                $root = $res->getId();
            }
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
        if ($root && isset($data[$root])) {
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
        if (strpos($file->mimeType, 'application/vnd.google-apps.') !== 0) {
            if ($url = $file->getWebContentLink()) {
                return str_replace('export=download', 'export=media', $url);
            }
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
        if (strpos($file->mimeType, 'application/vnd.google-apps.') !== 0) {
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
     * Get thumbnail from GoogleDrive.com.
     *
     * @param string $path
     * @param string $size
     *
     * @return string | boolean
     */
    protected function _gd_getThumbnail($path)
    {
        list(, $itemId) = $this->_gd_splitPath($path);

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

    /**
     * Read file chunk.
     *
     * @param resource $handle
     * @param int      $chunkSize
     *
     * @return string
     */
    protected function _gd_readFileChunk($handle, $chunkSize)
    {
        $byteCount = 0;
        $giantChunk = '';
        while (!feof($handle)) {
            // fread will never return more than 8192 bytes if the stream is read buffered and it does not represent a plain file
            $chunk = fread($handle, 8192);
            $byteCount += strlen($chunk);
            $giantChunk .= $chunk;
            if ($byteCount >= $chunkSize) {
                return $giantChunk;
            }
        }

        return $giantChunk;
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
        if (empty($options['googleApiClient']) && defined('ELFINDER_GOOGLEDRIVE_GOOGLEAPICLIENT')) {
            $options['googleApiClient'] = ELFINDER_GOOGLEDRIVE_GOOGLEAPICLIENT;
            include_once $options['googleApiClient'];
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

            if (isset($options['user']) && $options['user'] === 'init') {
                if (empty($options['url'])) {
                    $options['url'] = elFinder::getConnectorUrl();
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
                    $path = $options['path'];
                    if ($path === '/') {
                        $path = 'root';
                    }
                    $folders = [];
                    foreach ($service->files->listFiles([
                        'pageSize' => 1000,
                        'q' => sprintf('trashed = false and "%s" in parents and mimeType = "application/vnd.google-apps.folder"', $path),
                    ]) as $f) {
                        $folders[$f->getId()] = $f->getName();
                    }
                    natcasesort($folders);

                    if ($options['pass'] === 'folders') {
                        return ['exit' => true, 'folders' => $folders];
                    }

                    $folders = ['root' => $rootObj->getName()] + $folders;
                    $folders = json_encode($folders);
                    $expires = empty($aToken['refresh_token']) ? $aToken['created'] + $aToken['expires_in'] - 30 : 0;
                    $json = '{"protocol": "googledrive", "mode": "done", "folders": '.$folders.', "expires": '.$expires.'}';
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
     * Return fileinfo based on filename
     * For item ID based path file system
     * Please override if needed on each drivers.
     *
     * @param string $path file cache
     *
     * @return array
     */
    protected function isNameExists($path)
    {
        list($parentId, $name) = $this->_gd_splitPath($path);
        $opts = [
                'q' => sprintf('trashed=false and "%s" in parents and name="%s"', $parentId, $name),
                'fields' => self::FETCHFIELDS_LIST,
            ];
        $srcFile = $this->_gd_query($opts);

        return empty($srcFile) ? false : $this->_gd_parseRaw($srcFile[0]);
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
        $serviceAccountConfig = '';
        if (empty($this->options['serviceAccountConfigFile'])) {
            if (empty($options['client_id'])) {
                if (defined('ELFINDER_GOOGLEDRIVE_CLIENTID') && ELFINDER_GOOGLEDRIVE_CLIENTID) {
                    $this->options['client_id'] = ELFINDER_GOOGLEDRIVE_CLIENTID;
                } else {
                    return $this->setError('Required option "client_id" is undefined.');
                }
            }
            if (empty($options['client_secret'])) {
                if (defined('ELFINDER_GOOGLEDRIVE_CLIENTSECRET') && ELFINDER_GOOGLEDRIVE_CLIENTSECRET) {
                    $this->options['client_secret'] = ELFINDER_GOOGLEDRIVE_CLIENTSECRET;
                } else {
                    return $this->setError('Required option "client_secret" is undefined.');
                }
            }
            if (!$this->options['access_token'] && !$this->options['refresh_token']) {
                return $this->setError('Required option "access_token" or "refresh_token" is undefined.');
            }
        } else {
            if (!is_readable($this->options['serviceAccountConfigFile'])) {
                return $this->setError('Option "serviceAccountConfigFile" file is not readable.');
            }
            $serviceAccountConfig = $this->options['serviceAccountConfigFile'];
        }

        try {
            if (!$serviceAccountConfig) {
                $aTokenFile = '';
                if ($this->options['refresh_token']) {
                    // permanent mount
                    $aToken = $this->options['refresh_token'];
                    $this->options['access_token'] = '';
                    $tmp = elFinder::getStaticVar('commonTempPath');
                    if (!$tmp) {
                        $tmp = $this->getTempPath();
                    }
                    if ($tmp) {
                        $aTokenFile = $tmp.DIRECTORY_SEPARATOR.md5($this->options['client_id'].$this->options['refresh_token']).'.gtoken';
                        if (is_file($aTokenFile)) {
                            $this->options['access_token'] = json_decode(file_get_contents($aTokenFile), true);
                        }
                    }
                } else {
                    // make net mount key for network mount
                    if (is_array($this->options['access_token'])) {
                        $aToken = !empty($this->options['access_token']['refresh_token'])
                            ? $this->options['access_token']['refresh_token']
                            : $this->options['access_token']['access_token'];
                    } else {
                        return $this->setError('Required option "access_token" is not Array or empty.');
                    }
                }
            }

            $errors = [];
            if (!$this->service) {
                if (($this->options['googleApiClient'] || defined('ELFINDER_GOOGLEDRIVE_GOOGLEAPICLIENT')) && !class_exists('Google_Client')) {
                    include_once $this->options['googleApiClient'] ? $this->options['googleApiClient'] : ELFINDER_GOOGLEDRIVE_GOOGLEAPICLIENT;
                }
                if (!class_exists('Google_Client')) {
                    return $this->setError('Class Google_Client not found.');
                }

                $this->client = new \Google_Client();

                $client = $this->client;

                if (!$serviceAccountConfig) {
                    if ($this->options['access_token']) {
                        $client->setAccessToken($this->options['access_token']);
                    }
                    if ($client->isAccessTokenExpired()) {
                        $client->setClientId($this->options['client_id']);
                        $client->setClientSecret($this->options['client_secret']);
                        $access_token = $client->fetchAccessTokenWithRefreshToken($this->options['refresh_token'] ?: null);
                        $client->setAccessToken($access_token);
                        if ($aTokenFile) {
                            file_put_contents($aTokenFile, json_encode($access_token));
                        } else {
                            $access_token['refresh_token'] = $this->options['access_token']['refresh_token'];
                        }
                        if (!empty($this->options['netkey'])) {
                            elFinder::$instance->updateNetVolumeOption($this->options['netkey'], 'access_token', $access_token);
                        }
                        $this->options['access_token'] = $access_token;
                    }
                } else {
                    $client->setAuthConfigFile($serviceAccountConfig);
                    $client->setScopes([Google_Service_Drive::DRIVE]);
                    $aToken = $client->getClientId();
                }
                $this->service = new \Google_Service_Drive($client);
            }

            $this->netMountKey = md5($aToken.'-'.$this->options['path']);
        } catch (InvalidArgumentException $e) {
            $errors[] = $e->getMessage();
        } catch (Google_Service_Exception $e) {
            $errors[] = $e->getMessage();
        }

        if (!$this->service) {
            $this->session->remove($this->id.$this->netMountKey);
            if ($aTokenFile) {
                unlink($aTokenFile);
            }
            $errors[] = 'Google Drive Service could not be loaded.';

            return $this->setError($errors);
        }

        // normalize root path
        if ($this->options['path'] == 'root') {
            $this->options['path'] = '/';
        }
        $this->root = $this->options['path'] = $this->_normpath($this->options['path']);

        $this->options['root'] == '' ? $this->options['root'] = $this->_gd_getNameByPath('root') : $this->options['root'];

        if (empty($this->options['alias'])) {
            $this->options['alias'] = ($this->options['path'] === '/') ? $this->options['root'] : sprintf($this->options['gdAlias'], $this->_gd_getNameByPath($this->options['path']));
        }

        $this->rootName = $this->options['alias'];

        if (!empty($this->options['tmpPath'])) {
            if ((is_dir($this->options['tmpPath']) || mkdir($this->options['tmpPath'])) && is_writable($this->options['tmpPath'])) {
                $this->tmp = $this->options['tmpPath'];
            }
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
            $this->options['tmbPath'] = '';
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
        $this->dirsCache[$path] = [];
        $hasDir = false;

        list(, $pid) = $this->_gd_splitPath($path);

        $opts = [
            'fields' => self::FETCHFIELDS_LIST,
            'q' => sprintf('trashed=false and "%s" in parents', $pid),
        ];

        $res = $this->_gd_query($opts);

        $mountPath = $this->_normpath($path.'/');

        if ($res) {
            foreach ($res as $raw) {
                if ($stat = $this->_gd_parseRaw($raw)) {
                    $stat = $this->updateCache($mountPath.$raw->id, $stat);
                    if (empty($stat['hidden']) && $path !== $mountPath.$raw->id) {
                        if (!$hasDir && $stat['mime'] === 'directory') {
                            $hasDir = true;
                        }
                        $this->dirsCache[$path][] = $mountPath.$raw->id;
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
        list(, $itemId) = $this->_gd_splitPath($path);

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
            $newDir = $this->_mkdir($dst, $name);
            if ($newDir) {
                list(, $itemId) = $this->_gd_splitPath($newDir);
                list(, $srcId) = $this->_gd_splitPath($src);
                $path = $this->_joinPath($dst, $itemId);
                $opts = [
                    'q' => sprintf('trashed=false and "%s" in parents', $srcId),
                ];

                $res = $this->_gd_query($opts);
                foreach ($res as $raw) {
                    $raw['mimeType'] == self::DIRMIME ? $this->copy($src.'/'.$raw['id'], $path, $raw['name']) : $this->_copy($src.'/'.$raw['id'], $path, $raw['name']);
                }

                return $this->_joinPath($dst, $itemId);
            } else {
                $this->setError(elFinder::ERROR_COPY, $this->_path($src));
            }
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
        if (!empty($options['temporary'])) {
            // try make temporary file
            $url = parent::getContentUrl($hash, $options);
            if ($url) {
                return $url;
            }
        }
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

    /**
     * Return debug info for client.
     *
     * @return array
     **/
    public function debug()
    {
        $res = parent::debug();
        if (empty($this->options['refresh_token']) && $this->options['access_token'] && isset($this->options['access_token']['refresh_token'])) {
            $res['refresh_token'] = $this->options['access_token']['refresh_token'];
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
     *
     * @author Dmitry (dio) Levashov
     **/
    protected function _dirname($path)
    {
        list(, , $parent) = $this->_gd_splitPath($path);

        return $this->_normpath($parent);
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
        list(, $basename) = $this->_gd_splitPath($path);

        return $basename;
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
        list(, $itemId) = $this->_gd_splitPath($path);

        return isset($this->directories[$itemId]);
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
                $ret = array('dim' => $file['imageMediaMetadata']['width'].'x'.$file['imageMediaMetadata']['height']);
                if (func_num_args() > 2) {
                    $args = func_get_arg(2);
                } else {
                    $args = array();
                }
                if (!empty($args['substitute'])) {
                    $tmbSize = intval($args['substitute']);
                    $srcSize = explode('x', $ret['dim']);
                    if ($srcSize[0] && $srcSize[1]) {
                        if (min(($tmbSize / $srcSize[0]), ($tmbSize / $srcSize[1])) < 1) {
                            if ($this->_gd_isPublished($file)) {
                                $tmbSize = strval($tmbSize);
                                $ret['url'] = 'https://drive.google.com/thumbnail?authuser=0&sz=s'.$tmbSize.'&id='.$file['id'];
                            } elseif ($subImgLink = $this->getSubstituteImgLink(elFinder::$currentArgs['target'], $srcSize)) {
                                $ret['url'] = $subImgLink;
                            }
                        }
                    }
                }
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
        if ($mode === 'rb' || $mode === 'r') {
            if ($file = $this->_gd_getFile($path)) {
                if ($dlurl = $this->_gd_getDownloadUrl($file)) {
                    $token = $this->client->getAccessToken();
                    if (!$token && $this->client->isUsingApplicationDefaultCredentials()) {
                        $this->client->fetchAccessTokenWithAssertion();
                        $token = $this->client->getAccessToken();
                    }
                    $access_token = '';
                    if (is_array($token)) {
                        $access_token = $token['access_token'];
                    } else {
                        if ($token = json_decode($this->client->getAccessToken())) {
                            $access_token = $token->access_token;
                        }
                    }
                    if ($access_token) {
                        $data = array(
                                'target' => $dlurl,
                                'headers' => array('Authorization: Bearer '.$access_token),
                        );

                        return elFinder::getStreamByUrl($data);
                    }
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
        $path = $this->_joinPath($path, $name);
        list($parentId, , $parent) = $this->_gd_splitPath($path);

        try {
            $file = new \Google_Service_Drive_DriveFile();

            $file->setName($name);
            $file->setMimeType(self::DIRMIME);
            $file->setParents([$parentId]);

            //create the Folder in the Parent
            $obj = $this->service->files->create($file);

            if ($obj instanceof Google_Service_Drive_DriveFile) {
                $path = $this->_joinPath($parent, $obj['id']);
                $this->_gd_getDirectoryData(false);

                return $path;
            } else {
                return false;
            }
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
        return $this->_save($this->tmpfile(), $path, $name, []);
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
        $source = $this->_normpath($source);
        $targetDir = $this->_normpath($targetDir);

        try {
            $file = new \Google_Service_Drive_DriveFile();
            $file->setName($name);

            //Set the Parent id
            list(, $parentId) = $this->_gd_splitPath($targetDir);
            $file->setParents([$parentId]);

            list(, $srcId) = $this->_gd_splitPath($source);
            $file = $this->service->files->copy($srcId, $file, ['fields' => self::FETCHFIELDS_GET]);
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
        list($removeParents, $itemId) = $this->_gd_splitPath($source);
        $target = $this->_normpath($targetDir.'/'.$itemId);
        try {
            //moving and renaming a file or directory
            $files = new \Google_Service_Drive_DriveFile();
            $files->setName($name);

            //Set new Parent and remove old parent
            list(, $addParents) = $this->_gd_splitPath($targetDir);
            $opts = ['addParents' => $addParents, 'removeParents' => $removeParents];

            $file = $this->service->files->update($itemId, $files, $opts);

            if ($file->getMimeType() === self::DIRMIME) {
                $this->_gd_getDirectoryData(false);
            }
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

            list($pid, $itemId) = $this->_gd_splitPath($path);
            $opts = ['removeParents' => $pid];
            $this->service->files->update($itemId, $files, $opts);
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
        }
        list($parentId, $itemId, $parent) = $this->_gd_splitPath($path);
        if ($name === '') {
            $stat['iid'] = $itemId;
        }

        if (!$stat || empty($stat['iid'])) {
            $opts = [
                'q' => sprintf('trashed=false and "%s" in parents and name="%s"', $parentId, $name),
                'fields' => self::FETCHFIELDS_LIST,
            ];
            $srcFile = $this->_gd_query($opts);
            $srcFile = empty($srcFile) ? null : $srcFile[0];
        } else {
            $srcFile = $this->_gd_getFile($path);
        }

        try {
            $mode = 'update';
            $mime = isset($stat['mime']) ? $stat['mime'] : '';

            $file = new Google_Service_Drive_DriveFile();
            if ($srcFile) {
                $mime = $srcFile->getMimeType();
            } else {
                $mode = 'insert';
                $file->setName($name);
                $file->setParents([
                    $parentId,
                ]);
            }

            if (!$mime) {
                $mime = self::mimetypeInternalDetect($name);
            }
            if ($mime === 'unknown') {
                $mime = 'application/octet-stream';
            }
            $file->setMimeType($mime);

            $size = 0;
            if (isset($stat['size'])) {
                $size = $stat['size'];
            } else {
                $fstat = fstat($fp);
                if (!empty($fstat['size'])) {
                    $size = $fstat['size'];
                }
            }

            // set chunk size (max: 100MB)
            $chunkSizeBytes = 100 * 1024 * 1024;
            if ($size > 0) {
                $memory = elFinder::getIniBytes('memory_limit');
                if ($memory > 0) {
                    $chunkSizeBytes = max(262144, min([$chunkSizeBytes, (intval($memory / 4 / 256) * 256)]));
                }
            }

            if ($size > $chunkSizeBytes) {
                $client = $this->client;
                // Call the API with the media upload, defer so it doesn't immediately return.
                $client->setDefer(true);
                if ($mode === 'insert') {
                    $request = $this->service->files->create($file, [
                        'fields' => self::FETCHFIELDS_GET,
                    ]);
                } else {
                    $request = $this->service->files->update($srcFile->getId(), $file, [
                        'fields' => self::FETCHFIELDS_GET,
                    ]);
                }

                // Create a media file upload to represent our upload process.
                $media = new Google_Http_MediaFileUpload($client, $request, $mime, null, true, $chunkSizeBytes);
                $media->setFileSize($size);
                // Upload the various chunks. $status will be false until the process is
                // complete.
                $status = false;
                while (!$status && !feof($fp)) {
                    elFinder::checkAborted();
                    // read until you get $chunkSizeBytes from TESTFILE
                    // fread will never return more than 8192 bytes if the stream is read buffered and it does not represent a plain file
                    // An example of a read buffered file is when reading from a URL
                    $chunk = $this->_gd_readFileChunk($fp, $chunkSizeBytes);
                    $status = $media->nextChunk($chunk);
                }
                // The final value of $status will be the data from the API for the object
                // that has been uploaded.
                if ($status !== false) {
                    $obj = $status;
                }

                $client->setDefer(false);
            } else {
                $params = [
                    'data' => stream_get_contents($fp),
                    'uploadType' => 'media',
                    'fields' => self::FETCHFIELDS_GET,
                ];
                if ($mode === 'insert') {
                    $obj = $this->service->files->create($file, $params);
                } else {
                    $obj = $this->service->files->update($srcFile->getId(), $file, $params);
                }
            }
            if ($obj instanceof Google_Service_Drive_DriveFile) {
                return $this->_joinPath($parent, $obj->getId());
            } else {
                return false;
            }
        } catch (Exception $e) {
            return $this->setError('GoogleDrive error: '.$e->getMessage());
        }
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
            list(, $itemId) = $this->_gd_splitPath($path);

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
