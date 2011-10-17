//  Copyright (c) 2008, Regents of the University of California
//  All rights reserved.
//
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are
//  met:
//
//    * Redistributions of source code must retain the above copyright notice,
//  this list of conditions and the following disclaimer.
//    * Redistributions in binary form must reproduce the above copyright
//  notice, this list of conditions and the following disclaimer in the
//  documentation and/or other materials provided with the distribution.
//    * Neither the name of the University of California, San Diego (UCSD) nor
//  the names of its contributors may be used to endorse or promote products
//  derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
//  IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
//  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
//  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
//  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
//  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
//  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
//  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
//  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//
//  FILE
//  IRODSException.java  -  edu.sdsc.grid.io.irods.IRODSException
//
//  CLASS HIERARCHY
//  java.lang.Object
//      |
//      +-javax.swing.JApplet;
//          |
//          +-edu.sdsc.grid.io.irods.IRODSException
//
//  PRINCIPAL AUTHOR
//  Lucas Gilbert, SDSC/UCSD
//
//
package edu.sdsc.grid.gui;

import java.io.File;
import java.net.URI;
import java.util.HashMap;
import java.util.Random;
import java.awt.Cursor;
import javax.swing.JApplet;
import javax.swing.JFileChooser;
import javax.swing.JOptionPane;
import javax.swing.UIManager;
import edu.sdsc.grid.io.FileFactory;
import edu.sdsc.grid.io.GeneralFile;
import edu.sdsc.grid.io.local.LocalFile;
import edu.sdsc.grid.io.irods.IRODSException;
import edu.sdsc.grid.io.srb.SRBException;
import java.security.AccessController;
import java.security.PrivilegedAction;
import java.io.*;
import java.net.*;
import java.security.Security;
import javax.net.ssl.*;
import java.lang.StringBuilder;

//temp
import edu.sdsc.grid.io.RemoteFileSystem;
//TODO should use remote instead.
import edu.sdsc.grid.io.irods.IRODSFileSystem;
import edu.sdsc.grid.io.irods.IRODSFile;
import edu.sdsc.grid.io.irods.IRODSAccount;
import edu.sdsc.grid.io.irods.IRODSAdmin;

import edu.sdsc.grid.io.FileFactory;
import edu.sdsc.grid.io.GeneralFile;
import edu.sdsc.grid.io.GeneralFileSystem;
import edu.sdsc.grid.io.GeneralMetaData;
import edu.sdsc.grid.io.MetaDataSet;
import edu.sdsc.grid.io.MetaDataCondition;
import edu.sdsc.grid.io.MetaDataRecordList;
import edu.sdsc.grid.io.MetaDataSelect;
import edu.sdsc.grid.io.ResourceMetaData;
import edu.sdsc.grid.io.UserMetaData;

import java.net.URI;
import java.net.URISyntaxException;

/**
 * File transfer applet for use by the iRODS browser.
 *
 * @author  Lucas Gilbert, San Diego Supercomputer Center
 * @modifier Eric Liao, Centre for e-Research at King's College London
 *
 */
public class Helper extends JApplet
{
  GeneralFile source, destination;
  JFileChooser chooser;
  
  //JOptionPane pane;
  static HashMap<String, Integer> progress;
  static HashMap<String, String> error;
  
  public Helper( ) { 
    init();
  }

  /**
   * Just switches the look&feel to SystemLookAndFeel.
   */
  public void init( )
  {
    try {
      progress = new HashMap<String, Integer>();
      error = new HashMap<String, String>();
      javax.swing.SwingUtilities.invokeLater(new Runnable() {
          public void run() {
            fakeGUI();
          }
      });

    } catch (Throwable e) {
      //Nothing happens here, low chance of failure...
      e.printStackTrace();
    }    
  }  
  public void start( ) { }
  public void stop( ) { }
  public void destroy( ) { }
  
  /**
   * Decided to not have a GUI.
   */
  private void fakeGUI( ) 
  {
    try {
      UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
    } catch (Throwable e) {
      //not that important if it fails
      e.printStackTrace();
    }    
  }
  
