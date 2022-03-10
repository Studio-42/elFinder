<?php
/**
 * This class describes elFinder plugin window remove tail dots.
 * This plugin is automatically loaded on the Windows server
 * and enabled in the LocalFileSystem driver.
 */
class elFinderPluginWinRemoveTailDots extends elFinderPlugin
{
    private $replaced = array();
    private $keyMap = array(
        'ls' => 'intersect',
        'upload' => 'renames',
        'mkdir' => array('name', 'dirs')
    );

    public function __construct($opts)
    {
        $defaults = array(
            'enable' => false,  // For control by volume driver
        );

        $this->opts = array_merge($defaults, $opts);
    }

    public function cmdPreprocess($cmd, &$args, $elfinder, $volume)
    {
        $opts = $this->getCurrentOpts($volume);
        if (!$opts['enable']) {
            return false;
        }
        $this->replaced[$cmd] = array();
        $key = (isset($this->keyMap[$cmd])) ? $this->keyMap[$cmd] : 'name';

        if (is_array($key)) {
            $keys = $key;
        } else {
            $keys = array($key);
        }
        foreach ($keys as $key) {
            if (isset($args[$key])) {
                if (is_array($args[$key])) {
                    foreach ($args[$key] as $i => $name) {
                        if ($cmd === 'mkdir' && $key === 'dirs') {
                            // $name need '/' as prefix see #2607
                            $name = '/' . ltrim($name, '/');
                            $_names = explode('/', $name);
                            $_res = array();
                            foreach ($_names as $_name) {
                                $_res[] = $this->normalize($_name, $opts);
                            }
                            $this->replaced[$cmd][$name] = $args[$key][$i] = join('/', $_res);
                        } else {
                            $this->replaced[$cmd][$name] = $args[$key][$i] = $this->normalize($name, $opts);
                        }
                    }
                } else if ($args[$key] !== '') {
                    $name = $args[$key];
                    $this->replaced[$cmd][$name] = $args[$key] = $this->normalize($name, $opts);
                }
            }
        }
        if ($cmd === 'ls' || $cmd === 'mkdir') {
            if (!empty($this->replaced[$cmd])) {
                // un-regist for legacy settings
                $elfinder->unbind($cmd, array($this, 'cmdPostprocess'));
                $elfinder->bind($cmd, array($this, 'cmdPostprocess'));
            }
        }
        return true;
    }

    public function cmdPostprocess($cmd, &$result, $args, $elfinder, $volume)
    {
        if ($cmd === 'ls') {
            if (!empty($result['list']) && !empty($this->replaced['ls'])) {
                foreach ($result['list'] as $hash => $name) {
                    if ($keys = array_keys($this->replaced['ls'], $name)) {
                        if (count($keys) === 1) {
                            $result['list'][$hash] = $keys[0];
                        } else {
                            $result['list'][$hash] = $keys;
                        }
                    }
                }
            }
        } else if ($cmd === 'mkdir') {
            if (!empty($result['hashes']) && !empty($this->replaced['mkdir'])) {
                foreach ($result['hashes'] as $name => $hash) {
                    if ($keys = array_keys($this->replaced['mkdir'], $name)) {
                        $result['hashes'][$keys[0]] = $hash;
                    }
                }
            }
        }
    }

    // NOTE: $thash is directory hash so it unneed to process at here
    public function onUpLoadPreSave(&$thash, &$name, $src, $elfinder, $volume)
    {
        $opts = $this->getCurrentOpts($volume);
        if (!$opts['enable']) {
            return false;
        }

        $name = $this->normalize($name, $opts);
        return true;
    }

    protected function normalize($str, $opts)
    {
        $str = rtrim($str, '.');
        return $str;
    }
} // END class elFinderPluginWinRemoveTailDots
