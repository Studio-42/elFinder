<?php

require_once 'WebDriver.php';

class WebDriverColorTest extends PHPUnit_Framework_TestCase {
  public function valid_colors() {
    return array(
      array("white", "FFFFFF"),
      array("rgb(255,255,255)", "FFFFFF"),
      array("#ffFFff", "FFFFFF"),
      array("#fff", "FFFFFF"),
      array("black", "000000"),
      array("rgb(0,0,0)", "000000"),
      array("000", "000000"),
      array("#000", "000000"),
      array("RGB(0, 100, 200)", "0064C8"),
      array('yellow', 'FFFF00'),
    );
  }
  
  /**
   * @dataProvider valid_colors
   */
  public function test_valid_colors($input, $expected_output) {
    $actual_output = WebDriver::CanonicalizeCSSColor($input);
    $this->assertTrue($expected_output === $actual_output, "Expected: <$expected_output>. Actual: <$actual_output>.");
  }
  
  public function invalid_colors() {
    return array(
      array("somecolor"),
      array("#fffffg"),
      array("#ff"),
      array("rgb(-1, 0 0)"),
      array("rgb(255, 256, 200)"),
      array("12345"),
    );
  }
  
  /**
   * @dataProvider invalid_colors
   * @expectedException Exception
   */
  public function test_invalid_colors($input) {
    WebDriver::CanonicalizeCSSColor($input);
  }
}
