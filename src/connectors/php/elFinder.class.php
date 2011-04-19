<?php

class elFinder {
	
	/**
	 * Version number
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
		'open'      => array('target' => false, 'tree' => false, 'init' => false, 'mimes' => false, 'sort' => false),
		'tree'      => array('target' => true),
		'parents'   => array('target' => true),
		'tmb'       => array('current' => true, 'files' => true),
		'sync'      => array('current' => true, 'targets' => true, 'mimes' => false),
		'file'      => array('target' => true),
		'size'      => array('targets' => true, 'id' => true),
		'mkdir'     => array('current' => true, 'name' => true),
		'mkfile'    => array('current' => true, 'name' => true),
		'rm'        => array('targets' => true),
		'rename'    => array(),
		'duplicate' => array('target' => true),
		
		'paste' => array('dst' => true, 'targets' => true, 'cut' => false),
		'upload' => array(
			'current' => true, 
			'FILES' => true
			)
	);
	
	/**
	 * Configuration
	 *
	 * @var array
	 **/
	protected $options = array(
		'disabled' => array(),  // list commands to disable
		'bind'     => array(),  
		'debug'    => false
	);
	
	/**
	 * Commands listeners
	 *
	 * @var array
	 **/
	protected $listeners = array();
	
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_NAME_DIRS_FIRST = 1;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_KIND_DIRS_FIRST = 2;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_SIZE_DIRS_FIRST = 3;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_NAME            = 4;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_KIND            = 5;
	/**
	 * Directory content sort rule
	 *
	 * @var int
	 **/
	public static $SORT_SIZE            = 6;
	/**
	 * undocumented class variable
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
	 * undocumented class variable
	 *
	 * @var string
	 **/
	protected $disabled = array();
	
	
	/**
	 * Constructor
	 *
	 * @param  array  elFinder and roots configurations
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function __construct($opts) {
		$this->time  = $this->utime();
		$this->debug = !empty($opts['debug']);
		
		// bind events listeners
		if (isset($opts['bind']) && is_array($opts['bind'])) {
			foreach ($opts['bind'] as $cmd => $handler) {
				$this->bind($cmd, $handler);
			}
		}

		// "mount" volumes
		if (isset($opts['roots']) && is_array($opts['roots'])) {
			
			foreach ($opts['roots'] as $i => $o) {
				$class = 'elFinderVolume'.$o['driver'];

				if (class_exists($class)) {
					$volume = new $class();
					
					// unique volume id - used as prefix to files hash
					$id = $volume->driverid().$i;
					
					if ($volume->mount($id, $o)) {
						$this->volumes[$id] = $volume;
						if (!$this->default && $volume->isReadable()) {
							$this->default = $this->volumes[$id]; 
						}
					}
				}
			}
		}
		// if at least one redable volume - ii des
		$this->loaded = !empty($this->default);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
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
		if (!isset($this->listeners[$cmd])) {
			$this->listeners[$cmd] = array();
		}
		
		if ((is_array($handler) && count($handler) == 2 && class_exists($handler[0]) && method_exists($handler[0], $handler[1]) )
		|| function_exists($handler)) {
			$this->listeners[$cmd][] = $handler;
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
	 * Return command required arguments info
	 *
	 * @param  string  command name
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function commandArgsList($cmd) {
		return $this->commandExists($cmd) ? $this->commands[$cmd] : array();
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
			return array('error' => 'Invalid backend configuration');
		}
		if (!$this->commandExists($cmd)) {
			return array('error' => 'Unknown command');
		}
		
		$result = $this->$cmd($args);
		
		if ($this->debug || !empty($args['debug'])) {
			$result['debug'] = array(
				'connector' => 'php', 
				'time'      => $this->utime() - $this->time
				);
			
			// foreach ($this->volumes as $id => $volume) {
			// 	$result['debug'][$id] = $volume->debug();
			// }
		}
		
		return $result;
	}
	
	/***************************************************************************/
	/*                                 commands                                */
	/***************************************************************************/

	
	/**
	 * "Open" directory
	 * Return array with following elements
	 *  - cwd          - opened dir info
	 *  - files        - opened dir content [and dirs tree if args[tree]]
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
		$tree   = !empty($args['tree']);
		$volume = $this->volume($target);
		
		if (!$volume) {
			if ($ars['init']) {
				// on init request we can get invalid dir hash -
				// dir which already does not exists but stored in cookie from last session,
				// so open default dir
				$volume = $this->default;
				$target = $volume->defaultPath();
			} else {
				return array('error' => 'Folder not found.');
			}
		} 

		// get current working directory info
		if (($cwd = $volume->info($target)) == false) {
			return array('error' => 'Folder not found.');
		} elseif (!$cwd['read']) {
			return array('error' => array('The folder "$1" can’t be opened because you don’t have permission to see its contents.', $volume->path($target)));
		} elseif ($cwd['mime'] != 'directory') {
			return array('error' => array('"$1" is not a folder.', $volume->path($target)));
		}
		
		$cwd['path']     = $volume->path($target);
		$cwd['url']      = $volume->url();
		$cwd['tmbUrl']   = $volume->tmbUrl();
		$cwd['dotFiles'] = $volume->dotFiles();
		$cwd['disabled'] = $volume->disabled();

		$files = array();
		// get folders trees
		if ($args['tree']) {
			foreach ($this->volumes as $id => $v) {
				if (($tree = $v->tree()) != false) {
					$files = array_merge($files, $tree);
				} elseif ($id == $volume->id()) {
					return array('error' => array('Volume "$1" error.', $v->path($v->root())));
				}
			}
		}

		// get current working directory files list and add to $files if not exists in it
		foreach ($volume->readdir($target, $args['mimes']) as $file) {
			if (!in_array($file, $files)) {
				$files[] = $file;
			}
		}
		
		$result = array(
			'cwd'   => $cwd,
			'files' => $files
		);
		
		if (!empty($args['init'])) {
			$result['api'] = $this->version;
			$result['uplMaxSize'] = ini_get('upload_max_filesize');
		}

		return $result;
	}
	
	/**
	 * Return subdirs for required directory
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function tree($args) {
		$dir = $args['target'];
		
		if (($volume = $this->volume($dir)) == false
		||  ($tree = $volume->tree($dir)) == false) {
			return array('error' => 'Folder not found');
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
		$dir = $args['target'];
				
		if (($volume = $this->volume($dir)) == false) {
			return array('error' => 'Folder not found');
		}


		return ($tree = $volume->parents($dir)) == false 
			? array('error' => $volume->error()) 
			: array('tree' => $tree);
	}
	
	/**
	 * Return new created thumbnails list
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function tmb($args) {
		$images = array();
		$volume = $this->volume(is_array($args['files']) ? $args['files'][0] : '');
		
		if (!$volume) {
			return array('error' => 'Invalid parameters');
		}
		
		foreach ($args['files'] as $hash) {
			if (($tmb = $volume->tmb($hash)) != false) {
				$images[$hash] = $tmb;
			}
		}
		
		return array(
			'current' => $args['current'],
			'images'  => $images
		);
	}
	
	/**
	 * Check for new/removed files
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function sync($args) {
		sleep(1);
		$result  = array('added' => array(), 'removed' => array());
		$targets = array();
		$active  = '';
		$mimes   = !empty($args['mimes']) ? $args['mimes'] : array();

		foreach ($this->volumes as $id => $v) {
			$targets[$id] = array();
			if (strpos($args['current'], $id) === 0) {
				$active = $id;
			}
			foreach ($args['targets'] as $hash) {
				if (strpos($hash, $id) === 0) {
					$targets[$id][] = $hash;
				}
			}
		}
		foreach ($targets as $id => $hashes) {
			$result = array_merge_recursive($result, $this->volumes[$id]->sync($hashes, $id == $active ? $args['current'] : '', $mimes));
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
		$file = $args['target'];
		$volume = $this->volume($file);
		
		if (!$volume || !$volume->isFile($file)) {
			return array('error' => 'File not found', 'headers' => 'HTTP/1.x 404 Not Found', 'raw' => true);
		}
		
		if (!$volume->isReadable($file)) {
			return array('error' => 'Access denied', 'headers' => 'HTTP/1.x 403 Access Denied', 'raw' => true);
		}
		
		if (($info = $volume->info($file)) === false
		||  ($fp = $volume->fopen($file)) === false) {
			return array(
				'error' => 'File not found', 
				'headers' => 'HTTP/1.x 404 Not Found', 
				'raw' => true);
		}
		
		$disp  = preg_match('/^(image|text)/i', $info['mime']) 
			|| $info['mime'] == 'application/x-shockwave-flash' 
				? 'inline' 
				: 'attachments';
		
		$result = array(
			'volume'  => $volume,
			'pointer' => $fp,
			'header'  => array(
				"Content-Type: ".$info['mime'], 
				"Content-Disposition: ".$disp."; filename=".$info['name'],
				// "Content-Location: ".$info['name'],
				'Content-Transfer-Encoding: binary',
				"Content-Length: ".$info['size'],
				"Connection: close"
			)
		);
		return $result;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function size($args) {
		sleep(5);
		$result = array('id' => $args['id'], 'size' => 0);
		$volume = $this->volume(is_array($args['targets']) ? $args['targets'][0] : '');
		
		if (!$volume) {
			return array('error' => 'Invalid parameters');
		}
		
		$result['size'] = $volume->size($args['targets']);
		
		// foreach ($args['targets'] as $hash) {
		// 	$size = $volume->size($hash);
		// 	if ($size === false) {
		// 		return array('error' => 'Folder not found');
		// 	}
		// 	$result['size'] += $size;
		// }
		
		return $result;
	}
	
	/**
	 * Create directory
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mkdir($args) {
		$current = $args['current'];
		
		if(($volume = $this->volume($current)) == false) {
			return array('error' => 'Folder not found');
		}
		sleep(5);
		
		return ($hash = $volume->mkdir($current, $args['name'])) === false
			? array('error' => $volume->error())
			: $this->trigger('mkdir', $volume, array('current' => $current, 'added' => array($volume->info($hash, true))));
			
	}
	
	/**
	 * Create empty file
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function mkfile($args) {
		$current = $args['current'];
		
		if(($volume = $this->volume($current)) == false) {
			return array('error' => 'Folder not found');
		}
		sleep(5);
		
		return ($hash = $volume->mkfile($current, $args['name'])) === false
			? array('error' => $volume->error())
			: $this->trigger('mkfile', $volume, array('current' => $current, 'added' => array($volume->info($hash, true))));
	}
	
	/**
	 * Remove dirs/files
	 * Fire "rm" event on every removed files
	 *
	 * @param array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function rm($args) {
		$removed = array();
		
		if (!is_array($args['targets'])) {
			return array('error' => 'No files to delete');
		}
		sleep(1);

		foreach ($args['targets'] as $hash) {
			if (($volume = $this->volume($hash)) === false) {
				return array('error' => 'File not found');
			}
			
			if (($info = $volume->info($hash, true)) === false) {
				return array('error' => $volume->error());
			}

			if ($volume->rm($hash)) {
				$removed[] = $info;
			} else {
				return array('error' => $volume->error());
			}
		}
		
		return $this->trigger('rm', $volume, array('removed' => $removed));
		// return array('removed' => $removed);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function duplicate($args) {
		$result = array('added' => array(), 'warning' => 'test warning');
		// $added = array();
		
		if (!is_array($args['target'])) {
			return array('error' => 'File is not defined');
		}
		
		if (($volume = $this->volume($args['target'][0])) === false) {
			return array('error' => 'File not found');
		}
		
		foreach ($args['target'] as $hash) {
			if (($hash = $volume->duplicate($hash)) === false) {
				$result['warning'] = $volume->error();
				return $this->trigger('duplicate', $volume, $result);
			} else {
				$result['added'][] = $volume->info($hash, true, true);
			}
		}
		
		return $this->trigger('duplicate', $volume, $result);
		
	}
	
	/**
	 * Copy/move files into new destination
	 *
	 * @param  array  command arguments
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function paste($args) {
		sleep(5);
		return array('error' => 'Not implemented');
		$dst     = $args['dst'];
		$targets = $args['targets'];
		$cut     = !empty($args['cut']);
		$dstRoot = $this->fileRoot($dst);
		
		if (!$dstRoot || !is_array($targets) || empty($targets)) {
			return array('error' => 'Invalid parameters');
		}
		
		$result  = array('dst' => $dst, 'copy' => array(), 'rm' => array());
		
		foreach ($targets as $src) {
			$srcRoot = $this->fileRoot($src);
			if (!$srcRoot) {
				return array('error' => 'Invalid parameters');
			}
			$copy = $dstRoot->paste($srcRoot, $src, $dst);
			// if ($srcRoot == $dstRoot) {
			// 	$copy = $dstRoot->copy($target, $dst);
			// 	if ($copy) {
			// 		$result['copy'][] = $copy;
			// 	} else {
			// 		return array('error' => $dstRoot->error());
			// 	}
			// } else {
			// 	
			// }
			// if ($cut && !$srcRoot->rm($target)) {
			// 	return array('error' => $srcRoot->error());
			// } else {
			// 	$result['rm'][] = $target;
			// }
		}
		return $result;
		
		return $dstRoot->getInfo($args['dst']);
		
		return $args;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function copy($srcRoot, $src, $dstRoot, $dst) {
		
	}
	
	/***************************************************************************/
	/*                                   misc                                  */
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
			if (strpos($hash, $id) === 0 && $v->fileExists($hash)) {
				return $this->volumes[$id];
			}
		}
		return false;
	}
	
	
	/**
	 * Execute all callbacks/listeners for required command
	 *
	 * @param  string  command name
	 * @param  array   data passed to callbacks
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function trigger($cmd, $volume, $result) {
		$data = array(
			'cmd'    => $cmd,
			'volume' => $volume,
			'result' => $result
		);
		if (!empty($this->listeners[$cmd])) {
			foreach ($this->listeners[$cmd] as $handler) {
				$tmp = is_array($handler)
					? $handler[0]->{$handler[1]}($data)
					: $handler($data);
				if (is_array($tmp)) {
					$data['result'] = $tmp;
				}
			}
		}
		return $data['result'];
	}
	
	protected function utime() {
		$time = explode(" ", microtime());
		return (double)$time[1] + (double)$time[0];
	}
	
}


?>