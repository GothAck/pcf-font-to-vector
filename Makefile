all: svgs fonts

svgs: *.pcf
	@echo "Vectorising pcf files"
	@node font_converter.js $?

fonts: *.meta.json
	@echo "Converting vectors to outline fonts"
	@python font_converter.py $?

*.meta.json:

#*.pcf:
#	@echo "Vectorising pcf files"
#	@node font_converter.js $?
#	@echo "Converting vectors to outline fonts"
#	@python font_converter.py $?
