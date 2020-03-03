<?php

/**
 * elFinder Plugin Watermark
 * Print watermark on file upload.
 * ex. binding, configure on connector options
 *    $opts = array(
 *        'bind' => array(
 *            'upload.presave' => array(
 *                'Plugin.Watermark.onUpLoadPreSave'
 *            )
 *        ),
 *        // global configure (optional)
 *        'plugin' => array(
 *            'Watermark' => array(
 *                'enable'         => true,       // For control by volume driver
 *                'source'         => 'logo.png', // Path to Water mark image
 *                'ratio'          => 0.2,        // Ratio to original image (ratio > 0 and ratio <= 1)
 *                'position'       => 'RB',       // Position L(eft)/C(enter)/R(ight) and T(op)/M(edium)/B(ottom)
 *                'marginX'        => 5,          // Margin horizontal pixel
 *                'marginY'        => 5,          // Margin vertical pixel
 *                'quality'        => 95,         // JPEG image save quality
 *                'transparency'   => 70,         // Water mark image transparency ( other than PNG )
 *                'targetType'     => IMG_GIF|IMG_JPG|IMG_PNG|IMG_WBMP, // Target image formats ( bit-field )
 *                'targetMinPixel' => 200,        // Target image minimum pixel size
 *                'interlace'      => IMG_GIF|IMG_JPG, // Set interlacebit image formats ( bit-field )
 *                'offDropWith'    => null,       // Enabled by default. To disable it if it is dropped with pressing the meta key
 *                                                // Alt: 8, Ctrl: 4, Meta: 2, Shift: 1 - sum of each value
 *                                                // In case of using any key, specify it as an array
 *                'onDropWith'     => null        // Disabled by default. To enable it if it is dropped with pressing the meta key
 *                                                // Alt: 8, Ctrl: 4, Meta: 2, Shift: 1 - sum of each value
 *                                                // In case of using any key, specify it as an array
 *            )
 *        ),
 *        // each volume configure (optional)
 *        'roots' => array(
 *            array(
 *                'driver' => 'LocalFileSystem',
 *                'path'   => '/path/to/files/',
 *                'URL'    => 'http://localhost/to/files/'
 *                'plugin' => array(
 *                    'Watermark' => array(
 *                        'enable'         => true,       // For control by volume driver
 *                        'source'         => 'logo.png', // Path to Water mark image
 *                        'ratio'          => 0.2,        // Ratio to original image (ratio > 0 and ratio <= 1)
 *                        'position'       => 'RB',       // Position L(eft)/C(enter)/R(ight) and T(op)/M(edium)/B(ottom)
 *                        'marginX'        => 5,          // Margin horizontal pixel
 *                        'marginY'        => 5,          // Margin vertical pixel
 *                        'quality'        => 95,         // JPEG image save quality
 *                        'transparency'   => 70,         // Water mark image transparency ( other than PNG )
 *                        'targetType'     => IMG_GIF|IMG_JPG|IMG_PNG|IMG_WBMP, // Target image formats ( bit-field )
 *                        'targetMinPixel' => 200,        // Target image minimum pixel size
 *                        'interlace'      => IMG_GIF|IMG_JPG, // Set interlacebit image formats ( bit-field )
 *                        'offDropWith'    => null,       // Enabled by default. To disable it if it is dropped with pressing the meta key
 *                                                        // Alt: 8, Ctrl: 4, Meta: 2, Shift: 1 - sum of each value
 *                                                        // In case of using any key, specify it as an array
 *                        'onDropWith'     => null        // Disabled by default. To enable it if it is dropped with pressing the meta key
 *                                                        // Alt: 8, Ctrl: 4, Meta: 2, Shift: 1 - sum of each value
 *                                                        // In case of using any key, specify it as an array
 *                    )
 *                )
 *            )
 *        )
 *    );
 *
 * @package elfinder
 * @author  Naoki Sawada
 * @license New BSD
 */
class elFinderPluginWatermark extends elFinderPlugin
{

    private $watermarkImgInfo = null;

