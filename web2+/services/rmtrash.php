<?php
require_once("../config.inc.php");
session_start();
if (!isset($_SESSION['acct_manager']))
  $_SESSION['acct_manager']= new RODSAcctManager();

$ruri="";
if (isset($_REQUEST['ruri']))
  $ruri=$_REQUEST['ruri'];
else
{
  exitWithJsonError('Expected RODS URI not found', RBERR_EXPECTED_INPUT_PARAM_MISSING);
}

session_start();
if (!isset($_SESSION['acct_manager']))
  $_SESSION['acct_manager']= new RODSAcctManager();
  
$ruri=(isset($_REQUEST['ruri']))?$_REQUEST['ruri']:'/';
$collection=ProdsDir::fromURI($ruri, false);

if (empty($collection->account->pass))
{
  $acct=$_SESSION['acct_manager']->findAcct($collection->account);
  if (empty($acct))
  {
    $arr=array();
    $arr['success']=false;
    
    $arr['errors']=array();
    $arr['errmsg']="Please sign-on to access this collection/file";
    $arr['errcode']=RODSException::rodsErrAbbrToCode("USER_AUTH_STRING_EMPTY");
    
    $str= json_encode($arr);
    echo "($str)";
    exit (0);
  }
  $collection->account=$acct;
}
 
$force_delete=false;
if (isset($_REQUEST['force']))
  $force_delete=$_REQUEST['force'];    
  
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

  // get all child directories + files and force remove
  $dir_options = array();
  $dir_options['descendantOnly'] = true;
  $dir_options['recursive'] = false;    
  $childdirs = $collection->getChildDirs($dir_options);
  
  $proxy_conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $collection->account->user, 
                      "info", encode_attributes(ENCRYPT_KEY, $attributes));
  
  $additional_options=array();
  array_push($additional_options,array('irodsRmTrash',''));
  
  foreach ($childdirs as $childdir)
  {    
    $childdir->rmdir(true, true, $additional_options);    
  }  
  
  $file_options = array();
  $file_options['descendantOnly'] = true;
  $file_options['recursive'] = false;
  $file_options['logicalFile'] = false;
  $childfiles=$collection->getChildFiles($file_options);
  
  foreach ($childfiles as $childfile)
  {   
    $childfile->unlink(NULL, true);    
  }
    
  $proxy_conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $collection->account->user, "info", "");
  RODSConnManager::releaseConn($proxy_conn);
  $proxy_conn->disconnect();
  
  $response=array('success'=> true,'log'=>"trash cleared!");
  echo json_encode($response);
  
} catch (Exception $e) {
  exitWithException($e);  
}

  
?>
