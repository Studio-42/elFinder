<?php

/**
 * elFinder - file manager for web.
 * Core class.
 *
 * @package elfinder
 * @author Dmitry (dio) Levashov
 * @author Troex Nevelin
 * @author Alexey Sukhotin
 **/
class elFinder {
	
	/**
	 * API version number
	 *
	 * @var string
	 **/
	protected $version = '2.0';
	
	/**
	 * Storages (root dirs)
	 *
	 * @var array
	 **/
	protected $volumes = array();
	
	/**
	 * Network mount drivers
	 * 
	 * @var array
	 */
	public static $netDrivers = array();
	
	/**
	 * elFinder global locale
	 * 
	 * @var string
	 */
	public static $locale = '';
	
	/**
	 * elFinder global sessionCacheKey
	 * 
	 * @var string
	 */
	public static $sessionCacheKey = '';
	
	/**
	 * Session key of net mount volumes
	 * @var string
	 */
	protected $netVolumesSessionKey = '';
	
	/**
	 * Mounted volumes count
	 * Required to create unique volume id
	 *
	 * @var int
	 **/
	public static $volumesCnt = 1;
	
	/**
	 * Default root (storage)
	 *
	 * @var elFinderStorageDriver
	 **/
	protected $default = null;
	
	/**
	 * Commands and required arguments list
	 *
	 * @var array
	 **/
	protected $commands = array(
		'open'      => array('target' => false, 'tree' => false, 'init' => false, 'mimes' => false),
		'ls'        => array('target' => true, 'mimes' => false),
		'tree'      => array('target' => true),
		'parents'   => array('target' => true),
		'tmb'       => array('targets' => true),
		'file'      => array('target' => true, 'download' => false),
		'size'      => array('targets' => true),
		'mkdir'     => array('target' => true, 'name' => true),
		'mkfile'    => array('target' => true, 'name' => true, 'mimes' => false),
		'rm'        => array('targets' => true),
		'rename'    => array('target' => true, 'name' => true, 'mimes' => false),
		'duplicate' => array('targets' => true, 'suffix' => false),
		'paste'     => array('dst' => true, 'targets' => true, 'cut' => false, 'mimes' => false),
		'upload'    => array('target' => true, 'FILES' => true, 'mimes' => false, 'html' => false, 'upload' => false, 'name' => false, 'upload_path' => false, 'chunk' => false, 'cid' => false),
		'get'       => array('target' => true, 'conv' => false),
		'put'       => array('target' => true, 'content' => '', 'mimes' => false),
		'archive'   => array('targets' => true, 'type' => true, 'mimes' => false),
		'extract'   => array('target' => true, 'mimes' => false),
		'search'    => array('q' => true, 'mimes' => false),
		'info'      => array('targets' => true),
		'dim'       => array('target' => true),
		'resize'    => array('target' => true, 'width' => true, 'height' => true, 'mode' => false, 'x' => false, 'y' => false, 'degree' => false),
		'netmount'  => array('protocol' => true, 'host' => true, 'path' => false, 'port' => false, 'user' => true, 'pass' => true, 'alias' => false, 'options' => false),
		'url'       => array('target' => true, 'options' => false),
		'callback'  => array('node' => true, 'json' => false, 'bind' => false, 'done' => false)
	);
	
	/**
	 * Plugins instance
	 *
	 * @var array
	 **/
	protected $plugins = array();
	
	/**
	 * Commands listeners
	 *
	 * @var array
	 **/
	protected $listeners = array();
	
	/**
	 * script work time for debug
	 *
	 * @var string
	 **/
	protected $time = 0;
	/**
	 * Is elFinder init correctly?
	 *
	 * @var bool
	 **/
	protected $loaded = false;
	/**
	 * Send debug to client?
	 *
	 * @var string
	 **/
	protected $debug = false;

	/**
	 * session expires timeout
	 *
	 * @var int
	 **/
	protected $timeout = 0;
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $uploadDebug = '';
	
	/**
	 * Errors from not mounted volumes
	 *
	 * @var array
	 **/
	public $mountErrors = array();
	
	/**
	 * URL for callback output window for CORS
	 * redirect to this URL when callback output
	 * 
	 * @var string URL
	 */
	protected $callbackWindowURL = '';
	
	// Errors messages
	const ERROR_UNKNOWN           = 'errUnknown';
	const ERROR_UNKNOWN_CMD       = 'errUnknownCmd';
	const ERROR_CONF              = 'errConf';
	const ERROR_CONF_NO_JSON      = 'errJSON';
	const ERROR_CONF_NO_VOL       = 'errNoVolumes';
	const ERROR_INV_PARAMS        = 'errCmdParams';
	const ERROR_OPEN              = 'errOpen';
	const ERROR_DIR_NOT_FOUND     = 'errFolderNotFound';
	const ERROR_FILE_NOT_FOUND    = 'errFileNotFound';     // 'File not found.'
	const ERROR_TRGDIR_NOT_FOUND  = 'errTrgFolderNotFound'; // 'Target folder "$1" not found.'
	const ERROR_NOT_DIR           = 'errNotFolder';
	const ERROR_NOT_FILE          = 'errNotFile';
	const ERROR_PERM_DENIED       = 'errPerm';
	const ERROR_LOCKED            = 'errLocked';        // '"$1" is locked and can not be renamed, moved or removed.'
	const ERROR_EXISTS            = 'errExists';        // 'File named "$1" already exists.'
	const ERROR_INVALID_NAME      = 'errInvName';       // 'Invalid file name.'
	const ERROR_MKDIR             = 'errMkdir';
	const ERROR_MKFILE            = 'errMkfile';
	const ERROR_RENAME            = 'errRename';
	const ERROR_COPY              = 'errCopy';
	const ERROR_MOVE              = 'errMove';
	const ERROR_COPY_FROM         = 'errCopyFrom';
	const ERROR_COPY_TO           = 'errCopyTo';
	const ERROR_COPY_ITSELF       = 'errCopyInItself';
	const ERROR_REPLACE           = 'errReplace';          // 'Unable to replace "$1".'
	const ERROR_RM                = 'errRm';               // 'Unable to remove "$1".'
	const ERROR_RM_SRC            = 'errRmSrc';            // 'Unable remove source file(s)'
	const ERROR_UPLOAD            = 'errUpload';           // 'Upload error.'
	const ERROR_UPLOAD_FILE       = 'errUploadFile';       // 'Unable to upload "$1".'
	const ERROR_UPLOAD_NO_FILES   = 'errUploadNoFiles';    // 'No files found for upload.'
	const ERROR_UPLOAD_TOTAL_SIZE = 'errUploadTotalSize';  // 'Data exceeds the maximum allowed size.'
	const ERROR_UPLOAD_FILE_SIZE  = 'errUploadFileSize';   // 'File exceeds maximum allowed size.'
	const ERROR_UPLOAD_FILE_MIME  = 'errUploadMime';       // 'File type not allowed.'
	const ERROR_UPLOAD_TRANSFER   = 'errUploadTransfer';   // '"$1" transfer error.'
	// const ERROR_ACCESS_DENIED     = 'errAccess';
	const ERROR_NOT_REPLACE       = 'errNotReplace';       // Object "$1" already exists at this location and can not be replaced with object of another type.
	const ERROR_SAVE              = 'errSave';
	const ERROR_EXTRACT           = 'errExtract';
	const ERROR_ARCHIVE           = 'errArchive';
	const ERROR_NOT_ARCHIVE       = 'errNoArchive';
	const ERROR_ARCHIVE_TYPE      = 'errArcType';
	const ERROR_ARC_SYMLINKS      = 'errArcSymlinks';
	const ERROR_ARC_MAXSIZE       = 'errArcMaxSize';
	const ERROR_RESIZE            = 'errResize';
	const ERROR_UNSUPPORT_TYPE    = 'errUsupportType';
	const ERROR_CONV_UTF8         = 'errConvUTF8';
	const ERROR_NOT_UTF8_CONTENT  = 'errNotUTF8Content';
	const ERROR_NETMOUNT          = 'errNetMount';
	const ERROR_NETUNMOUNT        = 'errNetUnMount';
	const ERROR_NETMOUNT_NO_DRIVER = 'errNetMountNoDriver';
	const ERROR_NETMOUNT_FAILED       = 'errNetMountFailed';

