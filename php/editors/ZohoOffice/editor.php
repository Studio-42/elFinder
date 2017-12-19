<?php

class elFinderEditorZohoOffice extends elFinderEditor
{
    private static $curlTimeout = 20;

    protected $allowed = array('init', 'save');

    private $urls = array(
        'writer' => 'https://writer.zoho.com/writer/remotedoc.im',
        'sheet' => 'https://sheet.zoho.com/sheet/remotedoc.im',
        'show' => 'https://show.zoho.com/show/remotedoc.im',
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

    public function enabled()
    {
        return defined('ELFINDER_ZOHO_OFFICE_APIKEY') && function_exists('curl_init');
    }

    public function init()
    {
        if (!defined('ELFINDER_ZOHO_OFFICE_APIKEY') || !function_exists('curl_init')) {
            return array('error', array(elFinder::ERROR_CONF, '`ELFINDER_ZOHO_OFFICE_APIKEY` or curl extension'));
        }
        if (!empty($this->args['target'])) {
            $fp = $cfile = null;
            $hash = $this->args['target'];
            if (($srcVol = $this->elfinder->getVolume($hash)) && ($file = $srcVol->file($hash))) {
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
                            $cfile = '@'.$srcFile;
                        }
                    }
                }
                //$srv = $this->args['service'];
                $format = $srcVol->getExtentionByMime($file['mime']);
                if (!$format) {
                    $format = substr($file['name'], strrpos($file['name'], '.') * -1);
                }
                $cdata = empty($this->args['cdata']) ? '' : $this->args['cdata'];
                $lang = $this->args['lang'];
                if ($lang === 'jp') {
                    $lang = 'ja';
                }
                $data = array(
                    'apikey' => ELFINDER_ZOHO_OFFICE_APIKEY,
                    'output' => 'url',
                    'mode' => 'normaledit',
                    'filename' => rawurlencode($file['name']),
                    'id' => $hash,
                    'format' => $format,
                    'lang' => $lang,
                    'saveurl' => elFinder::getConnectorUrl().'?cmd=editor&name=ZohoOffice&method=save'.$cdata,
                );
                if ($cfile) {
                    $data['content'] = $cfile;
                }
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $this->urls[$this->srvs[$file['mime']]]);
                curl_setopt($ch, CURLOPT_TIMEOUT, self::$curlTimeout);
                curl_setopt($ch, CURLOPT_HEADER, 0);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                curl_setopt($ch, CURLOPT_POST, 1);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
                $res = curl_exec($ch);
                $error = curl_error($ch);
                curl_close($ch);

                $fp && fclose($fp);

                if ($res) {
                    if (strpos($res, 'RESULT=TRUE') !== false) {
                        list(, $url) = explode('URL=', $res);
                        preg_match('/URL=([^\s]+)/', $res, $m);

                        return array('zohourl' => $m[1]);
                    } else {
                        $error = $res;
                    }
                }

                if ($error) {
                    return array('error' => preg_split('/[\r\n]+/', $error));
                }
            }
        }

        return array('error' => array('errCmdParams', 'editor.ZohoOffice.init'));
    }

    public function save()
    {
        if (isset($_POST) && ! empty($_POST['id'])) {
            $hash = $_POST['id'];
            if ($volume = $this->elfinder->getVolume($hash)) {
                $content = file_get_contents($_FILES['content']['tmp_name']);
                if ($volume->putContents($hash, $content)) {
                    return array('raw' => true, 'error' => '', 'header' => 'HTTP/1.1 200 OK');
                }
            }
        }
        return array('raw' => true, 'error' => '', 'header' => 'HTTP/1.1 500 Internal Server Error');
    }
}
