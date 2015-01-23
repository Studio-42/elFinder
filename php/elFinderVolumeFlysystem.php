<?php
use League\Flysystem\Util;
use League\Flysystem\FilesystemInterface;

/**
 * elFinder driver for Flysytem (https://github.com/thephpleague/flysystem)
 *
 * @author Barry vd. Heuvel
 * */
class elFinderVolumeFlysystem extends elFinderVolumeDriver {

    /**
     * Driver id
     * Must be started from letter and contains [a-z0-9]
     * Used as part of volume id
     *
     * @var string
     **/
    protected $driverId = 'fls';

    /** @var FilesystemInterface $fs */
    protected $fs;

    /**
     * Constructor
     * Extend options with required fields
     *
     **/
    public function __construct()
    {
        $opts = array(
            'filesystem' => null,
        );

        $this->options = array_merge($this->options, $opts);
    }

    public function mount(array $opts)
    {
        // If path is not set, use the root
        if (!isset($opts['path']) || $opts['path'] === '') {
            $opts['path'] = '/';
        }

        return parent::mount($opts);
    }

    /**
     * Find the icon based on the used Adapter
     *
     * @return string
     */
    protected function getIcon()
    {
        try {
            $adapter = $this->fs->getAdapter();
        } catch (\Exception $e) {
            $adapter = null;
        }

        if ($adapter instanceof League\Flysystem\Adapter\Local) {
            $icon = 'volume_icon_local.png';
        } elseif ($adapter instanceof League\Flysystem\Adapter\AbstractFtpAdapter) {
            $icon = 'volume_icon_ftp.png';
        } elseif ($adapter instanceof League\Flysystem\Dropbox\DropboxAdapter) {
            $icon = 'volume_icon_dropbox.png';
        } else {
            $icon = 'volume_icon_flysystem.png';
        }

        $parentUrl = defined('ELFINDER_IMG_PARENT_URL')? (rtrim(ELFINDER_IMG_PARENT_URL, '/').'/') : '';
        return $parentUrl . 'img/' . $icon;
    }

    /**
     * Prepare driver before mount volume.
     * Return true if volume is ready.
     *
     * @return bool
     **/
    protected function init()
    {
        $this->fs = $this->options['filesystem'];
        if (!($this->fs instanceof FilesystemInterface)) {
            return $this->setError('A filesystem instance is required');
        }

        $this->options['icon'] = $this->options['icon'] ?: $this->getIcon();
        $this->root = $this->options['path'];

        return true;
    }

    /**
     * Return parent directory path
     *
     * @param  string  $path  file path
     * @return string
     **/
    protected function _dirname($path)
    {
        return Util::dirname($path) ?: '/';
    }

    /**
     * Return normalized path
     *
     * @param  string  $path  path
     * @return string
     **/
    protected function _normpath($path)
    {
        return $path;
    }

    /**
     * Return stat for given path.
     * Stat contains following fields:
     * - (int)    size    file size in b. required
     * - (int)    ts      file modification time in unix time. required
     * - (string) mime    mimetype. required for folders, others - optionally
     * - (bool)   read    read permissions. required
     * - (bool)   write   write permissions. required
     * - (bool)   locked  is object locked. optionally
     * - (bool)   hidden  is object hidden. optionally
     * - (string) alias   for symlinks - link target path relative to root path. optionally
     * - (string) target  for symlinks - link target path. optionally
     *
     * If file does not exists - returns empty array or false.
     *
     * @param  string  $path    file path
     * @return array|false
     **/
    protected function _stat($path)
    {
        $stat = array(
            'size' => 0,
            'ts' => time(),
            'read' => true,
            'write' => true,
            'locked' => false,
            'hidden' => false,
            'mime' => 'directory',
        );

        // If root, just return from above
        if ($this->root == $path) {
            $stat['name'] = $this->root;
            return $stat;
        }

        // If not exists, return empty
        if ( !$this->fs->has($path)) {
            return array();
        }

        // Check if file, if so, check mimetype
        $meta = $this->fs->getMetadata($path);
        if ($meta['type'] == 'file') {
            $stat['mime'] = $this->fs->getMimetype($path);
        }

        // Get timestamp/size
        $stat['ts'] = $this->fs->getTimestamp($path);
        $stat['size'] = $this->fs->getSize($path);

        return $stat;
    }

    /***************** file stat ********************/

