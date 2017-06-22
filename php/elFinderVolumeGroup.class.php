<?php

/**
 * elFinder driver for Volume Group.
 *
 * @author Naoki Sawada
 **/
class elFinderVolumeGroup extends elFinderVolumeDriver {
	
	/**
	 * Driver id
	 * Must be started from letter and contains [a-z0-9]
	 * Used as part of volume id
	 *
	 * @var string
	 **/
	protected $driverId = 'g';
	
	
	/**
	 * Constructor
	 * Extend options with required fields
	 */
	public function __construct() {
		$this->options['type'] = 'group';
		$this->options['path'] = '/';
		$this->options['dirUrlOwn'] = true;
		$this->options['syncMinMs'] = 0;
		$this->options['tmbPath'] = '';
		$this->options['disabled'] = array(
			'archive',
			'cut',
			'duplicate',
			'edit',
			'empty',
			'extract',
			'getfile',
			'mkdir',
			'mkfile',
			'paste',
			'rename',
			'resize',
			'rm',
			'upload'
		);
	}
	
	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/

	/*********************** paths/urls *************************/
	
	/**
	 * @inheritdoc
	 **/
	protected function _dirname($path) {
		return '/';
	}

	/**
	 * {@inheritDoc}
	 **/
	protected function _basename($path) {
		return '';
	}

	/**
	 * {@inheritDoc}
	 **/
	protected function _joinPath($dir, $name) {
		return '/' . $name;
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _normpath($path) {
		return '/';
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _relpath($path) {
		return '/';
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _abspath($path) {
		return '/';
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _path($path) {
		return '/';
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _inpath($path, $parent) {
		return false;
	}
	
	
	
	/***************** file stat ********************/

	/**
	 * {@inheritDoc}
	 **/
	protected function _stat($path) {
		if ($path === '/') {
			return array(
				'size'   => 0,
				'ts'     => 0,
				'mime'   => 'directory',
				'read'   => true,
				'write'  => false,
				'locked' => true,
				'hidden' => false,
				'dirs'   => 0
			);
		}
		return false;
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _subdirs($path) {
		$dirs = false;
		if ($path === '/') {
			return true;
		}
		return $dirs;
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _dimensions($path, $mime) {
		return false;
	}
	/******************** file/dir content *********************/
	
	/**
	 * {@inheritDoc}
	 **/
	protected function readlink($path) {
		return null;
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _scandir($path) {
		return array();
	}

	/**
	 * {@inheritDoc}
	 **/
	protected function _fopen($path, $mode='rb') {
		return false;
	}

	/**
	 * {@inheritDoc}
	 **/
	protected function _fclose($fp, $path='') {
		return true;
	}
	
	/********************  file/dir manipulations *************************/
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _mkdir($path, $name) {
		return false;
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _mkfile($path, $name) {
		return false;
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _symlink($source, $targetDir, $name) {
		return false;
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _copy($source, $targetDir, $name) {
		return false;
	}

	/**
	 * {@inheritDoc}
	 **/
	protected function _move($source, $targetDir, $name) {
		return false;
	}
		
	/**
	 * {@inheritDoc}
	 **/
	protected function _unlink($path) {
		return false;
	}

	/**
	 * {@inheritDoc}
	 **/
	protected function _rmdir($path) {
		return false;
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _save($fp, $dir, $name, $stat) {
		return false;
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _getContents($path) {
		return false;
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _filePutContents($path, $content) {
		return false;
	}

	/**
	 * {@inheritDoc}
	 **/
	protected function _checkArchivers() {
		return;
	}

	/**
	 * {@inheritDoc}
	 **/
	protected function _chmod($path, $mode) {
		return false;
	}

	/**
	 * {@inheritDoc}
	 **/
	protected function _findSymlinks($path) {
		return false;
	}

	/**
	 * {@inheritDoc}
	 **/
	protected function _extract($path, $arc) {
		return false;
	}
	
	/**
	 * {@inheritDoc}
	 **/
	protected function _archive($dir, $files, $name, $arc) {
		return false;
	}
}

