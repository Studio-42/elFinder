#!/usr/bin/perl

use lib "/home/troex/Sites/git/elfinder/src/connectors/perl";

use strict;
use JSON::XS;
#use Libs::API;
use elFinder;


&MainFunc;

sub MainFunc
{
	open(OLDERR,">&STDERR");
	open(STDERR,">>debug.core");

	my %opts = (
		'root'            => '../git/elfinder/files/',
		'URL'             => 'http://localhost:8001/~troex/git/elfinder/files',
		'fileURL'         => 'false',
		'rootAlias'       => 'Home',
		'DirConf'         => 'Config', # Каталог с конфигурацией
		'archiveMimes'    => [],
		'archivers'       => []
	);

	#my $API = new Libs::API('web.cfg'); # Нужно для выдачи Content-Type для JSON

	my $elFinder = new elFinder(%opts);
	my %All = $elFinder->_run();
	my $json_xs = JSON::XS->new();
	$json_xs->ascii(1);
	$json_xs->pretty(1);

	my $JSON = $json_xs->encode($elFinder->{RES});
	#$JSON =~ s/\//\\\//mg;
	print "Content-type: text/html\n";

	print $JSON;
	#print Libs::API::PrintCTYPE($API,'JSON')."\n".$JSON; # Выдает Content-Type для JSON
	#print "Content-type: application/json\n";
	print STDERR $JSON;

	close(STDERR);
	open(STDERR,">&OLDERR");
	close(OLDERR);
}
