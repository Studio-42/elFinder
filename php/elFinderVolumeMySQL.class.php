<?php

/**
 * Simple elFinder driver for MySQL.
 *
 * @author Dmitry (dio) Levashov
 **/
class elFinderVolumeMySQL extends elFinderVolumeDriver
{

    /**
     * Driver id
     * Must be started from letter and contains [a-z0-9]
     * Used as part of volume id
     *
     * @var string
     **/
    protected $driverId = 'm';

    /**
     * Database object
     *
     * @var mysqli
     **/
    protected $db = null;

    /**
     * Tables to store files
     *
     * @var string
     **/
    protected $tbf = '';

    /**
     * Directory for tmp files
     * If not set driver will try to use tmbDir as tmpDir
     *
     * @var string
     **/
    protected $tmpPath = '';

    /**
     * Numbers of sql requests (for debug)
     *
     * @var int
     **/
    protected $sqlCnt = 0;

    /**
     * Last db error message
     *
     * @var string
     **/
    protected $dbError = '';

    /**
     * This root has parent id
     *
     * @var        boolean
     */
    protected $rootHasParent = false;

    /**
     * Constructor
     * Extend options with required fields
     *
     * @author Dmitry (dio) Levashov
     */
    public function __construct()
    {
        $opts = array(
            'host' => 'localhost',
            'user' => '',
            'pass' => '',
            'db' => '',
            'port' => null,
            'socket' => null,
            'files_table' => 'elfinder_file',
            'tmbPath' => '',
            'tmpPath' => '',
            'rootCssClass' => 'elfinder-navbar-root-sql',
            'noSessionCache' => array('hasdirs')
        );
        $this->options = array_merge($this->options, $opts);
        $this->options['mimeDetect'] = 'internal';
    }

    /*********************************************************************/
    /*                        INIT AND CONFIGURE                         */
    /*********************************************************************/

    /**
     * Prepare driver before mount volume.
     * Connect to db, check required tables and fetch root path
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function init()
    {

        if (!($this->options['host'] || $this->options['socket'])
            || !$this->options['user']
            || !$this->options['pass']
            || !$this->options['db']
            || !$this->options['path']
            || !$this->options['files_table']) {
            return false;
        }


        $this->db = new mysqli($this->options['host'], $this->options['user'], $this->options['pass'], $this->options['db'], $this->options['port'], $this->options['socket']);
        if ($this->db->connect_error || mysqli_connect_error()) {
            return false;
        }

        $this->db->set_charset('utf8');

        if ($res = $this->db->query('SHOW TABLES')) {
            while ($row = $res->fetch_array()) {
                if ($row[0] == $this->options['files_table']) {
                    $this->tbf = $this->options['files_table'];
                    break;
                }
            }
        }

        if (!$this->tbf) {
            return false;
        }

        $this->updateCache($this->options['path'], $this->_stat($this->options['path']));

        // enable command archive
        $this->options['useRemoteArchive'] = true;

        return true;
    }


    /**
     * Set tmp path
     *
     * @return void
     * @throws elFinderAbortException
     * @author Dmitry (dio) Levashov
     */
    protected function configure()
    {
        parent::configure();

        if (($tmp = $this->options['tmpPath'])) {
            if (!file_exists($tmp)) {
                if (mkdir($tmp)) {
                    chmod($tmp, $this->options['tmbPathMode']);
                }
            }

            $this->tmpPath = is_dir($tmp) && is_writable($tmp) ? $tmp : false;
        }
        if (!$this->tmpPath && ($tmp = elFinder::getStaticVar('commonTempPath'))) {
            $this->tmpPath = $tmp;
        }

        // fallback of $this->tmp
        if (!$this->tmpPath && $this->tmbPathWritable) {
            $this->tmpPath = $this->tmbPath;
        }

        $this->mimeDetect = 'internal';
    }

    /**
     * Close connection
     *
     * @return void
     * @author Dmitry (dio) Levashov
     **/
    public function umount()
    {
        $this->db->close();
    }

    /**
     * Return debug info for client
     *
     * @return array
     * @author Dmitry (dio) Levashov
     **/
    public function debug()
    {
        $debug = parent::debug();
        $debug['sqlCount'] = $this->sqlCnt;
        if ($this->dbError) {
            $debug['dbError'] = $this->dbError;
        }
        return $debug;
    }

