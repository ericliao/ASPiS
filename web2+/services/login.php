<?php
require_once("../config.inc.php");

session_start();

if (!isset($_SESSION['acct_manager']))
{
  $_SESSION['acct_manager']= new RODSAcctManager();
}

try 
{
    // make an iRODS account object for connection <- this uses the admin proxyuser
    $account = new RODSAccount(RODS_SVR_HOST, RODS_SVR_PORT, RODS_SVR_ADMIN_USER, NULL, RODS_SVR_ZONE);

    // get Shibboleth environment variables    
    $targetedId  = $_SERVER['persistent-id'];
    $affiliation = $_SERVER['affiliation'];
    $user_entitlement = $_SERVER['entitlement'];
    $attributes = "###".$targetedId."###".$affiliation."###".$user_entitlement."###";

    // generate an iRODS user-name based on the $targetedId
    $iRODS_username = "aspis-".md5($attributes);
    $iRODS_password = "aspis";

    // searches to see if the iRODS user exists
    $conn = RODSConnManager::getConn($account);
    $userinfo = $conn->getUserInfo($iRODS_username);
    if ($userinfo == null)
    {
        // do a generalAdmin query to add the user
        $conn->iadmin("mkuser", "", $iRODS_username);

        // do a generalAdmin query to set the obfuscated password
        $conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $iRODS_username, "password", $iRODS_password);                      
    }    

    // Check if groups with same entitlement exists, if not create groups
    $entitlements = explode(";", $_SERVER['entitlement']);    
    $que = new ProdsQuery($account);
    $groups = $que->getAllExistingGroups();    
    $result = array_diff($entitlements, $groups);
    foreach ($result as $missing_entitlement)
    {        
        // do a generalAdmin query to add non-existing group
        $conn->iadmin("mkgroup", "", $missing_entitlement);

		// add the admin user to the group
        $conn->iadmin("atg", "", $missing_entitlement, RODS_SVR_ADMIN_USER);

        // set metadata for access to group collection
        $dir_path="/$account->zone/home/".$missing_entitlement;
        $dir = new ProdsDir($account, $dir_path);
        $dir->addMeta(new RODSMeta($missing_entitlement, 'true,true,true', NULL));
    }

    // Query if user is in any existing groups
    foreach ($entitlements as $group_name)
    {
        $members = $que->getGroupMembers($group_name);
        if (!in_array($iRODS_username, $members))
        {
            // do a generalAdmin query to add user to existing group
            $conn->iadmin("atg", "", $group_name, $iRODS_username);                
        }
    }

    // disconnect
    RODSConnManager::releaseConn($conn);
    $conn->disconnect();

    // connect as the generated user
    $account = new RODSAccount(RODS_SVR_HOST, RODS_SVR_PORT, $iRODS_username, $iRODS_password, RODS_SVR_ZONE);
    $account->getUserInfo();
    $_SESSION['acct_manager']->add($account);
    
} catch (Exception $e) {
    $response=array('success'=> false,'errmsg'=> $e->getMessage(),'errcode'=> $e->getCode());
    echo json_encode($response);
}

$init_path="/$account->zone/home";
if (isset($_REQUEST['initPath'])) // if user specify the path, it needs to be checked 
{
  if ($init_path==$_REQUEST['initPath']) 
  {
    // if it's default path, no need to check
  }
  else
  {
    $dir= new ProdsDir($account, $_REQUEST['initPath']);
    if (true==$dir->exists())
      $init_path=$_REQUEST['initPath'];
  }
}
  
$que=new ProdsQuery($account);
$resources=$que->getResources();
$defaultResc=$resources[0]['name'];
if (isset($_REQUEST['default_resc']))
{
  foreach($resources as $resc)
  {
    if ($resc['name']==$_REQUEST['default_resc'])
      $defaultResc=$resc['name'];
  }
}
  
$var=array("success"=>true,"host"=>$account->host, "user"=>$account->user, "port"=>$account->port,
  "zone"=>$account->zone, "init_path"=>$init_path, 'default_resc'=>$defaultResc, 'resources'=>$resources);

echo json_encode($var);  
exit(0);

?>
