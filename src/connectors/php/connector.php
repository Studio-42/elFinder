<?php
error_reporting(E_ALL); // Set E_ALL for debuging

if (function_exists('date_default_timezone_set')) {
	date_default_timezone_set('Europe/Moscow');
}

include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderConnector.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinder.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderStorageDriver.interface.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderStorageLocalFileSystem.class.php';

function debug($o) {
	echo '<pre>';
	print_r($o);
}

$opts = array(
	'defaults' => array('debug' => true),
	'roots' => array(
		array(
			'path'   => '../../../files',
			'URL'    => 'http://localhost/git/elfinder/files',
			'alias'  => 'Home1',
			'driver' => 'LocalFileSystem',
			'mimeDetect'   => 'finfo',
			'imgLib' => 'mogrify',
			'read' => true,
			'write' => true,
			'debug' => true
		),
		array(
			'path'   => '../../../files2',
			'URL'    => 'http://localhost/git/elfinder/files/',
			'alias'  => 'Home2',
			'driver' => 'LocalFileSystem',
			'mimeDetect'   => 'auto',
			'debug' => true
		)
		
	)
);

$connector = new elFinderConnector($opts);
// $connector->run();

// echo '<pre>';
// print_r($connector);

?>