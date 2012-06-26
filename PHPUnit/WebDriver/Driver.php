<?php

class WebDriver_Driver {
  protected $session_id;
  protected $server_url;
  protected $browser;
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#Response_Status_Codes
  private static $status_codes = array(
    0 => array("Success", "The command executed successfully."),
    7 => array("NoSuchElement", "An element could not be located on the page using the given search parameters."),
    8 => array("NoSuchFrame", "A request to switch to a frame could not be satisfied because the frame could not be found."),
    9 => array("UnknownCommand", "The requested resource could not be found, or a request was received using an HTTP method that is not supported by the mapped resource."),
    10 => array("StaleElementReference", "An element command failed because the referenced element is no longer attached to the DOM."),
    11 => array("ElementNotVisible", "An element command could not be completed because the element is not visible on the page."),
    12 => array("InvalidElementState", "An element command could not be completed because the element is in an invalid state (e.g. attempting to click a disabled element)."),
    13 => array("UnknownError", "An unknown server-side error occurred while processing the command."),
    15 => array("ElementIsNotSelectable", "An attempt was made to select an element that cannot be selected."),
    17 => array("JavaScriptError", "An error occurred while executing user supplied JavaScript."),
    19 => array("XPathLookupError", "An error occurred while searching for an element by XPath."),
    21 => array("Timeout", "An operation did not complete before its timeout expired."),
    23 => array("NoSuchWindow", "A request to switch to a different window could not be satisfied because the window could not be found."),
    24 => array("InvalidCookieDomain", "An illegal attempt was made to set a cookie under a different domain than the current page."),
    25 => array("UnableToSetCookie", "A request to set a cookie's value could not be satisfied."),
    26 => array("UnexpectedAlertOpen", "A modal dialog was open, blocking this operation"),
    27 => array("NoAlertOpenError", "An attempt was made to operate on a modal dialog when one was not open."),
    28 => array("ScriptTimeout", "A script did not complete before its timeout expired."),
    29 => array("InvalidElementCoordinates", "The coordinates provided to an interactions operation are invalid."),
    30 => array("IMENotAvailable", "IME was not available."),
    31 => array("IMEEngineActivationFailed", "An IME engine could not be started."),
    32 => array("InvalidSelector", "Argument was an invalid selector (e.g. XPath/CSS)."),
  );
  
  protected function __construct($server_url, $capabilities) {
    $this->server_url = $server_url;
    $this->browser = $capabilities['browserName'];
    
    $payload = array("desiredCapabilities" => $capabilities);
    $response = $this->execute("POST", "/session", $payload);
    
    // Parse out session id
    preg_match("/\nLocation:.*\/(.*)\n/", $response['header'], $matches);
    if (!empty($response['body'])) {
      $additional_info = $response['body'];
    } else if (!empty($response['header'])) {
      $additional_info = $response['header'];
    } else {
      $additional_info = "No response from server.";
    }
    PHPUnit_Framework_Assert::assertEquals(2, count($matches), "Did not get a session id from $server_url\n$additional_info");
    $this->session_id = trim($matches[1]);
  }
  
  public static function InitAtSauce($sauce_username, $sauce_key, $os, $browser, $version = false, $additional_options = array()) {
    $capabilities = array_merge(array(
      'javascriptEnabled' => true,
      'platform' => strtoupper($os),
      'browserName' => $browser,
    ), $additional_options);
    if ($version) {
      $capabilities["version"] = $version;
    }
    return new WebDriver_Driver("http://" . $sauce_username . ":" . $sauce_key . "@ondemand.saucelabs.com:80/wd/hub", $capabilities);
  }
  
  public static function InitAtHost($host, $port, $browser, $additional_options = array()) {
    $capabilities = array_merge(array(
      'javascriptEnabled' => true,
      'browserName' => $browser,
    ), $additional_options);
    if (strcasecmp($browser, "iphone") == 0 || strcasecmp($browser, "android") == 0) {
      return new WebDriver_Driver("http://$host:$port/hub", $capabilities);
    } else {
      return new WebDriver_Driver("http://$host:$port/wd/hub", $capabilities);
    }
  }
  
