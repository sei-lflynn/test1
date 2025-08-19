import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

public class InferBuggyExample {

    public static void main(String[] args) throws IOException {
        // Example 1: Null dereference
        String s = null;
        if (args.length > 0) {
            s = args[0];
        }
        if (s == null) {
            // This dereference is definitely unsafe
            System.out.println(s.toLowerCase());  // NULL_DEREFERENCE
        }

        // Example 2: Resource leak
        BufferedReader br = new BufferedReader(new FileReader("somefile.txt"));
        String line = br.readLine();
        System.out.println("First line: " + line);
        // Forgot to close 'br' → RESOURCE_LEAK
    }
}
