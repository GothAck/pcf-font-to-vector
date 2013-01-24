#!env node
var async = require('async')
  , fs = require('fs')
  , font_types = require('./font_types');

Buffer.prototype.endian = null

Object.keys(Buffer.prototype).filter(function (name) { return /(BE|LE)$/.test(name) }).map(function (name) { return name.slice(0, -2) })
  .forEach(function (name) {
    Buffer.prototype[name] = function () {
//      if (this.endian === null) throw new Error('No endian');
      return this[name + (this.endian ? 'LE' : 'BE')].apply(this, arguments);
    }
  });

async.waterfall([
    function (callback) {
      fs.readdir('./', callback);
    }
  , function (files, callback) {
      files = files.filter(function (filename) { return /\.pcf$/.test(filename) });
      async.forEachSeries(
          files
        , function (filename, file_callback) {
            console.log(filename);
            var font;
            async.waterfall([
                function (read_callback) {
                  fs.readFile(filename, read_callback);
                }
              , function (data, data_callback) {
                  font = new font_types.PCF(data);
                  var char_index = 0;
                  async.forEachSeries(
                      font.characters
                    , function (char, char_callback) {
                        var char_height = Math.floor(1 * char.height);
                        var pixels = char.toPixels();
//                        var svg = '<svg width="' + char.width + '" height="' + char_height + '" xmlns="http://www.w3.org/2000/svg" version="1.1">\n'
                        var json_svg = { width: char.width, height: char_height, elements: [] };
                        var index = 0;
                        while (index < pixels.length) {
                          var pixel = pixels[index]
                            , y = ~~(index / char.width)
                            , x = index % char.width;
                          var width = 1;
                          if (pixel) {
                            for (var i2 = index + 1; i2 < (index + char.width - x); i2 ++) {
                              if (! pixels[i2])
                                break;
                              width ++;
                            }
                            json_svg.elements.push({ x: x, y: y, width: width, height: 1 });
                          }
                          index += width;
                        }
                        /*
                         * Possible optimisation for the height=2 bars
                         */
                        for (var x = 0; x < char.width; x ++) {
                          var i = 0;
                          while (i < pixels.length) {
                            var pixel = pixels[x + i]
                              , y = ~~(i / char.width)
                              , height = 1;
                            if (pixel) {
                              for (var y2 = i + char.width; y2 < pixels.length; y2 += char.width) {
                                if (! pixels[x + y2])
                                  break;
                                height += 1;
                              }
                              if (height > 1)
                                json_svg.elements.push({ x: x, y: y, width: 1, height: height });
                            }
                            i += (height * char.width);
                          }
                        }
                        /**/
                        char_index = Array(6 - char_index.toString().length).join('0') + char_index;
                        fs.writeFile(filename + '.' + char_index + '.json_svg', JSON.stringify(json_svg), 'ascii', char_callback);
                        var height = char_height;
                        Object.defineProperty(char, 'height', { get: function () { return height }, enumerable: true });
                        char.height = height;
                        delete char.data;
//                        fs.writeFile(filename + '.' + char_index + '.json', JSON.stringify(char), 'ascii', char_callback);
                        char_index ++;
                      }
                    , function (err) {
                        data_callback(err);
                      }
                  );
                }
              , function (write_callback) {
                  fs.writeFile(filename + '.names.json', JSON.stringify(Object.keys(font.names).reduce(function (o, v) { o[v] = font.names[v].index; return o}, {})), 'ascii', write_callback);
                }
              , function (write_callback) {
                  delete font.names;
                  delete font.tables;
                  fs.writeFile(filename + '.meta.json', JSON.stringify(font), 'ascii', write_callback);
                }
            ], function (err) { file_callback(err) });
          }
        , callback
      );
    }
], function (err) {
    if (err) {
      console.log('ERROR', err);
      process.exit(1)
    }
});

async.forEach 
