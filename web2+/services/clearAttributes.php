<?php
require_once("../config.inc.php");

$user="";
if (isset($_REQUEST['user']))
    $user=$_REQUEST['user'];
else
{
    exitWithJsonError('Expected RODS user name not found', RBERR_EXPECTED_INPUT_PARAM_MISSING);
} 

try {

    // remove zone from username
    $user_cleaned = str_ireplace(".".RODS_SVR_ZONE, "", $user);

    // make an iRODS account object for connection <- this uses the admin proxyuser
    $proxy_account = new RODSAccount(RODS_SVR_HOST, RODS_SVR_PORT, RODS_SVR_ADMIN_USER, NULL, RODS_SVR_ZONE);

    // clear attributes from user_info
    $proxy_conn = RODSConnManager::getConn($proxy_account);
    $proxy_conn->iadmin("moduser", RODS_SVR_ADMIN_PASSWORD, $user_cleaned, "info", "");
    RODSConnManager::releaseConn($proxy_conn);
    $proxy_conn->disconnect();

    $response = array('attributes cleared'=> true);
    echo json_encode($response);

} catch (Exception $e) {
    $response = array('attributes set'=> false,'errmsg'=> $e->getMessage(),'errcode'=> $e->getCode());
    echo json_encode($response);
}
?>