	const ERROR_SESSION_EXPIRES 	= 'errSessionExpires';

	const ERROR_CREATING_TEMP_DIR 	= 'errCreatingTempDir';
	const ERROR_FTP_DOWNLOAD_FILE 	= 'errFtpDownloadFile';
	const ERROR_FTP_UPLOAD_FILE 	= 'errFtpUploadFile';
	const ERROR_FTP_MKDIR 		= 'errFtpMkdir';
	const ERROR_ARCHIVE_EXEC 	= 'errArchiveExec';
	const ERROR_EXTRACT_EXEC 	= 'errExtractExec';

	/**
	 * Constructor
	 *
	 * @param  array  elFinder and roots configurations
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function __construct($opts) {
		if (session_id() == '') {
			session_start();
		}

		$this->time  = $this->utime();
		$this->debug = (isset($opts['debug']) && $opts['debug'] ? true : false);
		$this->timeout = (isset($opts['timeout']) ? $opts['timeout'] : 0);
		$this->netVolumesSessionKey = !empty($opts['netVolumesSessionKey'])? $opts['netVolumesSessionKey'] : 'elFinderNetVolumes';
		$this->callbackWindowURL = (isset($opts['callbackWindowURL']) ? $opts['callbackWindowURL'] : '');
		self::$sessionCacheKey = !empty($opts['sessionCacheKey']) ? $opts['sessionCacheKey'] : 'elFinderCaches';
		
		// check session cache
		$_optsMD5 = md5(serialize($opts['roots']));
		if (! isset($_SESSION[self::$sessionCacheKey]) || $_SESSION[self::$sessionCacheKey]['_optsMD5'] !== $_optsMD5) {
			$_SESSION[self::$sessionCacheKey] = array(
				'_optsMD5' => $_optsMD5
			);
		}
		
		// setlocale and global locale regists to elFinder::locale
		self::$locale = !empty($opts['locale']) ? $opts['locale'] : 'en_US.UTF-8';
		if (false === @setlocale(LC_ALL, self::$locale)) {
			self::$locale = setlocale(LC_ALL, '');
		}

		// bind events listeners
		if (!empty($opts['bind']) && is_array($opts['bind'])) {
			$_req = $_SERVER["REQUEST_METHOD"] == 'POST' ? $_POST : $_GET;
			$_reqCmd = isset($_req['cmd']) ? $_req['cmd'] : '';
			foreach ($opts['bind'] as $cmd => $handlers) {
				$doRegist = (strpos($cmd, '*') !== false);
				if (! $doRegist) {
					$_getcmd = create_function('$cmd', 'list($ret) = explode(\'.\', $cmd);return trim($ret);');
					$doRegist = ($_reqCmd && in_array($_reqCmd, array_map($_getcmd, explode(' ', $cmd))));
				}
				if ($doRegist) {
					if (! is_array($handlers) || is_object($handlers[0])) {
						$handlers = array($handlers);
					}
					foreach($handlers as $handler) {
						if ($handler) {
							if (is_string($handler) && strpos($handler, '.')) {
								list($_domain, $_name, $_method) = array_pad(explode('.', $handler), 3, '');
								if (strcasecmp($_domain, 'plugin') === 0) {
									if ($plugin = $this->getPluginInstance($_name, isset($opts['plugin'][$_name])? $opts['plugin'][$_name] : array())
											and method_exists($plugin, $_method)) {
										$this->bind($cmd, array($plugin, $_method));
									}
								}
							} else {
								$this->bind($cmd, $handler);
							}
						}
					}
				}
			}
		}

		if (!isset($opts['roots']) || !is_array($opts['roots'])) {
			$opts['roots'] = array();
		}

		// check for net volumes stored in session
		foreach ($this->getNetVolumes() as $root) {
			$opts['roots'][] = $root;
		}

		// "mount" volumes
		foreach ($opts['roots'] as $i => $o) {
			$class = 'elFinderVolume'.(isset($o['driver']) ? $o['driver'] : '');

			if (class_exists($class)) {
				$volume = new $class();

				try {
					if ($volume->mount($o)) {
						// unique volume id (ends on "_") - used as prefix to files hash
						$id = $volume->id();
						
						$this->volumes[$id] = $volume;
						if (!$this->default && $volume->isReadable()) {
							$this->default = $this->volumes[$id]; 
						}
					} else {
						$this->mountErrors[] = 'Driver "'.$class.'" : '.implode(' ', $volume->error());
					}
				} catch (Exception $e) {
					$this->mountErrors[] = 'Driver "'.$class.'" : '.$e->getMessage();
				}
			} else {
				$this->mountErrors[] = 'Driver "'.$class.'" does not exists';
			}
		}

		// if at least one readable volume - ii desu >_<
		$this->loaded = !empty($this->default);
	}
	
	/**
	 * Return true if fm init correctly
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function loaded() {
		return $this->loaded;
	}
	
	/**
	 * Return version (api) number
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function version() {
		return $this->version;
	}
	
	/**
	 * Add handler to elFinder command
	 *
	 * @param  string  command name
	 * @param  string|array  callback name or array(object, method)
	 * @return elFinder
	 * @author Dmitry (dio) Levashov
	 **/
	public function bind($cmd, $handler) {
		$allCmds = array_keys($this->commands);
		$cmds = array();
		foreach(explode(' ', $cmd) as $_cmd) {
			if ($_cmd !== '') {
				if ($all = strpos($_cmd, '*') !== false) {
					list(, $sub) = array_pad(explode('.', $_cmd), 2, '');
					if ($sub) {
						$sub = str_replace('\'', '\\\'', $sub);
						$addSub = create_function('$cmd', 'return $cmd . \'.\' . trim(\'' . $sub . '\');');
						$cmds = array_merge($cmds, array_map($addSub, $allCmds));
					} else {
						$cmds = array_merge($cmds, $allCmds);
					}
				} else {
					$cmds[] = $_cmd;
				}
			}
		}
		$cmds = array_unique($cmds);
		
		foreach ($cmds as $cmd) {
			if (!isset($this->listeners[$cmd])) {
				$this->listeners[$cmd] = array();
			}

			if (is_callable($handler)) {
				$this->listeners[$cmd][] = $handler;
			}
		}

		return $this;
	}
	
	/**
	 * Remove event (command exec) handler
	 *
	 * @param  string  command name
	 * @param  string|array  callback name or array(object, method)
	 * @return elFinder
	 * @author Dmitry (dio) Levashov
	 **/
	public function unbind($cmd, $handler) {
		if (!empty($this->listeners[$cmd])) {
			foreach ($this->listeners[$cmd] as $i => $h) {
				if ($h === $handler) {
					unset($this->listeners[$cmd][$i]);
					return $this;
				}
			}
		}
		return $this;
	}
	
	/**
	 * Return true if command exists
	 *
	 * @param  string  command name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function commandExists($cmd) {
		return $this->loaded && isset($this->commands[$cmd]) && method_exists($this, $cmd);
	}
	
	/**
	 * Return root - file's owner (public func of volume())
	 *
	 * @param  string  file hash
	 * @return elFinderStorageDriver
	 * @author Naoki Sawada
	 */
	public function getVolume($hash) {
		return $this->volume($hash);
	}
	
