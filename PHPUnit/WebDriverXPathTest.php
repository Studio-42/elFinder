<?php

require_once 'WebDriver.php';

class WebDriverXPathTest extends PHPUnit_Framework_TestCase {
  public function data() {
    $strings = <<<EOT
noquotes
single'quote
double"quote
multiple'single'quotes
multiple"double"quotes
'beginning and ending single quotes'
"beginning and ending double quotes"
both'kinds of"quote
both"kinds of'quote
multiple'quotes'of"both"kinds
multiple'quotes"interspersed'with"each'other
consecutive''''quotes
consecutive""""quotes
consecutive'"'"'mixedquotes
EOT;
    $test_data = split("\n", $strings);
    foreach ($test_data as &$data) {
      $data = array($data);
    }
    return $test_data;
  }
  
  /**
   * @dataProvider data
   */
  public function test($text) {
    $xml = simplexml_load_string('<tag>' . $text . '</tag>');
    $result = $xml->xpath('//tag[text()=' . WebDriver::QuoteXPath($text) . ']');
    $this->assertEquals(count($result), 1);
  }
}
