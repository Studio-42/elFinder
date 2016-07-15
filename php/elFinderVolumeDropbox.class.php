<?php

elFinder::$netDrivers['dropbox'] = 'Dropbox';

/**
 * Simple elFinder driver for FTP
 *
 * @author Dmitry (dio) Levashov
 * @author Cem (discofever)
 **/
class elFinderVolumeDropbox extends elFinderVolumeDriver {

	/**
	 * Driver id
	 * Must be started from letter and contains [a-z0-9]
	 * Used as part of volume id
	 *
	 * @var string
	 **/
	protected $driverId = 'd';

	/**
	 * OAuth object
	 *
	 * @var oauth
	 **/
	protected $oauth = null;

	/**
	 * Dropbox object
	 *
	 * @var dropbox
	 **/
	protected $dropbox = null;

	/**
	 * Directory for meta data caches
	 * If not set driver not cache meta data
	 *
	 * @var string
	 **/
	protected $metaCache = '';

	/**
	 * Last API error message
	 *
	 * @var string
	 **/
	protected $apiError = '';

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
	 * Dropbox.com uid
	 *
	 * @var string
	 **/
	protected $dropboxUid = '';
	
	/**
	 * Dropbox download host, replaces 'www.dropbox.com' of shares URL
	 * 
	 * @var string
	 */
	private $dropbox_dlhost = 'dl.dropboxusercontent.com';
	
	private $dropbox_phpFound = false;
	
	private $DB_TableName = '';
	
	private $tmbPrefix = '';

	/**
	 * Constructor
	 * Extend options with required fields
	 *
	 * @author Dmitry (dio) Levashov
	 * @author Cem (DiscoFever)
	 */
	public function __construct() {

		// check with composer
		$this->dropbox_phpFound = class_exists('Dropbox_API');
		
		if (! $this->dropbox_phpFound) {
			// check with pear
			if (include_once 'Dropbox/autoload.php') {
				$this->dropbox_phpFound = in_array('Dropbox_autoload', spl_autoload_functions());
			}
		}
		
		$opts = array(
			'consumerKey'       => '',
			'consumerSecret'    => '',
			'accessToken'       => '',
			'accessTokenSecret' => '',
			'dropboxUid'        => '',
			'root'              => 'dropbox',
			'path'              => '/',
			'separator'         => '/',
			'PDO_DSN'           => '', // if empty use 'sqlite:(metaCachePath|tmbPath)/elFinder_dropbox_db_(hash:dropboxUid+consumerSecret)'
			'PDO_User'          => '',
			'PDO_Pass'          => '',
			'PDO_Options'       => array(),
			'PDO_DBName'        => 'dropbox',
			'treeDeep'          => 0,
			'tmbPath'           => '',
			'tmbURL'            => '',
			'tmpPath'           => '',
			'getTmbSize'        => 'large', // small: 32x32, medium or s: 64x64, large or m: 128x128, l: 640x480, xl: 1024x768
			'metaCachePath'     => '',
			'metaCacheTime'     => '600', // 10m
			'acceptedName'      => '#^[^/\\?*:|"<>]*[^./\\?*:|"<>]$#',
			'rootCssClass'      => 'elfinder-navbar-root-dropbox'
		);
		$this->options = array_merge($this->options, $opts);
		$this->options['mimeDetect'] = 'internal';
	}

