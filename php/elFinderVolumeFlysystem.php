<?php
use League\Flysystem\Util;
use League\Flysystem\Filesystem;

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

    /** @var Filesystem $fs */
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
            'adapter'    => null,
            'icon'       => (defined('ELFINDER_IMG_PARENT_URL')? (rtrim(ELFINDER_IMG_PARENT_URL, '/').'/') : '').'img/volume_icon_flysystem.png',
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
     * Prepare driver before mount volume.
     * Return true if volume is ready.
     *
     * @return bool
     **/
    protected function init()
    {
        // Check if filesystem is set, otherwise create Filesystem from adapter
        if ($this->options['filesystem']) {
            $this->fs = $this->options['filesystem'];
        } elseif ($this->options['adapter']) {
            $this->fs = new Filesystem($this->options['adapter']);
        }

        if (!$this->fs) {
            return $this->setError('A filesystem instance is required');
        }

        $this->root = $this->options['path'];
        $this->rootName = 'fls';

        return true;
    }

    /**
     * {@inheritdoc}
     **/
    protected function _dirname($path)
    {
        return Util::dirname($path);
    }

    /**
     * Return normalized path
     *
     * @param  string  $path  path
     * @return string
     **/
    protected function _normpath($path)
    {
        return Util::normalizePath($path);
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
     * Ususaly used for images, but can be realize for video etc...
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
     * {@inheritdoc}
     **/
    protected function _fclose($fp, $path='')
    {
        @fclose($fp);
    }

    /********************  file/dir manipulations *************************/

    /**
     * Create dir and return created dir path or false on failed
     *
     * @param  string  $path  parent dir path
     * @param string  $name  new directory name
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
        return $this->fs->write($path, $content);
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
        return $dir.DIRECTORY_SEPARATOR.$name;
    }

    /**
     * Return file path related to root dir
     *
     * @param  string  $path  file path
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _relpath($path)
    {
        if ($path == $this->root) {
            return '';
        }

        if ($this->root !== '/'){
            $path = substr($path, strlen($this->root)+1);
        }

        return ltrim($path, '/');
    }

    /**
     * Convert path related to root dir into real path
     *
     * @param  string  $path  file path
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _abspath($path)
    {
        return $path == DIRECTORY_SEPARATOR ? $this->root : $this->root.DIRECTORY_SEPARATOR.$path;
    }

    /**
     * Return fake path started from root dir
     *
     * @param  string  $path  file path
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _path($path)
    {
        return $this->rootName.($path == $this->root ? '/' : $this->separator.$this->_relpath($path));
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
        $real_path = realpath($path);
        $real_parent = realpath($parent);
        if ($real_path && $real_parent) {
            return $real_path === $real_parent || strpos($real_path, $real_parent.DIRECTORY_SEPARATOR) === 0;
        }
        return false;
    }

    /**
     * {@inheritdoc}
     **/
    protected function _symlink($source, $targetDir, $name) {
        return false;
    }

    /**
     * {@inheritdoc}
     **/
    protected function _extract($path, $arc)
    {
        return false;
    }

    /**
     * {@inheritdoc}
     **/
    protected function _archive($dir, $files, $name, $arc)
    {
        return false;
    }

    /**
     * {@inheritdoc}
     **/
    protected function _checkArchivers()
    {
        return;
    }

}
