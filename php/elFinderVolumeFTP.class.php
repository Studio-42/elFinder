<?php

function chmodnum($chmod) {
    $trans = array('-' => '0', 'r' => '4', 'w' => '2', 'x' => '1');
    $chmod = substr(strtr($chmod, $trans), 1);
    $array = str_split($chmod, 3);
    return array_sum(str_split($array[0])) . array_sum(str_split($array[1])) . array_sum(str_split($array[2]));
}

elFinder::$netDrivers['ftp'] = 'FTP';

/**
 * Simple elFinder driver for FTP
 *
 * @author Dmitry (dio) Levashov
 * @author Cem (discofever)
 **/
class elFinderVolumeFTP extends elFinderVolumeDriver {
	
	/**
	 * Driver id
	 * Must be started from letter and contains [a-z0-9]
	 * Used as part of volume id
	 *
	 * @var string
	 **/
	protected $driverId = 'f';
	
	/**
	 * FTP Connection Instance
	 *
	 * @var ftp
	 **/
	protected $connect = null;
	
	/**
	 * Directory for tmp files
	 * If not set driver will try to use tmbDir as tmpDir
	 *
	 * @var string
	 **/
	protected $tmpPath = '';
	
	/**
	 * Last FTP error message
	 *
	 * @var string
	 **/
	protected $ftpError = '';
	
	/**
	 * FTP server output list as ftp on linux
	 *
	 * @var bool
	 **/
	protected $ftpOsUnix;
	
	/**
	 * Tmp folder path
	 *
	 * @var string
	 **/
	protected $tmp = '';
	
	/**
	 * Constructor
	 * Extend options with required fields
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 * @author Cem (DiscoFever)
	 **/
	public function __construct() {
		$opts = array(
			'host'          => 'localhost',
			'user'          => '',
			'pass'          => '',
			'port'          => 21,
			'mode'        	=> 'passive',
			'path'			=> '/',
			'timeout'		=> 20,
			'owner'         => true,
			'tmbPath'       => '',
			'tmpPath'       => '',
			'dirMode'       => 0755,
			'fileMode'      => 0644
		);
		$this->options = array_merge($this->options, $opts); 
		$this->options['mimeDetect'] = 'internal';
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
		if (!$this->options['host'] 
		||  !$this->options['user'] 
		||  !$this->options['pass'] 
		||  !$this->options['port']) {
			return $this->setError('Required options undefined.');
		}
		
		if (!function_exists('ftp_connect')) {
			return $this->setError('FTP extension not loaded.');
		}

		// remove protocol from host
		$scheme = parse_url($this->options['host'], PHP_URL_SCHEME);

		if ($scheme) {
			$this->options['host'] = substr($this->options['host'], strlen($scheme)+3);
		}

		// normalize root path
		$this->root = $this->options['path'] = $this->_normpath($this->options['path']);
		
		if (empty($this->options['alias'])) {
			$this->options['alias'] = $this->options['user'].'@'.$this->options['host'];
			// $num = elFinder::$volumesCnt-1;
			// $this->options['alias'] = $this->root == '/' || $this->root == '.' ? 'FTP folder '.$num : basename($this->root);
		}

		$this->rootName = $this->options['alias'];
		$this->options['separator'] = '/';

		return $this->connect();
		
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
			$this->disabled[] = 'mkfile';
			$this->disabled[] = 'paste';
			$this->disabled[] = 'duplicate';
			$this->disabled[] = 'upload';
			$this->disabled[] = 'edit';
			$this->disabled[] = 'archive';
			$this->disabled[] = 'extract';
		}
		
