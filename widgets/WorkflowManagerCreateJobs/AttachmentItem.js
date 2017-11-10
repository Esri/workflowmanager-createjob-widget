﻿///////////////////////////////////////////////////////////////////////////
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
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/form/Button',
  'dijit/Tooltip',

  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-attr',
  'dojo/topic',
  'dojo/text!./templates/AttachmentItem.html',
  'dojo/on'
], function (
  _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Button, Tooltip,
  declare, lang, domAttr, topic, template, on
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

        templateString: template,
        widgetsInTemplate: true,

        //attachmentTypeVar: null,
        //attachmentLinkVar: null,
        //attachmentFilenameVar: null,
        //attachmentTitleVar: null,
        //file: null,
        exifInfo: null,

        postCreate: function () {
            this.inherited(arguments);
            console.log('postCreate - Attachment Item');
        },

        startup: function () {
            this.inherited(arguments);
            console.log('startup - Attachment Item');

            // display a thumbnail by attempting to read the image file data
            var reader = new FileReader();
            reader.onloadend = lang.hitch(this, function () {
                // domAttr.set(this.imagePreviewNode, 'src', reader.result);
            });
            reader.readAsDataURL(this.exifInfo.fullImageFile);
        },

        _removeAttachment: function () {
            this.wmJobTask.deleteAttachment(this.jobId, this.attachmentId,
              this.user,
              lang.hitch(this, function () {
                  console.log('Job attachment deleted successfully.');
                  if (this.removeAttachmentCallback) {
                      // do something back out in the Widget.js
                      // in this case Widget.js needs to have its tracking array updated
                      this.removeAttachmentCallback(this.attachmentId);
                  }
                  // widget destroys itself
                  this.destroy();
              }),
              function () {
                  // wrap the function in lang.hitch if you need to access something in 'this'
                  alert('Failed to delete job attachment.');
              });
        },

        _roundFormatter: function (numberVal) {
            // returns a String that is rounded to 3 decimal points
            return Number(numberVal)
              .toFixed(3);
        }
    });
});
