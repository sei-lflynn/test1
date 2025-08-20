# Makefile to compile the Java sources

JAVAC = javac
SOURCES = OSCommandInjection_078.java \
          DeserializeExample.java \
          InferBuggyExample.java \
          NoncompliantCertExample.java
CLASSES = $(SOURCES:.java=.class)

all: $(CLASSES)

%.class: %.java
	$(JAVAC) $<

clean:
	rm -f *.class
