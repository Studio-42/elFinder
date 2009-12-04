<?php
if (function_exists('date_default_timezone_set')) {
	date_default_timezone_set('Europe/Moscow');
}


// setlocale(LC_ALL, 'ru_RU');
class elFinder {
	
	/**
	 * object options
	 *
	 * @var array
	 **/
	private $_options = array(
		'root'       => '',
		'URL'        => '',
		'rootAlias'  => 'Home',
		'debug'      => true,
		'dirSize'    => true,
		'fileUmask'  => 0666,
		'dirUmask'   => 0777,
		'tmbDir'     => '.tmb',
		'tmbSize'    => 48,
		'charsNum'   => 13,
		'allowTypes' => array(),
		'allowExts'  => array(),
		'denyTypes'  => array(),
		'denyExts'   => array(),   
		'allowURLs'  => true,
		'disabled'   => array(),
		'sort'       => true,
		'dateFormat' => 'j M Y H:i',
		'aclObj'     => null,
		'aclRole'    => 'user',
		'defaults'   => array(
			'read'   => true,
			'write'  => true,
			'rm'     => true
			),
		'perms' => array()
		);
	
	/**
	 * mapping $_GET['cmd]/$_POST['cmd] to class methods
	 *
	 * @var array
	 **/
	private $_commands = array(
		'open'      => '_open',
		'reload'    => '_reload',
		'mkdir'     => '_mkdir',
		'mkfile'    => '_mkfile',
		'rename'    => '_rename',
		'upload'    => '_upload',
		'paste'     => '_paste',
		'rm'        => '_rm',
		'duplicate' => '_duplicate',
		'edit'      => '_edit',
		'extract'   => '_extract'
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
	private $_mimetypeDetect = '';	
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_mb = false;
	
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
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_errMsg = '';
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_errFile = '';
		
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_errorData = array();
		
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_fakeRoot = '';
		
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

		$this->_fakeRoot = !$this->_options['rootAlias'] 
			? $this->_options['root'] 
			: dirname($this->_options['root']).DIRECTORY_SEPARATOR.$this->_options['rootAlias'];
			
		if (!empty($this->_options['disabled'])) {
			foreach ($this->_options['disabled'] as $c) {
				if (isset($this->_commands[$c]) && $c != 'open' && $c != 'reload' ) {
					unset($this->_commands[$c]);
				}
			}
		}
		
		$this->_time = $this->_options['debug'] ? $this->_utime() : 0;
		
		if ($this->_options['dirSize'] && function_exists('exec')) {
			$test = exec('du -h '.escapeshellarg(__FILE__), $o, $s); 
			$this->_du = $s == 0 && $test>0;
		}
		
		if (function_exists('mb_internal_encoding')) {
			$this->_mb = true;
			mb_internal_encoding("UTF-8");
		}
		
	}

