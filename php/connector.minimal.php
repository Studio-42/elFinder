<?php

error_reporting(0); // Set E_ALL for debuging

include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderConnector.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinder.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderVolumeDriver.class.php';
include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderVolumeLocalFileSystem.class.php';
// Required for MySQL storage connector
// include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderVolumeMySQL.class.php';
// Required for FTP connector support
// include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinderVolumeFTP.class.php';


/**
 * Simple function to demonstrate how to control file access using "accessControl" callback.
 * This method will disable accessing files/folders starting from '.' (dot)
 *
 * @param  string  $attr  attribute name (read|write|locked|hidden)
 * @param  string  $path  file path relative to volume root directory started with directory separator
 * @return bool|null
 **/
function access($attr, $path, $data, $volume) {
	return strpos(basename($path), '.') === 0       // if file/folder begins with '.' (dot)
		? !($attr == 'read' || $attr == 'write')    // set read+write to false, other (locked+hidden) set to true
		:  null;                                    // else elFinder decide it itself
}


// Documentation for connector options:
// https://github.com/Studio-42/elFinder/wiki/Connector-configuration-options
$opts = array(
	// 'debug' => true,
	'roots' => array(
		array(
			'driver'        => 'FTP',   // driver for accessing file system (REQUIRED)
			'host'          => '127.0.0.1',
			'user'          => 'chuck',
			'pass'          => 'norrison',
			//'alias'			=> 'Root Folder',
			'path'  		=> '/',
			'accessControl' => 'access',
			'URL'           => dirname($_SERVER['PHP_SELF']) . '/../files/', // URL to files (REQUIRED)
			'tmbPath' 		=> '../files/.ftptmb',
			'tmbURL'		=> dirname($_SERVER['PHP_SELF']) . '/../files/.ftptmb',
			'tmpPath'       => '/../files/.tmp',
			'imgLib'		=> 'auto',
			'utf8fix'		=> true,
			'mimeDetect'	=> 'internal',
			'port'			=> 21,
			// 'disabled'		=> array (
					// 'download','resize'
				// ),
			'attributes' 	=> array(
					array(
						'pattern' => '/.+/', // Read+Write Settings for all Folders
						'read' 	=> true,
						'write' => true,
						'locked' => false
						),
					array(
						'pattern' => '/.(myFold-1|myFold-\.[A-z0-9\.\-\ \ä\Ä\ü\Ü\ö\Ö]+)$/', // Dont delete "myFold-1" and "myFold-*", but full access for Subfolders and Files
						'read' 	=> true,
						'write' => true, 
						'locked' => true
						)							
				),
			'archiveMimes' => array('application/x-7z-compressed'),
			'mode'          => 'passive',
			'uploadMaxSize' => '4G'
		)
	)
);

// run elFinder
$connector = new elFinderConnector(new elFinder($opts));
$connector->run();

