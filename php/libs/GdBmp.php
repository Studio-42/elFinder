<?php
/**
 * Copyright (c) 2011, oov. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *  - Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *  - Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *  - Neither the name of the oov nor the names of its contributors may be used to
 *    endorse or promote products derived from this software without specific prior
 *    written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 * OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * bmp ファイルを GD で使えるように
 *
 * 使用例:
 *   //ファイルから読み込む場合はGDでPNGなどを読み込むのと同じような方法で可
 *   $image = imagecreatefrombmp("test.bmp");
 *   imagedestroy($image);
 *
 *   //文字列から読み込む場合は以下の方法で可
 *   $image = GdBmp::loadFromString(file_get_contents("test.bmp"));
 *   //自動判定されるので破損ファイルでなければこれでも上手くいく
 *   //$image = imagecreatefrombmp(file_get_contents("test.bmp"));
 *   imagedestroy($image);
 *
 *   //その他任意のストリームからの読み込みも可能
 *   $stream = fopen("http://127.0.0.1/test.bmp");
 *   $image = GdBmp::loadFromStream($stream);
 *   //自動判定されるのでこれでもいい
 *   //$image = imagecreatefrombmp($stream);
 *   fclose($stream);
 *   imagedestroy($image);
 *
 * 対応フォーマット
 *   1bit
 *   4bit
 *   4bitRLE
 *   8bit
 *   8bitRLE
 *   16bit(任意のビットフィールド)
 *   24bit
 *   32bit(任意のビットフィールド)
 *   BITMAPINFOHEADER の biCompression が BI_PNG / BI_JPEG の画像
 *   すべての形式でトップダウン/ボトムアップの両方をサポート
 *   特殊なビットフィールドでもビットフィールドデータが正常なら読み込み可能
 *
 * 以下のものは非対応
 *   BITMAPV4HEADER と BITMAPV5HEADER に含まれる色空間に関する様々な機能
 * @param $filename_or_stream_or_binary
 * @return bool|resource
 */

function imagecreatefrombmp($filename_or_stream_or_binary){
	return elFinderLibGdBmp::load($filename_or_stream_or_binary);
}

class elFinderLibGdBmp{
	public static function load($filename_or_stream_or_binary){
		if (is_resource($filename_or_stream_or_binary)){
			return self::loadFromStream($filename_or_stream_or_binary);
		} else if (is_string($filename_or_stream_or_binary) && strlen($filename_or_stream_or_binary) >= 26){
			$bfh = unpack("vtype/Vsize", $filename_or_stream_or_binary);
			if ($bfh["type"] == 0x4d42 && ($bfh["size"] == 0 || $bfh["size"] == strlen($filename_or_stream_or_binary))){
				return self::loadFromString($filename_or_stream_or_binary);
			}
		}
		return self::loadFromFile($filename_or_stream_or_binary);
	}
	public static function loadFromFile($filename){
		$fp = fopen($filename, "rb");
		if ($fp === false){
			return false;
		}

		$bmp = self::loadFromStream($fp);

		fclose($fp);
		return $bmp;
	}

	public static function loadFromString($str){
		//data scheme より古いバージョンから対応しているようなので php://memory を使う
		$fp = fopen("php://memory", "r+b");
		if ($fp === false){
			return false;
		}

		if (fwrite($fp, $str) != strlen($str)){
			fclose($fp);
			return false;
		}

		if (fseek($fp, 0) === -1){
			fclose($fp);
			return false;
		}

		$bmp = self::loadFromStream($fp);

		fclose($fp);
		return $bmp;
	}

	public static function loadFromStream($stream){
		$buf = fread($stream, 14); //2+4+2+2+4
		if ($buf === false){
			return false;
		}

		//シグネチャチェック
		if ($buf[0] != 'B' || $buf[1] != 'M'){
			return false;
		}

		$bitmap_file_header = unpack(
			//BITMAPFILEHEADER構造体
			"vtype/".
			"Vsize/".
			"vreserved1/".
			"vreserved2/".
			"Voffbits", $buf
		);

		return self::loadFromStreamAndFileHeader($stream, $bitmap_file_header);
	}

