// Create user extensions namespace (Ext.ux)
Ext.namespace('RODS');

RODS.ShibWindow = function(cfg){
  if (!cfg)
  {
    cfg = {};
  }  
  
  var default_config = {
    floating: true,
    width: 410,
    stateful: false,
    maskDisabled: true,
    draggable: true,
    hideBorders: true,
    autoShow: true,
    autoHeight:true,
    collapsible:false,
    closable:false,
    shadow: true, 
    title:'Shibboleth Authenticated Session',
    modal: true,
    //layout:'fit',
    constrain: true,
    items: {
      id:'accounts-view-form',
      xtype:'form',
      //hideBorders: true,
      bodyStyle:'padding:5px 5px 0',
      frame:true,
      items: [{
          id:'accounts-view-form-fs1',
          xtype:'fieldset',
          title: 'Account Info:',
          style: 'border:0px',
          autoHeight:true,
          collapsible: false,
          defaultType: 'textfield',
          defaults: {allowBlank: false, 
            width: 250,
            labelWidth: 50, // label settings here cascade unless overridden            
            labelStyle: 'font-weight:bold;'            
          },
          items: [
            {name: 'sp', fieldLabel: 'Service Provider'},
            {name: 'idp', fieldLabel: 'Identity Provider'}, 
            {name: 'affiliation', fieldLabel: 'Affiliation'},
			{xtype: 'textarea', name: 'entitlements', fieldLabel: 'Entitlements', grow: true},
            {name: 'auth-ts', fieldLabel: 'Timestamp'}            
          ]
        }  
      ],
      buttons: [{
          text: 'Connect', 
          xtype: 'button',
          iconCls: 'z-connect-button-icon',
          cls:'x-btn-text-icon',
          handler: this.connectHandler,
          scope: this
        },{
          text: 'Cancel', 
          cls:'x-btn-text',
          handler: function(){
            if (this.connectedOnce===true) //only clickable after connected once at least
              this.hide();
          },
          scope: this
        }
      ]
    },
    
    tools: [
      {
        id:'help', 
        handler: function(event, toolEl, Panel){
          //icon only
        },
        qtip: {
          autoHide: false,
          text:RWCTips['acctWindow']
        }
      }
    ],
    
    keys: [
      {
        key: [10,13],
        fn: this.connectHandler,
        scope: this
      }
    ]
    
  };
  Ext.applyIf(cfg, default_config);
  RODS.ShibWindow.superclass.constructor.call(this,cfg);
   
};

Ext.extend(RODS.ShibWindow, Ext.Window, {  
  init : function()
  {
    this.thisform=this.getComponent(0).getForm();
    this.sp_fld=this.thisform.findField('sp');
    this.idp_fld=this.thisform.findField('idp');
    this.affiliation_fld=this.thisform.findField('affiliation');
    this.entitlement_fld=this.thisform.findField('entitlements');
    this.ts_fld=this.thisform.findField('auth-ts');

    // load Shibboleth info
    var req = new RODS.Requests();
    req.getInfo({
      ruri : 'ruri',
      scope : this,
      callback : function(que_results){
         this.sp_fld.setValue(que_results['sp']);
         this.idp_fld.setValue(que_results['idp']);
         this.affiliation_fld.setValue(que_results['affiliation']);
         this.entitlement_fld.setValue(que_results['entitlements']);
         this.ts_fld.setValue(que_results['auth-ts']);
      }         
    });
    this.sp_fld.setDisabled(true);
    this.idp_fld.setDisabled(true);
    this.affiliation_fld.setDisabled(true);
    this.entitlement_fld.setDisabled(true);
    this.ts_fld.setDisabled(true);
  },
  
  initEvents : function()
  {
    RODS.ShibWindow.superclass.initEvents.call(this);
    
  },
  
  addAccount : function(acct)
  {
    MyPref.addAccount(acct);  
  },

  connectByRURI: function (ruri)
  {
    if (this.hidden) 
      this.show();
    this.connectHandler(false);
  },
    
  connectHandler : function(ignorepass)
  {
    
    var thisform=this.getComponent(0).getForm();  
    
    this.disable();
    thisform.doAction('submit',{
      url: 'services/login.php',
      waitMsg: 'Authenticating',
      failure: function(form,action){
        var status=FormFailureErrorHandler(form,action,false);
        if (status==false) // if the error is unprocessed
        {
          var errcode=parseInt(action.result.errors['code']);
          var errmsg=action.result.errors['msg'];
          var title='Connection Failed';
          var text='Unknown Error';

          switch(errcode)
          {
            case -1000:
              title='iRODS server not responding'
              text='iRODS server \''+host_fld.getValue()+':'+port_fld.getValue()
                +'\' is not responding. It may be caused by incorrect host name/port, '
                +'or the server may be down';
              Ext.Msg.alert(title,text);
              break;
            default:
              title='Connection Failed';
              text=errcode+': '+ errmsg;
              Ext.Msg.alert(title,text);
              break;    
          }  
        }
        this.enable();
      },
      success: function(form,action){
        var host=action.result['host']?action.result['host']:'';
        var port=action.result['port']?action.result['port']:'';
        var user=action.result['user']?action.result['user']:'';
        var initPath=action.result['init_path']?action.result['init_path']:'';
        var defaultResc=action.result['default_resc']?action.result['default_resc']:'';
        var resources=action.result['resources']?action.result['resources']:[];
        var zone=action.result['zone']?action.result['zone']:'';
                
        var account=new RODSAccount({user:user,host:host, port:port,
          pass:'', zone:zone, initPath:initPath, defaultResc:defaultResc, 
          resources:resources});
        MyPref.addAccount(account);              
            
        
        this.fireEvent('acct_auth_success', this, account);  
        
        if (!this.connectedOnce) //set flag after connected at least once
        {
          this.connectedOnce=true;
        }
        this.enable();
        this.hide();
      },
      scope: this,
      clientValidation: false
    });
  }
  
  
});