    public function __construct($opts)
    {
        $defaults = array(
            'enable' => true,       // For control by volume driver
            'source' => 'logo.png', // Path to Water mark image
            'ratio' => 0.2,        // Ratio to original image (ratio > 0 and ratio <= 1)
            'position' => 'RB',       // Position L(eft)/C(enter)/R(ight) and T(op)/M(edium)/B(ottom)
            'marginX' => 5,          // Margin horizontal pixel
            'marginY' => 5,          // Margin vertical pixel
            'quality' => 95,         // JPEG image save quality
            'transparency' => 70,         // Water mark image transparency ( other than PNG )
            'targetType' => IMG_GIF | IMG_JPG | IMG_PNG | IMG_WBMP, // Target image formats ( bit-field )
            'targetMinPixel' => 200,        // Target image minimum pixel size
            'interlace' => IMG_GIF | IMG_JPG, // Set interlacebit image formats ( bit-field )
            'offDropWith' => null,       // To disable it if it is dropped with pressing the meta key
            // Alt: 8, Ctrl: 4, Meta: 2, Shift: 1 - sum of each value
            // In case of using any key, specify it as an array
            'marginRight' => 0,          // Deprecated - marginX should be used
            'marginBottom' => 0,          // Deprecated - marginY should be used
            'disableWithContentSaveId' => true // Disable on URL upload with post data "contentSaveId"
        );

        $this->opts = array_merge($defaults, $opts);

    }

    public function onUpLoadPreSave(&$thash, &$name, $src, $elfinder, $volume)
    {
        if (!$src) {
            return false;
        }

        $opts = $this->getCurrentOpts($volume);

        if (!$this->iaEnabled($opts, $elfinder)) {
            return false;
        }

        $imageType = null;
        $srcImgInfo = null;
        if (extension_loaded('fileinfo') && function_exists('mime_content_type')) {
            $mime = mime_content_type($src);
            if (substr($mime, 0, 5) !== 'image') {
                return false;
            }
        }
        if (extension_loaded('exif') && function_exists('exif_imagetype')) {
            $imageType = exif_imagetype($src);
            if ($imageType === false) {
                return false;
            }
        } else {
            $srcImgInfo = getimagesize($src);
            if ($srcImgInfo === false) {
                return false;
            }
            $imageType = $srcImgInfo[2];
        }

        // check target image type
        $imgTypes = array(
            IMAGETYPE_GIF => IMG_GIF,
            IMAGETYPE_JPEG => IMG_JPEG,
            IMAGETYPE_PNG => IMG_PNG,
            IMAGETYPE_BMP => IMG_WBMP,
            IMAGETYPE_WBMP => IMG_WBMP
        );
        if (!isset($imgTypes[$imageType]) || !($opts['targetType'] & $imgTypes[$imageType])) {
            return false;
        }

        // check Animation Gif
        if ($imageType === IMAGETYPE_GIF && elFinder::isAnimationGif($src)) {
            return false;
        }
        // check Animation Png
        if ($imageType === IMAGETYPE_PNG && elFinder::isAnimationPng($src)) {
            return false;
        }
        // check water mark image
        if (!file_exists($opts['source'])) {
            $opts['source'] = dirname(__FILE__) . "/" . $opts['source'];
        }
        if (is_readable($opts['source'])) {
            $watermarkImgInfo = getimagesize($opts['source']);
            if (!$watermarkImgInfo) {
                return false;
            }
        } else {
            return false;
        }

        if (!$srcImgInfo) {
            $srcImgInfo = getimagesize($src);
        }

        $watermark = $opts['source'];
        $quality = $opts['quality'];
        $transparency = $opts['transparency'];

        // check target image size
        if ($opts['targetMinPixel'] > 0 && $opts['targetMinPixel'] > min($srcImgInfo[0], $srcImgInfo[1])) {
            return false;
        }

        $watermark_width = $watermarkImgInfo[0];
        $watermark_height = $watermarkImgInfo[1];

        // Specified as a ratio to the image size
        if ($opts['ratio'] && $opts['ratio'] > 0 && $opts['ratio'] <= 1) {
            $maxW = $srcImgInfo[0] * $opts['ratio'] - ($opts['marginX'] * 2);
            $maxH = $srcImgInfo[1] * $opts['ratio'] - ($opts['marginY'] * 2);
            $dx = $dy = 0;
            if (($maxW >= $watermarkImgInfo[0] && $maxH >= $watermarkImgInfo[0]) || ($maxW <= $watermarkImgInfo[0] && $maxH <= $watermarkImgInfo[0])) {
                $dx = abs($srcImgInfo[0] - $watermarkImgInfo[0]);
                $dy = abs($srcImgInfo[1] - $watermarkImgInfo[1]);
            } else if ($maxW < $watermarkImgInfo[0]) {
                $dx = -1;
            } else {
                $dy = -1;
            }
            if ($dx < $dy) {
                $ww = $maxW;
                $wh = $watermarkImgInfo[1] * ($ww / $watermarkImgInfo[0]);
            } else {
                $wh = $maxH;
                $ww = $watermarkImgInfo[0] * ($wh / $watermarkImgInfo[1]);
            }
            $watermarkImgInfo[0] = $ww;
            $watermarkImgInfo[1] = $wh;
        } else {
            $opts['ratio'] = null;
        }

        $opts['position'] = strtoupper($opts['position']);

        // Set vertical position
        if (strpos($opts['position'], 'T') !== false) {
            // Top
            $dest_x = $opts['marginX'];
        } else if (strpos($opts['position'], 'M') !== false) {
            // Middle
            $dest_x = ($srcImgInfo[0] - $watermarkImgInfo[0]) / 2;
        } else {
            // Bottom
            $dest_x = $srcImgInfo[0] - $watermarkImgInfo[0] - max($opts['marginBottom'], $opts['marginX']);
        }

        // Set horizontal position
        if (strpos($opts['position'], 'L') !== false) {
            // Left
            $dest_y = $opts['marginY'];
        } else if (strpos($opts['position'], 'C') !== false) {
            // Middle
            $dest_y = ($srcImgInfo[1] - $watermarkImgInfo[1]) / 2;
        } else {
            // Right
            $dest_y = $srcImgInfo[1] - $watermarkImgInfo[1] - max($opts['marginRight'], $opts['marginY']);
        }


        // check interlace
        $opts['interlace'] = ($opts['interlace'] & $imgTypes[$imageType]);

        // Repeated use of Imagick::compositeImage() may cause PHP to hang, so disable it
        //if (class_exists('Imagick', false)) {
        //    return $this->watermarkPrint_imagick($src, $watermark, $dest_x, $dest_y, $quality, $transparency, $watermarkImgInfo, $opts);
        //} else {
            elFinder::expandMemoryForGD(array($watermarkImgInfo, $srcImgInfo));
            return $this->watermarkPrint_gd($src, $watermark, $dest_x, $dest_y, $quality, $transparency, $watermarkImgInfo, $srcImgInfo, $opts);
        //}
    }

