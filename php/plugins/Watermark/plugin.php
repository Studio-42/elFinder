<?php
/**
 * elFinder Plugin Watermark
 *
 * Print watermark on file upload.
 *
 * ex. binding, configure on connector options
 *	$opts = array(
 *		'bind' => array(
 *			'upload.presave' => array(
 *				'Plugin.Watermark.onUpLoadPreSave'
 *			)
 *		),
 *		// global configure (optional)
 *		'plugin' => array(
 *			'Watermark' => array(
 *				'enable'         => true,       // For control by volume driver
 *				'source'         => 'logo.png', // Path to Water mark image
 *				'marginRight'    => 5,          // Margin right pixel
 *				'marginBottom'   => 5,          // Margin bottom pixel
 *				'quality'        => 95,         // JPEG image save quality
 *				'transparency'   => 70,         // Water mark image transparency ( other than PNG )
 *				'targetType'     => IMG_GIF|IMG_JPG|IMG_PNG|IMG_WBMP, // Target image formats ( bit-field )
 *				'targetMinPixel' => 200         // Target image minimum pixel size
 *			)
 *		),
 *		// each volume configure (optional)
 *		'roots' => array(
 *			array(
 *				'driver' => 'LocalFileSystem',
 *				'path'   => '/path/to/files/',
 *				'URL'    => 'http://localhost/to/files/'
 *				'plugin' => array(
 *					'Watermark' => array(
 *			 			'enable'         => true,       // For control by volume driver
 *						'source'         => 'logo.png', // Path to Water mark image
 *						'marginRight'    => 5,          // Margin right pixel
 *						'marginBottom'   => 5,          // Margin bottom pixel
 *						'quality'        => 95,         // JPEG image save quality
 *						'transparency'   => 70,         // Water mark image transparency ( other than PNG )
 *						'targetType'     => IMG_GIF|IMG_JPG|IMG_PNG|IMG_WBMP, // Target image formats ( bit-field )
 *						'targetMinPixel' => 200         // Target image minimum pixel size
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
class elFinderPluginWatermark {

	private $opts = array();
	private $watermarkImgInfo = null;

	public function __construct($opts) {
		$defaults = array(
			'enable'         => true,       // For control by volume driver
			'source'         => 'logo.png', // Path to Water mark image
			'marginRight'    => 5,          // Margin right pixel
			'marginBottom'   => 5,          // Margin bottom pixel
			'quality'        => 95,         // JPEG image save quality
			'transparency'   => 70,         // Water mark image transparency ( other than PNG )
			'targetType'     => IMG_GIF|IMG_JPG|IMG_PNG|IMG_WBMP, // Target image formats ( bit-field )
			'targetMinPixel' => 200         // Target image minimum pixel size
		);

		$this->opts = array_merge($defaults, $opts);

	}

	public function onUpLoadPreSave(&$path, &$name, $src, $elfinder, $volume) {
		
		$opts = $this->opts;
		$volOpts = $volume->getOptionsPlugin('Watermark');
		if (is_array($volOpts)) {
			$opts = array_merge($this->opts, $volOpts);
		}
		
		if (! $opts['enable']) {
			return false;
		}
		
<<<<<<< HEAD
		$srcImgInfo = getimagesize($src);
=======
		$srcImgInfo = @getimagesize($src);
>>>>>>> 614883b34d44fe190801f899858026094918c2b6
		if ($srcImgInfo === false) {
			return false;
		}
		
<<<<<<< HEAD
		// check Animation Gif
		if (elFinder::isAnimationGif($src)) {
			return false;
		}
		
=======
>>>>>>> 614883b34d44fe190801f899858026094918c2b6
		// check water mark image
		if (! file_exists($opts['source'])) {
			$opts['source'] = dirname(__FILE__) . "/" . $opts['source'];
		}
		if (is_readable($opts['source'])) {
<<<<<<< HEAD
			$watermarkImgInfo = getimagesize($opts['source']);
=======
			$watermarkImgInfo = @getimagesize($opts['source']);
>>>>>>> 614883b34d44fe190801f899858026094918c2b6
			if (! $watermarkImgInfo) {
				return false;
			}
		} else {
			return false;
		}
		
		$watermark = $opts['source'];
		$marginLeft = $opts['marginRight'];
		$marginBottom = $opts['marginBottom'];
		$quality = $opts['quality'];
		$transparency = $opts['transparency'];

		// check target image type
		$imgTypes = array(
<<<<<<< HEAD
			IMAGETYPE_GIF  => IMG_GIF,
			IMAGETYPE_JPEG => IMG_JPEG,
			IMAGETYPE_PNG  => IMG_PNG,
			IMAGETYPE_BMP  => IMG_WBMP,
			IMAGETYPE_WBMP => IMG_WBMP
		);
		if (! isset($imgTypes[$srcImgInfo[2]]) || ! ($opts['targetType'] & $imgTypes[$srcImgInfo[2]])) {
=======
			IMAGETYPE_GIF => IMG_GIF,
			IMAGETYPE_JPEG => IMG_JPEG,
			IMAGETYPE_PNG => IMG_PNG,
			IMAGETYPE_WBMP => IMG_WBMP,
		);
		if (! ($opts['targetType'] & $imgTypes[$srcImgInfo[2]])) {
>>>>>>> 614883b34d44fe190801f899858026094918c2b6
			return false;
		}
		
		// check target image size
		if ($opts['targetMinPixel'] > 0 && $opts['targetMinPixel'] > min($srcImgInfo[0], $srcImgInfo[1])) {
			return false;
		}
		
		$watermark_width = $watermarkImgInfo[0];
		$watermark_height = $watermarkImgInfo[1];
		$dest_x = $srcImgInfo[0] - $watermark_width - $marginLeft;
		$dest_y = $srcImgInfo[1] - $watermark_height - $marginBottom;
		
<<<<<<< HEAD
		if (class_exists('Imagick', false)) {
=======
		if (class_exists('Imagick')) {
>>>>>>> 614883b34d44fe190801f899858026094918c2b6
			return $this->watermarkPrint_imagick($src, $watermark, $dest_x, $dest_y, $quality, $transparency, $watermarkImgInfo);
		} else {
			return $this->watermarkPrint_gd($src, $watermark, $dest_x, $dest_y, $quality, $transparency, $watermarkImgInfo, $srcImgInfo);
		}
	}
	
	private function watermarkPrint_imagick($src, $watermark, $dest_x, $dest_y, $quality, $transparency, $watermarkImgInfo) {
		
		try {
			// Open the original image
			$img = new Imagick($src);
			
			// Open the watermark
			$watermark = new Imagick($watermark);
			
			// Set transparency
			if (strtoupper($watermark->getImageFormat()) !== 'PNG') {
				$watermark->setImageOpacity($transparency/100);
			}
			
			// Overlay the watermark on the original image
			$img->compositeImage($watermark, imagick::COMPOSITE_OVER, $dest_x, $dest_y);
			
			// Set quality
			if (strtoupper($img->getImageFormat()) === 'JPEG') {
				$img->setImageCompression(imagick::COMPRESSION_JPEG);
				$img->setCompressionQuality($quality);
			}
			
			$result = $img->writeImage($src);
			
			$img->clear();
			$img->destroy();
			$watermark->clear();
			$watermark->destroy();
			
			return $result ? true : false;
		} catch (Exception $e) {
			return false;
		}
	}
	
	private function watermarkPrint_gd($src, $watermark, $dest_x, $dest_y, $quality, $transparency, $watermarkImgInfo, $srcImgInfo) {
		
		$watermark_width = $watermarkImgInfo[0];
		$watermark_height = $watermarkImgInfo[1];
				
		$ermsg = '';
		switch ($watermarkImgInfo['mime']) {
			case 'image/gif':
<<<<<<< HEAD
				if (imagetypes() & IMG_GIF) {
					$oWatermarkImg = imagecreatefromgif($watermark);
=======
				if (@imagetypes() & IMG_GIF) {
					$oWatermarkImg = @imagecreatefromgif($watermark);
>>>>>>> 614883b34d44fe190801f899858026094918c2b6
				} else {
					$ermsg = 'GIF images are not supported';
				}
				break;
			case 'image/jpeg':
<<<<<<< HEAD
				if (imagetypes() & IMG_JPG) {
					$oWatermarkImg = imagecreatefromjpeg($watermark) ;
=======
				if (@imagetypes() & IMG_JPG) {
					$oWatermarkImg = @imagecreatefromjpeg($watermark) ;
>>>>>>> 614883b34d44fe190801f899858026094918c2b6
				} else {
					$ermsg = 'JPEG images are not supported';
				}
				break;
			case 'image/png':
<<<<<<< HEAD
				if (imagetypes() & IMG_PNG) {
					$oWatermarkImg = imagecreatefrompng($watermark) ;
=======
				if (@imagetypes() & IMG_PNG) {
					$oWatermarkImg = @imagecreatefrompng($watermark) ;
>>>>>>> 614883b34d44fe190801f899858026094918c2b6
				} else {
					$ermsg = 'PNG images are not supported';
				}
				break;
			case 'image/wbmp':
<<<<<<< HEAD
				if (imagetypes() & IMG_WBMP) {
					$oWatermarkImg = imagecreatefromwbmp($watermark);
=======
				if (@imagetypes() & IMG_WBMP) {
					$oWatermarkImg = @imagecreatefromwbmp($watermark);
>>>>>>> 614883b34d44fe190801f899858026094918c2b6
				} else {
					$ermsg = 'WBMP images are not supported';
				}
				break;
			default:
				$oWatermarkImg = false;
				$ermsg = $watermarkImgInfo['mime'].' images are not supported';
				break;
		}
		
		if (! $ermsg) {
			switch ($srcImgInfo['mime']) {
				case 'image/gif':
<<<<<<< HEAD
					if (imagetypes() & IMG_GIF) {
						$oSrcImg = imagecreatefromgif($src);
=======
					if (@imagetypes() & IMG_GIF) {
						$oSrcImg = @imagecreatefromgif($src);
>>>>>>> 614883b34d44fe190801f899858026094918c2b6
					} else {
						$ermsg = 'GIF images are not supported';
					}
					break;
				case 'image/jpeg':
<<<<<<< HEAD
					if (imagetypes() & IMG_JPG) {
						$oSrcImg = imagecreatefromjpeg($src) ;
=======
					if (@imagetypes() & IMG_JPG) {
						$oSrcImg = @imagecreatefromjpeg($src) ;
>>>>>>> 614883b34d44fe190801f899858026094918c2b6
					} else {
						$ermsg = 'JPEG images are not supported';
					}
					break;
				case 'image/png':
<<<<<<< HEAD
					if (imagetypes() & IMG_PNG) {
						$oSrcImg = imagecreatefrompng($src) ;
=======
					if (@imagetypes() & IMG_PNG) {
						$oSrcImg = @imagecreatefrompng($src) ;
>>>>>>> 614883b34d44fe190801f899858026094918c2b6
					} else {
						$ermsg = 'PNG images are not supported';
					}
					break;
				case 'image/wbmp':
<<<<<<< HEAD
					if (imagetypes() & IMG_WBMP) {
						$oSrcImg = imagecreatefromwbmp($src);
=======
					if (@imagetypes() & IMG_WBMP) {
						$oSrcImg = @imagecreatefromwbmp($src);
>>>>>>> 614883b34d44fe190801f899858026094918c2b6
					} else {
						$ermsg = 'WBMP images are not supported';
					}
					break;
				default:
					$oSrcImg = false;
					$ermsg = $srcImgInfo['mime'].' images are not supported';
					break;
			}
		}
		
		if ($ermsg || false === $oSrcImg || false === $oWatermarkImg) {
			return false;
		}
		
		if ($srcImgInfo['mime'] === 'image/png') {
			if (function_exists('imagecolorallocatealpha')) {
				$bg = imagecolorallocatealpha($oSrcImg, 255, 255, 255, 127);
				imagefill($oSrcImg, 0, 0 , $bg);
			}
		}
		
		if ($watermarkImgInfo['mime'] === 'image/png') {
			imagecopy($oSrcImg, $oWatermarkImg, $dest_x, $dest_y, 0, 0, $watermark_width, $watermark_height);
		} else {
			imagecopymerge($oSrcImg, $oWatermarkImg, $dest_x, $dest_y, 0, 0, $watermark_width, $watermark_height, $transparency);
		}
		
		switch ($srcImgInfo['mime']) {
			case 'image/gif':
				imagegif($oSrcImg, $src);
				break;
			case 'image/jpeg':
				imagejpeg($oSrcImg, $src, $quality);
				break;
			case 'image/png':
				if (function_exists('imagesavealpha') && function_exists('imagealphablending')) {
					imagealphablending($oSrcImg, false);
					imagesavealpha($oSrcImg, true);
				}
				imagepng($oSrcImg, $src);
				break;
			case 'image/wbmp':
				imagewbmp($oSrcImg, $src);
				break;
		}

		imageDestroy($oSrcImg);
		imageDestroy($oWatermarkImg);
		
		return true;
	}
}
