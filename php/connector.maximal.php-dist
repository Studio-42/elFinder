<?php

error_reporting(0); // Set E_ALL for debuging

// // Optional exec path settings (Default is called with command name only)
// define('ELFINDER_TAR_PATH',      '/PATH/TO/tar');
// define('ELFINDER_GZIP_PATH',     '/PATH/TO/gzip');
// define('ELFINDER_BZIP2_PATH',    '/PATH/TO/bzip2');
// define('ELFINDER_XZ_PATH',       '/PATH/TO/xz');
// define('ELFINDER_ZIP_PATH',      '/PATH/TO/zip');
// define('ELFINDER_UNZIP_PATH',    '/PATH/TO/unzip');
// define('ELFINDER_RAR_PATH',      '/PATH/TO/rar');
// define('ELFINDER_UNRAR_PATH',    '/PATH/TO/unrar');
// define('ELFINDER_7Z_PATH',       '/PATH/TO/7za');
// define('ELFINDER_CONVERT_PATH',  '/PATH/TO/convert');
// define('ELFINDER_IDENTIFY_PATH', '/PATH/TO/identify');
// define('ELFINDER_EXIFTRAN_PATH', '/PATH/TO/exiftran');
// define('ELFINDER_JPEGTRAN_PATH', '/PATH/TO/jpegtran');
// define('ELFINDER_FFMPEG_PATH',   '/PATH/TO/ffmpeg');

// define('ELFINDER_CONNECTOR_URL', 'URL to this connector script');  // see elFinder::getConnectorUrl()

// define('ELFINDER_DEBUG_ERRORLEVEL', -1); // Error reporting level of debug mode

// // To Enable(true) handling of PostScript files by ImageMagick
// // It is disabled by default as a countermeasure 
// // of Ghostscript multiple -dSAFER sandbox bypass vulnerabilities
// // see https://www.kb.cert.org/vuls/id/332928
// define('ELFINDER_IMAGEMAGICK_PS', true);
// ===============================================

// // load composer autoload before load elFinder autoload If you need composer
// // You need to run the composer command in the php directory.
is_readable('./vendor/autoload.php') && require './vendor/autoload.php';

// // elFinder autoload
require './autoload.php';
// ===============================================

// // Enable FTP connector netmount
elFinder::$netDrivers['ftp'] = 'FTP';
// ===============================================

// // Required for Dropbox network mount
// // Installation by composer
// // `composer require kunalvarma05/dropbox-php-sdk` on php directory
// // Enable network mount
// elFinder::$netDrivers['dropbox2'] = 'Dropbox2';
// // Dropbox2 Netmount driver need next two settings. You can get at https://www.dropbox.com/developers/apps
// // AND require register redirect url to "YOUR_CONNECTOR_URL?cmd=netmount&protocol=dropbox2&host=1"
// define('ELFINDER_DROPBOX_APPKEY',    '');
// define('ELFINDER_DROPBOX_APPSECRET', '');
// ===============================================

// // Required for Google Drive network mount
// // Installation by composer
// // `composer require google/apiclient:^2.0` on php directory
// // Enable network mount
// elFinder::$netDrivers['googledrive'] = 'GoogleDrive';
// // GoogleDrive Netmount driver need next two settings. You can get at https://console.developers.google.com
// // AND require register redirect url to "YOUR_CONNECTOR_URL?cmd=netmount&protocol=googledrive&host=1"
// define('ELFINDER_GOOGLEDRIVE_CLIENTID',     '');
// define('ELFINDER_GOOGLEDRIVE_CLIENTSECRET', '');
// // Required case when Google API is NOT added via composer
// define('ELFINDER_GOOGLEDRIVE_GOOGLEAPICLIENT', '/path/to/google-api-php-client/vendor/autoload.php');
// ===============================================

// // Required for Google Drive network mount with Flysystem
// // Installation by composer
// // `composer require nao-pon/flysystem-google-drive:~1.1 nao-pon/elfinder-flysystem-driver-ext` on php directory
// // Enable network mount
// elFinder::$netDrivers['googledrive'] = 'FlysystemGoogleDriveNetmount';
// // GoogleDrive Netmount driver need next two settings. You can get at https://console.developers.google.com
// // AND require register redirect url to "YOUR_CONNECTOR_URL?cmd=netmount&protocol=googledrive&host=1"
// define('ELFINDER_GOOGLEDRIVE_CLIENTID',     '');
// define('ELFINDER_GOOGLEDRIVE_CLIENTSECRET', '');
// // And "php/.tmp" directory must exist and be writable by PHP.
// ===============================================

