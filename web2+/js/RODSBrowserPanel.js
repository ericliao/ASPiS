// Create user extensions namespace (Ext.ux)
Ext.namespace('RODS');

Ext.override(Ext.form.Radio, {
    setValue : function(v){
            if (typeof v == 'boolean') {
            Ext.form.Radio.superclass.setValue.call(this, v);
        } else if (this.rendered) {
            var r = this.getCheckEl().child('input[name=' + this.el.dom.name + '][value=' + v + ']', true);
            if(r){
                Ext.getCmp(r.id).setValue(true);
            }
        }
        return this;
    }
});

RODS.BrowserPanel = function(config){
    
    this.actions={
      'mkdir' : new Ext.Action({
        text: 'New Collection', scope: this, disabled: false,
        handler: function(){
          var init_ruri = this.getRURI();
          var appManager = this.appMgr;
          var statusBar = this.grid;
          var myEntitlementBox = new ShibEntitlementBox();
          myEntitlementBox.init(init_ruri);          
          
          
          var mkdirForm = new Ext.FormPanel({
              labelWidth: 75, // label settings here cascade unless overridden
              frame:true,
              labelWidth:60,
              width: 382,
              listeners: {
                  'render' : function() {                        
                      var parent_coll = init_ruri.split('/')[3];
                      var current_user = init_ruri.split('/')[0].split('.')[0];
                      if (parent_coll != current_user) {
                          // if not in /home/user collection, disables 'private' setting
                          Ext.getCmp('privacy-radio').disable();
                          Ext.getCmp('shared-radio').setValue(true);
                          myEntitlementBox.box.enable();
                      }
                      else {
                          Ext.getCmp('shared-radio').disable();                            
                      }
                        
                  }
              },
              items: 
                  [{
                      name: 'collection',
                      fieldLabel:'Name',
                      xtype:'textfield',
                      width: 280,
                      allowBlank:false
                  },
                  {
                      items: {
                          xtype: 'fieldset',
                          title: 'Share the directory?',
                          autoHeight: true,
                          layout:'table',
                          defaults: {
                              bodyStyle:'padding:20px'
                          },
                          layoutConfig: {        
                              columns: 3
                          },
                          items: [{
                              xtype: 'radio',
                              checked: true,
                              fieldLabel: '',
                              labelSeparator: '',
                              boxLabel: 'No, keep it private',
                              name: 'privacy-setting',
                              id: 'privacy-radio',
                              inputValue: 'private',
                              colspan: 3,
                              style: 'text-align: center',
                              listeners: {
                                  'check' : function() {
                                      parent_coll = init_ruri.split('/')[3];
                                      current_user = init_ruri.split('/')[0].split('.')[0];
                                      if (parent_coll == current_user) {
                                        if (mkdirForm.getForm().getValues()['privacy-setting'] == 'private')
                                          myEntitlementBox.box.disable();
                                        else
                                          myEntitlementBox.box.enable();
                                      }
                                  }
                              }
                          },{
                              xtype: 'radio',
                              fieldLabel: '',
                              labelSeparator: ' ',
                              boxLabel: 'Yes, share with',
                              id: 'shared-radio',
                              name: 'privacy-setting',
                              inputValue: 'shared',
                              colspan: 1,
                          },
                          {
                            html: '',
                            colspan: 1
                          },
                          myEntitlementBox.box]
                      }
                  }
              ]                
          });
          
          var win = new Ext.Window({ 
            width: 385,
            height: 210,
            minWidth: 385,
            minHeight: 210,
            minimizable: true,
            title: 'New collection',
            layout: 'fit',
            items: mkdirForm,
            buttons: 
                [
                    {
                        text: 'OK',
                        handler:                     
                          function()
                          {                                                            
                              var collectionName = mkdirForm.getForm().findField('collection').getValue();
                              var privacy = mkdirForm.getForm().getValues()['privacy-setting'];                            
                              var req = new RODS.Requests();
                              if (privacy == 'private') {                            
                                req.mkdir({
                                    parenturi : init_ruri,                                
                                    name: collectionName,
                                    entitlement: 'private-collection',
                                    callback : function(collstats) {
                                        appManager.addRODSItems(collstats);
                                        statusBar.setStatusText('Private collection created: '+collectionName);
                                        win.hide();
                                    },
                                    scope : this
                                });
                              }
                              else {
                                req.mkdir({
                                    parenturi : init_ruri,                                
                                    name: collectionName,
                                    entitlement: myEntitlementBox.box.value,
                                    callback : function(collstats) {
                                        appManager.addRODSItems(collstats);
                                        statusBar.setStatusText('Shared collection created: '+collectionName);
                                        win.hide();
                                    },
                                    scope : this
                                });
                              }
                          }
                    },
                    {
                        text: 'Cancel',
                        handler: 
                          function()
                          {
                              win.hide();
                          }
                    }
                ]
                    
            });
            win.on('minimize', function(){
                win.toggleCollapse();
            });
            win.show();        
        },
        scope: this,
        iconCls: 'z-new-coll-button-icon'
      }),
      
      'rm' : new Ext.Action({
         text: 'Delete', scope: this, disabled: false,
         handler: function(){
           var location_ruri = this.getRURI();
           var loc_toggle = location_ruri.split('/')[2];
           
           var selmod=this.grid.getSelectionModel();
           if (selmod.hasSelection())
           {
             var selections=selmod.getSelections();
             var items=[];
             var ruris=[];
             for(var i=0; i<selections.length; i++)
             {
                items.push({ruri: selections[i].get('ruri'),
                            type: selections[i].get('type')
                           });
                ruris.push(selections[i].get('ruri'));
             }
             var req=new RODS.Requests();
             req.rm(items, 
                    loc_toggle, {
                callback : function() {
                  this.appMgr.removeRODSItems(ruris);
                  this.grid.setStatusText(items.length+' items removed.');
                  Ext.MessageBox.hide();
                },             
                scope: this
             });
           } 
         },
         scope: this,
         iconCls: 'z-delete-button-icon'
      }),
      
      'bulk_upload' : new Ext.Action({
        text: 'Upload',
        disabled: false,
        handler: function(){
            var init_ruri = this.getRURI();
            var myEntitlementBox = new ShibEntitlementBox();
            myEntitlementBox.init(init_ruri);        
            
            var rescBox = new RODSResourceBox();
            rescBox.init(init_ruri); 
            
            var appManager = this.appMgr;
            
            var uploadForm = new Ext.FormPanel({
              labelWidth: 75, // label settings here cascade unless overridden
              frame:true,
              labelWidth:60,
              width: 382,
              fileUpload: true,
              listeners: {
                  'render' : function() {                        
                      var parent_coll = init_ruri.split('/')[3];
                      var current_user = init_ruri.split('/')[0].split('.')[0];
                      if (parent_coll != current_user) {
                          // if not in /home/user collection, disables 'private' setting
                          Ext.getCmp('privacy-radio').disable();
                          Ext.getCmp('shared-radio').setValue(true);
                          myEntitlementBox.box.enable();
                      }
                      else {
                          Ext.getCmp('shared-radio').disable();                            
                      }
                        
                  }
              },
              items: [
                  {
                      name: 'file',
                      fieldLabel:'File',
                      inputType: 'file',
                      xtype:'textfield',
                      width: 280,
                      allowBlank:false
                  },
              
                  rescBox.box, {  
                      items: {
                          xtype: 'fieldset',
                          title: 'Share the uploaded file(s)?',
                          autoHeight: true,
                          layout:'table',
                          defaults: {
                              bodyStyle:'padding:20px'
                          },
                          layoutConfig: {        
                              columns: 3
                          },
                          items: [{
                              xtype: 'radio',
                              checked: true,
                              fieldLabel: '',
                              labelSeparator: '',
                              boxLabel: 'No, keep it private',
                              name: 'privacy-setting',
                              id: 'privacy-radio',
                              inputValue: 'private',
                              colspan: 3,
                              style: 'text-align: center',
                              listeners: {
                                  'check' : function() {
                                      parent_coll = init_ruri.split('/')[3];
                                      current_user = init_ruri.split('/')[0].split('.')[0];
                                      if (parent_coll == current_user) {
                                        if (uploadForm.getForm().getValues()['privacy-setting'] == 'private')
                                          myEntitlementBox.box.disable();
                                        else
                                          myEntitlementBox.box.enable();
                                      }
                                  }
                              }
                          },{
                              xtype: 'radio',
                              fieldLabel: '',
                              labelSeparator: ' ',
                              boxLabel: 'Yes, share with',
                              id: 'shared-radio',
                              name: 'privacy-setting',
                              inputValue: 'shared',
                              colspan: 1,
                          },
                          {
                            html: '',
                            colspan: 1
                          },
                          myEntitlementBox.box]
                      }
                  }
              ]                
          });
            
            var win = new Ext.Window({ 
                width: 385,
                height: 230,
                minWidth: 385,
                minHeight: 230,
                minimizable: true,
                title: 'File upload',
                layout:'fit',
                items:
                    uploadForm,
                    buttons: [{            
                        text:'OK',
                            handler: function(){
                              var privacy = uploadForm.getForm().getValues()['privacy-setting'];
                              var entitlement = 'private-data';
                              if (privacy != 'private')
                                entitlement = myEntitlementBox.box.value;                            

                              uploadForm.getForm().submit({
                                  url: 'services/upload.php',
                                  waitMsg: 'Uploading in progress...',
                                  params:{ruri:init_ruri, entitlement: entitlement, resource: rescBox.box.value},
                                  success: function(fp, o){
                                      appManager.fireEvent('RURI_changed', init_ruri);                                    
                                      win.hide();
                                  }
                              });
                            }
                        }, 
                        {
                        text:'Cancel',
                            handler: function(){
                                win.hide();
                            }
                        }],
                    keys: [{
                        key: 27,  // hide on Esc
                        fn: function(){
                            win.hide();
                        }
                    }]
            });
            win.on('minimize', function(){
                win.toggleCollapse();
            });
            win.show();        
        },                
        
        scope: this,
        iconCls: 'z-upload-button-icon'
      }),     

     'bulk_download' : new Ext.Action({
        text: 'Download',
        disabled: false,
        handler: function(){
            var selmod=this.grid.getSelectionModel();
            if (selmod.hasSelection())
            {
              var selection = selmod.getSelected();
              var ruri = selection.get('ruri');
              var currenturl=location.protocol+'//'+location.host+location.pathname;
              var currenturlpath=currenturl.substring(0,currenturl.lastIndexOf('/'));
              var permalink=currenturlpath+'/rodsproxy/'+ruri;
              window.open(permalink,'mywindow','width=800,height=600,resizable = yes, scrollbars = yes');
            }
         },
         scope: this,
         iconCls: 'z-download-button-icon'
      }),

      'rmtrash' : new Ext.Action({
        text: 'Clear Trash',
        disabled: false,        
        handler: function(){
          Ext.Msg.show({
           	title : 'Clear Trash',
           	msg : 'Are you sure you want to permanently remove all items from the trash?',
           	buttons: Ext.MessageBox.YESNO,
           	fn : function(button_id){
           	  if (button_id == 'yes') {
           	    var account=ruri2Account(this.ruri);
                var trashdir=account.getTrashDirRURI();            
                var req=new RODS.Requests();
                req.rmtrash(trashdir, {
                   callback : function() {
                     this.setStatusText('Items in trash cleared.');
                   },             
                   scope: this
                });  
           	  }
           	  else {
           	    return;
         	    }
           	},
           	scope: this         	  
          });            
        },
        scope: this
      }),
      
      'properties' : new Ext.Action({
        text: 'Properties',
        disabled: false,
        handler: function()
        {
          var selmod=this.grid.getSelectionModel();
          if (selmod.hasSelection())
          {
            var selection=selmod.getSelected();
            this.file_viewer.view(selection.get('ruri'), selection.get('name'), selection.get('type'));
          }        
        },
        scope: this
      })

    };        
    
    this.setActionsDisabled= function(){
      for (actionkey in this.actions)
      {
        if (actionkey.length>0)
        {
          if (actionkey=='mkdir')
            continue;
          if (actionkey=='bulk_upload')
            continue; 
          if (actionkey=='rmtrash')
            continue;    
          else
          {
            this.actions[actionkey].setDisabled(!(this.grid.getSelectionModel().hasSelection()));
          }
        }
      }
    };
    
    var default_conf={
      title: ' ',
      layout : 'border',
      minHeight: 300,
      minWidth: 640,
      height: 600, 
      width: 800,  
      tbar   : [
        { cls: 'x-btn-icon', iconCls: 'z-folder-up-button-icon', 
          handler: function(){
            this.folderup();
          }, scope:this, tooltip: 'Go to parent collection'
        },
        { cls: 'x-btn-icon', iconCls: 'z-new-window-button-icon', 
          handler: function(){
            if ( (this.appMgr)&&(this.ruri)&&(this.ruri.length>3) )
              this.appMgr.addBrowser(this.ruri, this);
          }, scope:this, tooltip: 'Open Additional Browser'
        },
        '-',
        { cls: 'x-btn-text-icon', iconCls: 'z-organize-button-icon', text: 'Organize', 
          tooltip: 'Organize this collection\'s contents',
          menu: { // 'Organize menu'
            listeners : {
              'show' : { // auto disable/enable action items, if there are selection(s)
                scope : this,
                fn : function(menu) { 
                  this.setActionsDisabled();
                }
              }
            },
            
            items: [
              this.actions['bulk_upload'],
              this.actions['bulk_download'],
              this.actions['mkdir'],
              this.actions['rm'],
              this.actions['rmtrash'],
              this.actions['properties']
            ]
          }
        }  
        
      ],
      keys: [
        {
            key: Ext.EventObject.DELETE,
            handler: function(){
              var selmod=this.grid.getSelectionModel();
              if (selmod.hasSelection())
              {
               var name=selmod.getSelected().get('name');
               Ext.Msg.alert('selected',name);
              }   
            },
            scope: this
        }
      ],
      items :
      [
          {
            xtype: 'rodstree',
            title: 'Collections',
            region:'west',
            split:true,
            collapsible: true,
            width: 200,
            minSize: 100,
            maxSize: 300  
          },
          {
            xtype: 'rodsgrid',
            region: 'center',
            parentCont: this,
            appMgr: this.appMgr  
          }
          
      ] 
    };
    Ext.applyIf(config, default_conf);
    RODS.BrowserPanel.superclass.constructor.call(this, config);
    
};