    private function watermarkPrint_imagick($src, $watermarkSrc, $dest_x, $dest_y, $quality, $transparency, $watermarkImgInfo, $opts)
    {

        try {

            // Open the original image
            $img = new Imagick($src);

            // Open the watermark
            $watermark = new Imagick($watermarkSrc);

            // zoom
            if ($opts['ratio']) {
                $watermark->scaleImage($watermarkImgInfo[0], $watermarkImgInfo[1]);
            }

            // Set transparency
            if (strtoupper($watermark->getImageFormat()) !== 'PNG') {
                $watermark->setImageOpacity($transparency / 100);
            }

            // Overlay the watermark on the original image
            $img->compositeImage($watermark, imagick::COMPOSITE_OVER, $dest_x, $dest_y);

            // Set quality
            if (strtoupper($img->getImageFormat()) === 'JPEG') {
                $img->setImageCompression(imagick::COMPRESSION_JPEG);
                $img->setCompressionQuality($quality);
            }

            // set interlace
            $opts['interlace'] && $img->setInterlaceScheme(Imagick::INTERLACE_PLANE);

            $result = $img->writeImage($src);

            $img->clear();
            $img->destroy();
            $watermark->clear();
            $watermark->destroy();

            return $result ? true : false;
        } catch (Exception $e) {
            $ermsg = $e->getMessage();
            $ermsg && trigger_error($ermsg);
            return false;
        }
    }