	public static function loadFromStreamAndFileHeader($stream, array $bitmap_file_header){
		if ($bitmap_file_header["type"] != 0x4d42){
			return false;
		}

		//情報ヘッダサイズを元に形式を区別して読み込み
		$buf = fread($stream, 4);
		if ($buf === false){
			return false;
		}
		list(,$header_size) = unpack("V", $buf);


		if ($header_size == 12){
			$buf = fread($stream, $header_size - 4);
			if ($buf === false){
				return false;
			}

			extract(unpack(
				//BITMAPCOREHEADER構造体 - OS/2 Bitmap
				"vwidth/".
				"vheight/".
				"vplanes/".
				"vbit_count", $buf
			));
			//飛んでこない分は 0 で初期化しておく
			$clr_used = $clr_important = $alpha_mask = $compression = 0;

			//マスク類は初期化されないのでここで割り当てておく
			$red_mask   = 0x00ff0000;
			$green_mask = 0x0000ff00;
			$blue_mask  = 0x000000ff;
		} else if (124 < $header_size || $header_size < 40) {
			//未知の形式
			return false;
		} else {
			//この時点で36バイト読めることまではわかっている
			$buf = fread($stream, 36); //既に読んだ部分は除外しつつBITMAPINFOHEADERのサイズだけ読む
			if ($buf === false){
				return false;
			}

			//BITMAPINFOHEADER構造体 - Windows Bitmap
			extract(unpack(
				"Vwidth/".
				"Vheight/".
				"vplanes/".
				"vbit_count/".
				"Vcompression/".
				"Vsize_image/".
				"Vx_pels_per_meter/".
				"Vy_pels_per_meter/".
				"Vclr_used/".
				"Vclr_important", $buf
			));
			//負の整数を受け取る可能性があるものは自前で変換する
			if ($width  & 0x80000000){ $width  = -(~$width  & 0xffffffff) - 1; }
			if ($height & 0x80000000){ $height = -(~$height & 0xffffffff) - 1; }
			if ($x_pels_per_meter & 0x80000000){ $x_pels_per_meter = -(~$x_pels_per_meter & 0xffffffff) - 1; }
			if ($y_pels_per_meter & 0x80000000){ $y_pels_per_meter = -(~$y_pels_per_meter & 0xffffffff) - 1; }

			//ファイルによっては BITMAPINFOHEADER のサイズがおかしい（書き込み間違い？）ケースがある
			//自分でファイルサイズを元に逆算することで回避できることもあるので再計算できそうなら正当性を調べる
			//シークできないストリームの場合全体のファイルサイズは取得できないので、$bitmap_file_headerにサイズ申告がなければやらない
			if ($bitmap_file_header["size"] != 0){
				$colorsize = $bit_count == 1 || $bit_count == 4 || $bit_count == 8 ? ($clr_used ? $clr_used : pow(2, $bit_count))<<2 : 0;
				$bodysize = $size_image ? $size_image : ((($width * $bit_count + 31) >> 3) & ~3) * abs($height);
				$calcsize = $bitmap_file_header["size"] - $bodysize - $colorsize - 14;

				//本来であれば一致するはずなのに合わない時は、値がおかしくなさそうなら（BITMAPV5HEADERの範囲内なら）計算して求めた値を採用する
				if ($header_size < $calcsize && 40 <= $header_size && $header_size <= 124){
					$header_size = $calcsize;
				}
			}

			//BITMAPV4HEADER や BITMAPV5HEADER の場合まだ読むべきデータが残っている可能性がある
			if ($header_size - 40 > 0){
				$buf = fread($stream, $header_size - 40);
				if ($buf === false){
					return false;
				}

				extract(unpack(
					//BITMAPV4HEADER構造体(Windows95以降)
					//BITMAPV5HEADER構造体(Windows98/2000以降)
					"Vred_mask/".
					"Vgreen_mask/".
					"Vblue_mask/".
					"Valpha_mask", $buf . str_repeat("\x00", 120)
				));
			} else {
				$alpha_mask = $red_mask = $green_mask = $blue_mask = 0;
			}

			//パレットがないがカラーマスクもない時
			if (
				($bit_count == 16 || $bit_count == 24 || $bit_count == 32)&&
				$compression == 0 &&
				$red_mask == 0 && $green_mask == 0 && $blue_mask == 0
			){
				//もしカラーマスクを所持していない場合は
				//規定のカラーマスクを適用する
				switch($bit_count){
				case 16:
					$red_mask   = 0x7c00;
					$green_mask = 0x03e0;
					$blue_mask  = 0x001f;
					break;
				case 24:
				case 32:
					$red_mask   = 0x00ff0000;
					$green_mask = 0x0000ff00;
					$blue_mask  = 0x000000ff;
					break;
				}
			}
		}

		if (
			($width  == 0)||
			($height == 0)||
			($planes != 1)||
			(($alpha_mask & $red_mask  ) != 0)||
			(($alpha_mask & $green_mask) != 0)||
			(($alpha_mask & $blue_mask ) != 0)||
			(($red_mask   & $green_mask) != 0)||
			(($red_mask   & $blue_mask ) != 0)||
			(($green_mask & $blue_mask ) != 0)
		){
			//不正な画像
			return false;
		}

		//BI_JPEG と BI_PNG の場合は jpeg/png がそのまま入ってるだけなのでそのまま取り出してデコードする
		if ($compression == 4 || $compression == 5){
			$buf = stream_get_contents($stream, $size_image);
			if ($buf === false){
				return false;
			}
			return imagecreatefromstring($buf);
		}

		//画像本体の読み出し
		//1行のバイト数
		$line_bytes = (($width * $bit_count + 31) >> 3) & ~3;
		//全体の行数
		$lines = abs($height);
		//y軸進行量（ボトムアップかトップダウンか）
		$y = $height > 0 ? $lines-1 : 0;
		$line_step = $height > 0 ? -1 : 1;

		//256色以下の画像か？
		if ($bit_count == 1 || $bit_count == 4 || $bit_count == 8){
			$img = imagecreate($width, $lines);

			//画像データの前にパレットデータがあるのでパレットを作成する
			$palette_size = $header_size == 12 ? 3 : 4; //OS/2形式の場合は x に相当する箇所のデータは最初から確保されていない
			$colors = $clr_used ? $clr_used : pow(2, $bit_count); //色数
			$palette = array();
			for($i = 0; $i < $colors; ++$i){
				$buf = fread($stream, $palette_size);
				if ($buf === false){
					imagedestroy($img);
					return false;
				}
				extract(unpack("Cb/Cg/Cr/Cx", $buf . "\x00"));
				$palette[] = imagecolorallocate($img, $r, $g, $b);
			}

			$shift_base = 8 - $bit_count;
			$mask = ((1 << $bit_count) - 1) << $shift_base;

			//圧縮されている場合とされていない場合でデコード処理が大きく変わる
			if ($compression == 1 || $compression == 2){
				$x = 0;
				$qrt_mod2 = $bit_count >> 2 & 1;
				for(;;){
					//もし描写先が範囲外になっている場合デコード処理がおかしくなっているので抜ける
					//変なデータが渡されたとしても最悪なケースで255回程度の無駄なので目を瞑る
					if ($x < -1 || $x > $width || $y < -1 || $y > $height){
						imagedestroy($img);
						return false;
					}
					$buf = fread($stream, 1);
					if ($buf === false){
						imagedestroy($img);
						return false;
					}
					switch($buf){
					case "\x00":
						$buf = fread($stream, 1);
						if ($buf === false){
							imagedestroy($img);
							return false;
						}
						switch($buf){
						case "\x00": //EOL
							$y += $line_step;
							$x = 0;
							break;
						case "\x01": //EOB
							$y = 0;
							$x = 0;
							break 3;
						case "\x02": //MOV
							$buf = fread($stream, 2);
							if ($buf === false){
								imagedestroy($img);
								return false;
							}
							list(,$xx, $yy) = unpack("C2", $buf);
							$x += $xx;
							$y += $yy * $line_step;
							break;
						default:     //ABS
							list(,$pixels) = unpack("C", $buf);
							$bytes = ($pixels >> $qrt_mod2) + ($pixels & $qrt_mod2);
							$buf = fread($stream, ($bytes + 1) & ~1);
							if ($buf === false){
								imagedestroy($img);
								return false;
							}
							for ($i = 0, $pos = 0; $i < $pixels; ++$i, ++$x, $pos += $bit_count){
								list(,$c) = unpack("C", $buf[$pos >> 3]);
								$b = $pos & 0x07;
								imagesetpixel($img, $x, $y, $palette[($c & ($mask >> $b)) >> ($shift_base - $b)]);
							}
							break;
						}
						break;
					default:
						$buf2 = fread($stream, 1);
						if ($buf2 === false){
							imagedestroy($img);
							return false;
						}
						list(,$size, $c) = unpack("C2", $buf . $buf2);
						for($i = 0, $pos = 0; $i < $size; ++$i, ++$x, $pos += $bit_count){
							$b = $pos & 0x07;
							imagesetpixel($img, $x, $y, $palette[($c & ($mask >> $b)) >> ($shift_base - $b)]);
						}
						break;
					}
				}
			} else {
				for ($line = 0; $line < $lines; ++$line, $y += $line_step){
					$buf = fread($stream, $line_bytes);
					if ($buf === false){
						imagedestroy($img);
						return false;
					}

					$pos = 0;
					for ($x = 0; $x < $width; ++$x, $pos += $bit_count){
						list(,$c) = unpack("C", $buf[$pos >> 3]);
						$b = $pos & 0x7;
						imagesetpixel($img, $x, $y, $palette[($c & ($mask >> $b)) >> ($shift_base - $b)]);
					}
				}
			}
		} else {
			$img = imagecreatetruecolor($width, $lines);
			imagealphablending($img, false);
			if ($alpha_mask)
			{
				//αデータがあるので透過情報も保存できるように
				imagesavealpha($img, true);
			}

			//x軸進行量
			$pixel_step = $bit_count >> 3;
			$alpha_max    = $alpha_mask ? 0x7f : 0x00;
			$alpha_mask_r = $alpha_mask ? 1/$alpha_mask : 1;
			$red_mask_r   = $red_mask   ? 1/$red_mask   : 1;
			$green_mask_r = $green_mask ? 1/$green_mask : 1;
			$blue_mask_r  = $blue_mask  ? 1/$blue_mask  : 1;

			for ($line = 0; $line < $lines; ++$line, $y += $line_step){
				$buf = fread($stream, $line_bytes);
				if ($buf === false){
					imagedestroy($img);
					return false;
				}

				$pos = 0;
				for ($x = 0; $x < $width; ++$x, $pos += $pixel_step){
					list(,$c) = unpack("V", substr($buf, $pos, $pixel_step). "\x00\x00");
					$a_masked = $c & $alpha_mask;
					$r_masked = $c & $red_mask;
					$g_masked = $c & $green_mask;
					$b_masked = $c & $blue_mask;
					$a = $alpha_max - ((($a_masked<<7) - $a_masked) * $alpha_mask_r);
					$r = (($r_masked<<8) - $r_masked) * $red_mask_r;
					$g = (($g_masked<<8) - $g_masked) * $green_mask_r;
					$b = (($b_masked<<8) - $b_masked) * $blue_mask_r;
					imagesetpixel($img, $x, $y, ($a<<24)|($r<<16)|($g<<8)|$b);
				}
			}
			imagealphablending($img, true); //デフォルト値に戻しておく
		}
		return $img;
	}
}
