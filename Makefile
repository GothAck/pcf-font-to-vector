all:
	node font_converter.js
	python font_converter.py 2> /dev/null

test:
	node font_converter.js
	python font_converter.py
