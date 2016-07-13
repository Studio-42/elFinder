<?php
/**
 * elFinder Plugin Normalizer
 * 
 * UTF-8 Normalizer of file-name and file-path etc.
 * nfc(NFC): Canonical Decomposition followed by Canonical Composition
 * nfkc(NFKC): Compatibility Decomposition followed by Canonical
 * 
 * This plugin require Class "Normalizer" (PHP 5 >= 5.3.0, PECL intl >= 1.0.0)
 * or PEAR package "I18N_UnicodeNormalizer"
 * 
 * ex. binding, configure on connector options
 *	$opts = array(
 *		'bind' => array(
 *			'upload.pre mkdir.pre mkfile.pre rename.pre archive.pre ls.pre' => array(
 *				'Plugin.Normalizer.cmdPreprocess'
 *			),
 *			'ls' => array(
 *				'Plugin.Normalizer.cmdPostprocess'
 *			),
 *			'upload.presave' => array(
 *				'Plugin.Normalizer.onUpLoadPreSave'
 *			)
 *		),
 *		// global configure (optional)
 *		'plugin' => array(
 *			'Normalizer' => array(
 *				'enable'    => true,
 *				'nfc'       => true,
 *				'nfkc'      => true,
 *				'lowercase' => false,
 * 				'convmap'   => array()
 *			)
 *		),
 *		// each volume configure (optional)
 *		'roots' => array(
 *			array(
 *				'driver' => 'LocalFileSystem',
 *				'path'   => '/path/to/files/',
 *				'URL'    => 'http://localhost/to/files/'
 *				'plugin' => array(
 *					'Normalizer' => array(
 *						'enable'    => true,
 *						'nfc'       => true,
 *						'nfkc'      => true,
 * 						'lowercase' => false,
 * 						'convmap'   => array()
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
class elFinderPluginNormalizer
{
	private $opts = array();
	private $replaced = array();
	private $keyMap = array(
		'ls' => 'intersect',
		'upload' => 'renames'
	);
	
	public function __construct($opts) {
		$defaults = array(
			'enable'    => true,  // For control by volume driver
			'nfc'       => true,  // Canonical Decomposition followed by Canonical Composition
			'nfkc'      => true,  // Compatibility Decomposition followed by Canonical
			'lowercase' => false, // Make chars lowercase
			'convmap'   => array()// Convert map ('FROM' => 'TO') array
		);
	
		$this->opts = array_merge($defaults, $opts);
	}
	
	public function cmdPreprocess($cmd, &$args, $elfinder, $volume) {
		$opts = $this->getOpts($volume);
		if (! $opts['enable']) {
			return false;
		}
		$this->replaced[$cmd] = array();
		$key = (isset($this->keyMap[$cmd]))? $this->keyMap[$cmd] : 'name';
		
		if (isset($args[$key])) {
			if (is_array($args[$key])) {
				foreach($args[$key] as $i => $name) {
					$this->replaced[$cmd][$name] = $args[$key][$i] = $this->normalize($name, $opts);
				}
			} else {
				$name = $args[$key];
				$this->replaced[$cmd][$name] = $args[$key] = $this->normalize($name, $opts);
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
	
	public function onUpLoadPreSave(&$path, &$name, $src, $elfinder, $volume) {
		$opts = $this->getOpts($volume);
		if (! $opts['enable']) {
			return false;
		}
		
		if ($path) {
			$path = $this->normalize($path, $opts);
		}
		$name = $this->normalize($name, $opts);
		return true;
	}
	
	private function getOpts($volume) {
		$opts = $this->opts;
		if (is_object($volume)) {
			$volOpts = $volume->getOptionsPlugin('Normalizer');
			if (is_array($volOpts)) {
				$opts = array_merge($this->opts, $volOpts);
			}
		}
		return $opts;
	}
	
	private function normalize($str, $opts) {
		if ($opts['nfc'] || $opts['nfkc']) {
			if (class_exists('Normalizer', false)) {
				if ($opts['nfc'] && ! Normalizer::isNormalized($str, Normalizer::FORM_C))
					$str = Normalizer::normalize($str, Normalizer::FORM_C);
				if ($opts['nfkc'] && ! Normalizer::isNormalized($str, Normalizer::FORM_KC))
					$str = Normalizer::normalize($str, Normalizer::FORM_KC);
			} else {
				if (! class_exists('I18N_UnicodeNormalizer', false)) {
					 include_once 'I18N/UnicodeNormalizer.php';
				}
				if (class_exists('I18N_UnicodeNormalizer', false)) {
					$normalizer = new I18N_UnicodeNormalizer();
					if ($opts['nfc'])
						$str = $normalizer->normalize($str, 'NFC');
					if ($opts['nfkc'])
						$str = $normalizer->normalize($str, 'NFKC');
				}
			}
		}
		if ($opts['convmap'] && is_array($opts['convmap'])) {
			$str = strtr($str, $opts['convmap']);
		}
		if ($opts['lowercase']) {
			if (function_exists('mb_strtolower')) {
				$str = mb_strtolower($str, 'UTF-8');
			} else {
				$str = strtolower($str);
			}
		}
		return $str;
	}
}
