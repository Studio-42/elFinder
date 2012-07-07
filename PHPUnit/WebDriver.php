<?php

class WebDriver {
  public static $ImplicitWaitMS = 0;
  
  // See http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/element/:id/value
  // Example: $my_web_element->send_keys(WebDriver::ReturnKey());
  private static $keys = array(
    'NullKey' => "\uE000",
    'CancelKey' => "\uE001",
    'HelpKey' => "\uE002",
    'BackspaceKey' => "\uE003",
    'TabKey' => "\uE004",
    'ClearKey' => "\uE005",
    'ReturnKey' => "\uE006",
    'EnterKey' => "\uE007",
    'ShiftKey' => "\uE008",
    'ControlKey' => "\uE009",
    'AltKey' => "\uE00A",
    'PauseKey' => "\uE00B",
    'EscapeKey' => "\uE00C",
    'SpaceKey' => "\uE00D",
    'PageUpKey' => "\uE00E",
    'PageDownKey' => "\uE00F",
    'EndKey' => "\uE010",
    'HomeKey' => "\uE011",
    'LeftArrowKey' => "\uE012",
    'UpArrowKey' => "\uE013",
    'RightArrowKey' => "\uE014",
    'DownArrowKey' => "\uE015",
    'InsertKey' => "\uE016",
    'DeleteKey' => "\uE017",
    'SemicolonKey' => "\uE018",
    'EqualsKey' => "\uE019",
    'Numpad0Key' => "\uE01A",
    'Numpad1Key' => "\uE01B",
    'Numpad2Key' => "\uE01C",
    'Numpad3Key' => "\uE01D",
    'Numpad4Key' => "\uE01E",
    'Numpad5Key' => "\uE01F",
    'Numpad6Key' => "\uE020",
    'Numpad7Key' => "\uE021",
    'Numpad8Key' => "\uE022",
    'Numpad9Key' => "\uE023",
    'MultiplyKey' => "\uE024",
    'AddKey' => "\uE025",
    'SeparatorKey' => "\uE026",
    'SubtractKey' => "\uE027",
    'DecimalKey' => "\uE028",
    'DivideKey' => "\uE029",
    'F1Key' => "\uE031",
    'F2Key' => "\uE032",
    'F3Key' => "\uE033",
    'F4Key' => "\uE034",
    'F5Key' => "\uE035",
    'F6Key' => "\uE036",
    'F7Key' => "\uE037",
    'F8Key' => "\uE038",
    'F9Key' => "\uE039",
    'F10Key' => "\uE03A",
    'F11Key' => "\uE03B",
    'F12Key' => "\uE03C",
    'CommandKey' => "\uE03D",
    'MetaKey' => "\uE03D",
  );
  
  public static function __callStatic($name, $arguments) {
    if (isset(self::$keys[$name])) {
      return json_decode('"' . self::$keys[$name] . '"');
    } else {
      throw new Exception("Can't type key $name");
    }
  }