    /**
     * Return true if path is dir and has at least one childs directory
     *
     * @param  string  $path  dir path
     * @return bool
     **/
    protected function _subdirs($path)
    {
        return count($this->fs->listContents($path)) > 0;
    }

    /**
     * Return object width and height
     * Usually used for images, but can be realize for video etc...
     *
     * @param  string  $path  file path
     * @param  string  $mime  file mime type
     * @return string
     **/
    protected function _dimensions($path, $mime)
    {
        return false;
    }

    /******************** file/dir content *********************/

    /**
     * Return files list in directory
     *
     * @param  string  $path  dir path
     * @return array
     **/
    protected function _scandir($path)
    {
        $paths = array();
        foreach ($this->fs->listContents($path, false) as $object) {
            $paths[] = $object['path'];
        }
        return $paths;
    }

    /**
     * Open file and return file pointer
     *
     * @param  string  $path  file path
     * @param  string  $mode
     * @return resource|false
     **/
    protected function _fopen($path, $mode="rb")
    {
        return $this->fs->readStream($path);
    }

    /**
     * Close opened file
     *
     * @param  resource  $fp    file pointer
     * @param  string    $path  file path
     * @return bool
     **/
    protected function _fclose($fp, $path='')
    {
        return @fclose($fp);
    }

    /********************  file/dir manipulations *************************/

    /**
     * Create dir and return created dir path or false on failed
     *
     * @param  string  $path  parent dir path
     * @param  string  $name  new directory name
     * @return string|bool
     **/
    protected function _mkdir($path, $name)
    {
        $path = $this->_joinPath($path, $name);

        if ($this->fs->createDir($path)) {
            return $path;
        }

        return false;
    }

    /**
     * Create file and return it's path or false on failed
     *
     * @param  string  $path  parent dir path
     * @param string  $name  new file name
     * @return string|bool
     **/
    protected function _mkfile($path, $name)
    {
        $path = $this->_joinPath($path, $name);

        if ($this->fs->write($path, '')) {
            return $path;
        }

        return false;
    }

    /**
     * Copy file into another file
     *
     * @param  string  $source     source file path
     * @param  string  $target  target directory path
     * @param  string  $name       new file name
     * @return bool
     **/
    protected function _copy($source, $target, $name)
    {
        return $this->fs->copy($source, $this->_joinPath($target, $name));
    }

    /**
     * Move file into another parent dir.
     * Return new file path or false.
     *
     * @param  string  $source  source file path
     * @param  string  $target  target dir path
     * @param  string  $name    file name
     * @return string|bool
     **/
    protected function _move($source, $target, $name)
    {
        $path = $this->_joinPath($target, $name);

        if ($this->fs->rename($source, $path)) {
            return $path;
        }

        return false;
    }

    /**
     * Remove file
     *
     * @param  string  $path  file path
     * @return bool
     **/
    protected function _unlink($path)
    {
        return $this->fs->delete($path);
    }

    /**
     * Remove dir
     *
     * @param  string  $path  dir path
     * @return bool
     **/
    protected function _rmdir($path)
    {
        return $this->fs->deleteDir($path);
    }

    /**
     * Create new file and write into it from file pointer.
     * Return new file path or false on error.
     *
     * @param  resource  $fp   file pointer
     * @param  string    $dir  target dir path
     * @param  string    $name file name
     * @param  array     $stat file stat (required by some virtual fs)
     * @return bool|string
     **/
    protected function _save($fp, $dir, $name, $stat)
    {
        $path = $this->_joinPath($dir, $name);

        if ($this->fs->writeStream($path, $fp)) {
            return $path;
        }

        return false;
    }

    /**
     * Get file contents
     *
     * @param  string  $path  file path
     * @return string|false
     **/
    protected function _getContents($path)
    {
        return $this->fs->read($path);
    }

    /**
     * Write a string to a file
     *
     * @param  string  $path     file path
     * @param  string  $content  new file content
     * @return bool
     **/
    protected function _filePutContents($path, $content)
    {
        return $this->fs->update($path, $content);
    }

    /*********************** paths/urls *************************/


    /**
     * Return file name
     *
     * @param  string  $path  file path
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _basename($path) {

        return basename($path);
    }

    /**
     * Join dir name and file name and return full path
     *
     * @param  string  $dir
     * @param  string  $name
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _joinPath($dir, $name)
    {
        return $dir.$this->separator.$name;
    }

    /**
     * Return file path related to root dir
     *
     * @param  string  $path  file path
     * @return string
     **/
    protected function _relpath($path)
    {
        return $path;
    }