// pluggable renders
function escapeXMLChar(strInput, p, record)
{ 
  // replace special characters that will error out in xml
  strInput=strInput.replace(/&/g,"&amp;");  //replace & with &
  strInput=strInput.replace(/</g,"&lt;");	//replace < with <
  strInput=strInput.replace(/>/g,"&gt;");	//replace > with >
  return(strInput);
}

function renderName(value, p, record){
  if (record.data['type']==0) 
    return String.format(
      '<span class="x-grid-col-objtype-dir">{0}</span>', value);
  else
  if (record.data['type']==1)
    return String.format(
      '<span class="x-grid-col-objtype-generic-file">{0}</span>', value);
  else
    return value;
}

function renderFmtSize(value,p,record){
  if ( (!value)||(value<0) )
    return '';
    
  var rawSize=value;
  if (rawSize / 1099511627776 > 1) 
    return Math.round(rawSize*100/1099511627776)/100 + ' TB';
  else if (rawSize / 1073741824 > 1) 
    return Math.round(rawSize*100/1073741824)/100 + ' GB';  
  else 
  if (rawSize / 1048576 > 1) 
    return Math.round(rawSize*100/1048576)/100 + ' MB'; 
  else if (rawSize / 1024 > 1) 
    return Math.round(rawSize*100/1024)/100 + ' KB'; 
  else 
    return rawSize + ' B ';
}

