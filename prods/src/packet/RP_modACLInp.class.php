<?php

require_once(dirname(__FILE__)."/../autoload.inc.php");
class RP_modACLInp extends RODSPacket
{
  public function __construct($filename="", $permission="", $user="", $recursive="")
  {
    $packlets=array("recursiveFlag" => intval($recursive),
                    "accessLevel" => $permission,
                    "userName" => $user,
                    "zone" => "",
                    "path" => $filename
                    );  
    parent::__construct("modAccessControlInp_PI", $packlets);
  }     
}

/*
void chmod( IRODSFile file, String permission, String user,
    boolean recursive )
    throws IOException
  {
    Tag message = new Tag(modAccessControlInp_PI, new Tag[]{
        new Tag(recursiveFlag, recursive? 1:0),
        new Tag(accessLevel, permission),
        new Tag(userName, user),
        new Tag(zone, ""),
        new Tag(path, file.getAbsolutePath()),
    } );

    irodsFunction( RODS_API_REQ, message, MOD_ACCESS_CONTROL_AN );
  }
  
                <col width=350px> 43.75%
                <col width=200px> 25%
                <col width=150px> 18.75%
                <col width=100px> 12.5%

  
*/
