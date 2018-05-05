<?php
/**
 * elFinder Plugin Sanitizer
 *
 * Sanitizer of file-name and file-path etc.
 *
 * ex. binding, configure on connector options
 *	$opts = array(
 *		'bind' => array(
 *			'upload.pre mkdir.pre mkfile.pre rename.pre archive.pre ls.pre' => array(
 *				'Plugin.Sanitizer.cmdPreprocess'
 *			),
 *			'ls' => array(
 *				'Plugin.Sanitizer.cmdPostprocess'
 *			),
 *			'upload.presave' => array(
 *				'Plugin.Sanitizer.onUpLoadPreSave'
 *			)
 *		),
 *		// global configure (optional)
 *		'plugin' => array(
 *			'Sanitizer' => array(
 *				'enable' => true,
 *				'targets'  => array('\\','/',':','*','?','"','<','>','|'), // target chars
 *				'replace'  => '_', // replace to this
 *				'callBack' => null // Or @callable sanitize function
 *			)
 *		),
 *		// each volume configure (optional)
 *		'roots' => array(
 *			array(
 *				'driver' => 'LocalFileSystem',
 *				'path'   => '/path/to/files/',
 *				'URL'    => 'http://localhost/to/files/'
 *				'plugin' => array(
 *					'Sanitizer' => array(
 *						'enable' => true,
 *						'targets'  => array('\\','/',':','*','?','"','<','>','|'), // target chars
 *						'replace'  => '_', // replace to this
 *						'callBack' => null // Or @callable sanitize function
 *					)
 *				)
 *			)
 *		)
 *	);
 *
 * @package elfinder
 * @author Naoki Sawada
 * @license New BSD
 */
class elFinderPluginSanitizer extends elFinderPlugin
{
	private $replaced = array();
	private $keyMap = array(
		'ls' => 'intersect',
		'upload' => 'renames'
	);

	public function __construct($opts) {
		$defaults = array(
			'enable'   => true,  // For control by volume driver
			'targets'  => array('\\','/',':','*','?','"','<','>','|'), // target chars
			'replace'  => '_',   // replace to this
			'callBack' => null   // Or callable sanitize function
		);
		$this->opts = array_merge($defaults, $opts);
	}
	
	public function cmdPreprocess($cmd, &$args, $elfinder, $volume) {
		$opts = $this->getCurrentOpts($volume);
		if (! $opts['enable']) {
			return false;
		}
		$this->replaced[$cmd] = array();
		$key = (isset($this->keyMap[$cmd]))? $this->keyMap[$cmd] : 'name';
		
		if (isset($args[$key])) {
			if (is_array($args[$key])) {
				foreach($args[$key] as $i => $name) {
					$this->replaced[$cmd][$name] = $args[$key][$i] = $this->sanitizeFileName($name, $opts);
				}
			} else {
				$name = $args[$key];
				$this->replaced[$cmd][$name] = $args[$key] = $this->sanitizeFileName($name, $opts);
			}
		}
		return true;
	}
	
	public function cmdPostprocess($cmd, &$result, $args, $elfinder) {
		if ($cmd === 'ls') {
			if (! empty($result['list']) && ! empty($this->replaced['ls'])) {
				foreach($result['list'] as $hash => $name) {
					if ($keys = array_keys($this->replaced['ls'], $name)) {
						if (count($keys) === 1) {
							$result['list'][$hash] = $keys[0];
						} else {
							$result['list'][$hash] = $keys;
						}
					}
				}
			}
		}
	}
	
	// NOTE: $thash is directory hash so it unneed to process at here
	public function onUpLoadPreSave(&$thash, &$name, $src, $elfinder, $volume) {
		$opts = $this->getCurrentOpts($volume);
		if (! $opts['enable']) {
			return false;
		}
		$name = $this->sanitizeFileName($name, $opts);
		return true;
	}
	
	protected function sanitizeFileName($filename, $opts) {
		if(!empty($opts['callBack']) && is_callable($opts['callBack'])) {
			return call_user_func_array($opts['callBack'], array($filename, $opts));
		}
		return str_replace($opts['targets'], $opts['replace'], $filename);
  	}
}