		// echo $this->tmp;
		
	}
	
	/**
	 * Connect to ftp server
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function connect() {
		if (!($this->connect = ftp_connect($this->options['host'], $this->options['port'], $this->options['timeout']))) {
			return $this->setError('Unable to connect to FTP server '.$this->options['host']);
		}
		if (!ftp_login($this->connect, $this->options['user'], $this->options['pass'])) {
			$this->umount();
			return $this->setError('Unable to login into '.$this->options['host']);
		}
		
		// switch off extended passive mode - may be usefull for some servers
		@ftp_exec($this->connect, 'epsv4 off' );
		// enter passive mode if required
		ftp_pasv($this->connect, $this->options['mode'] == 'passive');

		// enter root folder
		if (!ftp_chdir($this->connect, $this->root) 
		|| $this->root != ftp_pwd($this->connect)) {
			$this->umount();
			return $this->setError('Unable to open root folder.');
		}
		
		// check for MLST support
		$features = ftp_raw($this->connect, 'FEAT');
		if (!is_array($features)) {
			$this->umount();
			return $this->setError('Server does not support command FEAT. wtf? 0_o');
		}

		foreach ($features as $feat) {
			if (strpos(trim($feat), 'MLST') === 0) {
				return true;
			}
		}
		
		return $this->setError('Server does not support command MLST. wtf? 0_o');
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
		$this->connect && @ftp_close($this->connect);
	}


	/**
	 * Parse line from ftp_rawlist() output and return file stat (array)
	 *
	 * @param  string  $raw  line from ftp_rawlist() output
	 * @return array
	 * @author Dmitry Levashov
	 **/
