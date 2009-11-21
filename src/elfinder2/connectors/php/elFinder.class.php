<?php
// setlocale(LC_ALL, 'ru_RU');
class elFinder {
	
	/**
	 * object options
	 *
	 * @var array
	 **/
	private $_options = array(
		'root'       => './',
		'URL'        => '',
		'rootAlias'  => 'Home',
		'debug'      => true,
		'dirSize'    => true,
		'fileUmask'  => 0666,
		'dirUmask'   => 0777,
		'tmbDir'     => '.tmb',
		'tmbSize'    => 48,
		'allowTypes' => array(),
		'allowExts'  => array(),
		'denyTypes'  => array(),
		'denyExts'   => array(),   
		'allowURLs'  => true,
		'disabled'   => array(),
		'aclObj'     => null,
		'aclRole'    => 'user',
		'defaults'   => array(
			'read'   => true,
			'write'  => true,
			'mkdir'  => true,
			'upload' => true,
			'rm'     => true,
			'rmdir'  => true
			),
		'perms' => array()
		);
	
	/**
	 * mapping $_GET['cmd]/$_POST['cmd] to class methods
	 *
	 * @var array
	 **/
	private $_commands = array(
		'cd'      => '_cd',
		'open'    => '_open',
		'mkdir'   => '_mkdir',
		'mkfile'  => '_mkfile',
		'rename'  => '_rename',
		'upload'  => '_upload',
		'rm'      => '_rm',
		'edit'    => '_edit',
		'extract' => '_extract'
		);
		
	/**
	 * массив расширений файлов/mime types для _method = 'internal' (когда недоступны все прочие методы)
	 *
	 * @var array
	 **/
	private $_mimeTypes = array(
		'txt'  => 'plain/text',
	    'php'  => 'text/x-php',
	    'html' => 'text/html',
	 	'js'   => 'text/javascript',
		'css'  => 'text/css',
	    'rtf'  => 'text/rtf',
	    'xml'  => 'application/xml',
	    'gz'   => 'application/x-gzip',
	    'tgz'  => 'application/x-gzip',
	    'bz'   => 'application/x-bzip2',
		'bz2'  => 'application/x-bzip2',
	    'tbz'  => 'application/x-bzip2',
	    'zip'  => 'application/x-zip',
	    'rar'  => 'application/x-rar',
	    'jpg'  => 'image/jpeg',
	    'jpeg' => 'image/jpeg',
	    'gif'  => 'image/gif',
	    'png'  => 'image/png',
	    'tif'  => 'image/tif',
	    'psd'  => 'image/psd',
	    'pdf'  => 'application/pdf',
	    'doc'  => 'application/msword',
	    'xls'  => 'application/msexel',
		'exe'  => 'application/octet-stream'
		);
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_kinds = array(
		'directory'                     => 'Directory',
		'link'                          => 'Alias',
		'text/plain'                    => 'Plain text',
	    'text/x-php'                    => 'PHP source',
		'text/javascript'               => 'Javascript source',
		'text/css'                      => 'CSS style sheet',  
	    'text/html'                     => 'HTML document', 
		'text/x-c'                      => 'C source', 
		'text/x-c++'                    => 'C++ source', 
		'text/x-shellscript'            => 'Unix shell script',
	    'text/rtf'                      => 'Rich Text Format (RTF)',
		'text/rtfd'                     => 'RTF with attachments (RTFD)', 
	    'text/xml'                      => 'XML document', 
		'application/xml'               => 'XML document', 
		'application/x-tar'             => 'TAR archive', 
	    'application/x-gzip'            => 'GZIP archive', 
	    'application/x-bzip2'           => 'BZIP archive', 
	    'application/x-zip'             => 'ZIP archive',  
	    'application/zip'               => 'ZIP archive',  
	    'application/x-rar'             => 'RAR archive',  
	    'image/jpeg'                    => 'JPEG image',   
	    'image/gif'                     => 'GIF Image',    
	    'image/png'                     => 'PNG image',    
	    'image/tiff'                    => 'TIFF image',   
	    'image/vnd.adobe.photoshop'     => 'Adobe Photoshop image',
	    'application/pdf'               => 'Portable Document Format (PDF)',
	    'application/msword'            => 'Microsoft Word document',  
		'application/vnd.ms-office'     => 'Microsoft Office document',
		'application/vnd.ms-word'       => 'Microsoft Word document',  
	    'application/msexel'            => 'Microsoft Excel document', 
	    'application/vnd.ms-excel'      => 'Microsoft Excel document', 
		'application/octet-stream'      => 'Application', 
		'audio/mpeg'                    => 'MPEG audio',  
		'video/mpeg'                    => 'MPEG video',  
		'video/x-msvideo'               => 'AVI video',   
		'application/x-shockwave-flash' => 'Flash application', 
		'video/x-flv'                   => 'Flash video'
		);
		
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_mimetypeDetect = '';	
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_du = false;
		
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_time = 0;
		
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_cwd = array();
		
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_tasks = array(
		'dirs' => array(),
		'images' => array()
		);
		