    /**
     * Perform sql query and return result.
     * Increase sqlCnt and save error if occured
     *
     * @param  string $sql query
     *
     * @return bool|mysqli_result
     * @author Dmitry (dio) Levashov
     */
    protected function query($sql)
    {
        $this->sqlCnt++;
        $res = $this->db->query($sql);
        if (!$res) {
            $this->dbError = $this->db->error;
        }
        return $res;
    }

    /**
     * Create empty object with required mimetype
     *
     * @param  string $path parent dir path
     * @param  string $name object name
     * @param  string $mime mime type
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function make($path, $name, $mime)
    {
        $sql = 'INSERT INTO %s (`parent_id`, `name`, `size`, `mtime`, `mime`, `content`, `read`, `write`, `locked`, `hidden`, `width`, `height`) VALUES (\'%s\', \'%s\', 0, %d, \'%s\', \'\', \'%d\', \'%d\', \'%d\', \'%d\', 0, 0)';
        $sql = sprintf($sql, $this->tbf, $path, $this->db->real_escape_string($name), time(), $mime, $this->defaults['read'], $this->defaults['write'], $this->defaults['locked'], $this->defaults['hidden']);
        // echo $sql;
        return $this->query($sql) && $this->db->affected_rows > 0;
    }

    /*********************************************************************/
    /*                               FS API                              */
    /*********************************************************************/