  /**
   * Testing, do not use.
   */
  public boolean test()
  {
    return true;
  }

  
  
//----------------------------------------------------------------------
//  Novel Methods  
//----------------------------------------------------------------------    
  /**
   * True if currently connected some filesystem.
   */
  public boolean isConnected( )
  {
    //eh...
    if (source != null && source.getFileSystem().isConnected()) 
      return true;
    if (destination != null && destination.getFileSystem().isConnected()) 
      return true;
    
    return false;
  }
  
  
  /**
   * Copies the source file/directory to the destination. 
   * If either variable is null, popup a filechooser gui for input.
   *
   * @param src a URI representing the source filepath
   * @param dest a URI representing the destination filepath
   * @return Used to identify this thread/copy
   */
  
  public String copy( final String src, final String dest )
  {
    return copy( src, dest, null, null, null, null);
  }  
    
  public String copy( final String src, final String dest, final String srcPassword, final String destPassword,
                      final String entitlement, final String user_entitlements )
  {
    return (String) AccessController.doPrivileged(
      new PrivilegedAction() {
        public Object run() {

          final String id = randomString();
          progress.put(id, new Integer(0));
          error.put(id, "");
          ( new Thread() {
            public void run() {      
             
              String user = null;
             
              try {//TODO don't catch all?
              
                chooser = new JFileChooser();
                chooser.setFileSelectionMode(JFileChooser.FILES_AND_DIRECTORIES);

                if (dest == null || dest.equals("")) {

                  System.out.println("downloading: choose dest");                            

                  int returnVal = chooser.showSaveDialog(null);  
                  if (returnVal == JFileChooser.APPROVE_OPTION) {
                    destination = new LocalFile(chooser.getSelectedFile());  
                  }
                  else {
                    return;
                  }    
                }
                else {

                  System.out.println("uploading: create dest");
                  URI destURI = new URI(dest);
                          
                  if (user == null)
                      // get user name from dest string
                      user = destURI.getUserInfo();
                  
                  if (destPassword != null) {
                    destination = FileFactory.newFile(new URI(dest), destPassword);              
                  }
                  else {
                    destination = FileFactory.newFile(new URI(dest));        
                  }
                }
               
                System.out.println("splitting string: "+src);
                String [] temp = null;
                if (src != null)
                  temp = src.split(",");
               
                if (src == null || temp.length == 0 || temp[0].equals(""))
                {
                  //choose one
                  System.out.println("uploading: copy from src");

                  chooser.setMultiSelectionEnabled(true);
                  int returnVal = chooser.showOpenDialog(null);
                  if (returnVal == JFileChooser.APPROVE_OPTION) {
                  
                    // saves Shibboleth attributes to user info for authorization
                    configureAttributes(id, user, true);
                    File[] files = chooser.getSelectedFiles();                                        
                    
                    if (files.length > 1) destination.mkdir();                                        
                    for (File file : files) {                    

                      source = new LocalFile(file);  
                      System.out.println("copy first : " + source + " to " + destination);                                            
                      source.copyTo(destination);
                     
                      // saves permissions to each file as it uploads if it is 'shared'
                      GeneralFileSystem metafileSystem = destination.getFileSystem();                      
                      StringBuilder sb = new StringBuilder(((IRODSFile)destination).getCanonicalPath());                      
                      sb.append("/");
                      sb.append(file.getName());
                      
                      if (entitlement.equals("private-data")) {
                        System.out.println("private data, no permissions set for " + sb);
                      } else {                        
                        System.out.println("setting permissions : " + entitlement + " for " + sb);
                        GeneralFile destfile = FileFactory.newFile(metafileSystem, sb.toString());
                        
                        String [] entitlement_list = null;
                        if (user_entitlements != null)
                          entitlement_list = user_entitlements.split(";");
                                                                        
                        String [] dir_path = sb.toString().split("/");                        
                        for (int i=0;i<entitlement_list.length;i++) {
                          if (entitlement_list[i].equals(entitlement) || dir_path[2].equals(entitlement_list[i])) {
                            ((IRODSFile)destfile).modifyMetaData(new String[]{ entitlement_list[i], "true,true,true" });
                          } else {
                            ((IRODSFile)destfile).modifyMetaData(new String[]{ entitlement_list[i], "false,false,false" });
                          }
                          
                        }
                        
                        // chmod the uploaded file to allow access for the same entitlement group                        
                        ((IRODSFile)destfile).changePermissions("all", entitlement, false);
                      }                    
                      
                      progress.put(source.toString(), new Integer(100));  
                    }                                        
                    
                    // clears Shibboleth attributes from user info after authorization
                    configureAttributes(id, user, false);
                    JOptionPane.showMessageDialog(null, 
                      "All uploads successfully completed.", "Upload", JOptionPane.INFORMATION_MESSAGE);
                  }
                  else {
                    return;
                  }
                }
                else {
                  //download many files to one directory
                  System.out.println("downloading: copy from src");
                                  
                  URI original = new URI(temp[0]);
                  if (user == null)
                    // get user name from src string
                    user = original.getUserInfo();
                  destination.mkdir();
                  System.out.println("user: " + user);
                                 
                  //setup the connection/first copy
                  if (srcPassword != null) {
                    source = FileFactory.newFile(original, srcPassword);
                  }
                  else {
                    source = FileFactory.newFile(original);
                  }
                  
                  // saves Shibboleth attributes to user info for authorization
                  configureAttributes(id, user, true);
                                              
                  System.out.println("copy first : " + source + " to " + destination);    
                  source.copyTo(destination);
                  
                  // TODO: add progress bar monitoring
                  progress.put(source.toString(), new Integer(100));
                 
                  //use the existing connection for other copies
                  GeneralFileSystem fileSystem = source.getFileSystem();
                  for (int i=1;i<temp.length;i++) {                        
                    if (compareURI(original,new URI(temp[i]))) {
                      source = FileFactory.newFile(fileSystem, new URI(temp[i]).getPath());
                    }
                    else {
                      //Can only use the temp password once.
                      //Just hope this one includes all the info.
                      source = FileFactory.newFile(new URI(temp[i]));
                    }
                   
                    System.out.println("copy " + i + " : " + source + " to " + destination);    
                    source.copyTo(destination);
                    progress.put(source.toString(), new Integer(100));
                  }

                  // clears Shibboleth attributes from user info after authorization
                  configureAttributes(id, user, false);
                  JOptionPane.showMessageDialog(null, "All downloads successfully completed.", "Download", JOptionPane.INFORMATION_MESSAGE);                      
                }
                         
              } catch (Throwable e) {                
                reportError(id, e);
                // add ierror code to convert error number?
                Throwable chain_e = e.getCause();
                JOptionPane.showMessageDialog(null, chain_e.getMessage(), "Transfer Error", JOptionPane.ERROR_MESSAGE);
                
                // clears Shibboleth attributes from user info if problem occurred
                configureAttributes(id, user, false);
              }          
            }      
          } ).start();
            return id;
        }
      }
    );    
  }
    
