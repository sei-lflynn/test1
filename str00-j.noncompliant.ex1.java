import java.io.IOException;
import java.io.InputStream;
import java.net.Socket;

public class NoncompliantCertExample {

  // NONCOMPLIANT example from CERT (as requested)
  public final int MAX_SIZE = 1024;

  public String readBytes(Socket socket) throws IOException {
    InputStream in = socket.getInputStream();
    byte[] data = new byte[MAX_SIZE + 1];
    int offset = 0;
    int bytesRead = 0;
    String str = new String();
    while ((bytesRead = in.read(data, offset, data.length - offset)) != -1) {
      str += new String(data, offset, bytesRead, "UTF-8");
      offset += bytesRead;
      if (offset >= data.length) {
        throw new IOException("Too much input");
      }
    }
    in.close();
    return str;
  }

  // Minimal main so the file compiles and runs
  public static void main(String[] args) {
    System.out.println("Noncompliant CERT example loaded.");
  }
}
