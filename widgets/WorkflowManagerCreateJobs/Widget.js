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
    'dojo/topic',
    'dojo/_base/html',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/query',
    'dojo/on',
    'dojo/dom',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/promise/all',
    'dojox/form/Uploader',
    'dojo/store/Memory',

    'dijit/form/TextBox',
    'dijit/form/DateTextBox',
    'dijit/form/NumberTextBox',
    'dijit/form/FilteringSelect',

    'jimu/utils',
    'jimu/BaseWidget',
    'jimu/dijit/TabContainer3',
    'jimu/dijit/SimpleTable',
    'jimu/dijit/DrawBox',

    './libs/workflowmanager/Enum',
    './libs/workflowmanager/WMJobTask',
    './libs/workflowmanager/WMConfigurationTask',
    './libs/workflowmanager/WMWorkflowTask',
    './libs/workflowmanager/supportclasses/JobCreationParameters',
    './libs/workflowmanager/supportclasses/JobQueryParameters',
    './libs/workflowmanager/supportclasses/JobUpdateParameters',

    './AttachmentItem',

    'esri/IdentityManager',
    'esri/geometry/geometryEngine',
    'esri/geometry/webMercatorUtils',
    'esri/tasks/query',
    'esri/tasks/QueryTask',
    'esri/graphic',
    'esri/symbols/jsonUtils',

    './libs/exifjs/exif'
  ],
  function (
    declare, topic, html, lang, arrayUtils, domQuery, on, dom, domStyle, domClass, domConstruct, all, Uploader, Memory,
    TextBox, DateTextBox, NumberTextBox, FilteringSelect,
    jimuUtils, BaseWidget, TabContainer3, Table, DrawBox,
    Enum, WMJobTask, WMConfigurationTask, WMWorkflowTask, JobCreationParameters, JobQueryParameters, JobUpdateParameters,
    AttachmentItem,
    IdentityManager, GeometryEngine, WebMercatorUtils, Query, QueryTask, Graphic, jsonUtils,
    EXIF) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {
      // Custom widget code goes here

      name: 'WorkflowManagerCreateJobsWidget',
      baseClass: 'jimu-widget-wmxcreatejobs',
      _disabledClass: 'jimu-state-disabled',

      user: null,
      userCredential: null,

      serviceUrl: null,
      wmJobTask: null,
      wmConfigTask: null,
      wmWorkflowTask: null,

      numberJobTypes: 0,
      numberVisibleJobTypes: 0,
      attachmentToUpload: null,
      attachmentList: [],
      exifInfosArray: [],
      jobId: null,
      aoi: null,
      bAOIGeotagged: false,
      bAOIDrawn: false,
      bAOISelected: false,
      sSelectableFeatureLayerURL: '',
      drawBox: null,
      selectBox: null,

      tableListMapping: {},
      tableListData: {},
      AUX_QUERY_FIELDS: "DISTINCT JTX_AUX_PROPS.JOB_TYPE_ID, TABLE_NAME, FIELD_NAME, TABLE_LIST_CLASS, TABLE_LIST_STORE_FIELD, TABLE_LIST_DISPLAY_FIELD",
      AUX_QUERY_TABLES: "JTX_AUX_PROPS, JTX_JOBS", // JTX_JOBS needed here in case of job filters
      AUX_QUERY_TABLES_NO_JOB_FILTER: "JTX_AUX_PROPS", // Case of no job filters
      AUX_QUERY_WHERE: "TABLE_LIST_CLASS <> '' AND JTX_AUX_PROPS.JOB_TYPE_ID in ({0})",

      // Unlike promises, we cannot combine all callbacks into a single request.  We need to
      // keep track of all callbacks coming back to determine if the job was created successfully
      // or if we need to notify the user that an issue occurred. The other option is to update the
      // Workflow Manager API to used deferred, rather than callbacks, but that would require updates
      // to the 3.x API.
      bNotesReqComplete: false,
      bAttachmentReqComplete: false,
      bExtPropsReqComplete: false,
      extPropResults: [],
      createJobErrors: [],

      pointSymbol: null,
      polygonSymbol: null,

      ResponseType: {
        NOTES: 0,
        ATTACHMENT: 1,
        EXTPROPS: 2
      },

      /*********************************************************/
      // BaseWidget events

      onOpen: function(){
        // summary:
        //    this function will be called when widget is opened everytime.
        // description:
        //    state has been changed to 'opened' when call this method.
        //    this function will be called in two cases:
        //      1. after widget's startup
        //      2. if widget is closed, use re-open the widget
      },

      onClose: function(){
        // summary:
        //    this function will be called when widget is closed.
        // description:
        //    state has been changed to 'closed' when call this method.
        this.inherited(arguments);
        this._resetWidget();
      },

      onActive: function(){
        // summary:
        //    this function will be called when widget is clicked.
      },

      onDeActive: function(){
        // summary:
        //    this function will be called when another widget is clicked.
      },

      onSignIn: function(credential){
        // summary:
        //    this function will be called after user sign in.
        this.userCredential = credential;
      },

      onSignOut: function(){
        // summary:
        //    this function will be called after user sign out.
        this.userCredential = null;
      },

      /*********************************************************/

      // Methods to communication with app container:

      postCreate: function () {
        console.log('postCreate');
        this.inherited(arguments);
        this.serviceUrl = this.config.wmServiceUrl;

        this._showLoader();
        this._initTasks();
        this._initSelf();
        this._initDrawBox();

        this._loadUserConfiguration();
      },

      _loadUserConfiguration: function() {
        console.log('Loading user configuration... ');
        console.log('Authorization mode: ', this.config.authenticationMode);
        if (this.config.authenticationMode === 'portal') {
          // User should already be logged in at this point, but if not then prompt
          // for credentials.
          if (!this.userCredential) {
            this._getUserCredentials();
          } else {
            this.user = this.userCredential.userId;
            this._validateUsername();
          }
        } else if (this.config.authenticationMode === 'server') {
          this._getUserCredentials();
        } else {
          this.user = this.config.defaultUser;
          this._validateUsername();
        }
      },

      _getUserCredentials: function() {
        console.log('Retrieving user credentials from: ', this.serviceUrl);
        IdentityManager.getCredential(this.serviceUrl)
          .then(
            lang.hitch(this, function (response) {
              this.userCredential = response;
              this.user = response.userId;
              this._validateUsername();
            }),
            lang.hitch(this, function (error) {
              console.log('Unable to retrieve user credentials from url: ', this.serviceUrl, error);
              this._showErrorMessage(this.nls.errorInvalidUserCredentials);
            }));
      },

      _validateUsername: function () {
        console.log('Validating user: ', this.user);
        this.wmConfigTask.getUser(this.user,
          lang.hitch(this, function(userInfo) {
            // check if the user can create jobs
            var canCreateJob = userInfo.privileges.some(function(privilege) {
              return 'CreateJob' === privilege.name;
            });
            if (!canCreateJob) {
              this._showErrorMessage(this.nls.errorUserNoCreateJobPrivilege.replace('{0}', this.user));
            } else {
              this._loadServerConfiguration();
            }
          }),
          lang.hitch(this, function(error) {
            console.log('Error retrieving user, ' + this.user, error);
            this._showErrorMessage(this.nls.errorUserInvalid.replace('{0}', this.user));
          })
        );
      },

      _loadServerConfiguration: function() {
        var self = lang.hitch(this);
        self.aoiOverlapAllowed = false;
        console.log('Connecting to server ' + this.serviceUrl);

        this.wmConfigTask.getServiceInfo(
          function (response) {
            console.log('Connected successfully');
            // Get the total number of job types
            self.numberJobTypes = response.jobTypes ? response.jobTypes.length : 0;
            // Check for AOIOVERLAP setting
            if (response.configProperties && response.configProperties['AOIOVERLAP'] === 'allow') {
              self.aoiOverlapAllowed = true;
            }
            self._populateJobTypes();
          },
          function (error) {
            console.log('Unable to connect to Workflow Manager Server: ' + serviceUrl, error);
            console.log('Unable to determine AOIOVERLAP property value, setting AOIOVERLAP to disallow');
            self._showErrorMessage(self.nls.errorUnableToConnectToWMServer.replace('{0}', serviceUrl));
          });
      },

      _populateJobTypes: function () {
        var self = lang.hitch(this);
        this.jobTypes = [];
        this.wmConfigTask.getVisibleJobTypes(this.user,
          function (data) {
            self.numberVisibleJobTypes = data.jobTypes ? data.jobTypes.length : 0;
            if (!data.jobTypes || data.jobTypes.length === 0) {
              console.log('No visible job types returned for user ' + self.user);
              self._showErrorMessage(self.nls.errorUserNoVisibleJobTypes.replace('{0}', self.user));
              return;
            }

            // Extract visible job type ids
            var visibleJobTypeIds = [];
            data.jobTypes.forEach(function(jobType) {
              visibleJobTypeIds.push(jobType.id.toString());
            });

            // Generate dom elements for configured job types and ext props
            var jobItem;
            var filteredJobTypes = Object.keys(self.config.selectedJobTypes).filter(function(jobTypeId) {
              return visibleJobTypeIds.indexOf(jobTypeId) !== -1;
            });
            if (filteredJobTypes.length === 0) {
              self._showErrorMessage(self.nls.errorUserNoVisibleJobTypes.replace('{0}', self.user));
              return;
            }
            filteredJobTypes.map(function (propKey, index) {
              jobItem = self.config.selectedJobTypes[propKey];

              var jobItemDom = domConstruct.create('div', {
                class: 'job-type-selector'
              }, 'jobTypeSelectors', 'last');
              jobItemDom.dataset.jobType = jobItem.jobType;
              jobItemDom.dataset.jobTypeTitle = jobItem.jobTypeName;

              on(jobItemDom, 'click', function (e) {
                self._createJobSettings(self.config.selectedJobTypes[e.currentTarget.dataset.jobType]);
              });

              domConstruct.create('div', {
                class: 'job-type-symbol',
                innerHTML: '<i class="fa fa-' + (jobItem.icon || 'exclamation-triangle') + '"></i>'
              }, jobItemDom, 'first');

              var jobItemContent = domConstruct.create('div', {
                class: 'job-type-content'
              }, jobItemDom, 'last');

              domConstruct.create('h4', {
                class: 'job-type-title',
                innerHTML: jobItem.jobTypeName
              }, jobItemContent, 'first');
              domConstruct.create('p', {
                class: 'job-type-description',
                innerHTML: jobItem.description ? jobItem.description : self.nls.submitRequestForJobType.replace('{0}', jobItem.jobTypeName)
              }, jobItemContent, 'last');
            });

            self.own(on(dom.byId('jobTypeFilterInput'), 'keyup', self._jobFilterUpdated));
            self.own(on(dom.byId('jobTypeFilterClear'), 'click', lang.hitch(self, self._jobFilterCleared)));
            self._populateTableListMapping(visibleJobTypeIds);
          },
          function (error) {
            console.log('No visible job types returned for user ' + self.user, error);
            self._showErrorMessage(self.nls.errorUserNoVisibleJobTypes.replace('{0}', self.user));
          }
        );
      },

      _populateTableListMapping: function(visibleJobTypeIds) {
        var parameters = new JobQueryParameters();
        var qualifier = this._getTableQualifier();
        if (qualifier) {
          // Found a fully qualified table name, apply qualifier to all tables in the query
          parameters.fields = this.AUX_QUERY_FIELDS.replace(/JTX_/g, qualifier + 'JTX_');
          parameters.tables = this._usesJobFilters()
            ? this.AUX_QUERY_TABLES.replace(/JTX_/g, qualifier + 'JTX_')
            : this.AUX_QUERY_TABLES_NO_JOB_FILTER.replace(/JTX_/g, qualifier + 'JTX_');
          parameters.where = this.AUX_QUERY_WHERE.replace(/JTX_/g, qualifier + 'JTX_').replace("{0}", visibleJobTypeIds.join());
        } else {
          // No qualifier, use query parameters as-is
          parameters.fields = this.AUX_QUERY_FIELDS;
          parameters.tables = this._usesJobFilters() ? this.AUX_QUERY_TABLES : this.AUX_QUERY_TABLES_NO_JOB_FILTER;
          parameters.where = this.AUX_QUERY_WHERE.replace("{0}", visibleJobTypeIds.join());
        }
        this.wmJobTask.queryJobsAdHoc(parameters, this.user,
          lang.hitch(this, function(data) {
            if (data.rows) {
              console.log("Table list mappings: ", data);
              data.rows.forEach(lang.hitch(this, function(row) {
                var jobTypeId = row[0];
                var tableName = row[1];
                var fieldName = row[2];
                var tableListMappingData = {
                  tableName: row[3],
                  displayField: row[4],
                  valueField: row[5]
                };
                this.tableListMapping[jobTypeId] = this.tableListMapping[jobTypeId] || {};
                this.tableListMapping[jobTypeId][tableName] = this.tableListMapping[jobTypeId][tableName] || {};
                this.tableListMapping[jobTypeId][tableName][fieldName] = tableListMappingData;
              }));
            } else {
              this.tableListMapping = {};
              console.log("No table list mapping values returned");
            }
            this._hideLoader();
          }),
          lang.hitch(this, function(error) {
            this.tableListMapping = {};
            console.error("Unable to retrieve table list mapping values", error);
            this._showErrorMessage(this.nls.errorRetrievingTableListMapping);
          }));
      },

      _getTableQualifier: function() {
        var index = this.config.fullyQualifiedJobTypesTableName ? this.config.fullyQualifiedJobTypesTableName.toUpperCase().indexOf('.JTX_JOB_TYPES') : -1;
        return index !== -1 ? this.config.fullyQualifiedJobTypesTableName.substring(0, index + 1) : '';
      },

      _usesJobFilters: function() {
        return this.numberJobTypes > this.numberVisibleJobTypes;
      },

      _jobFilterCleared: function(e) {
        dom.byId('jobTypeFilterInput').value = '';
        this._jobFilterUpdated();
      },

      _jobFilterUpdated: function (e) {
        var inputVal = (e && e.target.value) || '';
        if (inputVal === '') {
          domStyle.set(dom.byId('jobTypeFilterClear'), 'display', 'none');
        } else {
          domStyle.set(dom.byId('jobTypeFilterClear'), 'display', 'initial');
        }

        arrayUtils.forEach(domQuery('.job-type-selector', dom.byId('jobTypeSelectors')), lang.hitch(this, function (jobItem) {
          if (jobItem.dataset.jobTypeTitle.toLocaleLowerCase().indexOf(inputVal) > -1) {
            domStyle.set(jobItem, 'display', 'flex');
          } else {
            domStyle.set(jobItem, 'display', 'none');
          }
        }));
      },

      _addAttachmentToUpload: function (e) {
        console.log('_addAttachmentToUpload');
        var fullImageFile = e.target.files[0];
        var domUploaderDiv = domQuery('.wmx-file-uploader')[0];
        this.uploadFilename.innerHTML = fullImageFile.name;

        if ((fullImageFile.size <= (this.config.maxAttachmentSize * 1000000)) || (this.config.maxAttachmentSize === 0)) {
          // Do the normal attachment stuff
          this.uploadText.innerHTML = this.config.attachmentsLabel ? this.config.attachmentsLabel : this.nls.addAttachmentToJob;
          this.uploadGraphic.src = this.folderUrl + 'images/upload-generic.svg';
          domClass.remove(domUploaderDiv, 'upload-error');

          window.EXIF.getData(fullImageFile, lang.hitch(this, function () {
            console.log('window.Exif.getdata');
            var gpsLatitudeRef = window.EXIF.getTag(fullImageFile,
              'GPSLatitudeRef');
            var gpsLatitude = window.EXIF.getTag(fullImageFile,
              'GPSLatitude');
            var gpsLongitudeRef = window.EXIF.getTag(fullImageFile,
              'GPSLongitudeRef');
            var gpsLongitude = window.EXIF.getTag(fullImageFile,
              'GPSLongitude');

            var ddLatitude, ddLongitude;

            var latestExifInfo = {
              gpsLatitude: '',
              gpsLongitude: '',
              fullImageFile: fullImageFile
            };
            if (gpsLatitude) {
              ddLatitude = this._dmsToDd(gpsLatitude,
                gpsLatitudeRef);
              ddLongitude = this._dmsToDd(gpsLongitude,
                gpsLongitudeRef);

              latestExifInfo.gpsLatitude = ddLatitude;
              latestExifInfo.gpsLongitude = ddLongitude;
            }

            this.exifInfosArray.push(latestExifInfo);

            if (this.photoGeotagNode.style.display !== 'none') {
              this._saveGeotagAOI();
            }

            this.attachmentToUpload = {
              latestExifInfo: latestExifInfo,
              fullImageFilename: fullImageFile.name
            };

            // Add the attachment to the job
            // this._addEmbeddedAttachment();
          }));
        } else {
          // File too large, throw error
          this.uploadText.innerHTML = this.nls.fileTooLargeLabel;
          this.uploadGraphic.src = this.folderUrl + 'images/upload-generic-error.svg';
          domClass.add(domUploaderDiv, 'upload-error');
        }
      },

      _addEmbeddedAttachment: function (autoExecuteAfterAttachment) {
        var form = dom.byId('sendForm');
        // Processing message
        this.uploadText.innerHTML = this.nls.processingFilename.replace('{0}', this.fullImageFilename);
        this.uploadGraphic.src = '';
        this.wmJobTask.addEmbeddedAttachment(this.user, this.jobId, form,
          lang.hitch(this, function (attachmentId) {
            console.log('Job attachment added successfully', attachmentId);

            this.uploadText.innerHTML = this.nls.successfulUploadAnother;
            this.uploadGraphic.src = this.folderUrl + 'images/upload-generic-success.svg';

            // Upload was successful, so add an AttachmentItem widget
            this._createAttachmentItem(this.attachmentToUpload.latestExifInfo, this.wmJobTask, this.jobId, attachmentId, this.user);
            this.attachmentToUpload = null;

            // Execute the first step in the job if configured
            if (autoExecuteAfterAttachment) {
              this._executeCurrentStep();
            }

            this._handleRequestResponse(this.ResponseType.ATTACHMENT);
          }),
          lang.hitch(this, function (error) {
            console.log('Error adding job attachment', error);
            this._handleRequestResponse(this.ResponseType.ATTACHMENT, error);
          })
        );
      },

      _executeCurrentStep: function() {
        this.wmWorkflowTask.executeCurrentStep(this.jobId, true, this.user,
          lang.hitch(this, function (executeInfo) {
            var response = executeInfo[0].executionResult;
            if (response === Enum.StepExecutionResult.EXECUTED) {
              // execution successful
              if (executeInfo[0].threwError) {
                // show error if it occurs when executing current step
                console.log('Error executing current step', executeInfo[0].errorDescription);
              } else {
                console.log('Successfully executed current step', executeInfo[0]);
              }
            } else {
              // execution unsuccessful
              console.log('Error executing current step', executeInfo[0]);
            }
          }),
          lang.hitch(this, function (error) {
            console.log('Error executing current step', error);
          })
        );
      },

      _createAttachmentItem: function (latestExifInfo, wmJobTask, jobId, attachmentId) {
        var attachmentItem = new AttachmentItem({
          exifInfo: latestExifInfo,
          wmJobTask: wmJobTask,
          jobId: jobId,
          attachmentId: attachmentId,
          user: this.user,
          removeAttachmentCallback: lang.hitch(this,
            '_removeAttachmentItemCallback') // This is an alternative to topics, you can trigger a method out in Widget.js
        })
          .placeAt(this.attachmentItemsNode, 'last');
        attachmentItem.startup();
        this.attachmentList.push(attachmentItem);
      },

      _removeAttachmentItemCallback: function (removeAttachmentId) {
        var removalIndex = false;
        arrayUtils.forEach(this.attachmentList, function (attachmentItem, index) {
          if (attachmentItem.attachmentId === removeAttachmentId) {
            removalIndex = index;
          }
        });

        if (removalIndex) {
          this.attachmentList.splice(removalIndex, 1);
        }
      },

      _saveGeotagAOI: function () {
        if (this.bAOISelected || this.bAOIDrawn) {
          var r = confirm(this.nls.aoiOverwritePrompt);
          if (r === true) {
            this.bAOISelected = false;
            this.bAOIDrawn = false;
            this.aoi = null;
          } else {
            return;
          }
        }
        this.bAOIGeotagged = true;

        if (this.exifInfosArray.length === 1) {
          console.log(this.exifInfosArray[0].gpsLatitude);
          var pt = new esri.geometry.Point({
            longitude: this.exifInfosArray[0].gpsLongitude,
            latitude: this.exifInfosArray[0].gpsLatitude
          });
          this.aoi = pt;
          this.aoi.type = 'point';
        } else if (this.exifInfosArray.length > 1) {
          var mp = new esri.geometry.Multipoint();
          for (i = 0; i < this.exifInfosArray.length; i++) {
            var pt = new esri.geometry.Point({
              longitude: this.exifInfosArray[i].gpsLongitude,
              latitude: this.exifInfosArray[i].gpsLatitude
            });
            mp.addPoint(pt);
          }
          this.aoi = mp;
          this.aoi.type = 'multipoint';
        }
        //var sym = new SimpleMarkerSymbol();
        //var g = new Graphic(this.aoi, sym);
        var g = new Graphic(this.aoi, this.pointSymbol);
        this.drawBox.addGraphic(g);
      },

      _dmsToDd: function (exifGPSLatOrLongArray, exifGPSLatOrLongRef) {
        var modifier = 1;
        if (exifGPSLatOrLongRef === 'S' || exifGPSLatOrLongRef === 'W') {
          modifier = -1;
        }

        var d = exifGPSLatOrLongArray[0];
        var m = exifGPSLatOrLongArray[1];
        var s = exifGPSLatOrLongArray[2];
        var dms = d + (m / 60.0) + (s / 3600.0);

        return modifier * dms;
      },

      _initDrawBox: function () {
        // Add 'polygon' type for more options
        this.drawBox = new DrawBox({
          types: ['point','polygon'],
          map: this.map,
          showClear: true,
          keepOneGraphic: true
        });
        this.drawBox.placeAt(this.drawBoxDiv);
        this.drawBox.startup();
        // TODO Is this needed?
        // this.own(on(this.drawBox, 'icon-selected', lang.hitch(this, this._onIconSelected)));
        this.own(on(this.drawBox, 'DrawEnd', lang.hitch(this, this._onDrawEnd)));

        // Separate drawbox for selection
        this.selectBox = new DrawBox({
          types: ['point', 'polygon'],
          map: this.map,
          showClear: true,
          keepOneGraphic: true
        });
        this.selectBox.placeAt(this.selectBoxDiv);
        this.selectBox.startup();

        //this.own(on(this.selectBox, 'icon-selected', lang.hitch(this, this._onIconSelected)));
        this.own(on(this.selectBox, 'DrawEnd', lang.hitch(this, this._onSelectEnd)));

        // Initialize default symbols used to update the graphic
        this._initDefaultSymbols();
      },

      _initDefaultSymbols:function(){
        // Initialize internal graphic styles to be consistent with DrawBox
        var pointSys = {
          "style": "esriSMSCircle",
          "color": [0, 0, 128, 128],
          "name": "Circle",
          "outline": {
            "color": [0, 0, 128, 255],
            "width": 1
          },
          "type": "esriSMS",
          "size": 18
        };
        var polygonSys = {
          "style": "esriSFSSolid",
          "color": [79, 129, 189, 128],
          "type": "esriSFS",
          "outline": {
            "style": "esriSLSSolid",
            "color": [54, 93, 141, 255],
            "width": 1.5,
            "type": "esriSLS"
          }
        };
        if(!this.pointSymbol){
          this.pointSymbol = jsonUtils.fromJson(pointSys);
        }
        if(!this.polygonSymbol){
          this.polygonSymbol = jsonUtils.fromJson(polygonSys);
        }
      },

      // _onIconSelected: function(target, geotype, commontype) {
      //   console.log('_onIconSelected');

      //   if (this.exifInfosArray.length > 0) {
      //     alert('A Geotagged photo has been attached, and is currently used as the Job's AOI.  Drawing a graphic on the map, will overwrite the geotagged coordinates.');
      //   }
      // },

      _onSelectEnd: function (graphic, geotype, commontype) {
        this.inherited(arguments);
        console.log('_onSelectEnd');

        // if (this.bAOIGeotagged || this.bAOIDrawn) {
        //   var r = confirm(this.nls.aoiOverwritePrompt);
        //   if (r == true) {
        //     this.bAOIGeotagged = false;
        //     this.bAOIDrawn = false;
        //     this.aoi = null;
        //   } else {
        //     return;
        //   }
        // }
        // Clear out any previously drawn AOIs
        this.drawBox.clear();
        this.aoi = null;

        this.bAOISelected = true;

        if (commontype === 'point') {
          this.aoi = WebMercatorUtils.webMercatorToGeographic(graphic.geometry);
          this.aoi.type = 'point';
        } else if (commontype === 'polygon') {
          this.aoi = WebMercatorUtils.webMercatorToGeographic(graphic.geometry);
          this.aoi.type = 'polygon';
        }

        var qTask = new QueryTask(this.sSelectableFeatureLayerURL);
        var qry = new Query();
        qry.returnGeometry = true;
        qry.geometry = graphic.geometry;
        qry.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
        qTask.execute(
          qry,
          lang.hitch(this, function (fset) {
            if (!fset || !fset.features || fset.features.length === 0) {
              // No returned features
              console.log('No selectable features returned');
              this._errorSelectFeatures(this.nls.errorNoSelectedFeatures);
              return;
            }
            // One or more features returned
            console.log('query success', fset);
            var geometryType = fset.geometryType;
            if (geometryType === 'esriGeometryPolygon' || geometryType === 'esriGeometryPoint' || geometryType === 'esriGeometryMultiPoint') {
              // Combine features into a single feature
              this.aoi = this._combineFeatures(fset.features);
              var geomWM = WebMercatorUtils.webMercatorToGeographic(this.aoi);
              var symbol = (geometryType === 'esriGeometryPolygon') ? this.polygonSymbol : this.pointSymbol;
              var g = new Graphic(geomWM, symbol);
              this.selectBox.addGraphic(g);
            } else {
              // Unexpected geometry type
              this._errorSelectFeatures(this.nls.errorUnsupportedGeometryType.replace('{0}', geometryType));
            }
          }),
          lang.hitch(this, function (error) {
            console.error('Error retrieving selectable features', error);
            this._errorSelectFeatures(this.nls.errorRetrievingSelectedFeatures.replace('{0}', error.message));
          })
        );
      },

      _combineFeatures: function (features) {
        if (features) {
          var geomArray = [];
          features.forEach(function(feature) {
            geomArray.push(feature.geometry);
          });
          return GeometryEngine.union(geomArray);
        }
        return null;
      },

      _errorSelectFeatures: function (error) {
        // TODO We should create a message under the selection icons rather than use the general failure message
        this._showErrorMessage(error);

        // clear out the AOI
        this.bAOISelected = false;
        this.aoi = null;
      },

      _onDrawEnd: function (graphic, geotype, commontype) {
        this.inherited(arguments);
        console.log('_onDrawEnd');

        // clear out any previously selected AOIs
        this.selectBox.clear();
        this.aoi = null;

        if (this.bAOIGeotagged || this.bAOISelected) {
          var r = confirm(this.nls.aoiOverwritePrompt);
          if (r === true) {
            this.bAOIGeotagged = false;
            this.bAOISelected = false;
            this.aoi = null;
          } else {
            return;
          }
        }
        this.bAOIDrawn = true;

        if (commontype === 'point') {
          this.aoi = WebMercatorUtils.webMercatorToGeographic(graphic.geometry);
          this.aoi.type = 'point';
        } else if (commontype === 'polygon') {
          this.aoi = WebMercatorUtils.webMercatorToGeographic(graphic.geometry);
          this.aoi.type = 'polygon';
        }
      },

      _initSelf: function () {
        // Initialize images
        // Some images need to be initialized in the js files to get the correct paths using folderUrl
        this.uploadGraphic.src = this.folderUrl + 'images/upload-generic.svg';
        this.jobTypeFilterClear.innerHTML = "<img src='" + this.folderUrl + 'images/clear-icon.svg' + "'>";
        this.wmxCreateJobSpinner.innerHTML = "<img src='" + this.folderUrl + 'images/loading_circle.gif' + "'>" + this.wmxCreateJobSpinner.innerHTML;

        // Populate labels here
        this.defineLOITitle.innerHTML = this.config.defineLOILabel || this.nls.defaultDefineLOILabel;
        this.extendedPropsTitle.innerHTML = this.config.extPropsLabel || this.nls.defaultExtPropsLabel;
        this.uploadText.innerHTML = this.config.attachmentsLabel || this.nls.defaultAttachmentsLabel;
        this.uploadFilename.innerHTML = '';

        if (!this.config.allowAttachments) {
          this._hideAttachments();
        }

        // var uniqueId = jimuUtils.getRandomString();
        // var cbxName = 'Query_' + uniqueId;
        // this.btnCreateJob.innerHTML = '<b>Create Job<b>';

        var tabs = [];

        // Comment out functionality
        // var geotagTab = {title: 'Geotag Photo'};
        // geotagTab.content = this.photoGeotagNode;
        // this.photoGeotagNode.style.display = '';
        // tabs.push(geotagTab);

        var drawTab = {title: this.nls.addFeature};
        drawTab.content = this.drawLocationNode;
        this.drawLocationNode.style.display = '';
        tabs.push(drawTab);

        if (this.config.selectableLayer !== '' && this.config.selectableLayer !== 'Under Construction') {
          var selectTab = {title: this.nls.selectFeatures};
          selectTab.content = this.selectFeaturesNode;
          this.selectFeaturesNode.style.display = '';
          this.sSelectableFeatureLayerURL = this.config.selectableLayer;
          tabs.push(selectTab)
        }

        var args = {
          tabs: tabs
        };
        this.tab = new TabContainer3(args);
        this.tab.placeAt(this.tabDiv);
        this.tab.startup();
      },

      _initTasks: function () {
        this.wmJobTask = new WMJobTask(this.serviceUrl);
        this.wmConfigTask = new WMConfigurationTask(this.serviceUrl);
        this.wmWorkflowTask = new WMWorkflowTask(this.serviceUrl);
      },

      _createJobSettings: function (jobTypeObj) {
        var self = lang.hitch(this);
        console.log('_createJobSettings function', jobTypeObj);
        if (!jobTypeObj) {
          console('JobType selection is invalid');
          return;
        }

        this.jobType = jobTypeObj.jobType;
        this.createJobHeader.innerHTML = this.nls.createNewSubmission;

        var formRow, formRowLabel, inputEl;
        var props = jobTypeObj.extendedProps;

        if (!props || props.length === 0) {
          // No job ext properties to show
          this._hideExtProperties();
        } else {
          // Loop through groups of extended props
          this._showExtProperties();
          var formGroup = domConstruct.create('div', {
            class: 'wmx-input-content jimu-item-form'
          }, 'wmxExtendedProps', 'last');

          // Loop through the form elements
          arrayUtils.forEach(props, lang.hitch(this, function (formEl) {
            formRow = domConstruct.create('div', {
              class: 'create-job-form-row'
            }, formGroup);
            formRowLabel = domConstruct.create('b', {
              innerHTML: formEl.fieldAlias,
              class: 'input-label'
            }, formRow, 'first');
            //  ExtendedPropertyDisplayType: {
            //     DEFAULT: 0,
            //     TEXT: 1,
            //     DATE: 2,
            //     DOMAIN: 4,
            //     FILE: 5,
            //     GEO_FILE: 6,
            //     FOLDER: 7,
            //     LIST: 8,
            //     TABLE_LIST: 9,
            //     MULTI_LEVEL_TABLE_LIST: 10
            // }
            switch (formEl.displayType) {
              // No numeric fields in display type
              // case '1':
              //   //INTEGER
              //   inputEl = new NumberTextBox({
              //     class: 'input-item',
              //     name: formEl.fieldName
              //   }).placeAt(formRow, 'last')
              //   break;
              case '2':
                // DATE
                var dateTextBox = new DateTextBox({
                  class: 'input-item',
                  name: formEl.fieldName
                });
                if (formEl.defaultValue) {
                  dateTextBox.set('value', formEl.defaultValue);
                }
                inputEl = dateTextBox.placeAt(formRow, 'last');
                inputEl.domNode.dataset.tableName = formEl.tableName;
                break;
              case '9':
                // TABLE_LIST
                var filteringSelect = new FilteringSelect({
                  name: formEl.fieldName,
                  searchAttr: 'name'
                });
                filteringSelect.startup();
                inputEl = filteringSelect.placeAt(formRow, 'last');
                inputEl.domNode.dataset.tableName = formEl.tableName;

                // Populate the drop down values (dataStore) and default value (if applicable)
                this._populateTableList(filteringSelect, formEl.tableName, formEl.fieldName, formEl.defaultValue);
                break;
              default:
                // TEXT
                var textBox = new TextBox({
                  class: 'input-item',
                  name: formEl.fieldName
                });
                textBox.set('value', formEl.defaultValue);
                inputEl = textBox.placeAt(formRow, 'last');
                inputEl.domNode.dataset.tableName = formEl.tableName;
            }
          }));
        }

        self.wmxCreateJobContent.style.display = '';
        self.jobTypeSelectors.style.display = 'none';

        // Clear out any previous messages
        self._hideErrorMessage();
        self._hideStatusMessage();

        // Scroll to the top of the panel
        domQuery('.jimu-widget-frame.jimu-container')[0].scrollTop = 0;
      },

      _populateTableList: function (widget, tableName, fieldName, defaultValue) {
        if (this.tableListData && this.tableListData[tableName] && this.tableListData[tableName][fieldName]) {
          // Table list data found, update data store and default value for widget
          this._setDataStore(widget, this.tableListData[tableName][fieldName], defaultValue);
        } else {
          if (this.tableListMapping[this.jobType] && this.tableListMapping[this.jobType][tableName] && this.tableListMapping[this.jobType][tableName][fieldName]) {
            // Table list data not yet populated, but table list mapping available, get the values
            this._populateTableListValues(widget, tableName, fieldName, this.tableListMapping[this.jobType][tableName][fieldName], defaultValue);
          } else {
            this._showErrorMessage(this.nls.errorRetrievingTableListMappingForField.replace("{0}",fieldName));
          }
        }
      },

      _populateTableListValues: function (widget, tableName, fieldName, tableListInfo, defaultValue) {
        // Call server to get the table list values
        if (!this.tableListData[tableName]) {
          this.tableListData[tableName] = {};
        }
        var parameters = new JobQueryParameters();
        if (this._usesJobFilters()) {
          parameters.fields = "DISTINCT " + tableListInfo.displayField + "," + tableListInfo.valueField;
          parameters.tables = tableListInfo.tableName;
          parameters.tables += "," + this._getTableQualifier() + "JTX_JOBS";
        } else {
          parameters.fields = tableListInfo.displayField + "," + tableListInfo.valueField;
          parameters.tables = tableListInfo.tableName;
        }
        parameters.orderBy = tableListInfo.displayField;
        this.wmJobTask.queryJobsAdHoc(parameters, this.user,
          lang.hitch(this, function(data) {
            if (data.rows) {
              var formattedRows = [];
              data.rows.forEach(function(item) {
                formattedRows.push({
                  name: item[0],
                  value: item[1]
                })
              });
              this.tableListData[tableName][fieldName] = formattedRows;
            } else {
              console.log("No table list values returned for ", tableName);
              this.tableListData[tableName][fieldName] = [];
            }
            // Update data store with values and set the default value for the widget
            this._setDataStore(widget, this.tableListData[tableName][fieldName], defaultValue);
          }),
          lang.hitch(this, function(error) {
            console.error("Unable to retrieve table list values for", tableName, fieldName, error);
            this._showErrorMessage(this.nls.errorRetrievingTableListValues.replace("{0}", fieldName));
            this.tableListData[tableName][fieldName] = [];
          }));
      },

      _setDataStore: function (widget, dataStore, defaultValue) {
        if (widget && dataStore) {
          widget.set('store', new Memory({ idProperty: 'value', data: dataStore }));
          if (defaultValue && defaultValue !== '') {
            widget.set('value', defaultValue);
          }
        }
      },

      _createJobClick: function () {
        if (this.aoi && !this.aoiOverlapAllowed) {
          // An AOI is defined and AOI overlap is not allowed.  Check if there is an overlapping feature.
          this._checkAOIOverlap();
        } else {
          this._createJob();
        }
      },

      _checkAOIOverlap: function() {
        var self = lang.hitch(this);
        var query = new Query();
        query.returnGeometry = false;
        query.outFields = ['objectid'];
        query.geometry = this.aoi;
        query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;  // Or use SPATIAL_REL_OVERLAPS?

        var promises = [];
        if (parseInt(this.config.poiLayerId) !== NaN) {
          var queryTask = new QueryTask(this.config.wmMapServiceUrl + '/' + this.config.poiLayerId);
          promises.push(queryTask.execute(query));
        }
        if (parseInt(this.config.aoiLayerId) !== NaN) {
          var queryTask = new QueryTask(this.config.wmMapServiceUrl + '/' + this.config.aoiLayerId);
          promises.push(queryTask.execute(query));
        }

        all(promises).then(function(results){

          var hasOverlappingFeatures = false;
          hasOverlappingFeatures = results.some(function(result) {
            return (result && result.features && result.features.length > 0);
          });

          if (hasOverlappingFeatures) {
            console.log('Unable to create job. Specified AOI overlaps with an existing job AOI.');
            self._showErrorMessage(self.nls.errorOverlappingAOI);
          } else {
            self._createJob();
          }
        });
      },

      _createJob: function () {
        var creationParams = new JobCreationParameters();
        creationParams.jobTypeId = this.jobType;
        creationParams.loi = this.aoi;

        this._showLoader(this.nls.submissionCreatedLabel);

        this.wmJobTask.createJob(creationParams, this.user,
          lang.hitch(this, function (data) {
            // Job created successfully, update remaining job properties
            console.log('Job created successfully, jobID = ' + data[0]);
            this.jobId = data[0];
            this._updateJobAfterCreate();
          }),
          lang.hitch(this, function (error) {
            console.log('Error creating job', error);
            this._showErrorMessage(this.nls.errorCreatingJob.replace('{0}', error.message()));
          })
        );
      },

      _updateJobAfterCreate: function () {
        this._clearRequestResponses();

        // Update job after creation.
        // - job notes
        // - job attachment
        // - job extended properties

        // Job notes
        if (this.notesTextBox.value) {
          this.wmJobTask.updateNotes(this.jobId, this.notesTextBox.value, this.user,
            lang.hitch(this, function (response) {
              console.log((response.success ? 'Successfully' : 'Unsuccessfully') + ' updated job notes');
              this._handleRequestResponse(this.ResponseType.NOTES);
            }),
            lang.hitch(this, function (error) {
              console.log('Error updating job notes', error);
              this._handleRequestResponse(this.ResponseType.NOTES, error);
            }));
        } else {
          this._handleRequestResponse(this.ResponseType.NOTES);
        }

        // Job attachment
        var autoExecuteAfterAttachment = this.config.selectedJobTypes[this.jobType].autoexecute;
        if (this.attachmentToUpload) {
          this._addEmbeddedAttachment(autoExecuteAfterAttachment);
        } else {
          this._handleRequestResponse(this.ResponseType.ATTACHMENT);
        }

        // Job extended properties
        // Check if any extended properties were configured
        var extProps = dom.byId('wmxExtendedProps').elements;
        if (extProps && extProps.length > 0) {
          this.wmJobTask.getExtendedProperties(this.jobId,
            lang.hitch(this, function (data) {
              // Retrieve job extended properties, then update
              console.log('Job extended properties retrieved successfully', data);
              this.jobTypeExtendedProperties = data;
              this._updateExtendedProperties(data);
            }),
            lang.hitch(this, function (error) {
              console.log('Error retrieving job extended properties', error);
              this._handleRequestResponse(this.ResponseType.EXTPROPS, error);
            }));
        } else {
          this._handleRequestResponse(this.ResponseType.EXTPROPS);
        }
      },

      _updateExtendedProperties: function (jobExtProps) {
        // Get the configured ext props for the job in the widget and group by table name
        var records = {};
        var tableListRecords = {};
        var configuredExtProps = this.config.selectedJobTypes[this.jobType].extendedProps;
        var extPropsFormData = dom.byId('wmxExtendedProps').querySelectorAll('div[data-table-name]');

        for (i = 0; i < extPropsFormData.length; i++) {
          var tableName = configuredExtProps[i].tableName;
          var fieldValue = extPropsFormData[i].querySelectorAll('input[name=' + configuredExtProps[i].fieldName + ']')[0]
            ? extPropsFormData[i].querySelectorAll('input[name=' + configuredExtProps[i].fieldName + ']')[0].value
            : null;
          if (fieldValue && configuredExtProps[i].displayType === '2') {
            // Date fields returned in ISO format YYYY-MM-DD format, convert value to an actual date.
            // Parse the date and add the 12:00 noon timestamp to be consistent with other web clients.
            fieldValue = Date.parse(fieldValue) + 43200000;
          }

          // Store table list properties separate from the other properties
          if (fieldValue && (configuredExtProps[i].displayType === '9' || configuredExtProps[i].tableName)) { // Table list
            if (!tableListRecords[tableName]) {
              tableListRecords[tableName] = {
                recordId: null,
                tableName: tableName,
                properties: {}
              }
            }
            tableListRecords[tableName].properties[configuredExtProps[i].fieldName] = fieldValue;
          } else {
            if (!records[tableName]) {
              records[tableName] = {
                recordId: null,
                tableName: tableName,
                properties: {}
              }
            }
            records[tableName].properties[configuredExtProps[i].fieldName] = fieldValue;
          }
        }

        // Get the associated recordId for each table, values are nested in containers/records
        for (var i = 0; i < jobExtProps.length; i++) {
          var container = jobExtProps[i];
          var tableName = container.tableName;
          if (!records[tableName] && !tableListRecords[tableName]) {
            continue;
          }

          if (records[tableName]) {
            records[tableName].recordId = container.records[0].id;
          }
          if (tableListRecords[tableName]) {
            tableListRecords[tableName].recordId = container.records[0].id;
          }

          // Adjust records values based on datatype.  This is needed here because we only get the datatype after
          // the job has been created and we've retrieved extended properties for the job.
          var recordValues = container.records[0].recordValues;
          recordValues.forEach(function(recordValue) {
            if (records[tableName] && records[tableName].properties[recordValue.name] !== undefined && records[tableName].properties[recordValue.name] !== null) {
              if (recordValue.dataType === Enum.FieldType.SINGLE || recordValue.dataType === Enum.FieldType.DOUBLE) {
                records[tableName].properties[recordValue.name] = parseFloat(records[tableName].properties[recordValue.name]);
              } else if (recordValue.dataType === Enum.FieldType.INTEGER || recordValue.dataType === Enum.FieldType.SMALL_INTEGER) {
                records[tableName].properties[recordValue.name] = parseInt(records[tableName].properties[recordValue.name]);
              }
            } else if (tableListRecords[tableName] && tableListRecords[tableName].properties[recordValue.name] !== undefined && tableListRecords[tableName].properties[recordValue.name] !== null) {
              if (recordValue.dataType === Enum.FieldType.SINGLE || recordValue.dataType === Enum.FieldType.DOUBLE) {
                tableListRecords[tableName].properties[recordValue.name] = parseFloat(tableListRecords[tableName].properties[recordValue.name]);
              } else if (recordValue.dataType === Enum.FieldType.INTEGER || recordValue.dataType === Enum.FieldType.SMALL_INTEGER) {
                tableListRecords[tableName].properties[recordValue.name] = parseInt(tableListRecords[tableName].properties[recordValue.name]);
              }
            }
          });
        }

        this.numExtPropRecords = Object.keys(records).length + Object.keys(tableListRecords).length;
        this.extPropResults = [];
        for (tableName in records) {
          this._updateExtendedProperty(records[tableName]);
        }

        var recordArray = [];
        Object.keys(tableListRecords).forEach(function(key) {
          recordArray.push(tableListRecords[key]);
        });
        this._updateTableListRecords(recordArray);
      },

      _updateExtendedProperty: function(record, callbackHandler, errorHandler) {
        record.properties = JSON.stringify(record.properties);  // Make properties into a JSON string

        var defaultCallbackHandler = lang.hitch(this, function(response) {
          console.log((response.success ? 'Successfully' : 'Unsuccessfully') + ' updated job ext prop record', record);
          this._handleExtPropsResult({
            tableName: record.tableName,
            recordId: record.recordId,
            success: response.success
          });
        });

        var defaultErrorHandler = lang.hitch(this, function (error) {
          console.log('Error updating job ext prop record', record, error);
          var errMsg = (error.details && error.details.length > 0) ? error.details[0] : error.message;
          this._handleExtPropsResult({
            tableName: record.tableName,
            recordId: record.recordId,
            success: false,
            errorMsg: errMsg
          });
        });

        this.wmJobTask.updateRecord(this.jobId, record, this.user,
          callbackHandler ? callbackHandler : defaultCallbackHandler,
          errorHandler ? errorHandler : defaultErrorHandler
        );
      },

      _updateTableListRecords: function(records) {
        // Table list records should be updated sequentially to ensure fields are updated
        if (records && records.length > 0) {
          var record = records[0];
          this._updateExtendedProperty(record,
            lang.hitch(this, function(response) {
              console.log((response.success ? 'Successfully' : 'Unsuccessfully') + ' updated job ext prop record', record);
              this._handleExtPropsResult({
                tableName: record.tableName,
                recordId: record.recordId,
                success: response.success
              });
              if (records.length > 1) {
                records.shift();  // Remove first item from the array
                this._updateTableListRecords(records);
              }
            }),
            lang.hitch(this, function (error) {
              console.log('Error updating job ext prop record', record, error);
              var errMsg = (error.details && error.details.length > 0) ? error.details[0] : error.message;
              this._handleExtPropsResult({
                tableName: record.tableName,
                recordId: record.recordId,
                success: false,
                errorMsg: errMsg
              });
              if (records.length > 1) {
                records.shift();  // Remove first item from the array
                this._updateTableListRecords(records);
              }
            })
          );
        }
      },

      _handleExtPropsResult: function(result) {
        this.extPropResults.push(result);
        if (this.extPropResults.length === this.numExtPropRecords) {
          var errorMsgs = [];
          this.extPropResults.forEach(function(result) {
            if (result.success === false) {
              errorMsgs.push(result.errorMsg);
            }
          });
          var errorMsg = null;
          if (errorMsgs.length > 0) {
            console.log('Unable to update job extended properties: ', errorMsgs);
            errorMsg = this.nls.errorUpdatingExtProps.replace('{0}', errorMsgs.join('\n'));
          } else {
            console.log('Successfully updated job extended properties');
          }
          this._handleRequestResponse(this.ResponseType.EXTPROPS, errorMsg);
        }
      },

      _clearRequestResponses: function () {
        this.bNotesReqComplete = false;
        this.bAttachmentReqComplete = false;
        this.bExtPropsReqComplete = false;
      },

      _handleRequestResponse: function (requestType, errorMsg) {
        if (this.ResponseType.NOTES === requestType) {
          this.bNotesReqComplete = true;
        } else if (this.ResponseType.ATTACHMENT === requestType) {
          this.bAttachmentReqComplete = true;
        } else if (this.ResponseType.EXTPROPS === requestType) {
          this.bExtPropsReqComplete = true;
        }
        if (errorMsg) {
          this.createJobErrors.push(errorMsg);
        }

        if (this.bNotesReqComplete && this.bAttachmentReqComplete && this.bExtPropsReqComplete) {
          // Reset the widget only when all requests have completed
          var jobId = this.jobId; // Save a copy of the jobId before we reset the widget
          var msg = null;
          if (this.createJobErrors.length > 0) {
            msg = this.nls.jobCreatedWithErrors.replace('{0}', jobId);
            msg += this.createJobErrors.join('\n');
          } else {
            msg = this.nls.jobCreatedSuccessfully.replace('{0}', jobId);
          }

          this._resetWidget();
          this._showStatusMessage(msg);
        }
      },

      _hideAttachments: function () {
        domStyle.set(this.attachmentTypeContainer, 'display', 'none');
      },

      _showExtProperties: function () {
        domStyle.set(this.extendedPropsContainer, 'display', 'block');
      },

      _hideExtProperties: function () {
        domStyle.set(this.extendedPropsContainer, 'display', 'none');
      },

      _showStatusMessage: function (msg) {
        this.wmxSuccessPanel.innerHTML = msg;
        domStyle.set(this.wmxSuccessPanel, 'display', 'block');

        // Hide any previous errors
        this._hideErrorMessage();
      },

      _hideStatusMessage: function () {
        domStyle.set(this.wmxSuccessPanel, 'display', 'none');
      },

      _showErrorMessage: function (errMsg) {
        this._hideLoader();
        this.wmxErrorPanel.innerHTML = errMsg;
        domStyle.set(this.wmxErrorPanel, 'display', 'block');

        // Hide any previous messages
        this._hideStatusMessage();
      },

      _hideErrorMessage: function () {
        domStyle.set(this.wmxErrorPanel, 'display', 'none');
      },

      _showLoader: function (msg) {
        domStyle.set(this.wmxCreateJobContent, 'display', 'none');
        if (dom.byId('wmxCreateJobLoaderText')) {
          dom.byId('wmxCreateJobLoaderText').innerHTML = msg || this.nls.loading;
        }
        domStyle.set(this.wmxCreateJobLoader, 'display', 'block');
      },

      _hideLoader: function () {
        domStyle.set(this.wmxCreateJobLoader, 'display', 'none');
      },

      _resetWidget: function (jobCreated) {
        // Destroy all the attachmentItem child widgets
        arrayUtils.forEach(this.attachmentList, function (attachmentItem) {
          attachmentItem.destroy();
        });

        domConstruct.empty('wmxExtendedProps');

        this.attachmentList = [];
        this.exifInfosArray = [];
        this.jobType = null;
        this.jobId = null;
        this.aoi = null;
        this.bAOIGeotagged = false;
        this.bAOIDrawn = false;
        this.bAOISelected = false;
        this.drawBox.clear();
        this.selectBox.clear();
        this.fileToUpload.value = '';
        this.fullImageFilename = null;
        this.notesTextBox.value = null;

        this.bNotesReqComplete = false;
        this.bAttachmentReqComplete = false;
        this.bExtPropsReqComplete = false;
        this.extPropResults = [];
        this.createJobErrors = [];

        this.jobTypeSelectors.style.display = 'block';
        this.wmxCreateJobContent.style.display = 'none';
        this.extendedPropsContainer.style.display = 'block';
        this.attachmentTypeContainer.style.display = 'block';

        this.uploadGraphic.src = this.folderUrl + 'images/upload-generic.svg';
        this.uploadText.innerHTML = this.config.attachmentsLabel || this.nls.defaultAttachmentsLabel;
        this.uploadFilename.innerHTML = '';
        domClass.remove(domQuery('.wmx-file-uploader')[0], 'upload-error');

        // Clear previously entered job filter
        this._jobFilterCleared();

        // Hide the successful job creation div
        domStyle.set(this.wmxSuccessPanel, 'display', (jobCreated === true ? 'block' : 'none'));

        // Hide the error message div
        domStyle.set(this.wmxErrorPanel, 'display', 'none');

        // Hide loader
        domStyle.set(this.wmxCreateJobLoader, 'display', 'none');
      }
    });
  });
