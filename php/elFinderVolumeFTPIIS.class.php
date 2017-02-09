<?php

/**
 * Simple elFinder driver for IIS FTP
 *
 **/
class elFinderVolumeFTPIIS extends elFinderVolumeFTP {
	
	/**
	 * Connect to ftp server
	 *
	 * @return bool
	 **/
	protected function connect() {
		if (!($this->connect = ftp_connect($this->options['host'], $this->options['port'], $this->options['timeout']))) {
			return $this->setError('Unable to connect to FTP server '.$this->options['host']);
		}
		if (!ftp_login($this->connect, $this->options['user'], $this->options['pass'])) {
			$this->umount();
			return $this->setError('Unable to login into '.$this->options['host']);
		}
		
		// switch off extended passive mode - may be usefull for some servers
		//@ftp_exec($this->connect, 'epsv4 off' );
		// enter passive mode if required
		$this->options['mode'] = 'active';
		ftp_pasv($this->connect, $this->options['mode'] == 'passive');

		// enter root folder
		if (!ftp_chdir($this->connect, $this->root))
		{
			$this->umount();
			return $this->setError('Unable to open root folder.');
		}
		
		$stat = array();
		$stat['name'] = $this->root;
		$stat['mime'] = 'directory';
		$this->filesCache[$this->root] = $stat;
		$this->cacheDir($this->root);
		
		return true;
	}
	
	/**
	 * Parse line from ftp_rawlist() output and return file stat (array)
	 *
	 * @param  string  $raw  line from ftp_rawlist() output
	 * @return array
	 **/
	protected function parseRaw($raw) {
		$info = preg_split("/\s+/", $raw, 9);
		$stat = array();

		$stat['name'] = join(" ", array_slice($info, 3, 9));
		$stat['read'] = true;
		if ($info[2] == '<DIR>')
		{
			$stat['size'] = 0;
			$stat['mime'] = 'directory';
		}
		else
		{
			$stat['size'] = $info[2];
			$stat['mime'] = $this->mimetype($stat['name']);
		}

		return $stat;
	}
	
	/**
	 * Cache dir contents
	 *
	 * @param  string  $path  dir path
	 * @return void
	 **/
	protected function cacheDir($path) {
		$this->dirsCache[$path] = array();

		if (preg_match('/\'|\"/', $path)) {
			foreach (ftp_nlist($this->connect, $path) as $p) {
				if (($stat = $this->_stat($p)) &&empty($stat['hidden'])) {
					// $files[] = $stat;
					$this->dirsCache[$path][] = $p;
				}
			}
			return;
		}
		foreach (ftp_rawlist($this->connect, $path) as $raw) {
			if (($stat = $this->parseRaw($raw))) {
				$p    = $path.DIRECTORY_SEPARATOR.$stat['name'];
					// $files[] = $stat;
					$this->dirsCache[$path][] = $p;
					//$stat['name'] = $p;
					$this->filesCache[$p] = $stat;
			}
		}
	}

	protected function _stat($path) {
		$stat = array();

		$stat = $this->filesCache[$path];
		
		if (empty($stat))
		{
			$this->cacheDir($this->_dirname($path));
			$stat = $this->filesCache[$path];
			
		}
		
		return $stat;
	}
	

	protected function ftp_scan_dir($remote_directory)
	{
		$buff = ftp_rawlist($this->connect, $remote_directory, true);
		$items = array();
		foreach ($buff as $str) {
			$info = preg_split("/\s+/", $str, 9);
			$remote_file_path = $remote_directory . DIRECTORY_SEPARATOR . join(" ", array_slice($info, 3, 9));
			$item = array();
			$item['type'] = $info[2] == '<DIR>' ? 'd' : 'f';
			$item['path'] = $remote_file_path;
			$items[] = $item;
			
			if ($item['type'] == 'd')
				$items = array_merge($items, $this->ftp_scan_dir($item['path']));
		}
		return $items;
	}
} // END class

