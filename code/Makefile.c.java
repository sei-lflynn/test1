# Makefile to compile Java and C sources

JAVAC = javac
CC = gcc

JAVA_SOURCES = OSCommandInjection_078.java \
               DeserializeExample.java \
               InferBuggyExample.java \
               NoncompliantCertExample.java
JAVA_CLASSES = $(JAVA_SOURCES:.java=.class)

C_SOURCES = hello.world.c \
            main2.c
C_BINS = $(C_SOURCES:.c=)

.PHONY: all java c clean

all: java c

# Compile only Java
java: $(JAVA_CLASSES)

# Compile only C
c: $(C_BINS)

# Java compilation
%.class: %.java
	$(JAVAC) $<

# C compilation
%: %.c
	$(CC) -o $@ $<

clean:
	rm -f *.class $(C_BINS)
