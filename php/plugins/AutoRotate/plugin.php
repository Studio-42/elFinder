<?php
/**
 * elFinder Plugin AutoRotate
 *
 * Auto rotation on file upload of JPEG file by EXIF Orientation.
 *
 * ex. binding, configure on connector options
 *	$opts = array(
 *		'bind' => array(
 *			'upload.presave' => array(
 *				'Plugin.AutoRotate.onUpLoadPreSave'
 *			)
 *		),
 *		// global configure (optional)
 *		'plugin' => array(
 *			'AutoRotate' => array(
 *				'enable'         => true,       // For control by volume driver
 *				'quality'        => 95          // JPEG image save quality
 *			)
 *		),
 *		// each volume configure (optional)
 *		'roots' => array(
 *			array(
 *				'driver' => 'LocalFileSystem',
 *				'path'   => '/path/to/files/',
 *				'URL'    => 'http://localhost/to/files/'
 *				'plugin' => array(
 *					'AutoRotate' => array(
 *						'enable'         => true,       // For control by volume driver
 *						'quality'        => 95          // JPEG image save quality
 *					)
 *				)
 *			)
 *		)
 *	);
 *
 * @package elfinder
 * @author Naoki Sawada
 * @license New BSD
 */
class elFinderPluginAutoRotate {

	private $opts = array();

	public function __construct($opts) {
		$defaults = array(
			'enable'         => true,       // For control by volume driver
			'quality'        => 95,         // JPEG image save quality
		);

		$this->opts = array_merge($defaults, $opts);

	}

	public function onUpLoadPreSave(&$path, &$name, $src, $elfinder, $volume) {
		$opts = $this->opts;
		$volOpts = $volume->getOptionsPlugin('AutoRotate');
		if (is_array($volOpts)) {
			$opts = array_merge($this->opts, $volOpts);
		}
		
		if (! $opts['enable']) {
			return false;
		}
		
		$srcImgInfo = getimagesize($src);
		if ($srcImgInfo === false) {
			return false;
		}
		
		// check target image type
		if ($srcImgInfo[2] !== IMAGETYPE_JPEG) {
			return false;
		}
		
		return $this->rotate($volume, $src, $srcImgInfo, $opts['quality']);
	}
	
	private function rotate($volume, $src, $srcImgInfo, $quality) {
		if (! function_exists('exif_read_data')) {
			return false;
		}
		$degree = 0;
		$exif = exif_read_data($src);
		if($exif && !empty($exif['Orientation'])) {
			switch($exif['Orientation']) {
				case 8:
					$degree = 270;
					break;
				case 3:
					$degree = 180;
					break;
				case 6:
					$degree = 90;
					break;
			}
		}
		$opts = array(
			'degree' => $degree,
			'jpgQuality' => $quality
		);
		return $volume->imageUtil('rotate', $src, $opts);
	}
}
