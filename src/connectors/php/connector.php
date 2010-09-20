<?php

error_reporting(0); // Set E_ALL for debuging

if (function_exists('date_default_timezone_set')) {
	date_default_timezone_set('Europe/Moscow');
}

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

$opts = array(
	'root'            => '../../../files',                       // path to root directory
	'URL'             => 'http://localhost/git/elfinder/files/', // root directory URL
	'rootAlias'       => 'Home',       // display this instead of root directory name
	//'uploadAllow'   => array('images/*'),
	//'uploadDeny'    => array('all'),
	//'uploadOrder'   => 'deny,allow'
	// 'disabled'     => array(),      // list of not allowed commands
	// 'dotFiles'     => false,        // display dot files
	// 'dirSize'      => true,         // count total directories sizes
	// 'fileMode'     => 0666,         // new files mode
	// 'dirMode'      => 0777,         // new folders mode
	// 'mimeDetect'   => 'internal',       // files mimetypes detection method (finfo, mime_content_type, linux (file -ib), bsd (file -Ib), internal (by extensions))
	// 'uploadAllow'  => array(),      // mimetypes which allowed to upload
	// 'uploadDeny'   => array(),      // mimetypes which not allowed to upload
	// 'uploadOrder'  => 'deny,allow', // order to proccess uploadAllow and uploadAllow options
	// 'imgLib'       => 'mogrify',       // image manipulation library (imagick, mogrify, gd)
	// 'tmbDir'       => '.tmb',       // directory name for image thumbnails. Set to "" to avoid thumbnails generation
	// 'tmbCleanProb' => 1,            // how frequiently clean thumbnails dir (0 - never, 100 - every init request)
	// 'tmbAtOnce'    => 5,            // number of thumbnails to generate per request
	// 'tmbSize'      => 48,           // images thumbnails size (px)
	// 'fileURL'      => true,         // display file URL in "get info"
	// 'dateFormat'   => 'j M Y H:i',  // file modification date format
	// 'logger'       => null,         // object logger
	// 'defaults'     => array(        // default permisions
	// 	'read'   => true,
	// 	'write'  => true,
	// 	'rm'     => true
	// 	),
	// 'perms'        => array(),      // individual folders/files permisions    
	// 'debug'        => true,         // send debug to client
	// 'archiveMimes' => array(),      // allowed archive's mimetypes to create. Leave empty for all available types.
	// 'archivers'    => array()       // info about archivers to use. See example below. Leave empty for auto detect
	// 'archivers' => array(
	// 	'create' => array(
	// 		'application/x-gzip' => array(
	// 			'cmd' => 'tar',
	// 			'argc' => '-czf',
	// 			'ext'  => 'tar.gz'
	// 			)
	// 		),
	// 	'extract' => array(
	// 		'application/x-gzip' => array(
	// 			'cmd'  => 'tar',
	// 			'argc' => '-xzf',
	// 			'ext'  => 'tar.gz'
	// 			),
	// 		'application/x-bzip2' => array(
	// 			'cmd'  => 'tar',
	// 			'argc' => '-xjf',
	// 			'ext'  => 'tar.bz'
	// 			)
	// 		)
	// 	)
);

$fm = new elFinder($opts); 
$fm->run();

?>
