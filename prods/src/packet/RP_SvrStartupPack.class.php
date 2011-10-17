<?php

require_once(dirname(__FILE__)."/../autoload.inc.php");
class RP_SvrStartupPack extends RODSPacket
{
  public function __construct($user="",$zone="",$relVersion=RODS_REL_VERSION, 
    $apiVersion=RODS_API_VERSION,$option=NULL)
  {
    $packlets=array("irodsProt" => 1, "connectCnt" => 0, 
      "proxyUser" => RODS_SVR_ADMIN_USER, "proxyRcatZone" => $zone, "clientUser" => $user,
      "clientRcatZone" => $zone, "relVersion" => $relVersion,
      "apiVersion" => $apiVersion, "option" => $option );  
    parent::__construct("StartupPack_PI",$packlets);
  }
     
}
?>
