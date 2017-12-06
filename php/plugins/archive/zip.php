<?php

//request data
//$zip_path='';//zip file path

if (isset($_GET["zip"])) {
	$zip_path=$_GET["zip"];
}
else {
	echo 'Zip Path Not Given';
	die();
};
$pass='123';//user password. Its can only use for extract ZipCrypto Encryption zip
//'get','rename','delete','open','create','add', 'extract'

if (isset($_GET["index"])) {
	$index=$_GET["index"];
}
else {
	$index='null';
};
if (isset($_GET["path"])) {
	$path=$_GET["path"];
}
else {
	$path='.';
};

if (isset($_GET["cmd"])) {
	$cmd=$_GET["cmd"];
}
else {
	$cmd='get';
};
 //calling indexs as array(as 'index' => 'selected index file or folder path including name that selected') if it not defineded index leave it as 'null'. also if You reffering folder path, You must end path using '/' 
$c_dir_path='.trash/159/';//path to create folder includng that wanted to create folder's name
$a_files_path = array('New folder/'=>'C:/wamp64/www/files/New folder/');//give you wanted to add files or folders path list to zip (as path inside zip => real path to file)
$rname='Newfolder';//as ('New Name'). Folder rename immposible directly. so I implemented diffeent method. 
$extractpath='C:/wamp64/www/files/extract/';

$zip = new ZipArchive;

