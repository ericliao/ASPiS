<?php
require_once("../config.inc.php");

// set session id if its specified
$sid='';
if (isset($_REQUEST['SID']))
  $sid=$_REQUEST['SID'];
else
if (isset($_REQUEST['sid']))
  $sid=$_REQUEST['sid'];  
if (!empty($sid))
  session_id($sid);

session_start();
if (!isset($_SESSION['acct_manager']))
  $_SESSION['acct_manager']= new RODSAcctManager();

$ruri="";
if (isset($_REQUEST['ruri']))
  $ruri=$_REQUEST['ruri'];
else
{
  $response=array('success'=> false,'error'=>'required RODS URI not found');
  echo json_encode($response);
  exit(0);
}    

// get user choice of entitlement
$entitlement="";
if (isset($_REQUEST['entitlement']))
  $entitlement=$_REQUEST['entitlement'];
if (empty($entitlement))
{
  $response=array('success'=> false,'log'=>'Entitlement not specified');
  echo json_encode($response);
  exit(0);
}  

$resource="";
if (isset($_REQUEST['resource']))
  $resource=$_REQUEST['resource'];
if (empty($resource))
{
  $response=array('success'=> false,'error'=>'Resource not specified');
  echo json_encode($response);
  exit(0);
}

// if in home directory set the correct URI for file upload
$path = $ruri;
if (0!=strncmp($path,"irods://",7))
    $path = "irods://".$path;
$url = parse_url($path);
$file_path = explode('/', $url['path']);
if (count($file_path) == 3 && $file_path[2] == "home" && $entitlement != "ignoreMe")
    $ruri = $ruri."/".$entitlement;

// get Shibboleth environment variables    
$targetedId  = $_SERVER['persistent-id'];
$affiliation = $_SERVER['affiliation'];
$user_entitlement = $_SERVER['entitlement'];
$attributes = "###".$targetedId."###".$affiliation."###".$user_entitlement."###";

$account=RODSAccount::fromURI($ruri, false);
if (empty($account->pass))
{
  $acct=$_SESSION['acct_manager']->findAcct($account);
  if (empty($acct))
  {
    $response=array('success'=> false,'error'=>'Authentication Required');
    echo json_encode($response);
    exit(0);
  }
  $account=$acct;
}  
try {
$temppass=$account->getTempPassword();
$response=array('success'=> true,'temppass'=>$temppass, 
                'que_results'=>array('ruri'=> $ruri, 'temppass'=>$temppass,
                                     'entitlement'=>$entitlement, 'user_entitlements'=>$user_entitlement, 'attributes'=>$attributes, 'resource'=>$resource));
echo json_encode($response);

} catch (Exception $e) {
  $response=array('success'=> false,'errmsg'=> $e->getMessage(),'errcode'=> $e->getCode());
  echo json_encode($response);
}
?>
