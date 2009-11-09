<?php

if (function_exists('mb_internal_encoding'))
{
	mb_internal_encoding('UTF-8');
}


class elFinder {
	
	var $_options = array(
		'root'      => './',
		'URL'       => '',
		'role'      => 'user',
		'fileUmask' => 0666,
		'dirUmask'  => 0777,
		'tplDir'    => '',       
		'tplName'   => 'FILEMANAGER',
		'lang'      => 'en',
		'tmbDir'    => '.tmb',
		'tmbSize'   => 48,
		'mimetypes' => array(),
		'acl'       => null,
		'role'      => 'user',
		'defaults' => array(
			'read'  => true,
			'write' => false
			),
		'perms' => array()
		);
		
	var $_views      = array('list', 'ismall', 'ibig');
	var $_te         = null;
	var $_translator = null;
	var $_img        = null;
	var $_imglib     = '';
	
	var $_mimetypes = array(
		'directory'                     => 'Directory',
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
	
	var $_m = array(
		'cd'     => '_cd',
		'tree'   => '_getTree',
		'open'   => '_open',
		'info'   => '_info',
		'url'    => '_url',
		'mkdir'  => '_mkdir',
		'rename' => '_rename',
		'edit'   => '_edit',
		'rm'     => '_rm',
		'copy'   => '_copy',
		'upload' => '_upload'
		);
	
	var $_allowed = array();
		
	function __construct($opts=array())
	{
		foreach ($this->_options as $k=>$v) 
		{
			if (isset($opts[$k])) 
			{
				$this->_options[$k] = !is_array($v) ? $opts[$k] : array_merge($v, $opts[$k]);
			}
		}
		$this->_options['root'] = realpath($this->_options['root'] ? $this->_options['root'] : './').'/';
		if (!$this->_options['tplDir']) 
		{
			$this->_options['tplDir'] = dirname(__FILE__).'/tpl/';
		}
		if ($this->_options['URL']{strlen($this->_options['URL'])-1} != '/') 
		{
			$this->_options['URL'] .= '/';
		}
		
		foreach ($this->_options['mimetypes'] as $m)
		{
			$this->_allowed[] = $this->_fileKind($m);
		}
		$this->_allowed = array_unique($this->_allowed);
		$this->_image = new elImage();
	}
		
	function elFinder($opts=array()) 
	{
		$this->__construct($opts);
	}
	
	function setTE(&$te) 
	{
		$this->_te = & $te;
	}
	
	function setTranslator($tr)
	{
		$this->_translator = $tr;
	}
		
	function autorun() 
	{

		if (!$this->_isAllowed($this->_options['root'], 'read')) {
			exit('<h1 style="color:red">Access denied!</h1>');
		}
		
		$cmd = !empty($_GET['cmd']) ? trim($_GET['cmd']) : (!empty($_POST['cmd']) ? trim($_POST['cmd']) : '');
		
		if (!empty($this->_m[$cmd]) && method_exists($this, $this->_m[$cmd])) 
		{
			$this->{$this->_m[$cmd]}();
		}
		else {
			$this->_rnd();
		}
		exit();
	}
		
	/********************************************************************/
	/***                     Манипуляции с файлами                    ***/
	/********************************************************************/
		
	function _cd(){
		$target = !empty($_GET['target']) ? $_GET['target'] : '';
		$dir = $this->_find($target);
		exit($this->_rndDir($dir ? $dir : $this->_options['root']));
	}
		
	function _getTree() 
	{
		exit($this->_rndTree());
	}
		
	/**
	 * Выводит содержимое файла в браузер
	 *
	 * @return void
	 **/
	function _open()
	{
		if (empty($_GET['current']) || false == ($current = $this->_find($_GET['current'])) 
		||  empty($_GET['target'])  || false == ($target  = $this->_find(trim($_GET['target']), $current)) )
		{
			header('HTTP/1.x 404 Not Found'); 
			exit('File was not found. Invalid parameters.');
		}
		if (!$this->_isAllowed($current, 'read'))
		{
			header('HTTP/1.0 403 Acces denied');
			exit('Access denied');
		}
		if (false == ($info = elFileInfo::info($target)) || 'directory' == $info['mimetype'])
		{
			header('HTTP/1.x 404 Not Found'); 
			exit('File not found');
		}
		if (!$info['read'])
		{
			header('HTTP/1.0 403 Acces denied');
			exit('Access denied');
		}
		header("Content-Type: ".$info['mimetype']);
		header("Content-Disposition: ".(substr($info['mimetype'], 0, 5) == 'image' || substr($info['mimetype'], 0, 4) == 'text' ? 'inline' : 'attacments')."; filename=".$info['basename']);
		header("Content-Location: ".str_replace($this->_options['root'], '', $target));
		header("Content-Length: " .$info['size']);
		header("Connection:close");
		readfile($target);
		exit();
	}
	
		
	function _url() 
	{
		if (empty($_GET['current']) || false == ($current = $this->_find($_GET['current'])) 
		||  empty($_GET['target'])  || false == ($target  = $this->_find(trim($_GET['target']), $current)) )
		{
			$this->_jsonError('File was not found. Invalid parameters.');
		}
		if (!$this->_isAllowed($current, 'read'))
		{
			$this->_jsonError('Access denied.');
		}
		if (false == ($info = elFileInfo::info($target)))
		{
			$this->_jsonError('File was not found.');
		}
//		$url = $this->_options['URL'].substr($target, strlen($this->_options['root'])+1);	
		$url = $this->_path2url($target);
		exit(elJSON::encode(array('url' => $url)));
	}
		
	/**
	 * Информация о файле/директории
	 *
	 * @return void
	 **/
	function _info()
	{
		if (empty($_GET['current']) || false == ($current = $this->_find($_GET['current'])) 
		||  empty($_GET['target'])  || false == ($target  = $this->_find(trim($_GET['target']), $current)) )
		{
			exit('<div class="el-dialogform-error">'.$this->_translate('File was not found. Invalid parameters.').'</div>');
		}
		if (!$this->_isAllowed($current, 'read'))
		{
			exit('<div class="el-dialogform-error">'.$this->_translate('Access denied.').'</div>');
		}
		if (false == ($info = elFileInfo::info($target)))
		{
			exit('<div class="el-dialogform-error">'.$this->_translate('File was not found.').'</div>');
		}
		$currentInfo = elFileInfo::info($current);
		$read  = $info['read']  && $this->_isAllowed($info['path'], 'read')  ? 'read' : '';
		if ($info['mimetype'] == 'directory')
		{
			$write = $info['write'] && $this->_isAllowed($info['path'], 'write') ? 'write' : '';
		}
		else
		{
			$write = $info['write'] && $currentInfo['write'] && $this->_isAllowed($currentInfo['path'], 'write') ? 'write' : '';
		}
		
		$html = '<table>';
		$html .= '<tr><td>'.$this->_translate('File name').'</td><td>'.$info['basename'].'</td></tr>';
		$html .= '<tr><td>'.$this->_translate('Kind').'</td><td>'.$this->_fileKind($info['mimetype']).'</td></tr>';
		$html .= '<tr><td>'.$this->_translate('Size').'</td><td>'.$info['hsize'].'</td></tr>';
		$html .= '<tr><td>'.$this->_translate('Modified').'</td><td>'.date('F d Y H:i:s', $info['mtime']).'</td></tr>';
		$html .= '<tr><td>'.$this->_translate('Last opened').'</td><td>'.date('F d Y H:i:s', $info['atime']).'</td></tr>';
		$html .= '<tr><td>'.$this->_translate('Access').'</td><td>'.($this->_translate($read).' '.$this->_translate($write)).'</td></tr>';

		if (substr($info['mimetype'], 0, 5) == 'image' && false != ($s = getimagesize($target)))
		{
			$html .= '<tr><td>'.$this->_translate('Dimensions').'</td><td>'.($s[0].'px x '.$s[1].'px').'</td></tr>';
		}
		if (substr($info['mimetype'], 0, 4) == 'text')
		{
			$html .= '<tr><td>'.$this->_translate('Charset').'</td><td>'.$info['charset'].'</td></tr>';
		}
		$html .= '</table>';
		exit($html);
	}
	
	
	/**
	 * Создание директории
	 *
	 * @return void
	 **/
	function _mkdir()
	{
		if (empty($_GET['current']) || false == ($current = $this->_find($_GET['current'])))
		{
			$this->_jsonError('Unable to create directory. Invalid parameters.');
		}
		if (!$this->_isAllowed($current, 'read')
		||  !$this->_isAllowed($current, 'write'))
		{
			$this->_jsonError('Access denied.');
		}
		if (empty($_GET['dirname']) || false == ($dirname = $this->_checkName($_GET['dirname'])))
		{
			$this->_jsonError('Invalid directory name');
		}
		$path = $current.DIRECTORY_SEPARATOR.$dirname;
		if (file_exists($path))
		{
			$this->_jsonError('Directory or file with the same name already exists');
		}
		if (!@mkdir($path, $this->_options['dirUmask']))
		{
			$this->_jsonError('Unable to create directory %s', array($dirname));
		}
		@chmod($path, $this->_options['dirUmask']);
		$this->_jsonMessage('Directory %s was created', $dirname);
	}
	
	
	/**
	 * Переименования файла/директории в  текущей диреkтории
	 *
	 * @return void
	 **/
	function _rename()
	{
		if (empty($_GET['current']) || false == ($current = $this->_find($_GET['current'])) 
		||  empty($_GET['target'])  || false == ($target  = $this->_find(trim($_GET['target']), $current)) )
		{
			$this->_jsonError('Unable to rename. Invalid parameters.');
		}
		if (!$this->_isAllowed($current, 'read')
		||  !$this->_isAllowed($current, 'write')
		||  (is_dir($target) && !$this->_isAllowed($target, 'write'))
		||  !is_writable($target))
		{
			$this->_jsonError('Access denied.');
		}
		if (empty($_GET['newname']) || false == ($newname = $this->_checkName($_GET['newname'])))
		{
			$this->_jsonError('Invalid name');
		}
		if ($newname == basename($target))
		{
			$this->_jsonError('New name is equal to old one.');
		}
		$newTarget = $current.DIRECTORY_SEPARATOR.$newname;
		if (file_exists($newTarget))
		{
			$this->_jsonError('File or directory with the same name already exists');	
		}
		
		if (!@rename($target, $newTarget))
		{
			$this->_jsonError('Rename %s to %s failed', array(basename($target), $newTarget));
		}
		if (elFileInfo::isWebImage($newTarget))
		{
			$tmbDir = $current.DIRECTORY_SEPARATOR.$this->_options['tmbDir'];
			if (elFS::mkdir($tmbDir))
			{
				$oldTmb = $tmbDir.DIRECTORY_SEPARATOR.basename($target);
				$newTmb = $tmbDir.DIRECTORY_SEPARATOR.basename($newTarget);
				if (file_exists($oldTmb))
				{
					@rename($oldTmb, $newTmb);
				}
			}
		}
		$this->_jsonMessage('%s was renamed to %s', array(basename($target), $newname));
	}
	
	
	function _edit() {
		if (empty($_POST['current']) || false == ($current = $this->_find($_POST['current'])) 
		||  empty($_POST['target'])  || false == ($target  = $this->_find(trim($_POST['target']), $current)) )
		{
			header('HTTP/1.x 404 Not Found'); 
			exit('File was not found. Invalid parameters.');
		}
		if (!$this->_isAllowed($current, 'read'))
		{
			header('HTTP/1.0 403 Acces denied');
			exit('Access denied');
		}
		if (false == ($info = elFileInfo::info($target)) || 'directory' == $info['mimetype'])
		{
			header('HTTP/1.x 404 Not Found'); 
			exit('File not found');
		}
		if (!$info['read'])
		{
			header('HTTP/1.0 403 Acces denied');
			exit('Access denied');
		}
		
		$data = trim($_POST['content']);
		if (false!= ($fp = fopen($target, 'wb')))
		{
			fwrite($fp, $data);
			fclose($fp);
			exit(elJSON::encode( array('message' => $this->_translate('File was saved')) ));
		} else {
			exit(elJSON::encode( array('error' => $this->_translate('Unable to save file')) ));
		}
	}
	
	/**
	 * Копирует/перемещает файлы/директории
	 *
	 * @return void
	 **/
	function _copy()
	{
		if (empty($_GET['current']) || false == ($current = $this->_find($_GET['current']))
		||  empty($_GET['source']) || false == ($source = $this->_find($_GET['source'])))
		{
			$this->_jsonError('Unable to paste files. Invalid parameters.');
		}
		if (!$this->_isAllowed($current, 'read')
		||  !$this->_isAllowed($source,  'read')
		||  !$this->_isAllowed($current, 'write'))
		{
			$this->_jsonError('Access denied.');
		}
		if (empty($_GET['files']))
		{
			$this->_jsonError('Unable to paste files. No one file was copied.');
		}
		$rm = !empty($_GET['move']) && 'true' == $_GET['move'];
		
		
		for ($i=0, $s=sizeof($_GET['files']); $i < $s; $i++) 
		{ 
			if (empty($_GET['files'][$i]) || false ==($src = $this->_find($_GET['files'][$i], $source)))
			{
				$this->_jsonError('File does not exists');
			}
			if ($rm && !$this->_isAllowed($source,  'write')) 
			{
				$this->_jsonError('Access denied');
			}
			$name    = basename($src);
			$isImage = elFileInfo::isWebImage($src);
			if (!elFS::copy($src, $current))
			{
				$this->_jsonError('Unable to copy %s', $name);
			}
			if ($rm && !elFS::rm($src))
			{
				$this->_jsonError('Unable to delete %s', $name);
			}
			
			if ($isImage)
			{
				$dir       = dirname($src).DIRECTORY_SEPARATOR.$this->_options['tmbDir'];
				$tmb       = $dir.DIRECTORY_SEPARATOR.$name;
				$targetDir = $current.DIRECTORY_SEPARATOR.$this->_options['tmbDir'];
				$targetTmb = $current.DIRECTORY_SEPARATOR.$this->_options['tmbDir'].DIRECTORY_SEPARATOR.$name;
				if (file_exists($tmb) && elFS::mkdir($targetDir) && elFS::copy($tmb, $targetDir.DIRECTORY_SEPARATOR.$name))
				{
					$rm && @unlink($tmb);
				}
			}
		}
		$this->_jsonMessage('Paste complite');
	}
	
	/**
	 * Удадение файла/директории
	 *
	 * @return void
	 **/
	function _rm()
	{
		if (empty($_GET['current']) || false == ($current = $this->_find($_GET['current']))
		||  empty($_GET['target']) || !is_array($_GET['target']))
		{
			$this->_jsonError('Unable to delete. Invalid parameters.');
		} 
		if (!$this->_isAllowed($current, 'read')
		||  !$this->_isAllowed($current, 'write')
		)
		{
			$this->_jsonError('Access denied.');
		}
		foreach ($_GET['target'] as $hash)
		{
			if (false == ($target = $this->_find($hash, $current)))
			{
				$this->_jsonError('File not found.');
			}
			if ((is_dir($target) && !$this->_isAllowed($target, 'write'))
			|| !is_writable($target))
			{
				$this->_jsonError('Access denied.');
			}
			$isImage = elFileInfo::isWebImage($target);
			if (!elFS::rm($target))
			{
				$this->_jsonError('Unable to delete %s', basename($target));
			}
			if ($isImage)
			{
				$tmb = $current.DIRECTORY_SEPARATOR.$this->_options['tmbDir'].DIRECTORY_SEPARATOR.basename($target);
				file_exists($tmb) && unlink($tmb);
			}
			
		}
		$this->_jsonMessage('Files removed');
	} 
	
	/**
	 * Загрузка файлов
	 *
	 * @return void
	 **/
	function _upload()
	{
		if (empty($_POST['current']) || false == ($current = $this->_find($_POST['current'])))
		{
			$this->_jsonError('Unable to upload files. Invalid parameters.');
		}
		if (!$this->_isAllowed($current, 'read')
		||  !$this->_isAllowed($current, 'write'))
		{
			$this->_jsonError('Access denied.');
		}
		if (empty($_FILES['fm-file']))
		{
			$this->_jsonError('Select at least one file to upload');
		}
		$total = count($_FILES['fm-file']['name']);
		$ok = $failed = array();

		for ($i=0; $i < $total; $i++) 
		{ 
			if (!empty($_FILES['fm-file']['name'][$i]))
			{
				if ($_FILES['fm-file']['error'][$i] > 0)
				{
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
					$failed[] = $_FILES['fm-file']['name'][$i].' : '.($error);
				}
				elseif (!$this->_checkName($_FILES['fm-file']['name'][$i]))
				{
					$failed[] = $_FILES['fm-file']['name'][$i].' : '.$this->_translate('Invalid file name');
				}
				elseif (!$this->_checkMime($_FILES['fm-file']['tmp_name'][$i]))
				{
					$failed[] = $_FILES['fm-file']['name'][$i].' : '.$this->_translate('Not allowed file type');
				}
				else
				{
					$target = $current.DIRECTORY_SEPARATOR.$_FILES['fm-file']['name'][$i];
					if (move_uploaded_file($_FILES['fm-file']['tmp_name'][$i], $target))
					{
						@chmod($target, $this->_options['dirUmask']);
						$ok[] = $_FILES['fm-file']['name'][$i];
					}
					else
					{
						$failed[] = $_FILES['fm-file']['name'][$i].' : '.('Unable to save uploaded file');
					}
				}
			}
		}
		if (!sizeof($ok))
		{
			exit(elJSON::encode( array('error' => ('Files upload failed'), 'failed' => $failed) ));
		}

		$message = !($failed) 
			? $this->_translate('Files successfully uploaded')
			: $this->_translate( sprintf('Following files was uploaded: %s', implode(', ', $ok)));
		
		exit(elJSON::encode( array('message' => $message, 'failed' => $failed) ));
	}
	
	/********************************************************************/
	/***                методы - отрисовщики контента                 ***/
	/********************************************************************/	

	/**
	 * Возвращает распарсеный шаблон файлового менеджера
	 *
	 * @return string
	 **/	
	function _rnd() 
	{
		$this->_te();
		$this->_te->setFile($this->_options['tplName'], $this->_options['tplDir'].DIRECTORY_SEPARATOR.'default.html');
		
		$this->_rndTree();
		$this->_rndDir($this->_options['root']);
		$this->_te->parse($this->_options['tplName'], null, false, true, true);
		echo $this->_te->getVar($this->_options['tplName']);
	}
		
	
	/**
	 * Возвращает распарсеный шаблон дерева директорий
	 *
	 * @return string
	 **/
	function _rndTree()
	{
		$tree = $this->_tree();
		$this->_te();
		$this->_te->setFile('FM_TREE', $this->_options['tplDir'].DIRECTORY_SEPARATOR.'tree.html');
		$this->_te->assignVars('tree', $this->_tree2htmllist($tree['dirs']));
		$this->_te->assignVars('fm_root_hash', $tree['hash']);
		$this->_te->assignVars('home', basename($this->_options['root']));
		$this->_te->parse('FM_TREE');
		return $this->_te->getVar('FM_TREE');
	}
	
	
	/**
	 * Возвращает распарсеный шаблон текущей директории
	 *
	 * @return string
	 **/
	function _rndDir($path)
	{
		$view = !empty($_GET['view']) && in_array($_GET['view'], $this->_views) ? $_GET['view'] : $this->_views[0];
		$this->_te();
		$filesNum  = 0;
		$filesSize = 0;
		$cnt        = 0;
		$wrap       = 'ismall' == $view ? 12  : 17;
		$this->_te->setFile('FM_CONTENT', $this->_options['tplDir'].DIRECTORY_SEPARATOR.('list' == $view ? 'list.html' : 'icons.html'));
		$this->_te->assignVars(array(
			'Name'   => $this->_translate('Name'),
			'Access' => $this->_translate('Access'),
			'Date modified' => $this->_translate('Date modified'),
			'Size' => $this->_translate('Size'),
			'Kind' => $this->_translate('Kind'),
			'Back' => $this->_translate('Back'),
			'Reload' => $this->_translate('Reload'),
			'Select file' => $this->_translate('Select file'),
			'Open' => $this->_translate('Open'),
			'Rename' => $this->_translate('Rename'),
			'Edit text document' => $this->_translate('Edit text document'),
			'Delete' => $this->_translate('Delete'),
			'Get info' => $this->_translate('Get info'),
			'Create directory' => $this->_translate('Create directory'),
			'Upload files' => $this->_translate('Upload files'),
			'Copy' => $this->_translate('Copy'),
			'Cut' => $this->_translate('Cut'),
			'Paste' => $this->_translate('Paste'),
			'View as big icons' => $this->_translate('View as big icons'),
			'View as small icons' => $this->_translate('View as small icons'),
			'View as list' => $this->_translate('View as list'),
			'Toggle view of actions results dialogs' => $this->_translate('Toggle view of actions results dialogs'),
			'Help'  => $this->_translate('Help'),
			'Files' => $this->_translate('Files')
			));
		$this->_te->assignVars('view', $view);
		$cwd = elFileInfo::info($path);
		$p   = str_replace($this->_options['root'], '', $path);
		$info = array(
			'key'         => $cwd['hash'],
			'path'        => $p ? $p: '/',
			'filesNum'    => 0,
			'filesSize'   => 0,
			'write'       => $cwd['write'] && $this->_isAllowed($path, 'write'),
			'view'        => $view,
			'postMaxSize' => ini_get('post_max_size'),
			'allowed'     => implode(', ', $this->_allowed)
			);
		// echo $path.' '.$this->_isAllowed($path, 'write').'<br>';
		if (!$cwd['read'])
		{
			$this->_te->assignVars('info', elJSON::encode($info));
			$this->_te->parse('FM_CONTENT');
			return $this->_te->getVar('FM_CONTENT');
		}
		$content = elFS::lsall($path); 
		foreach ($content as $item)
		{
			if ('directory' != $item['mimetype'] || $this->_isAllowed($item['path'], 'read'))
			{
				if ($item['mimetype'] == 'directory') {
					$item['icon_class'] = 'directory';
				} else {
					$item['icon_class'] = $this->_cssClass($item['mimetype']);
				}
				$read  = $item['read']  ? 'read' : '';
				$item['disabled'] = !$read ? 'disabled' : '';
				
				if (false !== strpos($item['mimetype'], 'text') && $item['mimetype'] != 'text/rtf' && $item['mimetype'] != 'text/rtfd') {
					$item['type'] .= ' text';
				}
				
				if ('directory' != $item['mimetype']) 
				{
					$info['filesNum']++;
					$info['filesSize'] += $item['size'];
					$write = $item['write'] && $info['write'] ? 'write' : '';
				}
				else
				{
					$write = $item['write'] && $this->_isAllowed($item['path'], 'write') ? 'write' : '';
				}
				
				$item['type'] = ('directory' == $item['mimetype'] ? 'dir' : ($item['icon_class'] == 'image' ? 'image' : 'file'))
					.'-'.($read ? 'r' :'').($write ? 'w' :'');
					
				if ('list' == $view)
				{
					$item['rowClass'] = ($cnt++%2) ? 'odd' : '';
					$item['kind']     = $this->_fileKind($item['mimetype']);
					$item['mdate']    = date('M d Y H:i:s', $item['mtime']);
					$item['access']   = $this->_translate($read.' '.$write);
				}
				else
				{
					if ($view == 'ibig' 
					&&( $item['mimetype'] == 'image/jpeg' || $item['mimetype'] == 'image/gif' || $item['mimetype'] == 'image/png')) 
					{
						if (false != ($tmb = $this->_tmb($item)))
						{
							$item['style'] = ' style="background:url(\''.$this->_path2url($tmb).'\') center center no-repeat;"';
						}
					}
					$item['name'] = $this->_wrapFileName($item['basename'], $wrap);
				}
				$this->_te->assignBlockVars('FILE', $item);
			}
		}
		$info['filesSize'] = elFileInfo::formatSize($info['filesSize']);
		$this->_te->assignVars('info', elJSON::encode($info));
		$this->_te->parse('FM_CONTENT', null, false, true);
		return $this->_te->getVar('FM_CONTENT');
	}
	
	function _fileKind($mtype) 
	{
		if (isset($this->_mimetypes[$mtype])) 
		{
			return $this->_translate($this->_mimetypes[$mtype]); 
		}
		switch ($mtype)
		{
			case 'image': return $this->_translate('Image');
			case 'text':  return $this->_translate('Text document');
			case 'audio': return $this->_translate('Audio file');
			case 'video': return $this->_translate('Video file');
			default:      return $this->_translate('Unknown');
		}
	}
	
	/**
	 * Возвращает url иконки или превью
	 *
	 * @param  array  $file - массив, возвращаемый el\FileInfo::info()
	 * @param  string $dir  имя директории с иконками (small | big)
	 * @return string
	 **/
	function _cssClass($mime)
	{
		if ($mime == 'directory') {
			return 'directory';
		}
		$parts = explode('/', $mime);
		if ('application' == $parts[0] || 'text' == $parts[0]) {
			
			if ('application' == $parts[0] && preg_match('/(zip|rar|tar|7z|lhs)/', $parts[1])) {
				return 'archive';
			}
			return str_replace('.', '-', $parts[1]);
		}
		return $parts[0];
	}

	function _tmb($img) 
	{
		$dir = dirname($img['path']).DIRECTORY_SEPARATOR.$this->_options['tmbDir'];
		if (!elFS::mkdir($dir))
		{
			return false;
		}
		
		$tmb = $dir.DIRECTORY_SEPARATOR.$img['basename'];
		if (file_exists($tmb))
		{
			return $tmb;
		}
		
		return $this->_image->tmb($img['path'], $tmb, $this->_options['tmbSize'], $this->_options['tmbSize'], true);
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	function _path2url($path)
	{
		$path = str_replace($this->_options['root'], '', $path);
		$path = str_replace(DIRECTORY_SEPARATOR, '/', $path);
		return $this->_options['URL'].$path;
	}
	
	/**
	 * Обрезает имя файла до $wrap символов, если оно длинее
	 *
	 * @param  string  $name  имя файла
	 * @param  int     $wrap  кол-во символов
	 * @return string
	 **/
	function _wrapFileName($name, $wrap)
	{
		return function_exists('mb_substr') 
			? (mb_strlen($name) > $wrap ? mb_substr($name, 0, intval($wrap-3)).'...'.mb_substr($name, -3) : $name)
			: (strlen($name) > $wrap ? substr($name, 0, intval($wrap-3)).'...'.substr($name, -3) : $name);
	}
	
	/**
	 * Ищет директорию или файл по хэшу
	 *
	 * @param  string  $hash  хэш
	 * @param  string  $path  текщая директория для поиска файла
	 * @return string
	 **/
	function _find($hash, $path='')
	{
		$tree = $this->_tree();
		if ($tree['hash'] == $hash)
		{
			return $tree['path'];
		}
		if (false != ($result = $this->_findInTree($hash, $tree)))
		{
			return $result;
		}
		if ($path && false != ($ls = elFS::ls($path, EL_FS_ONLY_FILES, true, true)))
		{
			return isset($ls[$hash]) ? $path.DIRECTORY_SEPARATOR.$ls[$hash] : false;
		}
	}
	
	/**
	 * Ищет в дереве директорию по ее хэшу
	 * Возвращает путь или false.
	 *
	 * @param  string  $hash  хэш искомой директории
	 * @param  array   $dir   дерево директорий
	 * @return string
	 **/
	function _findInTree($hash, $dir)
	{
		if ($dir['hash'] == $hash)
		{
			return $dir['path'];
		}
		foreach ($dir['dirs'] as $_dir)
		{
			if (false != ($path = $this->_findInTree($hash, $_dir)))
			{
				return $path;
			}
		}
	}
	
	/**
	 * Возвращает представление дерева директорий в виде html списка
	 *
	 * @param  array  $dir
	 * @return string
	 **/
	function _tree2htmllist($tree)
	{
		$html = "<ul>\n";
		foreach ($tree as $dirname=>$value)
		{
			$html .= '<li><a key="'.$value['hash'].'" href="#">'.$dirname.'</a>';
			if (!empty($value['dirs']))
			{
				$html .= $this->_tree2htmllist($value['dirs']);
			}
			$html .= "</li>\n";
		}
		$html .= "</ul>\n";
		return $html;
	}
	
	/**
	 * Проверяет имя файла/директории на недопустимые символы
	 * Возвращает имя или FALSE
	 *
	 * @param  string  $name  имя
	 * @return string
	 **/
	function _checkName($name)
	{
		$name = trim($name);
		return false === strpos($name, '\\') && preg_match('/^[^\/@\!%"\']+$/i', $name) ? $name : false;
	}
	
	function _checkMime($path) 
	{
		if ($this->_options['mimetypes']) 
		{
			$fileMime = elFileInfo::mimetype($path);
			foreach ($this->_options['mimetypes'] as $mime) 
			{
				if (0 === strpos($fileMime, $mime))
				{
					return true;
				}
			}
			return false;
		}
		return true;
	}
	
	function _te() {
		if (!$this->_te) {
			$this->_te = new elTE();
		}
	}
	
	/**
	 * Возвращает массив директорий, к которым разрешен доступ на чтение
	 *
	 * @return array
	 **/
	function _tree()
	{
		return elFS::tree($this->_options['root'], 
						$this->_options['acl'], 
						$this->_options['role'], 
						$this->_options['perms'], 
						$this->_options['defaults']['read']);
	}	
		
	function _isAllowed($f, $act) 
	{
		if ($this->_options['acl']) {
			return $this->_options['acl']->isAllowed($this->_options['role'], $f, $act);
		} elseif (isset($this->_options['perms'][$f][$act])) {
			return $this->_options['perms'][$f][$act];
		}
		
		return isset($this->_options['defaults'][$act]) ? $this->_options['defaults'][$act] : false;
	}


	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	function _jsonError($tpl, $args=array())
	{
		exit(elJSON::encode(array('error' => vsprintf($this->_translate($tpl), $args))));
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	function _jsonMessage($tpl, $args=array())
	{
		$args = !empty($args) && !is_array($args) ? array($args) : $args;
		$msg  = !$args 
			? $this->_translate($tpl) 
			: vsprintf( $this->_translate($tpl), $args);
		exit(elJSON::encode(array('message' => $msg)));
	}
	
	function _translate($msg) {
//		return m($msg);
		return $this->_translator ? $this->_translator->translate($this->_options['lang'], $msg) : $msg;
	}
	
}


class elImage {
	
	var $error = '';
	var $_lib  = '';
	
	function __construct()
	{
		if (extension_loaded('imagick'))
		{
			$this->_lib = 'imagick'; 
			return;
		}
		exec('mogrify --version', $o, $c); 
		if ($c == 0 && !empty($o))
		{
			$this->_lib = 'mogrify';
		}
		elseif (function_exists('gd_info'))
		{
			$this->_lib = 'gd';
		}
		
	}
	
	function elImage()
	{
		$this->__construct();
	}
	
	function allowResize()
	{
		return $this->_lib;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 **/
	function calcTmbSize($imgW, $imgH, $tmbW, $tmbH, $crop=false)
	{
		if ( $imgW >= $imgH )
		{
			if (!$crop)
			{
				$width  = $tmbW;
				$height = ceil(($imgH*$width)/$imgW);
			}
			else
			{
				$height = $tmbH;
				$width  = ceil(($imgW*$height)/$imgH);
			}
		}
		else
		{
			if (!$crop)
			{
				$height = $tmbH;
				$width  = ceil(($imgW*$height)/$imgH);
			}
			else
			{
				$width  = $tmbW;
				$height = ceil(($imgH*$width)/$imgW);
			}
		}
		return array($width, $height);
	}
	
	
	function imageInfo($img)
	{
		$path = realpath($img); 
		if (empty($img) || !$path || !file_exists($path) )
		{
			return $this->_error('File %s does not exists', $img?$img:'');
		}
		if (!is_readable($path))
		{
			return $this->_error('File %s is not readable', $img);
		}
		$s = getimagesize($path);

		if (!$s || ($s['mime'] != 'image/gif' && $s['mime'] != 'image/png' && $s['mime'] != 'image/jpeg'))
		{
			return $this->_error('File "%s" is not an image or has unsupported type', $img);
		}
		return array(
			'basename' => basename($path),
			'path'     => $path,
			'mime'     => $s['mime'],
			'width'    => $s[0],
			'height'   => $s[1]
			);
	}
	
	function tmb($img, $tmb, $w, $h, $crop=true)
	{
		if (false == ($info = $this->imageInfo($img)))
		{
			return false;
		} 
		$_tmb = $tmb;
		if (is_dir($tmb))
		{
			$_tmb = realpath($tmb).DIRECTORY_SEPARATOR.$info['basename'];
		}
		if (!@copy($info['path'], $_tmb))
		{
			return $this->_error('Could not copy %s to %s!', array($img, $tmb));
		}
		$info['path'] = realpath($_tmb);
		$info['basename'] = basename($_tmb);
		return $this->_resize($info, $w, $h, $crop);
	}
	
	function resize($img, $w, $h, $crop=true)
	{
		if (false == ($info = $this->imageInfo($img)))
		{
			return false;
		}	
		return $this->_resize($info, $w, $h, $crop);
	}
	
	function watermark($img, $wm, $pos='br')
	{
		if (false == ($imgInfo = $this->imageInfo($img)) || false == ($wmInfo = $this->imageInfo($wm)))
		{
			return false;
		}
		switch ($this->_lib)
		{
			case 'imagick': return $this->_watermarkGD($imgInfo, $wmInfo, $pos);
			case 'mogrify': return $this->_watermarkGD($imgInfo, $wmInfo, $pos);
			case 'gd'     : return $this->_watermarkGD($imgInfo, $wmInfo, $pos);
			default       : return $this->_error('There are no one libs for image manipulation');
		}
	}
	
	function _resize($info, $w, $h, $crop)
	{
		switch ($this->_lib)
		{
			case 'imagick': return $this->_resizeImagick($info, $w, $h, $crop);
			case 'mogrify': return $this->_resizeMogrify($info, $w, $h, $crop);
			case 'gd'     : return $this->_resizeGD($info, $w, $h, $crop );
			default       : return $this->_error('There are no one libs for image manipulation');
		}
	}
	
	function _resizeGD($image, $w, $h, $crop=true)
	{
		$m = $this->_gdMethods($image['mime']);
		if (empty($m))
		{
			return $this->_error('File "%s" is not an image or has unsupported type', $image['basename']);
		}
		if (false === ($i = $m[0]($image['path'])))
		{
			return $this->_error('Unable to load image %s', $image['basename']);
		}
		list($_w, $_h) = $this->calcTmbSize($image['width'], $image['height'], $w, $h, true);
		$tmb = imagecreatetruecolor($_w, $_h);
		if ( !imageCopyResampled($tmb, $i, 0,0,0,0, $_w, $_h, $image['width'], $image['height']) )
		{
			return $this->_error('Unable to resize image %s', $image['basename']);
		}
		if ($crop)
		{
			$x = $y = 0;
			if ($_w > $w)
			{
				$x  = intval(($_w-$w)/2);
				$_w = $w;
			}
			else
			{
				$y  = intval(($_h-$h)/2);
				$_h = $h;
			}

			$canvas = imagecreatetruecolor($w, $h);
			imagecopy($canvas, $tmb, 0, 0, $x, $y, $_w, $_h);
			$result = $m[1]($canvas, $image['path'], $m[2]);
			imagedestroy($canvas);
		}
		else
		{
			$result = $m[1]($tmb, $image['path'], $m[2]);
		}
		imagedestroy($i);
		imagedestroy($tmb);
		return $result ? $image['path'] : false;
	}
	
	function _resizeImagick($image, $w, $h, $crop=true)
	{
		$i = new imagick($image['path']);
		if ($w<300 || $h<300)
		{
			$i->contrastImage(1);
			//$image->adaptiveBlurImage( 1, 1 );
		}
		if ($crop)
		{
			$i->cropThumbnailImage($w, $h);
		}
		else
		{
			$i->thumbnailImage($w, $h, true);
		}
		
		$result = $i->writeImage($image['path']);
		$i->destroy();
		return $result ? $image['path'] : false;
	}
	
	function _resizeMogrify($image, $w, $h, $crop=true)
	{
		exec('mogrify -scale '.$w.'x'.$h.' '.escapeshellarg($image['path']), $o, $c);
		return 0 == $c ? $image['path'] : false;
	}
	
	function _watermarkGD($imgInfo, $wmInfo, $pos)
	{
		$imgMethods = $this->_gdMethods($imgInfo['mime']);
		$wmMethods = $this->_gdMethods($wmInfo['mime']);
		if (empty($imgMethods))
		{
			return $this->_error('File "%s" is not an image or has unsupported type', $imgInfo['basename']);
		}
		if (empty($wmMethods))
		{
			return $this->_error('File "%s" is not an image or has unsupported type', $wmInfo['basename']);
		}
		if (false === ($orig = $imgMethods[0]($imgInfo['path'])))
		{
			return $this->_error('Unable to load image %s', $imgInfo['basename']);
		}
		if (false === ($wm = $wmMethods[0]($wmInfo['path'])))
		{
			return $this->_error('Unable to load image %s', $wmInfo['basename']);
		}
		$wOrig = imagesx( $orig );
		$hOrig = imagesy( $orig );
		$wWm   = imagesx( $wm );
		$hWm   = imagesy( $wm );
		switch ($pos)
		{
			case 'tl':
				$x = $y = 0;
				break;
			case 'tr':
				$x = $wOrig - $wWm;
				$y = 0;
				break;
			case 'c':
				$x = ($wOrig - $wWm)/2;
				$y = ($hOrig - $hWm)/2;
				break;
			case 'bl':
				$x = 0;
				$y = $hOrig - $hWm;
				break;
			default:
				$x = $wOrig - $wWm;
				$y = $hOrig - $hWm;
				
		}
		$out = imagecreatetruecolor($wOrig, $hOrig);
		imagealphablending($out, TRUE);
		
		imagecopy($out, $orig, 0, 0, 0, 0, $wOrig, $hOrig);
		imagecopy($out, $wm, $x, $y, 0, 0, $wWm, $hWm);
		imagedestroy($wm);
		imagedestroy($orig);
		$imgMethods[1]($out, $imgInfo['path'], 100);
		imagedestroy($out);
		
		return true;
		echo 'HERE';
	}
	
	
	function _error($err, $args=null)
	{
		elLoadMessages('Errors');
		$this->error = $args ? vsprintf(m($err), $args) : m($err);
		elMsgBox::put($this->error, EL_WARNQ); 
		return false;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 **/
	function _gdMethods($mime)
	{
		switch ($mime)
		{
			case 'image/jpeg': return imagetypes() & IMG_JPG ? array('imagecreatefromjpeg', 'imagejpeg', 100)  : false;
			case 'image/gif' : return imagetypes() & IMG_GIF ? array('imagecreatefromgif',  'imagegif',  null) : false;
			case 'image/png' : return imagetypes() & IMG_PNG ? array('imagecreatefrompng',  'imagepng',  5)   : false;
		}
	}
}

/**
 * Статический класс для работы с файловой системой.
 * Получение списков файлов и директорий,
 * рекурсивное корирование, перемещение и удаление директорий,
 * подробная инф о файлах
 *
 * @package    el.lib
 * @subpackage filesistem
 * @author     Dmitry Levashov dio@eldorado-cms.ru
 **/
define('EL_FS_ONLY_DIRS', 1);
define('EL_FS_ONLY_FILES', 2);
define('EL_FS_DIRMODE', 0777);

class elFS
{

	/**
	 * Возвращает список - содержимое директории
	 *
	 * @param  string  $dir            имя директории
	 * @param  int     $flag           если задан - возвращает или только файлы или только директории
	 * @param  bool    $ignoreDotFiles игнорировать файлы начинающиеся с точки
	 * @return array
	 **/
	function ls($dir, $flag=0, $ignoreDotFiles=true, $hashKey=false)
	{
		$_dir = realpath($dir);
		if (!$_dir || !is_dir($_dir))
		{
			trigger_error(sprintf('Directory %s does not exists', $dir));
			return false;
		}
		if (!is_readable($_dir))
		{
			trigger_error(sprintf('Directory %s is not readable', $dir));
			return false;
		}
		$list = array();
		if ( false == ($d = dir($_dir)))
		{
			trigger_error(sprintf('Unable to open directory %s', $dir), E_USER_WARNING);
			return false;
		}
		while( $entr = $d->read())
		{
			if ('.'!=$entr && '..'!=$entr && (!$ignoreDotFiles || '.'!=substr($entr, 0, 1)))
			{
				$_path = $d->path.DIRECTORY_SEPARATOR.$entr;
				if (!$flag 
				|| (EL_FS_ONLY_FILES == $flag && is_file($_path)) 
				|| (EL_FS_ONLY_DIRS  == $flag && is_dir($_path)))
				{
					if ($hashKey)
					{
						$list[crc32($_path)] = $entr;
					}
					else
					{
						$list[] = $entr;
					}
				}
			}
		}
		$d->close();
		return $list;
	}
	
	/**
	 * Возвращает массив директории и файлы в заданой директории с подробной информацией о них ( см FileInfo::info())
	 *
	 * @param  string  $dir            имя директории
	 * @param  bool    $ignoreDotFiles флаг - игнорировать файлы начинающиеся с точки
	 * @return array
	 **/
	function lsall($dir, $ignoreDotFiles=true)
	{
		if (false === ($list = elFS::ls($dir, 0, $ignoreDotFiles)))
		{
			return false;
		}
		if (!class_exists('elFileInfo'))
		{
			include_once('elFileInfo.class.php');
		}
		$dir  = realpath($dir);
		$dirs = $files = array();
		for ($i=0, $s=sizeof($list); $i < $s; $i++) 
		{ 
			$path = $dir.DIRECTORY_SEPARATOR.$list[$i];
			if ( is_dir($path) )
			{
				$dirs[$list[$i]] = elFileInfo::info($path);
			}
			else 
			{
				$files[$list[$i]] = elFileInfo::info($path);
			}
		}
		return $dirs+$files;
	}

	function find($path, $regexp)
	{
		$ret = array();
		$path = realpath($path);
		if (!$path || !is_dir($path))
		{
			return $ret;
		}
		
		if ( false == ($d = dir($path)))
		{
			trigger_error(sprintf('Unable to open directory %s', $path), E_USER_WARNING);
			return false;
		}
		while( $entr = $d->read())
		{
			if ('.'!=$entr && '..'!=$entr)
			{
				
				if (preg_match($regexp, $entr))
				{
					$ret[] = $d->path.DIRECTORY_SEPARATOR.$entr;
					
				}
				if (is_dir($d->path.DIRECTORY_SEPARATOR.$entr))
				{
					$ret = array_merge($ret, elFS::find($d->path.DIRECTORY_SEPARATOR.$entr, $regexp));
				}
			}
		}
		$d->close();
		return $ret;
	}

	/**
	 * Возвращает многомерный массив  - дерево директории
	 *
	 * @param  string  $dir  имя директории
	 * @param  el\ACL  $acl  если передан - директория добавляется в дерево, только если доступ к ней разрешен в $acl
	 * @param  string  $role роль для которой проверяет доступ $acl
	 * @return array
	 **/
	function tree($path, $acl=null, $role='', $perms=array(), $default=false)
	{
		$path  = realpath($path); 
		if ($path && is_dir($path))
		{
			$tree = array(
				'path' => $path,
				'hash' => crc32($path),
				'dirs' => array()
				);
			if (false!=($list = elFS::ls($path, EL_FS_ONLY_DIRS)))
			{
				
				foreach (elFS::ls($path, EL_FS_ONLY_DIRS) as $dirName)
				{
					$dir = $path.DIRECTORY_SEPARATOR.$dirName;
					if ($acl && $role) 
					{
						if ($acl->isAllowed($role, $dir)) {
							$tree['dirs'][$dirName] = elFS::tree($dir, $acl, $role);
						}
					}
					elseif (isset($perms[$dir])) 
					{
						if (isset($perms[$dir]['read']) && $perms[$dir]['read']) 
						{
							$tree['dirs'][$dirName] = elFS::tree($dir, null, '', $perms, $default);
						}
					}
					elseif ($default) 
					{
						$tree['dirs'][$dirName] = elFS::tree($dir, null, '', $perms, $default);
					}
				}
				
			}
			return $tree;
		}
	}

	/**
	 * Возвращает список всех всех вложенных директорий
	 *
	 * @param  string  $dir  имя директории
	 * @return array
	 **/
	function tree2list($dir)
	{
		$dir    = realpath($dir);
		if ($dir)
		{
			$result = array($dir);
			if (false!=($list = elFS::ls($dir, EL_FS_ONLY_DIRS)))
			{
				foreach ($list as $_dir)
				{
					$result = array_merge($result, elFS::tree2list($dir.DIRECTORY_SEPARATOR.$_dir));
				}
				
			}
			return $result;
		} 
	}

	/**
	 * последовательно создает дерево директории по указаному пути
	 *
	 * @param  string  $file  путь
	 * @param  int     $umask umask
	 * @return bool
	 **/
	function mkdir($dir, $mode=null)
	{
		if ( !is_dir($dir) )
		{
			$parts = explode(DIRECTORY_SEPARATOR, $dir); 
			$path  = $parts[0].DIRECTORY_SEPARATOR;
			$mode = $mode ? $mode : EL_FS_DIRMODE;
			for ($i=1, $s = sizeof($parts); $i < $s; $i++) 
			{ 
				if ( '' != $parts[$i] )
				{
					$path .= $parts[$i]; 
					if ( !is_dir($path) )
					{
						
						if (!@mkdir($path, $mode))
						{
							trigger_error(sprintf('Unable to create directory %s', $path));
							return false;
						}
						chmod($path, $mode);
					}
					$path .= DIRECTORY_SEPARATOR;
				}
			}
		}
		return true;
	}
	
	/**
	 * Удаление файла или рекурсивное удаление директории
	 *
	 * @param  string  $path  путь к файлу или директории
	 * @return bool
	 **/
	function rm($path)
	{
		$path = realpath($path);
		if (!file_exists($path))
		{
			return false;
		}
		return is_dir($path) ? elFS::rmdir($path) : @unlink($path);
	}
	
	/**
	 * рекурсивно удаляет директорию со всеми вложеными директориями и файлами
	 *
	 * @param  string  $file  имя директории
	 * @return bool
	 **/
	function rmdir($dir)
	{
		$dir = realpath($dir); 
		if ($dir && is_dir($dir))
		{
			if (false != ($list = elFS::ls($dir, 0, false)))
			{
				for ($i=0, $s=sizeof($list); $i < $s; $i++) 
				{ 
					$path = $dir.DIRECTORY_SEPARATOR.$list[$i]; 
					if (is_dir($path))
					{
						if (!elFS::rmdir($path))
						{
							return false;
						}
					}
					elseif (!@unlink($path))
					{
						return false;
					}
				}
			}
			return @rmdir($dir);
		}
	}
	
	/**
	 * копирует файл или рекурсивно копирует директорию
	 * При копировании файла - $target может быть именем файла-приемника или существующей директории
	 * При копировании директорий если $target не существует, она будет создана
	 *
	 * @param  string  $source  имя источника
	 * @param  string  $target  имя целевой директории или файла
	 * @param  int     $mode    mode создаваемых директорий
	 * @return bool
	 **/
	function copy($source, $target, $mode=null)
	{
		$_source = realpath($source);
		$mode = $mode ? $mode : EL_FS_DIRMODE;
		if (!$_source) 
		{
			return elFS::_error('File %s does not exists', $source);
		}
		
		if ( is_dir($_source) )
		{
			//  target может быть только директорией
			$_target = realpath($target); 
			if ( $_target && !is_dir($_target) )
			{
				trigger_error(sprintf('%s is not directory', $target), E_USER_WARNING);
				return false;
			}
			elseif (!$_target)
			{
				if (!elFS::mkdir($target, $mode))
				{
					trigger_error(sprintf('Unable to create directory %s', $target), E_USER_WARNING);
					return false;
				}
				$_target = realpath($target);
			}
			if (0 === strpos($_target, $_source))
			{
				trigger_error(sprintf('Unable to copy directory %s into heself or into nested directory', $source), E_USER_WARNING);
				return false;
			}
			$_target .= DIRECTORY_SEPARATOR.basename($_source); 
			if (!is_dir($_target) && !@mkdir($_target, $mode))
			{
				trigger_error(sprintf('Unable to create directory %s', $_target), E_USER_WARNING);
				return false;
			}
			$list = elFS::ls($_source);
			for ($i=0, $s=sizeof($list); $i < $s; $i++) 
			{ 
				if ( !elFS::copy($_source.DIRECTORY_SEPARATOR.$list[$i], $_target) )
				{
					trigger_error(sprintf('Unable to copy %s to %s', array($_source.DIRECTORY_SEPARATOR.$list[$i], $_target)), E_USER_WARNING);
					return false;
				}
			}
			return true;
		}
		else
		{
			//  target может быть директорией или именем файла
			$target = is_dir($target) ? realpath($target).DIRECTORY_SEPARATOR.basename($_source) : $target;
			if ( dirname($_source) == realpath(dirname($target)) && basename($_source) == basename($target))
			{
				trigger_error(sprintf('Unable to copy file %s into himself', $source), E_USER_WARNING);
				return false;
			}
			if (file_exists($target) && !is_writable($target))
			{
				trigger_error(sprintf('File %s has no write permissions', $target), E_USER_WARNING);
				return false;
			}
			return copy($source, $target);
		}
	}
	
	/**
	 * перемещает файл или директорию
	 *
	 * @param  string  $source  имя источника
	 * @param  string  $target  имя приемника
	 * @return bool
	 **/
	function move($source, $target, $mode=null)
	{
		return elFS::copy($source, $target, $mode) && elFS::rm($source);
	}
	
} // END class


/**
 * Статический класс для получения инф о файле (mimetype и пр).
 * При неправильных настройках php | apache получение mimetype файла оказывается затруднительно:
 * функция mime_content_type() доступна не всегда (MAMPRO на Mac :) ), 
 * не указан mime_magic.magicfile в php.ini или
 * finfo_open()  не находит magic_file и пр.
 * Поэтому, при первом обращении класс  пытается найти наилучший доступный метод получения content type 
 * (finfo, mime_content_type(), системная утилита file)
 * если они недоступны - кое-как определяет content type по расширению файла. :)
 * Замечание: для некоторых типов файлов finfo и mime_content_type отдают не такой mimetype, как системная утилита file
 * например для php - text/x-php и text/x-c++
 *
 * @package    el.lib
 * @subpackage filesistem
 * @author     Dmitry Levashov dio@eldorado-cms.ru
 **/
class elFileInfo
{
	/**
	 * возвращает mime type файла или unknown если не может определить
	 *
	 * @param  string  $file  имя файла
	 * @param  bool    $onlyMime  вернуть только  mime type
	 * @return string
	 **/
	function mimetype($file, $onlyMime=true)
	{
		/**
		 * массив расширений файлов/mime types для _method = 'internal' (когда недоступны все прочие методы)
		 *
		 * @var array
		 **/
		$_mimeTypes = array(
			'txt'  => 'plain/text',
		    'php'  => 'text/x-php',
		    'html' => 'text/html',
		 	'js'   => 'text/javascript',
			'css'  => 'text/css',
		    'rtf'  => 'text/rtf',
		    'xml'  => 'text/xml',
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
			
		if (!defined('EL_FINFO_METHOD')) {
			elFileInfo::configure();
		}

		if ( !file_exists($file) )
		{
			trigger_error( sprintf('File %s does not exists', $file), E_USER_WARNING);
			return false;
		}
		if (is_dir($file))
		{
			return 'directory';
		}
		if (!is_readable($file))
		{
			trigger_error( sprintf('File %s is not readable', $file), E_USER_WARNING);
			return false;
		}
		switch (EL_FINFO_METHOD)
		{
			case 'finfo':
				$finfo = finfo_open(FILEINFO_MIME);
				$type = finfo_file($finfo, $file);
				break;
			case 'php':   
			 	$type = mime_content_type($file);
				break;
			case 'linux':  
				$type = exec('file -ib '.escapeshellarg($file));
				break;
			case 'bsd':   
				$type = exec('file -Ib '.escapeshellarg($file));
				break;
			default:
				$ext  = false !== ($p = strrpos($file, '.')) ? substr($file, $p+1) : '';
				$type = isset($_mimeTypes[$ext]) ? $_mimeTypes[$ext] : 'unknown';
		}
		if ($onlyMime && false!=($p=strpos($type, ';')))
		{
			$type = substr($type, 0, $p);
		}
		return $type;
	}
	
	/**
	 * undocumented function
	 *
	 * @return void
	 * @author dio
	 **/
	function isWebImage($file)
	{
		$mime = elFileInfo::mimetype($file);
		return $mime == 'image/jpeg' || $mime == 'image/gif' || $mime == 'image/png' ? getimagesize($file) : false;
	}
	
	/**
	 * Возвращает инф о файле или директории
	 * 
	 * @param  string  $file  имя файла
	 * @return array
	 **/
	function info($file)
	{
		clearstatcache();
		if (!file_exists($file))
		{
			return false;
		}
		$path = realpath($file);
		$stat = stat($path);
		$info = array(
			'basename' => basename($file),
			'path'     => $path,
			'hash'     => crc32($path),
			'atime'    => $stat['atime'],
			'mtime'    => $stat['mtime'],
			'ctime'    => $stat['ctime'],
			'read'     => is_readable($file),
			'write'    => is_writable($file),
			'uid'      => $stat['uid'],
			'gid'      => $stat['gid'],
			'mode'     => $stat['mode'],
			'size'     => $stat['size'],
			'mimetype' => 'unknown',
			'hsize'    => '-'
			);
			
		if (is_dir($file))
		{
			$info['mimetype'] = 'directory';
		}
		elseif (is_file($file) && $info['read'])
		{
			$mimetype = elFileInfo::mimetype($file, false);
			$charset  = 'binary';
			if (false!=($p=strpos($mimetype, ';')))
			{
				if (preg_match('/charset=([^\s]+)/', $mimetype, $m))
				{
					$charset = $m[1];
				}
				$mimetype = substr($mimetype, 0, $p);
			}
			$info['mimetype'] = $mimetype;
			$info['charset']  = $charset;    
			$info['hsize']    = elFileInfo::formatSize($info['size']);
		}
		return $info;
	}
	
	/**
	 * Возвращает размер файла в читабельном виде (1 Mb)
	 *
	 * @param  int   $size  размер файла
	 * @return string
	 **/
	function formatSize($size)
	{
        $n    = 1;
		$unit = '';
		if ($size > 1073741824)
		{
			$n    = 1073741824;
			$unit = 'Gb';
		}
        elseif ( $size > 1048576 )
        {
            $n    = 1048576;
            $unit = 'Mb';
        }
        elseif ( $size > 1024 )
        {
            $n    = 1024;
            $unit = 'Kb';
        }
        return intval($size/$n).' '.$unit;
	}
	
	/**
	 * начальная настройка класса 
	 *
	 * @return void
	 **/
	function configure()
	{
		if (!defined('EL_FINFO_METHOD')) {

			if (class_exists('finfo')) {
				return define('EL_FINFO_METHOD', 'finfo');
			}

			if ( function_exists('mime_content_type') && mime_content_type(__FILE__) == 'text/x-php' )
			{
				return define('EL_FINFO_METHOD', 'php');
			}
			
			$type = exec('file -ib '.escapeshellarg(__FILE__)); 
			if (0 === strpos($type, 'text/x-php') || 0 === strpos($type, 'text/x-c++'))
			{
				return define('EL_FINFO_METHOD', 'linux');
			}
			
			$type = exec('file -Ib '.escapeshellarg(__FILE__));
			if (0 === strpos($type, 'text/x-php') || 0 === strpos($type, 'text/x-c++'))
			{
				return define('EL_FINFO_METHOD', 'bsd');
			}
			define('EL_FINFO_METHOD', 'internal');
		}
	}

} // END class

/**
 * php - json encoder
 * based on Services_JSON by Michal Migurski <mike-json@teczno.com> , 
 * Matt Knapp <mdknapp[at]gmail[dot]com> and 
 * Brett Stimmerman <brettstimmerman[at]gmail[dot]com>
 *
 * @package el.lib
 * @author dio@eldorado-cms.ru
 **/
class elJSON
{
	function encode($var, $j=false)
	{
		if ($j && function_exists('json_encode'))
		{
			return json_encode($var);
		}
		
		switch (gettype($var)) {
            case 'boolean':
                return $var ? 'true' : 'false';

            case 'NULL':
                return 'null';

            case 'integer':
                return (int) $var;

            case 'double':
            case 'float':
                return (float) $var;

            case 'string':
				if ( preg_match('/^function\s*\([^\)]*\)\s*{.+};*$/i', trim($var)) )
				{
					return $var;
				}
				$ascii = '';
                for ($c = 0, $s=strlen($var); $c < $s; ++$c) {

                    $ord_var_c = ord($var{$c});

                    switch (true) {
                        case $ord_var_c == 0x08:
                            $ascii .= '\b';
                            break;
                        case $ord_var_c == 0x09:
                            $ascii .= '\t';
                            break;
                        case $ord_var_c == 0x0A:
                            $ascii .= '\n';
                            break;
                        case $ord_var_c == 0x0C:
                            $ascii .= '\f';
                            break;
                        case $ord_var_c == 0x0D:
                            $ascii .= '\r';
                            break;

                        case $ord_var_c == 0x22:
                        case $ord_var_c == 0x2F:
                        case $ord_var_c == 0x5C:
                            // double quote, slash, slosh
                            $ascii .= '\\'.$var{$c};
                            break;

                        case (($ord_var_c >= 0x20) && ($ord_var_c <= 0x7F)):
                            $ascii .= $var{$c};
                            break;

                        case (($ord_var_c & 0xE0) == 0xC0):
                            $char = pack('C*', $ord_var_c, ord($var{$c + 1}));
                            $c += 1;
                            $ascii .= sprintf('\u%04s', bin2hex( elJSON::utf82utf16($char) ));
                            break;

                        case (($ord_var_c & 0xF0) == 0xE0):
                            $char = pack('C*', $ord_var_c, ord($var{$c + 1}), ord($var{$c + 2}));
                            $c += 2;
                            $ascii .= sprintf('\u%04s', bin2hex( elJSON::utf82utf16($char) ));
                            break;

                        case (($ord_var_c & 0xF8) == 0xF0):
                            $char = pack('C*', $ord_var_c, ord($var{$c + 1}), ord($var{$c + 2}), ord($var{$c + 3}));
                            $c += 3;
                            $ascii .= sprintf('\u%04s', bin2hex( elJSON::utf82utf16($char) ));
                            break;

                        case (($ord_var_c & 0xFC) == 0xF8):
                            $char = pack('C*', $ord_var_c, ord($var{$c + 1}), ord($var{$c + 2}), ord($var{$c + 3}), ord($var{$c + 4}));
                            $c += 4;
                            $ascii .= sprintf('\u%04s', bin2hex( elJSON::utf82utf16($char) ));
                            break;

                        case (($ord_var_c & 0xFE) == 0xFC):
                            $char = pack('C*', $ord_var_c, ord($var{$c + 1}), ord($var{$c + 2}), ord($var{$c + 3}), ord($var{$c + 4}), ord($var{$c + 5}));
                            $c += 5;
                            $ascii .= sprintf('\u%04s', bin2hex( elJSON::utf82utf16($char) ));
                            break;
                    }
                }

                return '"'.$ascii.'"';

            case 'array':
                // асоциативный массив
                if (is_array($var) && count($var) && (array_keys($var) !== range(0, sizeof($var) - 1))) 
				{
                    return '{' . implode(',', array_map( array('elJSON', 'pair'), array_keys($var), array_values($var) )) . '}';
                }
                // обычный массив
                return '[' . implode(',', array_map( array('elJSON', 'encode'), $var)) . ']';

            case 'object':
                $vars = get_object_vars($var);
				return '{' . implode(',', array_map( array('elJSON', 'pair'), array_keys($vars), array_values($vars) )) . '}';

            default:
                return 'null';

        }
	}
	
	/**
    * возвращает фаорматированую в json пару ключ : значение
    *
    * @param    string  $name   ключ
    * @param    mixed   $value  значение
    *
    * @return   string  
    * @access   private
    */
    function pair($name, $value)
    {
		return elJSON::encode(strval($name)).':'.elJSON::encode($value);
    }
	
   /**
    * преобразует символ UTF-8 в символ UTF-16
    *
    * @param    string  $utf8   UTF-8 character
    * @return   string  UTF-16 character
    * @access   private
    */
    function utf82utf16($utf8)
    {
        if (function_exists('mb_convert_encoding')) 
		{
            return mb_convert_encoding($utf8, 'UTF-16', 'UTF-8');
        }

        switch(strlen($utf8)) {
            case 1:
                return $utf8;
            case 2:
                return chr(0x07 & (ord($utf8{0}) >> 2)).chr((0xC0 & (ord($utf8{0}) << 6)) | (0x3F & ord($utf8{1})));
            case 3:
                return chr((0xF0 & (ord($utf8{0}) << 4)) | (0x0F & (ord($utf8{1}) >> 2))).chr((0xC0 & (ord($utf8{1}) << 6)) | (0x7F & ord($utf8{2})));
        }
        return '';
    }
	
} // END class


/**
 *  Template engine.
 */
class elTE
{
	/**
   * array of templates dirs
   * @var array
   */
	var $dir        = 'style/';
	/**
   * array of template file names
   * @var array
   */
	var $files       = array();
	/**
   * array of blocks (objects)
   * @var array
   */
	var $blocks      = array();

	var $fileBlocks  = array();
	/**
   * array of templates content
   * @var array
   */
	var $tplData     = array();
	/**
   * array of assigned vars names
   * @var array
   */
	var $vars        = array('name'=>array(), 'value'=>array());

	var $replaceFrom = array();
	var $replaceTo   = array();


	// ******************  PUBLIC METHODS  ************************* //
	/**
   * Add template file.
   *
   * Can add one file or array of files.
   * @param mixed   $handle  template handler or array(handle=>file)
   * @param string  $file    filename
   */
	function setFile($handle, $file, $whiteSpace=false)
	{
		if ( empty($handle) || empty($file) )
		{
			return false;
		}

		if ( empty($this->files[$handle]) )
		{
			if ('/' != $file{0})
			{
				$file = realpath($this->dir.$file);
			}
			if ( !is_readable($file) )
			{
				return false;
			}

			$this->files[$handle]   = $file;
			$this->tplData[$handle] = trim( file_get_contents($file));
			if (!$whiteSpace)
			{
				$this->tplData[$handle] = str_replace(array("\n\n", "\t"),	array("\n", ''), $this->tplData[$handle] );
			}
			
			$this->_cutBlocks($handle, $whiteSpace);
		}
		return true;
	}



	/**
   * Variable assignment.
   *
   * @param mixed   $var  variable name or array of variables
   * @param string  $val  variable value
   * @param bool    $append append new value to var value
   */
	function assignVars($var, $val='', $append=false, $as_tpl=false)
	{
		if (!is_array($var))
		{
			if ( $as_tpl )
			{
				$val = str_replace( $this->vars['name'], $this->vars['value'], $val);
			}
			$this->vars['name'][$var] = '{'.$var.'}';


			if ( !$append || !isset($this->vars['value'][$var]) )
			{
				$this->vars['value'][$var] = $val;
			}
			else
			{
				$this->vars['value'][$var] .= $val;
			}
		}
		else
		{
			foreach ($var as $name=>$val)
			{
				if ( $as_tpl )
				{
					$val = str_replace( $this->vars['name'], $this->vars['value'], $val);
				}
				$this->vars['name'][$name] = '{'.$name.'}';

				if ( !$append || !isset($this->vars['value'][$name]) )
				{
					$this->vars['value'][$name] = $val;
				}
				else
				{
					$this->vars['value'][$name] .= $val;
				}
			}
		}
	}


	/**
   * Assign variables for block.
   *
   * Param path contain path to nested block in format "PARENT.CHILD1.CHILD2" or top-level block name.
   * Level - level of nested blocks.
   * This param tells all blocks with level >= $level to create new iteration.
   * So you can set variables for one block iteration several times.
   * Top-level block has level = 1.
   *
   * @param string  $path path to block
   * @param array   $vars variables
   * @param int   $level  level
   */
	function assignBlockVars($path, $vars=null, $level=0)
	{
		$block = (($pos = strpos($path, '.')) !== false) ? substr($path, 0, $pos) : $path;

		if ( !isset($this->blocks[$block]) )
		{
			return trigger_error('elTE::assignBlockVars: Block '.$block.' does not exists', E_USER_WARNING);
		}
		$this->_blockUse[$path] = 1;
		$this->blocks[$block]->assignVars($path, $vars, $level);
	}


	function parse($handle, $target = null, $append=false, $glob=false, $clean=false)
	{
		if ( empty($this->tplData[$handle]) )
		{
			return trigger_error('elTE::parse: no template '.$handle.' to parse', E_USER_WARNING);
		}

		if ( isset($this->fileBlocks[$handle]) )
		{
			foreach ($this->fileBlocks[$handle] as $block)
			{
				$this->tplData[$handle] = str_replace('{BLOCK.'.$block.'}', $this->blocks[$block]->parse(), $this->tplData[$handle]);
			}
		}
		$this->tplData[$handle] = str_replace($this->vars['name'], $this->vars['value'], $this->tplData[$handle]);
		if ( $glob && $this->replaceFrom )
		{
			$this->tplData[$handle] = $this->globReplace( $this->tplData[$handle] );
		}
		$this->assignVars($target ? $target : $handle, $this->tplData[$handle], $append);

		if ($clean)
		{
			if (isset($this->files[$handle]))
			{
				unset($this->files[$handle], $this->tplData[$handle]);
			}
			if (isset($this->fileBlocks[$handle]))
			{
				unset($this->fileBlocks[$handle]);
			}
		}
	}


	function globReplace( $str )
	{
		return preg_replace($this->replaceFrom, $this->replaceTo, $str);
	}

	function dropUndefined( $str )
	{
		return preg_replace( '/{([a-z0-9_\.]+)}/i', '', $str );
	}


	function getVar($handle, $glob=false)
	{
		$str = isset($this->vars['value'][$handle]) ? $this->vars['value'][$handle] : '';

		if ( $glob )
		{
			$this->vars['value'][$handle] = $this->globReplace($this->vars['value'][$handle]);
		}
		return $str;
	}


	// ====================  PRIVATE METHODS  ===================== //


	/**
   * Scan template content for dinamic blocks.
   *
   * Block defines as "<!-- BEGIN block_name --> here {block} content <!-- END block_name -->".
   * If any one found, for each top-level block create object Block and give him his content.
   * Block scan his content for nested blocks and create childs objects
   * for each his top-level block, and so on so on...
   * @param string  $handle template handler
   */
	function _cutBlocks($handle, $whiteSpace=false)
	{
		$reg = '/<!--\s+BEGIN\s+([a-z0-9_]+)\s+-->\s*(.*)\s*<!--\s+END\s+(\\1)\s+-->/smi';
		if (preg_match_all($reg, $this->tplData[$handle], $m))
		{
			for ($i=0, $s=sizeof($m[1]); $i < $s; $i++)
			{
				$this->fileBlocks[$handle][] = $m[1][$i]; // bind block name to file handler
				$this->blocks[$m[1][$i]]     = new elTEBlock($m[1][$i], !$whiteSpace ? trim($m[2][$i]) : $m[2][$i]  );
				$this->tplData[$handle]      = str_replace($m[0][$i], '{BLOCK.'.$m[1][$i].'}', $this->tplData[$handle]);
			}
		}
	}

}

//////////////////////////////////////////////////////////////////

/**
 * Auxiliary class for elTE for dinamic block manipulations.
 * Dont use it directly.
 * @access  privare
 */

class elTEBlock
{
	/**
   * Block name
   * @var string
   */
	var $name = '';
	/**
   * Block content.
   * @var string
   */
	var $content = '';
	/**
   * Array of nested top-levels blocks
   * @var array
   */
	var $childs = array();
	/**
   * Block variables array.
   * Var[key][inum] = array('vars'=>array(), 'vals'=>array())
   * key - key of parents iteration.
   * inum - number of iteration in current parent iteration
   * vars - array of variables names
   * vals - array of variable values
   * @var array
   */
	var $vars = array();

	/**
   * Class contructor.
   * Search content for nested blocks and create childs object for each top-level block.
   * Конструктор. Устанавливает имя блока и контент.
   *
   * @param string  $name block name
   * @param string  $cont block content
   */
	function elTEBlock($name, $cont)
	{
		$this->name    = $name;
		$this->content = $cont;

		$reg = '/<!--\s+BEGIN\s+([a-z0-9_]+)\s+-->\s*(.*)\s*<!--\s+END\s+(\\1)\s+-->/smi';
		if (preg_match_all($reg, $this->content, $m))
		{
			for ($i=0, $s=sizeof($m[1]); $i < $s; $i++)
			{
				$this->childs[$m[1][$i]] = new elTEBlock($m[1][$i], $m[2][$i]);
				$this->content = str_replace($m[0][$i], '{BLOCK.'.$m[1][$i].'}', $this->content);
			}
		}
	}

	function isBlockExists($block)
	{
		if ( isset($this->childs[$block]) )
		{
			return true;
		}
		foreach ($this->childs as $k=>$b)
		{
			if ( $b->isBlockExists($block) )
			{
				return true;
			}
		}
		return false;
	}

	/**
	 * Find nested block by name and return full name (path)
	 * for example - findBlock('SOME_BLOCK') may return 'PARENT_BLOCK.SOME_BLOCK'
	 *
	 * @param  string $block  nested block name
	 * @return string         full nested block name
	 */
	function findBlock($block)
	{
		if ( !empty($this->childs[$block]) )
		{
			return $this->name.'.'.$block;
		}
		foreach ($this->childs as $k=>$b)
		{
			if ( false != ($found = $b->findBlock($block) ))
			{
				return $this->name.'.'.$found;
			}
		}
		return false;
	}

	/**
   * Set block variables.
   * If variables addressed to this block - set its.
   * Otherwise pass data to child block.
   * While passed data to child, decrease level by 1
   * and add to parent key number of his iteration.
   *
   * @param string  $name block name or path to block
   * @param array   $data block variables
   * @param int   $level  on wich level create new iteration
   * @param string  $key  parent iteration key
   */
	function assignVars($name, $data, $new_ilevel=0, $parent_key='0')
	{
		// Iteration number 'inside' parent iteration
		// level <= 0 means this block must create new iteration
		// level > 0 - data should be addded to previous iteration,
		// if there is no previous iteration - create it
		if (0 == $new_ilevel || !isset($this->vars[$parent_key]) )
		{
			$this->vars[$parent_key][] = array();
		}

		$inum = sizeof($this->vars[$parent_key])-1;

		if ($name == $this->name)
		{ // data addressed to this block
			if (is_array($data))
			{
				foreach ($data as $var=>$val)
				{
					$this->vars[$parent_key][$inum]['vars'][$var] = '{'.$var.'}';
					$this->vars[$parent_key][$inum]['vals'][$var] = $val;
				}
			}
			return;
		}
		// data addressed to child block
		$name = explode('.', $name);
		unset($name[0]); // delete this block name from path

		if (!$this->childs[$name[1]])
		{ // child block not exists - show warning
			return trigger_error('elTEBlock['.$this->name.']::assignVars(): Child block '.$name[1].' was not found', E_USER_WARNING);
		}
		// pass data to child
		$this->childs[$name[1]]->assignVars(implode('.', $name), $data, $new_ilevel-1, $parent_key.'_'.$inum);
	}

    /**
   * Parse content and return it.
   *
   * Replace childs blocks declarations to childs parsed content
   *
   * @param string  $key parent iteration key
   * @return  string
   */
	function parse($key='0')
	{
		$res = '';
		if (isset($this->vars[$key]))
		{
			foreach ($this->vars[$key] as $i=>$vars)
			{
				$str = !empty($vars) ? str_replace($vars['vars'], $vars['vals'], $this->content) : $this->content;
				foreach ($this->childs as $name=>$child)
				{
					$str = str_replace('{BLOCK.'.$name.'}', $this->childs[$name]->parse($key .'_'.$i), $str);
				}
				$res .= $str;
			}
		}
		return $res;
	}
}

class elTranslator
{
	var $_msgs = array();
	
	function loadMessages($lang, $file, $varName)
	{
		if (!isset($this->_msgs[$lang]))
		{
			$this->_msgs[$lang] = array();
		}
		
		// isset($GLOBALS[$varName]) && 
		if (include_once $file)
		{
			if (isset($$varName) && is_array($$varName))
			{
				$this->_msgs[$lang] = array_merge($this->_msgs[$lang], $$varName);
			}
			unset($$varName);
		}
		// print_r($this->_msgs);
	}
	
	function translate($lang, $msg)
	{
		return !empty($this->_msgs[$lang][$msg]) ? $this->_msgs[$lang][$msg] : $msg;
	}
	

}


?>