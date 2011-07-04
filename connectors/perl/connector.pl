#!/usr/bin/perl

use lib '/home/troex/Sites/git/elfinder/src/connectors/perl';
use CGI qw/:standard -debug/;
use Data::Dumper;
use elFinder;
use JSON::XS;


$| = 1;
$, = "\n";


	my %opts = (
		'root'            => '../git/elfinder/files/wiki/',
		'URL'             => 'http://localhost:8001/~troex/git/elfinder/files/wiki'
	);

$elfinder = new elFinder(%opts);

print header(-type => 'text/html', -charset => 'utf-8');

#print "<pre>";

$cgi = CGI->new;

@params = $cgi->param;
my %request;
for (@params)
{

	next if $_ eq '_';
	#print $_." => ".$cgi->param($_);
	#print "<br>";
	$request{$_} = $cgi->param($_);
}

#print @names;
#print '<br>';
#print Dumper($elfinder->{CONF});
#print Dumper(keys(%request));
#print Dumper(values(%request));
#print "WOW!";

#print $request{'cmd'};

$elfinder->run(%request);
# print Dumper(%request);

#print Dumper($elfinder->{REQUEST});
#print Dumper($elfinder->{RES});


my $json_xs = JSON::XS->new();
#$json_xs->ascii(1);
$json_xs->pretty(1);

print $json_xs->encode($elfinder->{RES});