	/**
	 * Prepare
	 * Call from elFinder::netmout() before volume->mount()
	 *
	 * @param $options
	 * @return Array
	 * @author Naoki Sawada
	 */
	public function netmountPrepare($options) {
		if (empty($options['consumerKey']) && defined('ELFINDER_DROPBOX_CONSUMERKEY')) $options['consumerKey'] = ELFINDER_DROPBOX_CONSUMERKEY;
		if (empty($options['consumerSecret']) && defined('ELFINDER_DROPBOX_CONSUMERSECRET')) $options['consumerSecret'] = ELFINDER_DROPBOX_CONSUMERSECRET;
		
		if ($options['user'] === 'init') {

			if (! $this->dropbox_phpFound || empty($options['consumerKey']) || empty($options['consumerSecret']) || !class_exists('PDO', false)) {
				return array('exit' => true, 'body' => '{msg:errNetMountNoDriver}');
			}
			
			if (defined('ELFINDER_DROPBOX_USE_CURL_PUT')) {
				$this->oauth = new Dropbox_OAuth_Curl($options['consumerKey'], $options['consumerSecret']);
			} else {
				if (class_exists('OAuth', false)) {
					$this->oauth = new Dropbox_OAuth_PHP($options['consumerKey'], $options['consumerSecret']);
				} else {
					if (! class_exists('HTTP_OAuth_Consumer')) {
						// We're going to try to load in manually
						include 'HTTP/OAuth/Consumer.php';
					}
					if (class_exists('HTTP_OAuth_Consumer', false)) {
						$this->oauth = new Dropbox_OAuth_PEAR($options['consumerKey'], $options['consumerSecret']);
					}
				}
			}
			
			if (! $this->oauth) {
				return array('exit' => true, 'body' => '{msg:errNetMountNoDriver}');
			}

			if ($options['pass'] === 'init') {
				$html = '';
				if ($sessionToken = $this->session->get('DropboxTokens')) {
					// token check
					try {
						list(, $accessToken, $accessTokenSecret) = $sessionToken;
						$this->oauth->setToken($accessToken, $accessTokenSecret);
						$this->dropbox = new Dropbox_API($this->oauth, $this->options['root']);
						$this->dropbox->getAccountInfo();
						$script = '<script>
							$("#'.$options['id'].'").elfinder("instance").trigger("netmount", {protocol: "dropbox", mode: "done"});
						</script>';
						$html = $script;
					} catch (Dropbox_Exception $e) {
						$this->session->remove('DropboxTokens');
					}
				}
				if (! $html) {
					// get customdata
					$cdata = '';
					$innerKeys = array('cmd', 'host', 'options', 'pass', 'protocol', 'user');
					$this->ARGS = $_SERVER['REQUEST_METHOD'] === 'POST'? $_POST : $_GET;
					foreach($this->ARGS as $k => $v) {
						if (! in_array($k, $innerKeys)) {
							$cdata .= '&' . $k . '=' . rawurlencode($v);
						}
					}
					if (strpos($options['url'], 'http') !== 0 ) {
						$options['url'] = $this->getConnectorUrl();
					}
					$callback  = $options['url']
					           . '?cmd=netmount&protocol=dropbox&host=dropbox.com&user=init&pass=return&node='.$options['id'].$cdata;
					
					try {
						$tokens = $this->oauth->getRequestToken();
						$url= $this->oauth->getAuthorizeUrl(rawurlencode($callback));
					} catch (Dropbox_Exception $e) {
						return array('exit' => true, 'body' => '{msg:errAccess}');
					}
					
					$this->session->set('DropboxAuthTokens', $tokens);
					$html = '<input id="elf-volumedriver-dropbox-host-btn" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" value="{msg:btnApprove}" type="button" onclick="window.open(\''.$url.'\')">';
					$html .= '<script>
						$("#'.$options['id'].'").elfinder("instance").trigger("netmount", {protocol: "dropbox", mode: "makebtn"});
					</script>';
				}
				return array('exit' => true, 'body' => $html);
			} else {
				$this->oauth->setToken($this->session->get('DropboxAuthTokens'));
				$this->session->remove('DropboxAuthTokens');
				$tokens = $this->oauth->getAccessToken();
				$this->session->set('DropboxTokens', array($_GET['uid'], $tokens['token'], $tokens['token_secret']));
				
				$out = array(
					'node' => $_GET['node'],
					'json' => '{"protocol": "dropbox", "mode": "done"}',
					'bind' => 'netmount'
				);
				
				return array('exit' => 'callback', 'out' => $out);
			}
		}
		if ($sessionToken = $this->session->get('DropboxTokens')) {
			list($options['dropboxUid'], $options['accessToken'], $options['accessTokenSecret']) = $sessionToken;
		}
		unset($options['user'], $options['pass']);
		return $options;
	}

