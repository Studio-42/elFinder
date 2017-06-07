<?php

use \Kunnu\Dropbox\DropboxApp;
use \Kunnu\Dropbox\Dropbox;
use \Kunnu\Dropbox\DropboxFile;
use \Kunnu\Dropbox\Models\FolderMetadata;
use \Kunnu\Dropbox\Models\FileMetadata;
use \Kunnu\Dropbox\Exceptions\DropboxClientException;

elFinder::$netDrivers['dropbox2'] = 'Dropbox2';

/**
 * Simple elFinder driver for Dropbox
 * kunalvarma05/dropbox-php-sdk:0.1.5 or above.
 *
 * @author Naoki Sawada
 **/
class elFinderVolumeDropbox2 extends elFinderVolumeDriver
{
    /**
     * Driver id
     * Must be started from letter and contains [a-z0-9]
     * Used as part of volume id.
     *
     * @var string
     **/
    protected $driverId = 'db';

    /**
     * Dropbox service object.
     *
     * @var object
     **/
    protected $service = null;

    /**
     * Fetch options.
     *
     * @var string
     */
    private $FETCH_OPTIONS = [];

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
     * @author Naoki Sawada
     **/
    public function __construct()
    {
        $opts = [
            'app_key' => '',
            'app_secret' => '',
            'access_token' => '',
            'aliasFormat' => '%s@Dropbox',
            'path' => '/',
            'separator' => '/',
            'acceptedName' => '#^[^/\\?*:|"<>]*[^./\\?*:|"<>]$#',
            'rootCssClass' => 'elfinder-navbar-root-dropbox',
            'publishPermission' => [
                'requested_visibility' => 'public',
                //'link_password' => '',
                //'expires' => '',
            ],
            'getThumbSize' => 'medium', // Available sizes: 'thumb', 'small', 'medium', 'large', 'huge'
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
    protected function _db_splitPath($path)
    {
        $path = trim($path, '/');
        if ($path === '') {
            $dirname = '/';
            $basename = '';
        } else {
            $pos = strrpos($path, '/');
            if ($pos === false) {
                $dirname = '/';
                $basename = $path;
            } else {
                $dirname = '/'.substr($path, 0, $pos);
                $basename = substr($path, $pos + 1);
            }
        }

        return [$dirname, $basename];
    }

    /**
     * Get dat(Dropbox metadata) from Dropbox.
     *
     * @param string $path
     *
     * @return object Dropbox metadata
     */
    private function _db_getFile($path, $fields = '')
    {
        if ($path === '/') {
            return true;
        }

        $res = false;
        try {
            $file = $this->service->getMetadata($path, $this->FETCH_OPTIONS);
            if ($file instanceof FolderMetadata || $file instanceof FileMetadata) {
                $res = $file;
            }

            return $res;
        } catch (DropboxClientException $e) {
            return false;
        }
    }

    /**
     * Parse line from Dropbox metadata output and return file stat (array).
     *
     * @param string $raw line from ftp_rawlist() output
     *
     * @return array
     *
     * @author Naoki Sawada
     **/
    protected function _db_parseRaw($raw)
    {
        $stat = [];
        $isFolder = false;
        if ($raw === true) {
            // root folder
            $isFolder = true;
            $stat['name'] = '';
            $stat['iid'] = '0';
        }

        $data = [];
        if (is_object($raw)) {
            $isFolder = $raw instanceof FolderMetadata;
            $data = $raw->getData();
        } elseif (is_array($raw)) {
            $isFolder = $raw['.tag'] === 'folder';
            $data = $raw;
        }

        if (isset($data['path_lower'])) {
            $stat['path'] = $data['path_lower'];
        }

        if (isset($data['name'])) {
            $stat['name'] = $data['name'];
        }

        if (isset($data['id'])) {
            $stat['iid'] = substr($data['id'], 3);
        }

        if ($isFolder) {
            $stat['mime'] = 'directory';
            $stat['size'] = 0;
            $stat['ts'] = 0;
            $stat['dirs'] = -1;
        } else {
            $stat['size'] = isset($data['size']) ? (int) $data['size'] : 0;
            if (isset($data['server_modified'])) {
                $stat['ts'] = strtotime($data['server_modified']);
            } elseif (isset($data['client_modified'])) {
                $stat['ts'] = strtotime($data['client_modified']);
            } else {
                $stat['ts'] = 0;
            }
            $stat['url'] = '1';
        }

        return $stat;
    }

    /**
     * Get thumbnail from Dropbox.
     *
     * @param string $path
     * @param string $size
     *
     * @return string | boolean
     */
    protected function _db_getThumbnail($path)
    {
        try {
            return $this->service->getThumbnail($path, $this->options['getThumbSize'])->getContents();
        } catch (DropboxClientException $e) {
            return false;
        }
    }

    /**
     * Join dir name and file name(display name) and retur full path.
     *
     * @param unknown $dir
     * @param unknown $displayName
     *
     * @return string
     */
    protected function _db_joinName($dir, $displayName)
    {
        return rtrim($dir, '/').'/'.$displayName;
    }

    /**
     * Get OAuth2 access token form OAuth1 tokens.
     *
     * @param string $app_key
     * @param string $app_secret
     * @param string $oauth1_token
     * @param string $oauth1_secret
     *
     * @return string|false
     */
    public static function getTokenFromOauth1($app_key, $app_secret, $oauth1_token, $oauth1_secret)
    {
        $data = [
                'oauth1_token' => $oauth1_token,
                'oauth1_token_secret' => $oauth1_secret,
        ];
        $auth = base64_encode($app_key.':'.$app_secret);

        $ch = curl_init('https://api.dropboxapi.com/2/auth/token/from_oauth1');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Basic '.$auth,
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        $result = curl_exec($ch);
        curl_close($ch);

        $res = $result ? json_decode($result, true) : [];

        return isset($res['oauth2_token']) ? $res['oauth2_token'] : false;
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
     **/
    public function netmountPrepare($options)
    {
        if (empty($options['app_key']) && defined('ELFINDER_DROPBOX_APPKEY')) {
            $options['app_key'] = ELFINDER_DROPBOX_APPKEY;
        }
        if (empty($options['app_secret']) && defined('ELFINDER_DROPBOX_APPSECRET')) {
            $options['app_secret'] = ELFINDER_DROPBOX_APPSECRET;
        }

        if (!isset($options['pass'])) {
            $options['pass'] = '';
        }

        try {
            $this->session->start();
            $app = new DropboxApp($options['app_key'], $options['app_secret']);
            $dropbox = new Dropbox($app);
            $authHelper = $dropbox->getAuthHelper();

            if ($options['pass'] === 'reauth') {
                $options['pass'] = '';
                $this->session->set('Dropbox2AuthParams', [])->set('Dropbox2Tokens', []);
            } elseif ($options['pass'] === 'dropbox2') {
                $options['pass'] = '';
            }

            $options = array_merge($this->session->get('Dropbox2AuthParams', []), $options);

            if (!isset($options['tokens'])) {
                $options['tokens'] = $this->session->get('Dropbox2Tokens', []);
                $this->session->remove('Dropbox2Tokens');
            }
            $aToken = $options['tokens'];
            if (!is_array($aToken) || !isset($aToken['access_token'])) {
                $aToken = [];
            }

            $rootObj = $service = null;
            if ($aToken) {
                try {
                    $dropbox->setAccessToken($aToken['access_token']);
                    $this->session->set('Dropbox2AuthParams', $options);
                } catch (DropboxClientException $e) {
                    $aToken = [];
                    $options['tokens'] = [];
                    if ($options['user'] !== 'init') {
                        $this->session->set('Dropbox2AuthParams', $options);

                        return ['exit' => true, 'error' => elFinder::ERROR_REAUTH_REQUIRE];
                    }
                }
            }

            if ($options['user'] === 'init') {
                if (empty($options['url'])) {
                    $options['url'] = elFinder::getConnectorUrl();
                }

                $callback = $options['url']
                           .'?cmd=netmount&protocol=dropbox2&host=1';

                if (!$aToken && empty($_GET['code'])) {
                    $url = $authHelper->getAuthUrl($callback);

                    $html = '<input id="elf-volumedriver-dropbox2-host-btn" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" value="{msg:btnApprove}" type="button" onclick="window.open(\''.$url.'\')">';
                    $html .= '<script>
                        $("#'.$options['id'].'").elfinder("instance").trigger("netmount", {protocol: "dropbox2", mode: "makebtn"});
                    </script>';
                    if (empty($options['pass']) && $options['host'] !== '1') {
                        $options['pass'] = 'return';
                        $this->session->set('Dropbox2AuthParams', $options);

                        return ['exit' => true, 'body' => $html];
                    } else {
                        $out = [
                            'node' => $options['id'],
                            'json' => '{"protocol": "dropbox2", "mode": "makebtn", "body" : "'.str_replace($html, '"', '\\"').'", "error" : "'.elFinder::ERROR_ACCESS_DENIED.'"}',
                            'bind' => 'netmount',
                        ];

                        return ['exit' => 'callback', 'out' => $out];
                    }
                } else {
                    if (!empty($_GET['code']) && isset($_GET['state'])) {
                        $tokenObj = $authHelper->getAccessToken($_GET['code'], $_GET['state'], $callback);
                        $options['tokens'] = [
                            'access_token' => $tokenObj->getToken(),
                            'uid' => $tokenObj->getUid(),
                        ];
                        $this->session->set('Dropbox2Tokens', $options['tokens'])->set('Dropbox2AuthParams', $options);
                        $out = [
                            'node' => $options['id'],
                            'json' => '{"protocol": "dropbox2", "mode": "done", "reset": 1}',
                            'bind' => 'netmount',
                        ];

                        return ['exit' => 'callback', 'out' => $out];
                    }
                    $path = $options['path'];
                    $folders = [];
                    $listFolderContents = $dropbox->listFolder($path);
                    $items = $listFolderContents->getItems();
                    foreach ($items as $item) {
                        $data = $item->getData();
                        if ($data['.tag'] === 'folder') {
                            $folders[$data['path_lower']] = $data['name'];
                        }
                    }
                    natcasesort($folders);

                    if ($options['pass'] === 'folders') {
                        return ['exit' => true, 'folders' => $folders];
                    }

                    $folders = ['/' => '/'] + $folders;
                    $folders = json_encode($folders);
                    $json = '{"protocol": "dropbox2", "mode": "done", "folders": '.$folders.'}';
                    $options['pass'] = 'return';
                    $html = 'Dropbox.com';
                    $html .= '<script>
                        $("#'.$options['id'].'").elfinder("instance").trigger("netmount", '.$json.');
                    </script>';
                    $this->session->set('Dropbox2AuthParams', $options);

                    return ['exit' => true, 'body' => $html];
                }
            }
        } catch (DropboxClientException $e) {
            $this->session->remove('Dropbox2AuthParams')->remove('Dropbox2Tokens');
            if (empty($options['pass'])) {
                return ['exit' => true, 'body' => '{msg:'.elFinder::ERROR_ACCESS_DENIED.'}'.' '.$e->getMessage()];
            } else {
                return ['exit' => true, 'error' => [elFinder::ERROR_ACCESS_DENIED, $e->getMessage()]];
            }
        }

        if (!$aToken) {
            return ['exit' => true, 'error' => elFinder::ERROR_REAUTH_REQUIRE];
        }

        if ($options['path'] === 'root') {
            $options['path'] = '/';
        }

        try {
            if ($options['path'] !== '/') {
                $file = $dropbox->getMetadata($options['path']);
                $name = $file->getName();
            } else {
                $name = 'root';
            }
            $options['alias'] = sprintf($this->options['aliasFormat'], $name);
        } catch (DropboxClientException $e) {
            return ['exit' => true, 'error' => $e->getMessage()];
        }

        foreach (['host', 'user', 'pass', 'id', 'offline'] as $key) {
            unset($options[$key]);
        }

        return $options;
    }

    /**
     * process of on netunmount
     * Drop `Dropbox` & rm thumbs.
     *
     * @param array $options
     *
     * @return bool
     */
    public function netunmount($netVolumes, $key)
    {
        if ($tmbs = glob(rtrim($this->options['tmbPath'], '\\/').DIRECTORY_SEPARATOR.$this->driverId.'_'.$this->options['tokens']['uid'].'*.png')) {
            foreach ($tmbs as $file) {
                unlink($file);
            }
        }

        return true;
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
     * @author Naoki Sawada
     **/
    protected function init()
    {
        if (empty($options['app_key'])) {
            if (defined('ELFINDER_DROPBOX_APPKEY') && ELFINDER_DROPBOX_APPKEY) {
                $this->options['app_key'] = ELFINDER_DROPBOX_APPKEY;
            } else {
                return $this->setError('Required option "app_key" is undefined.');
            }
        }
        if (empty($options['app_secret'])) {
            if (defined('ELFINDER_DROPBOX_APPSECRET') && ELFINDER_DROPBOX_APPSECRET) {
                $this->options['app_secret'] = ELFINDER_DROPBOX_APPSECRET;
            } else {
                return $this->setError('Required option "app_secret" is undefined.');
            }
        }
        if (isset($this->options['tokens']) && is_array($this->options['tokens']) && !empty($this->options['tokens']['access_token'])) {
            $this->options['access_token'] = $this->options['tokens']['access_token'];
        }
        if (!$this->options['access_token']) {
            return $this->setError('Required option "access_token" or "refresh_token" is undefined.');
        }

        try {
            // make net mount key for network mount
            $aToken = $this->options['access_token'];
            $this->netMountKey = md5($aToken.'-'.$this->options['path']);

            $errors = [];
            if (!$this->service) {
                $app = new DropboxApp($this->options['app_key'], $this->options['app_secret'], $aToken);
                $this->service = new Dropbox($app);
            }
        } catch (DropboxClientException $e) {
            $errors[] = 'Dropbox error: '.$e->getMessage();
        } catch (Exception $e) {
            $errors[] = $e->getMessage();
        }

        if (!$this->service) {
            $errors[] = 'Dropbox Service could not be loaded.';

            return $this->setError($errors);
        }

        // normalize root path
        $this->options['path'] = strtolower($this->options['path']);
        if ($this->options['path'] == 'root') {
            $this->options['path'] = '/';
        }
        $this->root = $this->options['path'] = $this->_normpath($this->options['path']);

        if (empty($this->options['alias'])) {
            $this->options['alias'] = sprintf($this->options['aliasFormat'], ($this->options['path'] === '/') ? 'root' : $this->_basename($this->options['path']));
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

        return true;
    }

    /**
     * Configure after successfull mount.
     *
     * @author Naoki Sawada
     **/
    protected function configure()
    {
        parent::configure();

        // fallback of $this->tmp
        if (!$this->tmp && $this->tmbPathWritable) {
            $this->tmp = $this->tmbPath;
        }

        $this->disabled[] = 'archive';
        $this->disabled[] = 'extract';

        if ($this->isMyReload()) {
            //$this->_db_getDirectoryData(false);
        }
    }

    /*********************************************************************/
    /*                               FS API                              */
    /*********************************************************************/

    /**
     * Close opened connection.
     **/
    public function umount()
    {
    }

    /**
     * Cache dir contents.
     *
     * @param string $path dir path
     *
     * @author Naoki Sawada
     **/
    protected function cacheDir($path)
    {
        $this->dirsCache[$path] = [];
        $hasDir = false;

        $res = $this->service->listFolder($path, $this->FETCH_OPTIONS);

        if ($res) {
            $items = $res->getItems()->all();
            foreach ($items as $raw) {
                if ($stat = $this->_db_parseRaw($raw)) {
                    $mountPath = $this->_joinPath($path, $stat['name']);
                    $stat = $this->updateCache($mountPath, $stat);
                    if (empty($stat['hidden']) && $path !== $mountPath) {
                        if (!$hasDir && $stat['mime'] === 'directory') {
                            $hasDir = true;
                        }
                        $this->dirsCache[$path][] = $mountPath;
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
        if ($mimes) {
            return parent::doSearch($path, $q, $mimes);
        }

        $timeout = $this->options['searchTimeout'] ? $this->searchStart + $this->options['searchTimeout'] : 0;

        $searchRes = $this->service->search($path, $q, ['start' => 0, 'max_results' => 1000]);
        $items = $searchRes->getItems();
        $more = $searchRes->hasMoreItems();
        while ($more) {
            if ($timeout && $timeout < time()) {
                $this->setError(elFinder::ERROR_SEARCH_TIMEOUT, $this->_path($path));
                break;
            }
            $searchRes = $this->service->search($path, $q, ['start' => $searchRes->getCursor(), 'max_results' => 1000]);
            $more = $searchRes->hasMoreItems();
            $items = $items->merge($searchRes->getItems());
        }

        $result = [];
        foreach ($items as $raw) {
            if ($stat = $this->_db_parseRaw($raw->getMetadata())) {
                $stat = $this->updateCache($stat['path'], $stat);
                if (empty($stat['hidden'])) {
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
     * @author Naoki Sawada
     **/
    protected function copy($src, $dst, $name)
    {
        $srcStat = $this->stat($src);
        $target = $this->_joinPath($dst, $name);
        $tgtStat = $this->stat($target);
        if ($tgtStat) {
            if ($srcStat['mime'] === 'directory') {
                return parent::copy($src, $dst, $name);
            } else {
                $this->_unlink($target);
            }
        }
        $this->clearcache();
        if ($res = $this->_copy($src, $dst, $name)) {
            $this->added[] = $this->stat($target);
            $res = $target;
        }

        return $res;
    }

    /**
     * Remove file/ recursive remove dir.
     *
     * @param string $path  file path
     * @param bool   $force try to remove even if file locked
     *
     * @return bool
     *
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
        if (!$data = $this->_db_getThumbnail($path)) {
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
     * @author Naoki Sawada
     **/
    protected function tmbname($stat)
    {
        $name = $this->driverId.'_';
        if (isset($this->options['tokens']) && is_array($this->options['tokens'])) {
            $name .= $this->options['tokens']['uid'];
        }

        return $name.md5($stat['iid']).$stat['ts'].'.png';
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
        $file = $this->file($hash);
        if (($file = $this->file($hash)) !== false && (!$file['url'] || $file['url'] == 1)) {
            $path = $this->decode($hash);
            $url = '';
            try {
                $res = $this->service->postToAPI('/sharing/list_shared_links', ['path' => $path, 'direct_only' => true])->getDecodedBody();
                if ($res && !empty($res['links'])) {
                    foreach ($res['links'] as $link) {
                        if (isset($link['link_permissions'])
                                && isset($link['link_permissions']['requested_visibility'])
                                && $link['link_permissions']['requested_visibility']['.tag'] === $this->options['publishPermission']['requested_visibility']) {
                            $url = $link['url'];
                            break;
                        }
                    }
                }
                if (!$url) {
                    $res = $this->service->postToAPI('/sharing/create_shared_link_with_settings', ['path' => $path, 'settings' => $this->options['publishPermission']])->getDecodedBody();
                    if (isset($res['url'])) {
                        $url = $res['url'];
                    }
                }
                if ($url) {
                    $url = str_replace('www.dropbox.com', 'dl.dropboxusercontent.com', $url);
                    $url = str_replace('?dl=0', '', $url);

                    return $url;
                }
            } catch (DropboxClientException $e) {
                return $this->$this->setError('Dropbox error: '.$e->getMessage());
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
        if (isset($this->options['tokens']) && !empty($this->options['tokens']['uid'])) {
            $res['Dropbox uid'] = $this->options['tokens']['uid'];
            $res['access_token'] = $this->options['tokens']['access_token'];
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
     * @author Naoki Sawada
     **/
    protected function _dirname($path)
    {
        list($dirname) = $this->_db_splitPath($path);

        return $dirname;
    }

    /**
     * Return file name.
     *
     * @param string $path file path
     *
     * @return string
     *
     * @author Naoki Sawada
     **/
    protected function _basename($path)
    {
        list(, $basename) = $this->_db_splitPath($path);

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
        return rtrim($dir, '/').'/'.strtolower($name);
    }

    /**
     * Return normalized path, this works the same as os.path.normpath() in Python.
     *
     * @param string $path path
     *
     * @return string
     *
     * @author Naoki Sawada
     **/
    protected function _normpath($path)
    {
        return '/'.ltrim($path, '/');
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
        if ($path === $this->root) {
            return '';
        } else {
            return ltrim(substr($path, strlen($this->root)), '/');
        }
    }

    /**
     * Convert path related to root dir into real path.
     *
     * @param string $path file path
     *
     * @return string
     *
     * @author Naoki Sawada
     **/
    protected function _abspath($path)
    {
        if ($path === '/') {
            return $this->root;
        } else {
            return $this->_joinPath($this->root, $path);
        }
    }

    /**
     * Return fake path started from root dir.
     *
     * @param string $path file path
     *
     * @return string
     *
     * @author Naoki Sawada
     **/
    protected function _path($path)
    {
        $path = $this->_normpath(substr($path, strlen($this->root)));

        return $path;
    }

    /**
     * Return true if $path is children of $parent.
     *
     * @param string $path   path to check
     * @param string $parent parent path
     *
     * @return bool
     *
     * @author Naoki Sawada
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
        if ($raw = $this->_db_getFile($path)) {
            return $this->_db_parseRaw($raw);
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
     * @author Naoki Sawada
     **/
    protected function _subdirs($path)
    {
        $hasdir = false;

        try {
            $res = $this->service->listFolder($path);
            if ($res) {
                $items = $res->getItems();
                foreach ($items as $raw) {
                    if ($raw instanceof FolderMetadata) {
                        $hasdir = true;
                        break;
                    }
                }
            }
        } catch (DropboxClientException $e) {
            $this->setError('Dropbox error: '.$e->getMessage());
        }

        return $hasdir;
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
     * @author Naoki Sawada
     **/
    protected function _dimensions($path, $mime)
    {
        if (strpos($mime, 'image') !== 0) {
            return '';
        }
        $ret = '';

        if ($data = $this->_getContents($path)) {
            $tmp = $this->getTempFile();
            file_put_contents($tmp, $data);
            $size = getimagesize($tmp);
            if ($size) {
                return $size[0].'x'.$size[1];
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
     * @author Naoki Sawada
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
     * @author Naoki Sawada
     **/
    protected function _fopen($path, $mode = 'rb')
    {
        if ($mode === 'rb' || $mode === 'r') {
            if ($link = $this->service->getTemporaryLink($path)) {
                $access_token = $this->service->getAccessToken();
                if ($access_token) {
                    $data = array(
                                'target' => $link->getLink(),
                                'headers' => array('Authorization: Bearer '.$access_token),
                        );

                    return elFinder::getStreamByUrl($data);
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
     * @author Naoki Sawada
     **/
    protected function _fclose($fp, $path = '')
    {
        fclose($fp);
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
     * @author Naoki Sawada
     **/
    protected function _mkdir($path, $name)
    {
        try {
            return $this->service->createFolder($this->_db_joinName($path, $name))->getPathLower();
        } catch (DropboxClientException $e) {
            return $this->setError('Dropbox error: '.$e->getMessage());
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
     * @author Naoki Sawada
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
     * @author Naoki Sawada
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
     * @author Naoki Sawada
     **/
    protected function _copy($source, $targetDir, $name)
    {
        try {
            $this->service->copy($source, $this->_db_joinName($targetDir, $name))->getPathLower();
        } catch (DropboxClientException $e) {
            return $this->setError('Dropbox error: '.$e->getMessage());
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
     * @author Naoki Sawada
     **/
    protected function _move($source, $targetDir, $name)
    {
        try {
            return $this->service->move($source, $this->_db_joinName($targetDir, $name))->getPathLower();
        } catch (DropboxClientException $e) {
            return $this->setError('Dropbox error: '.$e->getMessage());
        }
    }

    /**
     * Remove file.
     *
     * @param string $path file path
     *
     * @return bool
     *
     * @author Naoki Sawada
     **/
    protected function _unlink($path)
    {
        try {
            $this->service->delete($path);

            return true;
        } catch (DropboxClientException $e) {
            return $this->setError('Dropbox error: '.$e->getMessage());
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
     * @author Naoki Sawada
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
     * @param string   $dir  target dir path
     * @param string   $name file name
     * @param array    $stat file stat (required by some virtual fs)
     *
     * @return bool|string
     *
     * @author Naoki Sawada
     **/
    protected function _save($fp, $path, $name, $stat)
    {
        try {
            $info = stream_get_meta_data($fp);
            if (empty($info['uri']) || preg_match('#^[a-z0-9.-]+://#', $info['uri'])) {
                if ($filepath = $this->getTempFile()) {
                    $_fp = fopen($filepath, 'wb');
                    stream_copy_to_stream($fp, $_fp);
                    fclose($_fp);
                }
            } else {
                $filepath = $info['uri'];
            }
            $dropboxFile = new DropboxFile($filepath);
            if ($name === '') {
                $dir = $this->_dirname($path);
                $name = $this->_basename($path);
                $fullpath = $path;
            } else {
                $dir = $path;
                $fullpath = $this->_db_joinName($path, $name);
            }

            return $this->service->upload($dropboxFile, $fullpath, ['mode' => 'overwrite'])->getPathLower();
        } catch (DropboxClientException $e) {
            return $this->setError('Dropbox error: '.$e->getMessage());
        }
    }

    /**
     * Get file contents.
     *
     * @param string $path file path
     *
     * @return string|false
     *
     * @author Naoki Sawada
     **/
    protected function _getContents($path)
    {
        $contents = '';

        try {
            $file = $this->service->download($path);
            $contents = $file->getContents();
        } catch (Exception $e) {
            return $this->setError('Dropbox error: '.$e->getMessage());
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
     * @author Naoki Sawada
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
