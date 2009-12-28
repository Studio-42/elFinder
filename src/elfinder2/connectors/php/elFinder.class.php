<?php
if (function_exists('date_default_timezone_set')) {
	date_default_timezone_set('Europe/Moscow');
}

class elFinder {
	
	/**
	 * object options
	 *
	 * @var array
	 **/
	private $_options = array(
		'root'        => '',           // path to root directory
		'URL'         => '',           // root directory URL
		'rootAlias'   => 'Home',       // display this instead of root directory name
		'disabled'    => array(),      // list of not allowed commands
		'dotFiles'    => false,        // display dot files
		'cntDirSize'  => true,         // count total directories sizes
		'fileMode'    => 0666,         // new files mode
		'dirMode'     => 0777,         // new folders mode
		'mimeDetect'  => 'auto',       // files mimetypes detection method (finfo, mime_content_type, linux (file -ib), bsd (file -Ib), internal (by extensions))
		'uploadAllow' => array(),      // mimetypes which allowed to upload
		'uploadDeny'  => array(),      // mimetypes which not allowed to upload
		'uploadOrder' => 'deny,allow', // order to proccess uploadAllow and uploadAllow options
		'imgLib'      => 'auto',       // image manipulation library
		'tmbDir'      => '.tmb',       // directory name for image thumbnails. Set to "" to avoid thumbnails generation
		'tmbCleanProb' => 10,
		'archive'     => 'tgz',
		'tmbAtOnce'   => 5,            // number of thumbnails to generate per request
		'tmbSize'     => 48,           // images thumbnails size (px)
		'fileURL'     => true,         // display file URL in "get info"
		'dateFormat'  => 'j M Y H:i',  // file modification date format
		'logger'      => null,
		'aclObj'      => null,         // acl object
		'aclRole'     => 'user',       // role for acl
		'defaults'    => array(        // default permisions
			'read'   => true,
			'write'  => true,
			'rm'     => true
			),
		'perms'       => array(),      // individual folders/files permisions     
		'debug'       => true,          // send debug to client
		'archiveMimes' => array(),
		'archivators' => array()
		// 'archivators' => array(
		// 	'create' => array(
		// 		'application/x-gzip' => array(
		// 			'cmd' => 'tar',
		// 			'argc' => '-czf',
		// 			'ext'  => 'tar.gz'
		// 			)
		// 		),
		// 	'extract' => array(
		// 		'application/x-gzip' => array(
		// 			'cmd'  => 'tar',
		// 			'argc' => '-xzf',
		// 			'ext'  => 'tar.gz'
		// 			),
		// 		'application/x-bzip2' => array(
		// 			'cmd'  => 'tar',
		// 			'argc' => '-xjf',
		// 			'ext'  => 'tar.bz'
		// 			)
		// 		)
		// 	)
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
		'read'      => '_fread',
		'edit'      => '_edit',
		'archive'   => '_archive',
		'extract'   => '_extract',
		'resize'    => '_resize',
		'geturl'    => '_geturl',
		'tmb'       => '_thumbnails'
		);
		
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	public $_loggedCommands = array('mkdir', 'mkfile', 'rename', 'upload', 'paste', 'rm', 'duplicate', 'edit', 'resize');
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_logContext = array();
		
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
	    'zip'   => 'application/zip',
	    'rar'   => 'application/x-rar',
		'tar'   => 'application/x-tar',
		'7z'    => 'application/x-7z-compressed',
		// texts
		'txt'   => 'text/plain',
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
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_result = array('debug' => array());
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_arc = array('create' => array(), 'extract' => array());
	
	/**
	 * undocumented class variable
	 *
	 * @var string
	 **/
	private $_arcMimes = array();
		
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

		$this->_time = $this->_options['debug'] ? $this->_utime() : 0;

		$this->_fakeRoot = !$this->_options['rootAlias'] 
			? $this->_options['root'] 
			: dirname($this->_options['root']).DIRECTORY_SEPARATOR.$this->_options['rootAlias'];
			
		if (!empty($this->_options['disabled'])) {
			$no = array('open', 'reload', 'tmb', 'geturl');
			foreach ($this->_options['disabled'] as $k => $c) {
				if (!isset($this->_commands[$c]) || in_array($c, $no)) {
					unset($this->_options['disabled'][$k]);
				} else {
					unset($this->_commands[$c]);
				}
			}
		}
				
