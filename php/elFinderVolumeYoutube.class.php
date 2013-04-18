<?php

/**
 * elFinder driver for Youtube.
 *
 * @author Martin Müller <mrtnmueller@gmx.de>
 * @copyright (c) 2013, Martin Müller
 * @license http://www.apache.org/licenses/LICENSE-2.0 Apache 2.0 License
 * @version 0.1
 * 
 **/

require_once 'Zend/Loader.php';
Zend_Loader::loadClass('Zend_Gdata_YouTube');
Zend_Loader::loadClass('Zend_Gdata_ClientLogin');


class elFinderVolumeYoutube extends elFinderVolumeDriver {
	
	/**
	 * Driver id
	 * Must be started from letter and contains [a-z0-9]
	 * Used as part of volume id
	 *
	 * @var string
	 **/
	protected $driverId = 'yt';
	
	/**
	 * The youtube object, initialized in constructor
	 * @var Zend_Gdata_YouTube
	 **/
	protected $yt;
	
	/**
	 * The Zend HTTP Client, initialized in constructor
	 * @var Zend_Gdata_HttpClient
	 */
	protected $http;
	
	/**
	 * Directory for tmp files
	 * If not set driver will try to use tmbDir as tmpDir
	 *
	 * @var string
	 **/
	protected $tmpPath = '';
	
	/**
	 * YT files cache
	 * @var array
	 */
	protected $ytstatcache;


	/**
	 * Constructor
	 * Extend options with required fields
	 *
	 * @return void
	 **/
	public function __construct() {
		$opts = array(
			'authenticationURL' => 'https://www.google.com/accounts/ClientLogin',
			'developerKey'      => '',
			'applicationId'     => '',
			'clientId'          => '',
			'username'          => '',
			'password'          => '',
			'service'			=> 'youtube',
			'client'			=> null,
			'source'			=> 'elFinderVolumeYoutube',
			'loginToken'		=> null,
			'loginCaptcha'		=> null
		);
		$this->options = array_merge($this->options, $opts);
		$this->options['mimeDetect'] = 'internal';
		
	}
	
	/*********************************************************************/
	/*                        INIT AND CONFIGURE                         */
	/*********************************************************************/
	
	/**
	 * Prepare driver before mount volume.
	 * @return bool
	 **/
	protected function init() {
		
		if (! ($this->options['developerKey'] 
				|| $this->options['applicationId'])
				||  !$this->options['clientId'] 
				||  !$this->options['username'] 
				||  !$this->options['password']
		) {
			return false;
		}
		
		return true;
	}


	/**
	 * Configure
	 * @return void
	 **/
	protected function configure() {
		parent::configure();
		$this->mimeDetect = 'internal';
	}
	
	
	/**
	 * Start YT connection
	 * @return boolean
	 */
	private function initYt(){
		
		try{
			$this->http =  
			  Zend_Gdata_ClientLogin::getHttpClient(
					$username = $this->options['username'],
					$password = $this->options['password'],
					$service = $this->options['service'],
					$client = $this->options['client'],
					$source = $this->options['source'],
					$loginToken = $this->options['loginToken'],
					$loginCaptcha = $this->options['loginCaptcha'],
					$this->options['authenticationURL']
				);

			$this->yt = new Zend_Gdata_YouTube(
					$this->http, 
					$this->options['applicationId'], 
					$this->options['clientId'],
					$this->options['developerKey']
				);

			return true;
			
		}  catch (Exception $e){
			return $this->setError(elFinder::ERROR_NETMOUNT_FAILED);
		}
		
	}
	
