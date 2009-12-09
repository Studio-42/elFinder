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
		'root'           => '',          // path to root directory
		'URL'            => '',          // root directory URL
		'rootAlias'      => 'Home',      // display this instead of root directory name
		'ignoreDotFiles' => true,        // do not display dot files
		'cntDirSize'     => true,        // count total directories sizes
		'fileUmask'      => 0666,        // permission for new files
		'dirUmask'       => 0777,        // permission for new directories
		'mimeDetect'     => 'auto',      // files mimetypes detection method (finfo, mime_content_type, linux (file -ib), bsd (file -Ib), internal (by extensions))
		'imgLib'         => 'auto',      // image manipulation library
		'tmbDir'         => '.tmb',      // directory name for image thumbnails. Set to "" to avoid thumbnails generation
		'tmbSize'        => 48,          // images thumbnails size (px)
		'allowTypes'     => array(),     // mimetypes which allowed to upload
		'allowExts'      => array(),     // file extensions which allowed to upload
		'denyTypes'      => array(),     // mimetypes which not allowed to upload
		'denyExts'       => array(),     // file extensions which not allowed to upload
		'denyURLs'       => true,        // do not display file URL in "get info"
		'disabled'       => array(),     // list of not allowed commands
		'dateFormat'     => 'j M Y H:i', // file modification date format
		'aclObj'         => null,        // acl object
		'aclRole'        => 'user',      // role for acl
		'defaults'       => array(       // default permisions
			'read'   => true,
			'write'  => true,
			'rm'     => true
			),
		'perms'         => array(),      // individual folders/files permisions     
		'gzip'          => false,     
		'debug'         => true          // send debug to client
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
		'extract'   => '_extract',
		'resize'    => '_resize',
		'geturl'    => '_geturl',
		'tmb'       => '_thumbnails'
		);
		
	/**
	 * extensions/mimetypes for _mimetypeDetect = 'internal' 
	 *
	 * @var array
	 **/
	private $_mimeTypes = array(
		//applications
		'ai'    => 'application/postscript',
		'eps'   => 'application/postscript',
		'exe'   => 'application/octet-stream',
		'doc'   => 'application/vnd.ms-word',
		'xls'   => 'application/vnd.ms-excel',
		'ppt'   => 'application/vnd.ms-powerpoint',
		'pps'   => 'application/vnd.ms-powerpoint',
		'pdf'   => 'application/pdf',
	    'xml'   => 'application/xml',
		'odt'   => 'application/vnd.oasis.opendocument.text',
		'swf'   => 'application/x-shockwave-flash',
		
		// archives
	    'gz'    => 'application/x-gzip',
	    'tgz'   => 'application/x-gzip',
	    'bz'    => 'application/x-bzip2',
		'bz2'   => 'application/x-bzip2',
	    'tbz'   => 'application/x-bzip2',
	    'zip'   => 'application/x-zip',
	    'rar'   => 'application/x-rar',
		'tar'   => 'application/x-tar',
		// texts
		'txt'   => 'plain/text',
	    'php'   => 'text/x-php',
	    'html'  => 'text/html',
		'htm'   => 'text/html',
	 	'js'    => 'text/javascript',
		'css'   => 'text/css',
	    'rtf'   => 'text/rtf',
		'rtfd'  => 'text/rtfd',
		'py'    => 'text/x-python',
		'java'  => 'text/x-java-source',
		'rb'    => 'text/x-ruby',
		'sh'    => 'text/x-shellscript',
		'pl'    => 'text/x-perl',
		'sql'   => 'text/x-sql',
	    // images
		'bmp'   => 'image/x-ms-bmp',
	    'jpg'   => 'image/jpeg',
	    'jpeg'  => 'image/jpeg',
	    'gif'   => 'image/gif',
	    'png'   => 'image/png',
	    'tif'   => 'image/tiff',
	    'psd'   => 'image/vnd.adobe.photoshop',
	    //audio
		'mp3'   => 'audio/mpeg',
		'mid'   => 'audio/midi',
		'ogg'   => 'audio/ogg',
		'mp4a'  => 'audio/mp4',
		'wav'   => 'audio/wav',
		'wma'   => 'audio/x-ms-wma',
		// video
		'avi'   => 'video/x-msvideo',
		'dv'    => 'video/x-dv',
		'mp4'   => 'video/mp4',
		'mpeg'  => 'video/mpeg',
		'mpg'   => 'video/mpeg',
		'mov'   => 'video/quicktime',
		'wm'    => 'video/x-ms-wmv',
		'flv'   => 'video/x-flv',
		);
	
	
	/**
	 * image manipulation library (imagick | mogrify | gd)
	 *
	 * @var string
	 **/
	private $_imgLib = '';
	
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
	private $_tmbDir = null;
		
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_createTmb = false;
		
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
				if (isset($this->_commands[$c]) && $c != 'open' && $c != 'reload' && $c != 'select' ) {
					unset($this->_commands[$c]);
				}
			}
		}
		
		$this->_time = $this->_options['debug'] ? $this->_utime() : 0;
		
		if ($this->_options['cntDirSize'] && function_exists('exec')) {
			$test = exec('du -h '.escapeshellarg(__FILE__), $o, $s); 
			$this->_du = $s == 0 && $test>0;
		}
		
		// find image manipulation library
		if ($this->_options['tmbDir'] && (empty($this->_options['imgLib']) || $this->_options['imgLib'] == 'auto')) {
			if (extension_loaded('imagick')) {
				$this->_options['imgLib'] = 'imagick';
			} elseif (function_exists('exec')) {
				exec('mogrify --version', $o, $c); 
				if ($c == 0 && !empty($o))
				{
					$this->_options['imgLib'] = 'mogrify';
				}
			}
			if (!$this->_options['imgLib'] && function_exists('gd_info')) {
				$this->_options['imgLib'] = 'mogrify';
			}
		}
		
		if (!in_array($this->_options['imgLib'], array('imagick', 'mogrify', 'gd'))) {
			$this->_options['imgLib'] = '';
			$this->_options['tmbDir'] = '';
		} else {
			$this->_options['tmbSize'] = intval($this->_options['tmbSize']);
			if ($this->_options['tmbSize'] < 12) {
				$this->_options['tmbSize'] = 48;
			}
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
				'time'       => $this->_utime() - $this->_time,
				'mimeDetect' => $this->_options['mimeDetect'],
				'imgLib'     => $this->_options['imgLib'],
				'du'         => $this->_du
				);
		}
		
		$result['tmb'] = $this->_createTmb && $this->_tmbDir;
		
		$j = json_encode($result);
		if (!$this->_options['gzip']) {
			echo $j;
		} else {
			ob_start("ob_gzhandler");
			echo $j;
			ob_end_flush();
		}
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
	private function _open($tree=false)
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
			header("Connection: close");
			readfile($file);
			exit();
			
		} else { // enter directory
			$result = array();
			$path   = $this->_options['root'];
			if (!empty($_GET['target'])) {
				if (false == ($p = $this->_findDir(trim($_GET['target'])))) {
					$result['warning'] = 'Invalid parameters';
				} elseif (!is_readable($p) || !$this->_isAllowed($p, 'read')) {
					$result['warning'] = 'Access denied';
				} else {
					$path = $p;
				}
			}
			return $result+$this->_content($path, $tree);
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
			$result['error'] = 'Access denied';
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
			$result['error'] = 'Access denied';
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
			$result['error'] = 'Access denied';
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
				$result['error'] = 'File not found';
				return $result+$this->_content($dir, true);
			}
			if (!$this->_remove($f)) {
				$result['error'] = 'Remove failed';
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
			$result['error'] = 'Access denied';
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
						// if (false != ($s = getimagesize($file))) {
						// 	$result['warning'] = 'Image '+$file;
						// 	$this->_tmb($file);
						// }
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
		if (!$this->_isAllowed($current, 'write') || !$this->_isAllowed($file, 'read')) {
			$result['error'] = 'Access denied';
			return $result;
		}
		if (!$this->_copy($file, $this->_uniqueName($file))) {
			$result['error'] = $this->_errMsg;
			return $result;
		}
		return $this->_content($current);
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _resize()
	{
		$result = array();
		if (empty($_GET['current']) 
		|| false == ($current = $this->_findDir(trim($_GET['current'])))
		|| empty($_GET['file'])
		|| false == ($file = $this->_find(trim($_GET['file']), $current))
		|| empty($_GET['width']) || 0 >= ($width = intval($_GET['width']))
		|| empty($_GET['height']) || 0 >= ($height = intval($_GET['height']))
		) {
			$result['error'] = 'Invalid parameters';
		} elseif (!$this->_resizeImg($file, $width, $height)) {
			$result['error'] = 'Unable to resize image';
		} else {
			$result = $this->_content($current);
		}
		
		return $result;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _geturl()
	{
		if (empty($_GET['current']) 
		|| false == ($current = $this->_findDir(trim($_GET['current'])))
		|| empty($_GET['file'])
		|| false == ($file = $this->_find(trim($_GET['file']), $current))
		) {
			$result['error'] = 'Invalid parameters';
			return $result;
		}
		return array('url' => $this->_path2url($file));
	}
	
	
	/************************************************************/
	/**                    "content" methods                   **/
	/************************************************************/
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
			'hash'       => $this->_hash($path),
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
			if ($this->_isAccepted($ls[$i])) {
				$info = $this->_info($path.DIRECTORY_SEPARATOR.$ls[$i]);
				if ($info['mime'] == 'directory') {
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
	private function _info($path)
	{
		$type = filetype($path);
		$stat =  $type == 'link' ? lstat($path) : stat($path);
		
		$info = array(
			'name'  => basename($path),
			'hash'  => $this->_hash($path),
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
			$info['link']   = $this->_hash($path);
			$info['linkTo'] = ($this->_options['rootAlias'] ? $this->_options['rootAlias'] : basename($this->_options['root'])).substr($path, strlen($this->_options['root']));
			$info['read']   = is_readable($path) && $this->_isAllowed($path, 'read');
			$info['write']  = is_writable($path) && $this->_isAllowed($path, 'write');
			$info['rm']     = $this->_isAllowed($path, 'rm');
			if (is_dir($path)) {
				$info['mime']  = 'directory';
			} else {
				$info['parent'] = $this->_hash(dirname($path));
				$info['mime']   = $this->_mimetype($path);
			}
		} 
		
		if ($info['mime'] != 'directory') {
			if (!$this->_options['denyURLs']) {
				$info['url'] = $this->_path2url($path);
			}
			if (0 === ($p = strpos($info['mime'], 'image')) && false != ($s = getimagesize($path))) {
				$info['dim'] = $s[0].'x'.$s[1];
				if (false != ($tmbDir = $this->_tmbDir($path))) {
					$tmb = $tmbDir.DIRECTORY_SEPARATOR.basename($path);
					if (file_exists($tmb)) {
						$info['tmb']  = $this->_path2url($tmb);
					} else {
						$this->_createTmb = true;
					}
				}
				
			}
		}
		
		return $info;
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
		
		if (false != ($ls = scandir($path))) {
			
			for ($i=0; $i < count($ls); $i++) {
				$p = $path.DIRECTORY_SEPARATOR.$ls[$i]; 
				if ($this->_isAccepted($ls[$i]) && filetype($p) == 'dir') {
					$read = is_readable($p) && $this->_isAllowed($p, 'read');
					$dirs = $read ? $this->_tree($p) : '';
					$tree[$this->_hash($p)] = array(
						'name'  => $ls[$i],
						'read'  => $read,
						'write' => is_writable($p) && $this->_isAllowed($p, 'write'),
						'dirs'  => !empty($dirs) ? $dirs : ''
						);
				}
			}
		}
		return $tree;
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
			if ($this->_isAccepted($ls[$i])) {
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
		
		if (false != ($ls = scandir($path))) {
			for ($i=0; $i < count($ls); $i++) { 
				$p = $path.DIRECTORY_SEPARATOR.$ls[$i];
				if ($this->_isAccepted($ls[$i]) && is_dir($p)) {
					if (crc32($p) == $hash || false != ($p = $this->_findDir($hash, $p))) {
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
	private function _find($hash, $path)
	{
		if (false != ($ls = scandir($path))) {
			for ($i=0; $i < count($ls); $i++) { 
				if ($this->_isAccepted($ls[$i])) {
					$p = $path.DIRECTORY_SEPARATOR.$ls[$i];
					if (crc32($p) == $hash) {
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
	private function _readlink($path)
	{
		$target = readlink($path);
		if ('/' != substr($target, 0, 1)) {
			$target = dirname($path).DIRECTORY_SEPARATOR.$target;
		}
		$target = realpath($target);
		$root   = realpath($this->_options['root']);
		return $target && file_exists($target) && 0 === strpos($target, $root) ? $target : false;
	}
	
	/**
	 * Count total directory size if this allowed in options
	 *
	 * @param  string  $path  directory path
	 * @return int
	 **/
	private function _dirSize($path)
	{
		$size = 0;
		if (!$this->_options['cntDirSize'] || !is_readable($path) || !$this->_isAllowed($path, 'read')) {
			$size = filesize($path);
		} elseif ($this->_du) {
			$size = intval(exec('du -k '.escapeshellarg($path)))*1024;
		} else {
			$ls = scandir($path);
			for ($i=0; $i < count($ls); $i++) { 
				if ($this->_isAccepted($ls[$i])) {
					$p = $path.DIRECTORY_SEPARATOR.$ls[$i];
					$size += filetype($p) == 'dir' && is_readable($p) && $this->_isAllowed($p, 'read') ? $this->_dirSize($p) : filesize($p);
				}
			}
		}
		return $size;
	}
	
	/**
	 * return file mimetype
	 *
	 * @param  string  $path  file path
	 * @return string
	 **/
	private function _mimetype($path)
	{
		if (!$this->_options['mimeDetect'] || $this->_options['mimeDetect'] == 'auto') {
			$this->_options['mimeDetect'] = 'internal';
			if (class_exists('finfo')) {
				$this->_options['mimeDetect'] = 'finfo';
			} elseif (function_exists('mime_content_type') && (mime_content_type(__FILE__) == 'text/x-php' || mime_content_type(__FILE__) == 'text/x-c++')) {
				$this->_options['mimeDetect'] = 'mime_content_type';
			} elseif (function_exists('exec')) {
				$type = exec('file -ib '.escapeshellarg(__FILE__));
				if (0 === strpos($type, 'text/x-php') || 0 === strpos($type, 'text/x-c++'))
				{
					$this->_options['mimeDetect'] = 'linux';
				} else {
					$type = exec('file -Ib '.escapeshellarg(__FILE__)); 
					if (0 === strpos($type, 'text/x-php') || 0 === strpos($type, 'text/x-c++'))
					{
						$this->_options['mimeDetect'] = 'bsd';
					}
				}
			}
		}
		
		switch ($this->_options['mimeDetect']) {
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
				$ext  = false !== ($p = strrpos($path, '.')) ? strtolower(substr($path, $p+1)) : '';
				$type = isset($this->_mimeTypes[$ext]) ? $this->_mimeTypes[$ext] : 'unknown;';
		}
		$type = explode(';', $type); 
		return $type[0];
	}
	
	
	
	/************************************************************/
	/**                   image manipulation                   **/
	/************************************************************/
	
	
	/**
	 * set/get thumbnails path for current directory (set once for request)
	 *
	 * @param  string path to image
	 * @return string
	 **/
	private function _tmbDir($path)
	{
		if (is_null($this->_tmbDir)) {
			if (!$this->_options['tmbDir']) {
				$this->_tmbDir = '';
			} else {
				$d = dirname($path).DIRECTORY_SEPARATOR.$this->_options['tmbDir']; 
				if (is_dir($d) || mkdir($d, $this->_options['dirUmask'])) {
					$this->_tmbDir = $d;
				} else {
					$this->_tmbDir = '';
				}
			}
		}
		return $this->_tmbDir;
	}
	
	/**
	 * Create image thumbnail
	 *
	 * @param
	 * @param	
	 * @return void
	 **/
	private function _tmb($img, $tmb)
	{
		if (false == ($s = getimagesize($img))) {
			return false;
		}
		$tmbSize = $this->_options['tmbSize'];
		switch ($this->_options['imgLib']) {
			case 'imagick':
				$_img = new imagick($img);
				$_img->contrastImage(1);
				return $_img->cropThumbnailImage($tmbSize, $tmbSize) && $_img->writeImage($tmb);
				break;
				
			case 'mogrify':
				if (@copy($img, $tmb)) {
					list($x, $y, $size) = $this->_cropPos($s[0], $s[1]);
					exec('mogrify -crop '.$size.'x'.$size.'+'.$x.'+'.$y.' -scale '.$tmbSize.'x'.$tmbSize.'! '.escapeshellarg($tmb), $o, $c);
					return $c == 0;	
				}
				break;
			
			case 'gd':
				if ($s['mime'] == 'image/jpeg') {
					$_img = imagecreatefromjpeg($img);
				} elseif ($s['mime'] = 'image/png') {
					$_img = imagecreatefrompng($img);
				} elseif ($s['mime'] = 'image/gif') {
					$_img = imagecreatefromgif($img);
				} 
				if (!$_img || false == ($_tmb = imagecreatetruecolor($tmbSize, $tmbSize))) {
					return false;
				}
				list($x, $y, $size) = $this->_cropPos($s[0], $s[1]);
				if (!imagecopyresampled($_tmb, $_img, 0, 0, $x, $y, $tmbSize, $tmbSize, $size, $size)) {
					return false;
				}
				if ($s['mime'] == 'image/jpeg') {
					$r = imagejpeg($_tmb, $tmb, 100);
				} else if ($s['mime'] = 'image/png') {
					$r = imagepng($_tmb, $tmb, 7);
				} else {
					$r = imagegif($_tmb, $tmb, 7);
				}
				imagedestroy($_img);
				imagedestroy($_tmb);
				return $r;
				break;
		}
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _thumbnails()
	{
		$result = array();
		if (!empty($_GET['current']) && false != ($current = $this->_findDir(trim($_GET['current'])))) {
			$result['images'] = array();
			$ls = scandir($current);
			for ($i=0; $i < count($ls); $i++) { 
				if ('.' != substr($ls[$i], 0, 1)) {
					$path = $current.DIRECTORY_SEPARATOR.$ls[$i];
					if (is_file($path) && 0 === strpos($this->_mimetype($path), 'image')) {
						if (!isset($tmbDir)) {
							$tmbDir = $this->_tmbDir($path);
						}
						$tmb = $tmbDir.DIRECTORY_SEPARATOR.$ls[$i];
						if (!file_exists($tmb) && is_readable($path) && $this->_tmb($path, $tmb)) {
							$result['images'][crc32($path)] = $this->_path2url($tmb); 
						}
					}
				}
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
	private function _cropPos($w, $h)
	{
		$x = $y = 0;
		$size = min($w, $h);
		if ($w > $h) {
			$x = ceil(($w - $h)/2);
		} else {
			$y = ceil(($h - $w)/2);
		}
		return array($x, $y, $size);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _resizeImg($img, $w, $h)
	{
		if (false == ($s = getimagesize($img))) {
			return false;
		}
		
		switch ($this->_options['imgLib']) {
			case 'imagick':
				if (false != ($_img = new imagick($img))) {
					return $_img->cropThumbnailImage($w, $h) && $_img->writeImage($img);
				}
				break;
			case 'mogrify':
				exec('mogrify -scale '.$w.'x'.$h.'! '.escapeshellarg($img), $o, $c);
				return 0 == $c;
				break;
			case 'gd':
				if ($s['mime'] == 'image/jpeg') {
					$_img = imagecreatefromjpeg($img);
				} elseif ($s['mime'] = 'image/png') {
					$_img = imagecreatefrompng($img);
				} elseif ($s['mime'] = 'image/gif') {
					$_img = imagecreatefromgif($img);
				} 
				if (!$_img || false == ($_out = imagecreatetruecolor($w, $h))) {
					return false;
				}
				if (!imagecopyresampled($_out, $_img, 0, 0, 0, 0, $w, $h, $s[0], $s[1])) {
					return false;
				}
				if ($s['mime'] == 'image/jpeg') {
					$r = imagejpeg($_out, $img, 100);
				} else if ($s['mime'] = 'image/png') {
					$r = imagepng($_out, $img, 7);
				} else {
					$r = imagegif($_out, $img, 7);
				}
				imagedestroy($_img);
				imagedestroy($_out);
				return $r;
				break;
		}
				
		
	}
	
	/************************************************************/
	/**                       access control                   **/
	/************************************************************/
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _isAllowedUpload($name, $tmpName)
	{
		$mime = $this->_mimetype($tmpName);
		if ($this->_options['mimeDetect'] == 'internal') {
			$mime = $this->_mimetype($name);
		}
	
		$ext = '';
		if (false != ($p = strrpos($name, '.'))) {
			$ext = substr($name, $p);
		}
	
		if (!empty($this->_options['denyTypes'])) {
			foreach ($this->_options['denyTypes'] as $type) {
				if (0 === strpos($mime, $type)) {
					return false;
				}
			}
		}
		if (!empty($this->_options['denyExts']) && in_array($ext, $this->_options['denyExts'])) {
			return false;
		}
		
		if (!empty($this->_options['allowTypes'])) {
			foreach ($this->_options['allowTypes'] as $type) {
				if (0 === strpos($mime, $type)) {
					return true;
				}
			}
			return !empty($this->_options['allowExts']) && in_array($ext, $this->_options['allowExts']);
		}
		
		if (!empty($this->_options['allowExts'])) {
			return in_array($ext, $this->_options['allowExts']);
		}
		
		return true;
	}

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _isAccepted($file)
	{
		if ('.' == $file || '..' == $file) {
			return false;
		}
		if ($this->_options['ignoreDotFiles'] && '.' == substr($file, 0, 1)) {
			return false;
		}
		return true;
	}

	
	/**
	 * undocumented function
	 *
	 * @return void
	 **/
	private function _isAllowed($path, $action) {
		if ($this->_options['aclObj']) {
			
		}
		
		foreach ($this->_options['perms'] as $regex => $rules) {
			if (preg_match($regex, $path)) {
				if (isset($rules[$action])) {
					return $rules[$action];
				}
			}
		}
		return isset($this->_options['defaults'][$action]) ? $this->_options['defaults'][$action] : false;
	}
	
	/************************************************************/
	/**                          utilites                      **/
	/************************************************************/
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _hash($path)
	{
		return crc32($path);
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


?>