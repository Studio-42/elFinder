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
	 * Directory for tmp files
	 * If not set driver will try to use tmbDir as tmpDir
	 *
	 * @var string
	 **/
	protected $tmpPath = '';

	/**
	 * Last API error message
	 *
	 * @var string
	 **/
	protected $apiError = '';

	/**
	 * Tmp folder path
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
	* Meta Data Cache
	*
	* @var array
	**/
	protected $metaDataCache = array();

	/**
	 * Constructor
	 * Extend options with required fields
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 * @author Cem (DiscoFever)
	 **/
	public function __construct() {
		
		require dirname(__FILE__).DIRECTORY_SEPARATOR.'Dropbox'.DIRECTORY_SEPARATOR.'autoload.php';
		
		$opts = array(
			'consumerKey'       => '',
			'consumerSecret'    => '',
			'accessToken'       => '',
			'accessTokenSecret' => '',
			'root'              => 'dropbox',
			'path'			    => '/',
			'treeDeep'          => 0,
			'tmbPath'           => '.tmb',
			'tmpPath'           => ''
		);
		$this->options = array_merge($this->options, $opts);
		$this->options['mimeDetect'] = 'internal';
	}

	public function netmountPrepare($options) {
		if (empty($options['consumerKey']) && defined('ELFINDER_DROPBOX_CONSUMERKEY')) $options['consumerKey'] = ELFINDER_DROPBOX_CONSUMERKEY;
		if (empty($options['consumerSecret']) && defined('ELFINDER_DROPBOX_CONSUMERSECRET')) $options['consumerSecret'] = ELFINDER_DROPBOX_CONSUMERSECRET;
		
		if ($options['user'] === 'init') {

			if (empty($options['consumerKey']) || empty($options['consumerSecret'])) {
				return array('exit' => true, 'body' => '{msg:errNetMountNoDriver}');
			}
			
			if (class_exists('OAuth')) {
				$this->oauth = new Dropbox_OAuth_PHP($options['consumerKey'], $options['consumerSecret']);
			} else {
				if (! class_exists('HTTP_OAuth_Consumer')) {
					// We're going to try to load in manually
					include 'HTTP/OAuth/Consumer.php';
				}
				if (class_exists('HTTP_OAuth_Consumer')) {
					$this->oauth = new Dropbox_OAuth_PEAR($options['consumerKey'], $options['consumerSecret']);
				}
			}
			
			if (! $this->oauth) {
				return array('exit' => true, 'body' => '{msg:errNetMountNoDriver}');
			}

			if ($options['pass'] === 'init') {
			
				$callback  = $options['url']
				           . '?cmd=netmount&protocol=dropbox&host=dropbox.com&user=init&pass=return';
				
				try {
					$tokens = $this->oauth->getRequestToken();
					$url= $this->oauth->getAuthorizeUrl(rawurlencode($callback));
				} catch (Dropbox_Exception $e) {
					return array('exit' => true, 'body' => '{msg:errAccess}');
				}
				
				$_SESSION['elfinder_dropbox_oath_token'] = $tokens;
				$html = '<input class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" value="{msg:btnApprove}" type="button" onclick="window.open(\''.$url.'\')">';
				
				return array('exit' => true, 'body' => $html);
			} else {
				$this->oauth->setToken($_SESSION['elfinder_dropbox_oath_token']);
				$tokens = $this->oauth->getAccessToken();
				$script = '
					var token =window.opener.document.getElementById(\'elfinder-cmd-netmout-dropbox-user\');
					var seckey=window.opener.document.getElementById(\'elfinder-cmd-netmout-dropbox-pass\');
					token.value = \''.$tokens['token'].'\';
					seckey.value = \''.$tokens['token_secret'].'\';
					window.close();';
				
				$out = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><script>'.$script.'</script></head><body><a href="#" onlick="window.close();return false;">Close this window</a></body></html>';
				 
				while( ob_get_level() ) {
					if (! ob_end_clean()) {
						break;
					}
				}
				 
				header('Content-Type: text/html; charset=utf-8');
				header('Content-Length: '.strlen($out));
				header('Cache-Control: private');
				header('Pragma: no-cache');
				echo $out;
				 
				exit();
			}
		}
		$options['accessToken'] = $options['user'];
		$options['accessTokenSecret'] = $options['pass'];
		return $options;
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
		if (!$this->options['consumerKey']
		||  !$this->options['consumerSecret']
		||  !$this->options['accessToken']
		||  !$this->options['accessTokenSecret']) {
			return $this->setError('Required options undefined.');
		}
		
		if (! $this->oauth) {
			if (class_exists('OAuth')) {
				$this->oauth = new Dropbox_OAuth_PHP($this->options['consumerKey'], $this->options['consumerSecret']);
			} else {
				if (! class_exists('HTTP_OAuth_Consumer')) {
					// We're going to try to load in manually
					include 'HTTP/OAuth/Consumer.php';
				}
				if (class_exists('HTTP_OAuth_Consumer')) {
					$this->oauth = new Dropbox_OAuth_PEAR($this->options['consumerKey'], $this->options['consumerSecret']);
				}
			}
		}
		
		if (! $this->oauth) {
			return $this->setError('OAuth extension not loaded.');
		}

		// normalize root path
		$this->root = $this->options['path'] = $this->_normpath($this->options['path']);

		if (empty($this->options['alias'])) {
			$this->options['alias'] = 'Dropbox.com';
		}

		$this->rootName = $this->options['alias'];
		$this->options['separator'] = '/';

		try {
			$this->oauth->setToken($this->options['accessToken'], $this->options['accessTokenSecret']);
			$this->dropbox = new Dropbox_API($this->oauth, $this->options['root']);
		} catch (Dropbox_Exception $e) {
			return $this->setError('Dropbox error: '.$e->getMessage());
		}

		// make ney mount key
		$this->netMountKey = md5(join('-', array('dropbox', $this->options['path'])));
		
		return true;

	}


	/**
	 * Configure after successfull mount.
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function configure() {
		parent::configure();

		if (!empty($this->options['tmpPath'])) {
			if ((is_dir($this->options['tmpPath']) || @mkdir($this->options['tmpPath'])) && is_writable($this->options['tmpPath'])) {
				$this->tmp = $this->options['tmpPath'];
			}
		}

		if (!$this->tmp && $this->tmbPath) {
			$this->tmp = $this->tmbPath;
		}

		if (!$this->tmp) {
			$this->disabled[] = 'archive';
			$this->disabled[] = 'extract';
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
	public function umount() {

	}
	
	/**
	 * Get local temp filename
	 *
	 * @return string | false
	 * @author Naoki Sawada
	 **/
	protected function getLocalName($path) {
		if ($this->tmp) {
			return $this->tmp.DIRECTORY_SEPARATOR.md5($this->id.$path);
		}
		return false;
	}
	
	/**
	 * Get meta data from Dropbox
	 *
	 * @return array | false
	 * @author Naoki Sawada
	 **/
	protected function getMetaData($path) {
		if (isset($this->metaDataCache[$path])) {
			return $this->metaDataCache[$path];
		}
		try {
			$res = $this->dropbox->getMetaData($path);
			if (!empty($res['is_deleted'])) {
				$res = array();
			}
		} catch (Dropbox_Exception $e) {
			$this->setError('Dropbox error: '.$e->getMessage());
			$res = array();
		}
		$this->metaDataCache[$path] = $res;
		return $res;
	}

	/**
	 * Parse line from ftp_rawlist() output and return file stat (array)
	 *
	 * @param  string  $raw  line from ftp_rawlist() output
	 * @return array
	 * @author Dmitry Levashov
	 **/
	protected function parseRaw($raw, $single = true) {
		$stat = array();

		$stat['rev']   = $raw['rev'];
		$stat['name']  = basename($raw['path']);
		$stat['mime']  = $raw['is_dir']? 'directory' : $raw['mime_type'];
		$stat['size']  = $stat['mime'] == 'directory' ? 0 : $raw['bytes'];
		$stat['ts']    = isset($raw['modified'])? strtotime($raw['modified']) : time();
		if ($single) {
			$stat['dirs']  = ($raw['is_dir'] && !empty($raw['contents']))? 1 : 0;
		} else {
			$stat['dirs']  = ($raw['is_dir'])? 1 : 0;
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
	protected function cacheDir($path) {
		$this->dirsCache[$path] = array();
		if (! $res = $this->getMetaData($path)) {
			return $res;
		}

		if (! empty($res['contents'])) {
			foreach($res['contents'] as $raw) {
				if ($stat = $this->parseRaw($raw, false)) {
					$stat = $this->updateCache($raw['path'], $stat);
					if (empty($stat['hidden'])) {
						$this->dirsCache[$path][] = $raw['path'];
					}
				}
			}
		}
		return $this->dirsCache[$path];
	}

	/**
	* Clean cache
	*
	* @return void
	* @author Dmitry (dio) Levashov
	**/
	protected function clearcache() {
		parent::clearcache();
		$this->metaDataCache = array();
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

		try {
			if ($path === '/') $path = '';
			$res = $this->dropbox->search($q, null, $path);
		} catch (Dropbox_Exception $e) {
			return $this->setError('Dropbox error: '.$e->getMessage());
		}
		
		if ($res) {
			foreach($res as $raw) {
				if ($stat = $this->parseRaw($raw)) {
					if ($stat['mime'] === 'directory' || !$this->mimeAccepted($stat['mime'], $mimes)) {
						continue;
					}
					$result[] = $this->stat($raw['path']);
				}
			}
		}
		
		return $result;
	}
	
	/**
	 * Resize image
	 *
	 * @param  string   $hash    image file
	 * @param  int      $width   new width
	 * @param  int      $height  new height
	 * @param  int      $x       X start poistion for crop
	 * @param  int      $y       Y start poistion for crop
	 * @param  string   $mode    action how to mainpulate image
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 * @author nao-pon
	 * @author Troex Nevelin
	 **/
	public function resize($hash, $width, $height, $x, $y, $mode = 'resize', $bg = '', $degree = 0) {
		if ($this->commandDisabled('resize')) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
	
		if (($file = $this->file($hash)) == false) {
			return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
		}
	
		if (!$file['write'] || !$file['read']) {
			return $this->setError(elFinder::ERROR_PERM_DENIED);
		}
	
		$path = $this->decode($hash);
	
		if (!$this->canResize($path, $file)) {
			return $this->setError(elFinder::ERROR_UNSUPPORT_TYPE);
		}
		
		$path4stat = $path;
		if (! $path = $this->getLocalName($path)) {
			return false;
		}
		
		if (! $contents = $this->_getContents($path4stat)) {
			return false;
		}
		
		if (! @ file_put_contents($path, $contents, LOCK_EX)) {
			return false;
		}
		
		switch($mode) {
				
			case 'propresize':
				$result = $this->imgResize($path, $width, $height, true, true);
				break;
	
			case 'crop':
				$result = $this->imgCrop($path, $width, $height, $x, $y);
				break;
	
			case 'fitsquare':
				$result = $this->imgSquareFit($path, $width, $height, 'center', 'middle', ($bg ? $bg : $this->options['tmbBgColor']));
				break;
	
			case 'rotate':
				$result = $this->imgRotate($path, $degree, ($bg ? $bg : $this->options['tmbBgColor']));
				break;
	
			default:
				$result = $this->imgResize($path, $width, $height, false, true);
				break;
		}
	
		if ($result && $fp = @fopen($path, 'rb')) {
			
			clearstatcache();
			$res = $this->_save($fp, $path4stat);
			@fclose($fp);

			file_exists($path) && @unlink($path);
			
			if (!empty($file['tmb']) && $file['tmb'] != "1") {
				$this->rmTmb($file['tmb']);
			}
			$this->clearcache();
			return $this->stat($path4stat);
		}
		
		is_file($path) && @unlink($path);
		
		return false;
	}
	
	/**
	 * Return thumbnail file name for required file
	 *
	 * @param  array  $stat  file stat
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function tmbname($stat) {
		return 'dropbox_'.$stat['rev'].'.png';
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
		return dirname($path);
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
		$path = str_replace(DIRECTORY_SEPARATOR, '/', $path);
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
		return $path;
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
		$stat = array();
		if (! $res = $this->getMetaData($path)) {
			return $res;
		}
		return $this->parseRaw($res);
		//$stat = $this->parseRaw($res);
		//return $this->updateCache($path, $stat);
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
		if ($local = $this->getLocalName($path)) {
			if (file_put_contents($local, $this->dropbox->getFile($path), LOCK_EX)) {
				if ($size = @getimagesize($local)) {
					return $size[0].'x'.$size[1];
				}
				unlink($local);
			}
		}
		return '';
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
	 * @param  string  $path  file path
	 * @param  bool    $write open file for writing
	 * @return resource|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fopen($path, $mode='rb') {

		if ($this->tmp) {
			$contents = $this->_getContents($path);
			
			if ($contents === false) {
				return false;
			}
			
			if ($local = $this->getLocalName($path)) {
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
	protected function _fclose($fp, $path='') {
		@fclose($fp);
		if ($path) {
			@unlink($this->getLocalName($path));
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
			return $this->setError('Dropbox error: '.$e->getMessage());
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
	protected function _mkfile($path, $name) {
		return $this->_filePutContents($path.'/'.$name, '');
	}

	/**
	 * Create symlink. FTP driver does not support symlinks.
	 *
	 * @param  string  $target  link target
	 * @param  string  $path    symlink path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
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
		try {
			$this->dropbox->copy($source, $this->_normpath($targetDir.'/'.$name));
		} catch (Dropbox_Exception $e) {
			@unlink($local);
			return $this->setError('Dropbox error: '.$e->getMessage());
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
	protected function _move($source, $targetDir, $name) {
		$target = $this->_normpath($targetDir.'/'.$name);
		try {
			$this->dropbox->move($source, $target);
		} catch (Dropbox_Exception $e) {
			return $this->setError('Dropbox error: '.$e->getMessage());
		}
		unset($this->metaDataCache[$source], $this->metaDataCache[$target]);
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
	 * @param  resource  $fp   file pointer
	 * @param  string    $dir  target dir path
	 * @param  string    $name file name
	 * @return bool|string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _save($fp, $path, $name = '', $mime = '', $w = '', $h = '') {
		if ($name) $path .= '/'.$name;
		$path = $this->_normpath($path);
		try {
			$this->dropbox->putFile(str_replace(' ', '%20', $path), $fp);
		} catch (Dropbox_Exception $e) {
			return $this->setError('Dropbox error: '.$e->getMessage());
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

		if ($local = $this->getLocalName($path)) {
			$local .= '.txt';

			if (@file_put_contents($local, $content, LOCK_EX) !== false
			&& ($fp = @fopen($local, 'rb'))) {
				clearstatcache();
				$res = $this->_save($fp, $path);
				@fclose($fp);
			}
			file_exists($local) && @unlink($local);
		}

		return $res;
	}

	/**
	 * Detect available archivers
	 *
	 * @return void
	 **/
	protected function _checkArchivers() {
		// die('Not yet implemented. (_checkArchivers)');
		return array();
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
		return false;
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
		if (is_link($path)) {
			return true;
		}
		if (is_dir($path)) {
			foreach (scandir($path) as $name) {
				if ($name != '.' && $name != '..') {
					$p = $path.DIRECTORY_SEPARATOR.$name;
					if (is_link($p)) {
						return true;
					}
					if (is_dir($p) && $this->_findSymlinks($p)) {
						return true;
					} elseif (is_file($p)) {
						$this->archiveSize += filesize($p);
					}
				}
			}
		} else {
			$this->archiveSize += filesize($path);
		}

		return false;
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
		return false;
	}

} // END class
