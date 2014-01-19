<?php
/**
 * elFinder Plugin Sanitizer
 *
 * Sanitizer of file-name and file-path etc.
 *
 * ex. binding, configure on connector options
 *	$opts = array(
 *		'bind' => array(
 *			'mkdir.pre mkfile.pre rename.pre' => array(
 *				'Plugin.Sanitizer.cmdPreprocess'
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
 *				'replace'  => '_'    // replace to this
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
 *						'replace'  => '_'    // replace to this
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
class elFinderPluginSanitizer
{
	private $opts = array();
	
	public function __construct($opts) {
		$defaults = array(
			'enable'   => true,  // For control by volume driver
			'targets'  => array('\\','/',':','*','?','"','<','>','|'), // target chars
			'replace'  => '_'    // replace to this
		);
	
		$this->opts = array_merge($defaults, $opts);
	}
	
	public function cmdPreprocess($cmd, &$args, $elfinder, $volume) {
		$opts = $this->getOpts($volume);
		if (! $opts['enable']) {
			return false;
		}
	
		if (isset($args['name'])) {
			$args['name'] = $this->sanitizeFileName($args['name'], $opts);
		}
		return true;
	}

	public function onUpLoadPreSave(&$path, &$name, $src, $elfinder, $volume) {
		$opts = $this->getOpts($volume);
		if (! $opts['enable']) {
			return false;
		}
	
		if ($path) {
			$path = $this->sanitizeFileName($path, $opts, array('/'));
		}
		$name = $this->sanitizeFileName($name, $opts);
		return true;
	}
	
	private function getOpts($volume) {
		$opts = $this->opts;
		if (is_object($volume)) {
			$volOpts = $volume->getOptionsPlugin('Sanitizer');
			if (is_array($volOpts)) {
				$opts = array_merge($this->opts, $volOpts);
			}
		}
		return $opts;
	}
	
	private function sanitizeFileName($filename, $opts, $allows = array()) {
		$targets = $allows? array_diff($opts['targets'], $allows) : $opts['targets'];
		return str_replace($targets, $opts['replace'], $filename);
  	}
}
