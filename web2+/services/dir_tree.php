<?php

require_once("../config.inc.php");
require_once(PRODS_INC_PATH);

session_start();
if (!isset($_SESSION['acct_manager']))
  $_SESSION['acct_manager']= new RODSAcctManager();

try {

    $ruri=(isset($_REQUEST['ruri']))?$_REQUEST['ruri']:'/';
    $ruri="rods://".$ruri;
    $collection=ProdsDir::fromURI($ruri, false);
    if (empty($collection->account->pass))
    {
      $acct=$_SESSION['acct_manager']->findAcct($collection->account);
      if (empty($acct))
      {
        $arr=array();
        $arr['success']=false;
        $arr['errmsg']="You don't have permission for this directory (".$ruri.")! Please sign-on";
        $arr['errcode']=-99;
        $str= json_encode($arr);
        echo "($str)";
        exit (0);
      }
      $collection->account=$acct;
    }  

    if (!$collection->exists())
    {
      $arr=array();
      $arr['success']=false;
      $arr['errmsg']="collection does not exists: ".$collection->path_str;
      $arr['errcode']=$GLOBALS['PRODS_ERR_CODES']['PERR_PATH_DOES_NOT_EXISTS'];
      $str= json_encode($arr);
      echo "($str)";
      exit (0);  
    }

    $start=(isset($_REQUEST['start']))?$_REQUEST['start']:0;
    $limit=(isset($_REQUEST['limit']))?$_REQUEST['limit']:500;

    listChildDirJson($collection,$start,$limit);
    
} catch (RODSException $e) {
    $arr=array();
    $arr['success']=false;
    $arr['errmsg']=$e->getMessage();
    $arr['errcode']=$e->getCode();
    $str= json_encode($arr);
    echo "($str)";
}

function listChildDirJson($dir,$start,$limit)
{
  $arr=array();
  $arr['children']=array();
  $total=0;  
  
  // get user's Shibboleth entitlement array
  $entitlements = explode(";", $_SERVER['entitlement']);  

  $dir_options = array();
  $dir_options['descendantOnly'] = true;
  $dir_options['recursive'] = false;  

  //$childdirs=$dir->getChildDirs(array(),$start,$limit,$total);
  $childdirs = $dir->getChildDirs($dir_options);
  
  // filter to only display directories the user has entitlement for
  // compares the entitlement with stored 'read' metadata
  // TODO: what about trash?
  foreach ($childdirs as $childdir) {
    $childstats = array();
    $dir_path = explode('/', $childdir->getPath());
    //echo json_encode($childdir->getPath());
    
    // add specific directories to the display
    if (count($dir_path) < 4) {
        $childstats['id'] = $childdir->toURI();
        $childstats['text'] = $childdir->getName();
        $childstats['leaf'] = false;
        $childstats['cls'] = 'folder';   
        $childstats['name'] = $childdir->getName();       
        $arr['children'][] = $childstats;                            
    }
    else if (count($dir_path) == 4 && $dir_path[3] == "home" || $dir_path[3] == $dir->account->user) {
        $childstats['id'] = $childdir->toURI();
        $childstats['text'] = $childdir->getName();
        $childstats['leaf'] = false;
        $childstats['cls'] = 'folder';   
        $childstats['name'] = $childdir->getName();       
        $arr['children'][] = $childstats;
    }
    else if (count($dir_path) >= 5 && $dir_path[3] == "home" && $dir_path[4] == $dir->account->user) {
        $childstats['id'] = $childdir->toURI();
        $childstats['text'] = $childdir->getName();
        $childstats['leaf'] = false;
        $childstats['cls'] = 'folder';   
        $childstats['name'] = $childdir->getName();       
        $arr['children'][] = $childstats;
    }
    // filter the remainder
    else if ((count($dir_path) >= 4) && ($dir_path[2] == "home")) {
        //echo json_encode($dir_path);
        $meta_array = $childdir->getMeta();
        foreach ($meta_array as $meta)
        {                          
            foreach ($entitlements as $filter)
            {
                if ($meta->name == $filter)
                {
                    $perms = explode(",", $meta->value);					
                    if ($perms[0] == 'true')
                    {
                        $childstats['id'] = $childdir->toURI();                        
                        $childstats['text'] = $childdir->getName();
                        $childstats['leaf'] = false;
                        $childstats['cls'] = 'folder';
                        $childstats['name'] = $childdir->getName();
                        $arr['children'][] = $childstats;
                    }
                }
            }
        }        
    }
    else if ((count($dir_path) >= 5) && ($dir_path[3] == "home")) {
        // filter
        $meta_array = $childdir->getMeta();
        foreach ($meta_array as $meta)
        {                          
            foreach ($entitlements as $filter)
            {
                if ($meta->name == $filter)
                {
                    $perms = explode(",", $meta->value);
                    if ($perms[0] == 'true')
                    {
                        $childstats['id'] = $childdir->toURI();                        
                        $childstats['text'] = $childdir->getName();
                        $childstats['leaf'] = false;
                        $childstats['cls'] = 'folder';
                        $childstats['name'] = $childdir->getName();
                        $arr['children'][] = $childstats;
                    }
                }
            }
        }        
    }
     
  }
  
  $arr['success']=true;
  $arr['total_count']=$total;
    
  $str= json_encode($arr);
  echo "($str)";

}

function print_r_html($data,$return_data=false)
{
    $data = print_r($data,true);
    $data = str_replace( " ","&nbsp;", $data);  
    $data = str_replace( "\r\n","<br>\r\n", $data);
    $data = str_replace( "\r","<br>\r", $data);
    $data = str_replace( "\n","<br>\n", $data);

    if (!$return_data)
        echo $data;   
    else
        return $data;
}


class ProdsDirTreeNode  
{
  public $dir;
  public $children;
  
  public function __construct(ProdsDir $dir)
  {
    $this->dir=$dir;
    $this->children=array();
  }
  
  
  public function expandChildDir($path_str)
  {
    $children_prods_dirs=$this->dir->getChildDirs();
    foreach($children_prods_dirs as  $children_prods_dir)
    {
      $this->children[]=new ProdsDirTreeNode($children_prods_dir);
    }
      
    if ($this->dir->path_str==$path_str) 
      return;
    
    foreach($this->children as $child_node)
    {
      if (0==strncmp($child_node->dir->path_str,$path_str,
        strlen($child_node->dir->path_str)))
      {
        $child_node->expandChildDir($path_str);
      }
    }
  }
  
  public function toArray()
  {
    $ret_val=array();
    $ret_val['id']=$this->dir->toURI();;
    $ret_val['text']=$this->dir->getName();
    $ret_val['leaf']=false;
    $ret_val['cls']='folder';
    $ret_val['name']=$this->dir->getName();
    $ret_val['childNodes']=array();
    foreach($this->children as $child)
    {
      $ret_val['childNodes'][]=$child->toArray();
    }
    return $ret_val;
  }
}

?>  