protected function parseRaw($raw) {
    $stat = array();

    /*
     * Check to see if what was returned matches a standard unix ls listing
     */
    if (preg_match('/^([a-z\-]{10}) +(\d+) +(\w+) +(\w+) +(\d+) +(\w+) +(\w+) +([\d\:]+) +(.+)/', $raw, $info)) {
        $this->ftpOsUnix = true;

        // Remove the regex pattern in the first element of the array
        array_shift($info);
			
			$stat['ts'] = strtotime($info[5].' '.$info[6].' '.$info[7]);
			if (empty($stat['ts'])) {
				$stat['ts'] = strtotime($info[6].' '.$info[5].' '.$info[7]);
			}
			
			$name = $info[8];
			
			if (preg_match('|(.+)\-\>(.+)|', $name, $m)) {
				$name   = trim($m[1]);
				$target = trim($m[2]);
				if (substr($target, 0, 1) != '/') {
					$target = $this->root.'/'.$target;
				}
				$target = $this->_normpath($target);
				$stat['name']  = $name;
				if ($this->_inpath($target, $this->root) 
				&& ($tstat = $this->stat($target))) {
					$stat['size']  = $tstat['mime'] == 'directory' ? 0 : $info[4];
					$stat['alias'] = $this->_relpath($target);
					$stat['thash'] = $tstat['hash'];
					$stat['mime']  = $tstat['mime'];
					$stat['read']  = $tstat['read'];
					$stat['write']  = $tstat['write'];
				} else {
					
					$stat['mime']  = 'symlink-broken';
					$stat['read']  = false;
					$stat['write'] = false;
					$stat['size']  = 0;
					
				}
				return $stat;
			}
			
			$perm = $this->parsePermissions($info[0]);
			$stat['name']  = $name;
			$stat['mime']  = substr(strtolower($info[0]), 0, 1) == 'd' ? 'directory' : $this->mimetype($stat['name']);
			$stat['size']  = $stat['mime'] == 'directory' ? 0 : $info[4];
			$stat['read']  = $perm['read'];
			$stat['write'] = $perm['write'];
			$stat['perm']  = substr($info[0], 1);
		} else {
			die('Windows ftp servers not supported yet');
		}

		return $stat;
	}
	
	/**
	 * Parse permissions string. Return array(read => true/false, write => true/false)
	 *
	 * @param  string  $perm  permissions string
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function parsePermissions($perm) {
		$res   = array();
		$parts = array();
		$owner = $this->options['owner'];
		for ($i = 0, $l = strlen($perm); $i < $l; $i++) {
			$parts[] = substr($perm, $i, 1);
		}

		$read = ($owner && $parts[0] == 'r') || $parts[4] == 'r' || $parts[7] == 'r';
		
		return array(
			'read'  => $parts[0] == 'd' ? $read && (($owner && $parts[3] == 'x') || $parts[6] == 'x' || $parts[9] == 'x') : $read,
			'write' => ($owner && $parts[2] == 'w') || $parts[5] == 'w' || $parts[8] == 'w'
		);
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

		if (preg_match('/\s|\'|\"/', $path)) {
			foreach (ftp_nlist($this->connect, $path) as $p) {
				$p = $path.'/'.basename($p);
				if (($stat = $this->_stat($p)) &&empty($stat['hidden'])) {
					// $files[] = $stat;
					$this->dirsCache[$path][] = $p;
				}
			}
			return;
		}
		foreach (ftp_rawlist($this->connect, $path) as $raw) {
			if (($stat = $this->parseRaw($raw))) {
				$p    = $path.'/'.$stat['name'];
				$stat = $this->updateCache($p, $stat);
				if (empty($stat['hidden'])) {
					// $files[] = $stat;
					$this->dirsCache[$path][] = $p;
				}
			}
		}
	}

	/**
	 * Return ftp transfer mode for file
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function ftpMode($path) {
		return strpos($this->mimetype($path), 'text/') === 0 ? FTP_ASCII : FTP_BINARY;
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
		return $dir.DIRECTORY_SEPARATOR.$name;
	}
	
	/**
	 * Return normalized path, this works the same as os.path.normpath() in Python
	 *
	 * @param  string  $path  path
	 * @return string
	 * @author Troex Nevelin
	 **/
	protected function _normpath($path) {
		if (empty($path)) {
			$path = '.';
		}
		// path must be start with /
		$path = preg_replace('|^\.\/?|', '/', $path);
		$path = preg_replace('/^([^\/])/', "/$1", $path);

		if (strpos($path, '/') === 0) {
			$initial_slashes = true;
		} else {
			$initial_slashes = false;
		}
			
		if (($initial_slashes) 
		&& (strpos($path, '//') === 0) 
		&& (strpos($path, '///') === false)) {
			$initial_slashes = 2;
		}
			
		$initial_slashes = (int) $initial_slashes;

		$comps = explode('/', $path);
		$new_comps = array();
		foreach ($comps as $comp) {
			if (in_array($comp, array('', '.'))) {
				continue;
			}
				
			if (($comp != '..') 
			|| (!$initial_slashes && !$new_comps) 
			|| ($new_comps && (end($new_comps) == '..'))) {
				array_push($new_comps, $comp);
			} elseif ($new_comps) {
				array_pop($new_comps);
			}
		}
		$comps = $new_comps;
		$path = implode('/', $comps);
		if ($initial_slashes) {
			$path = str_repeat('/', $initial_slashes) . $path;
		}
		
		return $path ? $path : '.';
	}
	
	/**
	 * Return file path related to root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _relpath($path) {
		return $path == $this->root ? '' : substr($path, strlen($this->root)+1);
	}
	
	/**
	 * Convert path related to root dir into real path
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _abspath($path) {
		return $path == $this->separator ? $this->root : $this->root.$this->separator.$path;
	}
	
	/**
	 * Return fake path started from root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _path($path) {
		return $this->rootName.($path == $this->root ? '' : $this->separator.$this->_relpath($path));
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
		$raw = ftp_raw($this->connect, 'MLST '. $path);

		if (is_array($raw) && count($raw) > 1 && substr(trim($raw[0]), 0, 1) == 2) {
		    if (substr($raw[1], 0, 4) == '250-') {
				$raw[1] = substr($raw[1], 4);
			}
			$parts = explode(';', trim($raw[1]));
			array_pop($parts);
			$parts = array_map('strtolower', $parts);
			$stat  = array();
			//debug($parts);
			foreach ($parts as $part) {

				list($key, $val) = explode('=', $part);

				switch ($key) {
					case 'type':
						$stat['mime'] = strpos($val, 'dir') !== false ? 'directory' : $this->mimetype($path);
						break;

					case 'size':
						$stat['size'] = $val;
						break;

					case 'modify':
						$ts = mktime(intval(substr($val, 8, 2)), intval(substr($val, 10, 2)), intval(substr($val, 12, 2)), intval(substr($val, 4, 2)), intval(substr($val, 6, 2)), substr($val, 0, 4));
						$stat['ts'] = $ts;
						// $stat['date'] = $this->formatDate($ts);
						break;

					case 'unix.mode':
						$stat['chmod'] = $val;
						break;

					case 'perm':
						$val = strtolower($val);
						$stat['read']  = (int)preg_match('/e|l|r/', $val);
						$stat['write'] = (int)preg_match('/w|m|c/', $val);
						if (!preg_match('/f|d/', $val)) {
							$stat['locked'] = 1;
						}
						break;
				}
			}
			if (empty($stat['mime'])) {
				return array();
			}
			if ($stat['mime'] == 'directory') {
				$stat['size'] = 0;
			}
			
			if (isset($stat['chmod'])) {
				$stat['perm'] = '';
				if ($stat['chmod'][0] == 0) {
					$stat['chmod'] = substr($stat['chmod'], 1);
				}

				for ($i = 0; $i <= 2; $i++) {
					$perm[$i] = array(false, false, false);
					$n = isset($stat['chmod'][$i]) ? $stat['chmod'][$i] : 0;
					
					if ($n - 4 >= 0) {
						$perm[$i][0] = true;
						$n = $n - 4;
						$stat['perm'] .= 'r';
					} else {
						$stat['perm'] .= '-';
					}
					
					if ($n - 2 >= 0) {
						$perm[$i][1] = true;
						$n = $n - 2;
						$stat['perm'] .= 'w';
					} else {
						$stat['perm'] .= '-';
					}

					if ($n - 1 == 0) {
						$perm[$i][2] = true;
						$stat['perm'] .= 'x';
					} else {
						$stat['perm'] .= '-';
					}
					
					$stat['perm'] .= ' ';
				}
				
				$stat['perm'] = trim($stat['perm']);

				$owner = $this->options['owner'];
				$read = ($owner && $perm[0][0]) || $perm[1][0] || $perm[2][0];

				$stat['read']  = $stat['mime'] == 'directory' ? $read && (($owner && $perm[0][2]) || $perm[1][2] || $perm[2][2]) : $read;
				$stat['write'] = ($owner && $perm[0][1]) || $perm[1][1] || $perm[2][1];
				unset($stat['chmod']);

			}
			
			return $stat;
			
		}
		
		return array();
	}
	
	/**
	 * Return true if path is dir and has at least one childs directory
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _subdirs($path) {
		
		if (preg_match('/\s|\'|\"/', $path)) {
			foreach (ftp_nlist($this->connect, $path) as $p) {
				if (($stat = $this->stat($path.'/'.basename($p))) && $stat['mime'] == 'directory') {
					return true;
				}
			}
			return false;
		}
		
		foreach (ftp_rawlist($this->connect, $path) as $str) {
			if (($stat = $this->parseRaw($str)) && $stat['mime'] == 'directory') {
				return true;
			}
		}
		return false;
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
		clearstatcache();
		return strpos($mime, 'image') === 0 && ($s = @getimagesize(realpath('../files/'.utf8_decode($path)))) !== false
			? $s[0].'x'.$s[1] 
			: false;
		//return false;
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
		$files = array();

		foreach (ftp_rawlist($this->connect, $path) as $str) {
			if (($stat = $this->parseRaw($str))) {
				$files[] = $path.DIRECTORY_SEPARATOR.$stat['name'];
			}
		}

		return $files;
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
			$local = $this->tmp.DIRECTORY_SEPARATOR.md5($path);

			if (ftp_get($this->connect, $local, $path, FTP_BINARY)) {
				return @fopen($local, $mode);
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
			@unlink($this->tmp.DIRECTORY_SEPARATOR.md5($path));
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
		$path = $path.'/'.$name;
		if (ftp_mkdir($this->connect, $path) === false) {
			return false;
		} 
		
		$this->options['dirMode'] && @ftp_chmod($this->connect, $this->options['dirMode'], $path);
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
		if ($this->tmp) {
			$path = $path.'/'.$name;
			$local = $this->tmp.DIRECTORY_SEPARATOR.md5($path);
			$res = touch($local) && ftp_put($this->connect, $path, $local, FTP_ASCII);
			@unlink($local);
			return $res ? $path : false;
		}
		return false;
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
		$res = false;
		
		if ($this->tmp) {
			$local  = $this->tmp.DIRECTORY_SEPARATOR.md5($source);
			$target = $targetDir.DIRECTORY_SEPARATOR.$name;

			if (ftp_get($this->connect, $local, $source, FTP_BINARY)
			&& ftp_put($this->connect, $target, $local, $this->ftpMode($target))) {
				$res = $target;
			}
			@unlink($local);
		}
		
		return $res;
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
		$target = $targetDir.DIRECTORY_SEPARATOR.$name;
		return ftp_rename($this->connect, $source, $target) ? $target : false;
	}
		
	/**
	 * Remove file
	 *
	 * @param  string  $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _unlink($path) {
		return ftp_delete($this->connect, $path);
	}

	/**
	 * Remove dir
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _rmdir($path) {
		return ftp_rmdir($this->connect, $path);
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
	protected function _save($fp, $dir, $name, $stat) {
		$path = $dir.'/'.$name;
		return ftp_fput($this->connect, $path, $fp, $this->ftpMode($path))
			? $path
			: false;
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
		if (($fp = $this->_fopen($path))) {
			while (!feof($fp)) {
			  $contents .= fread($fp, 8192);
			}
			$this->_fclose($fp, $path);
			return $contents;
		}
		return false;
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

		if ($this->tmp) {
			$local = $this->tmp.DIRECTORY_SEPARATOR.md5($path).'.txt';
			
			if (@file_put_contents($local, $content, LOCK_EX) !== false
			&& ($fp = @fopen($local, 'rb'))) {
				clearstatcache();
				$res  = ftp_fput($this->connect, $path, $fp, $this->ftpMode($path));
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
		if (!function_exists('exec')) {
			$this->options['archivers'] = $this->options['archive'] = array();
			return;
		}
		$arcs = array(
			'create'  => array(),
			'extract' => array()
			);
		
		//exec('tar --version', $o, $ctar);
		$this->procExec('tar --version', $o, $ctar);

		if ($ctar == 0) {
			$arcs['create']['application/x-tar']  = array('cmd' => 'tar', 'argc' => '-cf', 'ext' => 'tar');
			$arcs['extract']['application/x-tar'] = array('cmd' => 'tar', 'argc' => '-xf', 'ext' => 'tar');
			//$test = exec('gzip --version', $o, $c);
			unset($o);
			$test = $this->procExec('gzip --version', $o, $c);

			if ($c == 0) {
				$arcs['create']['application/x-gzip']  = array('cmd' => 'tar', 'argc' => '-czf', 'ext' => 'tgz');
				$arcs['extract']['application/x-gzip'] = array('cmd' => 'tar', 'argc' => '-xzf', 'ext' => 'tgz');
			}
			unset($o);
			//$test = exec('bzip2 --version', $o, $c);
			$test = $this->procExec('bzip2 --version', $o, $c);
			if ($c == 0) {
				$arcs['create']['application/x-bzip2']  = array('cmd' => 'tar', 'argc' => '-cjf', 'ext' => 'tbz');
				$arcs['extract']['application/x-bzip2'] = array('cmd' => 'tar', 'argc' => '-xjf', 'ext' => 'tbz');
			}
		}
		unset($o);
		//exec('zip --version', $o, $c);
		$this->procExec('zip -v', $o, $c);
		if ($c == 0) {
			$arcs['create']['application/zip']  = array('cmd' => 'zip', 'argc' => '-r9', 'ext' => 'zip');
		}
		unset($o);
		$this->procExec('unzip --help', $o, $c);
		if ($c == 0) {
			$arcs['extract']['application/zip'] = array('cmd' => 'unzip', 'argc' => '',  'ext' => 'zip');
		} 
		unset($o);
		//exec('rar --version', $o, $c);
		$this->procExec('rar --version', $o, $c);
		if ($c == 0 || $c == 7) {
			$arcs['create']['application/x-rar']  = array('cmd' => 'rar', 'argc' => 'a -inul', 'ext' => 'rar');
			$arcs['extract']['application/x-rar'] = array('cmd' => 'rar', 'argc' => 'x -y',    'ext' => 'rar');
		} else {
			unset($o);
			//$test = exec('unrar', $o, $c);
			$test = $this->procExec('unrar', $o, $c);
			if ($c==0 || $c == 7) {
				$arcs['extract']['application/x-rar'] = array('cmd' => 'unrar', 'argc' => 'x -y', 'ext' => 'rar');
			}
		}
		unset($o);
		//exec('7za --help', $o, $c);
		$this->procExec('7z', $o, $c);
		if ($c == 0) {
			$arcs['create']['application/x-7z-compressed']  = array('cmd' => '7z', 'argc' => 'a -mx0', 'ext' => '7z');
			$arcs['extract']['application/x-7z-compressed'] = array('cmd' => '7z', 'argc' => 'x -y', 'ext' => '7z');
			
			if (empty($arcs['create']['application/x-gzip'])) {
				$arcs['create']['application/x-gzip'] = array('cmd' => '7z', 'argc' => 'a -tgzip -mx0', 'ext' => 'tar.gz');
			}
			if (empty($arcs['extract']['application/x-gzip'])) {
				$arcs['extract']['application/x-gzip'] = array('cmd' => '7z', 'argc' => 'x -tgzip -y', 'ext' => 'tar.gz');
			}
			if (empty($arcs['create']['application/x-bzip2'])) {
				$arcs['create']['application/x-bzip2'] = array('cmd' => '7z', 'argc' => 'a -tbzip2 -mx0', 'ext' => 'tar.bz');
			}
			if (empty($arcs['extract']['application/x-bzip2'])) {
				$arcs['extract']['application/x-bzip2'] = array('cmd' => '7z', 'argc' => 'x -tbzip2 -y', 'ext' => 'tar.bz');
			}
			if (empty($arcs['create']['application/zip'])) {
				$arcs['create']['application/zip'] = array('cmd' => '7z', 'argc' => 'a -tzip -l -mx0', 'ext' => 'zip');
			}
			if (empty($arcs['extract']['application/zip'])) {
				$arcs['extract']['application/zip'] = array('cmd' => '7z', 'argc' => 'x -tzip -y', 'ext' => 'zip');
			}
			if (empty($arcs['create']['application/x-tar'])) {
				$arcs['create']['application/x-tar'] = array('cmd' => '7z', 'argc' => 'a -ttar -l -mx0', 'ext' => 'tar');
			}
			if (empty($arcs['extract']['application/x-tar'])) {
				$arcs['extract']['application/x-tar'] = array('cmd' => '7z', 'argc' => 'x -ttar -y', 'ext' => 'tar');
			}
			if (empty($arcs['create']['application/x-rar'])) {
				$arcs['create']['application/x-rar']  = array('cmd' => '7z', 'argc' => 'a -trar -l -mx0', 'ext' => 'rar');
			}
			if (empty($arcs['extract']['application/x-rar'])) {	
				$arcs['extract']['application/x-rar'] = array('cmd' => '7z', 'argc' => 'x -trar -y', 'ext' => 'rar');
			}
		}
		
		$this->archivers = $arcs;
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
		$cwd = getcwd();
		$dir = $this->_dirname($path);
		chdir($dir);
		$cmd = $arc['cmd'].' '.$arc['argc'].' '.escapeshellarg($this->_basename($path));
		$this->procExec($cmd, $o, $c);
		chdir($cwd);
	}

	/**
	 * Recursive symlinks search
	 *
	 * @param  string  $path  file/dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _findSymlinks($path) {
		//die('Not yet implemented. (_findSymlinks)');
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

		// get current directory
		$cwd = getcwd();

		// dont work with big files
		$filesize_max = 150 * 1024 * 1024;  // 50mb
		$archivepath = realpath('../files/'.utf8_decode($path));
		if (!is_dir($archivepath) ) {							
			if (filesize($archivepath) > $filesize_max) {
				error_log('filesize too big: '.filesize($archivepath));
				return false;
			} else {
				error_log('filesize ok: '.filesize($archivepath));
			}
		}	
		unset($archivepath);
		
		// create temporary directory for temporary files
		$tmpDir = $this->tempDir();
		if(!$tmpDir) {
			return false;
		}

		$basename = $this->_basename($path);
		$localPath = $tmpDir.DIRECTORY_SEPARATOR.$basename;
		if(!$this->ftp_downloadFile($path, $localPath)) {
			return false;
		}

		//remote directory
		$remoteDirectory = dirname($path);

		chdir($tmpDir);

		$command = escapeshellcmd($arc['cmd'].' '.$arc['argc'].' "'.$basename.'"');
		error_log($command);
		exec($command, $output);
		unlink($basename);

		$filesToProcess = $this->listFilesInDirectory($tmpDir);
		
		
		if (count($filesToProcess) > 1) {

			// for several files - create new directory
			// create unique name for directory
			$name = basename($path);
			if (preg_match('/\.((tar\.(gz|bz|bz2|z|lzo))|cpio\.gz|ps\.gz|xcf\.(gz|bz2)|[a-z0-9]{1,4})$/i', $name, $m)) {
				$name = substr($name, 0,  strlen($name)-strlen($m[0]));
				if( $this->ftp_isDirectory(dirname($path).DIRECTORY_SEPARATOR.$name) ) {
					$name = $this->uniqueName(dirname($path), $name, '-', false);
				}
			}
	
			$newPath = dirname($path).DIRECTORY_SEPARATOR.$name;
			ftp_mkdir($this->connect, $newPath);

			foreach ($filesToProcess as $filename) {
				if (is_dir($filename)) {
					ftp_mkdir($this->connect, $newPath . DIRECTORY_SEPARATOR . $filename);
				} else {
					ftp_put($this->connect, $newPath . DIRECTORY_SEPARATOR . $filename, $filename, FTP_BINARY);
				}
			}

			unset($filename);

		} else {
			$filename = $filesToProcess[0];
			$newPath = $remoteDirectory;
			ftp_put($this->connect, $newPath. DIRECTORY_SEPARATOR . $filename, $filename, FTP_BINARY);
		}

		// check success
		$success = true;
		foreach($filesToProcess as $file) {
			$ftpfile = $newPath.DIRECTORY_SEPARATOR.$file;
			if(is_dir($file)) {
				$success = $this->ftp_isDirectory($ftpfile);
			} else {
				$success = (ftp_size($this->connect, $ftpfile) == filesize($file));
			}

			if(!$success) {
				error_log("_extract: error occurred for file ".$file);
				break;
			}
		}

		// return to initial directory
		chdir($cwd);

		//cleanup
		elFinderVolumeFTP::deleteDir($tmpDir);

		//return $success ? $newPath : false;		
		return $newPath ? $newPath : false;
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

		// get current directory
		$cwd = getcwd();
		
		// dont work with big files
		$filesize_max = 150 * 1024 * 1024;  // 50mb
		foreach ($files as $f) {
			$realpath = realpath('../files'.utf8_decode($dir).DIRECTORY_SEPARATOR.$f);
			if (is_dir($realpath) ) {				
				$objects = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($realpath), RecursiveIteratorIterator::SELF_FIRST);
				$dirsize = 0;
				foreach($objects as $o => $object){
					error_log('is dir: '.$o);
					if (!is_dir($o)) {
						if ($tmpsize = filesize($o)) {
							$dirsize += $tmpsize;
						}
					}
					if ($dirsize > $filesize_max) {
						error_log('dirsize too big: '.$dirsize);
						return false;
					} else {
						error_log('dirsize ok: '.$dirsize);
					}
				}
			} else {			
				if (filesize($realpath) > $filesize_max) {
					error_log('filesize too big: '.filesize($realpath));
					return false;
				} else {
					error_log('filesize ok: '.filesize($realpath));
				}
			}	
			unset($realpath);
		}
		
		// create temporary directory for temporary files
		$tmpDir = $this->tempDir();
		if(!$tmpDir) {
			return false;
		}

		//download data
		if(!$this->ftp_downloadDirectory($dir, $files, $tmpDir)) {
			return false;
		}

		// go to the temporary directory
		chdir($tmpDir);

		// path to local copy of archive
		$path = $tmpDir.DIRECTORY_SEPARATOR.$name;
		
		$file_names_string = "";
		foreach(scandir($tmpDir) as $filename) {
			if('.' ==  $filename) {
				continue;
			}
			if('..' ==  $filename) {
				continue;
			}
			$file_names_string = $file_names_string.'"'.$filename.'" ';
		}
		$command = escapeshellcmd($arc['cmd'].' '.$arc['argc'].' "'.$name.'" '.$file_names_string);
		error_log($command);
		exec($command, $output);

		$remoteArchiveFile = $dir.DIRECTORY_SEPARATOR.$name;

		// upload archive
		$handle = fopen($path, "r");
		if(!ftp_fput($this->connect, $remoteArchiveFile, $handle, FTP_BINARY)) {
			return false;
		}
		fclose($handle);

		// return to initial work directory
		chdir($cwd);

		//cleanup
		elFinderVolumeFTP::deleteDir($tmpDir);

		return (ftp_size($this->connect, $remoteArchiveFile) > 0) ? $remoteArchiveFile : false;

	}
	
	/**
	 * Create writable temporary directory and return path to it.
	 * @return string path to the new temporary directory.
	*/
	private function tempDir() {
		$tempFile = tempnam(sys_get_temp_dir(),'elFinder');
		unlink($tempFile);
		return mkdir($tempFile) ? $tempFile : false;
	}

	/**
	 * Downloads file from FTP and saves it as local file,
	 * @param $remoteFile string absolute remote path of file to fetch.
	 * @param $localFile string absolute local path to make.
	 * @return string local path to downloaded file or false in case of an error
	*/
	private function ftp_downloadFile($remoteFile, $localFile) {
		$handle = fopen($localFile, "wb");
		if($handle) {
			if (ftp_fget($this->connect, $handle, $remoteFile, FTP_BINARY)) {
				fclose($handle);
				return $localFile;
			} else {
				fclose($handle);
				return false;
			}
		} else {
			return false;
		}
	}

	/**
	 * Download specified list of files into $destLocalDirectory and go through subfolders if any.
	 * @param string $remoteDirectory string absolute remote FTP path.
	 * @param array $files array list of files and directories in remote FTP directory.
	 * @param string $destLocalDirectory string absolute directory path where we need downloaded files.
	 * @return bool true on success and false on failure.
	*/
	private function ftp_downloadDirectory($remoteDirectory, array $files, $destLocalDirectory) {
		// download files from FTP to local host into the temporary directory
		foreach ($files as &$file) {
			$file = basename($file); // in case list of files contains absolute paths
			if ($this->ftp_isDirectory($remoteDirectory.DIRECTORY_SEPARATOR.$file)) { // we need to go through directories recursively
				// make subfolder
				$subfolder = $destLocalDirectory.DIRECTORY_SEPARATOR.$file;
				if(!elFinderVolumeFTP::touchDirectory($subfolder)) {
					return false;
				}

				// list of files in the remote directory
				$subfiles = ftp_nlist($this->connect, $remoteDirectory.DIRECTORY_SEPARATOR.$file);
				// download it recursively
				if(!$this->ftp_downloadDirectory($remoteDirectory.DIRECTORY_SEPARATOR.$file, $subfiles, $subfolder)) {
					return false;
				}
			} else {
				$this->ftp_downloadFile($remoteDirectory.DIRECTORY_SEPARATOR.$file, $destLocalDirectory.DIRECTORY_SEPARATOR.$file);
			}
		}
		unset($file);
		return true;
	}

	/**
	 * Defines if specified $path represents an FTP directory.
	 * <br />
	 * This function is only way to perform this verification provided that we are compatible with PHP 4.
	 * @param string $path remote FTP path to check.
	 * @return boolean true if this is a directory, false, otherwise.
	*/
	private function ftp_isDirectory($path) {
		$curPath =  ftp_pwd ($this->connect);
		$test = @ftp_chdir($this->connect, $path);
		if($test) {
			ftp_chdir($this->connect, $curPath);
		}
		return $test;
	}

	/**
	 * Delete local directory recursively.
	 * @param $dirPath string to directory to be erased.
	 * @throws InvalidArgumentException.
	*/
	private static function deleteDir($dirPath) {
		if (! is_dir($dirPath)) {
			throw new InvalidArgumentException('$dirPath must be a directory');
		}

		$dirPath = $dirPath.DIRECTORY_SEPARATOR;
		$files = glob($dirPath . '*', GLOB_MARK);
		foreach ($files as $file) {
			if (is_dir($file)) {
				self::deleteDir($file);
			} else {
				unlink($file);
			}
		}
		rmdir($dirPath);
	}

	/**
	 * Ensure directory exists and is empty.
	 * @param string $path path to the directory.
	 * @return bool true on success and false in case of an error.
	*/
	private static function touchDirectory($path) {
		if (is_dir($path)) {
			elFinderVolumeFTP::deleteDir($path);
		} else if(file_exists($path)) {
			unlink($path);
		}
		return mkdir($path);
	}

	/**
	 * Returns array of strings containing all files and folders in the specified local directory.
	 * File names are added to the only in case they satisfy the given $mask parameter.
	 * @param string $path path to directory to scan.
	 * @param string $mask a mask for file names ("*" is default).
	 * @return array array of file and folder names relative to the $path
	 * or an empty array if the directory $path is empty,
	 * <br />
	 * false if $path is not a directory or does not exist.
	*/
	private function listFilesInDirectory($path, $mask = "*") {

		if(!is_dir($path)) {
			return false;
		}
		$cwd = getcwd();
		chdir($path);

		$files = array();

		foreach (glob($mask, GLOB_MARK) as $filename) {
			$files[] = $filename;
			if(is_dir($filename)) {
				foreach($this->listFilesInDirectory($path.DIRECTORY_SEPARATOR.$filename) as $subfile) {
					$files[] = $filename.$subfile;
				}
			}
		}
		chdir($cwd);
		return $files;
	}
	
} // END class 
