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
    'dojo/dom-construct',
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

    'jimu/loaderplugins/order-loader!' + window.location.protocol + '//' +
    window.location.hostname + ':' + window.location.port + window.path +
    'libs/exifjs/exif.js'
  ],
  function (
    declare, topic, html, lang, arrayUtils, domQuery, on, dom, domStyle, domConstruct, Uploader,
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
      attachmentList: [],
      exifInfosArray: [],
      jobId: null,
      user: null,
      aoi: null,
      bAOIGeotagged: false,
      bAOIDrawn: false,
      bAOISelected: false,
      bJobCreated: false,
      sSelectableFeatureLayerURL: '',
      drawBox: null,

      //methods to communication with app container:

      postCreate: function () {
        console.log('postCreate');
        this.inherited(arguments);
        this._initTasks();
        this._initSelf();
        this._initDrawBox();

        this.user = this.config.defaultUser;
        this.populateJobTypes();
      },

      populateJobTypes: function () {
        var self = lang.hitch(this);
        this.jobTypes = [];
        this.wmConfigTask.getVisibleJobTypes(this.user, function (data) {
          //generate dom elements for configured job types and ext props
          var jobItem;
          Object.keys(self.config.selectedJobTypes).map(function(propKey, index) {
            jobItem = self.config.selectedJobTypes[propKey];

            var jobItemDom = domConstruct.create('div', {
              class: 'job-type-selector'
            }, 'jobTypeSelectors', 'last');
            jobItemDom.dataset.jobType = jobItem.jobType;
            jobItemDom.dataset.jobTypeTitle = jobItem.jobTypeName;

            on(jobItemDom, 'click', function(e) {
              self._createJobSettings(self.config.selectedJobTypes[e.currentTarget.dataset.jobType]);
            });

            domConstruct.create('div', {
              class: 'job-type-symbol',
              innerHTML: '<img src="./widgets/WorkflowManagerCreateJobs/images/pothole.svg" />'
            }, jobItemDom, 'first');

            var jobItemContent = domConstruct.create('div', {
              class: 'job-type-content',
            }, jobItemDom, 'last');

            domConstruct.create('h4', {
              class: 'job-type-title',
              innerHTML: jobItem.jobTypeName
            }, jobItemContent, 'first');
            domConstruct.create('p', {
              class: 'job-type-description',
              innerHTML: 'Create a new job for ' + jobItem.jobType + ' - ' + jobItem.jobTypeName
              // TODO: @lalaine Here is where you will put the job type description
            }, jobItemContent, 'last');
          });

          self.own(on(dom.byId('jobTypeFilterInput'), 'keyup', self._jobFilterUpdated));

          self.own(on(dom.byId('jobTypeFilterClear'), 'click', lang.hitch(self, function(e) {
            dom.byId('jobTypeFilterInput').value = '';
            self._jobFilterUpdated();
          })));
        });
      },

      _jobFilterUpdated: function(e) {
        var inputVal = (e && e.target.value) || '';
        if (inputVal == '') {
          domStyle.set(dom.byId('jobTypeFilterClear'), 'display', 'none');
        } else {
          domStyle.set(dom.byId('jobTypeFilterClear'), 'display', 'initial');
        }

        arrayUtils.forEach(domQuery('.job-type-selector', dom.byId('jobTypeSelectors')), lang.hitch(this, function(jobItem) {
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

      _loadPhoto: function (e) {
        console.log('_loadPhoto');
        this.uploadText.innerHTML = 'Add a photo to this job';
        this.uploadGraphic.src = './widgets/WorkflowManagerCreateJobs/images/upload-generic.svg';

        var fullImageFile = e.target.files[0];

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

          // Add the attachment to the job
          this._addEmbeddedAttachment();
        }));
      },

      _addEmbeddedAttachment: function () {
        var form = dom.byId('sendForm');
        //processing message
        this.uploadText.innerHTML = 'Processing ' + fullImageFile.name + '...';
        this.uploadGraphic.src = '';
        this.wmJobTask.addEmbeddedAttachment(this.user, this.jobId, form,
          lang.hitch(this, function (attachmentId) {
            console.log('addEmbeddedAttachment');
            console.log(attachmentId);

            this.uploadText.innerHTML = 'Success! Upload another';
            this.uploadGraphic.src = './widgets/WorkflowManagerCreateJobs/images/upload-generic-success.svg';

            // upload was successful, so add an AttachmentItem widget
            this._createAttachmentItem(latestExifInfo, this.wmJobTask, this.jobId, attachmentId, this.user);

          }),
          lang.hitch(this, function (error) {
            console.log('Error Adding Attachment ' + this.jobId +
              ' ' + error);
          })
        );
      },

      _saveGeotagAOI: function () {
        if (this.bAOISelected || this.bAOIDrawn) {
          var r = confirm('This will overwrite the current AOI.  Are you sure?');
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
          types: ['point'],
          map: this.map,
          showClear: true,
          keepOneGraphic: true
        });
        this.drawBox.placeAt(this.drawBoxDiv);
        this.drawBox.startup();
        //this.own(on(this.drawBox, 'icon-selected', lang.hitch(this, this._onIconSelected)));
        // this.own(on(this.drawBox, 'DrawEnd', lang.hitch(this, this._onDrawEnd)));

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
        var self = lang.hitch(this);
        this.inherited(arguments);
        console.log('_onSelectEnd');

        if (this.bAOIGeotagged || this.bAOIDrawn) {
          var r = confirm('This will overwrite the current AOI.  Are you sure?');
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

        var qTask = new QueryTask(self.sSelectableFeatureLayerURL);
        var qry = new Query();
        qry.returnGeometry = true;
        qry.geometry = graphic.geometry;
        qry.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
        qTask.execute(
          qry,
          lang.hitch(this, function (fset) {
            var self = lang.hitch(this);
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
          var r = confirm('This will overwrite the current AOI.  Are you sure?');
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
        var uniqueId = jimuUtils.getRandomString();
        var cbxName = 'Query_' + uniqueId;
        // this.btnCreateJob.innerHTML = '<b>Create Job<b>';

        var tabs = [];

        // Comment out functionality
        // var geotagTab = {title: 'Geotag Photo'};
        // geotagTab.content = this.photoGeotagNode;
        // this.photoGeotagNode.style.display = '';
        // tabs.push(geotagTab);

        var drawTab = {title: 'Add Feature'};
        drawTab.content = this.drawLocationNode;
        this.drawLocationNode.style.display = '';
        tabs.push(drawTab);

        if (this.config.selectableLayer != '' && this.config.selectableLayer != 'Under Construction') {
          var selectTab = {title: 'Select Features'};
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

      // TODO Implement this
      _selectJobTypeClick: function (e) {
        // User has selected the job type
        // 1. Get the configured extended properties for the job type and populate the UI
        // 2.
      },

      _createJobSettings: function (jobTypeObj) {
        var self = lang.hitch(this);
        console.log('_createJobClick function', jobTypeObj);

        if (jobTypeObj) {
          this.createJobHeader.innerHTML = 'Creating Job: ' + jobTypeObj.jobTypeName;
        }

        var creationParams = new JobCreationParameters();
        creationParams.jobTypeId = jobTypeObj.jobType;
        creationParams.assignedType = Enum.JobAssignmentType.ASSIGNED_TO_USER;
        creationParams.assignedTo = this.user;

        this.bJobCreated = true;

        //loop through groups of extended props
        var formRow, formRowLabel, inputEl;
        var props = jobTypeObj.extendedProps

        var formGroup = domConstruct.create('div', {
          class: 'wmx-input-content jimu-item-form'
        }, 'wmxExtendedProps', 'last');

        //loop through the form elements
        arrayUtils.forEach(props, lang.hitch(this, function(formEl) {
          formRow = domConstruct.create('div', {
            class: "create-job-form-row"
          }, formGroup);
          formRowLabel = domConstruct.create('b', {
            innerHTML: formEl.fieldAlias,
            class: 'input-label'
          }, formRow, 'first');
          inputEl;
          switch (formEl.displayType) {
            case "1":
              //
              inputEl = domConstruct.create('input', {
                class: 'common-input jimu-input input-item',
                type: 'number',
                name: formEl.fieldName
              }, formRow, 'last');

              break;
            case "2":
              //
              inputEl = domConstruct.create('input', {
                class: 'common-input jimu-input input-item',
                type: 'date',
                name: formEl.fieldName
              }, formRow, 'last');

              break;
            case "3":
              //number
              inputEl = domConstruct.create('input', {
                class: 'common-input jimu-input input-item',
                type: 'number',
                name: formEl.fieldName
              }, formRow, 'last');

              break;
            case "4":
              //text
              inputEl = domConstruct.create('input', {
                class: 'common-input jimu-input input-item',
                type: 'text',
                name: formEl.fieldName
              }, formRow, 'last');

              break;
            case "5":
              //date
              inputEl = domConstruct.create('input', {
                class: 'common-input jimu-input input-item',
                type: 'date',
                name: formEl.fieldName
              }, formRow, 'last');

              break;
            default:

          }
        }));

        self.wmxCreateJobContent.style.display = '';
        self.jobTypeSelectors.style.display = 'none';
      },

      _createJobClick: function (jobTypeObj) {
        var self = lang.hitch(this);

        var creationParams = new JobCreationParameters();
        creationParams.jobTypeId = jobTypeObj.jobType;
        creationParams.assignedType = Enum.JobAssignmentType.ASSIGNED_TO_USER;
        creationParams.assignedTo = this.user;

        this.wmJobTask.createJob(creationParams, this.user, function (data) {
          self.jobId = data[0];

          var updateParam = new JobUpdateParameters();
          updateParam.jobId = this.jobId;
          updateParam.ownedBy = this.user;
          updateParam.description = this.notesTextBox.value;
          updateParam.loi = this.aoi;

          var extPropsFormData = dom.byId('wmxExtendedProps').elements;
          arrayUtils.forEach(extPropsFormData, lang.hitch(this, function(formEl) {

            // TODO: @lalaine update the job that was just created with extended properties
            // below is a sample of how to access the form element name and value
            // you might have to reference self.config.selectedJobTypes.extendedProps
            // to get the tableName etc.
            //
            // updateParam[formEl.name] = formEl.value;
          }));

          this.wmJobTask.updateJob(updateParam, this.user, function () {
            console.log('Job description updated successfully.');
            self._resetWidget();
          });
        }, function (error) {
          alert('Create Job Error: Please make sure the user is a valid user');
        });
      },

      _resetWidget: function () {
        // destroy all the attachmentItem child widgets
        arrayUtils.forEach(this.attachmentList, function (attachmentItem) {
          attachmentItem.destroy();
        });

        domConstruct.empty('wmxExtendedProps');

        this.attachmentList = [];
        this.exifInfosArray = [];
        this.jobId = null;
        this.aoi = null;
        this.bAOIGeotagged = false;
        this.bAOIDrawn = false;
        this.bAOISelected = false;
        this.bJobCreated = false;
        this.drawBox.clear();
        this.fileToUpload.value = '';

        this.txtName.value = '';
        this.txtEmail.value = '';
        this.txtPhone.value = '';

        this.wmxCreateJobContent.style.display = 'none';
        this.jobTypeSelectors.style.display = 'block';
      }
    });
  });
