<?php
/**
 * elFinder Plugin AutoResize
 *
 * Auto resize on file upload.
 *
 * ex. binding, configure on connector options
 *	$opts = array(
 *		'bind' => array(
 *			'upload.presave' => array(
 *				'Plugin.AutoResize.onUpLoadPreSave'
 *			)
 *		),
 *		// global configure (optional)
 *		'plugin' => array(
 *			'AutoResize' => array(
 *				'enable'         => true,       // For control by volume driver
 *				'maxWidth'       => 1024,       // Path to Water mark image
 *				'maxHeight'      => 1024,       // Margin right pixel
 *				'quality'        => 95,         // JPEG image save quality
 *				'preserveExif'   => false,      // Preserve EXIF data (Imagick only)
 *				'forceEffect'    => false,      // For change quality of small images
 *				'targetType'     => IMG_GIF|IMG_JPG|IMG_PNG|IMG_WBMP // Target image formats ( bit-field )
 *			)
 *		),
 *		// each volume configure (optional)
 *		'roots' => array(
 *			array(
 *				'driver' => 'LocalFileSystem',
 *				'path'   => '/path/to/files/',
 *				'URL'    => 'http://localhost/to/files/'
 *				'plugin' => array(
 *					'AutoResize' => array(
 *						'enable'         => true,       // For control by volume driver
 *						'maxWidth'       => 1024,       // Path to Water mark image
 *						'maxHeight'      => 1024,       // Margin right pixel
 *						'quality'        => 95,         // JPEG image save quality
 *						'preserveExif'   => false,      // Preserve EXIF data (Imagick only)
 *						'forceEffect'    => false,      // For change quality of small images
 *						'targetType'     => IMG_GIF|IMG_JPG|IMG_PNG|IMG_WBMP // Target image formats ( bit-field )
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
class elFinderPluginAutoResize {

	private $opts = array();

	public function __construct($opts) {
		$defaults = array(
			'enable'         => true,       // For control by volume driver
			'maxWidth'       => 1024,       // Path to Water mark image
			'maxHeight'      => 1024,       // Margin right pixel
			'quality'        => 95,         // JPEG image save quality
			'preserveExif'   => false,      // Preserve EXIF data (Imagick only)
			'forceEffect'    => false,      // For change quality of small images
			'targetType'     => IMG_GIF|IMG_JPG|IMG_PNG|IMG_WBMP // Target image formats ( bit-field )
		);

		$this->opts = array_merge($defaults, $opts);

	}

	public function onUpLoadPreSave(&$path, &$name, $src, $elfinder, $volume) {
		$opts = $this->opts;
		$volOpts = $volume->getOptionsPlugin('AutoResize');
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
		$imgTypes = array(
			IMAGETYPE_GIF  => IMG_GIF,
			IMAGETYPE_JPEG => IMG_JPEG,
			IMAGETYPE_PNG  => IMG_PNG,
			IMAGETYPE_BMP  => IMG_WBMP,
			IMAGETYPE_WBMP => IMG_WBMP
		);
		if (! isset($imgTypes[$srcImgInfo[2]]) || ! ($opts['targetType'] & $imgTypes[$srcImgInfo[2]])) {
			return false;
		}
		
		if ($opts['forceEffect'] || $srcImgInfo[0] > $opts['maxWidth'] || $srcImgInfo[1] > $opts['maxHeight']) {
			return $this->resize($volume, $src, $srcImgInfo, $opts['maxWidth'], $opts['maxHeight'], $opts['quality'], $opts['preserveExif']);
		}
		
		return false;
	}
	
	private function resize($volume, $src, $srcImgInfo, $maxWidth, $maxHeight, $jpgQuality, $preserveExif) {
		$zoom = min(($maxWidth/$srcImgInfo[0]),($maxHeight/$srcImgInfo[1]));
		$width = round($srcImgInfo[0] * $zoom);
		$height = round($srcImgInfo[1] * $zoom);
		$unenlarge = true;
		
		return $volume->imageUtil('resize', $src, compact('width', 'height', 'jpgQuality', 'preserveExif', 'unenlarge'));
	}
}
