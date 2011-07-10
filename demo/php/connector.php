<?php

error_reporting(0); // Set E_ALL for debuging

include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderConnector.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinder.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderVolumeDriver.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderVolumeLocalFileSystem.class.php';
// Required for MySQL storage connector
// include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderVolumeMySQL.class.php';

$opts = array(
	// 'debug' => true,
	'roots' => array(
		array(
			'driver' => 'LocalFileSystem',   // driver for accessing file system
			'path'   => '../files/',         // path to files
			'URL'    => dirname($_SERVER['PHP_SELF']) . '/../files/', // URL to files
		)
	)
);

$connector = new elFinderConnector(new elFinder($opts));
$connector->run();

