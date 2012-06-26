<?php

require_once 'WebDriver.php';
require_once 'WebDriver/Driver.php';
require_once 'WebDriver/MockDriver.php';
require_once 'WebDriver/WebElement.php';
require_once 'WebDriver/MockElement.php';

class SampleTest extends PHPUnit_Framework_TestCase {
  protected $driver;
  
  public function setUp() {
  	//choose
    // Choose one of the following
    
    // For tests running at Sauce Labs
//     $this->driver = WebDriver_Driver::InitAtSauce("my-sauce-username", "my-sauce-api-key", "WINDOWS", "firefox", "3.6");
//     $sauce_job_name = get_class($this);
//     $this->driver->set_sauce_context("name", $sauce_job_name);
    
    // For a mock driver (for debugging)
//     $this->driver = new WebDriver_MockDriver();
//     define('kFestDebug', true);

    // For a local driver
    $this->driver = WebDriver_Driver::InitAtLocal("4444", "firefox");
  }
 
  // Forward calls to main driver 
  public function __call($name, $arguments) {
    if (method_exists($this->driver, $name)) {
      return call_user_func_array(array($this->driver, $name), $arguments);
    } else {
      throw new Exception("Tried to call nonexistent method $name with arguments:\n" . print_r($arguments, true));
    }
  }

  public function testCreateFolder() {
  
  	//Load firefox with this URL
    $this->load("http://elfinder.local/elfinder.html");
    //Check if the website title is equal to elFinder 2.0
    $this->assert_title("elFinder 2.0");
	
	//Click the 'create folder' icon
	$this->get_element("css=span.elfinder-button-icon.elfinder-button-icon-mkdir")->click();
	
	//Find the name field of the created folder
	$nameField = $this->get_element("css=div.elfinder-cwd-filename > input[type='text']");
	//Clear this field
	$nameField->clear();
	//Type new folder name
	$nameField->send_keys('test');
	//Wait for 2 seconds
	sleep(2);
	
	//Select the created folder in edit mode by the class attribute to create the folder.
	$folderIcon = $this->get_element("css=div.ui-helper-clearfix.elfinder-cwd.ui-selectable.ui-droppable.elfinder-cwd-view-icons");
	$folderIcon->click();
	
	//Assert that the title and folder name
	sleep(4);
	$createdFolder = $this->get_element("id=l1_dGVzdA");
	$this->assertEquals('test', $createdFolder->get_text());
	sleep(4);
	
}

  public function testCreateFolderAndDelete() {
  	//Load firefox with this URL
    $this->load("http://elfinder.local/elfinder.html");
    //Check if the website title is equal to elFinder 2.0
    $this->assert_title("elFinder 2.0");
	
	//Click the 'create folder' icon
	$this->get_element("css=span.elfinder-button-icon.elfinder-button-icon-mkdir")->click();
	
	//Find the name field of the created folder
	$nameField = $this->get_element("css=div.elfinder-cwd-filename > input[type='text']");
	//Clear this field
	$nameField->clear();
	//Type new folder name
	$nameField->send_keys('test2');
	//Wait for 2 seconds
	sleep(2);
	
	//Select the created folder in edit mode by the class attribute to create the folder.
	$folderIcon = $this->get_element("css=div.ui-helper-clearfix.elfinder-cwd.ui-selectable.ui-droppable.elfinder-cwd-view-icons");
	$folderIcon->click();
	
	//Assert that the title and folder name
	sleep(3);
	$createdFolder = $this->get_element("l1_dGVzdDI");
	$createdFolder->click();
	sleep(3);
	$this->right_click();
	sleep(3);
	$this->get_element("css=span.elfinder-button-icon.elfinder-button-icon-rm.elfinder-contextmenu-icon")->click();
	sleep(2);
	$this->get_element("css=button.ui-button.ui-widget.ui-state-default.ui-corner-all.ui-button-text-only")->click();
	sleep(3);
	$createdFolder = $this->get_element("l1_dGVzdA");
	$createdFolder->click();
	sleep(3);
	$this->right_click();
	sleep(3);
	$this->get_element("css=span.elfinder-button-icon.elfinder-button-icon-rm.elfinder-contextmenu-icon")->click();
	sleep(2);
	$this->get_element("css=button.ui-button.ui-widget.ui-state-default.ui-corner-all.ui-button-text-only")->click();
	sleep(3);
	/*
	---------TODO: Asserting title of delete window---------------
	$deleteWindowTitle = $this->get_element("css=div.ui-dialog-titlebar.ui-widget-header.ui-corner-all.ui-helper-clearfix");
	$this->assertEquals('Delete', $deleteWindowTitle->text());
	sleep(1);
	*/
  }
  
  public function tearDown() {
    if ($this->driver) {
 	  
      if ($this->hasFailed()) {
        $this->driver->set_sauce_context("passed", false);
      } else {
        $this->driver->set_sauce_context("passed", true);
      }
      
      $this->driver->quit();
    }
    parent::tearDown();
  }
}