// // Required for One Drive network mount
// //  * cURL PHP extension required
// //  * HTTP server PATH_INFO supports required
// // Enable network mount
// elFinder::$netDrivers['onedrive'] = 'OneDrive';
// // GoogleDrive Netmount driver need next two settings. You can get at https://dev.onedrive.com
// // AND require register redirect url to "YOUR_CONNECTOR_URL/netmount/onedrive/1"
// define('ELFINDER_ONEDRIVE_CLIENTID',     '');
// define('ELFINDER_ONEDRIVE_CLIENTSECRET', '');
// ===============================================

// // Required for Box network mount
// //  * cURL PHP extension required
// // Enable network mount
// elFinder::$netDrivers['box'] = 'Box';
// // Box Netmount driver need next two settings. You can get at https://developer.box.com
// // AND require register redirect url to "YOUR_CONNECTOR_URL?cmd=netmount&protocol=box&host=1"
// define('ELFINDER_BOX_CLIENTID',     '');
// define('ELFINDER_BOX_CLIENTSECRET', '');
// ===============================================


// // Zoho Office Editor APIKey
// // https://www.zoho.com/docs/help/office-apis.html
// define('ELFINDER_ZOHO_OFFICE_APIKEY', '');
// ===============================================

// // Online converter (online-convert.com) APIKey
// // https://apiv2.online-convert.com/docs/getting_started/api_key.html
// define('ELFINDER_ONLINE_CONVERT_APIKEY', '');
// ===============================================

// // Zip Archive editor
// // Installation by composer
// // `composer require nao-pon/elfinder-flysystem-ziparchive-netmount` on php directory
// define('ELFINDER_DISABLE_ZIPEDITOR', false); // set `true` to disable zip editor
// ===============================================

/**
 * Simple function to demonstrate how to control file access using "accessControl" callback.
 * This method will disable accessing files/folders starting from '.' (dot)
 *
 * @param  string    $attr    attribute name (read|write|locked|hidden)
 * @param  string    $path    absolute file path
 * @param  string    $data    value of volume option `accessControlData`
 * @param  object    $volume  elFinder volume driver object
 * @param  bool|null $isDir   path is directory (true: directory, false: file, null: unknown)
 * @param  string    $relpath file path relative to volume root directory started with directory separator
 * @return bool|null
 **/
function access($attr, $path, $data, $volume, $isDir, $relpath) {
    $basename = basename($path);
    return $basename[0] === '.'                  // if file/folder begins with '.' (dot)
             && strlen($relpath) !== 1           // but with out volume root
        ? !($attr == 'read' || $attr == 'write') // set read+write to false, other (locked+hidden) set to true
        :  null;                                 // else elFinder decide it itself
}

/**
 * Simple debug function
 * Usage: debug($anyVal[, $anyVal2 ...]);
 */
function debug() {
    $arg = func_get_args();
    ob_start();
    foreach($arg as $v) {
        var_dump($v);
    }
    $o = ob_get_contents();
    ob_end_clean();
    file_put_contents('.debug.txt', $o, FILE_APPEND);
}

/**
 * Simple logger function.
 * Demonstrate how to work with elFinder event api.
 *
 * @package elFinder
 * @author Dmitry (dio) Levashov
 **/
class elFinderSimpleLogger {

    /**
     * Log file path
     *
     * @var string
     **/
    protected $file = '';

    /**
     * constructor
     *
     * @return void
     * @author Dmitry (dio) Levashov
     **/
    public function __construct($path)
    {
        $this->file = $path;
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir);
        }
    }
    
    /**
     * Create log record
     *
     * @param  string               $cmd       command name
     * @param  array                $result    command result
     * @param  array                $args      command arguments from client
     * @param  elFinder             $elfinder  elFinder instance
     * @param  elFinderVolumeDriver $volume    current volume driver instance
     * @return void|true
     * @author Dmitry (dio) Levashov
     **/
    public function log($cmd, $result, $args, $elfinder, $volume)
    {
        $log = $cmd.' ['.date('d.m H:s')."]\n";
        
        if (!empty($result['error'])) {
            $log .= "\tERROR: ".implode(' ', $result['error'])."\n";
        }
        
        if (!empty($result['warning'])) {
            $log .= "\tWARNING: ".implode(' ', $result['warning'])."\n";
        }
        
        if (!empty($result['removed'])) {
            foreach ($result['removed'] as $file) {
                // removed file contain additional field "realpath"
                $log .= "\tREMOVED: ".$file['realpath']."\n";
            }
        }
        
        if (!empty($result['added'])) {
            foreach ($result['added'] as $file) {
                $log .= "\tADDED: ".$elfinder->realpath($file['hash'])."\n";
            }
        }
        
        if (!empty($result['changed'])) {
            foreach ($result['changed'] as $file) {
                $log .= "\tCHANGED: ".$elfinder->realpath($file['hash'])."\n";
            }
        }
        
        $this->write($log);
    }

    /**
     * Write log into file
     *
     * @param  string  $log  log record
     * @return void
     * @author Dmitry (dio) Levashov
     **/
    protected function write($log)
    {
        
        if (($fp = @fopen($this->file, 'a'))) {
            fwrite($fp, $log."\n");
            fclose($fp);
        }
    }

} // END class
// Make logger instance
$logger = new elFinderSimpleLogger('.log.txt');

