/* 
 * This software was developed at the National Institute of Standards and
 * Technology by employees of the Federal Government in the course of their
 * official duties. Pursuant to title 17 Section 105 of the United States
 * Code this software is not subject to copyright protection and is in the
 * public domain. NIST assumes no responsibility whatsoever for its use by
 * other parties, and makes no guarantees, expressed or implied, about its
 * quality, reliability, or any other characteristic.
 *
 * This reference program was developed in June 2009 as part of the Software
 * Assurance Metrics And Tool Evaluation (SAMATE) project.
 * We would appreciate acknowledgment if the software is used.
 * The SAMATE project website is: http://samate.nist.gov
 */

/*
 * This code implements an OS Command Injection CWE-78 vulnerability.
 * http://cwe.mitre.org
 * It tries to execute a system command which is read in the inputBuffer
 * without validation.
 */

// From NIST SARD at https://samate.nist.gov/SARD/test-cases/2084/versions/1.0.0

import java.io.*;
import java.util.logging.Logger;

public class OSCommandInjection_078
{
	public OSCommandInjection_078()
	{
		byte inputBuffer[] = new byte[ 128 ];
		try
		{
			// Read data from the standard input
			int byteCount = System.in.read( inputBuffer );

			// Check whether data has been read or not
			if( byteCount <= 0 )
			{
				return;
			}

			// Turn data into a String and try to execute it as
			// a system command
			String file = new String( inputBuffer );

			// BUG
			Process p = Runtime.getRuntime().exec( "ls " + file );
			// The string file is not validated before the execution

		}
		catch( IOException e )
		{
			final Logger logger = Logger.getAnonymousLogger();
			String exception = "Exception " + e;
			logger.warning( exception );
		}
	}

	public static void main( String[] argv )
	{
		new OSCommandInjection_078();
	}
}

// end of OSCommandInjection_078.java
