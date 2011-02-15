<?php

/**
 * elFinder storages interface
 *
 * @package elFinder
 * @author Dmitry (dio) Levashov
 **/
interface elFinderStorageDriver {
	
	/**
	 * Init storage.
	 * Return true if storage available
	 *
	 * @param  array  object configuration
	 * @param  string  unique key to use as prefix in files hashes
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function load(array $opts, $key);
	
	/**
	 * Return true if file exists
	 *
	 * @param  string  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function fileExists($hash);
	
	/**
	 * Return true if file is ordinary file
	 *
	 * @param  string  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isFile($hash);
	
	/**
	 * Return true if file is directory
	 *
	 * @param  string  file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isDir($hash);
	
	/**
	 * Return true if file is readable
	 *
	 * @param  string  file hash (use "/" to test root dir)
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isReadable($hash);
	
	/**
	 * Return true if file is writable
	 *
	 * @param  string  file hash (use "/" to test root dir)
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isWritable($hash);
	
	/**
	 * Return true if file can be removed
	 *
	 * @param  string  file hash (use "/" to test root dir)
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function isRemovable($hash);
	
	/**
	 * Return file/dir info
	 *
	 * @param  string  file hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function getInfo($hash);
	
	/**
	 * Return directory info
	 *
	 * @param  string  directory hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function dirInfo($hash);
	
	/**
	 * Return directory content
	 *
	 * @param  string  directory hash
	 * @param  string  sort rule
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function dirContent($hash, $sort, $mimes=array());

	/**
	 * Return directory subdirs.
	 * Return one-level array, each dir contains parent dir hash
	 *
	 * @param  string  directory hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function tree($root);

	/**
	 * Create thumbnails in directory
	 * Return info about created thumbnails
	 *
	 * @param  string  directory hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function tmb($hash);

	/**
	 * Return opened file pointer and required headers.
	 * Used to open file in browser when option fileURL == false
	 *
	 * @param  string  file hash
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function file($hash);

	/**
	 * Open file and return descriptor
	 * Requered to copy file across storages with different types
	 *
	 * @param  string  file hash
	 * @param  string  open mode
	 * @return resource
	 * @author Dmitry (dio) Levashov
	 **/
	public function open($hash, $mode="rb");

	/**
	 * Close file opened by open() methods
	 *
	 * @param  resource  file descriptor
	 * @return void
	 * @author Dmitry (dio) Levashov
	 **/
	public function close($fp);
	
	/**
	 * Create directory
	 *
	 * @param  string  parent directory hash
	 * @param  string  new directory name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function mkdir($hash, $name);

	/**
	 * Create empty file
	 *
	 * @param  string  parent directory hash
	 * @param  string  new file name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function mkfile($hash, $name);

	/**
	 * Remove directory/file
	 *
	 * @param  string  directory/file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function rm($hash);

	/**
	 * Rename directory/file
	 *
	 * @param  string  directory/file hash
	 * @param  string  new name
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function rename($hash, $name);

	/**
	 * Create directory/file copy
	 *
	 * @param  string  directory/file hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function duplicate($hash);

	/**
	 * Copy file/dir under one root storage only
	 * Return hash of new file/dir
	 *
	 * @param  string    file/dir to copy hash
	 * @param  string    destination dir hash
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function copy($from, $to);
	
	/**
	 * Copy file/dir from another root storage
	 * Return hash of new file/dir
	 *
	 * @param  elFinderStorageDriver  source root storage
	 * @param  string  target file/dir hash
	 * @param  string  destination dir hash
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function paste($root, $src, $dst);
	
	/**
	 * Return file content
	 *
	 * @param  string  file hash
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function getContent($hash);

	/**
	 * Write content into file
	 *
	 * @param  string  file hash
	 * @param  string  new content
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function setContent($hash, $content);

	/**
	 * Create archive from required directories/files
	 *
	 * @param  array   files hashes
	 * @param  string  archive name
	 * @param  string  archive mimetype
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function archive($files, $name, $type);

	/**
	 * Extract files from archive
	 *
	 * @param  string  archive hash
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function extract($hash);
	
	/**
	 * Resize image
	 *
	 * @param  string  image hash
	 * @param  int     new width
	 * @param  int     new height
	 * @return bool
	 * @author Dmitry (dio) Levashov
	 **/
	public function resize($hash, $w, $h);

	/**
	 * Find directories/files by name mask
	 * Not implemented on client side yet
	 * For future version
	 *
	 * @param  string  name mask
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function find($mask);
	
	/**
	 * Return error message from last failed action
	 *
	 * @return string
	 * @author Dmitry (dio) Levashov
	 **/
	public function error();
	
	/**
	 * Return debug info
	 *
	 * @return array
	 * @author Dmitry (dio) Levashov
	 **/
	public function debug();
	
}// END interface 

?>