// Create user extensions namespace (Ext.ux)
Ext.namespace('RODS');

RODS.Desktop = function(cfg){
  if (!cfg)
  {
    cfg = {};
  }
  var default_config = {
   //add more if needed  
   //cls: 'z-desktop',
   //hideBorders: true
  };
  
  Ext.applyIf(cfg, default_config);
  Ext.apply(this, cfg);
  RODS.Desktop.superclass.constructor.call(this);
  
};

Ext.extend(RODS.Desktop, Ext.util.Observable, {  
  init : function()
  {
    this.addEvents({
      'RURI_changed': true
    });
    
    // initiate user preference and account manager etc.
    LRPHandler=new LRPProgressWindow();
    MyPref=new UserPref();
    MyPref.init();
    
    // initiate PHP session manager (keep user log on til window close)
    SSManager=new PHPSessionManager();
    SSManager.init();

    MyInfoWindow=new RODS.ShibInfoWindow({renderTo: document.body});
    MyInfoWindow.init();    
    
    MyAcctWindow=new RODS.ShibWindow({renderTo: document.body});
    MyAcctWindow.init();
    MyAcctWindow.mask.addClass('z-account-mask');
        
    // handler when account log in
    MyAcctWindow.on('acct_auth_success', function(acct_window, acct){
      var acct_ruri=acct.toIdentifier();
      var full_ruri=acct_ruri+acct.initPath;
      
      acct_window.mask.removeClass('z-account-mask');
      
      var browser=this.appmgr.getBrowserByAcct(acct);
      browser.show();
      
      MyPref.activeAccount=acct;

    }, this);
    this.initHeaderBar();
    
    
    this.viewport = new Ext.Viewport({
      layout:'border',
      items:[
        this.headerBar,
        { 
            id: 'app-container',
            xtype: 'appcontainer',
            region:'center',
            el: Ext.get('center'),
            listeners: {
              'RURI_changed' : {
                fn: function(ruri){
                  this.RURIChangeHandler(ruri);
                },
                scope: this
              }
            } 
        }
      ]
    
    });
    
    this.viewport.doLayout();
    this.appmgr=Ext.ComponentMgr.get('app-container');
    AppMgr=this.appmgr;
    
    if (this.init_ruri)
    {
      MyAcctWindow.connectByRURI(this.init_ruri);
    }
    else
      MyAcctWindow.show(); 
    
    
  }, // end of init
  
  setRURI : function(ruri)
  {
    if ( (this.ruri)&&(this.ruri==ruri) )
      return;
      
    if (ruri.length<3)
    {
      MyAcctWindow.show();
      return;
    }  
    
    this.appmgr.setRURI(ruri);
    
  },
  
  RURIChangeHandler : function (ruri){
    if ( (this.ruri)&&(this.ruri==ruri) )
      return;
    this.ruri=ruri;
    this.fireEvent('RURI_changed', ruri);
  },
  
  initHeaderBar : function()
  {
    this.headerBar=new Ext.Toolbar({
      region : 'north',
      height: 35, 
      cls : 'z-headerbar',
      renderTo : 'north'
    });
        
    // build Option menu
    this.optMenu=new Ext.menu.Menu({name: 'opt_menu', items:[
      { text: 'Shibboleth Information',
        handler : function() {
          MyInfoWindow.show();
        }
      }
      ]
    });
    
    if (CLIENT_LOG) // add log in "Options.." menu, if configured
    {
      this.optMenu.add(
        { 
          text: 'Show Log',
          handler: function(){
            var logWindow= Ext.ComponentMgr.get('log-window');
            if (logWindow!=null)
            {
              //logWindow.setSize(640,300);
              logWindow.show(); 
              logWindow.center();
            }
            else
            {
              Ext.Msg.alert('Error', 'Log window not defined!');  
            }
          } 
        }  
      );
    }
    
    this.headerBar.add(
      'Shibboleth Integrated iRODS Browser',
      '->',
      new Ext.Toolbar.Button({text: 'Options...', cls : "x-btn-text", 
        menu: this.optMenu
      }),
      '',
      new Ext.Toolbar.Button({
        cls : "x-btn-text-icon",
        text : "Exit",
        iconCls : 'z-power-white-button-icon',
        handler : function(){
          window.location = "./logout.php";
        },
        listeners: {
          'mouseover': {
            fn: function() {this.setIconClass('z-power-blue-button-icon');}
          },
          'mouseout': {
            fn: function() {this.setIconClass('z-power-white-button-icon');}
          }
        }
      })
    ); 
      
  }
  
});
