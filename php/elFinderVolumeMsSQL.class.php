<?php

/**
 * Simple elFinder driver for MsSQL.
 *
 * @author Dmitry (dio) Levashov
 * @author Raja Sharma - updating for MsSQL
 **/
class elFinderVolumeMsSQL extends elFinderVolumeDriver {

	/**
	 * Driver id
	 * Must be started from letter and contains [a-z0-9]
	 * Used as part of volume id
	 *
	 * @var string
	 **/
	protected $driverId = 'ms';

	/**
	 * Database object
	 *
	 * @var odbc_connect
	 **/
	protected $conn = null;

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
	 * Constructor
	 * Extend options with required fields
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function __construct() {
		$opts = array(
			'host'			=> 'localhost',
			'user'			=> '',
			'pass'			=> '',
			'db'			=> '',
			'port'			=> null,
			'socket'		=> null,
			'files_table'	=> 'elfinder_file',
			'tmbPath'		=> '',
			'tmpPath'		=> '',
			'rootCssClass'	=> 'elfinder-navbar-root-sql'
		);
		$this->options = array_merge($this->options, $opts);
		$this->options['mimeDetect'] = 'internal';
	}

	/*********************************************************************/
	/*						  INIT AND CONFIGURE						 */
	/*********************************************************************/

	/**
	 * Prepare driver before mount volume.
	 * Connect to db, check required tables and fetch root path
	 *
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function init() {

		if (!($this->options['host'])
		||	!$this->options['user']
		||	!$this->options['pass']
		||	!$this->options['db']
		||	!$this->options['path']
		||	!$this->options['files_table']) {
			return false;
		}


		$this->conn = odbc_connect("Driver={SQL Server};Server=".$this->options['host'].";Database=$database;", $this->options['user'], $this->options['pass']);

		if (odbc_errormsg($this->conn)) {
			return false;
		}

		$this->rootparameter($this->options['alias'], $this->options['defaults']['read'], $this->options['defaults']['write'], $this->options['defaults']['locked'], $this->options['defaults']['hidden']);

		if ($res = $this->query('SELECT name FROM sys.tables')) {
			while ($row =  odbc_fetch_array($res)) {
				if ($row['name'] == $this->options['files_table']) {
					$this->tbf = $this->options['files_table'];
					break;
				}
			}
		}

		if (!$this->tbf) {
			return false;
		}

		$this->updateCache($this->options['path'], $this->_stat($this->options['path']));

		return true;
	}

	/**
	 * Set tmp path
	 *
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	protected function configure() {
		parent::configure();

		if (($tmp = $this->options['tmpPath'])) {
			if (!file_exists($tmp)) {
				if (@mkdir($tmp)) {
					@chmod($tmp, $this->options['tmbPathMode']);
				}
			}

			$this->tmpPath = is_dir($tmp) && is_writable($tmp) ? $tmp : false;
		}
		if (!$this->tmpPath && ($tmp = elFinder::getStaticVar('commonTempPath'))) {
			$this->tmpPath = $tmp;
		}

		if (!$this->tmpPath && $this->tmbPath && $this->tmbPathWritable) {
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
	public function umount() {
		odbc_close ($this->conn);
	}

	/**
	 * Return debug info for client
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function debug() {
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
	 * @param  string  $sql	 query
	 * @return misc
	 * @author Dmitry (dio) Levashov
	 **/
	protected function query($sql) {	 
		$this->sqlCnt++;
		$sql = str_replace(utf8_encode('"'), "'", $sql);
		$res = odbc_exec($this->conn, $sql);
		if (!$res) {
			$this->dbError = odbc_errormsg($this->conn);
		}
		return $res;
	}