	private function updateYtCache() {
		
		if(!$this->yt) $this->initYt();
		$this->ytstatcache = array();
		
		try{
			
			$channelName = $this->yt->getUserProfile('default')->username->text;
			$videoFeed = $this->yt->getUserUploads($channelName);

			foreach ($videoFeed as $videoEntry) {
				
				$thumbnails = $videoEntry->getVideoThumbnails();
				if(isset($thumbnails[2]))		$videoThumb = $thumbnails[2]['url'];
				else if(isset($thumbnails[0]))	$videoThumb = $thumbnails[0]['url'];
				
				$this->ytstatcache[$videoEntry->getVideoTitle()] = 
						array(
							'id' => $this->encode($videoEntry->getVideoId()),
							'parent_id' => null,
							'url' => $videoEntry->getVideoWatchPageUrl(),
							'name' => $videoEntry->getVideoTitle(),
							'size' => $videoEntry->getVideoDuration(),
							'ts' => strtotime($videoEntry->published->text),
							'mime' => 'video',
							'read' => true,
							'write' => true,
							'locked' => false,
							'hidden' => false,
							'width' => 0,
							'height' => 0,
							'tmb' => $videoThumb
						 );
			}//foreach

		}  catch (Exception $e){

			return $this->setError(elFinder::ERROR_NETMOUNT_FAILED);

		}//end of try-catch
	}
	
	
	/**
	 * Close connection
	 * @return void
	 **/
	public function umount() {
		
	}
	
	/**
	 * Return debug info for client
	 * @return array
	 **/
	public function debug() {
		$debug = parent::debug();
		return $debug;
	}
	
	/**
	 * YT does not allow creating thumbnails
	 * @param string $path thumnbnail path 
	 * @param array $stat file stat
	 * @return boolean
	 */
	public function canCreateTmb($path, $stat) {
		return false;
	}
	
	/**
	 * YT does not allow resizing
	 * @param type $path
	 * @param type $stat
	 * @return boolean
	 */
	public function canResize($path, $stat) {
		return false;
	}
	

	/*********************************************************************/
	/*                               FS API                              */
	/*********************************************************************/

	/**
	 * Return array of parents paths (ids)
	 * @param int $path file path (id)
	 * @return array
	 **/
	protected function getParents($path) {
		$parents = array($this->root);
		return $parents;
	}

	/**
	 * Recursive file search
	 * YT has no directory structure so just return the results from the
	 * normal seach
	 *
	 * @param  string  $path   dir path
	 * @param  string  $q      search string
	 * @param  array   $mimes
	 * @return array
	 **/
	protected function doSearch($path, $q, $mimes) {
		return $this->search($q, $mimes);
	}
	
	/**
	 * Search files
	 *
	 * @param  string  $q  search string
	 * @param  array   $mimes
	 * @return array
	 **/
	public function search($q, $mimes) {
		$result = array();
		
		if(!isset($this->ytstatcache)){
			$this->updateYtCache();
		}
		
		if($this->ytstatcache){
			foreach($this->ytstatcache as $file){
				
				if(stristr($file['name'], $q)){
					
					$stat = $this->updateCache($file['id'], $file);
					$result[] = $stat;
				}
			}
		}
		
		return $result;
	}


	/*********************** paths/urls *************************/
	
	/**
	 * Return parent directory path
	 * YT only has the virtual root folder as parent dir
	 * @param string $path file path
	 * @return string
	 **/
	protected function _dirname($path) {
		return $this->root;
	}

	/**
	 * Return file name
	 * @param string $path file path
	 * @return string
	 **/
	protected function _basename($path) {
		return ($stat = $this->stat($path)) ? $stat['name'] : false;
	}

	/**
	 * Join dir name and file name and return full path
	 * @param string $dir
	 * @param string $name
	 * @return string
	 **/
	protected function _joinPath($dir, $name) {
		
		return $dir.DIRECTORY_SEPARATOR.$name;
	}
	
	/**
	 * Return normalized path, this works the same as os.path.normpath() in Python
	 * @param string $path path
	 * @return string
	 **/
	protected function _normpath($path) {
		return $path;
	}
	
	/**
	 * Return file path related to root dir
	 * @param string $path file path
	 * @return string
	 **/
	protected function _relpath($path) {
		return $path;
	}
	
	/**
	 * Convert path related to root dir into real path
	 * @param string $path file path
	 * @return string
	 **/
	protected function _abspath($path) {
		return $path;
	}
	
	/**
	 * Return fake path started from root dir
	 *
	 * @param  string  $path  file path
	 * @return string
	 **/
	protected function _path($path) {
		if (($file = $this->stat($path)) == false) {
			return '';
		}
		return $this->root.DIRECTORY_SEPARATOR.$file['name'];
	}
	