if($zip->open($zip_path) == 'TRUE') {

	$zip->setPassword($pass);


	
	function ZipAddFileFolders($zip_p,$file_p,$real_p) {// this is not compleated
			$zip_p->add($real_p,$file_p);
	};
	
	function ZipExtract($zip_p,$indx,$path,$extpath) {
		$od=pathinfo($path,PATHINFO_DIRNAME);
		if ($indx=='all') {
			if($zip_p->extractTo($extpath)) {
				return('ok_extract');
			}
			else {
				return('fail_extract');
			};
		};

		if (pathinfo($path,PATHINFO_DIRNAME) != '.') {
			$op =$extpath.preg_replace('|'.$od.'/'.'|', '', $path, 1);
		};

		if(substr($path, -1) == '/') {
			for ($i=0; isset($zip_p->statIndex($i)['name']); $i++) {
				if (strpos(($zip_p->statIndex($i)['name']),$path) === 0) {
					$zip_p->extractTo($extpath,$zip_p->statIndex($i)['name']);
				};
			};
		}
		else {
			if(!is_numeric($indx)) {
				return('invalid_index');
			};
			$zip_p->extractTo($extpath,$zip_p->statIndex($indx)['name']);
		};
	};
	
	function ZipOpenFile($zip_p,$indx) {
		
		if (!is_numeric($indx)) {
			return('invalid_index');
		};
		if(substr(($zip_p->statIndex($indx)['name']), -1) == '/') {
			return('fail_open_not_file');
		};
		$contents='';
		$fp = $zip_p->getStream($zip_p->statIndex($indx)['name']);
		if(!$fp) {
			return('fail_open_corrupted_encrypted');
		};
		while (!feof($fp)) {
			$contents .= fread($fp, 2);
		};
		fclose($fp);
		file_put_contents('t',$contents);
		$file_mime=pathinfo(($zip_p->statIndex($indx)['name']),PATHINFO_EXTENSION);
		$file_name=pathinfo(($zip_p->statIndex($indx)['name']),PATHINFO_BASENAME);
		$mime_types = array(
			'txt' => 'text/plain',
			'htm' => 'text/html',
			'html' => 'text/html',
			'php' => 'text/html',
			'css' => 'text/css',
			'js' => 'application/javascript',
			'json' => 'application/json',
			'xml' => 'application/xml',
			'swf' => 'application/x-shockwave-flash',
			'flv' => 'video/x-flv',
			// images
			'png' => 'image/png',
			'jpe' => 'image/jpeg',
			'jpeg' => 'image/jpeg',
			'jpg' => 'image/jpeg',
			'gif' => 'image/gif',
			'bmp' => 'image/bmp',
			'ico' => 'image/vnd.microsoft.icon',
			'tiff' => 'image/tiff',
			'tif' => 'image/tiff',
			'svg' => 'image/svg+xml',
			'svgz' => 'image/svg+xml',
			// archives
			'zip' => 'application/zip',
			'rar' => 'application/x-rar-compressed',
			'exe' => 'application/x-msdownload',
			'msi' => 'application/x-msdownload',
			'cab' => 'application/vnd.ms-cab-compressed',
			// audio/video
			'mp3' => 'audio/mpeg',
			'qt' => 'video/quicktime',
			'mov' => 'video/quicktime',
			// adobe
			'pdf' => 'application/pdf',
			'psd' => 'image/vnd.adobe.photoshop',
			'ai' => 'application/postscript',
			'eps' => 'application/postscript',
			'ps' => 'application/postscript',
			// ms office
			'doc' => 'application/msword',
			'rtf' => 'application/rtf',
			'xls' => 'application/vnd.ms-excel',
			'ppt' => 'application/vnd.ms-powerpoint',
			// open office
			'odt' => 'application/vnd.oasis.opendocument.text',
			'ods' => 'application/vnd.oasis.opendocument.spreadsheet',
		);
		if (array_key_exists((strtolower($file_mime)), $mime_types)) {
			$mime=$mime_types[(strtolower($file_mime))];
		}
		else {
			$mime= 'application/octet-stream';
		};
		header('Content-type: '.$mime);
		header('Content-Disposition: attachment; filename='.$file_name);
		return ($contents);
	};
	
	function ZipDeleteFileFolder($zip_p,$indx,$path) {//delete file or folder using ZipDeleteFileFolder('Zip array','File/Folder index','File/Folder path including name that wanted to delete')
		$index_list=array();
		$od=pathinfo($path,PATHINFO_DIRNAME);
		$cnt=0;
		$ck=0;

		if(substr($path, -1) == '/') {
			
			for ($i=0; isset($zip_p->statIndex($i)['name']); $i++) {
				if ($od != '.') {
					if (strpos(($zip_p->statIndex($i)['name']),$od.'/') === 0) {
						$ck = $ck + 1;
					};
				};
				if (strpos(($zip_p->statIndex($i)['name']),$path) === 0) {
					$index_list[]= $i;
				};
			};
			for ($i=0; isset($index_list[$i]); $i++){
				if ($zip_p->deleteIndex($index_list[$i])) {
					$cnt = $cnt + 1;
				};
			};
			if (isset($ck)) {
				if($ck != count($index_list)) {
					if ($od != '.') {
						$zip_p->addEmptyDir($od.'/');
					};
				};
			};
			if($cnt == count($index_list)) {
				return('ok_delete');
			}
			else {
				if($cnt != 0){
					return('ok_fail_delete');
				}
				return('fail_delete');
			};
		}
		else {
			if(!is_numeric($indx)) {
				return('invalid_index');
			};
			if ($zip_p->deleteIndex($indx)) {
				if ($od != '.') {
					$zip_p->addEmptyDir($od.'/');
				};
				return('ok_delete');
			}
			else {
				return('fail_delete');
			};
		};
	};
	
	function ZipRenameFile($zip_p,$indx,$oldpath,$newname) {//rename using Ziprenamefile('Zip array,'File index', 'oldpath', 'New File Name')

		$index_list=array();
		$op='';
		$cnt=0;
		$onout='';
		$od=pathinfo($oldpath,PATHINFO_DIRNAME);

		if(substr($oldpath, -1) == '/') {
			for ($i=0; isset($zip_p->statIndex($i)['name']); $i++) {
				if ($od == '.') {
					if(strpos(($zip_p->statIndex($i)['name']),$newname.'/') === 0) {
						return ('already_exsist_folder');
					};
				}
				else {
					if(strpos(($zip_p->statIndex($i)['name']),$od.'/'.$newname.'/') === 0) {
						return ('already_exsist_folder');
					};
				};
				if (strpos(($zip_p->statIndex($i)['name']),$oldpath) === 0) {
					$index_list[]=$i;
				};
			};
			for ($i=0; isset($index_list[$i]); $i++) {
				$op=($zip_p->statIndex($index_list[$i])['name']);
				if (substr($op, -1) == '/'){
					if ($od == '.') {
						$op =preg_replace('|'.$oldpath.'|', $newname.'/', $op, 1);
					}
					else {
						$op = preg_replace('|'.$oldpath.'|', $od.'/'.$newname.'/', $op, 1);
					};
					if ($zip_p->renameIndex($index_list[$i],$op)) {
						$cnt=$cnt+1;
					};
				}
				else {
					if ($od == '.') {
						$op = preg_replace('|'.$oldpath.'|', $newname.'/', $op, 1);
					}
					else {
						$op = preg_replace('|'.$oldpath.'|', $od.'/'.$newname.'/', $op, 1);
					};
					if($zip_p->renameIndex($index_list[$i],$op) == True) {
						$cnt=$cnt+1;
					};
				};
			};
			if ($cnt==count($index_list)) {
				return('ok_rename');
			}
			else {
				if ($cnt != 0) {
					return('ok_fail_rename');
				};
				return('fail_rename');
			};
		}
		else {
			if(!is_numeric($indx)) {
				return('invalid_index');
			};
			if($od == '.'){
				$onout='';
			}
			else {
				$onout=$od.'/';
			};
			if($zip_p->renameIndex($indx,$onout.$newname) == True) {
				return('ok_rename');
			}
			else {
				return('already_exsist_file');
			};
		};
	};

	function ZipCreateDir($zip_p,$dir_path) {//Create dir inside zip using ZipCreateDir('Zip array','Folder Path')

		if($zip_p->addEmptyDir($dir_path)) {
			return('c_dir_ok');
		}
		else {
			return ('c_dir_fail');
		};
	};
	
	function ZipGetList($zip_p,$pathinzip,$zip) {
			$dir_list=array();
			$file_list=array();
			$file_index=array();
		for ($i=0; isset($zip_p->statIndex($i)['name']); $i++) {
	
			if ($pathinzip=='.') {
				$path=preg_replace('|/|', '/|', $zip_p->statIndex($i)['name']);
				$dirs=explode('|', $path);
				$dirs=$dirs[0];
				$path=$zip_p->statIndex($i)['name'];
				
				if(substr($dirs, -1) == '/'){
					if(!in_array($dirs, $dir_list)) {
						$dir_list[]=$dirs;
					};
				}
					else {
						$file_index[]=$zip_p->statIndex($i)['index'];
						$file_list[]=$dirs;
					};
			
			}
				else {
					if (strpos(($zip_p->statIndex($i)['name']),$pathinzip) === 0) {
						$pathinzip= str_ireplace('(','<',$pathinzip);
						$pathinzip= str_ireplace(')','>',$pathinzip);
						
						$currantfile=$zip_p->statIndex($i)['name'];
						$currantfile= str_ireplace('(','<',$currantfile);
						$currantfile= str_ireplace(')','>',$currantfile);
						
						$path=preg_replace('|'.$pathinzip.'|', '', $currantfile,1);
						$path=preg_replace('|/|', '/|', $path);
						$pathinzip= str_ireplace('<','(',$pathinzip);
						$pathinzip= str_ireplace('>',')',$pathinzip);
						$path= str_ireplace('<','(',$path);
						$path= str_ireplace('>',')',$path);
						
						$dirs=explode('|', $path);
						$dirs=$dirs[0];
						$path=$zip_p->statIndex($i)['name'];
						
	
						if(substr($dirs, -1) == '/' && $dirs!='') {
							if(!in_array($dirs, $dir_list)) {
								$dir_list[]=$dirs;
							};	
						}
						else {
							if ($dirs != '') {
								$file_list[]=($dirs);
								$file_index[]=$zip_p->statIndex($i)['index'];
							};
						};
					};
				
				};


		};
		
		if($pathinzip=='.') ($pathinzip='');
			
					echo (
	'<html>
	<head></head>
	<body>'
); 

			for ($i=0; isset($dir_list[$i]); $i++) {		
			//	print_r($path_list[$i]);
				echo ('<a href="'.$_SERVER['PHP_SELF'].'?path='.$pathinzip.$dir_list[$i].'&zip='.$zip.'">'.$dir_list[$i].'</a> <br>');
			};
			for ($i=0; isset($file_list[$i]); $i++) {		
				//print_r($file_list);
				echo ('<a href="'.$_SERVER['PHP_SELF'].'?path='.$pathinzip.$file_list[$i].'&index='.$file_index[$i].'&zip='.$zip.'&cmd=open">'.$file_list[$i].'</a> <br>');
			};

echo (
	'</body>
</html>'
);
	};
	
	switch($cmd) {
		case 'extract':
			foreach ($index as $value => $key) {
				echo ZipExtract($zip,$value,$key,$extractpath);
			};
			break;
		case 'create':
			echo ZipCreateDir($zip,$c_dir_path);
			break;
		case 'delete':
			foreach ($index as $value => $key) {
				echo ZipDeleteFileFolder($zip,$value,$key);
			};
			break;
		case 'rename':
			foreach ($index as $value => $key) {
				echo ZipRenameFile($zip,$value,$key,$rname);
			};
			break;
			
		case 'open':
				echo ZipOpenFile($zip,$index);
			break;
			
		case 'add':
			foreach ($a_files_path as $key => $value) {
				ZipAddFileFolders($zip,$key,$value);
			};
			break;
			
		case 'get':
			ZipGetList($zip,$path,$zip_path);
		break;
	};

					
}
else {
	switch($zip->open($ZipFileName)) {
		case ZipArchive::ER_EXISTS: 
			$ErrMsg = 'ER_EXISTS';//File already exists.
			break;

		case ZipArchive::ER_INCONS: 
			$ErrMsg = 'ER_INCONS';//Zip archive inconsistent.
			break;
                
		case ZipArchive::ER_MEMORY: 
			$ErrMsg = 'ER_MEMORY';//Malloc failure.
			break;
                
		case ZipArchive::ER_NOENT: 
			$ErrMsg = 'ER_NOENT';//No such file.
			break;
                
		case ZipArchive::ER_NOZIP: 
			$ErrMsg = 'ER_NOZIP';//Not a zip archive.
			break;
                
		case ZipArchive::ER_OPEN: 
			$ErrMsg = 'ER_OPEN';//Can't open file.
			break;
                
		case ZipArchive::ER_READ: 
			$ErrMsg = 'ER_READ';//Read error.
			break;
                
		case ZipArchive::ER_SEEK: 
			$ErrMsg = 'ER_SEEK';//Seek error.
			break;
            
		default: 
			$ErrMsg = 'Unknow_(Code:)';
			break;
	}
	die( 'ZipArchive_Error:'.$ErrMsg);
};

$zip->close();

?>