	/**
	 * Create empty object with required mimetype
	 *
	 * @param  string  $path  parent dir path
	 * @param  string  $name  object name
	 * @param  string  $mime  mime type
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function make($path, $name, $mime) {
		$sql = 'INSERT INTO %s (parent_id, name, size, mtime, mime, content, [read], write, locked, hidden, width, height) VALUES ("%s", "%s", 0, %d, "%s", convert(varbinary(max),""), "%d", "%d", 0, 0, 0, 0)';
		$sql = sprintf($sql, $this->tbf, $path, addslashes($name), time(), $mime, $this->defaults['read'], $this->defaults['write']);
		$res = $this->query($sql);
		return $res && odbc_num_rows($res) > 0;
	}

	/*********************************************************************/
	/*								 FS API								 */
	/*********************************************************************/

	/**
	 * Cache dir contents
	 *
	 * @param  string  $path  dir path
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function cacheDir($path) {
		$this->dirsCache[$path] = array();

		$sql = 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime AS ts, f.mime, f.[read], f.write, f.locked, f.hidden, f.width, f.height, IIF(ch.id>0, 1, 0) AS dirs
				FROM '.$this->tbf.' AS f
				LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id AND ch.mime="directory"
				WHERE f.parent_id="'.$path.'"';
				//GROUP BY f.id';

		$res = $this->query($sql);

		if ($res) {
			while ($row = odbc_fetch_array($res)) {
				$id = $row['id'];
				if ($row['parent_id']) {
					$row['phash'] = $this->encode($row['parent_id']);
				}

				if ($row['mime'] == 'directory') {
					unset($row['width']);
					unset($row['height']);
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
	 * @param  int	 $path	file path (id)
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function getParents($path) {
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
	 * @param  string $path	 file path (id)
	 * @return string
	 * @author Troex Nevelin
	 **/
	protected function loadFilePath($path) {
		$realPath = realpath($path);
		if (DIRECTORY_SEPARATOR == '\\') { // windows
			$realPath = str_replace('\\', '\\\\', $realPath);
		}
		return addslashes($realPath);
	}

	/**
	 * Recursive files search
	 *
	 * @param  string  $path   dir path
	 * @param  string  $q	   search string
	 * @param  array   $mimes
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function doSearch($path, $q, $mimes) {
		$dirs = array();
		$timeout = $this->options['searchTimeout']? $this->searchStart + $this->options['searchTimeout'] : 0;

		if ($path != $this->root) {
			$dirs = $inpath = array(intval($path));
			while($inpath) {
				$in = '('.join(',', $inpath).')';
				$inpath = array();
				$sql = 'SELECT f.id FROM %s AS f WHERE f.parent_id IN '.$in.' AND mime = \'directory\'';
				$sql = sprintf($sql, $this->tbf);

				if ($res = $this->query($sql)) {
					$_dir = array();
					while ($dat = odbc_fetch_array($res)) {
						$inpath[] = $dat['id'];
					}
					$dirs = array_merge($dirs, $inpath);
				}
			}
		}

		$result = array();

		if ($mimes) {
			$whrs = array();
			foreach($mimes as $mime) {
				if (strpos($mime, '/') === false) {
					$whrs[] = sprintf('f.mime LIKE "%s/%%"', addslashes($mime));
				} else {
					$whrs[] = sprintf('f.mime = "%s"', addslashes($mime));
				}
			}
			$whr = join(' OR ', $whrs);
		} else {
			$whr = sprintf('f.name LIKE "%%%s%%"', addslashes($q));
		}
		if ($dirs) {
			$whr = '(' . $whr . ') AND (`parent_id` IN (' . join(',', $dirs) . '))';
		}

		$sql = 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime AS ts, f.mime, f.[read], f.write, f.locked, f.hidden, f.width, f.height, 0 AS dirs
				FROM %s AS f
				WHERE %s';

		$sql = sprintf($sql, $this->tbf, $whr);

		if ($res = $this->query($sql)) {
			while ($row = odbc_fetch_array($res)) {
				if ($timeout && $timeout < time()) {
					$this->setError(elFinder::ERROR_SEARCH_TIMEOUT, $this->path($this->encode($path)));
					break;
				}

				if (!$this->mimeAccepted($row['mime'], $mimes)) {
					continue;
				}
				$id = $row['id'];
				if ($row['parent_id']) {
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
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _dirname($path) {
		return ($stat = $this->stat($path)) ? ($stat['phash'] ? $this->decode($stat['phash']) : $this->root) : false;
	}

	/**
	 * Return file name
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _basename($path) {
		return ($stat = $this->stat($path)) ? $stat['name'] : false;
	}

	/**
	 * Join dir name and file name and return full path
	 *
	 * @param  string  $dir
	 * @param  string  $name
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _joinPath($dir, $name) {
		$sql = 'SELECT id FROM '.$this->tbf.' WHERE parent_id="'.$dir.'" AND name="'.addslashes($name).'"';
		$res = $this->query($sql);
		if ($res && ($r = odbc_fetch_array($res))) {
			$this->updateCache($r['id'], $this->_stat($r['id']));
			return $r['id'];
		}
		return -1;
	}

	/**
	 * Return normalized path, this works the same as os.path.normpath() in Python
	 *
	 * @param  string  $path  path
	 * @return string
	 * @author Troex Nevelin
	 **/
	protected function _normpath($path) {
		return $path;
	}

