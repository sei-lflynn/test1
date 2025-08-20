import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.IOException;
import java.net.Socket;

public class InferBuggyExample {

    // Dead store: overwritten before any read
    private static int cachedValue = 0; // DEAD_STORE

    // Returns null on purpose
    private static String maybeNull(boolean flag) {
        return flag ? "ok" : null;
    }

    public static void main(String[] args) throws Exception {
        // --- 1) Null dereference ---
        String s = null;
        if (args.length > 0) {
            s = args[0];
        }
        if (s == null) {
            System.out.println(s.toLowerCase()); // NULL_DEREFERENCE
        }

        // --- 2) Resource leak: BufferedReader never closed ---
        BufferedReader br = new BufferedReader(new FileReader("somefile.txt"));
        String line = br.readLine(); // RESOURCE_LEAK (br not closed)
        System.out.println("First line: " + line);

        // --- 3) Resource leak: FileInputStream never closed ---
        FileInputStream fis = new FileInputStream("anotherfile.bin");
        int firstByte = fis.read(); // RESOURCE_LEAK (fis not closed)
        System.out.println("First byte: " + firstByte);

        // --- 4) Resource leak on a branch: Socket not closed in one path ---
        Socket sock = new Socket("example.com", 80);
        if (firstByte == 42) {
            // Close only in this branch
            sock.close();
        } else {
            // Missing close here → RESOURCE_LEAK
            sock.getOutputStream().write("GET / HTTP/1.0\r\n\r\n".getBytes());
        }

        // --- 5) Array out of bounds ---
        int[] arr = new int[2];
        arr[0] = 1;
        arr[1] = 2;
        arr[2] = 3; // ARRAY_OUT_OF_BOUNDS

        // --- 6) Divide by zero (definite) ---
        int x = 10;
        int y = x - x; // y == 0
        int z = 5 / y; // DIVIDE_BY_ZERO
        System.out.println("z = " + z);

        // --- 7) Dead store: value overwritten before any read ---
        cachedValue = 100; // previous value never read
        cachedValue = 200; // DEAD_STORE again (if never read)
        System.out.println("Cached value updated"); // never actually reads cachedValue

        // --- 8) Another null deref via helper ---
        String t = maybeNull(false);
        System.out.println(t.length()); // NULL_DEREFERENCE
    }
}
