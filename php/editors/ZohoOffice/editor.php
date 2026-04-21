<?php

class elFinderEditorZohoOffice extends elFinderEditor
{
    private static $curlTimeout = 20;

    protected $allowed = array('init', 'save', 'chk');

    protected $editor_settings = array(
        'writer' => array(
            'unit' => 'mm',
            'view' => 'pageview'
        ),
        'sheet' => array(
            'country' => 'US'
        ),
        'show' => array()
    );

    private $urls = array(
        'writer' => 'https://api.office-integrator.com/writer/officeapi/v1/document',
        'sheet' => 'https://api.office-integrator.com/sheet/officeapi/v1/spreadsheet',
        'show' => 'https://api.office-integrator.com/show/officeapi/v1/presentation',
    );

    private $srvs = array(
        'application/msword' => 'writer',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'writer',
        'application/pdf' => 'writer',
        'application/vnd.oasis.opendocument.text' => 'writer',
        'application/rtf' => 'writer',
        'text/html' => 'writer',
        'application/vnd.ms-excel' => 'sheet',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'sheet',
        'application/vnd.oasis.opendocument.spreadsheet' => 'sheet',
        'application/vnd.sun.xml.calc' => 'sheet',
        'text/csv' => 'sheet',
        'text/tab-separated-values' => 'sheet',
        'application/vnd.ms-powerpoint' => 'show',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'show',
        'application/vnd.openxmlformats-officedocument.presentationml.slideshow' => 'show',
        'application/vnd.oasis.opendocument.presentation' => 'show',
        'application/vnd.sun.xml.impress' => 'show',
    );

    private $myName = '';

    protected function extentionNormrize($extention, $srvsName) {
        switch($srvsName) {
            case 'writer':
                if (!in_array($extention, array('zdoc', 'docx', 'rtf', 'odt', 'html', 'txt'))) {
                    $extention = 'docx';
                }
                break;
            case 'sheet':
                if (!in_array($extention, array('zsheet', 'xls', 'xlsx', 'ods', 'csv', 'tsv'))) {
                    $extention = 'xlsx';
                }
                break;
            case 'show':
                if (!in_array($extention, array('zslides', 'pptx', 'pps', 'ppsx', 'odp', 'sxi'))) {
                    $extention = 'pptx';
                }
                break;

        }
        return $extention;
    }

    public function __construct($elfinder, $args)
    {
        parent::__construct($elfinder, $args);
        $this->myName = preg_replace('/^elFinderEditor/i', '', get_class($this));
    }

    public function enabled()
    {
        return defined('ELFINDER_ZOHO_OFFICE_APIKEY') && ELFINDER_ZOHO_OFFICE_APIKEY && function_exists('curl_init');
    }

