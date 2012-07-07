<?php

class WebDriver_MockElement extends WebDriver_WebElement {
  public function assert_visible() { return true; }
  public function assert_hidden() { return true; }
  public function assert_enabled() { return true; }
  public function assert_disabled() { return true; }
  public function assert_selected() { return true; }
  public function assert_not_selected() { return true; }
  public function assert_text($expected_text) { return true; }
  public function assert_text_contains($expected_needle) { return true; }
  public function assert_text_does_not_contain($expected_missing_needle) { return true; }
  public function assert_value($expected_value) { return true; }
  public function assert_option_count($expected_count) { return true; }
  public function assert_contains_label($expected_label) { return true; }
}
