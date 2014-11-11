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
	 * Net mount key
	 *
	 * @var string
	 **/
	public $netMountKey = '';
	
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
			'fileMode'      => 0644,
			'icon'          => (defined('ELFINDER_IMG_PARENT_URL')? (rtrim(ELFINDER_IMG_PARENT_URL, '/').'/') : '').'img/volume_icon_ftp.png'
			
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
		
		// make ney mount key
		$this->netMountKey = md5(join('-', array('ftp', $this->options['host'], $this->options['port'], $this->options['path'], $this->options['user'])));

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
			if ((is_dir($this->options['tmpPath']) || @mkdir($this->options['tmpPath'], 0755, true)) && is_writable($this->options['tmpPath'])) {
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
			return $this->setError('Server does not support command FEAT.');
		}

		foreach ($features as $feat) {
			if (strpos(trim($feat), 'MLST') === 0) {
				return true;
			}
		}
		
		return $this->setError('Server does not support command MLST.');
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
		$info = preg_split("/\s+/", $raw, 9);
		$stat = array();

		if (count($info) < 9 || $info[8] == '.' || $info[8] == '..') {
			return false;
		}

		if (!isset($this->ftpOsUnix)) {
			$this->ftpOsUnix = !preg_match('/\d/', substr($info[0], 0, 1));
		}
		
		if ($this->ftpOsUnix) {
			
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

		if (preg_match('/\'|\"/', $path)) {
			foreach (ftp_nlist($this->connect, $path) as $p) {
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
		$raw = ftp_raw($this->connect, 'MLST '.$path);

		if (is_array($raw) && count($raw) > 1 && substr(trim($raw[0]), 0, 1) == 2) {
			$parts = explode(';', trim($raw[1]));
			array_pop($parts);
			$parts = array_map('strtolower', $parts);
			$stat  = array();
			// debug($parts);
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
				if (($stat = $this->stat($path.'/'.$p)) && $stat['mime'] == 'directory') {
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
		return false;
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
						$this->archiveSize += sprintf('%u', filesize($p));
					}
				}
			}
		} else {
			$this->archiveSize += sprintf('%u', filesize($path));
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
	protected function _extract($path, $arc)
	{
		// get current directory
		$cwd = getcwd();

		$tmpDir = $this->tempDir();
		if (!$tmpDir) {
			return false;
		}

		$basename = $this->_basename($path);
		$localPath = $tmpDir . DIRECTORY_SEPARATOR . $basename;

		if (!ftp_get($this->connect, $localPath, $path, FTP_BINARY)) {
			//cleanup
			$this->deleteDir($tmpDir);
			return false;
		}

		$remoteDirectory = dirname($path);
		chdir($tmpDir);
		$command = escapeshellcmd($arc['cmd'] . ' ' . $arc['argc'] . ' "' . $basename . '"');
		$descriptorspec = array(
			0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
			1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
			2 => array("pipe", "w") // stderr is a file to write to
		);

			
		$process = proc_open($command, $descriptorspec, $pipes, $cwd);

		if (is_resource($process)) {
			fclose($pipes[0]);
			fclose($pipes[1]);
			$return_value = proc_close($process);
		}

		unlink($basename);
		$filesToProcess = elFinderVolumeFTP::listFilesInDirectory($tmpDir, true);
		if(!$filesToProcess) {
			$this->setError(elFinder::ERROR_EXTRACT_EXEC, $tmpDir." is not a directory");
			$this->deleteDir($tmpDir); //cleanup
			return false;
		}
		if (count($filesToProcess) > 1) {

			// for several files - create new directory
			// create unique name for directory
			$name = basename($path);
			if (preg_match('/\.((tar\.(gz|bz|bz2|z|lzo))|cpio\.gz|ps\.gz|xcf\.(gz|bz2)|[a-z0-9]{1,4})$/i', $name, $m)) {
				$name = substr($name, 0, strlen($name) - strlen($m[0]));
			}

			$test = dirname($path) . DIRECTORY_SEPARATOR . $name;
			if ($this->stat($test)) {
				$name = $this->uniqueName(dirname($path), $name, '-', false);
			}

			$newPath = dirname($path) . DIRECTORY_SEPARATOR . $name;

			$success = $this->_mkdir(dirname($path), $name);
			foreach ($filesToProcess as $filename) {
				if (!$success) {
					break;
				}
				$targetPath = $newPath . DIRECTORY_SEPARATOR . $filename;
				if (is_dir($filename)) {
					$success = $this->_mkdir($newPath, $filename);
				} else {
					$success = ftp_put($this->connect, $targetPath, $filename, FTP_BINARY);
				}
			}
			unset($filename);

		} else {
			$filename = $filesToProcess[0];
			$newPath = $remoteDirectory . DIRECTORY_SEPARATOR . $filename;
			$success = ftp_put($this->connect, $newPath, $filename, FTP_BINARY);
		}

		// return to initial directory
		chdir($cwd);

		//cleanup
		if(!$this->deleteDir($tmpDir)) {
			return false;
		}
		
		if (!$success) {
			$this->setError(elFinder::ERROR_FTP_UPLOAD_FILE, $newPath);
			return false;
		}
		$this->clearcache();
		return $newPath;
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
		// get current directory
		$cwd = getcwd();

		$tmpDir = $this->tempDir();
		if (!$tmpDir) {
			return false;
		}

		//download data
		if (!$this->ftp_download_files($dir, $files, $tmpDir)) {
			//cleanup
			$this->deleteDir($tmpDir);
			return false;
		}

		// go to the temporary directory
		chdir($tmpDir);

		// path to local copy of archive
		$path = $tmpDir . DIRECTORY_SEPARATOR . $name;

		$file_names_string = "";
		foreach (scandir($tmpDir) as $filename) {
			if ('.' == $filename) {
				continue;
			}
			if ('..' == $filename) {
				continue;
			}
			$file_names_string = $file_names_string . '"' . $filename . '" ';
		}
		$command = escapeshellcmd($arc['cmd'] . ' ' . $arc['argc'] . ' "' . $name . '" ' . $file_names_string);
		
		$descriptorspec = array(
			0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
			1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
			2 => array("pipe", "w") // stderr is a file to write to
		);

			
		$process = proc_open($command, $descriptorspec, $pipes, $cwd);

		if (is_resource($process)) {
			fclose($pipes[0]);
			fclose($pipes[1]);
			$return_value = proc_close($process);
		}

		$remoteArchiveFile = $dir . DIRECTORY_SEPARATOR . $name;

		// upload archive
		if (!ftp_put($this->connect, $remoteArchiveFile, $path, FTP_BINARY)) {
			$this->setError(elFinder::ERROR_FTP_UPLOAD_FILE, $remoteArchiveFile);
			$this->deleteDir($tmpDir); //cleanup
			return false;
		}

		// return to initial work directory
		chdir($cwd);

		//cleanup
		if(!$this->deleteDir($tmpDir)) {
			return false;
		}

		return $remoteArchiveFile;
	}

	/**
	 * Create writable temporary directory and return path to it.
	 * @return string path to the new temporary directory or false in case of error.
	 */
	private function tempDir()
	{
		$tempPath = tempnam($this->tmp, 'elFinder');
		if (!$tempPath) {
			$this->setError(elFinder::ERROR_CREATING_TEMP_DIR, $this->tmp);
			return false;
		}
		$success = unlink($tempPath);
		if (!$success) {
			$this->setError(elFinder::ERROR_CREATING_TEMP_DIR, $this->tmp);
			return false;
		}
		$success = mkdir($tempPath, 0700, true);
		if (!$success) {
			$this->setError(elFinder::ERROR_CREATING_TEMP_DIR, $this->tmp);
			return false;
		}
		return $tempPath;
	}

	/**
	 * Gets in a single FTP request an array of absolute remote FTP paths of files and
	 * folders in $remote_directory omitting symbolic links.
	 * @param $remote_directory string remote FTP path to scan for file and folders recursively
	 * @return array of elements each of which is an array of two elements:
	 * <ul>
	 * <li>$item['path'] - absolute remote FTP path</li>
	 * <li>$item['type'] - either 'f' for file or 'd' for directory</li>
	 * </ul>
	 */
	protected function ftp_scan_dir($remote_directory)
	{
		$buff = ftp_rawlist($this->connect, $remote_directory, true);
		$next_folder = false;
		$items = array();
		foreach ($buff as $str) {
			if ('' == $str) {
				$next_folder = true;
				continue;
			}
			if ($next_folder) {
				$remote_directory = preg_replace('/\:/', '', $str);
				$next_folder = false;
				$item = array();
				$item['path'] = $remote_directory;
				$item['type'] = 'd'; // directory
				$items[] = $item;
				continue;
			}
			$info = preg_split("/\s+/", $str, 9);
			$type = substr($info[0], 0, 1);
			switch ($type) {
				case 'l' : //omit symbolic links
				case 'd' :
					break;
				default:
					$remote_file_path = $remote_directory . DIRECTORY_SEPARATOR . $info[8];
					$item = array();
					$item['path'] = $remote_file_path;
					$item['type'] = 'f'; // normal file
					$items[] = $item;
			}
		}
		return $items;
	}

	/**
	 * Downloads specified files from remote directory
	 * if there is a directory among files it is downloaded recursively (omitting symbolic links).
	 * @param $remote_directory string remote FTP path to a source directory to download from.
	 * @param array $files list of files to download from remote directory.
	 * @param $dest_local_directory string destination folder to store downloaded files.
	 * @return bool true on success and false on failure.
	 */
	private function ftp_download_files($remote_directory, array $files, $dest_local_directory)
	{
		$contents = $this->ftp_scan_dir($remote_directory);
		if (!isset($contents)) {
			$this->setError(elFinder::ERROR_FTP_DOWNLOAD_FILE, $remote_directory);
			return false;
		}
		foreach ($contents as $item) {
			$drop = true;
			foreach ($files as $file) {
				if ($remote_directory . DIRECTORY_SEPARATOR . $file == $item['path'] || strstr($item['path'], $remote_directory . DIRECTORY_SEPARATOR . $file . DIRECTORY_SEPARATOR)) {
					$drop = false;
					break;
				}
			}
			if ($drop) continue;
			$relative_path = str_replace($remote_directory, '', $item['path']);
			$local_path = $dest_local_directory . DIRECTORY_SEPARATOR . $relative_path;
			switch ($item['type']) {
				case 'd':
					$success = mkdir($local_path);
					break;
				case 'f':
					$success = ftp_get($this->connect, $local_path, $item['path'], FTP_BINARY);
					break;
				default:
					$success = true;
			}
			if (!$success) {
				$this->setError(elFinder::ERROR_FTP_DOWNLOAD_FILE, $remote_directory);
				return false;
			}
		}
		return true;
	}

	/**
	 * Delete local directory recursively.
	 * @param $dirPath string to directory to be erased.
	 * @return bool true on success and false on failure.
	 */
	private function deleteDir($dirPath)
	{
		if (!is_dir($dirPath)) {
			$success = unlink($dirPath);
		} else {
			$success = true;
			foreach (array_reverse(elFinderVolumeFTP::listFilesInDirectory($dirPath, false)) as $path) {
				$path = $dirPath . DIRECTORY_SEPARATOR . $path;
				if(is_link($path)) {
					unlink($path);
				} else if (is_dir($path)) {
					$success = rmdir($path);
				} else {
					$success = unlink($path);
				}
				if (!$success) {
					break;
				}
			}
			if($success) {
				$success = rmdir($dirPath);
			}
		}
		if(!$success) {
			$this->setError(elFinder::ERROR_RM, $dirPath);
			return false;
		}
		return $success;
	}

	/**
	 * Returns array of strings containing all files and folders in the specified local directory.
	 * @param $dir
	 * @param string $prefix
	 * @internal param string $path path to directory to scan.
	 * @return array array of files and folders names relative to the $path
	 * or an empty array if the directory $path is empty,
	 * <br />
	 * false if $path is not a directory or does not exist.
	 */
	private static function listFilesInDirectory($dir, $omitSymlinks, $prefix = '')
	{
		if (!is_dir($dir)) {
			return false;
		}
		$excludes = array(".","..");
		$result = array();
		$files = scandir($dir);
		if(!$files) {
			return array();
		}
		foreach($files as $file) {
			if(!in_array($file, $excludes)) {
				$path = $dir.DIRECTORY_SEPARATOR.$file;
				if(is_link($path)) {
					if($omitSymlinks) {
						continue;
					} else {
						$result[] = $prefix.$file;
					}
				} else if(is_dir($path)) {
					$result[] = $prefix.$file.DIRECTORY_SEPARATOR;
					$subs = elFinderVolumeFTP::listFilesInDirectory($path, $omitSymlinks, $prefix.$file.DIRECTORY_SEPARATOR);
					if($subs) {
						$result = array_merge($result, $subs);
					}
					
				} else {
					$result[] = $prefix.$file;
				}
			}
		}
		return $result;
	}

/**
	 * Resize image
	 * @param string $hash
	 * @param int $width
	 * @param int $height
	 * @param int $x
	 * @param int $y
	 * @param string $mode
	 * @param string $bg
	 * @param int $degree
	 * @return array|bool|false
	 */
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

		$tmpDir = $this->tempDir();
		if (!$tmpDir) {
			return false;
		}
		
		$local_path = $tmpDir . DIRECTORY_SEPARATOR . basename($path);
		$remote_directory = ftp_pwd($this->connect);
		$success = ftp_get($this->connect, $local_path, $path, FTP_BINARY);
		if (!$success) {
			$this->setError(elFinder::ERROR_FTP_DOWNLOAD_FILE, $remote_directory);
			return false;
		}

		if (!$this->canResize($path, $file)) {
			return $this->setError(elFinder::ERROR_UNSUPPORT_TYPE);
		}

		switch($mode) {

			case 'propresize':
				$result = $this->imgResize($local_path, $width, $height, true, true);
				break;

			case 'crop':
				$result = $this->imgCrop($local_path, $width, $height, $x, $y);
				break;

			case 'fitsquare':
				$result = $this->imgSquareFit($local_path, $width, $height, 'center', 'middle', ($bg ? $bg : $this->options['tmbBgColor']));
				break;

			case 'rotate':
				$result = $this->imgRotate($local_path, $degree, ($bg ? $bg : $this->options['tmbBgColor']));
				break;

			default:
				$result = $this->imgResize($local_path, $width, $height, false, true);
				break;
		}

		if ($result) {
			
			// upload to FTP and clear temp local file

			if (!ftp_put($this->connect, $path, $local_path, FTP_BINARY)) {
				$this->setError(elFinder::ERROR_FTP_UPLOAD_FILE, $path);
				$this->deleteDir($tmpDir); //cleanup
			}
			
			$this->clearcache();
			return $this->stat($path);
		}

		$this->setError(elFinder::ERROR_UNKNOWN);
		return false;
	}

} // END class

