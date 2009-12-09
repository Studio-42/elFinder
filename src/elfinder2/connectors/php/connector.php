<?php
error_reporting(E_ALL);

include_once dirname(__FILE__).DIRECTORY_SEPARATOR.'elFinder.class.php';

$path = str_replace($_SERVER['DOCUMENT_ROOT'], '', dirname(__FILE__));
$path = str_replace('/src/elfinder2/connectors/php', '', $path);

$rootDir = $_SERVER['DOCUMENT_ROOT'].$path.DIRECTORY_SEPARATOR.'files';
$rootURL = 'http://'.$_SERVER['HTTP_HOST'].$path.'/files/';
// echo $rootDir.'<br>'.$rootURL;

$dir = $rootDir.DIRECTORY_SEPARATOR.'Documents';

$opts = array(
	'root'   => $rootDir,
	'URL'    => $rootURL,
	'lang'   => 'ru',
	'mimeDetect' => 'auto',
	// 'cntDirSize' => false,
	// 'tmbDir' => '',
	'defaults' => array(
		'read'  => true,
		'write' => true,
		// 'rm'    => false
		),
		'perms' => array(
			'|'.preg_quote($rootDir.DIRECTORY_SEPARATOR).'_tmb|i' => array(
				'read' => false,
				'write' => false,
				'rm'    => true
				),
			// '/untitle/' => array(
			// 	'write' => false
			// 	),
			'/Read_only/' => array(
				'write' => false
				),
			'/Dropbox/' => array(
				'read' => false
				)
			
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
