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
  $response=array('success'=> false,'log'=>'Expected RODS URI not found');
  echo json_encode($response);
  exit(0);
} 

$resource="";
if (isset($_REQUEST['resource']))
  $resource=$_REQUEST['resource'];
else
{
  $response=array('success'=> false,'log'=>'Expected resource not found');
  echo json_encode($response);
  exit(0);
} 

$action="";
if (isset($_REQUEST['action']))
  $action=$_REQUEST['action'];
else
{
  $response=array('success'=> false,'log'=>'Expected action not found');
  echo json_encode($response);
  exit(0);
} 

try {
  $file=ProdsFile::fromURI($ruri, false);
  if (empty($file->account->pass))
  {
    $acct=$_SESSION['acct_manager']->findAcct($file->account);
    if (empty($acct))
    {
      $response=array('success'=> false,'log'=>'Authentication Required');
      echo json_encode($response);
      exit(0);
    }
    $file->account=$acct;
  }

  // make an iRODS account object for connection <- this uses the admin proxyuser
  $proxy_account = new RODSAccount(RODS_SVR_HOST, RODS_SVR_PORT, RODS_SVR_ADMIN_USER, NULL, RODS_SVR_ZONE);

  // get Shibboleth environment variables    
  $attributes = "###".$_SERVER['persistent-id']."###".$_SERVER['affiliation']."###".$_SERVER['entitlement']."###";
  
  // get user entitlements
  $user_entitlements = explode(";", $_SERVER['entitlement']);
  
  // save obfuscated attributes into user_info
  $proxy_conn = RODSConnManager::getConn($proxy_account);  
  $proxy_conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $file->account->user, "info", encode_attributes(ENCRYPT_KEY, $attributes));
  
  switch($action)
  {
    case 'add':
      $file->repl($resource,array('backupMode'=>true));
      $response=array('success'=> true,'log'=>"file replicated to resource $resource");
      break;
    
    case 'remove':
      $file->unlink($resource,true);
      $response=array('success'=> true,'log'=>"replica on resource $resource is removed");
      break;  
    
    default:
      $response=array('success'=> false,'log'=>"Action '$action' is not supported");
      break;
  }  

  // deletes the affiliation + entitlement details from user info
  $proxy_conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $file->account->user, "info", "");
  RODSConnManager::releaseConn($proxy_conn);

  echo json_encode($response);
  
} catch (Exception $e) {
  //$response=array('success'=> false,'log'=> $e->getMessage());
  /*  
  $arr=array();
  $arr['success']=false; 
  $arr['errors']=array();
  $arr['errmsg']=$e->getMessage();
  $arr['errcode']=$e->getCode();
  $str = json_encode($arr);
  echo "($str)";
  */
  //$response=array('success'=> false,'errmsg'=> $e->getMessage(),'errcode'=> $e->getCode());
  //$str = json_encode($response);
  //echo "($str)";
  exitWithException($e);
}

  
?>