function renderTime(value){
  try {
    return value.dateFormat('F j, Y, g:i a');
  } catch (e) {
    return 'Invalid Time';
  }
}

//Ext.extend(RODS.BrowserPanel, Ext.Panel, {
//Ext.extend(RODS.BrowserPanel, Ext.Window, {  
Ext.extend(RODS.BrowserPanel, RODS.AppWindow, {    
  initComponent : function(){
    RODS.BrowserPanel.superclass.initComponent.call(this);
    this.tree=this.getComponent(0);
    this.grid=this.getComponent(1);
    
    this.file_viewer=new RODSFileViewer();
	  this.file_viewer.init();
    
    // add history combo box
    this.history_combo_box=new Ext.form.ComboBox({ 
      width: 300,
      resizable: true, 
      store: this.grid.history_store, mode: 'local',triggerAction:'all',
      displayField: 'path'
    });
    this.topToolbar.push('-',this.history_combo_box);
    
    this.addEvents(
      'RURI_changed'
    );
    
    this.on('render', function(comp) {
      /*
      this.getEl().mask("I am masked!"+this.id+":"
        +this.getEl().getWidth()+"+"+this.getEl().getHeight()+"|||"
        +this.body.getBox().x+"+"+this.body.getBox().y+"+"+this.body.getBox().width+"+"+this.body.getBox().height
      );
      */
      if (this.initRURI)
        this.setRURI(this.initRURI);
    }, this);
    
  },
  
  // private
  initEvents : function(){
    RODS.BrowserPanel.superclass.initEvents.call(this);
    
    this.grid.on('RURI_changed', function(ruri){
      if (this.history_combo_box)
      {
        var path;
        if (ruri.indexOf('/')>0)
          path=ruri.substr(ruri.indexOf('/'));
        else
          path='/';
        this.history_combo_box.setValue(path);
      }
      this.tree.setRURI(ruri);
      this.RURIChangeHandler(ruri);
    },this);
    
    this.tree.on('RURI_changed', function(ruri){
      this.setRURI(ruri);
    },this);
    
    // handle the path combo box when 'enter' is pressed
    if (this.history_combo_box)
    {
      this.history_combo_box.on('specialkey', function(this_combobox, evnt){
        if (evnt.getKey()==Ext.EventObject.ENTER)
        {
          var new_value=this_combobox.getValue();
          
          if (new_value.indexOf('/')!=0)
          {
            this_combobox.markInvalid('Invalid Path');
            return;
          }  
          var acct_uri=MyPref.activeAccount.toIdentifier();
          if (new_value=='/') // if root, the the path is '/', special case here...
            this.setRURI(acct_uri);
          else
            this.setRURI(acct_uri+new_value);
        }
      },this);
    
      // handle the path combo box when a value is selected
      this.history_combo_box.on('select', function(this_combobox, record, indx){
        if (record.get('path')=='/') // if root, the the path is '/', special case here...
          this.setRURI(''+record.get('acct_uri'));
        else
          this.setRURI(''+record.get('acct_uri')+record.get('path'));
      },this);
    }
  },
  
  setRURI : function(ruri){
    try {
      
      if ( (this.ruri)&&(this.ruri==ruri) )
        return;
      
      this.grid.setRURI(ruri); 
      this.tree.setRURI(ruri); 
      
      this.setTitle('irods://'+ruri);
      
      AddLog('Changed to irods://'+ruri);
    } catch (err) {
      
      errorShow(err);
    }
  },
  
  getRURI : function(){
    return (this.ruri)?this.ruri:'';
  },
  
  folderup : function()
  {
    // do nothing if current uri isn't yet set
    if (this.ruri.length<3) return;
    
    var indexof_firstslash=this.ruri.indexOf('/');
    var indexof_lastslash=this.ruri.lastIndexOf('/');
    //if ((indexof_firstslash<0)||(indexof_firstslash==indexof_lastslash)) return;
    if (indexof_firstslash<0) return;
    if (this.ruri.length<=1) return;
    var new_ruri=this.ruri.substr(0,indexof_lastslash);
    this.setRURI(new_ruri);
    
  },
  
  underAccount : function (acct){
    if (!this.ruri)
      return false;
    var curacct=ruri2Account('irods://'+this.ruri);
    if (curacct.equals(acct))
      return true;
    return false;
  },
  
  RURIChangeHandler : function (ruri){
    if ( (this.ruri)&&(this.ruri==ruri) )
      return;
    this.ruri=ruri;
    this.fireEvent('RURI_changed', ruri);
  },
  
  setStatusText : function(txt)
  {
    this.grid.setStatusText(txt);
  },
  
  resetStatusText : function ()
  {
    this.grid.resetStatusText();
  },
  
  addRODSItems : function (collstats)
  {
    for (var i=0; i<collstats.length; i++)
    {
      this.addRODSItem(collstats[i]);
    }
  },
  
  addRODSItem : function (collstats)
  {
    this.grid.addRODSItem(collstats);  
    if (collstats['type']<1) // only add to tree if its a collection
      this.tree.addRODSItem(collstats['ruri']);
  },
  
  removeRODSItems : function (ruris)
  {
    for (var i=0; i<ruris.length; i++)
    {
      this.removeRODSItem(ruris[i]);
    }
  },
  
  removeRODSItem : function (ruris)
  {
    this.grid.removeRODSItem(ruris);  
    this.tree.removeRODSItem(ruris);
  }  
});

