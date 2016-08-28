<?php

define('ELFINDER_PHP_ROOT_PATH', dirname(__FILE__));

function elFinderAutoloader($name) {
	$map = array(
		'elFinder' => ELFINDER_PHP_ROOT_PATH . '/elFinder.class.php',
		'elFinderConnector' => ELFINDER_PHP_ROOT_PATH . '/elFinderConnector.class.php',
		'elFinderLibGdBmp' => ELFINDER_PHP_ROOT_PATH . '/libs/GdBmp.php',
		'elFinderPluginAutoResize' => ELFINDER_PHP_ROOT_PATH . '/plugins/AutoResize/plugin.php',
		'elFinderPluginAutoRotate' => ELFINDER_PHP_ROOT_PATH . '/plugins/AutoRotate/plugin.php',
		'elFinderPluginNormalizer' => ELFINDER_PHP_ROOT_PATH . '/plugins/Normalizer/plugin.php',
		'elFinderPluginSanitizer' => ELFINDER_PHP_ROOT_PATH . '/plugins/Sanitizer/plugin.php',
		'elFinderPluginWatermark' => ELFINDER_PHP_ROOT_PATH . '/plugins/Watermark/plugin.php',
		'elFinderSession' => ELFINDER_PHP_ROOT_PATH . '/elFinderSession.php',
		'elFinderSessionInterface' => ELFINDER_PHP_ROOT_PATH . '/elFinderSessionInterface.php',
		'elFinderVolumeDriver' => ELFINDER_PHP_ROOT_PATH . '/elFinderVolumeDriver.class.php',
		'elFinderVolumeDropbox' => ELFINDER_PHP_ROOT_PATH . '/elFinderVolumeDropbox.class.php',
		'elFinderVolumeFTP' => ELFINDER_PHP_ROOT_PATH . '/elFinderVolumeFTP.class.php',
		'elFinderVolumeFlysystemGoogleDriveCache' => ELFINDER_PHP_ROOT_PATH . '/elFinderFlysystemGoogleDriveNetmount.php',
		'elFinderVolumeFlysystemGoogleDriveNetmount' => ELFINDER_PHP_ROOT_PATH . '/elFinderFlysystemGoogleDriveNetmount.php',
		'elFinderVolumeGroup' => ELFINDER_PHP_ROOT_PATH . '/elFinderVolumeGroup.class.php',
		'elFinderVolumeLocalFileSystem' => ELFINDER_PHP_ROOT_PATH . '/elFinderVolumeLocalFileSystem.class.php',
		'elFinderVolumeMySQL' => ELFINDER_PHP_ROOT_PATH . '/elFinderVolumeMySQL.class.php',
	);
	if (isset($map[$name])) {
		return include_once($map[$name]);
	}
	$prefix = substr($name, 0, 14);
	if (substr($prefix, 0, 8) === 'elFinder') {
		if ($prefix === 'elFinderVolume') {
			$file = ELFINDER_PHP_ROOT_PATH . '/' . $name . '.class.php';
			return (is_file($file) && include_once($file));
		} else if ($prefix === 'elFinderPlugin') {
			$file = ELFINDER_PHP_ROOT_PATH . '/plugins/' . substr($name, 14) . '/plugin.php';
			return (is_file($file) && include_once($file));
		}
	}
	return false;
}

if (version_compare(PHP_VERSION, '5.3', '<')) {
	spl_autoload_register('elFinderAutoloader');
} else {
	spl_autoload_register('elFinderAutoloader', true, true);
}

