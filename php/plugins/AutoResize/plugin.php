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
		
		$srcImgInfo = @getimagesize($src);
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
		if (! ($opts['targetType'] & @$imgTypes[$srcImgInfo[2]])) {
			return false;
		}
		
		if ($srcImgInfo[0] > $opts['maxWidth'] || $srcImgInfo[1] > $opts['maxHeight']) {
			return $this->resize($src, $srcImgInfo, $opts['maxWidth'], $opts['maxHeight'], $opts['quality'], $opts['preserveExif']);
		}
		
		return false;
	}
	
	private function resize($src, $srcImgInfo, $maxWidth, $maxHeight, $quality, $preserveExif) {
		$zoom = min(($maxWidth/$srcImgInfo[0]),($maxHeight/$srcImgInfo[1]));
		$width = round($srcImgInfo[0] * $zoom);
		$height = round($srcImgInfo[1] * $zoom);
		
		if (class_exists('Imagick', false)) {
			return $this->resize_imagick($src, $width, $height, $quality, $preserveExif);
		} else {
			return $this->resize_gd($src, $width, $height, $quality, $srcImgInfo);
		}
	}
	
	private function resize_gd($src, $width, $height, $quality, $srcImgInfo) {
		switch ($srcImgInfo['mime']) {
			case 'image/gif':
				if (@imagetypes() & IMG_GIF) {
					$oSrcImg = @imagecreatefromgif($src);
				} else {
					$ermsg = 'GIF images are not supported';
				}
				break;
			case 'image/jpeg':
				if (@imagetypes() & IMG_JPG) {
					$oSrcImg = @imagecreatefromjpeg($src) ;
				} else {
					$ermsg = 'JPEG images are not supported';
				}
				break;
			case 'image/png':
				if (@imagetypes() & IMG_PNG) {
					$oSrcImg = @imagecreatefrompng($src) ;
				} else {
					$ermsg = 'PNG images are not supported';
				}
				break;
			case 'image/wbmp':
				if (@imagetypes() & IMG_WBMP) {
					$oSrcImg = @imagecreatefromwbmp($src);
				} else {
					$ermsg = 'WBMP images are not supported';
				}
				break;
			default:
				$oSrcImg = false;
				$ermsg = $srcImgInfo['mime'].' images are not supported';
				break;
		}
		
		if ($oSrcImg &&  false != ($tmp = imagecreatetruecolor($width, $height))) {
			
			if (!imagecopyresampled($tmp, $oSrcImg, 0, 0, 0, 0, $width, $height, $srcImgInfo[0], $srcImgInfo[1])) {
				return false;
			}
		
			switch ($srcImgInfo['mime']) {
				case 'image/gif':
					imagegif($tmp, $src);
					break;
				case 'image/jpeg':
					imagejpeg($tmp, $src, $quality);
					break;
				case 'image/png':
					if (function_exists('imagesavealpha') && function_exists('imagealphablending')) {
						imagealphablending($tmp, false);
						imagesavealpha($tmp, true);
					}
					imagepng($tmp, $src);
					break;
				case 'image/wbmp':
					imagewbmp($tmp, $src);
					break;
			}
			
			imagedestroy($oSrcImg);
			imagedestroy($tmp);
		
			return true;
		
		}
		return false;
	}
	
	private function resize_imagick($src, $width, $height, $quality, $preserveExif) {
		try {
			$img = new imagick($src);
			
			if (strtoupper($img->getImageFormat()) === 'JPEG') {
				$img->setImageCompression(imagick::COMPRESSION_JPEG);
				$img->setImageCompressionQuality($quality);
				if (!$preserveExif) {
					try {
						$orientation = $img->getImageOrientation();
					} catch (ImagickException $e) {
						$orientation = 0;
					}
					$img->stripImage();
					if ($orientation) {
						$img->setImageOrientation($orientation);
					}
				}
			}
			
			$img->resizeImage($width, $height, Imagick::FILTER_LANCZOS, true);
			
			$result = $img->writeImage($src);
			
			$img->clear();
			$img->destroy();
			
			return $result ? true : false;
		} catch (Exception $e) {
			return false;
		}
	}
}
