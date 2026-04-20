#!/usr/bin/env php
<?php

/**
 * Generate js/elFinder.mimetypes.js using elFinder's own MIME table logic.
 *
 * PHP 5.5 compatible version.
 *
 * Usage:
 *   php build-mimetypes-cli-php55.php
 *   php build-mimetypes-cli-php55.php --output=./js/elFinder.mimetypes.js
 *   php build-mimetypes-cli-php55.php --mimefile=./php/mime.types --pretty
 *   php build-mimetypes-cli-php55.php --autoload=./php/autoload.php --stdout
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from CLI.\n");
    exit(1);
}

$options = getopt('', array(
    'autoload:',
    'mimefile:',
    'output:',
    'stdout',
    'pretty',
    'help'
));

if (isset($options['help'])) {
    $help = <<<'TXT'
Generate elFinder.mimetypes.js from elFinder core MIME tables.

Options:
  --autoload=PATH   Path to php/autoload.php
  --mimefile=PATH   Path to php/mime.types
  --output=PATH     Output file path (default: ./js/elFinder.mimetypes.js)
  --stdout          Print result to stdout instead of writing a file
  --pretty          Pretty-print JSON
  --help            Show this help
TXT;
    fwrite(STDOUT, $help . PHP_EOL);
    exit(0);
}

$scriptDir = __DIR__;
$repoRootCandidates = array(
    $scriptDir,
    dirname($scriptDir),
    dirname(dirname($scriptDir)),
);

$findDefaultPath = function (array $relativeCandidates) use ($repoRootCandidates) {
    foreach ($repoRootCandidates as $base) {
        foreach ($relativeCandidates as $relative) {
            $path = $base . DIRECTORY_SEPARATOR . str_replace(array('/', '\\'), DIRECTORY_SEPARATOR, $relative);
            if (is_file($path)) {
                return $path;
            }
        }
    }
    return null;
};

$autoload = isset($options['autoload']) ? $options['autoload'] : $findDefaultPath(array(
    'php/autoload.php',
    '../php/autoload.php',
));

if (!$autoload || !is_file($autoload)) {
    fwrite(STDERR, "Could not find php/autoload.php. Use --autoload=PATH\n");
    exit(1);
}

require $autoload;

if (!class_exists('elFinderVolumeGroup')) {
    fwrite(STDERR, "elFinderVolumeGroup class was not loaded from autoload.php\n");
    exit(1);
}

class MimeTypesExporterPhp55 extends elFinderVolumeGroup
{
    /**
     * Configure MIME source for generation.
     *
     * @param string|null $mimefile
     * @return void
     */
    public function setGenerationMimeFile($mimefile)
    {
        if ($mimefile !== null && $mimefile !== '') {
            $this->options['mimeDetect'] = 'internal';
            $this->options['mimefile'] = $mimefile;
        }
    }

    /**
     * Build MIME => representative extension table.
     *
     * This follows getExtentionByMime():
     * - base table from getMimeTable()
     * - then fill missing MIME entries from mimeMap only
     * - ignore wildcard extension (*) entries
     *
     * For forward compatibility, this exporter also accepts both
     * 'staticMineMap' (historic typo in core) and 'staticMimeMap'.
     *
     * @return array
     */
    public function buildMimeTypesMap()
    {
        $mimeMap = array();

        if (isset($this->options['mimeMap']) && is_array($this->options['mimeMap'])) {
            $mimeMap = $this->options['mimeMap'];
        }

        if (isset($this->options['staticMineMap']) && is_array($this->options['staticMineMap']) && $this->options['staticMineMap']) {
            $mimeMap = array_merge($mimeMap, $this->options['staticMineMap']);
        }

        if (isset($this->options['staticMimeMap']) && is_array($this->options['staticMimeMap']) && $this->options['staticMimeMap']) {
            $mimeMap = array_merge($mimeMap, $this->options['staticMimeMap']);
        }

        if (isset($this->options['additionalMimeMap']) && is_array($this->options['additionalMimeMap']) && $this->options['additionalMimeMap']) {
            $mimeMap = array_merge($mimeMap, $this->options['additionalMimeMap']);
        }

        $extTable = array();
        foreach ($this->getMimeTable() as $ext => $_mime) {
            if (!isset($extTable[$_mime])) {
                $extTable[$_mime] = (string)$ext;
            }
        }

        foreach ($mimeMap as $pair => $_mime) {
            $parts = explode(':', (string)$pair, 2);
            $ext = isset($parts[0]) ? (string)$parts[0] : '';
            if ($ext !== '*' && !isset($extTable[$_mime])) {
                $extTable[$_mime] = $ext;
            }
        }

        return $extTable;
    }

    /**
     * @param bool $pretty
     * @return string
     * @throws RuntimeException
     */
    public function buildJavascript($pretty)
    {
        $flags = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;
        if ($pretty) {
            $flags |= JSON_PRETTY_PRINT;
        }

        $json = json_encode($this->buildMimeTypesMap(), $flags);
        if ($json === false) {
            $message = function_exists('json_last_error_msg') ? json_last_error_msg() : 'Unknown JSON encoding error';
            throw new RuntimeException('json_encode() failed: ' . $message);
        }

        return 'elFinder.prototype.mimeTypes = ' . $json . ';' . PHP_EOL;
    }
}

$mimefile = isset($options['mimefile']) ? $options['mimefile'] : $findDefaultPath(array(
    'php/mime.types',
    '../php/mime.types',
    'mime.types',
));

if ($mimefile !== null && $mimefile !== '' && !is_file($mimefile)) {
    fwrite(STDERR, 'mime.types not found: ' . $mimefile . "\n");
    exit(1);
}

$defaultOutput = $findDefaultPath(array(
    'js/elFinder.mimetypes.js',
    '../js/elFinder.mimetypes.js',
    'elFinder.mimetypes.js',
));
if ($defaultOutput === null) {
    $defaultOutput = $scriptDir . DIRECTORY_SEPARATOR . 'elFinder.mimetypes.js';
}

$output = isset($options['output']) ? $options['output'] : $defaultOutput;

try {
    $exporter = new MimeTypesExporterPhp55();
    $exporter->setGenerationMimeFile($mimefile);
    $js = $exporter->buildJavascript(isset($options['pretty']));

    if (isset($options['stdout'])) {
        fwrite(STDOUT, $js);
        exit(0);
    }

    $outputDir = dirname($output);
    if (!is_dir($outputDir)) {
        throw new RuntimeException('Output directory does not exist: ' . $outputDir);
    }

    if (file_put_contents($output, $js) === false) {
        throw new RuntimeException('Failed to write output file: ' . $output);
    }

    fwrite(STDOUT, 'Wrote: ' . $output . "\n");
    exit(0);
} catch (Exception $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
