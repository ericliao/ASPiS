<?php
require_once("../config.inc.php");
session_start();
if (!isset($_SESSION['acct_manager']))
  $_SESSION['acct_manager']= new RODSAcctManager();

$files=array();
$dirs=array();
if (isset($_REQUEST['files']))
  $files=$_REQUEST['files'];
if (isset($_REQUEST['dirs']))
  $dirs=$_REQUEST['dirs'];

if ( (empty($files))&&(empty($dirs)) )
{
  exitWithJsonError('No files or collections specified', RBERR_EXPECTED_INPUT_PARAM_MISSING);
}  

$force_delete=false;
if (isset($_REQUEST['force']))
  $force_delete=$_REQUEST['force'];
  
$additional_options=array();
if (isset($_REQUEST['rmtrash']))
{
  $rmtrash=true;
  array_push($additional_options,array('irodsRmTrash',''));
}
  
try {

  // make an iRODS account object for connection <- this uses the admin proxyuser
  $proxy_account = new RODSAccount(RODS_SVR_HOST, RODS_SVR_PORT, RODS_SVR_ADMIN_USER, NULL, RODS_SVR_ZONE);

  // get Shibboleth environment variables    
  $targetedId  = $_SERVER['persistent-id'];
  $affiliation = $_SERVER['affiliation'];
  $user_entitlement = $_SERVER['entitlement'];
  $attributes = "###".$targetedId."###".$affiliation."###".$user_entitlement."###";
  
  // save obfuscated attributes into user_info for each file/dir to be deleted
  $proxy_conn = RODSConnManager::getConn($proxy_account);

  $num_files=0;
  foreach ($files as $fileuri)
  {
    if (strlen($fileuri)>0)
    {
      $myfile=ruri2ProdsFile($fileuri);
      $proxy_conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $myfile->account->user, "info", encode_attributes(ENCRYPT_KEY, $attributes));                          
      $myfile->unlink(NULL, $force_delete);
      $proxy_conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $myfile->account->user, "info", "");      
      $num_files++;      
    }
  }
  
  $num_dirs=0;
  foreach ($dirs as $diruri)
  {
    if (strlen($diruri)>0)
    {
      $mydir=ruri2ProdsDir($diruri);
      $proxy_conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $mydir->account->user, "info", encode_attributes(ENCRYPT_KEY, $attributes));
      $mydir->rmdir(true, $force_delete, $additional_options);
      $proxy_conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $mydir->account->user, "info", "");      
      $num_dirs++;
    }
  }
  
  RODSConnManager::releaseConn($proxy_conn);
  $proxy_conn->disconnect();
  
  $response=array('success'=> true,'log'=>"$num_files files and $num_dirs collections deleted!");
  echo json_encode($response);
  
} catch (Exception $e) {
  exitWithException($e);  
}

  
?>
