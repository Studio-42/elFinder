<?php
elFinder::$netDrivers['googledrive'] = 'GoogleDrive';

/**
 * Simple elFinder driver for GoogleDrive
 * google-api-php-client-2.x or above
 *
 * @author Dmitry (dio) Levashov
 * @author Cem (discofever)
 **/
class elFinderVolumeGoogleDrive extends elFinderVolumeDriver {

    /**
     * Driver id
     * Must be started from letter and contains [a-z0-9]
     * Used as part of volume id
     *
     * @var string
     **/
    protected $driverId = 'gd';

    /**
     * GoogleDrive service object
     *
     * @var object
     **/
    protected $service = null;
    
    /**
     * MIME tyoe of directory
     *
     * @var string
     */
    const DIRMIME = 'application/vnd.google-apps.folder';
    
     /**
     * Fetch fields for list
     *
     * @var string
     */
    const FETCHFIELDS_LIST = 'files(id,name,mimeType,modifiedTime,parents,permissions,size,imageMediaMetadata(height,width),webContentLink),nextPageToken';
    
    /**
     * Fetch fields for get
     *
     * @var string
     */
    const FETCHFIELDS_GET = 'id,name,mimeType,modifiedTime,parents,permissions,size,imageMediaMetadata(height,width),webContentLink,webViewLink';
    
    /**
	 * hasCache by folders
	 *
	 * @var array
	 **/
	protected $HasdirsCache = array();
	
    /**
     * Directory for tmp files
     * If not set driver will try to use tmbDir as tmpDir
     *
     * @var string
     **/
    protected $tmp = '';
    
    /**
     * Net mount key
     *
     * @var string
     **/
    public $netMountKey = '';
    
    /**
     * Thumbnail prefix
     *
     * @var string
     **/
    private $tmbPrefix = '';
    
    
    /**
     * Constructor
     * Extend options with required fields
     *
     * @return void
     * @author Dmitry (dio) Levashov
     * @author Cem (DiscoFever)
     **/
    public function __construct()
    {		
        $opts = array(
            'client_id'         => '',
            'client_secret'     => '',
            'accessToken'       => '',            
            'root'              => 'GoogleDrive.com',
            'googleApiClient'   => '',
            'path'              => '/',
            'separator'         => '/',
            'tmbPath'           => '',
			'tmbURL'            => '',
			'tmpPath'           => '',	
            'acceptedName'      => '#^[^/\\?*:|"<>]*[^./\\?*:|"<>]$#',
            'rootCssClass'      => 'elfinder-navbar-root-googledrive'
        );
        $this->options = array_merge($this->options, $opts);
        $this->options['mimeDetect'] = 'internal';				
    }


