///////////////////////////////////////////////////////////////////////////
// Copyright © 2017 Esri. All Rights Reserved.
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
    'dojo/promise/all',
    'dijit/registry',

    'jimu/BaseWidgetSetting',
    'jimu/utils',

    'dijit/_WidgetsInTemplateMixin',

    'esri/request',
    'esri/IdentityManager',

    '../libs/workflowmanager/WMConfigurationTask',
    '../libs/workflowmanager/WMJobTask',
    '../libs/workflowmanager/Enum',
    '../libs/workflowmanager/supportclasses/JobQueryParameters'
  ],
  function(
    declare, lang, arrayUtil, domQuery, on, dom, domClass, domConstruct, all, registry,
    BaseWidgetSetting, utils,
    _WidgetsInTemplateMixin,
    esriRequest, IdentityManager,
    WMConfigurationTask, WMJobTask, Enum, JobQueryParameters) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

      baseClass: 'jimu-widget-wmxcreatejobs-setting',

      serviceUrl: null,
      serviceConfiguration: null,
      wmJobTask: null,
      wmConfigTask: null,

      jobTypeExtendedProperties: {},

      selectedJobTypes: {},
      selectedJobItemRow: null,

      // Query constants
      QUERY_FIELDS: 'JTX_JOB_TYPES.JOB_TYPE_ID,JTX_JOB_TYPES.JOB_TYPE_NAME,JTX_JOB_TYPES.DESCRIPTION,JTX_AUX_PROPS.TABLE_NAME,' +
        'JTX_AUX_PROPS.FIELD_NAME,JTX_AUX_PROPS.FIELD_ALIAS_NAME,JTX_AUX_PROPS.FIELD_DOMAIN,JTX_AUX_PROPS.DISPLAY_TYPE,' +
        'JTX_AUX_PROPS.DEFAULT_VALUE,JTX_AUX_PROPS.REQUIRED,JTX_PROP_RELATIONSHIPS.CARDINALITY',
      QUERY_TABLES: 'JTX_JOB_TYPES,JTX_AUX_PROPS,JTX_PROP_RELATIONSHIPS',
      // Match on cardinality 1-1, excluding properties that cannot be updated or is not visible
      QUERY_WHERE: 'JTX_JOB_TYPES.JOB_TYPE_ID = JTX_AUX_PROPS.JOB_TYPE_ID AND JTX_AUX_PROPS.TABLE_NAME = JTX_PROP_RELATIONSHIPS.TABLE_NAME ' +
        'AND JTX_PROP_RELATIONSHIPS.CARDINALITY <> 2 AND JTX_AUX_PROPS.CAN_UPDATE <> 0 AND JTX_AUX_PROPS.IS_VISIBLE <> 0',
      QUERY_ORDER_BY: 'JTX_JOB_TYPES.job_type_id',

      startup: function() {
        this.inherited(arguments);
        this.setConfig(this.config);

        if (dom.byId('wmServiceUrl').value) {
          this._onBtnSetSourceClicked();
        }

        on(dom.byId('allVisibleCheckbox'), 'click', lang.hitch(this, function(e) {
          var selectedId = this.selectedJobItemRow.dataset.id;
          // Update config
          if (e.srcElement.checked) {
            this.selectedJobTypes[selectedId].extendedProps = this.jobTypeExtendedProperties[selectedId].slice();
          } else {
            this.selectedJobTypes[selectedId].extendedProps = [];
          }
          this._createExtendedPropsTable(selectedId);
        }));

        on(dom.byId('WMXSettingsErrorBtn'), 'click', lang.hitch(this, this._hideErrorMessage));

        this._initIconSelect();
      },

      setConfig: function(config) {
        this.config = config;

        if (config.wmServiceUrl) {
          this.wmServiceUrl.set('value', config.wmServiceUrl);
        }

        if (config.selectableLayer) {
          this.selectableLayer.set('value', config.selectableLayer);
        } else {
          this.selectableLayer.set('value', this.nls.selectLayerUrl);
        }

        if (config.authenticationMode && (config.authenticationMode === 'portal' || config.authenticationMode === 'server')) {
          this.authenticationMode = config.authenticationMode;
        } else {
          this.authenticationMode = 'none';
        }
        this.authenticationSelection.set('value', this.authenticationMode);

        if (config.defaultUser) {
          this.defaultUser.set('value', config.defaultUser);
        } else {
          this.defaultUser.set('value', this.nls.defaultUserPlaceholder);
        }

        if (config.defineLOILabel) {
            this.defineLOILabel.set('value', config.defineLOILabel);
        } else {
            this.defineLOILabel.set('value', this.nls.defaultDefineLOILabel);
        }

        if (config.extPropsLabel) {
          this.extPropsLabel.set('value', config.extPropsLabel);
        } else {
          this.extPropsLabel.set('value', this.nls.defaultExtPropsLabel);
        }

        if (config.allowAttachments && config.allowAttachments === true) {
          this.cbxAttachments.setValue(true);
        } else {
          this.cbxAttachments.setValue(false);
        }

        if (config.attachmentsLabel) {
          this.attachmentsLabel.set('value', config.attachmentsLabel);
        } else {
          this.attachmentsLabel.set('value', this.nls.defaultAttachmentsLabel);
        }

        var hasMapServiceConfigured = !!(config.wmMapServiceUrl && config.wmMapServiceUrl.trim() !== '');
        this.cbxWMMapServiceConfigured.set('value', hasMapServiceConfigured);
        if (config.wmMapServiceUrl) {
          this.wmMapServiceUrl.set('value', config.wmMapServiceUrl);
        }
        if (config.poiLayerId) {
          this.poiLayerId.set('value', config.poiLayerId);
        }
        if (config.aoiLayerId) {
          this.aoiLayerId.set('value', config.aoiLayerId);
        }

        if (config.selectedJobTypes) {
          this.selectedJobTypes = config.selectedJobTypes;
        } else {
          this.selectedJobTypes = {};
          this._onJobItemRowClicked(this._createJobItem());
        }

        if (config.maxAttachmentSize) {
          this.maxFileSize.set('value', config.maxAttachmentSize);
        } else {
          this.maxFileSize.set('value', 0);
        }
      },

      getConfig: function() {
        this.config.wmServiceUrl = this.wmServiceUrl.getValue();
        this.config.selectableLayer = this.selectableLayer.getValue();
        this.config.defaultUser = this.defaultUser.getValue();
        this.config.authenticationMode = this.authenticationMode;

        this.config.defineLOILabel = this.defineLOILabel.getValue();
        this.config.attachmentsLabel = this.attachmentsLabel.getValue();
        this.config.extPropsLabel = this.extPropsLabel.getValue();

        this.config.allowAttachments = this.cbxAttachments.getValue();
        this.config.maxAttachmentSize = this.maxFileSize.get('value');

        var mapServiceConfigured = this.cbxWMMapServiceConfigured.getValue();
        this.config.wmMapServiceUrl = mapServiceConfigured ? this.wmMapServiceUrl.getValue() : null;
        this.config.poiLayerId = mapServiceConfigured ? this.poiLayerId.getValue() : null;
        this.config.aoiLayerId = mapServiceConfigured ? this.aoiLayerId.getValue() : null;

        this.config.jobTypes = this.jobTypes;
        this.config.jobTypeExtendedProperties = this.jobTypeExtendedProperties;

        // Clean up null job type
        delete this.selectedJobTypes['nullJobItemRow'];
        this.config.selectedJobTypes = this.selectedJobTypes;

        return this.config;
      },

      _initIconSelect: function() {
        registry.byId('jobTypeIconSelect').set('options', [
          { value:"", label: "None"},
          { value:"exclamation-triangle", label: "<i class='fa fa-exclamation-triangle'></i>"},
          { value:"bell", label: "<i class='fa fa-bell'></i>"},
          { value:"check", label: "<i class='fa fa-check'></i>"},
          { value:"car", label: "<i class='fa fa-car'></i>"},
          { value:"building", label: "<i class='fa fa-building'></i>"},
          { value:"plane", label: "<i class='fa fa-plane'></i>"},
          { value:"male", label: "<i class='fa fa-male'></i>"},
          { value:"female", label: "<i class='fa fa-female'></i>"},
          { value:"wheelchair", label: "<i class='fa fa-wheelchair'></i>"},
          { value:"road", label: "<i class='fa fa-road'></i>"}
        ]);

        on(registry.byId('jobTypeIconSelect'), 'change', lang.hitch(this, function(e) {
          var currentId = this.selectedJobItemRow.dataset.id;
          if (currentId && this.selectedJobTypes[currentId]) {
            this._updateJobItemType(currentId, this.selectedJobTypes[currentId].jobTypeName, e)
          }
        }));
      },

      // TODO Are these _onXXXBlur methods needed?  These 2 methods seem to be used in multiple locations, not
      // tied to the correct dom elements

      _onSelectLayerBlur: function() {
        this.selectableLayer.set('value', this.selectableLayer.get('value'));
      },

      _onRequestUserBlur: function() {
        this.defaultUser.set('value', this.defaultUser.get('value'));
      },

      _onBtnSetSourceClicked: function() {
        var serviceUrl = this.wmServiceUrl.get('value');
        serviceUrl = serviceUrl ? serviceUrl.trim() : serviceUrl;
        this.wmServiceUrl.set('value', serviceUrl);
        if (serviceUrl === this.serviceUrl) {
          // Service url hasn't changed
          return;
        }

        // Clear out previously set job type configurations and update serviceUrl
        this._resetJobTypes();
        this.serviceUrl = serviceUrl;

        if (!serviceUrl) {
          console.error('Invalid service URL entered: ' + serviceUrl);
          this._showErrorMessage(this.nls.errorInvalidServiceUrl);
          return;
        }

        // Retrieve workflow server configuration
        this._loadConfiguration();
      },

      _loadConfiguration: function() {
        this.jobTypes = [];
        this.wmJobTask = new WMJobTask(this.serviceUrl);
        this.wmConfigTask = new WMConfigurationTask(this.serviceUrl);
        this._loadServerConfiguration();
        this._checkMapService();
      },

      _loadServerConfiguration: function() {
        this.wmConfigTask.getServiceInfo(
          lang.hitch(this, function (response) {
            this.serviceConfiguration = response;
            // Validate user
            this._validateUser();
          }),
          lang.hitch(this, function (error) {
            console.log('Unable to connect to Workflow Manager Server: ' + this.serviceUrl, error);
            this._showErrorMessage(this.nls.errorUnableToConnectToWMServer.replace('{0}', this.serviceUrl));
          }));
      },

      _validateUser: function() {
        var self = lang.hitch(this);
        this.authenticationMode = this.authenticationSelection.get('value');

        if (this.authenticationMode === 'portal' || this.authenticationMode === 'server') {
          // Get user credentials from the service
          IdentityManager.getCredential(this.serviceUrl)
            .then(
              function (response) {
                self.userCredential = response;
                self.user = response.userId;
                self._validateUsername();
              },
              function (error) {
                console.error("Unable to retrieve user credentials", error);
                self._showErrorMessage(self.nls.errorInvalidUserCredentials);
              });
        } else {
          // Use default user as the user
          this.user = this.defaultUser.get('value') ? this.defaultUser.get('value').trim() : this.defaultUser.get('value');
          this._validateUsername();
        }
      },

      _validateUsername: function() {
        this.wmConfigTask.getUser(this.user,
          lang.hitch(this, function (response) {
            this.userInfo = response;

            // TODO Do we need to check admin privileges for setting up the widget?
            // Make sure user is an administrator
            // var isAdministrator = this.userInfo.privileges.some(function(privilege) {
            //   return 'AdministratorAccess' === privilege.name;
            // });
            // if (!isAdministrator) {
            //   this._showErrorMessage(this.nls.errorUserNoAdministratorPrivilege.replace('{0}', this.user));
            //   return;
            // }

            // Filter on active job types
            this._initializeJobTypes(this.serviceConfiguration.jobTypes);
          }),
          lang.hitch(this, function (error) {
            console.log('Not a valid user in the Workflow Manager system: ' + this.user, error);
            this._showErrorMessage(this.nls.errorUserInvalid.replace('{0}', this.user));
          }));
      },

      _initializeJobTypes: function(jobTypes) {
        var self = lang.hitch(this);
        if (!jobTypes || jobTypes.length === 0) {
          console.error('No job types returned from service: ' + this.wmServiceUrl);
          this._showErrorMessage(this.nls.errorNoJobTypesReturned.replace('{0}', this.wmServiceUrl));
        }

        var jobTypeSelect = registry.byId('jobTypeSelect');
        jobTypeSelect.set('options', []);

        var jobTypeOptionsArr = [];
        jobTypeOptionsArr.push({
          value: null,
          label: this.nls.selectJobTypePlaceholder,
          selected: true
        });

        jobTypes.sort(function(a, b) {
          if(a.name < b.name) {
            return -1;
          }
          if(a.name > b.name) {
            return 1;
          }
          return 0;
        }).forEach(function(jobType) {
          if (jobType.state === Enum.JobTypeState.ACTIVE) {
            self.jobTypes.push(jobType);

            jobTypeOptionsArr.push({
              value: jobType.id,
              label: jobType.name,
              disabled: (!!self.selectedJobTypes[jobType.id] )
            });
          }
        });

        jobTypeSelect.set('options', jobTypeOptionsArr);

        self.selectChangeEvent = on.pausable(registry.byId('jobTypeSelect'), 'change', function(e) {
          if (e && e.toString() !== self.selectedJobItemRow.dataset.id) {
            var selectedValue = e;
            var selectedOption = self.jobTypes.filter(function(item) {
              return item.id === e;
            });
            var selectedText = selectedOption[0].name;

            // Since we're changing an option, we need to delete the old value
            self._deleteJobTypeItem(self.selectedJobItemRow);

            // Now create the new one if it doesn't exist
            if (!self.selectedJobTypes[selectedValue]) {
              self._onJobItemRowClicked(self._createJobItem());
            }

            // Just update it if it does exist
            self._updateJobItemType(selectedValue, selectedText);

            // Reselect the row so the ui updates properly
            self._onJobItemRowClicked(self.selectedJobItemRow);

            // Update select options disabled prop
            self._updateSelectOptionsDisabled();
          }
        });

        if (self.jobTypes.length === 0) {
          // TODO Provide UI feedback to user
          console.log('No active job types found.');
          self._showErrorMessage(self.nls.errorNoActiveJobTypes);
        } else {
          // Retrieve extended properties for the job types
          self._loadExtendedPropertiesForJobTypes();
        }
      },

      _checkMapService: function() {
        // Verify that the Workflow Manager map service is valid
        var self = lang.hitch(this);
        var mapServiceConfigured = this.cbxWMMapServiceConfigured.getValue();
        if (mapServiceConfigured && mapServiceConfigured === true) {
          var mapServiceUrl = this.wmMapServiceUrl.getValue();
          if (!mapServiceUrl || mapServiceUrl.trim() === '') {
            self._showErrorMessage(self.nls.errorInvalidMapServiceUrlOrLayerId);
            return;
          }
          var poiLayerId = this.poiLayerId.getValue();
          var aoiLayerId = this.aoiLayerId.getValue();

          var promises = [];
          promises.push(esriRequest({
            url: mapServiceUrl,
            content: {f: "json"},
            handleAs: "json",
            callbackParamName: "callback"
          }));
          if (parseInt(poiLayerId) !== NaN) {
            promises.push(esriRequest({
                url: this._concatenateUrl(mapServiceUrl, poiLayerId),
                content: {f: "json"},
                handleAs: "json",
                callbackParamName: "callback"
              }));
          }
          if (parseInt(aoiLayerId) !== NaN) {
            promises.push(esriRequest({
              url: this._concatenateUrl(mapServiceUrl, aoiLayerId),
              content: {f: "json"},
              handleAs: "json",
              callbackParamName: "callback"
            }));
          }

          all(promises).then(
            function(results) {
              results.some(function(result) {
                if (result.error) {
                  // Found an error with one of the URLs, display error
                  self._showErrorMessage(self.nls.errorInvalidMapServiceUrlOrLayerId);
                }
              });
            }, function(error) {
              self._showErrorMessage(self.nls.errorInvalidMapServiceUrlOrLayerId);
            });
        }
      },

      _concatenateUrl: function(baseUrl, appendUrl) {
        if (baseUrl && baseUrl.length > 0 && baseUrl.lastIndexOf("/") === baseUrl.length - 1) {
            // slash already at the end of baseUrl
            return baseUrl += appendUrl;
        }
        return baseUrl + "/" + appendUrl;
      },

      // Retrieve extended properties for each job type
      _loadExtendedPropertiesForJobTypes: function() {
        this.jobTypeExtendedProperties = {};
        // Create a request to retrieve the extended properties for the job types
        var parameters = new JobQueryParameters();
        this._populateQueryParameters(parameters);

        this.wmJobTask.queryJobsAdHoc(parameters, this.user,
          lang.hitch(this, function(response) {
            var extProps = (response && response.rows) ? response.rows : [];
            if (extProps.length === 0) {
              console.log('No extended properties returned for job types');
              return;
            }
            // Group results by job type Id
            this.jobTypeExtendedProperties = extProps.reduce(function(acc, item) {
              // ExtendedPropertyDisplayType: {
              //   DEFAULT: 0,
              //     TEXT: 1,
              //     DATE: 2,
              //     DOMAIN: 4,
              //     FILE: 5,
              //     GEO_FILE: 6,
              //     FOLDER: 7,
              //     LIST: 8,
              //     TABLE_LIST: 9,
              //     MULTI_LEVEL_TABLE_LIST: 10
              // },
              var displayType = item[7];
              // Disable unsupported types
              //   DOMAIN: 4, GEO_FILE: 6, MULTI_LEVEL_TABLE_LIST: 10
              if (displayType !== '4' && displayType !== '6' && displayType !== '10') {
                var key = item[0];  // job type id
                acc[key] = acc[key] || [];
                acc[key].push({
                  jobTypeName: item[1],
                  description: item[2],
                  tableName: item[3],
                  fieldName: item[4],
                  fieldAlias: item[5],
                  fieldDomain: item[6],
                  displayType: item[7],
                  defaultValue: item[8],
                  required: item[9],
                  value: null
                });
              }
              return acc;
            }, {});

            // After we have the job types loaded, lets render our table with the selected items
            if (Object.keys(this.selectedJobTypes).length) {
              // Clear out the old elements
              domConstruct.empty('jobItemsCol');

              // Make the new ones
              var jobItem;
              Object.keys(this.selectedJobTypes).map(lang.hitch(this, function(propKey, index) {
                jobItem = this._createJobItem(this.selectedJobTypes[propKey].jobType);
                this._onJobItemRowClicked(jobItem);
                this._updateJobItemType(this.selectedJobTypes[propKey].jobType, this.selectedJobTypes[propKey].jobTypeName);
              }))
            }
            console.log('jobTypeExtendedProperties = ', this.jobTypeExtendedProperties);
          }),
          lang.hitch(this, function(error) {
            console.log('Unable to retrieve any extended properties for job types', error);
            var errMsg = error.message + (error.details ? " " + error.details[0] : null);
            this._showErrorMessage(this.nls.errorRetrievingJobExtProperties.replace("{0}", errMsg));
          }));
      },

      _populateQueryParameters: function(parameters){
        var index = this.config.fullyQualifiedJobTypesTableName ? this.config.fullyQualifiedJobTypesTableName.toUpperCase().indexOf('.JTX_JOB_TYPES') : -1;
        if (index !== -1) {
          // Found a fully qualified table name, apply qualifier to all tables in the query
          var qualifier = this.config.fullyQualifiedJobTypesTableName.substring(0, index + 1);
          parameters.fields = this.QUERY_FIELDS.replace(/JTX_/g, qualifier + 'JTX_');
          parameters.tables = this.QUERY_TABLES.replace(/JTX_/g, qualifier + 'JTX_');
          parameters.where = this.QUERY_WHERE.replace(/JTX_/g, qualifier + 'JTX_');
          parameters.orderBy = this.QUERY_ORDER_BY.replace(/JTX_/g, qualifier + 'JTX_');
        } else {
          // No qualifier, use query parameters as-is
          parameters.fields = this.QUERY_FIELDS;
          parameters.tables = this.QUERY_TABLES;
          parameters.where = this.QUERY_WHERE;
          parameters.orderBy = this.QUERY_ORDER_BY;
        }
      },

      _onBtnAddItemClicked: function(){
        // Create job type item
        var jobTypeItem = this._createJobItem();

        // Select item
        this._onJobItemRowClicked(jobTypeItem);
      },

      _onJobItemRowClicked: function(jobTypeItem){
        this.selectedJobItemRow = jobTypeItem;
        var jobTypeId = this.selectedJobItemRow.dataset.id;

        arrayUtil.forEach(domQuery('.job-type-item.selected'), lang.hitch(this, function(arrayItem) {
          domClass.remove(arrayItem, 'selected');
        }));
        domClass.add(this.selectedJobItemRow, 'selected');

        // Set the select to the correct option
        var jobTypeSelect = registry.byId('jobTypeSelect');
        this.selectChangeEvent.pause();
        jobTypeSelect.set('value', jobTypeId || null);
        this.selectChangeEvent.resume();

        registry.byId('jobTypeIconSelect').set('value', this.selectedJobTypes[jobTypeId] && this.selectedJobTypes[jobTypeId].icon || '');

        // Generate the table rows with the optional fields
        this._createExtendedPropsTable(jobTypeId);
      },

      _createJobItem: function(jobTypeId) {
        var jobItemId = jobTypeId || registry.byId('jobTypeSelect').get('value');
        var jobTypeItem = domConstruct.create('div', {
          class: 'job-type-item',
          id: jobItemId
        }, 'jobItemsCol', 'last');
        jobTypeItem.dataset.id = jobTypeId || null;

        var jobName = domConstruct.create('p', {
          class: 'item-name item-name-unassigned',
          innerHTML: (jobTypeId ? this.selectedJobTypes[jobTypeId].jobTypeName + ' - ' + jobTypeId : this.nls.selectJobTypePlaceholder)
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

        // Select null on icon dropdown
        registry.byId('jobTypeIconSelect').set('value', this.selectedJobTypes[jobTypeId] && this.selectedJobTypes[jobTypeId].icon || '');

        // Enable job type select if we have at least one row added
        if (domQuery('.job-type-item').length > 0) {
          registry.byId('jobTypeSelect').set('disabled', false);
        }

        return jobTypeItem;
      },

      _updateJobItemType: function(jobTypeId, jobTypeName, jobIcon) {
        // Update the job item row id
        this.selectedJobItemRow.id = jobTypeId + 'JobItemRow';
        this.selectedJobItemRow.dataset.id = jobTypeId;

        this.selectedJobTypes[jobTypeId] = {
          jobType: jobTypeId,
          jobTypeName: jobTypeName,
          icon: (jobIcon !== undefined ? jobIcon : this.selectedJobTypes[jobTypeId] && this.selectedJobTypes[jobTypeId].icon),
          extendedProps: (this.selectedJobTypes[jobTypeId] && this.selectedJobTypes[jobTypeId].extendedProps) || []
        };

        var rowTitle = domQuery('.item-name', this.selectedJobItemRow)[0];
        rowTitle.innerHTML = jobTypeName + ' - ' + jobTypeId;
        domClass.remove(rowTitle, '.item-name-unassigned');

        registry.byId('jobTypeIconSelect').set('value', this.selectedJobTypes[jobTypeId].icon || '');

        // Update the props table
        this._createExtendedPropsTable(jobTypeId);
      },

      _createExtendedPropsTable: function(jobTypeId) {
        var props = this.jobTypeExtendedProperties[jobTypeId] && this.jobTypeExtendedProperties[jobTypeId].slice();
        domConstruct.empty('jobTypePropsTable');

        if (jobTypeId === 'null' || jobTypeId === undefined) {
          domClass.add('singleSettingContent', 'no-type-selected');
        } else {
          domClass.remove('singleSettingContent', 'no-type-selected');
        }

        if (props) {
          arrayUtil.forEach(props, lang.hitch(this, function(prop) {
            var propsRow = domConstruct.create('tr', {}, 'jobTypePropsTable', 'last');

            var extendedProps = this.selectedJobTypes[jobTypeId].extendedProps;
            var hasProp = extendedProps && extendedProps.slice().filter(function(item) {
              return item.fieldName === prop.fieldName
            }).length > 0;
            var propCheckbox = domConstruct.create('td', {
              innerHTML: '<input type="checkbox" ' + (hasProp ? 'checked' : null) + ' />'
            }, propsRow, 'first');

            on(propCheckbox, 'click', lang.hitch(this, function(e) {
              var extProps = this.selectedJobTypes[jobTypeId].extendedProps;
              if (e.srcElement.checked) {
                extProps.push(prop);
              } else {
                extProps.splice(extProps.indexOf(prop), 1);
              }

              this._updateAllVisibleCheckbox(jobTypeId);
            }));

            domConstruct.create('td', {
              innerHTML: prop.tableName
            }, propsRow, 'last');

            domConstruct.create('td', {
              innerHTML: prop.fieldName
            }, propsRow, 'last');

            domConstruct.create('td', {
              innerHTML: prop.fieldAlias
            }, propsRow, 'last');
          }));

          this._updateAllVisibleCheckbox(jobTypeId);
        } else {
          var propsRow = domConstruct.create('tr', {}, 'jobTypePropsTable', 'last');
          var propCheckbox = domConstruct.create('td', {
            colspan: '3',
            style: 'text-align: center; padding: 10px;',
            innerHTML: '<span class="hint-text">' + this.nls.noExtendedProps + '</span>'
          }, propsRow, 'first');
        }
      },

      _updateAllVisibleCheckbox: function(jobTypeId) {
        // Set the all checked checkbox in the table header
        var allSelected = this.selectedJobTypes[jobTypeId].extendedProps.length === this.jobTypeExtendedProperties[jobTypeId].length;
        dom.byId('allVisibleCheckbox').checked = allSelected;
      },

      _updateJobItemExtendedProps: function(jobTypeId, prop, isChecked) {
        var extendedProps = this.selectedJobTypes[jobTypeId].extendedProps;
        if (isChecked) {
          extendedProps.push(prop);
        } else {
          extendedProps.splice(extendedProps.indexOf(prop), 1);
        }
      },

      _updateSelectOptionsDisabled: function() {
        // Update the option to be disabled or not based on the selected job types
        var jobTypeSelect = registry.byId('jobTypeSelect');
        var updatedOptions = [];
        arrayUtil.forEach(jobTypeSelect.get('options'), lang.hitch(this, function(selectOption) {
          selectOption.disabled = (!!this.selectedJobTypes[selectOption.value] );
          updatedOptions.push(selectOption)
        }));
        jobTypeSelect.set('options', updatedOptions);
      },

      _deleteJobTypeItem: function(e) {
        if (!e) return;
        if (e.dataset) {
          console.log('jobTypeRow', e, e.dataset.id);
          delete this.selectedJobTypes[e.dataset.id];
        }
        domConstruct.destroy(e);
        this.selectedJobItemRow = null;

        this._resetTableSelect();

        // Enable job type select if we have at least one row added
        if (domQuery('.job-type-item').length < 1) {
          registry.byId('jobTypeSelect').set('disabled', true);
        }

        this._updateSelectOptionsDisabled();
      },

      _resetTableSelect: function() {
        this._createExtendedPropsTable('null');
        this.selectChangeEvent.pause();
        registry.byId('jobTypeSelect').set('value',  'null');
        this.selectChangeEvent.resume();
      },

      _resetJobTypes: function() {
        arrayUtil.forEach(domQuery('.job-type-item'), lang.hitch(this, function(jobTypeRow) {
          this._deleteJobTypeItem(jobTypeRow);
        }));
      },

      _sortExtendedProps: function(a,b) {
        return a.fieldName.localCompare(b.fieldName);
      },

      _showErrorMessage: function(message) {
        domClass.add(this.domNode, 'settings-error-visible');
        dom.byId('WMXSettingsErrorMessage').innerHTML = message || this.nls.errorPlaceholder;
      },

      _hideErrorMessage: function() {
        domClass.remove(this.domNode, 'settings-error-visible');
      }
    });
  });