	/**
	 * process of on netunmount
	 * Drop table `dropbox` & rm thumbs
	 *
	 * @param $netVolumes
	 * @param $key
	 * @return bool
	 * @internal param array $options
	 */
	public function netunmount($netVolumes, $key) {
		$count = 0;
		$dropboxUid = '';
		if (isset($netVolumes[$key])) {
			$dropboxUid = $netVolumes[$key]['dropboxUid'];
		}
		foreach($netVolumes as $volume) {
			if ($volume['host'] === 'dropbox' && $volume['dropboxUid'] === $dropboxUid) {
				$count++;
			}
		}
		if ($count === 1) {
			$this->DB->exec('drop table '.$this->DB_TableName);
			foreach(glob(rtrim($this->options['tmbPath'], '\\/').DIRECTORY_SEPARATOR.$this->tmbPrefix.'*.png') as $tmb) {
				unlink($tmb);
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
	private function getConnectorUrl() {
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
	protected function init() {
		if (!class_exists('PDO', false)) {
			return $this->setError('PHP PDO class is require.');
		}
		
		if (!$this->options['consumerKey']
		||  !$this->options['consumerSecret']
		||  !$this->options['accessToken']
		||  !$this->options['accessTokenSecret']) {
			return $this->setError('Required options undefined.');
		}
		
		if (empty($this->options['metaCachePath']) && defined('ELFINDER_DROPBOX_META_CACHE_PATH')) {
			$this->options['metaCachePath'] = ELFINDER_DROPBOX_META_CACHE_PATH;
		}
		
		// make net mount key
		$this->netMountKey = md5(join('-', array('dropbox', $this->options['path'])));

		if (! $this->oauth) {
			if (defined('ELFINDER_DROPBOX_USE_CURL_PUT')) {
				$this->oauth = new Dropbox_OAuth_Curl($this->options['consumerKey'], $this->options['consumerSecret']);
			} else {
				if (class_exists('OAuth', false)) {
					$this->oauth = new Dropbox_OAuth_PHP($this->options['consumerKey'], $this->options['consumerSecret']);
				} else {
					if (! class_exists('HTTP_OAuth_Consumer')) {
						// We're going to try to load in manually
						include 'HTTP/OAuth/Consumer.php';
					}
					if (class_exists('HTTP_OAuth_Consumer', false)) {
						$this->oauth = new Dropbox_OAuth_PEAR($this->options['consumerKey'], $this->options['consumerSecret']);
					}
				}
			}
		}
		
		if (! $this->oauth) {
			return $this->setError('OAuth extension not loaded.');
		}

		// normalize root path
		$this->root = $this->options['path'] = $this->_normpath($this->options['path']);

		if (empty($this->options['alias'])) {
			$this->options['alias'] = ($this->options['path'] === '/')? 'Dropbox.com'  : 'Dropbox'.$this->options['path'];
		}

		$this->rootName = $this->options['alias'];

		try {
			$this->oauth->setToken($this->options['accessToken'], $this->options['accessTokenSecret']);
			$this->dropbox = new Dropbox_API($this->oauth, $this->options['root']);
		} catch (Dropbox_Exception $e) {
			$this->session->remove('DropboxTokens');
			return $this->setError('Dropbox error: '.$e->getMessage());
		}
		
		// user
		if (empty($this->options['dropboxUid'])) {
			try {
				$res = $this->dropbox->getAccountInfo();
				$this->options['dropboxUid'] = $res['uid'];
			} catch (Dropbox_Exception $e) {
				$this->session->remove('DropboxTokens');
				return $this->setError('Dropbox error: '.$e->getMessage());
			}
		}
		
		$this->dropboxUid = $this->options['dropboxUid'];
		$this->tmbPrefix = 'dropbox'.base_convert($this->dropboxUid, 10, 32);

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
		
		if (!empty($this->options['metaCachePath'])) {
			if ((is_dir($this->options['metaCachePath']) || mkdir($this->options['metaCachePath'])) && is_writable($this->options['metaCachePath'])) {
				$this->metaCache = $this->options['metaCachePath'];
			}
		}
		if (!$this->metaCache && $this->tmp) {
			$this->metaCache = $this->tmp;
		}
		
		if (!$this->metaCache) {
			return $this->setError('Cache dirctory (metaCachePath or tmp) is require.');
		}
		
		// setup PDO
		if (! $this->options['PDO_DSN']) {
			$this->options['PDO_DSN'] = 'sqlite:'.$this->metaCache.DIRECTORY_SEPARATOR.'.elFinder_dropbox_db_'.md5($this->dropboxUid.$this->options['consumerSecret']);
		}
		// DataBase table name
		$this->DB_TableName = $this->options['PDO_DBName'];
		// DataBase check or make table
		try {
			$this->DB = new PDO($this->options['PDO_DSN'], $this->options['PDO_User'], $this->options['PDO_Pass'], $this->options['PDO_Options']);
			if (! $this->checkDB()) {
				return $this->setError('Can not make DB table');
			}
		} catch (PDOException $e) {
			return $this->setError('PDO connection failed: '.$e->getMessage());
		}
		
		$res = $this->deltaCheck($this->isMyReload());
		if ($res !== true) {
			if (is_string($res)) {
				return $this->setError($res);
			} else {
				return $this->setError('Could not check API "delta"');
			}
		}
		
		if (is_null($this->options['syncChkAsTs'])) {
			$this->options['syncChkAsTs'] = true;
		}
		if ($this->options['syncChkAsTs']) {
			// 'tsPlSleep' minmum 5 sec
			$this->options['tsPlSleep'] = max(5, $this->options['tsPlSleep']);
		} else {
			// 'lsPlSleep' minmum 10 sec
			$this->options['lsPlSleep'] = max(10, $this->options['lsPlSleep']);
		}
		
		return true;
	}


	/**
	 * Configure after successful mount.
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function configure() {
		parent::configure();
		
		$this->disabled[] = 'archive';
		$this->disabled[] = 'extract';
	}
	
	/**
	 * Check DB for delta cache
	 * 
	 * @return bool
	 */
	private function checkDB() {
		$res = $this->query('SELECT * FROM sqlite_master WHERE type=\'table\' AND name=\''.$this->DB_TableName.'\'');
		if ($res && isset($_REQUEST['init'])) {
			// check is index(nameidx) UNIQUE?
			$chk = $this->query('SELECT sql FROM sqlite_master WHERE type=\'index\' and name=\'nameidx\'');
			if (!$chk || strpos(strtoupper($chk[0]), 'UNIQUE') === false) {
				// remake
				$this->DB->exec('DROP TABLE '.$this->DB_TableName);
				$res = false;
			}
		}
		if (! $res) {
			try {
				$this->DB->exec('CREATE TABLE '.$this->DB_TableName.'(path text, fname text, dat blob, isdir integer);');
				$this->DB->exec('CREATE UNIQUE INDEX nameidx ON '.$this->DB_TableName.'(path, fname)');
				$this->DB->exec('CREATE INDEX isdiridx ON '.$this->DB_TableName.'(isdir)');
			} catch (PDOException $e) {
				return $this->setError($e->getMessage());
			}
		}
		return true;
	}
	
	/**
	 * DB query and fetchAll
	 * 
	 * @param string $sql
	 * @return boolean|array
	 */
	private function query($sql) {
		if ($sth = $this->DB->query($sql)) {
			$res = $sth->fetchAll(PDO::FETCH_COLUMN);
		} else {
			$res = false;
		}
		return $res;
	}
	
	/**
	 * Get dat(dropbox metadata) from DB
	 * 
	 * @param string $path
	 * @return array dropbox metadata
	 */
	private function getDBdat($path) {
		if ($res = $this->query('select dat from '.$this->DB_TableName.' where path='.$this->DB->quote(strtolower($this->_dirname($path))).' and fname='.$this->DB->quote(strtolower(basename($path))).' limit 1')) {
			return unserialize($res[0]);
		} else {
			return array();
		}
	}
	
	/**
	 * Update DB dat(dropbox metadata)
	 * 
	 * @param string $path
	 * @param array $dat
	 * @return bool|array
	 */
	private function updateDBdat($path, $dat) {
		return $this->query('update '.$this->DB_TableName.' set dat='.$this->DB->quote(serialize($dat))
				. ', isdir=' . ($dat['is_dir']? 1 : 0)
				. ' where path='.$this->DB->quote(strtolower($this->_dirname($path))).' and fname='.$this->DB->quote(strtolower(basename($path))));
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
	public function umount() {

	}
	
	/**
	 * Get delta data and DB update
	 * 
	 * @param boolean $refresh force refresh
	 * @return true|string error message
	 */
	protected function deltaCheck($refresh = true) {
		$chk = false;
		if (! $refresh && $chk = $this->query('select dat from '.$this->DB_TableName.' where path=\'\' and fname=\'\' limit 1')) {
			$chk = unserialize($chk[0]);
		}
		if ($chk && ($chk['mtime'] + $this->options['metaCacheTime']) > $_SERVER['REQUEST_TIME']) {
			return true;
		}
		
		try {
			$more = true;
			$this->DB->beginTransaction();
			
			if ($res = $this->query('select dat from '.$this->DB_TableName.' where path=\'\' and fname=\'\' limit 1')) {
				$res = unserialize($res[0]);
				$cursor = $res['cursor'];
			} else {
				$cursor = '';
			}
			$delete = false;
			$reset = false;
			$ptimes = array();
			$now = time();
			do {
				 ini_set('max_execution_time', 120);
				$_info = $this->dropbox->delta($cursor);
				if (! empty($_info['reset'])) {
					$this->DB->exec('TRUNCATE table '.$this->DB_TableName);
					$this->DB->exec('insert into '.$this->DB_TableName.' values(\'\', \'\', \''.serialize(array('cursor' => '', 'mtime' => 0)).'\', 0);');
					$this->DB->exec('insert into '.$this->DB_TableName.' values(\'/\', \'\', \''.serialize(array(
						'path'      => '/',
						'is_dir'    => 1,
						'mime_type' => '',
						'bytes'     => 0
					)).'\', 0);');
					$reset = true;
				}
				$cursor = $_info['cursor'];
				
				foreach($_info['entries'] as $entry) {
					$key = strtolower($entry[0]);
					$pkey = strtolower($this->_dirname($key));
					
					$path = $this->DB->quote($pkey);
					$fname = $this->DB->quote(strtolower(basename($key)));
					$where = 'where path='.$path.' and fname='.$fname;
					
					if (empty($entry[1])) {
						$ptimes[$pkey] = isset($ptimes[$pkey])? max(array($now, $ptimes[$pkey])) : $now;
						$this->DB->exec('delete from '.$this->DB_TableName.' '.$where);
						! $delete && $delete = true;
						continue;
					}

					$_itemTime = strtotime(isset($entry[1]['client_mtime'])? $entry[1]['client_mtime'] : $entry[1]['modified']);
					$ptimes[$pkey] = isset($ptimes[$pkey])? max(array($_itemTime, $ptimes[$pkey])) : $_itemTime;
					$sql = 'select path from '.$this->DB_TableName.' '.$where.' limit 1';
					if (! $reset && $this->query($sql)) {
						$this->DB->exec('update '.$this->DB_TableName.' set dat='.$this->DB->quote(serialize($entry[1])).', isdir='.($entry[1]['is_dir']? 1 : 0).' ' .$where);
					} else {
						$this->DB->exec('insert into '.$this->DB_TableName.' values ('.$path.', '.$fname.', '.$this->DB->quote(serialize($entry[1])).', '.(int)$entry[1]['is_dir'].')');
					}
				}
			} while (! empty($_info['has_more']));
			
			// update time stamp of parent holder
			foreach ($ptimes as $_p => $_t) {
				if ($praw = $this->getDBdat($_p)) {
					$_update = false;
					if (isset($praw['client_mtime']) && $_t > strtotime($praw['client_mtime'])) {
						$praw['client_mtime'] = date('r', $_t);
						$_update = true;
					}
					if (isset($praw['modified']) && $_t > strtotime($praw['modified'])) {
						$praw['modified'] = date('r', $_t);
						$_update = true;
					}
					if ($_update) {
						$pwhere = 'where path='.$this->DB->quote(strtolower($this->_dirname($_p))).' and fname='.$this->DB->quote(strtolower(basename($_p)));
						$this->DB->exec('update '.$this->DB_TableName.' set dat='.$this->DB->quote(serialize($praw)).' '.$pwhere);
					}
				}
			}
			
			$this->DB->exec('update '.$this->DB_TableName.' set dat='.$this->DB->quote(serialize(array('cursor'=>$cursor, 'mtime'=>$_SERVER['REQUEST_TIME']))).' where path=\'\' and fname=\'\'');
			if (! $this->DB->commit()) {
				$e = $this->DB->errorInfo();
				return $e[2];
			}
			if ($delete) {
				$this->DB->exec('vacuum');
			}
		} catch(Dropbox_Exception $e) {
			return $e->getMessage();
		}
		return true;
	}
	
	/**
	 * Parse line from dropbox metadata output and return file stat (array)
	 *
	 * @param  string  $raw  line from ftp_rawlist() output
	 * @return array
	 * @author Dmitry Levashov
	 **/
	protected function parseRaw($raw) {
		$stat = array();

		$stat['rev']   = isset($raw['rev'])? $raw['rev'] : 'root';
		$stat['name']  = basename($raw['path']);
		$stat['mime']  = $raw['is_dir']? 'directory' : $raw['mime_type'];
		$stat['size']  = $stat['mime'] == 'directory' ? 0 : $raw['bytes'];
		$stat['ts']    = isset($raw['client_mtime'])? strtotime($raw['client_mtime']) :
		                (isset($raw['modified'])? strtotime($raw['modified']) : $_SERVER['REQUEST_TIME']);
		$stat['dirs'] = 0;
		if ($raw['is_dir']) {
			$stat['dirs'] = (int)(bool)$this->query('select path from '.$this->DB_TableName.' where isdir=1 and path='.$this->DB->quote(strtolower($raw['path'])));
		}
		
		if (!empty($raw['url'])) {
			$stat['url'] = $raw['url'];
		} else {
			$stat['url'] = '1';
		}
		if (isset($raw['width'])) $stat['width'] = $raw['width'];
		if (isset($raw['height'])) $stat['height'] = $raw['height'];
		
		return $stat;
	}

	/**
	 * Cache dir contents
	 *
	 * @param  string  $path  dir path
	 * @return string
	 * @author Dmitry Levashov
	 **/
	protected function cacheDir($path) {
		$this->dirsCache[$path] = array();
		$res = $this->query('select dat from '.$this->DB_TableName.' where path='.$this->DB->quote(strtolower($path)));
		
		if ($res) {
			foreach($res as $raw) {
				$raw = unserialize($raw);
				if ($stat = $this->parseRaw($raw)) {
					$stat = $this->updateCache($raw['path'], $stat);
					if (empty($stat['hidden']) && $path !== $raw['path']) {
						$this->dirsCache[$path][] = $raw['path'];
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
	protected function doSearch($path, $q, $mimes) {
		$result = array();
		$sth = $this->DB->prepare('select dat from '.$this->DB_TableName.' WHERE path LIKE ? AND fname LIKE ?');
		$sth->execute(array((($path === '/')? '' : strtolower($path)).'%', '%'.strtolower($q).'%'));
		$res = $sth->fetchAll(PDO::FETCH_COLUMN);
		$timeout = $this->options['searchTimeout']? $this->searchStart + $this->options['searchTimeout'] : 0;
		
		if ($res) {
			foreach($res as $raw) {
				if ($timeout && $timeout < time()) {
					$this->setError(elFinder::ERROR_SEARCH_TIMEOUT, $this->path($this->encode($path)));
					break;
				}
				
				$raw = unserialize($raw);
				if ($stat = $this->parseRaw($raw)) {
					if (!isset($this->cache[$raw['path']])) {
						$stat = $this->updateCache($raw['path'], $stat);
					}
					if (!empty($stat['hidden']) || ($mimes && $stat['mime'] === 'directory') || !$this->mimeAccepted($stat['mime'], $mimes)) {
						continue;
					}
					$stat = $this->stat($raw['path']);
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
	protected function copy($src, $dst, $name) {

		$this->clearcache();

		return $this->_copy($src, $dst, $name)
		? $this->_joinPath($dst, $name)
		: $this->setError(elFinder::ERROR_COPY, $this->_path($src));
	}

	/**
	 * Remove file/ recursive remove dir
	 *
	 * @param  string $path file path
	 * @param  bool $force try to remove even if file locked
	 * @param bool $recursive
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 * @author Naoki Sawada
	 */
	protected function remove($path, $force = false, $recursive = false) {
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
	 * @param  string $path file path
	 * @param $stat
	 * @return false|string
	 * @internal param string $mime file mime type
	 * @author Dmitry (dio) Levashov
	 * @author Naoki Sawada
	 */
	protected function createTmb($path, $stat) {
		if (!$stat || !$this->canCreateTmb($path, $stat)) {
			return false;
		}
	
		$name = $this->tmbname($stat);
		$tmb  = $this->tmbPath.DIRECTORY_SEPARATOR.$name;
	
		// copy image into tmbPath so some drivers does not store files on local fs
		if (! $data = $this->getThumbnail($path, $this->options['getTmbSize'])) {
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
			$result = $this->imgSquareFit($tmb, $tmbSize, $tmbSize, 'center', 'middle', $this->options['tmbBgColor'], 'png' );
	
		} else {
	
			if ($this->options['tmbCrop']) {
	
				/* Resize and crop if image bigger than thumbnail */
				if (!(($s[0] > $tmbSize && $s[1] <= $tmbSize) || ($s[0] <= $tmbSize && $s[1] > $tmbSize) ) || ($s[0] > $tmbSize && $s[1] > $tmbSize)) {
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
		
			$result = $this->imgSquareFit($tmb, $tmbSize, $tmbSize, 'center', 'middle', $this->options['tmbBgColor'], 'png' );
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
	protected function tmbname($stat) {
		return $this->tmbPrefix.$stat['rev'].'.png';
	}
	
	/**
	 * Get thumbnail from dropbox.com
	 * @param string $path
	 * @param string $size
	 * @return string | boolean
	 */
	protected function getThumbnail($path, $size = 'small') {
		try {
			return $this->dropbox->getThumbnail($path, $size);
		} catch (Dropbox_Exception $e) {
			return false;
		}
	}
	
	/**
	* Return content URL
	*
	* @param string  $hash  file hash
	* @param array $options options
	* @return array
	* @author Naoki Sawada
	**/
	public function getContentUrl($hash, $options = array()) {
		if (($file = $this->file($hash)) == false || !$file['url'] || $file['url'] == 1) {
			$path = $this->decode($hash);
			$cache = $this->getDBdat($path);
			$url = '';
			if (isset($cache['share']) && strpos($cache['share'], $this->dropbox_dlhost) !== false) {
				$res = $this->getHttpResponseHeader($cache['share']);
				if (preg_match("/^HTTP\/[01\.]+ ([0-9]{3})/", $res, $match)) {
					if ($match[1] < 400) {
						$url = $cache['share'];
					}
				}
			}
			if (! $url) {
				try {
					$res = $this->dropbox->share($path, null, false);
					$url = $res['url'];
					if (strpos($url, 'www.dropbox.com') === false) {
						$res = $this->getHttpResponseHeader($url);
						if (preg_match('/^location:\s*(http[^\s]+)/im', $res, $match)) {
							$url = $match[1];
						}
					}
					list($url) = explode('?', $url);
					$url = str_replace('www.dropbox.com', $this->dropbox_dlhost, $url);
					if (! isset($cache['share']) || $cache['share'] !== $url) {
						$cache['share'] = $url;
						$this->updateDBdat($path, $cache);
					}
				} catch (Dropbox_Exception $e) {
					return false;
				}
			}
			return $url;
		}
		return $file['url'];
	}
	
	/**
	 * Get HTTP request response header string
	 * 
	 * @param string $url target URL
	 * @return string
	 * @author Naoki Sawada
	 */
	private function getHttpResponseHeader($url) {
		if (function_exists('curl_exec')) {

			$c = curl_init();
			curl_setopt( $c, CURLOPT_RETURNTRANSFER, true );
			curl_setopt( $c, CURLOPT_CUSTOMREQUEST, 'HEAD' );
			curl_setopt( $c, CURLOPT_HEADER, 1 );
			curl_setopt( $c, CURLOPT_NOBODY, true );
			curl_setopt( $c, CURLOPT_URL, $url );
			$res = curl_exec( $c );
			
		} else {
			
			require_once 'HTTP/Request2.php';
			try {
				$request2 = new HTTP_Request2();
				$request2->setConfig(array(
	                'ssl_verify_peer' => false,
	                'ssl_verify_host' => false
	            ));
				$request2->setUrl($url);
				$request2->setMethod(HTTP_Request2::METHOD_HEAD);
				$result = $request2->send();
				$res = array();
				$res[] = 'HTTP/'.$result->getVersion().' '.$result->getStatus().' '.$result->getReasonPhrase();
				foreach($result->getHeader() as $key => $val) {
					$res[] = $key . ': ' . $val;
				}
				$res = join("\r\n", $res);
			} catch( HTTP_Request2_Exception $e ){
				$res = '';
			} catch (Exception $e){
				$res = '';
			}
		
		}
		return $res;
	}
	
	/*********************** paths/urls *************************/

	/**
	 * Return parent directory path
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _dirname($path) {
		return $this->_normpath(dirname($path));
	}

	/**
	 * Return file name
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _basename($path) {
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
	protected function _joinPath($dir, $name) {
		return $this->_normpath($dir.'/'.$name);
	}

	/**
	 * Return normalized path, this works the same as os.path.normpath() in Python
	 *
	 * @param  string  $path  path
	 * @return string
	 * @author Troex Nevelin
	 **/
	protected function _normpath($path) {
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
	protected function _relpath($path) {
		return $path;
	}

	/**
	 * Convert path related to root dir into real path
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _abspath($path) {
		return $path;
	}

	/**
	 * Return fake path started from root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _path($path) {
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
	protected function _inpath($path, $parent) {
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
	protected function _stat($path) {
		//if (!empty($this->ARGS['reload']) && isset($this->ARGS['target']) && strpos($this->ARGS['target'], $this->id) === 0) {
		if ($this->isMyReload()) {
			$this->deltaCheck();
		}
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
	protected function _subdirs($path) {
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
	protected function _dimensions($path, $mime) {
		if (strpos($mime, 'image') !== 0) return '';
		$cache = $this->getDBdat($path);
		if (isset($cache['width']) && isset($cache['height'])) {
			return $cache['width'].'x'.$cache['height'];
		}
		$ret = '';
		if ($work = $this->getWorkFile($path)) {
			if ($size = getimagesize($work)) {
				$cache['width'] = $size[0];
				$cache['height'] = $size[1];
				$this->updateDBdat($path, $cache);
				$ret = $size[0].'x'.$size[1];
			}
		}
		is_file($work) && unlink($work);
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
	protected function _scandir($path) {
		return isset($this->dirsCache[$path])
			? $this->dirsCache[$path]
			: $this->cacheDir($path);
	}

	/**
	 * Open file and return file pointer
	 *
	 * @param  string $path file path
	 * @param string $mode
	 * @return false|resource
	 * @internal param bool $write open file for writing
	 * @author Dmitry (dio) Levashov
	 */
	protected function _fopen($path, $mode='rb') {

		if (($mode == 'rb' || $mode == 'r')) {
			try {
				$res = $this->dropbox->media($path);
				$url = parse_url($res['url']);
 				$fp = stream_socket_client('ssl://'.$url['host'].':443');
 				fputs($fp, "GET {$url['path']} HTTP/1.0\r\n");
 				fputs($fp, "Host: {$url['host']}\r\n");
 				fputs($fp, "\r\n");
 				while(trim(fgets($fp)) !== ''){};
 				return $fp;
			} catch (Dropbox_Exception $e) {
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
					return fopen($local, $mode);
				}
			}
		}

		return false;
	}

	/**
	 * Close opened file
	 *
	 * @param  resource $fp file pointer
	 * @param string $path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 */
	protected function _fclose($fp, $path='') {
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
	protected function _mkdir($path, $name) {
		$path = $this->_normpath($path.'/'.$name);
		try {
			$this->dropbox->createFolder($path);
		} catch (Dropbox_Exception $e) {
			$this->deltaCheck();
			if ($this->dir($this->encode($path))) {
				return $path;
			}
			return $this->setError('Dropbox error: '.$e->getMessage());
		}
		$this->deltaCheck();
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
	protected function _mkfile($path, $name) {
		return $this->_filePutContents($path.'/'.$name, '');
	}

	/**
	 * Create symlink. FTP driver does not support symlinks.
	 *
	 * @param  string $target link target
	 * @param  string $path symlink path
	 * @param string $name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 */
	protected function _symlink($target, $path, $name) {
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
	protected function _copy($source, $targetDir, $name) {
		$path = $this->_normpath($targetDir.'/'.$name);
		try {
			$this->dropbox->copy($source, $path);
		} catch (Dropbox_Exception $e) {
			return $this->setError('Dropbox error: '.$e->getMessage());
		}
		$this->deltaCheck();
		return true;
	}

	/**
	 * Move file into another parent dir.
	 * Return new file path or false.
	 *
	 * @param  string $source source file path
	 * @param $targetDir
	 * @param  string $name file name
	 * @return bool|string
	 * @internal param string $target target dir path
	 * @author Dmitry (dio) Levashov
	 */
	protected function _move($source, $targetDir, $name) {
		$target = $this->_normpath($targetDir.'/'.$name);
		try {
			$this->dropbox->move($source, $target);
		} catch (Dropbox_Exception $e) {
			return $this->setError('Dropbox error: '.$e->getMessage());
		}
		$this->deltaCheck();
		return $target;
	}

	/**
	 * Remove file
	 *
	 * @param  string  $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _unlink($path) {
		try {
			$this->dropbox->delete($path);
		} catch (Dropbox_Exception $e) {
			return $this->setError('Dropbox error: '.$e->getMessage());
		}
		$this->deltaCheck();
		return true;
	}

	/**
	 * Remove dir
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _rmdir($path) {
		return $this->_unlink($path);
	}

	/**
	 * Create new file and write into it from file pointer.
	 * Return new file path or false on error.
	 *
	 * @param  resource $fp file pointer
	 * @param string $path
	 * @param  string $name file name
	 * @param  array $stat file stat (required by some virtual fs)
	 * @return bool|string
	 * @internal param string $dir target dir path
	 * @author Dmitry (dio) Levashov
	 */
	protected function _save($fp, $path, $name, $stat) {
		if ($name) $path .= '/'.$name;
		$path = $this->_normpath($path);
		try {
			$this->dropbox->putFile($path, $fp);
		} catch (Dropbox_Exception $e) {
			return $this->setError('Dropbox error: '.$e->getMessage());
		}
		$this->deltaCheck();
		if (is_array($stat)) {
			$raw = $this->getDBdat($path);
			if (isset($stat['width'])) $raw['width'] = $stat['width'];
			if (isset($stat['height'])) $raw['height'] = $stat['height'];
			$this->updateDBdat($path, $raw);
		}
		return $path;
	}

	/**
	 * Get file contents
	 *
	 * @param  string  $path  file path
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _getContents($path) {
		$contents = '';
		try {
			$contents = $this->dropbox->getFile($path);
		} catch (Dropbox_Exception $e) {
			return $this->setError('Dropbox error: '.$e->getMessage());
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
	protected function _filePutContents($path, $content) {
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
	 * @return array
	 **/
	protected function _checkArchivers() {
		// die('Not yet implemented. (_checkArchivers)');
		return array();
	}

	/**
	 * chmod implementation
	 *
	 * @param string $path
	 * @param string $mode
	 * @return bool
	 */
	protected function _chmod($path, $mode) {
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
	protected function _unpack($path, $arc) {
		die('Not yet implemented. (_unpack)');
	}

	/**
	 * Recursive symlinks search
	 *
	 * @param  string  $path  file/dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _findSymlinks($path) {
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
	protected function _extract($path, $arc) {
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
	protected function _archive($dir, $files, $name, $arc) {
		die('Not yet implemented. (_archive)');
	}

} // END class
