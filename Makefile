# Makefile to compile Java, C, C++, and Objective-C sources

# Compilers used:
# C files (.c) compiled with gcc into executables with the same basename.
# C++ files (.cpp) compiled with g++ into executables with the same basename.
# Objective-C files (.m) compiled with gcc -ObjC

# Targets:
# `make all`: builds Java + C + C++ + Objective-C
# `make java`: only Java
# `make c`: only C
# `make cpp`: only C++
# `make objc`: only Objective-C
# `make clean`: removes everything

# Default: `make` runs `make all`
.DEFAULT_GOAL := all

JAVAC = javac
# CC = gcc
# CXX = g++
CC = clang
CXX = clang++
OBJC = gcc   # On most systems, gcc with -ObjC handles Objective-C

# --- Objective-C toolchain & flags (auto-detect OS) ---
ifeq ($(UNAME_S),Darwin)
  OBJC       := clang
  OBJCFLAGS  := -fobjc-arc
  OBJCLIBS   := -framework Foundation
else
  # Linux/GNUstep (legacy runtime → no ARC)
  OBJC       := clang
  OBJCFLAGS  := $(shell gnustep-config --objc-flags)
  OBJCLIBS   := $(shell gnustep-config --gui-libs)
endif

# --- Sources ---
JAVA_SOURCES = OSCommandInjection_078.java \
               DeserializeExample.java \
               InferBuggyExample.java \
               NoncompliantCertExample.java
JAVA_CLASSES = $(JAVA_SOURCES:.java=.class)

C_SOURCES = hello.world.c \
            main2.c
C_BINS = $(C_SOURCES:.c=)

CPP_SOURCES = $(wildcard *.cpp)
CPP_BINS = $(CPP_SOURCES:.cpp=)

OBJC_SOURCES = $(wildcard *.m)
OBJC_BINS = $(OBJC_SOURCES:.m=)

.PHONY: all java c cpp objc clean

all: java c cpp objc

# Compile only Java
java: $(JAVA_CLASSES)

# Compile only C
c: $(C_BINS)

# Compile only C++
cpp: $(CPP_BINS)

# Compile only Objective-C
objc: $(OBJC_BINS)

# Java compilation
%.class: %.java
	$(JAVAC) $<

# C compilation
%: %.c
	$(CC) -o $@ $<

# C++ compilation
%: %.cpp
	$(CXX) -o $@ $<

# Objective-C compilation
%: %.m
	$(OBJC) $(OBJCFLAGS) -o $@ $< $(OBJCLIBS)

clean:
	rm -f *.class $(C_BINS) $(CPP_BINS) $(OBJC_BINS)