function RODSResourceBox()
{
  return {
    init: function(init_ruri)
    {  
      this.resources = new Ext.data.Store({
          proxy: new Ext.data.HttpProxy({
              url: 'services/serverQuery.php?action=resources'
          }),
          
          // create reader that reads the Topic records
          reader: new Ext.data.JsonReader({
              successProperty: 'success',
              root: 'que_results',
              totalProperty: 'totalCount',
              id: 'id'
          }, [
              {name: 'id', mapping: 'id'},
              {name: 'name', mapping: 'name'},
              {name: 'type', mapping: 'type'},
              {name: 'zone', mapping: 'zone'},
              {name: 'class', mapping: 'class'},
              {name: 'loc', mapping: 'loc'},
              {name: 'info', mapping: 'info'},
              {name: 'comment', mapping: 'comment'},
              {name: 'vault_path', mapping: 'vault_path'},
              {name: 'free_space', mapping: 'free_space'},
              {name: 'ctime', mapping: 'ctime', type: 'date', dateFormat: 'timestamp'},
              {name: 'mtime', mapping: 'mtime', type: 'date', dateFormat: 'timestamp'}
          ]),
    
          // turn off remote sorting
          remoteSort: false
      });
      
      this.ruri=init_ruri.substring(0,init_ruri.indexOf('/'));
      
      this.resources.on('beforeload', function() {
        this.resources.baseParams = {'ruri': this.ruri};
      }, this);
      
      this.resources.proxy.getConnection().
        on('requestcomplete', jsonErrorResponseHandler);
      
      this.box = new Ext.form.ComboBox({
               fieldLabel: 'Resource',
               store: this.resources, 
               displayField:'name',
               valueFiled: 'name',
               emptyText:'Select a Resource...',
               selectOnFocus:true,
               allowBlank:false,
               hiddenName: 'resource',
               triggerAction: 'all',
               forceSelection:true
      });
      
      this.box.store.on("load",function(store){
        this.clearValue();
        this.setValue(store.getAt(0).data.name);
      },this.box);
      
      this.box.store.load();
    }, //end of function init
    
    // update RURI, and reload, if needed.
    updateRURI: function (new_ruri)
    {
      var newacct=new_ruri.substring(0,new_ruri.indexOf('/'));
        
      if (this.ruri!=newacct) // if acct has changed
      {
        this.ruri=newacct;
        this.resources.load();
      }
    }
  }
}

function ShibEntitlementBox()
{
  return {
    init: function(init_ruri)
    {  
      this.entitlements = new Ext.data.Store({
          proxy: new Ext.data.HttpProxy({
              url: 'services/serverQuery.php?action=entitlements'
          }),
          
          // create reader that reads the Topic records
          reader: new Ext.data.JsonReader({
              successProperty: 'success',
              root: 'que_results',
              totalProperty: 'totalCount',
          }, [
              {name: 'name', mapping: 'name'}
          ]),
    
          // turn off remote sorting
          remoteSort: false
      });                    
      
      this.entitlements.on('beforeload', function() {
        this.entitlements.baseParams = {'ruri': init_ruri};
      }, this);
      
      this.entitlements.proxy.getConnection().
        on('requestcomplete', jsonErrorResponseHandler);
      
      this.box = new Ext.form.ComboBox({
               store: this.entitlements, 
               displayField:'name',
               valueField: 'name',
               emptyText:'Select an Entitlement...',
               selectOnFocus:true,
               allowBlank:false,
               hiddenName: 'entitlement',
               triggerAction: 'all',
               forceSelection:true      
      });
      
      this.box.store.on("load",function(store){
        this.clearValue();
        this.setValue(store.getAt(0).data.name);
      },this.box);
      
      this.box.store.load();
    }, //end of function init
    
    // update RURI, and reload, if needed.
    updateRURI: function (new_ruri)
    {
      var newacct=new_ruri;
        
      if (this.ruri!=newacct) // if acct has changed
      {
        this.ruri=newacct;
        this.entitlements.load();
      }
    }
  }
}

