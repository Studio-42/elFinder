Setup elFinder 2.1.x nightly with Composer
====

Work in the server's shell. This bash script to install composer.phar and set up elFinder 2.1.x nightly into working directory on server. Directory to work should be provided an empty directory.

1. `mkdir elfinder`
2. `cd elfinder`.
3. `curl -sS http://studio-42.github.io/elFinder/tools/installer/setup_with_composer/setup_with_composer.sh | bash`
4. completion!

## Note

You can find the "index.html / connector.php" in the installation directory. Configuration of "client / volume drive" in those files is possible.

elFinder and library updates to run `php composer.phar update` in the server shell.

**Directory Tree**
```
.
├── .tmp
│   └── .htaccess
├── composer.json
├── composer.lock
├── composer.phar
├── connector.php
├── css -> ./vendor/studio-42/elfinder/css
├── files
│   └── .trash
├── img -> ./vendor/studio-42/elfinder/img
├── index.html
├── js -> ./vendor/studio-42/elfinder/js
├── main.js
├── sounds -> ./vendor/studio-42/elfinder/sounds
└── vendor
    ├── .htaccess
    ├── autoload.php
    ├── composer
    │   ├── ClassLoader.php
    │   ├── LICENSE
    │   ├── autoload_classmap.php
    │   ├── autoload_namespaces.php
    │   ├── autoload_psr4.php
    │   ├── autoload_real.php
    │   ├── include_paths.php
    │   └── installed.json
    └── studio-42
        └── elfinder
```
