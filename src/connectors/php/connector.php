<?php
error_reporting(E_ALL); // Set E_ALL for debuging

// exit('{"asd":43}');

if (function_exists('date_default_timezone_set')) {
	date_default_timezone_set('Europe/Moscow');
}

include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderConnector.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinder.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderVolumeDriver.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderVolumeLocalFileSystem.class.php';

function debug($o) {
	echo '<pre>';
	print_r($o);
}

function logger($data) {
	$str = $data['cmd'].': ';
	$volume = $data['volume'];
	$result = $data['result'];
	switch ($data['cmd']) {
		case 'mkdir':
			$current = $volume->dir($result['current']);
			$str .= $current['path'].DIRECTORY_SEPARATOR.$result['dir']['name'];
			break;
		case 'mkfile':
			$current = $volume->dir($result['current']);
			$str .= $current['path'].DIRECTORY_SEPARATOR.$result['file']['name'];
			break;
		case 'rm':
			$current = $volume->dir($result['removed']['phash']);
			$str .= $current['path'].DIRECTORY_SEPARATOR.$result['removed']['name'];
			break;
	}
	
	if (is_dir('../../../files/tmp') || @mkdir('../../../files/tmp')) {
		$fp = fopen('../../../files/tmp/log.txt', 'a');
		if ($fp) {
			fwrite($fp, $str."\n");
			fclose($fp);
		}
	}
	$result['log'] = true;
	return $result;
}

$opts = array(
	'debug' => true,
	'disabled' => array('rm', 'open', 'asd'),
	// 'bind' => array('mkdir' => 'logger', 'mkfile' => 'logger', 'rm' => 'logger'),
	'roots' => array(
		array(
			'path'   => '../../../files/',
			// 'startPath' => '../../../files/Images/',
			'URL'    => 'http://192.168.1.21/git/elfinder/files',
			// 'dotFiles' => true,
			'treeDeep' => 2,
			'fileURL' => false,
			'alias'  => 'Home1',
			'driver' => 'LocalFileSystem',
			'disabled' => array('rename'),
			'mimeDetect'   => 'mime_content_type',
			'imgLib' => 'imagick',
			'read' => true,
			'write' => true,
			'debug' => true,
			'perms' => array(
				'/123/' => array(
					'read'   => true,
					'write'   => true,
					'rm'   => true
				),
				'/print\.png/' => array(
					'read'   => true,
					'write'   => false,
					'rm'   => false
				)
			)
		),
		// array('path' => '/opt/local', 'driver' => 'LocalFileSystem', 'tmbDir' => '', 'treeDeep' => 5),
		array(
			'path'   => '../../../files2',
			'URL'    => 'http://localhost/git/elfinder/files2/',
			'alias'  => 'Home2',
			'driver' => 'LocalFileSystem',
			'mimeDetect'   => 'auto',
			'debug' => true,
			'defaults' => array(
				'read' => true,
				'write' => false,
				'rm' => false
			)
		)
		
	)
);

$connector = new elFinderConnector(new elFinder($opts));
$connector->run();

// echo '<pre>';
// print_r($connector);

?>