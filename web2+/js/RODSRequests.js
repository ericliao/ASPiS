Ext.namespace('RODS');

RODS.Requests = function(config) {
  
  // call parent constructor
  RODS.Requests.superclass.constructor.call(this, config);
};

Ext.extend(RODS.Requests, Ext.data.Connection, {
  request : function(options) {
    RODS.Requests.superclass.request.call(this, options); 
  },
  
  defaultHandler : function(o,s,r)
  {
    if (s!==true) {
      errorShow( new HTTPConnError(r) );
      return;
    }
    
    var resp;
    try { // handle potential json formatting error
      resp= Ext.util.JSON.decode(r.responseText);
    } catch (_err) {
      errorShow( new JsonParseError(r.responseText) );
      return false;
    }
    
    if (resp.success===false) // handle potential iRODS error
    {
      if (!resp.errors)
      {
        errorShow( new GeneralError('Expected error object not found') );
        return false;
      }
      errorShow( new RODSError(resp.errors.code, resp.errors.msg) );  
      return false;
    }
    return resp;
  },
    
  readFile : function (options) {
    this.request({
      url : 'services/readFile.php',
      scope : this,
      callback : function(o,s,r){
        Ext.MessageBox.hide();
        var resp=this.defaultHandler(o,s,r);
        if (resp === false) 
        {
          if (typeof options.callback_err == 'function')
             options.callback_err.call(options.scope, r.responseText);
          return;
        }
        if (typeof options.callback == 'function')
          options.callback.call(options.scope, resp['que_results']);
      },
      params : {
        ruri : options.ruri
      }
    });  
  },
  
  writeFile : function (options) {
    if (options.filestr.length >= PHP_POST_MAX_SIZE-100)
    {
      errorShow( new GeneralError('File is too large > '+PHP_POST_MAX_SIZE+' bytes! Upload after use a texteditor instead.') );
      return;
    }
    
    this.request({
      url : 'services/writeFile.php',
      scope : this,
      callback : function(o,s,r){
        Ext.MessageBox.hide();
        var resp=this.defaultHandler(o,s,r);
        if (resp === false) 
        {
          if (typeof options.callback_err == 'function')
             options.callback_err.call(options.scope, r.responseText);
          return;
        }
        if (typeof options.callback == 'function')
          options.callback.call(options.scope, resp['que_results']);
      },
      params : {
        ruri : options.ruri,
        filestr : options.filestr
      }
    });  
  },

  mkdir : function(options) {
    Ext.MessageBox.show({
      msg: 'Creating collection, please wait...',
      progressText: 'Creating...',
      width:300,
      wait:true,
      waitConfig: {interval:200}
    });
    
    this.request({
      url : 'services/mkdir.php',
      scope : this,
      callback : function(o,s,r){
        Ext.MessageBox.hide();
        var resp=this.defaultHandler(o,s,r);
        if (resp === false) 
          return;
        if (typeof options.callback == 'function')
          options.callback.call(options.scope, resp['que_results']);
      },
      params : {
        ruri : options.parenturi,
        entitlement : options.entitlement,
        name : options.name
      }
    });  
  },  
    
  // remove file/collections by array of items, each item is an object
  // {ruri : '...', type : type_number(0=dir, 1=file)}
  rm : function(items, loc_toggle, options)
  {
    var list = '';    
    for (var i=0; i<items.length; i++)
    {
      if (i<5)
      {
        var itemruri=items[i]['ruri'];
        var itemname=itemruri.substr(itemruri.lastIndexOf('/')+1);
        if (items[i]['type']==0)
          itemname=itemname+'/';
        list=list+'&nbsp;&nbsp;&nbsp;&nbsp;'+itemname+'<br/>';
      }
    }
    if (items.length>5)
      list=list+'&nbsp;&nbsp;&nbsp;&nbsp;... <br/>';
    
    var dialog_msg='Move the following to trash or delete permanently? <br/>'+list+'<br/>Warning: You will also remove all replicas!';
    var button_config = {yes:'Move to Trash',no:'Delete Permanently',cancel:'Cancel'};
    
    // if in the trash collection, only allows permanent delete
    if (loc_toggle == 'trash') {
      dialog_msg='Delete the following permanently? <br/>'+list+'<br/>Warning: You will also remove all replicas!';
      button_config = {no:'Permanently Delete',cancel:'Cancel'};
    }
    
    this.files=new Array();
    this.dirs=new Array();    
    this.force = false;
    for (var i=0; i<items.length; i++)
    {
      if (items[i]['type']==0) {
        this.dirs.push(items[i]['ruri']);
      } else {
        this.files.push(items[i]['ruri']);
      }
    }
    this.trash=dialog_msg;
            
    Ext.Msg.show({
     	title : 'File Deletion',
     	msg : dialog_msg,
     	buttons: button_config,
     	fn : function(button_id){
     	  if (button_id == 'yes') {
         	this.force = false;
          Ext.MessageBox.show({
            msg: 'Moving selected items and any replicas to trash, please wait...',
            progressText: 'Moving...',
            width:300,
            wait:true,
            waitConfig: {interval:200}
          }); 
          this.request({
            url : 'services/delete.php',
            scope : this,
            callback : function(o,s,r){
              Ext.MessageBox.hide();
              var resp=this.defaultHandler(o,s,r);
              if (resp === false) 
                return;
              if (typeof options.callback == 'function')
                options.callback.call(options.scope, this.files.concat(this.dirs));
            },
            params : {
              'files[]' : this.files,
              'dirs[]' : this.dirs
            }
          });   
        }
        else if (button_id == 'no') {
          this.force = true;
          Ext.MessageBox.show({
            msg: 'Permanently deleting selected items and any replicas, please wait...',
            progressText: 'Deleting...',
            width:300,
            wait:true,
            waitConfig: {interval:200}
          }); 
          
          this.request({
            url : 'services/delete.php',
            scope : this,
            callback : function(o,s,r){
              Ext.MessageBox.hide();
              var resp=this.defaultHandler(o,s,r);
              if (resp === false) 
                return;
              if (typeof options.callback == 'function')
                options.callback.call(options.scope, this.files.concat(this.dirs));
            },
            params : {
              'files[]' : this.files,
              'dirs[]' : this.dirs,              
              'force' : this.force
            }
          });
        }
        else if (button_id == 'cancel')
          return;             	   
     	},
     	scope: this
    });
  },
  
  // clears the trash
  rmtrash : function(ruri, options)
  {     
    Ext.MessageBox.show({
      msg: 'Clearing items in trash, please wait...',
      progressText: 'Clearing trash...',
      width:300,
      wait:true,
      waitConfig: {interval:200}
    });
    this.request({
      url : 'services/rmtrash.php',
      scope : this,
      callback : function(o,s,r){
        Ext.MessageBox.hide();
        var resp=this.defaultHandler(o,s,r);
        if (resp === false) 
          return;
        if (typeof options.callback == 'function')
          options.callback.call(options.scope);
      },
      params : {
        'ruri' : ruri
      }    
    }); 
  },

  replicate : function(options)
  {
    Ext.MessageBox.show({
      msg: 'Replication in progress, please wait...',
      progressText: 'Replicating data...',
      width:300,
      wait:true,
      waitConfig: {interval:200}
    });
    this.request({
      url : 'services/repl.php',
      scope : this,
      callback : function(o,s,r){
        Ext.MessageBox.hide();
        var resp=this.defaultHandler(o,s,r);
        if (resp === false) 
          return;
        if (typeof options.callback == 'function')
          options.callback.call(options.scope);
      },
      params : {
        'resource' : options.resource,
        'ruri' : options.ruri,
        'action' : options.action
      }
    });  
  },
  
  rm_replicate : function(options)
  {
    Ext.MessageBox.show({
      msg: 'Removing data in progress, please wait...',
      progressText: 'Removing data...',
      width:300,
      wait:true,
      waitConfig: {interval:200}
    });
    this.request({
      url : 'services/repl.php',
      scope : this,
      callback : function(o,s,r){
        Ext.MessageBox.hide();
        var resp=this.defaultHandler(o,s,r);
        if (resp === false) 
          return;
        if (typeof options.callback == 'function')
          options.callback.call(options.scope);
      },
      params : {
        'resource' : options.resource,
        'ruri' : options.ruri,
        'action' : options.action
      }
    });  
  },

  getInfo : function(options)
  {
    this.request({
      url : 'services/getInfo.php',
      scope : this,
      callback : function(o,s,r){
        var resp=this.defaultHandler(o,s,r);
        if (typeof options.callback == 'function')
          options.callback.call(options.scope, resp['que_results']);
      },
      params : {
        'ruri' : options.ruri
      }
    });    
  },

  getTempPassword : function(options)
  {
    this.request({
      url : 'services/getTempPassword.php',
      scope : this,
      callback : function(o,s,r){
        var resp=this.defaultHandler(o,s,r);
        if (typeof options.callback == 'function')
          options.callback.call(options.scope, resp['que_results']);
      },
      params : {
        'resource' : options.resource,
        'entitlement' : options.entitlement,
        'ruri' : options.ruri
      }
    });  
  },  
  
  getLRPUpdates : function(options)
  {
    this.request({
      url : 'services/lrp_getProgress.php',
      scope : this,
      callback : function(o,s,r){
        var resp=this.defaultHandler(o,s,r);
        if (typeof options.callback == 'function')
          options.callback.call(options.scope, resp['que_results']);
      },
      params : {
        'ruri' : options.lrp_acct_ruri,
        'task_id' : options.lrp_id,
        'cancel' : options.lrp_cancel_requested,
        'log_start_line' : options.log_start_line
      }    
    });
  },
  
  getImagePlaylist : function(options)
  {
    this.request({
      url : 'services/getImagePlaylist.php',
      scope : this,
      callback : function(o,s,r){
        var resp=this.defaultHandler(o,s,r);
        if (typeof options.callback == 'function')
          options.callback.call(options.scope, resp['que_results']);
      },
      params : {
        'ruri' : options.ruri
      }    
    });
  },
  
  renewSession : function(options) {
    this.request({
      url : 'services/renewSession.php',
      scope : this,
      callback : function(o,s,r){
        var resp=this.defaultHandler(o,s,r);
        if (typeof options.callback == 'function')
          options.callback.call(options.scope, resp['que_results']);
      },
      params : {
        ssid : options.ssid
      }    
    });
  }  
});