    /**
     * Prepare
     * Call from elFinder::netmout() before volume->mount()
     *
     * @return Array
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
			include_once($options['googleApiClient']);				
        }
		
		if ($options['pass'] === 'reauth') {
			$options['user'] = 'init';
			$options['pass'] = '';
			$this->session->remove('elFinderGoogledriveTokens');
			$this->session->remove('elFinderGoogleDriveAuthTokens');       
        }
		try {
			if (empty($options['client_id']) || empty($options['client_secret'])) {
				return array('exit' => true, 'body' => '{msg:errNetMountNoDriver}');
			}
			
			$client = new Google_Client();
			$client->setClientId($options['client_id']);
			$client->setClientSecret($options['client_secret']);
			
			if (isset($_GET['code'])) {
				try {
					$client->setRedirectUri($this->getConnectorUrl().'?cmd=netmount&protocol=googledrive&host=1');
					$oauth_token = $client->fetchAccessTokenWithAuthCode($_GET['code']);
					if (!empty($oauth_token)) {
						$this->session->set('elFinderGoogleDriveAuthTokens', $oauth_token);								
						$out = array(
								'node' => 'elfinder',
								'json' => '{"protocol": "googledrive", "mode": "done", "reset": 1}',
								'bind' => 'netmount'
						);						
						return array('exit' => 'callback', 'out' => $out);					
					}
				} catch (Exception $e) {
					return $e->getMessage();
				}
			}
		
			if ($options['user'] === 'init') {		
				if (empty($_GET['code']) && empty($this->session->get('elFinderGoogleDriveAuthTokens'))) {		   
					$cdata = '';
					$innerKeys = array('cmd', 'host', 'options', 'pass', 'protocol', 'user');
					$this->ARGS = $_SERVER['REQUEST_METHOD'] === 'POST'? $_POST : $_GET;
					foreach ($this->ARGS as $k => $v) {
						if (! in_array($k, $innerKeys)) {
							$cdata .= '&' . $k . '=' . rawurlencode($v);
						}
					}
					if (!empty($options['url']) && strpos($options['url'], 'http') !== 0) {
						$options['url'] = $this->getConnectorUrl();
					}
					$callback  = $options['url']
						.'?cmd=netmount&protocol=googledrive&host=googledrive.com&user=init&pass=return&node='.$options['id'].$cdata;
				  
				  try {
						// Get your credentials from the console											
						$client->setRedirectUri($this->getConnectorUrl().'?cmd=netmount&protocol=googledrive&host=1');						
						$client->setScopes([Google_Service_Drive::DRIVE]);
						if (! empty($options['offline'])) {
							$client->setApprovalPrompt('force');
							$client->setAccessType('offline');
						}
						
						$service = new Google_Service_Drive($client);
						$url = $client->createAuthUrl();
						$url .= '&oauth_callback='.rawurlencode($callback);
					} catch (Exception $e) {
						return array('exit' => true, 'body' => '{msg:errAccess}');
					}
						
					$html = '<input id="elf-volumedriver-googledrive-host-btn" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" value="{msg:btnApprove}" type="button" onclick="window.open(\''.$url.'\')">';
					$html .= '<script>
							$("#'.$options['id'].'").elfinder("instance").trigger("netmount", {protocol: "googledrive", mode: "makebtn"});
						</script>';				
						
					return array('exit' => true, 'body' => $html); 
									
				}
				else{							
					// Get google drive object for mount				
					$client->setAccessToken($this->session->get('elFinderGoogleDriveAuthTokens'));
					$oauth_token = $this->session->get('elFinderGoogleDriveAuthTokens');
					$this->session->set('elFinderGoogledriveTokens', array($oauth_token));
					
					$service = new Google_Service_Drive($client);
					$rootObj = $service->files->get('root');
					$folders = [];
					foreach ($service->files->listFiles([
							'pageSize' => 1000,
							'q' => 'trashed = false and mimeType = "application/vnd.google-apps.folder"'
							]) as $f) {
							$folders[$f->getId()] = $f->getName();
					}
					natcasesort($folders);
					$folders = ['root' => $rootObj->getName()] + $folders;
					$folders = json_encode($folders);
					$json = '{"protocol": "googledrive", "mode": "done", "folders": '.$folders.'}';
					$html = 'Google.com';
					$html .= '<script>
							$("#'.$options['id'].'").elfinder("instance").trigger("netmount", '.$json.');
							</script>'; 
					return array('exit' => true, 'body' => $html);
				}			
			}
		} catch (Exception $e) {
			return array('exit' => true, 'body' => '{msg:errNetMountNoDriver}');
		}
	
        if ($this->session->get('elFinderGoogledriveTokens')) {
            list($options['accessToken']) = $this->session->get('elFinderGoogledriveTokens');			
        }
        unset($options['user'], $options['pass']);        
		 
        return $options;
    }
    
    /**
     * process of on netunmount
     * Drop `googledrive` & rm thumbs
     * 
     * @param array $options
     * @return boolean
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
     * Get script url
     * 
     * @return string full URL
     * @author Naoki Sawada
     */
    private function getConnectorUrl()
    {
        $url  = ((isset($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off')? 'https://' : 'http://')
               . $_SERVER['SERVER_NAME']                                              // host
              . ($_SERVER['SERVER_PORT'] == 80 ? '' : ':' . $_SERVER['SERVER_PORT'])  // port
               . $_SERVER['REQUEST_URI'];                                             // path & query
        list($url) = explode('?', $url);
        
        return $url;
    }
    
    /*********************************************************************/
    /*                        INIT AND CONFIGURE                         */
    /*********************************************************************/

    /**
     * Prepare FTP connection
     * Connect to remote server and check if credentials are correct, if so, store the connection id in $ftp_conn
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     * @author Cem (DiscoFever)
     **/
    protected function init()
    {
        if (!$this->options['accessToken']) {
            return $this->setError('Required options undefined.');
        }
        
        // make net mount key
        $this->netMountKey = md5(join('-', array('googledrive', $this->options['path'])));
        
        if (! $this->service) {
            if ($this->options['googleApiClient'] && ! class_exists('Google_Client')) {
                include_once($this->options['googleApiClient']);
            }
            if (!class_exists('Google_Client')) {
                return $this->setError('Class Google_Client not found.');
            }
            
            $client = new Google_Client();

            try {
                $client->setAccessToken($this->options['accessToken']);
                if (true !== ($res = $this->refreshGoogleDriveToken($client))) {
                    return $this->setError($res);
                }
            } catch (InvalidArgumentException $e) {
                return $this->setError($e->getMessage());
            }
            try {
                $this->service = new Google_Service_Drive($client);
            } catch (Google_Service_Exception $e) {
                return $this->setError($e->getMessage());
            }
        }
        
        if (! $this->service) {
            return $this->setError('OAuth extension not loaded.');
        }
                
        // normalize root path
        if ($this->options['path'] == 'root') {
            $this->options['path'] = '/';
        }
        $this->root = $this->options['path'] = $this->_normpath($this->options['path']);
        
        $this->options['root'] == '' ?  $this->options['root']= 'GoogleDrive.com' : $this->options['root'];
        
        if (empty($this->options['alias'])) {
            $this->options['alias'] = ($this->options['path'] === '/') || ($this->options['path'] === 'root')? $this->options['root'] : $this->getPathtoName($this->options['path']).'@GDrive';
        }

        $this->rootName = $this->options['alias'];
               
        $this->tmbPrefix = 'googledrive'.base_convert($this->root, 10, 32);
        
        if (!empty($this->options['tmpPath'])) {
            if ((is_dir($this->options['tmpPath']) || mkdir($this->options['tmpPath'])) && is_writable($this->options['tmpPath']))
			{
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
     * @return void
     * @author Dmitry (dio) Levashov
     **/
    protected function configure()
    {
        parent::configure();
                
        $this->disabled[] = 'archive';
        $this->disabled[] = 'extract';
    }
    
    
    /**
     * Drive query and fetchAll
     * 
     * @param string $sql
     * @return boolean|array
     */
    private function query($sql)
    {
        $result = array();
        $pageToken = null;
        $parameters = array();
        
        if (!empty($sql)) {
            $parameters = $sql;
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
     * Get token and auto refresh
     * 
     * @param object $client Google API client
     * @return true|string error message
     */
    private function refreshGoogleDriveToken($client)
    {
        try { 
            $client->setAccessToken($this->options['accessToken']);                       
            if ($client->isAccessTokenExpired()) {
            	$client->setClientId($this->options['client_id']);
            	$client->setClientSecret($this->options['client_secret']);																
            	$refresh_token = $client->fetchAccessTokenWithRefreshToken();
            	$client->setAccessToken($refresh_token);
           	$this->options['accessToken'] = $refresh_token;
            	$this->service = new Google_Service_Drive($client);
            }
        } catch (Exception $e) {
            return $e->getMessage();
        }
        return true;
    }
    
    /**
     * Get dat(googledrive metadata) from GoogleDrive
     * 
     * @param string $path
     * @return array googledrive metadata
     */
    private function getPathtoName($path)
    {
        $itemId = basename($path);
        $opts = [
                'fields' => self::FETCHFIELDS_GET
            ];
            
        $res = $this->service->files->get($itemId, $opts);
        return $res['name'];
    }
    
    /**
     * Get dat(googledrive metadata) from GoogleDrive
     * 
     * @param string $path
     * @return array googledrive metadata
     */
    private function getDBdat($path)
    {
        if ($path == $this->root) {
            $this->root == '/' ? $itemId = 'root' : $itemId = basename($this->root);
			$opts = [
				'fields' => self::FETCHFIELDS_GET
			];            
			return $this->service->files->get($itemId, $opts);
        }
        
        empty($this->HasdirsCache[$path]) ? $HasPath = $path : $HasPath = $this->HasdirsCache[$path][0];
        $itemId = basename($HasPath);

		try{
			$opts = [
				'fields' => self::FETCHFIELDS_GET
				];
			return $this->service->files->get($itemId, $opts);
		} catch (Exception $e) {
			return array();
		}
    }
    

    /*********************************************************************/
    /*                               FS API                              */
    /*********************************************************************/

    /**
     * Close opened connection
     *
     * @return void
     * @author Dmitry (dio) Levashov
     **/
    public function umount()
    {
    }
        
    /**
     * Parse line from googledrive metadata output and return file stat (array)
     *
     * @param  string  $raw  line from ftp_rawlist() output
     * @return array
     * @author Dmitry Levashov
     **/
    protected function parseRaw($raw)
    {
        $stat = array();

        $stat['rev']        = isset($raw['id']) ? $raw['id'] : 'root';
        $stat['name']        = isset($raw['name']) ? $raw['name'] : '';
        $stat['mime']        = $raw['mimeType'] == self::DIRMIME ? 'directory' :
                              ($raw['mimeType'] == 'image/bmp' ? 'image/x-ms-bmp' :  $raw['mimeType']);
        $stat['size']        = $raw['mimeType'] == self::DIRMIME ? 0 : (int)$raw['size'];
        $stat['ts']            = isset($raw['modifiedTime']) ? strtotime($raw['modifiedTime']) : $_SERVER['REQUEST_TIME'];
        $stat['dirs']        = $raw['mimeType'] == self::DIRMIME ? 1 : 0;
        
        if($permissions = $raw->getPermissions()){		
			foreach ($permissions as $permission) {
				if ($permission->type === 'anyone' && $permission->role === 'reader') {					
					$stat['url'] = str_replace('export=download', 'export=media', $raw->getWebContentLink());				
					break;
				}else{
					$stat['url'] = '1';
				}
			}
		}
	
        if ($raw['mimeType'] !== self::DIRMIME) {
            isset($raw->getImageMediaMetadata()['width']) ? $stat['width'] = $raw->getImageMediaMetadata()['width'] : $stat['width'] = 0;
            isset($raw->getImageMediaMetadata()['height'])? $stat['height']= $raw->getImageMediaMetadata()['height']: $stat['height']= 0;
        }

        
        return $stat;
    }

    /**
     * Cache dir contents
     *
     * @param  string  $path  dir path
     * @return void
     * @author Dmitry Levashov
     **/
    protected function cacheDir($path)
    {
        $path == '/' ? $HasPath= 'root' : (empty($this->HasdirsCache[$path]) ? $HasPath = $path : $HasPath = $this->HasdirsCache[$path][0]);
        
        $opts = [
            'fields' => self::FETCHFIELDS_LIST,
            'pageSize' => 1000,
            'spaces' => 'drive',
            'q' => sprintf('trashed=false and "%s" in parents', basename($HasPath))
        ];
                
        $this->dirsCache[$path] = array();
        $res = $this->query($opts);
        
        $path == '/' || $path =='root' ? $mountPath = '/' : $mountPath = $this->_normpath($HasPath.'/');
        
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
    * Recursive files search
    *
    * @param  string  $path   dir path
    * @param  string  $q      search string
    * @param  array   $mimes
    * @return array
    * @author Naoki Sawada
    **/
    protected function doSearch($path, $q, $mimes)
    {
        $path == '/' || $path =='root' ? $itemId= 'root' : $itemId= basename($path); 		   
    	empty($mimes) ? $mimeType = parent::$mimetypes[strtolower($q)] :
			$mimeType = parent::$mimetypes[strtolower(explode("/",$mimes[0])[1])];
		
		$path = $this->_normpath($path.'/');		
		$result = [];
					
		$opts = [
			'fields' => self::FETCHFIELDS_LIST,
			'pageSize' => 1000,
			'spaces' => 'drive',
			'q' => sprintf('trashed=false and "%s" in parents', $itemId)
		];
		
		$res = $this->query($opts); 

		foreach ($res as $raw) {
			if ($raw->getMimeType() == self::DIRMIME)  {
				$result = array_merge($result, $this->doSearch($path.$raw->id, $q, $mimes));									
			}
			else
			{				   
				$timeout = $this->options['searchTimeout']? $this->searchStart + $this->options['searchTimeout'] : 0;
			
				if ($timeout && $timeout < time()) {
					$this->setError(elFinder::ERROR_SEARCH_TIMEOUT, $this->path($this->encode($path)));
					break;
				}
				if ((!empty($mimeType) && $raw->mimeType !== $mimeType) || (empty($mimeType) && strcasecmp($raw->name,$q))){ 
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
    * @param  string  $src   source path
    * @param  string  $dst   destination dir path
    * @param  string  $name  new file name (optionaly)
    * @return string|false
    * @author Dmitry (dio) Levashov
    * @author Naoki Sawada
    **/
    protected function copy($src, $dst, $name)
    {
        $this->clearcache();
        $opts = [
				'fields' => self::FETCHFIELDS_GET
				];       
		$res = $this->service->files->get(basename($src), $opts);
        if ($res['mimeType'] == self::DIRMIME) {
            $itemId = basename($this->_mkdir($dst, $name));
            $path = $this->_joinPath($dst, $itemId);
            $opts = [
                    'fields' => self::FETCHFIELDS_LIST,
                    'pageSize' => 1000,
                    'spaces' => 'drive',
                    'q' => sprintf('trashed=false and "%s" in parents', basename($src))
                    ];
                
            $res = $this->query($opts);
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
    * Remove file/ recursive remove dir
    *
    * @param  string  $path   file path
    * @param  bool    $force  try to remove even if file locked
    * @return bool
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
    * Create thumnbnail and return it's URL on success
    *
    * @param  string  $path  file path
    * @param  string  $mime  file mime type
    * @return string|false
    * @author Dmitry (dio) Levashov
    * @author Naoki Sawada
    **/
    protected function createTmb($path, $stat)
    {
        if (!$stat || !$this->canCreateTmb($path, $stat)) {
            return false;
        }
            
        $name = $this->tmbname($stat);
        $tmb  = $this->tmbPath.DIRECTORY_SEPARATOR.$name;
    
        // copy image into tmbPath so some drivers does not store files on local fs
        if (! $data = $this->getThumbnail($path)) {
            return false;
        }
        if (! file_put_contents($tmb, $data)) {
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
                    $x = $s[0] > $tmbSize ? intval(($s[0] - $tmbSize)/2) : 0;
                    $y = $s[1] > $tmbSize ? intval(($s[1] - $tmbSize)/2) : 0;
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
     * Return thumbnail file name for required file
     *
     * @param  array  $stat  file stat
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function tmbname($stat)
    {
        return $this->tmbPrefix.$stat['rev'].$stat['ts'].'.png';
    }
    
    /**
     * Get thumbnail from GoogleDrive.com
     * @param string $path
     * @param string $size
     * @return string | boolean
     */
    protected function getThumbnail($path)
    {
        //$files = new Google_Service_Drive_DriveFile();						
        $itemId = basename($path);
        
        try {
            $contents = $this->service->files->get($itemId, [
                'alt' 	 => 'media'			  	
            ]);
            $contents = $contents->getBody()->detach();
            rewind($contents);
            return $contents;
           
        } catch (Exception $e) {
            return false;
        }
    }

	/**
	* Publish permissions specified path item
	*
	* @param string $path
	*            
	* @return bool
	*/
	protected function publish($path)
	{		
		$opts = [
				'fields' => self::FETCHFIELDS_GET
				];
		
		if ($file = $this->service->files->get(basename($path), $opts)) {		
			$permissions = $file->getPermissions();
			foreach ($permissions as $permission) {
				if ($permission->type === 'anyone' && $permission->role === 'reader') {
					return true;
					break;
				}
			}
            try {				
                $permission = new Google_Service_Drive_Permission(array(
					'type' => 'anyone',
					'role' => 'reader',
					'withLink' => true
					));
                if ($this->service->permissions->create($file->getId(),$permission)) {								
                    return true;
                }
            } catch (Exception $e) {				
                return false;
            }
        }

        return false;
    }

	/**
	 * unPublish permissions specified path
	 *
	 * @param string $path
	 *            
	 * @return bool
	 */
	protected function unPublish($path)
	{
		$opts = [
				'fields' => self::FETCHFIELDS_GET
				];
		if ($file = $this->service->files->get(basename($path), $opts)) {
			$permissions = $file->getPermissions();
			try {
				foreach ($permissions as $permission) {
					if ($permission->type === 'anyone' && $permission->role === 'reader') {
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
    * Return content URL
    *
    * @param string  $hash  file hash
    * @param array $options options
    * @return array
    * @author Naoki Sawada
    **/
    public function getContentUrl($hash, $options = array())
	{
	
        if (($file = $this->file($hash)) == false || !$file['url'] || $file['url'] == 1) {
            $path = $this->decode($hash);
                 
			if ($this->publish($path)) {
				$itemId = basename($path);
				$opts = [
                    'fields' => self::FETCHFIELDS_GET
                ];
				$res = $this->service->files->get($itemId, $opts);				
               								
				if ($url = $res->getWebContentLink()) {
					return str_replace('export=download', 'export=media', $url);					
				}
				if ($url = $res->getWebViewLink()) {
					return $url;
				}                							
			}
		}
		return $file['url'];
	}
   
    /*********************** paths/urls *************************/

    /**
     * Return parent directory path
     *
     * @param  string  $path  file path
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _dirname($path)
    {
        return $this->_normpath(dirname($path));
    }

    /**
     * Return file name
     *
     * @param  string  $path  file path
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _basename($path)
    {
        return basename($path);
    }

    /**
     * Join dir name and file name and retur full path
     *
     * @param  string  $dir
     * @param  string  $name
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _joinPath($dir, $name)
    {
        return $this->_normpath($dir.'/'.$name);
    }

    /**
     * Return normalized path, this works the same as os.path.normpath() in Python
     *
     * @param  string  $path  path
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
     * Return file path related to root dir
     *
     * @param  string  $path  file path
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _relpath($path)
    {
        return $path;
    }

    /**
     * Convert path related to root dir into real path
     *
     * @param  string  $path  file path
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _abspath($path)
    {
        return $path;
    }

    /**
     * Return fake path started from root dir
     *
     * @param  string  $path  file path
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _path($path)
    {
        return $this->rootName . $this->_normpath(substr($path, strlen($this->root)));
    }

    /**
     * Return true if $path is children of $parent
     *
     * @param  string  $path    path to check
     * @param  string  $parent  parent path
     * @return bool
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
     * - (string) target  for symlinks - link target path. optionally
     *
     * If file does not exists - returns empty array or false.
     *
     * @param  string  $path    file path
     * @return array|false
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
     * Return true if path is dir and has at least one childs directory
     *
     * @param  string  $path  dir path
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _subdirs($path)
    {
        return ($stat = $this->stat($path)) && isset($stat['dirs']) ? $stat['dirs'] : false;
    }

    /**
     * Return object width and height
     * Ususaly used for images, but can be realize for video etc...
     *
     * @param  string  $path  file path
     * @param  string  $mime  file mime type
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _dimensions($path, $mime)
    {
        if (strpos($mime, 'image') !== 0) {
            return '';
        }
        $cache = $this->getDBdat($path);
        
        if (isset($cache['imageMediaMetadata']['width']) && isset($cache['imageMediaMetadata']['height'])) {
            return $cache['imageMediaMetadata']['width'].'x'.$cache['imageMediaMetadata']['height'];
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
     * @param  string  $path  dir path
     * @return array
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
     * Open file and return file pointer
     *
     * @param  string  $path  file path
     * @param  bool    $write open file for writing
     * @return resource|false
     * @author Dmitry (dio) Levashov
     **/
    protected function _fopen($path, $mode='rb')
    {
        if (($mode == 'rb' || $mode == 'r')) {
            try {
                //$files = new Google_Service_Drive_DriveFile();						
                $itemId = basename($path);
                            
                $contents = $this->service->files->get($itemId, [
                    //'fields' => 'id,webContentLink',
                    'alt'     => 'media'
                ]);
                
                $contents = $contents->getBody()->detach();
                rewind($contents);
                //$fp = tmpfile();
                //fputs($fp , $contents);
                //while(trim(fgets($fp)) !== ''){};
                //rewind($fp);				
                return $contents;
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
     * Close opened file
     *
     * @param  resource  $fp  file pointer
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _fclose($fp, $path='')
    {
        fclose($fp);
        if ($path) {
            unlink($this->getTempFile($path));
        }
    }

    /********************  file/dir manipulations *************************/

    /**
     * Create dir and return created dir path or false on failed
     *
     * @param  string  $path  parent dir path
     * @param string  $name  new directory name
     * @return string|bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _mkdir($path, $name)
    {
        $path = $this->_normpath($path.'/'.$name);
        basename(dirname($path)) == '' ? $parentId = 'root' : $parentId = basename(dirname($path));
        
        try {
            $files = new Google_Service_Drive_DriveFile();
            
            $files->setName($name);
            $files->setMimeType(self::DIRMIME);
            $files->setParents(array($parentId));
            
            //create the Folder in the Parent
            $createdFile = $this->service->files->create($files);
            
            basename(dirname($path)) == '' ? $path = '/'.$createdFile['id'] : $path = dirname($path).'/'.$createdFile['id'];
            return $path;
        } catch (Exception $e) {
            return $this->setError('GoogleDrive error: '.$e->getMessage());
        }

        return $path;
    }

    /**
     * Create file and return it's path or false on failed
     *
     * @param  string  $path  parent dir path
     * @param string  $name  new file name
     * @return string|bool
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
     * @param  string  $target  link target
     * @param  string  $path    symlink path
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _symlink($target, $path, $name)
    {
        return false;
    }

    /**
     * Copy file into another file
     *
     * @param  string  $source     source file path
     * @param  string  $targetDir  target directory path
     * @param  string  $name       new file name
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _copy($source, $targetDir, $name)
    {
        $path = $this->_normpath($targetDir.'/'.$name);
        
        try {
            $files = new Google_Service_Drive_DriveFile();
            $files->setName($name);
                        
            //Set the Parent id			
            $targetDir == '/' ? $parentId = 'root' : $parentId = basename($targetDir);
            $files->setParents(array($parentId));
            
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
     * @param  string  $source  source file path
     * @param  string  $target  target dir path
     * @param  string  $name    file name
     * @return string|bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _move($source, $targetDir, $name)
    {
        $target = $this->_normpath($targetDir.'/'.basename($source));
        try {
            //moving and renaming a file or directory
            $files = new Google_Service_Drive_DriveFile();
            $files->setName($name);
            $mimeType= parent::$mimetypes[pathinfo($name, PATHINFO_EXTENSION)];
            $files->setMimeType($mimeType);
                        
            //Set new Parent and remove old parent			
            $targetDir == '/' || $targetDir == 'root' ? $addParents = 'root' : $addParents = basename($targetDir);
            basename(dirname($source)) == '/' || basename(dirname($source)) == '' ? $removeParents = 'root' : $removeParents = basename(dirname($source));
                        
            $opts = ['addParents'=>$addParents,'removeParents'=>$removeParents];
            
            $file = $this->service->files->update(basename($source), $files, $opts);
        } catch (Exception $e) {
            return $this->setError('GoogleDrive error: '.$e->getMessage());
        }
        
        return $target;
    }

    /**
     * Remove file
     *
     * @param  string  $path  file path
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _unlink($path)
    {
        try {
            $files = new Google_Service_Drive_DriveFile();
            $files->setTrashed(true);
            
            $opts = ['removeParents'=>basename(dirname($path))];
            $this->service->files->update(basename($path), $files, $opts);
        } catch (Exception $e) {
            return $this->setError('GoogleDrive error: '.$e->getMessage());
        }
        return true;
    }

    /**
     * Remove dir
     *
     * @param  string  $path  dir path
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
     * @param  resource  $fp   file pointer
     * @param  string    $dir  target dir path
     * @param  string    $name file name
     * @param  array     $stat file stat (required by some virtual fs)
     * @return bool|string
     * @author Dmitry (dio) Levashov
     **/
    protected function _save($fp, $path, $name, $stat)
    {
        if ($name) {
            $path .= '/'.$name;
        }
        $path = $this->_normpath($path);
        
        try {
            //Insert or Update a file
            $files = new Google_Service_Drive_DriveFile();
            
            if (!empty($stat['rev'])) {
                // First retrieve the file from the API.
                $itemId = $stat['rev'];
                $name = $stat['name'];
                $mimeType = $stat['mimeType'];
                $files->setName($name);
                $files->setDescription('');
                $files->setMimeType($mimeType);
                // Send the request to the API for updation contents.
                $data= stream_get_contents($fp);
                $file = $this->service->files->update($itemId, $files, array(
                      'data' => strlen($data) == 0 ? ' ' : $data,
                      'mimeType' => $mimeType,
                      'uploadType' => 'multipart'
                      ));
            } elseif (empty($stat['rev'])) {
                $name == '' ? $name = basename($path) : $name = $name;
                $files->setName($name);
                $files->setDescription('');
                $stat['mime'] == '' ? $mimeType= parent::$mimetypes[pathinfo(basename($path), PATHINFO_EXTENSION)] : $mimeType= $stat['mime'];
                $files->setMimeType($mimeType);
                            
                //Set the Folder Parent			
                basename(dirname($path)) == '' ? $parentId = 'root' : $parentId = basename(dirname($path));
                
                $files->setParents(array($parentId));
                
                $data= stream_get_contents($fp);
                $file = $this->service->files->create($files, array(
                      'data' => strlen($data) == 0 ? ' ' : $data,
                      'mimeType' => $mimeType,
                      'uploadType' => 'media'
                ));
            }
        } catch (Exception $e) {
            return $this->setError('GoogleDrive error: '.$e->getMessage());
        }
        $path = $this->_normpath(dirname($path).'/'.$file->getId());
        
        return $path;
    }

    /**
     * Get file contents
     *
     * @param  string  $path  file path
     * @return string|false
     * @author Dmitry (dio) Levashov
     **/
    protected function _getContents($path)
    {
        $contents = '';
        
        try {
            //$files = new Google_Service_Drive_DriveFile();						
            $itemId = basename($path);
            
            $contents = $this->service->files->get($itemId, [
                'alt' => 'media'
            ]);
            $contents = (string) $contents->getBody();
        } catch (Exception $e) {
            return $this->setError('GoogleDrive error: '.$e->getMessage());
        }
        
        return $contents;
    }

    /**
     * Write a string to a file
     *
     * @param  string  $path     file path
     * @param  string  $content  new file content
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
     * Detect available archivers
     *
     * @return void
     **/
    protected function _checkArchivers()
    {
        // die('Not yet implemented. (_checkArchivers)');
        return array();
    }

    /**
     * chmod implementation
     *
     * @return bool
     **/
    protected function _chmod($path, $mode)
    {
        return false;
    }

    /**
     * Unpack archive
     *
     * @param  string  $path  archive path
     * @param  array   $arc   archiver command and arguments (same as in $this->archivers)
     * @return true
     * @return void
     * @author Dmitry (dio) Levashov
     * @author Alexey Sukhotin
     **/
    protected function _unpack($path, $arc)
    {
        die('Not yet implemented. (_unpack)');
        //return false;
    }

    /**
     * Recursive symlinks search
     *
     * @param  string  $path  file/dir path
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _findSymlinks($path)
    {
        die('Not yet implemented. (_findSymlinks)');
    }

    /**
     * Extract files from archive
     *
     * @param  string  $path  archive path
     * @param  array   $arc   archiver command and arguments (same as in $this->archivers)
     * @return true
     * @author Dmitry (dio) Levashov,
     * @author Alexey Sukhotin
     **/
    protected function _extract($path, $arc)
    {
        die('Not yet implemented. (_extract)');
    }

    /**
     * Create archive and return its path
     *
     * @param  string  $dir    target dir
     * @param  array   $files  files names list
     * @param  string  $name   archive name
     * @param  array   $arc    archiver options
     * @return string|bool
     * @author Dmitry (dio) Levashov,
     * @author Alexey Sukhotin
     **/
    protected function _archive($dir, $files, $name, $arc)
    {
        die('Not yet implemented. (_archive)');
    }
} // END class

