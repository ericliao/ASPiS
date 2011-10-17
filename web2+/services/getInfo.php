<?php

require_once("../config.inc.php");
//require('FirePHPCore/fb.php');

$ruri="";
if (isset($_REQUEST['ruri'])) {
  $ruri=$_REQUEST['ruri'];
}
else
{
  $response=array('success'=> false,'errmsg'=>'Expected RODS URI not found');
  echo json_encode($response);
  exit(0);
} 

$entitlements = implode(" : ", explode(";", $_SERVER['entitlement']));

try {
    $response=array('success'=> true, 
                'que_results'=>array( 'sp'=> RODS_SVR_HOST,
                                      'idp'=> $_SERVER["Shib-Identity-Provider"],
                                      'affiliation'=> $_SERVER["affiliation"],
                                      'entitlements'=> $entitlements,
                                      'auth-ts'=> $_SERVER["Shib-Authentication-Instant"]));

    echo json_encode($response);

} catch (Exception $e) {
  //fb($e);
  $response=array('success'=> false,'errmsg'=> $e->getMessage(),'errcode'=> $e->getCode());
  echo json_encode($response);
}                                                                            

?>