  public static function Curl($http_type, $full_url, $payload = null, $escape_payload = true) {
    $curl = curl_init($full_url);
    curl_setopt($curl, CURLOPT_CUSTOMREQUEST, $http_type);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($curl, CURLOPT_HEADER, TRUE);
    curl_setopt($curl, CURLOPT_HTTPHEADER, array('Expect:'));
    curl_setopt($curl, CURLOPT_TIMEOUT, 120); // No single operation should take longer than 2 minutes
    if ($payload !== null && json_decode($payload) !== null) {
      curl_setopt($curl, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    }
    if (($http_type === "POST" || $http_type === "PUT") && $payload !== null) {
      if ($escape_payload && (is_array($payload) || is_object($payload))) {
        $payload = http_build_query($payload);
      }
      curl_setopt($curl, CURLOPT_POSTFIELDS, $payload);
    }
    WebDriver::LogDebug($http_type, $full_url, $payload);
    $full_response = curl_exec($curl);
    WebDriver::LogDebug($full_response);
    WebDriver::LogDebug("=====");
    $error = curl_error($curl);
    PHPUnit_Framework_Assert::assertEquals("", $error, "Curl error: $error\nMethod: $http_type\nURL: $full_url\n" . print_r($payload, true));
    curl_close($curl);
    $response_parts = explode("\r\n\r\n", $full_response, 2);
    $response['header'] = $response_parts[0];
    if (!empty($response_parts[1])) {
      $response['body'] = $response_parts[1];
    }
    return $response;
  }

  public static function ParseLocator($locator) {
    $se1_to_se2 = array(
      "identifier" => "id",
      "id" => "id",
      "name" => "name",
      "xpath" => "xpath",
      "link" => "link text",
      "css" => "css selector",
        // The dom selector in Se1 isn't in Se2
        // Se2 has 4 new selectors
        "partial link text",
        "tag name",
        "class",
        "class name"
    );
    
    $locator_parts = explode("=", $locator, 2);
    if (array_key_exists($locator_parts[0], $se1_to_se2) && isset($locator_parts[1]) && strlen($locator_parts[1]) > 0) { // Explicit Se1 selector
      $strategy = $se1_to_se2[$locator_parts[0]];
      $value = $locator_parts[1];
    } else if (in_array($locator_parts[0], $se1_to_se2) && isset($locator_parts[1]) && strlen($locator_parts[1]) > 0) { // Explicit Se2 selector
      $strategy = $locator_parts[0];
      $value = $locator_parts[1];
    } else { // Guess the selector based on Se1
      if (substr($locator, 0, 2) === "//") {
        $strategy = "xpath";
        $value = $locator;
      } else if (substr($locator, 0, 9) === "document." || substr($locator, 0, 4) === "dom=") {
        throw new Exception("DOM selectors aren't supported in WebDriver: $locator");
      } else { // Fall back to id
        $strategy = "id";
        $value = $locator;
      }
    }
    return array("using" => $strategy, "value" => $value);
  }
  
  public static function QuoteXPath($value) {
    $contains_single_quote = strpos($value, "'") !== false;
    $contains_double_quote = strpos($value, '"') !== false;
    if (!$contains_single_quote) {
      return "'" . $value . "'";
    } else if (!$contains_double_quote) {
      return '"' . $value . '"';
    } else {
      $parts = split("'", $value);
      return "concat('" . implode("', \"'\", '", $parts) . "')";
    }
  }
  
  // Converts a CSS color to the form FFFFFF
  public static function CanonicalizeCSSColor($color) {
    $color = strtolower(trim($color));
    $rgb = array();
    $css_colors = array(
      'black' => '000000',
      'silver' => 'C0C0C0',
      'gray' => '808080',
      'white' => 'FFFFFF',
      'maroon' => '800000',
      'red' => 'FF0000',
      'purple' => '800080',
      'fuchsia' => 'FF00FF',
      'green' => '008000',
      'lime' => '00FF00',
      'olive' => '808000',
      'yellow' => 'FFFF00',
      'navy' => '000080',
      'blue' => '0000FF',
      'teal' => '008080',
      'aqua' => '00FFFF',
    );
    if (preg_match('/^rgb\(([0-9]+),\s*([0-9]+),\s*([0-9]+)\)$/', $color, $rgb)) {
      // rgb(255, 255, 255) -> ffffff
      if (0 <= $rgb[1] && $rgb[1] <= 255 && 0 <= $rgb[2] && $rgb[2] <= 255 && 0 <= $rgb[3] && $rgb[3] <= 255) {
        $six_hex = sprintf('%02X%02X%02X', $rgb[1], $rgb[2], $rgb[3]);
      }
    } else if (preg_match('/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/', $color, $rgb)) {
      // #fff -> ffffff
      $six_hex = $rgb[1] . $rgb[1] . $rgb[2] . $rgb[2] . $rgb[3] . $rgb[3];
    } else if (preg_match('/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/', $color, $rgb)) {
      // #ffffff -> ffffff
      $six_hex = $rgb[1] . $rgb[2] . $rgb[3];
    } else if (isset($css_colors[$color])) {
      // white -> FFFFFF
      $six_hex = $css_colors[$color];
    }
    PHPUnit_Framework_Assert::assertNotNull($six_hex, "Cannont canonicalize $color");
    return strtoupper($six_hex);
  }

  public static function GetJSONValue($curl_response, $attribute = null) {
    PHPUnit_Framework_Assert::assertArrayHasKey('body', $curl_response, "Response had no body\n{$curl_response['header']}");
    $array = json_decode(trim($curl_response['body']), true);
    PHPUnit_Framework_Assert::assertNotNull($array, "Body could not be decoded as JSON\n{$curl_response['body']}");
    PHPUnit_Framework_Assert::assertArrayHasKey('value', $array, "JSON had no value\n" . print_r($array, true));
    if ($attribute === null) {
      $rv = $array["value"];
    } else {
      if (isset($array["value"][$attribute])) {
        $rv = $array["value"][$attribute];
      } else if (is_array($array["value"])) {
        $rv = array();
        foreach ($array["value"] as $a_value) {
          PHPUnit_Framework_Assert::assertArrayHasKey($attribute, $a_value, "JSON value did not have attribute $attribute\n" . print_r($array, true));
          $rv[] = $a_value[$attribute];
        }
      }
      PHPUnit_Framework_Assert::assertNotNull($rv, "JSON value did not have attribute $attribute\n" . print_r($array["value"], true));
    }
    return $rv;
  }

  public static function LogDebug() {
    if (defined('kFestDebug') && kFestDebug) {
      $non_null = array_filter(func_get_args());
      $strings = 0;
      foreach ($non_null as $argument) {
        if (is_string($argument)) {
          $strings++;
        }
      }
      if ($strings == sizeof($non_null)) {
        echo implode(" - ", $non_null) . "\n";
      } else {
        print_r(func_get_args());
      }
    }
  }
}