	/**
	 * undocumented function
	 *
	 * @return void
	 **/
	public function run() {
		if (empty($this->_options['root']) || !is_dir($this->_options['root'])) {
			exit(json_encode(array('error' => 'Invalid backend configuration!')));
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
		
		if ($cmd && (empty($this->_commands[$cmd]) || !method_exists($this, $this->_commands[$cmd]))) {
			exit(json_encode(array('error' => 'Unknown command!')));
		}
		
		if ($cmd) {
			$result = $this->{$this->_commands[$cmd]}();
		} else {
			$result = $this->_reload();
			$result['disabled'] = $this->_options['disabled'];
			// echo '<pre>'; print_r($result); exit();
		}
		
		if ($this->_options['debug']) {
			$result['debug'] = array(
				'time' => $this->_utime() - $this->_time,
				'mimeTypeDetect' => $this->_mimetypeDetect,
				'du' => $this->_du,
				// 'tasks' => $this->_tasks,
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
	private function _open($incTree=false)
	{
		if (isset($_GET['current'])) { // read file
			if (empty($_GET['current']) 
			||  empty($_GET['target'])
			||  false == ($dir = $this->_findDir(trim($_GET['current'])))
			||  false == ($file = $this->_find(trim($_GET['target']), $dir))
			||  is_dir($file)
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
			return $result+$this->_content($path, $incTree);
		}
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _reload()
	{
		return $this->_open(true);
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _rename()
	{
		$result = array();
		
		if (empty($_GET['current']) 
		||  empty($_GET['target'])
		||  false == ($dir = $this->_findDir(trim($_GET['current'])))
		||  false == ($file = $this->_find(trim($_GET['target']), $dir))
		) {
			$result['error'] = 'File does not exists';
		} elseif (false == ($name = $this->_checkName($_GET['name'])) ) {
			$result['error'] = 'Invalid name';
		} elseif (!$this->_isAllowed($dir, 'write')) {
			$result['error'] = 'Access denied!';
		} elseif (file_exists($dir.DIRECTORY_SEPARATOR.$name)) {
			$result['error'] = 'File or folder with the same name already exists';
		} elseif (!rename($file, $dir.DIRECTORY_SEPARATOR.$name)) {
			$result['error'] = 'Unable to rename file';
		} else {
			$result = $this->_content($dir, is_dir($dir.DIRECTORY_SEPARATOR.$name));
		}
		return $result;
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _mkdir()
	{
		$result = array();
		if (empty($_GET['current']) ||  false == ($dir = $this->_findDir(trim($_GET['current'])))) {
			$result['error'] = 'Invalid parameters';
		} elseif (!$this->_isAllowed($dir, 'write')) {
			$result['error'] = 'Access denied!';
		} elseif (false == ($name = $this->_checkName($_GET['name'])) ) {
			$result['error'] = 'Invalid name';
		} elseif (file_exists($dir.DIRECTORY_SEPARATOR.$name)) {
			$result['error'] = 'File or folder with the same name already exists';
		} elseif (!mkdir($dir.DIRECTORY_SEPARATOR.$name, $this->_options['dirUmask'])) {
			$result['error'] = 'Unable to create folder';
		} else {
			$result = $this->_content($dir, true);
		}
		return $result;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _mkfile()
	{
		$result = array();
		if (empty($_GET['current']) ||  false == ($dir = $this->_findDir(trim($_GET['current'])))) {
			$result['error'] = 'Invalid parameters';
		} elseif (!$this->_isAllowed($dir, 'write')) {
			$result['error'] = 'Access denied!';
		} elseif (false == ($name = $this->_checkName($_GET['name'])) ) {
			$result['error'] = 'Invalid name';
		} elseif (file_exists($dir.DIRECTORY_SEPARATOR.$name)) {
			$result['error'] = 'File or folder with the same name already exists';
		} else {
			$f = $dir.DIRECTORY_SEPARATOR.$name;
			if (false != ($fp = fopen($f, 'wb'))) {
				fwrite($fp, "text\n");
				fclose($fp);
				$result = $this->_content($dir);
			} else {
				$result['error'] = 'Unable to create file';
			}
		} 
		return $result;
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _rm()
	{
		$result = array();
		if (empty($_GET['current']) 
		||  false == ($dir = $this->_findDir(trim($_GET['current']))) 
		|| (empty($_GET['rm']) || !is_array($_GET['rm']))) {
			$result['error'] = 'Invalid parameters';
			return $result;
		} 
		
		foreach ($_GET['rm'] as $hash) {
			if (false == ($f = $this->_find($hash, $dir))) {
				$result['error'] = 'File not found!';
				return $result+$this->_content($dir, true);
			}
			if (!$this->_remove($f)) {
				$result['error'] = 'Remove failed!';
				$result['errorData'] = array($this->_errFile => $this->_errMsg ? $this->_errMsg : 'Unable to remove');
				return $result+$this->_content($dir, true);
			}
			
		}
		return $result+$this->_content($dir, true);
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _upload()
	{
		$result = array('ok' => '');

		if (empty($_POST['current']) || false == ($dir = $this->_findDir(trim($_POST['current'])))) {
			$result['error'] = 'Invalid parameters';
			return $result;
		} 
		if (!$this->_isAllowed($dir, 'write')) {
			$result['error'] = 'Access denied!';
			return $result;
		}
		if (empty($_FILES['fm-file']))
		{
			$result['error'] = 'Select at least one file to upload';
			return $result;
		}

		$total  = count($_FILES['fm-file']['name']);
		$failed = array();
		for ($i=0; $i < $total; $i++) { 
			if (!empty($_FILES['fm-file']['name'][$i])) {
				if ($_FILES['fm-file']['error'][$i] > 0) {
					switch ($_FILES['fm-file']['error'][$i]) {
						case UPLOAD_ERR_INI_SIZE:
						case UPLOAD_ERR_FORM_SIZE:
							$error = 'File exceeds the maximum allowed filesize';
							break;
						case UPLOAD_ERR_PARTIAL:
							$error = 'File was only partially uploaded';
							break;
						case UPLOAD_ERR_NO_FILE:
							$error = 'No file was uploaded';
							break;
						case UPLOAD_ERR_NO_TMP_DIR:
							$error = 'Missing a temporary folder';
							break;
						case UPLOAD_ERR_CANT_WRITE:
							$error = 'Failed to write file to disk';
							break;
						case UPLOAD_ERR_EXTENSION:
							$error = 'Not allowed file type';
					}
					$failed[$_FILES['fm-file']['name'][$i]] = $error;
				} elseif (false == ($name = $this->_checkName($_FILES['fm-file']['name'][$i]))) {
					$failed[$_FILES['fm-file']['name'][$i]] = 'Invalid name';
				} elseif (!$this->_isAllowedUpload($_FILES['fm-file']['name'][$i], $_FILES['fm-file']['tmp_name'][$i])) {
					$failed[$_FILES['fm-file']['name'][$i]] = 'Not allowed file type';
				} else {
					$file = $dir.DIRECTORY_SEPARATOR.$_FILES['fm-file']['name'][$i];
					if (!@move_uploaded_file($_FILES['fm-file']['tmp_name'][$i], $file)) {
						$failed[$_FILES['fm-file']['name'][$i]] = 'Unable to save uploaded file';
					} else {
						@chmod($file, $this->_options['fileUmask']);
					}
				}
			}
		}
		if (!empty($failed)) {
			if (count($failed) == $total) {
				$result['error'] = 'Unable to upload files';
			} else {
				$result['warning'] = 'Some files was not uploaded';
			}
			$result['errorData'] = $failed;
		}
		if (empty($result['error'])) {
			$result += $this->_content($dir);
		}
		return $result;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _paste()
	{
		$result = array();
		if (empty($_GET['current']) 
		|| false == ($current = $this->_findDir(trim($_GET['current'])))
		|| empty($_GET['src'])
		|| false == ($src = $this->_findDir(trim($_GET['src'])))
		|| empty($_GET['target'])
		|| false == ($target = $this->_findDir(trim($_GET['target'])))
		|| empty($_GET['files']) || !is_array($_GET['files'])
		) {
			$result['error'] = 'Invalid parameters';
			return $result;
		}
		
		if (!$this->_isAllowed($target, 'write') || !$this->_isAllowed($src, 'read')) {
			$result['error'] = 'Access denied!';
			return $result;
		}

		$cut = !empty($_GET['cut']);
		foreach ($_GET['files'] as $hash) {
			if (false == ($f = $this->_find($hash, $src))) {
				$result['error'] = 'File not found!';
				break;
			}
			
			$trg = $target.DIRECTORY_SEPARATOR.basename($f);

			if (0 === strpos($trg, $f)) {
				$result['error'] = 'Unable to copy into itself!';
				return $result;
			}
			
			if ($cut) {
				if (!$this->_isAllowed($f, 'rm')) {
					$result['error'] = 'Unable to complite request!';
					$this->_setErrorData($f, 'Access denied!');
					$result['errorData'] = $result['errorData'] = $this->_errorData;
					break;
				}
				if ((file_exists($trg) && !$this->_remove($trg)) || !@rename($f, $trg) ) {
					$result['error'] = 'Unable to complite request!';
					$this->_setErrorData($f, 'Unable to move!');
					$result['errorData'] = $result['errorData'] = $this->_errorData;
					break;
				}
			} else {
				if (!$this->_copy($f, $trg)) {
					$result['error'] = 'Unable to complite request!';
					$result['errorData'] = $this->_errorData;
					break;
				}
			}
		}
		return $result+$this->_content($current, true);
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _duplicate()
	{
		if (empty($_GET['current']) 
		|| false == ($current = $this->_findDir(trim($_GET['current'])))
		|| empty($_GET['file'])
		|| false == ($file = $this->_find(trim($_GET['file']), $current))
		) {
			$result['error'] = 'Invalid parameters';
			return $result;
		}
		
		if (!$this->_copy($file, $this->_uniqueName($file))) {
			$result['error'] = $this->_errMsg;
			return $result;
		}
		return $this->_content($current);
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
	private function _uniqueName($f)
	{
		$dir = dirname($f);
		$name = basename($f);
		$ext = '';
		if (!is_dir($f) && false != ($p = strrpos($name, '.'))) {
			$ext = substr($name, $p);
			$name = substr($name, 0, $p);
		}
		
		if (!file_exists($dir.DIRECTORY_SEPARATOR.$name.'-copy'.$ext)) {
			return $dir.DIRECTORY_SEPARATOR.$name.'-copy'.$ext;
		}
		$i = 1;
		while ($i++<=1000) {
			if (!file_exists($dir.DIRECTORY_SEPARATOR.$name.'-copy'.$i.$ext)) {
				return $dir.DIRECTORY_SEPARATOR.$name.'-copy'.$i.$ext;
			}	
		}
		return $dir.DIRECTORY_SEPARATOR.$name.md5($f).$ext;
	}

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _content($path, $tree=false)
	{
		$ret = array(
			'cwd' => $this->_cwd($path),
			'cdc' => $this->_cdc($path)
			);
		
		if ($tree) {
			$ret['tree'] = array(
				crc32($this->_options['root']) => array(
					'name' => $this->_options['rootAlias'] ? $this->_options['rootAlias'] : basename($this->_options['root']),
					'read' => true,
					'write' => is_writable($this->_options['root']) && $this->_isAllowed($this->_options['root'], 'write'),
					'dirs' => $this->_tree($this->_options['root'])
					)
				);
		}
		return $ret;
	}

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _cwd($path)
	{
		if ($path == $this->_options['root']) {
			$name = $rel = $this->_options['rootAlias'] ? $this->_options['rootAlias'] : basename($path);
		} else {
			$name = basename($path);
			$rel  = $this->_options['rootAlias'] ? $this->_options['rootAlias'] : basename($this->_options['root']);
			$rel .= DIRECTORY_SEPARATOR.substr($path, strlen($this->_options['root'])+1);
		}
		return array(
			'hash'       => crc32($path),
			'name'       => $name,
			'rel'        => $rel,
			'size'       => 0,
			'date'       => date($this->_options['dateFormat'], filemtime($path)),
			'read'       => true,
			'write'      => is_writable($path) && $this->_isAllowed($path, 'write'),
			'rm'         => $path == $this->_options['root'] ? false : $this->_isAllowed($path, 'rm'),
			'uplMaxSize' => ini_get('upload_max_filesize')
			);
	}

	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _cdc($path)
	{
		$dirs = $files = array();
		$ls = scandir($path);
		for ($i=0; $i < count($ls); $i++) { 
			if ('.' != substr($ls[$i], 0, 1)) {
				$info = $this->_info($path.DIRECTORY_SEPARATOR.$ls[$i]);
				if ($info['type'] == 'dir') {
					$dirs[] = $info;
				} else {
					$files[] = $info;
				}
				
			}
		}
		return array_merge($dirs, $files);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _remove($path)
	{
		if (!$this->_isAllowed($path, 'rm')) {
			$this->_errMsg = 'Access denied!';
			$this->_errFile = $path;
			return false;
		}
		if (!is_dir($path)) {
			return @unlink($path);
		}
		
		$ls = scandir($path);
		for ($i=0; $i < count($ls); $i++) { 
			if ('.' != $ls[$i] && '..' != $ls[$i]) {
				if (!$this->_remove($path.DIRECTORY_SEPARATOR.$ls[$i])) {
					return false;
				}
			}
		}
		return @rmdir($path);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _copy($src, $trg)
	{
		if (!$this->_isAllowed($src, 'read')) {
			return $this->_setErrorData($src, 'Access denied!');
		}
		
		$dir = dirname($trg);
		
		if (!$this->_isAllowed($dir, 'write')) {
			return $this->_setErrorData($dir, 'Access denied!');
		}
		// echo "$src $trg<br />";
		// return true;
		if (!is_dir($src)) {
			if (!@copy($src, $trg)) {
				return $this->_setErrorData($src, 'Unable to copy!');
			} 
			@chmod($trg, $this->_options['fileUmask']);
		} else {
			
			if (is_dir($trg) && !$this->_remove($trg)) {
				return $this->_setErrorData($src, 'Unable to copy!');
			}
			if (!@mkdir($trg, $this->_options['dirUmask'])) {
				return $this->_setErrorData($src, 'Unable to copy!');
			}
			
			$ls = scandir($src);
			
			for ($i=0; $i < count($ls); $i++) { 
				if ('.' != $ls[$i] && '..' != $ls[$i]) {
					$_src = $src.DIRECTORY_SEPARATOR.$ls[$i];
					$_trg = $trg.DIRECTORY_SEPARATOR.$ls[$i];
					if (is_dir($_src)) {
						if (!$this->_copy($_src, $_trg)) {
							return $this->_setErrorData($_src, 'Unable to copy!');
						}
					} else {
						if (!@copy($_src, $_trg)) {
							return $this->_setErrorData($_src, 'Unable to copy!');
						}
						@chmod($_trg, $this->_options['fileUmask']);
					}
				}
			}
			
		}
		
		return true;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _checkName($n)
	{
		$n = strip_tags(trim($n));
		return preg_match('/^[^\.\\/\<\>][^\\/\<\>]*$/', $n) ? $n : false;
	}
	
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
		if (is_readable($path) && false != ($d = dir($path))) {
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
	 * Return directory tree (multidimensional array)
	 *
	 * @param  string  $path  directory path
	 * @return array
	 **/
	private function _tree($path)
	{
		$tree = array();
		
		if (false != ($d = dir($path))) {
			while($entr = $d->read()) {
				$p = $d->path.DIRECTORY_SEPARATOR.$entr;
				if ('.' != substr($entr, 0, 1) && !is_link($p) && is_dir($p) ) {
					$read = is_readable($p) && $this->_isAllowed($p, 'read');
					$dirs = $read ? $this->_tree($p) : '';
					$tree[crc32($p)] = array(
						'name'  => $entr,
						'read'  => $read,
						'write' => is_writable($p) && $this->_isAllowed($p, 'write'),
						'dirs'  => $dirs ? $dirs : ''
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
	private function _info($path)
	{
		$type = filetype($path);
		$stat =  $type == 'link' ? lstat($path) : stat($path);
		
		$info = array(
			'name'  => basename($path),
			'hash'  => crc32($path),
			'type'  => $type,
			'mime'  => $type == 'dir' ? 'directory' : $this->_mimetype($path),
			'date'  => date($this->_options['dateFormat'], $stat['mtime']),
			'size'  => $type == 'dir' ? $this->_dirSize($path) : $stat['size'],
			'read'  => is_readable($path) && $this->_isAllowed($path, 'read'),
			'write' => is_writable($path) && $this->_isAllowed($path, 'write'),
			'rm'    => $this->_isAllowed($path, 'rm'),
			);
		
				
		if ($type == 'link') {
			$path = $this->_readlink($path);
			if (!$path) {
				$info['mime'] = 'unknown';
				return $info;
			}
			$info['link']   = crc32($path);
			$info['linkTo'] = ($this->_options['rootAlias'] ? $this->_options['rootAlias'] : basename($this->_options['root'])).substr($path, strlen($this->_options['root']));
			$info['read']   = is_readable($path) && $this->_isAllowed($path, 'read');
			$info['write']  = is_writable($path) && $this->_isAllowed($path, 'write');
			$info['rm']     = $this->_isAllowed($path, 'rm');
			if (is_dir($path)) {
				$info['mime']  = 'directory';
			} else {
				$info['parent'] = crc32(dirname($path));
				$info['mime']   = $this->_mimetype($path);
			}
		} 
		
		if ($info['mime'] != 'directory') {
			if ($this->_options['allowURLs']) {
				$info['url'] = $this->_path2url($path);
			}
			if (($info['mime'] == 'image/jpeg' || $info['mime'] == 'image/png' || $info['mime'] == 'image/gif') 
			&& false != ($s = getimagesize($path))) {
				$info['dim'] = $s[0].'x'.$s[1];
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
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _isAllowedUpload($name, $tmpName)
	{
		return true;
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
		return filesize($path);
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
		$dir  = substr(dirname($path), strlen($this->_options['root'])+1);
		$file = rawurlencode(basename($path));
		return $this->_options['URL'].($dir ? str_replace(DIRECTORY_SEPARATOR, '/', $dir).'/' : '').$file;
	}
	
	
	private function _dump($o) {
		echo '<pre>'; print_r($o); echo '</pre>';
	}
	
	private function _utime()
	{
		$time = explode( " ", microtime());
		return (double)$time[1] + (double)$time[0];
	}
		
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _setErrorData($path, $msg)
	{
		$path = preg_replace('|^'.preg_quote($this->_options['root']).'|', $this->_fakeRoot, $path);
		$this->_errorData[$path] = $msg;
		return false;
	}	
	
		
	
}

function elFinderCmp($a, $b) {
	return strcmp($a['name'], $b['name']);
}

?>