    public function init()
    {
        $this->gcCallbackStates();

        if (!defined('ELFINDER_ZOHO_OFFICE_APIKEY') || !function_exists('curl_init')) {
            return array('error', array(elFinder::ERROR_CONF, '`ELFINDER_ZOHO_OFFICE_APIKEY` or curl extension'));
        }
        if (!empty($this->args['target'])) {
            $fp = $cfile = null;
            $hash = $this->args['target'];
            /** @var elFinderVolumeDriver $srcVol */
            if (($srcVol = $this->elfinder->getVolume($hash)) && ($file = $srcVol->file($hash))) {
                $cdata = empty($this->args['cdata']) ? '' : $this->args['cdata'];
                $cookie = $this->elfinder->getFetchCookieFile();
                $save = false;
                $ch = curl_init();
                $conUrl = elFinder::getConnectorUrl();
                curl_setopt($ch, CURLOPT_URL, $conUrl . (strpos($conUrl, '?') !== false? '&' : '?') . 'cmd=editor&name=' . $this->myName . '&method=chk&args[target]=' . rawurlencode($hash) . $cdata);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                if ($cookie) {
                    curl_setopt($ch, CURLOPT_COOKIEJAR, $cookie);
                    curl_setopt($ch, CURLOPT_COOKIEFILE, $cookie);
                }
                $res = curl_exec($ch);
                if (PHP_VERSION_ID < 80000) {
                    curl_close($ch);
                } else {
                    unset($ch);
                }
                if ($res) {
                    if ($data = json_decode($res, true)) {
                        $save = !empty($data['cansave']);
                    }
                }

                if ($size = $file['size']) {
                    $src = $srcVol->open($hash);
                    $fp = tmpfile();
                    stream_copy_to_stream($src, $fp);
                    $srcVol->close($src, $hash);
                    $info = stream_get_meta_data($fp);
                    if ($info && !empty($info['uri'])) {
                        $srcFile = $info['uri'];
                        if (class_exists('CURLFile')) {
                            $cfile = new CURLFile($srcFile);
                            $cfile->setPostFilename($file['name']);
                            $cfile->setMimeType($file['mime']);
                        } else {
                            $cfile = '@' . $srcFile;
                        }
                    }
                }
                //$srv = $this->args['service'];
                $srvsName = $this->srvs[$file['mime']];
                $format = $this->extentionNormrize($srcVol->getExtentionByMime($file['mime']), $srvsName);
                if (!$format) {
                    $format = substr($file['name'], strrpos($file['name'], '.') * -1);
                }
                $lang = $this->args['lang'];
                if ($lang === 'jp') {
                    $lang = 'ja';
                }
                $data = array(
                    'apikey' => ELFINDER_ZOHO_OFFICE_APIKEY,
                    'callback_settings' => array(
                        'save_format' => $format,
                        'save_url_params' => array(
                            'content' => 'content'
                        )
                    ),
                    'editor_settings' => $this->editor_settings[$srvsName],
                    'document_info' => array(
                        'document_name' => substr($file['name'], 0, strlen($file['name']) - strlen($format)- 1)
                    )
                );
                $data['editor_settings']['language'] = $lang;
                if ($save) {
                    $ttl = defined('ELFINDER_ZOHO_OFFICE_CALLBACK_TTL')
                        ? (int)ELFINDER_ZOHO_OFFICE_CALLBACK_TTL
                        : 3600;

                    if ($ttl <= 0) {
                        $ttl = 3600;
                    } else if ($ttl > 86400) {
                        $ttl = 86400;
                    }
                    $saveParams = $this->createCallbackState('save', $hash, $this->getCallbackStateSecret(), array(), $ttl);
                    if ($saveParams === false) {
                        $save = false;
                    } else {
                        $data['callback_settings']['save_url_params'] = array_merge(
                            $data['callback_settings']['save_url_params'],
                            $saveParams
                        );
                    }
                }
                if ($save) {
                    $conUrl = elFinder::getConnectorUrl();
                    $data['callback_settings']['save_url'] = $conUrl . (strpos($conUrl, '?') !== false? '&' : '?') . 'cmd=editor&name=' . $this->myName . '&method=save' . $cdata;
                }
                foreach($data as $_k => $_v) {
                    if (is_array($_v)){
                        $data[$_k] = json_encode($_v);
                    }
                }
                if ($cfile) {
                    $data['document'] = $cfile;
                }
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $this->urls[$srvsName]);
                curl_setopt($ch, CURLOPT_TIMEOUT, self::$curlTimeout);
                curl_setopt($ch, CURLOPT_HEADER, 0);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                curl_setopt($ch, CURLOPT_POST, 1);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
                $res = curl_exec($ch);
                $error = curl_error($ch);
                if (PHP_VERSION_ID < 80000) {
                    curl_close($ch);
                } else {
                    unset($ch);
                }

                $fp && fclose($fp);

                if ($res && $res = @json_decode($res, true)) {
                    if (!empty($res['document_url'])) {
                        $ret = array('zohourl' => $res['document_url']);
                        if (!$save) {
                            $ret['warning'] = 'exportToSave';
                        }
                        return $ret;
                    } else {
                        $error = $res;
                    }
                }

                if ($error) {
                    return array('error' => is_string($error)? preg_split('/[\r\n]+/', $error) : 'Error code: ' . $error);
                }
            }
        }

        return array('error' => array('errCmdParams', 'editor.' . $this->myName . '.init'));
    }

    public function save()
    {
        $state = $this->verifyCallbackRequest('save', $_POST, $this->getCallbackStateSecret());
        if ($state === false) {
            return array('raw' => true, 'error' => '', 'header' => 'HTTP/1.1 403 Forbidden');
        }

        if (empty($_FILES['content']) || (isset($_FILES['content']['error']) && (int)$_FILES['content']['error'] !== 0)) {
            return array('raw' => true, 'error' => '', 'header' => 'HTTP/1.1 500 Internal Server Error');
        }

        $tmpName = isset($_FILES['content']['tmp_name']) ? $_FILES['content']['tmp_name'] : '';
        if (!$tmpName || !is_uploaded_file($tmpName) && !is_file($tmpName)) {
            return array('raw' => true, 'error' => '', 'header' => 'HTTP/1.1 500 Internal Server Error');
        }

        $content = file_get_contents($tmpName);
        if ($content === false) {
            return array('raw' => true, 'error' => '', 'header' => 'HTTP/1.1 500 Internal Server Error');
        }

        $hash = $state['hash'];
        /** @var elFinderVolumeDriver $volume */
        if ($volume = $this->elfinder->getVolume($hash)) {
            if ($volume->putContents($hash, $content)) {
                return array('raw' => true, 'error' => '', 'header' => 'HTTP/1.1 200 OK');
            }
        }

        return array('raw' => true, 'error' => '', 'header' => 'HTTP/1.1 500 Internal Server Error');
    }

    public function chk()
    {
        $hash = $this->args['target'];
        $res = false;
        /** @var elFinderVolumeDriver $volume */
        if ($volume = $this->elfinder->getVolume($hash)) {
            if ($file = $volume->file($hash)) {
                $res = (bool)$file['write'];
            }
        }
        return array('cansave' => $res);
    }

    protected function getCallbackStateSecret()
    {
        return hash('sha256', implode('|', array(
            __CLASS__,
            __FILE__,
            ELFINDER_ZOHO_OFFICE_APIKEY
        )));
    }
}