	/**
	 * Return true if $path is children of $parent
	 * @param string $path path to check
	 * @param string $parent parent path
	 * @return bool
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
	 * @param string $path file path 
	 * @return array|false
	 **/
	protected function _stat($path) {
		
			if($path == $this->root){
				
				return array(
						"mime"	=>	"directory",
						"ts"	=>	1365674179,
						'read'	=>	true,
						'write'	=>	true,
						'size'	=>	0,
						'name'	=>	'videos'
					);
				
			}else{
				
				if(!isset($this->ytstatcache)){
					$this->updateYtCache();
				}
				
				if(isset($this->ytstatcache[basename($path)])){
					
					return $this->ytstatcache[basename($path)];
				}
				
			}//else (not root element)
		
	}//_stat()
	
	/**
	 * Return true if path is dir and has at least one childs directory
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 **/
	protected function _subdirs($path) {
		return false;
	}
	
	/**
	 * Return object width and height
	 * Not yet available in YT, may be implemented later
	 *
	 * @param string $path file path
	 * @param string $mime file mime type
	 * @return string
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
	 **/
	protected function _scandir($path) {

		//read available videos from yt
		$files = array();
		
		if(!isset($this->ytstatcache)){
			$this->updateYtCache();
		}
		
		foreach ($this->ytstatcache as $name=>$stat) {
			$files[] = $this->root.DIRECTORY_SEPARATOR.$name;
		}

		return $files;

	}//_scandir($path)
	
		
	/**
	 * Open file and return file pointer
	 * YT dows not allow "open" in a general sense
	 *
	 * @param string $path file path
	 * @param string $mode open file mode (ignored in this driver)
	 * @return resource|false
	 **/
	protected function _fopen($path, $mode='rb') {
		
		return false;
	}
	
	/**
	 * Close opened file
	 *
	 * @param  resource  $fp  file pointer
	 * @return bool
	 **/
	protected function _fclose($fp, $path='') {
		
		return true;
	}
	
	/********************  file/dir manipulations *************************/
	
	/**
	 * Create dir and return created dir path or false on failed
	 * YT dows not allow for folder creation, always return false
	 *
	 * @param string $path parent dir path
	 * @param string $name new directory name
	 * @return string|bool
	 **/
	protected function _mkdir($path, $name) {
		return false;
	}
	
	/**
	 * Create file and return its path or false on failed
	 * YT dows not allow for direct file creation, always return false
	 *
	 * @param  string $path parent dir path
	 * @param string $name new file name
	 * @return string|bool
	 **/
	protected function _mkfile($path, $name) {
		return false;
	}
	
	/**
	 * Create symlink.
	 * YT does not support symlinks.
	 *
	 * @param string $target link target
	 * @param string $path symlink path
	 * @return bool
	 **/
	protected function _symlink($target, $path, $name) {
		return false;
	}
	
	/**
	 * Copy file into another file
	 * YT does not support copying, moreover videos with the same content (probably
	 * derived from some hasing mechanism) get rejected on upload.
	 *
	 * @param string $source source file path
	 * @param string $targetDir target directory path
	 * @param string $name new file name
	 * @return bool
	 **/
	protected function _copy($source, $targetDir, $name) {
		return false;
	}
	
	/**
	 * Move file into another dir.
	 * For YT this means to rename a video.
	 *
	 * @param string $source source file path
	 * @param string $target target dir path
	 * @param string $name file name
	 * @return string|bool
	 **/
	protected function _move($source, $targetDir, $name) {
		
		$target = $targetDir.DIRECTORY_SEPARATOR.$name;
		$stat = $this->_stat($source);
		$videoId = $this->decode($stat['id']);
		if(!$this->yt) $this->initYt();
		
		try{
			//try deleting the video
			$videoEntry = $this->yt->getVideoEntry($videoId, null, true);
			$videoEntry->setVideoTitle($name);
			$this->yt->updateEntry($videoEntry, $videoEntry->getEditLink()->getHref());
			$this->updateYtCache();
			return $target;
			
		}  catch (Exception $e){
			return false;
		}
		
		return false;
	}
		
	/**
	 * Remove file
	 *
	 * @param string $path file path
	 * @return bool
	 **/
	protected function _unlink($path) {
		
		$stat = $this->_stat($path);
		$videoId = $this->decode($stat['id']);
		if(!$this->yt) $this->initYt();
		
		try{
			//try deleting the video
			$videoEntry = $this->yt->getVideoEntry($videoId, null, true);
			$this->yt->delete($videoEntry);
			$this->updateYtCache();
			return true;
			
		}  catch (Exception $e){
			return false;
		}
	}