	/**
	 * Return file path related to root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _relpath($path) {
		return $path;
	}

	/**
	 * Convert path related to root dir into real path
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _abspath($path) {
		return $path;
	}

	/**
	 * Return fake path started from root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _path($path) {
		if (($file = $this->stat($path)) == false) {
			return '';
		}

		$parentsIds = $this->getParents($path);
		$path = '';
		foreach ($parentsIds as $id) {
			$dir = $this->stat($id);
			$path .= $dir['name'].$this->separator;
		}
		return $path.$file['name'];
	}

	/**
	 * Return true if $path is children of $parent
	 *
	 * @param  string  $path	path to check
	 * @param  string  $parent	parent path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _inpath($path, $parent) {
		return $path == $parent
			? true
			: in_array($parent, $this->getParents($path));
	}

	/***************** file stat ********************/
	/**
	 * Return stat for given path.
	 * Stat contains following fields:
	 * - (int)	  size	  file size in b. required
	 * - (int)	  ts	  file modification time in unix time. required
	 * - (string) mime	  mimetype. required for folders, others - optionally
	 * - (bool)	  read	  read permissions. required
	 * - (bool)	  write	  write permissions. required
	 * - (bool)	  locked  is object locked. optionally
	 * - (bool)	  hidden  is object hidden. optionally
	 * - (string) alias	  for symlinks - link target path relative to root path. optionally
	 * - (string) target  for symlinks - link target path. optionally
	 *
	 * If file does not exists - returns empty array or false.
	 *
	 * @param  string  $path	file path
	 * @return array|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _stat($path) {		
		$sql = 'SELECT f.id, f.parent_id, f.name, f.size, f.mtime AS ts, f.mime, f.[read], f.write, f.locked, f.hidden, f.width, f.height, IIF(ch.id>0, 1, 0) AS dirs
				FROM '.$this->tbf.' AS f
				LEFT JOIN '.$this->tbf.' AS p ON p.id=f.parent_id
				LEFT JOIN '.$this->tbf.' AS ch ON ch.parent_id=f.id AND ch.mime="directory"
				WHERE f.id="'.$path.'"';
				//GROUP BY f.id';

		$res = $this->query($sql);

		if ($res) {
			$stat = odbc_fetch_array($res);
			if ($stat['parent_id']) {
				$stat['phash'] = $this->encode($stat['parent_id']);
			}
			if ($stat['mime'] == 'directory') {
				unset($stat['width']);
				unset($stat['height']);
			} else {
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
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _subdirs($path) {
		return ($stat = $this->stat($path)) && isset($stat['dirs']) ? $stat['dirs'] : false;
	}

	/**
	 * Return object width and height
	 * Usualy used for images, but can be realize for video etc...
	 *
	 * @param  string  $path  file path
	 * @param  string  $mime  file mime type
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _dimensions($path, $mime) {
		return ($stat = $this->stat($path)) && isset($stat['width']) && isset($stat['height']) ? $stat['width'].'x'.$stat['height'] : '';
	}

	/******************** file/dir content *********************/