	/**
	 * Return command required arguments info
	 *
	 * @param  string  command name
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function commandArgsList($cmd) {
		return $this->commandExists($cmd) ? $this->commands[$cmd] : array();
	}

	private function session_expires() {
		
		if (!isset($_SESSION[self::$sessionCacheKey . ':LAST_ACTIVITY'])) {
			$_SESSION[self::$sessionCacheKey . ':LAST_ACTIVITY'] = time();
			return false;
		}

		if ( ($this->timeout > 0) && (time() - $_SESSION[self::$sessionCacheKey . ':LAST_ACTIVITY'] > $this->timeout) ) {
			return true;
		}

		$_SESSION[self::$sessionCacheKey . ':LAST_ACTIVITY'] = time();
		return false;	
	}
	
	/**
	 * Exec command and return result
	 *
	 * @param  string  $cmd  command name
	 * @param  array   $args command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function exec($cmd, $args) {
		
		if (!$this->loaded) {
			return array('error' => $this->error(self::ERROR_CONF, self::ERROR_CONF_NO_VOL));
		}

		if ($this->session_expires()) {
			return array('error' => $this->error(self::ERROR_SESSION_EXPIRES));
		}
		
		if (!$this->commandExists($cmd)) {
			return array('error' => $this->error(self::ERROR_UNKNOWN_CMD));
		}
		
		if (!empty($args['mimes']) && is_array($args['mimes'])) {
			foreach ($this->volumes as $id => $v) {
				$this->volumes[$id]->setMimesFilter($args['mimes']);
			}
		}
		
		// call pre handlers for this command
		if (!empty($this->listeners[$cmd.'.pre'])) {
			$volume = isset($args['target'])? $this->volume($args['target']) : false;
			foreach ($this->listeners[$cmd.'.pre'] as $handler) {
				call_user_func_array($handler, array($cmd, &$args, $this, $volume));
			}
		}
		
		$result = $this->$cmd($args);
		
		if (isset($result['removed'])) {
			foreach ($this->volumes as $volume) {
				$result['removed'] = array_merge($result['removed'], $volume->removed());
				$volume->resetRemoved();
			}
		}
		
		// call handlers for this command
		if (!empty($this->listeners[$cmd])) {
			foreach ($this->listeners[$cmd] as $handler) {
				if (call_user_func_array($handler,array($cmd,&$result,$args,$this))) {
					// handler return true to force sync client after command completed
					$result['sync'] = true;
				}
			}
		}
		
		// replace removed files info with removed files hashes
		if (!empty($result['removed'])) {
			$removed = array();
			foreach ($result['removed'] as $file) {
				$removed[] = $file['hash'];
			}
			$result['removed'] = array_unique($removed);
		}
		// remove hidden files and filter files by mimetypes
		if (!empty($result['added'])) {
			$result['added'] = $this->filter($result['added']);
		}
		// remove hidden files and filter files by mimetypes
		if (!empty($result['changed'])) {
			$result['changed'] = $this->filter($result['changed']);
		}
		
		if ($this->debug || !empty($args['debug'])) {
			$result['debug'] = array(
				'connector' => 'php', 
				'phpver'    => PHP_VERSION,
				'time'      => $this->utime() - $this->time,
				'memory'    => (function_exists('memory_get_peak_usage') ? ceil(memory_get_peak_usage()/1024).'Kb / ' : '').ceil(memory_get_usage()/1024).'Kb / '.ini_get('memory_limit'),
				'upload'    => $this->uploadDebug,
				'volumes'   => array(),
				'mountErrors' => $this->mountErrors
				);
			
			foreach ($this->volumes as $id => $volume) {
				$result['debug']['volumes'][] = $volume->debug();
			}
		}
		
		foreach ($this->volumes as $volume) {
			$volume->umount();
		}
		
		return $result;
	}
	
	/**
	 * Return file real path
	 *
	 * @param  string  $hash  file hash
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function realpath($hash)	{
		if (($volume = $this->volume($hash)) == false) {
			return false;
		}
		return $volume->realpath($hash);
	}
	
	/**
	 * Return network volumes config.
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 */
	protected function getNetVolumes() {
		return isset($_SESSION[$this->netVolumesSessionKey]) && is_array($_SESSION[$this->netVolumesSessionKey]) ? $_SESSION[$this->netVolumesSessionKey] : array();
	}

	/**
	 * Save network volumes config.
	 *
	 * @param  array  $volumes  volumes config
	 * @return void
	 * @author Dmitry (dio) Levashov
	 */
	protected function saveNetVolumes($volumes) {
		$_SESSION[$this->netVolumesSessionKey] = $volumes;
	}

	/**
	 * Get plugin instance & set to $this->plugins
	 * 
	 * @param  string $name   Plugin name (dirctory name)
	 * @param  array  $opts   Plugin options (optional)
	 * @return object | bool Plugin object instance Or false
	 * @author Naoki Sawada
	 */
	protected function getPluginInstance($name, $opts = array()) {
		$key = strtolower($name);
		if (! isset($this->plugins[$key])) {
			$p_file = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'plugins' . DIRECTORY_SEPARATOR . $name . DIRECTORY_SEPARATOR . 'plugin.php';
			if (is_file($p_file)) {
				require_once $p_file;
				$class = 'elFinderPlugin' . $name;
				$this->plugins[$key] = new $class($opts);
			} else {
				$this->plugins[$key] = false;
			}
		}
		return $this->plugins[$key];
	}

	/***************************************************************************/
	/*                                 commands                                */
	/***************************************************************************/
	
