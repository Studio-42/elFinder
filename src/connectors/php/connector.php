<?php
error_reporting(E_ALL);

include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinder.class.php';


/**
 * Simple example how to use logger with elFinder
 **/
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
$path = str_replace('/src/connectors/php', '', $path);

$rootDir = $_SERVER['DOCUMENT_ROOT'].$path.DIRECTORY_SEPARATOR.'files';
$rootURL = 'http://'.$_SERVER['HTTP_HOST'].$path.'/files/';


$dir = $rootDir.DIRECTORY_SEPARATOR.'Documents';

$opts = array(
	'root'   => $rootDir,
	'URL'    => $rootURL,
	'lang'   => 'ru',
	// 'mimeDetect' => 'internal',
	// 'debug' => false,
	'arc' => '7za',
	// 'fileURL' => false,
	// 'logger'  => new elFinderLogger(),
	// 'imgLib' => 'mogrify',
	// 'dotFiles' => true,
	'dirSize' => true,
	// 'uploadAllow' => array('image/png'),
	// 'uploadDeny' => array('image', 'text'),
	// 'uploadOrder' => 'deny,allow',
	// 'disabled' => array('upload', 'reload'),
	// 'tmbDir' => '_tmb',
	'archiveMimes' => array(),
	'defaults' => array(
		'read'  => true,
		'write' => true,
		'rm'    => true
		),
);

$fm = new elFinder($opts); 
$fm->run();
?>
