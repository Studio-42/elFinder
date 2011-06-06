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


/**
 * Simple logger function.
 * Demonstrate how to work with elFinder event api.
 *
 * @param  string        $cmd     command name
 * @param  object|array  $voumes  current volume or source/destination volumes list for command "paste"
 * @param  array         $return  command result
 * @return array
 * @author Dmitry (dio) Levashov
 **/
function logger($cmd, $voumes, $result) {
	$log = $cmd.': ['.date('d.m H:s').'] '.$voumes[0]->id().' ';
	
	if (isset($voumes[1])) {
		$log .= $voumes[1]->id().' ';
	}
	
	switch ($cmd) {
		case 'mkdir':
		case 'mkfile':
		case 'upload':
			$log .= $result['added'][0]['name'];
			break;
		case 'rename':
			$log .= 'from '.$result['removedDetails'][0]['name'].' to '.$result['added'][0]['name'];
			break;
		case 'duplicate':
			$log .= 'src: '.$result['src']['name'].' copy: '.$result['added'][0]['name'];
			break;
		case 'rm':
			$log .= $result['removedDetails'][0]['name'];
			break;

		default:
			$log = '';
	}
	if ($log && is_dir('../../../files/tmp') || @mkdir('../../../files/tmp')) {
		$fp = fopen('../../../files/tmp/log.txt', 'a');
		if ($fp) {
			fwrite($fp, $log."\n");
			fclose($fp);
		}
	}
	return $result;
}


/**
 * Simple logger function.
 * Demonstrate how to work with elFinder event api.
 *
 * @package elFinder
 * @author Dmitry (dio) Levashov
 **/
class elFinderSimpleLogger {
	
	/**
	 * Write log
	 *
	 * @param  string        $cmd     command name
	 * @param  object|array  $voumes  current volume or source/destination volumes list for command "paste"
	 * @param  array         $return  command result
	 * @return array
	 **/
	public function write($cmd, $voumes, $result) {
		$log = $cmd.': ['.date('d.m H:s').'] '.$voumes[0]->id().' ';

		if (isset($voumes[1])) {
			$log .= $voumes[1]->id().' ';
		}

		switch ($cmd) {
			case 'mkdir':
			case 'mkfile':
			case 'upload':
			case 'paste':
				$log .= $result['added'][0]['name'];
				break;
			case 'rename':
				$log .= 'from '.$result['removedDetails'][0]['name'].' to '.$result['added'][0]['name'];
				break;
			case 'duplicate':
				$log .= 'src: '.$result['src']['name'].' copy: '.$result['added'][0]['name'];
				break;
			case 'rm':
				$log .= $result['removedDetails'][0]['name'];
				break;

			default:
				$log = '';
		}
		if ($log && is_dir('../../../files/tmp') || @mkdir('../../../files/tmp')) {
			$fp = fopen('../../../files/tmp/log.txt', 'a');
			if ($fp) {
				fwrite($fp, $log."\n");
				fclose($fp);
			}
		}
		return $result;
		
	}
	
} // END class 


/**
 * Simple function to demonstrate how to control file access using "accessControl" callback.
 * Make files started with __ hidden.
 *
 * @param  string  $attr  attribute name (read|write|locked|hidden)
 * @param  string  $path  file path. Attention! This is path relative to volume root directory started with directory separator.
 * @return bool
 * @author Dmitry (dio) Levashov
 **/
function access($attr, $path, $data, $volume) {

	return $attr == 'read' || $attr == 'write';
	
	echo $attr.' '.$path.' '.strpos($path, '__').'<br>';
	if ($attr == 'hidden' && strpos($path, '__') === 0) {
		return true;
	}
	return false;
}

// sleep(3);

// if (!empty($_GET['count'])) {
// 	$s = (int)$_GET['count']*2;
// 	sleep($s);
// }
// exit('{a : 42}');
$opts = array(
	'bind' => array(
		'mkdir mkfile  rename duplicate upload rm paste' => array(new elFinderSimpleLogger(), 'write'), 
	),
	'debug' => true,
	'roots' => array(
		array(
			'driver' => 'LocalFileSystem',
			'path'   => '../../../files/',
			'alias' => 'File system',
			'accessControl' => 'access',
			// 'URL'    => 'http://localhost/git/elfinder/files/',
			"disabled" => array('reload'),
			'uploadAllow' => array('all'),
			'uploadDeny'  => array(),
			'uploadOrder' => 'deny,allow',
			'uploadOverwrite' => false,
			'mimeDetect' => 'internal',
			'tmbCrop' => false,
			'imgLib' => 'imagick',
			// 'tmbPath' => '/Users/dio/Sites/git/elfinder/my-tmb',
			'tmbURL'    => 'http://localhost/git/elfinder/files/.tmb/',
			'attributes' => array(
				array(
					'pattern' => '/\/__.*/',
					'hidden'  => true
				),
				array(
					'pattern' => '/\/\..*$/',
					'read'    => false,
					'write'   => true,
					'locked'  => false,
					'hidden'  => true
				),
				array(
					'pattern' => '/folder42$/',
					// 'read' => false
					// 'hidden' => true,
					// 'locked' => true
				)
			),
		),
		// array(
		// 	'driver' => 'MySQL',
		// 	'path' => 1,
		// 	// 'treeDeep' => 2,
		// 	'user' => 'root',
		// 	'pass' => 'hane',
		// 	'db' => 'elfinder',
		// 	'user_id' => 1,
		// 	'accessControl' => 'access',
		// 	'separator' => ':',
		// 	// 'copyTo' => false,
		// 	'URL'    => 'http://localhost/git/elfinder',
		// 	'tmbPath' => '../../../tmb/',
		// 	'tmbURL' => 'http://localhost/git/elfinder/tmb/',
		// 	// 'attributes' => array(
		// 	// 	array(),
		// 	// 	array(
		// 	// 		'pattern' => '/\.jpg$/',
		// 	// 		'read' => false,
		// 	// 		'write' => false,
		// 	// 		'locked' => true,
		// 	// 		'hidden' => true
		// 	// 	)
		// 	// )
		// 	
		// )
	)
	
);

// sleep(2);
$connector = new elFinderConnector(new elFinder($opts));
$connector->run();

// echo '<pre>';
// print_r($connector);

?>