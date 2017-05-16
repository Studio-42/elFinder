#!/bin/bash

echo '# download composer.phar #'
curl -sS https://getcomposer.org/installer | php
#php -r "readfile('https://getcomposer.org/installer');" | php
 
echo '# composer require studio-42/elfinder 2.1.x@dev #'
php composer.phar require studio-42/elfinder 2.1.x@dev

echo '# make synlink css, img, js #'
ln -s ./vendor/studio-42/elfinder/css
ln -s ./vendor/studio-42/elfinder/img
ln -s ./vendor/studio-42/elfinder/js
ln -s ./vendor/studio-42/elfinder/sounds

echo '# mkdir files #'
mkdir files

echo '# mkdir .tmp #'
mkdir .tmp

echo '# make .tmp/.htaccess #'
cat << \EOD > .tmp/.htaccess
order deny,allow
deny from all
EOD

echo '# make connector.minimal.php #'
cat << \EOD > connector.minimal.php
<?php
//////////////////////////////////////////////////////////////////////
// CONFIGS

// Set root path/url
define('ELFINDER_ROOT_PATH', dirname(__FILE__));
define('ELFINDER_ROOT_URL' , dirname($_SERVER['SCRIPT_NAME']));

// Thumbnail, Sync min second option for netmount
$netvolumeOpts = array(
	'tmbURL'    => ELFINDER_ROOT_URL  . '/files/.tmb',
	'tmbPath'   => ELFINDER_ROOT_PATH . '/files/.tmb',
	'syncMinMs' => 30000
);

// Volumes config
// Documentation for connector options:
// https://github.com/Studio-42/elFinder/wiki/Connector-configuration-options
$opts = array(
	'roots' => array(
		array(
			'driver'        => 'LocalFileSystem',           // driver for accessing file system (REQUIRED)
			'path'          => ELFINDER_ROOT_PATH . '/files/', // path to files (REQUIRED)
			'URL'           => ELFINDER_ROOT_URL  . '/files/', // URL to files (REQUIRED)
			'uploadDeny'    => array('all'),                // All Mimetypes not allowed to upload
			'uploadAllow'   => array('image', 'text/plain'),// Mimetype `image` and `text/plain` allowed to upload
			'uploadOrder'   => array('deny', 'allow'),      // allowed Mimetype `image` and `text/plain` only
			'accessControl' => 'access'                     // disable and hide dot starting files (OPTIONAL)
		)
	),
	'optionsNetVolumes' => array(
		'*' => array(
			'tmbURL'    => ELFINDER_ROOT_URL  . '/files/.tmb',
			'tmbPath'   => ELFINDER_ROOT_PATH . '/files/.tmb',
			'syncMinMs' => 30000
		)
	)
);

//////////////////////////////////////////////////////////////////////
// load composer autoload.php
require './vendor/autoload.php';

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

// run elFinder
$connector = new elFinderConnector(new elFinder($opts));
$connector->run();

// end connector
EOD

echo '# make index.html #'
cat << \EOD > index.html
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<title>elFinder 2.1.x source version with PHP connector</title>
		<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=2" />

		<!-- Require JS (REQUIRED) -->
		<!-- Rename "main.default.js" to "main.js" and edit it if you need configure elFInder options or any things -->
		<script data-main="./main.default.js" src="//cdnjs.cloudflare.com/ajax/libs/require.js/2.3.2/require.min.js"></script>

	</head>
	<body>

		<!-- Element where elFinder will be created (REQUIRED) -->
		<div id="elfinder"></div>

	</body>
</html>
EOD

echo '# make vendor/.htaccess #'
cat << \EOD > vendor/.htaccess
order deny,allow
deny from all
EOD

#echo "# rm $0 #"
#rm $0

echo '# Finish!! #'
