<?php
error_reporting(E_ALL);

include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinder.class.php';

interface elFinderILogger {
	
	public function log($cmd, $ok, $context, $err='', $errorData = array());
}

class elFinderLogger implements elFinderILogger {
	
	public function log($cmd, $ok, $context, $err='', $errorData = array()) {
		if (false != ($fp = fopen('./log.txt', 'a'))) {
			if ($ok) {
				$str = "cmd: $cmd; OK; context: ".str_replace("\n", '', var_export($context, true))."; \n";
			} else {
				$str = "cmd: $cmd; FAILED; context: ".str_replace("\n", '', var_export($context, true))."; error: $err; errorData: ".str_replace("\n", '', var_export($errorData, true))."\n";
			}
			fwrite($fp, $str);
			fclose($fp);
		}
	}
	
}

$path = str_replace($_SERVER['DOCUMENT_ROOT'], '', dirname(__FILE__));
$path = str_replace('/src/elfinder2/connectors/php', '', $path);

$rootDir = $_SERVER['DOCUMENT_ROOT'].$path.DIRECTORY_SEPARATOR.'files';
$rootURL = 'http://'.$_SERVER['HTTP_HOST'].$path.'/files/';
// echo $rootDir.'<br>'.$rootURL;

$dir = $rootDir.DIRECTORY_SEPARATOR.'Documents';

$opts = array(
	'root'   => $rootDir,
	'URL'    => $rootURL,
	'lang'   => 'ru',
	// 'mimeDetect' => 'internal',
	'cacheTime' => 10,
	// 'debug' => false,
	'arc' => '7za',
	// 'fileURL' => false,
	// 'logger'  => new elFinderLogger(),
	// 'imgLib' => '',
	// 'dotFiles' => true,
	// 'cntDirSize' => false,
	// 'uploadAllow' => array('text', 'image'),
	// 'uploadDeny' => array('image/png'),
	// 'uploadOrder' => 'deny,allow',
	// 'disabled' => array('upload', 'reload'),
	'tmbDir' => '.tmb',
	'archiveMimes' => array(),
	'defaults' => array(
		'read'  => true,
		'write' => true,
		'rm'    => true
		),
	'perms' => array(
		'/icons$/' => array(
			'read' => false,
			// 'write' => false,
			'rm' => false
			)
			)
);

$fm = new elFinder($opts); 
$fm->run();
?>