	/**
	 * Normalize error messages
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function error() {
		$errors = array();

		foreach (func_get_args() as $msg) {
			if (is_array($msg)) {
				$errors = array_merge($errors, $msg);
			} else {
				$errors[] = $msg;
			}
		}
		
		return count($errors) ? $errors : array(self::ERROR_UNKNOWN);
	}
	
	protected function netmount($args) {
		$options  = array();
		$protocol = $args['protocol'];
		
		if ($protocol === 'netunmount') {
			if (isset($_SESSION) && is_array($_SESSION) && isset($_SESSION[$this->netVolumesSessionKey][$args['host']])) {
				$res = true;
				$netVolumes = $this->getNetVolumes();
				$key = $args['host'];
				$volume = $this->volume($args['user']);
				if (method_exists($volume, 'netunmount')) {
					$res = $volume->netunmount($netVolumes, $key);
				}
				if ($res) {
					unset($netVolumes[$key]);
					$this->saveNetVolumes($netVolumes);
					return array('sync' => true);
				}
			}
			return array('error' => $this->error(self::ERROR_NETUNMOUNT));
		}
		
		$driver   = isset(self::$netDrivers[$protocol]) ? self::$netDrivers[$protocol] : '';
		$class    = 'elfindervolume'.$driver;

		if (!class_exists($class)) {
			return array('error' => $this->error(self::ERROR_NETMOUNT, $args['host'], self::ERROR_NETMOUNT_NO_DRIVER));
		}

		if (!$args['path']) {
			$args['path'] = '/';
		}

		foreach ($args as $k => $v) {
			if ($k != 'options' && $k != 'protocol' && $v) {
				$options[$k] = $v;
			}
		}

		if (is_array($args['options'])) {
			foreach ($args['options'] as $key => $value) {
				$options[$key] = $value;
			}
		}

		$volume = new $class();
		
		if (method_exists($volume, 'netmountPrepare')) {
			$options = $volume->netmountPrepare($options);
			if (isset($options['exit'])) {
				if ($options['exit'] === 'callback') {
					$this->callback($options['out']);
				}
				return $options;
			}
		}
		
		$netVolumes = $this->getNetVolumes();
		if ($volume->mount($options)) {
			if (! $key = @ $volume->netMountKey) {
				$key = md5($protocol . '-' . join('-', $options));
			}
			$options['driver'] = $driver;
			$options['netkey'] = $key;
			$netVolumes[$key]  = $options;
			$this->saveNetVolumes($netVolumes);
			$rootstat = $volume->file($volume->root());
			$rootstat['netkey'] = $key;
			return array('added' => array($rootstat));
		} else {
			if (! $key = @ $volume->netMountKey) {
				$key = md5($protocol . '-' . join('-', $options));
			}
			if (isset($netVolumes[$key])) {
				unset($netVolumes[$key]);
				$this->saveNetVolumes($netVolumes);
			}
			return array('error' => $this->error(self::ERROR_NETMOUNT, $args['host'], implode(' ', $volume->error())));
		}

	}

	/**
	 * "Open" directory
	 * Return array with following elements
	 *  - cwd          - opened dir info
	 *  - files        - opened dir content [and dirs tree if $args[tree]]
	 *  - api          - api version (if $args[init])
	 *  - uplMaxSize   - if $args[init]
	 *  - error        - on failed
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function open($args) {
		$target = $args['target'];
		$init   = !empty($args['init']);
		$tree   = !empty($args['tree']);
		$volume = $this->volume($target);
		$cwd    = $volume ? $volume->dir($target, true) : false;
		$hash   = $init ? 'default folder' : '#'.$target;

		// on init request we can get invalid dir hash -
		// dir which can not be opened now, but remembered by client,
		// so open default dir
		if ((!$cwd || !$cwd['read']) && $init) {
			$volume = $this->default;
			$cwd    = $volume->dir($volume->defaultPath(), true);
		}
		
		if (!$cwd) {
			return array('error' => $this->error(self::ERROR_OPEN, $hash, self::ERROR_DIR_NOT_FOUND));
		}
		if (!$cwd['read']) {
			return array('error' => $this->error(self::ERROR_OPEN, $hash, self::ERROR_PERM_DENIED));
		}

		$files = array();

		// get folders trees
		if ($args['tree']) {
			foreach ($this->volumes as $id => $v) {
				$files[] = $v->file($v->root());
			}
		}

		// get current working directory files list and add to $files if not exists in it
		if (($ls = $volume->scandir($cwd['hash'])) === false) {
			return array('error' => $this->error(self::ERROR_OPEN, $cwd['name'], $volume->error()));
		}
		
		foreach ($ls as $file) {
			if (!in_array($file, $files)) {
				$files[] = $file;
			}
		}
		
		$result = array(
			'cwd'     => $cwd,
			'options' => $volume->options($cwd['hash']),
			'files'   => $files
		);

		if (!empty($args['init'])) {
			$result['api'] = $this->version;
			$result['uplMaxSize'] = ini_get('upload_max_filesize');
			$result['uplMaxFile'] = ini_get('max_file_uploads');
			$result['netDrivers'] = array_keys(self::$netDrivers);
			if ($volume) {
				$result['cwd']['root'] = $volume->root();
			}
		}
		
		return $result;
	}
	
	/**
	 * Return dir files names list
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function ls($args) {
		$target = $args['target'];
		
		if (($volume = $this->volume($target)) == false
		|| ($list = $volume->ls($target)) === false) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target));
		}
		return array('list' => $list);
	}
	
	/**
	 * Return subdirs for required directory
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function tree($args) {
		$target = $args['target'];
		
		if (($volume = $this->volume($target)) == false
		|| ($tree = $volume->tree($target)) == false) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target));
		}

		return array('tree' => $tree);
	}
	
	/**
	 * Return parents dir for required directory
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function parents($args) {
		$target = $args['target'];
		
		if (($volume = $this->volume($target)) == false
		|| ($tree = $volume->parents($target)) == false) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target));
		}

		return array('tree' => $tree);
	}
	
	/**
	 * Return new created thumbnails list
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function tmb($args) {
		
		$result  = array('images' => array());
		$targets = $args['targets'];
		
		foreach ($targets as $target) {
			if (($volume = $this->volume($target)) != false
			&& (($tmb = $volume->tmb($target)) != false)) {
				$result['images'][$target] = $tmb;
			}
		}
		return $result;
	}
	
	/**
	 * Required to output file in browser when volume URL is not set 
	 * Return array contains opened file pointer, root itself and required headers
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function file($args) {
		$target   = $args['target'];
		$download = !empty($args['download']);
		$h403     = 'HTTP/1.x 403 Access Denied';
		$h404     = 'HTTP/1.x 404 Not Found';

		if (($volume = $this->volume($target)) == false) { 
			return array('error' => 'File not found', 'header' => $h404, 'raw' => true);
		}
		
		if (($file = $volume->file($target)) == false) {
			return array('error' => 'File not found', 'header' => $h404, 'raw' => true);
		}
		
		if (!$file['read']) {
			return array('error' => 'Access denied', 'header' => $h403, 'raw' => true);
		}
		
		if (($fp = $volume->open($target)) == false) {
			return array('error' => 'File not found', 'header' => $h404, 'raw' => true);
		}

		if ($download) {
			$disp = 'attachment';
			$mime = 'application/force-download';
		} else {
			$disp  = preg_match('/^(image|text)/i', $file['mime']) || $file['mime'] == 'application/x-shockwave-flash' 
					? 'inline' 
					: 'attachment';
			$mime = $file['mime'];
		}
		
		$filenameEncoded = rawurlencode($file['name']);
		if (strpos($filenameEncoded, '%') === false) { // ASCII only
			$filename = 'filename="'.$file['name'].'"';
		} else {
			$ua = $_SERVER["HTTP_USER_AGENT"];
			if (preg_match('/MSIE [4-8]/', $ua)) { // IE < 9 do not support RFC 6266 (RFC 2231/RFC 5987)
				$filename = 'filename="'.$filenameEncoded.'"';
			} elseif (strpos($ua, 'Chrome') === false && strpos($ua, 'Safari') !== false) { // Safari
				$filename = 'filename="'.str_replace('"', '', $file['name']).'"';
			} else { // RFC 6266 (RFC 2231/RFC 5987)
				$filename = 'filename*=UTF-8\'\''.$filenameEncoded;
			}
		}
		
		$result = array(
			'volume'  => $volume,
			'pointer' => $fp,
			'info'    => $file,
			'header'  => array(
				'Content-Type: '.$mime, 
				'Content-Disposition: '.$disp.'; '.$filename,
				'Content-Location: '.$file['name'],
				'Content-Transfer-Encoding: binary',
				'Content-Length: '.$file['size'],
				'Connection: close'
			)
		);
		return $result;
	}
	
	/**
	 * Count total files size
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function size($args) {
		$size = 0;
		
		foreach ($args['targets'] as $target) {
			if (($volume = $this->volume($target)) == false
			|| ($file = $volume->file($target)) == false
			|| !$file['read']) {
				return array('error' => $this->error(self::ERROR_OPEN, '#'.$target));
			}
			
			$size += $volume->size($target);
		}
		return array('size' => $size);
	}
	
	/**
	 * Create directory
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mkdir($args) {
		$target = $args['target'];
		$name   = $args['name'];
		
		if (($volume = $this->volume($target)) == false) {
			return array('error' => $this->error(self::ERROR_MKDIR, $name, self::ERROR_TRGDIR_NOT_FOUND, '#'.$target));
		}

		return ($dir = $volume->mkdir($target, $name)) == false
			? array('error' => $this->error(self::ERROR_MKDIR, $name, $volume->error()))
			: array('added' => array($dir));
	}
	
	/**
	 * Create empty file
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mkfile($args) {
		$target = $args['target'];
		$name   = $args['name'];
		
		if (($volume = $this->volume($target)) == false) {
			return array('error' => $this->error(self::ERROR_MKFILE, $name, self::ERROR_TRGDIR_NOT_FOUND, '#'.$target));
		}

		return ($file = $volume->mkfile($target, $args['name'])) == false
			? array('error' => $this->error(self::ERROR_MKFILE, $name, $volume->error()))
			: array('added' => array($file));
	}
	
	/**
	 * Rename file
	 *
	 * @param  array  $args
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function rename($args) {
		$target = $args['target'];
		$name   = $args['name'];
		
		if (($volume = $this->volume($target)) == false
		||  ($rm  = $volume->file($target)) == false) {
			return array('error' => $this->error(self::ERROR_RENAME, '#'.$target, self::ERROR_FILE_NOT_FOUND));
		}
		$rm['realpath'] = $volume->realpath($target);
		
		return ($file = $volume->rename($target, $name)) == false
			? array('error' => $this->error(self::ERROR_RENAME, $rm['name'], $volume->error()))
			: array('added' => array($file), 'removed' => array($rm));
	}
	
	/**
	 * Duplicate file - create copy with "copy %d" suffix
	 *
	 * @param array  $args  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function duplicate($args) {
		$targets = is_array($args['targets']) ? $args['targets'] : array();
		$result  = array('added' => array());
		$suffix  = empty($args['suffix']) ? 'copy' : $args['suffix'];
		
		foreach ($targets as $target) {
			if (($volume = $this->volume($target)) == false
			|| ($src = $volume->file($target)) == false) {
				$result['warning'] = $this->error(self::ERROR_COPY, '#'.$target, self::ERROR_FILE_NOT_FOUND);
				break;
			}
			
			if (($file = $volume->duplicate($target, $suffix)) == false) {
				$result['warning'] = $this->error($volume->error());
				break;
			}
			
			$result['added'][] = $file;
		}
		
		return $result;
	}
		
	/**
	 * Remove dirs/files
	 *
	 * @param array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function rm($args) {
		$targets = is_array($args['targets']) ? $args['targets'] : array();
		$result  = array('removed' => array());
		
		foreach ($targets as $target) {
			if (($volume = $this->volume($target)) == false) {
				$result['warning'] = $this->error(self::ERROR_RM, '#'.$target, self::ERROR_FILE_NOT_FOUND);
				return $result;
			}
			if (!$volume->rm($target)) {
				$result['warning'] = $this->error($volume->error());
				return $result;
			}
		}

		return $result;
	}

	/**
	* Get remote contents
	*
	* @param  string   $url     target url
	* @param  int      $timeout timeout (sec)
	* @param  int      $redirect_max redirect max count
	* @param  string   $ua
	* @param  resource $fp
	* @return string or bool(false)
	* @retval string contents
	* @retval false  error
	* @author Naoki Sawada
	**/
	protected function get_remote_contents( &$url, $timeout = 30, $redirect_max = 5, $ua = 'Mozilla/5.0', $fp = null ) {
		$method = (function_exists('curl_exec') && !ini_get('safe_mode'))? 'curl_get_contents' : 'fsock_get_contents'; 
		return $this->$method( $url, $timeout, $redirect_max, $ua, $fp );
	}
	
