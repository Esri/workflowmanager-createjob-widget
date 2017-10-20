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

    'jimu/utils',
    'jimu/BaseWidget',
    'jimu/dijit/TabContainer3',
    'jimu/dijit/SimpleTable',
    'jimu/dijit/DrawBox',

    './libs/workflowmanager/Enum',
    './libs/workflowmanager/WMJobTask',
    './libs/workflowmanager/WMConfigurationTask',
    './libs/workflowmanager/supportclasses/JobCreationParameters',
    './libs/workflowmanager/supportclasses/JobUpdateParameters',

    './AttachmentItem',

    'esri/geometry/webMercatorUtils',
    'esri/tasks/query',
    'esri/tasks/QueryTask',
    'esri/graphic',
    'esri/symbols/SimpleMarkerSymbol',

    './libs/exifjs/exif'

    // 'jimu/loaderplugins/order-loader!' + window.location.protocol + '//' +
    // window.location.hostname + ':' + window.location.port + window.path +
    // 'widgets/WorkflowManagerCreateJobs/libs/exifjs/exif.js'
  ],
  function (
    declare, topic, html, lang, arrayUtils, domQuery, on, dom, domStyle, domClass, domConstruct, all, Uploader,
    jimuUtils, BaseWidget, TabContainer3, Table, DrawBox,
    Enum, WMJobTask, WMConfigurationTask, JobCreationParameters, JobUpdateParameters,
    AttachmentItem,
    WebMercatorUtils, Query, QueryTask, Graphic, SimpleMarkerSymbol,
    EXIF) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {
      // Custom widget code goes here

      name: 'WorkflowManagerCreateJobsWidget',
      baseClass: 'jimu-widget-wmxcreatejobs',
      _disabledClass: 'jimu-state-disabled',

      wmJobTask: null,
      wmConfigTask: null,

      jobTypes: [],
      attachmentToUpload: null,
      attachmentList: [],
      exifInfosArray: [],
      jobId: null,
      user: null,
      aoi: null,
      bAOIGeotagged: false,
      bAOIDrawn: false,
      bAOISelected: false,
      sSelectableFeatureLayerURL: '',
      drawBox: null,

      // Unlike promises, we cannot combine all callbacks into a single request.  We need to
      // keep track of all callbacks coming back to determine if the job was created successfully
      // or if we need to notify the user that an issue occurred. The other option is to update the
      // Workflow Manager API to used deferred, rather than callbacks, but that would require updates
      // to the 3.x API.
      bNotesReqComplete: false,
      bAttachmentReqComplete: false,
      bExtPropsReqComplete: false,
      extPropResults: [],

      ResponseType: {
        NOTES: 0,
        ATTACHMENT: 1,
        EXTPROPS: 2
      },

      //methods to communication with app container:

      postCreate: function () {
        console.log('postCreate');
        this.inherited(arguments);
        this._initTasks();
        this._initSelf();
        this._initDrawBox();

        this.user = this.config.defaultUser;

        this._loadServerConfiguration();
      },

      _loadServerConfiguration: function(serviceUrl) {
        var self = lang.hitch(this);
        self.aoiOverlapAllowed = false;
        console.log('Connecting to server ' + serviceUrl);
        this.wmConfigTask.getServiceInfo(
          function (response) {
            console.log('Connected successfully');
            // Check setting of AOIOVERLAP setting
            if (response.configProperties && response.configProperties['AOIOVERLAP'] === 'allow') {
              self.aoiOverlapAllowed = true;
            }
            // TODO Implement retrieving username from portal
            self._validateUser(self.user);
          },
          function (error) {
            console.log('Unable to connect to server ' + serviceUrl, error);
            console.log('Unable to determine AOIOVERLAP property value, setting AOIOVERLAP to disallow');
            self._showErrorMessage(self.nls.errorUnableToConnectToServer.replace("{0}", serviceUrl));
          });
      },

      _validateUser: function (username) {
        console.log('Validating user: ' + username);
        this.wmConfigTask.getUser(username,
          lang.hitch(this, function(userInfo) {
            // check if the user can create jobs
            var canCreateJob = userInfo.privileges.some(function(privilege) {
              return 'CreateJob' === privilege.name;
            });
            if (!canCreateJob) {
              this._showErrorMessage(this.nls.errorUserNoCreateJobPrivilege.replace("{0}", username));
            } else {
              this._initializeAOIOverlap();
              this._populateJobTypes();
            }
          }),
          lang.hitch(this, function(error) {
            console.log("Error retrieving user, " + username, error);
            this._showErrorMessage(this.nls.errorUserInvalid.replace("{0}", username));
          })
        );
      },

      _initializeAOIOverlap: function(serviceUrl) {
        var self = lang.hitch(this);
        self.aoiOverlapAllowed = false;
        this.wmConfigTask.getServiceInfo(
          function (response) {
            // Check setting of AOIOVERLAP setting
            if (response.configProperties && response.configProperties['AOIOVERLAP'] === 'allow') {
              self.aoiOverlapAllowed = true;
            }
          },
          function (error) {
            console.error('Unable to determine AOIOVERLAP property value, setting AOIOVERLAP to disallow', error);
            // TODO Does the end user need to know this?
          });
      },

      _populateJobTypes: function () {
        var self = lang.hitch(this);
        this.jobTypes = [];
        this.wmConfigTask.getVisibleJobTypes(this.user,
          function (data) {
            //generate dom elements for configured job types and ext props
            var jobItem;
            Object.keys(self.config.selectedJobTypes).map(function (propKey, index) {
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
                innerHTML: jobItem.description ? jobItem.description : self.nls.createJobForJobType.replace("{0}", jobItem.jobTypeName)
              }, jobItemContent, 'last');
            });

            self.own(on(dom.byId('jobTypeFilterInput'), 'keyup', self._jobFilterUpdated));

            self.own(on(dom.byId('jobTypeFilterClear'), 'click', lang.hitch(self, function (e) {
              dom.byId('jobTypeFilterInput').value = '';
              self._jobFilterUpdated();
            })));
          },
          function (error) {
            console.log("No visible job types returned for user " + self.user, error);
            self._showErrorMessage(self.nls.errorUserNoVisibleJobTypes.replace("{0}", self.user));
          }
        );
      },

      _jobFilterUpdated: function (e) {
        var inputVal = (e && e.target.value) || '';
        if (inputVal == '') {
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

      _onClose: function () {
        this.inherited(arguments);

        this._resetWidget();
      },

      _addAttachmentToUpload: function (e) {
        console.log('_addAttachmentToUpload');
        var fullImageFile = e.target.files[0];
        var domUploaderDiv = domQuery('.wmx-file-uploader')[0]
        this.uploadFilename.innerHTML = fullImageFile.name;

        if ((fullImageFile.size <= (this.config.maxAttachmentSize * 1000000)) || (this.config.maxAttachmentSize === 0)) {
          //do the normal attachment stuff
          this.uploadText.innerHTML = this.config.attachmentsLabel ? this.config.attachmentsLabel : this.nls.addAttachmentToJob;
          this.uploadGraphic.src = './widgets/WorkflowManagerCreateJobs/images/upload-generic.svg';
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

            if (this.photoGeotagNode.style.display != 'none') {
              this._saveGeotagAOI();
            }

            this.attachmentToUpload = {
              latestExifInfo: latestExifInfo,
              fullImageFilename: fullImageFile.name
            };

            // // Add the attachment to the job
            // this._addEmbeddedAttachment();
          }));
        } else {
          //file too large, throw error
          this.uploadText.innerHTML = this.nls.fileTooLargeLabel;
          this.uploadGraphic.src = './widgets/WorkflowManagerCreateJobs/images/upload-generic-error.svg';
          domClass.add(domUploaderDiv, 'upload-error');
        }
      },

      _addEmbeddedAttachment: function () {
        var form = dom.byId('sendForm');
        //processing message
        this.uploadText.innerHTML = this.nls.processingFilename.replace('{0}', this.fullImageFilename);
        this.uploadGraphic.src = '';
        this.wmJobTask.addEmbeddedAttachment(this.user, this.jobId, form,
          lang.hitch(this, function (attachmentId) {
            console.log('Job attachment added successfully', attachmentId);

            this.uploadText.innerHTML = this.nls.successfulUploadAnother;
            this.uploadGraphic.src = './widgets/WorkflowManagerCreateJobs/images/upload-generic-success.svg';

            // upload was successful, so add an AttachmentItem widget
            this._createAttachmentItem(this.attachmentToUpload.latestExifInfo, this.wmJobTask, this.jobId, attachmentId, this.user);
            this.attachmentToUpload = null;
            this._handleRequestResponse(this.ResponseType.ATTACHMENT);
          }),
          lang.hitch(this, function (error) {
            // TODO Provide error in UI
            console.log('Error adding job attachment', error);
            this._handleRequestResponse(this.ResponseType.ATTACHMENT, error);
          })
        );
      },

      _saveGeotagAOI: function () {
        if (this.bAOISelected || this.bAOIDrawn) {
          var r = confirm(this.nls.aoiOverwritePrompt);
          if (r == true) {
            this.bAOISelected = false;
            this.bAOIDrawn = false;
            this.aoi = null;
          } else {
            return;
          }
        }
        this.bAOIGeotagged = true;

        if (this.exifInfosArray.length == 1) {
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
        var sym = new SimpleMarkerSymbol();
        var g = new Graphic(this.aoi, sym);
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
        //add 'polygon' type for more options
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

        this.selectBox = new DrawBox({
          types: ['point', 'polygon'],
          map: this.map,
          showClear: true,
          keepOneGraphic: true
        });

        this.selectBox.placeAt(this.selectBoxDiv);
        this.selectBox.startup();

        //this.own(on(this.selectBox, 'icon-selected', lang.hitch(this, this._onIconSelected)));
        // this.own(on(this.selectBox, 'DrawEnd', lang.hitch(this, this._onSelectEnd)));
      },

      _createAttachmentItem: function (latestExifInfo, wmJobTask, jobId,
                                       attachmentId) {
        var attachmentItem = new AttachmentItem({
          exifInfo: latestExifInfo,
          wmJobTask: wmJobTask,
          jobId: jobId,
          attachmentId: attachmentId,
          user: this.user,
          removeAttachmentCallback: lang.hitch(this,
            '_removeAttachmentItemCallback') // this is an alternative to topics, you can trigger a method out in Widget.js
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

      // _onIconSelected: function(target, geotype, commontype) {
      //   console.log('_onIconSelected');

      //   if (this.exifInfosArray.length > 0) {
      //     alert('A Geotagged photo has been attached, and is currently used as the Job's AOI.  Drawing a graphic on the map, will overwrite the geotagged coordinates.');
      //   }
      // },

      _onSelectEnd: function (graphic, geotype, commontype) {
        this.inherited(arguments);
        console.log('_onSelectEnd');

        if (this.bAOIGeotagged || this.bAOIDrawn) {
          var r = confirm(this.nls.aoiOverwritePrompt);
          if (r == true) {
            this.bAOIGeotagged = false;
            this.bAOIDrawn = false;
            this.aoi = null;
          } else {
            return;
          }
        }
        this.bAOISelected = true;

        if (commontype == 'point') {
          this.aoi = WebMercatorUtils.webMercatorToGeographic(graphic.geometry);
          this.aoi.type = 'point';
        } else if (commontype == 'polygon') {
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
            console.log('query success');
          }),
          lang.hitch(this, this._errorSelectFeatures)
        );
      },

      _errorSelectFeatures: function (params) {
        // this._popupMessage(params.message);
        console.error(params);
      },


      _onDrawEnd: function (graphic, geotype, commontype) {
        this.inherited(arguments);
        console.log('_onDrawEnd');

        if (this.bAOIGeotagged || this.bAOISelected) {
          var r = confirm(this.nls.aoiOverwritePrompt);
          if (r == true) {
            this.bAOIGeotagged = false;
            this.bAOISelected = false;
            this.aoi = null;
          } else {
            return;
          }
        }
        this.bAOIDrawn = true;

        if (commontype == 'point') {
          this.aoi = WebMercatorUtils.webMercatorToGeographic(graphic.geometry);
          this.aoi.type = 'point';
        } else if (commontype == 'polygon') {
          this.aoi = WebMercatorUtils.webMercatorToGeographic(graphic.geometry);
          this.aoi.type = 'polygon';
        }
      },

      _initSelf: function () {
        // Populate labels here
        this.defineLOITitle.innerHTML = this.config.defineLOILabel || this.nls.defaultDefineLOILabel;
        this.extendedPropsTitle.innerHTML = this.config.extPropsLabel || this.nls.defaultExtPropsLabel;
        this.uploadText.innerHTML = this.config.attachmentsLabel || this.nls.defaultAttachmentsLabel;
        this.uploadFilename.innerHTML = '';

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

        if (this.config.selectableLayer != '' && this.config.selectableLayer != 'Under Construction') {
          var selectTab = {title: this.nls.selectFeatures};
          selectTab.content = this.selectFeaturesNode;
          this.selectFeaturesNode.style.display = '';
          this.sSelectableFeatureLayerURL = this.config.selectableLayer; // make configurable
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
        this.wmJobTask = new WMJobTask(this.config.wmServiceUrl);
        this.wmConfigTask = new WMConfigurationTask(this.config.wmServiceUrl);
      },

      _createJobSettings: function (jobTypeObj) {
        var self = lang.hitch(this);
        console.log('_createJobSettings function', jobTypeObj);
        if (!jobTypeObj) {
          console("JobType selection is invalid");
          return;
        }

        this.jobType = jobTypeObj.jobType;
        this.createJobHeader.innerHTML = this.nls.creatingJobForJobType.replace("{0}", jobTypeObj.jobTypeName)

        //loop through groups of extended props
        var formRow, formRowLabel, inputEl;
        var props = jobTypeObj.extendedProps;

        var formGroup = domConstruct.create('div', {
          class: 'wmx-input-content jimu-item-form'
        }, 'wmxExtendedProps', 'last');

        //loop through the form elements
        arrayUtils.forEach(props, lang.hitch(this, function (formEl) {
          formRow = domConstruct.create('div', {
            class: "create-job-form-row"
          }, formGroup);
          formRowLabel = domConstruct.create('b', {
            innerHTML: formEl.fieldAlias,
            class: 'input-label'
          }, formRow, 'first');
          inputEl;
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
            case "1":
              //INTEGER
              inputEl = domConstruct.create('input', {
                class: 'common-input jimu-input input-item',
                type: 'number',
                name: formEl.fieldName
              }, formRow, 'last');

              break;
            case "2":
              // DATE
              inputEl = domConstruct.create('input', {
                class: 'common-input jimu-input input-item',
                type: 'date',
                name: formEl.fieldName
              }, formRow, 'last');

              break;
            default:
              //text
              inputEl = domConstruct.create('input', {
                class: 'common-input jimu-input input-item',
                type: 'text',
                name: formEl.fieldName
              }, formRow, 'last');
          }
        }));

        self.wmxCreateJobContent.style.display = '';
        self.jobTypeSelectors.style.display = 'none';

        // clear out any previous messages
        self._hideErrorMessage();
        self._hideStatusMessage();

        //scroll to the top of the panel
        domQuery('.jimu-widget-frame.jimu-container')[0].scrollTop = 0;
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
        query.outFields = ["objectid"];
        query.geometry = this.aoi;
        query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;  // Or use SPATIAL_REL_OVERLAPS?

        var promises = [];
        if (parseInt(this.config.poiLayerId) != NaN) {
          var queryTask = new QueryTask(this.config.wmMapServiceUrl + "/" + this.config.poiLayerId);
          promises.push(queryTask.execute(query));
        }
        if (parseInt(this.config.aoiLayerId) != NaN) {
          var queryTask = new QueryTask(this.config.wmMapServiceUrl + "/" + this.config.aoiLayerId);
          promises.push(queryTask.execute(query));
        }

        all(promises).then(function(results){

          var hasOverlappingFeatures = false;
          hasOverlappingFeatures = results.some(function(result) {
            return (result && result.features && result.features.length > 0);
          });

          if (hasOverlappingFeatures) {
            console.log("Unable to create job. Specified AOI overlaps with an existing job AOI.");
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

        this._showJobCreationLoader();

        this.wmJobTask.createJob(creationParams, this.user,
          lang.hitch(this, function (data) {
            // Job created successfully. Update remaining job properties
            console.log('Job created successfully, jobID = ' + data[0]);
            this.jobId = data[0];
            this._updateJobAfterCreate();
          }),
          lang.hitch(this, function (error) {
            // TODO Provide error message in UI
            alert('Error creating job', error);
          })
        );
      },

      _updateJobAfterCreate: function () {
        this._clearRequestResponses();

        // Update job after creation.
        // - job notes
        // - job attachment
        // - job extended properties

        // job notes
        if (this.notesTextBox.value) {
          this.wmJobTask.updateNotes(this.jobId, this.notesTextBox.value, this.user,
            lang.hitch(this, function (response) {
              console.log((response.success ? "Successfully" : "Unsuccessfully") + " updated job notes");
              this._handleRequestResponse(this.ResponseType.NOTES);
            }),
            lang.hitch(this, function (error) {
              // TODO Provide error message in UI
              console.log("Error updating job notes", error);
              this._handleRequestResponse(this.ResponseType.NOTES, error);
            }));
        } else {
          this._handleRequestResponse(this.ResponseType.NOTES);
        }

        // job attachment
        if (this.attachmentToUpload) {
          this._addEmbeddedAttachment();
        } else {
          this._handleRequestResponse(this.ResponseType.ATTACHMENT);
        }

        // job extended properties
        // TODO Check if any extended properties were configured
        var extProps = dom.byId('wmxExtendedProps').elements;
        if (extProps && extProps.length > 0) {
          this.wmJobTask.getExtendedProperties(this.jobId,
            lang.hitch(this, function (data) {
              // retrieve job extended properties, then update
              console.log('Job extended properties retrieved successfully', data);
              this._updateExtendedProperties(data);
            }),
            lang.hitch(this, function (error) {
              console.log('Error retrieving job extended properties', error);
              this._handleRequestResponse(this.ResponseType.EXTPROPS, error);
            }));
        } else {
          this._handleRequestResponse(this.ResponseType.EXTPROPS);
        }

        // TODO Need to reset the widget only after all callbacks have been received
        // this._resetWidget();
      },

      _updateExtendedProperties: function (jobExtProps) {
        // get the configured ext props for the job in the widget and group by table name
        var records = {};
        var configuredExtProps = this.config.selectedJobTypes[this.jobType].extendedProps;
        var extPropsFormData = dom.byId('wmxExtendedProps').elements;
        for (i = 0; i < extPropsFormData.length; i++) {
          var tableName = configuredExtProps[i].tableName;
          if (!records[tableName]) {
            records[tableName] = {
              recordId: null,
              tableName: tableName,
              properties: {}
            }
          }
          records[tableName].properties[configuredExtProps[i].fieldName] = extPropsFormData[i].value;
        }

        // get the associated recordId for each table
        // values are nested in containers/records
        for (tableName in records) {
          jobExtProps.some(function(container) {
            if (tableName === container.tableName) {
              records[tableName].recordId = container.records[0].id;
              return true;  // break out of the loop
            }
          });
        }

        this.numExtPropRecords = Object.keys(records).length;
        this.extPropResults = [];
        for (tableName in records) {
          var record = records[tableName];
          record.properties = JSON.stringify(record.properties);  // mkae properties into a JSON string
          this.wmJobTask.updateRecord(this.jobId, record, this.user,
            lang.hitch(this, function(response) {
              console.log((response.success ? "Successfully" : "Unsuccessfully") + " updated job ext prop record", record);
              this._handleExtPropsResult({
                tableName: record.tableName,
                recordId: record.recordId,
                success: response.success
              });
            }),
            lang.hitch(this, function (error) {
              console.log("Error updating job ext prop record", record, error);
              this._handleExtPropsResult({
                tableName: record.tableName,
                recordId: record.recordId,
                success: false
              });
            })
          );
        }

        // arrayUtils.forEach(extPropsFormData, lang.hitch(this, function (formEl) {
        //
        //   // configured ext props for the widget
        //
        //   var extPropName = formEl.name;
        //   var extPropValue = formElem.value;
        //
        //   // TODO: @lalaine update the job that was just created with extended properties
        //   // below is a sample of how to access the form element name and value
        //   // you might have to reference self.config.selectedJobTypes.extendedProps
        //   // to get the tableName etc.
        //   //
        //   // updateParam[formEl.name] = formEl.value;
        //
        //   // this._handleRequestResponse("extProps", error);
        //
        // }));
      },

      _handleExtPropsResult: function(result) {
        this.extPropResults.push(result);
        if (this.extPropResults.length == this.numExtPropRecords) {
          var success = true;
          this.extPropResults.some(function(result) {
            if (result.success === false) {
              success = false;
              return true; // break out of loop
            }
          });
          var msg = success ? null : "Unable to update all job extended properties";
          this._handleRequestResponse(this.ResponseType.EXTPROPS, msg);
        }
      },

      _clearRequestResponses: function () {
        this.bNotesReqComplete = false;
        this.bAttachmentReqComplete = false;
        this.bExtPropsReqComplete = false;
      },

      _handleRequestResponse: function (requestType, errMsg) {
        if (this.ResponseType.NOTES === requestType) {
          this.bNotesReqComplete = true;
        } else if (this.ResponseType.ATTACHMENT === requestType) {
          this.bAttachmentReqComplete = true;
        } else if (this.ResponseType.EXTPROPS === requestType) {
          this.bExtPropsReqComplete = true;
        }
        if (errMsg) {
          console.log("Error updating job " + requestType, errMsg);
          // TODO Provide feedback in UI
        }

        if (this.bNotesReqComplete && this.bAttachmentReqComplete && this.bExtPropsReqComplete) {
          // reset the widget only when all requests have completed
          var jobId = this.jobId; // save a copy of the jobId before we reset the widget
          this._resetWidget();
          this._showStatusMessage(this.nls.jobCreatedSuccessfully.replace("{0}", jobId));
        }
      },

      _showStatusMessage: function (msg) {
        this.wmxSuccessPanel.innerHTML = msg;
        domStyle.set(this.wmxSuccessPanel, 'display', 'block');

        // hide any previous errors
        this._hideErrorMessage();
      },

      _hideStatusMessage: function () {
        domStyle.set(this.wmxSuccessPanel, 'display', 'none');
      },

      _showErrorMessage: function (errMsg) {
        this.wmxErrorPanel.innerHTML = errMsg;
        domStyle.set(this.wmxErrorPanel, 'display', 'block');

        // hide any previous messages
        this._hideStatusMessage();
      },

      _hideErrorMessage: function () {
        domStyle.set(this.wmxErrorPanel, 'display', 'none');
      },

      _showJobCreationLoader: function () {
        domStyle.set(this.wmxCreateJobContent, 'display', 'none');
        domStyle.set(this.wmxCreateJobLoader, 'display', 'block');
      },

      _resetWidget: function (jobCreated) {
        // destroy all the attachmentItem child widgets
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
        this.fileToUpload.value = '';
        this.fullImageFilename = null;

        this.wmxCreateJobContent.style.display = 'none';
        this.jobTypeSelectors.style.display = 'block';

        this.uploadGraphic.src = './widgets/WorkflowManagerCreateJobs/images/upload-generic.svg';
        this.uploadText.innerHTML = this.config.attachmentsLabel || this.nls.defaultAttachmentsLabel;
        this.uploadFilename.innerHTML = '';
        domClass.remove(domQuery('.wmx-file-uploader')[0], 'upload-error');

        //hide the successful job creation div
        domStyle.set(this.wmxSuccessPanel, 'display', (jobCreated === true ? 'block' : 'none'));

        //hide the error message div
        domStyle.set(this.wmxErrorPanel, 'display', 'none');

        //hide loader
        domStyle.set(this.wmxCreateJobLoader, 'display', 'none');
      }
    });
  });