// Documentation for connector options:
// https://github.com/Studio-42/elFinder/wiki/Connector-configuration-options
$opts = array(
    'debug' => true, // enable debug mode
    'roots' => array(
        // Items volume
        array(
            'driver'        => 'LocalFileSystem',           // driver for accessing file system (REQUIRED)
            'path'          => '../files/',                 // path to files (REQUIRED)
            'URL'           => dirname($_SERVER['PHP_SELF']) . '/../files/', // URL to files (REQUIRED)
            'trashHash'     => 't1_Lw',                     // elFinder's hash of trash folder
            'winHashFix'    => DIRECTORY_SEPARATOR !== '/', // to make hash same to Linux one on windows too
            'uploadDeny'    => array('all'),                // All Mimetypes not allowed to upload
            'uploadAllow'   => array('image/x-ms-bmp', 'image/gif', 'image/jpeg', 'image/png', 'image/x-icon', 'text/plain'), // Mimetype `image` and `text/plain` allowed to upload
            'uploadOrder'   => array('deny', 'allow'),      // allowed Mimetype `image` and `text/plain` only
            'accessControl' => 'access',                    // disable and hide dot starting files (OPTIONAL)
            'attributes'    => array(                       // additional thumbnail directories
                                'pattern' => '~^/\.tmb(?:Cloud|Netmount)$~',
                                'read'    => false,
                                'write'   => false,
                                'locked'  => true,
                                'hidden'  => true ),
        ),
        // Trash volume
        array(
            'id'            => '1',
            'driver'        => 'Trash',
            'path'          => '../files/.trash/',
            'tmbURL'        => dirname($_SERVER['PHP_SELF']) . '/../files/.trash/.tmb/',
            'winHashFix'    => DIRECTORY_SEPARATOR !== '/', // to make hash same to Linux one on windows too
            'uploadDeny'    => array('all'),                // Recomend the same settings as the original volume that uses the trash
            'uploadAllow'   => array('image/x-ms-bmp', 'image/gif', 'image/jpeg', 'image/png', 'image/x-icon', 'text/plain'), // Same as above
            'uploadOrder'   => array('deny', 'allow'),      // Same as above
            'accessControl' => 'access',                    // Same as above
        ),
    ),
    // some bind functions
    'bind' => array(
        // enable logger
        // '*' => array($logger, 'log'),
        'mkdir mkfile rename duplicate upload rm paste' => array($logger, 'log'),
        // enable plugins
        'archive.pre ls.pre mkdir.pre mkfile.pre rename.pre upload.pre' => array(
            'Plugin.Normalizer.cmdPreprocess',
            'Plugin.Sanitizer.cmdPreprocess'
        ),
        'upload.presave' => array(
            'Plugin.AutoRotate.onUpLoadPreSave',
            'Plugin.AutoResize.onUpLoadPreSave',
            'Plugin.Watermark.onUpLoadPreSave',
            'Plugin.Normalizer.onUpLoadPreSave',
            'Plugin.Sanitizer.onUpLoadPreSave',
        ),
    ),
    // volume options of netmount volumes
    'optionsNetVolumes' => array(
        '*' => array( // "*" is all of netmount volumes
            'tmbURL'    => dirname($_SERVER['PHP_SELF']) . '/../files/.tmbNetmount/',
            'tmbPath'   => '../files/.tmbNetmount',
            'tmbGcMaxlifeHour' => 1,  // 1 hour
            'tmbGcPercentage'  => 10, // 10 execute / 100 tmb querys
            'plugin' => array(
                'AutoResize' => array(
                    'enable' => false
                ),
                'Watermark' => array(
                    'enable' => false
                ),
                'Normalizer' => array(
                    'enable' => false
                ),
                'Sanitizer' => array(
                    'enable' => false
                )
            ),
        )
    ),
);

// Extended other volume types
// To get an access token or refresh token, see the elFinder wiki.
// https://github.com/Studio-42/elFinder/wiki/How-to-get-OAuth-token