    /**
     * Cache dir contents
     *
     * @param  string $path dir path
     *
     * @return string
     * @author Dmitry Levashov
     **/
    protected function cacheDir($path)
    {
        $this->dirsCache[$path] = array();

        $sql = 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime AS ts, f.mime, f.read, f.write, f.locked, f.hidden, f.width, f.height, IF(ch.id, 1, 0) AS dirs 
				FROM ' . $this->tbf . ' AS f 
				LEFT JOIN ' . $this->tbf . ' AS ch ON ch.parent_id=f.id AND ch.mime=\'directory\'
				WHERE f.parent_id=\'' . $path . '\'
				GROUP BY f.id, ch.id';

        $res = $this->query($sql);
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $id = $row['id'];
                if ($row['parent_id'] && $id != $this->root) {
                    $row['phash'] = $this->encode($row['parent_id']);
                }

                if ($row['mime'] == 'directory') {
                    unset($row['width']);
                    unset($row['height']);
                    $row['size'] = 0;
                } else {
                    unset($row['dirs']);
                }

                unset($row['id']);
                unset($row['parent_id']);


                if (($stat = $this->updateCache($id, $row)) && empty($stat['hidden'])) {
                    $this->dirsCache[$path][] = $id;
                }
            }
        }

        return $this->dirsCache[$path];
    }

    /**
     * Return array of parents paths (ids)
     *
     * @param  int $path file path (id)
     *
     * @return array
     * @author Dmitry (dio) Levashov
     **/
    protected function getParents($path)
    {
        $parents = array();

        while ($path) {
            if ($file = $this->stat($path)) {
                array_unshift($parents, $path);
                $path = isset($file['phash']) ? $this->decode($file['phash']) : false;
            }
        }

        if (count($parents)) {
            array_pop($parents);
        }
        return $parents;
    }

    /**
     * Return correct file path for LOAD_FILE method
     *
     * @param  string $path file path (id)
     *
     * @return string
     * @author Troex Nevelin
     **/
    protected function loadFilePath($path)
    {
        $realPath = realpath($path);
        if (DIRECTORY_SEPARATOR == '\\') { // windows
            $realPath = str_replace('\\', '\\\\', $realPath);
        }
        return $this->db->real_escape_string($realPath);
    }

    /**
     * Recursive files search
     *
     * @param  string $path dir path
     * @param  string $q    search string
     * @param  array  $mimes
     *
     * @return array
     * @throws elFinderAbortException
     * @author Dmitry (dio) Levashov
     */
    protected function doSearch($path, $q, $mimes)
    {
        if (!empty($this->doSearchCurrentQuery['matchMethod'])) {
            // has custom match method use elFinderVolumeDriver::doSearch()
            return parent::doSearch($path, $q, $mimes);
        }

        $dirs = array();
        $timeout = $this->options['searchTimeout'] ? $this->searchStart + $this->options['searchTimeout'] : 0;

        if ($path != $this->root || $this->rootHasParent) {
            $dirs = $inpath = array(intval($path));
            while ($inpath) {
                $in = '(' . join(',', $inpath) . ')';
                $inpath = array();
                $sql = 'SELECT f.id FROM %s AS f WHERE f.parent_id IN ' . $in . ' AND `mime` = \'directory\'';
                $sql = sprintf($sql, $this->tbf);
                if ($res = $this->query($sql)) {
                    $_dir = array();
                    while ($dat = $res->fetch_assoc()) {
                        $inpath[] = $dat['id'];
                    }
                    $dirs = array_merge($dirs, $inpath);
                }
            }
        }

        $result = array();

        if ($mimes) {
            $whrs = array();
            foreach ($mimes as $mime) {
                if (strpos($mime, '/') === false) {
                    $whrs[] = sprintf('f.mime LIKE \'%s/%%\'', $this->db->real_escape_string($mime));
                } else {
                    $whrs[] = sprintf('f.mime = \'%s\'', $this->db->real_escape_string($mime));
                }
            }
            $whr = join(' OR ', $whrs);
        } else {
            $whr = sprintf('f.name LIKE \'%%%s%%\'', $this->db->real_escape_string($q));
        }
        if ($dirs) {
            $whr = '(' . $whr . ') AND (`parent_id` IN (' . join(',', $dirs) . '))';
        }

        $sql = 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime AS ts, f.mime, f.read, f.write, f.locked, f.hidden, f.width, f.height, 0 AS dirs 
				FROM %s AS f 
				WHERE %s';

        $sql = sprintf($sql, $this->tbf, $whr);

        if (($res = $this->query($sql))) {
            while ($row = $res->fetch_assoc()) {
                if ($timeout && $timeout < time()) {
                    $this->setError(elFinder::ERROR_SEARCH_TIMEOUT, $this->path($this->encode($path)));
                    break;
                }

                if (!$this->mimeAccepted($row['mime'], $mimes)) {
                    continue;
                }
                $id = $row['id'];
                if ($id == $this->root) {
                    continue;
                }
                if ($row['parent_id'] && $id != $this->root) {
                    $row['phash'] = $this->encode($row['parent_id']);
                }
                $row['path'] = $this->_path($id);

                if ($row['mime'] == 'directory') {
                    unset($row['width']);
                    unset($row['height']);
                } else {
                    unset($row['dirs']);
                }

                unset($row['id']);
                unset($row['parent_id']);

                if (($stat = $this->updateCache($id, $row)) && empty($stat['hidden'])) {
                    $result[] = $stat;
                }
            }
        }
        return $result;
    }


    /*********************** paths/urls *************************/

    /**
     * Return parent directory path
     *
     * @param  string $path file path
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _dirname($path)
    {
        return ($stat = $this->stat($path)) ? (!empty($stat['phash']) ? $this->decode($stat['phash']) : $this->root) : false;
    }

    /**
     * Return file name
     *
     * @param  string $path file path
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _basename($path)
    {
        return ($stat = $this->stat($path)) ? $stat['name'] : false;
    }

    /**
     * Join dir name and file name and return full path
     *
     * @param  string $dir
     * @param  string $name
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _joinPath($dir, $name)
    {
        $sql = 'SELECT id FROM ' . $this->tbf . ' WHERE parent_id=\'' . $dir . '\' AND name=\'' . $this->db->real_escape_string($name) . '\'';

        if (($res = $this->query($sql)) && ($r = $res->fetch_assoc())) {
            $this->updateCache($r['id'], $this->_stat($r['id']));
            return $r['id'];
        }
        return -1;
    }

    /**
     * Return normalized path, this works the same as os.path.normpath() in Python
     *
     * @param  string $path path
     *
     * @return string
     * @author Troex Nevelin
     **/
    protected function _normpath($path)
    {
        return $path;
    }

    /**
     * Return file path related to root dir
     *
     * @param  string $path file path
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _relpath($path)
    {
        return $path;
    }

    /**
     * Convert path related to root dir into real path
     *
     * @param  string $path file path
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _abspath($path)
    {
        return $path;
    }

    /**
     * Return fake path started from root dir
     *
     * @param  string $path file path
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _path($path)
    {
        if (($file = $this->stat($path)) == false) {
            return '';
        }

        $parentsIds = $this->getParents($path);
        $path = '';
        foreach ($parentsIds as $id) {
            $dir = $this->stat($id);
            $path .= $dir['name'] . $this->separator;
        }
        return $path . $file['name'];
    }

    /**
     * Return true if $path is children of $parent
     *
     * @param  string $path   path to check
     * @param  string $parent parent path
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _inpath($path, $parent)
    {
        return $path == $parent
            ? true
            : in_array($parent, $this->getParents($path));
    }

    /***************** file stat ********************/
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
     * If file does not exists - returns empty array or false.
     *
     * @param  string $path file path
     *
     * @return array|false
     * @author Dmitry (dio) Levashov
     **/
    protected function _stat($path)
    {
        $sql = 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime AS ts, f.mime, f.read, f.write, f.locked, f.hidden, f.width, f.height, IF(ch.id, 1, 0) AS dirs
				FROM ' . $this->tbf . ' AS f 
				LEFT JOIN ' . $this->tbf . ' AS ch ON ch.parent_id=f.id AND ch.mime=\'directory\'
				WHERE f.id=\'' . $path . '\'
				GROUP BY f.id, ch.id';

        $res = $this->query($sql);

        if ($res) {
            $stat = $res->fetch_assoc();
            if ($stat['id'] == $this->root) {
                $this->rootHasParent = true;
                $stat['parent_id'] = '';
            }
            if ($stat['parent_id']) {
                $stat['phash'] = $this->encode($stat['parent_id']);
            }
            if ($stat['mime'] == 'directory') {
                unset($stat['width']);
                unset($stat['height']);
                $stat['size'] = 0;
            } else {
                if (!$stat['mime']) {
                    unset($stat['mime']);
                }
                unset($stat['dirs']);
            }
            unset($stat['id']);
            unset($stat['parent_id']);
            return $stat;

        }
        return array();
    }

    /**
     * Return true if path is dir and has at least one childs directory
     *
     * @param  string $path dir path
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _subdirs($path)
    {
        return ($stat = $this->stat($path)) && isset($stat['dirs']) ? $stat['dirs'] : false;
    }

    /**
     * Return object width and height
     * Usualy used for images, but can be realize for video etc...
     *
     * @param  string $path file path
     * @param  string $mime file mime type
     *
     * @return string
     * @author Dmitry (dio) Levashov
     **/
    protected function _dimensions($path, $mime)
    {
        return ($stat = $this->stat($path)) && isset($stat['width']) && isset($stat['height']) ? $stat['width'] . 'x' . $stat['height'] : '';
    }

    /******************** file/dir content *********************/

    /**
     * Return files list in directory.
     *
     * @param  string $path dir path
     *
     * @return array
     * @author Dmitry (dio) Levashov
     **/
    protected function _scandir($path)
    {
        return isset($this->dirsCache[$path])
            ? $this->dirsCache[$path]
            : $this->cacheDir($path);
    }

    /**
     * Open file and return file pointer
     *
     * @param  string $path file path
     * @param  string $mode open file mode (ignored in this driver)
     *
     * @return resource|false
     * @author Dmitry (dio) Levashov
     **/
    protected function _fopen($path, $mode = 'rb')
    {
        $fp = $this->tmpPath
            ? fopen($this->getTempFile($path), 'w+')
            : $this->tmpfile();


        if ($fp) {
            if (($res = $this->query('SELECT content FROM ' . $this->tbf . ' WHERE id=\'' . $path . '\''))
                && ($r = $res->fetch_assoc())) {
                fwrite($fp, $r['content']);
                rewind($fp);
                return $fp;
            } else {
                $this->_fclose($fp, $path);
            }
        }

        return false;
    }

    /**
     * Close opened file
     *
     * @param  resource $fp file pointer
     * @param string    $path
     *
     * @return void
     * @author Dmitry (dio) Levashov
     */
    protected function _fclose($fp, $path = '')
    {
        is_resource($fp) && fclose($fp);
        if ($path) {
            $file = $this->getTempFile($path);
            is_file($file) && unlink($file);
        }
    }

    /********************  file/dir manipulations *************************/

    /**
     * Create dir and return created dir path or false on failed
     *
     * @param  string $path parent dir path
     * @param string  $name new directory name
     *
     * @return string|bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _mkdir($path, $name)
    {
        return $this->make($path, $name, 'directory') ? $this->_joinPath($path, $name) : false;
    }

    /**
     * Create file and return it's path or false on failed
     *
     * @param  string $path parent dir path
     * @param string  $name new file name
     *
     * @return string|bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _mkfile($path, $name)
    {
        return $this->make($path, $name, '') ? $this->_joinPath($path, $name) : false;
    }

    /**
     * Create symlink. FTP driver does not support symlinks.
     *
     * @param  string $target link target
     * @param  string $path   symlink path
     * @param string  $name
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     */
    protected function _symlink($target, $path, $name)
    {
        return false;
    }

    /**
     * Copy file into another file
     *
     * @param  string $source    source file path
     * @param  string $targetDir target directory path
     * @param  string $name      new file name
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _copy($source, $targetDir, $name)
    {
        $this->clearcache();
        $id = $this->_joinPath($targetDir, $name);

        $sql = $id > 0
            ? sprintf('REPLACE INTO %s (id, parent_id, name, content, size, mtime, mime, width, height, `read`, `write`, `locked`, `hidden`) (SELECT %d, %d, name, content, size, mtime, mime, width, height, `read`, `write`, `locked`, `hidden` FROM %s WHERE id=%d)', $this->tbf, $id, $this->_dirname($id), $this->tbf, $source)
            : sprintf('INSERT INTO %s (parent_id, name, content, size, mtime, mime, width, height, `read`, `write`, `locked`, `hidden`) SELECT %d, \'%s\', content, size, %d, mime, width, height, `read`, `write`, `locked`, `hidden` FROM %s WHERE id=%d', $this->tbf, $targetDir, $this->db->real_escape_string($name), time(), $this->tbf, $source);

        return $this->query($sql);
    }

    /**
     * Move file into another parent dir.
     * Return new file path or false.
     *
     * @param  string $source source file path
     * @param         $targetDir
     * @param  string $name   file name
     *
     * @return bool|string
     * @internal param string $target target dir path
     * @author   Dmitry (dio) Levashov
     */
    protected function _move($source, $targetDir, $name)
    {
        $sql = 'UPDATE %s SET parent_id=%d, name=\'%s\' WHERE id=%d LIMIT 1';
        $sql = sprintf($sql, $this->tbf, $targetDir, $this->db->real_escape_string($name), $source);
        return $this->query($sql) && $this->db->affected_rows > 0 ? $source : false;
    }

    /**
     * Remove file
     *
     * @param  string $path file path
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _unlink($path)
    {
        return $this->query(sprintf('DELETE FROM %s WHERE id=%d AND mime!=\'directory\' LIMIT 1', $this->tbf, $path)) && $this->db->affected_rows;
    }

    /**
     * Remove dir
     *
     * @param  string $path dir path
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _rmdir($path)
    {
        return $this->query(sprintf('DELETE FROM %s WHERE id=%d AND mime=\'directory\' LIMIT 1', $this->tbf, $path)) && $this->db->affected_rows;
    }

    /**
     * undocumented function
     *
     * @param $path
     * @param $fp
     *
     * @author Dmitry Levashov
     */
    protected function _setContent($path, $fp)
    {
        elFinder::rewind($fp);
        $fstat = fstat($fp);
        $size = $fstat['size'];


    }

    /**
     * Create new file and write into it from file pointer.
     * Return new file path or false on error.
     *
     * @param  resource $fp   file pointer
     * @param  string   $dir  target dir path
     * @param  string   $name file name
     * @param  array    $stat file stat (required by some virtual fs)
     *
     * @return bool|string
     * @author Dmitry (dio) Levashov
     **/
    protected function _save($fp, $dir, $name, $stat)
    {
        $this->clearcache();

        $mime = $stat['mime'];
        $w = !empty($stat['width']) ? $stat['width'] : 0;
        $h = !empty($stat['height']) ? $stat['height'] : 0;

        $id = $this->_joinPath($dir, $name);
        elFinder::rewind($fp);
        $stat = fstat($fp);
        $size = $stat['size'];

        if (($tmpfile = tempnam($this->tmpPath, $this->id))) {
            if (($trgfp = fopen($tmpfile, 'wb')) == false) {
                unlink($tmpfile);
            } else {
                while (!feof($fp)) {
                    fwrite($trgfp, fread($fp, 8192));
                }
                fclose($trgfp);
                chmod($tmpfile, 0644);

                $sql = $id > 0
                    ? 'REPLACE INTO %s (id, parent_id, name, content, size, mtime, mime, width, height) VALUES (' . $id . ', %d, \'%s\', LOAD_FILE(\'%s\'), %d, %d, \'%s\', %d, %d)'
                    : 'INSERT INTO %s (parent_id, name, content, size, mtime, mime, width, height) VALUES (%d, \'%s\', LOAD_FILE(\'%s\'), %d, %d, \'%s\', %d, %d)';
                $sql = sprintf($sql, $this->tbf, $dir, $this->db->real_escape_string($name), $this->loadFilePath($tmpfile), $size, time(), $mime, $w, $h);

                $res = $this->query($sql);
                unlink($tmpfile);

                if ($res) {
                    return $id > 0 ? $id : $this->db->insert_id;
                }
            }
        }


        $content = '';
        elFinder::rewind($fp);
        while (!feof($fp)) {
            $content .= fread($fp, 8192);
        }

        $sql = $id > 0
            ? 'REPLACE INTO %s (id, parent_id, name, content, size, mtime, mime, width, height) VALUES (' . $id . ', %d, \'%s\', \'%s\', %d, %d, \'%s\', %d, %d)'
            : 'INSERT INTO %s (parent_id, name, content, size, mtime, mime, width, height) VALUES (%d, \'%s\', \'%s\', %d, %d, \'%s\', %d, %d)';
        $sql = sprintf($sql, $this->tbf, $dir, $this->db->real_escape_string($name), $this->db->real_escape_string($content), $size, time(), $mime, $w, $h);

        unset($content);

        if ($this->query($sql)) {
            return $id > 0 ? $id : $this->db->insert_id;
        }

        return false;
    }

    /**
     * Get file contents
     *
     * @param  string $path file path
     *
     * @return string|false
     * @author Dmitry (dio) Levashov
     **/
    protected function _getContents($path)
    {
        return ($res = $this->query(sprintf('SELECT content FROM %s WHERE id=%d', $this->tbf, $path))) && ($r = $res->fetch_assoc()) ? $r['content'] : false;
    }

    /**
     * Write a string to a file
     *
     * @param  string $path    file path
     * @param  string $content new file content
     *
     * @return bool
     * @author Dmitry (dio) Levashov
     **/
    protected function _filePutContents($path, $content)
    {
        return $this->query(sprintf('UPDATE %s SET content=\'%s\', size=%d, mtime=%d WHERE id=%d LIMIT 1', $this->tbf, $this->db->real_escape_string($content), strlen($content), time(), $path));
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
     * chmod implementation
     *
     * @param string $path
     * @param string $mode
     *
     * @return bool
     */
    protected function _chmod($path, $mode)
    {
        return false;
    }

    /**
     * Unpack archive
     *
     * @param  string $path archive path
     * @param  array  $arc  archiver command and arguments (same as in $this->archivers)
     *
     * @return void
     * @author Dmitry (dio) Levashov
     * @author Alexey Sukhotin
     **/
    protected function _unpack($path, $arc)
    {
        return;
    }

    /**
     * Extract files from archive
     *
     * @param  string $path archive path
     * @param  array  $arc  archiver command and arguments (same as in $this->archivers)
     *
     * @return true
     * @author Dmitry (dio) Levashov,
     * @author Alexey Sukhotin
     **/
    protected function _extract($path, $arc)
    {
        return false;
    }

    /**
     * Create archive and return its path
     *
     * @param  string $dir   target dir
     * @param  array  $files files names list
     * @param  string $name  archive name
     * @param  array  $arc   archiver options
     *
     * @return string|bool
     * @author Dmitry (dio) Levashov,
     * @author Alexey Sukhotin
     **/
    protected function _archive($dir, $files, $name, $arc)
    {
        return false;
    }

} // END class 