  public static function InitAtLocal($port, $browser, $additional_options = array()) {
    return self::InitAtHost('localhost', $port, $browser, $additional_options);
  }
  
  public function running_at_sauce() {
    return (strpos($this->server_url, "saucelabs.com") !== false);
  }
  
  public function sauce_url() {
    if ($this->running_at_sauce()) {
      return "https://saucelabs.com/jobs/{$this->session_id}";
    } else {
      return false;
    }
  }
  
  public function execute($http_type, $relative_url, $payload = null) {
    if ($payload !== null) {
      $payload = json_encode($payload);
    }
    $relative_url = str_replace(':sessionId', $this->session_id, $relative_url);
    $full_url = $this->server_url . $relative_url;
    $response = WebDriver::Curl($http_type, $full_url, $payload);
    if (isset($response['body'])) {
      $command_info = $http_type . " - " . $full_url . " - " . print_r($payload, true);
      $this->check_response_status($response['body'], $command_info);
    }
    return $response;
  }
  
  private function check_response_status($body, $command_info) {
    $array = json_decode(trim($body), true);
    if (!is_null($array)) {
      $response_status_code = $array["status"];
      PHPUnit_Framework_Assert::assertArrayHasKey($response_status_code, self::$status_codes, "Unknown status code $response_status_code returned from server.\n$body");
      $response_info = $response_status_code . " - " . self::$status_codes[$response_status_code][0] . " - " . self::$status_codes[$response_status_code][1];
      $additional_info = isset($array['value']['message']) ? "Message: " . $array['value']['message'] : "Response: " . $body;
      PHPUnit_Framework_Assert::assertEquals(0, $response_status_code, "Unsuccessful WebDriver command: $response_info\nCommand: $command_info\n$additional_info");
    }
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId
  public function quit() {
    $this->execute("DELETE", "/session/:sessionId");
  }
  
  /********************************************************************
   * Getters
   */
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId
  public function get_capabilities() {
    $response = $this->execute("GET", "/session/:sessionId");
    return WebDriver::GetJSONValue($response);
  }

  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/url
  public function get_url() {
    $response = $this->execute("GET", "/session/:sessionId/url");
    return WebDriver::GetJSONValue($response);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/title
  public function get_title() {
    $response = $this->execute("GET", "/session/:sessionId/title");
    return WebDriver::GetJSONValue($response);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/source
  public function get_source() {
    $response = $this->execute("GET", "/session/:sessionId/source");
    return WebDriver::GetJSONValue($response);
  }
  
  public function get_text() {
    return $this->get_element("tag name=body")->get_text();
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/screenshot
  public function get_screenshot() {
    $response = $this->execute("GET", "/session/:sessionId/screenshot");
    $base64_encoded_png = WebDriver::GetJSONValue($response);
    return base64_decode($base64_encoded_png);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/ime/available_engines
  // Not supported as of Selenium 2.0b3
  public function get_all_ime_engines() {
    $response = $this->execute("GET", "/session/:sessionId/ime/available_engines");
    return WebDriver::GetJSONValue($response);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/ime/active_engine
  // Not supported as of Selenium 2.0b3
  public function get_ime_engine() {
    $response = $this->execute("GET", "/session/:sessionId/ime/active_engine");
    return WebDriver::GetJSONValue($response);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/ime/activated
  // Not supported as of Selenium 2.0b3
  public function is_ime_active() {
    $response = $this->execute("GET", "/session/:sessionId/ime/activated");
    return WebDriver::GetJSONValue($response);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/element
  public function get_element($locator) {
    $payload = WebDriver::ParseLocator($locator);
    $response = $this->execute("POST", "/session/:sessionId/element", $payload);
    $element_id = WebDriver::GetJSONValue($response, "ELEMENT");
    return new WebDriver_WebElement($this, $element_id, $locator);
  }
  
  // WebDriver can do implicit waits for AJAX elements, but sometimes you need explicit reloads
  // Note: is_element_present() will use the wait time, if any, that you've set with set_implicit_wait()
  public function get_element_reload($locator, $max_wait_minutes = 2) {
    $start_time = time();
    $end_time = $start_time + $max_wait_minutes * 60;
    while (time() < $end_time && $this->is_element_present($locator) == false) {
      $this->reload();
    }
    return $this->get_element($locator);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/elements
  public function get_all_elements($locator) {
    $payload = WebDriver::ParseLocator($locator);
    $response = $this->execute("POST", "/session/:sessionId/elements", $payload);
    $element_ids = WebDriver::GetJSONValue($response, "ELEMENT");
    $elements = array();
    foreach ($element_ids as $element_id) {
      $elements[] = new WebDriver_WebElement($this, $element_id, $locator);
    }
    return $elements;
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/element/active
  public function get_active_element() {
    $response = $this->execute("POST", "/session/:sessionId/element/active");
    $element_id = WebDriver::GetJSONValue($response, "ELEMENT");
    return new WebDriver_WebElement($this, $element_id, "active=true");
  }
  
  public function is_element_present($locator) {
    try {
      $this->get_element($locator);
      $is_element_present = true;
    } catch (Exception $e) {
      $is_element_present = false;
    }
    return $is_element_present;
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/window_handle
  public function get_window_handle() {
    $response = $this->execute("GET", "/session/:sessionId/window_handle");
    return WebDriver::GetJSONValue($response);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/window_handles
  public function get_all_window_handles() {
    $response = $this->execute("GET", "/session/:sessionId/window_handles");
    return WebDriver::GetJSONValue($response);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/speed
  // Not supported as of Selenium 2.0b3
  public function get_input_speed() {
    $response = $this->execute("GET", "/session/:sessionId/speed");
    return WebDriver::GetJSONValue($response);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/cookie
  public function get_all_cookies() {
    $response = $this->execute("GET", "/session/:sessionId/cookie");
    return WebDriver::GetJSONValue($response);
  }
  
  public function get_cookie($name, $property = null) {
    $all_cookies = $this->get_all_cookies();
    foreach ($all_cookies as $cookie) {
      if ($cookie['name'] == $name) {
        if (is_null($property)) {
          return $cookie;
        } else {
          return $cookie[$property];
        }
      }
    }
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/orientation
  // Not supported in iPhone as of Selenium 2.0b3
  private function get_orientation() {
    $response = $this->execute("GET", "/session/:sessionId/orientation");
    return WebDriver::GetJSONValue($response);
  }
  public function is_landscape()  { return $this->get_orientation() == "LANDSCAPE"; }
  public function is_portrait()   { return $this->get_orientation() == "PORTRAIT"; }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/alert_text
  public function get_alert_text() {
    $response = $this->execute("GET", "/session/:sessionId/alert_text");
    return WebDriver::GetJSONValue($response);
  }

  /********************************************************************
   * Setters
   */
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/timeouts/async_script
  public function set_async_timeout($milliseconds) {
    $payload = array("ms" => $milliseconds);
    $this->execute("POST", "/session/:sessionId/timeouts/async_script", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/timeouts/implicit_wait
  public function set_implicit_wait($milliseconds) {
    WebDriver::$ImplicitWaitMS = $milliseconds;
    $payload = array("ms" => $milliseconds);
    $this->execute("POST", "/session/:sessionId/timeouts/implicit_wait", $payload);
  }

  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/url
  public function load($url) {
    $payload = array("url" => $url);
    $this->execute("POST", "/session/:sessionId/url", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/forward
  public function go_forward() {
    $this->execute("POST", "/session/:sessionId/forward");
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/back
  public function go_back() {
    $this->execute("POST", "/session/:sessionId/back");
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/refresh
  public function reload() {
    $this->execute("POST", "/session/:sessionId/refresh");
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/window
  // IE appends the anchor tag to the window title, but only when it's done loading
  // Example: $driver->select_window("My Cool Page", "#chapter7") finds the window called "My Cool Page#chapter7" or "My Cool Page" in IE, and "My Cool Page" in all other browsers
  public function select_window($window_title, $ie_hash = '') {
    $start_time = time();
    $end_time = $start_time + WebDriver::$ImplicitWaitMS/1000;
    $all_window_handles = $this->get_all_window_handles();
    $all_titles = array();
    $found_window = false;
    do {
      for ($i = 0; $i < count($all_window_handles); $i++) {
        $payload = array("name" => $all_window_handles[$i]);
        $this->execute("POST", "/session/:sessionId/window", $payload);
        $current_title = $this->get_title();
        $all_titles[$i] = $current_title;
        if ($current_title == $window_title || ($this->browser == 'internet explorer' && $current_title == $window_title . $ie_hash)) {
          $found_window = true;
          break;
        }
      }
    } while (time() < $end_time && !$found_window);
    PHPUnit_Framework_Assert::assertTrue($found_window, "Could not find window with title <$window_title> and optional hash <$ie_hash>. Found " . count($all_titles) . " windows: " . implode("; ", $all_titles));
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/window
  public function close_window() {
    $this->execute("DELETE", "/session/:sessionId/window");
  }
  
  public function maximize_window() {
    $this->execute_js_sync("window.moveTo(0,0)");
    $this->execute_js_sync("window.resizeTo(screen.width,screen.height)");
    $this->execute_js_sync("window.focus()");
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/ime/deactivate
  // Not supported as of Selenium 2.0b3
  public function deactivate_ime() {
    $this->execute("POST", "/session/:sessionId/ime/deactivate");
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/ime/activate
  // Not supported as of Selenium 2.0b3
  public function activate_ime() {
    $this->execute("POST", "/session/:sessionId/ime/activate");
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/frame
  public function select_frame($identifier = null) {
    if ($identifier !== null) {
      $this->get_element($identifier); // POST /session/:sessionId/frame does not use implicit wait but POST /session/:sessionId/element does
    }
    $payload = array("id" => $identifier);
    $this->execute("POST", "/session/:sessionId/frame", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/cookie
  public function set_cookie($name, $value, $path = null, $domain = null, $secure = false, $expiry = null) {
    $payload = array(
      'cookie' => array(
        'name' => $name,
        'value' => $value,
        'secure' => $secure, // The documentation says this is optional, but selenium server 2.0b1 throws a NullPointerException if it's not provided
      )
    );
    if (!is_null($path)) {
      $payload['cookie']['path'] = $path;
    }
    if (!is_null($domain)) {
      $payload['cookie']['domain'] = $domain;
    }
    if (!is_null($expiry)) {
      $payload['cookie']['expiry'] = $expiry;
    }
    $this->execute("POST", "/session/:sessionId/cookie", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/cookie
  public function delete_all_cookies() {
    $this->execute("DELETE", "/session/:sessionId/cookie");
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/cookie/:name
  public function delete_cookie($name) {
    $this->execute("DELETE", "/session/:sessionId/cookie/" . $name);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/execute
  public function execute_js_sync($javascript, $arguments = array()) {
    $payload = array(
      "script" => $javascript,
      "args" => $arguments,
    );
    return $this->execute("POST", "/session/:sessionId/execute", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/execute_async
  public function execute_js_async($javascript, $arguments = array()) {
    $payload = array(
      "script" => $javascript,
      "args" => $arguments,
    );
    return $this->execute("POST", "/session/:sessionId/execute_async", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/speed
  // Not supported as of Selenium 2.0b3
  public function set_input_speed($speed) {
    $payload = array("speed" => $speed);
    $this->execute("POST", "/session/:sessionId/speed", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/modifier
  private function send_modifier($modifier_code, $is_down) {
    $payload = array(
      'value' => $modifier_code,
      'isdown' => $is_down
    );
    $this->execute("POST", "/session/:sessionId/modifier", $payload);
  }
  public function ctrl_down()     { $this->send_modifier("U+E009", true); }
  public function ctrl_up()       { $this->send_modifier("U+E009", false); }
  public function shift_down()    { $this->send_modifier("U+E008", true); }
  public function shift_up()      { $this->send_modifier("U+E008", false); }
  public function alt_down()      { $this->send_modifier("U+E00A", true); }
  public function alt_up()        { $this->send_modifier("U+E00A", false); }
  public function command_down()  { $this->send_modifier("U+E03D", true); }
  public function command_up()    { $this->send_modifier("U+E03D", false); }
  public function enter_up()	  { $this->send_modifier("U+E007", false); }
  public function delete_up()	  { $this->send_modifier("U+E017", true); }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/orientation
  // Not supported as of Selenium 2.0b3
  private function set_orientation($new_orientation) {
    $payload = array("orientation", $new_orientation);
    $this->execute("POST", "/session/:sessionId/orientation", $payload);
  }
  public function rotate_landscape()  { $this->set_orientation("LANDSCAPE"); }
  public function rotate_portrait()   { $this->set_orientation("PORTRAIT"); }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/moveto
  public function move_cursor($right, $down) {
    $payload = array(
      "xoffset" => $right,
      "yoffset" => $down
    );
    $this->execute("POST", "/session/:sessionId/moveto", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/click
  private function click_mouse($button) {
    $payload = array("button" => $button);
    $this->execute("POST", "/session/:sessionId/click", $payload);
  }
  public function click()         { $this->click_mouse(0); }
  public function middle_click()  { $this->click_mouse(1); }
  public function right_click()   { $this->click_mouse(2); }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/buttondown
  public function click_and_hold() {
    $this->execute("POST", "/session/:sessionId/buttondown");
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/buttonup
  public function release_click() {
    $this->execute("POST", "/session/:sessionId/buttonup");
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/doubleclick
  public function double_click() {
    $this->execute("POST", "/session/:sessionId/doubleclick");
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/alert_text
  public function type_alert($text) {
    $payload = array("keysToSend" => $text);
    $this->execute("POST", "/session/:sessionId/alert_text", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/accept_alert
  public function accept_alert() {
    $this->execute("POST", "/session/:sessionId/accept_alert");
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/dismiss_alert
  public function dismiss_alert() {
    $this->execute("POST", "/session/:sessionId/dismiss_alert");
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/touch/click
  public function single_tap($element_id) {
    $payload = array("element" => $element_id);
    $this->execute("POST", "/session/:sessionId/touch/click", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/touch/doubleclick
  public function double_tap($element_id) {
    $payload = array("element" => $element_id);
    $this->execute("POST", "/session/:sessionId/touch/doubleclick", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/touch/longclick
  public function long_tap($element_id) {
    $payload = array("element" => $element_id);
    $this->execute("POST", "/session/:sessionId/touch/longclick", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/touch/down
  public function touch_down($x_coordinate, $y_coordinate) {
    $payload = array(
      "x" => $x_coordinate,
      "y" => $y_coordinate,
    );
    $this->execute("POST", "/session/:sessionId/touch/down", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/touch/up
  public function touch_up($x_coordinate, $y_coordinate) {
    $payload = array(
      "x" => $x_coordinate,
      "y" => $y_coordinate,
    );
    $this->execute("POST", "/session/:sessionId/touch/up", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/touch/move
  public function touch_move($x_coordinate, $y_coordinate) {
    $payload = array(
      "x" => $x_coordinate,
      "y" => $y_coordinate,
    );
    $this->execute("POST", "/session/:sessionId/touch/move", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/touch/scroll
  public function touch_scroll_at($start_element_id, $pixels_offset_x, $pixels_offset_y) {
    $payload = array(
      "element" => $start_element_id,
      "xOffset" => $pixels_offset_x,
      "yOffset" => $pixels_offset_y,
    );
    $this->execute("POST", "/session/:sessionId/touch/scroll", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/touch/scroll
  public function touch_scroll($pixels_offset_x, $pixels_offset_y) {
    $payload = array(
      "xOffset" => $pixels_offset_x,
      "yOffset" => $pixels_offset_y,
    );
    $this->execute("POST", "/session/:sessionId/touch/scroll", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#session/:sessionId/touch/flick
  public function touch_flick_at($start_element_id, $pixels_offset_x, $pixels_offset_y, $pixels_per_second) {
    $payload = array(
      "element" => $start_element_id,
      "xOffset" => $pixels_offset_x,
      "yOffset" => $pixels_offset_y,
      "speed" => $pixels_per_second,
    );
    $this->execute("POST", "/session/:sessionId/touch/flick", $payload);
  }
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#session/:sessionId/touch/flick
  public function touch_flick($pixels_per_second_x, $pixels_per_second_y) {
    $payload = array(
      "xSpeed" => $pixels_per_second_x,
      "ySpeed" => $pixels_per_second_y,
    );
    $this->execute("POST", "/session/:sessionId/touch/flick", $payload);
  }
  
  // See https://saucelabs.com/docs/sauce-ondemand#alternative-annotation-methods
  public function set_sauce_context($field, $value) {
    if ($this->running_at_sauce()) {
      $payload = json_encode(array($field => $value));
      $url_parts = parse_url($this->server_url);
      WebDriver::Curl("PUT", "http://" . $url_parts['user'] . ":" . $url_parts['pass'] . "@saucelabs.com/rest/v1/" . $url_parts['user'] . "/jobs/" . $this->session_id, $payload);
    }
  }
  
  /********************************************************************
   * Asserters
   */

  public function assert_url($expected_url) {
    PHPUnit_Framework_Assert::assertEquals($expected_url, $this->get_url(), "Failed asserting that URL is <$expected_url>.");
  }
  
  // IE appends the anchor tag to the window title, but only when it's done loading
  // Example: $driver->assert_title("My Cool Page", "#chapter7") asserts that the page title is "My Cool Page#chapter7" in IE, and "My Cool Page" in all other browsers
  // WebDriver does not wait for the page to finish loading before returning the title, so we check repeatedly
  public function assert_title($expected_title, $ie_hash = '') {
    $start_time = time();
    $end_time = $start_time + WebDriver::$ImplicitWaitMS/1000;
    $title_matched = false;
    do {
      $actual_title = $this->get_title();
      $title_matched = ($this->browser == 'internet explorer' && $actual_title == $expected_title . $ie_hash) || ($actual_title == $expected_title);
    } while (time() < $end_time && !$title_matched);
    PHPUnit_Framework_Assert::assertTrue($title_matched, "Failed asserting that <$actual_title> is <$expected_title> with optional hash <$ie_hash>.");
  }
  
  public function assert_element_present($element_locator) {
    PHPUnit_Framework_Assert::assertTrue($this->is_element_present($element_locator), "Failed asserting that <$element_locator> is present");
  }
  
  public function assert_element_not_present($element_locator) {
    PHPUnit_Framework_Assert::assertFalse($this->is_element_present($element_locator), "Failed asserting that <$element_locator> is not present");
  }
  
  public function assert_string_present($expected_string) {
    $page_text = $this->get_text();
    PHPUnit_Framework_Assert::assertContains($expected_string, $page_text, "Failed asserting that page text contains <$expected_string>.\n$page_text");
  }
  
  public function assert_string_not_present($expected_missing_string) {
    $page_text = $this->get_text();
    PHPUnit_Framework_Assert::assertNotContains($expected_missing_string, $page_text, "Failed asserting that page text does not contain <$expected_missing_string>.\n$page_text");
  }
  
  public function assert_alert_text($expected_text) {
    $actual_text = $this->get_alert_text();
    PHPUnit_Framework_Assert::assertEquals($expected_text, $actual_text, "Failed asserting that alert text is <$expected_text>.");
  }
}
