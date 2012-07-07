<?php

class WebDriver_MockDriver extends WebDriver_Driver {
  private $next_element_id;
  
  public function __construct() {
    $this->server_url = "http://localhost/wd/hub";
    $this->session_id = 0;
    $this->next_element_id = 0;
  }
  
  public function execute($http_type, $relative_url, $payload = null) {
    if ($payload !== null) {
      $payload = json_encode($payload);
    }
    $relative_url = str_replace(':sessionId', $this->session_id, $relative_url);
    $full_url = $this->server_url . $relative_url;
    $response = WebDriver_MockDriver::MockCurl($http_type, $full_url, $payload);
    return $response;
  }

  public static function MockCurl($http_type, $full_url, $payload = null, $escape_payload = true) {
    if (($http_type === "POST" || $http_type === "PUT") && $payload !== null) {
      if ($escape_payload && (is_array($payload) || is_object($payload))) {
        $payload = http_build_query($payload);
      }
    }
    WebDriver::LogDebug("=====");
    WebDriver::LogDebug($http_type, $full_url, $payload);
    $response['header'] = "";
    $response['body'] = json_encode(array("value" => ""));
    return $response;
  }
  
  public function get_element($locator) {
    $payload = WebDriver::ParseLocator($locator);
    $response = $this->execute("POST", "/session/:sessionId/element", $payload);
    return new WebDriver_MockElement($this, $this->next_element_id++, $locator);
  }
  
  public function assert_url($expected_url) { return true; }
  public function assert_title($expected_title, $ie_hash = '') { return true; }
  public function assert_element_present($element_locator) { return true; }
  public function assert_element_not_present($element_locator) { return true; }
  public function assert_string_present($expected_string) { return true; }
  public function assert_string_not_present($expected_missing_string) { return true; }
}
