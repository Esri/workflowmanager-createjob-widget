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
    'dojo/_base/array',
    'dojo/query',
    'dojo/on',
    'dojo/dom',
    'dojo/dom-class',
    'dojo/dom-construct',

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
    declare, lang, arrayUtil, domQuery, on, dom, domClass, domConstruct,
    BaseWidgetSetting, utils,
    _WidgetsInTemplateMixin, i18n,
    WMConfigurationTask, WMJobTask, Enum, JobQueryParameters) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

      baseClass: 'jimu-widget-wmxcreatejobs-setting',

      wmJobTask: null,
      wmConfigTask: null,

      jobTypeExtendedProperties: [],

      selectedJobTypes: {},
      selectedJobItemRow: null,

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
              domConstruct.empty(dom.byId('jobTypeSelect'));

              domConstruct.create('option', {
                innerHTML: i18n.selectJobTypePlaceholder,
                value: null,
                selected: true
              }, dom.byId('jobTypeSelect'), 'last')

              response.jobTypes.forEach(function(jobType) {
                if (jobType.state == Enum.JobTypeState.ACTIVE) {
                  self.jobTypes.push(jobType);

                  domConstruct.create('option', {
                    innerHTML: jobType.name,
                    value: jobType.id
                  }, dom.byId('jobTypeSelect'), 'last')
                }
              });

              on(dom.byId('jobTypeSelect'), "change", function(e) {
                self._updateJobItemType(e.target.value, e.target.selectedOptions[0].innerText);
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

      _onBtnAddItemClicked: function(){
        //create job type item
        var jobTypeItem = this._createJobItem();

        //select item
        this._onJobItemRowClicked(jobTypeItem);
      },

      _onJobItemRowClicked: function(jobTypeItem){
        this.selectedJobItemRow = jobTypeItem;
        var jobTypeId = this.selectedJobItemRow.dataset.id;

        arrayUtil.forEach(domQuery('.job-type-item.selected'), lang.hitch(this, function(arrayItem) {
          domClass.remove(arrayItem, 'selected');
        }));
        domClass.add(this.selectedJobItemRow, 'selected');

        //set the select to the correct option
        dom.byId('jobTypeSelect').value = jobTypeId || null;

        //generate the table rows with the optional fields
        this._createExtendedPropsTable(jobTypeId);
      },

      _createJobItem: function(jobTypeId) {
        var jobItemId = (jobTypeId || dom.byId('jobTypeSelect').value) + 'JobItemRow';
        var jobTypeItem = domConstruct.create('div', {
          class: 'job-type-item',
          id: jobItemId,
          dataset: {
            jobTypeId: dom.byId('jobTypeSelect').value || null
          }
        }, 'jobItemsCol', 'last');

        var jobName = domConstruct.create('p', {
          class: 'item-name item-name-unassigned',
          innerHTML: 'Select a job type...'
        }, jobTypeItem, 'first');

        var jobDeleteBtn = domConstruct.create('a', {
          class: 'item-button',
          innerHTML: '<img src="' + this.folderUrl + '/setting/css/images/remove-icon.png" width="12px" />'
        }, jobTypeItem, 'last');

        on(jobTypeItem, 'click', lang.hitch(this, function() {
          this._onJobItemRowClicked(jobTypeItem);
        }));

        on(jobDeleteBtn, 'click', lang.hitch(this, function(e) {
          e.preventDefault();
          e.stopPropagation();
          this._deleteJobTypeItem(jobTypeItem);
        }));

        this.selectedJobTypes[jobItemId] = {
          jobType: null,
          extendedProps: {}
        };

        return jobTypeItem;
      },

      _updateJobItemType: function(jobTypeId, jobTypeName) {
        // update the job item row id
        this.selectedJobItemRow.id = jobTypeId + 'JobItemRow';
        this.selectedJobItemRow.dataset.id = jobTypeId;

        this.selectedJobTypes[jobTypeId] = {
          jobType: jobTypeId
        };

        this.selectedJobTypes[jobTypeId].extendedProps = this.selectedJobTypes[jobTypeId].extendedProps || {}

        var rowTitle = domQuery('.item-name', this.selectedJobItemRow)[0];
        rowTitle.innerHTML = jobTypeName + ' - ' + jobTypeId;
        domClass.remove(rowTitle, '.item-name-unassigned');

        // update the props table
        this._createExtendedPropsTable(jobTypeId);
      },

      _createExtendedPropsTable: function(jobTypeId) {
        var props = this.jobTypeExtendedProperties[jobTypeId];
        domConstruct.empty('jobTypePropsTable');

        if (jobTypeId === "null" || jobTypeId === undefined) {
          domClass.add('singleSettingContent', 'no-type-selected');
        } else {
          domClass.remove('singleSettingContent', 'no-type-selected');
        }

        if (props) {
          arrayUtil.forEach(props, lang.hitch(this, function(prop) {
            var propsRow = domConstruct.create('tr', {}, 'jobTypePropsTable', 'last');

            var propCheckbox = domConstruct.create('td', {
              innerHTML: '<input type="checkbox" ' + (this.selectedJobTypes[jobTypeId].extendedProps && this.selectedJobTypes[jobTypeId].extendedProps[prop.fieldName] ? 'checked' : null) + ' />'
            }, propsRow, 'first');

            on(propCheckbox, 'click', lang.hitch(this, function(e) {
              if (e.srcElement.checked) {
                this.selectedJobTypes[jobTypeId].extendedProps[prop.fieldName] = prop;
              } else {
                this.selectedJobTypes[jobTypeId].extendedProps[prop.fieldName] = null;
              }
            }));

            domConstruct.create('td', {
              innerHTML: prop.fieldName
            }, propsRow, 'last');

            domConstruct.create('td', {
              innerHTML: prop.fieldAlias
            }, propsRow, 'last');
          }));
        } else {
          var propsRow = domConstruct.create('tr', {}, 'jobTypePropsTable', 'last');
          var propCheckbox = domConstruct.create('td', {
            colspan: '3',
            style: 'text-align: center; padding: 10px;',
            innerHTML: '<span class="hint-text">There are no extended props for this job type</span>'
          }, propsRow, 'first');
        }
      },

      _updateJobItemExtendedProps: function(jobType, prop, isChecked) {
        if (e.checked) {
          this.jobTypeItem[jobType].extendedProps[prop.fieldName] = prop;
        } else {
          this.jobTypeItem[jobType].extendedProps[prop.fieldName] = null;
        }
      },

      _deleteJobTypeItem: function(e) {
        console.log('jobTypeRow', e, e.dataset.id);
        this.selectedJobTypes[e.dataset.id] = null;
        domConstruct.destroy(e);
        this.selectedJobItemRow = null;

        this._resetTableSelect();
      },

      _resetTableSelect: function() {
        this._createExtendedPropsTable(null);
        dom.byId('jobTypeSelect').value = null;
      }
    });
  });
