<?php
require_once("../config.inc.php");

session_start();
if (!isset($_SESSION['acct_manager']))
  $_SESSION['acct_manager']= new RODSAcctManager();
  
$ruri=(isset($_REQUEST['ruri']))?$_REQUEST['ruri']:'/';
$collection=ProdsDir::fromURI($ruri, false);

if (empty($collection->account->pass))
{
  $acct=$_SESSION['acct_manager']->findAcct($collection->account);
  if (empty($acct))
  {
    $arr=array();
    $arr['success']=false;
    
    $arr['errors']=array();
    $arr['errmsg']="Please sign-on to access this collection/file";
    $arr['errcode']=RODSException::rodsErrAbbrToCode("USER_AUTH_STRING_EMPTY");
    
    $str= json_encode($arr);
    echo "($str)";
    exit (0);
  }
  $collection->account=$acct;
}  

$start= (isset($_REQUEST['start']))?$_REQUEST['start']:0;
$limit= (isset($_REQUEST['limit']))?$_REQUEST['limit']:100;
$sort= (isset($_REQUEST['sort']))?$_REQUEST['sort']:'name';
$dir= (isset($_REQUEST['dir']))?$_REQUEST['dir']:'ASC';
if ($dir=='ASC') $dirbit=0;
else $dirbit=1;  

$orderby=array("$sort" => $dirbit);

listFileJson($collection, $start, $limit, $orderby);

function listFileJson($dir, $start=0, $limit=500, $orderby=array())
{
  $arr=array();
  $arr['totalCount']=0;
  $arr['que_results']=array();
  $arr['success']=true;
  
  try {
  
    //$dir=ProdsDir::fromURI("rods://rods.tempZone:RODS@rt.sdsc.edu:1247/tempZone/home/rods", false);
    $arr['totalCount']=0;
    
    if (!$dir->exists())
    {
        $arr=array();
        $arr['success']=false;
        $arr['errmsg']="collection does not exists: ".$dir->path_str;
        $arr['errcode']=$GLOBALS['PRODS_ERR_CODES']['PERR_PATH_DOES_NOT_EXISTS'];
        $str= json_encode($arr);
        echo "($str)";
        exit (0);  
    }
    
    // get user's Shibboleth entitlement array
    $entitlements = explode(";", $_SERVER['entitlement']);  
    
    $dir_options = array();
    $dir_options['descendantOnly'] = true;
    $dir_options['recursive'] = false;
    
    $childdirs = $dir->getChildDirs($dir_options);

    // filter the directory search outputs
    // compares the entitlement with stored 'read' metadata
    // checks to see if entitlement's readPerm is true
    $filtered = filter($dir, $childdirs, $entitlements);
    $arr['que_results'] = $filtered;
    $arr['totalCount']=$arr['totalCount']+count($filtered);
    
    $file_options = array();
    $file_options['descendantOnly'] = true;
    $file_options['recursive'] = false;
    $file_options['logicalFile'] = false;
    $file_options['metadata'] = array();
    
    // filter the file search outputs
    // compares the entitlement with stored 'read' metadata
    // checks to see if entitlement's readPerm is true   
    $childfiles=$dir->getChildFiles($file_options);
    $dir_path = explode('/', $dir->getPath());
    
    $childstats=array();
        
    foreach ($childfiles as $childfile)
    {
        if ((count($dir_path) >= 4 && $dir_path[2] == "home" && $dir_path[3] == $dir->account->user) ||
            (count($dir_path) >= 5 && $dir_path[3] == "home" && $dir_path[4] == $dir->account->user)) {
            $childstats['id']=$childfile->stats->id.'_'.$childfile->stats->rescname;
            $childstats['name']=$childfile->stats->name;
            $childstats['size']=$childfile->stats->size;
            $childstats['fmtsize']=format_size($childfile->stats->size);
            $childstats['mtime']=$childfile->stats->mtime;
            $childstats['ctime']=$childfile->stats->ctime;
            $childstats['owner']=$childfile->stats->owner;
            $childstats['rescname']=$childfile->stats->rescname;
            $childstats['typename']=$childfile->stats->typename;
            $childstats['type']=1;
            $childstats['ruri']=$childfile->toURI();
            $arr['que_results'][]=$childstats;
            $arr['totalCount']++; 
        } else {
            // filter
            $meta_array = $childfile->getMeta();
            foreach ($meta_array as $meta)
            {                          
                foreach ($entitlements as $filter)
                {
                    if ($meta->name == $filter)
                    {
                        $perms = explode(",", $meta->value);
                        if ($perms[0] == 'true')
                        {
                            $childstats['id']=$childfile->stats->id.'_'.$childfile->stats->rescname;
                            $childstats['name']=$childfile->stats->name;
                            $childstats['size']=$childfile->stats->size;
                            $childstats['fmtsize']=format_size($childfile->stats->size);
                            $childstats['mtime']=$childfile->stats->mtime;
                            $childstats['ctime']=$childfile->stats->ctime;
                            $childstats['owner']=$childfile->stats->owner;
                            $childstats['rescname']=$childfile->stats->rescname;
                            $childstats['typename']=$childfile->stats->typename;
                            $childstats['type']=1;
                            $childstats['ruri']=$childfile->toURI();
                            $arr['que_results'][]=$childstats;
                            $arr['totalCount']++;
                        }
                    }
                }
            }
        }
    }
       
    $_SESSION['acct_manager']->updateAcct($dir->account);
    $arr['que_results']=array_slice($arr['que_results'],$start,$limit);
    $str= json_encode($arr);
    echo "($str)";
  
  } catch (RODSException $e) {
    //echo ($e);
    //echo $e->showStackTrace();
    
    $arr=array();
    $arr['success']=false;
    $arr['errmsg']=$e->getCodeAbbr().":".$e->getMessage();
    $arr['errcode']=$e->getCode();
    $str= json_encode($arr);
    echo "($str)";
    exit (0);
  }
}