function RODSMetadataGrid()
{
  var gridpanel, grid, grid_view, ds, num_newrows;
  
  return {
    init : function(grid_container) {  
      this.num_newrows=0;
      
      // shorthand alias
      var fm = Ext.form, Ed = Ext.grid.GridEditor;
  
      // the column model has information about grid columns
      // dataIndex maps the column to the specific data field in
      // the data store (created below)
      var cm = [{
             header: "Name",
             dataIndex: 'name',
             renderer: escapeXMLChar,
             width: 200,
             editor: new Ed(new fm.TextField({
                 allowBlank: false,
                 emptyText: 'Name',
                 emptyClass: 'x-form-empty-field'
             }))
          },{
             header: "Value",
             id: 'meta_grid_col_value',
             dataIndex: 'value',
             renderer: escapeXMLChar,
             width: 200,
             editor: new Ed(new fm.TextField({
                 allowBlank: false
             }))
          },{
             header: "Unit",
             dataIndex: 'unit',
             width: 100,
             editor: new Ed(new fm.TextField({
                 allowBlank: true
             }))
          }
      ];
      
      // by default columns are sortable
      cm.defaultSortable = true;
      
      // this could be inline, but we want to define the metadata record
      // type so we can add records dynamically
      var MetadataRecord = Ext.data.Record.create([
             // the "name" below matches the tag name to read
             {name: 'id', type: 'string'},
             {name: 'name', type: 'string'},
             {name: 'value', type: 'string'},
             {name: 'unit', type: 'string'},
             {name: 'isnew', type: 'bool'},
             {name: 'isperm',type: 'bool'},
             {name: 'isremoved',type: 'bool'}
      ]);
      
      // create the Data Store
      // add filter to hide/show the permissions metadata?      
      this.ds = new Ext.data.Store({
          proxy: new Ext.data.HttpProxy({
              url: 'services/metadata.php'
          }),
          
          reader: new Ext.data.JsonReader({
              successProperty: 'success',
              root: 'que_results',
              totalProperty: 'totalCount'
          }, MetadataRecord),
          
          // turn off remote sorting
          remoteSort: false
      });
      this.ds.setDefaultSort('name', 'desc');
      
      this.ds.on('loadexception', function(a,conn,resp) {
        if (resp.status != 200)
          Ext.Msg.alert('load exception', resp.status+':'+resp.statusText);
        
      });
      
      this.ds.proxy.getConnection().on('requestcomplete', jsonErrorResponseHandler);
      
      var toolbar = [
        {
          icon: "images/add.png",
          text: "Add",
          tooltip: 'Add a new metadata entry',
          cls: 'x-btn-text-icon',
          scope: this,
          handler : function(){
            var p = new MetadataRecord({
                name: 'New Name '+this.num_newrows,
                value: 'New Value '+this.num_newrows,
                unit: '',
                isnew: true,
                id: 'new'+this.num_newrows
            });
            this.num_newrows++;
            this.grid.stopEditing();
            this.ds.insert(0, p);
            this.grid.startEditing(0, 0);
          }
        },
        '-',
        {
          icon: "images/delete.png",
          text: "Remove",
          tooltip: 'Remove an entry',
          cls: 'x-btn-text-icon',
          scope: this,
          handler : function(){
            var selected_rec=this.grid.getSelectionModel().getSelected();
            if (selected_rec!=null)
            {
              if (selected_rec.get('isnew')!=true) // if it's an existing row
              {
                if (selected_rec.get('isremoved')!=true) // if not removed, remove it
                {
                  selected_rec.set('isremoved',true);
                  var index=this.ds.indexOf(selected_rec);
                  if (index >= 0)
                  {
                    var rowel=this.grid_view.getRow(index);
                    rowel.style.textDecoration='line-through';
                  }
                }
                else  // if already removed, un-remove it
                {
                  selected_rec.set('isremoved',false);
                  var index=this.ds.indexOf(selected_rec);
                  if (index >= 0)
                  {
                    var rowel=this.grid_view.getRow(index);
                    rowel.style.textDecoration='';
                  }
                }
              }
              else  // if it's a new row
              {
                this.ds.remove(selected_rec);
              } 
            }
          }
          
        },
        '-',
        {
          icon: "images/arrow_refresh_small.png",
          text: "Reload",
          tooltip: 'Reload and discard all changes',
          cls: 'x-btn-text-icon',
          scope: this,
          handler: this.refresh
        }, 
        '-',
        {
          icon: "images/disk.png",
          text: "Save",
          tooltip: 'Save all changes',
          cls: 'x-btn-text-icon',
          scope: this,
          handler : function(){
            var rec_report='';
            var row_ops=Array();
            
            var del_queue=Array(); //array of id's (string) to be deleted
            var add_queue=Array(); //array of records (record) to be added
            
            for (var i=0; i<this.ds.getCount(); i++) // build del_queue and add_queue
            {
              var rec=this.ds.getAt(i);
              if (rec.get('isnew')==true)
              {
                add_queue.push(rec);
              }
              else
              {
                if (rec.get('isremoved')==true)
                {
                  del_queue.push(rec.get('id'));
                }
                else
                if (rec.get('isedited')==true)
                {
                  del_queue.push(rec.get('id'));
                  add_queue.push(rec);   
                }
                else
                {
                  // nothing need to be done
                }
              }
              // check if there is duplicated names
              if ( rec.get('isnew')==true || rec.get('isedited')==true || 
                    rec.get('isremoved')==true
                 )
              {
                for (var j=0; j < this.ds.getCount(); j++)
                {
                  if (i==j) continue;
                  
                  var rec2=this.ds.getAt(j);
                  if (rec2.get('isremoved')==true) 
                    continue;
                  if (rec.get('name')==rec2.get('name') && rec.get('value')==rec2.get('value'))
                  {
                    this.grid.getSelectionModel().selectRecords(rec);
                    Ext.MessageBox.alert("Can not continue", "Metadata name/value pair: '"
                          + escapeXMLChar(rec.get('name'))+
                          "' is not unique!");
                    return;
                  }
                }
              }
            }
            
            for(var i=0; i<del_queue.length; i++)
            {
              row_ops.push({op: 'delbyid', id: del_queue[i] });
            }
            
            for(var i=0; i<add_queue.length; i++)
            {
              row_ops.push({op: 'add', 
                  target: { name:  add_queue[i].get('name'),
                            value: add_queue[i].get('value'),
                            unit:  add_queue[i].get('unit')
                          }
              });
            }
                      
            if (row_ops.length>0)
            {
              Ext.MessageBox.wait('Saving metadata changes. Please wait...');
              var batch=escape(Ext.util.JSON.encode(row_ops));
              var conn=new Ext.data.Connection();
              var myparams={ruri: this.ruri,'type': this.type, action:'mod', batch:batch};
              conn.request({url: 'services/metadata.php', params: myparams, 
                callback: function(options,success,r) {
                            Ext.MessageBox.hide();
                            if (success!=true)
                            {
                              alert("HTTP Request Failed ("+
                                r.statusText+'): '+r.responseText);
                            }
                            else
                            {     
                              try {
                                var response = Ext.util.JSON.decode(r.responseText);
                              	if (response && response.success == false) {
                              		Ext.MessageBox.alert("Error", response.errmsg);
                              	}
                              	else
                              	{
                              	  this.ds.reload({
                                    callback: function(){
                                      // displays all non-permission metadata
                                      this.filter('isperm', false);
                                    }
                                  });  
                              	}
                              } catch (e) {
                                alert("Invalid server response:"+r.responseText+'<br/>Exception:'+e);
                              }   
                            }
                          }, // end of HTTP conn callback  
                scope: this          
              });
            }
          } //end of metadata save handler
        }
      ];
      
      // create the editor grid
      this.grid = new Ext.grid.EditorGridPanel({
          store: this.ds,
          columns: cm,
          autoHeight: true,
          loadMask: true,          
          selModel: new Ext.grid.RowSelectionModel(),
          enableColLock:false,
          autoExpandColumn:'meta_grid_col_value',
          renderTo: grid_container,
          tbar: toolbar,
          title: 'Metadata'
      });
      // if a cell is edited add the record as 'isedited'
      this.grid.on("beforeedit", function(evnt) {
          if (evnt.record.get('isremoved')==true) // cancel edit if row is removed
            evnt.cancel=true;
        }, 
        this
      );
      // if a cell is edited add the record as 'isedited'
      this.grid.on("afteredit", function(evnt) {
          if (evnt.record.get('isnew')==true)
            return;
          else
          {
            if (evnt.value != evnt.originalValue) 
            {
              evnt.record.set('isedited',true); 
            }
          }  
        }, 
        this
      );
      
      this.grid_view=this.grid.getView();
      this.grid_view.on('refresh', function(){ // re-apply line-through style to delted records
        for (var i=0; i<this.ds.getCount(); i++)
        {
          if (this.ds.getAt(i).get('isremoved')==true)
          {
            var rowel=this.grid_view.getRow(i);
            rowel.style.textDecoration='line-through';
          }
        }
      }, this);              
      
    }, // end of RODSMetadataViewer::init()
    
    load: function (_ruri, _type)
    {
      this.ruri=_ruri;
      this.type=_type;
      this.num_newrows=0;
      this.ds.load({
        params:{ruri:_ruri, 'type':_type, action:'get'},
        callback: function(){
          // displays all non-permission metadata
          this.filter('isperm', false);
        }
      });
    },
    
    refresh: function()
    {
      this.ds.reload({
        callback: function(){
          // displays all non-permission metadata
          this.filter('isperm', false);
        }
      });      
    }
  }
} // end of RODSMetadataViewer