  private boolean compareURI( URI first, URI second )
  {
    //remove the path, compare the scheme, userinfo, host...
    boolean result =  first.toString().replaceFirst(first.getPath(),"").equals(
     second.toString().replaceFirst(second.getPath(),"") ) ? true : false;
     
    System.out.println("compareURI "+result);
    return result;
  }

  private URL resolveAbsoluteURL(String relativeUrl) throws MalformedURLException {
      String baseUrl = this.getDocumentBase().toString();
      String basePath;
      String _basePath;

      if (baseUrl.indexOf("#") != -1) { // if already refreshed
        _basePath = baseUrl.substring(0, baseUrl.indexOf("#"));
        basePath = _basePath.substring(0, _basePath.lastIndexOf("/"));
      }
      else {
        basePath = baseUrl.substring(0, baseUrl.lastIndexOf("/"));
      }  
      // absolute url = base path + relative url
      return new URL(basePath + "/" + relativeUrl);
  }  
  
  /**
   * Configures Shibboleth attributes for user authorization
   * @param user The user name
   *        set Whether to set or clear the attributes
   */
  private void configureAttributes(String id, String user, boolean set ) 
  {
      URL url;
      
      try {          
          // creates the URL to connect to      
          String data = URLEncoder.encode("user", "UTF-8") + "=" + URLEncoder.encode(user, "UTF-8");                
          if (set) {
            url = resolveAbsoluteURL("services/setAttributes.php");
          }        
          else {
            url = resolveAbsoluteURL("services/clearAttributes.php");
          }                                                  
          
          // opens the connection to the PHP and executes the script by getting the output
          URLConnection conn = url.openConnection();          
          conn.setDoOutput(true);
          OutputStreamWriter wr = new OutputStreamWriter(conn.getOutputStream());
          wr.write(data);
          wr.flush();
          
          BufferedReader rd = new BufferedReader(new InputStreamReader(conn.getInputStream()));
          String line;
          while ((line = rd.readLine()) != null) {
              System.out.println(line);                                    
          }
          
      } catch (Throwable e) {
        reportError(id, e);
      }     
  } 

