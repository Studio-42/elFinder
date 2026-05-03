#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Generate js/elFinder.mimetypes.js using elFinder's own MIME table logic.
 *
 * This script intentionally uses getMimeTable() and the same MIME map merge
 * strategy as elFinder itself, so the generated JS follows core behavior.
 *
 * Usage:
 *   php build-mimetypes-cli.php
 *   php build-mimetypes-cli.php --output=./js/elFinder.mimetypes.js
 *   php build-mimetypes-cli.php --mimefile=./php/mime.types --pretty
 *   php build-mimetypes-cli.php --autoload=./php/autoload.php --stdout
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from CLI.\n");
    exit(1);
}

$options = getopt('', [
    'autoload:',
    'mimefile:',
    'output:',
    'stdout',
    'pretty',
    'help'
]);

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
$repoRootCandidates = [
    $scriptDir,
    dirname($scriptDir),
    dirname($scriptDir, 2),
];

$findDefaultPath = static function (array $relativeCandidates) use ($repoRootCandidates): ?string {
    foreach ($repoRootCandidates as $base) {
        foreach ($relativeCandidates as $relative) {
            $path = $base . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relative);
            if (is_file($path)) {
                return $path;
            }
        }
    }
    return null;
};

$autoload = $options['autoload'] ?? $findDefaultPath([
    'php/autoload.php',
    '../php/autoload.php',
]);

if (!$autoload || !is_file($autoload)) {
    fwrite(STDERR, "Could not find php/autoload.php. Use --autoload=PATH\n");
    exit(1);
}

require $autoload;

if (!class_exists('elFinderVolumeGroup')) {
    fwrite(STDERR, "elFinderVolumeGroup class was not loaded from autoload.php\n");
    exit(1);
}

class MimeTypesExporter extends elFinderVolumeGroup
{
    /**
     * Configure MIME source for generation.
     */
    public function setGenerationMimeFile(?string $mimefile): void
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
     */
    public function buildMimeTypesMap(): array
    {
        $mimeMap = [];

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

    public function buildJavascript(bool $pretty = false): string
    {
        $flags = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;
        if ($pretty) {
            $flags |= JSON_PRETTY_PRINT;
        }

        $json = json_encode($this->buildMimeTypesMap(), $flags);
        if ($json === false) {
            throw new RuntimeException('json_encode() failed: ' . json_last_error_msg());
        }

        return 'elFinder.prototype.mimeTypes = ' . $json . ';' . PHP_EOL;
    }
}

$mimefile = $options['mimefile'] ?? $findDefaultPath([
    'php/mime.types',
    '../php/mime.types',
    'mime.types',
]);

if ($mimefile !== null && $mimefile !== '' && !is_file($mimefile)) {
    fwrite(STDERR, "mime.types not found: {$mimefile}\n");
    exit(1);
}

$output = $options['output'] ?? $findDefaultPath([
    'js/elFinder.mimetypes.js',
    '../js/elFinder.mimetypes.js',
    'elFinder.mimetypes.js',
]) ?? ($scriptDir . DIRECTORY_SEPARATOR . 'elFinder.mimetypes.js');

try {
    $exporter = new MimeTypesExporter();
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

    fwrite(STDOUT, "Wrote: {$output}\n");
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
