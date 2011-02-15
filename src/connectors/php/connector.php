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

function logger($data) {

	if (is_dir('../../../files/tmp') || @mkdir('../../../files/tmp')) {
		$fp = fopen('../../../files/tmp/log.txt', 'a');
		if ($fp) {
			fwrite($fp, var_export($data, true));
			fclose($fp);
		}
	}
}

$opts = array(
	'defaults' => array('debug' => true, 'disabled' => array()),
	// 'bind' => array('open' => 'logger'),
	'roots' => array(
		array(
			'path'   => '../../../files',
			'URL'    => 'http://localhost/git/elfinder/files',
			'fileURL' => false,
			'alias'  => 'Home1',
			'driver' => 'LocalFileSystem',
			'disabled' => array('rename'),
			'mimeDetect'   => 'finfo',
			'imgLib' => 'mogrify',
			'read' => true,
			'write' => true,
			'debug' => true,
			'perms' => array(
				'/123/' => array(
					'read'   => true,
					'write'   => false,
					'rm'   => true
				),
				'/print\.png/' => array(
					'read'   => true,
					'write'   => false,
					'rm'   => false
				)
			)
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
$connector->run();

// echo '<pre>';
// print_r($connector);

?>