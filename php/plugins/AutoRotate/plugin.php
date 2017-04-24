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
 *				'quality'        => 95,         // JPEG image save quality
 *				'offDropWith'    => null        // To disable it if it is dropped with pressing the meta key
 *				                                // Alt: 8, Ctrl: 4, Meta: 2, Shift: 1 - sum of each value
 *				                                // In case of using any key, specify it as an array
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
 *						'quality'        => 95,         // JPEG image save quality
 *						'offDropWith'    => null        // To disable it if it is dropped with pressing the meta key
 *						                                // Alt: 8, Ctrl: 4, Meta: 2, Shift: 1 - sum of each value
 *						                                // In case of using any key, specify it as an array
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
class elFinderPluginAutoRotate extends elFinderPlugin {

	public function __construct($opts) {
		$defaults = array(
			'enable'         => true,       // For control by volume driver
			'quality'        => 95,         // JPEG image save quality
			'offDropWith'    => null        // To disable it if it is dropped with pressing the meta key
			                                // Alt: 8, Ctrl: 4, Meta: 2, Shift: 1 - sum of each value
			                                // In case of using any key, specify it as an array
		);

		$this->opts = array_merge($defaults, $opts);

	}

	public function onUpLoadPreSave(&$thash, &$name, $src, $elfinder, $volume) {
		$opts = $this->getCurrentOpts($volume);
		
		if (! $this->iaEnabled($opts)) {
			return false;
		}
		
		$mime = mime_content_type($src);
		if (substr($mime, 0, 5) !== 'image') {
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
