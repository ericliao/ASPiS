HelperApplet = function(cfg){
    this.appletReady=false;      
    HelperApplet.superclass.constructor.call(this);
}

Ext.extend(HelperApplet, Ext.util.Observable, {  
  // private
  initEvents : function(){
    HelperApplet.superclass.initEvents.call(this);
  },

  // calls the Java applet to perform upload
  upload : function(){  
    var req = new RODS.Requests();
    req.getTempPassword({
      entitlement: this.entitlement,
      ruri : this.ruri,
      scope : this,        
      callback : function(que_results){
         var ret_val = document.helper.copy("", que_results['ruri'], "", 
                                            que_results['temppass'], que_results['entitlement'], que_results['user_entitlements']);        
      }         
    });    
  },

  // calls the Java applet to perform download
  download : function(){  
    var req = new RODS.Requests();
    req.getTempPassword({
      entitlement: this.entitlement,
      ruri : this.ruri,
      scope : this,        
      callback : function(que_results){
         var ruri_list = this.ruri.join(",");
         var ret_val = document.helper.copy(ruri_list, "", que_results['temppass'], "", 
                                            que_results['entitlement'], que_results['user_entitlements']);
      }         
    });    
  },

  copy : function(action, entitlement, ruri){
    if (this.appletReady!==true)
      this.startApplet();

    this.entitlement = entitlement;
    if (action == 'upload')
    {
        var _ruri = "irods://" + ruri;
        this.ruri = _ruri;        
        this.upload();
    }
    else
    {
        var ruris = ruri;        
        var _ruris = [];
        for(var i=0; i<ruris.length; i++)
        {
            _ruris.push("irods://" + ruris[i]);
        }
        this.ruri = _ruris;
        this.download();         
    }   
  },
  
  startApplet : function() 
  {
    if (this.appletReady===true)
      return;
    this.startAppletDialog=new Ext.Window({
        layout:'fit',
        title: 'Starting Java Applet',
        width:217,
        height:200,
        closeAction:'hide',
        plain: true,
        html: 'Starting Java Applet, please wait ... <br/><br/>'+
              '<applet id="helper" name="helper" code="edu.sdsc.grid.gui.Helper"' +
              'archive="applets/lib/BrowserHelper.jar,applets/lib/jargon.jar" width="200" height="100" mayscript>' +
              'Your browser does not support Java, which is required for bulk upload/download.' +
              '</applet>',
              
        buttons: [{
            text:'Submit',
            disabled:true
        },{
            text: 'Close',
            handler: function(){
                this.startAppletDialog.hide();
            },
            scope : this
        }]
    });
    this.startAppletDialog.show();
    	
    var timeout_length= 1000*30;
    var elapsed_time=0;
    var tick=200;
    var check_start=function(){
      if (elapsed_time > timeout_length)
      {
        this.startAppletDialog.hide();
        Ext.Msg.alert('Error', 'Java Applet failed to load!');
      }
      if ( (document.helper)&&(true==document.helper.test()) )
      {
        this.startAppletDialog.hide();
        this.appletReady=true;
      }
      else
      {
        elapsed_time=elapsed_time+tick;
        check_start.defer(tick);
      }
    }
    
    check_start.defer(tick, this);
    
  }
});