	/**
	 * Remove dir
	 * YT does not support directories. Return false always.
	 *
	 * @param  string  $path  dir path
	 * @return bool
	 **/
	protected function _rmdir($path) {
		return false;
	}
	
	
	/**
	 * Create new file and write into it from file pointer.
	 * For YT this means: upload a video.
	 *
	 * @param resource $fp file pointer
	 * @param string $dir target dir path
	 * @param string $name file name
	 * @param array $stat file stat (required by some virtual fs)
	 * @return bool|string
	 **/
	protected function _save($fp, $dir, $name, $stat) {
		
		$path = $dir.DIRECTORY_SEPARATOR.$name;
		$this->clearcache();
		if(!$this->yt) $this->initYt ();
		$meta = stream_get_meta_data($fp);
		
		$myVideoEntry = new Zend_Gdata_YouTube_VideoEntry();

		// create a new Zend_Gdata_App_MediaFileSource object
		$filesource = $this->yt->newMediaFileSource($meta['uri']);
		$filesource->setContentType($stat['mime']);
		// set slug header
		$filesource->setSlug($meta['uri']);

		// add the filesource to the video entry
		$myVideoEntry->setMediaSource($filesource);

		$myVideoEntry->setVideoTitle($name);
		$myVideoEntry->setVideoDescription('Uploaded with regi-on.net');
		// The category must be a valid YouTube category!
		$myVideoEntry->setVideoCategory('Film');

		// Set keywords. Please note that this must be a comma-separated string
		// and that individual keywords cannot contain whitespace
		$myVideoEntry->SetVideoTags('regi-on.net');

		// upload URI for the currently authenticated user
		$uploadUrl = 'http://uploads.gdata.youtube.com/feeds/api/users/default/uploads';

		// try to upload the video
		try {
			$newEntry = $this->yt->insertEntry($myVideoEntry, $uploadUrl, 'Zend_Gdata_YouTube_VideoEntry');
			
			while(1){
				
				$videoEntry = $this->yt->getFullVideoEntry($newEntry->getVideoId());
				$state = $videoEntry->getVideoState();
				if($state){
					
					if($state->getName() == 'processing'){
						set_time_limit(ini_get('max_execution_time'));
						sleep(5);
					}else if($state->getName() == "rejected" || $state->getName() == "failed"){
						return false;
					}else{
						break;
					}
				}else{
					//no state info = finished
					break;
				}
				
			}
			
			$this->updateYtCache();
			return $path;
			
		}catch(Exception $e){
			return false;
		}
		
	}
	
	/**
	 * Get file contents
	 *
	 * @param string $path file path
	 * @return string|false
	 **/
	protected function _getContents($path) {
		
		return false;
		
		
	}
	
	/**
	 * Write a string to a file
	 *
	 * @param  string  $path     file path
	 * @param  string  $content  new file content
	 * @return bool
	 **/
	protected function _filePutContents($path, $content) {
		
		return false;
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
	 * Unpack archive
	 * YT does not support archive.
	 *
	 * @param string $path archive path
	 * @param array $arc archiver command and arguments (same as in $this->archivers)
	 * @return void
	 **/
	protected function _unpack($path, $arc) {
		return;
	}

	/**
	 * Recursive symlinks search
	 * YT does not support symlinks.
	 *
	 * @param string $path file/dir path
	 * @return bool
	 **/
	protected function _findSymlinks($path) {
		return false;
	}

	/**
	 * Extract files from archive
	 * YT does not support archive.
	 *
	 * @param string $path archive path
	 * @param array $arc archiver command and arguments (same as in $this->archivers)
	 * @return bool
	 **/
	protected function _extract($path, $arc) {
		return false;
	}
	
	/**
	 * Create archive and return its path
	 * YT does not support archive.
	 *
	 * @param string $dir target dir
	 * @param array $files files names list
	 * @param string $name archive name
	 * @param  array $arc archiver options
	 * @return string|bool
	 **/
	protected function _archive($dir, $files, $name, $arc) {
		return false;
	}
	
} // END class 