  /**
   * Create a random string 
   * @param id The value returned from the copy method 
   *    to identify the copy referred.
   */
  public static int getProgress( String source )
  {
    if (source == null)
      return -1;
    //TODO progress is either 0 or 100%...
    return progress.get(source).intValue();
  }
  
  /**
   * Get error message, if an error occured. 
   * @param id The value returned from the copy method 
   *    to identify the copy referred.
   */
  public static String getError( String id )
  {
    if (id == null)
      return "error, invalid id.";
    
    return error.get(id).toString();
  }
  
  /**
   * Cancel a copy in progress (may not be possible)
   * @param id The value returned from the copy method 
   *    to identify the copy referred.
   */
  /*TODO public*/ int cancel( String source )
  {
    if (source == null)
      return -1;
    
    //TODO  copy thread can't be anon. 
    return 0;
  }
  
  /**
   * Create a random string.
   */
  private static final String randomString( )
  {
    Random r = new Random();
    //eh, probably long enough
    return Long.toString(Math.abs(r.nextLong()), 36);
  }
  
  /**
   * Store the error message for retrieval
   * @param id The value returned from the copy method 
   *    to identify the copy referred.
   */
  private void reportError( String id, Throwable e )
  {
    e.printStackTrace();
    
    String temp = e.getClass()+" : "+e.getMessage();
    //TODO ugh, to both
    if (e instanceof IRODSException)
      progress.put(id, ((IRODSException)e).getType());
    else if (e instanceof SRBException) {
      progress.put(id, ((SRBException)e).getType());
    }
    else {
      progress.put(id, -1); 
    }
    
    Throwable chain = e.getCause();
    while (chain != null) {
      temp += "\n"+e.getClass()+" : "+chain.getMessage();
      chain = chain.getCause();
    }
    error.put(id, temp);
  }
  
  /**
   * @param args the command line arguments
   */
  public static void main( String[] args )
  {
    try {
      Helper help = new Helper();
      help.init();
      String temp;
      if (args != null && args.length > 0) {
        if (args.length > 2 || args[0].equals("-h") || args[0].equals("--help")) 
        {
          System.out.println("Usage: java Helper");
          System.out.println("Usage: java Helper sourceURI");
          System.out.println("Usage: java Helper sourceURI destinationURI");
          System.out.println("Usage: java Helper null destinationURI");          
          return;
        }
        
        if (args[0].equals("null")) {
            args[0] = null;
        }
        
        if (args.length > 1) {          
          temp = help.copy(args[0],args[1]);
        }
        else {      
          temp = help.copy(args[0],null);
        }
      }
      else {
        temp = help.copy(null,null);
      }
      do {
        Thread.sleep(1000);
        System.out.println("Progress: "+getProgress(temp));
        System.out.println("Error: "+getError(temp));
      } while (getProgress(temp) == 0);  
    } catch (Throwable e) {
      e.printStackTrace();
    }
  } 
}