    private function watermarkPrint_gd($src, $watermark, $dest_x, $dest_y, $quality, $transparency, $watermarkImgInfo, $srcImgInfo, $opts)
    {

        $watermark_width = $watermarkImgInfo[0];
        $watermark_height = $watermarkImgInfo[1];

        $ermsg = '';
        switch ($watermarkImgInfo['mime']) {
            case 'image/gif':
                if (imagetypes() & IMG_GIF) {
                    $oWatermarkImg = imagecreatefromgif($watermark);
                } else {
                    $ermsg = 'GIF images are not supported as watermark image';
                }
                break;
            case 'image/jpeg':
                if (imagetypes() & IMG_JPG) {
                    $oWatermarkImg = imagecreatefromjpeg($watermark);
                } else {
                    $ermsg = 'JPEG images are not supported as watermark image';
                }
                break;
            case 'image/png':
                if (imagetypes() & IMG_PNG) {
                    $oWatermarkImg = imagecreatefrompng($watermark);
                } else {
                    $ermsg = 'PNG images are not supported as watermark image';
                }
                break;
            case 'image/wbmp':
                if (imagetypes() & IMG_WBMP) {
                    $oWatermarkImg = imagecreatefromwbmp($watermark);
                } else {
                    $ermsg = 'WBMP images are not supported as watermark image';
                }
                break;
            default:
                $oWatermarkImg = false;
                $ermsg = $watermarkImgInfo['mime'] . ' images are not supported as watermark image';
                break;
        }


        if (!$ermsg) {
            // zoom
            if ($opts['ratio']) {
                $tmpImg = imagecreatetruecolor($watermarkImgInfo[0], $watermarkImgInfo[1]);
                imagealphablending($tmpImg, false);
                imagesavealpha($tmpImg, true);
                imagecopyresampled($tmpImg, $oWatermarkImg, 0, 0, 0, 0, $watermarkImgInfo[0], $watermarkImgInfo[1], imagesx($oWatermarkImg), imagesy($oWatermarkImg));
                imageDestroy($oWatermarkImg);
                $oWatermarkImg = $tmpImg;
                $tmpImg = null;
            }

            switch ($srcImgInfo['mime']) {
                case 'image/gif':
                    if (imagetypes() & IMG_GIF) {
                        $oSrcImg = imagecreatefromgif($src);
                    } else {
                        $ermsg = 'GIF images are not supported as source image';
                    }
                    break;
                case 'image/jpeg':
                    if (imagetypes() & IMG_JPG) {
                        $oSrcImg = imagecreatefromjpeg($src);
                    } else {
                        $ermsg = 'JPEG images are not supported as source image';
                    }
                    break;
                case 'image/png':
                    if (imagetypes() & IMG_PNG) {
                        $oSrcImg = imagecreatefrompng($src);
                    } else {
                        $ermsg = 'PNG images are not supported as source image';
                    }
                    break;
                case 'image/wbmp':
                    if (imagetypes() & IMG_WBMP) {
                        $oSrcImg = imagecreatefromwbmp($src);
                    } else {
                        $ermsg = 'WBMP images are not supported as source image';
                    }
                    break;
                default:
                    $oSrcImg = false;
                    $ermsg = $srcImgInfo['mime'] . ' images are not supported as source image';
                    break;
            }
        }

        if ($ermsg || false === $oSrcImg || false === $oWatermarkImg) {
            $ermsg && trigger_error($ermsg);
            return false;
        }

        if ($srcImgInfo['mime'] === 'image/png') {
            if (function_exists('imagecolorallocatealpha')) {
                $bg = imagecolorallocatealpha($oSrcImg, 255, 255, 255, 127);
                imagefill($oSrcImg, 0, 0, $bg);
            }
        }

        if ($watermarkImgInfo['mime'] === 'image/png') {
            imagecopy($oSrcImg, $oWatermarkImg, $dest_x, $dest_y, 0, 0, $watermark_width, $watermark_height);
        } else {
            imagecopymerge($oSrcImg, $oWatermarkImg, $dest_x, $dest_y, 0, 0, $watermark_width, $watermark_height, $transparency);
        }

        // set interlace
        $opts['interlace'] && imageinterlace($oSrcImg, true);

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
