<?php
error_reporting(E_ALL); // Set E_ALL for debuging

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

// exit();
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

function logger2($cmd, $voumes, $result) {
	$log = $cmd.': '.$voumes[0]->id().' ';
	
	if (isset($voumes[1])) {
		$log .= $voumes[1]->id().' ';
	}
	
	$log .= '['.date('d.m H:s').'] ';
	
	switch ($cmd) {
		case 'mkdir':
		case 'mkfile':
			$log .= $result['added'][0]['name'];
			break;
		case 'rename':
			$log .= 'from '.$result['removedDetails'][0]['name'].' to '.$result['added'][0]['name'];
			break;
		case 'duplicate':
			$log .= 'src: '.$result['src']['name'].' copy: '.$result['added'][0]['name'];
			break;
	}
	if (is_dir('../../../files/tmp') || @mkdir('../../../files/tmp')) {
		$fp = fopen('../../../files/tmp/log.txt', 'a');
		if ($fp) {
			fwrite($fp, $log."\n");
			fclose($fp);
		}
	}
	return $result;
}

// sleep(5);
$opts = array(
	'bind' => array(
		'mkdir mkfile  rename duplicate' => 'logger2', 
	),
	'debug' => true,
	'roots' => array(
		array(
			'driver' => 'LocalFileSystem',
			'path'   => '../../../files/',
			'alias' => 'File system',
			// 'treeDeep' => 2,
			// 'startPath' => '../../../files/mimes',
			// 'URL'    => 'http://localhost/git/elfinder/files/',
			"disabled" => array('reload'),
			'uploadAllow' => array('all'),
			'uploadDeny'  => array(),
			'uploadOrder' => 'deny,allow',
			'uploadOverwrite' => false,
			'mimeDetect' => 'internal',
			
			// 'tmbPath' => '.tmb',
			'tmbURL'    => 'http://localhost/git/elfinder/files/.tmb/',
			'attributes' => array(
				array(
					'pattern' => '/\/__.*/',
					// 'hidden'  => true
				),
				array(
					'pattern' => '/\/\..*$/',
					'read'    => true,
					'write'   => true,
					'locked'  => false,
					'hidden'  => true
				),
				array(
					'pattern' => '/copy\/42$/',
					'read' => false,
					'write' => false,
					'locked' => true,
					'hidden' => false
				),
				array(
					'pattern' => '/images$/',
					'read' => true,
					// 'write' => false,
					'locked' => true,
					// 'hidden' => true
				),
				array(
					'pattern' => '/.*123$/',
					'read' => false,
					'write' => false,
					'locked' => true,
				)
			),
			// 'startPath'   => '../../../files/mimes/',
			// 'defaults' => array('read' => false)
		),
		array(
			'driver' => 'MySQL',
			'path' => 1,
			'treeDeep' => 2,
			// 'startPath' => 6,
			'user' => 'dio',
			'pass' => 'hane',
			'db' => 'elfinder',
			'user_id' => 1,
			// 'copyTo' => false,
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

// sleep(2);
$connector = new elFinderConnector(new elFinder($opts));
$connector->run();

// echo '<pre>';
// print_r($connector);

?>