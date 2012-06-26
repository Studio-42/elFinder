<?php

require_once 'WebDriver.php';

class WebDriverSelectorTest extends PHPUnit_Framework_TestCase {
  public function valid_selectors() {
    return array(
      array("identifier=some_id", "id", "some_id"),
      array("identifier=0", "id", "0"),
      array("identifier=false", "id", "false"),
      array("id=some_other_id", "id", "some_other_id"),
      array("id=0", "id", "0"),
      array("id=false", "id", "false"),
      array("name=some_name", "name", "some_name"),
      array("name=0", "name", "0"),
      array("name=false", "name", "false"),
      array("xpath=//div[@class='some_class']", "xpath", "//div[@class='some_class']"),
      array("link=Click here", "link text", "Click here"),
      array("link=1 + 2 = 3", "link text", "1 + 2 = 3"),
      array("link=0", "link text", "0"),
      array("link=false", "link text", "false"),
      array("link text=Click here", "link text", "Click here"),
      array("link text=2+2=4", "link text", "2+2=4"),
      array("link text=0", "link text", "0"),
      array("link text=false", "link text", "false"),
      array("css=a.person_link", "css selector", "a.person_link"),
      array("css selector=div#main", "css selector", "div#main"),
      array("partial link text=nvite someon", "partial link text", "nvite someon"),
      array("partial link text=0", "partial link text", "0"),
      array("partial link text=false", "partial link text", "false"),
      array("tag name=li", "tag name", "li"),
      array("class=admin-msg", "class", "admin-msg"),
      array("class=0", "class", "0"),
      array("class=false", "class", "false"),
      array("class name=success-msg", "class name", "success-msg"),
      array("class name=0", "class name", "0"),
      array("class name=false", "class name", "false"),
      array("//table//td", "xpath", "//table//td"),
      array("//table[@class='edit']", "xpath", "//table[@class='edit']"),
      array("fakelocator=qwerqwer", "id", "fakelocator=qwerqwer"),
      array("asdfasdf", "id", "asdfasdf"),
      array("0", "id", "0"),
      array("false", "id", "false"),
    );
  }
  
  /**
   * @dataProvider valid_selectors
   */
  public function test_valid_selectors($input, $expected_using, $expected_value) {
    $actual = WebDriver::ParseLocator($input);
    $this->assertEquals($actual["using"], $expected_using);
    $this->assertEquals($actual["value"], $expected_value);
  }
  
  public function invalid_selectors() {
    return array(
      array("dom=document.images[5]"),
      array("document.forms['myForm']")
    );
  }
  
  /**
   * @dataProvider invalid_selectors
   * @expectedException Exception
   */
  public function test_invalid_selectors($input) {
    WebDriver::ParseLocator($input);
  }
}
