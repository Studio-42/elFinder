<?php

class elFinderPluginWatermark {

	private $opts = array();
	private $watermarkImgInfo = null;

	public function __construct($opts) {
		$defaults = array(
			'enable'         => true,       // For control by volume driver
			'source'         => 'logo.png', // Path to Water mark image
			'marginRight'    => 5,          // Margin right pixel
			'marginBottom'   => 5,          // Margin bottom pixel
			'quality'        => 90,         // JPEG image save quality
			'transparency'   => 90,         // Water mark image transparency ( other than PNG )
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
		
		$srcImgInfo = @getimagesize($src);
		if ($srcImgInfo === false) {
			return false;
		}
		
		// check water mark image
		if (! file_exists($opts['source'])) {
			$opts['source'] = dirname(__FILE__) . "/" . $opts['source'];
		}
		if (is_readable($opts['source'])) {
			$watermarkImgInfo = @getimagesize($opts['source']);
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
			IMAGETYPE_GIF => IMG_GIF,
			IMAGETYPE_JPEG => IMG_JPEG,
			IMAGETYPE_PNG => IMG_PNG,
			IMAGETYPE_WBMP => IMG_WBMP,
		);
		if (! ($opts['targetType'] & $imgTypes[$srcImgInfo[2]])) {
			return false;
		}
		
		// check target image size
		if ($opts['targetMinPixel'] > 0 && $opts['targetMinPixel'] > min($srcImgInfo[0], $srcImgInfo[1])) {
			return false;
		}
		
		$ermsg = '';
		switch ($watermarkImgInfo['mime']) {
			case 'image/gif':
				if (@imagetypes() & IMG_GIF) {
					$oWatermarkImg = @imagecreatefromgif($watermark);
				} else {
					$ermsg = 'GIF images are not supported';
				}
				break;
			case 'image/jpeg':
				if (@imagetypes() & IMG_JPG) {
					$oWatermarkImg = @imagecreatefromjpeg($watermark) ;
				} else {
					$ermsg = 'JPEG images are not supported';
				}
				break;
			case 'image/png':
				if (@imagetypes() & IMG_PNG) {
					$oWatermarkImg = @imagecreatefrompng($watermark) ;
				} else {
					$ermsg = 'PNG images are not supported';
				}
				break;
			case 'image/wbmp':
				if (@imagetypes() & IMG_WBMP) {
					$oWatermarkImg = @imagecreatefromwbmp($watermark);
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
		}
		
		if ($ermsg || false === $oSrcImg || false === $oWatermarkImg) {
			return false;
		}
		
		$watermark_width = $watermarkImgInfo[0];
		$watermark_height = $watermarkImgInfo[1];
		$dest_x = $srcImgInfo[0] - $watermark_width - $marginLeft;
		$dest_y = $srcImgInfo[1] - $watermark_height - $marginBottom;
		
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
