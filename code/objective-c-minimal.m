// builds as Objective-C source but uses only stdio (no runtime headers)
#include <stdio.h>

int main(void) {
    puts("Hello from an Objective-C (.m) file without Foundation/runtime headers!");
    return 0;
}