	/**
	 * constructor
	 *
	 * @param  array object options
	 * @return void
	 **/
	public function __construct($options=array()) {
		
		foreach ($this->_options as $k=>$v) {
			if (isset($options[$k])) {
				$this->_options[$k] = is_array($this->_options[$k]) ? array_merge($this->_options[$k], $options[$k]) : $options[$k];
			}
		}
		$this->_options['root'] = realpath($this->_options['root'] ? $this->_options['root'] : '.');
		if (!empty($this->_options['disabled'])) {
			foreach ($this->_options['disabled'] as $c) {
				if (isset($this->_commands[$c])) {
					unset($this->_commands[$c]);
				}
			}
		}
		
		$this->_time = $this->_options['debug'] ? $this->_utime() : 0;
		
		$test = exec('du -h '.escapeshellarg(__FILE__), $o, $s); 
		$this->_du = $s == 0 && $test>0;
	}

	/**
	 * undocumented function
	 *
	 * @return void
	 **/
	public function run() {
		if (!is_dir($this->_options['root'])) {
			exit(json_encode(array('error' => 'Root directory does not exists!')));
		}
		if (!is_readable($this->_options['root']) 
		||  !$this->_isAllowed($this->_options['root'], 'read')) {
			exit(json_encode(array('error' => 'Access denied!')));
		}
		
		$cmd = '';
		if (!empty($_POST['cmd'])) {
			$cmd = trim($_POST['cmd']);
		} elseif (!empty($_GET['cmd'])) {
			$cmd = trim($_GET['cmd']);
		}
		
		if (!empty($this->_commands[$cmd]) && method_exists($this, $this->_commands[$cmd])) {
			$result = $this->{$this->_commands[$cmd]}();
		} else {
			// $result = empty($_GET['target']) ? $this->_init() : $this->_open();
			$result = $this->_open();
			// echo '<pre>'; print_r($result['tree']); exit();
		}
		
		if ($this->_options['debug']) {
			$result['debug'] = array(
				'time' => $this->_utime() - $this->_time,
				'mimeTypeDetect' => $this->_mimetypeDetect,
				'du' => $this->_du,
				'tasks' => $this->_tasks,
				'utime' => time()
				);
		}
		
		if (isset($_GET['debug']))
			$this->_dump($result);
		else
			echo json_encode($result);

		exit();

	}

	
	/************************************************************/
	/**                   elFinder commands                    **/
	/************************************************************/
	
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _open()
	{
		if (isset($_GET['current'])) { // read file
			if (empty($_GET['current']) 
			||  empty($_GET['target'])
			||  false == ($dir = $this->_findDir(trim($_GET['current'])))
			||  false == ($file = $this->_find(trim($_GET['target']), $dir)
			||  is_dir($file))
			) {
				header('HTTP/1.x 404 Not Found'); 
				exit('File not found');
			}

			if (filetype($file) == 'link') {
				$file = $this->_readlink($file);
				if (!$file || is_dir($file)) {
					header('HTTP/1.x 404 Not Found'); 
					exit('File not found');
				}
			}
			
			$mime  = $this->_mimetype($file);
			$parts = explode('/', $mime);
			$disp  = $parts[0] == 'image' || $parts[0] == 'text' ? 'inline' : 'attacments';
			
			header("Content-Type: ".$mime);
			header("Content-Disposition: ".$disp."; filename=".basename($file));
			header("Content-Location: ".str_replace($this->_options['root'], '', $file));
			header('Content-Transfer-Encoding: binary');
			header("Content-Length: " .filesize($file));
			header("Connection:close");
			readfile($file);
			exit();
			
		} else { // enter directory
			$result = array();
			$path   = $this->_options['root'];
			if (!empty($_GET['target'])) {
				if (false == ($p = $this->_findDir(trim($_GET['target'])))) {
					$result['warning'] = 'Directory does not exists';
				} elseif (!is_readable($p) || !$this->_isAllowed($p, 'read')) {
					$result['warning'] = 'Access denied';
				} else {
					$path = $p;
				}
				
			}
			if ($path == $this->_options['root']) {
				$name = $rel = $this->_options['rootAlias'] ? $this->_options['rootAlias'] : basename($path);
			} else {
				$name = basename($path);
				$rel = ($rel = $this->_options['rootAlias'] ? $this->_options['rootAlias'] : basename($this->_options['root']))
					.DIRECTORY_SEPARATOR
					.substr($path, strlen($this->_options['root'])+1);
			}
			$write = is_writable($path) && $this->_isAllowed($path, 'write');
			$result['cwd'] = array(
				'hash'   => crc32($path),
				'name'   => $name,
				'rel'    => DIRECTORY_SEPARATOR.$rel,
				'write'  => $write,
				'upload' => $write && $this->_isAllowed($path, 'upload'),
				'mkdir'  => $write && $this->_isAllowed($path, 'mkdir'),
				'rm'     => $write && $this->_isAllowed($path, 'rm'),
				'rmdir'  => $write && $this->_isAllowed($path, 'rmdir')
				);
				
			if (!empty($_GET['tree'])) {
				$result['tree'] = array(
					crc32($this->_options['root']) => array(
						'name' => $this->_options['rootAlias'] ? $this->_options['rootAlias'] : basename($this->_options['root']),
						'dirs' => $this->_tree()
						)
					);
				if (!empty($_GET['init'])) {
					$result['disabled'] = $this->_options['disabled'];
				}
			}
				
			$dirs = $files = array();
			
			if (false != ($d = dir($path))) {
				while ($entr = $d->read()) {
					if ('.' != substr($entr, 0, 1)) {
						$p = $d->path.DIRECTORY_SEPARATOR.$entr;
						$info = $this->_info($p, $write);
						// $hash = crc32($p);
						if ($info['css'] == 'dir') {
							$dirs[] = $info;
						} else {
							$files[] = $info;
						}
					}
				}
			}
			usort($dirs, 'elFinderCmp');
			usort($files, 'elFinderCmp');
			// $result['files'] = $dirs+$files;
			$result['files'] = array_merge($dirs, $files);
			return $result;
		}
		
		
		
	}
	
	

	
	
	
	/************************************************************/
	/**                      fs methods                        **/
	/************************************************************/
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _findDir($hash, $path='')
	{
		if (!$path) {
			$path = $this->_options['root'];
			if (crc32($path) == $hash) {
				return $path;
			}
		}
		if (false != ($d = dir($path))) {
			while ($entr = $d->read()) {
				$p = $d->path.DIRECTORY_SEPARATOR.$entr;
				if ('.' != $entr && '..' != $entr && is_dir($p)) {
					if (crc32($p) == $hash) {
						return $p;
					} elseif (false != ($p = $this->_findDir($hash, $p))) {
						return $p;
					}
				}
			}
		}
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _find($hash, $parent)
	{
		if (false != ($d = dir($parent))) {
			while ($entr = $d->read()) {
				if ('.' != $entr && '..' != $entr) {
					$path = $parent.DIRECTORY_SEPARATOR.$entr;
					if (crc32($path) == $hash) {
						return $path;
					}
				}
			}
		}
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _tree($path = null)
	{
		if (!$path) {
			$path = $this->_options['root'];
		}
		$tree = array();
		
		if (false != ($d = dir($path))) {
			
			while($entr = $d->read()) {
				$p = $d->path.DIRECTORY_SEPARATOR.$entr;
				if ('.' != $entr && '..' != $entr && is_dir($p) && $this->_isAllowed($p, 'read')) {
					$dirs = is_readable($p) ? $this->_tree($p) : null;
					$tree[crc32($p)] = array(
						'name' => $entr,
						'dirs' => $dirs ? $dirs : ''
						);
				}
			}
			$d->close();
		}
		return $tree;
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _info($path, $parentWrite)
	{
		$type = filetype($path);
		$stat = $type == 'link' ? lstat($path) : stat($path);
		
		$info = array(
			'hash'  => crc32($path),
			'name'  => basename($path),
			'size'  => $stat['size'],
			'read'  => is_readable($path),
			'write' => is_writable($path),
			'size'  => $stat['size'],
			'mdate' => date('j M Y H:i', $stat['mtime']),
			'adate' => date('j M Y H:i', $stat['atime']),
			'css'   => 'file',
			'cmd'   => ''
			);
			
		if ($type == 'dir') {
			$info['kind']  = 'Directory';
			$info['css']   = 'dir';
			$info['read']  = $info['read']  && $this->_isAllowed($path, 'read');
			$info['write'] = $info['write'] && $this->_isAllowed($path, 'write');
			return $info;
		} elseif ($type == 'link') {
			$info['kind'] = 'Alias';
			$path = $this->_readlink($path);
			if (!$path) {
				$info['css']   = 'broken';
				$info['write'] = $info['write'] && $parentWrite;
				return $info;
			}
			if (is_dir($path)) {
				$info['css']   = 'dir';
				$info['read']  = $info['read']  && $this->_isAllowed($path, 'read');
				$info['write'] = $info['write'] && $this->_isAllowed($path, 'write');
				return $info;
			}
			$mime = $this->_mimetype($path);

		} else {
			$mime = $this->_mimetype($path);
			$info['kind'] = isset($this->_kinds[$mime]) ? $this->_kinds[$mime] : 'Unknown';
		}
		
		if ($this->_options['allowURLs']) {
			$info['url'] = $this->_path2url($path);
		}	
		
		$parts = explode('/', $mime);

		if (sizeof($parts) == 2) {
			$info['css'] .= ' '.$parts[0].' '.$parts[1];
			if ($parts[0] == 'text' && isset($this->_commands['edit'])) {
				$info['cmd'] = 'edit';
			} elseif (isset($this->_commands['extract']) && $this->_canExtract($parts[1])) {
				$info['cmd'] = 'extract';
			} elseif ($parts[0] == 'image' 
			&& ($parts[1] == 'jpeg' || $parts[1] == 'gif' || $parts[1] == 'png') 
			&& false != ($s = getimagesize($path))) {
				$info['dimensions'] = $s[0].'x'.$s[1];
			}
		}		
		return $info;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _readlink($path)
	{
		$target = readlink($path);
		if ('/' != substr($target, 0, 1)) {
			$target = dirname($path).DIRECTORY_SEPARATOR.$target;
		}
		$target = realpath($target);
		return $target && file_exists($target) && 0 === strpos($target, $this->_options['root']) ? $target : false;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _canExtract($type)
	{
		return false;
	}
	
	
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _checkMimetypeDetect()
	{
		if (!$this->_mimetypeDetect) {
			if (class_exists('finfo')) {
				return $this->_mimetypeDetect = 'finfo';
			} 
			if ( function_exists('mime_content_type') 
			&& (mime_content_type(__FILE__) == 'text/x-php' || mime_content_type(__FILE__) == 'text/x-c++') ) {
				return $this->_mimetypeDetect = 'php';
			}
			$type = exec('file -ib '.escapeshellarg(__FILE__)); 
			if (0 === strpos($type, 'text/x-php') || 0 === strpos($type, 'text/x-c++'))
			{
				return $this->_mimetypeDetect = 'linux';
			}
			$type = exec('file -Ib '.escapeshellarg(__FILE__)); 
			if (0 === strpos($type, 'text/x-php') || 0 === strpos($type, 'text/x-c++'))
			{
				return $this->_mimetypeDetect = 'bsd';
			}
			$this->_mimetypeDetect = 'internal';
		}
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _mimetype($path)
	{
		!$this->_mimetypeDetect && $this->_checkMimetypeDetect();
		switch ($this->_mimetypeDetect) {
			case 'finfo':
				$finfo = finfo_open(FILEINFO_MIME);
				$type = finfo_file($finfo, $path);
				break;
			case 'php':   
			 	$type = mime_content_type($path);
				break;
			case 'linux':  
				$type = exec('file -ib '.escapeshellarg($path));
				break;
			case 'bsd':   
				$type = exec('file -Ib '.escapeshellarg($path));
				break;
			default:
				$ext  = false !== ($p = strrpos($path, '.')) ? substr($path, $p+1) : '';
				$type = isset($this->_mimeTypes[$ext]) ? $this->_mimeTypes[$ext] : 'unknown;';
		}
		$type = explode(';', $type); 
		return $type[0];
	}
	
	

	/************************************************************/
	/**                     cache methods                      **/
	/************************************************************/
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _cache($key, $val=null) {
		return false;
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 **/
	private function _isAllowed($path, $action) {
		// echo "$path, $action<br />";
		return isset($this->_options['defaults'][$action]) ? $this->_options['defaults'][$action] : false;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _dirSize($path)
	{
		if ($this->_options['dirSize']) {
			return $this->_du ? intval(exec('du -k '.escapeshellarg($path)))*1024 : $this->_calcDirSize($path);
		}
		return 0;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _calcDirSize($path)
	{
		$s = 0;
		if (false != ($d = dir($path))) {
			while ($entr = $d->read()) {
				if ('.' != $entr && '..' != $entr) {
					$f = $d->path.DIRECTORY_SEPARATOR.$entr;
					if (is_dir($f)) {
						$s += $this->_calcDirSize($f);
					} elseif (is_file($f)) {
						$s += filesize($f);
					}
				}
			}
			$d->close();
		}
		return $s;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _path2url($path)
	{
		$path = str_replace($this->_options['root'].DIRECTORY_SEPARATOR, '', $path);
		$path = str_replace(DIRECTORY_SEPARATOR, '/', $path);
		return $this->_options['URL'].$path;
	}
	
	
	private function _dump($o) {
		echo '<pre>'; print_r($o); echo '</pre>';
	}
	
	private function _utime()
	{
		$time = explode( " ", microtime());
		return (double)$time[1] + (double)$time[0];
	}
		
}

function elFinderCmp($a, $b) {
	return strcmp($a['name'], $b['name']);
}

?>