	/**
	 * Return files list in directory.
	 *
	 * @param  string  $path  dir path
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _scandir($path) {
		return isset($this->dirsCache[$path])
			? $this->dirsCache[$path]
			: $this->cacheDir($path);
	}

	/**
	 * Open file and return file pointer
	 *
	 * @param  string  $path  file path
	 * @param  string  $mode  open file mode (ignored in this driver)
	 * @return resource|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fopen($path, $mode='rb') {
		$fp = $this->tmbPath
			? @fopen($this->getTempFile($path), 'w+')
			: @tmpfile();

		if ($fp) {
			$sql = "SET TEXTSIZE 2147483647 ";   // increase mssql or odbc data size limit
			$sql .= 'SELECT convert(varbinary(max),content) as content FROM '.$this->tbf.' WHERE id="'.$path.'"';			
			
			$res = $this->query($sql);
			
			odbc_binmode($res, ODBC_BINMODE_RETURN);   //long binary handling
			odbc_longreadlen($res,100000000);		   //increase mssql or odbc data size 100 Megabytes
			
			if ($res && ($r = odbc_fetch_array($res))) {				
				fwrite($fp, base64_decode($r['content']));
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
	 * @param  resource	 $fp  file pointer
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _fclose($fp, $path='') {
		@fclose($fp);
		if ($path) {
			@unlink($this->getTempFile($path));
		}
	}

	/********************  file/dir manipulations *************************/

	/**
	 * Create dir and return created dir path or false on failed
	 *
	 * @param  string  $path  parent dir path
	 * @param string  $name	 new directory name
	 * @return string|bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _mkdir($path, $name) {
		return $this->make($path, $name, 'directory')? $this->_joinPath($path, $name) : false;
	}

	/**
	 * Create file and return it's path or false on failed
	 *
	 * @param  string  $path  parent dir path
	 * @param string  $name	 new file name
	 * @return string|bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _mkfile($path, $name) {
		return $this->make($path, $name, 'text/plain') ? $this->_joinPath($path, $name) : false;
	}

	/**
	 * Create symlink. FTP driver does not support symlinks.
	 *
	 * @param  string  $target	link target
	 * @param  string  $path	symlink path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _symlink($target, $path, $name) {
		return false;
	}

	/**
	 * Copy file into another file
	 *
	 * @param  string  $source	   source file path
	 * @param  string  $targetDir  target directory path
	 * @param  string  $name	   new file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _copy($source, $targetDir, $name) {
		$this->clearcache();
		$id = $this->_joinPath($targetDir, $name);

		$sql = $id > 0
			? sprintf('REPLACE INTO %s (id, parent_id, name, content, size, mtime, mime, width, height, [read], write, locked, hidden) (SELECT %d, %d, name, content, size, mtime, mime, width, height, [read, write, locked, hidden FROM %s WHERE id=%d)', $this->tbf, $id, $this->_dirname($id), $this->tbf, $source)
			: sprintf('INSERT INTO %s (parent_id, name, content, size, mtime, mime, width, height, [read], write, locked, hidden) SELECT %d, "%s", content, size, %d, mime, width, height, [read], write, locked, hidden FROM %s WHERE id=%d', $this->tbf, $targetDir, addslashes($name), time(), $this->tbf, $source);

		return $this->query($sql);
	}

	/**
	 * Move file into another parent dir.
	 * Return new file path or false.
	 *
	 * @param  string  $source	source file path
	 * @param  string  $target	target dir path
	 * @param  string  $name	file name
	 * @return string|bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _move($source, $targetDir, $name) {
		$sql = 'UPDATE %s SET parent_id=%d, name="%s" WHERE id=%d';
		$sql = sprintf($sql, $this->tbf, $targetDir, addslashes($name), $source);
		$res = $this->query($sql);
		return $res && odbc_num_rows($res) > 0 ? $source : false;
	}

	/**
	 * Remove file
	 *
	 * @param  string  $path  file path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _unlink($path) {
		$sql = sprintf('DELETE FROM %s WHERE id=%d AND mime!="directory"', $this->tbf, $path);
		$res = $this->query($sql);
		return $res && odbc_num_rows($res);
	}

	/**
	 * Remove dir
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _rmdir($path) {
		$sql = sprintf('DELETE FROM %s WHERE id=%d AND mime!="directory"', $this->tbf, $path);
		$res = $this->query($qry);
		return $res && odbc_num_rows($res);
	}

	/**
	 * undocumented function
	 *
	 * @return void
	 * @author Dmitry Levashov
	 **/
	protected function _setContent($path, $fp) {
		rewind($fp);
		$fstat = fstat($fp);
		$size = $fstat['size'];


	}