// Thumbnail settings for cloud volumes
$tmbConfig = array(
    'tmbPath'          => '../files/.tmbCloud',
    'tmbURL'           => dirname($_SERVER['PHP_SELF']) . '/../files/.tmbCloud/',
    'tmbGcMaxlifeHour' => 2160, // 90 days
    'tmbGcPercentage'  => 5,    // 5 execute / 100 tmb querys
); 

// MySQL config
$mySqlConfig = array(
    'path'          => 1,
    'host'          => '127.0.0.1',
    'user'          => '',    // @String DB user name
    'pass'          => '',    // @String DB user password
    'db'            => '',    // @String Database name
    'uploadMaxSize' => '10M', // It should be less than "max_allowed_packet" value of MySQL setting
);
// MySQL volume
$opts['roots'][] = array_merge($tmbConfig, $mySqlConfig, array(
    'driver'        => 'MySQL',
    'trashHash'     => 'tm1_MQ', // set trash to MySQL trash (tm1_) 1 (MQ)
    'files_table'   => 'elfinder_file',
));
// MySQL trash volume
$opts['roots'][] = array_merge($tmbConfig, $mySqlConfig, array(
    'id'            => '1', // volume id became "tm1_"
    'alias'         => 'DB Trash',
    'driver'        => 'TrashMySQL',
    'files_table'   => 'elfinder_trash',
));

// Volume group
$opts['roots'][] = array(
    'id'           => '1', // volume id became "g1_"
    'alias'        => 'CloudVolumes',
    'driver'       => 'Group',
    'rootCssClass' => 'elfinder-navbar-root-network' // set volume icon
);

// FTP volume
$opts['roots'][] = array_merge($tmbConfig, array(
    'phash'  => 'g1_Lw', // set parent to Volume group (g1_) root "/" (Lw)
    'driver' => 'FTP',
    'host'   => 'ftp.jaist.ac.jp',
    'user'   => 'anonymous',
    'path'   => '/',
    'owner'  => false,
));

// To enable the following cloud volumes, first complete the steps 
// for enabling each network-mounted volume described earlier in this file.

// Box volume
// Require constant "ELFINDER_BOX_CLIENTID" and "ELFINDER_BOX_CLIENTSECRET"
$opts['roots'][] = array_merge($tmbConfig, array(
    'phash'       => 'g1_Lw', // set parent to Volume group (g1_) root "/" (Lw)
    'driver'      => 'Box',
    'path'        => '/', // or folder id as root
    'accessToken' => '',  // @JSON String access token including refresh token
));

// Dropbox volume
// Require constant "ELFINDER_DROPBOX_APPKEY" and "ELFINDER_DROPBOX_APPSECRET"
$opts['roots'][] = array_merge($tmbConfig, array(
    'phash'        => 'g1_Lw', // set parent to Volume group (g1_) root "/" (Lw)
    'driver'       => 'Dropbox2',
    'path'         => '/', // or folder path as root
    'access_token' => '',  // @String your access token
));

// GoogleDrive volume with refresh token
// Require constant "ELFINDER_GOOGLEDRIVE_CLIENTID" and "ELFINDER_GOOGLEDRIVE_CLIENTSECRET"
$opts['roots'][] = array_merge($tmbConfig, array(
    'phash'         => 'g1_Lw', // set parent to Volume group (g1_) root "/" (Lw)
    'driver'        => 'GoogleDrive',
    'path'          => '/', // or folder id as root
    'refresh_token' => '',  // @String your refresh token
));

// GoogleDrive volume with service account
// Require constant "ELFINDER_GOOGLEDRIVE_CLIENTID" and "ELFINDER_GOOGLEDRIVE_CLIENTSECRET"
$opts['roots'][] = array_merge($tmbConfig, array(
    'phash'                    => 'g1_Lw', // set parent to Volume group (g1_) root "/" (Lw)
    'driver'                   => 'GoogleDrive',
    'path'                     => '/', // or folder id as root
    'serviceAccountConfigFile' => '',  // @String path to config json file
));

// OneDrive volume
// Require constant "ELFINDER_ONEDRIVE_CLIENTID" and "ELFINDER_ONEDRIVE_CLIENTSECRET"
$opts['roots'][] = array_merge($tmbConfig, array(
    'phash'       => 'g1_Lw', // set parent to Volume group (g1_) root "/" (Lw)
    'driver'      => 'OneDrive',
    'path'        => '/', // or folder id as root
    'accessToken' => '',  // @JSON String access token including refresh token
));


// run elFinder
$connector = new elFinderConnector(new elFinder($opts));
$connector->run();

