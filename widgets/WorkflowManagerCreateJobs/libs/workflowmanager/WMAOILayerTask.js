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
    "dojo/_base/declare",
    "./_BaseTask"
], function(declare, BaseTask) {
    return declare([BaseTask], {
        constructor: function (url) {
            this.url = url;
            this.disableClientCaching = true;
        },
        getServiceInfo: function (successCallBack, errorCallBack) {
            var params = {};
            this.sendRequest(params, "", successCallBack, errorCallBack);
        },
        getJobIdField: function (successCallBack, errorCallBack) {
            var params = {};
            this.sendRequest(params, "", function (data) {
                var JOB_ID = "JOB_ID";
                var jobIDField = null;
                var fieldName = null;

                var fields = data.fields;
                if (fields ==  null)
                    errorCallBack(new Error());
                
                for (var i=0,len=fields.length; i<len; i++) {
                    fieldName = fields[i].name.toString();
                    // check that fieldName is not null and ends with "JOB_ID"
                    if (fieldName != null && 
                            fieldName.toUpperCase().substring(fieldName.length - JOB_ID.length) == JOB_ID) {
                        if (jobIDField == null) 
                            jobIDField = fieldName;
                        else if (fieldName.toUpperCase().indexOf("JTX_JOBS_AOI") != -1)
                            // rewrite over the existing job ID only if it is an AOI job ID
                            jobIDField = fieldName;
                    }
                }
                if (jobIDField != null)
                    successCallBack(jobIDField);
                else
                    errorCallBack(new Error(errMsg));
            }, errorCallBack);
        }
    });
});