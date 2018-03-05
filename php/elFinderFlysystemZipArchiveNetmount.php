<?php
use League\Flysystem\Filesystem;
use League\Flysystem\ZipArchive\ZipArchiveAdapter;
use Barryvdh\elFinderFlysystemDriver\Driver;

elFinder::$netDrivers['ziparchive'] = 'FlysystemZipArchiveNetmount';

class elFinderVolumeFlysystemZipArchiveNetmount extends Driver
{
    private $useTempFile = false;

    public function __construct()
    {
        parent::__construct();
        
        $opts = array(
            'acceptedName' => '#^[^/\\?*:|"<>]*[^./\\?*:|"<>]$#',
            'rootCssClass' => 'elfinder-navbar-root-zip'
        );

        $this->options = array_merge($this->options, $opts);
    }

    /**
     * @inheritdoc
     */
    protected function init()
    {
        if (empty($this->options['icon'])) {
            $this->options['icon'] = true;
        }
        
        if ($res = parent::init()) {
            if ($this->options['icon'] === true) {
                unset($this->options['icon']);
            }
            // enable command archive
            $this->options['useRemoteArchive'] = true;
        }
        
        return $res;
    }

    /**
     * Prepare
     * Call from elFinder::netmout() before volume->mount()
     *
     * @param $options
     * @return Array
     * @author Naoki Sawada
     */
    public function netmountPrepare($options)
    {
        try {
            $elFinder = elFinder::$instance;
            if (! $srcVolume = $elFinder->getVolume($options['host'])) {
                throw new Exception('Source volume not found.');
            }
            
            $file = $srcVolume->file($options['host']);

            if (!$file['read']) {
                throw new Exception('Target file is not readable.');
            } else if (!$file['write']) {
                throw new Exception('Target file is not writable.');
            } else if (!$file['mime'] === 'application/zip') {
                throw new Exception('Target file is not the Zip Archive.');
            }
            if ($file['read'] && $file['write'] && $file['mime'] === 'application/zip') {
                $path = null;
                $toastTime = 5000; // 5 sec
                if ($srcVolume instanceof elFinderVolumeLocalFileSystem) {
                    $path = $srcVolume->getPath($options['host']);
                    if (!is_readable($path)) {
                        $path = null;
                    }
                }
                if (!$path) {
                    if (!$tempFileInfo = $srcVolume->getTempLinkInfo($file['hash'])) {
                        throw new Exception('Cannot make a local temporary file.');
                    }
                    $path = $tempFileInfo['path'];
                    $options['useTempFile'] = true;
                    $options['toast'] = array(
                        'mode' => 'warning',
                        'msg' => '%reflectOnUnmount%',
                        'timeOut' => $toastTime
                    );
                } else {
                    $options['toast'] = array(
                        'mode' => 'success',
                        'msg' => '%reflectOnImmediate%',
                        'timeOut' => $toastTime
                    );
                }
                $options['localpath'] = $path;
                $options['alias'] = $file['name'];
                $options['phash'] = $options['path'];
                unset($options['path']);
                $this->netMountKey = md5(get_class() . microtime());
            } else {
                throw new Exception('Target file is not readable or writable or not the Zip Archive.');
            }
        } catch(Exception $e) {
            return array('exit' => true, 'error' => $e->getMessage());
        }

        return $options;
    }

    /**
     * @inheritdoc
     */
    public function netunmount($netVolumes, $key)
    {
        $this->clearcache();
        $srcVolume = null;
        if (!empty($this->options['useTempFile'])) {
            $srcVolume = elFinder::$instance->getVolume($this->options['host']);
        }
        if ($srcVolume && file_exists($this->options['localpath'])) {
            $srcVolume->putContents($this->options['host'], file_get_contents($this->options['localpath']));
            unlink($this->options['localpath']);
        }
        if ($tmbs = glob($this->tmbPath . DIRECTORY_SEPARATOR . $this->netMountKey . '*')) {
            foreach($tmbs as $file) {
                unlink($file);
            }
        }
        return true;
    }

    /**
     * @inheritdoc
     */
    public function mount(array $opts)
    {
        try {
            $refresh = false;
            if (!empty($opts['useTempFile'])) {
                if (!file_exists($opts['localpath'])) {
                    if (!$srcVolume = elFinder::$instance->getVolume($opts['host'])) {
                        throw new Exception(elFinder::ERROR_FILE_NOT_FOUND);
                    }
                    $tfp = fopen($opts['localpath'], 'wb');
                    $sfp = $srcVolume->open($opts['host']);
                    if (!$tfp || false === stream_copy_to_stream($sfp, $tfp)) {
                        throw new Exception(elFinder::ERROR_UPLOAD_TEMP);
                    }
                    $srcVolume->close($sfp, $opts['host']);
                    fclose($tfp);
                    $refresh = true;
                } else {
                    touch($opts['localpath']);
                } 
            } else {
                if (!file_exists($opts['localpath'])) {
                    throw new Exception(elFinder::ERROR_FILE_NOT_FOUND);
                }
            }
            $opts['driver'] = 'Flysystem';
            $opts['filesystem'] = new Filesystem(new ZipArchiveAdapter($opts['localpath']));
            $opts['path'] = '/';
            $opts['checkSubfolders'] = true;
            if (parent::mount($opts)) {
                $refresh && $this->clearcache();
                return true;
            } else {
                return false;
            }
        } catch(Exception $e) {
            return $this->setError($e->getMessage());
        }
    }

    /**
     * @inheritdoc
     */
    protected function tmbname($stat) {
        return $this->netMountKey.substr($stat['hash'], strlen($this->id)).$stat['ts'].'.png';
    }

}
