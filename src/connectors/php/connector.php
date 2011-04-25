<?php
error_reporting(E_ALL); // Set E_ALL for debuging

// sleep(3);
// exit('{"asd":43}');

if (function_exists('date_default_timezone_set')) {
	date_default_timezone_set('Europe/Moscow');
}

include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderConnector.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinder.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderVolumeDriver.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderVolumeLocalFileSystem.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderVolumeMySQL.class.php';

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
	'roots' => array(
		array(
			'driver' => 'LocalFileSystem',
			'path'   => '../../../files/',
			'URL'    => 'http://localhost/git/elfinder/files/',
			'tmbURL'    => 'http://localhost/git/elfinder/files/.tmb/',
			'attributes' => array(
				array(
					// 'pattern' => '/\/\..?$/',
					// 'read'    => true,
					// 'write'   => true,
					// 'locked'  => false,
					// 'hidden'  => false
				),
				// array(
				// 	'pattern' => '/\.png$/',
				// 	'read' => false,
				// 	'write' => false,
				// 	'locked' => true,
				// 	'hidden' => true
				// ),
				array(
					'pattern' => '/mimes$/',
					'read' => true,
					'write' => false,
					'locked' => true,
					// 'hidden' => false
				),
				array(
					'pattern' => '/123$/',
					'read' => false,
					// 'write' => false,
					// 'locked' => true,
				)
			)
			// 'startPath'   => '../../../files/mimes/',
			// 'defaults' => array('read' => false)
		),
		array(
			'driver' => 'MySQL',
			'path' => 1,
			// 'startPath' => 2,
			'user' => 'dio',
			'pass' => 'hane',
			'db' => 'elfinder',
			'user_id' => 1,
			// 'URL'    => 'http://localhost/git/elfinder',
			'tmbPath' => '../../../tmb/',
			'tmbURL' => 'http://localhost/git/elfinder/tmb/',
			// 'attributes' => array(
			// 	array(),
			// 	array(
			// 		'pattern' => '/\.jpg$/',
			// 		'read' => false,
			// 		'write' => false,
			// 		'locked' => true,
			// 		'hidden' => true
			// 	)
			// )
			
		)
	)
	
);


$connector = new elFinderConnector(new elFinder($opts));
$connector->run();

// echo '<pre>';
// print_r($connector);

?>