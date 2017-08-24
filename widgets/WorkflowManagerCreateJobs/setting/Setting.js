///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    'dojo/_base/declare',
    'jimu/BaseWidgetSetting',
    'jimu/utils',
    'dijit/_WidgetsInTemplateMixin'
  ],
  function(
    declare,
    BaseWidgetSetting,
    utils,
    _WidgetsInTemplateMixin) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

      baseClass: 'jimu-widget-wmxcreatejobs-setting',

      startup: function() {
        this.inherited(arguments);
        this.setConfig(this.config);
      },

      setConfig: function(config) {
        this.config = config;

        if (config.wmServiceUrl) {
          this.wmServiceUrl.set('value', config.wmServiceUrl);
        } else {
          this.wmServiceUrl.set('value', "Workflow Mananager Service URL");
        }

        if (config.selectableLayer) {
          this.selectableLayer.set('value', config.selectableLayer);
        } else {
          this.selectableLayer.set('value', "Select Layer URL");
        }

        if (config.defaultUser) {
          this.defaultUser.set('value', config.defaultUser);
        } else {
          this.defaultUser.set('value', "Username to for submitting job requests");
        }

        if (config.definLOILabel) {
            this.definLOILabel.set('value', config.definLOILabel);
        } else {
            this.definLOILabel.set('value', "Define Location");
        }

        if (config.attachmentsLabel) {
          this.attachmentsLabel.set('value', config.attachmentsLabel);
        } else {
          this.attachmentsLabel.set('value', "Attachments");
        }

        if (config.extPropsLabel) {
          this.extPropsLabel.set('value', config.extPropsLabel);
        } else {
          this.extPropsLabel.set('value', "Extended Properties");
        }
      },

      getConfig: function() {
        this.config.wmServiceUrl = this.wmServiceUrl.getValue();
        this.config.selectableLayer = this.selectableLayer.getValue();
        // this.config.wmxcomments = this.wmxcomments.getValue();
        this.config.defaultUser = this.defaultUser.getValue();

        this.config.definLOILabel = this.definLOILabel.getValue();
        this.config.attachmentsLabel = this.attachmentsLabel.getValue();
        this.config.extPropsLabel = this.extPropsLabel.getValue();

        return this.config;
      },

      _onWMXURLBlur: function() {
        this.wmServiceUrl.set('value', this.wmServiceUrl.get('value'));
      },

      _onSelectLayerBlur: function() {
        this.selectableLayer.set('value', this.selectableLayer.get('value'));
      },

      _onRequestUserBlur: function() {
        this.defaultUser.set('value', this.defaultUser.get('value'));
      },

      _onBtnSetSourceClicked: function() {
        // TODO Update settings with new info from WMX Server URL
        // 1.  Retrieve job types
        // 2.  Retrieve extended properties per job type
      },

      _onListContentClicked: function(event){
        var target = event.target || event.srcElement;
        var itemDom = jimuUtils.getAncestorDom(target, function(dom){
          return html.hasClass(dom, 'item');
        }, 3);
        if(!itemDom){
          return;
        }
        if(html.hasClass(target, 'action')){
          if(html.hasClass(target, 'up')){
            if(itemDom.previousElementSibling){
              html.place(itemDom, itemDom.previousElementSibling, 'before');
            }
          }else if(html.hasClass(target, 'down')){
            if(itemDom.nextElementSibling){
              html.place(itemDom, itemDom.nextElementSibling, 'after');
            }
          }else if(html.hasClass(target, 'delete')){
            if(this.singleSetting && this.singleSetting.target === itemDom){
              this.singleSetting.destroy();
              this.singleSetting = null;
            }
            html.destroy(itemDom);
            var filterItemDoms = query('.item', this.listContent);
            if(filterItemDoms.length > 0){
              this._createSingleSetting(filterItemDoms[0]);
            }
            this._updateNoQueryTip();
          }
          return;
        }

        if (this.singleSetting) {
          if (this.singleSetting.target !== itemDom) {
            var singleConfig = this.singleSetting.getConfig();
            if (singleConfig) {
              this.singleSetting.destroy();
              this.singleSetting = null;
              this._createSingleSetting(itemDom);
            }
          }
        } else {
          this._createSingleSetting(itemDom);
        }
      },

      _onBtnAddItemClicked: function(){
        // TODO Implement adding a new item.  Copied from Filter widget
        // if(this.singleSetting){
        //   var singleConfig = this.singleSetting.getConfig();
        //   if(singleConfig){
        //     this.singleSetting.destroy();
        //     this.singleSetting = null;
        //   }else{
        //     return;
        //   }
        // }
        //
        // var target = this._createTarget();
        // this._createSingleSetting(target, null);
      },

      _createSingleSetting: function(target) {
        // TODO Create a new entry in the UI and save configuration
      }
    });
  });