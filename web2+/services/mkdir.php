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

$name='';
if (isset($_REQUEST['name']))
  $name=$_REQUEST['name'];
if (empty($name))
{
  exitWithJsonError('New collection name not specified', RBERR_EXPECTED_INPUT_PARAM_MISSING);
}  

// get user choice of entitlement
$entitlement='';
if (isset($_REQUEST['entitlement']))
  $entitlement=$_REQUEST['entitlement'];
if (empty($entitlement))
{
  exitWithJsonError('Entitlement not specified', RBERR_EXPECTED_INPUT_PARAM_MISSING);  
}

try {
  
  // if in /zone/home directory set the correct URI for directory creation
  $path = $ruri;
  if (0!=strncmp($path,"irods://",7))
    $path = "irods://".$path;
  $url = parse_url($path);
  $dir_path = explode('/', $url['path']);
  if (count($dir_path) == 3 && $dir_path[2] == "home")  
  {
    if ($entitlement != "private-collection")
      $ruri = $ruri."/".$entitlement;
  }
  
  $parent=ProdsDir::fromURI($ruri, false);
  if (empty($parent->account->pass))
  {
    $acct=$_SESSION['acct_manager']->findAcct($parent->account);
    if (empty($acct))
    {
      exitWithJsonError('Authentication Required', RBERR_AUTH_STRING_NOT_FOUND);
    }
    $parent->account=$acct;
  }
  if (empty($parent->account->zone))
  {
    $parent->account->getUserInfo();
  }    
  
  // make an iRODS account object for connection <- this uses the admin proxyuser
  $proxy_account = new RODSAccount(RODS_SVR_HOST, RODS_SVR_PORT, RODS_SVR_ADMIN_USER, NULL, RODS_SVR_ZONE);

  // get Shibboleth environment variables    
  $attributes = "###".$_SERVER['persistent-id']."###".$_SERVER['affiliation']."###".$_SERVER['entitlement']."###";
  
  // get user entitlements
  $user_entitlements = explode(";", $_SERVER['entitlement']);
  
  // save obfuscated attributes into user_info
  $proxy_conn = RODSConnManager::getConn($proxy_account);  
  $proxy_conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $parent->account->user, "info", encode_attributes(ENCRYPT_KEY, $attributes));

  // makes the new collection + uses the save user_info for authorization
  $newdir = $parent->mkdir($name);
  
  // do chmod to add permission to entitlement group
  if ($entitlement != "private-collection")
    $newdir->chmod($parent->path_str.'/'.$name, 'write', $entitlement, 0);

  // deletes the affiliation + entitlement details from user info
  $proxy_conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $parent->account->user, "info", "");
  RODSConnManager::releaseConn($proxy_conn);
  $proxy_conn->disconnect();
  
  // add entitlement to read/update/delete permissions
  if ($entitlement != "private-collection")
  {
      foreach ($user_entitlements as $ent)
      {
          if ($ent == $entitlement || $ent == $dir_path[3])
              $newdir->addMeta(new RODSMeta($ent, 'true,true,true', NULL));
          else
              $newdir->addMeta(new RODSMeta($ent, 'false,false,false', NULL));
      }   
  }
  
  $count = 0;
  if (NULL == $newdir->getStats())
    exitWithJsonError("Collection '$name' created, but could not be found under: ".$parent->getPath(), 
      RBERR_GENERAL);
  
  $response = array('success'=> true,'log'=>'new collection created!', 
    'que_results' => array(dir2array($newdir)));
  echo json_encode($response);
  
} catch (Exception $e) {
  exitWithException($e);  
}

  
?>
