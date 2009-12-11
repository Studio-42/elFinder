<?php
error_reporting(E_ALL);

include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinder.class.php';

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
	'mimeDetect' => 'auto',
	// 'imgLib' => 'gd',
	// 'dotFiles' => true,
	// 'cntDirSize' => false,
	'tmbDir' => '_tmb',
	'defaults' => array(
		'read'  => true,
		'write' => true,
		// 'rm'    => false
		),
	'perms' => array(
			)
);

$fm = new elFinder($opts); 
$fm->run();
?>
