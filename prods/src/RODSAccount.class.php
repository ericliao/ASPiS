<?php
 /**#@+
 * Constants
 *
 * TODO: extend this to add authScheme <- but would need to change the other classes?
 */
/**
 * Maximum lengh of password string. Only up to this lengh of password are submitted to RODS server.
 */
define("MAX_PASSWORD_LEN",50);
/**#@-*/

require_once("autoload.inc.php");

class RODSAccount
{
 /**#@+
  * @var string 
  */
  public $user;
  public $pass;
  public $host;
  public $port;
  public $zone; 
  public $default_resc;  
  /**#@-*/
  
  public function __construct($host, $port, $user, $pass, $zone="", 
    $default_resc="")
  {
    $this->host=$host;
    $this->port=$port;
    $this->user=$user;
    $this->pass=$pass;
    $this->zone=$zone;
    $this->default_resc=$default_resc;
  }
  
 /**
	* Create a RODSAccount object from URI string.
	* @param string $uri 
	* @return a new RODSAccount object
	*/
  public static function fromURI($uri)
  {
    $url=parse_url($uri);
    
    $host=isset($url['host'])?$url['host']:''; 
    $port=isset($url['port'])?$url['port']:'';   
    
    $user='';
    $zone='';
    if (isset($url['user']))
    {
      if (strstr($url['user'],".")!==false)
        list($user,$zone)=@explode(".",$url['user']);
      else
        $user=$url['user'];
    }  
    
    $pass=isset($url['pass'])?$url['pass']:'';
    
    return (new RODSAccount($host, $port, $user, $pass, $zone));
  }
  
  public function equals(RODSAccount $other)
  {
    if (!isset($other))
      return false;
    
    if ( ($this->host==$other->host)&&
             ($this->port==$other->port)&&
             ($this->user==$other->user)
       )
    {
      $ret_val= true;
    }
    else
      $ret_val= false;
       
    //echo ( "$this->host,$this->port,$this->user vs. $other->host,$other->port,$other->user = $ret_val");
    //flush();
    return  $ret_val;      
  }
  
  public function getSignature()
  {
    return (bin2hex(md5( "$this->user.$this->zone:this->pass@$this->host:$this->port", TRUE )));  
  }
  
  public function __toString()
  {
    return "$this->user.$this->zone:(password hidden)@$this->host:$this->port";
  }
  
  public function toURI()
  {
    return ( $this->user.
           (empty($this->zone)?'':'.'.$this->zone).
           "@".$this->host.":".$this->port );    
  }
  
 /**
  * Get user information
  * @param string username, if not specified, it will use current username instead
  * @return array with fields: id, name, type, zone, dn, info, comment, ctime, mtime. If user not found return empty array. 
  */
  public function getUserInfo($username=NULL)
  {
    $conn = RODSConnManager::getConn($this);
    $userinfo= $conn -> getUserInfo ($username);
    RODSConnManager::releaseConn($conn);
    if ( (!empty($userinfo))&&(!empty($userinfo['zone'])) )
      $this->zone=$userinfo['zone'];
    return $userinfo;   
  }
  
  /**
  * Get a temp password for current user
  * @return string of temp password
  */
  public function getTempPassword()
  {
    $conn = RODSConnManager::getConn($this);
    $temppass= $conn -> getTempPassword ();
    RODSConnManager::releaseConn($conn);
    return $temppass;   
  }
   
 /**
  * Get project home directory
  * @return ProdsDir home directory
  */
  public function getProjectHomeDir()
  {
    if (empty($this->zone))
      $this->getUserInfo();
    return new ProdsDir($this, "/$this->zone/home");
  }
  
 /**
  * Get project home directory URI
  * @return String Project's home URI
  */
  public function getProjectHomeDirURI()
  {
    $dir= $this->getProjectHomeDir();
    return $dir->toURI();
  }
  
  /**
  * Get user's home directory
  * @param string init_path, if specified, it will overwrite the default path 
  * @return ProdsDir User's home directory
  */
  public function getUserHomeDir($init_path=NULL)
  {
    if (empty($this->zone))
      $this->getUserInfo();
    if (isset($init_path))
    {
      $dir= new ProdsDir($this, $init_path);
      if ($dir->exists())
      {
        return $dir;
      }
    }
    return new ProdsDir($this, "/$this->zone/home/$this->user");
  }
  
 /**
  * Get user's home directory URI
  * @param string init_path, if specified, it will overwrite the default path 
  * @return String User's home
  */
  public function getUserHomeDirURI($init_path=NULL)
  {
    $dir= $this->getUserHomeDir($init_path);
    return $dir->toURI();
  }
  
 /**
  * Get user's trash directory
  * @return ProdsDir User's trash dir
  */
  public function getUserTrashDir()
  {
    if (empty($this->zone))
      $this->getUserInfo();
    return new ProdsDir($this, "/$this->zone/trash/home/$this->user");
  }
  
 /**
  * Get user's trash directory URI
  * @return String User's trash URI
  */
  public function getUserTrashDirURI()
  {
    $dir= $this->getUserTrashDir();
    return $dir->toURI();
  }
}
