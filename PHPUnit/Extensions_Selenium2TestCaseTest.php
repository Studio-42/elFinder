<?php
class Extensions_Selenium2TestCaseTest extends PHPUnit_Extensions_Selenium2TestCase {
	
	public function setUp() {
		$this->setHost('localhost');
		$this->setPort(4444);
		$this->setBrowser('firefox');
		$this->setBrowserUrl('http://google.de');
	}
	
	public function donttest() {
		$this->url('http://www.web.de');
		$this->assertEquals('WEB.DE - E-Mail-Adresse kostenlos, FreeMail, Nachrichten & Services', $this->title());
		$query = $this->byId('inpSearchText');
		$query->click();
		$query->value('haus');
		//$this->byId('gs_tti0')->click();
		//$this->keys('haus ');
		$submit = $this->byId('inpSearchSubmit');
		$submit->click();
		
		//$submitbtm = $this->byId('searchTextTop');
		//$this->assertEquals('Erweiterte Suche',$this->byId('navAdvancedSearchLink'));
		//$this->set_implicit_wait(5000);
	}
	
	public function donttestelfinder() {
	
	
		$this->url('http://elfinder.local/elfinder.html');
		//$this->assertEquals('elFinder 2.0', $this->title());
		
		$folder = $this->byCssSelector('span.elfinder-button-icon.elfinder-button-icon-mkdir');
		$folder->click();
		$this->timeouts()->implicitWait(10000);
		//$this->keys(array('EnterKey' => "\uE007"));
		//$home = $this->byCssSelector('span.elfinder-button-icon.elfinder-button-icon-mkfile');
		//$home->click();
		$this->timeouts()->implicitWait(10000);
		
		
		/*
		$createdFolder = $this->byId('l1_dW50aXRsZWQgZm9sZGVy');
		$createdFolder->click();
		
		
		$tmpFolder = $this->byCssSelector('div.elfinder-cwd-file.directory.ui-corner-all.elfinder-cwd-file-tmp.ui-selected');
		$tmpFolder->click();
		
		$title = $this->byCssSelector('div.elfinder-cwd-filename.ui-draggable');
		$this->assertEquals('untitled folder', $title->text());
		*/
		$this->timeouts()->implicitWait(10000);
		
		
	}
	
	  public function donttest2() {
		$this->url("http://elfinder.local/elfinder.html");
		$this->assertEquals("elFinder 2.0", $this->title());
		
		$this->byCssSelector("span.elfinder-button-icon.elfinder-button-icon-mkdir")->click();
	
		$current = $this->byCssSelector("div.elfinder-cwd-filename.ui-state-hover > input[type='text']");
		$current->clear();
		$current->value('hallo9');
		$current2 = $this->byCssSelector("div.elfinder-cwd-file.directory.ui-corner-all.elfinder-cwd-file-tmp.ui-selected");
		$current2->click();
		
		
	}
	
	public function testChangeName() {
		$this->url("http://elfinder.local/elfinder.html");
		$current = $this->byId("l1_aGFsbG81");
		
		$this->keyPress("id=sd","\ue007");
		
	}
}



?>