		if ($this->_options['tmbDir']) {
			$tmbDir = $this->_options['root'].DIRECTORY_SEPARATOR.$this->_options['tmbDir'];
			$this->_options['tmbDir'] = is_dir($tmbDir) || @mkdir($tmbDir, $this->_options['dirMode']) ? $tmbDir : '';
		}
		if ($this->_options['tmbDir']) {
			if (!in_array($this->_options['imgLib'], array('imagick', 'mogrify', 'gd'))) {
				$this->_options['imgLib'] = $this->_getImgLib();
			}
		}
	}

	/**
	 * Proccess client request and output json
	 *
	 * @return void
	 **/
	public function run() {
		if (empty($this->_options['root']) || !is_dir($this->_options['root'])) {
			exit(json_encode(array('error' => 'Invalid backend configuration')));
		}
		if (!$this->_isAllowed($this->_options['root'], 'read')) {
			exit(json_encode(array('error' => 'Access denied')));
		}
		
		$cmd = '';
		if (!empty($_POST['cmd'])) {
			$cmd = trim($_POST['cmd']);
		} elseif (!empty($_GET['cmd'])) {
			$cmd = trim($_GET['cmd']);
		}
		
		if ($cmd && (empty($this->_commands[$cmd]) || !method_exists($this, $this->_commands[$cmd]))) {
			exit(json_encode(array('error' => 'Unknown command')));
		}
		
		if (isset($_GET['init'])) {
			
			$ts = $this->_utime();
			$this->_result['disabled'] = $this->_options['disabled'];
			
			$this->_result['params'] = array(
				'dotFiles'   => $this->_options['dotFiles'],
				'uplMaxSize' => ini_get('upload_max_filesize'),
				'archives'   => array(),
				'extract'    => array()
				);
			if (isset($this->_commands['archive']) || isset($this->_commands['extract'])) {
				$this->_checkArchivators();
				if (isset($this->_commands['archive'])) {
					$this->_result['params']['archives'] = $this->_options['archiveMimes'];
				}
				if (isset($this->_commands['extract'])) {
					$this->_result['params']['extract'] = array_keys($this->_options['archivators']['extract']);
				}
				// echo '<pre>'; print_R($this->_options['archivators']);
			}
			if ($this->_options['tmbDir']) {
				srand((double) microtime() * 1000000);
				if (rand(1, 100) < $this->_options['tmbCleanProb']) {
					$ts2 = $this->_utime();
					$ls = scandir($this->_options['tmbDir']);
					for ($i=0, $s = count($ls); $i < $s; $i++) { 
						if ('.' != $ls[$i] && '..' != $ls[$i]) {
							@unlink($this->_options['tmbDir'].DIRECTORY_SEPARATOR.$ls[$i]);
						}
					}
					$this->_result['debug']['cleanTmbTime'] = $this->_utime() - $ts2;
				}
			}
			
			$this->_result['debug']['initTime'] = $this->_utime() - $ts;
		}
		
		if ($cmd) {
			$this->{$this->_commands[$cmd]}();
		} else {
			$this->_open();
		}


		if ($this->_options['debug']) {
			$this->_result['debug']['time'] = $this->_utime() - $this->_time;
			$this->_result['debug']['mimeDetect'] = $this->_options['mimeDetect'];
			$this->_result['debug']['imgLib'] = $this->_options['imgLib'];
			$this->_result['debug']['du'] = @$this->_options['du'];
		}
		
		echo json_encode($this->_result);
		
		if (!empty($this->_options['logger']) && in_array($cmd, $this->_loggedCommands)) {
			$this->_options['logger']->log($cmd, empty($this->_result['error']), $this->_logContext, !empty($this->_result['error']) ? $this->_result['error'] : '', !empty($this->_result['errorData']) ? $this->_result['errorData'] : array()); 
		}
		exit();
	}

	
	/************************************************************/
	/**                   elFinder commands                    **/
	/************************************************************/
	
	/**
	 * Return current dir content to client or output file content to browser
	 *
	 * @param  bool  $tree  add dirs tree to result? (used by reload command)
	 * @return void
	 **/
	private function _open()
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
			if (!$this->_isAllowed($dir, 'read') || !$this->_isAllowed($file, 'read')) {
				header('HTTP/1.x 403 Access Denied'); 
				exit('Access Denied');
			}
			
			if (filetype($file) == 'link') {
				$file = $this->_readlink($file);
				if (!$file || is_dir($file)) {
					header('HTTP/1.x 404 Not Found'); 
					exit('File not found');
				}
				if (!$this->_isAllowed(dirname($file), 'read') || !$this->_isAllowed($file, 'read')) {
					header('HTTP/1.x 403 Access Denied'); 
					exit('Access Denied');
				}
			}
			
			$mime  = $this->_mimetype($file);
			$parts = explode('/', $mime);
			$disp  = $parts[0] == 'image' || $parts[0] == 'text' ? 'inline' : 'attachments';
			
			header("Content-Type: ".$mime);
			header("Content-Disposition: ".$disp."; filename=".basename($file));
			header("Content-Location: ".str_replace($this->_options['root'], '', $file));
			header('Content-Transfer-Encoding: binary');
			header("Content-Length: " .filesize($file));
			header("Connection: close");
			readfile($file);
			exit();
			
		} else { // enter directory
			$path = $this->_options['root'];
			if (!empty($_GET['target'])) {
				if (false == ($p = $this->_findDir(trim($_GET['target'])))) {
					$this->_result['error'] = 'Invalid parameters';
				} elseif (!$this->_isAllowed($p, 'read')) {
					$this->_result['error'] = 'Access denied';
				} else {
					$path = $p;
				}
			}
			$this->_content($path, isset($_GET['tree']));
		}
	}
	
	
	/**
	 * Rename file/folder
	 *
	 * @return void
	 **/
	private function _rename()
	{
		if (empty($_GET['current']) 
		||  empty($_GET['target'])
		||  false == ($dir = $this->_findDir(trim($_GET['current'])))
		||  false == ($target = $this->_find(trim($_GET['target']), $dir))
		) {
			$this->_result['error'] = 'File does not exists';
		} elseif (false == ($name = $this->_checkName($_GET['name'])) ) {
			$this->_result['error'] = 'Invalid name';
		} elseif (!$this->_isAllowed($dir, 'write')) {
			$this->_result['error'] = 'Access denied';
		} elseif (file_exists($dir.DIRECTORY_SEPARATOR.$name)) {
			$this->_result['error'] = 'File or folder with the same name already exists';
		} elseif (!rename($target, $dir.DIRECTORY_SEPARATOR.$name)) {
			$this->_result['error'] = 'Unable to rename file';
		} else {
			$this->_logContext['from'] = $target;
			$this->_logContext['to']   = $dir.DIRECTORY_SEPARATOR.$name;
			$this->_result['target']   = $this->_hash($dir.DIRECTORY_SEPARATOR.$name);
			$this->_content($dir, is_dir($dir.DIRECTORY_SEPARATOR.$name));
		}
	}
	
	
	/**
	 * Create new folder
	 *
	 * @return void
	 **/
	private function _mkdir()
	{
		if (empty($_GET['current']) ||  false == ($dir = $this->_findDir(trim($_GET['current'])))) {
			return $this->_result['error'] = 'Invalid parameters';
		} 
		$this->_logContext['dir'] = $dir.DIRECTORY_SEPARATOR.$_GET['name'];
		if (!$this->_isAllowed($dir, 'write')) {
			$this->_result['error'] = 'Access denied';
		} elseif (false == ($name = $this->_checkName($_GET['name'])) ) {
			$this->_result['error'] = 'Invalid name';
		} elseif (file_exists($dir.DIRECTORY_SEPARATOR.$name)) {
			$this->_result['error'] = 'File or folder with the same name already exists';
		} elseif (!@mkdir($dir.DIRECTORY_SEPARATOR.$name, $this->_options['dirMode'])) {
			$this->_result['error'] = 'Unable to create folder';
		} else {
			$this->_logContext['dir'] = $dir.DIRECTORY_SEPARATOR.$name;
			$this->_result['target'] = $this->_hash($dir.DIRECTORY_SEPARATOR.$name);
			$this->_content($dir, true);
		}
	}
	
	/**
	 * Create new empty file
	 *
	 * @return void
	 **/
	private function _mkfile()
	{
		if (empty($_GET['current']) ||  false == ($dir = $this->_findDir(trim($_GET['current'])))) {
			return $this->_result['error'] = 'Invalid parameters';
		} 
		$this->_logContext['file'] = $dir.DIRECTORY_SEPARATOR.$_GET['name'];
		if (!$this->_isAllowed($dir, 'write')) {
			$this->_result['error'] = 'Access denied';
		} elseif (false == ($name = $this->_checkName($_GET['name'])) ) {
			$this->_result['error'] = 'Invalid name';
		} elseif (file_exists($dir.DIRECTORY_SEPARATOR.$name)) {
			$this->_result['error'] = 'File or folder with the same name already exists';
		} else {
			$f = $dir.DIRECTORY_SEPARATOR.$name;
			$this->_logContext['file'] = $f;
			if (false != ($fp = @fopen($f, 'wb'))) {
				fwrite($fp, "");
				fclose($fp);
				$this->_result['target'] = $this->_hash($dir.DIRECTORY_SEPARATOR.$name);
				$this->_content($dir);
			} else {
				$this->_result['error'] = 'Unable to create file';
			}
		} 
	}
	
	
	/**
	 * Remove files/folders
	 *
	 * @return void
	 **/
	private function _rm()
	{
		if (empty($_GET['current']) 
		||  false == ($dir = $this->_findDir(trim($_GET['current']))) 
		|| (empty($_GET['rm']) || !is_array($_GET['rm']))) {
			return $this->_result['error'] = 'Invalid parameters';
		} 
		$this->_logContext['rm'] = array();
		foreach ($_GET['rm'] as $hash) {
			if (false != ($f = $this->_find($hash, $dir))) {
				$this->_remove($f);
				$this->_logContext['rm'][] = $f;
			}
		}
		if (!empty($this->_result['errorData'])) {
			$this->_result['error'] = 'Remove failed';
		}
		$this->_content($dir, true);
	}
	
	
	/**
	 * Upload files
	 *
	 * @return void
	 **/
	private function _upload()
	{
		if (empty($_POST['current']) || false == ($dir = $this->_findDir(trim($_POST['current'])))) {
			return $this->_result['error'] = 'Invalid parameters';
		} 
		if (!$this->_isAllowed($dir, 'write')) {
			return $this->_result['error'] = 'Access denied';
		}
		if (empty($_FILES['fm-file']))
		{
			return $this->_result['error'] = 'No file to upload';
		}
		$this->_logContext['files'] = array();
		$total = 0;
		for ($i=0, $s = count($_FILES['fm-file']['name']); $i < $s; $i++) { 
			if (!empty($_FILES['fm-file']['name'][$i])) {
				$total++;
				$this->_logContext['files'][] = $_FILES['fm-file']['name'][$i];
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
					$this->_errorData($_FILES['fm-file']['name'][$i], $error);
				} elseif (false == ($name = $this->_checkName($_FILES['fm-file']['name'][$i]))) {
					$this->_errorData($_FILES['fm-file']['name'][$i], 'Invalid name');
				} elseif (!$this->_isUploadAllow($_FILES['fm-file']['name'][$i], $_FILES['fm-file']['tmp_name'][$i])) {
					$this->_errorData($_FILES['fm-file']['name'][$i], 'Not allowed file type');					
				} else {
					$file = $dir.DIRECTORY_SEPARATOR.$_FILES['fm-file']['name'][$i];
					if (!@move_uploaded_file($_FILES['fm-file']['tmp_name'][$i], $file)) {
						$this->_errorData($_FILES['fm-file']['name'][$i], 'Unable to save uploaded file');	
					} else {
						@chmod($file, $this->_options['fileMode']);
					}
				}
			}
		}
		if (!empty($this->_result['errorData'])) {
			$this->_result['error'] = count($this->_result['errorData']) == $total
				? 'Unable to upload files'
				: 'Some files was not uploaded';
		}
		$this->_content($dir);
	}
	
	/**
	 * Copy/move files/folders
	 *
	 * @return void
	 **/
	private function _paste()
	{
		if (empty($_GET['current']) 
		|| false == ($current = $this->_findDir(trim($_GET['current'])))
		|| empty($_GET['src'])
		|| false == ($src = $this->_findDir(trim($_GET['src'])))
		|| empty($_GET['dst'])
		|| false == ($dst = $this->_findDir(trim($_GET['dst'])))
		|| empty($_GET['files']) || !is_array($_GET['files'])
		) {
			return $this->_result['error'] = 'Invalid parameters';
		}
		$cut = !empty($_GET['cut']);
		$this->_logContext['src']  = array();
		$this->_logContext['dest'] = $dst;
		$this->_logContext['cut']  = $cut;
		
		
		if (!$this->_isAllowed($dst, 'write') || !$this->_isAllowed($src, 'read')) {
			return $this->_result['error'] = 'Access denied';
		}

		foreach ($_GET['files'] as $hash) {
			if (false == ($f = $this->_find($hash, $src))) {
				return $this->_result['error'] = 'File not found';
			}
			$this->_logContext['src'][] = $f;
			$_dst = $dst.DIRECTORY_SEPARATOR.basename($f);

			if (0 === strpos($dst, $f)) {
				return $this->_result['error'] = 'Unable to copy into itself';
			}

			if ($cut) {
				if (!$this->_isAllowed($f, 'rm')) {
					$this->_result['error'] = 'Move failed';
					return $this->_errorData($f, 'Access denied');
				}
				if (is_dir($f)) {
					$this->_recRmTmb($f);
				} else {
					$this->_rmTmb($f);
				}
				if ((file_exists($_dst) && !$this->_remove($_dst)) || !@rename($f, $_dst) ) {
					$this->_result['error'] = 'Move failed';
					$this->_errorData($f, 'Unable to move');
					break;
				}
			} else {
				if (!$this->_copy($f, $_dst)) {
					$this->_result['error'] = 'Move failed';
					break;
				}
			}
		}
		$this->_content($current, true);
	}
	
	/**
	 * Create file/folder copy with suffix - "copy"
	 *
	 * @return void
	 **/
	private function _duplicate()
	{
		if (empty($_GET['current']) 
		|| false == ($current = $this->_findDir(trim($_GET['current'])))
		|| empty($_GET['file'])
		|| false == ($file = $this->_find(trim($_GET['file']), $current))
		) {
			return $this->_result['error'] = 'Invalid parameters';
		}
		$this->_logContext['file'] = $file;
		if (!$this->_isAllowed($current, 'write') || !$this->_isAllowed($file, 'read')) {
			return $this->_result['error'] = 'Access denied';
		}
		if (!$this->_copy($file, $this->_uniqueName($file))) {
			return $this->_result['error'] = 'Duplicate failed';
		}
		$this->_content($current, is_dir($file));
	}
	
	/**
	 * Resize image
	 *
	 * @return void
	 **/
	private function _resize()
	{
		if (empty($_GET['current']) 
		|| false == ($current = $this->_findDir(trim($_GET['current'])))
		|| empty($_GET['file'])
		|| false == ($file = $this->_find(trim($_GET['file']), $current))
		|| empty($_GET['width'])  || 0 >= ($width  = intval($_GET['width']))
		|| empty($_GET['height']) || 0 >= ($height = intval($_GET['height']))
		) {
			return $this->_result['error'] = 'Invalid parameters';
		}
		$this->_logContext = array(
			'file'   => $file,
			'width'  => $width,
			'height' => $height
			);
		if (!$this->_isAllowed($file, 'write')) {
			return $this->_result['error'] = 'Access denied';
		} 
		if (0 !== strpos($this->_mimetype($file), 'image')) {
			return $this->_result['error'] = 'File is not an image';
		}
		if (!$this->_resizeImg($file, $width, $height)) {
			return $this->_result['error'] = 'Unable to resize image';
		} 
		$this->_content($current);
	}
	
	/**
	 * Return file URL
	 *
	 * @return void
	 **/
	private function _geturl()
	{
		if (empty($_GET['current']) 
		|| false == ($current = $this->_findDir(trim($_GET['current'])))
		|| empty($_GET['file'])
		|| false == ($file = $this->_find(trim($_GET['file']), $current))
		) {
			return $this->_result['error'] = 'Invalid parameters';
		}
		$this->_result['url'] = $this->_path2url($file);
	}
	
	/**
	 * Create images thumbnails 
	 *
	 * @return void
	 **/
	private function _thumbnails()
	{
		if (!empty($this->_options['tmbDir']) && !empty($_GET['current']) && false != ($current = $this->_findDir(trim($_GET['current'])))) {
			
			$this->_result['images'] = array();
			$ls = scandir($current);
			$cnt = 0;
			$max = $this->_options['tmbAtOnce'] > 0 ? intval($this->_options['tmbAtOnce']) : 100;
			for ($i=0; $i < count($ls); $i++) { 
				if ($this->_isAccepted($ls[$i])) {
					$path = $current.DIRECTORY_SEPARATOR.$ls[$i];
					if (is_readable($path) && $this->_canCreateTmb($this->_mimetype($path))) {
						$tmb = $this->_tmbPath($path);
						if (!file_exists($tmb)) {
							if ($cnt>=$max) {
								return $this->_result['tmb'] = true; 
							} elseif ($this->_tmb($path, $tmb)) {
								$this->_result['images'][$this->_hash($path)] = $this->_path2url($tmb);
								$cnt++;
							}
						}
					}
				}
			}
		} 
	}
	
	/**
	 * Return file content to client
	 *
	 * @return void
	 **/
	private function _fread()
	{
		if (empty($_GET['current']) 
		|| false == ($current = $this->_findDir(trim($_GET['current'])))
		|| empty($_GET['file'])
		|| false == ($file = $this->_find(trim($_GET['file']), $current))
		) {
			return $this->_result['error'] = 'Invalid parameters';
		}
		if (!$this->_isAllowed($file, 'read')) {
			return $this->_result['error'] = 'Access denied';
		}
		$this->_result['content'] = @file_get_contents($file);
	}
	
	/**
	 * Save data into text file. 
	 *
	 * @return void
	 **/
	private function _edit()
	{
		if (empty($_POST['current']) 
		|| false == ($current = $this->_findDir(trim($_POST['current'])))
		|| empty($_POST['file'])
		|| false == ($file = $this->_find(trim($_POST['file']), $current))
		|| !isset($_POST['content'])
		) {
			return $this->_result['error'] = 'Invalid parameters';
		}
		$this->_logContext['file'] = $file;
		if (!$this->_isAllowed($file, 'write')) {
			return $this->_result['error'] = 'Access denied';
		}
		if (false === file_put_contents($file, trim($_POST['content']))) {
			return $this->_result['error'] = 'Unable to write to file';
		}
		$this->_result['file'] = $this->_info($file);
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _archive()
	{
		$this->_checkArchivators();
		if (empty($this->_options['archivators']['create']) 
		|| empty($_GET['type']) 
		|| empty($this->_options['archivators']['create'][$_GET['type']])
		|| !in_array($_GET['type'], $this->_options['archiveMimes'])) {
			return $this->_result['error'] = 'Unable to create archive';
		}
		
		
		if (empty($_GET['current']) 
		||  empty($_GET['files'])
		|| !is_array($_GET['files'])
		||  false == ($dir = $this->_findDir(trim($_GET['current'])))
		) {
			return $this->_result['error'] = 'Invalid parameters';
		}
		
		$files = array();
		$argc = '';
		foreach ($_GET['files'] as $hash) {
			if (false == ($f = $this->_find($hash, $dir))) {
				return $this->_result['error'] = 'File does not exists';
			}
			$files[] = $f;
			$argc .= escapeshellarg(basename($f)).' ';
		}
		$arc  = $this->_options['archivators']['create'][$_GET['type']];
		$name = count($files) == 1 ? basename($files[0]) : $_GET['name'];
		$name = basename($this->_uniqueName($name.'.'.$arc['ext'], ''));
		
		$cwd = getcwd();
		chdir($dir);
		$cmd = $arc['cmd'].' '.$arc['argc'].' '.escapeshellarg($name).' '.$argc;
		exec($cmd, $o, $c);
		chdir($cwd);
		if (file_exists($dir.DIRECTORY_SEPARATOR.$name)) {
			$this->_content($dir);
			$this->_result['select'] = $this->_hash($dir.DIRECTORY_SEPARATOR.$name);
		} else {
			$this->_result['error'] = 'Unable to create archive';
		}
	}
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _extract()
	{
		if (empty($_GET['current']) 
		|| false == ($current = $this->_findDir(trim($_GET['current'])))
		|| empty($_GET['target'])
		|| false == ($file = $this->_find(trim($_GET['target']), $current))
		) {
			return $this->_result['error'] = 'Invalid parameters';
		}
		$this->_checkArchivators();
		$mime = $this->_mimetype($file);
		if (empty($this->_options['archivators']['extract'][$mime])) {
			return $this->_result['error'] = 'Unable to extract files from archive';
		}
		$cwd = getcwd();
		$arc = $this->_options['archivators']['extract'][$mime];
		$cmd = $arc['cmd'].' '.$arc['argc'].' '.escapeshellarg(basename($file));
		chdir(dirname($file));
		exec($cmd, $o, $c);
		chdir($cwd);
		if ($c == 0) {
			$this->_content($current, true);
		} else {
			$this->_result['error'] = 'Unable to extract files from archive';
		}
	}
	
	/************************************************************/
	/**                    "content" methods                   **/
	/************************************************************/
	/**
	 * Set current dir info, content and [dirs tree]
	 *
	 * @param  string  $path  current dir path
	 * @param  bool    $tree  set dirs tree?
	 * @return void
	 **/
	private function _content($path, $tree=false)
	{
		$this->_cwd($path);
		$this->_cdc($path);
		if ($tree) {
			$this->_result['tree'] = $this->_tree($this->_options['root']);
		}
	}

	/**
	 * Set current dir info
	 *
	 * @param  string  $path  current dir path
	 * @return void
	 **/
	private function _cwd($path)
	{
		$rel  = $this->_options['rootAlias'] ? $this->_options['rootAlias'] : basename($this->_options['root']);
		if ($path == $this->_options['root']) {
			$name = $rel;
		} else {
			$name = basename($path);
			$rel .= DIRECTORY_SEPARATOR.substr($path, strlen($this->_options['root'])+1);
		}
		$this->_result['cwd'] = array(
			'hash'       => $this->_hash($path),
			'name'       => $name,
			'mime'       => 'directory',
			'rel'        => $rel,
			'size'       => 0,
			'date'       => date($this->_options['dateFormat'], filemtime($path)),
			'read'       => true,
			'write'      => $this->_isAllowed($path, 'write'),
			'rm'         => $path == $this->_options['root'] ? false : $this->_isAllowed($path, 'rm')
			);
	}

	
	/**
	 * Set current dir content
	 *
	 * @param  string  $path  current dir path
	 * @return void
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
		$this->_result['cdc'] = array_merge($dirs, $files);
	}
	
	/**
	 * Return file/folder info
	 *
	 * @param  string  $path  file path
	 * @return array
	 **/
	private function _info($path)
	{
		$type = filetype($path);
		$stat =  $type == 'link' ? lstat($path) : stat($path);
		
		$info = array(
			'name'  => basename($path),
			'hash'  => $this->_hash($path),
			'mime'  => $type == 'dir' ? 'directory' : $this->_mimetype($path),
			'date'  => date($this->_options['dateFormat'], $stat['mtime']),
			'size'  => $type == 'dir' ? $this->_dirSize($path) : $stat['size'],
			'read'  => $this->_isAllowed($path, 'read'),
			'write' => $this->_isAllowed($path, 'write'),
			'rm'    => $this->_isAllowed($path, 'rm'),
			);
		
				
		if ($type == 'link') {
			if (false == ($path = $this->_readlink($path))) {
				$info['mime'] = 'symlink-broken';
				return $info;
			}
			if (is_dir($path)) {
				$info['mime']  = 'directory';
			} else {
				$info['parent'] = $this->_hash(dirname($path));
				$info['mime']   = $this->_mimetype($path);
			}
			$info['link']   = $this->_hash($path);
			$info['linkTo'] = ($this->_options['rootAlias'] ? $this->_options['rootAlias'] : basename($this->_options['root'])).substr($path, strlen($this->_options['root']));
			$info['read']   = $this->_isAllowed($path, 'read');
			$info['write']  = $this->_isAllowed($path, 'write');
			$info['rm']     = $this->_isAllowed($path, 'rm');
		} 
		
		if ($info['mime'] != 'directory') {
			if ($this->_options['fileURL']) {
				$info['url'] = $this->_path2url($path);
			}
			
			if (0 === ($p = strpos($info['mime'], 'image'))) {
				if (false != ($s = getimagesize($path))) {
					$info['dim'] = $s[0].'x'.$s[1];
				}
				$info['resize'] = $this->_canCreateTmb($info['mime']);
				$tmb = $this->_tmbPath($path);
				if (file_exists($tmb)) {
					$info['tmb']  = $this->_path2url($tmb);
				} elseif ($info['resize']) {
					$this->_result['tmb'] = true;
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
		$dir = array(
			'hash'  => $this->_hash($path),
			'name'  => $path == $this->_options['root'] && $this->_options['rootAlias'] ? $this->_options['rootAlias'] : basename($path),
			'read'  => $this->_isAllowed($path, 'read'),
			'write' => $this->_isAllowed($path, 'write')
			);
		
		if ($dir['read'] && false != ($ls = scandir($path))) {
			$dir['dirs'] = array();
			for ($i=0; $i < count($ls); $i++) {
				$p = $path.DIRECTORY_SEPARATOR.$ls[$i]; 
				if ($this->_isAccepted($ls[$i]) && filetype($p) == 'dir') {
					$dir['dirs'][] = $this->_tree($p);
				}
			}
		}
		return $dir;
	}
	
	/************************************************************/
	/**                      fs methods                        **/
	/************************************************************/

	/**
	 * Return name for duplicated file/folder
	 *
	 * @param  string  $f  file/folder name
	 * @return string
	 **/
	private function _uniqueName($f, $suffix='-copy')
	{
		$dir = dirname($f);
		$name = basename($f);
		$ext = '';
		if (!is_dir($f) && false != ($p = strrpos($name, '.'))) {
			$ext = substr($name, $p);
			$name = substr($name, 0, $p);
		}
		
		if (!file_exists($dir.DIRECTORY_SEPARATOR.$name.$suffix.$ext)) {
			return $dir.DIRECTORY_SEPARATOR.$name.$suffix.$ext;
		}
		$i = 1;
		while ($i++<=1000) {
			if (!file_exists($dir.DIRECTORY_SEPARATOR.$name.$suffix.$i.$ext)) {
				return $dir.DIRECTORY_SEPARATOR.$name.$suffix.$i.$ext;
			}	
		}
		return $dir.DIRECTORY_SEPARATOR.$name.md5($f).$ext;
	}

	/**
	 * Remove file or folder (recursively)
	 *
	 * @param  string  $path  fole/folder path
	 * @return void
	 **/
	private function _remove($path)
	{
		if (!$this->_isAllowed($path, 'rm')) {
			return $this->_errorData($path, 'Access denied');
		}
		if (!is_dir($path)) {
			if (!@unlink($path)) {
				$this->_errorData($path, 'Unable to remove file');
			} else {
				$this->_rmTmb($path);
			}
		} else {
			$ls = scandir($path);
			for ($i=0; $i < count($ls); $i++) { 
				if ('.' != $ls[$i] && '..' != $ls[$i]) {
					$this->_remove($path.DIRECTORY_SEPARATOR.$ls[$i]);
				}
			}
			if (!@rmdir($path)) {
				return $this->_errorData($path, 'Unable to remove file');
			}
		}
		return true;
	}
	
	/**
	 * Copy file/folder (recursively)
	 *
	 * @param  string  $src  file/folder to copy
	 * @param  string  $trg  destination name
	 * @return bool
	 **/
	private function _copy($src, $trg)
	{
		if (!$this->_isAllowed($src, 'read')) {
			return $this->_errorData($src, 'Access denied');
		}
		
		$dir = dirname($trg);
		
		if (!$this->_isAllowed($dir, 'write')) {
			return $this->_errorData($dir, 'Access denied');
		}
		if (!is_dir($src)) {
			if (!@copy($src, $trg)) {
				return $this->_errorData($src, 'Unable to copy');
			} 
			@chmod($trg, $this->_options['fileMode']);
		} else {
			
			if (is_dir($trg) && !$this->_remove($trg)) {
				return $this->_errorData($src, 'Unable to copy');
			}
			if (!@mkdir($trg, $this->_options['dirMode'])) {
				return $this->_errorData($src, 'Unable to copy');
			}
			
			$ls = scandir($src);
			
			for ($i=0; $i < count($ls); $i++) { 
				if ('.' != $ls[$i] && '..' != $ls[$i]) {
					$_src = $src.DIRECTORY_SEPARATOR.$ls[$i];
					$_trg = $trg.DIRECTORY_SEPARATOR.$ls[$i];
					if (is_dir($_src)) {
						if (!$this->_copy($_src, $_trg)) {
							return $this->_errorData($_src, 'Unable to copy');
						}
					} else {
						if (!@copy($_src, $_trg)) {
							return $this->_errorData($_src, 'Unable to copy');
						}
						@chmod($_trg, $this->_options['fileMode']);
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
		if (!$this->_options['dotFiles'] && '.' == substr($n, 0, 1)) {
			return false;
		}
		return preg_match('|^[^\\/\<\>:]+$|', $n) ? $n : false;
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
		if (!$this->_options['cntDirSize'] || !$this->_isAllowed($path, 'read')) {
			return filesize($path);
		} 
		if (!isset($this->_options['du'])) {
			$this->_options['du'] = function_exists('exec')
				? exec('du -h '.escapeshellarg(__FILE__), $o, $s) > 0 && $s == 0
				: false;
		}
		if ($this->_options['du']) {
			$size = intval(exec('du -k '.escapeshellarg($path)))*1024;
		} else {
			$ls = scandir($path);
			for ($i=0; $i < count($ls); $i++) { 
				if ($this->_isAccepted($ls[$i])) {
					$p = $path.DIRECTORY_SEPARATOR.$ls[$i];
					$size += filetype($p) == 'dir' && $this->_isAllowed($p, 'read') ? $this->_dirSize($p) : filesize($p);
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
		if (empty($this->_options['mimeDetect']) || $this->_options['mimeDetect'] == 'auto') {
			$this->_options['mimeDetect'] = $this->_getMimeDetect();
		}
		
		switch ($this->_options['mimeDetect']) {
			case 'finfo':
				$finfo = finfo_open(FILEINFO_MIME);
				$type = @finfo_file($finfo, $path);
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
	
	
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _createArchive($files, $name)
	{
		if (empty($this->_options['arc'])) {
			return false;
		}

		switch ($this->_options['arc']) {
			case 'tgz':
			case 'tbz':
				$dir = getcwd();
				chdir(dirname($files[0]));
				if ($this->_options['arc'] == 'tgz') {
					$arg = 'czf';
					$ext = 'tgz';
				} else {
					$arg = 'cjf';
					$ext = 'tbz';
				}
				$name = $this->_uniqueName($name.'.'.$ext, '');
				$str = '';
				foreach($files as $f) {
					$str .= escapeshellarg(basename($f)).' ';
				}
				$cmd = 'tar -'.$arg.' '.escapeshellarg($name).' '.$str;
				exec($cmd);

				$res = file_exists($name) ? dirname($files[0]).DIRECTORY_SEPARATOR.$name : false;
				chdir($dir);
				return $res;
				break;
			
			case 'zip':
				$dir = getcwd();
				chdir(dirname($files[0]));
				$name = $this->_uniqueName($name.'.zip', '');
				$str = '';
				foreach($files as $f) {
					$str .= escapeshellarg(basename($f)).' ';
				}
				$cmd = 'zip -r9 '.escapeshellarg($name).' '.$str;
				exec($cmd);
				$res = file_exists($name) ? dirname($files[0]).DIRECTORY_SEPARATOR.$name : false;
				chdir($dir);
				return $res;
				break;
				
			case '7za':
				$dir = getcwd();
				chdir(dirname($files[0]));
				$name = $this->_uniqueName($name.'.7z', '');
				$str = '';
				foreach($files as $f) {
					$str .= escapeshellarg(basename($f)).' ';
				}
				
				$cmd = '7za a '.escapeshellarg($name).' '.$str;
				exec($cmd);
				$res = file_exists($name) ? dirname($files[0]).DIRECTORY_SEPARATOR.$name : false;
				chdir($dir);
				return $res;
				break;
			
		}
	}
	
	/************************************************************/
	/**                   image manipulation                   **/
	/************************************************************/

	/**
	 * Create image thumbnail
	 *
	 * @param  string  $img  image file
	 * @param  string  $tmb  thumbnail name
	 * @return bool
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
					return file_exists($tmb);	
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
				// if ($s['mime'] == 'image/jpeg') {
				// 	$r = imagejpeg($_tmb, $tmb, 100);
				// } else if ($s['mime'] = 'image/png') {
				// 	$r = imagepng($_tmb, $tmb, 7);
				// } else {
				// 	$r = imagegif($_tmb, $tmb, 7);
				// }
				$r = imagepng($_tmb, $tmb, 7);
				imagedestroy($_img);
				imagedestroy($_tmb);
				return $r;
				break;
		}
	}
	
	/**
	 * Remove image thumbnail
	 *
	 * @param  string  $img  image file
	 * @return void
	 **/
	private function _rmTmb($img)
	{
		if ($this->_options['tmbDir']) {
			$tmb = $this->_tmbPath($img);
			if (file_exists($tmb)) {
				@unlink($tmb);
			}
		}
	}
	
	/**
	 * Remove all thumbnails for images in folder
	 *
	 * @param  string  $path  folder path
	 * @return void
	 **/
	private function _recRmTmb($path)
	{
		if (!$this->_options['tmbDir'] || !is_dir($path)) {
			return;
		}
		$ls = scandir($path);
		for ($i=0; $i < count($ls); $i++) { 
			if ('.' != $ls[$i] && '..' != $ls[$i]) {
				$p = $path.DIRECTORY_SEPARATOR.$ls[$i];
				if (is_dir($p)) {
					$this->_recRmTmb($p);
				} else {
					$tmb = $this->_tmbPath($path.DIRECTORY_SEPARATOR.$ls[$i]);
					if (file_exists($tmb)) {
						@unlink($tmb);
					}
				}
			}
		}
	}
	
	/**
	 * Return x/y coord for crop image thumbnail
	 *
	 * @param  int  $w  image width
	 * @param  int  $h  image height	
	 * @return array
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
	 * Resize image
	 *
	 * @param  string  $img  image path
	 * @param  int     $w    image width
	 * @param  int     $h    image height
	 * @return bool
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
	
	/**
	 * Return true if we can create thumbnail for image
	 *
	 * @param  string  $path  image path
	 * @return bool
	 **/
	private function _canCreateTmb($mime)
	{
		if ($this->_options['tmbDir'] && $this->_options['imgLib']) {
			if (0 === strpos($mime, 'image')) {
				if ('gd' == $this->_options['imgLib']) {
					return $mime == 'image/jpeg' || $mime == 'image/png' || $mime == 'image/gif';
				} elseif ('mogrify' == $this->_options['imgLib']) {
					return $mime != 'image/vnd.adobe.photoshop';
				}
				return true;
			}
		}
	}
	
	/**
	 * Return image thumbnail path
	 *
	 * @param  string  $path  image path
	 * @return string
	 **/
	private function _tmbPath($path)
	{
		$tmb = '';
		if ($this->_options['tmbDir']) {
			$tmb = dirname($path) != $this->_options['tmbDir']
				? $this->_options['tmbDir'].DIRECTORY_SEPARATOR.$this->_hash($path).'.png'
				: $path;
		}
		return $tmb;
	}
	
	/************************************************************/
	/**                       access control                   **/
	/************************************************************/
	
	/**
	 * Return true if file's mimetype is allowed for upload
	 *
	 * @param  string  $name    file name
	 * @param  string  $tmpName uploaded file tmp name
	 * @return bool
	 **/
	private function _isUploadAllow($name, $tmpName)
	{
		$mime  = $this->_mimetype($this->_options['mimeDetect'] != 'internal' ? $tmpName : $name);
		$allow = false;
		$deny  = false;
		
		foreach ($this->_options['uploadAllow'] as $type) {
			if (0 === strpos($mime, $type)) {
				$allow = true;
			}
		}
		foreach ($this->_options['uploadDeny'] as $type) {
			if (0 === strpos($mime, $type)) {
				$deny = true;
			}
		}

		if (0 === strpos($this->_options['uploadOrder'], 'allow')) {
			return $allow && !$deny;
		} else {
			return !$deny || $allow;
		}
	}

	/**
	 * Return true if file name is not . or ..
	 * If file name begins with . return value according to $this->_options['dotFiles']
	 *
	 * @param  string  $file  file name
	 * @return bool
	 **/
	private function _isAccepted($file)
	{
		if ('.' == $file || '..' == $file) {
			return false;
		}
		if (!$this->_options['dotFiles'] && '.' == substr($file, 0, 1)) {
			return false;
		}
		return true;
	}

	/**
	 * Return true if requeired action allowed to file/folder
	 *
	 * @param  string  $path    file/folder path
	 * @param  string  $action  action name (read/write/rm)
	 * @return void
	 **/
	private function _isAllowed($path, $action) {
		
		switch ($action) {
			case 'read':
				if (!is_readable($path)) {
					return false;
				}
				break;
			case 'write':
				if (!is_writable($path)) {
					return false;
				}
				break;
			case 'rm':
				if (!is_writable(dirname($path))) {
					return false;
				}
				break;
		}
		
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
	 * Return image manipalation library name
	 *
	 * @return string
	 **/
	private function _getImgLib()
	{
		if (extension_loaded('imagick')) {
			return 'imagick';
		} elseif (function_exists('exec')) {
			exec('mogrify --version', $o, $c);
			if ($c == 0) {
				return 'mogrify';
			}
		}
		return function_exists('gd_info') ? 'gd' : '';
	}
	
	/**
	 * Return list of available archivators
	 *
	 * @return array
	 **/
	private function _checkArchivators()
	{
		if (!function_exists('exec')) {
			$this->_options['archivators'] = $this->_options['archive'] = array();
			return;
		}
		$arcs = array(
			'create'  => array(),
			'extract' => array()
			);
		
		$tar  = exec('tar --version', $o, $ctar);
		if ($tar && $ctar == 0) {
			$test = exec('gzip --version', $o, $c);
			if ($test && $c == 0) {
				$arcs['create']['application/x-gzip']  = array('cmd' => 'tar', 'argc' => '-czf', 'ext' => 'tgz');
				$arcs['extract']['application/x-gzip'] = array('cmd' => 'tar', 'argc' => '-xzf', 'ext' => 'tgz');
			}
			$test = exec('bzip2 --version', $o, $c);
			if ($test && $c == 0) {
				$arcs['create']['application/x-bzip2']  = array('cmd' => 'tar', 'argc' => '-cjf', 'ext' => 'tbz');
				$arcs['extract']['application/x-bzip2'] = array('cmd' => 'tar', 'argc' => '-xjf', 'ext' => 'tbz');
			}
		}
		
		$test = exec('zip --version', $o, $c);
		if ($test && $c == 0) {
			$arcs['create']['application/zip']  = array('cmd' => 'zip', 'argc' => '-r9', 'ext' => 'zip');
		}
		
		$test = exec('unzip --help', $o, $c);
		if ($test && $c == 0) {
			$arcs['extract']['application/zip'] = array('cmd' => 'unzip', 'argc' => '',  'ext' => 'zip');
		} 
		
		$test = exec('rar --version', $o, $c);
		if ($test && $c == 0) {
			$arcs['create']['application/x-rar']  = array('cmd' => 'rar', 'argc' => '-a inul', 'ext' => 'rar');
			$arcs['extract']['application/x-rar'] = array('cmd' => 'rar', 'argc' => 'x',       'ext' => 'rar');
		} else {
			$test = exec('unrar', $o, $c);
			if ($test && ($c==0 || $c == 7)) {
				$arcs['extract']['application/x-rar'] = array('cmd' => 'unrar', 'argc' => 'x', 'ext' => 'rar');
			}
		}
		
		if ($tar && $ctar == 0) {
			$arcs['create']['application/x-tar']  = array('cmd' => 'tar', 'argc' => '-cf', 'ext' => 'tar');
			$arcs['extract']['application/x-tar'] = array('cmd' => 'tar', 'argc' => '-xf', 'ext' => 'tar');
		}
		
		$test = exec('7za --help', $o, $c);
		if ($test && $c == 0) {
			$arcs['create']['application/x-7z-compressed']  = array('cmd' => '7za', 'argc' => 'a -l', 'ext' => '7z');
			$arcs['extract']['application/x-7z-compressed'] = array('cmd' => '7za', 'argc' => 'e -y', 'ext' => 'rar');
			
			if (empty($arcs['create']['application/x-gzip'])) {
				$arcs['create']['application/x-gzip'] = array('cmd' => '7za', 'argc' => 'a -tgzip -l', 'ext' => 'tar.gz');
			}
			if (empty($arcs['extract']['application/x-gzip'])) {
				$arcs['extract']['application/x-gzip'] = array('cmd' => '7za', 'argc' => 'e -tgzip -y', 'ext' => 'tar.gz');
			}
			if (empty($arcs['create']['application/x-bzip2'])) {
				$arcs['create']['application/x-bzip2'] = array('cmd' => '7za', 'argc' => 'a -tbzip2 -l', 'ext' => 'tar.bz');
			}
			if (empty($arcs['extract']['application/x-bzip2'])) {
				$arcs['extract']['application/x-bzip2'] = array('cmd' => '7za', 'argc' => 'a -tbzip2 -y', 'ext' => 'tar.bz');
			}
			if (empty($arcs['create']['application/zip'])) {
				$arcs['create']['application/zip'] = array('cmd' => '7za', 'argc' => 'a -tzip -l', 'ext' => 'zip');
			}
			if (empty($arcs['extract']['application/zip'])) {
				$arcs['extract']['application/zip'] = array('cmd' => '7za', 'argc' => 'e -tzip -y', 'ext' => 'zip');
			}
			if (empty($arcs['create']['application/x-tar'])) {
				$arcs['create']['application/x-tar'] = array('cmd' => '7za', 'argc' => 'a -ttar -l', 'ext' => 'tar');
			}
			if (empty($arcs['extract']['application/x-tar'])) {
				$arcs['extract']['application/x-tar'] = array('cmd' => '7za', 'argc' => 'e -ttar -y', 'ext' => 'tar');
			}
		}
		
		$this->_options['archivators'] = $arcs;
		foreach ($this->_options['archiveMimes'] as $k=>$mime) {
			if (!isset($this->_options['archivators']['create'][$mime])) {
				unset($this->_options['archiveMimes'][$k]);
			}
		}
		if (empty($this->_options['archiveMimes'])) {
			$this->_options['archiveMimes'] = array_keys($this->_options['archivators']['create']);
		}
	}
	
	
	/**
	 * Return mimetype detect method name
	 *
	 * @return string
	 **/
	private function _getMimeDetect()
	{
		if (class_exists('finfo')) {
			return 'finfo';
		} elseif (function_exists('mime_content_type') && (mime_content_type(__FILE__) == 'text/x-php' || mime_content_type(__FILE__) == 'text/x-c++')) {
			return 'mime_content_type';
		} elseif (function_exists('exec')) {
			$type = exec('file -ib '.escapeshellarg(__FILE__));
			if (0 === strpos($type, 'text/x-php') || 0 === strpos($type, 'text/x-c++'))
			{
				return 'linux';
			}
			$type = exec('file -Ib '.escapeshellarg(__FILE__));
			if (0 === strpos($type, 'text/x-php') || 0 === strpos($type, 'text/x-c++'))
			{
				return 'bsd';
			}
		}
		return 'internal';
	}
	
	
	/**
	 * Return file path hash (crc32)
	 *
	 * @param  string  $path 
	 * @return string
	 **/
	private function _hash($path)
	{
		return crc32($path);
	}
	
	/**
	 * Return file URL
	 *
	 * @param  string  $path 
	 * @return string
	 **/
	private function _path2url($path)
	{
		$dir  = substr(dirname($path), strlen($this->_options['root'])+1);
		$file = rawurlencode(basename($path));
		return $this->_options['URL'].($dir ? str_replace(DIRECTORY_SEPARATOR, '/', $dir).'/' : '').$file;
	}
	
		
	private function _utime()
	{
		$time = explode(" ", microtime());
		return (double)$time[1] + (double)$time[0];
	}
		
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	private function _errorData($path, $msg)
	{
		$path = preg_replace('|^'.preg_quote($this->_options['root']).'|', $this->_fakeRoot, $path);
		if (!isset($this->_result['errorData'])) {
			$this->_result['errorData'] = array();
		}
		$this->_result['errorData'][$path] = $msg;
		return false;
	}	
	
		
	
}


?>