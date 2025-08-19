import java.io.*;

//SER12-J  noncompliant example 1
public class DeserializeExample {
  public static Object deserialize(byte[] buffer) throws IOException, ClassNotFoundException {
    Object ret = null;
    try (ByteArrayInputStream bais = new ByteArrayInputStream(buffer)) {
      try (ObjectInputStream ois = new ObjectInputStream(bais)) {
        ret = ois.readObject();
      }
    }
    return ret;
  }

  // Minimal main so the file compiles and runs
  public static void main(String[] args) {
    System.out.println("Noncompliant CERT example loaded.");
  }
}