Ext.grid.CheckColumn = function(config){
    Ext.apply(this, config);
    if(!this.id){
        this.id = Ext.id();
    }
    this.renderer = this.renderer.createDelegate(this);
};

Ext.grid.CheckColumn.prototype ={
    init : function(grid){
        this.grid = grid;
        this.grid.on('render', function(){
            var view = this.grid.getView();
            view.mainBody.on('mousedown', this.onMouseDown, this);
        }, this);
    },

    onMouseDown : function(e, t){
        if(t.className && t.className.indexOf('x-grid3-cc-'+this.id) != -1){
            e.stopEvent();
            var index = this.grid.getView().findRowIndex(t);
            var record = this.grid.store.getAt(index);
            record.set(this.dataIndex, !record.data[this.dataIndex]);
            record.set('isedited',true); 
        }
    },

    renderer : function(v, p, record){
        p.css += ' x-grid3-check-col-td'; 
        return '<div class="x-grid3-check-col'+(v?'-on':'')+' x-grid3-cc-'+this.id+'">&#160;</div>';
    }
};

function RODSPermissionGrid()
{
  var gridpanel, grid, grid_view, ds, num_newrows;
  
  return {
    init : function(grid_container) {  
      this.num_newrows=0;
      
      // shorthand alias
      var fm = Ext.form, Ed = Ext.grid.GridEditor;
  
      // the column model has information about grid columns
      // dataIndex maps the column to the specific data field in
      // the data store (created below)            
      var readPermColumn = new Ext.grid.CheckColumn({
        header: "Read",
        dataIndex: 'readPerm',
        width: 100
      });            
      
      var updatePermColumn = new Ext.grid.CheckColumn({
        header: "Update",
        dataIndex: 'updatePerm',
        width: 100
      });
      
      var deletePermColumn = new Ext.grid.CheckColumn({
        header: "Delete",
        dataIndex: 'deletePerm',
        width: 100
      });
      
      var cm = [{
             header: "Entitlement",
             dataIndex: 'name',
             renderer: escapeXMLChar,
             width: 200
          },
          readPermColumn,
          updatePermColumn,
          deletePermColumn,          
      ];      
      
      // this could be inline, but we want to define the metadata record
      // type so we can add records dynamically
      // put readPerm, updatePerm, deletePerm here <- load from metadata.php
      var MetadataRecord = Ext.data.Record.create([
             // the "name" below matches the tag name to read
             {name: 'id', type: 'string'},
             {name: 'name', type: 'string'},
             {name: 'value', type: 'string'},
             {name: 'readPerm', type: 'bool'},
             {name: 'updatePerm', type: 'bool'},
             {name: 'deletePerm', type: 'bool'},
             {name: 'isnew', type: 'bool'},
             {name: 'isBase',type: 'bool'},
             {name: 'isremoved',type: 'bool'}
      ]);
      
      // create the Data Store
      // add filter to hide/show the permissions metadata?      
      this.ds = new Ext.data.Store({
          proxy: new Ext.data.HttpProxy({
              url: 'services/permissions.php'
          }),
          
          reader: new Ext.data.JsonReader({
              successProperty: 'success',
              root: 'que_results',
              totalProperty: 'totalCount'
          }, MetadataRecord),
          
          // turn off remote sorting
          remoteSort: false
      });
      this.ds.setDefaultSort('name', 'desc');
      
      this.ds.on('loadexception', function(a,conn,resp) {
        if (resp.status != 200)
          Ext.Msg.alert('load exception', resp.status+':'+resp.statusText);
        
      });
      
      this.ds.proxy.getConnection().on('requestcomplete', jsonErrorResponseHandler);
      
      var toolbar = [        
        {
          icon: "images/arrow_refresh_small.png",
          text: "Reload",
          tooltip: 'Reload and discard all changes',
          cls: 'x-btn-text-icon',
          scope: this,
          handler: this.refresh
        }, 
        '-',
        {
          icon: "images/disk.png",
          text: "Save",
          tooltip: 'Save all changes',
          cls: 'x-btn-text-icon',
          scope: this,
          handler : function(){
            var rec_report='';
            var row_ops=Array();
            
            var del_queue=Array(); //array of id's (string) to be deleted
            var add_queue=Array(); //array of records (record) to be added
            
            for (var i=0; i<this.ds.getCount(); i++) // build del_queue and add_queue
            {
              var rec=this.ds.getAt(i);
              if (rec.get('isnew')==true)
              {
                add_queue.push(rec);
              }
              else
              {
                if (rec.get('isremoved')==true)
                {
                  del_queue.push(rec.get('id'));
                }
                else
                if (rec.get('isedited')==true)
                {
                  del_queue.push(rec.get('id'));
                  add_queue.push(rec);   
                }
                else
                {
                  // nothing need to be done
                }
              }
              // check if there is duplicated names
              if ( rec.get('isnew')==true || rec.get('isedited')==true || 
                    rec.get('isremoved')==true
                 )
              {
                for (var j=0; j < this.ds.getCount(); j++)
                {
                  if (i==j) continue;
                  
                  var rec2=this.ds.getAt(j);
                  if (rec2.get('isremoved')==true) 
                    continue;
                  if (rec.get('name')==rec2.get('name') && rec.get('value')==rec2.get('value'))
                  {
                    this.grid.getSelectionModel().selectRecords(rec);
                    Ext.MessageBox.alert("Can not continue", "Metadata name/value pair: '"
                          + escapeXMLChar(rec.get('name'))+
                          "' is not unique!");
                    return;
                  }
                }
              }
            }
            
            for(var i=0; i<del_queue.length; i++)
            {
              row_ops.push({op: 'delbyid', id: del_queue[i] });
            }
            
            for(var i=0; i<add_queue.length; i++)
            {
              var new_perms = add_queue[i].get('readPerm') + "," + 
                              add_queue[i].get('updatePerm') + "," + 
                              add_queue[i].get('deletePerm');              
              row_ops.push({op: 'add', 
                  target: { name:  add_queue[i].get('name'),
                            value: new_perms,
                            unit:  add_queue[i].get('unit')
                          }
              });
            }
                      
            if (row_ops.length>0)
            {
              Ext.MessageBox.wait('Saving metadata changes. Please wait...');
              var batch=escape(Ext.util.JSON.encode(row_ops));              
              var conn=new Ext.data.Connection();
              var myparams={ruri: this.ruri,'type': this.type, action:'mod', batch:batch};
              conn.request({url: 'services/permissions.php', params: myparams, 
                callback: function(options,success,r) {
                  Ext.MessageBox.hide();
                  if (success!=true)
                  {
                    alert("HTTP Request Failed ("+
                      r.statusText+'): '+r.responseText);
                  }
                  else
                  {     
                    try {
                      var response = Ext.util.JSON.decode(r.responseText);
                    	if (response && response.success == false) {
                    		Ext.MessageBox.alert("Error", response.errmsg);
                    	}
                    	else
                    	{
                        this.ds.reload({
                          callback: function(){
                            // hide base entitlement
                            this.filter('isBase', false);
                          }
                        });
                    	}
                    } catch (e) {
                      alert("Invalid server response:"+r.responseText+'<br/>Exception:'+e);
                    }   
                  }
                }, // end of HTTP conn callback  
                scope: this          
              });
            }
          } //end of metadata save handler
        }
      ];
      
      // create the editor grid
      this.grid = new Ext.grid.EditorGridPanel({
          store: this.ds,
          columns: cm,
          plugins: [readPermColumn, updatePermColumn, deletePermColumn],
          autoHeight: true,
          loadMask: true,          
          selModel: new Ext.grid.RowSelectionModel(),
          enableColLock:false,
          renderTo: grid_container,
          tbar: toolbar,
          title: 'Permissions'
      });
      // if a cell is edited add the record as 'isedited'
      this.grid.on("beforeedit", function(evnt) {
          if (evnt.record.get('isremoved')==true) // cancel edit if row is removed
            evnt.cancel=true;
        }, 
        this
      );
      // if a cell is edited add the record as 'isedited'
      this.grid.on("afteredit", function(evnt) {
          if (evnt.record.get('isnew')==true)
            return;
          else
          {
            if (evnt.value != evnt.originalValue) 
            {
              evnt.record.set('isedited',true); 
            }
          }  
        }, 
        this
      );
      
      this.grid_view=this.grid.getView();
      this.grid_view.on('refresh', function(){ // re-apply line-through style to delted records
        for (var i=0; i<this.ds.getCount(); i++)
        {
          if (this.ds.getAt(i).get('isremoved')==true)
          {
            var rowel=this.grid_view.getRow(i);
            rowel.style.textDecoration='line-through';
          }
        }
      }, this);              
      
    }, // end of RODSMetadataViewer::init()
    
    load: function (_ruri, _type)
    {
      this.ruri=_ruri;
      this.type=_type;
      this.num_newrows=0;
      this.ds.load({
        params:{ruri:_ruri, 'type':_type, action:'get'},
        callback: function(){
          // hide base entitlement
          this.filter('isBase', false);
        }
      });
    },
    
    refresh: function()
    {
      this.ds.reload({
        callback: function(){
          // hide base entitlement
          this.filter('isBase', false);
        }
      }); 
    }
  }
} // end of RODSPermissionGrid