	/**
	 * Create new file and write into it from file pointer.
	 * Return new file path or false on error.
	 *
	 * @param  resource	 $fp   file pointer
	 * @param  string	 $dir  target dir path
	 * @param  string	 $name file name
	 * @param  array	 $stat file stat (required by some virtual fs)
	 * @return bool|string
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _save($fp, $dir, $name, $stat) {

		$this->clearcache();

		$mime = $stat['mime'];
		$w = !empty($stat['width'])	 ? $stat['width']  : 0;
		$h = !empty($stat['height']) ? $stat['height'] : 0;

		$id = $this->_joinPath($dir, $name);
		rewind($fp);
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
					? 'REPLACE INTO %s (id, parent_id, name, content, size, mtime, mime,[read], write, locked, hidden, width, height) VALUES ('.$id.', %d, "%s", convert(varbinary(max),"%s")), %d, %d, "%s", 1, 1, 0, 0, %d, %d)'
					: 'INSERT INTO %s (parent_id, name, content, size, mtime, mime,[read], write, locked, hidden, width, height) VALUES (%d, "%s", convert(varbinary(max),"%s")), %d, %d, "%s", 1, 1, 0, 0, %d, %d)';

				$sql = sprintf($sql, $this->tbf, $dir, addslashes($name),$this->loadFilePath($tmpfile), $size, time(), $mime, $w, $h);

				$res = $this->query($sql);

				unlink($tmpfile);

				if ($res) {
					$res = $this->query("Select IDENT_CURRENT('elfinder_file') as id");
					$r = odbc_fetch_array($res);
					return $id > 0 ? $id : $r['id'];
				}
			}
		}


		$content = '';
		rewind($fp);
		while (!feof($fp)) {
			$content .= fread($fp, 8192);
		}

		$sql = $id > 0
			? 'REPLACE INTO %s (id, parent_id, name, content, size, mtime, mime, [read], write, locked, hidden, width, height) VALUES ('.$id.', %d, "%s", convert(varbinary(max),"%s"), %d, %d, "%s", 1, 1, 0, 1, %d, %d)'
			: 'INSERT INTO %s (parent_id, name, content, size, mtime, mime, [read], write, locked, hidden, width, height) VALUES (%d, "%s", convert(varbinary(max),"%s"), %d, %d, "%s", 1, 1, 0, 0, %d, %d)';
		$sql = sprintf($sql, $this->tbf, $dir, addslashes($name), base64_encode($content), $size, time(), $mime, $w, $h);

		unset($content);

		$res = $this->query($sql);

		if ($res) {
			$res = $this->query("Select IDENT_CURRENT('elfinder_file') as id");
			$r = odbc_fetch_array($res);
			return $id > 0 ? $id : $r['id'];
		}

		return false;
	}

	/**
	 * Get file contents
	 *
	 * @param  string  $path  file path
	 * @return string|false
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _getContents($path) {
		$sql = "SET TEXTSIZE 2147483647 ";   // increase mssql or odbc data size limit
		$sql .= sprintf('SELECT convert(varbinary(max),content) as content FROM %s WHERE id=%d', $this->tbf, $path);
				
		$res = $this->query($sql);
		
		odbc_binmode($res, ODBC_BINMODE_RETURN);   //long binary handling
		odbc_longreadlen($res,100000000);		   //increase mssql or odbc data size 100 Megabytes
		
		$r = odbc_fetch_array($res);
		return ($res) && ($r) ? base64_decode($r['content']) : false;
	}

	/**
	 * Write a string to a file
	 *
	 * @param  string  $path	 file path
	 * @param  string  $content	 new file content
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _filePutContents($path, $content) {
		$sql = sprintf('UPDATE %s SET content=convert(varbinary(max),"%s"), size=%d, mtime=%d WHERE id=%d', $this->tbf, base64_encode($content), strlen($content), time(), $path);
		return $this->query($sql);
	}

	/**
	 * Detect available archivers
	 *
	 * @return void
	 **/
	protected function _checkArchivers() {
		return;
	}

