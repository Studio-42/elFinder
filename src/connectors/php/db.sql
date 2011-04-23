DROP TABLE IF EXISTS `elfinder_file`;
CREATE TABLE IF NOT EXISTS `elfinder_file` (
  `id`         int(7) unsigned NOT NULL AUTO_INCREMENT,
  `parent_id`  int(7) unsigned NOT NULL,
  `name`       mediumtext collate utf8_unicode_ci NOT NULL,
  `path`       mediumtext collate utf8_unicode_ci NOT NULL,
  `content`    blob NOT NULL,
  `size`       int(10) unsigned NOT NULL default '0',
  `mtime`      timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  `mimetype`   varchar(256) collate utf8_unicode_ci NOT NULL default 'unknown',
  `img_width`  int(5) NOT NULL,
  `img_height` int(5) NOT NULL,
  PRIMARY KEY  (`id`),
  KEY `parent_id` (`parent_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

DROP TABLE IF EXISTS `elfinder_permission`;
CREATE TABLE IF NOT EXISTS `elfinder_permission` (
	`file_id`    int(7) unsigned NOT NULL AUTO_INCREMENT,
	`user_id`    int(7) unsigned NOT NULL,
	`perm_read`  enum('1', '0') NOT NULL DEFAULT '1',
	`perm_write` enum('1', '0') NOT NULL DEFAULT '1',
	`perm_rm`    enum('1', '0') NOT NULL DEFAULT '1',
	PRIMARY KEY (`file_id`, `user_id`)
) ENGINE=MyISAM;

DROP TABLE IF EXISTS `elfinder_attribute`;
CREATE TABLE IF NOT EXISTS `elfinder_attribute` (
	`file_id` int(7) unsigned NOT NULL AUTO_INCREMENT,
	`user_id` int(7) unsigned NOT NULL,
	`aread`   enum('1', '0') NOT NULL DEFAULT '1',
	`awrite`  enum('1', '0') NOT NULL DEFAULT '1',
	`alock`   enum('1', '0') NOT NULL DEFAULT '0',
	`ahidden` enum('1', '0') NOT NULL DEFAULT '0',
	PRIMARY KEY (`file_id`, `user_id`)
) ENGINE=MyISAM;