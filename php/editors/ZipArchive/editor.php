<?php

class elFinderEditorZipArchive extends elFinderEditor
{
    public function enabled()
    {
        return !ELFINDER_DISABLE_ZIPEDITOR &&
               class_exists('Barryvdh\elFinderFlysystemDriver\Driver') && 
               class_exists('League\Flysystem\Filesystem') &&
               class_exists('League\Flysystem\ZipArchive\ZipArchiveAdapter');
    }
}