	/**
	 * Get remote contents with cURL
	 *
	 * @param  string   $url     target url
	 * @param  int      $timeout timeout (sec)
	 * @param  int      $redirect_max redirect max count
	 * @param  string   $ua
	 * @param  resource $outfp
	 * @return string or bool(false)
	 * @retval string contents
	 * @retval false  error
	 * @author Naoki Sawada
	 **/
	 protected function curl_get_contents( &$url, $timeout, $redirect_max, $ua, $outfp ){
		$ch = curl_init();
		curl_setopt( $ch, CURLOPT_URL, $url );
		curl_setopt( $ch, CURLOPT_HEADER, false );
		if ($outfp) {
			curl_setopt( $ch, CURLOPT_FILE, $outfp );
		} else {
			curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
			curl_setopt( $ch, CURLOPT_BINARYTRANSFER, true );
		}
		curl_setopt( $ch, CURLOPT_LOW_SPEED_LIMIT, 1 );
		curl_setopt( $ch, CURLOPT_LOW_SPEED_TIME, $timeout );
		curl_setopt( $ch, CURLOPT_SSL_VERIFYPEER, false );
		curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, 1);
		curl_setopt( $ch, CURLOPT_MAXREDIRS, $redirect_max);
		curl_setopt( $ch, CURLOPT_USERAGENT, $ua);
		$result = curl_exec( $ch );
		$url = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
		curl_close( $ch );
		return $outfp? $outfp : $result;
	}
	
	/**
	 * Get remote contents with fsockopen()
	 *
	 * @param  string   $url          url
	 * @param  int      $timeout      timeout (sec)
	 * @param  int      $redirect_max redirect max count
	 * @param  string   $ua
	 * @param  resource $outfp
	 * @return string or bool(false)
	 * @retval string contents
	 * @retval false  error
	 * @author Naoki Sawada
	 */
	protected function fsock_get_contents( &$url, $timeout, $redirect_max, $ua, $outfp ) {

		$connect_timeout = 3;
		$connect_try = 3;
		$method = 'GET';
		$readsize = 4096;

		$getSize = null;
		$headers = '';
		
		$arr = parse_url($url);
		if (!$arr){
			// Bad request
			return false;
		}
		
		// query
		$arr['query'] = isset($arr['query']) ? '?'.$arr['query'] : '';
		// port
		$arr['port'] = isset($arr['port']) ? $arr['port'] : (!empty($arr['https'])? 443 : 80);
		
		$url_base = $arr['scheme'].'://'.$arr['host'].':'.$arr['port'];
		$url_path = isset($arr['path']) ? $arr['path'] : '/';
		$uri = $url_path.$arr['query'];
		
		$query = $method.' '.$uri." HTTP/1.0\r\n";
		$query .= "Host: ".$arr['host']."\r\n";
		if (!empty($ua)) $query .= "User-Agent: ".$ua."\r\n";
		if (!is_null($getSize)) $query .= 'Range: bytes=0-' . ($getSize - 1) . "\r\n";
		
		$query .= $headers;

		$query .= "\r\n";

		$fp = $connect_try_count = 0;
		while( !$fp && $connect_try_count < $connect_try ) {
	
			$errno = 0;
			$errstr = "";
			$fp = @ fsockopen(
			$arr['https'].$arr['host'],
			$arr['port'],
			$errno,$errstr,$connect_timeout);
			if ($fp) break;
			$connect_try_count++;
			if (connection_aborted()) {
				exit();
			}
			sleep(1); // wait 1sec
		}
		
		$fwrite = 0;
		for ($written = 0; $written < strlen($query); $written += $fwrite) {
			$fwrite = fwrite($fp, substr($query, $written));
			if (!$fwrite) {
				break;
			}
		}
		
		$response = '';
		
		if ($timeout) {
			socket_set_timeout($fp, $timeout);
		}
		
		$_response = '';
		$header = '';
		while($_response !== "\r\n"){
			$_response = fgets($fp, $readsize);
			$header .= $_response;
		};
		
		$rccd = array_pad(explode(' ',$header,3), 3, ''); // array('HTTP/1.1','200','OK\r\n...')
		$rc = (int)$rccd[1];
		
		// Redirect
		switch ($rc) {
			case 307: // Temporary Redirect
			case 303: // See Other
			case 302: // Moved Temporarily
			case 301: // Moved Permanently
				$matches = array();
				if (preg_match('/^Location: (.+?)(#.+)?$/im',$header,$matches) && --$redirect_max > 0) {
					$url = trim($matches[1]);
					$hash = isset($matches[2])? trim($matches[2]) : '';
					if (!preg_match('/^https?:\//',$url)) { // no scheme
						if ($url{0} != '/') { // Relative path
							// to Absolute path
							$url = substr($url_path,0,strrpos($url_path,'/')).'/'.$url;
						}
						// add sheme,host
						$url = $url_base.$url;
					}
					fclose($fp);
					return $this->fsock_get_contents( $url, $timeout, $redirect_max, $ua, $outfp );
				}
		}
		
		$body = '';
		if (!$outfp) {
			$outfp = fopen('php://temp', 'rwb');
			$body = true;
		}
		while(fwrite($outfp, fread($fp, $readsize))) {
			if ($timeout) {
				$_status = socket_get_status($fp);
				if ($_status['timed_out']) {
					fclose($outfp);
					fclose($fp);
					return false; // Request Time-out
				}
			}
		}
		if ($body) {
			rewind($outfp);
			$body = stream_get_contents($outfp);
			fclose($outfp);
			$outfp = null;
		}
		
		fclose($fp);
		
		return $outfp? $outfp : $body; // Data
	}
	
	/**
	 * Parse Data URI scheme
	 * 
	 * @param  string $str
	 * @param  array  $extTable
	 * @return array
	 * @author Naoki Sawada
	 */
	protected function parse_data_scheme( $str, $extTable ) {
		$data = $name = '';
		if ($fp = fopen('data://'.substr($str, 5), 'rb')) {
			if ($data = stream_get_contents($fp)) {
				$meta = stream_get_meta_data($fp);
				$ext = isset($extTable[$meta['mediatype']])? '.' . $extTable[$meta['mediatype']] : '';
				$name = substr(md5($data), 0, 8) . $ext;
			}
			fclose($fp);
		}
		return array($data, $name);
	}
	
	/**
	 * Detect file type extension by local path
	 * 
	 * @param  string $path Local path
	 * @return string file type extension with dot
	 * @author Naoki Sawada
	 */
	protected function detectFileExtension($path) {
		static $type, $finfo, $extTable;
		if (!$type) {
			$keys = array_keys($this->volumes);
			$volume = $this->volumes[$keys[0]];
			$extTable = array_flip(array_unique($volume->getMimeTable()));
			
			if (class_exists('finfo')) {
				$tmpFileInfo = @explode(';', @finfo_file(finfo_open(FILEINFO_MIME), __FILE__));
			} else {
				$tmpFileInfo = false;
			}
			$regexp = '/text\/x\-(php|c\+\+)/';
			if ($tmpFileInfo && preg_match($regexp, array_shift($tmpFileInfo))) {
				$type = 'finfo';
				$finfo = finfo_open(FILEINFO_MIME);
			} elseif (function_exists('mime_content_type')
					&& preg_match($regexp, array_shift(explode(';', mime_content_type(__FILE__))))) {
				$type = 'mime_content_type';
			} elseif (function_exists('getimagesize')) {
				$type = 'getimagesize';
			} else {
				$type = 'none';
			}
		}
		
		$mime = '';
		if ($type === 'finfo') {
			$mime = @finfo_file($finfo, $path);
		} elseif ($type === 'mime_content_type') {
			$mime = mime_content_type($path);
		} elseif ($type === 'getimagesize') {
			if ($img = @getimagesize($path)) {
				$mime = $img['mime'];
			}
		}
		
		if ($mime) {
			$mime = explode(';', $mime);
			$mime = trim($mime[0]);
			
			if (in_array($mime, array('application/x-empty', 'inode/x-empty'))) {
				// finfo return this mime for empty files
				$mime = 'text/plain';
			} elseif ($mime == 'application/x-zip') {
				// http://elrte.org/redmine/issues/163
				$mime = 'application/zip';
			}
		}
		
		return ($mime && isset($extTable[$mime]))? ('.' . $extTable[$mime]) : '';
	}
	
	/**
	 * Check chunked upload files
	 * 
	 * @param string $tmpname  uploaded temporary file path
	 * @param string $chunk    uploaded chunk file name
	 * @param string $cid      uploaded chunked file id
	 * @param string $tempDir  temporary dirctroy path
	 * @return array (string JoinedTemporaryFilePath, string FileName) or (empty, empty)
	 * @author Naoki Sawada
	 */
	private function checkChunkedFile($tmpname, $chunk, $cid, $tempDir) {
		if (preg_match('/^(.+)(\.\d+_(\d+))\.part$/s', $chunk, $m)) {
			$encname = md5($cid . '_' . $m[1]);
			$part = $tempDir . '/ELF' . $encname . $m[2];
			if (is_null($tmpname)) {
				// chunked file upload fail
				foreach(glob($tempDir . '/ELF' . $encname . '*') as $cf) {
					@unlink($cf);
				}
				return;
			}
			if (move_uploaded_file($tmpname, $part)) {
				@chmod($part, 0600);
				$total = $m[3];
				$parts = array();
				for ($i = 0; $i <= $total; $i++) {
					$name = $tempDir . '/ELF' . $encname . '.' . $i . '_' . $total;
					if (is_readable($name)) {
						$parts[] = $name;
					} else {
						$parts = null;
						break;
					}
				}
				if ($parts) {
					$check = $tempDir . '/ELF' . $encname;
					if (!is_file($check)) {
						touch($check);
						if ($resfile = tempnam($tempDir, 'ELF')) {
							$target = fopen($resfile, 'wb');
							foreach($parts as $f) {
								$fp = fopen($f, 'rb');
								while (!feof($fp)) {
									fwrite($target, fread($fp, 8192));
								}
								fclose($fp);
								unlink($f);
							}
							fclose($target);
							unlink($check);
							return array($resfile, $m[1]);
						}
						unlink($check);
					}
				}
			}
		}
		return array('', '');
	}
	
	/**
	 * Get temporary dirctroy path
	 * 
	 * @param  string $volumeTempPath
	 * @return string
	 * @author Naoki Sawada
	 */
	private function getTempDir($volumeTempPath = null) {
		$testDirs = array();
		if (function_exists('sys_get_temp_dir')) {
			$testDirs[] = sys_get_temp_dir();
		}
		if ($volumeTempPath) {
			$testDirs[] = rtrim(realpath($volumeTempPath), DIRECTORY_SEPARATOR);
		}
		$tempDir = '';
		$test = DIRECTORY_SEPARATOR . microtime(true);
		foreach($testDirs as $testDir) {
			if (!$testDir) continue;
			$testFile = $testDir.$test;
			if (touch($testFile)) {
				unlink($testFile);
				$tempDir = $testDir;
				$gc = time() - 3600;
				foreach(glob($tempDir . '/ELF*') as $cf) {
					if (filemtime($cf) < $gc) {
						@unlink($cf);
					}
				}
				break;
			}
		}
		return $tempDir;
	}
	
	/**
	 * Save uploaded files
	 *
	 * @param  array
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function upload($args) {
		$target = $args['target'];
		$volume = $this->volume($target);
		$files  = isset($args['FILES']['upload']) && is_array($args['FILES']['upload']) ? $args['FILES']['upload'] : array();
		$result = array('added' => array(), 'header' => empty($args['html']) ? false : 'Content-Type: text/html; charset=utf-8');
		$paths  = $args['upload_path']? $args['upload_path'] : array();
		$chunk  = $args['chunk']? $args['chunk'] : '';
		$cid    = $args['cid']? (int)$args['cid'] : '';
		
		if (!$volume) {
			return array('error' => $this->error(self::ERROR_UPLOAD, self::ERROR_TRGDIR_NOT_FOUND, '#'.$target), 'header' => $header);
		}
		
		// regist Shutdown function
		$GLOBALS['elFinderTempFiles'] = array();
// 		if (version_compare(PHP_VERSION, '5.3.0', '>=')) {
// 			$shutdownfunc = function(){ // <- Parse error on PHP < 5.3 ;-(
// 				foreach(array_keys($GLOBALS['elFinderTempFiles']) as $f){
// 					@unlink($f);
// 				}
// 			};
// 		} else {
			$shutdownfunc = create_function('', '
				foreach(array_keys($GLOBALS[\'elFinderTempFiles\']) as $f){
					@unlink($f);
				}
			');
//		}
		register_shutdown_function($shutdownfunc);
		
		// file extentions table by MIME
		$extTable = array_flip(array_unique($volume->getMimeTable()));
		
		if (empty($files)) {
			if (isset($args['upload']) && is_array($args['upload']) && ($tempDir = $this->getTempDir($volume->getTempPath()))) {
				$names = array();
				foreach($args['upload'] as $i => $url) {
					// check chunked file upload commit
					if ($args['chunk']) {
						if ($url === 'chunkfail' && $args['mimes'] === 'chunkfail') {
							$this->checkChunkedFile(null, $chunk, $cid, $tempDir);
							if (preg_match('/^(.+)(\.\d+_(\d+))\.part$/s', $chunk, $m)) {
								$result['warning'] = $this->error(self::ERROR_UPLOAD_FILE, $m[1], self::ERROR_UPLOAD_TRANSFER);
							}
							return $result;
						} else {
							$tmpfname = $tempDir . '/' . $args['chunk'];
							$files['tmp_name'][$i] = $tmpfname;
							$files['name'][$i] = $url;
							$files['error'][$i] = 0;
							$GLOBALS['elFinderTempFiles'][$tmpfname] = true;
							break;
						}
					}
					
					$tmpfname = $tempDir . DIRECTORY_SEPARATOR . 'ELF_FATCH_' . md5($url.microtime(true));
					
					// check is data:
					if (substr($url, 0, 5) === 'data:') {
						list($data, $args['name'][$i]) = $this->parse_data_scheme($url, $extTable);
					} else {
						$fp = fopen($tmpfname, 'wb');
						$data = $this->get_remote_contents($url, 30, 5, 'Mozilla/5.0', $fp);
					}
					if ($data) {
						$_name = isset($args['name'][$i])? $args['name'][$i] : preg_replace('~^.*?([^/#?]+)(?:\?.*)?(?:#.*)?$~', '$1', rawurldecode($url));
						if ($_name) {
							$_ext = '';
							if (preg_match('/(\.[a-z0-9]{1,7})$/', $_name, $_match)) {
								$_ext = $_match[1];
							}
							if ((is_resource($data) && fclose($data)) || file_put_contents($tmpfname, $data)) {
								$GLOBALS['elFinderTempFiles'][$tmpfname] = true;
								$_name = preg_replace('/[\/\\?*:|"<>]/', '_', $_name);
								list($_a, $_b) = array_pad(explode('.', $_name, 2), 2, '');
								if ($_b === '') {
									if ($_ext) {
										rename($tmpfname, $tmpfname . $_ext);
										$tmpfname = $tmpfname . $_ext;
									}
									$_b = $this->detectFileExtension($tmpfname);
									$_name = $_a.$_b;
								} else {
									$_b = '.'.$_b;
								}
								if (isset($names[$_name])) {
									$_name = $_a.'_'.$names[$_name]++.$_b;
								} else {
									$names[$_name] = 1;
								}
								$files['tmp_name'][$i] = $tmpfname;
								$files['name'][$i] = $_name;
								$files['error'][$i] = 0;
							} else {
								@ unlink($tmpfname);
							}
						}
					}
				}
			}
			if (empty($files)) {
				return array('error' => $this->error(self::ERROR_UPLOAD, self::ERROR_UPLOAD_NO_FILES), 'header' => $header);
			}
		}
		
		foreach ($files['name'] as $i => $name) {
			if (($error = $files['error'][$i]) > 0) {				
				$result['warning'] = $this->error(self::ERROR_UPLOAD_FILE, $name, $error == UPLOAD_ERR_INI_SIZE || $error == UPLOAD_ERR_FORM_SIZE ? self::ERROR_UPLOAD_FILE_SIZE : self::ERROR_UPLOAD_TRANSFER);
				$this->uploadDebug = 'Upload error code: '.$error;
				break;
			}
			
			$tmpname = $files['tmp_name'][$i];
			$path = ($paths && !empty($paths[$i]))? $paths[$i] : '';
			if ($name === 'blob') {
				if ($chunk) {
					if ($tempDir = $this->getTempDir($volume->getTempPath())) {
						list($tmpname, $name) = $this->checkChunkedFile($tmpname, $chunk, $cid, $tempDir);
						if ($name) {
							$result['_chunkmerged'] = basename($tmpname);
							$result['_name'] = $name;
						}
					} else {
						$result['warning'] = $this->error(self::ERROR_UPLOAD_FILE, $chunk, self::ERROR_UPLOAD_TRANSFER);
						$this->uploadDebug = 'Upload error: unable open tmp file';
					}
					return $result;
				} else {
					// for form clipboard with Google Chrome
					$type = $files['type'][$i];
					$ext = isset($extTable[$type])? '.' . $extTable[$type] : '';
					$name = substr(md5(basename($tmpname)), 0, 8) . $ext;
				}
			}
			
			// do hook function 'upload.presave'
			if (! empty($this->listeners['upload.presave'])) {
				foreach($this->listeners['upload.presave'] as $handler) {
					call_user_func_array($handler, array(&$path, &$name, $tmpname, $this, $volume));
				}
			}
			
			if (($fp = fopen($tmpname, 'rb')) == false) {
				$result['warning'] = $this->error(self::ERROR_UPLOAD_FILE, $name, self::ERROR_UPLOAD_TRANSFER);
				$this->uploadDebug = 'Upload error: unable open tmp file';
				if (! is_uploaded_file($tmpname)) {
					if (@ unlink($tmpname)) unset($GLOBALS['elFinderTempFiles'][$tmpfname]);
					continue;
				}
				break;
			}
			if ($path) {
				$_target = $volume->getUploadTaget($target, $path, $result);
			} else {
				$_target = $target;
			}
			if (! $_target || ($file = $volume->upload($fp, $_target, $name, $tmpname)) === false) {
				$result['warning'] = $this->error(self::ERROR_UPLOAD_FILE, $name, $volume->error());
				fclose($fp);
				if (! is_uploaded_file($tmpname)) {
					if (@ unlink($tmpname)) unset($GLOBALS['elFinderTempFiles'][$tmpname]);;
					continue;
				}
				break;
			}
			
			is_resource($fp) && fclose($fp);
			if (! is_uploaded_file($tmpname) && @ unlink($tmpname)) unset($GLOBALS['elFinderTempFiles'][$tmpname]);
			$result['added'][] = $file;
		}
		if ($GLOBALS['elFinderTempFiles']) {
			foreach(array_keys($GLOBALS['elFinderTempFiles']) as $_temp) {
				@ unlink($_temp);
			}
		}
		$result['removed'] = $volume->removed();
		return $result;
	}
		
	/**
	 * Copy/move files into new destination
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function paste($args) {
		$dst     = $args['dst'];
		$targets = is_array($args['targets']) ? $args['targets'] : array();
		$cut     = !empty($args['cut']);
		$error   = $cut ? self::ERROR_MOVE : self::ERROR_COPY;
		$result  = array('added' => array(), 'removed' => array());
		
		if (($dstVolume = $this->volume($dst)) == false) {
			return array('error' => $this->error($error, '#'.$targets[0], self::ERROR_TRGDIR_NOT_FOUND, '#'.$dst));
		}
		
		foreach ($targets as $target) {
			if (($srcVolume = $this->volume($target)) == false) {
				$result['warning'] = $this->error($error, '#'.$target, self::ERROR_FILE_NOT_FOUND);
				break;
			}
			
			if (($file = $dstVolume->paste($srcVolume, $target, $dst, $cut)) == false) {
				$result['warning'] = $this->error($dstVolume->error());
				break;
			}
			
			$result['added'][] = $file;
		}
		return $result;
	}
	
	/**
	 * Return file content
	 *
	 * @param  array  $args  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function get($args) {
		$target = $args['target'];
		$volume = $this->volume($target);
		
		if (!$volume || ($file = $volume->file($target)) == false) {
			return array('error' => $this->error(self::ERROR_OPEN, '#'.$target, self::ERROR_FILE_NOT_FOUND));
		}
		
		if (($content = $volume->getContents($target)) === false) {
			return array('error' => $this->error(self::ERROR_OPEN, $volume->path($target), $volume->error()));
		}
		
		if ($args['conv'] && function_exists('mb_detect_encoding') && function_exists('mb_convert_encoding')) {
			$mime = isset($file['mime'])? $file['mime'] : '';
			if ($mime && strtolower(substr($mime, 0, 4)) === 'text') {
				if ($enc = mb_detect_encoding ( $content , mb_detect_order(), true)) {
					if (strtolower($enc) !== 'utf-8') {
						$content = mb_convert_encoding($content, 'UTF-8', $enc);
					}
				}
			}
		}
		
		$json = json_encode($content);

		if ($json === false || strlen($json) < strlen($content)) {
			if ($args['conv']) {
				return array('error' => $this->error(self::ERROR_CONV_UTF8,self::ERROR_NOT_UTF8_CONTENT, $volume->path($target)));
			} else {
				return array('doconv' => true);
			}
		}
		
		return array('content' => $content);
	}
	
	/**
	 * Save content into text file
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function put($args) {
		$target = $args['target'];
		
		if (($volume = $this->volume($target)) == false
		|| ($file = $volume->file($target)) == false) {
			return array('error' => $this->error(self::ERROR_SAVE, '#'.$target, self::ERROR_FILE_NOT_FOUND));
		}
		
		if (($file = $volume->putContents($target, $args['content'])) == false) {
			return array('error' => $this->error(self::ERROR_SAVE, $volume->path($target), $volume->error()));
		}
		
		return array('changed' => array($file));
	}

	/**
	 * Extract files from archive
	 *
	 * @param  array  $args  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov, 
	 * @author Alexey Sukhotin
	 **/
	protected function extract($args) {
		$target = $args['target'];
		$mimes  = !empty($args['mimes']) && is_array($args['mimes']) ? $args['mimes'] : array();
		$error  = array(self::ERROR_EXTRACT, '#'.$target);

		if (($volume = $this->volume($target)) == false
		|| ($file = $volume->file($target)) == false) {
			return array('error' => $this->error(self::ERROR_EXTRACT, '#'.$target, self::ERROR_FILE_NOT_FOUND));
		}  

		return ($file = $volume->extract($target))
			? array('added' => array($file))
			: array('error' => $this->error(self::ERROR_EXTRACT, $volume->path($target), $volume->error()));
	}
	
	/**
	 * Create archive
	 *
	 * @param  array  $args  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov, 
	 * @author Alexey Sukhotin
	 **/
	protected function archive($args) {
		$type    = $args['type'];
		$targets = isset($args['targets']) && is_array($args['targets']) ? $args['targets'] : array();
	
		if (($volume = $this->volume($targets[0])) == false) {
			return $this->error(self::ERROR_ARCHIVE, self::ERROR_TRGDIR_NOT_FOUND);
		}
	
		return ($file = $volume->archive($targets, $args['type']))
			? array('added' => array($file))
			: array('error' => $this->error(self::ERROR_ARCHIVE, $volume->error()));
	}
	
	/**
	 * Search files
	 *
	 * @param  array  $args  command arguments
	 * @return array
	 * @author Dmitry Levashov
	 **/
	protected function search($args) {
		$q      = trim($args['q']);
		$mimes  = !empty($args['mimes']) && is_array($args['mimes']) ? $args['mimes'] : array();
		$result = array();

		foreach ($this->volumes as $volume) {
			$result = array_merge($result, $volume->search($q, $mimes));
		}
		
		return array('files' => $result);
	}
	
	/**
	 * Return file info (used by client "places" ui)
	 *
	 * @param  array  $args  command arguments
	 * @return array
	 * @author Dmitry Levashov
	 **/
	protected function info($args) {
		$files = array();
		
		foreach ($args['targets'] as $hash) {
			if (($volume = $this->volume($hash)) != false
			&& ($info = $volume->file($hash)) != false) {
				$files[] = $info;
			}
		}
		
		return array('files' => $files);
	}
	
	/**
	 * Return image dimmensions
	 *
	 * @param  array  $args  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function dim($args) {
		$target = $args['target'];
		
		if (($volume = $this->volume($target)) != false) {
			$dim = $volume->dimensions($target);
			return $dim ? array('dim' => $dim) : array();
		}
		return array();
	}
	
	/**
	 * Resize image
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	protected function resize($args) {
		$target = $args['target'];
		$width  = $args['width'];
		$height = $args['height'];
		$x      = (int)$args['x'];
		$y      = (int)$args['y'];
		$mode   = $args['mode'];
		$bg     = null;
		$degree = (int)$args['degree'];
		
		if (($volume = $this->volume($target)) == false
		|| ($file = $volume->file($target)) == false) {
			return array('error' => $this->error(self::ERROR_RESIZE, '#'.$target, self::ERROR_FILE_NOT_FOUND));
		}

		return ($file = $volume->resize($target, $width, $height, $x, $y, $mode, $bg, $degree))
			? array('changed' => array($file))
			: array('error' => $this->error(self::ERROR_RESIZE, $volume->path($target), $volume->error()));
	}
	
	/**
	* Return content URL
	*
	* @param  array  $args  command arguments
	* @return array
	* @author Naoki Sawada
	**/
	protected function url($args) {
		$target = $args['target'];
		$options = isset($args['options'])? $args['options'] : array();
		if (($volume = $this->volume($target)) != false) {
			$url = $volume->getContentUrl($target, $options);
			return $url ? array('url' => $url) : array();
		}
		return array();
	}

	/**
	 * Output callback result with JavaScript that control elFinder
	 * or HTTP redirect to callbackWindowURL
	 * 
	 * @param  array  command arguments
	 * @author Naoki Sawada
	 */
	protected function callback($args) {
		$checkReg = '/[^a-zA-Z0-9;._-]/';
		$node = (isset($args['node']) && !preg_match($checkReg, $args['node']))? $args['node'] : '';
		$json = (isset($args['json']) && @json_decode($args['json']))? $args['json'] : '{}';
		$bind  = (isset($args['bind']) && !preg_match($checkReg, $args['bind']))? $args['bind'] : '';
		$done = (!empty($args['done']));
		
		while( ob_get_level() ) {
			if (! ob_end_clean()) {
				break;
			}
		}
		
		if ($done || ! $this->callbackWindowURL) {
			$script = '';
			if ($node) {
				$script .= '
					var w = window.opener || weindow.parent || window
					var elf = w.document.getElementById(\''.$node.'\').elfinder;
					if (elf) {
						var data = '.$json.';
						data.warning && elf.error(data.warning);
						data.removed && data.removed.length && elf.remove(data);
						data.added   && data.added.length   && elf.add(data);
						data.changed && data.changed.length && elf.change(data);';
				if ($bind) {
					$script .= '
						elf.trigger(\''.$bind.'\', data);';
				}
				$script .= '
						data.sync && elf.sync();
					}';
			}
			$script .= 'window.close();';
			
			$out = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><script>'.$script.'</script></head><body><a href="#" onlick="window.close();return false;">Close this window</a></body></html>';
			
			header('Content-Type: text/html; charset=utf-8');
			header('Content-Length: '.strlen($out));
			header('Cache-Control: private');
			header('Pragma: no-cache');
			
			echo $out;
			
		} else {
			$url = $this->callbackWindowURL;
			$url .= ((strpos($url, '?') === false)? '?' : '&')
				 . '&node=' . rawurlencode($node)
				 . (($json !== '{}')? ('&json=' . rawurlencode($json)) : '')
				 . ($bind? ('&bind=' .  rawurlencode($bind)) : '')
				 . '&done=1';
			
			header('Location: ' . $url);
			
		}
		exit();
	}
	
	/***************************************************************************/
	/*                                   utils                                 */
	/***************************************************************************/
	
	/**
	 * Return root - file's owner
	 *
	 * @param  string  file hash
	 * @return elFinderStorageDriver
	 * @author Dmitry (dio) Levashov
	 **/
	protected function volume($hash) {
		foreach ($this->volumes as $id => $v) {
			if (strpos(''.$hash, $id) === 0) {
				return $this->volumes[$id];
			} 
		}
		return false;
	}
	
	/**
	 * Return files info array 
	 *
	 * @param  array  $data  one file info or files info
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function toArray($data) {
		return isset($data['hash']) || !is_array($data) ? array($data) : $data;
	}
	
	/**
	 * Return fils hashes list
	 *
	 * @param  array  $files  files info
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function hashes($files) {
		$ret = array();
		foreach ($files as $file) {
			$ret[] = $file['hash'];
		}
		return $ret;
	}
	
	/**
	 * Remove from files list hidden files and files with required mime types
	 *
	 * @param  array  $files  files info
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function filter($files) {
		foreach ($files as $i => $file) {
			if (!empty($file['hidden']) || !$this->default->mimeAccepted($file['mime'])) {
				unset($files[$i]);
			}
		}
		return array_merge($files, array());
	}
	
	protected function utime() {
		$time = explode(" ", microtime());
		return (double)$time[1] + (double)$time[0];
	}
	
} // END class