// filter to only display directories the user has entitlement for
// compares the entitlement with stored 'readPerm' metadata
function filter($dir, $childdirs, $filter_array)
{
    $output = array();
    foreach ($childdirs as $childdir)
    {
        $childstats = array();
        //echo json_encode($childdir->getPath());
        $dir_path = explode('/', $childdir->getPath());
        $arr=array();
        if (count($dir_path) < 4) { // below home + trash path
            // add thse to the array            
            $childstats['id']=$childdir->stats->id;
            $childstats['name']=$childdir->stats->name;
            $childstats['size']=-1;
            $childstats['fmtsize']="";
            $childstats['mtime']=$childdir->stats->mtime;
            $childstats['ctime']=$childdir->stats->ctime;
            $childstats['owner']=$childdir->stats->owner;
            $childstats['type']=0;
            $childstats['ruri']=$childdir->toURI();
            $output[] = $childstats;
        }
        else if (count($dir_path) == 4 && $dir_path[3] == "home") {
            $childstats['id']=$childdir->stats->id;
            $childstats['name']=$childdir->stats->name;
            $childstats['size']=-1;
            $childstats['fmtsize']="";
            $childstats['mtime']=$childdir->stats->mtime;
            $childstats['ctime']=$childdir->stats->ctime;
            $childstats['owner']=$childdir->stats->owner;
            $childstats['type']=0;
            $childstats['ruri']=$childdir->toURI();
            $output[] = $childstats;
        }        
        else if (count($dir_path) >= 4 && $dir_path[2] == "home") {
            if ($dir_path[3] == $dir->account->user) {
                $childstats['id']=$childdir->stats->id;
                $childstats['name']=$childdir->stats->name;
                $childstats['size']=-1;
                $childstats['fmtsize']="";
                $childstats['mtime']=$childdir->stats->mtime;
                $childstats['ctime']=$childdir->stats->ctime;
                $childstats['owner']=$childdir->stats->owner;
                $childstats['type']=0;
                $childstats['ruri']=$childdir->toURI();
                $output[] = $childstats;
            }
            else {            
                // filter
                $meta_array = $childdir->getMeta();
                foreach ($meta_array as $meta)
                {                          
                    foreach ($filter_array as $filter)
                    {                        
                        if ($meta->name == $filter)
                        {
                            $perms = explode(",", $meta->value);
                            if ($perms[0] == 'true')
                            {
                                $childstats['id']=$childdir->stats->id;
                                $childstats['name']=$childdir->stats->name;
                                $childstats['size']=-1;
                                $childstats['fmtsize']="";
                                $childstats['mtime']=$childdir->stats->mtime;
                                $childstats['ctime']=$childdir->stats->ctime;
                                $childstats['owner']=$childdir->stats->owner;
                                $childstats['type']=0;
                                $childstats['ruri']=$childdir->toURI();
                                $output[] = $childstats;
                            }
                        }
                    }
                }
            }
        }
        else if ((count($dir_path) >= 5) && ($dir_path[3] == "home")) {
            if ($dir_path[4] == $dir->account->user) {
                $childstats['id']=$childdir->stats->id;
                $childstats['name']=$childdir->stats->name;
                $childstats['size']=-1;
                $childstats['fmtsize']="";
                $childstats['mtime']=$childdir->stats->mtime;
                $childstats['ctime']=$childdir->stats->ctime;
                $childstats['owner']=$childdir->stats->owner;
                $childstats['type']=0;
                $childstats['ruri']=$childdir->toURI();
                $output[] = $childstats;
            }
            else { 
                // filter
                $meta_array = $childdir->getMeta();
                foreach ($meta_array as $meta)
                {                          
                    foreach ($filter_array as $filter)
                    {
                        if ($meta->name == $filter)
                        {
                            $perms = explode(",", $meta->value);
                            if ($perms[0] == 'true')
                            {
                                $childstats['id']=$childdir->stats->id;
                                $childstats['name']=$childdir->stats->name;
                                $childstats['size']=-1;
                                $childstats['fmtsize']="";
                                $childstats['mtime']=$childdir->stats->mtime;
                                $childstats['ctime']=$childdir->stats->ctime;
                                $childstats['owner']=$childdir->stats->owner;
                                $childstats['type']=0;
                                $childstats['ruri']=$childdir->toURI();
                                $output[] = $childstats;
                            }
                        }
                    }
                }
            }
        }
    }
    return $output;  
}

?>  
