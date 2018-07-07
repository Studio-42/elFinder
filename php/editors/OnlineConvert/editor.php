<?php

class elFinderEditorOnlineConvert extends elFinderEditor
{
    protected $allowed = array('init', 'api');

    public function init()
    {
        return array('api' => defined('ELFINDER_ONLINE_CONVRT_APIKEY') && function_exists('curl_init'));
    }

    public function api()
    {
        $endpoint = 'https://api2.online-convert.com/jobs';
        $category = $this->argValue('category');
        $convert = $this->argValue('convert');
        $options = $this->argValue('options');
        $source = $this->argValue('source');
        $jobid = $this->argValue('jobid');
        $ch = null;
        if ($convert && $source) {
            $request = array(
                'input' => array(array(
                    'type' => 'remote',
                    'source' => $source
                )),
                'conversion' => array(array(
                    'target' => $convert
                ))
            );
            if ($category) {
            	$request['conversion'][0]['category'] = $category;
            }
            if ($options && $options !== 'null' && ($options = json_decode($options, true))) {
            	$request['conversion'][0]['options'] = $options;
            }

            $ch = curl_init($endpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($request));
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
            curl_setopt($ch, CURLOPT_HTTPHEADER, array(
                'X-Oc-Api-Key: ' . ELFINDER_ONLINE_CONVRT_APIKEY,
                'Content-Type: application/json',
                'cache-control: no-cache'
            ));
        } else if ($jobid) {
            $ch = curl_init($endpoint . '/' . $jobid);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
            curl_setopt($ch, CURLOPT_HTTPHEADER, array(
                'X-Oc-Api-Key: ' . ELFINDER_ONLINE_CONVRT_APIKEY,
                'cache-control: no-cache'
            ));
        }

        if ($ch) {
            $response = curl_exec($ch);
            $info = curl_getinfo($ch);
            $error =  curl_error($ch);
            curl_close($ch);

            if (! empty($error)) {
                $res = array('error' => $error);
            } else {
                $res = array('apires' => json_decode($response, true));
            }

            return $res;
        } else {
            return array('error', array('errCmdParams', 'editor.OnlineConvert.api'));
        }
    }
}