	/**
	 * chmod implementation
	 *
	 * @return bool
	 **/
	protected function _chmod($path, $mode) {
		return false;
	}

	/**
	 * Unpack archive
	 *
	 * @param  string  $path  archive path
	 * @param  array   $arc	  archiver command and arguments (same as in $this->archivers)
	 * @return void
	 * @author Dmitry (dio) Levashov
	 * @author Alexey Sukhotin
	 **/
	protected function _unpack($path, $arc) {
		return;
	}

	/**
	 * Recursive symlinks search
	 *
	 * @param  string  $path  file/dir path
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	protected function _findSymlinks($path) {
		return false;
	}

	/**
	 * Extract files from archive
	 *
	 * @param  string  $path  archive path
	 * @param  array   $arc	  archiver command and arguments (same as in $this->archivers)
	 * @return true
	 * @author Dmitry (dio) Levashov,
	 * @author Alexey Sukhotin
	 **/
	protected function _extract($path, $arc) {
		return false;
	}

	/**
	 * Create archive and return its path
	 *
	 * @param  string  $dir	   target dir
	 * @param  array   $files  files names list
	 * @param  string  $name   archive name
	 * @param  array   $arc	   archiver options
	 * @return string|bool
	 * @author Dmitry (dio) Levashov,
	 * @author Alexey Sukhotin
	 **/
	protected function _archive($dir, $files, $name, $arc) {
		return false;
	}

