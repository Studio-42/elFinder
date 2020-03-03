<?php

/**
 * elFinder Plugin AutoRotate
 * Auto rotation on file upload of JPEG file by EXIF Orientation.
 * ex. binding, configure on connector options
 *    $opts = array(
 *        'bind' => array(
 *            'upload.presave' => array(
 *                'Plugin.AutoRotate.onUpLoadPreSave'
 *            )
 *        ),
 *        // global configure (optional)
 *        'plugin' => array(
 *            'AutoRotate' => array(
 *                'enable'         => true,       // For control by volume driver
 *                'quality'        => 95,         // JPEG image save quality
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
 *                    'AutoRotate' => array(
 *                        'enable'         => true,       // For control by volume driver
 *                        'quality'        => 95,         // JPEG image save quality
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
class elFinderPluginAutoRotate extends elFinderPlugin
{

    public function __construct($opts)
    {
        $defaults = array(
            'enable' => true,       // For control by volume driver
            'quality' => 95,         // JPEG image save quality
            'offDropWith' => null,       // To disable it if it is dropped with pressing the meta key
            // Alt: 8, Ctrl: 4, Meta: 2, Shift: 1 - sum of each value
            // In case of using any key, specify it as an array
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
        if ($imageType !== IMAGETYPE_JPEG) {
            return false;
        }

        if (!$srcImgInfo) {
            $srcImgInfo = getimagesize($src);
        }

        return $this->rotate($volume, $src, $srcImgInfo, $opts['quality']);
    }

    private function rotate($volume, $src, $srcImgInfo, $quality)
    {
        if (!function_exists('exif_read_data')) {
            return false;
        }
        $degree = 0;
        $errlev =error_reporting();
        error_reporting($errlev ^ E_WARNING);
        $exif = exif_read_data($src);
        error_reporting($errlev);
        if ($exif && !empty($exif['Orientation'])) {
            switch ($exif['Orientation']) {
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
        if (!$degree)  {
            return false;
        }
        $opts = array(
            'degree' => $degree,
            'jpgQuality' => $quality,
            'checkAnimated' => true
        );
        return $volume->imageUtil('rotate', $src, $opts);
    }
}