    /**
     * Convert path related to root dir into real path
     *
     * @param  string  $path  file path
     * @return string
     **/
    protected function _abspath($path)
    {
        return $path;
    }

    /**
     * Return fake path started from root dir
     *
     * @param  string  $path  file path
     * @return string
     **/
    protected function _path($path)
    {
        return $path;
    }

    /**
     * Return true if $path is children of $parent
     *
     * @param  string  $path    path to check
     * @param  string  $parent  parent path
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _inpath($path, $parent)
    {
        return $path == $parent || strpos($path, $parent.'/') === 0;
    }

    /**
     * Create symlink
     *
     * @param  string  $source     file to link to
     * @param  string  $targetDir  folder to create link in
     * @param  string  $name       symlink name
     * @return bool
     **/
    protected function _symlink($source, $targetDir, $name) {
        return false;
    }

    /**
     * Extract files from archive
     *
     * @param  string  $path file path
     * @param  array   $arc  archiver options
     * @return bool
     **/
    protected function _extract($path, $arc)
    {
        return false;
    }

    /**
     * Create archive and return its path
     *
     * @param  string  $dir    target dir
     * @param  array   $files  files names list
     * @param  string  $name   archive name
     * @param  array   $arc    archiver options
     * @return string|bool
     **/
    protected function _archive($dir, $files, $name, $arc)
    {
        return false;
    }

    /**
     * Detect available archivers
     *
     * @return void
     **/
    protected function _checkArchivers()
    {
        return;
    }

    /**
     * Resize image
     *
     * @param string $hash
     * @param int $width
     * @param int $height
     * @param int $x
     * @param int $y
     * @param string $mode
     * @param string $bg
     * @param int $degree
     * @return array|bool
     */
    public function resize($hash, $width, $height, $x, $y, $mode = 'resize', $bg = '', $degree = 0)
    {
        if ($this->commandDisabled('resize')) {
            return $this->setError(elFinder::ERROR_PERM_DENIED);
        }

        if (($file = $this->file($hash)) == false) {
            return $this->setError(elFinder::ERROR_FILE_NOT_FOUND);
        }

        if (!$file['write'] || !$file['read']) {
            return $this->setError(elFinder::ERROR_PERM_DENIED);
        }

        $path = $this->decode($hash);

        if (!$local_path = $this->getLocalFile($path)) {
            $this->setError(elFinder::ERROR_FTP_DOWNLOAD_FILE, $local_path);
            return false;
        }

        if (!$this->canResize($path, $file)) {
            return $this->setError(elFinder::ERROR_UNSUPPORT_TYPE);
        }

        switch ($mode) {

            case 'propresize':
                $result = $this->imgResize($local_path, $width, $height, true, true);
                break;

            case 'crop':
                $result = $this->imgCrop($local_path, $width, $height, $x, $y);
                break;

            case 'fitsquare':
                $result = $this->imgSquareFit($local_path, $width, $height, 'center', 'middle', ($bg ? $bg : $this->options['tmbBgColor']));
                break;

            case 'rotate':
                $result = $this->imgRotate($local_path, $degree, ($bg ? $bg : $this->options['tmbBgColor']));
                break;

            default:
                $result = $this->imgResize($local_path, $width, $height, false, true);
                break;
        }

        if ($result) {
            $contents = file_get_contents($local_path);
            if ($contents && !$this->_filePutContents($path, $contents)) {
                $this->setError(elFinder::ERROR_FTP_UPLOAD_FILE, $path);
                $this->deleteFile($local_path); //cleanup
            }
            $this->clearcache();
            return $this->stat($path);
        }

        $this->setError(elFinder::ERROR_UNKNOWN);
        return false;
    }

    /**
     * Get a local file with the contents of the external file.
     *
     * @param  string $path The path to the file on the adapter
     * @return string   The local filename
     */
    protected function getLocalFile($path)
    {
        // Get a (local) temporary file
        $local_path = tempnam(sys_get_temp_dir(), 'elfinder');

        // Read the original file
        if ($local_path && $contents = $this->_getContents($path)) {
            // Write the contents to the local file
            $written = @file_put_contents($local_path, $this->_getContents($path), LOCK_EX);
            if ($written !== false) {
                return $local_path;
            }
        }

        return false;
    }
}