function RODSFileViewer()
{  
  
  var win, ruri, metagrid, repl_ds;
  return {  
        
    init : function (){ 
        //Ext.QuickTips.init();                        
        
        this.metagrid=new RODSMetadataGrid();
        this.metagrid.init('fileviewer-tab-meta-grid');
        
        this.permgrid=new RODSPermissionGrid();
        this.permgrid.init('fileviewer-tab-perm-grid');
        
        this.createReplGridPanel('fileviewer-tab-repl-grid');
        
        this.tabs = new Ext.TabPanel({            
            renderTo: 'tabs',
            tabPosition: 'bottom',
            activeTab: 0,
            defaults: {autoScroll:true},
            deferredRender: false,
            items: [this.permgrid.grid, this.metagrid.grid, this.repl_grid]
        });                                        
                
        if (!win) {
          win = new Ext.Window({            
              applyTo: 'file-win',            
              closable: true,
              width: 600,
              height: 400,
              minimizable: true,
              border: false,
              plain: true,
              layout: 'fit',
              closeAction:'hide',
              items: this.tabs,
              buttons: [{
                  text: 'Close',
                  handler: function(){
                        win.hide();
                    }
                  
              }]
          });      
              
          win.on('minimize', function(){
              this.toggleCollapse();
          });        
        }
    },    
    
    view : function(ruri, obj_name, obj_type){      
      win.setTitle('\'' + obj_name + '\' Properties');      
      this.ruri = ruri;
      this.permgrid.load(ruri, obj_type);    
      this.metagrid.load(ruri, obj_type);
      this.repl_ds.load({params:{ruri:ruri}});
      win.show(this);      
    },
    
    createReplGridPanel : function(grid_container)
    {
      // the column model has information about grid columns
      // dataIndex maps the column to the specific data field in
      // the data store (created below)
      var cm = [{
             id: "repl_grid_col_replnum",
             header: "#",
             dataIndex: 'repl_num',
             width: 50,
             css: 'white-space:normal;'
          },{
             header: "Chksum",
             dataIndex: 'chk_sum',
             width: 100,
             hidden: true
          },{
             id: "repl_grid_col_rescname",
             header: "Resource",
             dataIndex: 'resc_name',
             width: 100
          },{
             header: "Resc Group",
             dataIndex: 'resc_grp_name',
             width: 100,
             hidden: true 
          },{
             header: "Type",
             dataIndex: 'resc_type',
             width: 100,
             hidden: true 
          },{  
             header: "Class",
             dataIndex: 'resc_class',
             width: 100,
             hidden: true      
          },{
             header: "Location",
             dataIndex: 'resc_loc',
             width: 100,
             hidden: true      
          },{
             header: "Freespace",
             dataIndex: 'resc_freespace',
             width: 100,
             hidden: true      
          },{
             header: "Size",
             dataIndex: 'size',
             width: 50,
             renderer: renderFmtSize,
             align: 'right'
          },{
             header: "Date Created",
             dataIndex: 'ctime',
             width: 150,
             renderer: renderTime,
             align: 'right',
             hidden: true 
          },{
             header: "Up-to-date",
             dataIndex: 'resc_repl_status',
             width: 100,
             renderer: function (value,p,record){
               if (record.data['resc_repl_status']==0)
                 return '<div style="color:red">No</div>';
               else
               if (record.data['resc_repl_status']==1)
                 return '<div style="color:green">Yes</div>';
               else
                 return ''+record.data['resc_repl_status'];    
             },
             align: 'right'
          },{
             header: "Date Modified",
             dataIndex: 'mtime',
             width: 200,
             renderer: renderTime,
             align: 'right'
          }];
      
      // by default columns are sortable
      cm.defaultSortable = true;
      
      var toolbar = [
        {       
           icon: "images/add.png",
           text: 'Replicate',
           tooltip: 'Replicate to Additional Resource',
           cls: 'x-btn-text-icon',
           scope: this,
           handler: this.showReplDialog
        },
        '-',
        { 
           icon: "images/delete.png",
           text: 'Remove Selected',
           tooltip: 'Remove selected copy from its resource',
           cls: 'x-btn-text-icon',
           scope: this,
           handler: this.removeReplHandler
        },
        '-',
        { 
           icon: "images/arrow_refresh_small.png",
           text: 'Refresh List',
           tooltip: 'Remove list of copies',
           cls: 'x-btn-text-icon',
           scope: this,
           handler: function(){
             this.repl_ds.reload();
           }
        }
      ];  
      
      // create the Data Store
      this.repl_ds = new Ext.data.Store({
          proxy: new Ext.data.HttpProxy({
              url: 'services/fileQuery.php?action=replica'
          }),
          
          // create reader that reads the Topic records
          reader: new Ext.data.JsonReader({
              successProperty: 'success',
              root: 'que_results',
              totalProperty: 'totalCount'
          }, [
              {name: 'repl_num', mapping: 'repl_num', type: 'int'},
              {name: 'chk_sum', mapping: 'chk_sum'},
              {name: 'resc_name', mapping: 'resc_name'},
              {name: 'resc_repl_status', mapping: 'resc_repl_status', type: 'int'},
              {name: 'resc_grp_name', mapping: 'resc_grp_name'},
              {name: 'resc_type', mapping: 'resc_type'},
              {name: 'resc_class', mapping: 'resc_class'},
              {name: 'resc_loc', mapping: 'resc_loc'},
              {name: 'resc_freespace', mapping: 'resc_freespace', type: 'int'},
              {name: 'data_status', mapping: 'data_status'},
              {name: 'size', mapping: 'size', type: 'int'},
              {name: 'ctime', mapping: 'ctime', type: 'date', dateFormat: 'timestamp'},
              {name: 'mtime', mapping: 'mtime', type: 'date', dateFormat: 'timestamp'}
          ]),

          // turn on remote sorting
          remoteSort: false
      });
      
      this.repl_ds.proxy.getConnection().on('requestcomplete', jsonErrorResponseHandler);
      
      this.repl_grid = new Ext.grid.GridPanel({
          store: this.repl_ds,
          columns: cm,
          autoWidth:true,
          loadMask: true,          
          selModel: new Ext.grid.RowSelectionModel({singleSelect:true}),
          enableColLock:false,
          autoExpandColumn:'repl_grid_col_rescname',
          renderTo: grid_container,
          tbar: toolbar,
          title: 'Copies'
      });            
                  
    }, // end of method RODSFileViewer::createReplGridPanel
    
    removeReplHandler: function(btn)
    {
      if (this.repl_ds.getCount()<2)
      {
        Ext.MessageBox.alert('Failed to remove backup', 
          'There has to be at least one copy for each file');
        return;
      }
      
      var selMod=this.repl_grid.getSelectionModel();
      if (selMod.getCount()<1)
      {
        Ext.MessageBox.alert('Failed to remove backup', 
          'You must select a copy to remove');
        return;
      }
      var selectedResc=selMod.getSelected().get('resc_name');

      var req=new RODS.Requests();
      req.rm_replicate({
          ruri : this.ruri,
          resource: selectedResc,
          action: 'remove',
          callback : function() {
              this.repl_ds.reload();
          },
          scope : this
      });            
    },
    
    showReplDialog: function(btn)
    {
      var init_ruri = this.ruri;
      var rescBox = new RODSResourceBox();
      rescBox.init(init_ruri);    
      
      var replForm = new Ext.FormPanel({
        labelWidth: 100,
        width: 335,
        frame:true,
        defaultType: 'textfield',
        items: [rescBox.box]
      });
      
      var win = new Ext.Window({ 
        width: 335,
        height: 110,
        minWidth: 150,
        minHeight: 100,
        minimizable: true,
        title: 'Replicate to following resource',
        layout:'fit',
        items: 
            replForm,
            buttons:
              [
                {
                  text: 'OK',
                  handler:                     
                      function(){
                          var req = new RODS.Requests();
                          req.replicate({
                              ruri : init_ruri,
                              resource: rescBox.box.value,
                              action: 'add',
                              callback : function() {
                                  win.hide();
                                  this.repl_ds.reload();
                              }
                          });
                      }
                  },
                  {
                    text: 'Cancel',
                    handler: 
                        function(){
                            win.hide();
                    }
                  }  
              ]
        });
        win.on('minimize', function(){
              win.toggleCollapse();
        });
        win.show();         
    }
    
  }; //end of RODSFileViewer's reuturn  
} //end of RODSFileViewer

Ext.reg('rodsbrowser', RODS.BrowserPanel);
