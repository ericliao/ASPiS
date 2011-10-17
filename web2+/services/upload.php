<?php
require_once("../config.inc.php");
session_start();
if (!isset($_SESSION['acct_manager']))
  $_SESSION['acct_manager']= new RODSAcctManager();

$upload_error_msg=array(
        0=>"There is no error, the file uploaded with success",
        1=>"The uploaded file exceeds the upload_max_filesize directive (".ini_get("upload_max_filesize").") in php.ini",
        2=>"The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form",
        3=>"The uploaded file was only partially uploaded",
        4=>"No file was uploaded",
        6=>"Missing a temporary folder",
        7=>"Failed to write file to disk.",
        8=>"File upload stopped by extension."
);

/*
$data .= '<br>' . date('Y-m-d H:i:s') . '$_FILES<pre>' . print_r($_FILES, true) . "</pre>";
$data .= '<br>' . date('Y-m-d H:i:s') . '$_POST<pre>' . print_r($_POST, true) . "</pre>";

$fp = fopen(date('Y-m-d') .".txt", "a");
fwrite($fp, $data);
fclose($fp);
*/

$ruri="";
if (isset($_REQUEST['ruri']))
  $ruri=$_REQUEST['ruri'];
else
{
  $response=array('success'=> false,'errmsg'=>'Expected RODS URI not found');
  echo json_encode($response);
  exit(0);
} 

$resource="";
if (isset($_REQUEST['resource']))
  $resource=$_REQUEST['resource'];
else
{
  $response=array('success'=> false,'errmsg'=>'Resource not set');
  echo json_encode($response);
  exit(0);
}

// get user choice of entitlement
$entitlement='';
if (isset($_REQUEST['entitlement']))
  $entitlement=$_REQUEST['entitlement'];
if (empty($entitlement))
{
  $response=array('success'=> false,'log'=>'Entitlement not specified');
  echo json_encode($response);
  exit(0);
}   

// if in home directory set the correct URI for file upload
// if in /zone/home directory set the correct URI for directory creation
$path = $ruri;
if (0!=strncmp($path,"irods://",7))
  $path = "irods://".$path;
$url = parse_url($path);
$dir_path = explode('/', $url['path']);
if (count($dir_path) < 3)  
{
  if ($entitlement != "private-data")
    $ruri = $ruri."/home/".$entitlement;
}
else if (count($dir_path) == 3 && $dir_path[2] == "home")
{
  if ($entitlement != "private-data")
    $ruri = $ruri."/".$entitlement;
}

$collection=ProdsDir::fromURI($ruri, false);
if (empty($collection->account->pass))
{
  $acct=$_SESSION['acct_manager']->findAcct($collection->account);
  if (empty($acct))
  {
    $response=array('success'=> false,'errmsg'=>'Authentication Required');
    echo json_encode($response);
    exit(0);
  }
  $collection->account=$acct;
}
if (empty($collection->account->zone))
{
  $collection->account->getUserInfo();
}  

$response=array('success'=> false,'errmsg'=>'Unknow errors', 'errcode'=>-1);
$error=false;
$filelist=array();
$numfiles=0;

try {
  foreach($_FILES as $srcfile)
  {
    $filename=($srcfile['name']);
    if (empty($filename))  
      continue;
    
    if ($srcfile['error']!=UPLOAD_ERR_OK)
    {
      if (isset($upload_error_msg[$srcfile['error']]))
       $response=array('success'=> false,'errmsg'=>$upload_error_msg[$srcfile['error']],'errcode'=>$srcfile['error']);
      else 
       $response=array('success'=> false,'errmsg'=>'Unknow errors', 'errcode'=>$srcfile['error']);
      $error=true;
      break;
    }    
    
    $tempuploadfilepath=tempnam(dirname($srcfile['tmp_name']),'RODS_Web_Upload');
    move_uploaded_file($srcfile['tmp_name'], $tempuploadfilepath);
    
    // make an iRODS account object for connection <- this uses the admin proxyuser
    $proxy_account = new RODSAccount(RODS_SVR_HOST, RODS_SVR_PORT, RODS_SVR_ADMIN_USER, NULL, RODS_SVR_ZONE);

    // get Shibboleth environment variables    
    $attributes = "###".$_SERVER['persistent-id']."###".$_SERVER['affiliation']."###".$_SERVER['entitlement']."###";
    
    // get user entitlements
    $user_entitlements = explode(";", $_SERVER['entitlement']);
    
    // save obfuscated attributes into user_info
    $proxy_conn = RODSConnManager::getConn($proxy_account);  
    $proxy_conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $collection->account->user, "info", encode_attributes(ENCRYPT_KEY, $attributes));
    
    //copy($srcfile['tmp_name'], $srcfile['name']);
    $destfile=new ProdsFile($collection->account, $collection->path_str."/".$filename);
    /*
    $response=array('success'=> false,'log'=> ''.$collection->account); 
    echo json_encode($response);
    exit(0); 
    */
    $destfile->open('w',$resource);
    $destfile->write(file_get_contents($tempuploadfilepath));
    $destfile->close();    

    // deletes the affiliation + entitlement details from user info
    $proxy_conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $collection->account->user, "info", "");
    RODSConnManager::releaseConn($proxy_conn);
    $proxy_conn->disconnect();
    
    // add entitlement to read/update/delete permissions
    if ($entitlement != "private-data")
    {
        foreach ($user_entitlements as $ent)
        {
            if ($ent == $entitlement || $ent == $dir_path[3])
                $destfile->addMeta(new RODSMeta($ent, 'true,true,true', NULL));
            else
                $destfile->addMeta(new RODSMeta($ent, 'false,false,false', NULL));
        }
        $destfile->chmod($collection->path_str."/".$filename, 'own', $entitlement, 0);   
    }
	if (AUTO_EXTRACT_EXIF === true)
    	extractExif($tempuploadfilepath,$destfile);
    $numfiles++; 
    unlink($tempuploadfilepath); 
  }
  
  if ($error===false)
  {
    $response=array('success'=> true,'msg'=>"Uploaded file successfully.");
  }
  
  echo json_encode($response);
} catch (Exception $e) {
  $response=array('success'=> false, 'errmsg'=> $e->getMessage(), 'errcode'=>$e->getCode());
  echo json_encode($response);
}
?>
