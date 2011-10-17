// Create user extensions namespace (Ext.ux)
Ext.namespace('RODS');

RODS.ShibInfoWindow = function(cfg){
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
    title:'Shibboleth Information',
    modal: true,
    //layout:'fit',
    constrain: true,
    items: {
      id:'accounts-info-form',
      xtype:'form',
      //hideBorders: true,
      bodyStyle:'padding:5px 5px 0',
      frame:true,
      items: [{
          id:'accounts-info-form-fs1',
          xtype:'fieldset',
          title: 'Authenticated Session:',
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
          text: 'OK', 
          cls:'x-btn-text',
          handler: function(){          
              this.hide();
          },
          scope: this
        }
      ]
    }    
  };
  Ext.applyIf(cfg, default_config);
  RODS.ShibInfoWindow.superclass.constructor.call(this,cfg);
   
};

Ext.extend(RODS.ShibInfoWindow, Ext.Window, {  
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
  }
});
