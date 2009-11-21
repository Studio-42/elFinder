<?php
error_reporting(E_ALL);

include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinder.class.php';

$path = str_replace($_SERVER['DOCUMENT_ROOT'], '', dirname(__FILE__));
$path = str_replace('/src/elfinder2/connectors/php', '', $path);

$rootDir = $_SERVER['DOCUMENT_ROOT'].$path.DIRECTORY_SEPARATOR.'files';
$rootURL = 'http://'.$_SERVER['HTTP_HOST'].DIRECTORY_SEPARATOR.$path.'/files/';
// echo $rootDir.'<br>'.$rootURL;

$dir = $rootDir.DIRECTORY_SEPARATOR.'Documents';

$opts = array(
	'root'   => $rootDir,
	'URL'    => $rootURL,
	'lang'   => 'ru',
	'defaults' => array(
		'read'  => true,
		'write' => true
		)
	);
// echo '<pre>';
// print_r($opts);
//$translator = new elTranslator();
//$translator->loadMessages('ru', dirname(__FILE__).DIRECTORY_SEPARATOR.'i18n'.DIRECTORY_SEPARATOR.'ru.php', 'elMsg');

$fm = new elFinder($opts); 
$fm->run();
//$fm->setTranslator($translator);

//$fm->autorun();
?>