	/**
	 * Update MsSQL database	 *
	 * @param  update root name with alias
	 * @param  update read, write, locked, hidden permission
	 * @author Raja Sharma
	 **/
	protected function rootparameter($alias, $read, $write, $locked, $hidden) {
		if($alias == ""){
			$sql = 'UPDATE elfinder_file set name = "DATABASE" where id=1';
		} else {
			$sql = 'UPDATE elfinder_file set name = "'.$alias.'" where id=1';
		}
		$res = $this->query($sql);

		if($read !== NULL || $read !== ''){
			$read ==true?$read="1":$read="0";
			$sql = 'UPDATE elfinder_file set [read] = '.$read;
		} else {
			$sql = 'UPDATE elfinder_file set [read] = 1';
		}
		$res = $this->query($sql);

		if($write !== NULL || $write !== ''){
			$write ==true?$write="1":$write="0";
			$sql = 'UPDATE elfinder_file set write = '.$write;
		} else {
			$sql = 'UPDATE elfinder_file set write = 1';
		}
		$res = $this->query($sql);

		if($locked !== NULL || $locked !== ''){
			$locked ==true?$locked="1":$locked="0";
			$sql = 'UPDATE elfinder_file set locked = '.$locked;
		} else {
			$sql = 'UPDATE elfinder_file set locked = 0';
		}
		$res = $this->query($sql);

		if($hidden !== NULL || $hidden !== ''){
			$hidden ==true?$hidden="1":$hidden="0";
			$sql = 'UPDATE elfinder_file set hidden = '.$hidden;
		} else {
			$sql = 'UPDATE elfinder_file set hidden = 0';
		}
		$res = $this->query($sql);


		// set folder/directory attributes
		if (!empty($this->options['attributes']) && is_array($this->options['attributes'])) {
			foreach ($this->options['attributes'] as $a) {
				if (!empty($a['pattern']) || count($a) > 1) {
					$pattern = '/[^a-zA-Z0-9;_-]/';
					$str= substr($a['pattern'],strpos($a['pattern'],"^"),strlen($a['pattern']));
					if(count(preg_split($pattern, $str, -1, PREG_SPLIT_NO_EMPTY))==0){
						$foldername = preg_split($pattern, $a['pattern'], -1, PREG_SPLIT_NO_EMPTY)[0];

						$a['read']	 ==true?$read="1":$read="0";
						$a['write']	 ==true?$write="1":$write="0";
						$a['locked'] ==true?$locked="1":$locked="0";
						$a['hidden'] ==true?$hidden="1":$hidden="0";
						$a['filelock'] ==true?$filelock="1":$filelock="0";

						$sql = 'UPDATE elfinder_file set [read] = "'.$read.'", write = "'.$write.'", locked = "'.$locked.'", hidden = "'.$hidden.'" where name ="'.$foldername.'" and mime ="directory"';
						$res = $this->query($sql);
						// set files attributes inside directory
						$sql = 'SELECT * FROM elfinder_file WHERE mime ="directory" and name = "'.$foldername.'"';
						$res = $this->query($sql);
						$row = odbc_fetch_array($res);
						$row['parent_id']!==NULL?$parent_id=$row['id']:$parent_id="0";

						$sql = 'UPDATE elfinder_file set [read] = "'.$read.'", write = "'.$write.'", locked = "'.$filelock.'", hidden = "'.$hidden.'" where	 parent_id="'.$parent_id.'"';
						$res = $this->query($sql);

					}
				}
			}
		}


		// set files attributes
		if (!empty($this->options['attributes']) && is_array($this->options['attributes'])) {

			foreach ($this->options['attributes'] as $a) {
				// attributes must contain pattern and at least one rule
				if (!empty($a['pattern']) || count($a) > 1) {
					$pattern = '/[^a-zA-Z0-9;._-]/';
					$rootfolderpath = explode("/^",$a['pattern'])[0];

					$sql = 'SELECT * FROM elfinder_file WHERE mime ="directory" and name = "'.$rootfolderpath.'"';
					$res = $this->query($sql);
					$row = odbc_fetch_array($res);

					$row['id']!==NULL?$id=$row['id']:$id="0";
					$row['parent_id']!==NULL?$parent_id=$row['id']:$parent_id="0";

					$a['read'] ==true?$read="1":$read="0";
					$a['write'] ==true?$write="1":$write="0";
					$a['locked'] ==true?$locked="1":$locked="0";
					$a['hidden'] ==true?$hidden="1":$hidden="0";

					$filename = explode("/^",$a['pattern'])[1];
					$filename = preg_split($pattern, $filename, -1, PREG_SPLIT_NO_EMPTY);
					foreach ($filename as $value){
						$sql = 'UPDATE elfinder_file set [read] = "'.$read.'", write = "'.$write.'", locked = "'.$locked.'", hidden = "'.$hidden.'" where name REGEXP "'.$value.'" and parent_id="'.$parent_id.'"';
						$res = $this->query($sql);
					}
				}
			}
		}
		return;
	}

} // END class


