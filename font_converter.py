#!env python
import os, sys, traceback, shutil, glob, string, json, fontforge, psMat
import pysvg

meta_filenames = [x for x in os.listdir('.') if x.endswith('.meta.json')]

for meta_filename in meta_filenames:
    base_name = meta_filename[:-10]
    font_name = base_name[:-4]
    name_split = font_name.split('-', 1)
    encoding = 'UTF-8' #name_split[1] if len(name_split) == 2 else 'UTF-8'

    print 'Processing', font_name

    f = open(meta_filename, 'r')
    meta = json.load(f)
    f.close()
    f = open(base_name + '.names.json', 'r')
    names = json.load(f)
    f.close()
    names = dict(zip(names.values(), names.keys()))

    font = fontforge.font()
    font.fontname = font_name
    font.encoding = encoding
    font.ascent = meta.get('bdf_accelerators').get('maxbounds').get('ascent')
    font.descent = meta.get('bdf_accelerators').get('maxbounds').get('descent')

    min_byte1         , max_byte1         = meta.get('min_byte1')         , meta.get('max_byte1')
    min_char_or_byte2 , max_char_or_byte2 = meta.get('min_char_or_byte2') , meta.get('max_char_or_byte2')

    _min = (min_byte1 << 8) + min_char_or_byte2
    _max = (max_byte1 << 8) + max_char_or_byte2

    char_data = meta.get('characters')
    print len(char_data)
    for (char_index, glyph_index) in enumerate(meta.get('glyphindeces')):
        if glyph_index == 65535:
          continue
        char_code = _min + char_index
        if (_min + char_index) > _max:
          raise Exception('Index over max', _min, char_index, _max)
        char_base_name = base_name + '.' + ('%05d' % glyph_index)
        try:
            f = open(char_base_name + '.json_svg', 'r');
            char_json_svg = json.load(f)
            f.close()
            char_meta = char_data[glyph_index]
        except:
            traceback.print_exc(file=sys.stdout)
            print 'Cannot open', char_base_name
            raise Exception()
        else:
            name = None
            if names.has_key(glyph_index):
                name = str(names[glyph_index]).encode('ascii', 'ignore')
                name = filter(lambda x: x in string.printable, name)
                char = font.createChar(char_code, name)
            else:
                char = font.createChar(char_code)
            char.width = char_meta.get('right')
            left = char_meta.get('left')
            top = char_meta.get('ascent')
            pen = char.glyphPen()
            for element in char_json_svg.get('elements'):
                x1 = left + element.get('x')
                y1 = top  - element.get('y')
                x2 = x1   + element.get('width')
                y2 = y1   - element.get('height')
                pen.moveTo(x1, y1)
                pen.lineTo(x2, y1)
                pen.lineTo(x2, y2)
                pen.lineTo(x1, y2)
                pen.closePath()
            char.width = char_meta.get('right')
            char.simplify(0, ('mergelines'))
            char.autoHint()
            os.unlink(char_base_name + '.json_svg')
    font.save(base_name + '.sfd')
    font.generate(base_name + '.woff')
    font.close()
    for file in glob.glob(font_name + '.*'):
        shutil.move(file, 'out/')

