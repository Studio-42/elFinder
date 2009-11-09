<?php
error_reporting(0);

include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinder.class.php';

$path = str_replace($_SERVER['DOCUMENT_ROOT'], '', dirname(__FILE__));
$path = str_replace('/src/elfinder/connectors/php', '', $path);

$rootDir = $_SERVER['DOCUMENT_ROOT'].$path.DIRECTORY_SEPARATOR.'files';
$rootURL = 'http://'.$_SERVER['HTTP_HOST'].$path.'/files/';
// echo $rootDir.'<br>'.$rootURL;

$dir = $rootDir.DIRECTORY_SEPARATOR.'Documents';

$opts = array(
	'root'   => $rootDir,
	'URL'    => $rootURL,
	'tplDir' => realpath(dirname(__FILE__).DIRECTORY_SEPARATOR.'tpl'),
	'lang'   => 'ru',
	'defaults' => array(
		'read'  => true,
		'write' => false
		),
	'perms' => array(
		$dir => array(
			'read' => true,
			'write'=> true
			)
		)
	);

$translator = new elTranslator();
$translator->loadMessages('ru', dirname(__FILE__).DIRECTORY_SEPARATOR.'i18n'.DIRECTORY_SEPARATOR.'ru.php', 'elMsg');

$fm = new elFinder($opts); 
$fm->setTranslator($translator);

$fm->autorun();
?>