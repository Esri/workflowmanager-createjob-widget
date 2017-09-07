///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    'dojo/_base/declare',
    'dojo/_base/lang',

    'jimu/BaseWidgetSetting',
    'jimu/utils',

    'dijit/_WidgetsInTemplateMixin',
    'dojo/i18n!./nls/strings',

    '../libs/workflowmanager/WMConfigurationTask',
    '../libs/workflowmanager/WMJobTask',
    '../libs/workflowmanager/Enum',
    '../libs/workflowmanager/supportclasses/JobQueryParameters'
  ],
  function(
    declare, lang,
    BaseWidgetSetting, utils,
    _WidgetsInTemplateMixin, i18n,
    WMConfigurationTask, WMJobTask, Enum, JobQueryParameters) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

      baseClass: 'jimu-widget-wmxcreatejobs-setting',

      wmJobTask: null,
      wmConfigTask: null,

      jobTypeExtendedProperties: [],

      // Query constants
      QUERY_FIELDS: 'JTX_JOB_TYPES.JOB_TYPE_ID,JTX_JOB_TYPES.JOB_TYPE_NAME,JTX_AUX_PROPS.TABLE_NAME, JTX_AUX_PROPS.FIELD_NAME,\
        JTX_AUX_PROPS.FIELD_ALIAS_NAME,JTX_AUX_PROPS.FIELD_DOMAIN,JTX_AUX_PROPS.DISPLAY_TYPE,JTX_AUX_PROPS.DEFAULT_VALUE,JTX_AUX_PROPS.REQUIRED',
      QUERY_TABLES: 'JTX_JOB_TYPES, JTX_AUX_PROPS',
      QUERY_WHERE: 'JTX_JOB_TYPES.JOB_TYPE_ID = JTX_AUX_PROPS.JOB_TYPE_ID AND JTX_AUX_PROPS.JOB_TYPE_ID in ({0})',
      QUERY_ORDER_BY: 'JTX_JOB_TYPES.job_type_id',

      startup: function() {
        this.inherited(arguments);
        this.setConfig(this.config);
      },

      setConfig: function(config) {
        this.config = config;

        if (config.wmServiceUrl) {
          this.wmServiceUrl.set('value', config.wmServiceUrl);
        } else {
          // TODO How to localize this
          this.wmServiceUrl.set('value', i18n.workflowManagerServiceUrl);
        }

        if (config.selectableLayer) {
          this.selectableLayer.set('value', config.selectableLayer);
        } else {
          this.selectableLayer.set('value', 'Select Layer URL');
        }

        if (config.defaultUser) {
          this.defaultUser.set('value', config.defaultUser);
        } else {
          this.defaultUser.set('value', 'Username to for submitting job requests');
        }

        if (config.definLOILabel) {
            this.definLOILabel.set('value', config.definLOILabel);
        } else {
            this.definLOILabel.set('value', 'Define Location');
        }

        if (config.attachmentsLabel) {
          this.attachmentsLabel.set('value', config.attachmentsLabel);
        } else {
          this.attachmentsLabel.set('value', 'Attachments');
        }

        if (config.extPropsLabel) {
          this.extPropsLabel.set('value', config.extPropsLabel);
        } else {
          this.extPropsLabel.set('value', 'Extended Properties');
        }
      },

      getConfig: function() {
        this.config.wmServiceUrl = this.wmServiceUrl.getValue();
        this.config.selectableLayer = this.selectableLayer.getValue();
        this.config.defaultUser = this.defaultUser.getValue();

        this.config.definLOILabel = this.definLOILabel.getValue();
        this.config.attachmentsLabel = this.attachmentsLabel.getValue();
        this.config.extPropsLabel = this.extPropsLabel.getValue();

        this.config.jobTypes = this.jobTypes;
        this.config.jobTypeExtendedProperties = this.jobTypeExtendedProperties;

        return this.config;
      },

      _onSelectLayerBlur: function() {
        this.selectableLayer.set('value', this.selectableLayer.get('value'));
      },

      _onRequestUserBlur: function() {
        this.defaultUser.set('value', this.defaultUser.get('value'));
      },

      _onBtnSetSourceClicked: function() {
        // TODO Should we clear out previously set job type configurations before checking the newly entered url
        //  is valid?
        var serviceUrl = this.wmServiceUrl.get('value');
        serviceUrl = serviceUrl ? serviceUrl.trim() : serviceUrl;
        this.wmServiceUrl.set('value', serviceUrl);

        if (!serviceUrl) {
          console.error('Invalid service url entered: ' + serviceUrl);
          // TODO Provide error message in UI
          return;
        }

        // Retrieve workflow configuration
        this._loadConfiguration(serviceUrl);
      },

      _loadConfiguration: function(serviceUrl) {
        var self = lang.hitch(this);
        this.jobTypes = [];
        this.wmJobTask = new WMJobTask(serviceUrl);
        this.wmConfigTask = new WMConfigurationTask(serviceUrl);
        this.wmConfigTask.getServiceInfo(
          function (response) {
            // Filter on active job types
            if (response.jobTypes && response.jobTypes.length > 0) {
              response.jobTypes.forEach(function(jobType) {
                if (jobType.state == Enum.JobTypeState.ACTIVE) {
                  self.jobTypes.push(jobType);
                }
              });
            }

            if (self.jobTypes.length == 0) {
              // TODO Provide UI feedback to user
              console.log('No active job types found.');
            } else {
              // TODO Should we retrieve job properties for all job types, or load them as the users
              //    selects one from the dropdown?
              // Retrieve extended properties for the job types
              self._loadExtendedPropertiesForJobTypes();
            }
          },
          function (error) {
            console.error('Unable to load job types from service: ' + self.wmServiceUrl, error);
            // TODO Provide error message in UI to let user know
          });
      },

      // Retrieve extended properties for each job type
      _loadExtendedPropertiesForJobTypes: function() {
        this.jobTypeExtendedProperties = [];
        var requests = [];
        // Create a request to retrieve the extended properties for the job types
        var jobTypeIds = this.jobTypes.map(function(jobType) {
          return jobType.id;
        });
        var parameters = new JobQueryParameters();
        parameters.fields = this.QUERY_FIELDS;
        parameters.tables = this.QUERY_TABLES;
        parameters.where = this.QUERY_WHERE.replace('{0}', jobTypeIds.join());
        parameters.orderBy = this.QUERY_ORDER_BY;

        // TODO Do we check the user credentials here or rely on user input in the config setting
        var user = this.defaultUser.get('value');
        this.user = user ? user.trim() : user;
        this.wmJobTask.queryJobsAdHoc(parameters, this.user,
          lang.hitch(this, function(response) {
            var extProps = (response && response.rows) ? response.rows : [];
            if (extProps.length == 0) {
              // TODO Populate UI
              console.log('Unable to retrieve any extended properties for job types');
              return;
            }
            // Group results by job type Id
            this.jobTypeExtendedProperties = extProps.reduce(function(acc, item) {
              var key = item[0];  // job type id
              acc[key] = acc[key] || [];
              acc[key].push({
                jobTypeName: item[1],
                tableName: item[2],
                fieldName: item[3],
                fieldAlias: item[4],
                fieldDomain: item[5],
                displayType: item[6],
                defaultValue: item[7],
                required: item[8],
                value: null
              });
              return acc;
            }, {});
            console.log('jobTypeExtendedProperties = ', this.jobTypeExtendedProperties);
          }),
          function(error) {
            console.log('Unable to retrieve any extended properties for job types', error);
          });
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