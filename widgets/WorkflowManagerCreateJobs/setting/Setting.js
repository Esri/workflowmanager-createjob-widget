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

        if (config.wmxserviceurl) {
          this.wmxserviceurl.set('value', config.wmxserviceurl);
        } else {
          this.wmxserviceurl.set('value', "WMX URL");
        }

        if (config.selectableLayer) {
          this.selectableLayer.set('value', config.selectableLayer);
        } else {
          this.selectableLayer.set('value', "Select Layer URL");
        }

        if (config.wmxcomments) {
          this.wmxcomments.set('value', config.wmxcomments);
        } else {
          this.wmxcomments.set('value', "Notes or Description");
        }

        if (config.wmxrequestuser) {
          this.wmxrequestuser.set('value', config.wmxrequestuser);
        } else {
          this.wmxrequestuser.set('value', "Username to for submitting job requests");
        }
      },

      getConfig: function() {
      	this.config.wmxserviceurl = this.wmxserviceurl.getValue();
        this.config.selectableLayer = this.selectableLayer.getValue();
      	this.config.wmxcomments = this.wmxcomments.getValue();
      	this.config.wmxrequestuser = this.wmxrequestuser.getValue();

        return this.config;
      }, 

      _onWMXURLBlur: function() {
        this.wmxserviceurl.set('value', this.wmxserviceurl.get('value'));
      },

      _onSelectLayerBlur: function() {
        this.selectableLayer.set('value', this.selectableLayer.get('value'));
      },

      _onCommentsBlur: function() {
        this.wmxcomments.set('value', this.wmxcomments.get('value'));
      },

      _onRequestUserBlur: function() {
        this.wmxrequestuser.set('value', this.wmxrequestuser.get('value'));
      }
    });
  });